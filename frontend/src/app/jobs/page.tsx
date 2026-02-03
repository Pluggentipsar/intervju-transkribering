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
  ArrowLeft,
  Plus,
  Users,
  FileText,
  Shield,
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
    label: "Väntar",
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
      className="group block bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-xl hover:border-primary-200 transition-all duration-300 overflow-hidden"
    >
      <div className="p-6">
        <div className="flex items-start gap-4">
          {/* File icon */}
          <div className="w-14 h-14 bg-gradient-to-br from-primary-50 to-primary-100 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
            <FileAudio className="w-7 h-7 text-primary-600" />
          </div>

          <div className="flex-1 min-w-0">
            {/* Header row */}
            <div className="flex items-center justify-between gap-3 mb-2">
              <h3 className="font-semibold text-gray-900 truncate group-hover:text-primary-600 transition-colors">
                {job.file_name}
              </h3>
              <div
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${config.color} ${config.bgColor}`}
              >
                <StatusIcon
                  className={`w-4 h-4 ${job.status === "processing" ? "animate-spin" : ""}`}
                />
                <span>{config.label}</span>
              </div>
            </div>

            {/* Meta info */}
            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
              <span className="flex items-center gap-1">
                <FileText className="w-4 h-4" />
                {formatFileSize(job.file_size)}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {formatDuration(job.duration_seconds)}
              </span>
              <span>
                {formatDistanceToNow(new Date(job.created_at), {
                  addSuffix: true,
                  locale: sv,
                })}
              </span>
            </div>

            {/* Progress bar for processing */}
            {job.status === "processing" && (
              <div className="mt-4">
                <ProgressBar progress={job.progress} showLabel={false} />
                <p className="text-xs text-gray-500 mt-2">{job.current_step}</p>
              </div>
            )}

            {/* Stats for completed */}
            {job.status === "completed" && (
              <div className="mt-4 flex gap-4">
                {job.segment_count && (
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-lg text-sm">
                    <FileText className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-600">{job.segment_count} segment</span>
                  </div>
                )}
                {job.word_count && (
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-lg text-sm">
                    <span className="text-gray-600">{job.word_count} ord</span>
                  </div>
                )}
                {job.speaker_count && job.speaker_count > 0 && (
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-primary-50 rounded-lg text-sm">
                    <Users className="w-4 h-4 text-primary-500" />
                    <span className="text-primary-700">{job.speaker_count} talare</span>
                  </div>
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
  const processingJobs = jobs.filter((j) => j.status === "processing");
  const completedJobs = jobs.filter((j) => j.status === "completed");
  const failedJobs = jobs.filter((j) => j.status === "failed");

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero header */}
      <div className="bg-gradient-to-br from-dark-950 via-dark-900 to-dark-800 text-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-24 pb-16">
          {/* Back link */}
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-8 transition-colors group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Tillbaka till start
          </Link>

          {/* Header content */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gradient-to-br from-primary-400 to-primary-600 rounded-2xl flex items-center justify-center shadow-lg shadow-primary-500/25">
                <FileAudio className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-bold mb-2">
                  Mina transkriptioner
                </h1>
                <p className="text-gray-400">
                  {jobs.length} {jobs.length === 1 ? "transkription" : "transkriptioner"} totalt
                </p>
              </div>
            </div>

            <Link href="/upload">
              <Button
                size="lg"
                className="bg-primary-500 hover:bg-primary-600 shadow-lg shadow-primary-500/25"
              >
                <Plus className="w-5 h-5 mr-2" />
                Ny transkription
              </Button>
            </Link>
          </div>

          {/* Search */}
          {jobs.length > 0 && (
            <div className="mt-8">
              <GlobalSearch />
            </div>
          )}

          {/* Stats pills */}
          {jobs.length > 0 && (
            <div className="flex flex-wrap gap-3 mt-6">
              {processingJobs.length > 0 && (
                <div className="flex items-center gap-2 px-4 py-2 bg-blue-500/20 border border-blue-400/30 rounded-full text-sm text-blue-300">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {processingJobs.length} bearbetas
                </div>
              )}
              {completedJobs.length > 0 && (
                <div className="flex items-center gap-2 px-4 py-2 bg-green-500/20 border border-green-400/30 rounded-full text-sm text-green-300">
                  <CheckCircle className="w-4 h-4" />
                  {completedJobs.length} klara
                </div>
              )}
              {failedJobs.length > 0 && (
                <div className="flex items-center gap-2 px-4 py-2 bg-red-500/20 border border-red-400/30 rounded-full text-sm text-red-300">
                  <XCircle className="w-4 h-4" />
                  {failedJobs.length} misslyckade
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 -mt-8 pb-16">
        {isLoading ? (
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-12">
            <div className="flex flex-col items-center justify-center">
              <Loader2 className="w-10 h-10 animate-spin text-primary-500 mb-4" />
              <p className="text-gray-500">Laddar transkriptioner...</p>
            </div>
          </div>
        ) : error ? (
          <div className="bg-white rounded-2xl shadow-xl border border-red-100 p-12">
            <div className="flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                <XCircle className="w-8 h-8 text-red-500" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Kunde inte ladda transkriptioner
              </h3>
              <p className="text-gray-500">
                Försök igen senare eller kontrollera din anslutning.
              </p>
            </div>
          </div>
        ) : jobs.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-12">
            <div className="flex flex-col items-center justify-center text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-primary-50 to-primary-100 rounded-2xl flex items-center justify-center mb-6">
                <FileAudio className="w-10 h-10 text-primary-500" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Inga transkriptioner än
              </h3>
              <p className="text-gray-500 mb-6 max-w-md">
                Ladda upp din första ljudfil för att komma igång med transkribering.
              </p>
              <Link href="/upload">
                <Button size="lg" className="shadow-lg shadow-primary-500/25">
                  <Plus className="w-5 h-5 mr-2" />
                  Starta ny transkription
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {jobs.map((job) => (
              <JobCard key={job.id} job={job} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
