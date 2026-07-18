import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import Badge from '../components/Badge';
import { fetchApplication, submitDecision } from '../services/api';
import { ArrowLeft, User, Briefcase, FileText, Activity, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

const ApplicationDetail = () => {
  const { id } = useParams();
  const [app, setApp] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await fetchApplication(id);
        setApp(data);
      } catch (err) {
        // Mock data fallback
        setApp({
          id,
          status: 'scored',
          channel: 'whatsapp',
          requested_amount_pkr: 850000,
          created_at: new Date().toISOString(),
          applicant: {
            name: 'Ali Zulfiqar',
            phone: '+923001234567',
            business_name: 'AZ Electronics',
            city: 'Lahore'
          },
          score: {
            repayment_probability: 0.88,
            risk_tier: 'A',
            recommended_amount_pkr: 800000,
            rationale: 'The applicant has strong, consistent cash flows with an average monthly deposit of PKR 450k. Utility bills are paid on time. Minimal risk factors observed.',
            factors: [
              { feature: 'avg_deposit', label: 'Average monthly deposits', impact: 0.12, direction: 'positive' },
              { feature: 'business_age', label: 'Business vintage (years)', impact: 0.05, direction: 'positive' },
              { feature: 'utility_delays', label: 'Late utility payments', impact: -0.02, direction: 'negative' }
            ]
          },
          audit_trail: [
            { at: new Date(Date.now() - 86400000).toISOString(), actor: 'system', action: 'draft_created' },
            { at: new Date(Date.now() - 80000000).toISOString(), actor: 'system', action: 'submitted' },
            { at: new Date(Date.now() - 79000000).toISOString(), actor: 'engine', action: 'scored', detail: 'AI extraction and scoring complete' }
          ]
        });
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [id]);

  const handleDecision = async (action) => {
    setSubmitting(true);
    try {
      await submitDecision(id, 'Current Officer', action, `Application ${action} from dashboard`);
      // Update local state to reflect change
      setApp((prev) => ({ ...prev, status: action === 'approve' ? 'approved' : 'rejected' }));
    } catch (err) {
      console.error('Decision failed, simulating locally', err);
      setApp((prev) => ({ ...prev, status: action === 'approve' ? 'approved' : 'rejected' }));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !app) {
    return <div className="flex justify-center items-center h-full text-secondary">Loading application details...</div>;
  }

  const getRiskColor = (tier) => {
    switch(tier) {
      case 'A': return 'var(--accent-success)';
      case 'B': return 'var(--accent-primary)';
      case 'C': return 'var(--accent-warning)';
      case 'D': return 'var(--accent-danger)';
      default: return 'var(--text-secondary)';
    }
  };

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Link to="/" className="glass-panel" style={{ padding: '0.5rem', display: 'flex' }}>
          <ArrowLeft className="w-5 h-5 text-secondary" />
        </Link>
        <div className="flex-grow flex justify-between items-start">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h2>{app.applicant.name}</h2>
              <Badge variant={app.status === 'approved' ? 'success' : app.status === 'rejected' ? 'danger' : 'info'}>
                {app.status}
              </Badge>
            </div>
            <p className="text-secondary">{app.applicant.business_name} • Requested: PKR {app.requested_amount_pkr.toLocaleString()}</p>
          </div>
          <div className="flex gap-3">
            {app.status === 'scored' && (
              <>
                <button 
                  onClick={() => handleDecision('reject')}
                  disabled={submitting}
                  className="glass-panel text-sm flex items-center gap-2" 
                  style={{ padding: '0.5rem 1rem', cursor: submitting ? 'not-allowed' : 'pointer', color: 'var(--accent-danger)' }}>
                  <XCircle className="w-4 h-4" /> Reject
                </button>
                <button 
                  onClick={() => handleDecision('approve')}
                  disabled={submitting}
                  className="text-sm flex items-center gap-2" 
                  style={{ padding: '0.5rem 1rem', cursor: submitting ? 'not-allowed' : 'pointer', background: 'var(--accent-success)', color: '#fff', border: 'none', borderRadius: 'var(--radius-sm)', fontWeight: 600 }}>
                  <CheckCircle className="w-4 h-4" /> Approve
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-6" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
        
        {/* Applicant Details Card */}
        <div className="glass-panel p-6" style={{ padding: '1.5rem' }}>
          <h3 className="flex items-center gap-2 mb-4" style={{ fontSize: '1.1rem' }}><User className="w-5 h-5 text-secondary"/> Applicant Profile</h3>
          <div className="flex flex-col gap-4">
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
            <div className="flex justify-between" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
              <span className="text-secondary text-sm">Submitted On</span>
              <span style={{ fontWeight: 500 }}>{new Date(app.created_at).toLocaleDateString()}</span>
            </div>
          </div>
        </div>

        {/* AI Credit Brief */}
        {app.score && (
          <div className="glass-panel p-6 flex flex-col" style={{ padding: '1.5rem', gridColumn: 'span 2' }}>
            <h3 className="flex items-center gap-2 mb-4" style={{ fontSize: '1.1rem' }}>
              <Activity className="w-5 h-5 text-secondary"/> AI Credit Brief
            </h3>
            
            <div className="flex gap-6 mb-6">
              <div className="glass-panel flex-1" style={{ padding: '1.25rem', textAlign: 'center', backgroundColor: 'rgba(255,255,255,0.02)' }}>
                <div className="text-sm text-secondary mb-1">Repayment Probability</div>
                <div style={{ fontSize: '2rem', fontWeight: 700 }}>{(app.score.repayment_probability * 100).toFixed(1)}%</div>
              </div>
              <div className="glass-panel flex-1" style={{ padding: '1.25rem', textAlign: 'center', backgroundColor: 'rgba(255,255,255,0.02)' }}>
                <div className="text-sm text-secondary mb-1">Risk Tier</div>
                <div style={{ fontSize: '2rem', fontWeight: 700, color: getRiskColor(app.score.risk_tier) }}>{app.score.risk_tier}</div>
              </div>
              <div className="glass-panel flex-1" style={{ padding: '1.25rem', textAlign: 'center', backgroundColor: 'rgba(255,255,255,0.02)' }}>
                <div className="text-sm text-secondary mb-1">Recommended Limit</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, paddingTop: '0.25rem' }}>PKR {app.score.recommended_amount_pkr.toLocaleString()}</div>
              </div>
            </div>

            <div className="mb-6">
              <h4 className="mb-2 text-sm text-secondary uppercase tracking-wider">Rationale</h4>
              <p style={{ lineHeight: 1.6, color: 'var(--text-primary)', backgroundColor: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                {app.score.rationale}
              </p>
            </div>

            <div>
              <h4 className="mb-3 text-sm text-secondary uppercase tracking-wider">Key Impact Factors</h4>
              <div className="flex flex-col gap-3">
                {app.score.factors.map((factor, idx) => (
                  <div key={idx} className="flex items-center gap-4">
                    <div className="w-1/3 text-sm">{factor.label}</div>
                    <div className="flex-1 flex items-center" style={{ height: '8px', backgroundColor: 'var(--bg-surface-elevated)', borderRadius: '4px', overflow: 'hidden' }}>
                      {factor.direction === 'positive' ? (
                         <div style={{ width: '50%', backgroundColor: 'transparent' }} />
                      ) : null}
                      <div style={{ 
                        width: `${Math.abs(factor.impact) * 300}%`, 
                        backgroundColor: factor.direction === 'positive' ? 'var(--accent-success)' : 'var(--accent-danger)',
                        height: '100%',
                        marginLeft: factor.direction === 'negative' ? 'auto' : 0
                      }} />
                      {factor.direction === 'negative' ? (
                         <div style={{ width: '50%', backgroundColor: 'transparent' }} />
                      ) : null}
                    </div>
                    <div className="text-xs" style={{ width: '40px', textAlign: 'right', color: factor.direction === 'positive' ? 'var(--accent-success)' : 'var(--accent-danger)' }}>
                      {factor.direction === 'positive' ? '+' : ''}{(factor.impact * 100).toFixed(0)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}
      </div>

    </div>
  );
};

export default ApplicationDetail;
