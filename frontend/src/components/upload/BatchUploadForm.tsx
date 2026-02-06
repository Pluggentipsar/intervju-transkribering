/**
 * Batch upload form - upload multiple files at once.
 */

"use client";

import { useState, useCallback, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { clsx } from "clsx";
import {
  Upload,
  File,
  X,
  CheckCircle,
  XCircle,
  Loader2,
  Clock,
  Trash2,
  Play,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { ModelSelector } from "./ModelSelector";
import { uploadFile, createJob } from "@/services/api";
import type { NerEntityTypesConfig } from "@/types";

const ACCEPTED_TYPES = {
  "audio/mpeg": [".mp3"],
  "audio/wav": [".wav"],
  "audio/x-m4a": [".m4a"],
  "audio/mp4": [".m4a"],
  "audio/ogg": [".ogg"],
  "audio/flac": [".flac"],
  "audio/webm": [".webm"],
};

const DEFAULT_NER_ENTITY_TYPES: NerEntityTypesConfig = {
  persons: true,
  locations: true,
  organizations: true,
  dates: true,
  events: true,
};

type FileStatus = "pending" | "uploading" | "processing" | "completed" | "failed";

interface QueuedFile {
  id: string;
  file: File;
  status: FileStatus;
  progress: number;
  jobId?: string;
  error?: string;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

export function BatchUploadForm() {
  const [queue, setQueue] = useState<QueuedFile[]>([]);
  const [selectedModel, setSelectedModel] = useState("KBLab/kb-whisper-small");
  const [enableDiarization, setEnableDiarization] = useState(false);
  const [hfTokenConfigured, setHfTokenConfigured] = useState<boolean | null>(null);
  const [enableAnonymization, setEnableAnonymization] = useState(false);
  const [nerEntityTypes, setNerEntityTypes] = useState<NerEntityTypesConfig>(DEFAULT_NER_ENTITY_TYPES);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    fetch("/api/v1/settings/hf-token")
      .then((res) => res.json())
      .then((data) => {
        setHfTokenConfigured(data.configured);
        if (data.configured) setEnableDiarization(true);
      })
      .catch(() => setHfTokenConfigured(false));
  }, []);

  const queryClient = useQueryClient();

  const handleEntityTypeChange = (type: keyof NerEntityTypesConfig, checked: boolean) => {
    setNerEntityTypes((prev) => ({ ...prev, [type]: checked }));
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles: QueuedFile[] = acceptedFiles.map((file) => ({
      id: generateId(),
      file,
      status: "pending" as FileStatus,
      progress: 0,
    }));
    setQueue((prev) => [...prev, ...newFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: ACCEPTED_TYPES,
    disabled: isProcessing,
  });

  const removeFile = (id: string) => {
    setQueue((prev) => prev.filter((f) => f.id !== id));
  };

  const clearCompleted = () => {
    setQueue((prev) => prev.filter((f) => f.status !== "completed" && f.status !== "failed"));
  };

  const processQueue = async () => {
    const pendingFiles = queue.filter((f) => f.status === "pending");
    if (pendingFiles.length === 0) return;

    setIsProcessing(true);

    for (const queuedFile of pendingFiles) {
      try {
        // Update status to uploading
        setQueue((prev) =>
          prev.map((f) =>
            f.id === queuedFile.id ? { ...f, status: "uploading" as FileStatus, progress: 0 } : f
          )
        );

        // Upload file
        const uploadResult = await uploadFile(queuedFile.file);

        // Update status to processing
        setQueue((prev) =>
          prev.map((f) =>
            f.id === queuedFile.id ? { ...f, status: "processing" as FileStatus, progress: 50 } : f
          )
        );

        // Create job
        const job = await createJob({
          file_id: uploadResult.file_id,
          model: selectedModel,
          enable_diarization: enableDiarization,
          enable_anonymization: enableAnonymization,
          language: "sv",
          ner_entity_types: enableAnonymization ? nerEntityTypes : undefined,
        });

        // Update status to completed with job ID
        setQueue((prev) =>
          prev.map((f) =>
            f.id === queuedFile.id
              ? { ...f, status: "completed" as FileStatus, progress: 100, jobId: job.id }
              : f
          )
        );

        // Invalidate jobs list
        queryClient.invalidateQueries({ queryKey: ["jobs"] });
      } catch (error) {
        // Update status to failed
        setQueue((prev) =>
          prev.map((f) =>
            f.id === queuedFile.id
              ? {
                  ...f,
                  status: "failed" as FileStatus,
                  error: error instanceof Error ? error.message : "Okänt fel",
                }
              : f
          )
        );
      }
    }

    setIsProcessing(false);
  };

  const pendingCount = queue.filter((f) => f.status === "pending").length;
  const completedCount = queue.filter((f) => f.status === "completed").length;
  const failedCount = queue.filter((f) => f.status === "failed").length;

  const getStatusIcon = (status: FileStatus) => {
    switch (status) {
      case "pending":
        return <Clock className="w-4 h-4 text-gray-500" />;
      case "uploading":
      case "processing":
        return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
      case "completed":
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "failed":
        return <XCircle className="w-4 h-4 text-red-500" />;
    }
  };

  const getStatusText = (status: FileStatus) => {
    switch (status) {
      case "pending":
        return "Väntar";
      case "uploading":
        return "Laddar upp...";
      case "processing":
        return "Skapar jobb...";
      case "completed":
        return "Klar";
      case "failed":
        return "Misslyckades";
    }
  };

  return (
    <div className="divide-y divide-white/5">
      {/* Dropzone */}
      <div className="p-6">
        <h2 className="text-lg font-semibold text-white mb-1">
          1. Välj ljudfiler
        </h2>
        <p className="text-sm text-gray-400 mb-4">
          Dra och släpp flera filer eller klicka för att välja
        </p>

        <div
          {...getRootProps()}
          className={clsx(
            "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
            {
              "border-white/20 hover:border-primary-400 hover:bg-white/5": !isDragActive && !isProcessing,
              "border-primary-500 bg-primary-500/10": isDragActive && !isDragReject,
              "border-red-500 bg-red-500/10": isDragReject,
              "border-white/10 bg-dark-700 cursor-not-allowed": isProcessing,
            }
          )}
        >
          <input {...getInputProps()} />
          <Upload
            className={clsx("w-12 h-12 mx-auto mb-4", {
              "text-gray-500": !isDragActive,
              "text-primary-500": isDragActive && !isDragReject,
              "text-red-500": isDragReject,
            })}
          />
          {isDragReject ? (
            <p className="text-red-400 font-medium">Filformatet stöds inte</p>
          ) : isDragActive ? (
            <p className="text-primary-400 font-medium">Släpp filerna här...</p>
          ) : (
            <>
              <p className="text-gray-400 mb-1">
                <span className="font-medium text-primary-400">Klicka för att välja</span>
                {" "}eller dra och släpp flera filer
              </p>
              <p className="text-sm text-gray-400">
                MP3, WAV, M4A, OGG, FLAC, WebM (max 2 GB per fil)
              </p>
            </>
          )}
        </div>
      </div>

      {/* File Queue */}
      {queue.length > 0 && (
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">
              Filkö ({queue.length} filer)
            </h2>
            {(completedCount > 0 || failedCount > 0) && (
              <button
                onClick={clearCompleted}
                className="text-sm text-gray-400 hover:text-gray-300"
              >
                Rensa avslutade
              </button>
            )}
          </div>

          <div className="space-y-2 max-h-64 overflow-y-auto">
            {queue.map((queuedFile) => (
              <div
                key={queuedFile.id}
                className={clsx(
                  "flex items-center gap-3 p-3 rounded-lg border",
                  {
                    "bg-dark-800/50 border-white/10": queuedFile.status === "pending",
                    "bg-blue-500/10 border-blue-500/20": queuedFile.status === "uploading" || queuedFile.status === "processing",
                    "bg-green-500/10 border-green-500/20": queuedFile.status === "completed",
                    "bg-red-500/10 border-red-500/20": queuedFile.status === "failed",
                  }
                )}
              >
                {getStatusIcon(queuedFile.status)}

                <div className="flex-1 min-w-0">
                  <p className="font-medium text-white truncate">
                    {queuedFile.file.name}
                  </p>
                  <p className="text-xs text-gray-400">
                    {formatFileSize(queuedFile.file.size)} • {getStatusText(queuedFile.status)}
                    {queuedFile.error && (
                      <span className="text-red-400"> - {queuedFile.error}</span>
                    )}
                  </p>
                </div>

                {queuedFile.status === "completed" && queuedFile.jobId && (
                  <Link
                    href={`/jobs/${queuedFile.jobId}`}
                    className="text-sm text-primary-400 hover:text-primary-300 font-medium"
                  >
                    Visa
                  </Link>
                )}

                {queuedFile.status === "pending" && !isProcessing && (
                  <button
                    onClick={() => removeFile(queuedFile.id)}
                    className="p-1 text-gray-500 hover:text-red-500"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Summary */}
          <div className="mt-4 flex gap-4 text-sm">
            {pendingCount > 0 && (
              <span className="text-gray-400">{pendingCount} väntar</span>
            )}
            {completedCount > 0 && (
              <span className="text-green-400">{completedCount} klara</span>
            )}
            {failedCount > 0 && (
              <span className="text-red-400">{failedCount} misslyckade</span>
            )}
          </div>
        </div>
      )}

      {/* Settings */}
      <div className="p-6">
        <h2 className="text-lg font-semibold text-white mb-1">
          2. Inställningar (gäller alla filer)
        </h2>
        <p className="text-sm text-gray-400 mb-4">
          Samma inställningar används för alla filer i kön
        </p>

        <ModelSelector
          selectedModel={selectedModel}
          onModelSelect={setSelectedModel}
          disabled={isProcessing}
        />

        {/* Diarization toggle */}
        <div className="mt-4 pt-4 border-t border-white/10">
          <label className={`flex items-center gap-3 ${hfTokenConfigured === false ? "opacity-60" : "cursor-pointer"}`}>
            <input
              type="checkbox"
              checked={enableDiarization}
              onChange={(e) => setEnableDiarization(e.target.checked)}
              disabled={isProcessing || hfTokenConfigured === false}
              className="w-4 h-4 text-primary-600 rounded border-white/20 focus:ring-primary-500"
            />
            <div>
              <span className="font-medium text-white">Talaridentifiering</span>
              {hfTokenConfigured === false ? (
                <p className="text-sm text-amber-400">
                  Kräver HuggingFace-token. Konfigurera under Inställningar (kugghjulet).
                </p>
              ) : (
                <p className="text-sm text-gray-400">
                  Identifiera olika talare i intervjun
                </p>
              )}
            </div>
          </label>
        </div>

        {/* Anonymization toggle */}
        <div className="mt-4 pt-4 border-t border-white/10">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={enableAnonymization}
              onChange={(e) => setEnableAnonymization(e.target.checked)}
              disabled={isProcessing}
              className="w-4 h-4 text-primary-600 rounded border-white/20 focus:ring-primary-500"
            />
            <div>
              <span className="font-medium text-white">Avidentifiering</span>
              <p className="text-sm text-gray-400">
                Ta bort känslig information
              </p>
            </div>
          </label>

          {enableAnonymization && (
            <div className="mt-3 ml-7 pl-3 border-l-2 border-blue-500/20 space-y-1">
              <p className="text-xs text-gray-400 mb-2">Välj vilka typer:</p>
              {[
                { key: "persons" as const, label: "Personnamn" },
                { key: "locations" as const, label: "Platser" },
                { key: "organizations" as const, label: "Organisationer" },
                { key: "dates" as const, label: "Datum/tid" },
                { key: "events" as const, label: "Händelser" },
              ].map((item) => (
                <label
                  key={item.key}
                  className="flex items-center gap-2 p-1.5 rounded hover:bg-blue-500/5 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={nerEntityTypes[item.key]}
                    onChange={(e) => handleEntityTypeChange(item.key, e.target.checked)}
                    disabled={isProcessing}
                    className="w-3.5 h-3.5 text-blue-600 rounded"
                  />
                  <span className="text-sm">{item.label}</span>
                </label>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="p-6 bg-gradient-to-r from-dark-900/50 to-transparent flex gap-3">
        <Button
          onClick={processQueue}
          size="lg"
          disabled={pendingCount === 0 || isProcessing}
          loading={isProcessing}
          className="flex-1"
        >
          <Play className="w-4 h-4 mr-2" />
          {isProcessing
            ? "Bearbetar..."
            : `Starta ${pendingCount} transkribering${pendingCount !== 1 ? "ar" : ""}`}
        </Button>

        {completedCount > 0 && (
          <Link href="/jobs" className="flex-shrink-0">
            <Button variant="secondary" size="lg">
              Visa alla jobb
            </Button>
          </Link>
        )}
      </div>
    </div>
  );
}
