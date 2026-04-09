import { ipcMain, BrowserWindow } from 'electron';
import { execSync } from 'child_process';
import type { SecurityCheckItem, SecuritySeverity, SecurityScanProgress } from '../../shared/types';

function ps(cmd: string): string {
  try {
    return execSync(`powershell -NoProfile -Command "${cmd}"`, {
      timeout: 15000,
      encoding: 'utf-8',
      windowsHide: true,
    }).trim();
  } catch {
    return '';
  }
}

interface Check {
  id: string;
  category: string;
  label: string;
  run: () => { severity: SecuritySeverity; detail: string; recommendation?: string };
}

const CHECKS: Check[] = [
  // ── Firewall ──
  {
    id: 'firewall',
    category: 'Network',
    label: 'Windows Firewall',
    run() {
      const out = ps('Get-NetFirewallProfile | Select-Object -Property Name,Enabled | ConvertTo-Json');
      if (!out) return { severity: 'warning', detail: 'Could not query firewall status' };
      try {
        const profiles = JSON.parse(out);
        const arr = Array.isArray(profiles) ? profiles : [profiles];
        const disabled = arr.filter((p: any) => !p.Enabled);
        if (disabled.length === 0) return { severity: 'ok', detail: 'All firewall profiles enabled' };
        const names = disabled.map((p: any) => p.Name).join(', ');
        return { severity: 'critical', detail: `Disabled profiles: ${names}`, recommendation: 'Enable all firewall profiles via Windows Security' };
      } catch { return { severity: 'warning', detail: 'Could not parse firewall data' }; }
    },
  },

  // ── Windows Defender ──
  {
    id: 'defender-status',
    category: 'Antivirus',
    label: 'Windows Defender Real-Time Protection',
    run() {
      const out = ps('(Get-MpPreference).DisableRealtimeMonitoring');
      if (out === 'False') return { severity: 'ok', detail: 'Real-time protection is ON' };
      if (out === 'True') return { severity: 'critical', detail: 'Real-time protection is OFF', recommendation: 'Enable real-time protection in Windows Security > Virus & threat protection' };
      return { severity: 'warning', detail: 'Could not determine Defender status' };
    },
  },
  {
    id: 'defender-sigs',
    category: 'Antivirus',
    label: 'Defender Signature Age',
    run() {
      const out = ps('((Get-MpComputerStatus).AntivirusSignatureLastUpdated).ToString("yyyy-MM-dd HH:mm")');
      if (!out) return { severity: 'warning', detail: 'Could not query signature date' };
      const lastUpdate = new Date(out);
      const days = Math.floor((Date.now() - lastUpdate.getTime()) / 86400000);
      if (days <= 1) return { severity: 'ok', detail: `Signatures updated ${out} (${days}d ago)` };
      if (days <= 7) return { severity: 'warning', detail: `Signatures are ${days} days old`, recommendation: 'Run Windows Update to refresh definitions' };
      return { severity: 'critical', detail: `Signatures are ${days} days old!`, recommendation: 'Definitions are very outdated — update immediately' };
    },
  },

  // ── UAC ──
  {
    id: 'uac',
    category: 'System',
    label: 'User Account Control (UAC)',
    run() {
      const out = ps('(Get-ItemProperty HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Policies\\System).EnableLUA');
      if (out === '1') return { severity: 'ok', detail: 'UAC is enabled' };
      if (out === '0') return { severity: 'critical', detail: 'UAC is DISABLED', recommendation: 'Enable UAC in Control Panel > User Account Control Settings' };
      return { severity: 'warning', detail: 'Could not determine UAC status' };
    },
  },

  // ── Guest Account ──
  {
    id: 'guest-account',
    category: 'Accounts',
    label: 'Guest Account',
    run() {
      const out = ps('(Get-LocalUser -Name Guest -ErrorAction SilentlyContinue).Enabled');
      if (out === 'False') return { severity: 'ok', detail: 'Guest account is disabled' };
      if (out === 'True') return { severity: 'warning', detail: 'Guest account is ENABLED', recommendation: 'Disable the Guest account via Computer Management > Local Users' };
      return { severity: 'ok', detail: 'Guest account not found or disabled' };
    },
  },

  // ── Remote Desktop ──
  {
    id: 'rdp',
    category: 'Network',
    label: 'Remote Desktop (RDP)',
    run() {
      const out = ps('(Get-ItemProperty "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Terminal Server").fDenyTSConnections');
      if (out === '1') return { severity: 'ok', detail: 'Remote Desktop is disabled' };
      if (out === '0') return { severity: 'warning', detail: 'Remote Desktop is ENABLED', recommendation: 'Disable RDP if not needed: Settings > System > Remote Desktop' };
      return { severity: 'info', detail: 'Could not determine RDP status' };
    },
  },

  // ── SMBv1 ──
  {
    id: 'smbv1',
    category: 'Network',
    label: 'SMBv1 Protocol (WannaCry vector)',
    run() {
      const out = ps('(Get-SmbServerConfiguration).EnableSMB1Protocol');
      if (out === 'False') return { severity: 'ok', detail: 'SMBv1 is disabled' };
      if (out === 'True') return { severity: 'critical', detail: 'SMBv1 is ENABLED — major attack vector', recommendation: 'Disable: Set-SmbServerConfiguration -EnableSMB1Protocol $false' };
      return { severity: 'info', detail: 'Could not determine SMBv1 status' };
    },
  },

  // ── AutoPlay ──
  {
    id: 'autoplay',
    category: 'System',
    label: 'AutoPlay / AutoRun',
    run() {
      const out = ps('(Get-ItemProperty "HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Policies\\Explorer" -ErrorAction SilentlyContinue).NoDriveTypeAutoRun');
      if (out === '255') return { severity: 'ok', detail: 'AutoRun disabled for all drives' };
      if (!out || out === '') return { severity: 'warning', detail: 'AutoRun policy not configured', recommendation: 'Disable AutoRun via Group Policy or registry' };
      return { severity: 'info', detail: `AutoRun policy value: ${out}` };
    },
  },

  // ── Windows Update ──
  {
    id: 'windows-update',
    category: 'System',
    label: 'Last Windows Update',
    run() {
      const out = ps('(Get-HotFix | Sort-Object InstalledOn -Descending | Select-Object -First 1).InstalledOn.ToString("yyyy-MM-dd")');
      if (!out) return { severity: 'warning', detail: 'Could not query Windows Update history' };
      const days = Math.floor((Date.now() - new Date(out).getTime()) / 86400000);
      if (days <= 30) return { severity: 'ok', detail: `Last hotfix installed ${out} (${days}d ago)` };
      if (days <= 90) return { severity: 'warning', detail: `Last hotfix was ${days} days ago`, recommendation: 'Check for Windows Updates' };
      return { severity: 'critical', detail: `No hotfix in ${days} days!`, recommendation: 'System is severely behind on updates' };
    },
  },

  // ── Open Ports ──
  {
    id: 'open-ports',
    category: 'Network',
    label: 'Listening Ports',
    run() {
      const out = ps('Get-NetTCPConnection -State Listen | Select-Object LocalPort -Unique | Sort-Object LocalPort | ConvertTo-Json');
      if (!out) return { severity: 'info', detail: 'Could not enumerate ports' };
      try {
        const ports = JSON.parse(out);
        const arr = Array.isArray(ports) ? ports : [ports];
        const portList = arr.map((p: any) => p.LocalPort);
        const risky = portList.filter((p: number) => [21, 23, 25, 445, 3389, 5900].includes(p));
        if (risky.length > 0) {
          return { severity: 'warning', detail: `Risky ports open: ${risky.join(', ')}. Total listening: ${portList.length}`, recommendation: 'Review and close unnecessary listening ports' };
        }
        return { severity: 'ok', detail: `${portList.length} ports listening — no common risky ports detected` };
      } catch { return { severity: 'info', detail: 'Could not parse port data' }; }
    },
  },

  // ── Shared Folders ──
  {
    id: 'shares',
    category: 'Network',
    label: 'Network Shares',
    run() {
      const out = ps('Get-SmbShare | Where-Object { $_.Name -notlike "*$" } | Select-Object Name,Path | ConvertTo-Json');
      if (!out) return { severity: 'ok', detail: 'No user-visible shares or could not query' };
      try {
        const shares = JSON.parse(out);
        const arr = Array.isArray(shares) ? shares : [shares];
        if (arr.length === 0) return { severity: 'ok', detail: 'No user-visible network shares' };
        const names = arr.map((s: any) => s.Name).join(', ');
        return { severity: 'info', detail: `Shared folders: ${names}`, recommendation: 'Remove shares you no longer need' };
      } catch { return { severity: 'ok', detail: 'No shares detected' }; }
    },
  },

  // ── Auto-Start Programs ──
  {
    id: 'startup',
    category: 'System',
    label: 'Auto-Start Programs',
    run() {
      const out = ps('Get-CimInstance Win32_StartupCommand | Select-Object Name,Command | ConvertTo-Json');
      if (!out) return { severity: 'ok', detail: 'No startup items or could not query' };
      try {
        const items = JSON.parse(out);
        const arr = Array.isArray(items) ? items : [items];
        if (arr.length <= 5) return { severity: 'ok', detail: `${arr.length} startup items registered` };
        if (arr.length <= 15) return { severity: 'info', detail: `${arr.length} startup items — review if all are needed` };
        return { severity: 'warning', detail: `${arr.length} startup items — may slow boot`, recommendation: 'Disable unnecessary startup programs in Task Manager > Startup' };
      } catch { return { severity: 'ok', detail: 'Could not parse startup data' }; }
    },
  },

  // ── Password Policy ──
  {
    id: 'password-policy',
    category: 'Accounts',
    label: 'Password Never Expires',
    run() {
      const out = ps('Get-LocalUser | Where-Object { $_.Enabled -and $_.PasswordExpires -eq $null } | Select-Object Name | ConvertTo-Json');
      if (!out) return { severity: 'ok', detail: 'All enabled accounts have password expiry set' };
      try {
        const users = JSON.parse(out);
        const arr = Array.isArray(users) ? users : [users];
        if (arr.length === 0) return { severity: 'ok', detail: 'All accounts have password expiry' };
        const names = arr.map((u: any) => u.Name).join(', ');
        return { severity: 'info', detail: `Accounts with no password expiry: ${names}`, recommendation: 'Consider setting password expiry for local accounts' };
      } catch { return { severity: 'ok', detail: 'Password policy check passed' }; }
    },
  },

  // ── Unquoted Service Paths ──
  {
    id: 'unquoted-paths',
    category: 'System',
    label: 'Unquoted Service Paths',
    run() {
      const out = ps(`Get-WmiObject Win32_Service | Where-Object { $_.PathName -and $_.PathName -notmatch '^\\"' -and $_.PathName -match ' ' -and $_.PathName -notmatch '^[a-zA-Z]:\\\\Windows\\\\' } | Measure-Object | Select-Object -ExpandProperty Count`);
      const count = parseInt(out, 10);
      if (isNaN(count) || count === 0) return { severity: 'ok', detail: 'No unquoted service paths found' };
      return { severity: 'warning', detail: `${count} service(s) with unquoted paths`, recommendation: 'Unquoted service paths can be exploited for privilege escalation' };
    },
  },

  // ── BitLocker ──
  {
    id: 'bitlocker',
    category: 'Encryption',
    label: 'BitLocker Drive Encryption',
    run() {
      const out = ps('(Get-BitLockerVolume -MountPoint C: -ErrorAction SilentlyContinue).ProtectionStatus');
      if (out === 'On' || out === '1') return { severity: 'ok', detail: 'BitLocker is ON for C:' };
      if (out === 'Off' || out === '0') return { severity: 'warning', detail: 'BitLocker is OFF for C:', recommendation: 'Enable BitLocker to protect data at rest' };
      return { severity: 'info', detail: 'BitLocker status unknown (may require admin)' };
    },
  },

  // ── Secure Boot ──
  {
    id: 'secure-boot',
    category: 'System',
    label: 'Secure Boot',
    run() {
      const out = ps('Confirm-SecureBootUEFI -ErrorAction SilentlyContinue');
      if (out === 'True') return { severity: 'ok', detail: 'Secure Boot is enabled' };
      if (out === 'False') return { severity: 'warning', detail: 'Secure Boot is NOT enabled', recommendation: 'Enable Secure Boot in BIOS/UEFI settings' };
      return { severity: 'info', detail: 'Could not verify Secure Boot (may need admin or legacy BIOS)' };
    },
  },
];

export function registerSecurityCheckerIPC() {
  ipcMain.handle('security:check', async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    const results: SecurityCheckItem[] = [];
    const total = CHECKS.length;

    for (let i = 0; i < CHECKS.length; i++) {
      const check = CHECKS[i];
      const progress: SecurityScanProgress = {
        phase: 'scanning',
        current: check.label,
        completed: i,
        total,
      };
      win?.webContents.send('security:progress', progress);

      const result = check.run();
      results.push({
        id: check.id,
        category: check.category,
        label: check.label,
        severity: result.severity,
        detail: result.detail,
        recommendation: result.recommendation,
      });
    }

    win?.webContents.send('security:progress', { phase: 'done', current: '', completed: total, total });
    return results;
  });
}
