"use client";

import Link from "next/link";
import { Mic, ArrowRight, Shield, Users, Lock, Download } from "lucide-react";
import { AudioWaveAnimation } from "./AudioWaveAnimation";
import { Button } from "@/components/ui/Button";

export function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-dark-950 via-dark-900 to-dark-800 text-white min-h-[90vh] flex items-center">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-primary-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary-500/5 rounded-full blur-3xl" />

        {/* Grid pattern overlay */}
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                              linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
            backgroundSize: "60px 60px",
          }}
        />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-20 lg:py-32 w-full">
        <div className="text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary-500/10 border border-primary-500/20 rounded-full text-primary-300 text-sm mb-8 animate-fade-in">
            <Mic className="w-4 h-4" />
            <span>Sveriges bästa AI för svenska</span>
          </div>

          {/* Main heading */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight tracking-tight animate-slide-up">
            Transkribera.
            <br />
            <span className="text-gradient bg-gradient-to-r from-amber-300 via-amber-400 to-amber-500 bg-clip-text text-transparent">
              Avidentifiera.
            </span>
            <br />
            <span className="text-gradient bg-gradient-to-r from-primary-300 via-primary-400 to-primary-500 bg-clip-text text-transparent">
              Redigera.
            </span>
          </h1>

          {/* Wave animation */}
          <div className="my-10 lg:my-14">
            <AudioWaveAnimation />
          </div>

          {/* Description */}
          <p className="text-lg md:text-xl text-gray-300 max-w-2xl mx-auto mb-10 animate-fade-in" style={{ animationDelay: "0.3s" }}>
            TystText omvandlar dina ljudfiler till text med KB Whisper,
            identifierar talare automatiskt och anonymiserar känslig information
            — allt lokalt på din egen dator.
          </p>

          {/* Feature pills */}
          <div className="flex flex-wrap justify-center gap-3 mb-10 animate-fade-in" style={{ animationDelay: "0.5s" }}>
            <div className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-full text-sm text-gray-300">
              <Mic className="w-4 h-4 text-primary-400" />
              KB Whisper
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-full text-sm text-gray-300">
              <Users className="w-4 h-4 text-primary-400" />
              Talaridentifiering
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-full text-sm text-gray-300">
              <Shield className="w-4 h-4 text-amber-400" />
              KB-BERT Avidentifiering
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-full text-sm text-gray-300">
              <Lock className="w-4 h-4 text-green-400" />
              100% lokalt
            </div>
          </div>

          {/* CTA buttons — marketing mode: download, local mode: upload */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in" style={{ animationDelay: "0.7s" }}>
            <a href="#download">
              <Button
                size="lg"
                className="w-full sm:w-auto bg-primary-500 hover:bg-primary-600 text-white shadow-lg shadow-primary-500/25 hover:shadow-primary-500/40 transition-all"
              >
                <Download className="w-5 h-5 mr-2" />
                Ladda ner gratis
              </Button>
            </a>
            <a href="#guide">
              <Button
                size="lg"
                className="w-full sm:w-auto bg-white/10 hover:bg-white/20 text-white border border-white/20 transition-all"
              >
                Så funkar det
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </a>
          </div>

          {/* Trust line */}
          <div className="mt-8 animate-fade-in" style={{ animationDelay: "0.9s" }}>
            <p className="text-gray-500 text-sm flex items-center justify-center gap-2">
              <Lock className="w-3.5 h-3.5 text-green-400" />
              Gratis, öppet och 100% lokalt — ingen data lämnar din dator
            </p>
          </div>
        </div>
      </div>

      {/* Bottom gradient fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-white to-transparent" />
    </section>
  );
}
