import { app, BrowserWindow, ipcMain, shell, dialog } from 'electron';
import * as path from 'path';
import * as os from 'os';
import { checkDiskSpace } from './utils/disk';
import { registerCacheScannerIPC } from './ipc/cache-scanner';
import { registerVirusScannerIPC } from './ipc/virus-scanner';
import { registerSecurityCheckerIPC } from './ipc/security-checker';
import { registerEnvCheckerIPC } from './ipc/env-checker';
import { registerPortScannerIPC } from './ipc/port-scanner';
import { registerNetworkScannerIPC } from './ipc/network-scanner';
import type { AppSettings } from '../shared/types';

// ── Settings (simple JSON store) ──
import * as fs from 'fs';

const settingsPath = path.join(app.getPath('userData'), 'settings.json');

const DEFAULT_SETTINGS: AppSettings = {
  vtApiKey: '',
  deleteMode: 'trash',
  customCachePaths: [],
  scanOnLaunch: false,
};

function loadSettings(): AppSettings {
  try {
    if (fs.existsSync(settingsPath)) {
      const raw = fs.readFileSync(settingsPath, 'utf-8');
      return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
    }
  } catch { /* corrupted file — reset */ }
  return { ...DEFAULT_SETTINGS };
}

function saveSettings(s: AppSettings) {
  fs.writeFileSync(settingsPath, JSON.stringify(s, null, 2));
}

let settings = loadSettings();
const getSettings = () => settings;

// ── Window ──

let mainWindow: BrowserWindow | null = null;
let splashWindow: BrowserWindow | null = null;

function splashLog(msg: string) {
  splashWindow?.webContents.send('splash:log', msg);
}

function splashProgress(pct: number) {
  splashWindow?.webContents.send('splash:progress', pct);
}

function createSplashWindow(): Promise<void> {
  return new Promise((resolve) => {
    splashWindow = new BrowserWindow({
      width: 520,
      height: 340,
      frame: false,
      resizable: false,
      transparent: false,
      alwaysOnTop: true,
      backgroundColor: '#000000',
      webPreferences: {
        contextIsolation: false,
        nodeIntegration: true,
      },
    });
    splashWindow.setMenuBarVisibility(false);
    splashWindow.loadFile(path.join(app.getAppPath(), 'src', 'splash.html'));
    splashWindow.webContents.on('did-finish-load', () => resolve());
  });
}

async function bootSequence() {
  // Show splash
  await createSplashWindow();

  const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

  splashLog('[boot] Bloated v1.1.0');
  splashProgress(5);
  await wait(300);

  splashLog('[init] Electron ' + process.versions.electron);
  splashProgress(10);
  await wait(250);

  splashLog('[init] Node ' + process.versions.node);
  splashProgress(15);
  await wait(250);

  splashLog('[init] Chrome ' + process.versions.chrome);
  splashProgress(18);
  await wait(300);

  splashLog('[config] Loading user settings...');
  settings = loadSettings();
  splashProgress(22);
  await wait(400);

  splashLog('[config] Settings path: ' + settingsPath);
  splashProgress(26);
  await wait(200);

  splashLog('[config] Delete mode: ' + settings.deleteMode);
  splashProgress(30);
  await wait(200);

  splashLog('[config] VT API key: ' + (settings.vtApiKey ? '****' + settings.vtApiKey.slice(-4) : 'not set'));
  splashProgress(34);
  await wait(300);

  splashLog('[ipc] Registering cache scanner...');
  registerCacheScannerIPC(getSettings);
  splashProgress(40);
  await wait(350);

  splashLog('[ipc] Registering virus scanner...');
  registerVirusScannerIPC(getSettings);
  splashProgress(44);
  await wait(300);

  splashLog('[ipc] Registering security checker...');
  registerSecurityCheckerIPC();
  splashProgress(48);
  await wait(300);

  splashLog('[ipc] Registering environment checker...');
  registerEnvCheckerIPC();
  splashProgress(52);
  await wait(300);

  splashLog('[ipc] Registering port scanner...');
  registerPortScannerIPC();
  splashProgress(53);
  await wait(250);

  splashLog('[ipc] Registering network scanner...');
  registerNetworkScannerIPC();
  splashProgress(55);
  await wait(250);

  splashLog('[ipc] Registering settings handlers...');
  splashProgress(58);
  await wait(250);

  splashLog('[system] Checking disk space...');
  splashProgress(56);
  try {
    const disk = await checkDiskSpace('C:');
    const freeGB = (disk.free / (1024 ** 3)).toFixed(1);
    const totalGB = (disk.total / (1024 ** 3)).toFixed(1);
    splashLog('[system] Disk C: ' + freeGB + ' GB free / ' + totalGB + ' GB total');
  } catch {
    splashLog('[system] Disk check skipped');
  }
  splashProgress(64);
  await wait(300);

  splashLog('[system] Platform: ' + os.platform() + ' ' + os.arch());
  splashProgress(68);
  await wait(200);

  splashLog('[system] CPU: ' + os.cpus()[0]?.model);
  splashProgress(72);
  await wait(250);

  splashLog('[system] Memory: ' + (os.totalmem() / (1024 ** 3)).toFixed(1) + ' GB');
  splashProgress(76);
  await wait(300);

  splashLog('[window] Creating main window...');
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 750,
    minWidth: 900,
    minHeight: 600,
    show: false,
    title: 'Bloated',
    backgroundColor: '#0f0f0f',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });
  mainWindow.setMenuBarVisibility(false);
  splashProgress(82);
  await wait(350);

  splashLog('[window] Loading renderer assets...');
  splashProgress(86);
  if (process.env.VITE_DEV_SERVER_URL) {
    await mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    await mainWindow.loadFile(path.join(__dirname, '..', '..', 'renderer', 'index.html'));
  }
  splashProgress(92);
  await wait(300);

  splashLog('[window] Renderer loaded');
  splashProgress(96);
  await wait(250);

  splashLog('[ready] Launching Bloated...');
  splashProgress(100);
  await wait(500);

  mainWindow.show();
  splashWindow?.close();
  splashWindow = null;
}

// ── IPC: Settings ──

ipcMain.handle('settings:get', () => settings);
ipcMain.handle('settings:set', (_event, partial: Partial<AppSettings>) => {
  settings = { ...settings, ...partial };
  saveSettings(settings);
});

// ── IPC: System ──

ipcMain.handle('system:info', async () => {
  const disk = await checkDiskSpace('C:');
  return { totalDisk: disk.total, freeDisk: disk.free, platform: os.platform() };
});

ipcMain.on('system:open-path', (_event, p: string) => {
  if (typeof p === 'string' && p.length > 0) {
    shell.openPath(p);
  }
});

ipcMain.handle('system:select-dir', async (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (!win) return null;
  const result = await dialog.showOpenDialog(win, { properties: ['openDirectory'] });
  return result.canceled ? null : result.filePaths[0] ?? null;
});

// ── App lifecycle ──

process.on('uncaughtException', (err) => {
  console.error('[MAIN] uncaughtException:', err);
});

app.whenReady().then(() => {
  bootSequence();
});

app.on('window-all-closed', () => {
  app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) bootSequence();
});
