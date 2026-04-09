import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Search, Trash2, FolderOpen, ArrowUpDown } from 'lucide-react';
import { formatBytes, formatNumber } from '../utils/format';
import type { ScanResult, ScanProgress, CacheCategory } from '../../shared/types';

const CATEGORY_LABELS: Record<CacheCategory, string> = {
  system: 'System',
  browser: 'Browser',
  app: 'Application',
  other: 'Other / Custom',
};

type SortField = 'size' | 'name' | 'files' | 'date';
type SortDir = 'asc' | 'desc';

export default function CacheCleaner() {
  const [results, setResults] = useState<ScanResult[]>([]);
  const [scanning, setScanning] = useState(false);
  const [cleaning, setCleaning] = useState(false);
  const [progress, setProgress] = useState<ScanProgress | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [cleanSummary, setCleanSummary] = useState<{ deleted: number; freed: number; errors: string[] } | null>(null);

  // Sort & filter state
  const [sortField, setSortField] = useState<SortField>('size');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [minSizeMB, setMinSizeMB] = useState('');

  useEffect(() => {
    const unsub = window.api.onScanProgress(setProgress);
    return unsub;
  }, []);

  const handleScan = useCallback(async () => {
    setScanning(true);
    setResults([]);
    setSelected(new Set());
    setCleanSummary(null);
    try {
      const res = await window.api.scanCaches();
      setResults(res.filter((r) => r.exists && r.totalSize > 0));
    } finally {
      setScanning(false);
    }
  }, []);

  const toggleItem = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir(field === 'name' ? 'asc' : 'desc');
    }
  };

  // Filtered + sorted results (flat list, not grouped)
  const filtered = useMemo(() => {
    const minBytes = parseFloat(minSizeMB) > 0 ? parseFloat(minSizeMB) * 1024 * 1024 : 0;
    let list = results.filter((r) => r.totalSize >= minBytes);

    list.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'size': cmp = a.totalSize - b.totalSize; break;
        case 'name': cmp = a.label.localeCompare(b.label); break;
        case 'files': cmp = a.fileCount - b.fileCount; break;
        case 'date': cmp = a.lastModified - b.lastModified; break;
      }
      return sortDir === 'desc' ? -cmp : cmp;
    });

    return list;
  }, [results, sortField, sortDir, minSizeMB]);

  const selectAll = () => {
    if (filtered.every((r) => selected.has(r.id))) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map((r) => r.id)));
    }
  };

  const selectedBytes = results.filter((r) => selected.has(r.id)).reduce((s, r) => s + r.totalSize, 0);
  const totalFound = results.reduce((s, r) => s + r.totalSize, 0);

  const handleClean = useCallback(async () => {
    const paths = results.filter((r) => selected.has(r.id)).map((r) => r.resolvedPath);
    if (paths.length === 0) return;
    setCleaning(true);
    try {
      const res = await window.api.cleanCaches(paths);
      setCleanSummary({ deleted: res.deleted, freed: res.freedBytes, errors: res.errors });
      const fresh = await window.api.scanCaches();
      setResults(fresh.filter((r) => r.exists && r.totalSize > 0));
      setSelected(new Set());
    } finally {
      setCleaning(false);
    }
  }, [results, selected]);

  const SortHeader = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <th
      style={{ cursor: 'pointer', userSelect: 'none', textAlign: field === 'name' ? 'left' : 'right' }}
      onClick={() => handleSort(field)}
    >
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
        {children}
        {sortField === field && <ArrowUpDown size={12} style={{ opacity: 1 }} />}
        {sortField !== field && <ArrowUpDown size={12} style={{ opacity: 0.3 }} />}
      </span>
    </th>
  );

  return (
    <div>
      <h1 className="page-title">Cache Cleaner</h1>

      {/* Toolbar */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
        <button className="btn btn-primary" onClick={handleScan} disabled={scanning}>
          <Search size={16} />
          {scanning ? 'Scanning...' : 'Scan Caches'}
        </button>
        {results.length > 0 && (
          <button className="btn btn-danger" onClick={handleClean} disabled={cleaning || selected.size === 0}>
            <Trash2 size={16} />
            {cleaning ? 'Cleaning...' : `Clean ${formatBytes(selectedBytes)}`}
          </button>
        )}
        {results.length > 0 && (
          <>
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
              <label style={{ fontSize: 12, color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>Min size (MB)</label>
              <input
                className="input"
                type="number"
                min="0"
                step="1"
                placeholder="0"
                value={minSizeMB}
                onChange={(e) => setMinSizeMB(e.target.value)}
                style={{ width: 80, padding: '6px 8px' }}
              />
            </div>
          </>
        )}
      </div>

      {/* Progress */}
      {scanning && progress && (
        <div className="scan-status">
          <div className="progress-bar" style={{ width: 120 }}>
            <div className="progress-fill" style={{ width: '100%', animation: 'none' }} />
          </div>
          <span className="current-path">{progress.current}</span>
          <span>{formatBytes(progress.totalSize)} found</span>
        </div>
      )}

      {/* Clean summary */}
      {cleanSummary && (
        <div className="card" style={{ borderColor: 'var(--success)' }}>
          <strong style={{ color: 'var(--success)' }}>Cleaned!</strong> Freed {formatBytes(cleanSummary.freed)} across {cleanSummary.deleted} items.
          {cleanSummary.errors.length > 0 && (
            <div style={{ marginTop: 8, fontSize: 12, color: 'var(--danger)' }}>
              {cleanSummary.errors.length} items skipped (locked or in use)
            </div>
          )}
        </div>
      )}

      {/* Stats bar */}
      {results.length > 0 && (
        <div style={{ display: 'flex', gap: 24, marginBottom: 16, fontSize: 13 }}>
          <span>Found <strong>{results.length}</strong> locations</span>
          <span>Total: <strong>{formatBytes(totalFound)}</strong></span>
          <span>Showing: <strong>{filtered.length}</strong> items</span>
          <span>Selected: <strong>{formatBytes(selectedBytes)}</strong></span>
        </div>
      )}

      {/* Results table */}
      {filtered.length > 0 && (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th style={{ width: 40 }}>
                  <input
                    type="checkbox"
                    checked={filtered.length > 0 && filtered.every((r) => selected.has(r.id))}
                    onChange={selectAll}
                  />
                </th>
                <SortHeader field="name">Name</SortHeader>
                <th>Category</th>
                <th>Path</th>
                <SortHeader field="size">Size</SortHeader>
                <SortHeader field="files">Files</SortHeader>
                <SortHeader field="date">Modified</SortHeader>
                <th style={{ width: 40 }}></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id}>
                  <td>
                    <input type="checkbox" checked={selected.has(r.id)} onChange={() => toggleItem(r.id)} />
                  </td>
                  <td style={{ fontWeight: 500 }}>{r.label}</td>
                  <td>
                    <span className={`badge ${r.category === 'system' ? 'badge-warning' : r.category === 'browser' ? 'badge-danger' : 'badge-success'}`}>
                      {CATEGORY_LABELS[r.category]}
                    </span>
                  </td>
                  <td style={{ color: 'var(--text-dim)', fontSize: 12, maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {r.resolvedPath}
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>{formatBytes(r.totalSize)}</td>
                  <td style={{ textAlign: 'right' }}>{formatNumber(r.fileCount)}</td>
                  <td style={{ textAlign: 'right', fontSize: 12, color: 'var(--text-dim)' }}>
                    {r.lastModified > 0 ? new Date(r.lastModified).toLocaleDateString() : '—'}
                  </td>
                  <td>
                    <button
                      className="btn btn-ghost"
                      style={{ padding: '4px 6px' }}
                      onClick={() => window.api.openPath(r.resolvedPath)}
                      title="Open folder"
                    >
                      <FolderOpen size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!scanning && results.length === 0 && (
        <div style={{ textAlign: 'center', color: 'var(--text-dim)', marginTop: 80 }}>
          Click <strong>Scan Caches</strong> to find bloated folders on your system.
        </div>
      )}
    </div>
  );
}
