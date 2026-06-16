<p align="center">
  <img src="logoBloated.png" alt="Bloated Logo" width="200">
</p>

<h1 align="center">Bloated</h1>
# Bloated v1.3

## Windows Cleanup, Security Audit, Virus Scanning & Developer Environment Repair

Bloated is an Electron-based Windows utility designed to help users clean unnecessary files, audit system security, scan for threats, identify development environment issues, and apply safe automated remediation where possible.

Version 1.3 introduces a major security and remediation update with a complete quarantine system, improved dependency auditing, automated security fixes, safer environment repair tools, and enhanced scan reporting.

---

# New in Version 1.3

## Quarantine System

Bloated now includes a dedicated quarantine system for suspicious files.

### Features

* Move suspicious files into quarantine instead of deleting them.
* Restore quarantined files to their original location.
* Permanently delete quarantined files when desired.
* SHA256 verification during cross-drive moves.
* Automatic randomization of quarantined file names.
* Executable extensions removed inside quarantine.
* Quarantine metadata tracking.
* Protection against overwriting existing files during restore.

### Storage Location

```text
C:\ProgramData\Bloated\Quarantine\
```

Structure:

```text
Quarantine
├── files
├── reports
└── quarantine-index.json
```

### Stored Metadata

* Original path
* Detection source
* Detection reason
* SHA256 hash
* File size
* Quarantine date
* Restore status

---

## Virus Scanner Improvements

### New Actions

Virus scan results now support:

* Quarantine file
* Open file location
* Open scan report
* View detection source
* View threat reason

### Safer Workflow

Old:

```text
Detect → Delete
```

New:

```text
Detect → Quarantine → Review → Restore or Delete
```

---

## Dependency & Code Audit

Formerly known as:

```text
Exploit Scanner
```

Renamed to better reflect its purpose.

### Improvements

* Full project path display
* Full file path display
* Folder location display
* Line and column information
* Open file button
* Open folder button
* Vulnerability remediation guidance
* Package update recommendations

### NPM Audit Integration

Bloated can now execute:

```bash
npm audit fix
```

and

```bash
npm audit fix --force
```

using allow-listed commands executed through secure process spawning.

### Code Findings

Bloated detects patterns such as:

* eval()
* unsafe innerHTML
* command execution risks
* hardcoded secrets

The application explains why the finding matters and where it exists.

For safety reasons, Bloated does not automatically rewrite source code.

---

## System Security Audit

Expanded security auditing capabilities.

### Security Checks

* Microsoft Defender status
* Defender real-time protection
* Firewall status
* UAC status
* BitLocker status
* Secure Boot status
* Windows Update age
* Open listening ports
* Startup applications
* Remote Desktop status
* SMBv1 status
* Guest account status

### Automated Remediation

Bloated can now:

* Enable Windows Firewall
* Enable Defender real-time protection
* Update Defender signatures
* Enable UAC
* Disable Guest account
* Disable Remote Desktop
* Disable SMBv1
* Disable AutoRun
* Open Windows Update settings

---

## Development Environment Repair

The Dev Environment module now includes automated diagnostics and safe repair actions.

### PATH Analysis

Bloated can:

* Detect duplicate PATH entries
* Detect stale PATH entries
* Remove invalid user PATH entries

### Java Detection

* Verifies Java installation
* Validates javac.exe
* Configures JAVA_HOME only when verified

### NPM Configuration Repair

* Detects problematic npm prefix overrides
* Creates backup of configuration
* Removes unsafe user-level prefix entries

### Installation Guidance

Bloated explains:

* Expected installation locations
* Recommended environment setup
* Whether the current location is valid
* Whether a custom installation path is acceptable

The application avoids making assumptions about non-standard but valid installations.

---

## Scan Reports

Bloated now supports structured scan reports.

### Report Storage

```text
C:\ProgramData\Bloated\Reports\
```

### Stored Information

* Scan type
* Start time
* End time
* Files scanned
* Threats found
* Files quarantined
* Security findings
* Errors
* Application version
* Windows version

Future versions will include:

* PDF reports
* HTML reports
* Historical report browser

---

## Security Model

Bloated follows a security-first architecture.

### Protections

* Context Isolation enabled
* Node Integration disabled
* Secure preload bridge
* IPC validation
* execFile usage instead of shell execution
* No telemetry
* No file uploads
* No cloud scanning requirements

---

# Upcoming Roadmap

## Version 1.4

### Enhanced Reporting

* PDF export
* HTML export
* Historical report viewer
* Report search

### Security Audit Expansion

* Pending reboot detection
* Defender engine version checks
* Defender tamper protection checks
* Firewall profile auditing
* PowerShell execution policy auditing

---

## Version 1.5

### Vulnerability Intelligence

* CVE matching
* Missing update analysis
* Installed software vulnerability review
* Security baseline comparison

---

# Important Notes

Bloated is designed to provide safe automated remediation where possible.

Certain findings intentionally require user review:

* Source code vulnerabilities
* Application architecture issues
* Custom project security decisions

Bloated will explain the issue, provide the exact file location, and suggest remediation steps instead of making potentially destructive code modifications automatically.

---

# Version

Current Version:

```text
1.3.0
```

<p align="center">
  A Windows system utility toolkit built with Electron, React, and TypeScript.
</p>

