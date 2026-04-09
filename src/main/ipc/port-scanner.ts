import { ipcMain, BrowserWindow } from 'electron';
import * as net from 'net';
import type { PortResult, PortScanOptions, PortScanProgress, PortStatus } from '../../shared/types';

let abortScan = false;

// Well-known service names
const SERVICES: Record<number, string> = {
  20: 'FTP Data', 21: 'FTP', 22: 'SSH', 23: 'Telnet', 25: 'SMTP',
  53: 'DNS', 67: 'DHCP', 68: 'DHCP', 69: 'TFTP', 80: 'HTTP',
  88: 'Kerberos', 110: 'POP3', 119: 'NNTP', 123: 'NTP', 135: 'RPC',
  137: 'NetBIOS', 138: 'NetBIOS', 139: 'NetBIOS', 143: 'IMAP',
  161: 'SNMP', 162: 'SNMP Trap', 389: 'LDAP', 443: 'HTTPS',
  445: 'SMB', 464: 'Kerberos', 465: 'SMTPS', 500: 'IKE/IPSec',
  515: 'LPD', 520: 'RIP', 587: 'SMTP Submission', 593: 'RPC/HTTP',
  636: 'LDAPS', 989: 'FTPS Data', 990: 'FTPS', 993: 'IMAPS',
  995: 'POP3S', 1080: 'SOCKS', 1433: 'MSSQL', 1434: 'MSSQL Browser',
  1521: 'Oracle', 1723: 'PPTP', 2049: 'NFS', 2082: 'cPanel',
  2083: 'cPanel SSL', 2086: 'WHM', 2087: 'WHM SSL',
  3306: 'MySQL', 3389: 'RDP', 3478: 'STUN', 4443: 'Pharos',
  5060: 'SIP', 5061: 'SIP TLS', 5432: 'PostgreSQL', 5900: 'VNC',
  5985: 'WinRM', 5986: 'WinRM SSL', 6379: 'Redis', 6443: 'Kubernetes',
  8080: 'HTTP Alt', 8443: 'HTTPS Alt', 8888: 'HTTP Alt',
  9090: 'Prometheus', 9200: 'Elasticsearch', 9300: 'ES Transport',
  27017: 'MongoDB', 27018: 'MongoDB', 50000: 'SAP',
};

function probePort(host: string, port: number, timeout: number): Promise<{ status: PortStatus; banner?: string }> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let banner: string | undefined;
    let settled = false;

    const finish = (status: PortStatus) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve({ status, banner });
    };

    socket.setTimeout(timeout);

    socket.on('connect', () => {
      // Try to grab a banner (service identification)
      socket.setTimeout(500);
    });

    socket.on('data', (data) => {
      banner = data.toString('utf-8').trim().slice(0, 200);
      finish('open');
    });

    socket.on('ready', () => {
      // Connection succeeded — port is open
      if (!settled) finish('open');
    });

    socket.on('timeout', () => finish('filtered'));
    socket.on('error', (err: any) => {
      if (err.code === 'ECONNREFUSED') finish('closed');
      else finish('filtered');
    });
    socket.on('close', () => { if (!settled) finish('closed'); });

    socket.connect(port, host);
  });
}

export function registerPortScannerIPC() {
  ipcMain.handle('ports:scan', async (event, opts: PortScanOptions): Promise<PortResult[]> => {
    abortScan = false;
    const win = BrowserWindow.fromWebContents(event.sender);
    const results: PortResult[] = [];

    // Validate inputs
    const target = opts.target || '127.0.0.1';
    const startPort = Math.max(1, Math.min(65535, opts.startPort || 1));
    const endPort = Math.max(startPort, Math.min(65535, opts.endPort || 1024));
    const timeout = Math.max(100, Math.min(10000, opts.timeout || 1000));
    const concurrency = Math.max(1, Math.min(500, opts.concurrency || 100));

    const ports: number[] = [];
    for (let p = startPort; p <= endPort; p++) ports.push(p);
    const total = ports.length;

    const send = (p: PortScanProgress) => win?.webContents.send('ports:scan-progress', p);

    let scanned = 0;
    let openCount = 0;

    // Process ports in batches for concurrency control
    for (let i = 0; i < ports.length; i += concurrency) {
      if (abortScan) break;

      const batch = ports.slice(i, i + concurrency);
      const promises = batch.map(async (port) => {
        if (abortScan) return;
        const { status, banner } = await probePort(target, port, timeout);
        scanned++;

        if (status === 'open') {
          openCount++;
          results.push({
            port,
            status,
            service: SERVICES[port] || 'Unknown',
            banner,
          });
        }

        // Send progress every few ports to avoid flooding IPC
        if (scanned % 10 === 0 || status === 'open') {
          send({ phase: 'scanning', current: port, scanned, total, openCount });
        }
      });

      await Promise.all(promises);
    }

    send({ phase: 'done', current: 0, scanned: total, total, openCount });
    return results.sort((a, b) => a.port - b.port);
  });

  ipcMain.on('ports:stop', () => {
    abortScan = true;
  });
}
