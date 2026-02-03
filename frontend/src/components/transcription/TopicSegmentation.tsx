"use client";

import { useMemo, useState } from "react";
import {
  Layers,
  ChevronDown,
  ChevronUp,
  Clock,
  MessageSquare,
  ArrowRight,
} from "lucide-react";
import { clsx } from "clsx";
import type { Segment } from "@/types";

// Swedish stop words
const STOP_WORDS = new Set([
  "en", "ett", "den", "det", "de", "dessa", "denna",
  "jag", "du", "han", "hon", "vi", "ni", "dem", "sig", "sin", "sitt", "sina",
  "min", "mitt", "mina", "din", "ditt", "dina", "vår", "vårt", "våra",
  "man", "mig", "dig", "oss",
  "är", "var", "varit", "vara", "blir", "blev", "ha", "har", "hade", "haft",
  "kan", "kunde", "ska", "skall", "skulle", "vill", "ville",
  "måste", "får", "fick", "gör", "gjorde", "gjort", "göra",
  "kom", "kommer", "gå", "går", "gick", "ta", "tar", "tog",
  "se", "ser", "såg", "säga", "säger", "sa", "sade",
  "vet", "visste", "tror", "trodde", "tycker", "tyckte",
  "finns", "fanns", "ge", "ger", "gav",
  "och", "eller", "men", "så", "för", "att", "om", "när", "där", "här",
  "som", "med", "av", "på", "i", "till", "från", "vid", "under", "över",
  "inte", "nu", "då", "också", "bara", "även", "just", "redan",
  "alla", "allt", "några", "något", "ingen", "inget", "inga",
  "hur", "vad", "var", "vem", "vilken", "vilket", "vilka", "varför",
  "ja", "nej", "okej", "ok", "mm", "hmm", "eh", "öh",
  "liksom", "typ", "alltså", "väl", "nog", "ju",
]);

interface TopicSection {
  id: number;
  startIndex: number;
  endIndex: number;
  startTime: number;
  endTime: number;
  keywords: string[];
  segmentCount: number;
  summary: string;
}

interface TopicSegmentationProps {
  segments: Segment[];
  showAnonymized?: boolean;
  className?: string;
  onTopicClick?: (startTime: number) => void;
}

function extractKeywords(text: string, topN: number = 5): string[] {
  const words = text
    .toLowerCase()
    .replace(/[^\wåäöÅÄÖ\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 3 && !STOP_WORDS.has(word) && !/^\d+$/.test(word));

  const counts = new Map<string, number>();
  for (const word of words) {
    counts.set(word, (counts.get(word) || 0) + 1);
  }

  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([word]) => word);
}

function calculateSimilarity(keywords1: string[], keywords2: string[]): number {
  if (keywords1.length === 0 || keywords2.length === 0) return 0;
  const set1 = new Set(keywords1);
  const set2 = new Set(keywords2);
  let intersection = 0;
  Array.from(set1).forEach((word) => {
    if (set2.has(word)) intersection++;
  });
  const union = set1.size + set2.size - intersection;
  return union > 0 ? intersection / union : 0;
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

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  if (m > 0) {
    return `${m}m ${s}s`;
  }
  return `${s}s`;
}

