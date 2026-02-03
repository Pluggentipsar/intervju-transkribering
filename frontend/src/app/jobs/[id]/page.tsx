"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { sv } from "date-fns/locale";
import {
  ArrowLeft,
  Download,
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  FileText,
  FileCode,
} from "lucide-react";
import Link from "next/link";
import { getJob, getTranscript, getExportUrl } from "@/services/api";
import { Button } from "@/components/ui/Button";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { TranscriptViewer } from "@/components/transcription/TranscriptViewer";
import { EnhancedAnonymization } from "@/components/transcription/EnhancedAnonymization";
import { useJobPolling } from "@/hooks/usePolling";

const STEP_LABELS: Record<string, string> = {
  queued: "Väntar i kö...",
  starting: "Startar...",
  loading_model: "Laddar AI-modell...",
  transcribing: "Transkriberar...",
  transcription_complete: "Transkribering klar, förbereder talaridentifiering...",
  loading_diarization_model: "Laddar talaridentifieringsmodell...",
  loading_audio_for_diarization: "Laddar ljud för talaridentifiering...",
  diarizing: "Identifierar talare...",
  assigning_speakers: "Tilldelar talare till segment...",
  diarization_complete: "Talaridentifiering klar...",
  diarization_failed: "Talaridentifiering misslyckades, fortsätter...",
  saving_results: "Sparar resultat...",
  completed: "Klart!",
  failed: "Misslyckades",
};

function formatDuration(seconds: number | null): string {
  if (!seconds) return "-";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s`;
  }
  return `${minutes}m ${secs}s`;
}

export default function JobDetailPage() {
  const params = useParams();
  const router = useRouter();
  const jobId = params.id as string;

  // Poll job status when processing
  const { data: job, isLoading: jobLoading } = useJobPolling(jobId);

  // Fetch transcript when completed
  const { data: transcript, isLoading: transcriptLoading } = useQuery({
    queryKey: ["transcript", jobId],
    queryFn: () => getTranscript(jobId),
    enabled: job?.status === "completed",
  });

  if (jobLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 mb-4">Jobbet hittades inte</p>
        <Link href="/jobs" className="text-primary-600 hover:underline">
          Tillbaka till listan
        </Link>
      </div>
    );
  }

  const isProcessing = job.status === "pending" || job.status === "processing";
  const isComplete = job.status === "completed";
  const isFailed = job.status === "failed";

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => router.back()}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-gray-900 truncate">
            {job.file_name}
          </h1>
          <p className="text-sm text-gray-500">
            Skapad{" "}
            {formatDistanceToNow(new Date(job.created_at), {
              addSuffix: true,
              locale: sv,
            })}
          </p>
        </div>

        {/* Export buttons */}
        {isComplete && (
          <div className="flex gap-2">
            <a
              href={getExportUrl(jobId, "txt")}
              download
              className="inline-flex items-center gap-2 px-3 py-2 bg-white border rounded-lg hover:bg-gray-50 transition-colors"
            >
              <FileText className="w-4 h-4" />
              Text
            </a>
            <a
              href={getExportUrl(jobId, "md")}
              download
              className="inline-flex items-center gap-2 px-3 py-2 bg-white border rounded-lg hover:bg-gray-50 transition-colors"
            >
              <FileCode className="w-4 h-4" />
              Markdown
            </a>
            <a
              href={getExportUrl(jobId, "json")}
              download
              className="inline-flex items-center gap-2 px-3 py-2 bg-white border rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Download className="w-4 h-4" />
              JSON
            </a>
          </div>
        )}
      </div>

      {/* Status card for processing/failed */}
      {(isProcessing || isFailed) && (
        <div className="bg-white rounded-xl border p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            {isProcessing && (
              <>
                <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                <span className="font-medium text-gray-900">
                  Transkriberar...
                </span>
              </>
            )}
            {isFailed && (
              <>
                <XCircle className="w-6 h-6 text-red-500" />
                <span className="font-medium text-red-700">
                  Transkriberingen misslyckades
                </span>
              </>
            )}
          </div>

          {isProcessing && (
            <>
              <ProgressBar progress={job.progress} className="mb-2" />
              <p className="text-sm text-gray-600">
                {STEP_LABELS[job.current_step || ""] || job.current_step}
              </p>
            </>
          )}

          {isFailed && job.error_message && (
            <p className="text-sm text-red-600 mt-2">{job.error_message}</p>
          )}
        </div>
      )}

      {/* Metadata card */}
      {isComplete && transcript && (
        <div className="bg-white rounded-xl border p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <CheckCircle className="w-6 h-6 text-green-500" />
            <span className="font-medium text-gray-900">
              Transkribering klar
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-500">Längd</p>
              <p className="font-medium">{formatDuration(job.duration_seconds)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Segment</p>
              <p className="font-medium">{transcript.metadata.segment_count}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Ord</p>
              <p className="font-medium">{transcript.metadata.word_count}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Talare</p>
              <p className="font-medium">
                {transcript.metadata.speaker_count || "-"}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced anonymization panel */}
      {isComplete && transcript && (
        <EnhancedAnonymization
          jobId={jobId}
          hasNerAnonymization={transcript.segments.some(
            (s) => s.anonymized_text && s.anonymized_text !== s.text
          )}
          className="mb-6"
        />
      )}

      {/* Transcript viewer */}
      {isComplete && transcript && (
        <div className="bg-white rounded-xl border p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">
            Transkription
          </h2>
          <TranscriptViewer
            segments={transcript.segments}
            className="max-h-[600px]"
          />
        </div>
      )}

      {/* Loading transcript */}
      {isComplete && transcriptLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
        </div>
      )}
    </div>
  );
}
