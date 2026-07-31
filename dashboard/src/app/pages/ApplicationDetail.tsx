import { useState, useEffect } from "react";
import { ArrowLeft, X, Check, MessageCircle, Globe, FileText, Loader2, Printer, FilePlus2 } from "lucide-react";
import { DashboardShell, GlassCard, Modal, FlagBadge, navy, blue, success, warning, danger, indigo } from "../shared";
import { fetchApplication, submitDecision } from "../../services/api";

type DetailTab = "brief" | "documents" | "audit";

// Human labels for the document types an officer can request or see in the
// Documents tab - same product-facing names the WhatsApp bot uses (see
// whatsapp-bot/src/strings.js's DOC_LABELS), not the raw enum values.
const DOC_TYPE_LABELS: Record<string, string> = {
  cnic: "CNIC",
  bank_statement: "Bank / Mobile Wallet Statement",
  utility_bill: "Utility Bill",
  business_questionnaire: "Business Questionnaire",
  business_registration: "Business Registration Proof",
  property_document: "Property Ownership / Rent Agreement",
};

const REQUESTABLE_DOC_TYPES: { id: string; label: string }[] = [
  { id: "cnic", label: "CNIC" },
  { id: "bank_statement", label: "Bank / Mobile Wallet Statement" },
  { id: "utility_bill", label: "Utility Bill" },
  { id: "business_registration", label: "Business Registration Proof" },
  { id: "property_document", label: "Property Ownership / Rent Agreement" },
];

// Every extracted-field key this pipeline produces (app/engine/extraction.py's
// per-doc-type prompts, plus whatsapp-bot/src/flow.js's questionnaire
// payload) mapped to a human label - not a generic underscore replace,
// which is how "dob" and "pkr"-suffixed keys ended up on screen verbatim.
const FIELD_LABELS: Record<string, string> = {
  name: "Name",
  cnic: "CNIC",
  dob: "Date of Birth",
  address: "Address",
  account_title: "Account Title",
  avg_monthly_inflow_pkr: "Avg. Monthly Inflow",
  avg_monthly_outflow_pkr: "Avg. Monthly Outflow",
  months: "Months Covered",
  end_balance_pkr: "Ending Balance",
  bounced_cheques: "Bounced Cheques",
  on_time: "Paid On Time",
  months_history: "Billing History (months)",
  business_name: "Business Name",
  owner_name: "Owner Name",
  ntn: "NTN",
  registration_number: "Registration Number",
  legal_structure: "Legal Structure",
  registered_on: "Registered On",
  issuing_authority: "Issuing Authority",
  holder_name: "Holder Name",
  tenure: "Tenure",
  monthly_rent_pkr: "Monthly Rent",
  agreement_start: "Agreement Start",
  agreement_end: "Agreement End",
  years_in_business: "Years in Business",
  monthly_revenue_pkr: "Monthly Revenue",
  employees: "Employees",
  has_existing_loan: "Existing Loan",
  business_type: "Business Type",
  monthly_expenses_pkr: "Monthly Expenses",
  net_monthly_cash_pkr: "Net Monthly Cash Flow",
  tenor_months: "Requested Tenor (months)",
  loan_purpose: "Loan Purpose",
  consent_at: "Consent Given At",
  existing_loan_amount_pkr: "Existing Loan Amount",
  existing_installment_pkr: "Existing Loan Instalment",
  premises_owned: "Premises Owned",
  years_at_premises: "Years at Premises",
};

function humanizeFieldLabel(key: string): string {
  if (FIELD_LABELS[key]) return FIELD_LABELS[key];
  return key
    .replace(/_pkr$/, "")
    .split("_")
    .map((w) => w[0]?.toUpperCase() + w.slice(1))
    .join(" ");
}

