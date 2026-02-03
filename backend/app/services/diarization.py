"""Speaker diarization service using WhisperX and pyannote."""

import logging
from pathlib import Path
from typing import Callable

from app.config import settings

logger = logging.getLogger(__name__)

# Flag to track if diarization is available
_diarization_available: bool | None = None


def is_diarization_available() -> bool:
    """Check if diarization dependencies are installed and configured."""
    global _diarization_available

    if _diarization_available is not None:
        return _diarization_available

    try:
        import whisperx
        from pyannote.audio import Pipeline

        # Check if HuggingFace token is configured
        if not settings.hf_token:
            logger.warning(
                "HuggingFace token not configured. "
                "Speaker diarization requires accepting pyannote terms and setting HF_TOKEN."
            )
            _diarization_available = False
            return False

        _diarization_available = True
        return True

    except ImportError as e:
        logger.warning(f"Diarization dependencies not installed: {e}")
        _diarization_available = False
        return False


def add_speaker_labels(
    segments: list[dict],
    audio_path: Path | str,
    progress_callback: Callable[[int, str], None] | None = None,
) -> list[dict]:
    """
    Add speaker labels to transcription segments using WhisperX and pyannote.

    Args:
        segments: List of transcription segments with start, end, text
        audio_path: Path to the original audio file
        progress_callback: Optional callback for progress updates

    Returns:
        Updated segments with speaker labels
    """
    if not is_diarization_available():
        logger.warning("Diarization not available, skipping speaker identification")
        # Update progress to skip diarization range (70% -> 90%)
        if progress_callback:
            progress_callback(90, "diarization_skipped")
        return segments

    try:
        import whisperx
        import torch

        audio_path = Path(audio_path)

        logger.info("Starting speaker diarization...")
        if progress_callback:
            progress_callback(72, "loading_diarization_model")

        device = "cuda" if torch.cuda.is_available() else "cpu"
        logger.info(f"Using device: {device}")

        # Load audio
        logger.info(f"Loading audio from {audio_path}")
        audio = whisperx.load_audio(str(audio_path))

        if progress_callback:
            progress_callback(75, "diarizing")

        # Run diarization
        logger.info("Initializing diarization pipeline...")
        diarize_model = whisperx.DiarizationPipeline(
            use_auth_token=settings.hf_token,
            device=device,
        )

        logger.info("Running diarization (this may take a while)...")
        diarize_segments = diarize_model(audio)
        logger.info("Diarization completed")

        if progress_callback:
            progress_callback(85, "assigning_speakers")

        # Convert our segments to whisperx format
        whisperx_segments = {
            "segments": [
                {
                    "start": s["start"],
                    "end": s["end"],
                    "text": s["text"],
                }
                for s in segments
            ]
        }

        # Assign speakers
        result = whisperx.assign_word_speakers(diarize_segments, whisperx_segments)

        # Update original segments with speaker info
        for i, segment in enumerate(result.get("segments", [])):
            if i < len(segments):
                speaker = segment.get("speaker")
                if speaker:
                    # Convert SPEAKER_00 to "Talare 1", etc.
                    speaker_num = int(speaker.split("_")[1]) + 1
                    segments[i]["speaker"] = f"Talare {speaker_num}"

        if progress_callback:
            progress_callback(90, "diarization_complete")

        logger.info(f"Diarization complete, found speakers in {len(segments)} segments")
        return segments

    except Exception as e:
        logger.error(f"Diarization failed: {e}")
        if progress_callback:
            progress_callback(90, "diarization_failed")
        # Return segments without speaker labels
        return segments
