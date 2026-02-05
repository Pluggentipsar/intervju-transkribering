"use client";

import { useState, useEffect } from "react";
import {
  Download,
  FolderOpen,
  Play,
  CheckCircle,
  Loader2,
  AlertCircle,
  ExternalLink,
  Monitor,
  Cpu,
  HardDrive,
  RefreshCw,
  X,
  Mic,
  Lock,
  ArrowRight,
} from "lucide-react";

interface SetupWizardProps {
  isConnected: boolean;
  isChecking: boolean;
  onRetryConnection: () => void;
  onSetupComplete: () => void;
  onDismiss?: () => void;
}

const DOWNLOAD_URL = "https://github.com/Pluggentipsar/intervju-transkribering/releases/latest/download/TystText-Backend.zip";

export function SetupWizard({
  isConnected,
  isChecking,
  onRetryConnection,
  onSetupComplete,
  onDismiss,
}: SetupWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [showSystemReqs, setShowSystemReqs] = useState(false);

  // Auto-advance when connected
  useEffect(() => {
    if (isConnected && currentStep < 4) {
      setCurrentStep(4);
    }
  }, [isConnected, currentStep]);

  const steps = [
    {
      number: 1,
      title: "Ladda ner",
      icon: Download,
      color: "from-primary-400 to-primary-500",
    },
    {
      number: 2,
      title: "Packa upp",
      icon: FolderOpen,
      color: "from-primary-500 to-primary-600",
    },
    {
      number: 3,
      title: "Starta",
      icon: Play,
      color: "from-primary-600 to-primary-700",
    },
    {
      number: 4,
      title: "Klart!",
      icon: CheckCircle,
      color: "from-green-500 to-green-600",
    },
  ];

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden animate-fade-in">
        {/* Header - Dark gradient like HeroSection */}
        <div className="relative overflow-hidden bg-gradient-to-br from-dark-950 via-dark-900 to-dark-800 text-white p-8">
          {/* Background decorative elements */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -top-20 -right-20 w-48 h-48 bg-primary-500/20 rounded-full blur-3xl" />
            <div className="absolute -bottom-20 -left-20 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl" />
          </div>

          <div className="relative">
            <div className="flex items-start justify-between">
              <div>
                {/* Badge */}
                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary-500/20 border border-primary-500/30 rounded-full text-primary-300 text-sm mb-4">
                  <Mic className="w-4 h-4" />
                  <span>Kom igang</span>
                </div>

                <h1 className="text-2xl sm:text-3xl font-bold mb-2">
                  Valkommen till{" "}
                  <span className="text-gradient bg-gradient-to-r from-primary-300 to-primary-400 bg-clip-text text-transparent">
                    TystText
                  </span>
                </h1>
                <p className="text-gray-400">
                  Transkribering av intervjuer - lokalt och sakert
                </p>
              </div>
              {onDismiss && (
                <button
                  onClick={onDismiss}
                  className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

            {/* Feature pills */}
            <div className="flex flex-wrap gap-2 mt-4">
              <div className="flex items-center gap-1.5 px-3 py-1 bg-white/5 border border-white/10 rounded-full text-xs text-gray-300">
                <Lock className="w-3 h-3 text-green-400" />
                100% lokalt
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1 bg-white/5 border border-white/10 rounded-full text-xs text-gray-300">
                <Mic className="w-3 h-3 text-primary-400" />
                KB Whisper
              </div>
            </div>
          </div>
        </div>

        {/* Progress Steps */}
        <div className="px-8 py-5 border-b bg-gray-50/50">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <div key={step.number} className="flex items-center flex-1 last:flex-none">
                <div className="flex flex-col items-center">
                  <div
                    className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-300 shadow-lg ${
                      step.number < currentStep
                        ? "bg-gradient-to-br from-green-500 to-green-600 text-white"
                        : step.number === currentStep
                        ? `bg-gradient-to-br ${step.color} text-white scale-110`
                        : "bg-gray-100 text-gray-400"
                    }`}
                  >
                    {step.number < currentStep ? (
                      <CheckCircle className="w-5 h-5" />
                    ) : (
                      <step.icon className="w-5 h-5" />
                    )}
                  </div>
                  <span
                    className={`text-xs mt-2 font-medium transition-colors ${
                      step.number <= currentStep
                        ? "text-gray-900"
                        : "text-gray-400"
                    }`}
                  >
                    {step.title}
                  </span>
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={`h-0.5 flex-1 mx-3 rounded-full transition-colors ${
                      step.number < currentStep
                        ? "bg-gradient-to-r from-green-500 to-green-400"
                        : "bg-gray-200"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-8 max-h-[50vh] overflow-y-auto">
          {!isConnected ? (
            <>
              {/* Connection Status */}
              <div className="mb-8 p-4 bg-amber-50 border border-amber-200/50 rounded-xl flex items-start gap-3">
                {isChecking ? (
                  <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
                    <Loader2 className="w-5 h-5 text-amber-600 animate-spin" />
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
                    <AlertCircle className="w-5 h-5 text-amber-600" />
                  </div>
                )}
                <div className="flex-1">
                  <p className="font-semibold text-amber-900">
                    {isChecking
                      ? "Söker efter backend..."
                      : "Backend är inte ansluten"}
                  </p>
                  <p className="text-sm text-amber-700 mt-0.5">
                    Följ stegen nedan för att komma igång.
                  </p>
                </div>
                <button
                  onClick={onRetryConnection}
                  disabled={isChecking}
                  className="flex items-center gap-1.5 text-sm font-medium text-amber-700 hover:text-amber-900 disabled:opacity-50 px-3 py-1.5 rounded-lg hover:bg-amber-100 transition-colors"
                >
                  <RefreshCw className={`w-4 h-4 ${isChecking ? "animate-spin" : ""}`} />
                  Försök igen
                </button>
              </div>

              {/* Steps as cards */}
              <div className="space-y-4">
                {/* Step 1: Download */}
                <div
                  className={`relative p-5 bg-gray-50 rounded-2xl border transition-all duration-300 ${
                    currentStep === 1
                      ? "border-primary-200 shadow-lg shadow-primary-500/5"
                      : currentStep > 1
                      ? "border-green-200 bg-green-50/30"
                      : "border-gray-100 opacity-60"
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div
                      className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-lg transition-all ${
                        currentStep > 1
                          ? "bg-gradient-to-br from-green-500 to-green-600"
                          : "bg-gradient-to-br from-primary-400 to-primary-500"
                      }`}
                    >
                      {currentStep > 1 ? (
                        <CheckCircle className="w-6 h-6 text-white" />
                      ) : (
                        <Download className="w-6 h-6 text-white" />
                      )}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 mb-1">
                        Ladda ner TystText-backend
                      </h3>
                      <p className="text-sm text-gray-600 mb-3">
                        Backend-programmet kör transkriberingen lokalt på din dator.
                        All data stannar på din maskin.
                      </p>
                      {currentStep === 1 && (
                        <a
                          href={DOWNLOAD_URL}
                          className="inline-flex items-center gap-2 bg-gradient-to-r from-primary-500 to-primary-600 text-white px-4 py-2.5 rounded-xl hover:from-primary-600 hover:to-primary-700 transition-all shadow-lg shadow-primary-500/25 font-medium text-sm"
                          onClick={() => setCurrentStep(2)}
                        >
                          <Download className="w-4 h-4" />
                          Ladda ner ZIP-fil
                          <ExternalLink className="w-3.5 h-3.5 ml-1" />
                        </a>
                      )}
                    </div>
                  </div>
                  {/* Number badge */}
                  <span className="absolute -top-2 -right-2 w-7 h-7 bg-gradient-to-br from-primary-500 to-primary-600 rounded-lg flex items-center justify-center text-white text-xs font-bold shadow-lg">
                    01
                  </span>
                </div>

                {/* Step 2: Extract */}
                <div
                  className={`relative p-5 bg-gray-50 rounded-2xl border transition-all duration-300 ${
                    currentStep === 2
                      ? "border-primary-200 shadow-lg shadow-primary-500/5"
                      : currentStep > 2
                      ? "border-green-200 bg-green-50/30"
                      : "border-gray-100 opacity-60"
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div
                      className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-lg transition-all ${
                        currentStep > 2
                          ? "bg-gradient-to-br from-green-500 to-green-600"
                          : "bg-gradient-to-br from-primary-500 to-primary-600"
                      }`}
                    >
                      {currentStep > 2 ? (
                        <CheckCircle className="w-6 h-6 text-white" />
                      ) : (
                        <FolderOpen className="w-6 h-6 text-white" />
                      )}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 mb-1">
                        Packa upp ZIP-filen
                      </h3>
                      <p className="text-sm text-gray-600 mb-2">
                        Högerklicka på filen och välj &quot;Extrahera allt&quot;.
                        Lägg mappen där du kommer ihåg den.
                      </p>
                      <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white rounded-lg border border-gray-200 text-xs text-gray-600">
                        <FolderOpen className="w-3.5 h-3.5 text-gray-400" />
                        <code>C:\TystText</code>
                      </div>
                      {currentStep === 2 && (
                        <button
                          onClick={() => setCurrentStep(3)}
                          className="ml-3 text-sm text-primary-600 hover:text-primary-700 font-medium"
                        >
                          Klar, nästa steg →
                        </button>
                      )}
                    </div>
                  </div>
                  <span className="absolute -top-2 -right-2 w-7 h-7 bg-gradient-to-br from-primary-500 to-primary-600 rounded-lg flex items-center justify-center text-white text-xs font-bold shadow-lg">
                    02
                  </span>
                </div>

                {/* Step 3: Start */}
                <div
                  className={`relative p-5 bg-gray-50 rounded-2xl border transition-all duration-300 ${
                    currentStep === 3
                      ? "border-primary-200 shadow-lg shadow-primary-500/5"
                      : currentStep > 3
                      ? "border-green-200 bg-green-50/30"
                      : "border-gray-100 opacity-60"
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div
                      className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-lg transition-all ${
                        currentStep > 3
                          ? "bg-gradient-to-br from-green-500 to-green-600"
                          : "bg-gradient-to-br from-primary-600 to-primary-700"
                      }`}
                    >
                      {currentStep > 3 ? (
                        <CheckCircle className="w-6 h-6 text-white" />
                      ) : (
                        <Play className="w-6 h-6 text-white" />
                      )}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 mb-1">
                        Starta backend
                      </h3>
                      <p className="text-sm text-gray-600 mb-2">
                        Dubbelklicka på{" "}
                        <code className="bg-dark-800 text-primary-300 px-2 py-0.5 rounded font-mono text-xs">
                          Starta-TystText.bat
                        </code>
                      </p>
                      <div className="p-3 bg-primary-50 border border-primary-100 rounded-xl">
                        <p className="text-xs text-primary-800">
                          <strong>Första gången?</strong> Det tar några minuter att installera.
                          Stäng inte det svarta fönstret!
                        </p>
                      </div>
                    </div>
                  </div>
                  <span className="absolute -top-2 -right-2 w-7 h-7 bg-gradient-to-br from-primary-600 to-primary-700 rounded-lg flex items-center justify-center text-white text-xs font-bold shadow-lg">
                    03
                  </span>
                </div>
              </div>

              {/* System Requirements (collapsible) */}
              <div className="mt-6 pt-4 border-t border-gray-100">
                <button
                  onClick={() => setShowSystemReqs(!showSystemReqs)}
                  className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-2 transition-colors"
                >
                  <Monitor className="w-4 h-4" />
                  Systemkrav
                  <span className={`transition-transform ${showSystemReqs ? "rotate-180" : ""}`}>
                    ▼
                  </span>
                </button>
                {showSystemReqs && (
                  <div className="mt-4 grid grid-cols-3 gap-3">
                    {[
                      { icon: Cpu, label: "Python", value: "3.11 eller 3.12" },
                      { icon: HardDrive, label: "Disk", value: "~5 GB" },
                      { icon: Monitor, label: "RAM", value: "8 GB+" },
                    ].map((req) => (
                      <div
                        key={req.label}
                        className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl"
                      >
                        <req.icon className="w-4 h-4 text-gray-400" />
                        <div>
                          <p className="text-xs font-medium text-gray-900">{req.label}</p>
                          <p className="text-xs text-gray-500">{req.value}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            /* Connected - Success State */
            <div className="text-center py-8">
              <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-green-500/30 animate-bounce-slow">
                <CheckCircle className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Backend ansluten!
              </h2>
              <p className="text-gray-600 mb-8 max-w-sm mx-auto">
                Allt är klart. Du kan nu börja transkribera intervjuer med KB Whisper.
              </p>
              <button
                onClick={onSetupComplete}
                className="inline-flex items-center gap-2 bg-gradient-to-r from-primary-500 to-primary-600 text-white px-8 py-4 rounded-xl hover:from-primary-600 hover:to-primary-700 transition-all shadow-lg shadow-primary-500/25 font-semibold"
              >
                Börja använda TystText
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-8 py-4 bg-gray-50 border-t border-gray-100">
          <p className="text-xs text-gray-500 text-center">
            Behöver du hjälp?{" "}
            <a
              href="https://github.com/Pluggentipsar/intervju-transkribering/wiki"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary-600 hover:text-primary-700 font-medium"
            >
              Läs guiden
            </a>{" "}
            eller{" "}
            <a
              href="https://github.com/Pluggentipsar/intervju-transkribering/issues"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary-600 hover:text-primary-700 font-medium"
            >
              rapportera ett problem
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
