import { ipcMain } from 'electron';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import type { DevStack, EnvCheckResult, EnvToolInfo } from '../../shared/types';

function run(cmd: string): string {
  try {
    return execSync(cmd, { timeout: 10000, encoding: 'utf-8', windowsHide: true, env: process.env }).trim();
  } catch {
    return '';
  }
}

function which(name: string): string {
  const out = run(`where ${name} 2>nul`);
  return out.split('\n')[0]?.trim() ?? '';
}

function ver(cmd: string): string {
  const out = run(cmd);
  const m = out.match(/(\d+\.\d+[\.\d]*)/);
  return m ? m[1] : out.slice(0, 80);
}

interface ToolDef {
  id: string;
  name: string;
  icon: string;
  stacks: DevStack[];
  check: () => Omit<EnvToolInfo, 'id' | 'name' | 'icon'>;
}

const TOOLS: ToolDef[] = [
  // ── Git ──
  {
    id: 'git', name: 'Git', icon: '🔀', stacks: ['git', 'node', 'python', 'java', 'php', 'dotnet', 'go', 'rust', 'vite', 'react', 'nextjs', 'nuxt', 'angular', 'vue'],
    check() {
      const p = which('git');
      if (!p) return { status: 'not-found', issues: ['Git not found in PATH'], suggestions: ['Install Git from https://git-scm.com and ensure it is added to PATH', 'If already installed, add the bin folder to your system PATH'] };
      const v = ver('git --version');
      const issues: string[] = [];
      const suggestions: string[] = [];
      const userName = run('git config --global user.name');
      const userEmail = run('git config --global user.email');
      if (!userName) { issues.push('Global user.name not set'); suggestions.push('Run: git config --global user.name "Your Name"'); }
      if (!userEmail) { issues.push('Global user.email not set'); suggestions.push('Run: git config --global user.email "you@email.com"'); }
      return { status: 'found', version: v, path: p, detail: `user: ${userName || '(none)'} <${userEmail || '(none)'}>`, issues, suggestions };
    },
  },

  // ── Node.js ──
  {
    id: 'node', name: 'Node.js', icon: '🟢', stacks: ['node', 'vite', 'react', 'nextjs', 'nuxt', 'angular', 'vue'],
    check() {
      const p = which('node');
      if (!p) return { status: 'not-found', issues: ['Node.js not found in PATH'], suggestions: ['Install from https://nodejs.org (LTS recommended)'] };
      const v = ver('node --version');
      const issues: string[] = [];
      const suggestions: string[] = [];
      const major = parseInt(v.split('.')[0], 10);
      if (major < 18) { issues.push(`Node ${v} is outdated`); suggestions.push('Upgrade to Node.js 20+ LTS'); }
      // Check for stale node_modules in user home
      const homeModules = path.join(process.env.USERPROFILE || '', 'node_modules');
      if (fs.existsSync(homeModules)) { issues.push(`Stale node_modules found at ${homeModules}`); suggestions.push('Delete the node_modules folder in your home directory — packages should only be in project folders'); }
      const homePackage = path.join(process.env.USERPROFILE || '', 'package.json');
      if (fs.existsSync(homePackage)) { issues.push(`Stray package.json at ${homePackage}`); suggestions.push('Delete package.json from home directory — likely from an accidental npm install'); }
      return { status: issues.some(i => i.includes('outdated')) ? 'outdated' : 'found', version: v, path: p, issues, suggestions };
    },
  },

  // ── npm ──
  {
    id: 'npm', name: 'npm', icon: '📦', stacks: ['node', 'vite', 'react', 'nextjs', 'nuxt', 'angular', 'vue'],
    check() {
      const p = which('npm');
      if (!p) return { status: 'not-found', issues: ['npm not found in PATH'], suggestions: ['npm comes with Node.js — install Node first'] };
      const v = ver('npm --version');
      const globalRoot = run('npm root -g');
      const issues: string[] = [];
      const suggestions: string[] = [];
      if (globalRoot && !globalRoot.includes('AppData') && !globalRoot.includes('nodejs')) {
        issues.push(`Unusual global root: ${globalRoot}`);
      }
      return { status: 'found', version: v, path: p, detail: `global root: ${globalRoot}`, issues, suggestions };
    },
  },

  // ── Python ──
  {
    id: 'python', name: 'Python', icon: '🐍', stacks: ['python'],
    check() {
      let p = which('python');
      if (!p) p = which('python3');
      if (!p) return { status: 'not-found', issues: ['Python not found in PATH'], suggestions: ['Install from https://python.org — check "Add to PATH" during install'] };
      const v = ver('python --version');
      const pipPath = which('pip');
      const issues: string[] = [];
      const suggestions: string[] = [];
      if (!pipPath) { issues.push('pip not found in PATH'); suggestions.push('Run: python -m ensurepip'); }
      const major = parseInt(v.split('.')[0], 10);
      const minor = parseInt(v.split('.')[1], 10);
      if (major < 3 || (major === 3 && minor < 9)) { issues.push(`Python ${v} is outdated`); suggestions.push('Upgrade to Python 3.11+'); }
      return { status: issues.some(i => i.includes('outdated')) ? 'outdated' : 'found', version: v, path: p, issues, suggestions };
    },
  },

  // ── Java ──
  {
    id: 'java', name: 'Java (JDK)', icon: '☕', stacks: ['java'],
    check() {
      const p = which('java');
      if (!p) return { status: 'not-found', issues: ['Java not found in PATH'], suggestions: ['Install JDK from https://adoptium.net'] };
      const v = ver('java -version 2>&1');
      const javaHome = process.env.JAVA_HOME || '';
      const issues: string[] = [];
      const suggestions: string[] = [];
      if (!javaHome) { issues.push('JAVA_HOME not set'); suggestions.push('Set JAVA_HOME to your JDK installation directory'); }
      else if (!fs.existsSync(javaHome)) { issues.push(`JAVA_HOME points to non-existent path: ${javaHome}`); suggestions.push('Fix JAVA_HOME to point to your actual JDK folder'); }
      const javac = which('javac');
      if (!javac) { issues.push('javac not found — JRE only, no JDK'); suggestions.push('Install a full JDK (not just JRE) for development'); }
      return { status: 'found', version: v, path: p, detail: `JAVA_HOME: ${javaHome || '(not set)'}`, issues, suggestions };
    },
  },

  // ── PHP ──
  {
    id: 'php', name: 'PHP', icon: '🐘', stacks: ['php'],
    check() {
      const p = which('php');
      if (!p) return { status: 'not-found', issues: ['PHP not found in PATH'], suggestions: ['Install PHP or use XAMPP/Laragon and add PHP to PATH'] };
      const v = ver('php --version');
      const composer = which('composer');
      const issues: string[] = [];
      const suggestions: string[] = [];
      if (!composer) { issues.push('Composer not found'); suggestions.push('Install Composer from https://getcomposer.org'); }
      return { status: 'found', version: v, path: p, issues, suggestions };
    },
  },

  // ── .NET ──
  {
    id: 'dotnet', name: '.NET SDK', icon: '🔷', stacks: ['dotnet'],
    check() {
      const p = which('dotnet');
      if (!p) return { status: 'not-found', issues: ['.NET SDK not found in PATH'], suggestions: ['Install from https://dot.net'] };
      const v = ver('dotnet --version');
      const nuget = which('nuget');
      const issues: string[] = [];
      const suggestions: string[] = [];
      if (!nuget) { issues.push('NuGet CLI not in PATH (dotnet CLI has built-in NuGet)'); }
      return { status: 'found', version: v, path: p, issues, suggestions };
    },
  },

  // ── Go ──
  {
    id: 'go', name: 'Go', icon: '🐹', stacks: ['go'],
    check() {
      const p = which('go');
      if (!p) return { status: 'not-found', issues: ['Go not found in PATH'], suggestions: ['Install from https://go.dev/dl/'] };
      const v = ver('go version');
      const gopath = process.env.GOPATH || '';
      const issues: string[] = [];
      const suggestions: string[] = [];
      if (!gopath) { issues.push('GOPATH not set (using default ~/go)'); }
      return { status: 'found', version: v, path: p, detail: `GOPATH: ${gopath || '(default)'}`, issues, suggestions };
    },
  },

  // ── Rust ──
  {
    id: 'rust', name: 'Rust', icon: '🦀', stacks: ['rust'],
    check() {
      const p = which('rustc');
      if (!p) return { status: 'not-found', issues: ['Rust not found in PATH'], suggestions: ['Install via https://rustup.rs'] };
      const v = ver('rustc --version');
      const cargo = which('cargo');
      const issues: string[] = [];
      const suggestions: string[] = [];
      if (!cargo) { issues.push('cargo not found in PATH'); suggestions.push('Reinstall Rust via rustup'); }
      return { status: 'found', version: v, path: p, issues, suggestions };
    },
  },

  // ── Docker ──
  {
    id: 'docker', name: 'Docker', icon: '🐳', stacks: ['docker'],
    check() {
      const p = which('docker');
      if (!p) return { status: 'not-found', issues: ['Docker not found in PATH'], suggestions: ['Install Docker Desktop from https://docker.com'] };
      const v = ver('docker --version');
      const running = run('docker info 2>nul');
      const issues: string[] = [];
      const suggestions: string[] = [];
      if (!running) { issues.push('Docker daemon is not running'); suggestions.push('Start Docker Desktop'); }
      return { status: 'found', version: v, path: p, issues, suggestions };
    },
  },

  // ── Vite ──
  {
    id: 'vite', name: 'Vite', icon: '⚡', stacks: ['vite', 'react', 'vue'],
    check() {
      const globalPath = which('vite');
      const v = globalPath ? ver('vite --version') : '';
      const issues: string[] = [];
      const suggestions: string[] = [];
      if (!globalPath) {
        suggestions.push('Vite is usually a project dependency (npx vite), not globally installed — this is fine');
        return { status: 'found', detail: 'Typically used as a project dependency (npx vite)', issues, suggestions };
      }
      return { status: 'found', version: v, path: globalPath, issues, suggestions };
    },
  },

  // ── VS Code ──
  {
    id: 'vscode', name: 'VS Code CLI', icon: '💻', stacks: ['node', 'python', 'java', 'php', 'dotnet', 'go', 'rust', 'vite', 'react', 'nextjs', 'nuxt', 'angular', 'vue'],
    check() {
      const p = which('code');
      if (!p) return { status: 'not-found', issues: ['VS Code "code" command not in PATH'], suggestions: ['Open VS Code > Ctrl+Shift+P > "Shell Command: Install \'code\' command in PATH"'] };
      const v = ver('code --version 2>nul');
      return { status: 'found', version: v.split('\n')[0], path: p, issues: [], suggestions: [] };
    },
  },
];

