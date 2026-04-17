'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Download, ExternalLink } from 'lucide-react';
import { SKILLS_REGISTRY } from '@/lib/skills-registry';

const NAV_SECTIONS = [
  { id: 'introduction', label: 'Introduction' },
  { id: 'how-it-works', label: 'How It Works' },
  { id: 'quick-start', label: 'Quick Start' },
  { id: 'skills-reference', label: 'Skills Reference' },
  { id: 'agents', label: 'Using Skills in Agents' },
  { id: 'mcp-integration', label: 'MCP Integration' },
  { id: 'install-sdks', label: 'Install & SDKs' },
  { id: 'api-reference', label: 'API Reference' },
  { id: 'provider-registration', label: 'Provider Registration' },
  { id: 'faq', label: 'FAQ' },
];

function CodeBlock({ code, lang = 'bash' }: { code: string; lang?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="relative rounded-xl border border-[#1e1e2e] bg-[#080810] overflow-hidden mb-4">
      <div className="flex items-center justify-between px-4 py-2 border-b border-[#1e1e2e] bg-[#0f0f18]">
        <span className="text-xs text-[#6B7280] font-mono">{lang}</span>
        <button
          onClick={async () => {
            await navigator.clipboard.writeText(code);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }}
          className="text-xs text-[#6B7280] hover:text-white transition-colors"
        >
          {copied ? '✓ Copied' : 'Copy'}
        </button>
      </div>
      <pre className="p-4 text-xs font-mono text-[#e2e8f0] overflow-x-auto leading-relaxed whitespace-pre-wrap">
        {code}
      </pre>
    </div>
  );
}

function Section({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <section id={id} className="mb-16 scroll-mt-20">
      {children}
    </section>
  );
}

function H2({ children }: { children: React.ReactNode }) {
  return <h2 className="text-2xl font-bold text-white mb-4">{children}</h2>;
}

