import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import Badge from '../components/Badge';
import { fetchApplication, submitDecision, scoreApplication } from '../services/api';
import { ArrowLeft, User, FileText, Activity, AlertTriangle, CheckCircle, XCircle, MessageCircle, Calendar, Sparkles, Loader2, Download } from 'lucide-react';

const escapeHtml = (v) =>
  String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// One-page, print-ready credit brief. Rendered into a hidden iframe and sent
// to the browser print dialog — "Save as PDF" gives the downloadable report.
function buildBriefHtml(app) {
  const s = app.score;
  const recColor = s.recommended_action === 'APPROVE' ? '#15803d' : s.recommended_action === 'DECLINE' ? '#b91c1c' : '#b45309';
  const factorRows = (s.factors || []).map((f) => {
    const pos = f.direction === 'positive';
    const pct = Math.min(Math.abs(f.impact) * 300, 100);
    return `<tr>
      <td class="fl">${escapeHtml(f.label)}</td>
      <td class="fb"><div class="bar ${pos ? 'pos' : 'neg'}" style="width:${pct}%"></div></td>
      <td class="fi" style="color:${pos ? '#15803d' : '#b91c1c'}">${pos ? '+' : '−'}${Math.abs(f.impact * 100).toFixed(0)}</td>
    </tr>`;
  }).join('');
  const flags = (s.inconsistency_flags || []).map((f) => `<li>${escapeHtml(f)}</li>`).join('');
  const reasons = (s.decision_reasons || []).map((r) => `<li>${escapeHtml(r)}</li>`).join('');
  return `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(app.id)} — Credit Brief</title>
  <style>
    @page { size: A4; margin: 16mm; }
    * { box-sizing: border-box; margin: 0; }
    body { font-family: Georgia, 'Times New Roman', serif; color: #1a202c; font-size: 12.5px; line-height: 1.45; }
    .head { display: flex; justify-content: space-between; align-items: baseline; border-bottom: 3px solid #0f766e; padding-bottom: 8px; }
    .head h1 { font-size: 20px; } .head .ur { font-size: 14px; color: #0f766e; }
    .head .meta { text-align: right; font-size: 11px; color: #4a5568; }
    h2 { font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; color: #4a5568; margin: 16px 0 6px; font-family: Helvetica, Arial, sans-serif; }
    table.kv { width: 100%; border-collapse: collapse; }
    table.kv td { padding: 3px 0; vertical-align: top; }
    table.kv td:first-child { color: #4a5568; width: 34%; }
    .tiles { display: flex; gap: 10px; margin-top: 4px; }
    .tile { flex: 1; border: 1px solid #cbd5e0; border-radius: 6px; padding: 8px 10px; text-align: center; }
    .tile .v { font-size: 22px; font-weight: 700; } .tile .l { font-size: 10px; color: #4a5568; text-transform: uppercase; letter-spacing: 1px; }
    .rec { border-left: 4px solid ${recColor}; background: #f7fafc; padding: 8px 12px; margin-top: 4px; }
    .rec b { color: ${recColor}; font-size: 15px; }
    .rationale { background: #f7fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px 12px; }
    table.factors { width: 100%; border-collapse: collapse; margin-top: 2px; }
    .fl { width: 42%; padding: 3px 8px 3px 0; } .fb { padding: 3px 0; } .fi { width: 34px; text-align: right; font-weight: 700; font-family: Helvetica, Arial, sans-serif; font-size: 11px; }
    .fb .bar { height: 7px; border-radius: 4px; } .bar.pos { background: #34d399; } .bar.neg { background: #f87171; }
    ul { padding-left: 18px; } .warn li { color: #b45309; }
    .foot { margin-top: 18px; border-top: 1px solid #cbd5e0; padding-top: 8px; font-size: 10px; color: #4a5568; font-style: italic; }
  </style></head><body>
  <div class="head">
    <div><h1>Aitbaar <span class="ur">(اعتبار)</span></h1><div style="font-size:12px;color:#4a5568">AI Credit Brief — SME Loan Origination</div></div>
    <div class="meta"><b>${escapeHtml(app.id)}</b><br>Generated ${new Date().toLocaleString()}<br>Status: ${escapeHtml(app.status)}</div>
  </div>
  <h2>Applicant</h2>
  <table class="kv">
    <tr><td>Name</td><td><b>${escapeHtml(app.applicant.name)}</b></td></tr>
    <tr><td>Business</td><td>${escapeHtml(app.applicant.business_name)} (${escapeHtml(app.applicant.business_type || '—')})</td></tr>
    <tr><td>Phone / City</td><td>${escapeHtml(app.applicant.phone)} · ${escapeHtml(app.applicant.city || '—')}</td></tr>
    <tr><td>Channel / Consent</td><td>${escapeHtml(app.channel)} · ${app.applicant.consent_given ? 'consent given ✓' : 'CONSENT MISSING'}</td></tr>
    <tr><td>Requested amount</td><td><b>PKR ${Number(app.requested_amount_pkr).toLocaleString()}</b></td></tr>
  </table>
  <h2>Assessment</h2>
  <div class="tiles">
    <div class="tile"><div class="v">${Math.round(s.repayment_probability * 100)}<span style="font-size:12px;color:#4a5568">/100</span></div><div class="l">Credit score</div></div>
    <div class="tile"><div class="v">${escapeHtml(s.risk_tier)}</div><div class="l">Risk tier</div></div>
    <div class="tile"><div class="v" style="font-size:16px;padding-top:5px">PKR ${Number(s.recommended_amount_pkr).toLocaleString()}</div><div class="l">Recommended limit</div></div>
  </div>
  <div class="rec" style="margin-top:10px">AI recommendation: <b>${escapeHtml(s.recommended_action)}</b>${s.policy_overridden ? ' — POLICY OVERRIDE' : ''}
    ${reasons ? `<ul>${reasons}</ul>` : ''}</div>
  <h2>Rationale</h2>
  <div class="rationale">${escapeHtml(s.rationale)}</div>
  <h2>Key impact factors (SHAP)</h2>
  <table class="factors">${factorRows}</table>
  ${flags ? `<h2>Verification flags</h2><ul class="warn">${flags}</ul>` : ''}
  <table class="kv" style="margin-top:10px"><tr><td>Data completeness</td><td>${Math.round((s.data_completeness ?? 0) * 100)}% (${escapeHtml(s.completeness_band || '—')})</td></tr>
  <tr><td>Documents on file</td><td>${(app.documents || []).length}</td></tr></table>
  <div class="foot">This brief is an AI-generated recommendation produced from model (XGBoost + SHAP) outputs and deterministic verification checks only.
  The final lending decision rests with the loan officer. Aitbaar — UBL National Innovation Hackathon 2026.</div>
  </body></html>`;
}

