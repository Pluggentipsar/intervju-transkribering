"use client";

import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { sv } from "date-fns/locale";
import {
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  FileAudio,
  Plus,
  Users,
  FileText,
} from "lucide-react";
import Link from "next/link";
import { listJobs } from "@/services/api";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Button } from "@/components/ui/Button";
import { GlobalSearch } from "@/components/search/GlobalSearch";
import type { Job, JobStatus } from "@/types";

const STATUS_CONFIG: Record<
  JobStatus,
  { icon: typeof Clock; label: string; color: string; bgColor: string }
> = {
  pending: {
    icon: Clock,
    label: "Vantar",
    color: "text-gray-600",
    bgColor: "bg-gray-100",
  },
  processing: {
    icon: Loader2,
    label: "Bearbetar",
    color: "text-blue-600",
    bgColor: "bg-blue-100",
  },
  completed: {
    icon: CheckCircle,
    label: "Klar",
    color: "text-green-600",
    bgColor: "bg-green-100",
  },
  failed: {
    icon: XCircle,
    label: "Misslyckades",
    color: "text-red-600",
    bgColor: "bg-red-100",
  },
  cancelled: {
    icon: XCircle,
    label: "Avbruten",
    color: "text-gray-600",
    bgColor: "bg-gray-100",
  },
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
      className="group block bg-white rounded-xl border border-gray-200 hover:border-primary-300 hover:shadow-md transition-all"
    >
      <div className="p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center group-hover:bg-primary-50 transition-colors flex-shrink-0">
            <FileAudio className="w-5 h-5 text-gray-500 group-hover:text-primary-600" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-3 mb-1">
              <h3 className="font-medium text-gray-900 truncate text-sm">
                {job.file_name}
              </h3>
              <div
                className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${config.color} ${config.bgColor}`}
              >
                <StatusIcon
                  className={`w-3 h-3 ${job.status === "processing" ? "animate-spin" : ""}`}
                />
                <span>{config.label}</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <FileText className="w-3 h-3" />
                {formatFileSize(job.file_size)}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatDuration(job.duration_seconds)}
              </span>
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
              <div className="mt-3 flex gap-3">
                {job.segment_count && (
                  <span className="text-xs text-gray-500">
                    {job.segment_count} segment
                  </span>
                )}
                {job.word_count && (
                  <span className="text-xs text-gray-500">
                    {job.word_count} ord
                  </span>
                )}
                {job.speaker_count && job.speaker_count > 0 && (
                  <span className="flex items-center gap-1 text-xs text-primary-600">
                    <Users className="w-3 h-3" />
                    {job.speaker_count} talare
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}

export default function JobsPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["jobs"],
    queryFn: () => listJobs(0, 50),
    refetchInterval: 5000,
  });

  const jobs = data?.jobs || [];
  const processingCount = jobs.filter((j) => j.status === "processing").length;
  const completedCount = jobs.filter((j) => j.status === "completed").length;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900 mb-1">
            Mina transkriptioner
          </h1>
          <div className="flex items-center gap-3 text-sm text-gray-500">
            <span>{jobs.length} totalt</span>
            {processingCount > 0 && (
              <span className="flex items-center gap-1 text-blue-600">
                <Loader2 className="w-3 h-3 animate-spin" />
                {processingCount} bearbetas
              </span>
            )}
            {completedCount > 0 && (
              <span className="flex items-center gap-1 text-green-600">
                <CheckCircle className="w-3 h-3" />
                {completedCount} klara
              </span>
            )}
          </div>
        </div>
        <Link href="/upload">
          <Button size="sm">
            <Plus className="w-4 h-4 mr-1" />
            Ny transkription
          </Button>
        </Link>
      </div>

      {/* Search */}
      {jobs.length > 0 && (
        <div className="mb-6">
          <GlobalSearch />
        </div>
      )}

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-primary-500" />
          <span className="ml-2 text-sm text-gray-500">Laddar...</span>
        </div>
      ) : error ? (
        <div className="text-center py-12 bg-white border border-red-200 rounded-xl">
          <XCircle className="w-8 h-8 text-red-400 mx-auto mb-2" />
          <p className="text-sm text-gray-700">
            Kunde inte ladda transkriptioner
          </p>
        </div>
      ) : jobs.length === 0 ? (
        <div className="text-center py-12 bg-white border border-gray-200 rounded-xl">
          <FileAudio className="w-8 h-8 text-gray-400 mx-auto mb-2" />
          <h3 className="font-semibold text-gray-900 mb-1">
            Inga transkriptioner an
          </h3>
          <p className="text-sm text-gray-500 mb-4">
            Ladda upp din forsta ljudfil for att komma igang
          </p>
          <Link href="/upload">
            <Button size="sm">
              <Plus className="w-4 h-4 mr-1" />
              Ny transkription
            </Button>
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
