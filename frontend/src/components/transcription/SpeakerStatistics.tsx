"use client";

import { useMemo, useState } from "react";
import {
  BarChart3,
  Clock,
  MessageSquare,
  Hash,
  ChevronDown,
  ChevronUp,
  Users,
} from "lucide-react";
import { clsx } from "clsx";
import type { Segment } from "@/types";

// Colors for speakers
const SPEAKER_COLORS = [
  { bg: "bg-blue-500", light: "bg-blue-100", text: "text-blue-700" },
  { bg: "bg-emerald-500", light: "bg-emerald-100", text: "text-emerald-700" },
  { bg: "bg-purple-500", light: "bg-purple-100", text: "text-purple-700" },
  { bg: "bg-amber-500", light: "bg-amber-100", text: "text-amber-700" },
  { bg: "bg-rose-500", light: "bg-rose-100", text: "text-rose-700" },
  { bg: "bg-cyan-500", light: "bg-cyan-100", text: "text-cyan-700" },
  { bg: "bg-orange-500", light: "bg-orange-100", text: "text-orange-700" },
  { bg: "bg-indigo-500", light: "bg-indigo-100", text: "text-indigo-700" },
];

interface SpeakerStats {
  speaker: string;
  speakingTime: number;
  wordCount: number;
  segmentCount: number;
  percentage: number;
  color: (typeof SPEAKER_COLORS)[number];
}

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);

  if (h > 0) {
    return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function StatBar({
  value,
  maxValue,
  color,
}: {
  value: number;
  maxValue: number;
  color: string;
}) {
  const percentage = maxValue > 0 ? (value / maxValue) * 100 : 0;
  return (
    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
      <div
        className={clsx("h-full rounded-full transition-all duration-500", color)}
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
}

interface SpeakerStatisticsProps {
  segments: Segment[];
  className?: string;
}

export function SpeakerStatistics({ segments, className }: SpeakerStatisticsProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [viewMode, setViewMode] = useState<"time" | "words" | "segments">("time");

  const stats = useMemo(() => {
    // Group segments by speaker
    const speakerMap = new Map<
      string,
      { speakingTime: number; wordCount: number; segmentCount: number }
    >();

    let totalTime = 0;

    for (const segment of segments) {
      const speaker = segment.speaker || "Okänd talare";
      const duration = segment.end_time - segment.start_time;
      const words = segment.text.split(/\s+/).filter(Boolean).length;

      totalTime += duration;

      const existing = speakerMap.get(speaker);
      if (existing) {
        existing.speakingTime += duration;
        existing.wordCount += words;
        existing.segmentCount += 1;
      } else {
        speakerMap.set(speaker, {
          speakingTime: duration,
          wordCount: words,
          segmentCount: 1,
        });
      }
    }

    // Convert to array and sort by speaking time
    const speakerStats: SpeakerStats[] = Array.from(speakerMap.entries())
      .map(([speaker, data], index) => ({
        speaker,
        ...data,
        percentage: totalTime > 0 ? (data.speakingTime / totalTime) * 100 : 0,
        color: SPEAKER_COLORS[index % SPEAKER_COLORS.length],
      }))
      .sort((a, b) => b.speakingTime - a.speakingTime);

    return {
      speakers: speakerStats,
      totalTime,
      totalWords: speakerStats.reduce((acc, s) => acc + s.wordCount, 0),
      totalSegments: speakerStats.reduce((acc, s) => acc + s.segmentCount, 0),
    };
  }, [segments]);

  // Get max values for bar scaling
  const maxTime = Math.max(...stats.speakers.map((s) => s.speakingTime));
  const maxWords = Math.max(...stats.speakers.map((s) => s.wordCount));
  const maxSegments = Math.max(...stats.speakers.map((s) => s.segmentCount));

  if (stats.speakers.length === 0) {
    return null;
  }

  return (
    <div className={clsx("bg-white rounded-xl border overflow-hidden", className)}>
      {/* Header - always visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-primary-50 to-primary-100 rounded-lg flex items-center justify-center">
            <BarChart3 className="w-5 h-5 text-primary-600" />
          </div>
          <div className="text-left">
            <h3 className="font-medium text-gray-900">Talarstatistik</h3>
            <p className="text-sm text-gray-500">
              {stats.speakers.length} talare · {formatTime(stats.totalTime)} total tid
            </p>
          </div>
        </div>

        {/* Mini preview when collapsed */}
        {!isExpanded && (
          <div className="flex items-center gap-4">
            {/* Compact distribution bar */}
            <div className="hidden sm:flex h-3 w-32 rounded-full overflow-hidden">
              {stats.speakers.map((speaker, i) => (
                <div
                  key={speaker.speaker}
                  className={clsx("h-full", speaker.color.bg)}
                  style={{ width: `${speaker.percentage}%` }}
                  title={`${speaker.speaker}: ${speaker.percentage.toFixed(0)}%`}
                />
              ))}
            </div>
            <ChevronDown className="w-5 h-5 text-gray-400" />
          </div>
        )}

        {isExpanded && <ChevronUp className="w-5 h-5 text-gray-400" />}
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="border-t">
          {/* View mode tabs */}
          <div className="flex border-b bg-gray-50">
            <button
              onClick={() => setViewMode("time")}
              className={clsx(
                "flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors",
                viewMode === "time"
                  ? "text-primary-600 bg-white border-b-2 border-primary-500 -mb-px"
                  : "text-gray-500 hover:text-gray-700"
              )}
            >
              <Clock className="w-4 h-4" />
              Taltid
            </button>
            <button
              onClick={() => setViewMode("words")}
              className={clsx(
                "flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors",
                viewMode === "words"
                  ? "text-primary-600 bg-white border-b-2 border-primary-500 -mb-px"
                  : "text-gray-500 hover:text-gray-700"
              )}
            >
              <MessageSquare className="w-4 h-4" />
              Ord
            </button>
            <button
              onClick={() => setViewMode("segments")}
              className={clsx(
                "flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors",
                viewMode === "segments"
                  ? "text-primary-600 bg-white border-b-2 border-primary-500 -mb-px"
                  : "text-gray-500 hover:text-gray-700"
              )}
            >
              <Hash className="w-4 h-4" />
              Segment
            </button>
          </div>

          {/* Stats list */}
          <div className="p-4 space-y-4">
            {stats.speakers.map((speaker) => (
              <div key={speaker.speaker} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className={clsx(
                        "w-3 h-3 rounded-full",
                        speaker.color.bg
                      )}
                    />
                    <span className="font-medium text-gray-900">
                      {speaker.speaker}
                    </span>
                  </div>
                  <div className="text-right">
                    {viewMode === "time" && (
                      <span className="text-sm font-medium text-gray-900">
                        {formatTime(speaker.speakingTime)}
                        <span className="text-gray-400 ml-1">
                          ({speaker.percentage.toFixed(0)}%)
                        </span>
                      </span>
                    )}
                    {viewMode === "words" && (
                      <span className="text-sm font-medium text-gray-900">
                        {speaker.wordCount.toLocaleString()} ord
                        <span className="text-gray-400 ml-1">
                          (
                          {(
                            (speaker.wordCount / stats.totalWords) *
                            100
                          ).toFixed(0)}
                          %)
                        </span>
                      </span>
                    )}
                    {viewMode === "segments" && (
                      <span className="text-sm font-medium text-gray-900">
                        {speaker.segmentCount} segment
                        <span className="text-gray-400 ml-1">
                          (
                          {(
                            (speaker.segmentCount / stats.totalSegments) *
                            100
                          ).toFixed(0)}
                          %)
                        </span>
                      </span>
                    )}
                  </div>
                </div>
                <StatBar
                  value={
                    viewMode === "time"
                      ? speaker.speakingTime
                      : viewMode === "words"
                        ? speaker.wordCount
                        : speaker.segmentCount
                  }
                  maxValue={
                    viewMode === "time"
                      ? maxTime
                      : viewMode === "words"
                        ? maxWords
                        : maxSegments
                  }
                  color={speaker.color.bg}
                />
              </div>
            ))}
          </div>

          {/* Distribution visualization */}
          <div className="px-4 pb-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500 mb-2 uppercase tracking-wide font-medium">
                Fördelning av taltid
              </p>
              <div className="flex h-6 rounded-lg overflow-hidden">
                {stats.speakers.map((speaker) => (
                  <div
                    key={speaker.speaker}
                    className={clsx(
                      "h-full transition-all duration-500 relative group cursor-default",
                      speaker.color.bg
                    )}
                    style={{ width: `${speaker.percentage}%` }}
                  >
                    {/* Tooltip */}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                      {speaker.speaker}: {speaker.percentage.toFixed(1)}%
                    </div>
                  </div>
                ))}
              </div>
              {/* Legend */}
              <div className="flex flex-wrap gap-4 mt-3">
                {stats.speakers.map((speaker) => (
                  <div key={speaker.speaker} className="flex items-center gap-1.5">
                    <div
                      className={clsx("w-2.5 h-2.5 rounded-full", speaker.color.bg)}
                    />
                    <span className="text-xs text-gray-600">{speaker.speaker}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
