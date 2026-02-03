"""Audio editor API endpoints."""

import subprocess
import tempfile
from pathlib import Path
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.database import get_db
from app.models.job import Job
from app.models.job import JobStatus as DBJobStatus
from app.models.segment import Segment
from app.models.word import Word
from app.schemas.segment import (
    AudioEditRequest,
    AudioEditResponse,
    EditableTranscriptResponse,
    SegmentWithWordsResponse,
    WordEditRequest,
    WordEditResponse,
    WordResponse,
)

router = APIRouter()


@router.get("/{job_id}/editable-transcript", response_model=EditableTranscriptResponse)
async def get_editable_transcript(
    job_id: str,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> EditableTranscriptResponse:
    """
    Get the transcript with word-level timestamps for editing.

    Returns all segments with their words, including the current inclusion state.
    """
    query = (
        select(Job)
        .where(Job.id == job_id)
        .options(selectinload(Job.segments).selectinload(Segment.words))
    )
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
            detail="Transkriptet är inte klart",
        )

    # Sort segments and their words
    sorted_segments = sorted(job.segments, key=lambda s: s.segment_index)

    segments_response = []
    for segment in sorted_segments:
        sorted_words = sorted(segment.words, key=lambda w: w.word_index)
        segments_response.append(
            SegmentWithWordsResponse(
                id=segment.id,
                segment_index=segment.segment_index,
                start_time=segment.start_time,
                end_time=segment.end_time,
                text=segment.text,
                speaker=segment.speaker,
                words=[WordResponse.model_validate(w) for w in sorted_words],
            )
        )

    return EditableTranscriptResponse(
        job_id=job.id,
        file_name=job.file_name,
        duration=job.duration_seconds or 0,
        segments=segments_response,
    )


