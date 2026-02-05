"""Speaker diarization service using WhisperX and pyannote."""

import logging
import os
from pathlib import Path
from typing import Callable

# Add ffmpeg to PATH if installed via winget (Windows)
_ffmpeg_paths = [
    r"C:\Users\plugg\AppData\Local\Microsoft\WinGet\Packages\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-8.0.1-full_build\bin",
    r"C:\ffmpeg\bin",
]
for _ffmpeg_path in _ffmpeg_paths:
    if os.path.exists(_ffmpeg_path) and _ffmpeg_path not in os.environ.get("PATH", ""):
        os.environ["PATH"] = _ffmpeg_path + os.pathsep + os.environ.get("PATH", "")
        break

from app.config import settings

logger = logging.getLogger(__name__)

# Flag to track if diarization is available
_diarization_available: bool | None = None

# Cache for diarization model
_diarization_model = None


def _patch_torch_for_pyannote():
    """Patch torch.load for PyTorch 2.6+ compatibility with pyannote models."""
    try:
        import torch
        if not hasattr(torch, '_patched_for_pyannote'):
            original_load = torch.load

            def safe_load(*args, **kwargs):
                kwargs['weights_only'] = False
                return original_load(*args, **kwargs)

            torch.load = safe_load
            torch._patched_for_pyannote = True
            logger.info("Patched torch.load for pyannote compatibility")
    except ImportError:
        pass


def is_diarization_available() -> bool:
    """Check if diarization dependencies are installed and configured."""
    global _diarization_available

    if _diarization_available is not None:
        return _diarization_available

    # Patch torch BEFORE importing pyannote
    _patch_torch_for_pyannote()

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
        logger.warning("Diarization not available, returning segments without speaker labels")
        return segments

    try:
        # Ensure torch is patched before any pyannote imports
        _patch_torch_for_pyannote()

        import torch
        import whisperx
        from whisperx.diarize import DiarizationPipeline

        global _diarization_model

        audio_path = Path(audio_path)
        device = "cuda" if torch.cuda.is_available() else "cpu"

        # Load or use cached diarization model
        if _diarization_model is None:
            if progress_callback:
                progress_callback(71, "loading_diarization_model")
            logger.info("Loading diarization model (first time, may take a while)...")

            _diarization_model = DiarizationPipeline(
                use_auth_token=settings.hf_token,
                device=device,
            )
            logger.info("Diarization model loaded successfully")
        else:
            logger.info("Using cached diarization model")

        if progress_callback:
            progress_callback(75, "loading_audio_for_diarization")

        # Load audio
        audio = whisperx.load_audio(str(audio_path))

        if progress_callback:
            progress_callback(78, "diarizing")

        # Run diarization
        logger.info("Running diarization...")
        diarize_segments = _diarization_model(audio)
        logger.info(f"Diarization returned {len(diarize_segments) if diarize_segments is not None else 0} speaker segments")

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
        logger.info(f"Assigning speakers to {len(segments)} transcription segments...")
        result = whisperx.assign_word_speakers(diarize_segments, whisperx_segments)

        # Log what we got back
        result_segments = result.get("segments", [])
        logger.info(f"assign_word_speakers returned {len(result_segments)} segments")

        # Update original segments with speaker info
        speakers_assigned = 0
        unique_speakers = set()
        for i, segment in enumerate(result_segments):
            if i < len(segments):
                speaker = segment.get("speaker")
                if speaker:
                    unique_speakers.add(speaker)
                    # Convert SPEAKER_00 to "Talare 1", etc.
                    speaker_num = int(speaker.split("_")[1]) + 1
                    segments[i]["speaker"] = f"Talare {speaker_num}"
                    speakers_assigned += 1

        if progress_callback:
            progress_callback(90, "diarization_complete")

        logger.info(f"Diarization complete: {speakers_assigned}/{len(segments)} segments got speakers, {len(unique_speakers)} unique speakers found")
        return segments

    except Exception as e:
        logger.error(f"Diarization failed: {e}")
        if progress_callback:
            progress_callback(90, "diarization_failed")
        # Return segments without speaker labels
        return segments
