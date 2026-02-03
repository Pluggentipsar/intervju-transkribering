"use client";

import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { clsx } from "clsx";
import Link from "next/link";
import {
  Shield,
  ShieldCheck,
  Play,
  Copy,
  Download,
  CheckCircle,
  AlertCircle,
  Plus,
  Trash2,
  Info,
  ArrowLeft,
  Sparkles,
  Lock,
  FileText,
  ListPlus,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { IndeterminateProgress } from "@/components/ui/ProgressBar";
import { anonymizeText, getAnonymizationStatus } from "@/services/api";
import type { TextAnonymizationRequest, NerEntityTypesConfig } from "@/types";

interface CustomWordEntry {
  word: string;
  replacement: string;
}

const DEFAULT_NER_ENTITY_TYPES: NerEntityTypesConfig = {
  persons: true,
  locations: true,
  organizations: true,
  dates: true,
  events: true,
};

export default function AnonymizePage() {
  const [inputText, setInputText] = useState("");
  const [useNer, setUseNer] = useState(true);
  const [nerEntityTypes, setNerEntityTypes] = useState<NerEntityTypesConfig>(DEFAULT_NER_ENTITY_TYPES);
  const [useInstitutionPatterns, setUseInstitutionPatterns] = useState(true);
  const [useFormatPatterns, setUseFormatPatterns] = useState(true);
  const [customWords, setCustomWords] = useState<CustomWordEntry[]>([]);
  const [newWord, setNewWord] = useState("");
  const [newReplacement, setNewReplacement] = useState("");
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [bulkText, setBulkText] = useState("");
  const [copied, setCopied] = useState(false);

  // Check if NER is available
  const { data: status } = useQuery({
    queryKey: ["anonymization-status"],
    queryFn: getAnonymizationStatus,
  });

  const mutation = useMutation({
    mutationFn: (request: TextAnonymizationRequest) => anonymizeText(request),
  });

  const handleAddWord = () => {
    if (newWord.trim() && newReplacement.trim()) {
      setCustomWords([
        ...customWords,
        { word: newWord.trim(), replacement: newReplacement.trim() },
      ]);
      setNewWord("");
      setNewReplacement("");
    }
  };

  const handleRemoveWord = (index: number) => {
    setCustomWords(customWords.filter((_, i) => i !== index));
  };

  const handleBulkImport = () => {
    if (!bulkText.trim()) return;

    // Parse bulk text: supports "word:replacement" or "word→replacement"
    // Separators: newline, comma, or semicolon
    const entries = bulkText
      .split(/[\n,;]+/)
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0);

    const newItems: CustomWordEntry[] = [];
    for (const entry of entries) {
      // Try different separators: ":", "→", " -> ", " - "
      const match = entry.match(/^(.+?)(?::|→|->| - )(.+)$/);
      if (match) {
        const word = match[1].trim();
        const replacement = match[2].trim();
        if (word && replacement) {
          newItems.push({ word, replacement });
        }
      }
    }

    if (newItems.length > 0) {
      setCustomWords([...customWords, ...newItems]);
      setBulkText("");
      setShowBulkImport(false);
    }
  };

  const handleAnonymize = () => {
    mutation.mutate({
      text: inputText,
      use_ner: useNer && (status?.ner_available ?? false),
      ner_entity_types: nerEntityTypes,
      use_institution_patterns: useInstitutionPatterns,
      use_format_patterns: useFormatPatterns,
      custom_patterns: [],
      custom_words: customWords.map((w) => [w.word, w.replacement]),
    });
  };

  const handleEntityTypeChange = (type: keyof NerEntityTypesConfig, checked: boolean) => {
    setNerEntityTypes((prev) => ({ ...prev, [type]: checked }));
  };

  const handleCopy = async () => {
    if (mutation.data) {
      await navigator.clipboard.writeText(mutation.data.anonymized_text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownload = () => {
    if (mutation.data) {
      const blob = new Blob([mutation.data.anonymized_text], {
        type: "text/plain;charset=utf-8",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "anonymized-text.txt";
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero header */}
      <div className="bg-gradient-to-br from-amber-900 via-amber-800 to-amber-700 text-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-24 pb-16">
          {/* Back link */}
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-amber-200 hover:text-white mb-8 transition-colors group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Tillbaka till start
          </Link>

          {/* Header content */}
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 bg-gradient-to-br from-amber-400 to-amber-600 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-500/25">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold mb-2">
                Avidentifiera text
              </h1>
              <p className="text-amber-200">
                Anonymisera känslig information med KB-BERT NER
              </p>
            </div>
          </div>

          {/* Feature pills */}
          <div className="flex flex-wrap gap-3 mt-8">
            <div className="flex items-center gap-2 px-4 py-2 bg-white/10 border border-white/20 rounded-full text-sm text-amber-100">
              <Sparkles className="w-4 h-4" />
              AI-driven NER
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-white/10 border border-white/20 rounded-full text-sm text-amber-100">
              <Lock className="w-4 h-4" />
              100% lokal
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-white/10 border border-white/20 rounded-full text-sm text-amber-100">
              <FileText className="w-4 h-4" />
              Exportera resultat
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 -mt-8 pb-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Input section */}
          <div className="space-y-6">
            {/* Text input card */}
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
              <div className="p-6">
                <label className="block text-sm font-semibold text-gray-900 mb-3">
                  Text att avidentifiera
                </label>
                <textarea
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Klistra in din text här..."
                  className="w-full h-64 px-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 resize-none transition-colors"
                />
                <div className="mt-2 text-xs text-gray-500 text-right">
                  {inputText.length} tecken
                </div>
              </div>
            </div>

            {/* Options card */}
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
              <div className="p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Avidentifieringsalternativ</h3>

                {/* NER toggle */}
                <div className="space-y-3">
                  <label
                    className={clsx(
                      "flex items-center gap-4 p-4 border rounded-xl cursor-pointer transition-all",
                      status?.ner_available
                        ? "hover:bg-amber-50 hover:border-amber-200"
                        : "opacity-50 cursor-not-allowed bg-gray-50"
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={useNer && (status?.ner_available ?? false)}
                      onChange={(e) => setUseNer(e.target.checked)}
                      disabled={!status?.ner_available}
                      className="w-5 h-5 text-amber-600 rounded border-gray-300 focus:ring-amber-500"
                    />
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">KB-BERT NER</p>
                      <p className="text-sm text-gray-500">
                        AI-modell som identifierar namn, platser, organisationer
                      </p>
                    </div>
                    {!status?.ner_available && (
                      <span className="text-xs text-amber-700 bg-amber-100 px-3 py-1 rounded-full font-medium">
                        Ej tillgänglig
                      </span>
                    )}
                  </label>

                  {/* NER Entity Type Selection */}
                  {useNer && status?.ner_available && (
                    <div className="ml-9 pl-4 border-l-2 border-amber-200 space-y-2 py-2">
                      <p className="text-xs font-medium text-gray-600 mb-2">Välj entitetstyper:</p>
                      {[
                        { key: "persons" as const, label: "Personnamn", desc: "Namn på personer" },
                        { key: "locations" as const, label: "Platser", desc: "Geografiska platser" },
                        { key: "organizations" as const, label: "Organisationer", desc: "Företag, myndigheter" },
                        { key: "dates" as const, label: "Datum/tid", desc: "Tidsuttryck" },
                        { key: "events" as const, label: "Händelser", desc: "Namngivna händelser" },
                      ].map((item) => (
                        <label
                          key={item.key}
                          className="flex items-center gap-3 p-2 rounded-lg hover:bg-amber-50 cursor-pointer transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={nerEntityTypes[item.key]}
                            onChange={(e) => handleEntityTypeChange(item.key, e.target.checked)}
                            className="w-4 h-4 text-amber-600 rounded border-gray-300 focus:ring-amber-500"
                          />
                          <span className="text-sm font-medium text-gray-700">{item.label}</span>
                          <span className="text-xs text-gray-400">— {item.desc}</span>
                        </label>
                      ))}
                    </div>
                  )}

                  {/* Institution patterns */}
                  <label className="flex items-center gap-4 p-4 border rounded-xl cursor-pointer hover:bg-amber-50 hover:border-amber-200 transition-all">
                    <input
                      type="checkbox"
                      checked={useInstitutionPatterns}
                      onChange={(e) => setUseInstitutionPatterns(e.target.checked)}
                      className="w-5 h-5 text-amber-600 rounded border-gray-300 focus:ring-amber-500"
                    />
                    <div>
                      <p className="font-medium text-gray-900">Institutionsmönster</p>
                      <p className="text-sm text-gray-500">
                        Skolor, sjukhus, kommuner, företag, adresser
                      </p>
                    </div>
                  </label>

                  {/* Format patterns */}
                  <label className="flex items-center gap-4 p-4 border rounded-xl cursor-pointer hover:bg-amber-50 hover:border-amber-200 transition-all">
                    <input
                      type="checkbox"
                      checked={useFormatPatterns}
                      onChange={(e) => setUseFormatPatterns(e.target.checked)}
                      className="w-5 h-5 text-amber-600 rounded border-gray-300 focus:ring-amber-500"
                    />
                    <div>
                      <p className="font-medium text-gray-900">Formatmönster</p>
                      <p className="text-sm text-gray-500">
                        Personnummer, telefon, e-post, postnummer
                      </p>
                    </div>
                  </label>
                </div>

                {/* Custom words */}
                <div className="mt-6 pt-6 border-t">
                  <div className="flex items-center justify-between mb-3">
                    <p className="font-medium text-gray-900">Egna ord att ersätta</p>
                    <button
                      onClick={() => setShowBulkImport(!showBulkImport)}
                      className="text-xs text-amber-600 hover:text-amber-700 flex items-center gap-1"
                    >
                      <ListPlus className="w-3.5 h-3.5" />
                      {showBulkImport ? "Dölj bulk-import" : "Lägg till flera"}
                    </button>
                  </div>

                  {/* Bulk import section */}
                  {showBulkImport && (
                    <div className="mb-3 p-3 bg-amber-50 rounded-lg border border-amber-200">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-amber-700">
                          Klistra in flera ord
                        </span>
                        <button
                          onClick={() => setShowBulkImport(false)}
                          className="text-amber-400 hover:text-amber-600"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      <textarea
                        value={bulkText}
                        onChange={(e) => setBulkText(e.target.value)}
                        placeholder={"Kalle:[PERSON 1]\nLisa:[PERSON 2]\nStockholm:[STAD]"}
                        className="w-full h-24 px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 resize-none font-mono bg-white"
                      />
                      <p className="text-xs text-amber-600 mt-1 mb-2">
                        Format: ord:ersättning (ett per rad, eller separera med komma/semikolon)
                      </p>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={handleBulkImport}
                        disabled={!bulkText.trim()}
                        className="w-full"
                      >
                        <ListPlus className="w-4 h-4 mr-1" />
                        Importera
                      </Button>
                    </div>
                  )}

                  {/* Single word input */}
                  <div className="flex gap-2 mb-3">
                    <input
                      type="text"
                      placeholder="Ord"
                      value={newWord}
                      onChange={(e) => setNewWord(e.target.value)}
                      className="flex-1 px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors"
                    />
                    <input
                      type="text"
                      placeholder="Ersättning"
                      value={newReplacement}
                      onChange={(e) => setNewReplacement(e.target.value)}
                      className="flex-1 px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddWord();
                        }
                      }}
                    />
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={handleAddWord}
                      disabled={!newWord.trim() || !newReplacement.trim()}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  {customWords.length > 0 && (
                    <div className="space-y-2">
                      {customWords.map((item, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between px-4 py-2 bg-amber-50 rounded-lg text-sm"
                        >
                          <span>
                            <span className="font-medium text-gray-900">{item.word}</span>
                            <span className="mx-2 text-gray-400">→</span>
                            <span className="text-amber-700 font-medium">{item.replacement}</span>
                          </span>
                          <button
                            onClick={() => handleRemoveWord(index)}
                            className="text-gray-400 hover:text-red-500 transition-colors p-1"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Anonymize button */}
              <div className="p-6 bg-gradient-to-r from-amber-50 to-white border-t">
                <Button
                  onClick={handleAnonymize}
                  loading={mutation.isPending}
                  disabled={!inputText.trim()}
                  className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 shadow-lg shadow-amber-500/25"
                  size="lg"
                >
                  <Play className="w-5 h-5 mr-2" />
                  Avidentifiera
                </Button>
              </div>
            </div>
          </div>

          {/* Output section */}
          <div className="space-y-6">
            {/* Output card */}
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
              <div className="p-6">
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm font-semibold text-gray-900">
                    Avidentifierad text
                  </label>
                  {mutation.data && (
                    <div className="flex gap-1">
                      <button
                        onClick={handleCopy}
                        className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                        title="Kopiera"
                      >
                        {copied ? (
                          <CheckCircle className="w-5 h-5 text-green-600" />
                        ) : (
                          <Copy className="w-5 h-5" />
                        )}
                      </button>
                      <button
                        onClick={handleDownload}
                        className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                        title="Ladda ner"
                      >
                        <Download className="w-5 h-5" />
                      </button>
                    </div>
                  )}
                </div>
                <div
                  className={clsx(
                    "w-full h-64 px-4 py-3 border rounded-xl text-sm overflow-y-auto whitespace-pre-wrap transition-colors",
                    mutation.data ? "bg-white border-green-200" : "bg-gray-50 border-gray-200"
                  )}
                >
                  {mutation.isPending ? (
                    <div className="flex flex-col items-center justify-center h-full gap-4">
                      <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center">
                        <Shield className="w-6 h-6 text-amber-600 animate-pulse" />
                      </div>
                      <div className="text-center">
                        <p className="text-gray-700 font-medium mb-2">Avidentifierar...</p>
                        <p className="text-sm text-gray-500 mb-4">Analyserar text med AI</p>
                        <IndeterminateProgress className="w-48 mx-auto" />
                      </div>
                    </div>
                  ) : mutation.data?.anonymized_text ? (
                    mutation.data.anonymized_text
                  ) : (
                    <span className="text-gray-400 italic">
                      Resultatet visas här efter avidentifiering...
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Error */}
            {mutation.isError && (
              <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 text-red-700 rounded-2xl">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm">
                  Något gick fel:{" "}
                  {mutation.error instanceof Error
                    ? mutation.error.message
                    : "Okänt fel"}
                </span>
              </div>
            )}

            {/* Results summary */}
            {mutation.data && (
              <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
                <div className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                      <ShieldCheck className="w-5 h-5 text-green-600" />
                    </div>
                    <h3 className="font-semibold text-gray-900">Resultat</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-gray-50 rounded-xl">
                      <p className="text-sm text-gray-500 mb-1">NER-entiteter</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {mutation.data.ner_applied
                          ? mutation.data.entities_found
                          : "—"}
                      </p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-xl">
                      <p className="text-sm text-gray-500 mb-1">Mönstermatchningar</p>
                      <p className="text-2xl font-bold text-gray-900">{mutation.data.patterns_matched}</p>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t">
                    <p className="text-xs font-medium text-gray-500 mb-3">Använda metoder:</p>
                    <div className="flex flex-wrap gap-2">
                      {mutation.data.patterns_applied.ner && (
                        <span className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg text-sm font-medium">
                          KB-BERT NER
                        </span>
                      )}
                      {mutation.data.patterns_applied.institution_patterns && (
                        <span className="px-3 py-1.5 bg-amber-100 text-amber-700 rounded-lg text-sm font-medium">
                          Institutioner
                        </span>
                      )}
                      {mutation.data.patterns_applied.format_patterns && (
                        <span className="px-3 py-1.5 bg-purple-100 text-purple-700 rounded-lg text-sm font-medium">
                          Format
                        </span>
                      )}
                      {mutation.data.patterns_applied.custom_words && (
                        <span className="px-3 py-1.5 bg-green-100 text-green-700 rounded-lg text-sm font-medium">
                          Egna ord
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Info box */}
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-6">
              <div className="flex gap-4">
                <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Info className="w-5 h-5 text-amber-600" />
                </div>
                <div className="text-sm text-amber-800">
                  <p className="font-semibold mb-1">Observera</p>
                  <p>
                    Avidentifiering är ett hjälpmedel, inte en garanti. Granska
                    alltid texten manuellt innan delning. Kontext eller
                    kombinationer av uppgifter kan fortfarande avslöja identitet.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
