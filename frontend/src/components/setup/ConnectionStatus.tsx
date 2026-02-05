"use client";

import { useState } from "react";
import {
  Wifi,
  WifiOff,
  Loader2,
  ChevronDown,
  RefreshCw,
  Settings,
} from "lucide-react";

interface ConnectionStatusProps {
  isConnected: boolean;
  isChecking: boolean;
  systemInfo?: {
    gpu_available: boolean;
    gpu_name: string | null;
    recommended_compute_type: string;
  } | null;
  onRetry: () => void;
  onOpenSetup: () => void;
}

export function ConnectionStatus({
  isConnected,
  isChecking,
  systemInfo,
  onRetry,
  onOpenSetup,
}: ConnectionStatusProps) {
  const [showDropdown, setShowDropdown] = useState(false);

  if (isConnected) {
    return (
      <div className="relative">
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className="flex items-center gap-1.5 text-sm text-green-700 bg-green-50 px-2.5 py-1.5 rounded-lg hover:bg-green-100 transition-colors"
        >
          <Wifi className="w-4 h-4" />
          <span className="hidden sm:inline">Ansluten</span>
          <ChevronDown className="w-3 h-3" />
        </button>

        {showDropdown && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setShowDropdown(false)}
            />
            <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border z-20 py-2">
              <div className="px-3 py-2 border-b">
                <p className="text-xs text-gray-500 uppercase tracking-wide">
                  Backend-status
                </p>
                <p className="text-sm font-medium text-green-700 flex items-center gap-1.5 mt-1">
                  <span className="w-2 h-2 bg-green-500 rounded-full" />
                  Ansluten till localhost:8000
                </p>
              </div>

              {systemInfo && (
                <div className="px-3 py-2 border-b">
                  <p className="text-xs text-gray-500">Beräkningsenhet</p>
                  <p className="text-sm font-medium">
                    {systemInfo.gpu_available
                      ? `GPU: ${systemInfo.gpu_name || "CUDA"}`
                      : "CPU"}
                  </p>
                </div>
              )}

              <button
                onClick={() => {
                  setShowDropdown(false);
                  onOpenSetup();
                }}
                className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
              >
                <Settings className="w-4 h-4" />
                Installationsguide
              </button>
            </div>
          </>
        )}
      </div>
    );
  }

  // Disconnected state
  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="flex items-center gap-1.5 text-sm text-amber-700 bg-amber-50 px-2.5 py-1.5 rounded-lg hover:bg-amber-100 transition-colors"
      >
        {isChecking ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <WifiOff className="w-4 h-4" />
        )}
        <span className="hidden sm:inline">
          {isChecking ? "Ansluter..." : "Ej ansluten"}
        </span>
        <ChevronDown className="w-3 h-3" />
      </button>

      {showDropdown && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setShowDropdown(false)}
          />
          <div className="absolute right-0 mt-2 w-72 bg-white rounded-lg shadow-lg border z-20 py-2">
            <div className="px-3 py-2 border-b">
              <p className="text-xs text-gray-500 uppercase tracking-wide">
                Backend-status
              </p>
              <p className="text-sm font-medium text-amber-700 flex items-center gap-1.5 mt-1">
                <span className="w-2 h-2 bg-amber-500 rounded-full" />
                Inte ansluten
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Starta backend-programmet för att använda TystText.
              </p>
            </div>

            <div className="p-2 space-y-1">
              <button
                onClick={() => {
                  onRetry();
                }}
                disabled={isChecking}
                className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 rounded flex items-center gap-2 disabled:opacity-50"
              >
                <RefreshCw
                  className={`w-4 h-4 ${isChecking ? "animate-spin" : ""}`}
                />
                Försök ansluta igen
              </button>
              <button
                onClick={() => {
                  setShowDropdown(false);
                  onOpenSetup();
                }}
                className="w-full px-3 py-2 text-left text-sm text-blue-600 hover:bg-blue-50 rounded flex items-center gap-2"
              >
                <Settings className="w-4 h-4" />
                Öppna installationsguiden
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