export function TopicSegmentation({
  segments,
  showAnonymized = false,
  className,
  onTopicClick,
}: TopicSegmentationProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [sensitivity, setSensitivity] = useState<"low" | "medium" | "high">("medium");

  const topicSections = useMemo(() => {
    if (segments.length === 0) return [];

    // Determine chunk size based on sensitivity
    const chunkSize = sensitivity === "low" ? 8 : sensitivity === "medium" ? 5 : 3;
    const similarityThreshold = sensitivity === "low" ? 0.15 : sensitivity === "medium" ? 0.25 : 0.35;

    // Group segments into chunks and extract keywords
    const chunks: { segments: Segment[]; keywords: string[]; text: string }[] = [];

    for (let i = 0; i < segments.length; i += chunkSize) {
      const chunkSegments = segments.slice(i, i + chunkSize);
      const text = chunkSegments
        .map((s) => (showAnonymized && s.anonymized_text ? s.anonymized_text : s.text))
        .join(" ");
      const keywords = extractKeywords(text, 8);
      chunks.push({ segments: chunkSegments, keywords, text });
    }

    // Detect topic boundaries
    const sections: TopicSection[] = [];
    let currentSection: {
      startChunkIndex: number;
      keywords: string[];
      texts: string[];
    } = {
      startChunkIndex: 0,
      keywords: chunks[0]?.keywords || [],
      texts: [chunks[0]?.text || ""],
    };

    for (let i = 1; i < chunks.length; i++) {
      const similarity = calculateSimilarity(currentSection.keywords, chunks[i].keywords);

      if (similarity < similarityThreshold) {
        // Topic change detected - save current section
        const startSegment = chunks[currentSection.startChunkIndex].segments[0];
        const endChunk = chunks[i - 1];
        const endSegment = endChunk.segments[endChunk.segments.length - 1];

        const segmentCount = chunks
          .slice(currentSection.startChunkIndex, i)
          .reduce((acc, c) => acc + c.segments.length, 0);

        // Get top keywords for the entire section
        const sectionText = currentSection.texts.join(" ");
        const sectionKeywords = extractKeywords(sectionText, 5);

        sections.push({
          id: sections.length,
          startIndex: startSegment.segment_index,
          endIndex: endSegment.segment_index,
          startTime: startSegment.start_time,
          endTime: endSegment.end_time,
          keywords: sectionKeywords,
          segmentCount,
          summary: sectionKeywords.slice(0, 3).join(", "),
        });

        // Start new section
        currentSection = {
          startChunkIndex: i,
          keywords: chunks[i].keywords,
          texts: [chunks[i].text],
        };
      } else {
        // Same topic - merge keywords
        const mergedKeywords = Array.from(new Set([...currentSection.keywords, ...chunks[i].keywords]));
        currentSection.keywords = mergedKeywords.slice(0, 10);
        currentSection.texts.push(chunks[i].text);
      }
    }

    // Add final section
    if (chunks.length > 0) {
      const startSegment = chunks[currentSection.startChunkIndex].segments[0];
      const endChunk = chunks[chunks.length - 1];
      const endSegment = endChunk.segments[endChunk.segments.length - 1];

      const segmentCount = chunks
        .slice(currentSection.startChunkIndex)
        .reduce((acc, c) => acc + c.segments.length, 0);

      const sectionText = currentSection.texts.join(" ");
      const sectionKeywords = extractKeywords(sectionText, 5);

      sections.push({
        id: sections.length,
        startIndex: startSegment.segment_index,
        endIndex: endSegment.segment_index,
        startTime: startSegment.start_time,
        endTime: endSegment.end_time,
        keywords: sectionKeywords,
        segmentCount,
        summary: sectionKeywords.slice(0, 3).join(", "),
      });
    }

    return sections;
  }, [segments, showAnonymized, sensitivity]);

  // Color palette for topics
  const colors = [
    { bg: "bg-blue-100", border: "border-blue-300", text: "text-blue-700", dot: "bg-blue-500" },
    { bg: "bg-emerald-100", border: "border-emerald-300", text: "text-emerald-700", dot: "bg-emerald-500" },
    { bg: "bg-purple-100", border: "border-purple-300", text: "text-purple-700", dot: "bg-purple-500" },
    { bg: "bg-amber-100", border: "border-amber-300", text: "text-amber-700", dot: "bg-amber-500" },
    { bg: "bg-rose-100", border: "border-rose-300", text: "text-rose-700", dot: "bg-rose-500" },
    { bg: "bg-cyan-100", border: "border-cyan-300", text: "text-cyan-700", dot: "bg-cyan-500" },
  ];

  if (topicSections.length === 0) {
    return null;
  }

  return (
    <div className={clsx("bg-white rounded-xl border overflow-hidden", className)}>
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-lg flex items-center justify-center">
            <Layers className="w-5 h-5 text-indigo-600" />
          </div>
          <div className="text-left">
            <h3 className="font-medium text-gray-900">Ämnessegmentering</h3>
            <p className="text-sm text-gray-500">
              {topicSections.length} identifierade ämnesavsnitt
            </p>
          </div>
        </div>

        {/* Mini preview when collapsed */}
        {!isExpanded && (
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-1">
              {topicSections.slice(0, 4).map((section, i) => (
                <div
                  key={section.id}
                  className={clsx(
                    "w-3 h-3 rounded-full",
                    colors[i % colors.length].dot
                  )}
                  title={section.summary}
                />
              ))}
              {topicSections.length > 4 && (
                <span className="text-xs text-gray-400 ml-1">
                  +{topicSections.length - 4}
                </span>
              )}
            </div>
            <ChevronDown className="w-5 h-5 text-gray-400" />
          </div>
        )}

        {isExpanded && <ChevronUp className="w-5 h-5 text-gray-400" />}
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="border-t">
          {/* Sensitivity selector */}
          <div className="px-4 py-3 bg-gray-50 border-b flex items-center justify-between">
            <span className="text-sm text-gray-600">Känslighet:</span>
            <div className="flex gap-2">
              {[
                { value: "low" as const, label: "Låg" },
                { value: "medium" as const, label: "Medium" },
                { value: "high" as const, label: "Hög" },
              ].map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setSensitivity(opt.value)}
                  className={clsx(
                    "px-3 py-1 text-sm rounded-lg transition-colors",
                    sensitivity === opt.value
                      ? "bg-indigo-500 text-white"
                      : "bg-white border text-gray-600 hover:bg-gray-50"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Timeline visualization */}
          <div className="p-4">
            <div className="flex h-8 rounded-lg overflow-hidden mb-4">
              {topicSections.map((section, index) => {
                const totalDuration = segments[segments.length - 1]?.end_time || 1;
                const width = ((section.endTime - section.startTime) / totalDuration) * 100;
                const color = colors[index % colors.length];

                return (
                  <div
                    key={section.id}
                    className={clsx(
                      "h-full flex items-center justify-center text-xs font-medium cursor-pointer transition-opacity hover:opacity-80",
                      color.bg,
                      color.text
                    )}
                    style={{ width: `${width}%` }}
                    onClick={() => onTopicClick?.(section.startTime)}
                    title={`${section.summary} (${formatTime(section.startTime)})`}
                  >
                    {width > 10 && (index + 1)}
                  </div>
                );
              })}
            </div>

            {/* Topic list */}
            <div className="space-y-3">
              {topicSections.map((section, index) => {
                const color = colors[index % colors.length];
                const duration = section.endTime - section.startTime;

                return (
                  <div
                    key={section.id}
                    className={clsx(
                      "rounded-lg border p-4 cursor-pointer transition-all hover:shadow-md",
                      color.bg,
                      color.border
                    )}
                    onClick={() => onTopicClick?.(section.startTime)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className={clsx("w-6 h-6 rounded-full flex items-center justify-center text-white text-sm font-medium", color.dot)}>
                          {index + 1}
                        </div>
                        <span className={clsx("font-medium", color.text)}>
                          Avsnitt {index + 1}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {formatTime(section.startTime)}
                        </span>
                        <span>({formatDuration(duration)})</span>
                      </div>
                    </div>

                    {/* Keywords */}
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {section.keywords.map((keyword) => (
                        <span
                          key={keyword}
                          className="px-2 py-0.5 bg-white/60 rounded text-sm"
                        >
                          {keyword}
                        </span>
                      ))}
                    </div>

                    <div className="flex items-center justify-between mt-3 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <MessageSquare className="w-4 h-4" />
                        {section.segmentCount} segment
                      </span>
                      <span className="flex items-center gap-1 text-gray-400">
                        Klicka för att hoppa hit
                        <ArrowRight className="w-4 h-4" />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
