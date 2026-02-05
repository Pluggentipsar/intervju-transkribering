"use client";

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";
import { useBackendStatus } from "@/hooks/useBackendStatus";
import { SetupWizard } from "@/components/setup";

interface BackendStatusContextValue {
  connected: boolean;
  checking: boolean;
  error: string | null;
  systemInfo: {
    gpu_available: boolean;
    gpu_name: string | null;
    recommended_compute_type: string;
  } | null;
  checkConnection: () => Promise<boolean>;
  openSetupWizard: () => void;
}

const BackendStatusContext = createContext<BackendStatusContextValue | null>(null);

export function useBackendStatusContext() {
  const context = useContext(BackendStatusContext);
  if (!context) {
    throw new Error("useBackendStatusContext must be used within BackendStatusProvider");
  }
  return context;
}

interface BackendStatusProviderProps {
  children: ReactNode;
}

export function BackendStatusProvider({ children }: BackendStatusProviderProps) {
  const {
    connected,
    checking,
    error,
    systemInfo,
    checkConnection,
    isSetupComplete,
    markSetupComplete,
  } = useBackendStatus();

  const [showSetupWizard, setShowSetupWizard] = useState(false);
  const [hasShownInitialSetup, setHasShownInitialSetup] = useState(false);

  // Auto-show wizard if not connected and setup not done (after initial check)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!connected && !checking && !isSetupComplete() && !hasShownInitialSetup) {
        setShowSetupWizard(true);
        setHasShownInitialSetup(true);
      }
    }, 2000);
    return () => clearTimeout(timer);
  }, [connected, checking, isSetupComplete, hasShownInitialSetup]);

  const openSetupWizard = useCallback(() => {
    setShowSetupWizard(true);
  }, []);

  const handleSetupComplete = useCallback(() => {
    markSetupComplete();
    setShowSetupWizard(false);
  }, [markSetupComplete]);

  const handleDismiss = useCallback(() => {
    // Allow dismiss only if connected or if user explicitly wants to close
    setShowSetupWizard(false);
    if (connected) {
      markSetupComplete();
    }
  }, [connected, markSetupComplete]);

  return (
    <BackendStatusContext.Provider
      value={{
        connected,
        checking,
        error,
        systemInfo,
        checkConnection,
        openSetupWizard,
      }}
    >
      {children}

      {showSetupWizard && (
        <SetupWizard
          isConnected={connected}
          isChecking={checking}
          onRetryConnection={checkConnection}
          onSetupComplete={handleSetupComplete}
          onDismiss={connected ? handleDismiss : undefined}
        />
      )}
    </BackendStatusContext.Provider>
  );
}
