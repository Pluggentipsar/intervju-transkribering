/**
 * API client for communicating with the backend.
 */

import axios from "axios";
import type {
  Job,
  JobCreateRequest,
  JobListResponse,
  ModelInfo,
  SystemStatus,
  TranscriptResponse,
  UploadResponse,
  EnhancedAnonymizationRequest,
  EnhancedAnonymizationResponse,
  TextAnonymizationRequest,
  TextAnonymizationResponse,
  AnonymizationStatus,
  Segment,
  SegmentUpdate,
  SpeakerRename,
  SpeakerRenameResponse,
  WordTemplate,
  WordTemplateCreate,
  WordTemplateListResponse,
  SearchResponse,
  EditableTranscript,
  WordEditResponse,
} from "@/types";

const api = axios.create({
  baseURL: "/api/v1",
  headers: {
    "Content-Type": "application/json",
  },
});

// Upload
export async function uploadFile(file: File): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await api.post<UploadResponse>("/upload", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return response.data;
}

export async function deleteUploadedFile(fileId: string): Promise<void> {
  await api.delete(`/upload/${fileId}`);
}

// Jobs
export async function createJob(data: JobCreateRequest): Promise<Job> {
  const response = await api.post<Job>("/jobs", data);
  return response.data;
}

export async function listJobs(skip = 0, limit = 20): Promise<JobListResponse> {
  const response = await api.get<JobListResponse>("/jobs", {
    params: { skip, limit },
  });
  return response.data;
}

export async function getJob(jobId: string): Promise<Job> {
  const response = await api.get<Job>(`/jobs/${jobId}`);
  return response.data;
}

export async function deleteJob(jobId: string): Promise<void> {
  await api.delete(`/jobs/${jobId}`);
}

export async function renameJob(jobId: string, name: string): Promise<Job> {
  const response = await api.patch<Job>(`/jobs/${jobId}`, { name });
  return response.data;
}

// Transcripts
export async function getTranscript(jobId: string): Promise<TranscriptResponse> {
  const response = await api.get<TranscriptResponse>(`/jobs/${jobId}/transcript`);
  return response.data;
}

export function getExportUrl(jobId: string, format: "txt" | "md" | "json" | "srt" | "vtt", anonymized: boolean = false): string {
  return `/api/v1/jobs/${jobId}/export?format=${format}&anonymized=${anonymized}`;
}

export function getAudioUrl(jobId: string): string {
  return `/api/v1/jobs/${jobId}/audio`;
}

// Models
export async function listModels(): Promise<ModelInfo[]> {
  const response = await api.get<ModelInfo[]>("/models");
  return response.data;
}

export async function getSystemStatus(): Promise<SystemStatus> {
  const response = await api.get<SystemStatus>("/models/system");
  return response.data;
}

// Enhanced anonymization
export async function enhanceAnonymization(
  jobId: string,
  request: EnhancedAnonymizationRequest
): Promise<EnhancedAnonymizationResponse> {
  const response = await api.post<EnhancedAnonymizationResponse>(
    `/jobs/${jobId}/enhance-anonymization`,
    request
  );
  return response.data;
}

// Standalone text anonymization
export async function anonymizeText(
  request: TextAnonymizationRequest
): Promise<TextAnonymizationResponse> {
  const response = await api.post<TextAnonymizationResponse>(
    "/anonymize",
    request
  );
  return response.data;
}

export async function getAnonymizationStatus(): Promise<AnonymizationStatus> {
  const response = await api.get<AnonymizationStatus>("/anonymize/status");
  return response.data;
}

// Segment editing
export async function updateSegment(
  jobId: string,
  segmentId: number,
  update: SegmentUpdate
): Promise<Segment> {
  const response = await api.patch<Segment>(
    `/jobs/${jobId}/segments/${segmentId}`,
    update
  );
  return response.data;
}

export async function renameSpeaker(
  jobId: string,
  rename: SpeakerRename
): Promise<SpeakerRenameResponse> {
  const response = await api.post<SpeakerRenameResponse>(
    `/jobs/${jobId}/rename-speaker`,
    rename
  );
  return response.data;
}

// Run anonymization on existing transcript
export interface RunAnonymizationResponse {
  job_id: string;
  segments_processed: number;
  segments_anonymized: number;
  had_existing_anonymization: boolean;
}

export async function runAnonymization(
  jobId: string
): Promise<RunAnonymizationResponse> {
  const response = await api.post<RunAnonymizationResponse>(
    `/jobs/${jobId}/run-anonymization`
  );
  return response.data;
}

// Word templates
export async function listTemplates(): Promise<WordTemplateListResponse> {
  const response = await api.get<WordTemplateListResponse>("/templates");
  return response.data;
}

export async function createTemplate(
  data: WordTemplateCreate
): Promise<WordTemplate> {
  const response = await api.post<WordTemplate>("/templates", data);
  return response.data;
}

export async function deleteTemplate(templateId: string): Promise<void> {
  await api.delete(`/templates/${templateId}`);
}

// Search
export async function searchTranscripts(
  query: string,
  limit: number = 50
): Promise<SearchResponse> {
  const response = await api.get<SearchResponse>("/jobs/search/global", {
    params: { q: query, limit },
  });
  return response.data;
}

// Audio editor
export async function getEditableTranscript(
  jobId: string
): Promise<EditableTranscript> {
  const response = await api.get<EditableTranscript>(
    `/editor/${jobId}/editable-transcript`
  );
  return response.data;
}

export async function updateWordInclusion(
  jobId: string,
  wordIds: number[],
  included: boolean
): Promise<WordEditResponse> {
  const response = await api.post<WordEditResponse>(
    `/editor/${jobId}/words/edit`,
    { word_ids: wordIds, included }
  );
  return response.data;
}

export async function resetEdits(jobId: string): Promise<WordEditResponse> {
  const response = await api.post<WordEditResponse>(
    `/editor/${jobId}/reset-edits`
  );
  return response.data;
}

export function getEditedAudioUrl(jobId: string): string {
  return `/api/v1/editor/${jobId}/download-edited-audio`;
}