function formatFieldValue(key: string, value: any): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (key.endsWith("_pkr") && typeof value === "number") return `PKR ${value.toLocaleString()}`;
  if (typeof value === "number") return value.toLocaleString();
  if (/^\d{4}-\d{2}-\d{2}/.test(String(value))) {
    const d = new Date(value);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
    }
  }
  // Enum-shaped values from vision extraction (e.g. "sole_proprietorship",
  // "owned") - title-case them rather than showing the raw snake_case.
  if (/^[a-z][a-z_]*$/.test(String(value))) {
    return String(value).split("_").map((w) => w[0].toUpperCase() + w.slice(1)).join(" ");
  }
  return String(value);
}

export default function ApplicationDetail({ onNav, appId }: { onNav: (p: string) => void, appId?: string }) {
  const [tab, setTab] = useState<DetailTab>("brief");
  const [app, setApp] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestDocType, setRequestDocType] = useState(REQUESTABLE_DOC_TYPES[0].id);
  const [requestReason, setRequestReason] = useState("");
  const [requesting, setRequesting] = useState(false);

  const loadData = async () => {
    if (!appId) return;
    try {
      const data = await fetchApplication(appId);
      setApp(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!appId) {
      onNav("queue");
      return;
    }
    loadData();
    // In a real app we might poll, but for detail view one-time load is usually fine
  }, [appId, onNav]);

  const handleDecision = async (action: 'approve' | 'reject') => {
    if (!app) return;
    setSubmitting(true);
    try {
      await submitDecision(app.id, 'Loan Officer', action, `Decision: ${action}`);
      await loadData();
    } catch (err: any) {
      alert("Error submitting decision: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRequestDocs = async () => {
    if (!app || !requestReason.trim()) return;
    setRequesting(true);
    try {
      await submitDecision(app.id, 'Loan Officer', 'request_docs', requestReason.trim(), [requestDocType as any]);
      await loadData();
      setShowRequestModal(false);
      setRequestReason("");
    } catch (err: any) {
      alert("Error requesting document: " + err.message);
    } finally {
      setRequesting(false);
    }
  };

  const handlePrintBrief = () => {
    setTab("brief");
    setTimeout(() => window.print(), 100);
  };

  if (loading) {
    return (
      <DashboardShell onNav={onNav} active="queue">
        <div className="flex justify-center items-center h-64">
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: blue }} />
        </div>
      </DashboardShell>
    );
  }

  if (error || !app) {
    return (
      <DashboardShell onNav={onNav} active="queue">
        <div className="flex justify-center items-center h-64">
          <div className="text-red-500">Error loading application: {error || "Not found"}</div>
        </div>
      </DashboardShell>
    );
  }

  const s = app.score || {};
  const factors = (s.factors || []).map((f: any) => ({
    label: f.label,
    score: Math.round(f.impact * 100),
    positive: f.direction === 'positive'
  }));

  const docItems = (app.documents || []).map((doc: any) => ({
    id: doc.id,
    file: doc.filename,
    type: doc.type,
    typeLabel: DOC_TYPE_LABELS[doc.type] || doc.type,
    uploaded: new Date(doc.uploaded_at).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }),
    fields: Object.entries(doc.extracted_fields || {}).map(([k, v]) => ({ k: humanizeFieldLabel(k), v: formatFieldValue(k, v) })),
    flags: doc.verification_flags || [],
  }));

  const auditLog = (app.audit_trail || []).map((event: any) => ({
    time: new Date(event.at).toLocaleString(),
    actor: event.actor,
    action: event.action.replace(/_/g, ' '),
    detail: event.detail || ''
  }));

  const flags = s.inconsistency_flags || [];
  const riskColor = s.risk_tier === 'A' ? success : s.risk_tier === 'B' ? blue : s.risk_tier === 'C' ? warning : s.risk_tier === 'D' ? danger : navy;

  return (
    <DashboardShell onNav={onNav} active="queue">
      {/* Print-only letterhead - shown only when printing/saving the brief as PDF */}
      <div className="hidden print:flex items-center gap-3 mb-6">
        <div>
          <p className="font-bold text-lg" style={{ color: navy }}>Aitbaar — AI Credit Brief</p>
          <p className="text-xs" style={{ color: "#64748B" }}>Generated {new Date().toLocaleString("en-GB")} · Recommendation only, not a final decision</p>
        </div>
      </div>

      {/* Header row */}
      <div className="flex items-start justify-between mb-5 print:hidden">
        <div className="flex items-start gap-3">
          <button
            onClick={() => onNav("queue")}
            className="mt-1 w-9 h-9 rounded-xl border flex items-center justify-center hover:bg-gray-50 transition-colors cursor-pointer"
            style={{ borderColor: "rgba(15,23,42,0.1)" }}
          >
            <ArrowLeft size={16} color={navy} />
          </button>
          <div>
            <div className="flex items-center gap-2.5 mb-0.5">
              <h1 className="text-xl font-bold" style={{ color: navy }}>{app.applicant.name}</h1>
              <span
                className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase"
                style={{ background: "#EEF2FF", color: indigo }}
              >
                {app.status}
              </span>
            </div>
            <p className="text-sm" style={{ color: "#64748B" }}>
              {app.applicant.business_name} &nbsp;·&nbsp; Requested: <strong style={{ color: navy }}>PKR {app.requested_amount_pkr.toLocaleString()}</strong>
              &nbsp;·&nbsp; Ref: {app.id}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrintBrief}
            disabled={!app.score}
            className="flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-medium hover:bg-gray-50 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ borderColor: "rgba(15,23,42,0.1)", color: "#374151" }}
            title={app.score ? "Opens your browser's print dialog — choose \"Save as PDF\" to download" : "No credit brief yet"}
          >
            <Printer size={14} /> Credit Brief
          </button>
          <button
            onClick={() => setShowRequestModal(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-medium hover:bg-gray-50 transition-colors cursor-pointer"
            style={{ borderColor: "rgba(15,23,42,0.1)", color: "#374151" }}
          >
            <FilePlus2 size={14} /> Request Documents
          </button>
          {['scored', 'needs_docs', 'submitted'].includes(app.status) && (
            <>
              <button
                onClick={() => handleDecision('reject')}
                disabled={submitting}
                className="flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-semibold transition-colors hover:bg-red-50 cursor-pointer disabled:opacity-50"
                style={{ borderColor: danger, color: danger }}
              >
                <X size={14} /> Reject
              </button>
              <button
                onClick={() => handleDecision('approve')}
                disabled={submitting}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:shadow-md cursor-pointer disabled:opacity-50"
                style={{ background: `linear-gradient(135deg, ${blue}, ${navy})` }}
              >
                <Check size={14} /> Approve
              </button>
            </>
          )}
        </div>
      </div>

      {/* Warning banners */}
      {flags.map((flag: string, i: number) => (
        <div
            key={i}
            className="px-4 py-3 rounded-xl border mb-3"
            style={{ background: "#FFFBEB", borderColor: "rgba(201,162,39,0.3)" }}
        >
          <FlagBadge flag={flag} />
        </div>
      ))}
      {flags.length > 0 && <div className="mb-2" />}

      {/* AI Recommendation card */}
      {app.score && (
      <div
        className="flex items-start gap-4 px-5 py-4 rounded-xl border-l-4 mb-6"
        style={{
          background: "white",
          border: "1px solid rgba(15,23,42,0.06)",
          borderLeft: `4px solid ${s.recommended_action === 'APPROVE' ? success : s.recommended_action === 'DECLINE' ? danger : warning}`,
          boxShadow: "0 1px 8px rgba(10,45,110,0.06)",
        }}
      >
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#64748B" }}>
              AI recommendation
            </span>
            {s.policy_overridden && (
            <span
              className="px-2 py-0.5 rounded text-xs font-bold uppercase"
              style={{ background: "#FEF2F2", color: danger }}
            >
              Policy override
            </span>
            )}
          </div>
          <p className="text-2xl font-black mb-2" style={{ color: (s.recommended_action === 'APPROVE' ? success : s.recommended_action === 'DECLINE' ? danger : warning) }}>{s.recommended_action}</p>
          <ul className="space-y-1 mb-3">
            {(s.decision_reasons || []).map((reason: string, i: number) => (
            <li key={i} className="text-sm flex items-start gap-1.5" style={{ color: "#374151" }}>
              <span style={{ color: (s.recommended_action === 'APPROVE' ? success : s.recommended_action === 'DECLINE' ? danger : warning) }}>•</span> {reason}
            </li>
            ))}
          </ul>
          <p className="text-xs italic" style={{ color: "#94A3B8" }}>
            Recommendation only — the officer makes the final decision.
          </p>
        </div>
      </div>
      )}

      {/* Two-column layout */}
      <div className="grid grid-cols-[280px_1fr] gap-5 print:grid-cols-1">
        {/* Left: Applicant profile */}
        <GlassCard className="p-5 h-fit">
          <h3 className="text-sm font-semibold mb-4" style={{ color: navy }}>Applicant Profile</h3>
          {[
            { label: "Date Applied", value: new Date(app.created_at).toLocaleDateString() },
            { label: "Phone", value: app.applicant.phone },
            { label: "City", value: app.applicant.city || "—" },
            { label: "Channel", value: app.channel === 'whatsapp' ? 'WhatsApp' : 'Web', icon: app.channel === 'whatsapp' ? <MessageCircle size={12} color="#25D366" /> : <Globe size={12} color={blue} /> },
            { label: "Consent", value: app.applicant.consent_given ? "Granted ✓" : "Pending", ok: app.applicant.consent_given },
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
        <GlassCard className="overflow-hidden print:shadow-none print:border-0">
          {/* Tab bar */}
          <div className="flex border-b print:hidden" style={{ borderColor: "rgba(15,23,42,0.07)" }}>
            {([
              { id: "brief", label: "AI Credit Brief" },
              { id: "documents", label: "Documents" },
              { id: "audit", label: "Audit Trail" },
            ] as { id: DetailTab; label: string }[]).map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className="px-5 py-3.5 text-sm font-medium border-b-2 transition-all cursor-pointer"
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
                {app.score ? (
                <>
                {/* Stat tiles */}
                <div className="grid grid-cols-3 gap-4 mb-6">
                  {[
                    { label: "Credit Score", value: `${Math.round(s.repayment_probability * 100)} / 100`, color: blue, bg: "#EFF6FF" },
                    { label: "Risk Tier", value: s.risk_tier, color: riskColor, bg: "#EFF6FF" },
                    { label: "Recommended Limit", value: `PKR ${s.recommended_amount_pkr.toLocaleString()}`, color: navy, bg: "#F8FAFC" },
                  ].map((s_stat) => (
                    <div key={s_stat.label} className="rounded-xl p-4 text-center" style={{ background: s_stat.bg }}>
                      <p className="text-xs font-medium uppercase tracking-wider mb-1" style={{ color: "#64748B" }}>{s_stat.label}</p>
                      <p className="text-xl font-black" style={{ color: s_stat.color }}>{s_stat.value}</p>
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
                    {s.rationale}
                  </p>
                </div>

                {/* Factors */}
                <div>
                  <h4 className="text-sm font-semibold mb-3" style={{ color: navy }}>Key Impact Factors</h4>
                  <div className="space-y-3">
                    {factors.map((f: any, idx: number) => (
                      <div key={idx} className="flex items-center gap-3">
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
                ) : (
                    <div className="text-center py-8 text-sm text-gray-500">No score computed yet.</div>
                )}
              </>
            )}

            {/* ── Documents ── */}
            {tab === "documents" && (
              <div className="space-y-4 print:hidden">
                {docItems.length === 0 && <div className="text-center text-sm text-gray-500 py-8">No documents uploaded.</div>}
                {docItems.map((doc: any) => (
                  <div
                    key={doc.id}
                    className="rounded-xl p-4 border"
                    style={{ borderColor: doc.flags.length > 0 ? "rgba(220,38,38,0.2)" : "rgba(15,23,42,0.07)" }}
                  >
                    <div className="flex items-start gap-3 mb-3">
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                        style={{ background: "#EFF6FF" }}
                      >
                        <FileText size={16} color={blue} />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold" style={{ color: navy }}>{doc.typeLabel}</p>
                        <p className="text-xs" style={{ color: "#94A3B8" }}>Uploaded {doc.uploaded}</p>
                      </div>
                    </div>
                    {doc.fields.length > 0 && (
                      <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 mb-2">
                        {doc.fields.map((f: any, i: number) => (
                          <div key={i} className="flex justify-between text-xs">
                            <span style={{ color: "#64748B" }}>{f.k}</span>
                            <span className="font-medium" style={{ color: navy }}>{f.v}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {doc.flags.map((flag: string, i: number) => (
                      <div
                        key={i}
                        className="text-xs mt-2 px-3 py-2 rounded-lg"
                        style={{ background: "#FEF2F2" }}
                      >
                        <FlagBadge flag={flag} />
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}

            {/* ── Audit Trail ── */}
            {tab === "audit" && (
              <div className="relative print:hidden">
                {auditLog.length === 0 && <div className="text-center text-sm text-gray-500 py-8">No audit trail events.</div>}
                {auditLog.map((entry: any, i: number) => (
                  <div key={i} className="flex gap-4 mb-1">
                    <div className="flex flex-col items-center">
                      <div
                        className="w-3 h-3 rounded-full shrink-0 mt-1"
                        style={{
                          background:
                            entry.actor === "Officer" ? navy :
                            entry.actor === "system" ? blue :
                            entry.actor === "engine" ? indigo : "#25D366",
                        }}
                      />
                      {i < auditLog.length - 1 && (
                        <div className="w-px flex-1 my-1" style={{ background: "#E2E8F0", minHeight: 24 }} />
                      )}
                    </div>
                    <div className="pb-4">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-xs font-bold" style={{ color: navy }}>{entry.actor}</span>
                        <span className="text-xs font-semibold capitalize" style={{ color: "#374151" }}>{entry.action}</span>
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

      {showRequestModal && (
        <Modal title="Request a document" onClose={() => setShowRequestModal(false)}>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide block mb-1.5" style={{ color: "#64748B" }}>
                Document
              </label>
              <select
                value={requestDocType}
                onChange={(e) => setRequestDocType(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border text-sm outline-none"
                style={{ borderColor: "rgba(15,23,42,0.12)", color: navy }}
              >
                {REQUESTABLE_DOC_TYPES.map((d) => (
                  <option key={d.id} value={d.id}>{d.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide block mb-1.5" style={{ color: "#64748B" }}>
                Reason for requesting this document
              </label>
              <textarea
                value={requestReason}
                onChange={(e) => setRequestReason(e.target.value)}
                rows={3}
                placeholder="e.g. Bank statement only covers 3 months, need the full 6."
                className="w-full px-3 py-2.5 rounded-xl border text-sm outline-none resize-none"
                style={{ borderColor: "rgba(15,23,42,0.12)", color: navy }}
              />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button
                onClick={() => setShowRequestModal(false)}
                className="px-4 py-2 rounded-xl text-sm font-medium hover:bg-gray-50 cursor-pointer"
                style={{ color: "#64748B" }}
              >
                Cancel
              </button>
              <button
                onClick={handleRequestDocs}
                disabled={requesting || !requestReason.trim()}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white cursor-pointer disabled:opacity-50"
                style={{ background: `linear-gradient(135deg, ${blue}, ${navy})` }}
              >
                {requesting ? <Loader2 size={14} className="animate-spin" /> : <FilePlus2 size={14} />}
                Send Request
              </button>
            </div>
          </div>
        </Modal>
      )}
    </DashboardShell>
  );
}
