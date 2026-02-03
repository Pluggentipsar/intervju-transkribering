/**
 * Enhanced anonymization panel for additional GDPR protection.
 */

"use client";

import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { clsx } from "clsx";
import {
  ShieldPlus,
  Plus,
  Trash2,
  Play,
  CheckCircle,
  AlertCircle,
  Copy,
  Download,
  ListPlus,
  X,
  Save,
  FolderOpen,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { enhanceAnonymization, listTemplates, createTemplate, deleteTemplate } from "@/services/api";
import type {
  CustomWordItem,
  EnhancedAnonymizationRequest,
  EnhancedAnonymizationResponse,
  EnhancedSegment,
  WordTemplate,
} from "@/types";

interface EnhancedAnonymizationProps {
  jobId: string;
  hasNerAnonymization: boolean;
  className?: string;
  /** Callback when enhanced anonymization result changes */
  onHasEnhancedResult?: (hasResult: boolean) => void;
}

function formatTimestamp(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
  return `${minutes}:${secs.toString().padStart(2, "0")}`;
}

export function EnhancedAnonymization({
  jobId,
  hasNerAnonymization,
  className,
  onHasEnhancedResult,
}: EnhancedAnonymizationProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [useInstitutionPatterns, setUseInstitutionPatterns] = useState(true);
  const [useFormatPatterns, setUseFormatPatterns] = useState(true);
  const [sourceField, setSourceField] = useState<"text" | "anonymized_text">(
    hasNerAnonymization ? "anonymized_text" : "text"
  );
  const [customWords, setCustomWords] = useState<CustomWordItem[]>([]);
  const [newWord, setNewWord] = useState("");
  const [newReplacement, setNewReplacement] = useState("");
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [bulkText, setBulkText] = useState("");
  const [result, setResult] = useState<EnhancedAnonymizationResponse | null>(null);
  const [copied, setCopied] = useState(false);

  // Template state
  const [showTemplates, setShowTemplates] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [templateDescription, setTemplateDescription] = useState("");

  const queryClient = useQueryClient();

  // Fetch templates
  const { data: templatesData } = useQuery({
    queryKey: ["templates"],
    queryFn: listTemplates,
    enabled: showTemplates,
  });

  const mutation = useMutation({
    mutationFn: (request: EnhancedAnonymizationRequest) =>
      enhanceAnonymization(jobId, request),
    onSuccess: (data) => {
      setResult(data);
    },
  });

  // Save template mutation
  const saveTemplateMutation = useMutation({
    mutationFn: () =>
      createTemplate({
        name: templateName.trim(),
        description: templateDescription.trim() || undefined,
        words: customWords,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["templates"] });
      setShowSaveDialog(false);
      setTemplateName("");
      setTemplateDescription("");
    },
  });

  // Delete template mutation
  const deleteTemplateMutation = useMutation({
    mutationFn: deleteTemplate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["templates"] });
    },
  });

  // Load template
  const handleLoadTemplate = (template: WordTemplate) => {
    setCustomWords(template.words);
    setShowTemplates(false);
  };

  // Save template
  const handleSaveTemplate = () => {
    if (templateName.trim() && customWords.length > 0) {
      saveTemplateMutation.mutate();
    }
  };

  // Notify parent when result changes
  useEffect(() => {
    onHasEnhancedResult?.(result !== null);
  }, [result, onHasEnhancedResult]);

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

    const newItems: CustomWordItem[] = [];
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

  const handleRun = () => {
    mutation.mutate({
      use_institution_patterns: useInstitutionPatterns,
      use_format_patterns: useFormatPatterns,
      custom_patterns: [],
      custom_words: customWords,
      source_field: sourceField,
    });
  };

  const getFullText = () => {
    if (!result) return "";
    return result.segments
      .map((s) => {
        const speaker = s.speaker ? `[${s.speaker}]: ` : "";
        return `${speaker}${s.enhanced_anonymized_text || s.text}`;
      })
      .join("\n\n");
  };

  const handleCopy = async () => {
    const text = getFullText();
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const text = getFullText();
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `transcript-enhanced-${jobId}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className={clsx("bg-white rounded-xl border", className)}>
      {/* Header - always visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors rounded-xl"
      >
        <div className="flex items-center gap-3">
          <ShieldPlus className="w-5 h-5 text-amber-600" />
          <div className="text-left">
            <h3 className="font-medium text-gray-900">
              Förstärk avidentifiering
            </h3>
            <p className="text-sm text-gray-500">
              Extra skydd för GDPR - fånga skolor, sjukhus, personnummer mm.
            </p>
          </div>
        </div>
        <svg
          className={clsx(
            "w-5 h-5 text-gray-400 transition-transform",
            isExpanded && "rotate-180"
          )}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="px-4 pb-4 border-t">
          {/* Options */}
          <div className="py-4 space-y-4">
            {/* Source field */}
            {hasNerAnonymization && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Källtext
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="sourceField"
                      checked={sourceField === "anonymized_text"}
                      onChange={() => setSourceField("anonymized_text")}
                      className="text-primary-600"
                    />
                    <span className="text-sm">NER-avidentifierad text</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="sourceField"
                      checked={sourceField === "text"}
                      onChange={() => setSourceField("text")}
                      className="text-primary-600"
                    />
                    <span className="text-sm">Originaltext</span>
                  </label>
                </div>
              </div>
            )}

            {/* Pattern toggles */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={useInstitutionPatterns}
                  onChange={(e) => setUseInstitutionPatterns(e.target.checked)}
                  className="w-4 h-4 text-primary-600 rounded"
                />
                <div>
                  <p className="font-medium text-sm">Institutionsmönster</p>
                  <p className="text-xs text-gray-500">
                    Skolor, sjukhus, kommuner, företag, adresser
                  </p>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={useFormatPatterns}
                  onChange={(e) => setUseFormatPatterns(e.target.checked)}
                  className="w-4 h-4 text-primary-600 rounded"
                />
                <div>
                  <p className="font-medium text-sm">Formatmönster</p>
                  <p className="text-xs text-gray-500">
                    Personnummer, telefon, e-post, postnummer
                  </p>
                </div>
              </label>
            </div>

            {/* Custom words */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Egna ord att ersätta
                </label>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowTemplates(!showTemplates)}
                    className="text-xs text-primary-600 hover:text-primary-700 flex items-center gap-1"
                  >
                    <FolderOpen className="w-3.5 h-3.5" />
                    Mallar
                  </button>
                  {customWords.length > 0 && (
                    <button
                      onClick={() => setShowSaveDialog(true)}
                      className="text-xs text-green-600 hover:text-green-700 flex items-center gap-1"
                    >
                      <Save className="w-3.5 h-3.5" />
                      Spara som mall
                    </button>
                  )}
                  <button
                    onClick={() => setShowBulkImport(!showBulkImport)}
                    className="text-xs text-primary-600 hover:text-primary-700 flex items-center gap-1"
                  >
                    <ListPlus className="w-3.5 h-3.5" />
                    {showBulkImport ? "Dölj" : "Bulk"}
                  </button>
                </div>
              </div>

              {/* Template picker */}
              {showTemplates && (
                <div className="mb-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-blue-700">
                      Sparade mallar
                    </span>
                    <button
                      onClick={() => setShowTemplates(false)}
                      className="text-blue-400 hover:text-blue-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  {templatesData?.templates && templatesData.templates.length > 0 ? (
                    <div className="space-y-1 max-h-40 overflow-y-auto">
                      {templatesData.templates.map((template) => (
                        <div
                          key={template.id}
                          className="flex items-center justify-between p-2 bg-white rounded border hover:border-blue-300 transition-colors"
                        >
                          <button
                            onClick={() => handleLoadTemplate(template)}
                            className="flex-1 text-left"
                          >
                            <span className="text-sm font-medium text-gray-900">
                              {template.name}
                            </span>
                            <span className="text-xs text-gray-500 ml-2">
                              ({template.words.length} ord)
                            </span>
                            {template.description && (
                              <p className="text-xs text-gray-500 truncate">
                                {template.description}
                              </p>
                            )}
                          </button>
                          <button
                            onClick={() => deleteTemplateMutation.mutate(template.id)}
                            className="p-1 text-gray-400 hover:text-red-500 ml-2"
                            title="Ta bort mall"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-blue-600 text-center py-2">
                      Inga sparade mallar än. Lägg till ord och spara som mall.
                    </p>
                  )}
                </div>
              )}

              {/* Save template dialog */}
              {showSaveDialog && (
                <div className="mb-3 p-3 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-green-700">
                      Spara som mall
                    </span>
                    <button
                      onClick={() => setShowSaveDialog(false)}
                      className="text-green-400 hover:text-green-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <input
                    type="text"
                    placeholder="Mallnamn (t.ex. Kommun X)"
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 mb-2"
                  />
                  <input
                    type="text"
                    placeholder="Beskrivning (valfritt)"
                    value={templateDescription}
                    onChange={(e) => setTemplateDescription(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 mb-2"
                  />
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleSaveTemplate}
                    disabled={!templateName.trim() || saveTemplateMutation.isPending}
                    className="w-full bg-green-100 hover:bg-green-200 text-green-700 border-green-200"
                  >
                    <Save className="w-4 h-4 mr-1" />
                    {saveTemplateMutation.isPending ? "Sparar..." : `Spara ${customWords.length} ord`}
                  </Button>
                  {saveTemplateMutation.isError && (
                    <p className="text-xs text-red-600 mt-1">
                      {saveTemplateMutation.error instanceof Error
                        ? saveTemplateMutation.error.message
                        : "Kunde inte spara mallen"}
                    </p>
                  )}
                </div>
              )}

              {/* Bulk import section */}
              {showBulkImport && (
                <div className="mb-3 p-3 bg-gray-50 rounded-lg border">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-gray-600">
                      Klistra in flera ord
                    </span>
                    <button
                      onClick={() => setShowBulkImport(false)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <textarea
                    value={bulkText}
                    onChange={(e) => setBulkText(e.target.value)}
                    placeholder={"Kalle:[PERSON 1]\nLisa:[PERSON 2]\nStockholm:[STAD]"}
                    className="w-full h-24 px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none font-mono"
                  />
                  <p className="text-xs text-gray-500 mt-1 mb-2">
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
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  placeholder="Ord (t.ex. Kalle)"
                  value={newWord}
                  onChange={(e) => setNewWord(e.target.value)}
                  className="flex-1 px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
                <input
                  type="text"
                  placeholder="Ersättning (t.ex. [PERSON 3])"
                  value={newReplacement}
                  onChange={(e) => setNewReplacement(e.target.value)}
                  className="flex-1 px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
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
                <div className="space-y-1">
                  {customWords.map((item, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-lg text-sm"
                    >
                      <span>
                        <span className="font-medium">{item.word}</span>
                        {" → "}
                        <span className="text-amber-700">{item.replacement}</span>
                      </span>
                      <button
                        onClick={() => handleRemoveWord(index)}
                        className="text-gray-400 hover:text-red-500"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Run button */}
            <Button
              onClick={handleRun}
              loading={mutation.isPending}
              className="w-full"
            >
              <Play className="w-4 h-4 mr-2" />
              Kör förstärkt avidentifiering
            </Button>

            {/* Error */}
            {mutation.isError && (
              <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>
                  Något gick fel:{" "}
                  {mutation.error instanceof Error
                    ? mutation.error.message
                    : "Okänt fel"}
                </span>
              </div>
            )}

            {/* Results */}
            {result && (
              <div className="space-y-4">
                {/* Summary */}
                <div className="flex items-center gap-2 p-3 bg-green-50 text-green-700 rounded-lg text-sm">
                  <CheckCircle className="w-4 h-4 flex-shrink-0" />
                  <span>
                    Klart! {result.changes_count} av {result.segments.length}{" "}
                    segment ändrades.
                  </span>
                </div>

                {/* Export buttons */}
                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" onClick={handleCopy}>
                    {copied ? (
                      <CheckCircle className="w-4 h-4 mr-2 text-green-600" />
                    ) : (
                      <Copy className="w-4 h-4 mr-2" />
                    )}
                    {copied ? "Kopierat!" : "Kopiera text"}
                  </Button>
                  <Button variant="secondary" size="sm" onClick={handleDownload}>
                    <Download className="w-4 h-4 mr-2" />
                    Ladda ner
                  </Button>
                </div>

                {/* Preview */}
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">
                    Förhandsvisning
                  </h4>
                  <div className="max-h-[300px] overflow-y-auto border rounded-lg">
                    {result.segments.map((segment) => (
                      <div
                        key={segment.segment_index}
                        className="p-3 border-b last:border-b-0 hover:bg-gray-50"
                      >
                        <div className="flex items-start gap-3">
                          <span className="text-xs text-gray-400 font-mono whitespace-nowrap pt-0.5">
                            {formatTimestamp(segment.start_time)}
                          </span>
                          {segment.speaker && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">
                              {segment.speaker}
                            </span>
                          )}
                          <p className="flex-1 text-sm text-gray-800 leading-relaxed">
                            {segment.enhanced_anonymized_text || segment.text}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
