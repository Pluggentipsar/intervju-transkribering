"use client";

import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
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
  Pencil,
  Trash2,
  Check,
  X,
} from "lucide-react";
import Link from "next/link";
import { listJobs, renameJob, deleteJob } from "@/services/api";
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
    color: "text-gray-400",
    bgColor: "bg-gray-500/10",
  },
  processing: {
    icon: Loader2,
    label: "Bearbetar",
    color: "text-blue-400",
    bgColor: "bg-blue-500/10",
  },
  completed: {
    icon: CheckCircle,
    label: "Klar",
    color: "text-green-400",
    bgColor: "bg-green-500/10",
  },
  failed: {
    icon: XCircle,
    label: "Misslyckades",
    color: "text-red-400",
    bgColor: "bg-red-500/10",
  },
  cancelled: {
    icon: XCircle,
    label: "Avbruten",
    color: "text-gray-400",
    bgColor: "bg-gray-500/10",
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
  const queryClient = useQueryClient();

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(job.name || job.file_name);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const renameMutation = useMutation({
    mutationFn: (name: string) => renameJob(job.id, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
      setIsEditing(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteJob(job.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
    },
  });

  const handleSaveRename = () => {
    const trimmed = editName.trim();
    if (trimmed && trimmed !== (job.name || job.file_name)) {
      renameMutation.mutate(trimmed);
    } else {
      setIsEditing(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSaveRename();
    } else if (e.key === "Escape") {
      setEditName(job.name || job.file_name);
      setIsEditing(false);
    }
  };

  const displayName = job.name || job.file_name;
  const router = useRouter();

  return (
    <div
      className="group relative bg-dark-800/50 rounded-xl border border-white/10 hover:border-primary-500/30 hover:shadow-md hover:shadow-primary-500/5 transition-all cursor-pointer"
      onClick={() => {
        if (!isEditing && !showDeleteConfirm) {
          router.push(`/jobs/${job.id}`);
        }
      }}
    >
      {/* Delete confirmation overlay */}
      {showDeleteConfirm && (
        <div className="absolute inset-0 z-10 bg-dark-900/95 rounded-xl flex items-center justify-center p-4">
          <div className="text-center">
            <p className="text-sm text-gray-300 mb-3">
              Ta bort <span className="font-medium text-white">{displayName}</span>?
            </p>
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={(e) => { e.stopPropagation(); setShowDeleteConfirm(false); }}
                className="px-3 py-1.5 text-xs text-gray-300 bg-dark-700 rounded-lg hover:bg-dark-600 transition-colors"
              >
                Avbryt
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(); }}
                disabled={deleteMutation.isPending}
                className="px-3 py-1.5 text-xs text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {deleteMutation.isPending ? "Tar bort..." : "Ta bort"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-dark-700 rounded-lg flex items-center justify-center group-hover:bg-primary-500/10 transition-colors flex-shrink-0">
            <FileAudio className="w-5 h-5 text-gray-400 group-hover:text-primary-400" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-3 mb-1">
              {isEditing ? (
                <div
                  className="flex items-center gap-1 flex-1 min-w-0"
                  onClick={(e) => e.stopPropagation()}
                >
                  <input
                    ref={inputRef}
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onBlur={handleSaveRename}
                    className="flex-1 min-w-0 bg-dark-700 border border-primary-500/50 rounded px-2 py-0.5 text-sm text-white focus:outline-none focus:border-primary-400"
                  />
                  <button
                    onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); handleSaveRename(); }}
                    className="p-1 text-green-400 hover:bg-green-500/10 rounded transition-colors"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setEditName(displayName);
                      setIsEditing(false);
                    }}
                    className="p-1 text-gray-400 hover:bg-white/10 rounded transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                  <h3 className="font-medium text-white truncate text-sm">
                    {displayName}
                  </h3>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditName(displayName);
                      setIsEditing(true);
                    }}
                    className="p-1.5 text-gray-400 hover:text-primary-400 hover:bg-white/10 rounded transition-colors flex-shrink-0"
                    title="Byt namn"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                </div>
              )}
              <div className="flex items-center gap-2 flex-shrink-0">
                <div
                  className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${config.color} ${config.bgColor}`}
                >
                  <StatusIcon
                    className={`w-3 h-3 ${job.status === "processing" ? "animate-spin" : ""}`}
                  />
                  <span>{config.label}</span>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowDeleteConfirm(true);
                  }}
                  className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                  title="Ta bort"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs text-gray-400">
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
                <p className="text-xs text-gray-400 mt-1">{job.current_step}</p>
              </div>
            )}

            {job.status === "completed" && (
              <div className="mt-3 flex gap-3">
                {job.segment_count && (
                  <span className="text-xs text-gray-400">
                    {job.segment_count} segment
                  </span>
                )}
                {job.word_count && (
                  <span className="text-xs text-gray-400">
                    {job.word_count} ord
                  </span>
                )}
                {job.speaker_count && job.speaker_count > 0 && (
                  <span className="flex items-center gap-1 text-xs text-primary-400">
                    <Users className="w-3 h-3" />
                    {job.speaker_count} talare
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
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
          <h1 className="text-xl font-bold text-white mb-1">
            Mina transkriptioner
          </h1>
          <div className="flex items-center gap-3 text-sm text-gray-400">
            <span>{jobs.length} totalt</span>
            {processingCount > 0 && (
              <span className="flex items-center gap-1 text-blue-400">
                <Loader2 className="w-3 h-3 animate-spin" />
                {processingCount} bearbetas
              </span>
            )}
            {completedCount > 0 && (
              <span className="flex items-center gap-1 text-green-400">
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
          <span className="ml-2 text-sm text-gray-400">Laddar...</span>
        </div>
      ) : error ? (
        <div className="text-center py-12 bg-red-500/5 border border-red-500/20 rounded-xl">
          <XCircle className="w-8 h-8 text-red-400 mx-auto mb-2" />
          <p className="text-sm text-gray-300">
            Kunde inte ladda transkriptioner
          </p>
        </div>
      ) : jobs.length === 0 ? (
        <div className="text-center py-12 bg-dark-800/50 border border-white/10 rounded-xl">
          <FileAudio className="w-8 h-8 text-gray-500 mx-auto mb-2" />
          <h3 className="font-semibold text-white mb-1">
            Inga transkriptioner än
          </h3>
          <p className="text-sm text-gray-400 mb-4">
            Ladda upp din första ljudfil för att komma igång
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
