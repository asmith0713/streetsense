// client/src/App.jsx
import React from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import MapPage from './pages/MapPage';
import AdminPanel from './pages/AdminPanel';
import './index.css';

export default function App() {
  return (
    <BrowserRouter>
      <div className="app-container">
        <header className="header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontWeight: 600 }}>StreetSense</div>
          <nav style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <Link to="/" className="nav-link">Map</Link>
            <Link to="/admin" className="nav-link">Admin</Link>
          </nav>
        </header>

        <main style={{ flex: 1 }}>
          <Routes>
            <Route path="/" element={<MapPage />} />
            <Route path="/admin" element={<AdminPanel />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
