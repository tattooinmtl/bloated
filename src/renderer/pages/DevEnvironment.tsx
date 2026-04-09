import React, { useState } from 'react';
import { Terminal, RefreshCw, CheckCircle, XCircle, AlertTriangle, Wrench } from 'lucide-react';
import type { DevStack, EnvCheckResult, EnvStatus } from '../../shared/types';

const STACKS: { id: DevStack; label: string; group: string }[] = [
  // Core tools
  { id: 'git', label: 'Git', group: 'Core' },
  { id: 'docker', label: 'Docker', group: 'Core' },
  // Languages
  { id: 'node', label: 'Node.js', group: 'Languages' },
  { id: 'python', label: 'Python', group: 'Languages' },
  { id: 'java', label: 'Java', group: 'Languages' },
  { id: 'php', label: 'PHP', group: 'Languages' },
  { id: 'dotnet', label: '.NET', group: 'Languages' },
  { id: 'go', label: 'Go', group: 'Languages' },
  { id: 'rust', label: 'Rust', group: 'Languages' },
  // Frameworks
  { id: 'vite', label: 'Vite', group: 'Frameworks' },
  { id: 'react', label: 'React', group: 'Frameworks' },
  { id: 'nextjs', label: 'Next.js', group: 'Frameworks' },
  { id: 'nuxt', label: 'Nuxt', group: 'Frameworks' },
  { id: 'angular', label: 'Angular', group: 'Frameworks' },
  { id: 'vue', label: 'Vue', group: 'Frameworks' },
];

const STATUS_ICON: Record<EnvStatus, React.ReactNode> = {
  'found': <CheckCircle size={16} style={{ color: 'var(--success)' }} />,
  'not-found': <XCircle size={16} style={{ color: 'var(--danger)' }} />,
  'outdated': <AlertTriangle size={16} style={{ color: 'var(--warning)' }} />,
  'misconfigured': <AlertTriangle size={16} style={{ color: 'var(--warning)' }} />,
};

const STATUS_LABEL: Record<EnvStatus, string> = {
  'found': 'Found',
  'not-found': 'Not Found',
  'outdated': 'Outdated',
  'misconfigured': 'Misconfigured',
};

export default function DevEnvironment() {
  const [selected, setSelected] = useState<Set<DevStack>>(new Set(['git', 'node', 'vite', 'react']));
  const [result, setResult] = useState<EnvCheckResult | null>(null);
  const [loading, setLoading] = useState(false);

  const toggle = (id: DevStack) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const runCheck = async () => {
    setLoading(true);
    setResult(null);
    const res = await window.api.checkDevEnv([...selected]);
    setResult(res);
    setLoading(false);
  };

  const groups = ['Core', 'Languages', 'Frameworks'];

  const totalIssues = result
    ? result.tools.reduce((n, t) => n + t.issues.length, 0) + result.pathIssues.length + result.generalIssues.length
    : 0;

  return (
    <div>
      <h1 className="page-title">Dev Environment</h1>

      {/* Stack selector */}
      <div className="card">
        <div className="card-title">Choose Your Stack</div>
        {groups.map((group) => (
          <div key={group} style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 6, textTransform: 'uppercase', fontWeight: 600 }}>{group}</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {STACKS.filter((s) => s.group === group).map((s) => (
                <button
                  key={s.id}
                  className={`btn ${selected.has(s.id) ? 'btn-primary' : 'btn-ghost'}`}
                  style={{ padding: '6px 14px', fontSize: 12 }}
                  onClick={() => toggle(s.id)}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        ))}
        <div style={{ marginTop: 12 }}>
          <button className="btn btn-primary" onClick={runCheck} disabled={loading || selected.size === 0}>
            {loading ? <RefreshCw size={16} className="spin" /> : <Wrench size={16} />}
            {loading ? 'Checking...' : 'Check Environment'}
          </button>
        </div>
      </div>

      {/* Results */}
      {result && (
        <>
          {/* Summary */}
          <div className="stat-grid" style={{ marginTop: 16 }}>
            <div className="stat-card">
              <div className="stat-label">Tools Checked</div>
              <div className="stat-value">{result.tools.length}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Found</div>
              <div className="stat-value" style={{ color: 'var(--success)' }}>
                {result.tools.filter((t) => t.status === 'found').length}
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Not Found</div>
              <div className="stat-value" style={{ color: 'var(--danger)' }}>
                {result.tools.filter((t) => t.status === 'not-found').length}
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Issues</div>
              <div className="stat-value" style={{ color: totalIssues > 0 ? 'var(--warning)' : 'var(--success)' }}>
                {totalIssues}
              </div>
            </div>
          </div>

          {/* Tool Results */}
          {result.tools.map((tool) => (
            <div key={tool.id} className="card" style={{ marginBottom: 8, padding: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 20 }}>{tool.icon}</span>
                {STATUS_ICON[tool.status]}
                <span style={{ fontWeight: 600, fontSize: 14 }}>{tool.name}</span>
                {tool.version && <span style={{ color: 'var(--text-dim)', fontSize: 12 }}>v{tool.version}</span>}
                <span className={`badge ${tool.status === 'found' ? 'badge-success' : tool.status === 'not-found' ? 'badge-danger' : 'badge-warning'}`} style={{ marginLeft: 'auto' }}>
                  {STATUS_LABEL[tool.status]}
                </span>
              </div>
              {tool.path && (
                <div style={{ marginTop: 4, fontSize: 12, color: 'var(--text-dim)', fontFamily: 'Consolas, monospace' }}>
                  {tool.path}
                </div>
              )}
              {tool.detail && (
                <div style={{ marginTop: 2, fontSize: 12, color: 'var(--text-dim)' }}>{tool.detail}</div>
              )}
              {tool.issues.length > 0 && (
                <div style={{ marginTop: 6 }}>
                  {tool.issues.map((issue, i) => (
                    <div key={i} style={{ fontSize: 12, color: 'var(--warning)', marginTop: 2 }}>
                      ⚠ {issue}
                    </div>
                  ))}
                </div>
              )}
              {tool.suggestions.length > 0 && (
                <div style={{ marginTop: 4 }}>
                  {tool.suggestions.map((s, i) => (
                    <div key={i} style={{ fontSize: 12, color: 'var(--accent)', marginTop: 2, fontStyle: 'italic' }}>
                      💡 {s}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}

          {/* PATH Issues */}
          {result.pathIssues.length > 0 && (
            <div className="card" style={{ marginTop: 16 }}>
              <div className="card-title">PATH Issues</div>
              {result.pathIssues.map((issue, i) => (
                <div key={i} style={{ fontSize: 12, color: 'var(--warning)', marginTop: 4, fontFamily: 'Consolas, monospace' }}>
                  ⚠ {issue}
                </div>
              ))}
            </div>
          )}

          {/* General Issues */}
          {result.generalIssues.length > 0 && (
            <div className="card" style={{ marginTop: 8 }}>
              <div className="card-title">General Issues</div>
              {result.generalIssues.map((issue, i) => (
                <div key={i} style={{ fontSize: 12, color: 'var(--warning)', marginTop: 4 }}>
                  ⚠ {issue}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {!loading && !result && (
        <div className="card" style={{ textAlign: 'center', padding: 40, color: 'var(--text-dim)', marginTop: 16 }}>
          <Terminal size={48} style={{ marginBottom: 16, opacity: 0.3 }} />
          <div>Select your development stack and check your environment</div>
          <div style={{ fontSize: 12, marginTop: 8 }}>Detects tools, versions, PATH issues, stale installs, and misconfigurations</div>
        </div>
      )}
    </div>
  );
}