function checkPathHealth(): string[] {
  const issues: string[] = [];
  const pathVar = process.env.PATH || '';
  const entries = pathVar.split(';').filter(Boolean);

  const seen = new Set<string>();
  for (const entry of entries) {
    const lower = entry.toLowerCase();
    if (seen.has(lower)) { issues.push(`Duplicate PATH entry: ${entry}`); }
    seen.add(lower);

    if (!fs.existsSync(entry)) { issues.push(`PATH points to non-existent folder: ${entry}`); }
  }

  if (entries.length > 60) { issues.push(`PATH has ${entries.length} entries — consider cleaning up`); }

  return issues;
}

export function registerEnvCheckerIPC() {
  ipcMain.handle('env:check', async (_event, stacks: DevStack[]): Promise<EnvCheckResult> => {
    const requested = new Set(stacks);
    const tools: EnvToolInfo[] = [];

    for (const toolDef of TOOLS) {
      // Include if any of the tool's stacks match what user selected
      const relevant = toolDef.stacks.some((s) => requested.has(s));
      if (!relevant) continue;

      const result = toolDef.check();
      tools.push({
        id: toolDef.id,
        name: toolDef.name,
        icon: toolDef.icon,
        ...result,
      });
    }

    const pathIssues = checkPathHealth();
    const generalIssues: string[] = [];

    // Check for common cross-cutting issues
    const userProfile = process.env.USERPROFILE || '';
    if (userProfile) {
      const homeNpm = path.join(userProfile, '.npmrc');
      if (fs.existsSync(homeNpm)) {
        const content = fs.readFileSync(homeNpm, 'utf-8');
        if (content.includes('prefix=')) {
          generalIssues.push('Custom npm prefix detected in ~/.npmrc — may cause global install issues');
        }
      }
    }

    return { tools, pathIssues, generalIssues };
  });
}
