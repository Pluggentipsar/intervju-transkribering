/**
 * Main upload form component.
 */

"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { FileDropzone } from "./FileDropzone";
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
  uploading: "Laddar upp fil...",
  creating_job: "Skapar transkriptionsjobb...",
  queued: "Väntar i kö...",
  starting: "Startar...",
  loading_model: "Laddar AI-modell...",
  transcribing: "Transkriberar...",
  transcription_complete: "Transkribering klar, förbereder talaridentifiering...",
  loading_diarization_model: "Laddar talaridentifieringsmodell...",
  loading_audio_for_diarization: "Laddar ljud för talaridentifiering...",
  diarizing: "Identifierar talare...",
  assigning_speakers: "Tilldelar talare till segment...",
  diarization_complete: "Talaridentifiering klar...",
  diarization_failed: "Talaridentifiering misslyckades, fortsätter...",
  loading_anonymization_model: "Laddar avidentifieringsmodell...",
  anonymizing: "Avidentifierar känslig information...",
  anonymization_complete: "Avidentifiering klar...",
  saving_results: "Sparar resultat...",
  completed: "Klart!",
  failed: "Misslyckades",
};

export function UploadForm() {
  const router = useRouter();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
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
      if (!selectedFile) throw new Error("Ingen fil vald");

      setUploadProgress(0);
      const uploadResult = await uploadFile(selectedFile);
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
    if (selectedFile) {
      uploadMutation.mutate();
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
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
    <form onSubmit={handleSubmit} className="divide-y divide-white/5">
      {/* File Upload */}
      <div className="p-6">
        <h2 className="text-lg font-semibold text-white mb-1">
          1. Välj ljudfil
        </h2>
        <p className="text-sm text-gray-400 mb-4">
          Dra och släpp eller klicka för att välja fil
        </p>
        <FileDropzone
          onFileSelect={setSelectedFile}
          selectedFile={selectedFile}
          onClear={() => setSelectedFile(null)}
          disabled={isProcessing}
        />
      </div>

      {/* Model Selection */}
      <div className="p-6">
        <h2 className="text-lg font-semibold text-white mb-1">
          2. Välj inställningar
        </h2>
        <p className="text-sm text-gray-400 mb-4">
          Anpassa transkriberingen efter dina behov
        </p>
        <ModelSelector
          selectedModel={selectedModel}
          onModelSelect={setSelectedModel}
          disabled={isProcessing}
        />

        {/* Diarization toggle */}
        <div className="mt-4 pt-4 border-t border-white/10">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={enableDiarization}
              onChange={(e) => setEnableDiarization(e.target.checked)}
              disabled={isProcessing}
              className="w-4 h-4 text-primary-600 rounded border-white/20 focus:ring-primary-500"
            />
            <div>
              <span className="font-medium text-white">Talaridentifiering</span>
              <p className="text-sm text-gray-400">
                Identifiera olika talare i intervjun (kräver HuggingFace-konto)
              </p>
            </div>
          </label>
        </div>

        {/* Anonymization toggle */}
        <div className="mt-4 pt-4 border-t border-white/10">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={enableAnonymization}
              onChange={(e) => setEnableAnonymization(e.target.checked)}
              disabled={isProcessing}
              className="w-4 h-4 text-primary-600 rounded border-white/20 focus:ring-primary-500"
            />
            <div>
              <span className="font-medium text-white">Avidentifiering</span>
              <p className="text-sm text-gray-400">
                Ta bort känslig information (namn, platser, organisationer)
              </p>
            </div>
          </label>

          {/* NER Entity Type Selection */}
          {enableAnonymization && (
            <div className="mt-3 ml-7 pl-3 border-l-2 border-blue-500/20 space-y-1">
              <p className="text-xs text-gray-400 mb-2">Välj vilka typer som ska avidentifieras:</p>
              {[
                { key: "persons" as const, label: "Personnamn", desc: "Namn på personer" },
                { key: "locations" as const, label: "Platser", desc: "Geografiska platser" },
                { key: "organizations" as const, label: "Organisationer", desc: "Företag, myndigheter" },
                { key: "dates" as const, label: "Datum/tid", desc: "Tidsuttryck" },
                { key: "events" as const, label: "Händelser", desc: "Namngivna händelser" },
              ].map((item) => (
                <label
                  key={item.key}
                  className="flex items-center gap-2 p-2 rounded hover:bg-blue-500/5 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={nerEntityTypes[item.key]}
                    onChange={(e) => handleEntityTypeChange(item.key, e.target.checked)}
                    disabled={isProcessing}
                    className="w-3.5 h-3.5 text-blue-600 rounded"
                  />
                  <span className="text-sm">{item.label}</span>
                  <span className="text-xs text-gray-500">- {item.desc}</span>
                </label>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Progress / Status */}
      {(isProcessing || isComplete || isFailed) && (
        <div className="p-6 bg-dark-900/50">
          <h2 className="text-lg font-semibold text-white mb-4">
            3. Status
          </h2>

          {currentStep && (
            <p className="text-sm text-gray-400 mb-2">
              {STEP_LABELS[currentStep] || currentStep}
            </p>
          )}

          <ProgressBar progress={progress} />

          {isFailed && (
            <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
              <p className="text-red-400 font-medium">
                Transkriberingen misslyckades
              </p>
              {job?.error_message && (
                <p className="text-sm text-red-400 mt-1">{job.error_message}</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="p-6 bg-gradient-to-r from-dark-900/50 to-transparent flex gap-3">
        {!isProcessing && !isComplete && (
          <Button
            type="submit"
            size="lg"
            disabled={!selectedFile}
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
          <div className="flex-1 text-center py-3 text-gray-400">
            Bearbetar... Stäng inte webbläsaren.
          </div>
        )}
      </div>

      {uploadMutation.isError && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
          <p className="text-red-400">
            {uploadMutation.error instanceof Error
              ? uploadMutation.error.message
              : "Ett fel uppstod"}
          </p>
        </div>
      )}
    </form>
  );
}
