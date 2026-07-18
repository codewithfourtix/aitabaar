import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import QueueView from './pages/QueueView';
import ApplicationDetail from './pages/ApplicationDetail';
import { LayoutDashboard } from 'lucide-react';

function App() {
  return (
    <Router>
      <div className="flex flex-col h-full w-full">
        <header className="glass-panel container flex justify-between items-center" style={{ margin: '1rem auto', padding: '1rem 2rem', borderBottom: '1px solid var(--border-color)' }}>
          <Link to="/" className="flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <LayoutDashboard className="w-6 h-6" style={{ color: 'var(--accent-primary)' }} />
            <span style={{ fontSize: '1.25rem', fontWeight: 600 }}>Aitbaar — Loan Officer Dashboard</span>
          </Link>
          <div className="flex items-center gap-4">
            <span className="text-secondary text-sm">Loan Officer Portal</span>
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
