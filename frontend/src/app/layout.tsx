"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { Header } from "@/components/layout/Header";
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
        <meta charSet="utf-8" />
        <title>TystText</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body className="min-h-screen bg-dark-950 text-gray-100 antialiased">
        <QueryClientProvider client={queryClient}>
          <Header />
          <main>
            {children}
          </main>
        </QueryClientProvider>
      </body>
    </html>
  );
}
