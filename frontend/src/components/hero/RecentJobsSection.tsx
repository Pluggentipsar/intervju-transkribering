"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { sv } from "date-fns/locale";
import { ArrowRight, FileAudio, Clock, CheckCircle, Loader2, XCircle } from "lucide-react";
import { listJobs } from "@/services/api";
import type { Job, JobStatus } from "@/types";

const STATUS_CONFIG: Record<JobStatus, { icon: typeof Clock; color: string }> = {
  pending: { icon: Clock, color: "text-gray-400" },
  processing: { icon: Loader2, color: "text-primary-500" },
  completed: { icon: CheckCircle, color: "text-green-500" },
  failed: { icon: XCircle, color: "text-red-500" },
  cancelled: { icon: XCircle, color: "text-gray-400" },
};

function JobPreviewCard({ job }: { job: Job }) {
  const config = STATUS_CONFIG[job.status];
  const StatusIcon = config.icon;

  return (
    <Link
      href={`/jobs/${job.id}`}
      className="group block p-5 bg-white rounded-xl border border-gray-200 hover:border-primary-300 hover:shadow-lg transition-all duration-300"
    >
      <div className="flex items-start gap-4">
        <div className="p-3 bg-gray-100 rounded-xl group-hover:bg-primary-50 transition-colors">
          <FileAudio className="w-6 h-6 text-gray-500 group-hover:text-primary-600 transition-colors" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <p className="font-medium text-gray-900 truncate group-hover:text-primary-700 transition-colors">
              {job.file_name}
            </p>
            <StatusIcon
              className={`w-4 h-4 flex-shrink-0 ${config.color} ${
                job.status === "processing" ? "animate-spin" : ""
              }`}
            />
          </div>
          <p className="text-sm text-gray-500">
            {formatDistanceToNow(new Date(job.created_at), {
              addSuffix: true,
              locale: sv,
            })}
          </p>
          {job.status === "completed" && job.word_count && (
            <p className="text-xs text-gray-400 mt-1">
              {job.word_count} ord • {job.segment_count} segment
            </p>
          )}
        </div>
        <ArrowRight className="w-5 h-5 text-gray-300 group-hover:text-primary-500 group-hover:translate-x-1 transition-all" />
      </div>
    </Link>
  );
}

export function RecentJobsSection() {
  const { data, isLoading } = useQuery({
    queryKey: ["jobs", "recent"],
    queryFn: () => listJobs(0, 3),
    staleTime: 30000, // Cache for 30 seconds
  });

  // Don't render if no jobs or still loading
  if (isLoading || !data?.jobs?.length) {
    return null;
  }

  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              Senaste transkriptioner
            </h2>
            <p className="text-gray-600 mt-1">
              Fortsätt där du slutade
            </p>
          </div>
          <Link
            href="/jobs"
            className="group flex items-center gap-2 text-primary-600 hover:text-primary-700 font-medium transition-colors"
          >
            Visa alla
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        {/* Jobs grid */}
        <div className="grid md:grid-cols-3 gap-4">
          {data.jobs.slice(0, 3).map((job) => (
            <JobPreviewCard key={job.id} job={job} />
          ))}
        </div>
      </div>
    </section>
  );
}
