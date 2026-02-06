"use client";

import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

import Link from "next/link";
import {
  ArrowLeft,
  Scissors,
  Undo2,
  Download,
  Play,
  Pause,
  Loader2,
  AlertCircle,
  Check,
  Volume2,
  Zap,
} from "lucide-react";
import { clsx } from "clsx";
import {
  getEditableTranscript,
  updateWordInclusion,
  resetEdits,
  getEditedAudioUrl,
  getAudioUrl,
} from "@/services/api";
import { Button } from "@/components/ui/Button";
import { AudioWaveform } from "@/components/editor/AudioWaveform";
import type { EditorWord, EditorSegment } from "@/types";

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);

  if (h > 0) {
    return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }
  return `${m}:${s.toString().padStart(2, "0")}`;
}

interface WordProps {
  word: EditorWord;
  isSelected: boolean;
  onClick: () => void;
  onMouseDown: () => void;
  onMouseEnter: () => void;
  isPlaying: boolean;
  currentTime: number;
}

function Word({
  word,
  isSelected,
  onClick,
  onMouseDown,
  onMouseEnter,
  isPlaying,
  currentTime,
}: WordProps) {
  const isCurrentlyPlaying =
    isPlaying && currentTime >= word.start_time && currentTime < word.end_time;

  return (
    <span
      onClick={onClick}
      onMouseDown={onMouseDown}
      onMouseEnter={onMouseEnter}
      className={clsx(
        "cursor-pointer px-0.5 py-0.5 rounded transition-all select-none",
        {
          // Excluded (strikethrough)
          "line-through text-gray-500 bg-red-500/10": !word.included,
          // Selected for exclusion
          "bg-red-500/20 text-red-300": isSelected && word.included,
          // Currently playing
          "bg-primary-500/20 text-primary-300": isCurrentlyPlaying && word.included,
          // Normal
          "hover:bg-white/10": word.included && !isSelected && !isCurrentlyPlaying,
        }
      )}
    >
      {word.text}
    </span>
  );
}

interface SegmentEditorProps {
  segment: EditorSegment;
  selectedWordIds: Set<number>;
  onWordClick: (wordId: number) => void;
  onWordMouseDown: (wordId: number) => void;
  onWordMouseEnter: (wordId: number) => void;
  isPlaying: boolean;
  currentTime: number;
}

function SegmentEditor({
  segment,
  selectedWordIds,
  onWordClick,
  onWordMouseDown,
  onWordMouseEnter,
  isPlaying,
  currentTime,
}: SegmentEditorProps) {
  const hasWords = segment.words.length > 0;
  const allExcluded = hasWords && segment.words.every((w) => !w.included);

  return (
    <div
      className={clsx("p-4 rounded-lg border transition-all", {
        "bg-red-500/5 border-red-500/20": allExcluded,
        "bg-dark-800/50 border-white/10": !allExcluded,
      })}
    >
      <div className="flex items-center gap-2 mb-2 text-sm text-gray-400">
        {segment.speaker && (
          <span className="font-medium text-primary-400">{segment.speaker}</span>
        )}
        <span>{formatTime(segment.start_time)}</span>
      </div>

      {hasWords ? (
        <p className="text-lg leading-relaxed text-gray-200">
          {segment.words.map((word, i) => (
            <span key={word.id}>
              <Word
                word={word}
                isSelected={selectedWordIds.has(word.id)}
                onClick={() => onWordClick(word.id)}
                onMouseDown={() => onWordMouseDown(word.id)}
                onMouseEnter={() => onWordMouseEnter(word.id)}
                isPlaying={isPlaying}
                currentTime={currentTime}
              />
              {i < segment.words.length - 1 && " "}
            </span>
          ))}
        </p>
      ) : (
        <p className="text-lg text-gray-400 italic">
          Inga ord-tidsstämplar tillgängliga för detta segment
        </p>
      )}
    </div>
  );
}

