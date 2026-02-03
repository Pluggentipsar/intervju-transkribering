"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { clsx } from "clsx";
import {
  Mic,
  Square,
  Play,
  Pause,
  Trash2,
  Check,
  AlertCircle,
} from "lucide-react";

interface AudioRecorderProps {
  onRecordingComplete: (file: File) => void;
  disabled?: boolean;
}

type RecordingState = "idle" | "recording" | "paused" | "stopped";

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);

  if (h > 0) {
    return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function AudioRecorder({ onRecordingComplete, disabled }: AudioRecorderProps) {
  const [recordingState, setRecordingState] = useState<RecordingState>("idle");
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackTime, setPlaybackTime] = useState(0);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, [audioUrl]);

  // Check microphone permission on mount
  useEffect(() => {
    const checkPermission = async () => {
      try {
        const result = await navigator.permissions.query({
          name: "microphone" as PermissionName,
        });
        setHasPermission(result.state === "granted");
        result.onchange = () => {
          setHasPermission(result.state === "granted");
        };
      } catch {
        // Permission API not supported, will check on recording start
        setHasPermission(null);
      }
    };
    checkPermission();
  }, []);

  const startRecording = useCallback(async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
        },
      });

      streamRef.current = stream;
      setHasPermission(true);

      // Use webm format which is well supported
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        setAudioBlob(audioBlob);
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);

        // Stop all tracks
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start(1000); // Collect data every second
      setRecordingState("recording");
      setRecordingTime(0);

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      if (err instanceof DOMException && err.name === "NotAllowedError") {
        setError("Mikrofontillstånd nekades. Tillåt mikrofonen i webbläsarinställningarna.");
        setHasPermission(false);
      } else if (err instanceof DOMException && err.name === "NotFoundError") {
        setError("Ingen mikrofon hittades. Anslut en mikrofon och försök igen.");
      } else {
        setError("Kunde inte starta inspelning. Kontrollera mikrofonen.");
      }
      console.error("Recording error:", err);
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && recordingState === "recording") {
      mediaRecorderRef.current.stop();
      setRecordingState("stopped");
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  }, [recordingState]);

  const discardRecording = useCallback(() => {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    setAudioBlob(null);
    setAudioUrl(null);
    setRecordingState("idle");
    setRecordingTime(0);
    setPlaybackTime(0);
    setIsPlaying(false);
  }, [audioUrl]);

  const useRecording = useCallback(() => {
    if (audioBlob) {
      // Create a File object from the Blob
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
      const fileName = `inspelning-${timestamp}.webm`;
      const file = new File([audioBlob], fileName, { type: audioBlob.type });
      onRecordingComplete(file);
    }
  }, [audioBlob, onRecordingComplete]);

  const togglePlayback = useCallback(() => {
    if (!audioRef.current || !audioUrl) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  }, [isPlaying, audioUrl]);

  const handlePlaybackEnded = useCallback(() => {
    setIsPlaying(false);
    setPlaybackTime(0);
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
    }
  }, []);

  // Idle state - show record button
  if (recordingState === "idle") {
    return (
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700 text-left">{error}</p>
          </div>
        )}

        <button
          onClick={startRecording}
          disabled={disabled}
          className={clsx(
            "w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 transition-all",
            disabled
              ? "bg-gray-200 cursor-not-allowed"
              : "bg-red-500 hover:bg-red-600 hover:scale-105 shadow-lg shadow-red-500/30"
          )}
        >
          <Mic className="w-10 h-10 text-white" />
        </button>

        <p className="text-gray-600 font-medium mb-1">Klicka för att börja spela in</p>
        <p className="text-sm text-gray-500">
          Tillåt mikrofontillstånd om du blir tillfrågad
        </p>

        {hasPermission === false && (
          <p className="text-sm text-amber-600 mt-2">
            Mikrofontillstånd krävs för att spela in
          </p>
        )}
      </div>
    );
  }

  // Recording state
  if (recordingState === "recording") {
    return (
      <div className="border-2 border-red-300 bg-red-50 rounded-lg p-6 text-center">
        <div className="flex items-center justify-center gap-2 mb-4">
          <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
          <span className="text-red-600 font-medium">Spelar in...</span>
        </div>

        <div className="text-4xl font-mono font-bold text-gray-900 mb-6">
          {formatTime(recordingTime)}
        </div>

        {/* Audio visualizer placeholder - just a pulsing bar */}
        <div className="flex items-center justify-center gap-1 mb-6 h-12">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="w-1.5 bg-red-400 rounded-full animate-pulse"
              style={{
                height: `${20 + Math.random() * 30}px`,
                animationDelay: `${i * 50}ms`,
              }}
            />
          ))}
        </div>

        <button
          onClick={stopRecording}
          className="w-16 h-16 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center mx-auto transition-colors shadow-lg"
        >
          <Square className="w-8 h-8 text-white" />
        </button>
        <p className="text-sm text-gray-500 mt-3">Klicka för att avsluta inspelningen</p>
      </div>
    );
  }

  // Stopped state - show preview and options
  return (
    <div className="border-2 border-primary-200 bg-primary-50 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary-100 rounded-lg">
            <Mic className="w-6 h-6 text-primary-600" />
          </div>
          <div>
            <p className="font-medium text-gray-900">Inspelning klar</p>
            <p className="text-sm text-gray-500">
              Längd: {formatTime(recordingTime)}
            </p>
          </div>
        </div>
      </div>

      {/* Playback controls */}
      {audioUrl && (
        <div className="bg-white rounded-lg p-3 border border-primary-200 mb-4">
          <audio
            ref={audioRef}
            src={audioUrl}
            onTimeUpdate={() => {
              if (audioRef.current) {
                setPlaybackTime(audioRef.current.currentTime);
              }
            }}
            onEnded={handlePlaybackEnded}
            preload="metadata"
          />
          <div className="flex items-center gap-3">
            <button
              onClick={togglePlayback}
              className="w-10 h-10 flex items-center justify-center bg-primary-500 hover:bg-primary-600 text-white rounded-full transition-colors"
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
                max={recordingTime}
                value={playbackTime}
                onChange={(e) => {
                  const time = parseFloat(e.target.value);
                  if (audioRef.current) {
                    audioRef.current.currentTime = time;
                    setPlaybackTime(time);
                  }
                }}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary-500"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>{formatTime(playbackTime)}</span>
                <span>{formatTime(recordingTime)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-3">
        <button
          onClick={discardRecording}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-gray-700"
        >
          <Trash2 className="w-5 h-5" />
          Kassera
        </button>
        <button
          onClick={useRecording}
          disabled={disabled}
          className={clsx(
            "flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg transition-colors font-medium",
            disabled
              ? "bg-gray-200 text-gray-500 cursor-not-allowed"
              : "bg-primary-500 hover:bg-primary-600 text-white"
          )}
        >
          <Check className="w-5 h-5" />
          Använd inspelning
        </button>
      </div>
    </div>
  );
}
