"""Application configuration."""

import sys
from pathlib import Path
from pydantic_settings import BaseSettings


def get_persistent_data_dir() -> Path:
    """Get a persistent data directory that works for both dev and frozen exe."""
    if getattr(sys, 'frozen', False):
        # Running as PyInstaller exe - use user's cache directory
        # This avoids Windows symlink issues in temp directories
        return Path.home() / ".cache" / "tysttext"
    else:
        # Development mode - use current directory
        return Path(".")


# Compute data directory once at module load
_DATA_DIR = get_persistent_data_dir()


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # Application
    app_name: str = "Intervju-Transkribering"
    debug: bool = False

    # Paths - use persistent directory for frozen exe
    upload_dir: Path = _DATA_DIR / "uploads"
    models_dir: Path = _DATA_DIR / "models"
    database_url: str = f"sqlite+aiosqlite:///{_DATA_DIR / 'transcription.db'}"

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

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()

# Ensure directories exist
settings.upload_dir.mkdir(parents=True, exist_ok=True)
settings.models_dir.mkdir(parents=True, exist_ok=True)