export default function AudioEditorClient() {
  const router = useRouter();
  const queryClient = useQueryClient();

  // Read job ID from the URL pathname instead of useParams() because
  // static export pre-renders with a placeholder ID that persists after hydration.
  const [jobId] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const parts = window.location.pathname.replace(/\/+$/, "").split("/");
      // URL is /jobs/{id}/edit, so id is second to last
      const idx = parts.indexOf("edit");
      return idx > 0 ? parts[idx - 1] : "";
    }
    return "";
  });

  // Selection state
  const [selectedWordIds, setSelectedWordIds] = useState<Set<number>>(new Set());
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartId, setDragStartId] = useState<number | null>(null);
  const [hasDragged, setHasDragged] = useState(false); // Track if we actually moved during drag

  // Audio state
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showWaveform, setShowWaveform] = useState(false);
  const [detectedSilences, setDetectedSilences] = useState<Array<{ start: number; end: number; duration: number }>>([]);
  const [waveformSelectedRegion, setWaveformSelectedRegion] = useState<{ start: number; end: number } | null>(null);

  // Fetch editable transcript
  const { data: transcript, isLoading, error } = useQuery({
    queryKey: ["editable-transcript", jobId],
    queryFn: () => getEditableTranscript(jobId),
    enabled: !!jobId,
  });

  // Update word inclusion mutation
  const updateMutation = useMutation({
    mutationFn: ({
      wordIds,
      included,
    }: {
      wordIds: number[];
      included: boolean;
    }) => updateWordInclusion(jobId, wordIds, included),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["editable-transcript", jobId] });
      setSelectedWordIds(new Set());
    },
  });

  // Reset edits mutation
  const resetMutation = useMutation({
    mutationFn: () => resetEdits(jobId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["editable-transcript", jobId] });
    },
  });

  // Calculate stats and excluded ranges
  const { stats, excludedRanges } = useMemo(() => {
    if (!transcript) {
      return {
        stats: { totalWords: 0, excludedWords: 0, estimatedDuration: 0 },
        excludedRanges: [] as Array<{ start: number; end: number }>,
      };
    }

    let totalWords = 0;
    let excludedWords = 0;
    let excludedDuration = 0;
    const ranges: Array<{ start: number; end: number }> = [];

    for (const segment of transcript.segments) {
      for (const word of segment.words) {
        totalWords++;
        if (!word.included) {
          excludedWords++;
          excludedDuration += word.end_time - word.start_time;
          ranges.push({ start: word.start_time, end: word.end_time });
        }
      }
    }

    return {
      stats: {
        totalWords,
        excludedWords,
        estimatedDuration: transcript.duration - excludedDuration,
      },
      excludedRanges: ranges,
    };
  }, [transcript]);

  // Get word by ID helper
  const getWordById = useCallback((wordId: number): EditorWord | undefined => {
    if (!transcript) return undefined;
    for (const seg of transcript.segments) {
      for (const word of seg.words) {
        if (word.id === wordId) return word;
      }
    }
    return undefined;
  }, [transcript]);

  // Seek audio to a specific time
  const seekToTime = useCallback((time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  }, []);

  // Handle word click (toggle selection) - only called if not dragged
  const handleWordClick = useCallback((wordId: number) => {
    // This is now called from mouseup, not onClick
    setSelectedWordIds((prev) => {
      const next = new Set(prev);
      if (next.has(wordId)) {
        next.delete(wordId);
      } else {
        next.add(wordId);
      }
      return next;
    });

    // Seek audio to the clicked word
    const word = getWordById(wordId);
    if (word) {
      seekToTime(word.start_time);
    }
  }, [getWordById, seekToTime]);

  // Handle mouse down (start potential drag)
  const handleWordMouseDown = useCallback((wordId: number) => {
    setIsDragging(true);
    setDragStartId(wordId);
    setHasDragged(false);
    setSelectedWordIds(new Set([wordId]));
  }, []);

  // Handle mouse enter during drag
  const handleWordMouseEnter = useCallback(
    (wordId: number) => {
      if (!isDragging || dragStartId === null || !transcript) return;

      // If we entered a different word, we're dragging
      if (wordId !== dragStartId) {
        setHasDragged(true);
      }

      // Find all words between dragStartId and current wordId
      const allWords: EditorWord[] = [];
      transcript.segments.forEach((seg) => {
        seg.words.forEach((word) => {
          allWords.push(word);
        });
      });

      const startIndex = allWords.findIndex((w) => w.id === dragStartId);
      const endIndex = allWords.findIndex((w) => w.id === wordId);

      if (startIndex === -1 || endIndex === -1) return;

      const [from, to] = startIndex < endIndex
        ? [startIndex, endIndex]
        : [endIndex, startIndex];

      const selectedIds = new Set<number>();
      for (let i = from; i <= to; i++) {
        selectedIds.add(allWords[i].id);
      }

      setSelectedWordIds(selectedIds);

      // Seek to the start of the selection
      if (allWords[from]) {
        seekToTime(allWords[from].start_time);
      }
    },
    [isDragging, dragStartId, transcript, seekToTime]
  );

  // Handle mouse up (end drag or handle click)
  useEffect(() => {
    const handleMouseUp = () => {
      // If we didn't drag (just clicked), toggle the single word
      if (isDragging && !hasDragged && dragStartId !== null) {
        // Single click - word is already selected from mouseDown,
        // seek to it
        const word = getWordById(dragStartId);
        if (word) {
          seekToTime(word.start_time);
        }
      }
      setIsDragging(false);
      setDragStartId(null);
      setHasDragged(false);
    };

    window.addEventListener("mouseup", handleMouseUp);
    return () => window.removeEventListener("mouseup", handleMouseUp);
  }, [isDragging, hasDragged, dragStartId, getWordById, seekToTime]);

  // Exclude selected words
  const handleExcludeSelected = useCallback(() => {
    if (selectedWordIds.size === 0) return;
    updateMutation.mutate({
      wordIds: Array.from(selectedWordIds),
      included: false,
    });
  }, [selectedWordIds, updateMutation]);

  // Include selected words (restore)
  const handleIncludeSelected = useCallback(() => {
    if (selectedWordIds.size === 0) return;
    updateMutation.mutate({
      wordIds: Array.from(selectedWordIds),
      included: true,
    });
  }, [selectedWordIds, updateMutation]);

  // Handle waveform region selection - find and select words within the time range
  const handleWaveformRegionSelect = useCallback(
    (start: number, end: number) => {
      if (!transcript) return;

      setWaveformSelectedRegion({ start, end });

      // Find all words within this time range
      const wordsInRange: number[] = [];
      for (const segment of transcript.segments) {
        for (const word of segment.words) {
          // Word overlaps with selection if it starts before end and ends after start
          if (word.start_time < end && word.end_time > start) {
            wordsInRange.push(word.id);
          }
        }
      }

      if (wordsInRange.length > 0) {
        setSelectedWordIds(new Set(wordsInRange));
        // Seek to start of selection
        seekToTime(start);
      }
    },
    [transcript, seekToTime]
  );

  // Clear waveform selection
  const clearWaveformSelection = useCallback(() => {
    setWaveformSelectedRegion(null);
    setSelectedWordIds(new Set());
  }, []);

  // Audio controls
  const togglePlay = useCallback(() => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  }, [isPlaying]);

  const handleTimeUpdate = useCallback(() => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  }, []);

  const handleLoadedMetadata = useCallback(() => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    );
  }

  if (error || !transcript) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-600 mb-4">Kunde inte ladda transkriptet</p>
          <Link href={`/jobs/${jobId}`} className="text-primary-600 hover:underline">
            Tillbaka
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-950">
      {/* Header */}
      <div className="bg-dark-900/80 border-b border-white/10 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href={`/jobs/${jobId}`}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-400" />
              </Link>
              <div>
                <h1 className="text-lg font-bold text-white">
                  Redigera ljud
                </h1>
                <p className="text-sm text-gray-400">{transcript.file_name}</p>
              </div>
            </div>

            <Button
              variant="secondary"
              size="sm"
              onClick={() => resetMutation.mutate()}
              disabled={resetMutation.isPending || stats.excludedWords === 0}
            >
              <Undo2 className="w-4 h-4 mr-2" />
              Återställ alla
            </Button>
          </div>
        </div>
      </div>

      {/* Stats bar */}
      <div className="bg-dark-900/50 border-b border-white/10">
        <div className="max-w-6xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-6">
              <span className="text-gray-400">
                <span className="font-medium text-white">{stats.totalWords}</span> ord totalt
              </span>
              <span className="text-gray-400">
                <span className="font-medium text-red-400">{stats.excludedWords}</span> borttagna
              </span>
              <span className="text-gray-400">
                Original: <span className="font-medium text-gray-200">{formatTime(transcript.duration)}</span>
              </span>
              <span className="text-gray-400">
                Redigerad: <span className="font-medium text-green-400">{formatTime(stats.estimatedDuration)}</span>
              </span>
            </div>

            <div className="flex items-center gap-3">
              {selectedWordIds.size > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-gray-400">
                    {selectedWordIds.size} ord markerade
                  </span>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={handleIncludeSelected}
                    disabled={updateMutation.isPending}
                  >
                    <Check className="w-4 h-4 mr-1" />
                    Behåll
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleExcludeSelected}
                    disabled={updateMutation.isPending}
                    className="bg-red-500 hover:bg-red-600"
                  >
                    <Scissors className="w-4 h-4 mr-1" />
                    Ta bort
                  </Button>
                </div>
              )}

              {/* Download button - always visible in stats bar */}
              <a
                href={getEditedAudioUrl(jobId)}
                download
                className={clsx(
                  "inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors",
                  stats.excludedWords > 0
                    ? "bg-primary-500 text-white hover:bg-primary-600"
                    : "bg-dark-700 text-gray-500 cursor-not-allowed pointer-events-none"
                )}
              >
                <Download className="w-4 h-4" />
                Ladda ner redigerat ljud
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Audio player */}
      <div className="bg-dark-900/50 border-b border-white/10">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <audio
            ref={audioRef}
            src={getAudioUrl(jobId)}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onEnded={() => setIsPlaying(false)}
          />
          <div className="flex items-center gap-4">
            <button
              onClick={togglePlay}
              className="w-12 h-12 flex items-center justify-center bg-primary-500 hover:bg-primary-600 text-white rounded-full transition-colors"
            >
              {isPlaying ? (
                <Pause className="w-6 h-6" />
              ) : (
                <Play className="w-6 h-6 ml-1" />
              )}
            </button>

            <div className="flex-1">
              <input
                type="range"
                min={0}
                max={duration || 0}
                value={currentTime}
                onChange={(e) => {
                  const time = parseFloat(e.target.value);
                  if (audioRef.current) {
                    audioRef.current.currentTime = time;
                    setCurrentTime(time);
                  }
                }}
                className="w-full h-2 bg-dark-700 rounded-lg appearance-none cursor-pointer accent-primary-500"
              />
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            <Volume2 className="w-5 h-5 text-gray-400" />

            <button
              onClick={() => setShowWaveform(!showWaveform)}
              className={clsx(
                "p-2 rounded-lg transition-colors",
                showWaveform
                  ? "bg-primary-500/10 text-primary-400"
                  : "hover:bg-white/10 text-gray-400"
              )}
              title="Visa ljudvåg"
            >
              <Zap className="w-5 h-5" />
            </button>
          </div>

          {/* Waveform visualization */}
          {showWaveform && duration > 0 && (
            <div className="mt-4">
              <AudioWaveform
                audioUrl={getAudioUrl(jobId)}
                currentTime={currentTime}
                duration={duration}
                onSeek={seekToTime}
                onSilencesDetected={setDetectedSilences}
                onRegionSelect={handleWaveformRegionSelect}
                excludedRanges={excludedRanges}
                selectedRegion={waveformSelectedRegion}
              />

              {/* Region selection controls */}
              {waveformSelectedRegion && selectedWordIds.size > 0 && (
                <div className="mt-4 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-blue-300">
                        {selectedWordIds.size} ord markerade i region
                      </p>
                      <p className="text-sm text-blue-400 mt-1">
                        {formatTime(waveformSelectedRegion.start)} - {formatTime(waveformSelectedRegion.end)}
                        {" "}({formatTime(waveformSelectedRegion.end - waveformSelectedRegion.start)})
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={clearWaveformSelection}
                      >
                        Avmarkera
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleExcludeSelected}
                        disabled={updateMutation.isPending}
                        className="bg-red-500 hover:bg-red-600"
                      >
                        <Scissors className="w-4 h-4 mr-1" />
                        Ta bort {selectedWordIds.size} ord
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Silence removal controls */}
              {detectedSilences.length > 0 && !waveformSelectedRegion && (
                <div className="mt-4 p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-amber-300">
                        {detectedSilences.length} tysta partier hittade
                      </p>
                      <p className="text-sm text-amber-400 mt-1">
                        Total tystnad:{" "}
                        {formatTime(
                          detectedSilences.reduce((sum, s) => sum + s.duration, 0)
                        )}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          // Seek to first silence
                          if (detectedSilences[0]) {
                            seekToTime(detectedSilences[0].start);
                          }
                        }}
                      >
                        Gå till första
                      </Button>
                      <p className="text-xs text-amber-400 self-center max-w-[200px]">
                        Tips: Shift+dra i vågformen för att markera region
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Instructions */}
      <div className="max-w-6xl mx-auto px-4 py-4">
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 mb-6">
          <p className="text-sm text-blue-300">
            <strong>Tips:</strong> Klicka på ord för att markera dem, eller dra för att markera flera.
            Markerade ord kan tas bort med &quot;Ta bort&quot;-knappen. Borttagna ord visas med
            genomstrykning och kommer inte vara med i det redigerade ljudet.
          </p>
        </div>

        {/* Segments */}
        <div className="space-y-4">
          {transcript.segments.map((segment) => (
            <SegmentEditor
              key={segment.id}
              segment={segment}
              selectedWordIds={selectedWordIds}
              onWordClick={handleWordClick}
              onWordMouseDown={handleWordMouseDown}
              onWordMouseEnter={handleWordMouseEnter}
              isPlaying={isPlaying}
              currentTime={currentTime}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
