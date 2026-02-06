import { Shield, Users, Lock, Zap, Server, FileCheck } from "lucide-react";

const features = [
  {
    icon: Server,
    title: "100% lokal bearbetning",
    description: "All transkribering sker på din egen server. Ingen data skickas till externa tjänster.",
    gradient: "from-blue-500 to-blue-600",
  },
  {
    icon: Users,
    title: "Automatisk talaridentifiering",
    description: "Identifiera olika talare i intervjun med WhisperX och pyannote-teknologi.",
    gradient: "from-purple-500 to-purple-600",
  },
  {
    icon: Shield,
    title: "KB-BERT avidentifiering",
    description: "Ta bort känslig information som namn, platser, organisationer och personnummer.",
    gradient: "from-amber-500 to-amber-600",
  },
  {
    icon: Zap,
    title: "Optimerad för svenska",
    description: "KB Whisper är tränad på svensk data och ger markant bättre resultat än generella modeller.",
    gradient: "from-primary-500 to-primary-600",
  },
  {
    icon: Lock,
    title: "GDPR-vänlig",
    description: "Perfekt för forskningsdata och känslig information. Du behåller full kontroll.",
    gradient: "from-green-500 to-green-600",
  },
  {
    icon: FileCheck,
    title: "Flexibel export",
    description: "Exportera som ren text, formaterad markdown eller strukturerad JSON.",
    gradient: "from-rose-500 to-rose-600",
  },
];

export function FeaturesSection() {
  return (
    <section id="features" className="py-24 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="text-center mb-16">
          <span className="inline-block px-4 py-1.5 bg-primary-50 text-primary-700 text-sm font-medium rounded-full mb-4">
            Funktioner
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Byggd för svenska intervjuer
          </h2>
          <p className="text-gray-600 max-w-xl mx-auto">
            Specialanpassad för forskare, journalister och alla som arbetar med intervjumaterial
          </p>
        </div>

        {/* Features grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <div
              key={index}
              className="group p-6 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-xl hover:border-primary-100 transition-all duration-300"
            >
              {/* Icon */}
              <div className={`w-14 h-14 bg-gradient-to-br ${feature.gradient} rounded-xl flex items-center justify-center mb-5 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                <feature.icon className="w-7 h-7 text-white" />
              </div>

              {/* Content */}
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {feature.title}
              </h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
