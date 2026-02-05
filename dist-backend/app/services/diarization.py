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

# Patch huggingface_hub to accept old 'use_auth_token' parameter
def _patch_huggingface_hub():
    """Patch hf_hub_download to convert use_auth_token to token."""
    try:
        import huggingface_hub
        if not hasattr(huggingface_hub, '_patched_for_old_api'):
            original_download = huggingface_hub.hf_hub_download

            def patched_download(*args, **kwargs):
                # Convert old parameter name to new
                if 'use_auth_token' in kwargs:
                    kwargs['token'] = kwargs.pop('use_auth_token')
                return original_download(*args, **kwargs)

            huggingface_hub.hf_hub_download = patched_download
            huggingface_hub._patched_for_old_api = True
    except ImportError:
        pass

_patch_huggingface_hub()

# Patch torch.load early for PyTorch 2.6+ compatibility
def _patch_torch_load():
    """Patch torch.load for PyTorch 2.6+ compatibility with pyannote models."""
    try:
        import torch
        if not hasattr(torch, '_patched_for_diarization'):
            original_load = torch.load
            def safe_load(*args, **kwargs):
                kwargs['weights_only'] = False
                return original_load(*args, **kwargs)
            torch.load = safe_load
            torch._patched_for_diarization = True
    except ImportError:
        pass

_patch_torch_load()

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


def _get_hf_token() -> str | None:
    """Get HF token from environment or config file."""
    # Check environment variable first (set by settings API)
    token = os.environ.get("HF_TOKEN")
    if token:
        return token

    # Check settings (loaded from .env at startup)
    if settings.hf_token:
        return settings.hf_token

    # Check config.txt file (saved by settings API)
    config_path = Path(__file__).parent.parent.parent / "config.txt"
    if config_path.exists():
        try:
            with open(config_path, "r", encoding="utf-8") as f:
                for line in f:
                    if line.strip().startswith("HF_TOKEN="):
                        token = line.strip().split("=", 1)[1]
                        if token and not token.startswith("#"):
                            # Also set in environment for future use
                            os.environ["HF_TOKEN"] = token
                            return token
        except Exception:
            pass

    return None


def is_diarization_available() -> bool:
    """Check if diarization dependencies are installed and configured."""
    global _diarization_available

    # Don't cache when token is missing - it might be configured later
    # Patch torch BEFORE importing pyannote
    _patch_torch_for_pyannote()

    try:
        import whisperx
        from pyannote.audio import Pipeline

        # Check if HuggingFace token is configured
        hf_token = _get_hf_token()
        if not hf_token:
            logger.warning(
                "HuggingFace token not configured. "
                "Speaker diarization requires accepting pyannote terms and setting HF_TOKEN."
            )
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

            # Set HF_TOKEN env var for newer huggingface_hub versions
            hf_token = _get_hf_token()
            if hf_token:
                os.environ["HF_TOKEN"] = hf_token

            # Try with 'token' parameter first (newer API), fall back to use_auth_token
            try:
                _diarization_model = DiarizationPipeline(
                    token=hf_token,
                    device=device,
                )
            except TypeError:
                _diarization_model = DiarizationPipeline(
                    use_auth_token=hf_token,
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
