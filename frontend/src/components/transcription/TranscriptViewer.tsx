/**
 * Transcript viewer component.
 */

"use client";

import { useState, useMemo } from "react";
import { clsx } from "clsx";
import { Search, User, Shield, ShieldOff } from "lucide-react";
import type { Segment } from "@/types";

interface TranscriptViewerProps {
  segments: Segment[];
  className?: string;
}

function formatTimestamp(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
  return `${minutes}:${secs.toString().padStart(2, "0")}`;
}

// Generate consistent colors for speakers
const SPEAKER_COLORS = [
  "bg-blue-100 text-blue-800 border-blue-200",
  "bg-green-100 text-green-800 border-green-200",
  "bg-purple-100 text-purple-800 border-purple-200",
  "bg-orange-100 text-orange-800 border-orange-200",
  "bg-pink-100 text-pink-800 border-pink-200",
  "bg-teal-100 text-teal-800 border-teal-200",
];

function getSpeakerColor(speaker: string, speakerList: string[]): string {
  const index = speakerList.indexOf(speaker);
  return SPEAKER_COLORS[index % SPEAKER_COLORS.length];
}

export function TranscriptViewer({ segments, className }: TranscriptViewerProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSpeaker, setSelectedSpeaker] = useState<string | null>(null);
  const [showAnonymized, setShowAnonymized] = useState(true);

  // Check if any segment has anonymized text
  const hasAnonymizedContent = useMemo(() => {
    return segments.some((s) => s.anonymized_text && s.anonymized_text !== s.text);
  }, [segments]);

  // Get unique speakers
  const speakers = useMemo(() => {
    const uniqueSpeakers = new Set<string>();
    segments.forEach((s) => {
      if (s.speaker) uniqueSpeakers.add(s.speaker);
    });
    return Array.from(uniqueSpeakers).sort();
  }, [segments]);

  // Filter segments
  const filteredSegments = useMemo(() => {
    return segments.filter((segment) => {
      // Filter by search query
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const textToSearch = showAnonymized && segment.anonymized_text
          ? segment.anonymized_text
          : segment.text;
        if (!textToSearch.toLowerCase().includes(query)) {
          return false;
        }
      }

      // Filter by speaker
      if (selectedSpeaker && segment.speaker !== selectedSpeaker) {
        return false;
      }

      return true;
    });
  }, [segments, searchQuery, selectedSpeaker, showAnonymized]);

  // Highlight search matches
  const highlightText = (text: string) => {
    if (!searchQuery) return text;

    const parts = text.split(new RegExp(`(${searchQuery})`, "gi"));
    return parts.map((part, i) =>
      part.toLowerCase() === searchQuery.toLowerCase() ? (
        <mark key={i} className="bg-yellow-200 rounded px-0.5">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  return (
    <div className={clsx("flex flex-col", className)}>
      {/* Controls */}
      <div className="flex flex-wrap gap-4 mb-4">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Sök i transkriptionen..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
        </div>

        {/* Speaker filter */}
        {speakers.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setSelectedSpeaker(null)}
              className={clsx(
                "px-3 py-1.5 rounded-full text-sm font-medium border transition-colors",
                selectedSpeaker === null
                  ? "bg-gray-900 text-white border-gray-900"
                  : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
              )}
            >
              Alla
            </button>
            {speakers.map((speaker) => (
              <button
                key={speaker}
                onClick={() => setSelectedSpeaker(speaker)}
                className={clsx(
                  "px-3 py-1.5 rounded-full text-sm font-medium border transition-colors",
                  selectedSpeaker === speaker
                    ? getSpeakerColor(speaker, speakers)
                    : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                )}
              >
                {speaker}
              </button>
            ))}
          </div>
        )}

        {/* Anonymization toggle */}
        {hasAnonymizedContent && (
          <button
            onClick={() => setShowAnonymized(!showAnonymized)}
            className={clsx(
              "flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium border transition-colors",
              showAnonymized
                ? "bg-amber-100 text-amber-800 border-amber-200"
                : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
            )}
          >
            {showAnonymized ? (
              <>
                <Shield className="w-4 h-4" />
                Avidentifierad
              </>
            ) : (
              <>
                <ShieldOff className="w-4 h-4" />
                Visa original
              </>
            )}
          </button>
        )}
      </div>

      {/* Results count */}
      <div className="text-sm text-gray-500 mb-2">
        {filteredSegments.length} av {segments.length} segment
      </div>

      {/* Segments */}
      <div className="space-y-2 overflow-y-auto">
        {filteredSegments.map((segment) => (
          <div
            key={segment.id}
            className="p-3 bg-white rounded-lg border hover:border-gray-300 transition-colors"
          >
            <div className="flex items-start gap-3">
              {/* Timestamp */}
              <span className="text-xs text-gray-400 font-mono whitespace-nowrap pt-0.5">
                {formatTimestamp(segment.start_time)}
              </span>

              {/* Speaker badge */}
              {segment.speaker && (
                <span
                  className={clsx(
                    "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border",
                    getSpeakerColor(segment.speaker, speakers)
                  )}
                >
                  <User className="w-3 h-3" />
                  {segment.speaker}
                </span>
              )}

              {/* Text */}
              <p className="flex-1 text-gray-800 leading-relaxed">
                {highlightText(
                  showAnonymized && segment.anonymized_text
                    ? segment.anonymized_text
                    : segment.text
                )}
              </p>
            </div>
          </div>
        ))}

        {filteredSegments.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            Inga matchande segment hittades
          </div>
        )}
      </div>
    </div>
  );
}
