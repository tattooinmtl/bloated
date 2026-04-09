/* ── Shared types for Bloated ── */

// ── Cache Cleaner ──

export interface CachePath {
  id: string;
  label: string;
  category: CacheCategory;
  path: string; // may contain %ENV_VAR%
  description?: string;
}

export type CacheCategory = 'system' | 'browser' | 'app' | 'other';

export interface ScanResult {
  id: string;
  label: string;
  category: CacheCategory;
  path: string;
  resolvedPath: string;
  exists: boolean;
  totalSize: number; // bytes
  fileCount: number;
  lastModified: number; // epoch ms
  children?: ScanResultFile[];
}

export interface ScanResultFile {
  path: string;
  size: number;
  lastModified: number;
}

export interface ScanProgress {
  phase: 'scanning' | 'calculating' | 'done';
  current: string; // path being scanned
  found: number;
  totalSize: number;
}

export interface CleanResult {
  deleted: number;
  skipped: number;
  freedBytes: number;
  errors: string[];
}

// ── Virus Scanner ──

export type ThreatLevel = 'clean' | 'suspicious' | 'malicious' | 'unknown' | 'error';

export interface VirusTotalResult {
  hash: string;
  detected: boolean;
  positives: number;
  total: number;
  engines: Record<string, { detected: boolean; result: string | null }>;
}

export interface FileThreat {
  filePath: string;
  fileSize: number;
  hash: string;
  threatLevel: ThreatLevel;
  virustotal?: VirusTotalResult;
}

export interface VirusScanProgress {
  phase: 'collecting' | 'hashing' | 'looking-up' | 'done';
  current: string;
  scanned: number;
  total: number;
  threats: number;
}

export type VirusScanMode = 'quick' | 'full' | 'custom';

// ── Settings ──

export interface AppSettings {
  vtApiKey: string;
  deleteMode: 'trash' | 'permanent';
  customCachePaths: string[];
  scanOnLaunch: boolean;
}

// ── Security Check ──

export type SecuritySeverity = 'critical' | 'warning' | 'info' | 'ok';

export interface SecurityCheckItem {
  id: string;
  category: string;
  label: string;
  severity: SecuritySeverity;
  detail: string;
  recommendation?: string;
}

export interface SecurityScanProgress {
  phase: 'scanning' | 'done';
  current: string;
  completed: number;
  total: number;
}

// ── Dev Environment ──

export type EnvStatus = 'found' | 'not-found' | 'outdated' | 'misconfigured';

export interface EnvToolInfo {
  id: string;
  name: string;
  icon: string; // emoji fallback
  status: EnvStatus;
  version?: string;
  path?: string;
  detail?: string;
  issues: string[];
  suggestions: string[];
}

export interface EnvCheckResult {
  tools: EnvToolInfo[];
  pathIssues: string[];
  generalIssues: string[];
}

export type DevStack =
  | 'node' | 'python' | 'java' | 'php' | 'dotnet' | 'go' | 'rust'
  | 'vite' | 'react' | 'nextjs' | 'nuxt' | 'angular' | 'vue'
  | 'git' | 'docker';

// ── Port Scanner ──

export type PortStatus = 'open' | 'closed' | 'filtered';

export interface PortResult {
  port: number;
  status: PortStatus;
  service: string;
  banner?: string;
}

export interface PortScanProgress {
  phase: 'scanning' | 'done';
  current: number;    // port being scanned
  scanned: number;
  total: number;
  openCount: number;
}

export interface PortScanOptions {
  target: string;          // IP or hostname
  startPort: number;
  endPort: number;
  timeout: number;         // ms per port
  concurrency: number;     // parallel probes
}

// ── Network Scanner ──

export interface NetworkHost {
  ip: string;
  mac: string;
  hostname: string;
  vendor: string;
  latency: number;       // ms
  openPorts?: number[];  // quick top-port check
}

export interface NetworkScanProgress {
  phase: 'discovering' | 'resolving' | 'done';
  current: string;
  scanned: number;
  total: number;
  found: number;
}

export interface NetworkInfo {
  localIp: string;
  subnet: string;          // e.g. "192.168.1"
  gateway: string;
  interfaceName: string;
}

// ── IPC API shape exposed via preload ──

export interface BloatedAPI {
  // Cache
  scanCaches: () => Promise<ScanResult[]>;
  cleanCaches: (paths: string[]) => Promise<CleanResult>;
  onScanProgress: (cb: (progress: ScanProgress) => void) => () => void;

  // Virus
  startVirusScan: (mode: VirusScanMode, customPath?: string) => Promise<FileThreat[]>;
  stopVirusScan: () => void;
  onVirusScanProgress: (cb: (progress: VirusScanProgress) => void) => () => void;

  // Security
  runSecurityCheck: () => Promise<SecurityCheckItem[]>;
  onSecurityProgress: (cb: (progress: SecurityScanProgress) => void) => () => void;

  // Dev Environment
  checkDevEnv: (stacks: DevStack[]) => Promise<EnvCheckResult>;

  // Port Scanner
  startPortScan: (opts: PortScanOptions) => Promise<PortResult[]>;
  stopPortScan: () => void;
  onPortScanProgress: (cb: (progress: PortScanProgress) => void) => () => void;

  // Network Scanner
  getNetworkInfo: () => Promise<NetworkInfo>;
  startNetworkScan: (subnet: string) => Promise<NetworkHost[]>;
  stopNetworkScan: () => void;
  onNetworkScanProgress: (cb: (progress: NetworkScanProgress) => void) => () => void;

  // Settings
  getSettings: () => Promise<AppSettings>;
  setSettings: (s: Partial<AppSettings>) => Promise<void>;

  // System
  getSystemInfo: () => Promise<{ totalDisk: number; freeDisk: number; platform: string }>;
  openPath: (p: string) => void;
  selectDirectory: () => Promise<string | null>;
}

declare global {
  interface Window {
    api: BloatedAPI;
  }
}
