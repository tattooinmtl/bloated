import { execFile } from 'child_process';

interface DiskSpace {
  total: number;
  free: number;
  used: number;
}

/**
 * Get disk space for a drive letter (e.g. "C:") on Windows
 * using wmic — no external deps needed.
 */
export function checkDiskSpace(drive: string): Promise<DiskSpace> {
  return new Promise((resolve) => {
    // Use PowerShell to get disk info — works on modern Windows
    const script = `Get-CimInstance -ClassName Win32_LogicalDisk -Filter "DeviceID='${drive}'" | Select-Object Size,FreeSpace | ConvertTo-Json`;
    execFile('powershell', ['-NoProfile', '-Command', script], { timeout: 10_000 }, (err, stdout) => {
      if (err) {
        return resolve({ total: 0, free: 0, used: 0 });
      }
      try {
        const info = JSON.parse(stdout);
        const total = info.Size || 0;
        const free = info.FreeSpace || 0;
        resolve({ total, free, used: total - free });
      } catch {
        resolve({ total: 0, free: 0, used: 0 });
      }
    });
  });
}
