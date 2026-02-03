/**
 * Floating AI prompt toolbar - copy transcript with pre-made prompts.
 */

"use client";

import { useState } from "react";
import { clsx } from "clsx";
import {
  Sparkles,
  X,
  FileText,
  ListChecks,
  CheckSquare,
  MessageSquareQuote,
  Accessibility,
  Newspaper,
  Users,
  HelpCircle,
  ExternalLink,
  Check,
} from "lucide-react";

interface PromptButton {
  id: string;
  label: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  borderColor: string;
  prompt: string;
}

const PROMPT_BUTTONS: PromptButton[] = [
  {
    id: "summary",
    label: "Sammanfatta",
    icon: <FileText className="w-5 h-5" />,
    color: "text-white",
    bgColor: "bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 shadow-md shadow-blue-500/20",
    borderColor: "border-transparent",
    prompt: `Sammanfatta följande transkription i 3-5 koncisa punkter. Fokusera på:
- Huvudsakliga ämnen som diskuterades
- Viktiga slutsatser eller insikter
- Eventuella meningsskiljaktigheter

Håll sammanfattningen kort och lättläst.

---
TRANSKRIPTION:
`,
  },
  {
    id: "protocol",
    label: "Protokoll",
    icon: <ListChecks className="w-5 h-5" />,
    color: "text-white",
    bgColor: "bg-gradient-to-br from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 shadow-md shadow-purple-500/20",
    borderColor: "border-transparent",
    prompt: `Formatera följande transkription som ett formellt mötesprotokoll. Inkludera:

## Mötesprotokoll
- **Datum:** [extrahera om möjligt]
- **Närvarande:** [lista talare]

## Dagordning
[Identifiera huvudpunkter som diskuterades]

## Diskussion
[Sammanfatta varje punkt]

## Beslut
[Lista alla beslut som fattades]

## Åtgärder
[Lista uppgifter med ansvarig om nämnt]

---
TRANSKRIPTION:
`,
  },
  {
    id: "decisions",
    label: "Beslut",
    icon: <CheckSquare className="w-5 h-5" />,
    color: "text-white",
    bgColor: "bg-gradient-to-br from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 shadow-md shadow-green-500/20",
    borderColor: "border-transparent",
    prompt: `Extrahera alla beslut och åtgärdspunkter från följande transkription. För varje punkt, ange:

1. **Beslut/Åtgärd:** Vad som beslutades eller ska göras
2. **Ansvarig:** Vem som är ansvarig (om nämnt)
3. **Deadline:** När det ska vara klart (om nämnt)
4. **Kontext:** Kort bakgrund till beslutet

Om inga tydliga beslut fattades, ange det.

---
TRANSKRIPTION:
`,
  },
  {
    id: "quotes",
    label: "Citat",
    icon: <MessageSquareQuote className="w-5 h-5" />,
    color: "text-white",
    bgColor: "bg-gradient-to-br from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 shadow-md shadow-amber-500/20",
    borderColor: "border-transparent",
    prompt: `Identifiera de 5-10 viktigaste och mest intressanta citaten från följande transkription. För varje citat:

1. Skriv det exakta citatet inom citattecken
2. Ange vem som sa det (talare)
3. Förklara kort varför citatet är betydelsefullt

Välj citat som representerar huvudpoänger, viktiga insikter eller anmärkningsvärda uttalanden.

---
TRANSKRIPTION:
`,
  },
  {
    id: "easy-read",
    label: "Lättläst",
    icon: <Accessibility className="w-5 h-5" />,
    color: "text-white",
    bgColor: "bg-gradient-to-br from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 shadow-md shadow-teal-500/20",
    borderColor: "border-transparent",
    prompt: `Skriv om följande transkription på lättläst svenska. Följ dessa riktlinjer:

- Använd korta meningar (max 15 ord)
- Använd enkla, vardagliga ord
- Undvik facktermer - förklara dem om de måste användas
- Dela upp texten i korta stycken
- Använd punktlistor för att göra innehållet tydligare
- Behåll all viktig information

Målet är att texten ska kunna förstås av alla, oavsett läsförmåga.

---
TRANSKRIPTION:
`,
  },
  {
    id: "press",
    label: "Press",
    icon: <Newspaper className="w-5 h-5" />,
    color: "text-white",
    bgColor: "bg-gradient-to-br from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 shadow-md shadow-rose-500/20",
    borderColor: "border-transparent",
    prompt: `Skriv ett utkast till pressmeddelande baserat på följande transkription. Följ standardformat:

**RUBRIK** (fångande, max 10 ord)

**Ingress** (sammanfatta det viktigaste i 2-3 meningar)

**Brödtext** (utveckla med detaljer, citat, bakgrund)

**För mer information, kontakta:**
[Platshållare]

Tonen ska vara professionell och nyhetsartikelliknande.

---
TRANSKRIPTION:
`,
  },
  {
    id: "speakers",
    label: "Talare",
    icon: <Users className="w-5 h-5" />,
    color: "text-white",
    bgColor: "bg-gradient-to-br from-indigo-500 to-blue-600 hover:from-indigo-600 hover:to-blue-700 shadow-md shadow-indigo-500/20",
    borderColor: "border-transparent",
    prompt: `Analysera vad varje talare säger i följande transkription. För varje talare:

## [Talare X]
- **Huvudsakliga ståndpunkter:** Vad argumenterar de för?
- **Ton/Attityd:** Hur framstår de? (positiv, skeptisk, etc.)
- **Nyckelcitat:** 1-2 representativa uttalanden
- **Interaktion:** Hur förhåller de sig till andra talare?

Avsluta med en kort analys av eventuella motsättningar eller överenskommelser mellan talarna.

---
TRANSKRIPTION:
`,
  },
  {
    id: "questions",
    label: "Frågor",
    icon: <HelpCircle className="w-5 h-5" />,
    color: "text-white",
    bgColor: "bg-gradient-to-br from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 shadow-md shadow-orange-500/20",
    borderColor: "border-transparent",
    prompt: `Baserat på följande transkription, föreslå 5-10 uppföljningsfrågor som borde ställas. Kategorisera dem:

## Förtydligande frågor
(Saker som nämndes men inte förklarades tillräckligt)

## Fördjupningsfrågor
(Ämnen som kan utforskas vidare)

## Kritiska frågor
(Antaganden eller påståenden som bör ifrågasättas)

## Praktiska frågor
(Implementering, nästa steg, etc.)

---
TRANSKRIPTION:
`,
  },
];

