/**
 * Form for recording and transcribing audio.
 */

"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { AudioRecorder } from "./AudioRecorder";
import { ModelSelector } from "./ModelSelector";
import { Button } from "@/components/ui/Button";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { uploadFile, createJob } from "@/services/api";
import { useJobPolling } from "@/hooks/usePolling";
import type { NerEntityTypesConfig } from "@/types";

const DEFAULT_NER_ENTITY_TYPES: NerEntityTypesConfig = {
  persons: true,
  locations: true,
  organizations: true,
  dates: true,
  events: true,
};

const STEP_LABELS: Record<string, string> = {
  uploading: "Laddar upp inspelning...",
  creating_job: "Skapar transkriptionsjobb...",
  queued: "Väntar i kö...",
  starting: "Startar...",
  loading_model: "Laddar AI-modell (kan ta några minuter första gången)...",
  transcribing: "Transkriberar lokalt på din dator...",
  transcription_complete: "Transkribering klar, förbereder talaridentifiering...",
  loading_diarization_model: "Laddar talaridentifieringsmodell (kan ta några minuter första gången)...",
  loading_audio_for_diarization: "Laddar ljud för talaridentifiering...",
  diarizing: "Identifierar talare lokalt...",
  assigning_speakers: "Tilldelar talare till segment...",
  diarization_complete: "Talaridentifiering klar...",
  diarization_failed: "Talaridentifiering misslyckades, fortsätter...",
  loading_anonymization_model: "Laddar avidentifieringsmodell (kan ta några minuter första gången)...",
  anonymizing: "Avidentifierar känslig information lokalt...",
  anonymization_complete: "Avidentifiering klar...",
  saving_results: "Sparar resultat...",
  completed: "Klart!",
  failed: "Misslyckades",
};

