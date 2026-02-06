/**
 * Audio player with transcript sync support.
 */

"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { clsx } from "clsx";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  SkipBack,
  SkipForward,
  Rewind,
  FastForward,
} from "lucide-react";

interface AudioPlayerProps {
  /** URL to the audio file */
  audioUrl: string;
  /** Total duration in seconds (used for initial display) */
  duration?: number;
  /** Optional class name */
  className?: string;
  /** Callback when current time changes (for transcript sync) */
  onTimeUpdate?: (time: number) => void;
  /** External time to seek to (controlled mode) */
  seekToTime?: number | null;
}

function formatTime(seconds: number): string {
  if (!isFinite(seconds) || isNaN(seconds)) return "0:00";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
  return `${minutes}:${secs.toString().padStart(2, "0")}`;
}

export function AudioPlayer({
  audioUrl,
  duration: initialDuration,
  className,
  onTimeUpdate,
  seekToTime,
}: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(initialDuration || 0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isDragging, setIsDragging] = useState(false);

  // Handle external seek requests
  useEffect(() => {
    if (seekToTime !== null && seekToTime !== undefined && audioRef.current) {
      audioRef.current.currentTime = seekToTime;
      setCurrentTime(seekToTime);
    }
  }, [seekToTime]);

  // Update duration when loaded
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
    };

    const handleTimeUpdate = () => {
      if (!isDragging) {
        setCurrentTime(audio.currentTime);
        onTimeUpdate?.(audio.currentTime);
      }
    };

    const handleEnded = () => {
      setIsPlaying(false);
    };

    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("ended", handleEnded);
    };
  }, [isDragging, onTimeUpdate]);

  // Play/pause toggle
  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
    setIsPlaying(!isPlaying);
  }, [isPlaying]);

  // Skip forward/backward
  const skip = useCallback((seconds: number) => {
    const audio = audioRef.current;
    if (!audio) return;

    const newTime = Math.max(0, Math.min(audio.duration, audio.currentTime + seconds));
    audio.currentTime = newTime;
    setCurrentTime(newTime);
  }, []);

  // Seek to position
  const seekToPosition = useCallback((clientX: number) => {
    const audio = audioRef.current;
    const progress = progressRef.current;
    if (!audio || !progress) return;

    const rect = progress.getBoundingClientRect();
    const percent = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const newTime = percent * audio.duration;
    audio.currentTime = newTime;
    setCurrentTime(newTime);
  }, []);

  // Handle progress bar click
  const handleProgressClick = (e: React.MouseEvent) => {
    seekToPosition(e.clientX);
  };

  // Handle progress bar drag
  const handleProgressMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    seekToPosition(e.clientX);

    const handleMouseMove = (e: MouseEvent) => {
      seekToPosition(e.clientX);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  // Volume control
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
    }
    if (newVolume > 0 && isMuted) {
      setIsMuted(false);
      if (audioRef.current) {
        audioRef.current.muted = false;
      }
    }
  };

  // Toggle mute
  const toggleMute = () => {
    if (audioRef.current) {
      audioRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  // Playback rate
  const cyclePlaybackRate = () => {
    const rates = [0.5, 0.75, 1, 1.25, 1.5, 2];
    const currentIndex = rates.indexOf(playbackRate);
    const nextIndex = (currentIndex + 1) % rates.length;
    const newRate = rates[nextIndex];
    setPlaybackRate(newRate);
    if (audioRef.current) {
      audioRef.current.playbackRate = newRate;
    }
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className={clsx("bg-dark-800/50 rounded-xl border border-white/10 p-4", className)}>
      <audio ref={audioRef} src={audioUrl} preload="metadata" />

      {/* Progress bar */}
      <div
        ref={progressRef}
        className="relative h-2 bg-dark-700 rounded-full cursor-pointer mb-4 group"
        onClick={handleProgressClick}
        onMouseDown={handleProgressMouseDown}
      >
        {/* Buffered indicator could go here */}
        <div
          className="absolute h-full bg-gradient-to-r from-primary-500 to-primary-600 rounded-full transition-all"
          style={{ width: `${progress}%` }}
        />
        {/* Thumb */}
        <div
          className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white border-2 border-primary-500 rounded-full shadow opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ left: `calc(${progress}% - 8px)` }}
        />
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between">
        {/* Left: Time display */}
        <div className="text-sm font-mono text-gray-400 min-w-[100px]">
          {formatTime(currentTime)} / {formatTime(duration)}
        </div>

        {/* Center: Main controls */}
        <div className="flex items-center gap-2">
          {/* Skip back 10s */}
          <button
            onClick={() => skip(-10)}
            className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            title="Hoppa 10s bakåt"
          >
            <Rewind className="w-5 h-5" />
          </button>

          {/* Play/Pause */}
          <button
            onClick={togglePlay}
            className="p-3 bg-gradient-to-br from-primary-500 to-primary-600 text-white rounded-full hover:from-primary-600 hover:to-primary-700 shadow-md transition-all"
            title={isPlaying ? "Pausa" : "Spela"}
          >
            {isPlaying ? (
              <Pause className="w-6 h-6" />
            ) : (
              <Play className="w-6 h-6 ml-0.5" />
            )}
          </button>

          {/* Skip forward 10s */}
          <button
            onClick={() => skip(10)}
            className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            title="Hoppa 10s framåt"
          >
            <FastForward className="w-5 h-5" />
          </button>
        </div>

        {/* Right: Volume & Speed */}
        <div className="flex items-center gap-3 min-w-[140px] justify-end">
          {/* Playback rate */}
          <button
            onClick={cyclePlaybackRate}
            className={clsx(
              "px-2 py-1 text-xs font-medium rounded border transition-colors",
              playbackRate !== 1
                ? "bg-primary-500/20 text-primary-400 border-primary-500/20"
                : "text-gray-400 border-white/20 hover:bg-white/5"
            )}
            title="Uppspelningshastighet"
          >
            {playbackRate}x
          </button>

          {/* Volume */}
          <div className="flex items-center gap-1">
            <button
              onClick={toggleMute}
              className="p-1 text-gray-400 hover:text-white transition-colors"
              title={isMuted ? "Slå på ljud" : "Stäng av ljud"}
            >
              {isMuted || volume === 0 ? (
                <VolumeX className="w-5 h-5" />
              ) : (
                <Volume2 className="w-5 h-5" />
              )}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={isMuted ? 0 : volume}
              onChange={handleVolumeChange}
              className="w-20 h-1 bg-dark-700 rounded-lg appearance-none cursor-pointer accent-primary-500"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
