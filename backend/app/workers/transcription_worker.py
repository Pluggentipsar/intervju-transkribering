"""Background worker for processing transcription jobs."""

# Set environment variable for PyTorch 2.6+ compatibility BEFORE importing torch
import os
os.environ["TORCH_FORCE_WEIGHTS_ONLY_LOAD"] = "0"

# Also patch torch.load as backup
def _ensure_torch_patched():
    try:
        import torch
        import torch.serialization
        # Add safe globals for pyannote compatibility
        try:
            torch.serialization.add_safe_globals([torch.torch_version.TorchVersion])
        except Exception:
            pass
        # Patch torch.load to use weights_only=False by default
        if not hasattr(torch, '_original_load'):
            torch._original_load = torch.load
            def patched_load(*args, **kwargs):
                if 'weights_only' not in kwargs:
                    kwargs['weights_only'] = False
                return torch._original_load(*args, **kwargs)
            torch.load = patched_load
    except ImportError:
        pass

_ensure_torch_patched()

import asyncio
import logging
import queue
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime
from functools import partial
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import async_session_maker
from app.models.job import Job, JobStatus
from app.models.segment import Segment
from app.services.transcription import transcribe_audio
from app.services.diarization import add_speaker_labels, is_diarization_available
from app.services.anonymization import anonymize_segments, is_anonymization_available

logger = logging.getLogger(__name__)

# Thread pool for CPU-bound transcription work
_executor = ThreadPoolExecutor(max_workers=2)


async def update_job_progress(
    job_id: str,
    progress: int,
    current_step: str,
) -> None:
    """Update job progress in the database."""
    async with async_session_maker() as db:
        query = select(Job).where(Job.id == job_id)
        result = await db.execute(query)
        job = result.scalar_one_or_none()

        if job:
            job.progress = progress
            job.current_step = current_step
            await db.commit()


async def mark_job_started(job_id: str) -> None:
    """Mark job as started."""
    async with async_session_maker() as db:
        query = select(Job).where(Job.id == job_id)
        result = await db.execute(query)
        job = result.scalar_one_or_none()

        if job:
            job.status = JobStatus.PROCESSING
            job.started_at = datetime.utcnow()
            job.current_step = "starting"
            await db.commit()


async def mark_job_completed(
    job_id: str,
    duration_seconds: float,
    segment_count: int,
    word_count: int,
    speaker_count: int,
) -> None:
    """Mark job as completed with metadata."""
    async with async_session_maker() as db:
        query = select(Job).where(Job.id == job_id)
        result = await db.execute(query)
        job = result.scalar_one_or_none()

        if job:
            job.status = JobStatus.COMPLETED
            job.completed_at = datetime.utcnow()
            job.progress = 100
            job.current_step = "completed"
            job.duration_seconds = duration_seconds
            job.segment_count = segment_count
            job.word_count = word_count
            job.speaker_count = speaker_count
            await db.commit()


async def mark_job_failed(job_id: str, error_message: str) -> None:
    """Mark job as failed."""
    async with async_session_maker() as db:
        query = select(Job).where(Job.id == job_id)
        result = await db.execute(query)
        job = result.scalar_one_or_none()

        if job:
            job.status = JobStatus.FAILED
            job.completed_at = datetime.utcnow()
            job.error_message = error_message
            job.current_step = "failed"
            await db.commit()


async def save_segments(job_id: str, segments: list[dict]) -> None:
    """Save transcription segments to the database."""
    async with async_session_maker() as db:
        for i, seg_data in enumerate(segments):
            segment = Segment(
                job_id=job_id,
                segment_index=i,
                start_time=seg_data["start"],
                end_time=seg_data["end"],
                text=seg_data["text"],
                anonymized_text=seg_data.get("anonymized_text"),
                speaker=seg_data.get("speaker"),
                confidence=seg_data.get("confidence"),
            )
            db.add(segment)

        await db.commit()


def parse_ner_entity_types(ner_entity_types_str: str | None) -> set[str] | None:
    """Parse NER entity types from comma-separated string."""
    if not ner_entity_types_str:
        return None
    return set(ner_entity_types_str.split(","))


