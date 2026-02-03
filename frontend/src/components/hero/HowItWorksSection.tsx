import { Upload, Cpu, FileText, ArrowRight } from "lucide-react";

const steps = [
  {
    icon: Upload,
    number: "01",
    title: "Ladda upp",
    description: "Dra och släpp din ljudfil. Vi stödjer MP3, WAV, M4A och fler format upp till 2 GB.",
    color: "from-primary-400 to-primary-500",
  },
  {
    icon: Cpu,
    number: "02",
    title: "AI-bearbetning",
    description: "KB Whisper transkriberar med hög noggrannhet för svenska. Talaridentifiering och avidentifiering körs automatiskt.",
    color: "from-primary-500 to-primary-600",
  },
  {
    icon: FileText,
    number: "03",
    title: "Exportera",
    description: "Hämta din transkription som text, markdown eller JSON. Alla filer sparas lokalt.",
    color: "from-primary-600 to-primary-700",
  },
];

export function HowItWorksSection() {
  return (
    <section className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="text-center mb-16">
          <span className="inline-block px-4 py-1.5 bg-primary-50 text-primary-700 text-sm font-medium rounded-full mb-4">
            Hur det fungerar
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Tre enkla steg till din transkription
          </h2>
          <p className="text-gray-600 max-w-xl mx-auto">
            Från ljudfil till färdig transkription på bara några minuter
          </p>
        </div>

        {/* Steps */}
        <div className="grid md:grid-cols-3 gap-8 lg:gap-12">
          {steps.map((step, index) => (
            <div key={index} className="relative group">
              {/* Connector line for desktop */}
              {index < steps.length - 1 && (
                <div className="hidden md:block absolute top-16 left-[60%] w-[80%] border-t-2 border-dashed border-primary-200" />
              )}

              <div className="relative p-8 bg-gray-50 rounded-2xl border border-gray-100 hover:border-primary-200 transition-all duration-300 hover:shadow-lg">
                {/* Number badge */}
                <span className="absolute -top-3 -right-3 w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center text-white text-sm font-bold shadow-lg">
                  {step.number}
                </span>

                {/* Icon */}
                <div className={`w-16 h-16 bg-gradient-to-br ${step.color} rounded-2xl flex items-center justify-center mb-6 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                  <step.icon className="w-8 h-8 text-white" />
                </div>

                {/* Content */}
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  {step.title}
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  {step.description}
                </p>
              </div>

              {/* Arrow for mobile */}
              {index < steps.length - 1 && (
                <div className="md:hidden flex justify-center my-4">
                  <ArrowRight className="w-6 h-6 text-primary-300 rotate-90" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
