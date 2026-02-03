import Link from "next/link";
import { Mic, Shield, ArrowRight } from "lucide-react";

const actions = [
  {
    icon: Mic,
    title: "Ny transkription",
    description: "Ladda upp en ljudfil och transkribera med KB Whisper. Talaridentifiering och avidentifiering inkluderat.",
    href: "/upload",
    gradient: "from-primary-500 to-primary-600",
    hoverGradient: "group-hover:from-primary-400 group-hover:to-primary-500",
  },
  {
    icon: Shield,
    title: "Avidentifiera text",
    description: "Har du redan en transkription? Klistra in text och anonymisera känslig information direkt.",
    href: "/anonymize",
    gradient: "from-amber-500 to-amber-600",
    hoverGradient: "group-hover:from-amber-400 group-hover:to-amber-500",
  },
];

export function QuickActionsSection() {
  return (
    <section className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Vad vill du göra?
          </h2>
          <p className="text-gray-600">
            Välj en snabbåtgärd för att komma igång
          </p>
        </div>

        {/* Actions grid */}
        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {actions.map((action, index) => (
            <Link
              key={index}
              href={action.href}
              className="group relative overflow-hidden p-8 rounded-2xl bg-gradient-to-br from-dark-900 to-dark-800 text-white transition-all duration-300 hover:shadow-2xl hover:-translate-y-1"
            >
              {/* Gradient overlay on hover */}
              <div className={`absolute inset-0 bg-gradient-to-br ${action.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-300`} />

              {/* Background decoration */}
              <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-white/5 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-500" />

              <div className="relative">
                {/* Icon */}
                <div className={`w-16 h-16 bg-gradient-to-br ${action.gradient} ${action.hoverGradient} rounded-2xl flex items-center justify-center mb-6 shadow-lg transition-all duration-300`}>
                  <action.icon className="w-8 h-8 text-white" />
                </div>

                {/* Content */}
                <h3 className="text-2xl font-semibold mb-3 flex items-center gap-3">
                  {action.title}
                  <ArrowRight className="w-6 h-6 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300" />
                </h3>
                <p className="text-gray-300 leading-relaxed">
                  {action.description}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
