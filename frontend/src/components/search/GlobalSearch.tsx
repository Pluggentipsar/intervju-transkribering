"use client";

import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { sv } from "date-fns/locale";
import {
  Search,
  X,
  Loader2,
  FileAudio,
  Clock,
  User,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";
import { clsx } from "clsx";
import { searchTranscripts } from "@/services/api";
import type { SearchResultJob, SearchResultSegment } from "@/types";

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);

  if (h > 0) {
    return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function highlightMatch(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text;

  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
  const parts = text.split(regex);

  return parts.map((part, i) =>
    regex.test(part) ? (
      <mark key={i} className="bg-yellow-200 text-yellow-900 rounded px-0.5">
        {part}
      </mark>
    ) : (
      part
    )
  );
}

function SearchResultSegmentItem({
  segment,
  query,
  jobId,
}: {
  segment: SearchResultSegment;
  query: string;
  jobId: string;
}) {
  return (
    <Link
      href={`/jobs/${jobId}?t=${segment.start_time}`}
      className="block px-4 py-3 hover:bg-gray-50 transition-colors border-l-2 border-transparent hover:border-primary-400"
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          <div className="flex items-center gap-1 text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">
            <Clock className="w-3 h-3" />
            {formatTime(segment.start_time)}
          </div>
        </div>
        <div className="flex-1 min-w-0">
          {segment.speaker && (
            <div className="flex items-center gap-1 text-xs text-primary-600 mb-1">
              <User className="w-3 h-3" />
              {segment.speaker}
            </div>
          )}
          <p className="text-sm text-gray-700 line-clamp-2">
            {highlightMatch(segment.text, query)}
          </p>
        </div>
      </div>
    </Link>
  );
}

function SearchResultJobItem({
  result,
  query,
}: {
  result: SearchResultJob;
  query: string;
}) {
  const [expanded, setExpanded] = useState(true);
  const visibleSegments = expanded ? result.segments : result.segments.slice(0, 2);

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
      <Link
        href={`/jobs/${result.job_id}`}
        className="flex items-center gap-3 p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
      >
        <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
          <FileAudio className="w-5 h-5 text-primary-600" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-gray-900 truncate">{result.file_name}</h4>
          <p className="text-xs text-gray-500">
            {formatDistanceToNow(new Date(result.created_at), {
              addSuffix: true,
              locale: sv,
            })}
            {" · "}
            {result.total_matches} träff{result.total_matches !== 1 && "ar"}
          </p>
        </div>
        <ChevronRight className="w-5 h-5 text-gray-400" />
      </Link>

      <div className="divide-y divide-gray-100">
        {visibleSegments.map((segment) => (
          <SearchResultSegmentItem
            key={segment.segment_index}
            segment={segment}
            query={query}
            jobId={result.job_id}
          />
        ))}
      </div>

      {result.segments.length > 2 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full px-4 py-2 text-sm text-primary-600 hover:bg-primary-50 transition-colors"
        >
          {expanded
            ? "Visa färre"
            : `Visa ${result.segments.length - 2} fler träffar`}
        </button>
      )}
    </div>
  );
}

interface GlobalSearchProps {
  className?: string;
}

export function GlobalSearch({ className }: GlobalSearchProps) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [debouncedQuery, setDebouncedQuery] = useState("");

  // Debounce search
  const handleSearch = useCallback((value: string) => {
    setQuery(value);
    const timeoutId = setTimeout(() => {
      setDebouncedQuery(value.trim().length >= 2 ? value.trim() : "");
    }, 300);
    return () => clearTimeout(timeoutId);
  }, []);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["search", debouncedQuery],
    queryFn: () => searchTranscripts(debouncedQuery),
    enabled: debouncedQuery.length >= 2,
    staleTime: 30000,
  });

  const showResults = isOpen && query.length >= 2;
  const hasResults = data && data.results.length > 0;

  return (
    <div className={clsx("relative", className)}>
      {/* Search input */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          {isLoading || isFetching ? (
            <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
          ) : (
            <Search className="w-5 h-5 text-gray-400" />
          )}
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          onFocus={() => setIsOpen(true)}
          placeholder="Sök i alla transkriptioner..."
          className="w-full pl-12 pr-10 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent transition-all"
        />
        {query && (
          <button
            onClick={() => {
              setQuery("");
              setDebouncedQuery("");
            }}
            className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Results dropdown */}
      {showResults && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Results panel */}
          <div className="absolute top-full left-0 right-0 mt-2 z-50 bg-white rounded-xl shadow-2xl border border-gray-200 max-h-[70vh] overflow-hidden">
            {isLoading ? (
              <div className="p-8 text-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary-500 mx-auto mb-3" />
                <p className="text-gray-500">Söker...</p>
              </div>
            ) : !hasResults ? (
              <div className="p-8 text-center">
                <Search className="w-8 h-8 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">
                  Inga träffar för &quot;{debouncedQuery}&quot;
                </p>
                <p className="text-sm text-gray-400 mt-1">
                  Prova att söka med andra ord
                </p>
              </div>
            ) : (
              <div className="overflow-y-auto max-h-[calc(70vh-2rem)]">
                <div className="sticky top-0 bg-gray-50 px-4 py-3 border-b border-gray-200">
                  <p className="text-sm text-gray-600">
                    <span className="font-medium text-gray-900">
                      {data.total_segments}
                    </span>{" "}
                    träff{data.total_segments !== 1 && "ar"} i{" "}
                    <span className="font-medium text-gray-900">
                      {data.total_jobs}
                    </span>{" "}
                    {data.total_jobs === 1 ? "transkription" : "transkriptioner"}
                  </p>
                </div>
                <div className="p-4 space-y-4">
                  {data.results.map((result) => (
                    <SearchResultJobItem
                      key={result.job_id}
                      result={result}
                      query={debouncedQuery}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