function H3({ children }: { children: React.ReactNode }) {
  return <h3 className="text-base font-semibold text-white mt-6 mb-3">{children}</h3>;
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-[#9ca3af] leading-relaxed mb-3">{children}</p>;
}

function FlowDiagram() {
  const steps = [
    { label: 'Agent/Browser', color: 'bg-[#9945FF]/20 border-[#9945FF]/50 text-[#9945FF]' },
    { label: 'POST /api/skills/scrape', color: 'bg-[#13131a] border-[#1e1e2e] text-white', arrow: '→' },
    { label: '402 + PaymentRequirements', color: 'bg-[#FFB800]/10 border-[#FFB800]/30 text-[#FFB800]', arrow: '←' },
    { label: 'Sign USDC tx (Phantom / keypair)', color: 'bg-[#13131a] border-[#1e1e2e] text-[#6B7280]', arrow: '↓' },
    { label: 'Retry with X-PAYMENT', color: 'bg-[#13131a] border-[#1e1e2e] text-white', arrow: '→' },
    { label: 'Purch verifies on Solana', color: 'bg-[#9945FF]/10 border-[#9945FF]/30 text-[#9945FF]', arrow: '→' },
    { label: '200 + Result + Receipt', color: 'bg-[#14F195]/10 border-[#14F195]/30 text-[#14F195]', arrow: '→' },
  ];

  return (
    <div className="rounded-xl border border-[#1e1e2e] bg-[#080810] p-6 mb-6 overflow-x-auto">
      <div className="flex flex-wrap items-center gap-2 min-w-max">
        {steps.map((step, i) => (
          <div key={i} className="flex items-center gap-2">
            {step.arrow && i > 0 && (
              <span className="text-[#6B7280] font-mono text-lg">{step.arrow}</span>
            )}
            <div
              className={`rounded-lg border px-3 py-1.5 text-xs font-mono ${step.color}`}
            >
              {step.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TabGroup({ tabs, children }: { tabs: string[]; children: React.ReactNode[] }) {
  const [active, setActive] = useState(0);
  return (
    <div>
      <div className="flex gap-1 mb-0 border border-b-0 border-[#1e1e2e] rounded-t-xl bg-[#0f0f18] px-2 pt-2">
        {tabs.map((tab, i) => (
          <button
            key={tab}
            onClick={() => setActive(i)}
            className={`px-4 py-2 text-xs font-medium rounded-t-lg transition-colors ${
              active === i
                ? 'bg-[#080810] text-white border border-b-0 border-[#1e1e2e]'
                : 'text-[#6B7280] hover:text-white'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>
      <div>{children[active]}</div>
    </div>
  );
}

const TABLE_ROWS = [
  {
    endpoint: '/api/skills/scrape',
    method: 'POST',
    price: '$0.002',
    input: 'url: string',
    output: 'title, metaDescription, bodyText, wordCount, links, scrapedAt',
  },
  {
    endpoint: '/api/skills/summarize',
    method: 'POST',
    price: '$0.010',
    input: 'text: string, style?: bullet|paragraph|tldr',
    output: 'summary, wordCount, style, model',
  },
  {
    endpoint: '/api/skills/solana-price',
    method: 'GET',
    price: '$0.001',
    input: '?token=SOL|USDC|JUP|BONK|WIF',
    output: 'token, price, change24h, fetchedAt',
  },
  {
    endpoint: '/api/skills/compose',
    method: 'POST',
    price: '$0.011',
    input: 'url: string, summaryStyle?: string',
    output: 'url, title, summary, scrapeMs, summarizeMs, totalMs',
  },
  {
    endpoint: '/api/skills/agent-answer',
    method: 'POST',
    price: '$0.050',
    input: 'question: string',
    output: 'answer, skillsUsed, totalCost, reasoning',
  },
];

export default function DocsPage() {
  const [activeSection, setActiveSection] = useState('introduction');

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="hidden lg:flex flex-col w-60 shrink-0 sticky top-16 h-[calc(100vh-64px)] border-r border-[#1e1e2e] bg-[#0a0a0f] py-6 px-4 overflow-y-auto">
        <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider mb-4 px-2">
          Documentation
        </p>
        {NAV_SECTIONS.map((s) => (
          <a
            key={s.id}
            href={`#${s.id}`}
            onClick={() => setActiveSection(s.id)}
            className={`block rounded-lg px-3 py-2 text-sm transition-colors mb-0.5 ${
              activeSection === s.id
                ? 'bg-[#9945FF]/10 text-[#9945FF]'
                : 'text-[#6B7280] hover:text-white hover:bg-[#13131a]'
            }`}
          >
            {s.label}
          </a>
        ))}
      </aside>

      {/* Content */}
      <div className="flex-1 max-w-4xl mx-auto px-6 py-10 overflow-y-auto">

        <Section id="introduction">
          <div className="mb-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#9945FF]/30 bg-[#9945FF]/10 px-3 py-1 text-xs text-[#9945FF] mb-4">
              v1.0.0 · Solana Devnet
            </div>
            <H2>Introduction</H2>
          </div>
          <P>
            SkillDock is a pay-per-skill execution marketplace built on the{' '}
            <strong className="text-white">x402 HTTP payment protocol</strong> and Purch's Solana USDC
            facilitator. Skills are callable HTTP endpoints that return{' '}
            <code className="bg-[#13131a] px-1 rounded text-[#FFB800]">402 Payment Required</code>{' '}
            until a valid USDC micropayment is submitted.
          </P>
          <P>
            No API keys. No accounts. No subscriptions. Just a Solana wallet and a fraction of a
            cent in devnet USDC.
          </P>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
            {[
              { title: 'Any Agent', desc: 'AI agents autonomously discover and pay for skills using MCP definitions' },
              { title: 'Any Language', desc: 'HTTP + x402 works from Node.js, Python, Rust, Go, or a browser' },
              { title: 'Instant Settlement', desc: 'Purch verifies USDC transfers on Solana in under 1 second' },
            ].map((card) => (
              <div key={card.title} className="rounded-xl border border-[#1e1e2e] bg-[#13131a] p-4">
                <h4 className="text-sm font-semibold text-[#9945FF] mb-1">{card.title}</h4>
                <p className="text-xs text-[#6B7280] leading-relaxed">{card.desc}</p>
              </div>
            ))}
          </div>
        </Section>

        <Section id="how-it-works">
          <H2>How It Works</H2>
          <P>
            Every SkillDock skill is a standard HTTP endpoint protected by the x402 payment
            protocol. Here is the full request flow:
          </P>
          <FlowDiagram />
          <div className="space-y-3">
            {[
              { step: '1', title: 'Initial request', desc: 'Your agent or browser sends a normal HTTP request to the skill endpoint.' },
              { step: '2', title: '402 response', desc: 'The skill returns HTTP 402 with a PaymentRequirements JSON body containing: facilitator URL, amount in atomic USDC units, the treasury wallet to pay, and network.' },
              { step: '3', title: 'Sign USDC transaction', desc: 'Your client (Phantom browser extension or a server keypair) signs a USDC transfer transaction on Solana devnet.' },
              { step: '4', title: 'Retry with X-PAYMENT', desc: 'The signed transaction is base64-encoded and sent as the X-PAYMENT header on the same request.' },
              { step: '5', title: 'Purch verifies', desc: 'SkillDock forwards the payment to the Purch facilitator at https://app.purch.xyz/facilitator which confirms the USDC transfer on-chain.' },
              { step: '6', title: '200 + result', desc: 'Once verified, the skill executes and returns the result with an X-PAYMENT-RESPONSE receipt header. The execution is logged to Supabase.' },
            ].map(({ step, title, desc }) => (
              <div key={step} className="flex gap-4 p-4 rounded-xl border border-[#1e1e2e] bg-[#13131a]">
                <span className="shrink-0 h-6 w-6 rounded-full bg-[#9945FF] text-white text-xs font-bold flex items-center justify-center">
                  {step}
                </span>
                <div>
                  <h4 className="text-sm font-medium text-white">{title}</h4>
                  <p className="text-xs text-[#6B7280] mt-0.5 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </Section>

        <Section id="quick-start">
          <H2>Quick Start</H2>
          <TabGroup tabs={['Browser', 'Node.js', 'Python']}>
            <div className="rounded-b-xl border border-[#1e1e2e] bg-[#080810] p-5">
              <ol className="space-y-2 text-sm text-[#9ca3af]">
                <li>1. Install <a href="https://phantom.app" className="text-[#9945FF] hover:underline">Phantom wallet</a> browser extension</li>
                <li>2. Switch to <strong className="text-white">Solana Devnet</strong> in Phantom settings</li>
                <li>3. Get devnet USDC from <a href="https://spl-token-faucet.com" target="_blank" rel="noopener noreferrer" className="text-[#9945FF] hover:underline">spl-token-faucet.com <ExternalLink size={10} className="inline" /></a></li>
                <li>4. Visit <Link href="/play/scrape" className="text-[#9945FF] hover:underline">/play/scrape</Link> and click <strong className="text-[#14F195]">Run Skill</strong></li>
              </ol>
            </div>
            <div>
              <CodeBlock lang="bash" code="npm install x402-solana" />
              <CodeBlock lang="typescript" code={`import { createX402Client } from 'x402-solana/client'
import { Keypair } from '@solana/web3.js'
import bs58 from 'bs58'

const keypair = Keypair.fromSecretKey(
  bs58.decode(process.env.SOLANA_PRIVATE_KEY!)
)

const client = createX402Client({
  wallet: {
    address: keypair.publicKey.toString(),
    signTransaction: async (tx) => {
      tx.sign([keypair])
      return tx
    }
  },
  network: 'solana-devnet'
})

const res = await client.fetch(
  'https://skilldock.vercel.app/api/skills/scrape',
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: 'https://example.com' })
  }
)

const data = await res.json()
console.log(data)`} />
            </div>
            <div>
              <CodeBlock lang="bash" code="pip install x402" />
              <CodeBlock lang="python" code={`from x402.client import create_client

client = create_client(
    private_key="YOUR_SOLANA_PRIVATE_KEY_BASE58",
    network="devnet"
)

response = client.post(
    "https://skilldock.vercel.app/api/skills/scrape",
    json={"url": "https://example.com"}
)

print(response.json())`} />
            </div>
          </TabGroup>
        </Section>

        <Section id="skills-reference">
          <H2>Skills Reference</H2>
          <div className="overflow-x-auto rounded-xl border border-[#1e1e2e]">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[#1e1e2e] bg-[#13131a]">
                  {['Endpoint', 'Method', 'Price', 'Input', 'Output'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-[#6B7280] font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1e1e2e]">
                {TABLE_ROWS.map((row) => (
                  <tr key={row.endpoint} className="bg-[#0a0a0f] hover:bg-[#13131a] transition-colors">
                    <td className="px-4 py-3 font-mono text-[#9945FF]">{row.endpoint}</td>
                    <td className="px-4 py-3 font-mono text-[#FFB800]">{row.method}</td>
                    <td className="px-4 py-3 font-mono text-[#14F195]">{row.price}</td>
                    <td className="px-4 py-3 text-[#6B7280]">{row.input}</td>
                    <td className="px-4 py-3 text-[#6B7280]">{row.output}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        <Section id="agents">
          <H2>Using Skills in Agents</H2>
          <P>
            Each SkillDock skill exposes an MCP tool definition that any agent framework supporting
            MCP (Claude Code, LangChain, AutoGen, CrewAI) can load and invoke autonomously.
            The agent discovers the skill, constructs the payment, and pays for execution — all
            without human intervention.
          </P>
          <H3>Claude Code integration</H3>
          <CodeBlock lang="bash" code="# Install the SkillDock MCP server (coming soon via npm)
npx skilldock-mcp --wallet YOUR_PRIVATE_KEY --network devnet" />
          <P>Then add to your <code className="text-[#9945FF]">claude_desktop_config.json</code>:</P>
          <CodeBlock lang="json" code={`{
  "mcpServers": {
    "skilldock": {
      "command": "npx",
      "args": ["skilldock-mcp"],
      "env": {
        "SOLANA_PRIVATE_KEY": "YOUR_BASE58_PRIVATE_KEY",
        "SOLANA_NETWORK": "devnet"
      }
    }
  }
}`} />
          <P>
            Claude will then have access to all SkillDock skills and will autonomously pay for them
            in USDC when invoked in conversation.
          </P>
        </Section>

        <Section id="mcp-integration">
          <H2>MCP Integration</H2>
          <P>
            Each skill's MCP definition is downloadable at{' '}
            <code className="text-[#9945FF]">/api/skills/[skillId]/mcp</code>. The{' '}
            <code className="text-[#FFB800]">x402</code> extension field tells MCP clients how and
            where to pay.
          </P>
          <CodeBlock lang="json" code={`{
  "name": "skilldock_scrape",
  "description": "Scrape any URL and return structured content. Costs $0.002 USDC via Purch x402 on Solana.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "url": { "type": "string", "description": "The URL to scrape" }
    },
    "required": ["url"]
  },
  "x402": {
    "endpoint": "https://skilldock.vercel.app/api/skills/scrape",
    "facilitator": "https://app.purch.xyz/facilitator",
    "price": 0.002,
    "network": "solana:devnet"
  }
}`} />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-4">
            {SKILLS_REGISTRY.map((skill) => (
              <a
                key={skill.id}
                href={`/api/skills/${skill.id}/mcp`}
                download={`skilldock_${skill.id}.mcp.json`}
                className="flex items-center gap-3 rounded-xl border border-[#1e1e2e] bg-[#13131a] px-4 py-3 hover:border-[#9945FF]/50 transition-colors group"
              >
                <span className="text-xl">{skill.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white">{skill.name}</p>
                  <p className="text-xs text-[#6B7280] font-mono">${skill.price.toFixed(3)}</p>
                </div>
                <Download size={14} className="text-[#6B7280] group-hover:text-[#9945FF] transition-colors shrink-0" />
              </a>
            ))}
          </div>
        </Section>

        <Section id="install-sdks">
          <H2>Install & SDKs</H2>
          <CodeBlock lang="bash" code={`npm install x402-solana          # Solana x402 client (recommended)
npm install @x402/fetch @x402/svm # Coinbase official SDK with Solana
pip install x402                  # Python client`} />
          <div className="overflow-x-auto rounded-xl border border-[#1e1e2e] mb-6">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[#1e1e2e] bg-[#13131a]">
                  {['Language', 'Package', 'Solana Support', 'Status'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-[#6B7280] font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1e1e2e] bg-[#0a0a0f]">
                {[
                  ['Node.js', 'x402-solana', '✓', '✓ Stable'],
                  ['Node.js', '@x402/fetch + @x402/svm', '✓', '✓ Stable'],
                  ['Python', 'x402', '✓', '✓ Stable'],
                  ['Rust', 'x402-rs', '⚠ Beta', '⚠ Beta'],
                  ['Go', 'x402-go', '⚠ Beta', '⚠ Beta'],
                ].map(([lang, pkg, sol, status]) => (
                  <tr key={pkg}>
                    <td className="px-4 py-3 text-white">{lang}</td>
                    <td className="px-4 py-3 font-mono text-[#9945FF]">{pkg}</td>
                    <td className="px-4 py-3 text-[#14F195]">{sol}</td>
                    <td className="px-4 py-3 text-[#6B7280]">{status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="rounded-xl border border-[#14F195]/20 bg-[#14F195]/5 p-4">
            <h4 className="text-sm font-semibold text-[#14F195] mb-2">Get Devnet USDC</h4>
            <p className="text-xs text-[#6B7280] mb-3">
              You need devnet USDC to test skills. The mint address is{' '}
              <code className="text-[#9945FF]">4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU</code>
            </p>
            <ol className="text-xs text-[#6B7280] space-y-1">
              <li>1. Visit <a href="https://spl-token-faucet.com" target="_blank" rel="noopener noreferrer" className="text-[#9945FF] hover:underline">spl-token-faucet.com ↗</a></li>
              <li>2. Select "USDC" and enter your devnet wallet address</li>
              <li>3. Claim free devnet USDC tokens</li>
            </ol>
          </div>
        </Section>

        <Section id="api-reference">
          <H2>API Reference</H2>
          <div className="space-y-4">
            {[
              {
                method: 'GET', path: '/api/skills', auth: 'None',
                desc: 'Returns the full skill registry with all skill definitions, MCP tool definitions, and pricing.',
                curl: 'curl https://skilldock.vercel.app/api/skills',
              },
              {
                method: 'POST', path: '/api/skills/scrape', auth: 'x402 $0.002 USDC',
                desc: 'Scrape and parse any public URL.',
                curl: `curl -X POST https://skilldock.vercel.app/api/skills/scrape \\
  -H "Content-Type: application/json" \\
  -H "X-PAYMENT: <base64_signed_tx>" \\
  -d '{"url":"https://example.com"}'`,
              },
              {
                method: 'POST', path: '/api/skills/summarize', auth: 'x402 $0.010 USDC',
                desc: 'Summarize text using Claude Haiku.',
                curl: `curl -X POST https://skilldock.vercel.app/api/skills/summarize \\
  -H "Content-Type: application/json" \\
  -H "X-PAYMENT: <base64_signed_tx>" \\
  -d '{"text":"Your text here","style":"bullet"}'`,
              },
              {
                method: 'GET', path: '/api/skills/solana-price?token=SOL', auth: 'x402 $0.001 USDC',
                desc: 'Get current Solana token price from Jupiter API.',
                curl: `curl "https://skilldock.vercel.app/api/skills/solana-price?token=SOL" \\
  -H "X-PAYMENT: <base64_signed_tx>"`,
              },
              {
                method: 'GET', path: '/.well-known/purch.json', auth: 'None',
                desc: 'SkillDock provider manifest for Purch x402scan registration.',
                curl: 'curl https://skilldock.vercel.app/.well-known/purch.json',
              },
              {
                method: 'GET', path: '/api/registry/stats', auth: 'None',
                desc: 'Aggregate execution statistics.',
                curl: 'curl https://skilldock.vercel.app/api/registry/stats',
              },
            ].map((ep) => (
              <div key={ep.path} className="rounded-xl border border-[#1e1e2e] bg-[#13131a] overflow-hidden">
                <div className="flex items-center gap-3 px-4 py-3 border-b border-[#1e1e2e]">
                  <span className={`rounded-md px-2 py-0.5 text-xs font-bold font-mono ${
                    ep.method === 'GET' ? 'bg-[#14F195]/10 text-[#14F195]' : 'bg-[#9945FF]/10 text-[#9945FF]'
                  }`}>
                    {ep.method}
                  </span>
                  <code className="text-sm font-mono text-white">{ep.path}</code>
                  <span className="ml-auto text-xs text-[#FFB800]">{ep.auth}</span>
                </div>
                <div className="px-4 py-3">
                  <p className="text-xs text-[#6B7280] mb-3">{ep.desc}</p>
                  <CodeBlock lang="bash" code={ep.curl} />
                </div>
              </div>
            ))}
          </div>
        </Section>

        <Section id="provider-registration">
          <H2>Provider Registration</H2>
          <P>
            Anyone can register their own skill provider on SkillDock. Build an HTTP endpoint with
            the x402 payment middleware, serve a manifest, and submit your URL.
          </P>
          <div className="space-y-3">
            {[
              { n: 1, title: 'Build a skill endpoint', desc: 'Add the withPurchPayment() middleware to any HTTP route. It handles 402 responses and payment verification automatically.' },
              { n: 2, title: 'Serve a manifest', desc: 'Host a /.well-known/purch.json manifest on your domain with your provider name, wallet, and skills array.' },
              { n: 3, title: 'Register your URL', desc: 'Visit /register and submit your manifest URL. SkillDock will validate the manifest and list your skills.' },
              { n: 4, title: "You're live", desc: 'Your skills appear in the marketplace immediately. Other agents can discover and pay for them autonomously.' },
            ].map(({ n, title, desc }) => (
              <div key={n} className="flex gap-4 p-4 rounded-xl border border-[#1e1e2e] bg-[#13131a]">
                <span className="shrink-0 h-6 w-6 rounded-full bg-[#9945FF] text-white text-xs font-bold flex items-center justify-center">
                  {n}
                </span>
                <div>
                  <h4 className="text-sm font-medium text-white">{title}</h4>
                  <p className="text-xs text-[#6B7280] mt-0.5 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#9945FF] to-[#7b2fd6] px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition-opacity"
            >
              Register your provider →
            </Link>
          </div>
        </Section>

        <Section id="faq">
          <H2>FAQ</H2>
          <div className="space-y-3">
            {[
              { q: 'Do I need an account?', a: 'No. Skills are gated by payment, not identity. Connect a Solana wallet and you\'re ready.' },
              { q: 'What wallet do I need?', a: 'Any Solana wallet. Phantom is recommended for browser use. For server-side agents, use a keypair directly.' },
              { q: 'Is this mainnet?', a: 'No — devnet only during the hackathon period. Mainnet deployment will follow after security review.' },
              { q: 'How does Purch verify payment?', a: 'Via the Purch facilitator at https://app.purch.xyz/facilitator which checks the USDC transfer on Solana devnet in real time.' },
              { q: 'Can my AI agent use these skills autonomously?', a: 'Yes — use the MCP definitions or any x402-compatible Solana client. The agent downloads the skill schema, signs a USDC transaction, and retries the request.' },
              { q: `What is the server ID ad1c686d-5f67-4160-ad50-72175071d9a7?`, a: "That's SkillDock's registered facilitator ID on x402scan, used to track settlements and verify provider identity." },
              { q: 'Can I build my own skills and list them?', a: 'Yes! Register at /register. Build any HTTP endpoint with the withPurchPayment middleware, serve a purch.json manifest, and submit your manifest URL.' },
              { q: 'What are the rate limits?', a: 'No rate limits — every request is individually paid for. The economics prevent abuse naturally.' },
            ].map(({ q, a }) => (
              <details key={q} className="group rounded-xl border border-[#1e1e2e] bg-[#13131a] overflow-hidden">
                <summary className="flex items-center justify-between px-5 py-4 cursor-pointer text-sm font-medium text-white hover:text-[#9945FF] transition-colors list-none">
                  {q}
                  <span className="text-[#6B7280] group-open:rotate-180 transition-transform">▼</span>
                </summary>
                <div className="px-5 pb-4">
                  <p className="text-sm text-[#6B7280] leading-relaxed">{a}</p>
                </div>
              </details>
            ))}
          </div>
        </Section>
      </div>
    </div>
  );
}
