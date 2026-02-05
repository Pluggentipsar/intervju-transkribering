"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  X,
  Mic,
  Users,
  Shield,
  Lock,
  Cpu,
  HardDrive,
  Monitor,
  AlertTriangle,
  ExternalLink,
  ChevronDown,
  Download,
  Github,
  Mail,
  Key,
} from "lucide-react";

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenSetup: () => void;
}

export function AboutModal({ isOpen, onClose, onOpenSetup }: AboutModalProps) {
  const [expandedSection, setExpandedSection] = useState<string | null>("about");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  if (!isOpen || !mounted) return null;

  const modalContent = (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] overflow-y-auto"
      onClick={onClose}
    >
      <div className="min-h-full flex items-center justify-center p-4 pt-20 pb-4">
        <div
          className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden animate-fade-in flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
        {/* Header */}
        <div className="relative overflow-hidden bg-gradient-to-br from-dark-950 via-dark-900 to-dark-800 text-white p-6 flex-shrink-0">
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -top-20 -right-20 w-48 h-48 bg-primary-500/20 rounded-full blur-3xl" />
            <div className="absolute -bottom-20 -left-20 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl" />
          </div>

          <div className="relative flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-gradient-to-br from-primary-400 to-primary-600 rounded-2xl flex items-center justify-center shadow-lg">
                <Mic className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">TystText</h1>
                <p className="text-gray-400 text-sm">
                  Transkribering & avidentifiering
                </p>
              </div>
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
        <div className="p-6 flex-1 overflow-y-auto space-y-3">
          {/* Om TystText */}
          <Section
            id="about"
            title="Om TystText"
            icon={Mic}
            isExpanded={expandedSection === "about"}
            onToggle={() => toggleSection("about")}
          >
            <p className="text-gray-600 mb-3">
              TystText är ett verktyg för att transkribera och avidentifiera intervjuer
              och ljudinspelningar. Allt kör lokalt på din dator - ingen data skickas
              till molnet.
            </p>
            <p className="text-gray-600">
              Perfekt för forskare, journalister och andra som behöver transkribera
              intervjuer med hög noggrannhet på svenska.
            </p>
          </Section>

          {/* Modeller */}
          <Section
            id="models"
            title="AI-modeller"
            icon={Cpu}
            isExpanded={expandedSection === "models"}
            onToggle={() => toggleSection("models")}
          >
            <div className="space-y-3">
              <ModelCard
                name="KB Whisper"
                description="Kungliga bibliotekets Whisper-modell, optimerad för svenska. Ger markant bättre resultat än vanlig Whisper för svenskt tal."
                link="https://huggingface.co/KBLab/kb-whisper-large"
              />
              <ModelCard
                name="WhisperX + pyannote"
                description="Avancerad talaridentifiering (diarization) som automatiskt identifierar vem som pratar när."
                link="https://github.com/m-bain/whisperX"
              />
              <ModelCard
                name="KB-BERT NER"
                description="Svensk NER-modell för att hitta och avidentifiera namn, platser, organisationer och annan känslig information."
                link="https://huggingface.co/KBLab/bert-base-swedish-cased-ner"
              />

              {/* HuggingFace Token explanation */}
              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                <div className="flex items-start gap-3">
                  <Key className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-blue-800 mb-2">
                      Varför behöver jag ett HuggingFace-token?
                    </p>
                    <p className="text-sm text-blue-700 mb-2">
                      Modellerna hämtas från{" "}
                      <a
                        href="https://huggingface.co"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline hover:text-blue-900"
                      >
                        HuggingFace
                      </a>
                      , en plattform för AI-modeller. Pyannote-modellen för talaridentifiering
                      kräver att du:
                    </p>
                    <ol className="text-sm text-blue-700 list-decimal list-inside space-y-1 mb-3">
                      <li>Skapar ett gratis konto på HuggingFace</li>
                      <li>
                        Godkänner användningsvillkoren för{" "}
                        <a
                          href="https://huggingface.co/pyannote/speaker-diarization-3.1"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline hover:text-blue-900"
                        >
                          pyannote/speaker-diarization
                        </a>
                      </li>
                      <li>Skapar en API-nyckel (Access Token) i dina kontoinställningar</li>
                    </ol>
                    <p className="text-xs text-blue-600">
                      Utan token fungerar transkribering, men inte talaridentifiering.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </Section>

          {/* GDPR & Integritet */}
          <Section
            id="privacy"
            title="Integritet & GDPR"
            icon={Shield}
            isExpanded={expandedSection === "privacy"}
            onToggle={() => toggleSection("privacy")}
            highlight
          >
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-3 bg-green-50 border border-green-200 rounded-xl">
                <Lock className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-green-800">100% lokal bearbetning</p>
                  <p className="text-sm text-green-700">
                    All data stannar på din dator. Inga ljudfiler eller transkriptioner
                    skickas till externa servrar.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-amber-800">Viktig information om avidentifiering</p>
                  <p className="text-sm text-amber-700 mb-2">
                    Avidentifieringen använder AI-modeller som kan missa känslig information.
                    AI är inte perfekt och kan:
                  </p>
                  <ul className="text-sm text-amber-700 list-disc list-inside space-y-1">
                    <li>Missa namn, platser eller andra identifierare</li>
                    <li>Felaktigt markera vanliga ord som personuppgifter</li>
                    <li>Missa kontext-beroende information</li>
                  </ul>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-xl">
                <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-red-800">Granska alltid resultatet</p>
                  <p className="text-sm text-red-700">
                    <strong>Du måste alltid granska avidentifierade texter manuellt</strong> innan
                    du delar dem. TystText tar inget ansvar för röjda personuppgifter.
                  </p>
                </div>
              </div>
            </div>
          </Section>

          {/* Installation */}
          <Section
            id="installation"
            title="Installation"
            icon={Download}
            isExpanded={expandedSection === "installation"}
            onToggle={() => toggleSection("installation")}
          >
            <p className="text-gray-600 mb-4">
              TystText består av två delar: ett webbgränssnitt (denna sida) och en
              backend som kör på din dator.
            </p>
            <button
              onClick={() => {
                onClose();
                onOpenSetup();
              }}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-primary-500 to-primary-600 text-white px-4 py-2.5 rounded-xl hover:from-primary-600 hover:to-primary-700 transition-all shadow-lg shadow-primary-500/25 font-medium text-sm"
            >
              <Download className="w-4 h-4" />
              Öppna installationsguiden
            </button>
          </Section>

          {/* Systemkrav */}
          <Section
            id="requirements"
            title="Systemkrav"
            icon={Monitor}
            isExpanded={expandedSection === "requirements"}
            onToggle={() => toggleSection("requirements")}
          >
            <div className="grid grid-cols-2 gap-3">
              <RequirementCard icon={Cpu} label="Python" value="3.11 eller 3.12" />
              <RequirementCard icon={HardDrive} label="Diskutrymme" value="~5 GB för modeller" />
              <RequirementCard icon={Monitor} label="RAM" value="8 GB minimum, 16 GB rekommenderat" />
              <RequirementCard icon={Cpu} label="GPU (valfritt)" value="NVIDIA med CUDA för snabbare bearbetning" />
            </div>
            <p className="text-xs text-gray-500 mt-3">
              Utan GPU tar transkribering längre tid men fungerar ändå.
            </p>
          </Section>

          {/* Support */}
          <Section
            id="support"
            title="Support & kontakt"
            icon={Users}
            isExpanded={expandedSection === "support"}
            onToggle={() => toggleSection("support")}
          >
            <div className="space-y-3">
              <a
                href="https://github.com/Pluggentipsar/intervju-transkribering/issues"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors group"
              >
                <Github className="w-5 h-5 text-gray-600" />
                <div className="flex-1">
                  <p className="font-medium text-gray-900 group-hover:text-primary-600">
                    Rapportera problem
                  </p>
                  <p className="text-sm text-gray-500">GitHub Issues</p>
                </div>
                <ExternalLink className="w-4 h-4 text-gray-400" />
              </a>
              <a
                href="https://github.com/Pluggentipsar/intervju-transkribering/wiki"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors group"
              >
                <Mic className="w-5 h-5 text-gray-600" />
                <div className="flex-1">
                  <p className="font-medium text-gray-900 group-hover:text-primary-600">
                    Dokumentation
                  </p>
                  <p className="text-sm text-gray-500">Guider och FAQ</p>
                </div>
                <ExternalLink className="w-4 h-4 text-gray-400" />
              </a>
            </div>
          </Section>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex-shrink-0">
          <p className="text-xs text-gray-500 text-center">
            Byggd med KB Whisper, WhisperX och KB-BERT
          </p>
        </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}

