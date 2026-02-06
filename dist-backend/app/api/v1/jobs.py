"""Job management endpoints."""

from datetime import datetime
from pathlib import Path
from typing import Annotated

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.config import settings
from app.db.database import get_db
from app.models.job import Job
from app.models.job import JobStatus as DBJobStatus
from app.schemas.job import JobCreate, JobListResponse, JobResponse, JobUpdate
from app.models.segment import Segment
from app.schemas.segment import (
    EnhancedAnonymizationRequest,
    EnhancedAnonymizationResponse,
    EnhancedSegmentResponse,
    SearchResponse,
    SearchResultJob,
    SearchResultSegment,
    SegmentResponse,
    SegmentUpdate,
    SpeakerRename,
    SpeakerRenameResponse,
    TranscriptMetadata,
    TranscriptResponse,
)
from app.services.anonymization import (
    enhanced_anonymize_segments,
    anonymize_segments as run_ner_anonymization,
    is_anonymization_available,
)
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


def ner_config_to_string(config) -> str | None:
    """Convert NER entity types config to comma-separated string."""
    if config is None:
        return None
    enabled = []
    if config.persons:
        enabled.append("persons")
    if config.locations:
        enabled.append("locations")
    if config.organizations:
        enabled.append("organizations")
    if config.dates:
        enabled.append("dates")
    if config.events:
        enabled.append("events")
    return ",".join(enabled) if enabled else None


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

    # Convert NER entity types config to string for storage
    ner_entity_types_str = ner_config_to_string(job_data.ner_entity_types)

    # Generate default name if not provided
    name = job_data.name
    if not name:
        now = datetime.now()
        name = f"Transkription {now.strftime('%Y-%m-%d %H:%M')}"

    # Create job
    job = Job(
        name=name,
        file_name=file_path.name,
        file_path=str(file_path),
        file_size=file_path.stat().st_size,
        model=job_data.model,
        enable_diarization=job_data.enable_diarization,
        enable_anonymization=job_data.enable_anonymization,
        language=job_data.language,
        ner_entity_types=ner_entity_types_str,
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


@router.patch("/{job_id}", response_model=JobResponse)
async def update_job(
    job_id: str,
    update: JobUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> Job:
    """Update a job's name."""
    query = select(Job).where(Job.id == job_id)
    result = await db.execute(query)
    job = result.scalar_one_or_none()

    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Jobbet hittades inte",
        )

    if update.name is not None:
        job.name = update.name

    await db.commit()
    await db.refresh(job)

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


@router.post("/{job_id}/enhance-anonymization", response_model=EnhancedAnonymizationResponse)
async def enhance_anonymization(
    job_id: str,
    request: EnhancedAnonymizationRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> EnhancedAnonymizationResponse:
    """
    Apply enhanced pattern-based anonymization to a completed job's transcript.

    This is a SEPARATE step that can be run after the initial transcription.
    It applies regex patterns to catch institution names, personnummer, phone
    numbers, and other sensitive data that KB-BERT NER might have missed.
    """
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
            detail=f"Jobbet måste vara klart för förstärkt avidentifiering. Status: {job.status.value}",
        )

    # Convert segments to dict format for processing
    sorted_segments = sorted(job.segments, key=lambda s: s.segment_index)
    segments_data = [
        {
            "segment_index": s.segment_index,
            "start_time": s.start_time,
            "end_time": s.end_time,
            "text": s.text,
            "anonymized_text": s.anonymized_text,
            "speaker": s.speaker,
        }
        for s in sorted_segments
    ]

    # Convert request patterns to tuples
    custom_patterns = (
        [(p.pattern, p.replacement) for p in request.custom_patterns]
        if request.custom_patterns
        else None
    )

    custom_words = (
        [(w.word, w.replacement) for w in request.custom_words] if request.custom_words else None
    )

    # Apply enhanced anonymization
    enhanced_segments = enhanced_anonymize_segments(
        segments=segments_data,
        use_institution_patterns=request.use_institution_patterns,
        use_format_patterns=request.use_format_patterns,
        custom_patterns=custom_patterns,
        custom_words=custom_words,
        source_field=request.source_field,
        target_field="enhanced_anonymized_text",
    )

    # Count changes
    changes_count = sum(
        1
        for s in enhanced_segments
        if s.get("enhanced_anonymized_text") != s.get(request.source_field, s.get("text"))
    )

    return EnhancedAnonymizationResponse(
        job_id=job_id,
        segments=[EnhancedSegmentResponse(**s) for s in enhanced_segments],
        changes_count=changes_count,
        patterns_applied={
            "institution_patterns": request.use_institution_patterns,
            "format_patterns": request.use_format_patterns,
            "custom_patterns": bool(custom_patterns),
            "custom_words": bool(custom_words),
        },
    )


@router.patch("/{job_id}/segments/{segment_id}", response_model=SegmentResponse)
async def update_segment(
    job_id: str,
    segment_id: int,
    update: SegmentUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> Segment:
    """
    Update a segment's text or speaker.

    Use this to correct transcription errors or assign speaker names.
    """
    # Find the segment
    query = select(Segment).where(Segment.id == segment_id, Segment.job_id == job_id)
    result = await db.execute(query)
    segment = result.scalar_one_or_none()

    if not segment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Segmentet hittades inte",
        )

    # Update fields if provided
    if update.text is not None:
        segment.text = update.text
    if update.speaker is not None:
        segment.speaker = update.speaker if update.speaker else None

    await db.commit()
    await db.refresh(segment)

    return segment


@router.post("/{job_id}/rename-speaker", response_model=SpeakerRenameResponse)
async def rename_speaker(
    job_id: str,
    rename: SpeakerRename,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> SpeakerRenameResponse:
    """
    Rename a speaker across all segments in a job.

    Useful for replacing generic names like "Talare 1" with actual names.
    """
    # Verify job exists
    job_query = select(Job).where(Job.id == job_id)
    job_result = await db.execute(job_query)
    job = job_result.scalar_one_or_none()

    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Jobbet hittades inte",
        )

    # Find all segments with the old speaker name
    segments_query = select(Segment).where(
        Segment.job_id == job_id, Segment.speaker == rename.old_name
    )
    result = await db.execute(segments_query)
    segments = result.scalars().all()

    if not segments:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Inga segment hittades med talaren '{rename.old_name}'",
        )

    # Update all segments
    for segment in segments:
        segment.speaker = rename.new_name

    await db.commit()

    return SpeakerRenameResponse(
        job_id=job_id,
        old_name=rename.old_name,
        new_name=rename.new_name,
        segments_updated=len(segments),
    )


