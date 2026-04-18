'use client';

import { useState, useEffect, useRef } from 'react';
import { CheckCheck, AlertCircle, Loader2, Globe, Wallet, Link2, RefreshCw, Copy } from 'lucide-react';

interface ParsedSkill {
  id: string;
  name: string;
  price: number;
  endpoint: string;
}

interface RegisterResult {
  success: boolean;
  provider: {
    id: string;
    name: string;
    wallet_address: string;
    manifest_url: string;
    skill_count: number;
    created_at: string;
    treasury_wallet_address?: string;
  };
  vaultAddress: string;
  parsedSkills: ParsedSkill[];
}

function QRCode({ value, size = 160 }: { value: string; size?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current || !value) return;
    // Generate a simple QR-like visual using canvas (placeholder)
    // In production, use qrcode.react or similar
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = '#000';

    // Simple checkered pattern as placeholder
    const cell = size / 21;
    const pattern = [
      [1,1,1,1,1,1,1,0,0,0,0,0,0,0,1,1,1,1,1,1,1],
      [1,0,0,0,0,0,1,0,1,0,1,0,1,0,1,0,0,0,0,0,1],
      [1,0,1,1,1,0,1,0,0,1,0,1,0,0,1,0,1,1,1,0,1],
      [1,0,1,1,1,0,1,0,1,0,1,0,1,0,1,0,1,1,1,0,1],
      [1,0,1,1,1,0,1,0,0,0,0,1,0,0,1,0,1,1,1,0,1],
      [1,0,0,0,0,0,1,0,1,0,1,0,1,0,1,0,0,0,0,0,1],
      [1,1,1,1,1,1,1,0,1,0,1,0,1,0,1,1,1,1,1,1,1],
      [0,0,0,0,0,0,0,0,1,0,0,0,1,0,0,0,0,0,0,0,0],
      [1,0,1,1,0,1,1,1,0,1,0,1,0,1,1,0,1,1,0,0,1],
      [0,1,0,0,1,0,0,0,1,0,1,0,1,0,0,1,0,0,1,0,0],
      [1,0,1,0,1,1,1,0,0,1,0,1,0,0,1,0,1,0,1,1,1],
      [0,0,0,1,0,0,0,1,0,0,1,0,0,1,0,0,0,1,0,0,0],
      [1,1,1,0,0,0,1,0,1,0,0,1,0,1,1,1,0,0,1,1,0],
      [0,0,0,0,0,0,0,0,1,0,1,0,1,0,0,0,0,1,0,1,0],
      [1,1,1,1,1,1,1,0,0,1,0,0,0,0,1,0,1,0,0,1,0],
      [1,0,0,0,0,0,1,0,1,0,1,1,0,1,0,1,0,0,1,0,1],
      [1,0,1,1,1,0,1,0,0,1,0,1,1,0,1,1,0,1,0,1,0],
      [1,0,1,1,1,0,1,1,1,0,0,0,0,1,0,0,1,0,1,0,0],
      [1,0,1,1,1,0,1,0,0,1,1,0,1,0,1,0,1,1,0,1,0],
      [1,0,0,0,0,0,1,0,1,0,0,1,0,0,0,1,0,0,0,1,1],
      [1,1,1,1,1,1,1,0,0,1,1,0,1,0,1,0,1,0,1,0,0],
    ];

    for (let row = 0; row < 21; row++) {
      for (let col = 0; col < 21; col++) {
        if (pattern[row][col]) {
          ctx.fillRect(col * cell, row * cell, cell, cell);
        }
      }
    }
  }, [value, size]);

  return <canvas ref={canvasRef} width={size} height={size} style={{ borderRadius: '8px' }} />;
}

