import { useState } from "react";
import { CheckCircle2, Search, MessageCircle } from "lucide-react";
import { ApplicantShell, GlassCard, navy, blue, success, indigo } from "../shared";

type View = "submitted" | "tracker";

const stages = [
  { label: "Submitted", done: true, active: false },
  { label: "Under Review", done: true, active: false },
  { label: "Decision", done: false, active: true },
  { label: "Outcome", done: false, active: false },
];

export default function Confirmation({ onNav }: { onNav: (p: string) => void }) {
  const [view, setView] = useState<View>("submitted");
  const [ref, setRef] = useState("");

  if (view === "tracker") {
    return (
      <ApplicantShell onNav={onNav}>
        <GlassCard className="p-6">
          <h2 className="text-xl font-bold mb-4" style={{ color: navy }}>Application Status</h2>

          {/* Search */}
          <div
            className="flex items-center gap-2 px-4 py-3 rounded-xl border mb-6"
            style={{ borderColor: "rgba(15,23,42,0.1)" }}
          >
            <Search size={16} color="#94A3B8" />
            <input
              type="text"
              value={ref}
              onChange={(e) => setRef(e.target.value)}
              placeholder="Enter your reference number or phone"
              className="flex-1 text-sm outline-none bg-transparent"
              style={{ color: navy }}
            />
          </div>

          {/* Timeline */}
          <div className="mb-6">
            {stages.map((s, i) => (
              <div key={s.label} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-all"
                    style={{
                      background: s.done ? success : s.active ? blue : "#F1F5F9",
                      border: s.active ? `3px solid ${blue}` : "none",
                    }}
                  >
                    {s.done ? (
                      <CheckCircle2 size={18} color="white" />
                    ) : s.active ? (
                      <div className="w-3 h-3 rounded-full bg-white" style={{ animation: "pulse 1.5s ease-in-out infinite" }} />
                    ) : (
                      <div className="w-3 h-3 rounded-full" style={{ background: "#CBD5E1" }} />
                    )}
                  </div>
                  {i < stages.length - 1 && (
                    <div
                      className="w-0.5 flex-1 my-1"
                      style={{ background: s.done ? success : "#E2E8F0", minHeight: 28 }}
                    />
                  )}
                </div>
                <div className="pb-6">
                  <p
                    className="text-sm font-semibold"
                    style={{ color: s.done ? success : s.active ? blue : "#94A3B8" }}
                  >
                    {s.label}
                  </p>
                  {s.done && (
                    <p className="text-xs mt-0.5" style={{ color: "#64748B" }}>
                      Completed
                    </p>
                  )}
                  {s.active && (
                    <p className="text-xs mt-0.5" style={{ color: blue }}>
                      In progress…
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Status message */}
          <div
            className="rounded-xl p-4 border"
            style={{ background: "#EFF6FF", borderColor: "rgba(30,136,229,0.15)" }}
          >
            <div className="flex items-start gap-2">
              <MessageCircle size={16} color={blue} className="shrink-0 mt-0.5" />
              <p className="text-sm leading-relaxed" style={{ color: navy }}>
                Your application is being reviewed by a loan officer. We'll notify you here and on
                WhatsApp as soon as a decision is made.
              </p>
            </div>
          </div>

          <button
            onClick={() => setView("submitted")}
            className="mt-4 text-sm font-medium hover:underline"
            style={{ color: blue }}
          >
            ← Back
          </button>
        </GlassCard>

        <style>{`@keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.4; } }`}</style>
      </ApplicantShell>
    );
  }

  return (
    <ApplicantShell onNav={onNav}>
      <GlassCard className="p-8 flex flex-col items-center text-center">
        {/* Big green check */}
        <div
          className="w-20 h-20 rounded-full flex items-center justify-center mb-6 shadow-lg"
          style={{ background: `linear-gradient(135deg, ${success}, #047857)`, boxShadow: `0 8px 32px rgba(5,150,105,0.35)` }}
        >
          <CheckCircle2 size={36} color="white" />
        </div>

        <h2 className="text-2xl font-bold mb-3" style={{ color: navy }}>
          Application submitted!
        </h2>

        {/* Ref pill */}
        <div
          className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold mb-4"
          style={{ background: "#EFF6FF", color: blue }}
        >
          Reference:
          <span
            className="px-2.5 py-0.5 rounded-lg font-bold"
            style={{ background: blue, color: "white", letterSpacing: "0.05em" }}
          >
            AITB-2847
          </span>
        </div>

        <p className="text-sm leading-relaxed mb-6 max-w-xs" style={{ color: "#64748B" }}>
          You do not need to visit a branch. We'll update you here and on{" "}
          <span className="font-semibold" style={{ color: "#25D366" }}>WhatsApp</span>.
        </p>

        <button
          onClick={() => setView("tracker")}
          className="w-full py-3.5 rounded-xl font-semibold text-sm border transition-all hover:bg-blue-50 mb-3"
          style={{ borderColor: "rgba(30,136,229,0.3)", color: blue }}
        >
          Check status anytime
        </button>

        <button
          onClick={() => onNav("landing")}
          className="text-sm font-medium hover:underline"
          style={{ color: "#64748B" }}
        >
          Back to home
        </button>

        <p className="text-xs mt-6 px-4 py-2.5 rounded-xl" style={{ background: "#FFFBEB", color: "#92400E" }}>
          💡 Save your reference number: <strong>AITB-2847</strong>
        </p>
      </GlassCard>
    </ApplicantShell>
  );
}
