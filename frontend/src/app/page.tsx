"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { sv } from "date-fns/locale";
import {
  Mic,
  Shield,
  ArrowRight,
  FileAudio,
  Clock,
  CheckCircle,
  Loader2,
  XCircle,
  Lock,
  Sparkles,
} from "lucide-react";
import { listJobs } from "@/services/api";
import {
  WelcomeScreen,
  useOnboarding,
} from "@/components/onboarding/WelcomeScreen";
import {
  HeroSection,
  HowItWorksSection,
  FeaturesSection,
} from "@/components/hero";
import { DownloadSection } from "@/components/site/DownloadSection";
import { GuideSection } from "@/components/site/GuideSection";
import type { Job, JobStatus } from "@/types";

const IS_LOCAL = process.env.NEXT_PUBLIC_APP_MODE === "local";

// ─── Marketing site home page ────────────────────────────────
function MarketingHome() {
  return (
    <>
      <HeroSection />
      <HowItWorksSection />
      <FeaturesSection />
      <DownloadSection />
      <GuideSection />

      <footer className="py-12 bg-dark-950 text-white border-t border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="text-center md:text-left">
              <div className="flex items-center gap-2 justify-center md:justify-start mb-1">
                <div className="w-6 h-6 bg-gradient-to-br from-primary-400 to-primary-600 rounded-md flex items-center justify-center">
                  <Mic className="w-3 h-3 text-white" />
                </div>
                <p className="font-semibold text-white">TystText</p>
              </div>
              <p className="text-gray-500 text-sm">
                Byggd med KB Whisper, WhisperX och KB-BERT
              </p>
            </div>
            <div className="flex items-center gap-6 text-sm text-gray-400">
              <a href="#features" className="hover:text-white transition-colors">
                Funktioner
              </a>
              <a href="#download" className="hover:text-white transition-colors">
                Ladda ner
              </a>
              <a href="#guide" className="hover:text-white transition-colors">
                Guider
              </a>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}

// ─── Local app home page (dashboard) ─────────────────────────

const STATUS_ICON: Record<
  JobStatus,
  { icon: typeof Clock; color: string; bg: string }
> = {
  pending: { icon: Clock, color: "text-gray-400", bg: "bg-gray-100" },
  processing: {
    icon: Loader2,
    color: "text-primary-600",
    bg: "bg-primary-50",
  },
  completed: { icon: CheckCircle, color: "text-green-600", bg: "bg-green-50" },
  failed: { icon: XCircle, color: "text-red-500", bg: "bg-red-50" },
  cancelled: { icon: XCircle, color: "text-gray-400", bg: "bg-gray-100" },
};

function RecentJobRow({ job }: { job: Job }) {
  const config = STATUS_ICON[job.status];
  const StatusIcon = config.icon;

  return (
    <Link
      href={`/jobs/${job.id}`}
      className="flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50/80 transition-colors group"
    >
      <div className="w-9 h-9 bg-gray-100 rounded-lg flex items-center justify-center group-hover:bg-primary-50 transition-colors">
        <FileAudio className="w-4 h-4 text-gray-400 group-hover:text-primary-600 transition-colors" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">
          {job.file_name}
        </p>
        <p className="text-xs text-gray-400 mt-0.5">
          {formatDistanceToNow(new Date(job.created_at), {
            addSuffix: true,
            locale: sv,
          })}
        </p>
      </div>
      <div
        className={`w-7 h-7 ${config.bg} rounded-full flex items-center justify-center`}
      >
        <StatusIcon
          className={`w-3.5 h-3.5 ${config.color} ${job.status === "processing" ? "animate-spin" : ""}`}
        />
      </div>
      <ArrowRight className="w-4 h-4 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity" />
    </Link>
  );
}

function LocalAppHome() {
  const { showOnboarding, complete } = useOnboarding();

  const { data } = useQuery({
    queryKey: ["jobs", "recent"],
    queryFn: () => listJobs(0, 5),
    staleTime: 30000,
  });

  const jobs = data?.jobs || [];

  return (
    <>
      {showOnboarding && <WelcomeScreen onComplete={complete} />}

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
        {/* Welcome header */}
        <div className="mb-10">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Vad vill du gora?
          </h1>
          <div className="flex items-center gap-2 text-gray-500 text-sm">
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-green-50 text-green-700 rounded-full text-xs font-medium">
              <Lock className="w-3 h-3" />
              Lokalt lage
            </div>
            <span className="text-gray-400">
              All bearbetning sker pa din dator
            </span>
          </div>
        </div>

        {/* Quick actions */}
        <div className="grid sm:grid-cols-2 gap-5 mb-10">
          <Link
            href="/upload"
            className="group relative overflow-hidden flex items-start gap-4 p-6 bg-white border border-gray-200 rounded-2xl hover:border-primary-200 hover:shadow-lg hover:shadow-primary-500/5 transition-all duration-300"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-primary-50 to-transparent rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="relative w-12 h-12 bg-gradient-to-br from-primary-50 to-primary-100 rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform duration-300">
              <Mic className="w-5.5 h-5.5 text-primary-600" />
            </div>
            <div className="relative flex-1">
              <h2 className="font-semibold text-gray-900 mb-1 flex items-center gap-2">
                Ny transkription
                <ArrowRight className="w-4 h-4 text-primary-500 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200" />
              </h2>
              <p className="text-sm text-gray-500 leading-relaxed">
                Ladda upp ljud och transkribera med KB Whisper
              </p>
            </div>
          </Link>

          <Link
            href="/anonymize"
            className="group relative overflow-hidden flex items-start gap-4 p-6 bg-white border border-gray-200 rounded-2xl hover:border-amber-200 hover:shadow-lg hover:shadow-amber-500/5 transition-all duration-300"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-amber-50 to-transparent rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="relative w-12 h-12 bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform duration-300">
              <Shield className="w-5.5 h-5.5 text-amber-600" />
            </div>
            <div className="relative flex-1">
              <h2 className="font-semibold text-gray-900 mb-1 flex items-center gap-2">
                Avidentifiera text
                <ArrowRight className="w-4 h-4 text-amber-500 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200" />
              </h2>
              <p className="text-sm text-gray-500 leading-relaxed">
                Anonymisera namn, platser och personnummer
              </p>
            </div>
          </Link>
        </div>

        {/* Recent jobs */}
        {jobs.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900 text-sm">
                Senaste transkriptioner
              </h2>
              <Link
                href="/jobs"
                className="text-xs text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1 transition-colors"
              >
                Visa alla
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="divide-y divide-gray-100/80">
              {jobs.map((job) => (
                <RecentJobRow key={job.id} job={job} />
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {jobs.length === 0 && (
          <div className="relative text-center py-16 bg-white border border-gray-200 rounded-2xl overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-gray-50/50 to-transparent" />
            <div className="relative">
              <div className="w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-sm">
                <Sparkles className="w-7 h-7 text-gray-300" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2 text-lg">
                Inga transkriptioner an
              </h3>
              <p className="text-sm text-gray-500 mb-6 max-w-xs mx-auto">
                Ladda upp en ljudfil for att komma igang med din forsta transkription
              </p>
              <Link
                href="/upload"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary-500 text-white text-sm font-medium rounded-xl hover:bg-primary-600 transition-colors shadow-sm shadow-primary-500/20"
              >
                <Mic className="w-4 h-4" />
                Ny transkription
              </Link>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

// ─── Page component ──────────────────────────────────────────

export default function HomePage() {
  if (IS_LOCAL) {
    return <LocalAppHome />;
  }
  return <MarketingHome />;
}