function VaultSection({ vaultAddress, agentId }: { vaultAddress: string; agentId: string }) {
  const [balance, setBalance] = useState<number | null>(null);
  const [loadingBalance, setLoadingBalance] = useState(false);
  const [copied, setCopied] = useState(false);

  async function fetchBalance() {
    setLoadingBalance(true);
    try {
      const res = await fetch(`/api/registry/agent-vault/${agentId}`);
      const data = await res.json() as { balanceUsdc?: number };
      setBalance(data.balanceUsdc ?? 0);
    } catch {
      setBalance(0);
    } finally {
      setLoadingBalance(false);
    }
  }

  useEffect(() => {
    fetchBalance();
    const t = setInterval(fetchBalance, 10000);
    return () => clearInterval(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agentId]);

  async function copyAddress() {
    await navigator.clipboard.writeText(vaultAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="rounded-xl border border-[#9945FF]/40 bg-[#9945FF]/5 p-6 mt-6">
      <h2 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
        <span>💎</span> Your Agent Treasury Vault
      </h2>
      <p className="text-sm text-[#9ca3af] mb-5">
        This Crossmint wallet is your agent&apos;s dedicated USDC vault on Solana devnet.
        Fund it to post tasks and run the USDC Splitter skill.
      </p>

      <div className="flex flex-col sm:flex-row gap-6 items-start">
        <div className="shrink-0">
          <QRCode value={vaultAddress} size={140} />
        </div>
        <div className="flex-1 space-y-4">
          <div>
            <p className="text-xs text-[#6B7280] mb-1 font-medium uppercase tracking-wide">Vault Address</p>
            <div className="flex items-center gap-2">
              <code className="text-sm text-[#9945FF] font-mono break-all bg-[#13131a] rounded-lg px-3 py-2 flex-1">
                {vaultAddress}
              </code>
              <button
                onClick={copyAddress}
                className="shrink-0 p-2 rounded-lg border border-[#1e1e2e] bg-[#13131a] text-[#6B7280] hover:text-white transition-colors"
              >
                {copied ? <CheckCheck size={14} className="text-[#14F195]" /> : <Copy size={14} />}
              </button>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div>
              <p className="text-xs text-[#6B7280] mb-1 font-medium uppercase tracking-wide">USDC Balance</p>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-[#14F195]">
                  {balance === null ? '...' : `$${balance.toFixed(4)}`}
                </span>
                <button
                  onClick={fetchBalance}
                  disabled={loadingBalance}
                  className="p-1.5 rounded-lg text-[#6B7280] hover:text-white transition-colors disabled:opacity-50"
                >
                  <RefreshCw size={12} className={loadingBalance ? 'animate-spin' : ''} />
                </button>
              </div>
            </div>
            <div style={{ height: '40px', width: '1px', background: '#1e1e2e' }} />
            <div>
              <p className="text-xs text-[#6B7280] mb-1">Network</p>
              <span className="text-sm text-[#14F195] font-mono">Solana Devnet</span>
            </div>
          </div>

          <div className="rounded-lg border border-[#14F195]/20 bg-[#14F195]/5 p-3">
            <p className="text-xs text-[#14F195] font-medium mb-1">Fund your vault</p>
            <p className="text-xs text-[#9ca3af]">
              Send devnet USDC to the vault address above before posting tasks or executing the USDC Splitter skill.
              Get devnet USDC from <a href="https://spl-token-faucet.com" target="_blank" rel="noopener noreferrer" className="underline text-[#14F195]">spl-token-faucet.com</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  const [form, setForm] = useState({ name: '', wallet_address: '', manifest_url: '' });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RegisterResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch('/api/registry/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json() as RegisterResult & { error?: string };
      if (!res.ok) {
        setError(data.error || 'Registration failed');
      } else {
        setResult(data);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Network error');
    } finally {
      setLoading(false);
    }
  }

  if (result) {
    return (
      <div className="min-h-screen py-12">
        <div className="mx-auto max-w-2xl px-4">
          <div className="rounded-2xl border border-[#14F195]/30 bg-[#14F195]/5 p-8 text-center mb-8">
            <div className="text-5xl mb-4">🎉</div>
            <h1 className="text-2xl font-bold text-white mb-2">Provider Registered!</h1>
            <p className="text-[#6B7280]">
              {result.provider.name} is now live on SkillDock with{' '}
              <span className="text-[#14F195] font-medium">{result.parsedSkills.length} skills</span>.
            </p>
          </div>

          {/* Vault Section */}
          {result.vaultAddress && (
            <VaultSection vaultAddress={result.vaultAddress} agentId={result.provider.id} />
          )}

          <div className="rounded-xl border border-[#1e1e2e] bg-[#13131a] p-5 mb-6 mt-6">
            <h2 className="text-base font-semibold text-white mb-4">Provider Details</h2>
            <div className="space-y-3 text-sm">
              {[
                { label: 'Provider ID', value: result.provider.id },
                { label: 'Name', value: result.provider.name },
                { label: 'Wallet', value: result.provider.wallet_address },
                { label: 'Manifest', value: result.provider.manifest_url },
                { label: 'Registered', value: new Date(result.provider.created_at).toLocaleString() },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-start justify-between gap-4">
                  <span className="text-[#6B7280] shrink-0">{label}</span>
                  <span className="text-white font-mono text-right break-all">{value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-[#1e1e2e] bg-[#13131a] p-5">
            <h2 className="text-base font-semibold text-white mb-4">Registered Skills</h2>
            <div className="space-y-3">
              {result.parsedSkills.map((skill) => (
                <div key={skill.id || skill.name} className="flex items-center justify-between p-3 rounded-lg bg-[#0a0a0f] border border-[#1e1e2e]">
                  <div>
                    <p className="text-sm font-medium text-white">{skill.name || skill.id}</p>
                    <p className="text-xs text-[#6B7280] font-mono mt-0.5">{skill.endpoint}</p>
                  </div>
                  <span className="text-xs font-mono text-[#14F195] shrink-0 ml-4">
                    ${(skill.price || 0).toFixed(3)} USDC
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 flex gap-3">
            <button
              onClick={() => { setResult(null); setForm({ name: '', wallet_address: '', manifest_url: '' }); }}
              className="flex-1 rounded-xl border border-[#1e1e2e] bg-[#13131a] px-4 py-2.5 text-sm text-[#6B7280] hover:text-white hover:border-[#9945FF]/50 transition-colors"
            >
              Register another
            </button>
            <a
              href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`Just registered my skills on @SkillDock! ${result.parsedSkills.length} AI skills with agent treasury vaults on Solana. #x402 #Solana #AI`)}`}
              target="_blank" rel="noopener noreferrer"
              className="flex-1 rounded-xl bg-gradient-to-r from-[#9945FF] to-[#7b2fd6] px-4 py-2.5 text-sm font-medium text-white text-center hover:opacity-90 transition-opacity"
            >
              Share on Twitter
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12">
      <div className="mx-auto max-w-2xl px-4">
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#9945FF]/30 bg-[#9945FF]/10 px-3 py-1 text-xs text-[#9945FF] mb-4">
            Provider Registration
          </div>
          <h1 className="text-3xl font-bold text-white mb-3">Register your skills</h1>
          <p className="text-[#6B7280] leading-relaxed">
            List your HTTP skills on SkillDock. A dedicated Crossmint treasury vault is automatically
            created for your agent on registration — no extra setup needed.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="rounded-xl border border-[#1e1e2e] bg-[#13131a] p-5 space-y-4">
            <div>
              <label className="flex items-center gap-2 text-xs font-medium text-[#6B7280] mb-2">
                <Globe size={12} /> Provider name *
              </label>
              <input
                type="text" required value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="My Skill Provider"
                className="w-full rounded-lg border border-[#1e1e2e] bg-[#0a0a0f] px-3 py-2.5 text-sm text-white placeholder-[#4B5563] focus:border-[#9945FF] focus:outline-none focus:ring-1 focus:ring-[#9945FF]/30"
              />
            </div>
            <div>
              <label className="flex items-center gap-2 text-xs font-medium text-[#6B7280] mb-2">
                <Wallet size={12} /> Solana wallet address *
              </label>
              <input
                type="text" required value={form.wallet_address}
                onChange={(e) => setForm((f) => ({ ...f, wallet_address: e.target.value }))}
                placeholder="7xKp...3mNq (your Solana devnet public key)"
                className="w-full rounded-lg border border-[#1e1e2e] bg-[#0a0a0f] px-3 py-2.5 text-sm text-white placeholder-[#4B5563] focus:border-[#9945FF] focus:outline-none focus:ring-1 focus:ring-[#9945FF]/30 font-mono"
              />
            </div>
            <div>
              <label className="flex items-center gap-2 text-xs font-medium text-[#6B7280] mb-2">
                <Link2 size={12} /> Manifest URL *
              </label>
              <input
                type="url" required value={form.manifest_url}
                onChange={(e) => setForm((f) => ({ ...f, manifest_url: e.target.value }))}
                placeholder="https://yourprovider.com/.well-known/purch.json"
                className="w-full rounded-lg border border-[#1e1e2e] bg-[#0a0a0f] px-3 py-2.5 text-sm text-white placeholder-[#4B5563] focus:border-[#9945FF] focus:outline-none focus:ring-1 focus:ring-[#9945FF]/30 font-mono"
              />
              <p className="text-xs text-[#6B7280] mt-1.5">
                Host a <code className="text-[#9945FF]">purch.json</code> manifest at your domain&apos;s{' '}
                <code className="text-[#9945FF]">/.well-known/</code> path.
              </p>
            </div>
          </div>

          {/* Manifest format */}
          <div className="rounded-xl border border-[#1e1e2e] bg-[#080810] p-4">
            <p className="text-xs font-semibold text-[#6B7280] mb-3">Required manifest format:</p>
            <pre className="text-xs font-mono text-[#e2e8f0] leading-relaxed overflow-x-auto whitespace-pre-wrap">{`{
  "provider": "Your Provider Name",
  "version": "1.0.0",
  "facilitator": "https://app.purch.xyz/facilitator",
  "network": "solana:devnet",
  "skills": [
    {
      "id": "my-skill",
      "name": "My Skill",
      "description": "What it does",
      "endpoint": "https://yoursite.com/api/my-skill",
      "method": "POST",
      "price": 0.005,
      "tags": ["ai", "data"]
    }
  ]
}`}</pre>
          </div>

          {/* Vault info callout */}
          <div className="rounded-xl border border-[#9945FF]/30 bg-[#9945FF]/5 p-4">
            <p className="text-sm font-semibold text-[#9945FF] mb-1">💎 Auto-created treasury vault</p>
            <p className="text-xs text-[#9ca3af]">
              After registration, a dedicated Crossmint USDC wallet (vault) is automatically created for your agent.
              The vault address will appear on your confirmation page. Fund it to use the USDC Splitter skill or
              post tasks to the marketplace.
            </p>
          </div>

          {error && (
            <div className="flex items-start gap-3 rounded-xl border border-[#FF4444]/30 bg-[#FF4444]/5 p-4">
              <AlertCircle size={16} className="text-[#FF4444] shrink-0 mt-0.5" />
              <p className="text-sm text-[#FF4444]">{error}</p>
            </div>
          )}

          <button
            type="submit" disabled={loading}
            className="w-full rounded-xl bg-gradient-to-r from-[#9945FF] to-[#7b2fd6] px-4 py-3.5 text-sm font-bold text-white hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity flex items-center justify-center gap-2"
          >
            {loading ? (
              <><Loader2 size={16} className="animate-spin" />Registering &amp; creating vault…</>
            ) : (
              <><CheckCheck size={16} />Register Provider</>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
