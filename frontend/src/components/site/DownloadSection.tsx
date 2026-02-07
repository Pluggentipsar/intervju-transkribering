import { Download, Monitor, Shield, ArrowRight } from "lucide-react";

export function DownloadSection() {
  return (
    <section id="download" className="py-24 bg-gradient-to-br from-dark-950 via-dark-900 to-dark-800 text-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary-500/10 border border-primary-500/20 rounded-full text-primary-300 text-sm mb-8">
          <Monitor className="w-4 h-4" />
          Windows-applikation
        </div>

        <h2 className="text-3xl md:text-4xl font-bold mb-6">
          Ladda ner TystText
        </h2>
        <p className="text-gray-300 text-lg max-w-2xl mx-auto mb-10">
          En enda fil. Dubbelklicka och börja transkribera. Ingen installation,
          inget konto, ingen data som lämnar din dator.
        </p>

        {/* Download card */}
        <div className="max-w-md mx-auto bg-white/5 border border-white/10 rounded-2xl p-8 mb-10">
          <div className="flex items-center justify-center gap-3 mb-6">
            <Download className="w-8 h-8 text-primary-400" />
            <div className="text-left">
              <p className="font-semibold text-lg">TystText för Windows</p>
              <p className="text-sm text-gray-400">Windows 10/11 — ca 2 GB</p>
            </div>
          </div>

          <a
            href="https://github.com/Pluggentipsar/intervju-transkribering/releases/tag/v1.0.0"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full px-8 py-4 bg-primary-500 hover:bg-primary-600 text-white font-semibold rounded-xl shadow-lg shadow-primary-500/25 transition-all hover:shadow-primary-500/40 text-lg"
          >
            Ladda ner
            <ArrowRight className="w-5 h-5" />
          </a>

          <p className="text-xs text-gray-500 mt-4">
            Första gången? Laddningen av AI-modeller tar några minuter vid första start.
          </p>
        </div>

        {/* Trust indicators */}
        <div className="flex flex-wrap justify-center gap-6 text-sm text-gray-400">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-green-400" />
            100% lokal — ingen data skickas
          </div>
          <div className="flex items-center gap-2">
            <Monitor className="w-4 h-4 text-primary-400" />
            Öppet och gratis
          </div>
        </div>
      </div>
    </section>
  );
}
