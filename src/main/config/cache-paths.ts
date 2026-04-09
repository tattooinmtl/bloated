import type { CachePath } from '../../shared/types';

/**
 * Registry of known Windows cache / temp directories.
 * Paths may contain %ENV_VAR% tokens – they are resolved at scan time.
 */
export const CACHE_PATHS: CachePath[] = [
  // ── System (Disk Cleanup equivalents) ──
  { id: 'win-temp', label: 'Windows Temp', category: 'system', path: '%TEMP%', description: 'User temp folder' },
  { id: 'win-temp-sys', label: 'System Temp', category: 'system', path: 'C:\\Windows\\Temp', description: 'System-wide temp (needs admin)' },
  { id: 'win-prefetch', label: 'Prefetch', category: 'system', path: 'C:\\Windows\\Prefetch', description: 'Windows prefetch cache (needs admin)' },
  { id: 'win-update', label: 'Windows Update Cache', category: 'system', path: 'C:\\Windows\\SoftwareDistribution\\Download', description: 'Cached Windows Updates (needs admin)' },
  { id: 'recent', label: 'Recent Files', category: 'system', path: '%APPDATA%\\Microsoft\\Windows\\Recent', description: 'Shortcuts to recently opened files' },
  { id: 'thumbcache', label: 'Thumbnail Cache', category: 'system', path: '%LOCALAPPDATA%\\Microsoft\\Windows\\Explorer', description: 'Explorer thumbnail db files' },
  { id: 'win-logs', label: 'Windows Logs', category: 'system', path: 'C:\\Windows\\Logs', description: 'System log files (needs admin)' },
  { id: 'win-crash-dumps', label: 'Crash Dumps', category: 'system', path: '%LOCALAPPDATA%\\CrashDumps', description: 'Application crash dump files' },
  { id: 'win-delivery-opt', label: 'Delivery Optimization', category: 'system', path: 'C:\\Windows\\SoftwareDistribution\\DeliveryOptimization', description: 'Windows delivery optimization cache' },
  { id: 'win-font-cache', label: 'Font Cache', category: 'system', path: '%LOCALAPPDATA%\\FontCache', description: 'Windows font cache' },
  { id: 'win-installer-temp', label: 'Installer Temp', category: 'system', path: 'C:\\Windows\\Installer\\$PatchCache$', description: 'Windows installer patch cache (needs admin)' },
  { id: 'recycle-bin', label: 'Recycle Bin', category: 'system', path: 'C:\\$Recycle.Bin', description: 'Recycle Bin contents (needs admin)' },
  { id: 'win-wer', label: 'Error Reports', category: 'system', path: '%LOCALAPPDATA%\\Microsoft\\Windows\\WER', description: 'Windows Error Reporting data' },
  { id: 'win-inetcache', label: 'Internet Cache', category: 'system', path: '%LOCALAPPDATA%\\Microsoft\\Windows\\INetCache', description: 'IE/Edge legacy internet cache' },
  { id: 'win-webcache', label: 'WebCache', category: 'system', path: '%LOCALAPPDATA%\\Microsoft\\Windows\\WebCache', description: 'System web cache database' },
  { id: 'win-action-cache', label: 'Action Center Cache', category: 'system', path: '%LOCALAPPDATA%\\Microsoft\\Windows\\ActionCenterCache', description: 'Notification action center cache' },

  // ── Browsers ──
  { id: 'chrome-cache', label: 'Chrome Cache', category: 'browser', path: '%LOCALAPPDATA%\\Google\\Chrome\\User Data\\Default\\Cache', description: 'Chrome browser cache' },
  { id: 'chrome-code-cache', label: 'Chrome Code Cache', category: 'browser', path: '%LOCALAPPDATA%\\Google\\Chrome\\User Data\\Default\\Code Cache', description: 'Chrome V8 code cache' },
  { id: 'chrome-gpu-cache', label: 'Chrome GPU Cache', category: 'browser', path: '%LOCALAPPDATA%\\Google\\Chrome\\User Data\\Default\\GPUCache', description: 'Chrome GPU shader cache' },
  { id: 'chrome-service-worker', label: 'Chrome Service Worker', category: 'browser', path: '%LOCALAPPDATA%\\Google\\Chrome\\User Data\\Default\\Service Worker', description: 'Chrome service worker cache' },
  { id: 'edge-cache', label: 'Edge Cache', category: 'browser', path: '%LOCALAPPDATA%\\Microsoft\\Edge\\User Data\\Default\\Cache', description: 'Edge browser cache' },
  { id: 'edge-code-cache', label: 'Edge Code Cache', category: 'browser', path: '%LOCALAPPDATA%\\Microsoft\\Edge\\User Data\\Default\\Code Cache', description: 'Edge V8 code cache' },
  { id: 'edge-gpu-cache', label: 'Edge GPU Cache', category: 'browser', path: '%LOCALAPPDATA%\\Microsoft\\Edge\\User Data\\Default\\GPUCache', description: 'Edge GPU shader cache' },
  { id: 'edge-service-worker', label: 'Edge Service Worker', category: 'browser', path: '%LOCALAPPDATA%\\Microsoft\\Edge\\User Data\\Default\\Service Worker', description: 'Edge service worker cache' },
  { id: 'firefox-cache', label: 'Firefox Cache', category: 'browser', path: '%LOCALAPPDATA%\\Mozilla\\Firefox\\Profiles', description: 'Firefox profile caches' },
  { id: 'brave-cache', label: 'Brave Cache', category: 'browser', path: '%LOCALAPPDATA%\\BraveSoftware\\Brave-Browser\\User Data\\Default\\Cache', description: 'Brave browser cache' },

  // ── Applications ──
  { id: 'npm-cache', label: 'npm Cache', category: 'app', path: '%APPDATA%\\npm-cache', description: 'npm package cache' },
  { id: 'pip-cache', label: 'pip Cache', category: 'app', path: '%LOCALAPPDATA%\\pip\\Cache', description: 'Python pip cache' },
  { id: 'discord-cache', label: 'Discord Cache', category: 'app', path: '%APPDATA%\\discord\\Cache', description: 'Discord cached data' },
  { id: 'discord-code-cache', label: 'Discord Code Cache', category: 'app', path: '%APPDATA%\\discord\\Code Cache', description: 'Discord V8 code cache' },
  { id: 'spotify-cache', label: 'Spotify Cache', category: 'app', path: '%LOCALAPPDATA%\\Spotify\\Storage', description: 'Spotify persistent cache' },
  { id: 'spotify-data', label: 'Spotify Data', category: 'app', path: '%LOCALAPPDATA%\\Spotify\\Data', description: 'Spotify offline data' },
  { id: 'vscode-cache', label: 'VS Code Cache', category: 'app', path: '%APPDATA%\\Code\\Cache', description: 'VS Code editor cache' },
  { id: 'vscode-cachedext', label: 'VS Code Cached Extensions', category: 'app', path: '%APPDATA%\\Code\\CachedExtensions', description: 'VS Code cached extension data' },
  { id: 'vscode-cacheddata', label: 'VS Code Cached Data', category: 'app', path: '%APPDATA%\\Code\\CachedData', description: 'VS Code V8 cached data' },
  { id: 'vscode-logs', label: 'VS Code Logs', category: 'app', path: '%APPDATA%\\Code\\logs', description: 'VS Code log files' },
  { id: 'teams-cache', label: 'Teams Cache', category: 'app', path: '%APPDATA%\\Microsoft\\Teams\\Cache', description: 'Microsoft Teams cache' },
  { id: 'teams-blob', label: 'Teams Blob Storage', category: 'app', path: '%APPDATA%\\Microsoft\\Teams\\blob_storage', description: 'Teams blob storage' },
  { id: 'nuget-cache', label: 'NuGet Cache', category: 'app', path: '%LOCALAPPDATA%\\NuGet\\v3-cache', description: '.NET NuGet package cache' },
  { id: 'yarn-cache', label: 'Yarn Cache', category: 'app', path: '%LOCALAPPDATA%\\Yarn\\Cache', description: 'Yarn package cache' },
  { id: 'steam-htmlcache', label: 'Steam HTML Cache', category: 'app', path: '%LOCALAPPDATA%\\Steam\\htmlcache', description: 'Steam browser cache' },
  { id: 'steam-depotcache', label: 'Steam Depot Cache', category: 'app', path: 'C:\\Program Files (x86)\\Steam\\depotcache', description: 'Steam depot cache' },
  { id: 'onedrive-logs', label: 'OneDrive Logs', category: 'app', path: '%LOCALAPPDATA%\\Microsoft\\OneDrive\\logs', description: 'OneDrive log files' },
  { id: 'nvidia-cache', label: 'NVIDIA Shader Cache', category: 'app', path: '%LOCALAPPDATA%\\NVIDIA\\DXCache', description: 'NVIDIA DirectX shader cache' },
  { id: 'nvidia-glcache', label: 'NVIDIA GL Cache', category: 'app', path: '%LOCALAPPDATA%\\NVIDIA\\GLCache', description: 'NVIDIA OpenGL shader cache' },
  { id: 'amd-shader-cache', label: 'AMD Shader Cache', category: 'app', path: '%LOCALAPPDATA%\\AMD\\DxCache', description: 'AMD DirectX shader cache' },
  { id: 'intel-shader-cache', label: 'Intel Shader Cache', category: 'app', path: '%LOCALAPPDATA%\\Intel\\ShaderCache', description: 'Intel shader cache' },
];

/** Resolve %ENV_VAR% tokens in a path string */
export function resolveEnvPath(p: string): string {
  return p.replace(/%([^%]+)%/g, (_, varName) => process.env[varName] || '');
}
