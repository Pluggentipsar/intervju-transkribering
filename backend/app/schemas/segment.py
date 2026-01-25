"""Segment-related Pydantic schemas."""

from pydantic import BaseModel, ConfigDict


class SegmentResponse(BaseModel):
    """Schema for a transcription segment."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    segment_index: int
    start_time: float
    end_time: float
    text: str
    anonymized_text: str | None = None
    speaker: str | None = None
    confidence: float | None = None


class TranscriptMetadata(BaseModel):
    """Metadata about the transcript."""

    total_duration: float
    speaker_count: int
    word_count: int
    segment_count: int


class TranscriptResponse(BaseModel):
    """Schema for full transcript response."""

    job_id: str
    segments: list[SegmentResponse]
    metadata: TranscriptMetadata