const AI_LINKS = [
  { name: "Copilot", url: "https://copilot.microsoft.com/", color: "text-blue-600" },
  { name: "ChatGPT", url: "https://chat.openai.com/", color: "text-green-600" },
  { name: "Claude", url: "https://claude.ai/", color: "text-orange-600" },
];

interface AIPromptToolbarProps {
  /** The transcript text to include with prompts */
  transcriptText: string;
  /** Optional class name */
  className?: string;
}

export function AIPromptToolbar({ transcriptText, className }: AIPromptToolbarProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showLinks, setShowLinks] = useState(false);

  const handleCopy = async (button: PromptButton) => {
    const fullText = button.prompt + transcriptText;
    await navigator.clipboard.writeText(fullText);
    setCopiedId(button.id);
    setShowLinks(true);

    // Reset after 3 seconds
    setTimeout(() => {
      setCopiedId(null);
    }, 3000);
  };

  return (
    <div className={clsx("fixed bottom-6 right-6 z-50", className)}>
      {/* Success message with AI links */}
      {showLinks && copiedId && (
        <div className="absolute bottom-20 right-0 w-72 bg-white rounded-2xl shadow-2xl border p-4 animate-slide-up">
          <div className="flex items-center gap-2 text-green-600 mb-3">
            <Check className="w-5 h-5" />
            <span className="font-medium">Kopierat till urklipp!</span>
          </div>
          <p className="text-sm text-gray-600 mb-3">
            Klistra in i din AI-assistent:
          </p>
          <div className="flex gap-2">
            {AI_LINKS.map((link) => (
              <a
                key={link.name}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className={clsx(
                  "flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded-lg border text-sm font-medium transition-colors hover:bg-gray-50",
                  link.color
                )}
              >
                {link.name}
                <ExternalLink className="w-3 h-3" />
              </a>
            ))}
          </div>
          <button
            onClick={() => setShowLinks(false)}
            className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Expanded button grid */}
      {isExpanded && (
        <div className="absolute bottom-20 right-0 w-[420px] bg-white rounded-2xl shadow-2xl border p-6 animate-slide-up">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary-500" />
              AI-verktyg
            </h3>
            <button
              onClick={() => setIsExpanded(false)}
              className="text-gray-400 hover:text-gray-600 p-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <p className="text-sm text-gray-500 mb-5">
            Kopiera transkriptet med en färdig prompt, klistra sedan in i din AI-assistent.
          </p>

          <div className="grid grid-cols-2 gap-3">
            {PROMPT_BUTTONS.map((button) => (
              <button
                key={button.id}
                onClick={() => handleCopy(button)}
                className={clsx(
                  "flex items-center gap-3 p-4 rounded-xl border transition-all text-left transform hover:scale-[1.02] active:scale-[0.98]",
                  copiedId === button.id
                    ? "bg-gradient-to-br from-green-500 to-emerald-600 border-transparent shadow-md shadow-green-500/20"
                    : button.bgColor + " " + button.borderColor
                )}
              >
                <div className={clsx(
                  "w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0",
                  "bg-white/20 backdrop-blur-sm"
                )}>
                  <div className="text-white">
                    {copiedId === button.id ? <Check className="w-5 h-5" /> : button.icon}
                  </div>
                </div>
                <span className="text-sm font-semibold text-white">
                  {copiedId === button.id ? "Kopierat!" : button.label}
                </span>
              </button>
            ))}
          </div>

          <div className="mt-5 pt-4 border-t flex items-center justify-between">
            <p className="text-xs text-gray-400">
              💡 Öppna AI-assistenten i en ny flik först
            </p>
            <div className="flex gap-2">
              {AI_LINKS.map((link) => (
                <a
                  key={link.name}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-gray-500 hover:text-gray-700 underline"
                >
                  {link.name}
                </a>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Main toggle button */}
      <button
        onClick={() => {
          setIsExpanded(!isExpanded);
          setShowLinks(false);
        }}
        className={clsx(
          "w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-300",
          isExpanded
            ? "bg-gray-900 text-white rotate-0"
            : "bg-gradient-to-br from-primary-500 to-primary-600 text-white hover:shadow-xl hover:scale-105"
        )}
      >
        {isExpanded ? (
          <X className="w-6 h-6" />
        ) : (
          <Sparkles className="w-6 h-6" />
        )}
      </button>
    </div>
  );
}
