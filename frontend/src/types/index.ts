/**
 * TypeScript types for the application.
 */

export type JobStatus = "pending" | "processing" | "completed" | "failed" | "cancelled";

export interface Job {
  id: string;
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
  model: string;
  enable_diarization: boolean;
  enable_anonymization: boolean;
  language: string;
}
