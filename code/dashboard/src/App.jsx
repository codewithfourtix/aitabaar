import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate } from 'react-router-dom';
import QueueView from './pages/QueueView';
import ApplicationDetail from './pages/ApplicationDetail';
import { RotateCcw, Loader2 } from 'lucide-react';
import { demoReset } from './services/api';
import IconLogo from './assets/Icon Logo.png';

function DemoResetButton() {
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const handleReset = async () => {
    setBusy(true);
    try {
      await demoReset();
      navigate('/');
    } catch (err) {
      console.error('demo reset failed', err);
    } finally {
      setBusy(false);
    }
  };
  return (
    <button
      onClick={handleReset}
      disabled={busy}
      title="Re-seed the 3 demo applicants through the real pipeline"
      className="glass-panel text-sm flex items-center gap-2"
      style={{ padding: '0.4rem 0.9rem', cursor: busy ? 'wait' : 'pointer', color: 'var(--text-secondary)', backgroundColor: 'var(--bg-surface)' }}>
      {busy ? <Loader2 className="w-4 h-4" style={{ animation: 'spin 1s linear infinite' }} /> : <RotateCcw className="w-4 h-4" />}
      Reset Demo
    </button>
  );
}

function App() {
  return (
    <Router>
      <div className="flex flex-col h-full w-full">
        <header className="glass-panel container flex justify-between items-center" style={{ margin: '1rem auto', padding: '1rem 2rem', borderBottom: '1px solid var(--border-color)' }}>
          <Link to="/" className="flex items-center gap-2" style={{ color: 'var(--text-primary)', display: 'flex', alignItems: 'center' }}>
            <img src={IconLogo} alt="Aitbaar Logo" style={{ width: '32px', height: '32px', objectFit: 'contain' }} />
            <span style={{ fontSize: '1.25rem', fontWeight: 600 }}>Aitbaar — Loan Officer Dashboard</span>
          </Link>
          <div className="flex items-center gap-4">
            <DemoResetButton />
          </div>
        </header>

        <main className="container animate-fade-in" style={{ flexGrow: 1, padding: '1rem 2rem 3rem' }}>
          <Routes>
            <Route path="/" element={<QueueView />} />
            <Route path="/applications/:id" element={<ApplicationDetail />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
