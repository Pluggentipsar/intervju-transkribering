"""Application configuration."""

from pathlib import Path
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # Application
    app_name: str = "Intervju-Transkribering"
    debug: bool = False

    # Paths
    upload_dir: Path = Path("uploads")
    models_dir: Path = Path("models")
    database_url: str = "sqlite+aiosqlite:///./transcription.db"

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
