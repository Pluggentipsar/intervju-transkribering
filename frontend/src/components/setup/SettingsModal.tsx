"use client";

import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  X,
  Key,
  CheckCircle,
  AlertCircle,
  Loader2,
  ExternalLink,
  Save,
  Trash2,
  Users,
} from "lucide-react";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface HFTokenStatus {
  configured: boolean;
  token_preview: string | null;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const [mounted, setMounted] = useState(false);
  const [tokenInput, setTokenInput] = useState("");
  const [tokenStatus, setTokenStatus] = useState<HFTokenStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchTokenStatus = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/settings/hf-token");
      const data = await res.json();
      setTokenStatus(data);
    } catch {
      setTokenStatus(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchTokenStatus();
      setMessage(null);
      setTokenInput("");
    }
  }, [isOpen, fetchTokenStatus]);

  const handleSaveToken = async () => {
    if (!tokenInput.trim()) return;
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/v1/settings/hf-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: tokenInput.trim() }),
      });
      if (res.ok) {
        setMessage({ type: "success", text: "Token sparad!" });
        setTokenInput("");
        fetchTokenStatus();
      } else {
        const err = await res.json();
        setMessage({ type: "error", text: err.detail || "Kunde inte spara token" });
      }
    } catch {
      setMessage({ type: "error", text: "Kunde inte ansluta till backend" });
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveToken = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/v1/settings/hf-token", { method: "DELETE" });
      if (res.ok) {
        setMessage({ type: "success", text: "Token borttagen" });
        fetchTokenStatus();
      }
    } catch {
      setMessage({ type: "error", text: "Kunde inte ta bort token" });
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen || !mounted) return null;

  const modalContent = (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] overflow-y-auto"
      onClick={onClose}
    >
      <div className="min-h-full flex items-center justify-center p-4 pt-20 pb-4">
        <div
          className="bg-dark-800 rounded-3xl shadow-2xl max-w-xl w-full max-h-[80vh] overflow-hidden animate-fade-in flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="relative overflow-hidden bg-gradient-to-br from-dark-950 via-dark-900 to-dark-800 text-white p-6 flex-shrink-0">
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <div className="absolute -top-20 -right-20 w-48 h-48 bg-primary-500/20 rounded-full blur-3xl" />
            </div>
            <div className="relative flex items-start justify-between">
              <div>
                <h1 className="text-xl font-bold">Inställningar</h1>
                <p className="text-gray-400 text-sm mt-1">
                  Konfigurera talaridentifiering och HuggingFace-token
                </p>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 flex-1 overflow-y-auto space-y-6">
            {/* HF Token Status */}
            <div className="p-4 rounded-2xl border border-white/10 bg-dark-900/50">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-400 to-primary-500 flex items-center justify-center">
                  <Key className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">HuggingFace Token</h3>
                  {loading ? (
                    <p className="text-sm text-gray-400 flex items-center gap-1">
                      <Loader2 className="w-3 h-3 animate-spin" /> Kontrollerar...
                    </p>
                  ) : tokenStatus?.configured ? (
                    <p className="text-sm text-green-400 flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" /> Konfigurerad ({tokenStatus.token_preview})
                    </p>
                  ) : (
                    <p className="text-sm text-amber-400 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> Inte konfigurerad
                    </p>
                  )}
                </div>
              </div>

              {/* Token input */}
              <div className="flex gap-2">
                <input
                  type="password"
                  placeholder="hf_xxxxxxxxxxxxxxxxxxxxxxxx"
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                  className="flex-1 px-3 py-2 border border-white/20 rounded-lg text-sm bg-dark-800 text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  onKeyDown={(e) => e.key === "Enter" && handleSaveToken()}
                />
                <button
                  onClick={handleSaveToken}
                  disabled={saving || !tokenInput.trim()}
                  className="flex items-center gap-1.5 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50 transition-colors text-sm font-medium"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Spara
                </button>
                {tokenStatus?.configured && (
                  <button
                    onClick={handleRemoveToken}
                    disabled={saving}
                    className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                    title="Ta bort token"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              {message && (
                <p className={`text-sm mt-2 ${message.type === "success" ? "text-green-400" : "text-red-400"}`}>
                  {message.text}
                </p>
              )}
            </div>

            {/* Pyannote setup instructions */}
            <div className="p-4 rounded-2xl border border-blue-500/20 bg-blue-500/10">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                  <Users className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-white mb-2">
                    Aktivera talaridentifiering
                  </h3>
                  <p className="text-sm text-gray-400 mb-3">
                    För att identifiera vem som pratar behöver du:
                  </p>
                  <ol className="text-sm text-gray-300 list-decimal list-inside space-y-2 mb-3">
                    <li>
                      Skapa ett gratis konto på{" "}
                      <a
                        href="https://huggingface.co/join"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:underline inline-flex items-center gap-1"
                      >
                        HuggingFace <ExternalLink className="w-3 h-3" />
                      </a>
                    </li>
                    <li>
                      Godkänn användningsvillkoren för{" "}
                      <a
                        href="https://huggingface.co/pyannote/speaker-diarization-3.1"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:underline inline-flex items-center gap-1"
                      >
                        pyannote/speaker-diarization <ExternalLink className="w-3 h-3" />
                      </a>
                    </li>
                    <li>
                      Godkänn även{" "}
                      <a
                        href="https://huggingface.co/pyannote/segmentation-3.0"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:underline inline-flex items-center gap-1"
                      >
                        pyannote/segmentation-3.0 <ExternalLink className="w-3 h-3" />
                      </a>
                    </li>
                    <li>
                      Skapa en Access Token under{" "}
                      <a
                        href="https://huggingface.co/settings/tokens"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:underline inline-flex items-center gap-1"
                      >
                        kontoinställningar <ExternalLink className="w-3 h-3" />
                      </a>
                    </li>
                    <li>Klistra in token i faltet ovan och klicka Spara</li>
                  </ol>
                  <p className="text-xs text-blue-400 bg-blue-500/10 px-3 py-2 rounded-lg">
                    Utan token fungerar transkribering, men inte talaridentifiering.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-dark-900/50 border-t border-white/10 flex-shrink-0">
            <button
              onClick={onClose}
              className="w-full py-2.5 bg-dark-700 hover:bg-dark-600 text-gray-300 rounded-xl font-medium transition-colors text-sm"
            >
              Stäng
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
