import { useState } from "react";
import { Pencil, FileText, CheckCircle2 } from "lucide-react";
import { ApplicantShell, GlassCard, StepProgress, PrimaryBtn, navy, blue, success } from "../shared";

const STEPS = ["Consent", "Your Business", "Documents", "Review"];

const summaryRows = [
  { label: "Business type", value: "Kiryana / General store", step: "business" },
  { label: "Years trading", value: "3 years", step: "business" },
  { label: "Monthly sales", value: "PKR 150,000", step: "business" },
  { label: "Amount requested", value: "PKR 300,000", step: "business" },
  { label: "Purpose", value: "Ramzan stock purchase", step: "business" },
];

const docRows = [
  { label: "CNIC (front)", file: "cnic.jpg" },
  { label: "Bank statement", file: "bank_statement.pdf" },
  { label: "Utility bill", file: "utility_bill.jpg" },
];

export default function ReviewSubmit({ onNav }: { onNav: (p: string) => void }) {
  const [confirmed, setConfirmed] = useState(false);

  return (
    <ApplicantShell onNav={onNav}>
      <StepProgress steps={STEPS} current={3} />

      <GlassCard className="p-6">
        <h2 className="text-xl font-bold mb-1" style={{ color: navy }}>Review your application</h2>
        <p className="text-sm mb-6" style={{ color: "#64748B" }}>
          Please confirm everything is correct before submitting.
        </p>

        {/* Business summary */}
        <div
          className="rounded-xl overflow-hidden border mb-5"
          style={{ borderColor: "rgba(15,23,42,0.07)" }}
        >
          <div className="px-4 py-2.5" style={{ background: "#F8FAFC" }}>
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#64748B" }}>
              Business Details
            </p>
          </div>
          {summaryRows.map((r, i) => (
            <div
              key={r.label}
              className="flex items-center justify-between px-4 py-3 border-t"
              style={{ borderColor: "rgba(15,23,42,0.06)" }}
            >
              <span className="text-sm" style={{ color: "#64748B" }}>{r.label}</span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold" style={{ color: navy }}>{r.value}</span>
                <button
                  onClick={() => onNav(r.step)}
                  className="flex items-center gap-1 text-xs font-medium hover:underline"
                  style={{ color: blue }}
                >
                  <Pencil size={11} /> Edit
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Documents */}
        <div
          className="rounded-xl overflow-hidden border mb-6"
          style={{ borderColor: "rgba(15,23,42,0.07)" }}
        >
          <div className="px-4 py-2.5" style={{ background: "#F8FAFC" }}>
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#64748B" }}>
              Documents
            </p>
          </div>
          {docRows.map((d) => (
            <div
              key={d.label}
              className="flex items-center gap-3 px-4 py-3 border-t"
              style={{ borderColor: "rgba(15,23,42,0.06)" }}
            >
              <FileText size={16} color="#94A3B8" />
              <div className="flex-1">
                <p className="text-sm font-medium" style={{ color: navy }}>{d.label}</p>
                <p className="text-xs" style={{ color: "#94A3B8" }}>{d.file}</p>
              </div>
              <CheckCircle2 size={16} color={success} />
            </div>
          ))}
        </div>

        {/* Final consent */}
        <label className="flex items-start gap-3 mb-6 cursor-pointer">
          <div className="mt-0.5">
            <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} className="sr-only" />
            <div
              className="w-5 h-5 rounded flex items-center justify-center transition-all"
              style={{ background: confirmed ? blue : "white", border: `2px solid ${confirmed ? blue : "#CBD5E1"}` }}
            >
              {confirmed && (
                <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                  <path d="M1 4l3 3 5-6" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </div>
          </div>
          <span className="text-sm" style={{ color: "#374151" }}>
            I confirm the information above is accurate and complete.
          </span>
        </label>

        <PrimaryBtn onClick={() => onNav("confirmation")} disabled={!confirmed}>
          Submit Application →
        </PrimaryBtn>
      </GlassCard>
    </ApplicantShell>
  );
}