def run_transcription_sync(
    audio_path: str,
    model_id: str,
    language: str,
    enable_diarization: bool,
    enable_anonymization: bool,
    ner_entity_types_str: str | None,
    progress_queue: queue.Queue,
) -> dict:
    """
    Run transcription synchronously (for thread pool).

    Returns dict with segments, duration, and metadata.
    """
    def progress_callback(progress: int, step: str) -> None:
        """Send progress updates to the thread-safe queue."""
        try:
            progress_queue.put_nowait((progress, step))
        except Exception:
            pass  # Ignore if queue is full

    try:
        # Transcribe
        logger.info(f"Starting transcription with model: {model_id}")
        result = transcribe_audio(
            audio_path=audio_path,
            model_id=model_id,
            language=language,
            progress_callback=progress_callback,
        )

        logger.info(f"Transcription returned {len(result.segments)} segments")
        segments = result.segments
        logger.info(f"Transcription completed: {len(segments)} segments")

        # Add speaker labels if enabled
        if enable_diarization and is_diarization_available():
            logger.info("Starting speaker diarization...")
            segments = add_speaker_labels(
                segments=segments,
                audio_path=audio_path,
                progress_callback=progress_callback,
            )
            logger.info("Speaker diarization completed")
        elif enable_diarization:
            logger.warning("Diarization was enabled but is not available (missing HF token or dependencies)")
            progress_callback(90, "diarization_unavailable")

        # Anonymize sensitive information if enabled
        if enable_anonymization and is_anonymization_available():
            logger.info("Starting anonymization...")
            entity_types = parse_ner_entity_types(ner_entity_types_str)
            segments = anonymize_segments(
                segments=segments,
                progress_callback=progress_callback,
                entity_types=entity_types,
            )
            logger.info("Anonymization completed")
        elif enable_anonymization:
            logger.warning("Anonymization was enabled but is not available (missing transformers)")
            progress_callback(95, "anonymization_unavailable")

        # Calculate metadata
        logger.info("Calculating metadata...")
        speakers = set(s.get("speaker") for s in segments if s.get("speaker"))
        word_count = sum(len(s["text"].split()) for s in segments)

        logger.info(f"Metadata done: {len(speakers)} speakers, {word_count} words")
        return {
            "segments": segments,
            "duration": result.duration,
            "speaker_count": len(speakers),
            "word_count": word_count,
        }
    except Exception as e:
        logger.exception(f"Transcription failed: {e}")
        raise


async def process_transcription_job(job_id: str) -> None:
    """
    Process a transcription job in the background.

    This is the main entry point called from the API.
    """
    logger.info(f"Starting transcription job: {job_id}")

    # Get job details
    async with async_session_maker() as db:
        query = select(Job).where(Job.id == job_id)
        result = await db.execute(query)
        job = result.scalar_one_or_none()

        if not job:
            logger.error(f"Job not found: {job_id}")
            return

        audio_path = job.file_path
        model_id = job.model
        language = job.language
        enable_diarization = job.enable_diarization
        enable_anonymization = job.enable_anonymization
        ner_entity_types_str = job.ner_entity_types

    # Mark as started
    await mark_job_started(job_id)

    # Create thread-safe progress queue for communication with sync code
    progress_queue: queue.Queue = queue.Queue()

    # Start progress monitoring task
    async def monitor_progress() -> None:
        while True:
            try:
                # Check queue in non-blocking way
                await asyncio.sleep(0.5)
                while not progress_queue.empty():
                    try:
                        progress, step = progress_queue.get_nowait()
                        await update_job_progress(job_id, progress, step)
                    except queue.Empty:
                        break
            except asyncio.CancelledError:
                break

    monitor_task = asyncio.create_task(monitor_progress())

    try:
        # Run transcription in thread pool with timeout (30 minutes max)
        loop = asyncio.get_event_loop()
        logger.info(f"Starting transcription thread for job {job_id}")
        transcription_result = await asyncio.wait_for(
            loop.run_in_executor(
                _executor,
                partial(
                    run_transcription_sync,
                    audio_path,
                    model_id,
                    language,
                    enable_diarization,
                    enable_anonymization,
                    ner_entity_types_str,
                    progress_queue,
                ),
            ),
            timeout=1800.0,  # 30 minutes
        )
        logger.info(f"Transcription thread completed for job {job_id}")

        # Stop progress monitor
        monitor_task.cancel()
        try:
            await monitor_task
        except asyncio.CancelledError:
            pass

        # Save segments
        await update_job_progress(job_id, 95, "saving_results")
        await save_segments(job_id, transcription_result["segments"])

        # Mark as completed
        await mark_job_completed(
            job_id=job_id,
            duration_seconds=transcription_result["duration"],
            segment_count=len(transcription_result["segments"]),
            word_count=transcription_result["word_count"],
            speaker_count=transcription_result["speaker_count"],
        )

        logger.info(f"Transcription job completed: {job_id}")

    except asyncio.TimeoutError:
        logger.error(f"Transcription job timed out after 30 minutes: {job_id}")
        monitor_task.cancel()
        await mark_job_failed(job_id, "Transcription timed out after 30 minutes")
    except Exception as e:
        logger.exception(f"Transcription job failed: {job_id}")
        monitor_task.cancel()
        await mark_job_failed(job_id, str(e))
