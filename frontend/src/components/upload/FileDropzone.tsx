/**
 * File dropzone component for drag-and-drop upload.
 */

"use client";

import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { clsx } from "clsx";
import { Upload, File, X } from "lucide-react";

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
      <div className="border-2 border-primary-200 bg-primary-50 rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary-100 rounded-lg">
              <File className="w-6 h-6 text-primary-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900">{selectedFile.name}</p>
              <p className="text-sm text-gray-500">
                {formatFileSize(selectedFile.size)}
              </p>
            </div>
          </div>
          {!disabled && (
            <button
              onClick={onClear}
              className="p-1 hover:bg-primary-100 rounded transition-colors"
              aria-label="Ta bort fil"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      {...getRootProps()}
      className={clsx(
        "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
        {
          "border-gray-300 hover:border-primary-400 hover:bg-gray-50": !isDragActive && !disabled,
          "border-primary-500 bg-primary-50": isDragActive && !isDragReject,
          "border-red-500 bg-red-50": isDragReject,
          "border-gray-200 bg-gray-100 cursor-not-allowed": disabled,
        }
      )}
    >
      <input {...getInputProps()} />
      <Upload
        className={clsx("w-12 h-12 mx-auto mb-4", {
          "text-gray-400": !isDragActive,
          "text-primary-500": isDragActive && !isDragReject,
          "text-red-500": isDragReject,
        })}
      />
      {isDragReject ? (
        <p className="text-red-600 font-medium">
          Filformatet stöds inte
        </p>
      ) : isDragActive ? (
        <p className="text-primary-600 font-medium">
          Släpp filen här...
        </p>
      ) : (
        <>
          <p className="text-gray-600 mb-1">
            <span className="font-medium text-primary-600">Klicka för att välja</span>
            {" "}eller dra och släpp
          </p>
          <p className="text-sm text-gray-500">
            MP3, WAV, M4A, OGG, FLAC, WebM (max 2 GB)
          </p>
        </>
      )}
    </div>
  );
}
