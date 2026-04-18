'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Download } from 'lucide-react';
import { SKILLS_REGISTRY } from '@/lib/skills-registry';
import { RegistryStats, SkillExecution } from '@/types';

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  if (diff < 60_000) return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  return `${Math.floor(diff / 3_600_000)}h ago`;
}

function truncate(s: string, n = 8) {
  return s.length > n * 2 ? `${s.slice(0, n)}..${s.slice(-4)}` : s;
}

const TAGS = ['ALL', 'SOLANA', 'DEFI', 'AGENT', 'PRODUCTIVITY', 'DATA', 'COMPOSE'];

const WHO_USES: Record<string, string[]> = {
  'whale-tail': ['Agents', 'Browser', 'CLI'],
  'calendar-event': ['Agents', 'Browser', 'CLI'],
  'usdc-split': ['Agents', 'Browser', 'CLI'],
  'pdf-generate': ['Agents', 'Browser', 'CLI'],
  'task-delegate': ['Agents', 'Browser', 'CLI'],
};

const BADGE_COLORS: Record<string, string> = {
  Agents: 'rgba(153,69,255,0.15)',
  Browser: 'rgba(20,241,149,0.12)',
  CLI: 'rgba(245,158,11,0.1)',
};
const BADGE_TEXT: Record<string, string> = {
  Agents: '#9945FF',
  Browser: '#14F195',
  CLI: '#f59e0b',
};

