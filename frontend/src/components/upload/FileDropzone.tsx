/**
 * File dropzone component for drag-and-drop upload.
 */

"use client";

import { useCallback, useState, useRef, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import { clsx } from "clsx";
import { Upload, File, X, Play, Pause, Volume2 } from "lucide-react";

const ACCEPTED_TYPES = {
  "audio/mpeg": [".mp3"],
  "audio/wav": [".wav"],
  "audio/x-m4a": [".m4a"],
  "audio/mp4": [".m4a"],
  "audio/ogg": [".ogg"],
  "audio/flac": [".flac"],
  "audio/webm": [".webm"],
};

interface FileDropzoneProps {
  onFileSelect: (file: File) => void;
  selectedFile: File | null;
  onClear: () => void;
  disabled?: boolean;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export function FileDropzone({
  onFileSelect,
  selectedFile,
  onClear,
  disabled = false,
}: FileDropzoneProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  // Create object URL for audio preview
  useEffect(() => {
    if (selectedFile) {
      const url = URL.createObjectURL(selectedFile);
      setAudioUrl(url);
      setCurrentTime(0);
      setIsPlaying(false);
      return () => URL.revokeObjectURL(url);
    } else {
      setAudioUrl(null);
      setDuration(0);
    }
  }, [selectedFile]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
    }
  };

  const formatTime = (seconds: number): string => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        onFileSelect(acceptedFiles[0]);
      }
    },
    [onFileSelect]
  );

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: ACCEPTED_TYPES,
    maxFiles: 1,
    disabled,
  });

  if (selectedFile) {
    return (
      <div className="border-2 border-primary-500/20 bg-primary-500/10 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary-500/20 rounded-lg">
              <File className="w-6 h-6 text-primary-400" />
            </div>
            <div>
              <p className="font-medium text-white">{selectedFile.name}</p>
              <p className="text-sm text-gray-400">
                {formatFileSize(selectedFile.size)}
                {duration > 0 && ` · ${formatTime(duration)}`}
              </p>
            </div>
          </div>
          {!disabled && (
            <button
              onClick={onClear}
              className="p-1 hover:bg-primary-500/20 rounded transition-colors"
              aria-label="Ta bort fil"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          )}
        </div>

        {/* Audio preview player */}
        {audioUrl && (
          <div className="bg-dark-800 rounded-lg p-3 border border-primary-500/20">
            <audio
              ref={audioRef}
              src={audioUrl}
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
              onEnded={handleEnded}
              preload="metadata"
            />
            <div className="flex items-center gap-3">
              <button
                onClick={togglePlay}
                className="w-10 h-10 flex items-center justify-center bg-primary-500 hover:bg-primary-600 text-white rounded-full transition-colors"
                aria-label={isPlaying ? "Pausa" : "Spela"}
              >
                {isPlaying ? (
                  <Pause className="w-5 h-5" />
                ) : (
                  <Play className="w-5 h-5 ml-0.5" />
                )}
              </button>

              <div className="flex-1">
                <input
                  type="range"
                  min={0}
                  max={duration || 0}
                  value={currentTime}
                  onChange={handleSeek}
                  className="w-full h-2 bg-dark-700 rounded-lg appearance-none cursor-pointer accent-primary-500"
                />
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>

              <Volume2 className="w-4 h-4 text-gray-500" />
            </div>
            <p className="text-xs text-gray-400 mt-2 text-center">
              Förhandslyssna för att bekräfta att det är rätt fil
            </p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      {...getRootProps()}
      className={clsx(
        "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
        {
          "border-white/20 hover:border-primary-400 hover:bg-white/5": !isDragActive && !disabled,
          "border-primary-500 bg-primary-500/10": isDragActive && !isDragReject,
          "border-red-500 bg-red-500/10": isDragReject,
          "border-white/10 bg-dark-700 cursor-not-allowed": disabled,
        }
      )}
    >
      <input {...getInputProps()} />
      <Upload
        className={clsx("w-12 h-12 mx-auto mb-4", {
          "text-gray-500": !isDragActive,
          "text-primary-500": isDragActive && !isDragReject,
          "text-red-500": isDragReject,
        })}
      />
      {isDragReject ? (
        <p className="text-red-400 font-medium">
          Filformatet stöds inte
        </p>
      ) : isDragActive ? (
        <p className="text-primary-400 font-medium">
          Släpp filen här...
        </p>
      ) : (
        <>
          <p className="text-gray-400 mb-1">
            <span className="font-medium text-primary-400">Klicka för att välja</span>
            {" "}eller dra och släpp
          </p>
          <p className="text-sm text-gray-400">
            MP3, WAV, M4A, OGG, FLAC, WebM (max 2 GB)
          </p>
        </>
      )}
    </div>
  );
}
