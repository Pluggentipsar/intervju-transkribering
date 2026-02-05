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


# =============================================================================
# Segment editing schemas
# =============================================================================


class SegmentUpdate(BaseModel):
    """Schema for updating a segment's text or speaker."""

    text: str | None = None
    speaker: str | None = None


class SpeakerRename(BaseModel):
    """Schema for renaming a speaker across all segments."""

    old_name: str
    new_name: str


class SpeakerRenameResponse(BaseModel):
    """Response schema for speaker rename operation."""

    job_id: str
    old_name: str
    new_name: str
    segments_updated: int


# =============================================================================
# Word template schemas
# =============================================================================


class WordTemplateCreate(BaseModel):
    """Schema for creating a word template."""

    name: str
    description: str | None = None
    words: list[CustomWordItem]


class WordTemplateUpdate(BaseModel):
    """Schema for updating a word template."""

    name: str | None = None
    description: str | None = None
    words: list[CustomWordItem] | None = None


class WordTemplateResponse(BaseModel):
    """Schema for word template response."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    description: str | None
    words: list[CustomWordItem]
    created_at: str
    updated_at: str


class WordTemplateListResponse(BaseModel):
    """Schema for listing word templates."""

    templates: list[WordTemplateResponse]
    total: int


# =============================================================================
# Search schemas
# =============================================================================


class SearchResultSegment(BaseModel):
    """A segment result from search."""

    segment_index: int
    start_time: float
    end_time: float
    text: str
    speaker: str | None


class SearchResultJob(BaseModel):
    """A job with matching segments from search."""

    job_id: str
    file_name: str
    created_at: str
    segments: list[SearchResultSegment]
    total_matches: int


class SearchResponse(BaseModel):
    """Response schema for global search."""

    query: str
    results: list[SearchResultJob]
    total_jobs: int
    total_segments: int


# =============================================================================
# Audio editing schemas
# =============================================================================


class WordResponse(BaseModel):
    """Schema for a word with timestamps."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    word_index: int
    start_time: float
    end_time: float
    text: str
    confidence: float | None = None
    included: bool = True


class SegmentWithWordsResponse(BaseModel):
    """Segment with word-level timestamps for editing."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    segment_index: int
    start_time: float
    end_time: float
    text: str
    speaker: str | None = None
    words: list[WordResponse] = []


class EditableTranscriptResponse(BaseModel):
    """Full transcript with word-level timestamps for editing."""

    job_id: str
    file_name: str
    duration: float
    segments: list[SegmentWithWordsResponse]


class WordEditRequest(BaseModel):
    """Request to update word inclusion status."""

    word_ids: list[int]
    included: bool


class WordEditResponse(BaseModel):
    """Response after updating word inclusion."""

    updated_count: int


class AudioEditRequest(BaseModel):
    """Request to generate edited audio."""

    # If empty, uses the current included/excluded state from database
    exclude_word_ids: list[int] = []


class AudioEditResponse(BaseModel):
    """Response with edited audio information."""

    job_id: str
    original_duration: float
    edited_duration: float
    removed_segments_count: int
