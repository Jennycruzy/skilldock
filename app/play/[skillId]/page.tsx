'use client';

import { useParams } from 'next/navigation';
import { useState, useRef, useCallback, useEffect } from 'react';
import { useCrossmintAuth, EmbeddedAuthForm, useWallet, SolanaWallet } from '@crossmint/client-sdk-react-ui';
import Link from 'next/link';
import { Download, Copy, CheckCheck, Trash2, ArrowLeft } from 'lucide-react';
import { SKILLS_REGISTRY, getSkill } from '@/lib/skills-registry';
import { TerminalLine } from '@/types';
import { encodePaymentHeader } from '@/lib/solana-payment';

const G = 'var(--g)';
const G_DIM = 'var(--g-dim)';
const G_MUTED = 'var(--g-muted)';
const G_BORDER = 'var(--g-border)';
const G_CARD = 'var(--g-card)';
const G_BG = 'var(--g-bg)';

function ts() {
  return new Date().toISOString().slice(11, 23);
}

function highlightJSON(json: unknown): string {
  const str = JSON.stringify(json, null, 2);
  return str
    .replace(/"([^"]+)":/g, '<span class="json-key">"$1"</span>:')
    .replace(/: "([^"]*)"/g, ': <span class="json-string">"$1"</span>')
    .replace(/: (\d+\.?\d*)/g, ': <span class="json-number">$1</span>')
    .replace(/: (true|false)/g, ': <span class="json-boolean">$1</span>')
    .replace(/: null/g, ': <span class="json-null">null</span>');
}

