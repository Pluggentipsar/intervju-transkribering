"""Application configuration."""

import sys
from pathlib import Path

from pydantic_settings import BaseSettings


def _get_base_dir() -> Path:
    """Get base directory - works for both dev and PyInstaller frozen exe."""
    if getattr(sys, "frozen", False):
        # Running as PyInstaller exe: data dir is next to the exe
        return Path(sys.executable).parent / "data"
    # Development: relative to backend/
    return Path.cwd()


_base_dir = _get_base_dir()


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # Application
    app_name: str = "Intervju-Transkribering"
    debug: bool = False

    # Paths
    upload_dir: Path = _base_dir / "uploads"
    models_dir: Path = _base_dir / "models"
    database_url: str = f"sqlite+aiosqlite:///{_base_dir / 'transcription.db'}"

    # Whisper settings
    default_model: str = "KBLab/kb-whisper-small"
    default_compute_type: str = "float16"  # float16 for GPU, int8 for CPU
    default_device: str = "auto"  # auto, cpu, cuda

    # Diarization
    enable_diarization: bool = True
    hf_token: str | None = None  # HuggingFace token for pyannote

    # Processing
    max_file_size_mb: int = 2000  # 2GB max
    chunk_length_seconds: int = 30

    # Frontend static files (built with 'npm run build' in frontend/)
    static_dir: Path = Path(__file__).parent.parent.parent / "frontend" / "out"

    class Config:
        env_file = str(_base_dir / ".env") if getattr(sys, "frozen", False) else ".env"
        env_file_encoding = "utf-8"


settings = Settings()

# Ensure directories exist
settings.upload_dir.mkdir(parents=True, exist_ok=True)
settings.models_dir.mkdir(parents=True, exist_ok=True)
