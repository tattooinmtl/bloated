import React, { useState, useEffect } from 'react';
import { Radar, Wifi, RefreshCw, StopCircle, CheckCircle, XCircle, AlertTriangle, Monitor } from 'lucide-react';
import type { PortResult, PortScanProgress, NetworkHost, NetworkScanProgress, NetworkInfo } from '../../shared/types';

const PRESETS = [
  { label: 'Quick (Top 100)', start: 1, end: 100 },
  { label: 'Common (1-1024)', start: 1, end: 1024 },
  { label: 'Extended (1-10000)', start: 1, end: 10000 },
  { label: 'Full (1-65535)', start: 1, end: 65535 },
  { label: 'Web Ports', start: 80, end: 443 },
  { label: 'Database Ports', start: 3306, end: 27017 },
];

type Tab = 'ports' | 'network';

/* ════════════════════════════════════════ PORT SCAN TAB ════════════════════════════════════════ */
function PortScanTab() {
  const [target, setTarget] = useState('127.0.0.1');
  const [startPort, setStartPort] = useState(1);
  const [endPort, setEndPort] = useState(1024);
  const [timeout, setTimeoutVal] = useState(1000);
  const [scanning, setScanning] = useState(false);
  const [results, setResults] = useState<PortResult[]>([]);
  const [progress, setProgress] = useState<PortScanProgress | null>(null);

  useEffect(() => {
    const unsub = window.api.onPortScanProgress(setProgress);
    return unsub;
  }, []);

  const runScan = async () => {
    setScanning(true);
    setResults([]);
    setProgress(null);
    const res = await window.api.startPortScan({ target, startPort, endPort, timeout, concurrency: 100 });
    setResults(res);
    setScanning(false);
  };

  const pct = progress && progress.total > 0 ? Math.round((progress.scanned / progress.total) * 100) : 0;

  return (
    <>
      <div className="card">
        <div className="card-title">Scan Configuration</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
          <div>
            <label style={{ fontSize: 12, color: 'var(--text-dim)', display: 'block', marginBottom: 4 }}>Target</label>
            <input className="input" value={target} onChange={(e) => setTarget(e.target.value)} placeholder="127.0.0.1" disabled={scanning} />
          </div>
          <div>
            <label style={{ fontSize: 12, color: 'var(--text-dim)', display: 'block', marginBottom: 4 }}>Start Port</label>
            <input className="input" type="number" min={1} max={65535} value={startPort} onChange={(e) => setStartPort(Number(e.target.value))} disabled={scanning} />
          </div>
          <div>
            <label style={{ fontSize: 12, color: 'var(--text-dim)', display: 'block', marginBottom: 4 }}>End Port</label>
            <input className="input" type="number" min={1} max={65535} value={endPort} onChange={(e) => setEndPort(Number(e.target.value))} disabled={scanning} />
          </div>
          <div>
            <label style={{ fontSize: 12, color: 'var(--text-dim)', display: 'block', marginBottom: 4 }}>Timeout (ms)</label>
            <input className="input" type="number" min={100} max={10000} step={100} value={timeout} onChange={(e) => setTimeoutVal(Number(e.target.value))} disabled={scanning} />
          </div>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
          <span style={{ fontSize: 12, color: 'var(--text-dim)', lineHeight: '28px' }}>Presets:</span>
          {PRESETS.map((p) => (
            <button key={p.label} className="btn btn-ghost" style={{ padding: '4px 10px', fontSize: 11 }} onClick={() => { setStartPort(p.start); setEndPort(p.end); }} disabled={scanning}>
              {p.label}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          <button className="btn btn-primary" onClick={runScan} disabled={scanning}>
            {scanning ? <RefreshCw size={16} className="spin" /> : <Radar size={16} />}
            {scanning ? 'Scanning...' : 'Start Scan'}
          </button>
          {scanning && (
            <button className="btn btn-danger" onClick={() => window.api.stopPortScan()}>
              <StopCircle size={16} /> Stop
            </button>
          )}
        </div>
      </div>

      {scanning && progress && (
        <div className="card" style={{ marginBottom: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 8 }}>
            <span>Scanning port {progress.current}...</span>
            <span>{progress.scanned.toLocaleString()} / {progress.total.toLocaleString()} ({pct}%)</span>
          </div>
          <div className="progress-bar"><div className="progress-fill" style={{ width: `${pct}%` }} /></div>
          <div style={{ marginTop: 8, fontSize: 12, color: 'var(--success)' }}>
            {progress.openCount} open port{progress.openCount !== 1 ? 's' : ''} found so far
          </div>
        </div>
      )}

      {results.length > 0 && (
        <>
          <div className="stat-grid" style={{ marginTop: 16 }}>
            <div className="stat-card"><div className="stat-label">Target</div><div className="stat-value" style={{ fontSize: 18 }}>{target}</div></div>
            <div className="stat-card"><div className="stat-label">Ports Scanned</div><div className="stat-value">{(endPort - startPort + 1).toLocaleString()}</div></div>
            <div className="stat-card"><div className="stat-label">Open Ports</div><div className="stat-value" style={{ color: 'var(--success)' }}>{results.length}</div></div>
          </div>
          <div className="card">
            <div className="card-title">Open Ports</div>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Port</th><th>Status</th><th>Service</th><th>Banner</th></tr></thead>
                <tbody>
                  {results.map((r) => (
                    <tr key={r.port}>
                      <td style={{ fontFamily: 'Consolas, monospace', fontWeight: 600 }}>{r.port}</td>
                      <td>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                          {r.status === 'open' && <CheckCircle size={14} style={{ color: 'var(--success)' }} />}
                          {r.status === 'filtered' && <AlertTriangle size={14} style={{ color: 'var(--warning)' }} />}
                          {r.status === 'closed' && <XCircle size={14} style={{ color: 'var(--text-dim)' }} />}
                          <span className={`badge ${r.status === 'open' ? 'badge-success' : r.status === 'filtered' ? 'badge-warning' : ''}`}>{r.status}</span>
                        </span>
                      </td>
                      <td>{r.service}</td>
                      <td style={{ fontSize: 11, fontFamily: 'Consolas, monospace', color: 'var(--text-dim)', maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.banner || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {!scanning && results.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: 40, color: 'var(--text-dim)', marginTop: 16 }}>
          <Radar size={48} style={{ marginBottom: 16, opacity: 0.3 }} />
          <div>Scan a host for open ports</div>
          <div style={{ fontSize: 12, marginTop: 8 }}>TCP connect scan — detects open services, grabs banners, identifies 60+ common services</div>
        </div>
      )}
    </>
  );
}

/* ════════════════════════════════════════ NETWORK SCAN TAB ════════════════════════════════════════ */
function NetworkScanTab() {
  const [netInfo, setNetInfo] = useState<NetworkInfo | null>(null);
  const [subnet, setSubnet] = useState('');
  const [scanning, setScanning] = useState(false);
  const [hosts, setHosts] = useState<NetworkHost[]>([]);
  const [progress, setProgress] = useState<NetworkScanProgress | null>(null);

  useEffect(() => {
    window.api.getNetworkInfo().then((info) => {
      setNetInfo(info);
      setSubnet(info.subnet);
    });
    const unsub = window.api.onNetworkScanProgress(setProgress);
    return unsub;
  }, []);

  const runScan = async () => {
    setScanning(true);
    setHosts([]);
    setProgress(null);
    const res = await window.api.startNetworkScan(subnet);
    setHosts(res);
    setScanning(false);
  };

  const pct = progress && progress.total > 0 ? Math.round((progress.scanned / progress.total) * 100) : 0;

  return (
    <>
      {/* Network Info */}
      {netInfo && (
        <div className="stat-grid">
          <div className="stat-card">
            <div className="stat-label">Your IP</div>
            <div className="stat-value" style={{ fontSize: 18 }}>{netInfo.localIp}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Gateway</div>
            <div className="stat-value" style={{ fontSize: 18 }}>{netInfo.gateway}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Interface</div>
            <div className="stat-value" style={{ fontSize: 16 }}>{netInfo.interfaceName}</div>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-title">Network Discovery</div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', marginBottom: 12 }}>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 12, color: 'var(--text-dim)', display: 'block', marginBottom: 4 }}>Subnet (first 3 octets)</label>
            <input className="input" value={subnet} onChange={(e) => setSubnet(e.target.value)} placeholder="192.168.1" disabled={scanning} />
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-dim)', lineHeight: '40px' }}>.1 — .254</div>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button className="btn btn-primary" onClick={runScan} disabled={scanning || !subnet}>
            {scanning ? <RefreshCw size={16} className="spin" /> : <Wifi size={16} />}
            {scanning ? 'Scanning...' : 'Discover Devices'}
          </button>
          {scanning && (
            <button className="btn btn-danger" onClick={() => window.api.stopNetworkScan()}>
              <StopCircle size={16} /> Stop
            </button>
          )}
        </div>
      </div>

      {/* Progress */}
      {scanning && progress && (
        <div className="card" style={{ marginBottom: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 8 }}>
            <span>
              {progress.phase === 'discovering' ? `Pinging ${progress.current || '...'}` : `Resolving ${progress.current || '...'}`}
            </span>
            <span>
              {progress.phase === 'discovering'
                ? `${progress.scanned} / ${progress.total} (${pct}%)`
                : `${progress.scanned} / ${progress.total} hosts`}
            </span>
          </div>
          <div className="progress-bar"><div className="progress-fill" style={{ width: `${pct}%` }} /></div>
          <div style={{ marginTop: 8, fontSize: 12, color: 'var(--success)' }}>
            {progress.found} device{progress.found !== 1 ? 's' : ''} found
          </div>
        </div>
      )}

      {/* Results */}
      {hosts.length > 0 && (
        <>
          <div className="stat-grid" style={{ marginTop: 16 }}>
            <div className="stat-card"><div className="stat-label">Devices Found</div><div className="stat-value" style={{ color: 'var(--success)' }}>{hosts.length}</div></div>
            <div className="stat-card"><div className="stat-label">Subnet</div><div className="stat-value" style={{ fontSize: 18 }}>{subnet}.0/24</div></div>
          </div>

          <div className="card">
            <div className="card-title">Devices on Network</div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th></th>
                    <th>IP Address</th>
                    <th>Hostname</th>
                    <th>MAC Address</th>
                    <th>Vendor</th>
                    <th>Latency</th>
                  </tr>
                </thead>
                <tbody>
                  {hosts.map((h) => (
                    <tr key={h.ip}>
                      <td><Monitor size={14} style={{ color: 'var(--accent)', opacity: 0.7 }} /></td>
                      <td style={{ fontFamily: 'Consolas, monospace', fontWeight: 600 }}>{h.ip}</td>
                      <td style={{ fontSize: 13 }}>{h.hostname || <span style={{ color: 'var(--text-dim)' }}>—</span>}</td>
                      <td style={{ fontFamily: 'Consolas, monospace', fontSize: 12 }}>{h.mac}</td>
                      <td>
                        {h.vendor ? (
                          <span className="badge badge-success">{h.vendor}</span>
                        ) : (
                          <span style={{ color: 'var(--text-dim)', fontSize: 12 }}>—</span>
                        )}
                      </td>
                      <td style={{ fontSize: 12 }}>
                        <span style={{ color: h.latency < 10 ? 'var(--success)' : h.latency < 100 ? 'var(--warning)' : 'var(--danger)' }}>
                          {h.latency}ms
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {!scanning && hosts.length === 0 && !progress && (
        <div className="card" style={{ textAlign: 'center', padding: 40, color: 'var(--text-dim)', marginTop: 16 }}>
          <Wifi size={48} style={{ marginBottom: 16, opacity: 0.3 }} />
          <div>Discover devices on your local network</div>
          <div style={{ fontSize: 12, marginTop: 8 }}>Ping sweep + ARP table — finds IPs, MAC addresses, hostnames, and device vendors</div>
        </div>
      )}
    </>
  );
}

/* ════════════════════════════════════════ MAIN PAGE ════════════════════════════════════════ */
export default function PortScanner() {
  const [tab, setTab] = useState<Tab>('ports');

  return (
    <div>
      <h1 className="page-title">Port &amp; Network Scanner</h1>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20 }}>
        <button
          className={`btn ${tab === 'ports' ? 'btn-primary' : 'btn-ghost'}`}
          style={{ padding: '8px 20px' }}
          onClick={() => setTab('ports')}
        >
          <Radar size={16} /> Port Scan
        </button>
        <button
          className={`btn ${tab === 'network' ? 'btn-primary' : 'btn-ghost'}`}
          style={{ padding: '8px 20px' }}
          onClick={() => setTab('network')}
        >
          <Wifi size={16} /> Network Scan
        </button>
      </div>

      {tab === 'ports' ? <PortScanTab /> : <NetworkScanTab />}
    </div>
  );
}
