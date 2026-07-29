import { useState } from "react";
import { ArrowLeft, Download, X, Check, AlertTriangle, MessageCircle, Globe, FileText, Clock, Shield } from "lucide-react";
import { DashboardShell, GlassCard, navy, blue, success, warning, danger, indigo } from "../shared";

type DetailTab = "brief" | "documents" | "audit";

const factors = [
  { label: "Monthly sales consistency", score: 18, positive: true },
  { label: "Years trading", score: 12, positive: true },
  { label: "Bank statement mismatch", score: -22, positive: false },
  { label: "Business type risk", score: 6, positive: true },
  { label: "Requested vs income ratio", score: -9, positive: false },
];

const auditLog = [
  { time: "2026-01-12 09:14", actor: "Applicant", action: "Application submitted", detail: "Via WhatsApp channel, reference AITB-2847 generated." },
  { time: "2026-01-12 09:14", actor: "System", action: "Documents received", detail: "3 documents uploaded: cnic.jpg, bank_statement.pdf, utility_bill.jpg." },
  { time: "2026-01-12 09:16", actor: "System", action: "OCR processing completed", detail: "All documents parsed. CNIC fields extracted successfully." },
  { time: "2026-01-12 09:18", actor: "System", action: "Score computed", detail: "Credit score 72/100, Risk Tier B, Recommended limit PKR 280,000." },
  { time: "2026-01-12 09:19", actor: "System", action: "Anomaly flagged", detail: "Bank statement covers 3 months; applicant stated 6 months." },
  { time: "2026-01-12 10:05", actor: "Officer", action: "Application opened", detail: "Loan Officer Usman Khan opened the credit brief for review." },
  { time: "2026-01-12 10:22", actor: "Officer", action: "Additional docs requested", detail: "Officer requested remaining 3 months of bank statement via WhatsApp." },
];

const docItems = [
  {
    file: "cnic.jpg",
    type: "CNIC (front)",
    uploaded: "Jan 12, 09:14",
    fields: [
      { k: "Name", v: "Muhammad Imran" },
      { k: "CNIC Number", v: "42101-XXXXXXX-1" },
      { k: "Issue Date", v: "2019-04-12" },
      { k: "Expiry", v: "2029-04-11" },
    ],
    flag: null,
  },
  {
    file: "bank_statement.pdf",
    type: "Bank statement",
    uploaded: "Jan 12, 09:14",
    fields: [
      { k: "Bank", v: "Meezan Bank" },
      { k: "Period covered", v: "Oct 2025 – Dec 2025" },
      { k: "Avg. monthly credit", v: "PKR 142,500" },
      { k: "Closing balance", v: "PKR 28,300" },
    ],
    flag: "⚠ Statement covers 3 months, 6 required",
  },
  {
    file: "utility_bill.jpg",
    type: "Utility bill (KESC)",
    uploaded: "Jan 12, 09:14",
    fields: [
      { k: "Account holder", v: "Muhammad Imran" },
      { k: "Address", v: "Shop #4, Gulshan Market, Karachi" },
      { k: "Bill date", v: "Dec 2025" },
      { k: "Amount", v: "PKR 3,450" },
    ],
    flag: null,
  },
];

