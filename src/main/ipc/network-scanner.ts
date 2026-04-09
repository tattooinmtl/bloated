import { ipcMain, BrowserWindow } from 'electron';
import * as net from 'net';
import * as os from 'os';
import { execSync, execFile } from 'child_process';
import type { NetworkHost, NetworkScanProgress, NetworkInfo } from '../../shared/types';

/** Strict IPv4 validation to prevent command injection */
const STRICT_IPV4 = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/;
function isValidIPv4(ip: string): boolean {
  if (!STRICT_IPV4.test(ip)) return false;
  return ip.split('.').every((o) => { const n = parseInt(o, 10); return n >= 0 && n <= 255; });
}

let abortScan = false;

// ── MAC vendor lookup (common prefixes) ──
const OUI: Record<string, string> = {
  '00:50:56': 'VMware', '00:0C:29': 'VMware', '00:15:5D': 'Hyper-V',
  '08:00:27': 'VirtualBox', '0A:00:27': 'VirtualBox',
  'B8:27:EB': 'Raspberry Pi', 'DC:A6:32': 'Raspberry Pi', 'E4:5F:01': 'Raspberry Pi',
  '00:1A:79': 'Apple', '3C:22:FB': 'Apple', 'A8:60:B6': 'Apple',
  'AC:DE:48': 'Apple', 'F0:18:98': 'Apple', '00:17:F2': 'Apple',
  '44:65:0D': 'Amazon', 'FC:65:DE': 'Amazon', 'A4:08:EA': 'Amazon',
  '30:FD:38': 'Google', 'F4:F5:D8': 'Google', '54:60:09': 'Google',
  '50:6A:03': 'Netgear', '28:80:88': 'Netgear', 'C4:04:15': 'Netgear',
  'E0:63:DA': 'TP-Link', '50:C7:BF': 'TP-Link', '60:32:B1': 'TP-Link',
  '00:18:E7': 'Linksys', 'C0:56:27': 'Linksys',
  '70:3A:CB': 'Samsung', '8C:71:F8': 'Samsung', 'AC:5F:3E': 'Samsung',
  '00:25:00': 'Apple', '78:7B:8A': 'HP', '3C:D9:2B': 'HP',
  'D8:9E:F3': 'Dell', '00:14:22': 'Dell', 'F8:DB:88': 'Dell',
  '00:1D:D8': 'Microsoft', '7C:1E:52': 'Microsoft', '60:45:BD': 'Microsoft',
  '00:0E:C6': 'ASUS', '04:D4:C4': 'ASUS', '2C:56:DC': 'ASUS',
  'A4:4C:C8': 'Intel', '00:1B:21': 'Intel', '3C:97:0E': 'Intel',
};

function lookupVendor(mac: string): string {
  if (!mac || mac === '(unknown)') return '';
  const prefix = mac.toUpperCase().replace(/-/g, ':').slice(0, 8);
  return OUI[prefix] || '';
}

function getLocalNetwork(): NetworkInfo {
  const ifaces = os.networkInterfaces();
  for (const [name, addrs] of Object.entries(ifaces)) {
    if (!addrs) continue;
    for (const addr of addrs) {
      if (addr.family === 'IPv4' && !addr.internal) {
        const parts = addr.address.split('.');
        const subnet = parts.slice(0, 3).join('.');
        // Try to get gateway
        let gateway = subnet + '.1';
        try {
          const out = execSync('powershell -NoProfile -Command "(Get-NetRoute -DestinationPrefix 0.0.0.0/0 | Select-Object -First 1).NextHop"', {
            timeout: 5000, encoding: 'utf-8', windowsHide: true,
          }).trim();
          if (out && /^\d+\.\d+\.\d+\.\d+$/.test(out)) gateway = out;
        } catch { /* use default */ }
        return { localIp: addr.address, subnet, gateway, interfaceName: name };
      }
    }
  }
  return { localIp: '127.0.0.1', subnet: '127.0.0', gateway: '127.0.0.1', interfaceName: 'loopback' };
}

function pingHost(ip: string): Promise<number> {
  // Returns latency in ms, or -1 if unreachable
  return new Promise((resolve) => {
    try {
      const start = Date.now();
      const socket = new net.Socket();
      socket.setTimeout(800);
      socket.on('connect', () => {
        const latency = Date.now() - start;
        socket.destroy();
        resolve(latency);
      });
      socket.on('timeout', () => { socket.destroy(); resolve(-1); });
      socket.on('error', (err: any) => {
        socket.destroy();
        // ECONNREFUSED means host is alive but port closed
        if (err.code === 'ECONNREFUSED') resolve(Date.now() - start);
        else resolve(-1);
      });
      // Try port 80 first, fast indicator of alive host
      socket.connect(80, ip);
    } catch { resolve(-1); }
  });
}

