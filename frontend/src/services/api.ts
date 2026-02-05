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

// Detect if running in Tauri desktop app
const isTauri = typeof window !== "undefined" && "__TAURI__" in window;

// Detect if running in production/hosted mode (not localhost development)
const isHostedFrontend = typeof window !== "undefined" &&
  !window.location.hostname.includes("localhost") &&
  !window.location.hostname.includes("127.0.0.1");

// API URL configuration:
// 1. Environment variable override (set at build time)
// 2. Tauri desktop app -> localhost:8000
// 3. Hosted frontend (Vercel, etc.) -> localhost:8000 (connects to local backend)
// 4. Development (localhost:3000) -> Next.js proxy at /api/v1
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  (isTauri || isHostedFrontend ? "http://127.0.0.1:8000/api/v1" : "/api/v1");

const api = axios.create({
  baseURL: API_BASE_URL,
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

export async function cancelJob(jobId: string): Promise<{ status: string; job_id: string }> {
  const response = await api.post<{ status: string; job_id: string }>(`/jobs/${jobId}/cancel`);
  return response.data;
}

// Transcripts
export async function getTranscript(jobId: string): Promise<TranscriptResponse> {
  const response = await api.get<TranscriptResponse>(`/jobs/${jobId}/transcript`);
  return response.data;
}

// Get the base URL for direct file access (export, audio, etc.)
const getBaseUrl = () => (isTauri || isHostedFrontend) ? "http://127.0.0.1:8000" : "";

export function getExportUrl(jobId: string, format: "txt" | "md" | "json" | "srt" | "vtt", anonymized: boolean = false): string {
  return `${getBaseUrl()}/api/v1/jobs/${jobId}/export?format=${format}&anonymized=${anonymized}`;
}

export function getAudioUrl(jobId: string): string {
  return `${getBaseUrl()}/api/v1/jobs/${jobId}/audio`;
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
  return `${getBaseUrl()}/api/v1/editor/${jobId}/download-edited-audio`;
}

// HF Token settings
export interface HFTokenStatus {
  configured: boolean;
  token_preview: string | null;
}

export async function getHFTokenStatus(): Promise<HFTokenStatus> {
  const response = await api.get<HFTokenStatus>("/settings/hf-token");
  return response.data;
}

export async function saveHFToken(token: string): Promise<{ status: string; message: string }> {
  const response = await api.post<{ status: string; message: string }>(
    "/settings/hf-token",
    { token }
  );
  return response.data;
}

export async function removeHFToken(): Promise<{ status: string; message: string }> {
  const response = await api.delete<{ status: string; message: string }>(
    "/settings/hf-token"
  );
  return response.data;
}
