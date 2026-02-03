"use client";

import Link from "next/link";
import { ArrowLeft, Mic, Upload, Settings, Zap } from "lucide-react";
import { UploadForm } from "@/components/upload/UploadForm";

export default function UploadPage() {
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
                Ladda upp en ljudfil så transkriberar vi den med KB Whisper
              </p>
            </div>
          </div>

          {/* Feature pills */}
          <div className="flex flex-wrap gap-3 mt-8">
            <div className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-full text-sm text-gray-300">
              <Upload className="w-4 h-4 text-primary-400" />
              MP3, WAV, M4A
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-full text-sm text-gray-300">
              <Settings className="w-4 h-4 text-primary-400" />
              Anpassningsbara inställningar
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-full text-sm text-gray-300">
              <Zap className="w-4 h-4 text-primary-400" />
              100% lokalt
            </div>
          </div>
        </div>
      </div>

      {/* Form section */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 -mt-8 pb-16">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          <UploadForm />
        </div>
      </div>
    </div>
  );
}
