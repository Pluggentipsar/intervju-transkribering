"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { BackendStatusProvider } from "@/contexts/BackendStatusContext";
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
        <title>TystText | Transkribera & Avidentifiera</title>
        <meta name="description" content="TystText - Transkribera och avidentifiera intervjuer med KB Whisper. Sveriges bästa AI för svenska. Automatisk talaridentifiering och anonymisering." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      </head>
      <body className="min-h-screen bg-gray-50 antialiased">
        <QueryClientProvider client={queryClient}>
          <BackendStatusProvider>
            <Header />
            <main>
              {children}
            </main>
          </BackendStatusProvider>
        </QueryClientProvider>
      </body>
    </html>
  );
}
