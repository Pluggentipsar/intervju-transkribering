"use client";

import { useState } from "react";
import { clsx } from "clsx";
import {
  Mic,
  Shield,
  Users,
  Lock,
  ArrowRight,
  Upload,
  Cpu,
  FileText,
  Sparkles,
} from "lucide-react";
import { AudioWaveAnimation } from "@/components/hero/AudioWaveAnimation";

const STORAGE_KEY = "tysttext_onboarded";

export function useOnboarding() {
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === "undefined") return true;
    return localStorage.getItem(STORAGE_KEY) === "true";
  });

  const complete = () => {
    localStorage.setItem(STORAGE_KEY, "true");
    setDismissed(true);
  };

  return { showOnboarding: !dismissed, complete };
}

interface WelcomeScreenProps {
  onComplete: () => void;
}

const steps = [
  {
    icon: Upload,
    title: "Ladda upp",
    desc: "Dra och slapp en ljudfil — MP3, WAV, M4A",
  },
  {
    icon: Cpu,
    title: "AI transkriberar",
    desc: "KB Whisper, optimerad for svenska",
  },
  {
    icon: Users,
    title: "Talare identifieras",
    desc: "Automatisk uppdelning per talare",
  },
  {
    icon: Shield,
    title: "Avidentifiera",
    desc: "Namn, platser och personnummer tas bort",
  },
  {
    icon: FileText,
    title: "Exportera",
    desc: "Text, markdown, JSON eller SRT",
  },
];

export function WelcomeScreen({ onComplete }: WelcomeScreenProps) {
  const [step, setStep] = useState(0);

  return (
    <div className="fixed inset-0 z-[100] bg-gradient-to-br from-dark-950 via-dark-900 to-dark-800 flex items-center justify-center p-4">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-primary-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-2xl w-full">
        {/* Step 0: Welcome */}
        {step === 0 && (
          <div className="text-center animate-fade-in">
            {/* Logo */}
            <div className="inline-flex items-center gap-3 mb-8">
              <div className="w-12 h-12 bg-gradient-to-br from-primary-400 to-primary-600 rounded-xl flex items-center justify-center shadow-lg shadow-primary-500/25">
                <Mic className="w-6 h-6 text-white" />
              </div>
              <span className="text-3xl font-bold text-white">TystText</span>
            </div>

            {/* Wave animation */}
            <div className="my-8">
              <AudioWaveAnimation />
            </div>

            {/* Description */}
            <p className="text-lg text-gray-300 max-w-md mx-auto mb-4">
              Transkribera intervjuer, identifiera talare och avidentifiera kanslig
              information — allt lokalt pa din dator.
            </p>

            {/* Privacy badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-500/10 border border-green-500/20 rounded-full text-green-300 text-sm mb-10">
              <Lock className="w-4 h-4" />
              Ingen data lamnar din dator
            </div>

            <div>
              <button
                onClick={() => setStep(1)}
                className="inline-flex items-center gap-2 px-8 py-3 bg-primary-500 hover:bg-primary-600 text-white font-medium rounded-xl shadow-lg shadow-primary-500/25 transition-all hover:shadow-primary-500/40"
              >
                Visa mig hur det funkar
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* Step 1: How it works */}
        {step === 1 && (
          <div className="animate-fade-in">
            <div className="text-center mb-10">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary-500/10 border border-primary-500/20 rounded-full text-primary-300 text-xs font-medium mb-4">
                <Sparkles className="w-3 h-3" />
                Sa har funkar det
              </div>
              <h2 className="text-2xl font-bold text-white">
                Fran ljudfil till fardig text
              </h2>
            </div>

            {/* Steps */}
            <div className="space-y-3 mb-10">
              {steps.map((s, i) => (
                <div
                  key={i}
                  className="flex items-center gap-4 p-4 bg-white/5 border border-white/10 rounded-xl animate-slide-up"
                  style={{ animationDelay: `${i * 0.1}s` }}
                >
                  <div className="w-10 h-10 bg-gradient-to-br from-primary-400 to-primary-600 rounded-lg flex items-center justify-center flex-shrink-0">
                    <s.icon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="font-medium text-white text-sm">{s.title}</p>
                    <p className="text-gray-400 text-xs">{s.desc}</p>
                  </div>
                  {i < steps.length - 1 && (
                    <ArrowRight className="w-4 h-4 text-gray-600 ml-auto" />
                  )}
                </div>
              ))}
            </div>

            <div className="flex justify-center gap-3">
              <button
                onClick={() => setStep(0)}
                className="px-6 py-3 text-gray-400 hover:text-white font-medium rounded-xl transition-colors"
              >
                Tillbaka
              </button>
              <button
                onClick={onComplete}
                className="inline-flex items-center gap-2 px-8 py-3 bg-primary-500 hover:bg-primary-600 text-white font-medium rounded-xl shadow-lg shadow-primary-500/25 transition-all hover:shadow-primary-500/40"
              >
                Kom igang
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>

            {/* Step indicator */}
            <div className="flex justify-center gap-2 mt-6">
              <div className="w-2 h-2 rounded-full bg-gray-600" />
              <div className="w-6 h-2 rounded-full bg-primary-500" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
