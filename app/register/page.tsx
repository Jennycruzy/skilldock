'use client';

import { useState } from 'react';
import { CheckCheck, AlertCircle, Loader2, Globe, Wallet, Link2 } from 'lucide-react';

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
  };
  parsedSkills: ParsedSkill[];
}

export default function RegisterPage() {
  const [form, setForm] = useState({
    name: '',
    wallet_address: '',
    manifest_url: '',
  });
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
      const data = await res.json();
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

          <div className="rounded-xl border border-[#1e1e2e] bg-[#13131a] p-5 mb-6">
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
              href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`Just registered my skills on @SkillDock! ${result.parsedSkills.length} AI skills available for USDC micropayments on Solana. No API keys required. #x402 #Solana #AI`)}`}
              target="_blank"
              rel="noopener noreferrer"
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
            List your HTTP skills on SkillDock. Any endpoint protected with the x402 payment
            protocol and a valid <code className="text-[#9945FF]">purch.json</code> manifest can
            be registered.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="rounded-xl border border-[#1e1e2e] bg-[#13131a] p-5 space-y-4">
            <div>
              <label className="flex items-center gap-2 text-xs font-medium text-[#6B7280] mb-2">
                <Globe size={12} />
                Provider name *
              </label>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="My Skill Provider"
                className="w-full rounded-lg border border-[#1e1e2e] bg-[#0a0a0f] px-3 py-2.5 text-sm text-white placeholder-[#4B5563] focus:border-[#9945FF] focus:outline-none focus:ring-1 focus:ring-[#9945FF]/30"
              />
            </div>

            <div>
              <label className="flex items-center gap-2 text-xs font-medium text-[#6B7280] mb-2">
                <Wallet size={12} />
                Solana wallet address *
              </label>
              <input
                type="text"
                required
                value={form.wallet_address}
                onChange={(e) => setForm((f) => ({ ...f, wallet_address: e.target.value }))}
                placeholder="7xKp...3mNq (your Solana devnet public key)"
                className="w-full rounded-lg border border-[#1e1e2e] bg-[#0a0a0f] px-3 py-2.5 text-sm text-white placeholder-[#4B5563] focus:border-[#9945FF] focus:outline-none focus:ring-1 focus:ring-[#9945FF]/30 font-mono"
              />
            </div>

            <div>
              <label className="flex items-center gap-2 text-xs font-medium text-[#6B7280] mb-2">
                <Link2 size={12} />
                Manifest URL *
              </label>
              <input
                type="url"
                required
                value={form.manifest_url}
                onChange={(e) => setForm((f) => ({ ...f, manifest_url: e.target.value }))}
                placeholder="https://yourprovider.com/.well-known/purch.json"
                className="w-full rounded-lg border border-[#1e1e2e] bg-[#0a0a0f] px-3 py-2.5 text-sm text-white placeholder-[#4B5563] focus:border-[#9945FF] focus:outline-none focus:ring-1 focus:ring-[#9945FF]/30 font-mono"
              />
              <p className="text-xs text-[#6B7280] mt-1.5">
                Host a <code className="text-[#9945FF]">purch.json</code> manifest at your domain's{' '}
                <code className="text-[#9945FF]">/.well-known/</code> path. Must have{' '}
                <code className="text-[#FFB800]">provider</code> and{' '}
                <code className="text-[#FFB800]">skills[]</code> fields.
              </p>
            </div>
          </div>

          {/* Manifest format reference */}
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

          {error && (
            <div className="flex items-start gap-3 rounded-xl border border-[#FF4444]/30 bg-[#FF4444]/5 p-4">
              <AlertCircle size={16} className="text-[#FF4444] shrink-0 mt-0.5" />
              <p className="text-sm text-[#FF4444]">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-gradient-to-r from-[#9945FF] to-[#7b2fd6] px-4 py-3.5 text-sm font-bold text-white hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Validating manifest…
              </>
            ) : (
              <>
                <CheckCheck size={16} />
                Register Provider
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
