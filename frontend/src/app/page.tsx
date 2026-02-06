"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { sv } from "date-fns/locale";
import {
  Mic,
  Shield,
  ArrowRight,
  FileAudio,
  Clock,
  CheckCircle,
  Loader2,
  XCircle,
  Lock,
} from "lucide-react";
import { listJobs } from "@/services/api";
import type { Job, JobStatus } from "@/types";

const STATUS_ICON: Record<JobStatus, { icon: typeof Clock; color: string }> = {
  pending: { icon: Clock, color: "text-gray-400" },
  processing: { icon: Loader2, color: "text-primary-500" },
  completed: { icon: CheckCircle, color: "text-green-500" },
  failed: { icon: XCircle, color: "text-red-500" },
  cancelled: { icon: XCircle, color: "text-gray-400" },
};

function RecentJobRow({ job }: { job: Job }) {
  const config = STATUS_ICON[job.status];
  const StatusIcon = config.icon;

  return (
    <Link
      href={`/jobs/${job.id}`}
      className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-50 transition-colors group"
    >
      <div className="w-9 h-9 bg-gray-100 rounded-lg flex items-center justify-center group-hover:bg-primary-50 transition-colors">
        <FileAudio className="w-4 h-4 text-gray-500 group-hover:text-primary-600" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">
          {job.file_name}
        </p>
        <p className="text-xs text-gray-500">
          {formatDistanceToNow(new Date(job.created_at), {
            addSuffix: true,
            locale: sv,
          })}
        </p>
      </div>
      <StatusIcon
        className={`w-4 h-4 ${config.color} ${job.status === "processing" ? "animate-spin" : ""}`}
      />
    </Link>
  );
}

export default function HomePage() {
  const { data } = useQuery({
    queryKey: ["jobs", "recent"],
    queryFn: () => listJobs(0, 5),
    staleTime: 30000,
  });

  const jobs = data?.jobs || [];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      {/* Welcome */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">
          Vad vill du gora?
        </h1>
        <p className="text-gray-500 text-sm flex items-center gap-1.5">
          <Lock className="w-3.5 h-3.5" />
          Allt sker lokalt pa din dator
        </p>
      </div>

      {/* Quick actions */}
      <div className="grid sm:grid-cols-2 gap-4 mb-8">
        <Link
          href="/upload"
          className="group flex items-start gap-4 p-5 bg-white border border-gray-200 rounded-xl hover:border-primary-300 hover:shadow-md transition-all"
        >
          <div className="w-11 h-11 bg-primary-50 rounded-lg flex items-center justify-center group-hover:bg-primary-100 transition-colors">
            <Mic className="w-5 h-5 text-primary-600" />
          </div>
          <div className="flex-1">
            <h2 className="font-semibold text-gray-900 mb-1 flex items-center gap-2">
              Ny transkription
              <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
            </h2>
            <p className="text-sm text-gray-500">
              Ladda upp ljud och transkribera med KB Whisper
            </p>
          </div>
        </Link>

        <Link
          href="/anonymize"
          className="group flex items-start gap-4 p-5 bg-white border border-gray-200 rounded-xl hover:border-amber-300 hover:shadow-md transition-all"
        >
          <div className="w-11 h-11 bg-amber-50 rounded-lg flex items-center justify-center group-hover:bg-amber-100 transition-colors">
            <Shield className="w-5 h-5 text-amber-600" />
          </div>
          <div className="flex-1">
            <h2 className="font-semibold text-gray-900 mb-1 flex items-center gap-2">
              Avidentifiera text
              <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
            </h2>
            <p className="text-sm text-gray-500">
              Anonymisera namn, platser och personnummer
            </p>
          </div>
        </Link>
      </div>

      {/* Recent jobs */}
      {jobs.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900 text-sm">
              Senaste transkriptioner
            </h2>
            <Link
              href="/jobs"
              className="text-xs text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1"
            >
              Visa alla
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="divide-y divide-gray-50">
            {jobs.map((job) => (
              <RecentJobRow key={job.id} job={job} />
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {jobs.length === 0 && (
        <div className="text-center py-12 bg-white border border-gray-200 rounded-xl">
          <div className="w-14 h-14 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-4">
            <FileAudio className="w-7 h-7 text-gray-400" />
          </div>
          <h3 className="font-semibold text-gray-900 mb-1">
            Inga transkriptioner an
          </h3>
          <p className="text-sm text-gray-500 mb-4">
            Ladda upp en ljudfil for att komma igang
          </p>
          <Link
            href="/upload"
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary-500 text-white text-sm font-medium rounded-lg hover:bg-primary-600 transition-colors"
          >
            <Mic className="w-4 h-4" />
            Ny transkription
          </Link>
        </div>
      )}
    </div>
  );
}
