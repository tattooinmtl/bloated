import React, { useState, useEffect, useCallback } from 'react';
import { ShieldCheck, StopCircle, FolderSearch } from 'lucide-react';
import { formatBytes } from '../utils/format';
import type { FileThreat, VirusScanProgress, VirusScanMode } from '../../shared/types';

export default function VirusScanner() {
  const [mode, setMode] = useState<VirusScanMode>('quick');
  const [customPath, setCustomPath] = useState('');
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState<VirusScanProgress | null>(null);
  const [threats, setThreats] = useState<FileThreat[]>([]);

  useEffect(() => {
    const unsub = window.api.onVirusScanProgress(setProgress);
    return unsub;
  }, []);

  const handleScan = useCallback(async () => {
    setScanning(true);
    setThreats([]);
    try {
      const result = await window.api.startVirusScan(mode, mode === 'custom' ? customPath : undefined);
      setThreats(result);
    } finally {
      setScanning(false);
    }
  }, [mode, customPath]);

  const handleStop = () => {
    window.api.stopVirusScan();
  };

  const handleBrowse = async () => {
    const dir = await window.api.selectDirectory();
    if (dir) setCustomPath(dir);
  };

  const pct = progress && progress.total > 0 ? ((progress.scanned / progress.total) * 100).toFixed(1) : '0';

  return (
    <div>
      <h1 className="page-title">Virus Scanner</h1>

      {/* Mode selector */}
      <div className="card">
        <div className="card-title">Scan Type</div>
        <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
          {(['quick', 'full', 'custom'] as VirusScanMode[]).map((m) => (
            <button
              key={m}
              className={`btn ${mode === m ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setMode(m)}
              disabled={scanning}
            >
              {m === 'quick' && 'Quick (executables)'}
              {m === 'full' && 'Full Scan'}
              {m === 'custom' && 'Custom Path'}
            </button>
          ))}
        </div>

        {mode === 'custom' && (
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            <input
              className="input"
              placeholder="Select a folder to scan..."
              value={customPath}
              readOnly
            />
            <button className="btn btn-ghost" onClick={handleBrowse} disabled={scanning}>
              <FolderSearch size={16} />
              Browse
            </button>
          </div>
        )}

        <div style={{ display: 'flex', gap: 12 }}>
          <button className="btn btn-primary" onClick={handleScan} disabled={scanning || (mode === 'custom' && !customPath)}>
            <ShieldCheck size={16} />
            {scanning ? 'Scanning...' : 'Start Scan'}
          </button>
          {scanning && (
            <button className="btn btn-danger" onClick={handleStop}>
              <StopCircle size={16} />
              Stop
            </button>
          )}
        </div>
      </div>

      {/* Progress */}
      {scanning && progress && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 13, color: 'var(--text-dim)' }}>
              {progress.phase === 'collecting' && 'Discovering files...'}
              {progress.phase === 'hashing' && 'Hashing files...'}
              {progress.phase === 'looking-up' && 'Looking up hash on VirusTotal...'}
            </span>
            <span style={{ fontSize: 13 }}>
              {progress.phase === 'collecting'
                ? `${progress.total.toLocaleString()} files found`
                : `${progress.scanned.toLocaleString()} / ${progress.total.toLocaleString()} files (${pct}%)`}
            </span>
          </div>
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{
                width: progress.phase === 'collecting' ? '100%' : `${pct}%`,
                animation: progress.phase === 'collecting' ? 'pulse 1.5s ease-in-out infinite' : 'none',
              }}
            />
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {progress.current}
          </div>
          {progress.threats > 0 && (
            <div style={{ marginTop: 8 }}>
              <span className="badge badge-danger">{progress.threats} threat(s) found</span>
            </div>
          )}
        </div>
      )}

      {/* Results */}
      {!scanning && threats.length > 0 && (
        <div className="card">
          <div className="card-title">Threats Found ({threats.length})</div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>File</th>
                  <th>Size</th>
                  <th>Level</th>
                  <th>VirusTotal</th>
                  <th>Detections</th>
                </tr>
              </thead>
              <tbody>
                {threats.map((t, i) => (
                  <tr key={i}>
                    <td style={{ maxWidth: 350, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {t.filePath}
                    </td>
                    <td>{formatBytes(t.fileSize)}</td>
                    <td>
                      <span className={`badge ${t.threatLevel === 'malicious' ? 'badge-danger' : t.threatLevel === 'suspicious' ? 'badge-warning' : 'badge-success'}`}>
                        {t.threatLevel}
                      </span>
                    </td>
                    <td>
                      {t.virustotal ? `${t.virustotal.positives}/${t.virustotal.total} engines` : '—'}
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--text-dim)' }}>
                      {t.virustotal ? Object.entries(t.virustotal.engines).filter(([,e]) => e.detected).map(([name]) => name).slice(0, 3).join(', ') + (Object.values(t.virustotal.engines).filter(e => e.detected).length > 3 ? '...' : '') : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!scanning && threats.length === 0 && progress?.phase === 'done' && (
        <div className="card" style={{ textAlign: 'center', borderColor: 'var(--success)' }}>
          <ShieldCheck size={32} style={{ color: 'var(--success)', marginBottom: 8 }} />
          <div style={{ fontWeight: 600, color: 'var(--success)' }}>No threats found</div>
          <div style={{ fontSize: 13, color: 'var(--text-dim)', marginTop: 4 }}>
            Scanned {progress.total} files
          </div>
        </div>
      )}
    </div>
  );
}