export default function ApplicationDetail({ onNav }: { onNav: (p: string) => void }) {
  const [tab, setTab] = useState<DetailTab>("brief");

  return (
    <DashboardShell onNav={onNav} active="queue">
      {/* Header row */}
      <div className="flex items-start justify-between mb-5">
        <div className="flex items-start gap-3">
          <button
            onClick={() => onNav("queue")}
            className="mt-1 w-9 h-9 rounded-xl border flex items-center justify-center hover:bg-gray-50 transition-colors"
            style={{ borderColor: "rgba(15,23,42,0.1)" }}
          >
            <ArrowLeft size={16} color={navy} />
          </button>
          <div>
            <div className="flex items-center gap-2.5 mb-0.5">
              <h1 className="text-xl font-bold" style={{ color: navy }}>Muhammad Imran</h1>
              <span
                className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase"
                style={{ background: "#EEF2FF", color: indigo }}
              >
                Scored
              </span>
            </div>
            <p className="text-sm" style={{ color: "#64748B" }}>
              Imran Kiryana Store &nbsp;·&nbsp; Requested: <strong style={{ color: navy }}>PKR 300,000</strong>
              &nbsp;·&nbsp; Ref: AITB-2847
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-medium hover:bg-gray-50 transition-colors"
            style={{ borderColor: "rgba(15,23,42,0.1)", color: "#64748B" }}
          >
            <Download size={14} /> Download Brief
          </button>
          <button
            className="flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-semibold transition-colors hover:bg-red-50"
            style={{ borderColor: danger, color: danger }}
          >
            <X size={14} /> Reject
          </button>
          <button
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:shadow-md"
            style={{ background: `linear-gradient(135deg, ${blue}, ${navy})` }}
          >
            <Check size={14} /> Approve
          </button>
        </div>
      </div>

      {/* Warning banner */}
      <div
        className="flex items-start gap-3 px-4 py-3 rounded-xl border mb-5"
        style={{ background: "#FFFBEB", borderColor: "rgba(201,162,39,0.3)" }}
      >
        <AlertTriangle size={16} color={warning} className="shrink-0 mt-0.5" />
        <p className="text-sm" style={{ color: "#92400E" }}>
          Bank statement shows <strong>3 months</strong> — applicant claimed 6 months on file.
        </p>
      </div>

      {/* AI Recommendation card */}
      <div
        className="flex items-start gap-4 px-5 py-4 rounded-xl border-l-4 mb-6"
        style={{
          background: "white",
          borderLeftColor: warning,
          border: "1px solid rgba(15,23,42,0.06)",
          borderLeft: `4px solid ${warning}`,
          boxShadow: "0 1px 8px rgba(10,45,110,0.06)",
        }}
      >
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#64748B" }}>
              AI recommendation
            </span>
            <span
              className="px-2 py-0.5 rounded text-xs font-bold uppercase"
              style={{ background: "#FEF2F2", color: danger }}
            >
              Policy override
            </span>
          </div>
          <p className="text-2xl font-black mb-2" style={{ color: warning }}>REVIEW</p>
          <ul className="space-y-1 mb-3">
            <li className="text-sm flex items-start gap-1.5" style={{ color: "#374151" }}>
              <span style={{ color: warning }}>•</span> Incomplete bank statement reduces income confidence below threshold
            </li>
            <li className="text-sm flex items-start gap-1.5" style={{ color: "#374151" }}>
              <span style={{ color: warning }}>•</span> Risk tier B qualifies, but data gap triggers manual verification requirement
            </li>
          </ul>
          <p className="text-xs italic" style={{ color: "#94A3B8" }}>
            Recommendation only — the officer makes the final decision.
          </p>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-[280px_1fr] gap-5">
        {/* Left: Applicant profile */}
        <GlassCard className="p-5 h-fit">
          <h3 className="text-sm font-semibold mb-4" style={{ color: navy }}>Applicant Profile</h3>
          {[
            { label: "Date Applied", value: "Jan 12, 2026" },
            { label: "Phone", value: "+92 300 ●●●●247" },
            { label: "City", value: "Karachi" },
            { label: "Channel", value: "WhatsApp", icon: <MessageCircle size={12} color="#25D366" /> },
            { label: "Consent", value: "Granted ✓", ok: true },
          ].map((r) => (
            <div
              key={r.label}
              className="flex items-center justify-between py-2.5 border-b last:border-0"
              style={{ borderColor: "rgba(15,23,42,0.06)" }}
            >
              <span className="text-xs" style={{ color: "#64748B" }}>{r.label}</span>
              <div className="flex items-center gap-1">
                {r.icon}
                <span
                  className="text-xs font-semibold"
                  style={{ color: r.ok ? success : navy }}
                >
                  {r.value}
                </span>
              </div>
            </div>
          ))}
        </GlassCard>

        {/* Right: tabs */}
        <GlassCard className="overflow-hidden">
          {/* Tab bar */}
          <div className="flex border-b" style={{ borderColor: "rgba(15,23,42,0.07)" }}>
            {([
              { id: "brief", label: "AI Credit Brief" },
              { id: "documents", label: "Documents" },
              { id: "audit", label: "Audit Trail" },
            ] as { id: DetailTab; label: string }[]).map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className="px-5 py-3.5 text-sm font-medium border-b-2 transition-all"
                style={{
                  borderBottomColor: tab === t.id ? blue : "transparent",
                  color: tab === t.id ? blue : "#64748B",
                }}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="p-6">
            {/* ── AI Credit Brief ── */}
            {tab === "brief" && (
              <>
                {/* Stat tiles */}
                <div className="grid grid-cols-3 gap-4 mb-6">
                  {[
                    { label: "Credit Score", value: "72 / 100", color: blue, bg: "#EFF6FF" },
                    { label: "Risk Tier", value: "B", color: blue, bg: "#EFF6FF" },
                    { label: "Recommended Limit", value: "PKR 280,000", color: navy, bg: "#F8FAFC" },
                  ].map((s) => (
                    <div key={s.label} className="rounded-xl p-4 text-center" style={{ background: s.bg }}>
                      <p className="text-xs font-medium uppercase tracking-wider mb-1" style={{ color: "#64748B" }}>{s.label}</p>
                      <p className="text-xl font-black" style={{ color: s.color }}>{s.value}</p>
                    </div>
                  ))}
                </div>

                {/* Rationale */}
                <div className="mb-5">
                  <h4 className="text-sm font-semibold mb-2" style={{ color: navy }}>Rationale</h4>
                  <p
                    className="text-sm leading-relaxed p-4 rounded-xl"
                    style={{ background: "#F8FAFC", color: "#374151" }}
                  >
                    Muhammad Imran operates a kiryana store with 3 years of trading history and consistent
                    monthly credits averaging PKR 142,500. His credit profile is moderately strong (Tier B),
                    however the bank statement only covers 3 of 6 required months, introducing uncertainty
                    in the income trend assessment. The AI model flags this data gap as the primary risk
                    factor warranting officer review before a final decision.
                  </p>
                </div>

                {/* SHAP factors */}
                <div>
                  <h4 className="text-sm font-semibold mb-3" style={{ color: navy }}>Key Impact Factors</h4>
                  <div className="space-y-3">
                    {factors.map((f) => (
                      <div key={f.label} className="flex items-center gap-3">
                        <span className="text-xs w-52 shrink-0" style={{ color: "#374151" }}>{f.label}</span>
                        <div className="flex-1 flex items-center">
                          <div className="flex-1 h-2 rounded-full flex justify-end pr-0.5" style={{ background: "#FEE2E2" }}>
                            {!f.positive && (
                              <div
                                className="h-2 rounded-full"
                                style={{
                                  width: `${Math.abs(f.score) * 3}%`,
                                  background: danger,
                                }}
                              />
                            )}
                          </div>
                          <div className="w-px h-4 mx-1" style={{ background: "#E2E8F0" }} />
                          <div className="flex-1 h-2 rounded-full flex justify-start pl-0.5" style={{ background: "#DCFCE7" }}>
                            {f.positive && (
                              <div
                                className="h-2 rounded-full"
                                style={{
                                  width: `${Math.abs(f.score) * 3}%`,
                                  background: success,
                                }}
                              />
                            )}
                          </div>
                        </div>
                        <span
                          className="text-xs font-bold w-10 text-right shrink-0"
                          style={{ color: f.positive ? success : danger }}
                        >
                          {f.positive ? "+" : ""}{f.score}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* ── Documents ── */}
            {tab === "documents" && (
              <div className="space-y-4">
                {docItems.map((doc) => (
                  <div
                    key={doc.file}
                    className="rounded-xl p-4 border"
                    style={{ borderColor: doc.flag ? "rgba(220,38,38,0.2)" : "rgba(15,23,42,0.07)" }}
                  >
                    <div className="flex items-start gap-3 mb-3">
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                        style={{ background: "#EFF6FF" }}
                      >
                        <FileText size={16} color={blue} />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold" style={{ color: navy }}>{doc.file}</p>
                        <p className="text-xs" style={{ color: "#64748B" }}>{doc.type} · {doc.uploaded}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 mb-2">
                      {doc.fields.map((f) => (
                        <div key={f.k} className="flex justify-between text-xs">
                          <span style={{ color: "#64748B" }}>{f.k}</span>
                          <span className="font-medium" style={{ color: navy }}>{f.v}</span>
                        </div>
                      ))}
                    </div>
                    {doc.flag && (
                      <div
                        className="flex items-center gap-2 text-xs mt-2 px-3 py-2 rounded-lg"
                        style={{ background: "#FEF2F2", color: danger }}
                      >
                        <AlertTriangle size={12} />
                        {doc.flag}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* ── Audit Trail ── */}
            {tab === "audit" && (
              <div className="relative">
                {auditLog.map((entry, i) => (
                  <div key={i} className="flex gap-4 mb-1">
                    <div className="flex flex-col items-center">
                      <div
                        className="w-3 h-3 rounded-full shrink-0 mt-1"
                        style={{
                          background:
                            entry.actor === "Officer" ? navy :
                            entry.actor === "Applicant" ? "#25D366" : blue,
                        }}
                      />
                      {i < auditLog.length - 1 && (
                        <div className="w-px flex-1 my-1" style={{ background: "#E2E8F0", minHeight: 24 }} />
                      )}
                    </div>
                    <div className="pb-4">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-xs font-bold" style={{ color: navy }}>{entry.actor}</span>
                        <span className="text-xs font-semibold" style={{ color: "#374151" }}>{entry.action}</span>
                        <span className="text-xs" style={{ color: "#94A3B8" }}>{entry.time}</span>
                      </div>
                      <p className="text-xs leading-relaxed" style={{ color: "#64748B" }}>{entry.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </GlassCard>
      </div>
    </DashboardShell>
  );
}