function pingHostICMP(ip: string): Promise<number> {
  return new Promise((resolve) => {
    // Validate IP format before passing to any command to prevent injection
    if (!isValidIPv4(ip)) { resolve(-1); return; }
    try {
      // Use execFile with argument array — no shell, no injection
      execFile('ping', ['-n', '1', '-w', '500', ip], {
        timeout: 2000, encoding: 'utf-8', windowsHide: true,
      }, (err, stdout) => {
        if (err || !stdout) { resolve(-1); return; }
        const m = stdout.match(/time[=<](\d+)/i);
        if (m) resolve(parseInt(m[1], 10));
        else if (stdout.includes('TTL=') || stdout.includes('ttl=')) resolve(1);
        else resolve(-1);
      });
    } catch { resolve(-1); }
  });
}

function getArpTable(): Map<string, string> {
  const map = new Map<string, string>();
  try {
    const out = execSync('arp -a', { timeout: 5000, encoding: 'utf-8', windowsHide: true });
    const lines = out.split('\n');
    for (const line of lines) {
      const m = line.match(/(\d+\.\d+\.\d+\.\d+)\s+([\da-f]{2}[:-][\da-f]{2}[:-][\da-f]{2}[:-][\da-f]{2}[:-][\da-f]{2}[:-][\da-f]{2})/i);
      if (m) {
        const mac = m[2].replace(/-/g, ':').toUpperCase();
        if (mac !== 'FF:FF:FF:FF:FF:FF') map.set(m[1], mac);
      }
    }
  } catch { /* ignore */ }
  return map;
}

function resolveHostname(ip: string): string {
  // Validate IP format before passing to any command to prevent injection
  if (!isValidIPv4(ip)) return '';
  try {
    // Use execFile with argument array — no shell string interpolation
    const { execFileSync } = require('child_process');
    const out = (execFileSync('powershell', [
      '-NoProfile', '-Command',
      `([System.Net.Dns]::GetHostEntry('${ip}')).HostName`,
    ], {
      timeout: 3000, encoding: 'utf-8', windowsHide: true,
    }) as string).trim();
    if (out && out !== ip) return out;
  } catch { /* ignore */ }
  return '';
}

export function registerNetworkScannerIPC() {
  ipcMain.handle('network:info', () => getLocalNetwork());

  ipcMain.handle('network:scan', async (event, subnet: string) => {
    abortScan = false;
    const win = BrowserWindow.fromWebContents(event.sender);
    const hosts: NetworkHost[] = [];

    // Validate subnet format (x.x.x)
    if (!/^\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(subnet)) {
      return [];
    }

    const send = (p: NetworkScanProgress) => win?.webContents.send('network:scan-progress', p);
    const total = 254;
    let scanned = 0;

    // Phase 1: Ping sweep (ICMP + TCP in parallel for reliability)
    send({ phase: 'discovering', current: '', scanned: 0, total, found: 0 });

    const BATCH = 20; // concurrent pings
    const aliveIps: Map<string, number> = new Map();

    for (let batch = 1; batch <= 254; batch += BATCH) {
      if (abortScan) break;
      const promises: Promise<void>[] = [];

      for (let i = batch; i < batch + BATCH && i <= 254; i++) {
        const ip = `${subnet}.${i}`;
        promises.push((async () => {
          if (abortScan) return;
          // Try TCP first (faster), fall back to ICMP
          let latency = await pingHost(ip);
          if (latency < 0) latency = await pingHostICMP(ip);
          scanned++;
          if (latency >= 0) {
            aliveIps.set(ip, latency);
          }
          if (scanned % 5 === 0) {
            send({ phase: 'discovering', current: ip, scanned, total, found: aliveIps.size });
          }
        })());
      }
      await Promise.all(promises);
    }

    if (abortScan) {
      send({ phase: 'done', current: '', scanned: total, total, found: 0 });
      return [];
    }

    // Phase 2: Get ARP table for MAC addresses
    const arpTable = getArpTable();

    // Phase 3: Resolve hostnames for alive hosts
    const aliveList = [...aliveIps.entries()];
    for (let i = 0; i < aliveList.length; i++) {
      if (abortScan) break;
      const [ip, latency] = aliveList[i];
      send({ phase: 'resolving', current: ip, scanned: i, total: aliveList.length, found: aliveList.length });

      const mac = arpTable.get(ip) || '(unknown)';
      const vendor = lookupVendor(mac);
      const hostname = resolveHostname(ip);

      hosts.push({ ip, mac, hostname, vendor, latency });
    }

    // Sort by IP
    hosts.sort((a, b) => {
      const aParts = a.ip.split('.').map(Number);
      const bParts = b.ip.split('.').map(Number);
      for (let i = 0; i < 4; i++) {
        if (aParts[i] !== bParts[i]) return aParts[i] - bParts[i];
      }
      return 0;
    });

    send({ phase: 'done', current: '', scanned: total, total, found: hosts.length });
    return hosts;
  });

  ipcMain.on('network:stop', () => {
    abortScan = true;
  });
}
