import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Badge from '../components/Badge';
import { fetchApplications } from '../services/api';
import { FileText, ArrowRight, Loader2 } from 'lucide-react';

const getStatusVariant = (status) => {
  switch (status) {
    case 'approved': return 'success';
    case 'rejected': return 'danger';
    case 'scored': return 'info';
    case 'needs_docs': return 'warning';
    case 'processing': return 'warning';
    case 'submitted': return 'default';
    default: return 'default';
  }
};

const QueueView = () => {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await fetchApplications();
        setApplications(data);
      } catch (err) {
        // Fallback mock data if backend isn't running
        setApplications([
          { id: 'app-001', applicant: { name: 'Ali Zulfiqar', business_name: 'AZ Electronics' }, status: 'scored', requested_amount_pkr: 500000, created_at: new Date().toISOString() },
          { id: 'app-002', applicant: { name: 'Usman Ali', business_name: 'Usman Traders' }, status: 'submitted', requested_amount_pkr: 1200000, created_at: new Date().toISOString() },
          { id: 'app-003', applicant: { name: 'Ayesha Khan', business_name: 'Ayesha Boutique' }, status: 'needs_docs', requested_amount_pkr: 300000, created_at: new Date().toISOString() },
        ]);
        console.error('Failed to fetch from backend, using mock data', err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full" style={{ minHeight: '300px' }}>
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--accent-primary)', animation: 'spin 1s linear infinite' }} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-center">
        <div>
          <h2>Application Queue</h2>
          <p className="text-secondary">Review and decision pending applications.</p>
        </div>
        <div className="glass-panel flex items-center gap-2" style={{ padding: '0.5rem 1rem' }}>
          <span className="text-sm">Total Applications:</span>
          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{applications.length}</span>
        </div>
      </div>

      <div className="glass-panel" style={{ overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--bg-surface)' }}>
              <th style={{ padding: '1rem', fontWeight: 500, color: 'var(--text-secondary)' }}>Applicant</th>
              <th style={{ padding: '1rem', fontWeight: 500, color: 'var(--text-secondary)' }}>Business</th>
              <th style={{ padding: '1rem', fontWeight: 500, color: 'var(--text-secondary)' }}>Date Applied</th>
              <th style={{ padding: '1rem', fontWeight: 500, color: 'var(--text-secondary)' }}>Amount (PKR)</th>
              <th style={{ padding: '1rem', fontWeight: 500, color: 'var(--text-secondary)' }}>Status</th>
              <th style={{ padding: '1rem', fontWeight: 500, color: 'var(--text-secondary)', textAlign: 'right' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {applications.map((app) => (
              <tr key={app.id} style={{ borderBottom: '1px solid rgba(15,23,42,0.05)', transition: 'background-color 0.2s' }} className="hover-bg-surface-elevated">
                <td style={{ padding: '1rem' }}>
                  <div className="flex items-center gap-3">
                    <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: 'var(--bg-surface-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
                      <FileText className="w-4 h-4" />
                    </div>
                    <div>
                      <div style={{ fontWeight: 500 }}>{app.applicant.name}</div>
                      <div className="text-xs text-secondary">{app.applicant.city || 'N/A'}</div>
                    </div>
                  </div>
                </td>
                <td style={{ padding: '1rem' }}>{app.applicant.business_name}</td>
                <td style={{ padding: '1rem', color: 'var(--text-secondary)' }}>{new Date(app.created_at).toLocaleDateString()}</td>
                <td style={{ padding: '1rem', fontWeight: 500 }}>{app.requested_amount_pkr.toLocaleString()}</td>
                <td style={{ padding: '1rem' }}>
                  <Badge variant={getStatusVariant(app.status)}>{app.status}</Badge>
                </td>
                <td style={{ padding: '1rem', textAlign: 'right' }}>
                  <Link to={`/applications/${app.id}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.5rem 1rem', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--bg-surface-elevated)', fontSize: '0.875rem', fontWeight: 500, border: '1px solid var(--border-color)' }}>
                    Review <ArrowRight className="w-4 h-4" />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <style>{`
        .hover-bg-surface-elevated:hover { background-color: rgba(255,255,255,0.02); }
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default QueueView;
