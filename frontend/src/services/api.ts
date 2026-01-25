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

// Transcripts
export async function getTranscript(jobId: string): Promise<TranscriptResponse> {
  const response = await api.get<TranscriptResponse>(`/jobs/${jobId}/transcript`);
  return response.data;
}

export function getExportUrl(jobId: string, format: "txt" | "md" | "json"): string {
  return `/api/v1/jobs/${jobId}/export?format=${format}`;
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