function printBrief(app) {
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = 'none';
  document.body.appendChild(iframe);
  iframe.srcdoc = buildBriefHtml(app);
  iframe.onload = () => {
    iframe.contentWindow.focus();
    iframe.contentWindow.print();
    setTimeout(() => iframe.remove(), 60000);
  };
}

const DOC_TYPE_OPTIONS = [
  { value: 'cnic', label: 'CNIC (front)' },
  { value: 'bank_statement', label: 'Bank statement (last 6 months)' },
  { value: 'utility_bill', label: 'Electricity/gas bill' },
];

const ApplicationDetail = () => {
  const { id } = useParams();
  const [app, setApp] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('ai-brief');
  const [showDocPicker, setShowDocPicker] = useState(false);
  const [docType, setDocType] = useState('bank_statement');
  const [docNote, setDocNote] = useState('');

  const load = useCallback(async () => {
    try {
      const data = await fetchApplication(id);
      setApp(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  // While the engine runs, keep the page live so the judges see the stages land
  useEffect(() => {
    if (!app || app.status !== 'processing') return undefined;
    const timer = setInterval(load, 2000);
    return () => clearInterval(timer);
  }, [app, load]);

  const handleDecision = async (action, note, docTypes = []) => {
    setSubmitting(true);
    setError(null);
    try {
      const updated = await submitDecision(id, 'Current Officer', action, note, docTypes);
      setApp(updated);
      setShowDocPicker(false);
      setDocNote('');
    } catch (err) {
      setError(`Decision failed: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleScore = async () => {
    setSubmitting(true);
    setError(null);
    try {
      setApp((prev) => prev ? { ...prev, status: 'processing' } : prev);
      const updated = await scoreApplication(id);
      setApp(updated);
    } catch (err) {
      setError(`Scoring failed: ${err.message}`);
      load();
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-full text-secondary">Loading application details...</div>;
  }

  if (!app) {
    return (
      <div className="glass-panel flex items-center gap-3" style={{ padding: '1rem', border: '1px solid var(--accent-danger)', color: 'var(--accent-danger)' }}>
        <AlertTriangle className="w-5 h-5" />
        <span>Could not load application {id}: {error}</span>
      </div>
    );
  }

  const getRiskColor = (tier) => {
    switch (tier) {
      case 'A': return 'var(--accent-success)';
      case 'B': return 'var(--accent-primary)';
      case 'C': return 'var(--accent-warning)';
      case 'D': return 'var(--accent-danger)';
      default: return 'var(--text-secondary)';
    }
  };

  const inconsistencies = app.score?.inconsistency_flags || [];

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Link to="/" className="glass-panel" style={{ padding: '0.5rem', display: 'flex', backgroundColor: 'var(--bg-surface)' }}>
          <ArrowLeft className="w-5 h-5 text-secondary" />
        </Link>
        <div className="flex-grow flex justify-between items-start">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h2>{app.applicant.name}</h2>
              <Badge variant={app.status === 'approved' ? 'success' : app.status === 'rejected' ? 'danger' : app.status === 'failed' ? 'danger' : 'info'}>
                {app.status}
              </Badge>
            </div>
            <p className="text-secondary">{app.applicant.business_name} • Requested: PKR {app.requested_amount_pkr.toLocaleString()}</p>
          </div>
          <div className="flex gap-3 flex-wrap justify-end">
            {(app.status === 'submitted' || app.status === 'failed') && (
              <button
                onClick={handleScore}
                disabled={submitting}
                className="text-sm flex items-center gap-2"
                style={{ padding: '0.5rem 1rem', cursor: submitting ? 'not-allowed' : 'pointer', background: 'var(--accent-primary)', color: '#fff', border: 'none', borderRadius: 'var(--radius-sm)', fontWeight: 600 }}>
                <Sparkles className="w-4 h-4" /> Run AI Assessment
              </button>
            )}
            {app.status === 'processing' && (
              <span className="glass-panel text-sm flex items-center gap-2" style={{ padding: '0.5rem 1rem', color: 'var(--accent-primary)' }}>
                <Loader2 className="w-4 h-4" style={{ animation: 'spin 1s linear infinite' }} /> Engine running…
              </span>
            )}
            {app.score && (
              <button
                onClick={() => printBrief(app)}
                className="glass-panel text-sm flex items-center gap-2"
                style={{ padding: '0.5rem 1rem', cursor: 'pointer', color: 'var(--text-primary)', backgroundColor: 'var(--bg-surface)' }}>
                <Download className="w-4 h-4" /> Download Brief
              </button>
            )}
            {app.status === 'scored' && (
              <>
                <button
                  onClick={() => setShowDocPicker(true)}
                  disabled={submitting}
                  className="glass-panel text-sm flex items-center gap-2"
                  style={{ padding: '0.5rem 1rem', cursor: submitting ? 'not-allowed' : 'pointer', color: 'var(--accent-primary)', backgroundColor: 'var(--bg-surface)' }}>
                  <MessageCircle className="w-4 h-4" /> Request Document
                </button>
                <button
                  onClick={() => handleDecision('reject', 'Application rejected from dashboard')}
                  disabled={submitting}
                  className="glass-panel text-sm flex items-center gap-2"
                  style={{ padding: '0.5rem 1rem', cursor: submitting ? 'not-allowed' : 'pointer', color: 'var(--accent-danger)', backgroundColor: 'var(--bg-surface)' }}>
                  <XCircle className="w-4 h-4" /> Reject
                </button>
                <button
                  onClick={() => handleDecision('approve', 'Application approved from dashboard')}
                  disabled={submitting}
                  className="text-sm flex items-center gap-2"
                  style={{ padding: '0.5rem 1rem', cursor: submitting ? 'not-allowed' : 'pointer', background: 'var(--accent-primary)', color: '#fff', border: 'none', borderRadius: 'var(--radius-sm)', fontWeight: 600 }}>
                  <CheckCircle className="w-4 h-4" /> Approve
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="glass-panel flex items-center gap-3" style={{ padding: '1rem', border: '1px solid var(--accent-danger)', color: 'var(--accent-danger)' }}>
          <AlertTriangle className="w-5 h-5" />
          <span>{error}</span>
        </div>
      )}

      {/* Request-document picker: the officer asks for exactly ONE item */}
      {showDocPicker && (
        <div className="glass-panel flex flex-col gap-3 animate-fade-in" style={{ padding: '1.5rem', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--accent-primary)' }}>
          <h4 style={{ fontSize: '1rem' }}>Request one document from the applicant (sent via WhatsApp)</h4>
          <div className="flex gap-3 flex-wrap">
            {DOC_TYPE_OPTIONS.map((opt) => (
              <label key={opt.value} className="flex items-center gap-2 text-sm" style={{ cursor: 'pointer' }}>
                <input type="radio" name="docType" value={opt.value} checked={docType === opt.value} onChange={() => setDocType(opt.value)} />
                {opt.label}
              </label>
            ))}
          </div>
          <input
            value={docNote}
            onChange={(e) => setDocNote(e.target.value)}
            placeholder="Note for the applicant, e.g. 'Statement only covers 3 months, need 6.'"
            style={{ padding: '0.6rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-surface-elevated)', color: 'var(--text-primary)' }}
          />
          <div className="flex gap-3 justify-end">
            <button onClick={() => setShowDocPicker(false)} className="glass-panel text-sm" style={{ padding: '0.5rem 1rem', cursor: 'pointer' }}>Cancel</button>
            <button
              onClick={() => handleDecision('request_docs', docNote || 'Additional document required', [docType])}
              disabled={submitting}
              className="text-sm"
              style={{ padding: '0.5rem 1rem', cursor: 'pointer', background: 'var(--accent-primary)', color: '#fff', border: 'none', borderRadius: 'var(--radius-sm)', fontWeight: 600 }}>
              Send Request
            </button>
          </div>
        </div>
      )}

      {/* Fraud/inconsistency flags — always visible, this is the demo moment */}
      {inconsistencies.length > 0 && (
        <div className="glass-panel flex flex-col gap-2" style={{ padding: '1rem', border: '1px solid var(--accent-warning)' }}>
          {inconsistencies.map((flag, idx) => (
            <div key={idx} className="flex items-center gap-2" style={{ color: 'var(--accent-warning)' }}>
              <AlertTriangle className="w-4 h-4" /> <span className="text-sm">{flag}</span>
            </div>
          ))}
        </div>
      )}

      {/* Policy recommendation — engine recommends, officer decides. When
          policy_overridden, a strong score was blocked by a HIGH flag. */}
      {app.score && app.score.recommended_action && (() => {
        const rec = app.score.recommended_action;
        const color = rec === 'APPROVE' ? 'var(--accent-success)' : rec === 'DECLINE' ? 'var(--accent-danger)' : 'var(--accent-warning)';
        return (
          <div className="glass-panel flex flex-col gap-2" style={{ padding: '1rem 1.25rem', backgroundColor: 'var(--bg-surface)', borderLeft: `4px solid ${color}` }}>
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-sm text-secondary">AI recommendation</span>
              <span style={{ fontWeight: 700, fontSize: '1.1rem', color }}>{rec}</span>
              {app.score.policy_overridden && (
                <span className="text-xs" style={{ padding: '0.15rem 0.5rem', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--accent-danger)', color: '#fff', fontWeight: 600 }}>
                  POLICY OVERRIDE
                </span>
              )}
              {app.score.completeness_band && app.score.completeness_band !== 'HIGH' && (
                <span className="text-xs text-secondary">· data completeness: {app.score.completeness_band}</span>
              )}
            </div>
            {(app.score.decision_reasons || []).length > 0 && (
              <ul style={{ margin: 0, paddingLeft: '1.1rem' }}>
                {app.score.decision_reasons.map((r, idx) => (
                  <li key={idx} className="text-sm text-secondary" style={{ lineHeight: 1.5 }}>{r}</li>
                ))}
              </ul>
            )}
            <div className="text-xs text-secondary" style={{ fontStyle: 'italic' }}>Recommendation only — the officer makes the final decision below.</div>
          </div>
        );
      })()}

      <div className="grid gap-6" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>

        {/* Applicant Details Card */}
        <div className="glass-panel p-6" style={{ padding: '1.5rem', backgroundColor: 'var(--bg-surface)' }}>
          <h3 className="flex items-center gap-2 mb-4" style={{ fontSize: '1.1rem' }}><User className="w-5 h-5 text-secondary"/> Applicant Profile</h3>
          <div className="flex flex-col gap-4">
            <div className="flex justify-between items-center" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
              <span className="text-secondary text-sm flex items-center gap-2"><Calendar className="w-4 h-4"/> Date Applied</span>
              <span style={{ fontWeight: 600, color: 'var(--accent-primary)' }}>{new Date(app.created_at).toLocaleDateString()}</span>
            </div>
            <div className="flex justify-between" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
              <span className="text-secondary text-sm">Phone</span>
              <span style={{ fontWeight: 500 }}>{app.applicant.phone}</span>
            </div>
            <div className="flex justify-between" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
              <span className="text-secondary text-sm">City</span>
              <span style={{ fontWeight: 500 }}>{app.applicant.city || 'N/A'}</span>
            </div>
            <div className="flex justify-between" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
              <span className="text-secondary text-sm">Channel</span>
              <span style={{ fontWeight: 500, textTransform: 'capitalize' }}>{app.channel}</span>
            </div>
            <div className="flex justify-between" style={{ paddingBottom: '0.5rem' }}>
              <span className="text-secondary text-sm">Consent</span>
              <span style={{ fontWeight: 500, color: app.applicant.consent_given ? 'var(--accent-success)' : 'var(--accent-danger)' }}>
                {app.applicant.consent_given ? 'Given ✓' : 'Missing'}
              </span>
            </div>
          </div>
        </div>

        {/* Right Side Content (Tabs) */}
        <div className="flex flex-col gap-4" style={{ gridColumn: 'span 2' }}>

          {/* Tabs Navigation */}
          <div className="flex gap-4" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
            {[
              { key: 'ai-brief', label: 'AI Credit Brief' },
              { key: 'documents', label: 'Documents' },
              { key: 'audit', label: 'Audit Trail' },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                style={{
                  background: 'none', border: 'none', padding: '0.5rem 1rem', cursor: 'pointer',
                  fontWeight: activeTab === tab.key ? 600 : 500,
                  color: activeTab === tab.key ? 'var(--accent-primary)' : 'var(--text-secondary)',
                  borderBottom: activeTab === tab.key ? '2px solid var(--accent-primary)' : '2px solid transparent',
                  marginBottom: '-0.6rem'
                }}>
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab 1: AI Credit Brief */}
          {activeTab === 'ai-brief' && !app.score && (
            <div className="glass-panel text-center text-secondary animate-fade-in" style={{ padding: '3rem 1.5rem', backgroundColor: 'var(--bg-surface)' }}>
              {app.status === 'processing'
                ? 'The AI engine is reading the documents…'
                : 'No AI assessment yet. Click "Run AI Assessment" once the application is submitted.'}
            </div>
          )}
          {activeTab === 'ai-brief' && app.score && (
            <div className="glass-panel p-6 flex flex-col animate-fade-in" style={{ padding: '1.5rem', backgroundColor: 'var(--bg-surface)' }}>

              <div className="flex gap-6 mb-6 flex-wrap">
                <div className="glass-panel flex-1" style={{ padding: '1.25rem', textAlign: 'center', backgroundColor: 'var(--bg-surface-elevated)' }}>
                  <div className="text-sm text-secondary mb-1">Credit Score</div>
                  <div style={{ fontSize: '2rem', fontWeight: 700 }}>{Math.round(app.score.repayment_probability * 100)}<span style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>/100</span></div>
                </div>
                <div className="glass-panel flex-1" style={{ padding: '1.25rem', textAlign: 'center', backgroundColor: 'var(--bg-surface-elevated)' }}>
                  <div className="text-sm text-secondary mb-1">Risk Tier</div>
                  <div style={{ fontSize: '2rem', fontWeight: 700, color: getRiskColor(app.score.risk_tier) }}>{app.score.risk_tier}</div>
                </div>
                <div className="glass-panel flex-1" style={{ padding: '1.25rem', textAlign: 'center', backgroundColor: 'var(--bg-surface-elevated)' }}>
                  <div className="text-sm text-secondary mb-1">Recommended Limit</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700, paddingTop: '0.25rem', color: 'var(--accent-primary)' }}>PKR {app.score.recommended_amount_pkr.toLocaleString()}</div>
                </div>
              </div>

              <div className="mb-6">
                <h4 className="mb-2 text-sm text-secondary uppercase tracking-wider">Rationale</h4>
                <p style={{ lineHeight: 1.6, color: 'var(--text-primary)', backgroundColor: 'var(--bg-surface-elevated)', padding: '1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                  {app.score.rationale}
                </p>
              </div>

              <div>
                <h4 className="mb-3 text-sm text-secondary uppercase tracking-wider">Key Impact Factors</h4>
                <div className="flex flex-col gap-3">
                  {app.score.factors.map((factor, idx) => (
                    <div key={idx} className="flex items-center gap-4">
                      <div className="w-1/3 text-sm">{factor.label}</div>
                      <div className="flex-1 flex items-center" style={{ height: '8px', backgroundColor: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                        {factor.direction === 'positive' ? (
                           <div style={{ width: '50%', backgroundColor: 'transparent' }} />
                        ) : null}
                        <div style={{
                          width: `${Math.min(Math.abs(factor.impact) * 300, 50)}%`,
                          backgroundColor: factor.direction === 'positive' ? 'var(--accent-success)' : 'var(--accent-danger)',
                          height: '100%',
                          marginLeft: factor.direction === 'negative' ? 'auto' : 0
                        }} />
                        {factor.direction === 'negative' ? (
                           <div style={{ width: '50%', backgroundColor: 'transparent' }} />
                        ) : null}
                      </div>
                      <div className="text-xs" style={{ width: '40px', textAlign: 'right', fontWeight: 600, color: factor.direction === 'positive' ? 'var(--accent-success)' : 'var(--accent-danger)' }}>
                        {factor.direction === 'positive' ? '+' : ''}{(factor.impact * 100).toFixed(0)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}

          {/* Tab 2: Documents */}
          {activeTab === 'documents' && (
            <div className="glass-panel p-6 flex flex-col gap-4 animate-fade-in" style={{ padding: '1.5rem', backgroundColor: 'var(--bg-surface)' }}>
              <h3 className="flex items-center gap-2 mb-2" style={{ fontSize: '1.1rem' }}><FileText className="w-5 h-5 text-secondary"/> Provided Documents</h3>

              {(!app.documents || app.documents.length === 0) ? (
                <div className="text-center text-secondary py-8">No documents uploaded yet.</div>
              ) : (
                <div className="flex flex-col gap-3">
                  {app.documents.map((doc, idx) => (
                    <div key={idx} className="flex flex-col gap-2 p-4" style={{ backgroundColor: 'var(--bg-surface-elevated)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', padding: '1rem' }}>
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                          <FileText className="w-6 h-6" style={{ color: 'var(--accent-primary)' }}/>
                          <div>
                            <div style={{ fontWeight: 500 }}>{doc.filename}</div>
                            <div className="text-xs text-secondary uppercase mt-1">{doc.type.replace('_', ' ')} · {doc.status}</div>
                          </div>
                        </div>
                        <div className="text-sm text-secondary">{new Date(doc.uploaded_at).toLocaleString()}</div>
                      </div>
                      {doc.extracted_fields && Object.keys(doc.extracted_fields).length > 0 && (
                        <div className="text-sm" style={{ borderTop: '1px solid var(--border-color)', paddingTop: '0.5rem' }}>
                          {Object.entries(doc.extracted_fields).map(([k, v]) => (
                            <div key={k} className="flex justify-between" style={{ padding: '0.15rem 0' }}>
                              <span className="text-secondary">{k.replace(/_/g, ' ')}</span>
                              <span style={{ fontWeight: 500 }}>{String(v)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {doc.verification_flags && doc.verification_flags.length > 0 && doc.verification_flags.map((f, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm" style={{ color: 'var(--accent-danger)' }}>
                          <AlertTriangle className="w-4 h-4" /> {f}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tab 3: Audit Trail — every event, unfiltered: the compliance story */}
          {activeTab === 'audit' && (
            <div className="glass-panel p-6 flex flex-col gap-4 animate-fade-in" style={{ padding: '1.5rem', backgroundColor: 'var(--bg-surface)' }}>
              <h3 className="flex items-center gap-2 mb-2" style={{ fontSize: '1.1rem' }}><Activity className="w-5 h-5 text-secondary"/> Audit Trail</h3>
              <div className="flex flex-col">
                {(app.audit_trail || []).map((event, idx) => (
                  <div key={idx} className="flex gap-4" style={{ padding: '0.6rem 0', borderBottom: idx < app.audit_trail.length - 1 ? '1px solid var(--border-color)' : 'none' }}>
                    <div className="text-xs text-secondary" style={{ minWidth: '150px' }}>{new Date(event.at).toLocaleString()}</div>
                    <div className="text-sm" style={{ minWidth: '90px', fontWeight: 600, textTransform: 'capitalize' }}>{event.actor}</div>
                    <div className="text-sm" style={{ fontWeight: 500, minWidth: '130px' }}>{event.action.replace(/_/g, ' ')}</div>
                    <div className="text-sm text-secondary">{event.detail}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
      <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default ApplicationDetail;
