import { useState } from "react";
import { FileText, Landmark, Lightbulb } from "lucide-react";
import { ApplicantShell, GlassCard, StepProgress, PrimaryBtn, SecondaryBtn, navy, blue } from "../shared";

const STEPS = ["Consent", "Your Business", "Documents", "Review"];

export default function Consent({ onNav }: { onNav: (p: string) => void }) {
  const [checked, setChecked] = useState(false);

  return (
    <ApplicantShell onNav={onNav}>
      <StepProgress steps={STEPS} current={0} />

      <GlassCard className="p-6">
        <h2 className="text-xl font-bold mb-2" style={{ color: navy }}>Before we start</h2>
        <p className="text-sm leading-relaxed mb-6" style={{ color: "#64748B" }}>
          Aitbaar uses AI to read your documents and recommend a decision to the bank. A qualified
          loan officer always makes the final call — AI never decides alone.
        </p>

        {/* Doc checklist */}
        <div
          className="rounded-xl p-4 mb-6"
          style={{ background: "#F8FAFC", border: "1px solid rgba(15,23,42,0.07)" }}
        >
          <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "#64748B" }}>
            You will need these 3 documents
          </p>
          <div className="space-y-3">
            {[
              {
                icon: <FileText size={18} color={blue} />,
                bg: "#EFF6FF",
                title: "CNIC (front)",
                desc: "Clear photo, all 4 corners visible",
              },
              {
                icon: <Landmark size={18} color="#059669" />,
                bg: "#ECFDF5",
                title: "Bank statement",
                desc: "Last 6 months — PDF or photos",
              },
              {
                icon: <Lightbulb size={18} color="#C9A227" />,
                bg: "#FFFBEB",
                title: "Utility bill",
                desc: "Electricity or gas, any recent month",
              },
            ].map((d) => (
              <div key={d.title} className="flex items-center gap-3">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: d.bg }}
                >
                  {d.icon}
                </div>
                <div>
                  <p className="text-sm font-semibold" style={{ color: navy }}>{d.title}</p>
                  <p className="text-xs" style={{ color: "#64748B" }}>{d.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Consent checkbox */}
        <label className="flex items-start gap-3 mb-6 cursor-pointer">
          <div className="mt-0.5">
            <input
              type="checkbox"
              checked={checked}
              onChange={(e) => setChecked(e.target.checked)}
              className="sr-only"
            />
            <div
              className="w-5 h-5 rounded flex items-center justify-center transition-all"
              style={{
                background: checked ? blue : "white",
                border: `2px solid ${checked ? blue : "#CBD5E1"}`,
              }}
            >
              {checked && (
                <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                  <path d="M1 4l3 3 5-6" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </div>
          </div>
          <span className="text-sm leading-snug" style={{ color: "#374151" }}>
            I consent to Aitbaar using AI to review my documents for this loan application.{" "}
            <button className="font-medium hover:underline" style={{ color: blue }}>
              Privacy details
            </button>
          </span>
        </label>

        <PrimaryBtn onClick={() => onNav("business")} disabled={!checked}>
          Continue →
        </PrimaryBtn>
        <div className="text-center mt-3">
          <SecondaryBtn onClick={() => onNav("landing")} className="border-0 text-sm" >
            Cancel
          </SecondaryBtn>
        </div>
      </GlassCard>
    </ApplicantShell>
  );
}
