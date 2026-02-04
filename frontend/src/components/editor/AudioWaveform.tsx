"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { clsx } from "clsx";
import { ZoomIn, ZoomOut, Maximize2 } from "lucide-react";

interface SilenceRegion {
  start: number;
  end: number;
  duration: number;
}

interface AudioWaveformProps {
  audioUrl: string;
  currentTime: number;
  duration: number;
  onSeek: (time: number) => void;
  onSilencesDetected?: (silences: SilenceRegion[]) => void;
  onRegionSelect?: (start: number, end: number) => void;
  excludedRanges?: Array<{ start: number; end: number }>;
  selectedRegion?: { start: number; end: number } | null;
  className?: string;
}

export function AudioWaveform({
  audioUrl,
  currentTime,
  duration,
  onSeek,
  onSilencesDetected,
  onRegionSelect,
  excludedRanges = [],
  selectedRegion,
  className,
}: AudioWaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [waveformData, setWaveformData] = useState<number[]>([]);
  const [silences, setSilences] = useState<SilenceRegion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Zoom and selection state
  const [zoom, setZoom] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<number | null>(null);
  const [dragEnd, setDragEnd] = useState<number | null>(null);

  // Analyze audio and extract waveform data
  useEffect(() => {
    const analyzeAudio = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(audioUrl);
        const arrayBuffer = await response.arrayBuffer();

        const audioContext = new AudioContext();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

        // Get audio data from the first channel
        const channelData = audioBuffer.getChannelData(0);
        const sampleRate = audioBuffer.sampleRate;

        // More samples for better resolution when zooming
        const targetSamples = 2000;
        const blockSize = Math.floor(channelData.length / targetSamples);

        const peaks: number[] = [];
        const silenceThreshold = 0.02;
        const minSilenceDuration = 0.5;
        const detectedSilences: SilenceRegion[] = [];

        let silenceStart: number | null = null;

        for (let i = 0; i < targetSamples; i++) {
          const start = i * blockSize;
          const end = Math.min(start + blockSize, channelData.length);

          let max = 0;
          for (let j = start; j < end; j++) {
            const amplitude = Math.abs(channelData[j]);
            if (amplitude > max) max = amplitude;
          }
          peaks.push(max);

          const timeStart = start / sampleRate;
          const timeEnd = end / sampleRate;

          if (max < silenceThreshold) {
            if (silenceStart === null) {
              silenceStart = timeStart;
            }
          } else {
            if (silenceStart !== null) {
              const silenceDuration = timeStart - silenceStart;
              if (silenceDuration >= minSilenceDuration) {
                detectedSilences.push({
                  start: silenceStart,
                  end: timeStart,
                  duration: silenceDuration,
                });
              }
              silenceStart = null;
            }
          }
        }

        if (silenceStart !== null) {
          const endTime = channelData.length / sampleRate;
          const silenceDuration = endTime - silenceStart;
          if (silenceDuration >= minSilenceDuration) {
            detectedSilences.push({
              start: silenceStart,
              end: endTime,
              duration: silenceDuration,
            });
          }
        }

        setWaveformData(peaks);
        setSilences(detectedSilences);
        onSilencesDetected?.(detectedSilences);

        await audioContext.close();
      } catch (err) {
        console.error("Error analyzing audio:", err);
        setError("Kunde inte analysera ljudfilen");
      } finally {
        setIsLoading(false);
      }
    };

    if (audioUrl) {
      analyzeAudio();
    }
  }, [audioUrl, onSilencesDetected]);

  // Draw waveform
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || waveformData.length === 0 || duration === 0) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const containerWidth = containerRef.current?.clientWidth || 800;
    const width = containerWidth * zoom;
    const height = 96; // Fixed height

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.scale(dpr, dpr);

    const centerY = height / 2;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Draw background
    ctx.fillStyle = "#f3f4f6";
    ctx.fillRect(0, 0, width, height);

    // Draw silence regions
    ctx.fillStyle = "#fef3c7";
    for (const silence of silences) {
      const x = (silence.start / duration) * width;
      const w = ((silence.end - silence.start) / duration) * width;
      ctx.fillRect(x, 0, w, height);
    }

    // Draw excluded regions
    ctx.fillStyle = "#fee2e2";
    for (const range of excludedRanges) {
      const x = (range.start / duration) * width;
      const w = ((range.end - range.start) / duration) * width;
      ctx.fillRect(x, 0, w, height);
    }

    // Draw current drag selection
    if (isDragging && dragStart !== null && dragEnd !== null) {
      const startX = (Math.min(dragStart, dragEnd) / duration) * width;
      const endX = (Math.max(dragStart, dragEnd) / duration) * width;
      ctx.fillStyle = "rgba(99, 102, 241, 0.3)"; // indigo with transparency
      ctx.fillRect(startX, 0, endX - startX, height);
    }

    // Draw selected region (external)
    if (selectedRegion) {
      const startX = (selectedRegion.start / duration) * width;
      const endX = (selectedRegion.end / duration) * width;
      ctx.fillStyle = "rgba(59, 130, 246, 0.3)"; // blue with transparency
      ctx.fillRect(startX, 0, endX - startX, height);
      // Border
      ctx.strokeStyle = "#3b82f6";
      ctx.lineWidth = 2;
      ctx.strokeRect(startX, 0, endX - startX, height);
    }

    // Draw waveform
    const barWidth = width / waveformData.length;

    for (let i = 0; i < waveformData.length; i++) {
      const x = i * barWidth;
      const amplitude = waveformData[i];
      const barHeight = amplitude * height * 0.8;

      const time = (i / waveformData.length) * duration;
      const isExcluded = excludedRanges.some(
        (r) => time >= r.start && time <= r.end
      );
      const isSilence = silences.some(
        (s) => time >= s.start && time <= s.end
      );

      if (isExcluded) {
        ctx.fillStyle = "#ef4444";
      } else if (isSilence) {
        ctx.fillStyle = "#f59e0b";
      } else {
        ctx.fillStyle = "#6366f1";
      }

      ctx.fillRect(x, centerY - barHeight / 2, Math.max(barWidth - 0.5, 1), barHeight);
    }

    // Draw playhead
    const playheadX = (currentTime / duration) * width;
    ctx.fillStyle = "#dc2626";
    ctx.fillRect(playheadX - 1, 0, 2, height);

    // Draw time markers when zoomed
    if (zoom > 1) {
      ctx.fillStyle = "#6b7280";
      ctx.font = "10px sans-serif";
      const interval = duration / (zoom * 10);
      for (let t = 0; t <= duration; t += interval) {
        const x = (t / duration) * width;
        ctx.fillText(formatTime(t), x + 2, height - 4);
        ctx.fillStyle = "#d1d5db";
        ctx.fillRect(x, 0, 1, height);
        ctx.fillStyle = "#6b7280";
      }
    }
  }, [waveformData, currentTime, duration, silences, excludedRanges, zoom, isDragging, dragStart, dragEnd, selectedRegion]);

  // Scroll to keep playhead visible when zoomed
  useEffect(() => {
    if (zoom > 1 && scrollContainerRef.current && containerRef.current) {
      const containerWidth = containerRef.current.clientWidth;
      const totalWidth = containerWidth * zoom;
      const playheadX = (currentTime / duration) * totalWidth;
      const scrollContainer = scrollContainerRef.current;
      const visibleStart = scrollContainer.scrollLeft;
      const visibleEnd = visibleStart + scrollContainer.clientWidth;

      if (playheadX < visibleStart + 50 || playheadX > visibleEnd - 50) {
        scrollContainer.scrollLeft = playheadX - scrollContainer.clientWidth / 2;
      }
    }
  }, [currentTime, duration, zoom]);

  // Get time from mouse position
  const getTimeFromEvent = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas || duration === 0) return 0;

      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      return (x / rect.width) * duration;
    },
    [duration]
  );

  // Handle mouse events for selection
  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (e.shiftKey) {
        // Shift+click for region selection
        const time = getTimeFromEvent(e);
        setIsDragging(true);
        setDragStart(time);
        setDragEnd(time);
      } else {
        // Normal click for seeking
        const time = getTimeFromEvent(e);
        onSeek(time);
      }
    },
    [getTimeFromEvent, onSeek]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (isDragging) {
        const time = getTimeFromEvent(e);
        setDragEnd(time);
      }
    },
    [isDragging, getTimeFromEvent]
  );

  const handleMouseUp = useCallback(() => {
    if (isDragging && dragStart !== null && dragEnd !== null) {
      const start = Math.min(dragStart, dragEnd);
      const end = Math.max(dragStart, dragEnd);
      if (end - start > 0.1) {
        // Minimum 0.1s selection
        onRegionSelect?.(start, end);
      }
    }
    setIsDragging(false);
    setDragStart(null);
    setDragEnd(null);
  }, [isDragging, dragStart, dragEnd, onRegionSelect]);

  const handleMouseLeave = useCallback(() => {
    if (isDragging) {
      handleMouseUp();
    }
  }, [isDragging, handleMouseUp]);

  // Zoom controls
  const handleZoomIn = useCallback(() => {
    setZoom((z) => Math.min(z * 1.5, 10));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom((z) => Math.max(z / 1.5, 1));
  }, []);

  const handleResetZoom = useCallback(() => {
    setZoom(1);
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollLeft = 0;
    }
  }, []);

  if (isLoading) {
    return (
      <div className={clsx("h-24 bg-gray-100 rounded-lg flex items-center justify-center", className)}>
        <span className="text-sm text-gray-500">Analyserar ljudvåg...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className={clsx("h-24 bg-red-50 rounded-lg flex items-center justify-center", className)}>
        <span className="text-sm text-red-600">{error}</span>
      </div>
    );
  }

  return (
    <div className={clsx("relative", className)} ref={containerRef}>
      {/* Zoom controls */}
      <div className="flex items-center gap-2 mb-2">
        <button
          onClick={handleZoomIn}
          className="p-1.5 rounded hover:bg-gray-100 text-gray-600"
          title="Zooma in"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={handleZoomOut}
          className="p-1.5 rounded hover:bg-gray-100 text-gray-600"
          title="Zooma ut"
          disabled={zoom <= 1}
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          onClick={handleResetZoom}
          className="p-1.5 rounded hover:bg-gray-100 text-gray-600"
          title="Återställ zoom"
          disabled={zoom === 1}
        >
          <Maximize2 className="w-4 h-4" />
        </button>
        <span className="text-xs text-gray-500 ml-2">
          {zoom > 1 ? `${Math.round(zoom * 100)}%` : "100%"}
        </span>
        <span className="text-xs text-gray-400 ml-auto">
          Tips: Shift+dra för att markera region
        </span>
      </div>

      {/* Scrollable waveform container */}
      <div
        ref={scrollContainerRef}
        className="overflow-x-auto rounded-lg"
        style={{ maxWidth: "100%" }}
      >
        <canvas
          ref={canvasRef}
          className="rounded-lg cursor-crosshair"
          style={{ height: "96px" }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
        />
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-indigo-500 rounded" />
          <span>Ljud</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-amber-500 rounded" />
          <span>Tystnad ({silences.length} st)</span>
        </div>
        {excludedRanges.length > 0 && (
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-red-500 rounded" />
            <span>Borttaget</span>
          </div>
        )}
        {selectedRegion && (
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-blue-500 rounded border-2 border-blue-600" />
            <span>Markerat ({formatTime(selectedRegion.end - selectedRegion.start)})</span>
          </div>
        )}
      </div>
    </div>
  );
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}
