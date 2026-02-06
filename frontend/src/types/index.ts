/**
 * TypeScript types for the application.
 */

export type JobStatus = "pending" | "processing" | "completed" | "failed" | "cancelled";

export interface Job {
  id: string;
  name: string | null;
  file_name: string;
  file_size: number;
  duration_seconds: number | null;
  model: string;
  enable_diarization: boolean;
  enable_anonymization: boolean;
  language: string;
  status: JobStatus;
  progress: number;
  current_step: string | null;
  error_message: string | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  speaker_count: number | null;
  word_count: number | null;
  segment_count: number | null;
}

export interface JobListResponse {
  jobs: Job[];
  total: number;
}

export interface Segment {
  id: number;
  segment_index: number;
  start_time: number;
  end_time: number;
  text: string;
  anonymized_text: string | null;
  speaker: string | null;
  confidence: number | null;
}

export interface TranscriptMetadata {
  total_duration: number;
  speaker_count: number;
  word_count: number;
  segment_count: number;
}

export interface TranscriptResponse {
  job_id: string;
  segments: Segment[];
  metadata: TranscriptMetadata;
}

export interface UploadResponse {
  file_id: string;
  file_name: string;
  file_size: number;
  content_type: string | null;
}

export interface ModelInfo {
  id: string;
  name: string;
  description: string;
  size_mb: number;
  recommended: boolean;
}

export interface SystemStatus {
  gpu_available: boolean;
  gpu_name: string | null;
  cuda_version: string | null;
  recommended_compute_type: string;
}

export interface JobCreateRequest {
  file_id: string;
  name?: string;
  model: string;
  enable_diarization: boolean;
  enable_anonymization: boolean;
  language: string;
  ner_entity_types?: NerEntityTypesConfig;
}

// Enhanced anonymization types
export interface CustomPatternItem {
  pattern: string;
  replacement: string;
}

export interface CustomWordItem {
  word: string;
  replacement: string;
}

export interface EnhancedAnonymizationRequest {
  use_institution_patterns: boolean;
  use_format_patterns: boolean;
  custom_patterns: CustomPatternItem[];
  custom_words: CustomWordItem[];
  source_field: "text" | "anonymized_text";
}

export interface EnhancedSegment {
  segment_index: number;
  start_time: number;
  end_time: number;
  text: string;
  anonymized_text: string | null;
  enhanced_anonymized_text: string | null;
  speaker: string | null;
}

export interface EnhancedAnonymizationResponse {
  job_id: string;
  segments: EnhancedSegment[];
  changes_count: number;
  patterns_applied: {
    institution_patterns: boolean;
    format_patterns: boolean;
    custom_patterns: boolean;
    custom_words: boolean;
  };
}

// Standalone text anonymization types
export interface NerEntityTypesConfig {
  persons: boolean;
  locations: boolean;
  organizations: boolean;
  dates: boolean;
  events: boolean;
}

export interface TextAnonymizationRequest {
  text: string;
  use_ner: boolean;
  ner_entity_types: NerEntityTypesConfig;
  use_institution_patterns: boolean;
  use_format_patterns: boolean;
  custom_patterns: [string, string][];
  custom_words: [string, string][];
}

export interface TextAnonymizationResponse {
  original_text: string;
  anonymized_text: string;
  ner_applied: boolean;
  patterns_applied: {
    ner: boolean;
    institution_patterns: boolean;
    format_patterns: boolean;
    custom_patterns: boolean;
    custom_words: boolean;
  };
  entities_found: number;
  patterns_matched: number;
}

export interface NerEntityTypeInfo {
  label: string;
  description: string;
}

export interface AnonymizationStatus {
  ner_available: boolean;
  pattern_anonymization_available: boolean;
  ner_entity_types: Record<string, NerEntityTypeInfo>;
}

// Segment editing types
export interface SegmentUpdate {
  text?: string;
  speaker?: string;
}

export interface SpeakerRename {
  old_name: string;
  new_name: string;
}

export interface SpeakerRenameResponse {
  job_id: string;
  old_name: string;
  new_name: string;
  segments_updated: number;
}

// Word template types
export interface WordTemplate {
  id: string;
  name: string;
  description: string | null;
  words: CustomWordItem[];
  created_at: string;
  updated_at: string;
}

export interface WordTemplateCreate {
  name: string;
  description?: string;
  words: CustomWordItem[];
}

export interface WordTemplateListResponse {
  templates: WordTemplate[];
  total: number;
}

// Search types
export interface SearchResultSegment {
  segment_index: number;
  start_time: number;
  end_time: number;
  text: string;
  speaker: string | null;
}

export interface SearchResultJob {
  job_id: string;
  file_name: string;
  created_at: string;
  segments: SearchResultSegment[];
  total_matches: number;
}

export interface SearchResponse {
  query: string;
  results: SearchResultJob[];
  total_jobs: number;
  total_segments: number;
}

// Audio editor types
export interface EditorWord {
  id: number;
  word_index: number;
  start_time: number;
  end_time: number;
  text: string;
  confidence: number | null;
  included: boolean;
}

export interface EditorSegment {
  id: number;
  segment_index: number;
  start_time: number;
  end_time: number;
  text: string;
  speaker: string | null;
  words: EditorWord[];
}

export interface EditableTranscript {
  job_id: string;
  file_name: string;
  duration: number;
  segments: EditorSegment[];
}

export interface WordEditRequest {
  word_ids: number[];
  included: boolean;
}

export interface WordEditResponse {
  updated_count: number;
}
