"use client";

import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { sv } from "date-fns/locale";
import { Clock, CheckCircle, XCircle, Loader2, FileAudio } from "lucide-react";
import Link from "next/link";
import { listJobs } from "@/services/api";
import { ProgressBar } from "@/components/ui/ProgressBar";
import type { Job, JobStatus } from "@/types";

const STATUS_CONFIG: Record<
  JobStatus,
  { icon: typeof Clock; label: string; color: string }
> = {
  pending: { icon: Clock, label: "Väntar", color: "text-gray-500" },
  processing: { icon: Loader2, label: "Bearbetar", color: "text-blue-500" },
  completed: { icon: CheckCircle, label: "Klar", color: "text-green-500" },
  failed: { icon: XCircle, label: "Misslyckades", color: "text-red-500" },
  cancelled: { icon: XCircle, label: "Avbruten", color: "text-gray-500" },
};

function formatDuration(seconds: number | null): string {
  if (!seconds) return "-";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes} min`;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function JobCard({ job }: { job: Job }) {
  const config = STATUS_CONFIG[job.status];
  const StatusIcon = config.icon;

  return (
    <Link
      href={`/jobs/${job.id}`}
      className="block bg-white rounded-lg border hover:border-primary-300 hover:shadow-md transition-all p-4"
    >
      <div className="flex items-start gap-4">
        <div className="p-3 bg-gray-100 rounded-lg">
          <FileAudio className="w-6 h-6 text-gray-600" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-medium text-gray-900 truncate">{job.file_name}</h3>
            <div className={`flex items-center gap-1 ${config.color}`}>
              <StatusIcon
                className={`w-4 h-4 ${job.status === "processing" ? "animate-spin" : ""}`}
              />
              <span className="text-sm">{config.label}</span>
            </div>
          </div>

          <div className="flex items-center gap-4 text-sm text-gray-500">
            <span>{formatFileSize(job.file_size)}</span>
            <span>{formatDuration(job.duration_seconds)}</span>
            <span>
              {formatDistanceToNow(new Date(job.created_at), {
                addSuffix: true,
                locale: sv,
              })}
            </span>
          </div>

          {job.status === "processing" && (
            <div className="mt-3">
              <ProgressBar progress={job.progress} showLabel={false} />
              <p className="text-xs text-gray-500 mt-1">{job.current_step}</p>
            </div>
          )}

          {job.status === "completed" && (
            <div className="mt-2 flex gap-4 text-sm text-gray-600">
              {job.segment_count && <span>{job.segment_count} segment</span>}
              {job.word_count && <span>{job.word_count} ord</span>}
              {job.speaker_count && job.speaker_count > 0 && (
                <span>{job.speaker_count} talare</span>
              )}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}

export default function JobsPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["jobs"],
    queryFn: () => listJobs(0, 50),
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">Kunde inte ladda jobb</p>
      </div>
    );
  }

  const jobs = data?.jobs || [];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Mina transkriptioner</h1>
        <Link
          href="/"
          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          Ny transkription
        </Link>
      </div>

      {jobs.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border">
          <FileAudio className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-1">
            Inga transkriptioner än
          </h3>
          <p className="text-gray-500 mb-4">
            Ladda upp din första ljudfil för att komma igång
          </p>
          <Link
            href="/"
            className="inline-flex px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            Starta ny transkription
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {jobs.map((job) => (
            <JobCard key={job.id} job={job} />
          ))}
        </div>
      )}
    </div>
  );
}
