import { PlayCircle, BookOpen, MessageCircle, HelpCircle } from "lucide-react";

const guides = [
  {
    icon: PlayCircle,
    title: "Kom igang pa 5 minuter",
    description: "Se hur du laddar ner, startar appen och gor din forsta transkription.",
    tag: "Video",
    tagColor: "bg-primary-100 text-primary-700",
  },
  {
    icon: BookOpen,
    title: "Talaridentifiering",
    description: "Sa satter du upp HuggingFace-token for att automatiskt identifiera talare.",
    tag: "Guide",
    tagColor: "bg-amber-100 text-amber-700",
  },
  {
    icon: MessageCircle,
    title: "Avidentifiera intervjuer",
    description: "Steg-for-steg: hur du anonymiserar namn, platser och personnummer fran transkriptioner.",
    tag: "Guide",
    tagColor: "bg-amber-100 text-amber-700",
  },
];

const faq = [
  {
    q: "Varfor maste jag ladda ner ett program?",
    a: "TystText kor allt lokalt pa din dator for att skydda din data. Inga ljudfiler eller transkriptioner skickas nagonsin over internet. Det ar darfor du behover ladda ner programmet istallet for att anvanda en webbsida.",
  },
  {
    q: "Ar det sakert?",
    a: "Ja. All bearbetning sker lokalt — dina intervjuer lamnar aldrig din dator. Det ar darfor verktyget ar perfekt for kansliga intervjuer som behover avidentifieras.",
  },
  {
    q: "Vad behover jag for dator?",
    a: "Windows 10 eller 11. For snabbast resultat rekommenderas en dator med GPU (grafikkort), men det funkar aven med bara CPU — det tar bara langre tid.",
  },
  {
    q: "Vad ar talaridentifiering?",
    a: "Appen kan automatiskt skilja pa olika talare i en intervju. For att aktivera det behovs ett gratis konto pa HuggingFace — appen guidar dig genom det.",
  },
];

export function GuideSection() {
  return (
    <section id="guide" className="py-24 bg-white">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="text-center mb-16">
          <span className="inline-block px-4 py-1.5 bg-primary-50 text-primary-700 text-sm font-medium rounded-full mb-4">
            Guider
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Sa anvander du TystText
          </h2>
          <p className="text-gray-600 max-w-xl mx-auto">
            Guider och videoinstruktioner for att komma igang snabbt
          </p>
        </div>

        {/* Guide cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-20">
          {guides.map((guide, i) => (
            <div
              key={i}
              className="group p-6 bg-gray-50 rounded-2xl border border-gray-100 hover:border-primary-200 hover:shadow-lg transition-all cursor-pointer"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-primary-50 rounded-lg flex items-center justify-center group-hover:bg-primary-100 transition-colors">
                  <guide.icon className="w-5 h-5 text-primary-600" />
                </div>
                <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${guide.tagColor}`}>
                  {guide.tag}
                </span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">{guide.title}</h3>
              <p className="text-sm text-gray-600">{guide.description}</p>
            </div>
          ))}
        </div>

        {/* FAQ */}
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-gray-100 rounded-full text-gray-600 text-sm font-medium mb-4">
              <HelpCircle className="w-4 h-4" />
              Vanliga fragor
            </div>
          </div>

          <div className="space-y-4">
            {faq.map((item, i) => (
              <div key={i} className="p-6 bg-gray-50 rounded-xl border border-gray-100">
                <h3 className="font-semibold text-gray-900 mb-2">{item.q}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
