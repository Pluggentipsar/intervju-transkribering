"use client";

import { UploadForm } from "@/components/upload/UploadForm";

export default function HomePage() {
  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Transkribera din intervju
        </h1>
        <p className="text-gray-600">
          Ladda upp en ljudfil så transkriberar vi den med KB Whisper -
          Sveriges bästa AI-modell för svenska.
        </p>
      </div>

      <UploadForm />

      <div className="mt-12 grid grid-cols-3 gap-6 text-center">
        <div className="p-4">
          <div className="text-3xl mb-2">🎙️</div>
          <h3 className="font-medium text-gray-900">Hög noggrannhet</h3>
          <p className="text-sm text-gray-500">
            KB Whisper är tränad på svenska och ger bäst resultat
          </p>
        </div>
        <div className="p-4">
          <div className="text-3xl mb-2">👥</div>
          <h3 className="font-medium text-gray-900">Talaridentifiering</h3>
          <p className="text-sm text-gray-500">
            Automatisk identifiering av olika talare i intervjun
          </p>
        </div>
        <div className="p-4">
          <div className="text-3xl mb-2">📤</div>
          <h3 className="font-medium text-gray-900">Flexibel export</h3>
          <p className="text-sm text-gray-500">
            Exportera som text, markdown eller JSON
          </p>
        </div>
      </div>
    </div>
  );
}