export default function MarketplacePage() {
  const [stats, setStats] = useState<RegistryStats>({
    totalSkills: SKILLS_REGISTRY.length,
    totalExecutions: 0,
    totalVolumeUsdc: 0,
    uniqueProviders: 1,
  });
  const [executions, setExecutions] = useState<SkillExecution[]>([]);
  const [activeTag, setActiveTag] = useState('ALL');
  const [activeTab, setActiveTab] = useState<'LIST' | 'FEED'>('LIST');
  const [copied, setCopied] = useState<string | null>(null);
  const [openTaskCount, setOpenTaskCount] = useState(0);
  const [terminalCmd, setTerminalCmd] = useState('');
  const router = useRouter();

  useEffect(() => {
    fetch('/api/registry/stats').then((r) => r.json()).then(setStats).catch(() => {});
  }, []);

  useEffect(() => {
    // Fetch open task count for Task Delegator card
    fetch('/api/skills/task-status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'open', limit: 50 }),
    })
      .then((r) => r.json())
      .then((d) => setOpenTaskCount(d.tasks?.length || 0))
      .catch(() => {});
  }, []);

  const fetchExecutions = useCallback(() => {
    fetch('/api/registry/executions?limit=20')
      .then((r) => r.json())
      .then((d) => setExecutions(d.executions || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchExecutions();
    const t = setInterval(fetchExecutions, 3000);
    return () => clearInterval(t);
  }, [fetchExecutions]);

  const filteredSkills =
    activeTag === 'ALL'
      ? SKILLS_REGISTRY
      : SKILLS_REGISTRY.filter((s) => s.tags.includes(activeTag.toLowerCase()));

  function handleTerminalScan() {
    const raw = terminalCmd.trim();
    const lower = raw.toLowerCase();
    const skillIds = SKILLS_REGISTRY.map((s) => s.id);

    const execMatch = lower.match(/^execute\s+(?:--skill\s+)?([a-z0-9-]+)$/);
    if (execMatch && skillIds.includes(execMatch[1])) {
      router.push(`/play/${execMatch[1]}`);
      return;
    }
    if (skillIds.includes(lower)) {
      router.push(`/play/${lower}`);
      return;
    }
    const upper = raw.toUpperCase();
    setActiveTag(upper === '' ? 'ALL' : upper);
    setActiveTab('LIST');
    setTimeout(() => {
      document.getElementById('skill-list')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  }

  async function copyMCP(skillId: string, e: React.MouseEvent) {
    e.preventDefault();
    const res = await fetch(`/api/skills/${skillId}/mcp`);
    const json = await res.json();
    await navigator.clipboard.writeText(JSON.stringify(json, null, 2));
    setCopied(skillId);
    setTimeout(() => setCopied(null), 2000);
  }

  async function downloadMCP(skillId: string, e: React.MouseEvent) {
    e.preventDefault();
    const res = await fetch(`/api/skills/${skillId}/mcp`);
    const json = await res.json();
    const blob = new Blob([JSON.stringify(json, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `skilldock_${skillId}.mcp.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>

      {/* ── HERO ── */}
      <section style={{ borderBottom: '1px solid var(--border)' }}>
        <div style={{ maxWidth: '1152px', margin: '0 auto', padding: '80px 40px' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '40px' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '8px 16px', borderRadius: '999px', fontSize: '14px', fontWeight: 600, background: 'rgba(20,241,149,0.12)', color: 'var(--green)', border: '1px solid rgba(20,241,149,0.25)', whiteSpace: 'nowrap' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--green)', display: 'inline-block', flexShrink: 0 }} className="pulse-glow" />
              Live on Solana
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', padding: '8px 16px', borderRadius: '999px', fontSize: '14px', fontWeight: 600, background: 'rgba(245,158,11,0.1)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.25)', whiteSpace: 'nowrap' }}>
              Powered by Purch x402
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', padding: '8px 16px', borderRadius: '999px', fontSize: '14px', fontWeight: 600, background: 'var(--purple-subtle)', color: 'var(--purple-light)', border: '1px solid var(--purple-border)', whiteSpace: 'nowrap' }}>
              {SKILLS_REGISTRY.length} Skills Available
            </span>
          </div>

          <h1 style={{ fontFamily: "'VT323', monospace", fontSize: 'clamp(3.5rem, 10vw, 6.5rem)', letterSpacing: '0.06em', color: 'var(--text-1)', lineHeight: 1, marginBottom: '1.25rem' }}>
            SKILLDOCK
          </h1>

          <p style={{ fontSize: '1.2rem', color: 'var(--text-1)', fontWeight: 500, marginBottom: '0.75rem', maxWidth: '600px', lineHeight: 1.5 }}>
            AI-Powered Agent Skill Marketplace — Purch x402 · Solana USDC
          </p>
          <p style={{ fontSize: '1rem', color: 'var(--text-2)', maxWidth: '560px', lineHeight: 1.7 }}>
            Any browser, agent, or runtime can discover, pay for, and execute skills — with per-agent treasury vaults for autonomous payments.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginTop: '48px' }}>
            {[
              { label: 'Total Skills', value: stats.totalSkills.toString() },
              { label: 'Executions', value: stats.totalExecutions.toLocaleString() },
              { label: 'Volume (USDC)', value: `$${stats.totalVolumeUsdc.toFixed(2)}` },
              { label: 'Providers', value: stats.uniqueProviders.toString() },
            ].map(({ label, value }) => (
              <div key={label} className="stat-card" style={{ padding: '20px 24px' }}>
                <div style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.1em', color: 'var(--text-3)', textTransform: 'uppercase', marginBottom: '10px', fontFamily: "'Share Tech Mono', monospace" }}>
                  {label}
                </div>
                <div style={{ fontFamily: "'VT323', monospace", fontSize: 'clamp(2.8rem, 5vw, 3.8rem)', color: 'var(--text-1)', lineHeight: 1 }}>
                  {value}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TERMINAL SCANNER ── */}
      <section style={{ borderBottom: '1px solid var(--border)' }}>
        <div style={{ maxWidth: '1152px', margin: '0 auto', padding: '32px 40px' }}>
          <div className="flex flex-col sm:flex-row gap-3 mb-5">
            <div className="flex-1 flex items-center gap-3 px-5 py-4 rounded-xl"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border-2)' }}>
              <span style={{ color: 'var(--green)', fontFamily: "'Share Tech Mono', monospace", fontSize: '16px', flexShrink: 0 }}>$</span>
              <input
                type="text"
                value={terminalCmd}
                onChange={(e) => setTerminalCmd(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleTerminalScan(); }}
                placeholder="execute --skill whale-tail  ·  or enter a tag to filter"
                style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: 'var(--text-1)', fontFamily: "'Share Tech Mono', monospace", fontSize: '16px', caretColor: 'var(--green)' }}
              />
            </div>
            <button
              onClick={handleTerminalScan}
              style={{ background: 'var(--green)', color: '#000', fontWeight: 700, fontSize: '16px', padding: '14px 32px', borderRadius: '10px', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: "'Share Tech Mono', monospace", letterSpacing: '0.05em' }}
              onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
              onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
            >
              EXECUTE
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {TAGS.map(t => (
              <button key={t} onClick={() => setActiveTag(t)} className={`filter-btn ${activeTag === t ? 'active' : ''}`}>{t}</button>
            ))}
          </div>
        </div>
      </section>

      {/* ── MAIN CONTENT ── */}
      <section style={{ maxWidth: '1152px', margin: '0 auto', padding: '40px 40px 80px' }}>
        <div className="flex gap-2 mb-8" id="skill-list">
          {(['LIST', 'FEED'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '8px 20px', borderRadius: '8px', fontSize: '14px', fontWeight: 600,
                border: '1px solid', cursor: 'pointer', transition: 'all 0.15s',
                borderColor: activeTab === tab ? 'var(--purple)' : 'var(--border)',
                background: activeTab === tab ? 'var(--purple-subtle)' : 'transparent',
                color: activeTab === tab ? 'var(--purple-light)' : 'var(--text-2)',
              }}
            >
              {tab === 'LIST' ? '⊞  Skills' : '⚡  Live Feed'}
            </button>
          ))}
          {activeTab === 'LIST' && (
            <span style={{ marginLeft: 'auto', fontSize: '13px', color: 'var(--text-3)', alignSelf: 'center' }}>
              {filteredSkills.length} skill{filteredSkills.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {/* ── SKILL GRID ── */}
        {activeTab === 'LIST' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {filteredSkills.map((skill, i) => (
              <div
                key={skill.id}
                className="skill-card fade-up flex flex-col"
                style={{ animationDelay: `${i * 40}ms`, padding: '24px' }}
              >
                {/* Top row */}
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex items-center gap-4">
                    <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'var(--purple-subtle)', border: '1px solid var(--purple-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', flexShrink: 0 }}>
                      {skill.icon || '⚙️'}
                    </div>
                    <div>
                      <div style={{ fontSize: '17px', fontWeight: 700, color: 'var(--text-1)', lineHeight: 1.25, marginBottom: '3px' }}>
                        {skill.name}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-3)', fontFamily: "'Share Tech Mono', monospace" }}>
                        /{skill.id}
                      </div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontFamily: "'VT323', monospace", fontSize: '28px', color: 'var(--green)', lineHeight: 1 }}>
                      {skill.id === 'usdc-split' ? '$0.006×n' : `$${skill.price.toFixed(3)}`}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-3)', marginTop: '2px' }}>
                      {skill.id === 'usdc-split' ? 'per recipient' : 'USDC / call'}
                    </div>
                  </div>
                </div>

                {/* Description */}
                <p style={{ fontSize: '14px', color: 'var(--text-2)', lineHeight: 1.65, marginBottom: '12px', flexGrow: 1 }}>
                  {skill.description}
                </p>

                {/* Who uses this badges */}
                <div style={{ display: 'flex', gap: '6px', marginBottom: '12px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-3)', marginRight: '2px' }}>Who uses this:</span>
                  {(WHO_USES[skill.id] || ['Agents', 'Browser', 'CLI']).map((who) => (
                    <span
                      key={who}
                      style={{
                        fontSize: '11px',
                        fontWeight: 600,
                        padding: '2px 8px',
                        borderRadius: '999px',
                        background: BADGE_COLORS[who],
                        color: BADGE_TEXT[who],
                        border: `1px solid ${BADGE_TEXT[who]}33`,
                      }}
                    >
                      {who}
                    </span>
                  ))}
                </div>

                {/* Tags */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {skill.tags.map(tag => (
                    <span key={tag} className="tag-pill">{tag}</span>
                  ))}
                  <span className="tag-pill" style={{ background: 'rgba(245,158,11,0.1)', color: '#f59e0b', borderColor: 'rgba(245,158,11,0.25)' }}>
                    x402
                  </span>
                  <span className="tag-pill" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-3)', borderColor: 'var(--border)' }}>
                    {skill.method}
                  </span>
                </div>

                {/* Special notes */}
                {skill.id === 'usdc-split' && (
                  <div style={{ fontSize: '12px', color: '#f59e0b', background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: '8px', padding: '8px 12px', marginBottom: '12px' }}>
                    Agent vault required — register to get your vault address
                  </div>
                )}
                {skill.id === 'task-delegate' && (
                  <div style={{ fontSize: '12px', color: 'var(--green)', background: 'rgba(20,241,149,0.06)', border: '1px solid rgba(20,241,149,0.2)', borderRadius: '8px', padding: '8px 12px', marginBottom: '12px' }}>
                    <span className="pulse-glow" style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', background: 'var(--green)', marginRight: '6px' }} />
                    {openTaskCount} open task{openTaskCount !== 1 ? 's' : ''} right now
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-3" style={{ borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
                  <button
                    onClick={(e) => copyMCP(skill.id, e)}
                    style={{
                      flex: 1, padding: '9px 0', borderRadius: '8px', fontSize: '13px', fontWeight: 600,
                      border: '1px solid var(--border-2)', background: 'transparent',
                      color: copied === skill.id ? 'var(--green)' : 'var(--text-2)',
                      cursor: 'pointer', transition: 'all 0.15s', fontFamily: 'inherit',
                      borderColor: copied === skill.id ? 'rgba(20,241,149,0.4)' : 'var(--border-2)',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-card-2)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                  >
                    {copied === skill.id ? '✓ Copied MCP' : 'Copy MCP'}
                  </button>
                  <button
                    onClick={(e) => downloadMCP(skill.id, e)}
                    style={{
                      padding: '9px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: 600,
                      border: '1px solid var(--border-2)', background: 'transparent',
                      color: 'var(--text-2)', cursor: 'pointer', transition: 'all 0.15s',
                      display: 'flex', alignItems: 'center', gap: '5px',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--purple-border)'; e.currentTarget.style.color = 'var(--purple-light)'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-2)'; e.currentTarget.style.color = 'var(--text-2)'; }}
                  >
                    <Download size={12} />
                    MCP
                  </button>
                  <Link
                    href={`/play/${skill.id}`}
                    style={{
                      flex: 1, padding: '9px 0', borderRadius: '8px', fontSize: '13px', fontWeight: 700,
                      background: 'var(--purple)', color: '#fff', textAlign: 'center',
                      textDecoration: 'none', transition: 'opacity 0.15s', display: 'block',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
                    onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
                  >
                    Run Skill →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* ── LIVE FEED ── */
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
            <div className="flex items-center gap-3 px-6 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
              <span className="w-2 h-2 rounded-full pulse-glow" style={{ background: 'var(--green)', display: 'inline-block' }} />
              <span style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-1)' }}>Live Executions</span>
            </div>
            {executions.length === 0 ? (
              <div style={{ padding: '64px 24px', textAlign: 'center', color: 'var(--text-3)' }}>
                <div style={{ fontFamily: "'VT323', monospace", fontSize: '2rem', marginBottom: '8px' }}>NO EXECUTIONS YET</div>
                <div style={{ fontSize: '14px' }}>Run a skill to see live activity here</div>
              </div>
            ) : (
              <div>
                {executions.map((exec) => (
                  <div key={exec.id} className="slide-in flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-6 py-4"
                    style={{ borderBottom: '1px solid var(--border)' }}>
                    <div className="flex items-center gap-4">
                      <span style={{ background: 'rgba(20,241,149,0.12)', color: 'var(--green)', fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '999px', fontFamily: "'Share Tech Mono', monospace" }}>
                        OK
                      </span>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-1)' }}>{exec.skill_id}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-3)', marginTop: '2px', fontFamily: "'Share Tech Mono', monospace" }}>
                          {timeAgo(exec.created_at)} · {exec.duration_ms}ms
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-6 ml-12 sm:ml-0">
                      <span style={{ fontFamily: "'VT323', monospace", fontSize: '26px', color: 'var(--green)' }}>
                        ${exec.amount_usdc.toFixed(3)}
                      </span>
                      <a
                        href={`https://explorer.solana.com/tx/${exec.tx_hash}?cluster=devnet`}
                        target="_blank" rel="noopener noreferrer"
                        style={{ fontSize: '12px', color: 'var(--text-3)', textDecoration: 'none', fontFamily: "'Share Tech Mono', monospace", transition: 'color 0.15s' }}
                        onMouseEnter={e => (e.currentTarget.style.color = 'var(--green)')}
                        onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-3)')}
                      >
                        {truncate(exec.tx_hash)} ↗
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
