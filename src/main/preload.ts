import { contextBridge, ipcRenderer } from 'electron';
import type { BloatedAPI, ScanProgress, VirusScanProgress, SecurityScanProgress, PortScanProgress, NetworkScanProgress } from '../shared/types';

const api: BloatedAPI = {
  // ── Cache ──
  scanCaches: () => ipcRenderer.invoke('cache:scan'),
  cleanCaches: (paths) => ipcRenderer.invoke('cache:clean', paths),
  onScanProgress: (cb) => {
    const handler = (_: any, progress: ScanProgress) => cb(progress);
    ipcRenderer.on('cache:scan-progress', handler);
    return () => ipcRenderer.removeListener('cache:scan-progress', handler);
  },

  // ── Virus ──
  startVirusScan: (mode, customPath) => ipcRenderer.invoke('virus:scan', mode, customPath),
  stopVirusScan: () => ipcRenderer.send('virus:stop'),
  onVirusScanProgress: (cb) => {
    const handler = (_: any, progress: VirusScanProgress) => cb(progress);
    ipcRenderer.on('virus:scan-progress', handler);
    return () => ipcRenderer.removeListener('virus:scan-progress', handler);
  },

  // ── Security ──
  runSecurityCheck: () => ipcRenderer.invoke('security:check'),
  onSecurityProgress: (cb) => {
    const handler = (_: any, progress: SecurityScanProgress) => cb(progress);
    ipcRenderer.on('security:progress', handler);
    return () => ipcRenderer.removeListener('security:progress', handler);
  },

  // ── Dev Environment ──
  checkDevEnv: (stacks) => ipcRenderer.invoke('env:check', stacks),

  // ── Port Scanner ──
  startPortScan: (opts) => ipcRenderer.invoke('ports:scan', opts),
  stopPortScan: () => ipcRenderer.send('ports:stop'),
  onPortScanProgress: (cb) => {
    const handler = (_: any, progress: PortScanProgress) => cb(progress);
    ipcRenderer.on('ports:scan-progress', handler);
    return () => ipcRenderer.removeListener('ports:scan-progress', handler);
  },

  // ── Network Scanner ──
  getNetworkInfo: () => ipcRenderer.invoke('network:info'),
  startNetworkScan: (subnet) => ipcRenderer.invoke('network:scan', subnet),
  stopNetworkScan: () => ipcRenderer.send('network:stop'),
  onNetworkScanProgress: (cb) => {
    const handler = (_: any, progress: NetworkScanProgress) => cb(progress);
    ipcRenderer.on('network:scan-progress', handler);
    return () => ipcRenderer.removeListener('network:scan-progress', handler);
  },

  // ── Settings ──
  getSettings: () => ipcRenderer.invoke('settings:get'),
  setSettings: (s) => ipcRenderer.invoke('settings:set', s),

  // ── System ──
  getSystemInfo: () => ipcRenderer.invoke('system:info'),
  openPath: (p) => ipcRenderer.send('system:open-path', p),
  selectDirectory: () => ipcRenderer.invoke('system:select-dir'),
};

contextBridge.exposeInMainWorld('api', api);