@router.post("/{job_id}/words/edit", response_model=WordEditResponse)
async def update_word_inclusion(
    job_id: str,
    request: WordEditRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> WordEditResponse:
    """
    Update the inclusion status of words.

    Set included=False to mark words for removal in edited audio.
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

    # Get words that belong to this job's segments
    words_query = (
        select(Word)
        .join(Segment, Word.segment_id == Segment.id)
        .where(Segment.job_id == job_id)
        .where(Word.id.in_(request.word_ids))
    )
    result = await db.execute(words_query)
    words = result.scalars().all()

    if not words:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Inga ord hittades",
        )

    # Update inclusion status
    for word in words:
        word.included = request.included

    await db.commit()

    return WordEditResponse(updated_count=len(words))


@router.get("/{job_id}/download-edited-audio")
async def download_edited_audio(
    job_id: str,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> FileResponse:
    """
    Download edited audio file based on current word inclusion status.

    Uses the word inclusion state stored in the database.
    Words marked as excluded (included=False) will be removed from the audio.
    """
    # Get job with segments and words
    query = (
        select(Job)
        .where(Job.id == job_id)
        .options(selectinload(Job.segments).selectinload(Segment.words))
    )
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
            detail="Transkriptet är inte klart",
        )

    audio_path = Path(job.file_path)
    if not audio_path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ljudfilen hittades inte",
        )

    # Collect time ranges to KEEP (where words are included)
    keep_ranges: list[tuple[float, float]] = []

    sorted_segments = sorted(job.segments, key=lambda s: s.segment_index)

    for segment in sorted_segments:
        sorted_words = sorted(segment.words, key=lambda w: w.word_index)

        if not sorted_words:
            # No word-level data, use segment level
            keep_ranges.append((segment.start_time, segment.end_time))
            continue

        # Group consecutive included words
        current_start: float | None = None
        current_end: float | None = None

        for word in sorted_words:
            if word.included:
                if current_start is None:
                    current_start = word.start_time
                current_end = word.end_time
            else:
                # Word is excluded, save current range if exists
                if current_start is not None and current_end is not None:
                    keep_ranges.append((current_start, current_end))
                current_start = None
                current_end = None

        # Don't forget the last range
        if current_start is not None and current_end is not None:
            keep_ranges.append((current_start, current_end))

    if not keep_ranges:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Alla ord är borttagna, kan inte generera tom ljudfil",
        )

    # Merge overlapping or adjacent ranges (with small gap tolerance)
    merged_ranges: list[tuple[float, float]] = []
    for start, end in sorted(keep_ranges):
        if merged_ranges and start <= merged_ranges[-1][1] + 0.05:  # 50ms tolerance
            merged_ranges[-1] = (merged_ranges[-1][0], max(merged_ranges[-1][1], end))
        else:
            merged_ranges.append((start, end))

    # Generate edited audio using ffmpeg
    try:
        edited_audio_path = await _generate_edited_audio_ffmpeg(
            audio_path, merged_ranges, job_id
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Kunde inte generera redigerat ljud: {str(e)}",
        )

    # Return the file
    edited_filename = f"{audio_path.stem}_edited{audio_path.suffix}"

    return FileResponse(
        path=edited_audio_path,
        filename=edited_filename,
        media_type="audio/mpeg",
    )


@router.post("/{job_id}/generate-edited-audio")
async def generate_edited_audio(
    job_id: str,
    request: AudioEditRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> FileResponse:
    """
    Generate an edited audio file based on word inclusion status.

    Words marked as excluded (included=False) will be removed from the audio.
    Returns the edited audio file for download.
    """
    # Get job with segments and words
    query = (
        select(Job)
        .where(Job.id == job_id)
        .options(selectinload(Job.segments).selectinload(Segment.words))
    )
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
            detail="Transkriptet är inte klart",
        )

    audio_path = Path(job.file_path)
    if not audio_path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ljudfilen hittades inte",
        )

    # If specific word IDs to exclude are provided, update them first
    if request.exclude_word_ids:
        words_to_exclude = (
            select(Word)
            .join(Segment, Word.segment_id == Segment.id)
            .where(Segment.job_id == job_id)
            .where(Word.id.in_(request.exclude_word_ids))
        )
        result = await db.execute(words_to_exclude)
        for word in result.scalars():
            word.included = False
        await db.commit()

        # Refresh job data
        await db.refresh(job)

    # Collect time ranges to KEEP (where words are included)
    keep_ranges: list[tuple[float, float]] = []

    sorted_segments = sorted(job.segments, key=lambda s: s.segment_index)

    for segment in sorted_segments:
        sorted_words = sorted(segment.words, key=lambda w: w.word_index)

        if not sorted_words:
            # No word-level data, use segment level
            keep_ranges.append((segment.start_time, segment.end_time))
            continue

        # Group consecutive included words
        current_start: float | None = None
        current_end: float | None = None

        for word in sorted_words:
            if word.included:
                if current_start is None:
                    current_start = word.start_time
                current_end = word.end_time
            else:
                # Word is excluded, save current range if exists
                if current_start is not None and current_end is not None:
                    keep_ranges.append((current_start, current_end))
                current_start = None
                current_end = None

        # Don't forget the last range
        if current_start is not None and current_end is not None:
            keep_ranges.append((current_start, current_end))

    if not keep_ranges:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Alla ord är borttagna, kan inte generera tom ljudfil",
        )

    # Merge overlapping or adjacent ranges (with small gap tolerance)
    merged_ranges: list[tuple[float, float]] = []
    for start, end in sorted(keep_ranges):
        if merged_ranges and start <= merged_ranges[-1][1] + 0.05:  # 50ms tolerance
            merged_ranges[-1] = (merged_ranges[-1][0], max(merged_ranges[-1][1], end))
        else:
            merged_ranges.append((start, end))

    # Generate edited audio using ffmpeg
    try:
        edited_audio_path = await _generate_edited_audio_ffmpeg(
            audio_path, merged_ranges, job_id
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Kunde inte generera redigerat ljud: {str(e)}",
        )

    # Return the file
    edited_filename = f"{audio_path.stem}_edited{audio_path.suffix}"

    return FileResponse(
        path=edited_audio_path,
        filename=edited_filename,
        media_type="audio/mpeg",
    )


async def _generate_edited_audio_ffmpeg(
    audio_path: Path,
    keep_ranges: list[tuple[float, float]],
    job_id: str,
) -> Path:
    """
    Generate edited audio using ffmpeg by concatenating kept segments.

    Args:
        audio_path: Path to original audio file
        keep_ranges: List of (start, end) tuples for segments to keep
        job_id: Job ID for temp file naming

    Returns:
        Path to the edited audio file
    """
    # Create temp directory for segment files
    temp_dir = Path(tempfile.mkdtemp(prefix=f"audio_edit_{job_id}_"))

    try:
        segment_files: list[Path] = []

        # Extract each segment
        for i, (start, end) in enumerate(keep_ranges):
            segment_path = temp_dir / f"segment_{i:04d}.mp3"
            duration = end - start

            # Use ffmpeg to extract segment
            cmd = [
                "ffmpeg",
                "-y",
                "-i", str(audio_path),
                "-ss", str(start),
                "-t", str(duration),
                "-acodec", "libmp3lame",
                "-q:a", "2",
                str(segment_path),
            ]

            result = subprocess.run(cmd, capture_output=True, text=True)
            if result.returncode != 0:
                raise RuntimeError(f"ffmpeg extraction failed: {result.stderr}")

            segment_files.append(segment_path)

        # Create concat file
        concat_file = temp_dir / "concat.txt"
        with open(concat_file, "w") as f:
            for segment_path in segment_files:
                f.write(f"file '{segment_path}'\n")

        # Concatenate all segments
        output_path = temp_dir / f"edited_{job_id}.mp3"
        cmd = [
            "ffmpeg",
            "-y",
            "-f", "concat",
            "-safe", "0",
            "-i", str(concat_file),
            "-acodec", "libmp3lame",
            "-q:a", "2",
            str(output_path),
        ]

        result = subprocess.run(cmd, capture_output=True, text=True)
        if result.returncode != 0:
            raise RuntimeError(f"ffmpeg concat failed: {result.stderr}")

        return output_path

    except Exception:
        # Clean up on error
        import shutil
        shutil.rmtree(temp_dir, ignore_errors=True)
        raise


@router.post("/{job_id}/reset-edits", response_model=WordEditResponse)
async def reset_all_edits(
    job_id: str,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> WordEditResponse:
    """
    Reset all word edits, marking all words as included.
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

    # Get all excluded words for this job
    words_query = (
        select(Word)
        .join(Segment, Word.segment_id == Segment.id)
        .where(Segment.job_id == job_id)
        .where(Word.included == False)  # noqa: E712
    )
    result = await db.execute(words_query)
    words = result.scalars().all()

    # Reset all to included
    for word in words:
        word.included = True

    await db.commit()

    return WordEditResponse(updated_count=len(words))
