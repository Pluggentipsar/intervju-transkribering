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


# =============================================================================
# Enhanced anonymization schemas
# =============================================================================


class CustomPatternItem(BaseModel):
    """A custom regex pattern for anonymization."""

    pattern: str
    replacement: str


class CustomWordItem(BaseModel):
    """An exact word replacement for anonymization."""

    word: str
    replacement: str


class EnhancedAnonymizationRequest(BaseModel):
    """Request schema for enhanced pattern-based anonymization."""

    use_institution_patterns: bool = True
    use_format_patterns: bool = True
    custom_patterns: list[CustomPatternItem] = []
    custom_words: list[CustomWordItem] = []
    source_field: str = "text"


class EnhancedSegmentResponse(BaseModel):
    """Segment response with enhanced anonymization field."""

    segment_index: int
    start_time: float
    end_time: float
    text: str
    anonymized_text: str | None = None
    enhanced_anonymized_text: str | None = None
    speaker: str | None = None


class EnhancedAnonymizationResponse(BaseModel):
    """Response schema for enhanced anonymization."""

    job_id: str
    segments: list[EnhancedSegmentResponse]
    changes_count: int
    patterns_applied: dict[str, bool]
