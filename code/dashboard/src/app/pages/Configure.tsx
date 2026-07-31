import { useState } from "react";
import {
  Settings, CheckCircle2, AlertTriangle, Bell, Shield, Zap, Database, Globe, MessageCircle, RefreshCw, Save,
} from "lucide-react";
import { DashboardShell, GlassCard, navy, blue, success, warning, danger, indigo, waGreen } from "../shared";

type ConfigSection = "general" | "whatsapp" | "ai" | "notifications" | "security";

const sections: { id: ConfigSection; label: string; icon: React.ReactNode }[] = [
  { id: "general", label: "General", icon: <Settings size={15} /> },
  { id: "whatsapp", label: "WhatsApp Bot", icon: <MessageCircle size={15} /> },
  { id: "ai", label: "AI & Scoring", icon: <Zap size={15} /> },
  { id: "notifications", label: "Notifications", icon: <Bell size={15} /> },
  { id: "security", label: "Security", icon: <Shield size={15} /> },
];

function SectionLabel({ label }: { label: string }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-wider mb-3 mt-5 first:mt-0" style={{ color: "#94A3B8" }}>
      {label}
    </p>
  );
}

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!on)}
      className="relative w-11 h-6 rounded-full transition-colors shrink-0"
      style={{ background: on ? blue : "#CBD5E1" }}
    >
      <span
        className="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform"
        style={{ transform: on ? "translateX(22px)" : "translateX(2px)" }}
      />
    </button>
  );
}

function Row({
  label,
  sub,
  children,
}: {
  label: string;
  sub?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="flex items-center justify-between py-3.5 border-b last:border-0"
      style={{ borderColor: "rgba(15,23,42,0.06)" }}
    >
      <div>
        <p className="text-sm font-medium" style={{ color: navy }}>{label}</p>
        {sub && <p className="text-xs mt-0.5" style={{ color: "#94A3B8" }}>{sub}</p>}
      </div>
      {children}
    </div>
  );
}

const inputCls = "px-3 py-1.5 rounded-lg border text-sm outline-none focus:ring-2 ring-blue-200";
const inputStyle = { borderColor: "rgba(15,23,42,0.12)", color: navy };

