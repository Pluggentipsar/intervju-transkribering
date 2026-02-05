"""KB-Whisper transcription service using faster-whisper."""

import logging
import os
import sys
from pathlib import Path
from typing import Callable, Iterator

try:
    from faster_whisper import WhisperModel
    WHISPER_AVAILABLE = True
except ImportError:
    WhisperModel = None  # type: ignore
    WHISPER_AVAILABLE = False

try:
    from huggingface_hub import snapshot_download
    HF_HUB_AVAILABLE = True
except ImportError:
    snapshot_download = None  # type: ignore
    HF_HUB_AVAILABLE = False

from app.config import settings

logger = logging.getLogger(__name__)


def download_model_without_symlinks(model_id: str, download_dir: Path) -> str:
    """
    Download a model from HuggingFace Hub without using symlinks.
    This is necessary on Windows where unprivileged users can't create symlinks.

    Returns the path to the downloaded model directory.
    """
    if not HF_HUB_AVAILABLE:
        raise RuntimeError("huggingface_hub is not installed")

    # Create a sanitized directory name from model_id
    safe_name = model_id.replace("/", "--")
    local_dir = download_dir / safe_name

    # Check if already downloaded
    if local_dir.exists() and any(local_dir.iterdir()):
        logger.info(f"Model already downloaded: {local_dir}")
        return str(local_dir)

    logger.info(f"Downloading model {model_id} to {local_dir} (without symlinks)")

    # Download without symlinks - this copies files directly
    snapshot_download(
        repo_id=model_id,
        local_dir=str(local_dir),
        local_dir_use_symlinks=False,  # Critical: don't use symlinks on Windows
    )

    logger.info(f"Model downloaded successfully: {local_dir}")
    return str(local_dir)

# Cache for loaded models
_model_cache: dict[str, WhisperModel] = {}


class TranscriptionResult:
    """Result from transcription."""

    def __init__(
        self,
        segments: list[dict],
        language: str,
        duration: float,
    ):
        self.segments = segments
        self.language = language
        self.duration = duration


def get_model(model_id: str, device: str = "auto", compute_type: str = "auto") -> "WhisperModel":
    """
    Load a KB-Whisper model, using cache if available.

    Args:
        model_id: HuggingFace model ID (e.g., "KBLab/kb-whisper-small")
        device: Device to use ("auto", "cpu", "cuda")
        compute_type: Compute type ("auto", "float16", "int8", "float32")

    Returns:
        Loaded WhisperModel
    """
    if not WHISPER_AVAILABLE:
        raise RuntimeError("faster-whisper is not installed. Install it with: pip install faster-whisper")

    cache_key = f"{model_id}_{device}_{compute_type}"

    if cache_key in _model_cache:
        logger.info(f"Using cached model: {model_id}")
        return _model_cache[cache_key]

    logger.info(f"Loading model: {model_id} (device={device}, compute_type={compute_type})")

    # Determine device and compute type
    if device == "auto":
        try:
            import torch
            device = "cuda" if torch.cuda.is_available() else "cpu"
        except ImportError:
            device = "cpu"

    if compute_type == "auto":
        compute_type = "float16" if device == "cuda" else "int8"

    # On Windows frozen exe, download model without symlinks first
    if getattr(sys, 'frozen', False) and HF_HUB_AVAILABLE:
        model_path = download_model_without_symlinks(model_id, settings.models_dir)
        model = WhisperModel(
            model_path,  # Use local path instead of model_id
            device=device,
            compute_type=compute_type,
        )
    else:
        # Normal mode - let faster_whisper handle download
        model = WhisperModel(
            model_id,
            device=device,
            compute_type=compute_type,
            download_root=str(settings.models_dir),
        )

    _model_cache[cache_key] = model
    logger.info(f"Model loaded successfully: {model_id}")

    return model


def transcribe_audio(
    audio_path: Path | str,
    model_id: str = "KBLab/kb-whisper-small",
    language: str = "sv",
    progress_callback: Callable[[int, str], None] | None = None,
) -> TranscriptionResult:
    """
    Transcribe an audio file using KB-Whisper.

    Args:
        audio_path: Path to the audio file
        model_id: HuggingFace model ID
        language: Language code (default: "sv" for Swedish)
        progress_callback: Optional callback for progress updates (progress_percent, step_name)

    Returns:
        TranscriptionResult with segments, language, and duration
    """
    audio_path = Path(audio_path)

    if not audio_path.exists():
        raise FileNotFoundError(f"Audio file not found: {audio_path}")

    # Report loading progress
    if progress_callback:
        progress_callback(5, "loading_model")

    logger.info(f"Loading model: {model_id}")
    model = get_model(model_id)

    # Report transcription start
    if progress_callback:
        progress_callback(15, "transcribing")

    logger.info(f"Starting transcription of {audio_path}")
    # Transcribe with faster-whisper
    segments_iter, info = model.transcribe(
        str(audio_path),
        language=language,
        task="transcribe",
        beam_size=5,
        vad_filter=True,  # Filter out silence
        vad_parameters=dict(
            min_silence_duration_ms=500,
        ),
        condition_on_previous_text=False,  # Better for long audio
        word_timestamps=True,  # Enable word-level timestamps for audio editing
    )

    # Collect segments with progress tracking
    segments = []
    total_duration = info.duration
    last_progress = 15

    for segment in segments_iter:
        # Extract word-level data if available
        words = []
        if hasattr(segment, "words") and segment.words:
            for word in segment.words:
                words.append({
                    "start": word.start,
                    "end": word.end,
                    "text": word.word,
                    "confidence": getattr(word, "probability", None),
                })

        segment_dict = {
            "start": segment.start,
            "end": segment.end,
            "text": segment.text.strip(),
            "confidence": getattr(segment, "avg_logprob", None),
            "words": words,
        }
        segments.append(segment_dict)

        # Update progress based on position in audio
        if progress_callback and total_duration > 0:
            current_progress = 15 + int((segment.end / total_duration) * 55)  # 15-70% range
            if current_progress > last_progress:
                progress_callback(current_progress, "transcribing")
                last_progress = current_progress

    if progress_callback:
        progress_callback(70, "transcription_complete")

    logger.info(f"Transcription complete: {len(segments)} segments, {total_duration:.2f}s duration")
    return TranscriptionResult(
        segments=segments,
        language=info.language,
        duration=total_duration,
    )


def clear_model_cache() -> None:
    """Clear the model cache to free memory."""
    global _model_cache
    _model_cache.clear()
    logger.info("Model cache cleared")


def is_transcription_available() -> bool:
    """Check if transcription service is available."""
    return WHISPER_AVAILABLE
