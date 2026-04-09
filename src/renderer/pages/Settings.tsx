import React, { useEffect, useState, useCallback } from 'react';
import { Save, Plus, X } from 'lucide-react';
import type { AppSettings } from '../../shared/types';

const DEFAULT: AppSettings = {
  vtApiKey: '',
  deleteMode: 'trash',
  customCachePaths: [],
  scanOnLaunch: false,
};

export default function SettingsPage() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT);
  const [saved, setSaved] = useState(false);
  const [newPath, setNewPath] = useState('');

  useEffect(() => {
    window.api.getSettings().then(setSettings);
  }, []);

  const save = useCallback(async (partial: Partial<AppSettings>) => {
    const updated = { ...settings, ...partial };
    setSettings(updated);
    await window.api.setSettings(partial);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }, [settings]);

  const addCustomPath = async () => {
    const dir = await window.api.selectDirectory();
    if (dir && !settings.customCachePaths.includes(dir)) {
      save({ customCachePaths: [...settings.customCachePaths, dir] });
    }
  };

  const removeCustomPath = (p: string) => {
    save({ customCachePaths: settings.customCachePaths.filter((x) => x !== p) });
  };

  return (
    <div>
      <h1 className="page-title">Settings</h1>

      <div className="card">
        {/* VirusTotal API Key */}
        <div className="setting-row">
          <div>
            <div className="setting-label">VirusTotal API Key</div>
            <div className="setting-desc">Free key from virustotal.com — used for hash lookups (never uploads files)</div>
          </div>
          <div style={{ width: 340 }}>
            <input
              className="input"
              type="password"
              placeholder="Enter your API key"
              value={settings.vtApiKey}
              onChange={(e) => setSettings({ ...settings, vtApiKey: e.target.value })}
              onBlur={() => save({ vtApiKey: settings.vtApiKey })}
            />
          </div>
        </div>

        {/* Delete mode */}
        <div className="setting-row">
          <div>
            <div className="setting-label">Delete Mode</div>
            <div className="setting-desc">Recycle Bin is safer — files can be recovered. Permanent is irreversible.</div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              className={`btn ${settings.deleteMode === 'trash' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => save({ deleteMode: 'trash' })}
            >
              Recycle Bin
            </button>
            <button
              className={`btn ${settings.deleteMode === 'permanent' ? 'btn-danger' : 'btn-ghost'}`}
              onClick={() => save({ deleteMode: 'permanent' })}
            >
              Permanent
            </button>
          </div>
        </div>

        {/* Scan on launch */}
        <div className="setting-row">
          <div>
            <div className="setting-label">Scan on Launch</div>
            <div className="setting-desc">Automatically scan caches when app starts</div>
          </div>
          <label className="toggle">
            <input
              type="checkbox"
              checked={settings.scanOnLaunch}
              onChange={(e) => save({ scanOnLaunch: e.target.checked })}
            />
            <span className="toggle-slider" />
          </label>
        </div>
      </div>

      {/* Custom cache paths */}
      <div className="card" style={{ marginTop: 16 }}>
        <div className="card-title">Custom Cache Paths</div>
        <div style={{ fontSize: 13, color: 'var(--text-dim)', marginBottom: 12 }}>
          Add extra folders to include in cache scans.
        </div>

        {settings.customCachePaths.map((p) => (
          <div key={p} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0' }}>
            <span style={{ flex: 1, fontSize: 13 }}>{p}</span>
            <button className="btn btn-ghost" style={{ padding: '4px 8px' }} onClick={() => removeCustomPath(p)}>
              <X size={14} />
            </button>
          </div>
        ))}

        <button className="btn btn-ghost" style={{ marginTop: 8 }} onClick={addCustomPath}>
          <Plus size={16} />
          Add Folder
        </button>
      </div>

      {saved && (
        <div style={{ position: 'fixed', bottom: 24, right: 24, background: 'var(--success)', color: '#000', padding: '10px 20px', borderRadius: 8, fontWeight: 600, fontSize: 13 }}>
          Settings saved
        </div>
      )}
    </div>
  );
}
