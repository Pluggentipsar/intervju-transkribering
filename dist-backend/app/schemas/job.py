"""Job-related Pydantic schemas."""

from datetime import datetime
from enum import Enum

from pydantic import BaseModel, ConfigDict


class JobStatus(str, Enum):
    """Job status enumeration."""

    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class NerEntityTypesConfig(BaseModel):
    """Configuration for which NER entity types to anonymize."""

    persons: bool = True  # Person names
    locations: bool = True  # Locations/places
    organizations: bool = True  # Organizations
    dates: bool = True  # Time expressions/dates
    events: bool = True  # Events


class JobCreate(BaseModel):
    """Schema for creating a new transcription job."""

    file_id: str
    name: str | None = None
    model: str = "KBLab/kb-whisper-small"
    enable_diarization: bool = True
    enable_anonymization: bool = False
    language: str = "sv"
    ner_entity_types: NerEntityTypesConfig | None = None


class JobResponse(BaseModel):
    """Schema for job response."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str | None = None
    file_name: str
    file_size: int
    duration_seconds: float | None = None
    model: str
    enable_diarization: bool
    enable_anonymization: bool
    language: str
    status: JobStatus
    progress: int
    current_step: str | None = None
    error_message: str | None = None
    created_at: datetime
    started_at: datetime | None = None
    completed_at: datetime | None = None
    speaker_count: int | None = None
    word_count: int | None = None
    segment_count: int | None = None


class JobUpdate(BaseModel):
    """Schema for updating a job."""

    name: str | None = None


class JobListResponse(BaseModel):
    """Schema for job list response."""

    jobs: list[JobResponse]
    total: int
