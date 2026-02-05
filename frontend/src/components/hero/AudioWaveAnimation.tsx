"use client";

import { useState, useEffect } from "react";
import { clsx } from "clsx";

interface AudioWaveAnimationProps {
  className?: string;
}

// Text segment that can be anonymized
interface TextSegment {
  text: string;
  anonymized?: string;
  isAnonymizable: boolean;
}

// Parse text into segments with anonymizable parts
function parseText(text: string, anonymizableWords: { original: string; replacement: string }[]): TextSegment[] {
  const segments: TextSegment[] = [];
  let remaining = text;

  while (remaining.length > 0) {
    let found = false;
    for (const word of anonymizableWords) {
      const index = remaining.indexOf(word.original);
      if (index === 0) {
        segments.push({
          text: word.original,
          anonymized: word.replacement,
          isAnonymizable: true,
        });
        remaining = remaining.slice(word.original.length);
        found = true;
        break;
      } else if (index > 0) {
        segments.push({
          text: remaining.slice(0, index),
          isAnonymizable: false,
        });
        segments.push({
          text: word.original,
          anonymized: word.replacement,
          isAnonymizable: true,
        });
        remaining = remaining.slice(index + word.original.length);
        found = true;
        break;
      }
    }
    if (!found) {
      segments.push({
        text: remaining,
        isAnonymizable: false,
      });
      break;
    }
  }

  return segments;
}

// Animated text segment component
function AnimatedSegment({
  segment,
  isAnonymizing,
  animationDelay,
}: {
  segment: TextSegment;
  isAnonymizing: boolean;
  animationDelay: number;
}) {
  const [showAnonymized, setShowAnonymized] = useState(false);

  useEffect(() => {
    if (isAnonymizing && segment.isAnonymizable) {
      const timer = setTimeout(() => setShowAnonymized(true), animationDelay);
      return () => clearTimeout(timer);
    }
  }, [isAnonymizing, segment.isAnonymizable, animationDelay]);

  if (!segment.isAnonymizable) {
    return <span>{segment.text}</span>;
  }

  return (
    <span className="relative inline-block">
      {/* Original text with highlight effect */}
      <span
        className={clsx(
          "relative transition-all duration-500",
          showAnonymized ? "opacity-0 scale-95" : "opacity-100"
        )}
      >
        <span
          className={clsx(
            "absolute inset-0 -mx-1 -my-0.5 rounded transition-all duration-300",
            isAnonymizing && !showAnonymized
              ? "bg-amber-400/40 scale-105"
              : "bg-transparent scale-100"
          )}
        />
        <span className="relative">{segment.text}</span>
      </span>
      {/* Anonymized replacement */}
      <span
        className={clsx(
          "absolute left-0 top-0 transition-all duration-500 whitespace-nowrap",
          "px-1 -mx-1 rounded bg-amber-500/20 text-amber-300 font-medium",
          showAnonymized
            ? "opacity-100 scale-100"
            : "opacity-0 scale-105"
        )}
      >
        {segment.anonymized}
      </span>
    </span>
  );
}

// Typing animation with anonymization support
function TypewriterWithAnonymization({
  segments,
  typingDelay = 0,
  isAnonymizing,
  anonymizationBaseDelay,
}: {
  segments: TextSegment[];
  typingDelay?: number;
  isAnonymizing: boolean;
  anonymizationBaseDelay: number;
}) {
  const [displayedSegments, setDisplayedSegments] = useState<number>(0);
  const [currentCharIndex, setCurrentCharIndex] = useState(0);
  const [started, setStarted] = useState(false);

  const fullText = segments.map((s) => s.text).join("");

  useEffect(() => {
    const startTimer = setTimeout(() => setStarted(true), typingDelay);
    return () => clearTimeout(startTimer);
  }, [typingDelay]);

  useEffect(() => {
    if (!started) return;

    let charCount = 0;
    const interval = setInterval(() => {
      if (charCount <= fullText.length) {
        setCurrentCharIndex(charCount);

        // Calculate which segment we're in
        let totalChars = 0;
        for (let i = 0; i < segments.length; i++) {
          totalChars += segments[i].text.length;
          if (charCount <= totalChars) {
            setDisplayedSegments(i + 1);
            break;
          }
        }

        charCount++;
      } else {
        clearInterval(interval);
      }
    }, 18); // Faster typing speed

    return () => clearInterval(interval);
  }, [started, fullText, segments]);

  // Calculate which characters to show
  let charsRemaining = currentCharIndex;
  let anonymizableIndex = 0;

  return (
    <span>
      {segments.map((segment, segmentIndex) => {
        if (segmentIndex >= displayedSegments) return null;

        const charsToShow = Math.min(segment.text.length, charsRemaining);
        charsRemaining -= charsToShow;

        const isLastSegment = segmentIndex === displayedSegments - 1;
        const partialText =
          isLastSegment && charsToShow < segment.text.length
            ? segment.text.slice(0, charsToShow)
            : segment.text;

        // Calculate animation delay for anonymizable segments
        let delay = 0;
        if (segment.isAnonymizable) {
          delay = anonymizationBaseDelay + anonymizableIndex * 400;
          anonymizableIndex++;
        }

        if (isLastSegment && charsToShow < segment.text.length) {
          // Still typing this segment
          return (
            <span key={segmentIndex}>
              {partialText}
              <span className="animate-pulse">|</span>
            </span>
          );
        }

        return (
          <AnimatedSegment
            key={segmentIndex}
            segment={{ ...segment, text: partialText }}
            isAnonymizing={isAnonymizing}
            animationDelay={delay}
          />
        );
      })}
    </span>
  );
}

