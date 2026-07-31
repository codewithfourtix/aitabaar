import { useState, useEffect } from "react";
import { ArrowLeft, Download, X, Check, AlertTriangle, MessageCircle, Globe, FileText, Clock, Shield, Loader2 } from "lucide-react";
import { DashboardShell, GlassCard, navy, blue, success, warning, danger, indigo } from "../shared";
import { fetchApplication, submitDecision } from "../../services/api";

type DetailTab = "brief" | "documents" | "audit";

export default function ApplicationDetail({ onNav, appId }: { onNav: (p: string) => void, appId?: string }) {
  const [tab, setTab] = useState<DetailTab>("brief");
  const [app, setApp] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!appId) {
      onNav("queue");
      return;
    }
    const loadData = async () => {
      try {
        const data = await fetchApplication(appId);
        setApp(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    loadData();
    // In a real app we might poll, but for detail view one-time load is usually fine
  }, [appId, onNav]);

  const handleDecision = async (action: 'approve' | 'reject') => {
    if (!app) return;
    setSubmitting(true);
    try {
      await submitDecision(app.id, 'Loan Officer', action, `Decision: ${action}`);
      const updatedApp = await fetchApplication(appId);
      setApp(updatedApp);
    } catch (err: any) {
      alert("Error submitting decision: " + err.message);
    } finally {
      setSubmitting(false);
    }
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
    file: doc.filename,
    type: doc.type.replace('_', ' '),
    uploaded: new Date(doc.uploaded_at).toLocaleString(),
    fields: Object.entries(doc.extracted_fields || {}).map(([k, v]) => ({ k: k.replace(/_/g, ' '), v: String(v) })),
    flag: (doc.verification_flags && doc.verification_flags.length > 0) ? doc.verification_flags.join(', ') : null
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
      {/* Header row */}
      <div className="flex items-start justify-between mb-5">
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
          {/* <button
            className="flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-medium hover:bg-gray-50 transition-colors"
            style={{ borderColor: "rgba(15,23,42,0.1)", color: "#64748B" }}
          >
            <Download size={14} /> Download Brief
          </button> */}
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
            className="flex items-start gap-3 px-4 py-3 rounded-xl border mb-5"
            style={{ background: "#FFFBEB", borderColor: "rgba(201,162,39,0.3)" }}
        >
            <AlertTriangle size={16} color={warning} className="shrink-0 mt-0.5" />
            <p className="text-sm" style={{ color: "#92400E" }}>
            {flag}
            </p>
        </div>
      ))}

      {/* AI Recommendation card */}
      {app.score && (
      <div
        className="flex items-start gap-4 px-5 py-4 rounded-xl border-l-4 mb-6"
        style={{
          background: "white",
          borderLeftColor: (s.recommended_action === 'APPROVE' ? success : s.recommended_action === 'DECLINE' ? danger : warning),
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
      <div className="grid grid-cols-[280px_1fr] gap-5">
        {/* Left: Applicant profile */}
        <GlassCard className="p-5 h-fit">
          <h3 className="text-sm font-semibold mb-4" style={{ color: navy }}>Applicant Profile</h3>
          {[
            { label: "Date Applied", value: new Date(app.created_at).toLocaleDateString() },
            { label: "Phone", value: app.applicant.phone },
            { label: "City", value: "Karachi" }, // Mocked or add to API
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
              <div className="space-y-4">
                {docItems.length === 0 && <div className="text-center text-sm text-gray-500 py-8">No documents uploaded.</div>}
                {docItems.map((doc: any, idx: number) => (
                  <div
                    key={idx}
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
                      {doc.fields.map((f: any, i: number) => (
                        <div key={i} className="flex justify-between text-xs">
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
    </DashboardShell>
  );
}
