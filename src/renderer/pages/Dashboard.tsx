import React, { useEffect, useState } from 'react';
import { HardDrive, Trash2, ShieldCheck } from 'lucide-react';
import { formatBytes } from '../utils/format';

export default function Dashboard() {
  const [diskInfo, setDiskInfo] = useState({ totalDisk: 0, freeDisk: 0, platform: '' });

  useEffect(() => {
    window.api.getSystemInfo().then(setDiskInfo);
  }, []);

  const usedDisk = diskInfo.totalDisk - diskInfo.freeDisk;
  const usedPct = diskInfo.totalDisk > 0 ? ((usedDisk / diskInfo.totalDisk) * 100).toFixed(1) : '0';

  return (
    <div>
      <h1 className="page-title">Dashboard</h1>

      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-label">Disk Used</div>
          <div className="stat-value">{usedPct}%</div>
          <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 4 }}>
            {formatBytes(usedDisk)} / {formatBytes(diskInfo.totalDisk)}
          </div>
          <div className="progress-bar" style={{ marginTop: 12 }}>
            <div className="progress-fill" style={{ width: `${usedPct}%` }} />
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Free Space</div>
          <div className="stat-value">{formatBytes(diskInfo.freeDisk)}</div>
        </div>
      </div>

      <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Quick Actions</h2>
      <div style={{ display: 'flex', gap: 12 }}>
        <a href="#/cache" className="btn btn-primary">
          <Trash2 size={16} />
          Scan Caches
        </a>
        <a href="#/scan" className="btn btn-ghost">
          <ShieldCheck size={16} />
          Quick Virus Scan
        </a>
      </div>
    </div>
  );
}
