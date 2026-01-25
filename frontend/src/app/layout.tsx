"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import "./globals.css";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5000,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <html lang="sv">
      <head>
        <title>Intervju-Transkribering</title>
        <meta name="description" content="Transkribera intervjuer med KB Whisper" />
      </head>
      <body>
        <QueryClientProvider client={queryClient}>
          <div className="min-h-screen bg-gray-50">
            <header className="bg-white shadow-sm border-b">
              <div className="max-w-7xl mx-auto px-4 py-4">
                <div className="flex items-center justify-between">
                  <a href="/" className="text-xl font-semibold text-gray-900">
                    Intervju-Transkribering
                  </a>
                  <nav className="flex gap-6">
                    <a
                      href="/"
                      className="text-gray-600 hover:text-gray-900 transition-colors"
                    >
                      Ny transkription
                    </a>
                    <a
                      href="/jobs"
                      className="text-gray-600 hover:text-gray-900 transition-colors"
                    >
                      Mina jobb
                    </a>
                  </nav>
                </div>
              </div>
            </header>
            <main className="max-w-7xl mx-auto px-4 py-8">{children}</main>
          </div>
        </QueryClientProvider>
      </body>
    </html>
  );
}
