import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import Badge from '../components/Badge';
import { fetchApplication, submitDecision, scoreApplication } from '../services/api';
import { ArrowLeft, User, FileText, Activity, AlertTriangle, CheckCircle, XCircle, MessageCircle, Calendar, Sparkles, Loader2 } from 'lucide-react';

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
