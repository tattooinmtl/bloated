import React, { useState, useEffect } from 'react';
import { ShieldAlert, RefreshCw, CheckCircle, AlertTriangle, XCircle, Info } from 'lucide-react';
import type { SecurityCheckItem, SecurityScanProgress, SecuritySeverity } from '../../shared/types';

const SEVERITY_ORDER: Record<SecuritySeverity, number> = { critical: 0, warning: 1, info: 2, ok: 3 };

const SEVERITY_ICON: Record<SecuritySeverity, React.ReactNode> = {
  critical: <XCircle size={16} style={{ color: 'var(--danger)' }} />,
  warning: <AlertTriangle size={16} style={{ color: 'var(--warning)' }} />,
  info: <Info size={16} style={{ color: 'var(--accent)' }} />,
  ok: <CheckCircle size={16} style={{ color: 'var(--success)' }} />,
};

const SEVERITY_LABEL: Record<SecuritySeverity, string> = {
  critical: 'Critical', warning: 'Warning', info: 'Info', ok: 'OK',
};

export default function SecurityCheck() {
  const [results, setResults] = useState<SecurityCheckItem[]>([]);
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState<SecurityScanProgress | null>(null);
  const [filter, setFilter] = useState<SecuritySeverity | 'all'>('all');

  useEffect(() => {
    const unsub = window.api.onSecurityProgress(setProgress);
    return unsub;
  }, []);

  const runScan = async () => {
    setScanning(true);
    setResults([]);
    const res = await window.api.runSecurityCheck();
    setResults(res.sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]));
    setScanning(false);
  };

  const filtered = filter === 'all' ? results : results.filter((r) => r.severity === filter);

  const countBySeverity = (s: SecuritySeverity) => results.filter((r) => r.severity === s).length;

  return (
    <div>
      <h1 className="page-title">Security Check</h1>

      <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
        <button className="btn btn-primary" onClick={runScan} disabled={scanning}>
          {scanning ? <RefreshCw size={16} className="spin" /> : <ShieldAlert size={16} />}
          {scanning ? 'Scanning...' : 'Run Security Audit'}
        </button>
      </div>

      {scanning && progress && (
        <div className="scan-status">
          <RefreshCw size={16} className="spin" />
          <span>Checking: {progress.current}</span>
          <span style={{ marginLeft: 'auto' }}>{progress.completed} / {progress.total}</span>
        </div>
      )}

      {results.length > 0 && (
        <>
          {/* Summary stats */}
          <div className="stat-grid">
            <div className="stat-card">
              <div className="stat-label">Critical</div>
              <div className="stat-value" style={{ color: 'var(--danger)' }}>{countBySeverity('critical')}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Warnings</div>
              <div className="stat-value" style={{ color: 'var(--warning)' }}>{countBySeverity('warning')}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Info</div>
              <div className="stat-value" style={{ color: 'var(--accent)' }}>{countBySeverity('info')}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Passed</div>
              <div className="stat-value" style={{ color: 'var(--success)' }}>{countBySeverity('ok')}</div>
            </div>
          </div>

          {/* Filter buttons */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            {(['all', 'critical', 'warning', 'info', 'ok'] as const).map((f) => (
              <button
                key={f}
                className={`btn ${filter === f ? 'btn-primary' : 'btn-ghost'}`}
                style={{ padding: '6px 14px', fontSize: 12 }}
                onClick={() => setFilter(f)}
              >
                {f === 'all' ? `All (${results.length})` : `${SEVERITY_LABEL[f]} (${countBySeverity(f)})`}
              </button>
            ))}
          </div>

          {/* Results */}
          {filtered.map((item) => (
            <div key={item.id} className="security-item card" style={{ marginBottom: 8, padding: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {SEVERITY_ICON[item.severity]}
                <span style={{ fontWeight: 600, fontSize: 14 }}>{item.label}</span>
                <span className={`badge badge-${item.severity === 'critical' ? 'danger' : item.severity === 'warning' ? 'warning' : 'success'}`} style={{ marginLeft: 'auto' }}>
                  {item.category}
                </span>
              </div>
              <div style={{ marginTop: 6, fontSize: 13, color: 'var(--text-dim)' }}>{item.detail}</div>
              {item.recommendation && (
                <div style={{ marginTop: 4, fontSize: 12, color: 'var(--warning)', fontStyle: 'italic' }}>
                  💡 {item.recommendation}
                </div>
              )}
            </div>
          ))}
        </>
      )}

      {!scanning && results.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: 40, color: 'var(--text-dim)' }}>
          <ShieldAlert size={48} style={{ marginBottom: 16, opacity: 0.3 }} />
          <div>Run a security audit to check your system for vulnerabilities</div>
          <div style={{ fontSize: 12, marginTop: 8 }}>Checks firewall, Defender, UAC, open ports, SMBv1, shared folders, and more</div>
        </div>
      )}
    </div>
  );
}
