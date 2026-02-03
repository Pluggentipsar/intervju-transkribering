/**
 * Transcript viewer component.
 */

"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { clsx } from "clsx";
import { Search, User, Shield, ShieldOff, Copy, CheckCircle, Play } from "lucide-react";
import type { Segment } from "@/types";

interface TranscriptViewerProps {
  segments: Segment[];
  className?: string;
  /** Controlled mode: current showAnonymized state */
  showAnonymized?: boolean;
  /** Controlled mode: callback when showAnonymized changes */
  onShowAnonymizedChange?: (value: boolean) => void;
  /** Current audio playback time (for highlighting active segment) */
  currentAudioTime?: number;
  /** Callback when user clicks a segment to seek to that time */
  onSegmentClick?: (time: number) => void;
  /** Whether auto-scroll to active segment is enabled */
  autoScroll?: boolean;
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

export function TranscriptViewer({
  segments,
  className,
  showAnonymized: controlledShowAnonymized,
  onShowAnonymizedChange,
  currentAudioTime,
  onSegmentClick,
  autoScroll = true,
}: TranscriptViewerProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSpeaker, setSelectedSpeaker] = useState<string | null>(null);
  const [internalShowAnonymized, setInternalShowAnonymized] = useState(true);
  const [copied, setCopied] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const activeSegmentRef = useRef<HTMLDivElement>(null);

  // Use controlled or internal state
  const isControlled = controlledShowAnonymized !== undefined;
  const showAnonymized = isControlled ? controlledShowAnonymized : internalShowAnonymized;
  const setShowAnonymized = isControlled
    ? (value: boolean) => onShowAnonymizedChange?.(value)
    : setInternalShowAnonymized;

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

  // Find active segment based on current audio time
  const activeSegmentId = useMemo(() => {
    if (currentAudioTime === undefined) return null;

    // Find segment where currentAudioTime falls within start_time and end_time
    const activeSegment = segments.find(
      (s) => currentAudioTime >= s.start_time && currentAudioTime < s.end_time
    );
    return activeSegment?.id ?? null;
  }, [segments, currentAudioTime]);

  // Auto-scroll to active segment
  useEffect(() => {
    if (autoScroll && activeSegmentRef.current && containerRef.current) {
      const container = containerRef.current;
      const element = activeSegmentRef.current;
      const containerRect = container.getBoundingClientRect();
      const elementRect = element.getBoundingClientRect();

      // Check if element is outside visible area
      if (elementRect.top < containerRect.top || elementRect.bottom > containerRect.bottom) {
        element.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  }, [activeSegmentId, autoScroll]);

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

  // Get full text for copying
  const getFullText = () => {
    return filteredSegments
      .map((segment) => {
        const text = showAnonymized && segment.anonymized_text
          ? segment.anonymized_text
          : segment.text;
        const speaker = segment.speaker ? `[${segment.speaker}]: ` : "";
        return `${speaker}${text}`;
      })
      .join("\n\n");
  };

  // Copy handler
  const handleCopy = async () => {
    const text = getFullText();
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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

        {/* Copy button */}
        <button
          onClick={handleCopy}
          className={clsx(
            "flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium border transition-colors",
            copied
              ? "bg-green-100 text-green-800 border-green-200"
              : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
          )}
        >
          {copied ? (
            <>
              <CheckCircle className="w-4 h-4" />
              Kopierat!
            </>
          ) : (
            <>
              <Copy className="w-4 h-4" />
              Kopiera text
            </>
          )}
        </button>
      </div>

      {/* Results count */}
      <div className="text-sm text-gray-500 mb-2">
        {filteredSegments.length} av {segments.length} segment
      </div>

      {/* Segments */}
      <div ref={containerRef} className="space-y-2 overflow-y-auto">
        {filteredSegments.map((segment) => {
          const isActive = segment.id === activeSegmentId;
          const isClickable = !!onSegmentClick;

          return (
            <div
              key={segment.id}
              ref={isActive ? activeSegmentRef : undefined}
              onClick={isClickable ? () => onSegmentClick(segment.start_time) : undefined}
              className={clsx(
                "p-3 rounded-lg border transition-all",
                isActive
                  ? "bg-primary-50 border-primary-300 ring-2 ring-primary-200"
                  : "bg-white border-gray-200 hover:border-gray-300",
                isClickable && "cursor-pointer hover:shadow-sm"
              )}
            >
              <div className="flex items-start gap-3">
                {/* Timestamp with play indicator */}
                <div className="flex items-center gap-1">
                  {isClickable && (
                    <Play
                      className={clsx(
                        "w-3 h-3 transition-opacity",
                        isActive ? "text-primary-500 opacity-100" : "text-gray-400 opacity-0 group-hover:opacity-100"
                      )}
                    />
                  )}
                  <span
                    className={clsx(
                      "text-xs font-mono whitespace-nowrap pt-0.5",
                      isActive ? "text-primary-600 font-medium" : "text-gray-400"
                    )}
                  >
                    {formatTimestamp(segment.start_time)}
                  </span>
                </div>

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
                <p className={clsx(
                  "flex-1 leading-relaxed",
                  isActive ? "text-gray-900" : "text-gray-800"
                )}>
                  {highlightText(
                    showAnonymized && segment.anonymized_text
                      ? segment.anonymized_text
                      : segment.text
                  )}
                </p>
              </div>
            </div>
          );
        })}

        {filteredSegments.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            Inga matchande segment hittades
          </div>
        )}
      </div>
    </div>
  );
}
