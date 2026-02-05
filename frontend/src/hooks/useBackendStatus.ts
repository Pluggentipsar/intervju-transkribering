/**
 * Hook for checking backend connection status
 */

import { useState, useEffect, useCallback } from "react";
import { getSystemStatus } from "@/services/api";

export interface BackendStatus {
  connected: boolean;
  checking: boolean;
  error: string | null;
  lastChecked: Date | null;
  systemInfo: {
    gpu_available: boolean;
    gpu_name: string | null;
    recommended_compute_type: string;
  } | null;
}

const STORAGE_KEY = "tysttext_setup_complete";
const CHECK_INTERVAL = 5000; // 5 seconds when disconnected

export function useBackendStatus() {
  const [status, setStatus] = useState<BackendStatus>({
    connected: false,
    checking: true,
    error: null,
    lastChecked: null,
    systemInfo: null,
  });

  const checkConnection = useCallback(async () => {
    setStatus((prev) => ({ ...prev, checking: true }));

    try {
      const systemStatus = await getSystemStatus();
      setStatus({
        connected: true,
        checking: false,
        error: null,
        lastChecked: new Date(),
        systemInfo: {
          gpu_available: systemStatus.gpu_available,
          gpu_name: systemStatus.gpu_name,
          recommended_compute_type: systemStatus.recommended_compute_type,
        },
      });
      return true;
    } catch (err) {
      setStatus({
        connected: false,
        checking: false,
        error: "Kunde inte ansluta till backend",
        lastChecked: new Date(),
        systemInfo: null,
      });
      return false;
    }
  }, []);

  // Check if setup has been completed before
  const isSetupComplete = useCallback(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(STORAGE_KEY) === "true";
  }, []);

  const markSetupComplete = useCallback(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, "true");
    }
  }, []);

  const resetSetup = useCallback(() => {
    if (typeof window !== "undefined") {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  // Initial check and polling when disconnected
  useEffect(() => {
    checkConnection();

    // Poll for connection when disconnected
    const interval = setInterval(() => {
      if (!status.connected) {
        checkConnection();
      }
    }, CHECK_INTERVAL);

    return () => clearInterval(interval);
  }, [checkConnection, status.connected]);

  return {
    ...status,
    checkConnection,
    isSetupComplete,
    markSetupComplete,
    resetSetup,
  };
}
