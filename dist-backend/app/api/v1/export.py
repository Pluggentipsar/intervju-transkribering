"""Export endpoints."""

from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse, JSONResponse, PlainTextResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.config import settings
from app.db.database import get_db
from app.models.job import Job, JobStatus

router = APIRouter()

# Get absolute path to backend directory
BACKEND_DIR = Path(__file__).resolve().parent.parent.parent.parent

# MIME types for audio files
AUDIO_MIME_TYPES = {
    ".mp3": "audio/mpeg",
    ".wav": "audio/wav",
    ".m4a": "audio/mp4",
    ".ogg": "audio/ogg",
    ".flac": "audio/flac",
    ".webm": "audio/webm",
}


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
    anonymized: bool = False,
    db: AsyncSession = Depends(get_db),
):
    """
    Export transcript in various formats.

    Formats:
    - txt: Plain text with timestamps
    - md: Markdown with speaker sections
    - json: Structured JSON

    Parameters:
    - anonymized: If true, use anonymized_text instead of original text
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
        return export_as_text(job, sorted_segments, anonymized)
    elif format == "md":
        return export_as_markdown(job, sorted_segments, anonymized)
    elif format == "json":
        return export_as_json(job, sorted_segments, anonymized)
    elif format == "srt":
        return export_as_srt(job, sorted_segments, anonymized)
    elif format == "vtt":
        return export_as_vtt(job, sorted_segments, anonymized)
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Okant format: {format}. Anvand: txt, md, json, srt, vtt",
        )


@router.get("/{job_id}/audio")
async def get_audio(
    job_id: str,
    db: AsyncSession = Depends(get_db),
) -> FileResponse:
    """
    Stream the audio file for a job.

    Returns the original uploaded audio file for playback.
    """
    query = select(Job).where(Job.id == job_id)
    result = await db.execute(query)
    job = result.scalar_one_or_none()

    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Jobbet hittades inte",
        )

    # Get the audio file path (handle both relative and absolute paths)
    file_path = Path(job.file_path)
    if not file_path.is_absolute():
        file_path = BACKEND_DIR / file_path
    if not file_path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ljudfilen hittades inte",
        )

    # Determine MIME type
    ext = file_path.suffix.lower()
    media_type = AUDIO_MIME_TYPES.get(ext, "audio/mpeg")

    return FileResponse(
        path=file_path,
        media_type=media_type,
        filename=job.file_name,
    )


def get_segment_text(segment, anonymized: bool) -> str:
    """Get text from segment, using anonymized version if requested and available."""
    if anonymized and segment.anonymized_text:
        return segment.anonymized_text
    return segment.text


def export_as_text(job: Job, segments: list, anonymized: bool = False) -> PlainTextResponse:
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
        text = get_segment_text(segment, anonymized)
        lines.append(f"[{timestamp}] {speaker}{text}")

    return PlainTextResponse(
        content="\n".join(lines),
        headers={
            "Content-Disposition": f'attachment; filename="{job.file_name}.txt"'
        },
    )


def export_as_markdown(job: Job, segments: list, anonymized: bool = False) -> PlainTextResponse:
    """Export as Markdown."""
    lines = [
        f"# Transkription: {job.file_name}",
        "",
        f"**Datum:** {job.created_at.strftime('%Y-%m-%d %H:%M')}",
        f"**Modell:** {job.model}",
        f"**Längd:** {format_timestamp(job.duration_seconds or 0)}",
        "",
        "---",
        "",
        "## Transkript",
        "",
    ]

    current_speaker = None
    for segment in segments:
        timestamp = format_timestamp(segment.start_time)
        text = get_segment_text(segment, anonymized)

        # Add speaker header if changed
        if segment.speaker and segment.speaker != current_speaker:
            current_speaker = segment.speaker
            lines.append(f"\n### {current_speaker}\n")

        lines.append(f"**[{timestamp}]** {text}")

    return PlainTextResponse(
        content="\n".join(lines),
        media_type="text/markdown",
        headers={
            "Content-Disposition": f'attachment; filename="{job.file_name}.md"'
        },
    )


def export_as_json(job: Job, segments: list, anonymized: bool = False) -> JSONResponse:
    """Export as structured JSON."""
    data = {
        "job_id": job.id,
        "file_name": job.file_name,
        "created_at": job.created_at.isoformat(),
        "model": job.model,
        "duration_seconds": job.duration_seconds,
        "anonymized": anonymized,
        "segments": [
            {
                "index": s.segment_index,
                "start": s.start_time,
                "end": s.end_time,
                "text": get_segment_text(s, anonymized),
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


def format_srt_timestamp(seconds: float) -> str:
    """Format seconds as SRT timestamp: HH:MM:SS,mmm."""
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    secs = int(seconds % 60)
    millis = int((seconds % 1) * 1000)
    return f"{hours:02d}:{minutes:02d}:{secs:02d},{millis:03d}"


def format_vtt_timestamp(seconds: float) -> str:
    """Format seconds as VTT timestamp: HH:MM:SS.mmm."""
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    secs = int(seconds % 60)
    millis = int((seconds % 1) * 1000)
    return f"{hours:02d}:{minutes:02d}:{secs:02d}.{millis:03d}"


def export_as_srt(job: Job, segments: list, anonymized: bool = False) -> PlainTextResponse:
    """Export as SRT subtitle format."""
    lines = []

    for i, segment in enumerate(segments, start=1):
        start_time = format_srt_timestamp(segment.start_time)
        end_time = format_srt_timestamp(segment.end_time)
        text = get_segment_text(segment, anonymized)

        # Add speaker prefix if available
        if segment.speaker:
            text = f"[{segment.speaker}] {text}"

        lines.append(str(i))
        lines.append(f"{start_time} --> {end_time}")
        lines.append(text)
        lines.append("")  # Empty line between entries

    return PlainTextResponse(
        content="\n".join(lines),
        media_type="text/plain",
        headers={
            "Content-Disposition": f'attachment; filename="{job.file_name}.srt"'
        },
    )


def export_as_vtt(job: Job, segments: list, anonymized: bool = False) -> PlainTextResponse:
    """Export as WebVTT subtitle format."""
    lines = ["WEBVTT", ""]  # VTT header

    for i, segment in enumerate(segments, start=1):
        start_time = format_vtt_timestamp(segment.start_time)
        end_time = format_vtt_timestamp(segment.end_time)
        text = get_segment_text(segment, anonymized)

        # Add speaker prefix if available
        if segment.speaker:
            text = f"<v {segment.speaker}>{text}"

        lines.append(str(i))
        lines.append(f"{start_time} --> {end_time}")
        lines.append(text)
        lines.append("")  # Empty line between entries

    return PlainTextResponse(
        content="\n".join(lines),
        media_type="text/vtt",
        headers={
            "Content-Disposition": f'attachment; filename="{job.file_name}.vtt"'
        },
    )