export default function Configure({ onNav }: { onNav: (p: string) => void }) {
  const [section, setSection] = useState<ConfigSection>("general");

  const [aiEnabled, setAiEnabled] = useState(true);
  const [autoScore, setAutoScore] = useState(true);
  const [explainability, setExplainability] = useState(true);
  const [waBot, setWaBot] = useState(true);
  const [urdu, setUrdu] = useState(true);
  const [smsBackup, setSmsBackup] = useState(false);
  const [emailOfficer, setEmailOfficer] = useState(true);
  const [whatsappNotify, setWhatsappNotify] = useState(true);
  const [mfa, setMfa] = useState(true);
  const [auditLog, setAuditLog] = useState(true);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <DashboardShell onNav={onNav} active="configure">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: navy }}>Configuration</h1>
          <p className="text-sm mt-1" style={{ color: "#64748B" }}>Manage system settings, integrations, and AI behaviour</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-medium hover:bg-gray-50"
            style={{ borderColor: "rgba(15,23,42,0.1)", color: "#64748B" }}
          >
            <RefreshCw size={14} />
            Reset to defaults
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all"
            style={{ background: saved ? success : `linear-gradient(135deg, ${blue}, ${navy})` }}
          >
            <Save size={14} />
            {saved ? "Saved!" : "Save Changes"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-[220px_1fr] gap-5">
        {/* Sidebar */}
        <div className="space-y-1">
          {sections.map((s) => (
            <button
              key={s.id}
              onClick={() => setSection(s.id)}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm font-medium transition-all text-left"
              style={
                section === s.id
                  ? { background: "#EFF6FF", color: blue }
                  : { color: "#64748B" }
              }
            >
              {s.icon}
              {s.label}
            </button>
          ))}

          {/* Health widget */}
          <GlassCard className="p-4 mt-4">
            <p className="text-xs font-semibold mb-3" style={{ color: navy }}>System Health</p>
            {[
              { label: "API Gateway", ok: true },
              { label: "WhatsApp API", ok: true },
              { label: "AI / OCR Service", ok: true },
              { label: "SMS Fallback", ok: false },
            ].map((s) => (
              <div key={s.label} className="flex items-center justify-between mb-2 last:mb-0">
                <span className="text-xs" style={{ color: "#64748B" }}>{s.label}</span>
                <span className="text-xs font-medium flex items-center gap-1" style={{ color: s.ok ? success : "#94A3B8" }}>
                  {s.ok ? <CheckCircle2 size={11} /> : <AlertTriangle size={11} />}
                  {s.ok ? "OK" : "Standby"}
                </span>
              </div>
            ))}
          </GlassCard>
        </div>

        {/* Main panel */}
        <GlassCard className="p-6">

          {/* ── General ── */}
          {section === "general" && (
            <>
              <h3 className="font-semibold text-base mb-4" style={{ color: navy }}>General Settings</h3>
              <SectionLabel label="Organisation" />
              <Row label="Institution name" sub="Displayed on all applicant-facing screens">
                <input defaultValue="UBL × Aitbaar" className={inputCls} style={inputStyle} />
              </Row>
              <Row label="Pilot programme ID" sub="SBP regulatory reference">
                <input defaultValue="SBP-DLF-2026-0041" className={inputCls} style={inputStyle} />
              </Row>
              <Row label="Default language" sub="Applicant portal fallback">
                <select className={inputCls} style={{ ...inputStyle, background: "white" }}>
                  <option>English</option>
                  <option>اردو</option>
                </select>
              </Row>
              <SectionLabel label="Loan parameters" />
              <Row label="Minimum loan amount (PKR)" sub="Floor for all applications">
                <input defaultValue="50,000" className={inputCls} style={inputStyle} />
              </Row>
              <Row label="Maximum loan amount (PKR)" sub="Cap enforced at submission">
                <input defaultValue="2,000,000" className={inputCls} style={inputStyle} />
              </Row>
              <Row label="Bank statement minimum (months)" sub="Required for scoring">
                <input defaultValue="6" type="number" className={`${inputCls} w-20`} style={inputStyle} />
              </Row>
              <SectionLabel label="Portal" />
              <Row label="Applicant web portal" sub="Enable the web channel">
                <Toggle on={true} onChange={() => {}} />
              </Row>
              <Row label="Show WhatsApp alternative on landing" sub="Displays +92 21 111-AITBAAR prompt">
                <Toggle on={true} onChange={() => {}} />
              </Row>
            </>
          )}

          {/* ── WhatsApp ── */}
          {section === "whatsapp" && (
            <>
              <h3 className="font-semibold text-base mb-4" style={{ color: navy }}>WhatsApp Bot</h3>
              <SectionLabel label="Connection" />
              <Row label="WhatsApp Business Number" sub="Meta Cloud API linked number">
                <input defaultValue="+92 21 111-AITBAAR" className={inputCls} style={inputStyle} />
              </Row>
              <Row label="Business Account ID" sub="Meta Business Manager">
                <input defaultValue="UBL-AITBAAR-2026" className={inputCls} style={inputStyle} />
              </Row>
              <Row label="Bot enabled" sub="Pause to stop new sessions">
                <Toggle on={waBot} onChange={setWaBot} />
              </Row>
              <SectionLabel label="Conversation" />
              <Row label="Urdu language support" sub="Auto-detected from user input">
                <Toggle on={urdu} onChange={setUrdu} />
              </Row>
              <Row label="Idle session timeout (minutes)" sub="Sends reminder then closes">
                <input defaultValue="30" type="number" className={`${inputCls} w-20`} style={inputStyle} />
              </Row>
              <Row label="Max document retry attempts" sub="Per document slot">
                <input defaultValue="3" type="number" className={`${inputCls} w-20`} style={inputStyle} />
              </Row>
              <Row label="SMS fallback on failure" sub="Fallback channel if WA delivery fails">
                <Toggle on={smsBackup} onChange={setSmsBackup} />
              </Row>
              <SectionLabel label="Handoff" />
              <Row label="Escalate to officer after retries" sub="Auto-flags session in queue">
                <Toggle on={true} onChange={() => {}} />
              </Row>
              <Row label="STOP keyword unsubscribe" sub="Compliant opt-out handling">
                <Toggle on={true} onChange={() => {}} />
              </Row>
            </>
          )}

          {/* ── AI & Scoring ── */}
          {section === "ai" && (
            <>
              <h3 className="font-semibold text-base mb-4" style={{ color: navy }}>AI & Scoring</h3>
              <SectionLabel label="Model" />
              <Row label="AI processing enabled" sub="Disable for manual-only mode">
                <Toggle on={aiEnabled} onChange={setAiEnabled} />
              </Row>
              <Row label="OCR model" sub="Document extraction engine">
                <select className={inputCls} style={{ ...inputStyle, background: "white" }}>
                  <option>GPT-4o Vision</option>
                  <option>Azure Form Recognizer</option>
                </select>
              </Row>
              <Row label="Credit scoring model" sub="SHAP-explainable gradient boost">
                <select className={inputCls} style={{ ...inputStyle, background: "white" }}>
                  <option>Aitbaar v2.1 (XGBoost)</option>
                  <option>Aitbaar v1.9 (Baseline)</option>
                </select>
              </Row>
              <SectionLabel label="Automation" />
              <Row label="Auto-score on document upload" sub="Triggered after all 3 docs received">
                <Toggle on={autoScore} onChange={setAutoScore} />
              </Row>
              <Row label="Show explainability to officer" sub="SHAP factors in credit brief">
                <Toggle on={explainability} onChange={setExplainability} />
              </Row>
              <Row label="OCR confidence threshold (%)" sub="Below this → manual review flag">
                <input defaultValue="70" type="number" className={`${inputCls} w-20`} style={inputStyle} />
              </Row>
              <SectionLabel label="Risk tiers" />
              <div
                className="rounded-xl overflow-hidden border"
                style={{ borderColor: "rgba(15,23,42,0.07)" }}
              >
                {[
                  { tier: "A", range: "85 – 100", color: success, bg: "#ECFDF5" },
                  { tier: "B", range: "70 – 84", color: blue, bg: "#EFF6FF" },
                  { tier: "C", range: "55 – 69", color: warning, bg: "#FFFBEB" },
                  { tier: "D", range: "0 – 54", color: danger, bg: "#FEF2F2" },
                ].map((t) => (
                  <div
                    key={t.tier}
                    className="flex items-center justify-between px-4 py-2.5 border-b last:border-0"
                    style={{ borderColor: "rgba(15,23,42,0.06)" }}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black"
                        style={{ background: t.bg, color: t.color }}
                      >
                        {t.tier}
                      </span>
                      <span className="text-sm font-medium" style={{ color: navy }}>Tier {t.tier}</span>
                    </div>
                    <span className="text-sm" style={{ color: "#64748B" }}>Score {t.range}</span>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* ── Notifications ── */}
          {section === "notifications" && (
            <>
              <h3 className="font-semibold text-base mb-4" style={{ color: navy }}>Notifications</h3>
              <SectionLabel label="Officer alerts" />
              <Row label="Email officer on new application" sub="Sent when submission received">
                <Toggle on={emailOfficer} onChange={setEmailOfficer} />
              </Row>
              <Row label="Officer email address" sub="">
                <input defaultValue="officer@ubl.com.pk" className={inputCls} style={inputStyle} />
              </Row>
              <Row label="Alert on anomaly flag" sub="Triggered by AI data mismatch">
                <Toggle on={true} onChange={() => {}} />
              </Row>
              <SectionLabel label="Applicant updates" />
              <Row label="WhatsApp status updates" sub="Notify applicant at each stage">
                <Toggle on={whatsappNotify} onChange={setWhatsappNotify} />
              </Row>
              <Row label="Notify on: submission received" sub="">
                <Toggle on={true} onChange={() => {}} />
              </Row>
              <Row label="Notify on: decision made" sub="">
                <Toggle on={true} onChange={() => {}} />
              </Row>
              <Row label="Notify on: docs requested" sub="">
                <Toggle on={true} onChange={() => {}} />
              </Row>
            </>
          )}

          {/* ── Security ── */}
          {section === "security" && (
            <>
              <h3 className="font-semibold text-base mb-4" style={{ color: navy }}>Security & Compliance</h3>
              <SectionLabel label="Access" />
              <Row label="Multi-factor authentication" sub="Required for all officer logins">
                <Toggle on={mfa} onChange={setMfa} />
              </Row>
              <Row label="Session timeout (minutes)" sub="Auto-logout idle officers">
                <input defaultValue="30" type="number" className={`${inputCls} w-20`} style={inputStyle} />
              </Row>
              <Row label="IP allowlist" sub="Restrict officer dashboard access">
                <input defaultValue="0.0.0.0/0 (any)" className={inputCls} style={inputStyle} />
              </Row>
              <SectionLabel label="Audit & compliance" />
              <Row label="Full audit trail" sub="Every action logged with timestamp and actor">
                <Toggle on={auditLog} onChange={setAuditLog} />
              </Row>
              <Row label="Data retention (days)" sub="After which PII is anonymised">
                <input defaultValue="365" type="number" className={`${inputCls} w-20`} style={inputStyle} />
              </Row>
              <Row label="Regulatory framework" sub="SBP Digital Lending Framework 2024">
                <span className="text-sm font-medium px-2.5 py-1 rounded-full" style={{ background: "#ECFDF5", color: success }}>
                  Compliant
                </span>
              </Row>
              <div
                className="mt-5 rounded-xl p-4 border"
                style={{ background: "rgba(99,102,241,0.04)", borderColor: "rgba(99,102,241,0.15)" }}
              >
                <p className="text-xs leading-relaxed" style={{ color: indigo }}>
                  <strong>Consent & AI Transparency:</strong> All applicants provide explicit informed consent before
                  any AI processing. Officers are trained that AI recommendations are advisory only. Decisions are
                  always made by a qualified human officer.
                </p>
              </div>
            </>
          )}
        </GlassCard>
      </div>
    </DashboardShell>
  );
}