const anonymizableWords = [
  { original: "Joel Rangsjö", replacement: "[NAMN]" },
  { original: "Bäckadalsgymnasiet", replacement: "[GYMNASIESKOLA]" },
  { original: "Jönköping", replacement: "[STAD]" },
];

const transcriptLines = [
  {
    speaker: "Talare 1",
    text: "Hej Joel Rangsjö, välkommen hit!",
    color: "bg-primary-500/30",
  },
  {
    speaker: "Talare 2",
    text: "Tack! Jag kommer från Bäckadalsgymnasiet i Jönköping.",
    color: "bg-primary-400/30",
  },
  {
    speaker: "Talare 1",
    text: "Vad roligt, berätta mer om din bakgrund.",
    color: "bg-primary-500/30",
  },
];

export function AudioWaveAnimation({ className }: AudioWaveAnimationProps) {
  const [phase, setPhase] = useState<"wave" | "morphing" | "text" | "anonymizing">("wave");

  useEffect(() => {
    // Faster animations - start morphing after 1.5 seconds
    const morphTimer = setTimeout(() => setPhase("morphing"), 1500);
    // Show text after 2 seconds
    const textTimer = setTimeout(() => setPhase("text"), 2000);
    // Start anonymization after text is typed (around 5 seconds)
    const anonymizeTimer = setTimeout(() => setPhase("anonymizing"), 5500);

    return () => {
      clearTimeout(morphTimer);
      clearTimeout(textTimer);
      clearTimeout(anonymizeTimer);
    };
  }, []);

  // Generate wave bar heights with a wave pattern
  const generateHeight = (index: number) => {
    const baseHeight = 20;
    const amplitude = 28;
    const frequency = 0.4;
    return baseHeight + Math.sin(index * frequency) * amplitude;
  };

  const parsedLines = transcriptLines.map((line) => ({
    ...line,
    segments: parseText(line.text, anonymizableWords),
  }));

  return (
    <div className={clsx("relative h-52 flex items-center justify-center", className)}>
      {/* Wave bars - visible during "wave" and "morphing" phases */}
      <div
        className={clsx(
          "flex items-center justify-center gap-[3px] transition-all duration-1000",
          phase === "morphing" && "opacity-0 scale-y-0",
          (phase === "text" || phase === "anonymizing") && "hidden"
        )}
      >
        {Array.from({ length: 24 }).map((_, i) => (
          <div
            key={i}
            className="wave-bar w-1.5 bg-gradient-to-t from-primary-500 to-primary-300"
            style={{
              height: `${generateHeight(i)}px`,
            }}
          />
        ))}
      </div>

      {/* Transcribed text lines - revealed after morphing with typing effect */}
      <div
        className={clsx(
          "absolute inset-0 flex flex-col items-center justify-center gap-3 transition-all duration-700 px-4",
          phase !== "text" && phase !== "anonymizing"
            ? "opacity-0 translate-y-4"
            : "opacity-100 translate-y-0"
        )}
      >
        {/* Anonymization badge */}
        <div
          className={clsx(
            "absolute -top-2 right-4 sm:right-8 flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-500",
            phase === "anonymizing"
              ? "bg-amber-500/20 text-amber-300 opacity-100 translate-y-0"
              : "opacity-0 -translate-y-2"
          )}
        >
          <span className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
          Avidentifierar...
        </div>

        {parsedLines.map((line, index) => (
          <div
            key={index}
            className="flex items-center gap-3 text-reveal max-w-full"
            style={{ animationDelay: `${index * 0.3}s` }}
          >
            <span className={`w-12 sm:w-14 h-5 ${line.color} rounded flex-shrink-0`} />
            <span className="text-primary-300 text-xs sm:text-sm font-medium w-16 sm:w-20 flex-shrink-0">
              {line.speaker}:
            </span>
            <span className="text-white text-xs sm:text-sm">
              {(phase === "text" || phase === "anonymizing") && (
                <TypewriterWithAnonymization
                  segments={line.segments}
                  typingDelay={index * 500 + 200}
                  isAnonymizing={phase === "anonymizing"}
                  anonymizationBaseDelay={index * 200}
                />
              )}
            </span>
          </div>
        ))}

        {/* Completion indicator */}
        <div
          className={clsx(
            "absolute -bottom-1 left-1/2 -translate-x-1/2 flex items-center gap-2 text-xs transition-all duration-500",
            phase === "anonymizing" ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
          )}
        >
          <span className="text-gray-400">Känslig data ersatt med</span>
          <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 rounded font-medium">[TAGGAR]</span>
        </div>
      </div>
    </div>
  );
}
