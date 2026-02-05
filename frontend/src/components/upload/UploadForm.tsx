/**
 * Main upload form component.
 */

"use client";

import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { FileDropzone } from "./FileDropzone";
import { ModelSelector } from "./ModelSelector";
import { Button } from "@/components/ui/Button";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { uploadFile, createJob, getHFTokenStatus, saveHFToken } from "@/services/api";
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

export function UploadForm() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedModel, setSelectedModel] = useState("KBLab/kb-whisper-small");
  const [enableDiarization, setEnableDiarization] = useState(true);
  const [enableAnonymization, setEnableAnonymization] = useState(false);
  const [nerEntityTypes, setNerEntityTypes] = useState<NerEntityTypesConfig>(DEFAULT_NER_ENTITY_TYPES);
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  // HF Token state
  const [hfTokenInput, setHfTokenInput] = useState("");
  const [showTokenSetup, setShowTokenSetup] = useState(false);

  const handleEntityTypeChange = (type: keyof NerEntityTypesConfig, checked: boolean) => {
    setNerEntityTypes((prev) => ({ ...prev, [type]: checked }));
  };

  // Check HF token status
  const { data: hfTokenStatus } = useQuery({
    queryKey: ["hf-token-status"],
    queryFn: getHFTokenStatus,
    staleTime: 60000,
  });

  // Save HF token mutation
  const saveTokenMutation = useMutation({
    mutationFn: saveHFToken,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hf-token-status"] });
      setHfTokenInput("");
    },
  });

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
            <p className="text-sm text-green-800 mb-2">
              All transkribering, talaridentifiering och avidentifiering sker direkt på din dator.
              Ditt ljudinnehåll lämnar aldrig din enhet.
            </p>
            <details className="group">
              <summary className="text-sm text-green-700 cursor-pointer hover:text-green-900 font-medium">
                Första gången? Läs mer om vad som händer...
              </summary>
              <div className="mt-2 text-sm text-green-700 space-y-1 pl-0">
                <p>
                  <strong>Första körningen:</strong> AI-modellerna laddas ned till din dator (ca 500 MB - 3 GB beroende på modell).
                  Detta sker endast en gång.
                </p>
                <p>
                  <strong>Efterföljande körningar:</strong> Modellerna finns redan lokalt och transkriberingen startar direkt.
                </p>
                <p>
                  <strong>Vad används:</strong> KB Whisper för transkribering, WhisperX för talaridentifiering,
                  och KB-BERT för avidentifiering av känslig information.
                </p>
              </div>
            </details>
          </div>
        </div>
      </div>

      {/* File Upload */}
      <div className="p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-1">
          1. Välj ljudfil
        </h2>
        <p className="text-sm text-gray-500 mb-4">
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
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium text-gray-900">Talaridentifiering</span>
                {hfTokenStatus?.configured ? (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                    Aktiverad
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800">
                    Kräver konfiguration
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-500">
                Identifiera olika talare i intervjun
              </p>
            </div>
          </label>

          {/* Diarization setup - collapsible, not intrusive */}
          {enableDiarization && !hfTokenStatus?.configured && (
            <div className="mt-3 ml-7">
              <button
                type="button"
                onClick={() => setShowTokenSetup(!showTokenSetup)}
                className="flex items-center gap-2 text-amber-700 hover:text-amber-900 font-medium text-sm"
              >
                <svg className={`w-4 h-4 transition-transform ${showTokenSetup ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                Konfigurera talaridentifiering (första gången)
              </button>

              {showTokenSetup && (
                <div className="mt-3 p-4 bg-amber-50 border border-amber-200 rounded-lg space-y-4">
                  {/* Video placeholder */}
                  <div className="aspect-video bg-gray-900 rounded-lg flex items-center justify-center">
                    {/* Replace YOUR_VIDEO_ID with actual YouTube video ID */}
                    <iframe
                      className="w-full h-full rounded-lg"
                      src="https://www.youtube.com/embed/YOUR_VIDEO_ID"
                      title="Hur du konfigurerar talaridentifiering"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>

                  {/* Step by step instructions */}
                  <div className="text-sm text-amber-900">
                    <p className="font-medium mb-2">Steg för att aktivera:</p>
                    <ol className="list-decimal list-inside space-y-1 text-sm">
                      <li>
                        <a href="https://huggingface.co/join" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                          Skapa gratis HuggingFace-konto
                        </a>
                      </li>
                      <li>
                        <a href="https://huggingface.co/settings/tokens" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                          Skapa en Access Token
                        </a>
                      </li>
                      <li>
                        <a href="https://huggingface.co/pyannote/speaker-diarization-3.1" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                          Acceptera pyannote-villkoren
                        </a>
                      </li>
                      <li>Klistra in din token nedan</li>
                    </ol>
                  </div>

                  {/* Token input */}
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-amber-900">
                      Klistra in din HuggingFace-token:
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="password"
                        value={hfTokenInput}
                        onChange={(e) => setHfTokenInput(e.target.value)}
                        placeholder="hf_xxxxxxxxxxxxxxxxxx"
                        className="flex-1 px-3 py-2 border border-amber-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                      />
                      <button
                        type="button"
                        onClick={() => saveTokenMutation.mutate(hfTokenInput)}
                        disabled={!hfTokenInput || saveTokenMutation.isPending}
                        className="px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {saveTokenMutation.isPending ? "Sparar..." : "Spara"}
                      </button>
                    </div>
                    <p className="text-xs text-amber-700">
                      Din token sparas endast lokalt på din dator och skickas aldrig någon annanstans.
                    </p>
                    {saveTokenMutation.isError && (
                      <p className="text-xs text-red-600">
                        Fel: {saveTokenMutation.error instanceof Error ? saveTokenMutation.error.message : "Kunde inte spara token"}
                      </p>
                    )}
                    {saveTokenMutation.isSuccess && (
                      <p className="text-xs text-green-600">
                        Token sparad! Du kan nu använda talaridentifiering.
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Show configured status */}
          {enableDiarization && hfTokenStatus?.configured && (
            <div className="mt-2 ml-7 text-sm text-green-700">
              Token konfigurerad: {hfTokenStatus.token_preview}
            </div>
          )}
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
