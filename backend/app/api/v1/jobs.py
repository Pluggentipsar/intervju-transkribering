"""Job management endpoints."""

from datetime import datetime
from pathlib import Path
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.config import settings
from app.db.database import get_db
from app.models.job import Job, JobStatus as DBJobStatus
from app.schemas.job import JobCreate, JobResponse, JobListResponse
from app.schemas.segment import SegmentResponse, TranscriptResponse, TranscriptMetadata
from app.workers.transcription_worker import process_transcription_job

router = APIRouter()

ALLOWED_EXTENSIONS = {".mp3", ".wav", ".m4a", ".ogg", ".flac", ".webm"}


def find_uploaded_file(file_id: str) -> Path | None:
    """Find an uploaded file by ID."""
    for ext in ALLOWED_EXTENSIONS:
        file_path = settings.upload_dir / f"{file_id}{ext}"
        if file_path.exists():
            return file_path
    return None


@router.post("", response_model=JobResponse, status_code=status.HTTP_201_CREATED)
async def create_job(
    job_data: JobCreate,
    background_tasks: BackgroundTasks,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> Job:
    """Create a new transcription job."""
    # Find the uploaded file
    file_path = find_uploaded_file(job_data.file_id)
    if not file_path:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Den uppladdade filen hittades inte. Ladda upp filen igen.",
        )

    # Create job
    job = Job(
        file_name=file_path.name,
        file_path=str(file_path),
        file_size=file_path.stat().st_size,
        model=job_data.model,
        enable_diarization=job_data.enable_diarization,
        language=job_data.language,
        status=DBJobStatus.PENDING,
        current_step="queued",
    )

    db.add(job)
    await db.commit()
    await db.refresh(job)

    # Start background processing
    background_tasks.add_task(process_transcription_job, job.id)

    return job


@router.get("", response_model=JobListResponse)
async def list_jobs(
    db: Annotated[AsyncSession, Depends(get_db)],
    skip: int = 0,
    limit: int = 20,
) -> JobListResponse:
    """List all transcription jobs, newest first."""
    # Get total count
    count_query = select(func.count(Job.id))
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    # Get jobs
    query = select(Job).order_by(Job.created_at.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    jobs = result.scalars().all()

    return JobListResponse(jobs=list(jobs), total=total)


@router.get("/{job_id}", response_model=JobResponse)
async def get_job(
    job_id: str,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> Job:
    """Get a specific job by ID."""
    query = select(Job).where(Job.id == job_id)
    result = await db.execute(query)
    job = result.scalar_one_or_none()

    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Jobbet hittades inte",
        )

    return job


@router.get("/{job_id}/transcript", response_model=TranscriptResponse)
async def get_transcript(
    job_id: str,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> TranscriptResponse:
    """Get the transcript for a completed job."""
    query = select(Job).where(Job.id == job_id).options(selectinload(Job.segments))
    result = await db.execute(query)
    job = result.scalar_one_or_none()

    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Jobbet hittades inte",
        )

    if job.status != DBJobStatus.COMPLETED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Transkriptet ar inte klart. Status: {job.status.value}",
        )

    # Sort segments by index
    sorted_segments = sorted(job.segments, key=lambda s: s.segment_index)

    # Calculate metadata
    speakers = set(s.speaker for s in sorted_segments if s.speaker)
    word_count = sum(len(s.text.split()) for s in sorted_segments)

    return TranscriptResponse(
        job_id=job.id,
        segments=[SegmentResponse.model_validate(s) for s in sorted_segments],
        metadata=TranscriptMetadata(
            total_duration=job.duration_seconds or 0,
            speaker_count=len(speakers),
            word_count=word_count,
            segment_count=len(sorted_segments),
        ),
    )


@router.delete("/{job_id}")
async def delete_job(
    job_id: str,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> dict[str, str]:
    """Delete a job and its associated files."""
    query = select(Job).where(Job.id == job_id)
    result = await db.execute(query)
    job = result.scalar_one_or_none()

    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Jobbet hittades inte",
        )

    # Delete the audio file
    file_path = Path(job.file_path)
    if file_path.exists():
        file_path.unlink()

    # Delete job (cascade deletes segments)
    await db.delete(job)
    await db.commit()

    return {"status": "deleted", "job_id": job_id}