// Helper components

interface SectionProps {
  id: string;
  title: string;
  icon: React.ElementType;
  isExpanded: boolean;
  onToggle: () => void;
  highlight?: boolean;
  children: React.ReactNode;
}

function Section({ title, icon: Icon, isExpanded, onToggle, highlight, children }: SectionProps) {
  return (
    <div
      className={`rounded-2xl border transition-all ${
        highlight
          ? "border-amber-200 bg-amber-50/30"
          : isExpanded
          ? "border-primary-200 bg-primary-50/20"
          : "border-gray-100 bg-gray-50/50"
      }`}
    >
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 p-4 text-left"
      >
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center ${
            highlight
              ? "bg-amber-100"
              : isExpanded
              ? "bg-gradient-to-br from-primary-400 to-primary-500"
              : "bg-gray-100"
          }`}
        >
          <Icon
            className={`w-5 h-5 ${
              highlight
                ? "text-amber-600"
                : isExpanded
                ? "text-white"
                : "text-gray-500"
            }`}
          />
        </div>
        <span className="flex-1 font-semibold text-gray-900">{title}</span>
        <ChevronDown
          className={`w-5 h-5 text-gray-400 transition-transform ${
            isExpanded ? "rotate-180" : ""
          }`}
        />
      </button>
      {isExpanded && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
}

interface ModelCardProps {
  name: string;
  description: string;
  link: string;
}

function ModelCard({ name, description, link }: ModelCardProps) {
  return (
    <a
      href={link}
      target="_blank"
      rel="noopener noreferrer"
      className="block p-3 bg-white rounded-xl border border-gray-200 hover:border-primary-200 hover:shadow-md transition-all group"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-medium text-gray-900 group-hover:text-primary-600">
            {name}
          </p>
          <p className="text-sm text-gray-600 mt-1">{description}</p>
        </div>
        <ExternalLink className="w-4 h-4 text-gray-400 flex-shrink-0" />
      </div>
    </a>
  );
}

interface RequirementCardProps {
  icon: React.ElementType;
  label: string;
  value: string;
}

function RequirementCard({ icon: Icon, label, value }: RequirementCardProps) {
  return (
    <div className="flex items-center gap-3 p-3 bg-white rounded-xl border border-gray-200">
      <Icon className="w-5 h-5 text-gray-400" />
      <div>
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-sm font-medium text-gray-900">{value}</p>
      </div>
    </div>
  );
}
