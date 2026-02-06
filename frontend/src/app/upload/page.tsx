"use client";

import { useState } from "react";
import { FileAudio, FolderOpen, Mic } from "lucide-react";
import { clsx } from "clsx";
import { UploadForm } from "@/components/upload/UploadForm";
import { BatchUploadForm } from "@/components/upload/BatchUploadForm";
import { RecordForm } from "@/components/upload/RecordForm";

type UploadMode = "single" | "batch" | "record";

export default function UploadPage() {
  const [mode, setMode] = useState<UploadMode>("single");

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-white mb-1">
          Ny transkription
        </h1>
        <p className="text-sm text-gray-400">
          Ladda upp ljudfiler sa transkriberar vi dem med KB Whisper
        </p>
      </div>

      {/* Mode tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setMode("single")}
          className={clsx(
            "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
            mode === "single"
              ? "bg-primary-500/10 text-primary-400 border border-primary-500/20"
              : "bg-dark-800 text-gray-400 border border-white/10 hover:bg-dark-700"
          )}
        >
          <FileAudio className="w-4 h-4" />
          En fil
        </button>
        <button
          onClick={() => setMode("batch")}
          className={clsx(
            "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
            mode === "batch"
              ? "bg-primary-500/10 text-primary-400 border border-primary-500/20"
              : "bg-dark-800 text-gray-400 border border-white/10 hover:bg-dark-700"
          )}
        >
          <FolderOpen className="w-4 h-4" />
          Flera filer
        </button>
        <button
          onClick={() => setMode("record")}
          className={clsx(
            "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
            mode === "record"
              ? "bg-primary-500/10 text-primary-400 border border-primary-500/20"
              : "bg-dark-800 text-gray-400 border border-white/10 hover:bg-dark-700"
          )}
        >
          <Mic className="w-4 h-4" />
          Spela in
        </button>
      </div>

      {/* Form */}
      <div className="bg-dark-800/50 rounded-xl border border-white/10 overflow-hidden">
        {mode === "single" && <UploadForm />}
        {mode === "batch" && <BatchUploadForm />}
        {mode === "record" && <RecordForm />}
      </div>
    </div>
  );
}
