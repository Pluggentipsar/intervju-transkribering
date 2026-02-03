"use client";

import { useMemo, useState } from "react";
import { Cloud, ChevronDown, ChevronUp, Hash } from "lucide-react";
import { clsx } from "clsx";
import type { Segment } from "@/types";

// Swedish stop words to filter out
const STOP_WORDS = new Set([
  // Articles & pronouns
  "en", "ett", "den", "det", "de", "dessa", "denna", "denne",
  "jag", "du", "han", "hon", "vi", "ni", "dem", "sig", "sin", "sitt", "sina",
  "min", "mitt", "mina", "din", "ditt", "dina", "vår", "vårt", "våra",
  "er", "ert", "era", "hans", "hennes", "deras", "ens",
  "man", "mig", "dig", "oss", "er",
  // Verbs
  "är", "var", "varit", "vara", "blir", "blev", "ha", "har", "hade", "haft",
  "kan", "kunde", "kunnat", "ska", "skall", "skulle", "vill", "ville",
  "måste", "får", "fick", "gör", "gjorde", "gjort", "göra",
  "kom", "kommer", "gå", "går", "gick", "ta", "tar", "tog", "tagit",
  "se", "ser", "såg", "sett", "säga", "säger", "sa", "sade", "sagt",
  "vet", "visste", "veta", "tror", "trodde", "tycker", "tyckte",
  "finns", "fanns", "finnas", "ge", "ger", "gav", "gett",
  // Conjunctions & prepositions
  "och", "eller", "men", "så", "för", "att", "om", "när", "där", "här",
  "som", "med", "av", "på", "i", "till", "från", "vid", "under", "över",
  "mellan", "genom", "efter", "innan", "utan", "mot", "hos", "ur",
  // Adverbs & others
  "inte", "nu", "då", "också", "bara", "även", "just", "redan", "aldrig",
  "alltid", "mycket", "lite", "mer", "mest", "mindre", "minst",
  "alla", "allt", "några", "något", "ingen", "inget", "inga",
  "varje", "annan", "annat", "andra", "samma", "egen", "eget", "egna",
  "hur", "vad", "var", "vem", "vilken", "vilket", "vilka", "varför",
  "ja", "nej", "okej", "ok", "mm", "hmm", "eh", "öh", "ah", "va",
  // Numbers
  "ett", "två", "tre", "fyra", "fem", "sex", "sju", "åtta", "nio", "tio",
  "första", "andra", "tredje",
  // Common filler
  "liksom", "typ", "alltså", "väl", "nog", "ju", "ändå", "dock",
]);

interface WordData {
  word: string;
  count: number;
  size: number;
}

interface WordCloudProps {
  segments: Segment[];
  showAnonymized?: boolean;
  className?: string;
}

export function WordCloud({ segments, showAnonymized = false, className }: WordCloudProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [maxWords, setMaxWords] = useState(50);

  const wordData = useMemo(() => {
    // Extract all text
    const allText = segments
      .map((s) => (showAnonymized && s.anonymized_text ? s.anonymized_text : s.text))
      .join(" ");

    // Tokenize and clean
    const words = allText
      .toLowerCase()
      .replace(/[^\wåäöÅÄÖ\s]/g, " ")
      .split(/\s+/)
      .filter((word) => word.length > 2 && !STOP_WORDS.has(word) && !/^\d+$/.test(word));

    // Count frequencies
    const counts = new Map<string, number>();
    for (const word of words) {
      counts.set(word, (counts.get(word) || 0) + 1);
    }

    // Sort by frequency and take top words
    const sorted = Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, maxWords);

    if (sorted.length === 0) return [];

    // Calculate sizes (normalize to 1-5 scale)
    const maxCount = sorted[0][1];
    const minCount = sorted[sorted.length - 1][1];
    const range = maxCount - minCount || 1;

    return sorted.map(([word, count]) => ({
      word,
      count,
      size: 1 + ((count - minCount) / range) * 4,
    }));
  }, [segments, showAnonymized, maxWords]);

  // Color palette for words
  const colors = [
    "text-blue-600",
    "text-emerald-600",
    "text-purple-600",
    "text-amber-600",
    "text-rose-600",
    "text-cyan-600",
    "text-indigo-600",
    "text-orange-600",
  ];

  if (wordData.length === 0) {
    return null;
  }

  return (
    <div className={clsx("bg-white rounded-xl border overflow-hidden", className)}>
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg flex items-center justify-center">
            <Cloud className="w-5 h-5 text-purple-600" />
          </div>
          <div className="text-left">
            <h3 className="font-medium text-gray-900">Ordmoln</h3>
            <p className="text-sm text-gray-500">
              {wordData.length} vanligaste orden
            </p>
          </div>
        </div>

        {/* Mini preview when collapsed */}
        {!isExpanded && (
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex gap-1.5">
              {wordData.slice(0, 5).map((w, i) => (
                <span
                  key={w.word}
                  className={clsx(
                    "px-2 py-0.5 rounded text-xs font-medium",
                    colors[i % colors.length].replace("text-", "bg-").replace("-600", "-100"),
                    colors[i % colors.length]
                  )}
                >
                  {w.word}
                </span>
              ))}
            </div>
            <ChevronDown className="w-5 h-5 text-gray-400" />
          </div>
        )}

        {isExpanded && <ChevronUp className="w-5 h-5 text-gray-400" />}
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="border-t">
          {/* Word count selector */}
          <div className="px-4 py-3 bg-gray-50 border-b flex items-center justify-between">
            <span className="text-sm text-gray-600">Antal ord:</span>
            <div className="flex gap-2">
              {[25, 50, 100].map((n) => (
                <button
                  key={n}
                  onClick={() => setMaxWords(n)}
                  className={clsx(
                    "px-3 py-1 text-sm rounded-lg transition-colors",
                    maxWords === n
                      ? "bg-purple-500 text-white"
                      : "bg-white border text-gray-600 hover:bg-gray-50"
                  )}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          {/* Word cloud visualization */}
          <div className="p-6">
            <div className="flex flex-wrap gap-2 justify-center items-center min-h-[200px]">
              {wordData.map((item, index) => (
                <span
                  key={item.word}
                  className={clsx(
                    "px-2 py-1 rounded-lg transition-all hover:scale-110 cursor-default",
                    colors[index % colors.length]
                  )}
                  style={{
                    fontSize: `${0.75 + item.size * 0.25}rem`,
                    opacity: 0.6 + (item.size / 5) * 0.4,
                  }}
                  title={`${item.word}: ${item.count} gånger`}
                >
                  {item.word}
                </span>
              ))}
            </div>
          </div>

          {/* Top words list */}
          <div className="px-4 pb-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500 mb-3 uppercase tracking-wide font-medium flex items-center gap-1">
                <Hash className="w-3 h-3" />
                Topp 10 mest frekventa ord
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {wordData.slice(0, 10).map((item, index) => (
                  <div
                    key={item.word}
                    className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border"
                  >
                    <span className="font-medium text-gray-900 truncate">
                      {item.word}
                    </span>
                    <span className={clsx("text-sm ml-2", colors[index % colors.length])}>
                      {item.count}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
