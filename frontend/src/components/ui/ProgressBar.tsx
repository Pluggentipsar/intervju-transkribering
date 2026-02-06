/**
 * Progress bar component with enhanced visuals.
 */

"use client";

import { clsx } from "clsx";
import { CheckCircle, Loader2 } from "lucide-react";

interface ProgressStep {
  key: string;
  label: string;
}

interface ProgressBarProps {
  progress: number;
  className?: string;
  showLabel?: boolean;
  /** Current step key for step-based progress */
  currentStep?: string;
  /** Step label to display */
  stepLabel?: string;
  /** Available steps for step indicator */
  steps?: ProgressStep[];
  /** Variant style */
  variant?: "default" | "minimal" | "detailed";
}

const TRANSCRIPTION_STEPS: ProgressStep[] = [
  { key: "queued", label: "Kö" },
  { key: "loading_model", label: "Modell" },
  { key: "transcribing", label: "Transkribering" },
  { key: "diarizing", label: "Talare" },
  { key: "saving_results", label: "Sparar" },
];

function getStepIndex(stepKey: string | undefined, steps: ProgressStep[]): number {
  if (!stepKey) return 0;

  // Map various step keys to their parent step
  const stepMapping: Record<string, string> = {
    queued: "queued",
    starting: "queued",
    loading_model: "loading_model",
    transcribing: "transcribing",
    transcription_complete: "transcribing",
    loading_diarization_model: "diarizing",
    loading_audio_for_diarization: "diarizing",
    diarizing: "diarizing",
    assigning_speakers: "diarizing",
    diarization_complete: "diarizing",
    diarization_failed: "diarizing",
    saving_results: "saving_results",
    completed: "saving_results",
  };

  const mappedStep = stepMapping[stepKey] || stepKey;
  const index = steps.findIndex((s) => s.key === mappedStep);
  return index >= 0 ? index : 0;
}

export function ProgressBar({
  progress,
  className,
  showLabel = true,
  currentStep,
  stepLabel,
  steps = TRANSCRIPTION_STEPS,
  variant = "default",
}: ProgressBarProps) {
  const clampedProgress = Math.min(100, Math.max(0, progress));
  const currentStepIndex = getStepIndex(currentStep, steps);
  const isComplete = clampedProgress >= 100;

  if (variant === "minimal") {
    return (
      <div className={clsx("w-full", className)}>
        <div className="w-full bg-dark-800 rounded-full h-1.5 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-primary-500 to-primary-600 transition-all duration-500 ease-out"
            style={{ width: `${clampedProgress}%` }}
          />
        </div>
      </div>
    );
  }

  if (variant === "detailed") {
    return (
      <div className={clsx("w-full", className)}>
        {/* Step indicators */}
        <div className="flex items-center justify-between mb-4">
          {steps.map((step, index) => {
            const isActive = index === currentStepIndex;
            const isCompleted = index < currentStepIndex || isComplete;

            return (
              <div key={step.key} className="flex flex-col items-center flex-1">
                {/* Connector line */}
                {index > 0 && (
                  <div
                    className={clsx(
                      "absolute h-0.5 -translate-y-3",
                      isCompleted ? "bg-primary-500" : "bg-dark-700"
                    )}
                    style={{
                      width: `calc(100% / ${steps.length} - 24px)`,
                      left: `calc(${(index - 0.5) * (100 / steps.length)}% + 12px)`,
                    }}
                  />
                )}

                {/* Step circle */}
                <div
                  className={clsx(
                    "relative z-10 w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-all duration-300",
                    isCompleted
                      ? "bg-primary-500 text-white"
                      : isActive
                        ? "bg-primary-500/20 text-primary-400 ring-4 ring-primary-500/10"
                        : "bg-dark-700 text-gray-500"
                  )}
                >
                  {isCompleted ? (
                    <CheckCircle className="w-4 h-4" />
                  ) : isActive ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    index + 1
                  )}
                </div>

                {/* Step label */}
                <span
                  className={clsx(
                    "mt-2 text-xs font-medium transition-colors",
                    isActive ? "text-primary-400" : isCompleted ? "text-primary-500" : "text-gray-500"
                  )}
                >
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>

        {/* Progress bar */}
        <div className="relative">
          <div className="w-full bg-dark-800 rounded-full h-3 overflow-hidden">
            <div
              className={clsx(
                "h-full rounded-full transition-all duration-500 ease-out relative overflow-hidden",
                isComplete
                  ? "bg-green-500"
                  : "bg-gradient-to-r from-primary-500 via-primary-400 to-primary-500 bg-[length:200%_100%] animate-shimmer"
              )}
              style={{ width: `${clampedProgress}%` }}
            />
          </div>

          {/* Percentage label */}
          {showLabel && (
            <div className="flex items-center justify-between mt-2">
              <span className="text-sm font-semibold text-primary-400">
                {Math.round(clampedProgress)}%
              </span>
              {stepLabel && (
                <span className="text-sm text-gray-400">{stepLabel}</span>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Default variant
  return (
    <div className={clsx("w-full", className)}>
      {/* Progress bar */}
      <div className="relative">
        <div className="w-full bg-dark-800 rounded-full h-2.5 overflow-hidden">
          <div
            className={clsx(
              "h-full rounded-full transition-all duration-500 ease-out relative overflow-hidden",
              isComplete
                ? "bg-green-500"
                : "bg-gradient-to-r from-primary-500 via-primary-400 to-primary-500 bg-[length:200%_100%] animate-shimmer"
            )}
            style={{ width: `${clampedProgress}%` }}
          />
        </div>

        {/* Label */}
        {showLabel && (
          <div className="flex items-center justify-between mt-1.5">
            <span className="text-sm font-medium text-gray-300">
              {Math.round(clampedProgress)}%
            </span>
            {stepLabel && (
              <span className="text-sm text-gray-400">{stepLabel}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Indeterminate progress bar for operations without known progress.
 */
export function IndeterminateProgress({ className }: { className?: string }) {
  return (
    <div className={clsx("w-full", className)}>
      <div className="w-full bg-dark-800 rounded-full h-2 overflow-hidden">
        <div className="h-full w-1/3 bg-gradient-to-r from-primary-400 via-primary-500 to-primary-400 rounded-full animate-indeterminate" />
      </div>
    </div>
  );
}
