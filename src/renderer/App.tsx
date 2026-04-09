import React from 'react';
import { HashRouter, Routes, Route, NavLink } from 'react-router-dom';
import { LayoutDashboard, Trash2, ShieldCheck, ShieldAlert, Terminal, Radar, Settings } from 'lucide-react';
import Dashboard from './pages/Dashboard';
import CacheCleaner from './pages/CacheCleaner';
import VirusScanner from './pages/VirusScanner';
import SecurityCheck from './pages/SecurityCheck';
import DevEnvironment from './pages/DevEnvironment';
import PortScanner from './pages/PortScanner';
import SettingsPage from './pages/Settings';
import logoBloated from './assets/logoBloated.png';

const NAV = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/cache', icon: Trash2, label: 'Cache Cleaner' },
  { to: '/scan', icon: ShieldCheck, label: 'Virus Scanner' },
  { to: '/security', icon: ShieldAlert, label: 'Security' },
  { to: '/ports', icon: Radar, label: 'Port Scanner' },
  { to: '/devenv', icon: Terminal, label: 'Dev Env' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

export default function App() {
  return (
    <HashRouter>
      <aside className="sidebar">
        <div className="sidebar-brand">
          <img src={logoBloated} alt="Bloated" style={{ width: '100%', height: 'auto' }} />
        </div>
        <nav className="sidebar-nav">
          {NAV.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
            >
              <Icon />
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <main className="main-content">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/cache" element={<CacheCleaner />} />
          <Route path="/scan" element={<VirusScanner />} />
          <Route path="/security" element={<SecurityCheck />} />
          <Route path="/ports" element={<PortScanner />} />
          <Route path="/devenv" element={<DevEnvironment />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </main>
    </HashRouter>
  );
}
