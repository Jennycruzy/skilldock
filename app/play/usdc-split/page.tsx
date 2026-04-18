'use client';

import { useState, useCallback, useEffect } from 'react';
import { useCrossmintAuth, EmbeddedAuthForm, useWallet, SolanaWallet } from '@crossmint/client-sdk-react-ui';
import Link from 'next/link';
import { Download, Copy, CheckCheck, ArrowLeft, Plus, Trash2, RefreshCw } from 'lucide-react';
import { encodePaymentHeader } from '@/lib/solana-payment';

const G = 'var(--g)';
const G_DIM = 'var(--g-dim)';
const G_MUTED = 'var(--g-muted)';
const G_BORDER = 'var(--g-border)';
const G_BG = 'var(--g-bg)';
const G_CARD = 'var(--g-card)';

function ts() { return new Date().toISOString().slice(11, 23); }

type TerminalLine = { timestamp: string; content: string; type: 'info' | 'success' | 'error' | 'warning' | 'result' | 'receipt' | 'link' };

interface Recipient { address: string; amount: string; }
interface VaultInfo { vaultAddress: string; balanceUsdc: number; }

export default function UsdcSplitPlayPage() {
  const { user, status: authStatus } = useCrossmintAuth();
  const isLoggedIn = authStatus === 'logged-in';
  const { wallet, status: walletStatus } = useWallet();
  const connected = walletStatus === 'loaded' && wallet != null;
  const walletAddress = connected && wallet ? wallet.address : null;
  const solanaWallet = connected && wallet ? SolanaWallet.from(wallet) : null;

  const [agentId, setAgentId] = useState('');
  const [vault, setVault] = useState<VaultInfo | null>(null);
  const [loadingVault, setLoadingVault] = useState(false);
  const [recipients, setRecipients] = useState<Recipient[]>([
    { address: '', amount: '' },
    { address: '', amount: '' },
  ]);
  const [memo, setMemo] = useState('');
  const [lines, setLines] = useState<TerminalLine[]>([]);
  const [running, setRunning] = useState(false);
  const [copiedCurl, setCopiedCurl] = useState(false);

  const addLine = useCallback((content: string, type: TerminalLine['type'] = 'info') => {
    setLines((prev) => [...prev, { timestamp: ts(), content, type }]);
  }, []);

  const totalSplit = recipients.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);
  const skillFee = recipients.filter(r => r.address || r.amount).length * 0.006;
  const validRecipients = recipients.filter(r => r.address.trim() && parseFloat(r.amount) > 0);
  const vaultSufficient = vault ? vault.balanceUsdc >= totalSplit : false;

  async function fetchVault() {
    if (!agentId.trim()) return;
    setLoadingVault(true);
    try {
      const res = await fetch(`/api/registry/agent-vault/${agentId.trim()}`);
      const data = await res.json() as VaultInfo & { error?: string };
      if (res.ok) {
        setVault({ vaultAddress: data.vaultAddress, balanceUsdc: data.balanceUsdc });
      } else {
        setVault(null);
      }
    } catch {
      setVault(null);
    } finally {
      setLoadingVault(false);
    }
  }

  useEffect(() => {
    if (!agentId.trim()) { setVault(null); return; }
    const t = setTimeout(fetchVault, 600);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agentId]);

  useEffect(() => {
    if (!vault) return;
    const t = setInterval(fetchVault, 10000);
    return () => clearInterval(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vault, agentId]);

  function addRecipient() {
    if (recipients.length >= 20) return;
    setRecipients(prev => [...prev, { address: '', amount: '' }]);
  }

  function removeRecipient(i: number) {
    setRecipients(prev => prev.filter((_, idx) => idx !== i));
  }

  function updateRecipient(i: number, field: 'address' | 'amount', val: string) {
    setRecipients(prev => prev.map((r, idx) => idx === i ? { ...r, [field]: val } : r));
  }

  async function downloadMCP() {
    const res = await fetch('/api/skills/usdc-split/mcp');
    const json = await res.json();
    const blob = new Blob([JSON.stringify(json, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'skilldock_usdc_split.mcp.json'; a.click();
    URL.revokeObjectURL(url);
  }

  function generateCurl() {
    const body = JSON.stringify({
      agentId: agentId || 'YOUR_AGENT_ID',
      recipients: validRecipients.map(r => ({ address: r.address, amount: parseFloat(r.amount) })),
      memo: memo || 'Bulk payment',
      network: 'devnet',
    }, null, 2);
    return `# Step 1: get payment requirements
curl -X POST https://skilldock.duckdns.org/api/skills/usdc-split \\
  -H "Content-Type: application/json" \\
  -d '${body}'
# → 402 with payment-required header

# Step 2: sign USDC tx for skill fee, then retry
curl -X POST https://skilldock.duckdns.org/api/skills/usdc-split \\
  -H "Content-Type: application/json" \\
  -H "X-PAYMENT: <base64_signed_tx>" \\
  -d '${body}'`;
  }

  async function copyCurl() {
    await navigator.clipboard.writeText(generateCurl());
    setCopiedCurl(true);
    setTimeout(() => setCopiedCurl(false), 2000);
  }

  async function runSkill() {
    if (running || !vaultSufficient || validRecipients.length === 0) return;
    setRunning(true);
    setLines([]);

    try {
      addLine('Connecting wallet...', 'info');
      if (!connected || !walletAddress) {
        addLine('⚠ Not logged in — running in demo mode (no real payment)', 'warning');
      } else {
        addLine(`Wallet: ${walletAddress.slice(0, 4)}…${walletAddress.slice(-4)}`, 'success');
      }

      const body = {
        agentId: agentId.trim(),
        recipients: validRecipients.map(r => ({ address: r.address, amount: parseFloat(r.amount) })),
        memo: memo || undefined,
        network: 'devnet',
      };

      addLine(`→ POST /api/skills/usdc-split (${validRecipients.length} recipients)`, 'info');

      const probe = await fetch('/api/skills/usdc-split', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      addLine(`← ${probe.status} ${probe.status === 402 ? 'Payment Required' : probe.statusText}`, 'info');

      if (probe.status === 402) {
        const payReqs = await probe.json() as Record<string, unknown>;
        const atomicAmount = parseInt((payReqs.amount as string) || '1000');
        const amountUsdc = (atomicAmount / 1_000_000).toFixed(4);
        addLine(`Skill fee: $${amountUsdc} USDC (${validRecipients.length} × $0.006)`, 'warning');

        let paymentHeader: string;

        if (connected && walletAddress && solanaWallet && payReqs.payTo) {
          addLine('Sending skill fee via Crossmint wallet...', 'info');
          try {
            const txResult = await solanaWallet.send(payReqs.payTo as string, 'usdc', amountUsdc);
            const txHash = txResult.hash ?? '';
            addLine(`✓ Fee paid: ${txHash.slice(0, 8)}…`, 'success');
            paymentHeader = encodePaymentHeader(txHash, null, payReqs as { amount: string; payTo: string; network: string });
          } catch (err) {
            addLine(`✗ Payment failed: ${err instanceof Error ? err.message : String(err)}`, 'error');
            setRunning(false);
            return;
          }
        } else {
          addLine('⚠ Demo mode — simulating payment', 'warning');
          const demoHash = 'demo_' + Math.random().toString(36).slice(2, 10);
          paymentHeader = Buffer.from(JSON.stringify({ signature: demoHash, amount: payReqs.amount, payTo: payReqs.payTo })).toString('base64');
        }

        addLine('→ Executing split...', 'info');

        const result = await fetch('/api/skills/usdc-split', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-PAYMENT': paymentHeader },
          body: JSON.stringify(body),
        });

        const data = await result.json() as Record<string, unknown>;

        if (!result.ok) {
          addLine(`✗ Error ${result.status}: ${(data.error as string) || 'Unknown error'}`, 'error');
          if (data.error === 'INSUFFICIENT_VAULT_BALANCE') {
            addLine(`  Vault balance: $${data.vaultBalance} USDC`, 'error');
            addLine(`  Total required: $${data.totalRequired} USDC`, 'error');
            addLine(`  Shortfall: $${data.shortfall} USDC`, 'error');
          }
          setRunning(false);
          return;
        }

        addLine(`✓ Split executed! ${data.recipientCount} recipients`, 'success');
        addLine(`Total sent: $${data.totalAmountSent} USDC`, 'success');
        const txHash = data.txHash as string;
        addLine('', 'info');
        addLine(`Tx: ${txHash}`, 'receipt');
        addLine(`Explorer: https://explorer.solana.com/tx/${txHash}?cluster=devnet`, 'receipt');
        addLine(`Vault balance after: $${data.vaultBalanceAfter}`, 'receipt');

        // Refresh vault balance
        await fetchVault();
      } else {
        const data = await probe.json();
        addLine(`Result: ${JSON.stringify(data, null, 2)}`, 'result');
      }
    } catch (err) {
      addLine(`✗ ${err instanceof Error ? err.message : 'Unexpected error'}`, 'error');
    } finally {
      setRunning(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    background: G_BG, border: `1px solid ${G_BORDER}`, color: G,
    fontFamily: "'Share Tech Mono', monospace", fontSize: '13px',
    padding: '8px 12px', outline: 'none', width: '100%',
  };

  return (
    <div className="min-h-screen" style={{ background: G_BG, fontFamily: "'Share Tech Mono', monospace", color: G }}>
      <div style={{ maxWidth: '1152px', margin: '0 auto', padding: '36px 40px 64px', display: 'flex', flexDirection: 'column', gap: '28px' }}>

        {/* Breadcrumb */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-3)', textDecoration: 'none' }}>
            <ArrowLeft size={13} /> Marketplace
          </Link>
          <span style={{ color: 'var(--text-3)' }}>/</span>
          <span style={{ color: 'var(--purple-light)', fontWeight: 600 }}>usdc-split</span>
        </div>

        {/* Header */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '12px' }}>
            <div style={{ width: '52px', height: '52px', borderRadius: '12px', background: 'var(--purple-subtle)', border: '1px solid var(--purple-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '26px' }}>
              💸
            </div>
            <div>
              <div style={{ fontFamily: "'VT323', monospace", fontSize: '34px', letterSpacing: '0.08em', color: 'var(--text-1)', lineHeight: 1 }}>USDC SPLITTER</div>
              <div style={{ fontSize: '12px', color: 'var(--text-3)', marginTop: '3px' }}>/usdc-split</div>
            </div>
          </div>
          <p style={{ fontSize: '15px', color: 'var(--text-2)', lineHeight: 1.6, maxWidth: '680px' }}>
            Execute multiple USDC transfers in one batched Solana transaction from your agent&apos;s dedicated vault.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center', marginTop: '12px' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 12px', borderRadius: '999px', fontSize: '12px', fontWeight: 700, background: 'rgba(20,241,149,0.12)', color: 'var(--green)', border: '1px solid rgba(20,241,149,0.25)' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--green)', display: 'inline-block' }} className="pulse-glow" /> LIVE
            </span>
            <span style={{ padding: '4px 12px', borderRadius: '999px', fontFamily: "'VT323', monospace", fontSize: '16px', fontWeight: 700, background: 'rgba(20,241,149,0.08)', color: 'var(--green)', border: '1px solid rgba(20,241,149,0.2)' }}>
              $0.006 × recipients
            </span>
          </div>
        </div>

        {/* Agent Vault Section */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--purple-border)', borderRadius: '12px', overflow: 'hidden' }}>
          <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--purple-border)', background: 'var(--purple-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--purple-light)', fontSize: '13px', fontWeight: 700, letterSpacing: '0.06em' }}>AGENT VAULT</span>
            <span style={{ fontSize: '11px', color: 'var(--text-3)' }}>Fund before splitting</span>
          </div>
          <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11px', color: G_MUTED, marginBottom: '8px', letterSpacing: '0.06em' }}>
                --agent-id *
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  value={agentId}
                  onChange={(e) => setAgentId(e.target.value)}
                  placeholder="Your SkillDock Agent ID (UUID from registration)"
                  style={{ ...inputStyle, flex: 1 }}
                />
                <button onClick={fetchVault} disabled={loadingVault || !agentId}
                  style={{ padding: '8px 14px', background: 'var(--purple)', color: '#fff', border: 'none', cursor: 'pointer', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '6px', opacity: (!agentId || loadingVault) ? 0.5 : 1 }}>
                  <RefreshCw size={12} className={loadingVault ? 'animate-spin' : ''} />
                </button>
              </div>
            </div>

            {vault && (
              <div style={{ borderRadius: '10px', border: '1px solid var(--purple-border)', padding: '16px', background: 'rgba(153,69,255,0.05)', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {/* Vault address */}
                <div>
                  <div style={{ fontSize: '11px', color: G_MUTED, marginBottom: '6px' }}>Send bulk USDC here before splitting</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <code style={{ fontSize: '13px', color: 'var(--purple-light)', background: G_BG, padding: '6px 10px', borderRadius: '6px', border: `1px solid ${G_BORDER}`, flex: 1, wordBreak: 'break-all' }}>
                      {vault.vaultAddress}
                    </code>
                    <button onClick={async () => { await navigator.clipboard.writeText(vault.vaultAddress); }}
                      style={{ padding: '6px 10px', border: `1px solid ${G_BORDER}`, background: 'transparent', color: G_MUTED, cursor: 'pointer', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', whiteSpace: 'nowrap' }}>
                      <Copy size={11} /> Copy
                    </button>
                  </div>
                </div>

                {/* QR and balance */}
                <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                  <div style={{ background: '#fff', padding: '8px', borderRadius: '8px' }}>
                    <div style={{ width: '80px', height: '80px', background: 'repeating-conic-gradient(#000 0% 25%, #fff 0% 50%) 0 0 / 10px 10px', borderRadius: '4px' }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div>
                      <div style={{ fontSize: '11px', color: G_MUTED, marginBottom: '3px' }}>USDC Balance</div>
                      <div style={{ fontFamily: "'VT323', monospace", fontSize: '28px', color: vault.balanceUsdc > 0 ? 'var(--green)' : 'var(--text-3)', lineHeight: 1 }}>
                        ${vault.balanceUsdc.toFixed(4)}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '11px', color: G_MUTED, marginBottom: '3px' }}>Total to split</div>
                      <div style={{ fontFamily: "'VT323', monospace", fontSize: '22px', color: G, lineHeight: 1 }}>
                        ${totalSplit.toFixed(4)}
                      </div>
                    </div>
                    <div style={{
                      display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '5px 12px',
                      borderRadius: '999px', fontSize: '12px', fontWeight: 700,
                      background: vaultSufficient ? 'rgba(20,241,149,0.12)' : 'rgba(255,68,68,0.12)',
                      color: vaultSufficient ? 'var(--green)' : '#ff4444',
                      border: `1px solid ${vaultSufficient ? 'rgba(20,241,149,0.3)' : 'rgba(255,68,68,0.3)'}`,
                    }}>
                      {vaultSufficient
                        ? '✓ Vault funded'
                        : `✗ Need $${Math.max(0, totalSplit - vault.balanceUsdc).toFixed(4)} more`}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Recipient List + Terminal */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          {/* Left: recipients */}
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--purple-border)', borderRadius: '12px', overflow: 'hidden' }}>
            <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--purple-border)', background: 'var(--purple-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--purple-light)', fontSize: '13px', fontWeight: 700, letterSpacing: '0.06em' }}>RECIPIENTS</span>
              <span style={{ fontSize: '11px', color: 'var(--text-3)' }}>max 20</span>
            </div>
            <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {recipients.map((r, i) => (
                <div key={i} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input
                    value={r.address}
                    onChange={(e) => updateRecipient(i, 'address', e.target.value)}
                    placeholder={`Wallet address ${i + 1}`}
                    style={{ ...inputStyle, flex: 2, fontSize: '11px' }}
                  />
                  <input
                    value={r.amount}
                    onChange={(e) => updateRecipient(i, 'amount', e.target.value)}
                    placeholder="USDC"
                    type="number"
                    min="0"
                    step="0.01"
                    style={{ ...inputStyle, width: '80px', flex: 0 }}
                  />
                  <button onClick={() => removeRecipient(i)}
                    style={{ padding: '8px', background: 'transparent', border: `1px solid ${G_BORDER}`, color: G_MUTED, cursor: 'pointer', borderRadius: '4px', display: 'flex', alignItems: 'center' }}>
                    <Trash2 size={11} />
                  </button>
                </div>
              ))}

              <button onClick={addRecipient} disabled={recipients.length >= 20}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', border: `1px dashed ${G_BORDER}`, background: 'transparent', color: G_MUTED, cursor: 'pointer', borderRadius: '4px', fontSize: '12px', opacity: recipients.length >= 20 ? 0.5 : 1 }}>
                <Plus size={12} /> Add recipient
              </button>

              {/* Memo */}
              <div style={{ marginTop: '4px' }}>
                <label style={{ display: 'block', fontSize: '11px', color: G_MUTED, marginBottom: '6px' }}>--memo (optional)</label>
                <input value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="e.g. March contractor payments"
                  style={inputStyle} />
              </div>

              {/* Pricing summary */}
              <div style={{ background: G_BG, border: `1px solid ${G_BORDER}`, borderRadius: '6px', padding: '12px', fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: G_MUTED }}>Skill fee:</span>
                  <span style={{ color: G }}>{validRecipients.length} × $0.006 = <strong>${skillFee.toFixed(4)}</strong></span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: G_MUTED }}>Total USDC split:</span>
                  <span style={{ color: G }}><strong>${totalSplit.toFixed(4)}</strong></span>
                </div>
              </div>

              {/* Execute */}
              <button
                onClick={runSkill}
                disabled={running || !agentId || validRecipients.length === 0 || (vault !== null && !vaultSufficient)}
                title={!vault ? 'Enter agent ID first' : !vaultSufficient ? 'Fund your vault first' : ''}
                style={{
                  padding: '12px', background: (!vault || !vaultSufficient) ? 'var(--text-3)' : 'var(--purple)',
                  color: '#fff', border: 'none', cursor: (!vault || !vaultSufficient || running) ? 'not-allowed' : 'pointer',
                  fontSize: '13px', fontWeight: 700, opacity: (running || !agentId || (!vault && true) || (vault && !vaultSufficient)) ? 0.6 : 1,
                  fontFamily: "'Share Tech Mono', monospace", letterSpacing: '0.06em', borderRadius: '6px',
                }}
              >
                {running ? '⟳ SPLITTING...' : vault && !vaultSufficient ? '✗ FUND VAULT FIRST' : '▶ EXECUTE SPLIT'}
              </button>

              {!isLoggedIn && (
                <div style={{ border: '1px solid var(--purple-border)', borderRadius: '10px', overflow: 'hidden', background: 'var(--purple-subtle)' }}>
                  <div style={{ padding: '10px 16px 8px', fontSize: '13px', color: '#f59e0b', fontWeight: 600 }}>
                    Sign in to pay with Crossmint wallet
                  </div>
                  <div className="crossmint-form-wrap" style={{ padding: '0 8px 8px' }}>
                    <EmbeddedAuthForm />
                  </div>
                </div>
              )}
              {isLoggedIn && (
                <div style={{ padding: '8px 12px', borderRadius: '6px', fontSize: '12px', color: 'var(--green)', background: 'rgba(20,241,149,0.08)', border: '1px solid rgba(20,241,149,0.2)' }}>
                  ✓ {user?.email}
                </div>
              )}

              {/* Secondary actions */}
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={downloadMCP}
                  style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '8px', fontSize: '12px', fontFamily: "'Share Tech Mono', monospace", background: 'transparent', border: `1px solid ${G_BORDER}`, color: G_MUTED, borderRadius: '6px', cursor: 'pointer' }}>
                  <Download size={11} /> MCP JSON
                </button>
                <button onClick={copyCurl}
                  style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '8px', fontSize: '12px', fontFamily: "'Share Tech Mono', monospace", background: 'transparent', border: `1px solid ${G_BORDER}`, color: G_MUTED, borderRadius: '6px', cursor: 'pointer' }}>
                  {copiedCurl ? <><CheckCheck size={11} />Copied</> : <><Copy size={11} />cURL</>}
                </button>
              </div>
            </div>
          </div>

          {/* Right: terminal */}
          <div style={{ background: G_CARD, border: `1px solid ${G_BORDER}`, borderRadius: '12px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px', borderBottom: `1px solid ${G_BORDER}`, background: G_CARD }}>
              <div style={{ display: 'flex', gap: '6px' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ff5f57' }} />
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#febc2e' }} />
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--green)' }} />
              </div>
              <span style={{ fontSize: '12px', color: 'var(--text-3)' }}>TERMINAL · USDC-SPLIT</span>
            </div>
            <div style={{ flex: 1, padding: '16px', overflowY: 'auto', minHeight: '360px', maxHeight: '520px', fontSize: '13px', lineHeight: 1.8 }}>
              {lines.length === 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '200px', color: G_MUTED, textAlign: 'center' }}>
                  <div style={{ fontFamily: "'VT323', monospace", fontSize: '36px', opacity: 0.3 }}>READY</div>
                  <div style={{ fontSize: '12px', marginTop: '8px' }}>Enter agent ID → fund vault → add recipients → execute</div>
                </div>
              ) : lines.map((line, i) => {
                const colorMap: Record<string, string> = { info: G_DIM, success: G, error: '#ff4444', warning: '#ffcc00', result: G, receipt: G_DIM };
                return (
                  <div key={i} style={{ color: colorMap[line.type] || G, marginBottom: '2px' }} className="fade-in">
                    <span style={{ color: G_MUTED, userSelect: 'none' }}>[{line.timestamp}]&nbsp;</span>
                    {line.content}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Who uses this */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px' }}>
          <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--purple-light)', marginBottom: '16px', letterSpacing: '0.06em' }}>WHO USES THIS?</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
            {[
              { who: '🌐 Browser User', desc: 'Goes to /play/usdc-split, enters Agent ID to see vault address and QR code. Copies vault address, sends bulk USDC there, then fills recipient list and clicks Run. All recipients get USDC in one Solana transaction.' },
              { who: '🤖 Agent', desc: 'A DAO treasury agent receives a monthly payout JSON. Returns vault address to operator, who funds it. Agent calls this skill with the full recipient list, pays the skill fee from vault, and all contributors receive USDC in one transaction.' },
              { who: '⌨ CLI User', desc: 'Developer tests by sending 1 USDC to agent vault on devnet, then calling the skill via curl with 2 recipient addresses to verify the split executes correctly before wiring into a larger system.' },
            ].map(({ who, desc }) => (
              <div key={who} style={{ borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg)', padding: '14px' }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-1)', marginBottom: '8px' }}>{who}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-3)', lineHeight: 1.6 }}>{desc}</div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
