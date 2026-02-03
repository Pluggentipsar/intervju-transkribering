"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Mic, FileAudio, FolderOpen } from "lucide-react";
import { clsx } from "clsx";
import { UploadForm } from "@/components/upload/UploadForm";
import { BatchUploadForm } from "@/components/upload/BatchUploadForm";
import { RecordForm } from "@/components/upload/RecordForm";

type UploadMode = "single" | "batch" | "record";

export default function UploadPage() {
  const [mode, setMode] = useState<UploadMode>("single");

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero header */}
      <div className="bg-gradient-to-br from-dark-950 via-dark-900 to-dark-800 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-24 pb-16">
          {/* Back link */}
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-8 transition-colors group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Tillbaka till start
          </Link>

          {/* Header content */}
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 bg-gradient-to-br from-primary-400 to-primary-600 rounded-2xl flex items-center justify-center shadow-lg shadow-primary-500/25">
              <Mic className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold mb-2">
                Ny transkription
              </h1>
              <p className="text-gray-400">
                Ladda upp ljudfiler så transkriberar vi dem med KB Whisper
              </p>
            </div>
          </div>

          {/* Mode tabs */}
          <div className="flex gap-2 mt-8">
            <button
              onClick={() => setMode("single")}
              className={clsx(
                "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all",
                mode === "single"
                  ? "bg-white text-gray-900 shadow-lg"
                  : "bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10"
              )}
            >
              <FileAudio className="w-4 h-4" />
              En fil
            </button>
            <button
              onClick={() => setMode("batch")}
              className={clsx(
                "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all",
                mode === "batch"
                  ? "bg-white text-gray-900 shadow-lg"
                  : "bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10"
              )}
            >
              <FolderOpen className="w-4 h-4" />
              Flera filer
            </button>
            <button
              onClick={() => setMode("record")}
              className={clsx(
                "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all",
                mode === "record"
                  ? "bg-white text-gray-900 shadow-lg"
                  : "bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10"
              )}
            >
              <Mic className="w-4 h-4" />
              Spela in
            </button>
          </div>
        </div>
      </div>

      {/* Form section */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 -mt-8 pb-16">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          {mode === "single" && <UploadForm />}
          {mode === "batch" && <BatchUploadForm />}
          {mode === "record" && <RecordForm />}
        </div>
      </div>
    </div>
  );
}
