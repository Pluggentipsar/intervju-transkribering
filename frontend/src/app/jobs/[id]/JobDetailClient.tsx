"use client";

import { useState, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { sv } from "date-fns/locale";
import {
  ArrowLeft,
  Download,
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  FileText,
  FileCode,
  ShieldAlert,
  Subtitles,
  FileDown,
  Scissors,
  Shield,
  StopCircle,
} from "lucide-react";
import Link from "next/link";
import { getJob, getTranscript, getExportUrl, getAudioUrl, runAnonymization, cancelJob } from "@/services/api";
import { Button } from "@/components/ui/Button";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { TranscriptViewer } from "@/components/transcription/TranscriptViewer";
import { AudioPlayer } from "@/components/transcription/AudioPlayer";
import { SpeakerManager } from "@/components/transcription/SpeakerManager";
import { SpeakerStatistics } from "@/components/transcription/SpeakerStatistics";
import { WordCloud } from "@/components/transcription/WordCloud";
import { TopicSegmentation } from "@/components/transcription/TopicSegmentation";
import { EnhancedAnonymization } from "@/components/transcription/EnhancedAnonymization";
import { AIPromptToolbar } from "@/components/transcription/AIPromptToolbar";
import { useJobPolling } from "@/hooks/usePolling";
import { exportToPdf } from "@/utils/pdfExport";

const STEP_LABELS: Record<string, string> = {
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
  saving_results: "Sparar resultat...",
  completed: "Klart!",
  failed: "Misslyckades",
  cancelled: "Avbruten",
};

function formatDuration(seconds: number | null): string {
  if (!seconds) return "-";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s`;
  }
  return `${minutes}m ${secs}s`;
}

export default function JobDetailClient() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const jobId = params.id as string;

  // Poll job status when processing
  const { data: job, isLoading: jobLoading } = useJobPolling(jobId);

  // Fetch transcript when completed
  const { data: transcript, isLoading: transcriptLoading } = useQuery({
    queryKey: ["transcript", jobId],
    queryFn: () => getTranscript(jobId),
    enabled: job?.status === "completed",
  });

  // Mutation for running anonymization
  const anonymizationMutation = useMutation({
    mutationFn: () => runAnonymization(jobId),
    onSuccess: () => {
      // Refetch transcript to get anonymized text
      queryClient.invalidateQueries({ queryKey: ["transcript", jobId] });
      queryClient.invalidateQueries({ queryKey: ["job", jobId] });
    },
  });

  // Mutation for cancelling job
  const cancelMutation = useMutation({
    mutationFn: () => cancelJob(jobId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["job", jobId] });
    },
  });

  const handleCancel = () => {
    if (confirm("Är du säker på att du vill avbryta denna transkribering?")) {
      cancelMutation.mutate();
    }
  };

  // Check if transcript has anonymized content
  const hasAnonymizedContent = useMemo(() => {
    return transcript?.segments.some(
      (s) => s.anonymized_text && s.anonymized_text !== s.text
    ) ?? false;
  }, [transcript]);

  // State for showing anonymized text (default true if available)
  const [showAnonymized, setShowAnonymized] = useState(true);

  // State for tracking if enhanced anonymization has been run
  const [hasEnhancedResult, setHasEnhancedResult] = useState(false);

  // Audio player state
  const [currentAudioTime, setCurrentAudioTime] = useState(0);
  const [seekToTime, setSeekToTime] = useState<number | null>(null);

  // Handle segment click to seek audio
  const handleSegmentClick = useCallback((time: number) => {
    setSeekToTime(time);
    // Reset seekToTime after a short delay to allow re-clicking same segment
    setTimeout(() => setSeekToTime(null), 100);
  }, []);

  // Handle PDF export
  const handlePdfExport = useCallback(() => {
    if (!job || !transcript) return;

    exportToPdf({
      fileName: job.file_name,
      segments: transcript.segments,
      showAnonymized: showAnonymized && hasAnonymizedContent,
      metadata: {
        duration: job.duration_seconds,
        speakerCount: transcript.metadata.speaker_count,
        wordCount: transcript.metadata.word_count,
        segmentCount: transcript.metadata.segment_count,
        createdAt: job.created_at,
      },
    });
  }, [job, transcript, showAnonymized, hasAnonymizedContent]);

  // Compute full transcript text for AI tools
  const transcriptText = useMemo(() => {
    if (!transcript) return "";
    return transcript.segments
      .map((segment) => {
        const text = showAnonymized && segment.anonymized_text
          ? segment.anonymized_text
          : segment.text;
        const speaker = segment.speaker ? `[${segment.speaker}]: ` : "";
        return `${speaker}${text}`;
      })
      .join("\n\n");
  }, [transcript, showAnonymized]);

  if (jobLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 mb-4">Jobbet hittades inte</p>
        <Link href="/jobs" className="text-primary-600 hover:underline">
          Tillbaka till listan
        </Link>
      </div>
    );
  }

  const isProcessing = job.status === "pending" || job.status === "processing";
  const isComplete = job.status === "completed";
  const isFailed = job.status === "failed";
  const isCancelled = job.status === "cancelled";

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-24 pb-16">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => router.back()}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-gray-900 truncate">
            {job.file_name}
          </h1>
          <p className="text-sm text-gray-500">
            Skapad{" "}
            {formatDistanceToNow(new Date(job.created_at), {
              addSuffix: true,
              locale: sv,
            })}
          </p>
        </div>

        {/* Export buttons */}
        {isComplete && (
          <div className="flex gap-2 flex-wrap">
            <a
              href={getExportUrl(jobId, "txt", hasAnonymizedContent && showAnonymized)}
              download
              className="inline-flex items-center gap-2 px-3 py-2 bg-white border rounded-lg hover:bg-gray-50 transition-colors text-sm"
            >
              <FileText className="w-4 h-4" />
              Text
            </a>
            <a
              href={getExportUrl(jobId, "md", hasAnonymizedContent && showAnonymized)}
              download
              className="inline-flex items-center gap-2 px-3 py-2 bg-white border rounded-lg hover:bg-gray-50 transition-colors text-sm"
            >
              <FileCode className="w-4 h-4" />
              Markdown
            </a>
            <a
              href={getExportUrl(jobId, "srt", hasAnonymizedContent && showAnonymized)}
              download
              className="inline-flex items-center gap-2 px-3 py-2 bg-white border rounded-lg hover:bg-gray-50 transition-colors text-sm"
            >
              <Subtitles className="w-4 h-4" />
              SRT
            </a>
            <a
              href={getExportUrl(jobId, "vtt", hasAnonymizedContent && showAnonymized)}
              download
              className="inline-flex items-center gap-2 px-3 py-2 bg-white border rounded-lg hover:bg-gray-50 transition-colors text-sm"
            >
              <Subtitles className="w-4 h-4" />
              VTT
            </a>
            <a
              href={getExportUrl(jobId, "json", hasAnonymizedContent && showAnonymized)}
              download
              className="inline-flex items-center gap-2 px-3 py-2 bg-white border rounded-lg hover:bg-gray-50 transition-colors text-sm"
            >
              <Download className="w-4 h-4" />
              JSON
            </a>
            <button
              onClick={handlePdfExport}
              className="inline-flex items-center gap-2 px-3 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors text-sm font-medium"
            >
              <FileDown className="w-4 h-4" />
              PDF
            </button>
            <Link
              href={`/jobs/${jobId}/edit`}
              className="inline-flex items-center gap-2 px-3 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors text-sm font-medium"
            >
              <Scissors className="w-4 h-4" />
              Redigera ljud
            </Link>
          </div>
        )}
      </div>

      {/* Status card for processing/failed/cancelled */}
      {(isProcessing || isFailed || isCancelled) && (
        <div className="bg-white rounded-xl border p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              {isProcessing && (
                <>
                  <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                  <span className="font-medium text-gray-900">
                    Transkriberar...
                  </span>
                </>
              )}
              {isFailed && (
                <>
                  <XCircle className="w-6 h-6 text-red-500" />
                  <span className="font-medium text-red-700">
                    Transkriberingen misslyckades
                  </span>
                </>
              )}
              {isCancelled && (
                <>
                  <StopCircle className="w-6 h-6 text-gray-500" />
                  <span className="font-medium text-gray-700">
                    Transkriberingen avbröts
                  </span>
                </>
              )}
            </div>
            {isProcessing && (
              <button
                onClick={handleCancel}
                disabled={cancelMutation.isPending}
                className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors font-medium disabled:opacity-50"
              >
                <StopCircle className="w-4 h-4" />
                {cancelMutation.isPending ? "Avbryter..." : "Avbryt"}
              </button>
            )}
          </div>

          {isProcessing && (
            <ProgressBar
              progress={job.progress}
              currentStep={job.current_step ?? undefined}
              stepLabel={STEP_LABELS[job.current_step ?? ""] ?? job.current_step ?? undefined}
              variant="detailed"
            />
          )}

          {isFailed && job.error_message && (
            <p className="text-sm text-red-600 mt-2">{job.error_message}</p>
          )}

          {isCancelled && (
            <p className="text-sm text-gray-600 mt-2">Transkriberingen avbröts av användaren.</p>
          )}
        </div>
      )}

      {/* Metadata card */}
      {isComplete && transcript && (
        <div className="bg-white rounded-xl border p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <CheckCircle className="w-6 h-6 text-green-500" />
            <span className="font-medium text-gray-900">
              Transkribering klar
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-500">Längd</p>
              <p className="font-medium">{formatDuration(job.duration_seconds)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Segment</p>
              <p className="font-medium">{transcript.metadata.segment_count}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Ord</p>
              <p className="font-medium">{transcript.metadata.word_count}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Talare</p>
              <p className="font-medium">
                {transcript.metadata.speaker_count || "-"}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Speaker management panel */}
      {isComplete && transcript && transcript.metadata.speaker_count > 0 && (
        <SpeakerManager
          jobId={jobId}
          segments={transcript.segments}
          className="mb-6"
        />
      )}

      {/* Speaker statistics */}
      {isComplete && transcript && transcript.metadata.speaker_count > 0 && (
        <SpeakerStatistics
          segments={transcript.segments}
          className="mb-6"
        />
      )}

      {/* Word cloud */}
      {isComplete && transcript && (
        <WordCloud
          segments={transcript.segments}
          showAnonymized={showAnonymized && hasAnonymizedContent}
          className="mb-6"
        />
      )}

      {/* Topic segmentation */}
      {isComplete && transcript && (
        <TopicSegmentation
          segments={transcript.segments}
          showAnonymized={showAnonymized && hasAnonymizedContent}
          className="mb-6"
          onTopicClick={handleSegmentClick}
        />
      )}

      {/* Run anonymization panel - show when no anonymization exists */}
      {isComplete && transcript && !hasAnonymizedContent && (
        <div className="bg-white rounded-xl border p-6 mb-6">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Shield className="w-6 h-6 text-blue-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-medium text-gray-900">
                Kör avidentifiering
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                Transkriptet har inte avidentifierats. Du kan köra NER-baserad avidentifiering
                för att automatiskt ersätta personnamn, platser och organisationer med taggar.
              </p>
              <div className="mt-4">
                <button
                  onClick={() => anonymizationMutation.mutate()}
                  disabled={anonymizationMutation.isPending}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
                >
                  {anonymizationMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Kör avidentifiering...
                    </>
                  ) : (
                    <>
                      <Shield className="w-4 h-4" />
                      Kör avidentifiering
                    </>
                  )}
                </button>
                {anonymizationMutation.isSuccess && (
                  <span className="ml-3 text-sm text-green-600">
                    Avidentifiering klar! {anonymizationMutation.data?.segments_anonymized} segment uppdaterade.
                  </span>
                )}
                {anonymizationMutation.isError && (
                  <span className="ml-3 text-sm text-red-600">
                    Fel vid avidentifiering. Försök igen.
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced anonymization panel */}
      {isComplete && transcript && (
        <EnhancedAnonymization
          jobId={jobId}
          hasNerAnonymization={transcript.segments.some(
            (s) => s.anonymized_text && s.anonymized_text !== s.text
          )}
          className="mb-6"
          onHasEnhancedResult={setHasEnhancedResult}
        />
      )}

      {/* Banner when enhanced anonymization has been run */}
      {hasEnhancedResult && (
        <div className="flex items-start gap-3 p-4 mb-6 bg-amber-50 border border-amber-200 rounded-xl">
          <ShieldAlert className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-amber-800">
              Förstärkt avidentifiering är aktiv
            </p>
            <p className="text-sm text-amber-700 mt-1">
              Du har kört förstärkt avidentifiering. Använd knapparna &quot;Kopiera text&quot; och &quot;Ladda ner&quot;
              i panelen ovan för att exportera det förstärkta resultatet. Export-knapparna i sidhuvudet
              exporterar endast den ursprungliga NER-avidentifieringen.
            </p>
          </div>
        </div>
      )}

      {/* Audio player */}
      {isComplete && transcript && (
        <AudioPlayer
          audioUrl={getAudioUrl(jobId)}
          duration={job.duration_seconds ?? undefined}
          className="mb-6"
          onTimeUpdate={setCurrentAudioTime}
          seekToTime={seekToTime}
        />
      )}

      {/* Transcript viewer */}
      {isComplete && transcript && (
        <div className="bg-white rounded-xl border p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">
            Transkription
          </h2>
          <TranscriptViewer
            segments={transcript.segments}
            className="max-h-[600px]"
            showAnonymized={showAnonymized}
            onShowAnonymizedChange={setShowAnonymized}
            currentAudioTime={currentAudioTime}
            onSegmentClick={handleSegmentClick}
          />
        </div>
      )}

      {/* Loading transcript */}
      {isComplete && transcriptLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
        </div>
      )}

      {/* AI Prompt Toolbar */}
      {isComplete && transcript && transcriptText && (
        <AIPromptToolbar transcriptText={transcriptText} />
      )}
    </div>
  );
}
