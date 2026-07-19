import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import QueueView from './pages/QueueView';
import ApplicationDetail from './pages/ApplicationDetail';
import IconLogo from './assets/Icon Logo.png';

function App() {
  return (
    <Router>
      <div className="flex flex-col h-full w-full">
        <header className="glass-panel container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '1rem auto', padding: '1rem 2rem', borderBottom: '1px solid var(--border-color)', width: 'calc(100% - 4rem)', maxWidth: '1280px' }}>
          <Link to="/" className="flex items-center gap-2" style={{ color: 'var(--text-primary)', display: 'flex', alignItems: 'center' }}>
            <img src={IconLogo} alt="Aitabaar Logo" style={{ width: '32px', height: '32px', objectFit: 'contain' }} />
            <span style={{ fontSize: '1.25rem', fontWeight: 600 }}>Aitabaar Dashboard</span>
          </Link>
          <div className="flex items-center gap-4" style={{ display: 'flex', alignItems: 'center' }}>
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
