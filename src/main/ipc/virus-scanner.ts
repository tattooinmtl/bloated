import { ipcMain, BrowserWindow } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import { hashFile, lookupHash } from '../utils/virustotal';
import type { FileThreat, VirusScanProgress, AppSettings } from '../../shared/types';

const EXECUTABLE_EXTS = new Set(['.exe', '.dll', '.bat', '.cmd', '.ps1', '.msi', '.vbs', '.js', '.wsf', '.scr', '.com', '.pif']);

let abortScan = false;

/** Yield to the event loop so the renderer can repaint. */
const yieldToUI = () => new Promise<void>((resolve) => setImmediate(resolve));

/** Collect files using async walk — yields to event loop so the window stays responsive. */
async function collectFiles(
  root: string,
  filterExts: boolean,
  onProgress: (current: string, found: number) => void,
): Promise<string[]> {
  const files: string[] = [];
  const stack: string[] = [root];
  let tick = 0;

  while (stack.length > 0) {
    if (abortScan) break;
    const dir = stack.pop()!;
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      continue; // permission denied — skip this folder
    }
    for (const entry of entries) {
      if (abortScan) break;
      const full = path.join(dir, entry.name);
      try {
        if (entry.isDirectory()) {
          stack.push(full);
          tick++;
          if (tick % 30 === 0) {
            onProgress(full, files.length);
            await yieldToUI();
          }
        } else if (entry.isFile()) {
          if (filterExts) {
            const ext = path.extname(entry.name).toLowerCase();
            if (!EXECUTABLE_EXTS.has(ext)) continue;
          }
          files.push(full);
        }
      } catch { /* skip locked/vanished */ }
    }
  }
  return files;
}

export function registerVirusScannerIPC(getSettings: () => AppSettings) {
  ipcMain.handle('virus:scan', async (event, mode: string, customPath?: string): Promise<FileThreat[]> => {
    abortScan = false;
    const win = BrowserWindow.fromWebContents(event.sender);
    const settings = getSettings();
    const threats: FileThreat[] = [];

    // Determine scan root
    let scanRoot: string;
    if (mode === 'custom' && customPath) {
      scanRoot = customPath;
    } else {
      scanRoot = process.env.USERPROFILE || 'C:\\Users';
    }

    if (!fs.existsSync(scanRoot)) return [];

    // ── Phase 1: Collect files (live progress) ──
    const send = (p: VirusScanProgress) => win?.webContents.send('virus:scan-progress', p);

    send({ phase: 'collecting', current: scanRoot, scanned: 0, total: 0, threats: 0 });

    const files = await collectFiles(scanRoot, mode === 'quick', (current, found) => {
      send({ phase: 'collecting', current, scanned: 0, total: found, threats: 0 });
    });

    if (abortScan) {
      send({ phase: 'done', current: '', scanned: 0, total: files.length, threats: 0 });
      return [];
    }

    const total = files.length;

    // ── Phase 2: Hash + VT lookup ──
    for (let i = 0; i < files.length; i++) {
      if (abortScan) break;

      const filePath = files[i];
      send({ phase: 'hashing', current: filePath, scanned: i, total, threats: threats.length });

      let hash = '';
      try {
        hash = await hashFile(filePath);
      } catch {
        continue; // locked file, skip
      }

      const threat: FileThreat = {
        filePath,
        fileSize: 0,
        hash,
        threatLevel: 'clean',
      };

      try {
        threat.fileSize = fs.statSync(filePath).size;
      } catch { /* ignore */ }

      // VirusTotal hash lookup (public database — no file upload)
      if (settings.vtApiKey) {
        send({ phase: 'looking-up', current: filePath, scanned: i, total, threats: threats.length });
        try {
          const vtResult = await lookupHash(hash, settings.vtApiKey);
          if (vtResult) {
            threat.virustotal = {
              hash,
              detected: vtResult.positives > 0,
              positives: vtResult.positives,
              total: vtResult.total,
              engines: vtResult.engines,
            };
            if (vtResult.positives > 3) {
              threat.threatLevel = 'malicious';
            } else if (vtResult.positives > 0) {
              threat.threatLevel = 'suspicious';
            }
          }
        } catch { /* rate limit or API error — skip */ }
      }

      if (threat.threatLevel !== 'clean') {
        threats.push(threat);
      }
    }

    send({ phase: 'done', current: '', scanned: total, total, threats: threats.length });
    return threats;
  });

  ipcMain.on('virus:stop', () => {
    abortScan = true;
  });
}