---
✅ IMPORTANT NOTICE
⚠️ READ THIS CAREFULLY BEFORE USING THE APP
This tool is designed only to help advanced users (pros and experienced Windows power users) discover hidden files and folders that Microsoft (“Big Tech”) normally keeps invisible to regular users.
❗ CRITICAL WARNINGS:

Do NOT blindly trust the app and delete everything it shows you.
Always do your own homework — research every file or folder before taking any action.
You must know exactly what you are looking for. Deleting the wrong system file can break Windows, cause data loss, or make your PC unstable.
This app is NOT for beginners or casual users.

Who should use this app?
Only professionals or highly experienced users who understand Windows system files and accept full responsibility for their actions.
If you are unsure about any file, stop immediately and seek help from a qualified technician.
You have been warned. Use at your own risk.

## Features

### 🗑️ Cache Cleaner
- Scans **47 known Windows cache paths** (browsers, system temp, package managers, IDEs, etc.)
- Sort by size, name, or path — filter by category
- Configurable minimum file size threshold
- Delete to Recycle Bin or permanent delete
- Real-time scan progress with file count and total size

### 🦠 Virus Scanner
- **VirusTotal API v3** integration (hash-only lookups — no file uploads)
- SHA-256 hashing with 3-phase live progress: collecting → hashing → looking up
- Respects free-tier rate limit (4 requests/minute)
- Color-coded threat results with detection counts

### 🛡️ Security Audit
16 automated Windows security checks via PowerShell:
- Firewall status, Windows Defender status & signature freshness
- UAC level, Guest account, RDP, SMBv1, AutoPlay
- Windows Update configuration, open ports, network shares
- Auto-start programs, password policy, unquoted service paths
- BitLocker encryption, Secure Boot

### � Exploit Scanner
Tier-based JavaScript vulnerability scanner with user-controlled remediation:
- **Auto-discovers Node.js projects** across your drives (configurable scan roots)
- **4 priority tiers**: AI/ML → npm Core → Frameworks → Git & Tooling
- **npm audit + OSV.dev API** (dual-source with automatic fallback)
- **12 static analysis patterns**: eval, prototype pollution, innerHTML, hardcoded secrets, insecure HTTP, and more
- **Per-vulnerability actions**: Update (safe), Patch (moderate), Erase (destructive) — with risk labels
- **Double confirmation flow**: inline panel → modal popup before any action executes
- Tier-by-tier scanning with pause screens — scan only what you need
- All commands run with `--ignore-scripts` and `shell: false` to prevent supply chain attacks

### 🔌 Port Scanner
- TCP connect scan using Node.js `net` module
- **60+ known service names** with banner grabbing
- Configurable target, port range, timeout, and concurrency
- Presets: Quick (top 100), Common (1-1024), Extended, Full, Web, Database

### 📡 Network Scanner
- Ping sweep (TCP + ICMP) across a /24 subnet
- ARP table parsing for MAC addresses
- Hostname resolution via reverse DNS
- MAC vendor identification (Apple, Samsung, Google, TP-Link, etc.)
- Auto-detects local IP, subnet, and gateway

### 🔧 Dev Environment Checker
Health checks for 12 common dev tools:
- **Git** (global user config), **Node.js** (stale home node_modules detection), **npm**
- **Python** (pip, version), **Java** (JAVA_HOME, JDK vs JRE), **PHP** (Composer)
- **.NET SDK**, **Go** (GOPATH), **Rust** (cargo)
- **Docker** (daemon status), **Vite**, **VS Code CLI**
- **PATH health audit**: duplicate entries, nonexistent directories

---

## Tech Stack

| Layer       | Technology                          |
|-------------|-------------------------------------|
| Framework   | Electron 41                         |
| UI          | React 19 + React Router             |
| Language    | TypeScript 6                        |
| Bundler     | Vite 8                              |
| Icons       | Lucide React                        |
| Packaging   | electron-builder (NSIS + portable)  |

---

## Getting Started

### Prerequisites
- **Node.js** 18+ (LTS recommended)
- **Windows 10/11** (PowerShell required for security checks)

### Install

```bash
git clone https://github.com/tattooinmtl/bloated.git
cd bloated
npm install
```

### Development

```bash
npm run dev
```

This runs the Vite dev server, TypeScript watcher, and Electron concurrently.

### Build & Run

```bash
npm run build
npm start
```

### Package (.exe)

```bash
npm run pack
```

Outputs an NSIS installer and portable `.exe` in the `release/` folder.

---

## Configuration

- **VirusTotal API Key**: Enter in Settings page at runtime. Get a free key at [virustotal.com](https://www.virustotal.com/gui/join-us)
- **Delete Mode**: Recycle Bin (default) or permanent delete
- **Custom Cache Paths**: Add your own scan directories in Settings

---

## Security Model

- `contextIsolation: true` — renderer cannot access Node.js APIs directly
- `nodeIntegration: false` — all IPC goes through a secure preload bridge
- `sandbox: false` for preload (required for IPC)
- All shell commands use `execFile` with argument arrays — no shell string interpolation
- Strict input validation on all user-supplied values (IPs, package names, paths)
- `--ignore-scripts` on npm operations to block supply chain postinstall attacks
- Hardcoded API hostnames to prevent redirect tampering
- No remote code execution, no file uploads, no telemetry

---

## License

MIT