function TerminalOutput({ lines }: { lines: TerminalLine[] }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  }, [lines]);

  const colorMap: Record<string, string> = {
    info: G_DIM,
    success: G,
    error: '#ff4444',
    warning: '#ffcc00',
    result: G,
    receipt: G_DIM,
    link: G_DIM,
  };

  return (
    <div
      ref={ref}
      className="flex-1 p-5 overflow-y-auto"
      style={{
        fontFamily: "'Share Tech Mono', monospace",
        fontSize: '13px',
        lineHeight: '1.8',
        minHeight: '360px',
        maxHeight: '520px',
      }}
    >
      {lines.length === 0 && (
        <div
          className="flex flex-col items-center justify-center h-60 text-center"
          style={{ color: G_MUTED }}
        >
          <div
            style={{ fontFamily: "'VT323', monospace", fontSize: '42px', opacity: 0.3 }}
          >
            READY
          </div>
          <div className="text-xs mt-2">Fill in the inputs and press EXECUTE</div>
        </div>
      )}
      {lines.map((line, i) => (
        <div
          key={i}
          className="fade-in"
          style={{ color: colorMap[line.type] || G, animationDelay: `${i * 15}ms` }}
        >
          {line.type === 'result' ? (
            <span dangerouslySetInnerHTML={{ __html: line.content }} />
          ) : line.type === 'link' ? (
            <span>
              <span style={{ color: G_MUTED, userSelect: 'none' }}>[{line.timestamp}]&nbsp;</span>
              <span dangerouslySetInnerHTML={{ __html: line.content }} />
            </span>
          ) : (
            <span>
              <span style={{ color: G_MUTED, userSelect: 'none' }}>[{line.timestamp}]&nbsp;</span>
              {line.content}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

function DynamicForm({
  schema,
  values,
  onChange,
}: {
  schema: Record<string, unknown>;
  values: Record<string, string>;
  onChange: (key: string, val: string) => void;
}) {
  const props =
    (schema as {
      properties?: Record<string, { type?: string; enum?: string[]; description?: string }>;
    }).properties || {};
  const required = (schema as { required?: string[] }).required || [];

  return (
    <div className="space-y-5">
      {Object.entries(props).map(([key, field]) => {
        const isTextArea = key === 'text' || key === 'question';
        const isEnum = field.enum && field.enum.length > 0;
        const inputStyle: React.CSSProperties = {
          width: '100%',
          background: G_BG,
          border: `1px solid ${G_BORDER}`,
          color: G,
          fontFamily: "'Share Tech Mono', monospace",
          fontSize: '13px',
          padding: '10px 14px',
          outline: 'none',
          letterSpacing: '0.02em',
        };

        return (
          <div key={key}>
            <label
              className="block text-xs mb-2"
              style={{ color: G_MUTED, letterSpacing: '0.06em' }}
            >
              --{key.replace(/_/g, '-')}
              {required.includes(key) && (
                <span style={{ color: '#ff4444' }}> *</span>
              )}
              {field.description && (
                <span style={{ color: G_BORDER, marginLeft: '8px' }}>
                  // {field.description}
                </span>
              )}
            </label>
            {isEnum ? (
              <select
                value={values[key] || ''}
                onChange={(e) => onChange(key, e.target.value)}
                style={{ ...inputStyle }}
              >
                <option value="">select...</option>
                {field.enum!.map((v) => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
            ) : isTextArea ? (
              <textarea
                value={values[key] || ''}
                onChange={(e) => onChange(key, e.target.value)}
                rows={5}
                placeholder={field.description || `Enter ${key}...`}
                style={{
                  ...inputStyle,
                  resize: 'none',
                  lineHeight: '1.6',
                }}
              />
            ) : (
              <input
                type="text"
                value={values[key] || ''}
                onChange={(e) => onChange(key, e.target.value)}
                placeholder={field.description || `Enter ${key}...`}
                style={inputStyle}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function PlaygroundPage() {
  const params = useParams();
  const skillId = params.skillId as string;
  const skill = getSkill(skillId);
  const { user, status: authStatus } = useCrossmintAuth();
  const isLoggedIn = authStatus === 'logged-in';
  const { wallet, status: walletStatus } = useWallet();
  const connected = walletStatus === 'loaded' && wallet != null;
  const walletAddress = connected && wallet ? wallet.address : null;
  const solanaWallet = connected && wallet ? SolanaWallet.from(wallet) : null;

  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [lines, setLines] = useState<TerminalLine[]>([]);
  const [running, setRunning] = useState(false);
  const [lastResult, setLastResult] = useState<Record<string, unknown> | null>(null);
  const [copiedOutput, setCopiedOutput] = useState(false);
  const [copiedCurl, setCopiedCurl] = useState(false);
  const [chainFirst, setChainFirst] = useState('scrape');
  const [chainSecond, setChainSecond] = useState('summarize');

  const addLine = useCallback((content: string, type: TerminalLine['type'] = 'info') => {
    setLines((prev) => [...prev, { timestamp: ts(), content, type }]);
  }, []);

  if (!skill) {
    return (
      <div
        className="flex flex-col items-center justify-center min-h-[50vh] text-center"
        style={{ fontFamily: "'Share Tech Mono', monospace", color: G_MUTED }}
      >
        <div
          style={{ fontFamily: "'VT323', monospace", fontSize: '48px', color: '#ff4444' }}
        >
          SKILL NOT FOUND
        </div>
        <div className="text-sm mt-2 mb-6" style={{ color: G_MUTED }}>
          &quot;{skillId}&quot; is not in the registry
        </div>
        <Link
          href="/"
          className="flex items-center gap-2 text-sm"
          style={{ color: G_DIM }}
        >
          <ArrowLeft size={14} />
          back to marketplace
        </Link>
      </div>
    );
  }

  function generateCurl() {
    const body = JSON.stringify(formValues, null, 2);
    return `# SkillDock x402 — ${skill!.id}
curl -X ${skill!.method} ${skill!.endpoint} \\
  -H "Content-Type: application/json"${skill!.method === 'POST' ? ` \\
  -d '${body}'` : ''}
# → 402 Payment Required

# Retry with X-PAYMENT header
curl -X ${skill!.method} ${skill!.endpoint} \\
  -H "Content-Type: application/json" \\
  -H "X-PAYMENT: <base64_signed_tx>"${skill!.method === 'POST' ? ` \\
  -d '${body}'` : ''}`;
  }

  async function downloadMCP() {
    const res = await fetch(`/api/skills/${skill!.id}/mcp`);
    const json = await res.json();
    const blob = new Blob([JSON.stringify(json, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `skilldock_${skill!.id}.mcp.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function copyCurl() {
    await navigator.clipboard.writeText(generateCurl());
    setCopiedCurl(true);
    setTimeout(() => setCopiedCurl(false), 2000);
  }

  async function copyOutput() {
    if (!lastResult) return;
    await navigator.clipboard.writeText(JSON.stringify(lastResult, null, 2));
    setCopiedOutput(true);
    setTimeout(() => setCopiedOutput(false), 2000);
  }

  async function runSkill() {
    if (running) return;

    // Validate required fields before spending any USDC
    const requiredFields = (skill!.inputSchema as { required?: string[] }).required || [];
    const missing = requiredFields.filter((f) => !formValues[f]?.trim());
    if (missing.length > 0) {
      setLines([{
        timestamp: ts(),
        content: `✗ Missing required field${missing.length > 1 ? 's' : ''}: ${missing.join(', ')}`,
        type: 'error',
      }]);
      return;
    }

    setRunning(true);
    setLines([]);
    setLastResult(null);
    try {
      addLine('Connecting wallet...', 'info');
      await new Promise((r) => setTimeout(r, 80));

      if (!connected || !walletAddress) {
        addLine('⚠ Not logged in — running in demo mode (no real payment)', 'warning');
      } else {
        addLine(`Wallet: ${walletAddress.slice(0, 4)}…${walletAddress.slice(-4)}`, 'success');
      }

      await new Promise((r) => setTimeout(r, 60));

      const method = skill!.method;
      let endpoint = skill!.endpoint;
      let fetchInit: RequestInit = { method, headers: { 'Content-Type': 'application/json' } };

      if (method === 'GET') {
        endpoint = `/api/skills/${skill!.id}?token=${formValues.token || 'SOL'}`;
        fetchInit = { method: 'GET' };
      } else {
        fetchInit.body = JSON.stringify(formValues);
        endpoint = `/api/skills/${skill!.id}`;
      }

      addLine(`→ ${method} ${endpoint}`, 'info');
      await new Promise((r) => setTimeout(r, 80));

      const probe = await fetch(endpoint, fetchInit);
      addLine(`← ${probe.status} ${probe.status === 402 ? 'Payment Required' : probe.statusText}`, 'info');

      let txHash = '';

      if (probe.status === 402) {
        const payReqs = await probe.json();
        const atomicAmount = parseInt(payReqs.amount || '1000');
        const amountUsdc = (atomicAmount / 1_000_000).toFixed(3);

        addLine(`Payment required: $${amountUsdc} USDC`, 'warning');
        addLine(`Pay to: ${payReqs.payTo}`, 'info');
        addLine(`Network: ${payReqs.network}`, 'info');

        let paymentHeader: string;

        if (connected && walletAddress && solanaWallet) {
          // ── REAL PAYMENT via Crossmint embedded wallet ─────────────
          if (!payReqs.payTo) {
            addLine('✗ TREASURY_WALLET_ADDRESS is not set on the server.', 'error');
            setRunning(false);
            return;
          }

          addLine('Sending USDC via Crossmint wallet...', 'info');
          try {
            const txResult = await solanaWallet.send(
              payReqs.payTo,
              'usdc',
              amountUsdc
            );
            txHash = txResult.hash ?? '';
          } catch (err) {
            addLine(`✗ Payment failed: ${err instanceof Error ? err.message : String(err)}`, 'error');
            setRunning(false);
            return;
          }

          addLine(`✓ Confirmed: ${txHash.slice(0, 8)}…`, 'success');
          paymentHeader = encodePaymentHeader(txHash, null, payReqs);
          // ── END REAL PAYMENT ──────────────────────────────────────
        } else {
          // Demo mode — wallet not connected
          addLine('⚠ Wallet not connected — demo mode (no real payment)', 'warning');
          txHash = 'demo_' + Math.random().toString(36).slice(2, 10);
          paymentHeader = Buffer.from(
            JSON.stringify({ signature: txHash, amount: payReqs.amount, payTo: payReqs.payTo })
          ).toString('base64');
        }

        addLine('→ Retrying with X-PAYMENT header...', 'info');

        const start = Date.now();
        const retryInit: RequestInit = {
          method,
          headers: { 'Content-Type': 'application/json', 'X-PAYMENT': paymentHeader },
        };
        if (method !== 'GET') retryInit.body = JSON.stringify(formValues);

        addLine('Executing skill...', 'info');

        const result = await fetch(endpoint, retryInit);
        const duration = Date.now() - start;

        if (!result.ok) {
          let errData: Record<string, string> = {};
          try { errData = await result.json(); } catch {}
          const msg = errData.error || errData.message || 'Unknown error';
          addLine(`✗ Error ${result.status}: ${msg}`, 'error');
          if (result.status === 402) {
            addLine('  → Check server logs for Purch facilitator response', 'error');
            addLine('  → Ensure PURCH_SERVER_ID matches your facilitator account', 'error');
          }
          setRunning(false);
          return;
        }

        const data = await result.json();
        setLastResult(data as Record<string, unknown>);

        addLine(`✓ Complete — ${duration}ms`, 'success');
        addLine('─────────────────── RESULT ───────────────────', 'result');
        setLines((prev) => [
          ...prev,
          {
            timestamp: ts(),
            content: `<pre style="white-space:pre-wrap;font-size:13px;margin-top:6px">${highlightJSON(data)}</pre>`,
            type: 'result',
          },
        ]);
        addLine('', 'info');
        addLine('─────────────────── RECEIPT ──────────────────', 'receipt');
        addLine(`Amount: $${amountUsdc} USDC  |  Duration: ${duration}ms`, 'receipt');
        const explorerUrl = `https://explorer.solana.com/tx/${txHash}?cluster=devnet`;
        setLines((prev) => [
          ...prev,
          {
            timestamp: ts(),
            content: `Tx: <a href="${explorerUrl}" target="_blank" rel="noopener noreferrer" style="color:var(--g);text-decoration:underline;cursor:pointer">${txHash.slice(0, 8)}…${txHash.slice(-6)}</a> <span style="opacity:0.6">↗ explorer.solana.com</span>`,
            type: 'link',
          },
        ]);
        addLine('Network: solana:devnet', 'receipt');
      } else {
        const data = await probe.json();
        setLastResult(data as Record<string, unknown>);
        addLine('─────────────────── RESULT ───────────────────', 'result');
        setLines((prev) => [
          ...prev,
          {
            timestamp: ts(),
            content: `<pre style="white-space:pre-wrap;font-size:13px;margin-top:6px">${highlightJSON(data)}</pre>`,
            type: 'result',
          },
        ]);
      }
    } catch (err) {
      addLine(`✗ ${err instanceof Error ? err.message : 'Unexpected error'}`, 'error');
    } finally {
      setRunning(false);
    }
  }

  const chainPrice =
    (SKILLS_REGISTRY.find((s) => s.id === chainFirst)?.price || 0) +
    (SKILLS_REGISTRY.find((s) => s.id === chainSecond)?.price || 0);

  const selectStyle: React.CSSProperties = {
    width: '100%',
    background: G_BG,
    border: `1px solid ${G_BORDER}`,
    color: G,
    fontFamily: "'Share Tech Mono', monospace",
    fontSize: '13px',
    padding: '10px 14px',
    outline: 'none',
  };

  return (
    <div
      className="min-h-screen"
      style={{
        background: G_BG,
        fontFamily: "'Share Tech Mono', monospace",
        color: G,
      }}
    >
      <div style={{ maxWidth: '1152px', margin: '0 auto', padding: '36px 40px 64px', display: 'flex', flexDirection: 'column', gap: '28px' }}>

        {/* ── Breadcrumb ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
          <Link
            href="/"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-3)', textDecoration: 'none', transition: 'color 0.15s' }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = 'var(--text-1)')}
            onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = 'var(--text-3)')}
          >
            <ArrowLeft size={13} />
            Marketplace
          </Link>
          <span style={{ color: 'var(--text-3)' }}>/</span>
          <span style={{ color: 'var(--purple-light)', fontWeight: 600 }}>{skill.id}</span>
        </div>

        {/* ── Skill header ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
            <div style={{ width: '52px', height: '52px', borderRadius: '12px', background: 'var(--purple-subtle)', border: '1px solid var(--purple-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '26px', flexShrink: 0 }}>
              {skill.icon || '⚙️'}
            </div>
            <div>
              <div style={{ fontFamily: "'VT323', monospace", fontSize: '34px', letterSpacing: '0.08em', color: 'var(--text-1)', lineHeight: 1 }}>
                {skill.name.toUpperCase()}
              </div>
              <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: '12px', color: 'var(--text-3)', marginTop: '3px' }}>
                /{skill.id}
              </div>
            </div>
          </div>

          <p style={{ fontSize: '15px', color: 'var(--text-2)', lineHeight: 1.6, maxWidth: '680px' }}>{skill.description}</p>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 12px', borderRadius: '999px', fontSize: '12px', fontWeight: 700, background: 'rgba(20,241,149,0.12)', color: 'var(--green)', border: '1px solid rgba(20,241,149,0.25)' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--green)', display: 'inline-block' }} className="pulse-glow" />
              LIVE
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', padding: '4px 12px', borderRadius: '999px', fontSize: '12px', fontWeight: 600, background: 'rgba(255,255,255,0.06)', color: 'var(--text-2)', border: '1px solid var(--border)' }}>
              {skill.method}
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', padding: '4px 12px', borderRadius: '999px', fontFamily: "'VT323', monospace", fontSize: '16px', fontWeight: 700, background: 'rgba(20,241,149,0.08)', color: 'var(--green)', border: '1px solid rgba(20,241,149,0.2)' }}>
              ${skill.price.toFixed(3)} USDC
            </span>
            {skill.tags.map((tag) => (
              <span key={tag} className="tag-pill">{tag}</span>
            ))}
          </div>
        </div>

        {/* ── Main grid ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>

          {/* Left: inputs */}
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--purple-border)', borderRadius: '12px', overflow: 'hidden' }}>
            <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--purple-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--purple-subtle)' }}>
              <span style={{ color: 'var(--purple-light)', fontFamily: "'Share Tech Mono', monospace", fontSize: '13px', fontWeight: 700, letterSpacing: '0.06em' }}>INPUTS</span>
              <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: '11px', color: 'var(--text-3)' }}>
                {skill.method} {skill.endpoint.replace(/https?:\/\/[^/]+/, '')}
              </span>
            </div>
            <div className="p-5 space-y-5">
              <DynamicForm
                schema={skill.inputSchema}
                values={formValues}
                onChange={(k, v) => setFormValues((prev) => ({ ...prev, [k]: v }))}
              />

              {/* Execute row */}
              <div>
                <div style={{ fontSize: '11px', marginBottom: '8px', color: 'var(--text-3)', fontFamily: "'Share Tech Mono', monospace", overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  $ run --skill={skill.id} --pay=${skill.price.toFixed(3)}
                </div>
                <div className="flex">
                  <div
                    className="flex-1 px-4 py-3 text-sm"
                    style={{
                      background: G_BG,
                      border: `1px solid ${G_BORDER}`,
                      borderRight: 'none',
                      color: G_MUTED,
                    }}
                  >
                    {running ? 'executing...' : `▶ ${skill.id} --pay=$${skill.price.toFixed(3)}`}
                  </div>
                  <button
                    onClick={runSkill}
                    disabled={running}
                    style={{
                      background: running ? 'var(--text-3)' : 'var(--purple)',
                      color: '#fff',
                      fontFamily: "'Share Tech Mono', monospace",
                      letterSpacing: '0.06em',
                      minWidth: '110px',
                      padding: '0 20px',
                      border: 'none',
                      cursor: running ? 'not-allowed' : 'pointer',
                      opacity: running ? 0.6 : 1,
                      fontSize: '13px',
                      fontWeight: 700,
                    }}
                  >
                    {running ? (
                      <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                        <span style={{ width: '12px', height: '12px', borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} />
                        WAIT
                      </span>
                    ) : (
                      '▶ EXECUTE'
                    )}
                  </button>
                </div>
              </div>

              {!isLoggedIn && (
                <div style={{ border: '1px solid var(--purple-border)', borderRadius: '10px', overflow: 'hidden', background: 'var(--purple-subtle)' }}>
                  <div style={{ padding: '10px 16px 8px', fontSize: '13px', color: '#f59e0b', fontWeight: 600 }}>
                    Sign in to pay with your Crossmint wallet — or continue in demo mode
                  </div>
                  <div className="crossmint-form-wrap" style={{ padding: '0 8px 8px' }}>
                    <EmbeddedAuthForm />
                  </div>
                </div>
              )}
              {isLoggedIn && (
                <div style={{ padding: '10px 14px', borderRadius: '8px', fontSize: '13px', color: 'var(--green)', background: 'rgba(20,241,149,0.08)', border: '1px solid rgba(20,241,149,0.2)' }}>
                  ✓ Signed in as {user?.email}
                </div>
              )}

              {/* Secondary actions */}
              <div style={{ display: 'flex', gap: '8px', paddingTop: '4px' }}>
                <button
                  onClick={downloadMCP}
                  style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '8px 0', fontSize: '12px', fontFamily: "'Share Tech Mono', monospace", background: 'transparent', border: '1px solid var(--border-2)', color: 'var(--text-3)', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.15s' }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--purple-border)'; (e.currentTarget as HTMLElement).style.color = 'var(--purple-light)'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-2)'; (e.currentTarget as HTMLElement).style.color = 'var(--text-3)'; }}
                >
                  <Download size={12} />
                  MCP JSON
                </button>
                <button
                  onClick={copyCurl}
                  style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '8px 0', fontSize: '12px', fontFamily: "'Share Tech Mono', monospace", background: 'transparent', border: '1px solid var(--border-2)', color: 'var(--text-3)', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.15s' }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--purple-border)'; (e.currentTarget as HTMLElement).style.color = 'var(--purple-light)'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-2)'; (e.currentTarget as HTMLElement).style.color = 'var(--text-3)'; }}
                >
                  {copiedCurl ? <><CheckCheck size={12} />Copied</> : <><Copy size={12} />cURL</>}
                </button>
              </div>
            </div>
          </div>

          {/* Right: terminal */}
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid var(--border)', background: 'var(--g-card)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ff5f57' }} />
                  <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#febc2e' }} />
                  <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--green)' }} />
                </div>
                <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: '12px', color: 'var(--text-3)' }}>
                  TERMINAL · {skill.id.toUpperCase()}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                {lastResult && (
                  <button
                    onClick={copyOutput}
                    style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', background: 'transparent', border: 'none', color: 'var(--text-3)', cursor: 'pointer', transition: 'color 0.15s' }}
                    onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = 'var(--green)')}
                    onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = 'var(--text-3)')}
                  >
                    {copiedOutput ? <><CheckCheck size={12} />Copied</> : <><Copy size={12} />Copy</>}
                  </button>
                )}
                <button
                  onClick={() => { setLines([]); setLastResult(null); }}
                  style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', background: 'transparent', border: 'none', color: 'var(--text-3)', cursor: 'pointer', transition: 'color 0.15s' }}
                  onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = '#ff5f57')}
                  onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = 'var(--text-3)')}
                >
                  <Trash2 size={12} />
                  Clear
                </button>
              </div>
            </div>
            <TerminalOutput lines={lines} />
          </div>
        </div>

        {/* ── Compose Skills ── */}
        <div style={{ border: '1px solid var(--purple-border)', borderRadius: '12px', overflow: 'hidden', background: 'var(--bg-card)' }}>
          <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--purple-border)', background: 'var(--purple-subtle)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: 'var(--purple-light)', fontFamily: "'Share Tech Mono', monospace", fontSize: '13px', fontWeight: 700, letterSpacing: '0.06em' }}>COMPOSE SKILLS</span>
          </div>
          <div style={{ padding: '20px' }}>
            <div style={{ fontSize: '13px', color: 'var(--text-3)', marginBottom: '16px', fontFamily: "'Share Tech Mono', monospace" }}>
              Chain two skills — output of the first feeds into the second
            </div>
            <div className="flex flex-wrap items-end gap-4">
              <div className="flex-1 min-w-[140px]">
                <div className="text-xs mb-2" style={{ color: G_MUTED }}>--first</div>
                <select value={chainFirst} onChange={(e) => setChainFirst(e.target.value)} style={selectStyle}>
                  {SKILLS_REGISTRY.map((s) => (
                    <option key={s.id} value={s.id}>{s.id}</option>
                  ))}
                </select>
              </div>
              <div style={{ color: G_MUTED, fontSize: '18px', paddingBottom: '10px' }}>→</div>
              <div className="flex-1 min-w-[140px]">
                <div className="text-xs mb-2" style={{ color: G_MUTED }}>--then</div>
                <select value={chainSecond} onChange={(e) => setChainSecond(e.target.value)} style={selectStyle}>
                  {SKILLS_REGISTRY.map((s) => (
                    <option key={s.id} value={s.id}>{s.id}</option>
                  ))}
                </select>
              </div>
              <div className="min-w-[100px]">
                <div className="text-xs mb-2" style={{ color: G_MUTED }}>--cost</div>
                <div
                  className="px-4 py-2.5 text-sm"
                  style={{ border: `1px solid ${G_BORDER}`, color: G }}
                >
                  ${chainPrice.toFixed(3)}
                </div>
              </div>
              <div style={{ paddingBottom: '0px' }}>
                <Link
                  href="/play/compose"
                  style={{ display: 'inline-block', padding: '10px 20px', fontSize: '13px', fontWeight: 700, background: 'var(--purple)', color: '#fff', borderRadius: '8px', textDecoration: 'none', fontFamily: "'Share Tech Mono', monospace", letterSpacing: '0.04em', transition: 'opacity 0.15s' }}
                  onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
                  onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
                >
                  ▶ RUN CHAIN
                </Link>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
