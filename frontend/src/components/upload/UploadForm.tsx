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
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

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
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* File Upload */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">
          1. Välj ljudfil
        </h2>
        <FileDropzone
          onFileSelect={setSelectedFile}
          selectedFile={selectedFile}
          onClear={() => setSelectedFile(null)}
          disabled={isProcessing}
        />
      </div>

      {/* Model Selection */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">
          2. Välj inställningar
        </h2>
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
        </div>
      </div>

      {/* Progress / Status */}
      {(isProcessing || isComplete || isFailed) && (
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">
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
      <div className="flex gap-3">
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