@router.post("/{job_id}/run-anonymization")
async def run_anonymization_on_job(
    job_id: str,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> dict:
    """
    Run NER-based anonymization on an already completed transcription.

    Use this when anonymization was not enabled during initial transcription.
    Updates the anonymized_text field for all segments.
    """
    # Check if anonymization is available
    if not is_anonymization_available():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Avidentifieringstjänsten är inte tillgänglig. Transformers-biblioteket saknas.",
        )

    # Get job with segments
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
            detail=f"Jobbet måste vara klart för avidentifiering. Status: {job.status.value}",
        )

    # Check if already has anonymization
    has_existing = any(s.anonymized_text and s.anonymized_text != s.text for s in job.segments)

    # Convert segments to dict format for processing
    sorted_segments = sorted(job.segments, key=lambda s: s.segment_index)
    segments_data = [
        {
            "text": s.text,
            "segment_index": s.segment_index,
        }
        for s in sorted_segments
    ]

    # Run NER anonymization
    anonymized_segments = run_ner_anonymization(segments_data, progress_callback=None)

    # Update segments in database
    changes_count = 0
    for i, segment in enumerate(sorted_segments):
        new_text = anonymized_segments[i].get("anonymized_text", segment.text)
        if new_text != segment.text:
            segment.anonymized_text = new_text
            changes_count += 1
        elif not segment.anonymized_text:
            # Set to original if no changes
            segment.anonymized_text = segment.text

    # Update job to indicate anonymization is enabled
    job.enable_anonymization = True

    await db.commit()

    return {
        "job_id": job_id,
        "segments_processed": len(sorted_segments),
        "segments_anonymized": changes_count,
        "had_existing_anonymization": has_existing,
    }


@router.get("/search/global", response_model=SearchResponse)
async def search_transcripts(
    q: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    limit: int = 50,
) -> SearchResponse:
    """
    Search across all transcripts for matching text.

    Returns jobs with matching segments, grouped by job.
    """
    if not q or len(q.strip()) < 2:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Sökfrågan måste vara minst 2 tecken",
        )

    search_term = f"%{q.strip()}%"

    # Find matching segments with their jobs
    query = (
        select(Segment, Job)
        .join(Job, Segment.job_id == Job.id)
        .where(Segment.text.ilike(search_term))
        .where(Job.status == DBJobStatus.COMPLETED)
        .order_by(Job.created_at.desc(), Segment.segment_index)
        .limit(limit)
    )

    result = await db.execute(query)
    rows = result.all()

    # Group results by job
    jobs_map: dict[str, SearchResultJob] = {}
    for segment, job in rows:
        if job.id not in jobs_map:
            jobs_map[job.id] = SearchResultJob(
                job_id=job.id,
                file_name=job.file_name,
                created_at=job.created_at.isoformat(),
                segments=[],
                total_matches=0,
            )

        jobs_map[job.id].segments.append(
            SearchResultSegment(
                segment_index=segment.segment_index,
                start_time=segment.start_time,
                end_time=segment.end_time,
                text=segment.text,
                speaker=segment.speaker,
            )
        )
        jobs_map[job.id].total_matches += 1

    results = list(jobs_map.values())
    total_segments = sum(job.total_matches for job in results)

    return SearchResponse(
        query=q.strip(),
        results=results,
        total_jobs=len(results),
        total_segments=total_segments,
    )
