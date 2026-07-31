import { ArrowRight, ClipboardList, Lock, Zap, MessageCircle } from "lucide-react";
import { AitbaarLogo, LangToggle, navy, blue, pageBg } from "../shared";

export default function Landing({ onNav }: { onNav: (p: string) => void }) {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: pageBg, fontFamily: "Inter, sans-serif" }}>
      {/* Nav */}
      <header
        className="flex items-center justify-between px-5 py-3 border-b"
        style={{
          background: "rgba(255,255,255,0.9)",
          backdropFilter: "blur(10px)",
          borderColor: "rgba(15,23,42,0.06)",
        }}
      >
        <AitbaarLogo />
        <LangToggle />
      </header>

      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center px-5 py-16 text-center max-w-2xl mx-auto">
        {/* Emblem */}
        <div
          className="w-20 h-20 rounded-full flex items-center justify-center text-white text-3xl font-bold shadow-lg mb-8"
          style={{
            background: `linear-gradient(135deg, ${navy}, ${blue})`,
            boxShadow: `0 8px 32px rgba(30,136,229,0.35)`,
          }}
        >
          A
        </div>

        <div
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold mb-6"
          style={{ background: "#EFF6FF", color: blue }}
        >
          <Zap size={12} />
          UBL × Aitbaar — AI in Banking
        </div>

        <h1 className="text-4xl font-bold leading-tight mb-4" style={{ color: navy }}>
          Apna karobar,{" "}
          <span style={{ color: blue }}>apna aitbaar.</span>
        </h1>
        <p className="text-lg mb-3" style={{ color: "#64748B" }}>
          Get a same-day SME loan decision —
        </p>
        <p className="text-lg mb-10" style={{ color: "#64748B" }}>
          no branch visit needed.
        </p>

        <button
          onClick={() => onNav("consent")}
          className="flex items-center justify-center gap-2 w-full max-w-xs py-4 rounded-2xl text-white font-semibold text-lg transition-all hover:scale-105"
          style={{
            background: `linear-gradient(135deg, ${blue}, ${navy})`,
            boxShadow: `0 6px 24px rgba(30,136,229,0.4)`,
          }}
        >
          Apply for a Loan
          <ArrowRight size={20} />
        </button>

        <button
          onClick={() => onNav("status")}
          className="mt-4 text-sm font-medium transition-colors hover:underline"
          style={{ color: blue }}
        >
          Already applied? Check your status
        </button>

        {/* WhatsApp alternative */}
        <div
          className="mt-8 flex items-center gap-2 px-4 py-3 rounded-xl border text-sm"
          style={{ borderColor: "rgba(37,211,102,0.3)", background: "#F0FFF4", color: "#065F46" }}
        >
          <MessageCircle size={16} color="#25D366" />
          <span>Prefer WhatsApp? Message us at <strong>+92 21 111-AITBAAR</strong></span>
        </div>
      </section>

      {/* Trust tiles */}
      <section className="px-5 pb-16 max-w-2xl mx-auto w-full">
        <div className="grid grid-cols-1 gap-4">
          {[
            {
              icon: <ClipboardList size={22} color={blue} />,
              title: "Full checklist up front",
              desc: "No surprise paperwork — we tell you exactly what you need before you start.",
              bg: "#EFF6FF",
            },
            {
              icon: <Lock size={22} color="#059669" />,
              title: "Your data stays private",
              desc: "Your documents are only used for this loan application. Nothing shared without consent.",
              bg: "#ECFDF5",
            },
            {
              icon: <Zap size={22} color="#C9A227" />,
              title: "Decision in as little as 24 hours",
              desc: "AI-assisted review means faster processing — a bank officer always makes the final call.",
              bg: "#FFFBEB",
            },
          ].map((t) => (
            <div
              key={t.title}
              className="flex items-start gap-4 p-4 rounded-2xl bg-white"
              style={{ border: "1px solid rgba(15,23,42,0.06)", boxShadow: "0 1px 4px rgba(10,45,110,0.05)" }}
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: t.bg }}>
                {t.icon}
              </div>
              <div>
                <p className="font-semibold text-sm" style={{ color: navy }}>{t.title}</p>
                <p className="text-xs mt-0.5 leading-relaxed" style={{ color: "#64748B" }}>{t.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="text-center py-4 px-5 text-xs border-t" style={{ color: "#94A3B8", borderColor: "rgba(15,23,42,0.06)" }}>
        A pilot in partnership with UBL. Your consent is required before any AI processing.
      </footer>
    </div>
  );
}
