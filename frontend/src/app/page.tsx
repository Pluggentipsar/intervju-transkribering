import {
  HeroSection,
  HowItWorksSection,
  FeaturesSection,
  RecentJobsSection,
  QuickActionsSection,
} from "@/components/hero";

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <HowItWorksSection />
      <FeaturesSection />
      <RecentJobsSection />
      <QuickActionsSection />

      {/* Footer */}
      <footer className="py-12 bg-dark-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="text-center md:text-left">
              <p className="font-semibold text-white mb-1">TystText</p>
              <p className="text-gray-400 text-sm">
                Byggd med KB Whisper, WhisperX och KB-BERT
              </p>
            </div>
            <div className="flex items-center gap-6 text-sm text-gray-400">
              <a href="/jobs" className="hover:text-white transition-colors">
                Mina jobb
              </a>
              <a href="/anonymize" className="hover:text-white transition-colors">
                Avidentifiera
              </a>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}