export function RecordForm() {
  const router = useRouter();
  const [recordedFile, setRecordedFile] = useState<File | null>(null);
  const [selectedModel, setSelectedModel] = useState("KBLab/kb-whisper-small");
  const [enableDiarization, setEnableDiarization] = useState(true);
  const [enableAnonymization, setEnableAnonymization] = useState(false);
  const [nerEntityTypes, setNerEntityTypes] = useState<NerEntityTypesConfig>(DEFAULT_NER_ENTITY_TYPES);
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleEntityTypeChange = (type: keyof NerEntityTypesConfig, checked: boolean) => {
    setNerEntityTypes((prev) => ({ ...prev, [type]: checked }));
  };

  // Poll job status
  const { data: job } = useJobPolling(currentJobId);

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!recordedFile) throw new Error("Ingen inspelning");

      setUploadProgress(0);
      const uploadResult = await uploadFile(recordedFile);
      setUploadProgress(100);

      const jobResult = await createJob({
        file_id: uploadResult.file_id,
        model: selectedModel,
        enable_diarization: enableDiarization,
        enable_anonymization: enableAnonymization,
        language: "sv",
        ner_entity_types: enableAnonymization ? nerEntityTypes : undefined,
      });

      return jobResult;
    },
    onSuccess: (job) => {
      setCurrentJobId(job.id);
    },
  });

  const isProcessing = uploadMutation.isPending || (job && job.status === "processing");
  const isComplete = job?.status === "completed";
  const isFailed = job?.status === "failed";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (recordedFile) {
      uploadMutation.mutate();
    }
  };

  const handleReset = () => {
    setRecordedFile(null);
    setCurrentJobId(null);
    setUploadProgress(0);
    uploadMutation.reset();
  };

  // Redirect to results when complete
  if (isComplete && currentJobId) {
    router.push(`/jobs/${currentJobId}`);
  }

  const currentStep = job?.current_step || (uploadMutation.isPending ? "uploading" : null);
  const progress = job?.progress || uploadProgress;

  return (
    <form onSubmit={handleSubmit} className="divide-y divide-gray-100">
      {/* Privacy & Info Banner */}
      <div className="p-6 bg-gradient-to-r from-green-50 to-emerald-50 border-b border-green-100">
        <div className="flex gap-4">
          <div className="flex-shrink-0">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-green-900 mb-1">
              100% lokal bearbetning
            </h3>
            <p className="text-sm text-green-800">
              Din inspelning bearbetas lokalt på din dator. Innehållet lämnar aldrig din enhet.
              Första körningen laddar ned AI-modellerna (en gång).
            </p>
          </div>
        </div>
      </div>

      {/* Recording */}
      <div className="p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-1">
          1. Spela in ljud
        </h2>
        <p className="text-sm text-gray-500 mb-4">
          Spela in direkt från mikrofonen
        </p>
        {!recordedFile ? (
          <AudioRecorder
            onRecordingComplete={setRecordedFile}
            disabled={isProcessing}
          />
        ) : (
          <div className="border-2 border-primary-200 bg-primary-50 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">{recordedFile.name}</p>
                <p className="text-sm text-gray-500">
                  {(recordedFile.size / 1024).toFixed(0)} KB
                </p>
              </div>
              {!isProcessing && (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setRecordedFile(null)}
                >
                  Spela in igen
                </Button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Model Selection */}
      <div className="p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-1">
          2. Välj inställningar
        </h2>
        <p className="text-sm text-gray-500 mb-4">
          Anpassa transkriberingen efter dina behov
        </p>
        <ModelSelector
          selectedModel={selectedModel}
          onModelSelect={setSelectedModel}
          disabled={isProcessing}
        />

        {/* Diarization toggle */}
        <div className="mt-4 pt-4 border-t">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={enableDiarization}
              onChange={(e) => setEnableDiarization(e.target.checked)}
              disabled={isProcessing}
              className="w-4 h-4 text-primary-600 rounded border-gray-300 focus:ring-primary-500"
            />
            <div>
              <span className="font-medium text-gray-900">Talaridentifiering</span>
              <p className="text-sm text-gray-500">
                Identifiera olika talare i intervjun (kräver HuggingFace-konto)
              </p>
            </div>
          </label>
        </div>

        {/* Anonymization toggle */}
        <div className="mt-4 pt-4 border-t">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={enableAnonymization}
              onChange={(e) => setEnableAnonymization(e.target.checked)}
              disabled={isProcessing}
              className="w-4 h-4 text-primary-600 rounded border-gray-300 focus:ring-primary-500"
            />
            <div>
              <span className="font-medium text-gray-900">Avidentifiering</span>
              <p className="text-sm text-gray-500">
                Ta bort känslig information (namn, platser, organisationer)
              </p>
            </div>
          </label>

          {/* NER Entity Type Selection */}
          {enableAnonymization && (
            <div className="mt-3 ml-7 pl-3 border-l-2 border-blue-200 space-y-1">
              <p className="text-xs text-gray-500 mb-2">Välj vilka typer som ska avidentifieras:</p>
              {[
                { key: "persons" as const, label: "Personnamn", desc: "Namn på personer" },
                { key: "locations" as const, label: "Platser", desc: "Geografiska platser" },
                { key: "organizations" as const, label: "Organisationer", desc: "Företag, myndigheter" },
                { key: "dates" as const, label: "Datum/tid", desc: "Tidsuttryck" },
                { key: "events" as const, label: "Händelser", desc: "Namngivna händelser" },
              ].map((item) => (
                <label
                  key={item.key}
                  className="flex items-center gap-2 p-2 rounded hover:bg-blue-50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={nerEntityTypes[item.key]}
                    onChange={(e) => handleEntityTypeChange(item.key, e.target.checked)}
                    disabled={isProcessing}
                    className="w-3.5 h-3.5 text-blue-600 rounded"
                  />
                  <span className="text-sm">{item.label}</span>
                  <span className="text-xs text-gray-400">- {item.desc}</span>
                </label>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Progress / Status */}
      {(isProcessing || isComplete || isFailed) && (
        <div className="p-6 bg-gray-50">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            3. Status
          </h2>

          {currentStep && (
            <p className="text-sm text-gray-600 mb-2">
              {STEP_LABELS[currentStep] || currentStep}
            </p>
          )}

          <ProgressBar progress={progress} />

          {isFailed && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700 font-medium">
                Transkriberingen misslyckades
              </p>
              {job?.error_message && (
                <p className="text-sm text-red-600 mt-1">{job.error_message}</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="p-6 bg-gradient-to-r from-gray-50 to-white flex gap-3">
        {!isProcessing && !isComplete && (
          <Button
            type="submit"
            size="lg"
            disabled={!recordedFile}
            loading={uploadMutation.isPending}
            className="flex-1"
          >
            Starta transkribering
          </Button>
        )}

        {(isFailed || isComplete) && (
          <Button
            type="button"
            variant="secondary"
            size="lg"
            onClick={handleReset}
            className="flex-1"
          >
            Ny transkribering
          </Button>
        )}

        {isProcessing && (
          <div className="flex-1 text-center py-3 text-gray-500">
            Bearbetar... Stäng inte webbläsaren.
          </div>
        )}
      </div>

      {uploadMutation.isError && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700">
            {uploadMutation.error instanceof Error
              ? uploadMutation.error.message
              : "Ett fel uppstod"}
          </p>
        </div>
      )}
    </form>
  );
}
