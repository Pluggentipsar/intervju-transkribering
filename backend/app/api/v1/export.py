"""Export endpoints."""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import PlainTextResponse, JSONResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.database import get_db
from app.models.job import Job, JobStatus

router = APIRouter()


def format_timestamp(seconds: float) -> str:
    """Format seconds as HH:MM:SS."""
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    secs = int(seconds % 60)
    if hours > 0:
        return f"{hours:02d}:{minutes:02d}:{secs:02d}"
    return f"{minutes:02d}:{secs:02d}"


@router.get("/{job_id}/export")
async def export_transcript(
    job_id: str,
    format: str = "txt",
    db: AsyncSession = Depends(get_db),
):
    """
    Export transcript in various formats.

    Formats:
    - txt: Plain text with timestamps
    - md: Markdown with speaker sections
    - json: Structured JSON
    """
    query = select(Job).where(Job.id == job_id).options(selectinload(Job.segments))
    result = await db.execute(query)
    job = result.scalar_one_or_none()

    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Jobbet hittades inte",
        )

    if job.status != JobStatus.COMPLETED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Transkriptet ar inte klart. Status: {job.status.value}",
        )

    sorted_segments = sorted(job.segments, key=lambda s: s.segment_index)

    if format == "txt":
        return export_as_text(job, sorted_segments)
    elif format == "md":
        return export_as_markdown(job, sorted_segments)
    elif format == "json":
        return export_as_json(job, sorted_segments)
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Okant format: {format}. Anvand: txt, md, json",
        )


def export_as_text(job: Job, segments: list) -> PlainTextResponse:
    """Export as plain text."""
    lines = [
        f"Transkription: {job.file_name}",
        f"Datum: {job.created_at.strftime('%Y-%m-%d %H:%M')}",
        f"Modell: {job.model}",
        "",
        "-" * 50,
        "",
    ]

    for segment in segments:
        timestamp = format_timestamp(segment.start_time)
        speaker = f"[{segment.speaker}] " if segment.speaker else ""
        lines.append(f"[{timestamp}] {speaker}{segment.text}")

    return PlainTextResponse(
        content="\n".join(lines),
        headers={
            "Content-Disposition": f'attachment; filename="{job.file_name}.txt"'
        },
    )


def export_as_markdown(job: Job, segments: list) -> PlainTextResponse:
    """Export as Markdown."""
    lines = [
        f"# Transkription: {job.file_name}",
        "",
        f"**Datum:** {job.created_at.strftime('%Y-%m-%d %H:%M')}",
        f"**Modell:** {job.model}",
        f"**Langd:** {format_timestamp(job.duration_seconds or 0)}",
        "",
        "---",
        "",
        "## Transkript",
        "",
    ]

    current_speaker = None
    for segment in segments:
        timestamp = format_timestamp(segment.start_time)

        # Add speaker header if changed
        if segment.speaker and segment.speaker != current_speaker:
            current_speaker = segment.speaker
            lines.append(f"\n### {current_speaker}\n")

        lines.append(f"**[{timestamp}]** {segment.text}")

    return PlainTextResponse(
        content="\n".join(lines),
        media_type="text/markdown",
        headers={
            "Content-Disposition": f'attachment; filename="{job.file_name}.md"'
        },
    )


def export_as_json(job: Job, segments: list) -> JSONResponse:
    """Export as structured JSON."""
    data = {
        "job_id": job.id,
        "file_name": job.file_name,
        "created_at": job.created_at.isoformat(),
        "model": job.model,
        "duration_seconds": job.duration_seconds,
        "segments": [
            {
                "index": s.segment_index,
                "start": s.start_time,
                "end": s.end_time,
                "text": s.text,
                "speaker": s.speaker,
                "confidence": s.confidence,
            }
            for s in segments
        ],
        "metadata": {
            "speaker_count": job.speaker_count,
            "word_count": job.word_count,
            "segment_count": len(segments),
        },
    }

    return JSONResponse(
        content=data,
        headers={
            "Content-Disposition": f'attachment; filename="{job.file_name}.json"'
        },
    )
