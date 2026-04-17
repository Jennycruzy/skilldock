# SkillDock

**Pay-per-skill AI marketplace built on Purch x402 + Solana USDC**

> Discover and execute AI skills instantly. No API keys. No accounts. No subscriptions.  
> Just a Solana wallet and fractions of a cent in USDC.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/yourname/skilldock)
[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=nextdotjs)](https://nextjs.org)
[![Solana](https://img.shields.io/badge/Solana-Devnet-9945FF?logo=solana)](https://solana.com)
[![x402](https://img.shields.io/badge/x402-Payment%20Protocol-14F195)](https://x402.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## What is SkillDock?

SkillDock is a live pay-per-skill execution platform where every HTTP endpoint is an AI skill gated by a Purch x402 micropayment on Solana. Skills are discovered, paid for, and executed in real time — from any browser, any language runtime, or any AI agent that supports MCP.

The x402 HTTP payment protocol works as follows:

```
Agent / Browser
     │
     ▼
POST /api/skills/scrape          ← normal HTTP request
     │
     ▼
← 402 Payment Required            ← JSON body with PaymentRequirements
     │
     ▼
Sign USDC transaction             ← Phantom wallet or server keypair
     │
     ▼
Retry with X-PAYMENT header       ← base64-encoded signed tx
     │
     ▼
Purch verifies on Solana          ← https://app.purch.xyz/facilitator
     │
     ▼
← 200 + Result + Receipt          ← X-PAYMENT-RESPONSE header
```

---

## Features

| Feature | Description |
|---|---|
| **5 live AI skills** | Web scraper, AI summarizer, Solana price feed, compose (scrape+summarize), autonomous agent |
| **Pay-to-Run terminal** | Browser playground with animated x402 payment flow |
| **MCP definitions** | Every skill exports a downloadable MCP tool JSON for AI agent use |
| **Agent mode** | Claude Haiku autonomously invokes sub-skills to answer any question |
| **Live execution feed** | Real-time transaction stream on the marketplace |
| **Leaderboard** | Charts, rankings, and full transaction history |
| **Provider registry** | Anyone can register their own skills via `purch.json` manifest |
| **`/.well-known/purch.json`** | Valid provider manifest for x402scan registration |
| **Full docs page** | In-app documentation with Quick Start tabs, API reference, MCP guide |

---

## Stack

```
Frontend:  Next.js 16 (App Router) · TypeScript · Tailwind CSS
Payments:  Purch x402 · Solana USDC (devnet) · Phantom wallet adapter
Registry:  Supabase (skill_executions, skill_providers tables)
AI:        Anthropic claude-haiku-4-5-20251001
Charts:    Recharts
Icons:     Lucide React
```

---

## Skills

| Skill | Endpoint | Method | Price | Description |
|---|---|---|---|---|
| Web Scraper | `/api/skills/scrape` | POST | $0.002 | Fetch and parse any URL (title, body, links) |
| AI Summarizer | `/api/skills/summarize` | POST | $0.010 | Summarize text via Claude Haiku (bullet/paragraph/tldr) |
| Solana Price | `/api/skills/solana-price` | GET | $0.001 | Real-time token prices from Jupiter API v2 |
| Compose | `/api/skills/compose` | POST | $0.011 | Scrape + summarize a URL in one request |
| Agent Answer | `/api/skills/agent-answer` | POST | $0.050 | Autonomous agent that invokes sub-skills to answer questions |

---

## Getting Started

### Prerequisites

- Node.js 18+
- A Solana devnet wallet (Phantom recommended)
- Devnet USDC from [spl-token-faucet.com](https://spl-token-faucet.com)
- Anthropic API key
- Supabase project (free tier works)

### Installation

```bash
git clone https://github.com/yourname/skilldock
cd skilldock
npm install
```

### Environment variables

Copy `.env.local` and fill in your values:

```bash
cp .env.local .env.local.example
```

```env
# Solana Network
NEXT_PUBLIC_SOLANA_NETWORK=devnet

# Purch x402 Facilitator
NEXT_PUBLIC_PURCH_FACILITATOR_URL=https://app.purch.xyz/facilitator
PURCH_SERVER_ID=ad1c686d-5f67-4160-ad50-72175071d9a7

# Treasury wallet (your Solana devnet wallet)
TREASURY_WALLET_ADDRESS=<your_solana_devnet_pubkey>
TREASURY_WALLET_PRIVATE_KEY=<base58_private_key>

# Anthropic
ANTHROPIC_API_KEY=sk-ant-...

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Supabase setup

Run this SQL in your Supabase SQL editor:

```sql
CREATE TABLE IF NOT EXISTS skill_providers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  wallet_address TEXT NOT NULL,
  manifest_url TEXT NOT NULL UNIQUE,
  verified BOOLEAN DEFAULT FALSE,
  skill_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS skill_executions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  skill_id TEXT NOT NULL,
  tx_hash TEXT NOT NULL,
  amount_usdc FLOAT NOT NULL,
  duration_ms INT NOT NULL,
  provider_wallet TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE skill_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE skill_providers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read executions" ON skill_executions FOR SELECT USING (true);
CREATE POLICY "Service insert executions" ON skill_executions FOR INSERT WITH CHECK (true);
CREATE POLICY "Public read providers" ON skill_providers FOR SELECT USING (true);
CREATE POLICY "Service insert providers" ON skill_providers FOR INSERT WITH CHECK (true);
```

### Run

```bash
npm run dev      # Development
npm run build    # Production build
npm start        # Production server
```

Visit [http://localhost:3000](http://localhost:3000).

---

## API Reference

All skill endpoints follow the x402 payment protocol. Without an `X-PAYMENT` header they return `402` with `PaymentRequirements`. With a valid signed USDC transaction in `X-PAYMENT` they return `200` with the result.

### Discovery

```http
GET /api/skills
```

Returns the full skill registry with all skill definitions, MCP tool definitions, and pricing.

```http
GET /.well-known/purch.json
```

SkillDock provider manifest for Purch x402scan registration.

```http
GET /api/skills/{skillId}/schema
```

JSON schema for a specific skill (input + output).

```http
GET /api/skills/{skillId}/mcp
```

Downloadable MCP tool definition for use in AI agent frameworks.

### Skill endpoints

#### Web Scraper

```http
POST /api/skills/scrape
X-PAYMENT: <base64_signed_tx>
Content-Type: application/json

{"url": "https://example.com"}
```

Response:
```json
{
  "title": "Example Domain",
  "metaDescription": "...",
  "bodyText": "This domain is for use in illustrative examples...",
  "wordCount": 280,
  "links": ["https://www.iana.org/domains/example"],
  "scrapedAt": "2024-01-15T12:00:00.000Z"
}
```

#### AI Summarizer

```http
POST /api/skills/summarize
X-PAYMENT: <base64_signed_tx>
Content-Type: application/json

{"text": "Long text here...", "style": "bullet"}
```

Response:
```json
{
  "summary": "• Key point one\n• Key point two...",
  "wordCount": 42,
  "style": "bullet",
  "model": "claude-haiku-4-5-20251001"
}
```

#### Solana Price Feed

```http
GET /api/skills/solana-price?token=SOL
X-PAYMENT: <base64_signed_tx>
```

Response:
```json
{
  "token": "SOL",
  "mintAddress": "So11111111111111111111111111111111111111112",
  "price": 168.42,
  "change24h": 2.3,
  "fetchedAt": "2024-01-15T12:00:00.000Z"
}
```

#### Compose (Scrape + Summarize)

```http
POST /api/skills/compose
X-PAYMENT: <base64_signed_tx>
Content-Type: application/json

{"url": "https://solana.com", "summaryStyle": "tldr"}
```

#### Agent Answer

```http
POST /api/skills/agent-answer
X-PAYMENT: <base64_signed_tx>
Content-Type: application/json

{"question": "What is the current price of SOL and summarise the Solana homepage?"}
```

Response:
```json
{
  "answer": "SOL is currently trading at $168.42...",
  "skillsUsed": ["get_token_price", "scrape_url", "summarize_text"],
  "totalCost": 0.063,
  "reasoning": "Invoked get_token_price with {\"token\":\"SOL\"}\nInvoked scrape_url with {\"url\":\"https://solana.com\"}"
}
```

### Registry

```http
POST /api/registry/register
Content-Type: application/json

{"name": "My Provider", "wallet_address": "...", "manifest_url": "https://.../.well-known/purch.json"}
```

```http
GET /api/registry/providers
GET /api/registry/executions?limit=20
GET /api/registry/stats
```

---

## Using Skills in Agents

### Node.js (x402-solana)

```bash
npm install x402-solana
```

```typescript
import { createX402Client } from 'x402-solana/client'
import { Keypair } from '@solana/web3.js'
import bs58 from 'bs58'

const keypair = Keypair.fromSecretKey(bs58.decode(process.env.SOLANA_PRIVATE_KEY!))

const client = createX402Client({
  wallet: {
    address: keypair.publicKey.toString(),
    signTransaction: async (tx) => { tx.sign([keypair]); return tx }
  },
  network: 'solana-devnet'
})

const res = await client.fetch('https://skilldock.vercel.app/api/skills/scrape', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ url: 'https://example.com' })
})
const data = await res.json()
```

### Python (x402)

```bash
pip install x402
```

```python
from x402.client import create_client

client = create_client(private_key="YOUR_BASE58_PRIVATE_KEY", network="devnet")
response = client.post(
    "https://skilldock.vercel.app/api/skills/scrape",
    json={"url": "https://example.com"}
)
print(response.json())
```

### Claude Code / MCP

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "skilldock": {
      "command": "npx",
      "args": ["skilldock-mcp"],
      "env": {
        "SOLANA_PRIVATE_KEY": "YOUR_BASE58_KEY",
        "SOLANA_NETWORK": "devnet"
      }
    }
  }
}
```

Claude will autonomously discover skills, sign USDC transactions, and pay for execution.

### Download MCP definitions

Each skill's MCP JSON is available at:

```
https://skilldock.vercel.app/api/skills/scrape/mcp
https://skilldock.vercel.app/api/skills/summarize/mcp
https://skilldock.vercel.app/api/skills/solana-price/mcp
https://skilldock.vercel.app/api/skills/compose/mcp
https://skilldock.vercel.app/api/skills/agent-answer/mcp
```

---

## Register Your Own Skills

1. **Build a skill endpoint** with the `withPurchPayment()` middleware from `@/lib/payment-middleware`
2. **Serve a manifest** at `/.well-known/purch.json`:

```json
{
  "provider": "Your Provider",
  "version": "1.0.0",
  "facilitator": "https://app.purch.xyz/facilitator",
  "network": "solana:devnet",
  "skills": [
    {
      "id": "my-skill",
      "name": "My Skill",
      "endpoint": "https://yoursite.com/api/my-skill",
      "method": "POST",
      "price": 0.005
    }
  ]
}
```

3. **Register** at [`/register`](https://skilldock.vercel.app/register) or via API:

```bash
curl -X POST https://skilldock.vercel.app/api/registry/register \
  -H "Content-Type: application/json" \
  -d '{"name":"My Provider","wallet_address":"...","manifest_url":"https://.../.well-known/purch.json"}'
```

---

## Project Structure

```
skilldock/
├── app/
│   ├── page.tsx                    # Marketplace (/)
│   ├── play/[skillId]/page.tsx     # Pay-to-Run terminal (/play/:id)
│   ├── docs/page.tsx               # Documentation (/docs)
│   ├── register/page.tsx           # Provider registration (/register)
│   ├── leaderboard/page.tsx        # Leaderboard (/leaderboard)
│   ├── .well-known/purch.json/     # Provider manifest
│   ├── api/
│   │   ├── skills/
│   │   │   ├── route.ts            # GET /api/skills (registry)
│   │   │   ├── scrape/route.ts     # POST /api/skills/scrape
│   │   │   ├── summarize/route.ts  # POST /api/skills/summarize
│   │   │   ├── solana-price/route.ts # GET /api/skills/solana-price
│   │   │   ├── compose/route.ts    # POST /api/skills/compose
│   │   │   ├── agent-answer/route.ts # POST /api/skills/agent-answer
│   │   │   └── [skillId]/
│   │   │       ├── mcp/route.ts    # GET /api/skills/:id/mcp
│   │   │       └── schema/route.ts # GET /api/skills/:id/schema
│   │   └── registry/
│   │       ├── register/route.ts
│   │       ├── providers/route.ts
│   │       ├── executions/route.ts
│   │       └── stats/route.ts
│   ├── layout.tsx                  # Root layout + wallet provider
│   └── globals.css                 # Tailwind + custom styles
├── components/
│   ├── Navbar.tsx                  # Top navigation
│   └── WalletProvider.tsx          # Solana wallet adapter wrapper
├── lib/
│   ├── skills-registry.ts          # Skill definitions & MCP builders
│   ├── payment-middleware.ts        # withPurchPayment() wrapper
│   └── supabase.ts                 # Supabase lazy client
├── types/
│   └── index.ts                    # TypeScript types
├── tailwind.config.ts              # Custom SkillDock design tokens
└── .env.local                      # Environment variables
```

---

## Design System

| Token | Value | Usage |
|---|---|---|
| `bg-primary` | `#0a0a0f` | Page background |
| `bg-card` | `#13131a` | Card/panel background |
| `bg-terminal` | `#080810` | Terminal background |
| `border` | `#1e1e2e` | Default border |
| `solana-purple` | `#9945FF` | Primary accent, links |
| `solana-green` | `#14F195` | Success, prices |
| `status-error` | `#FF4444` | Errors |
| `status-warning` | `#FFB800` | Warnings, payment prompts |
| `text-muted` | `#6B7280` | Secondary text |
| Font UI | Inter | All UI text |
| Font Mono | JetBrains Mono | Code, hashes, terminal |

---

## Payment Requirements Format

When a skill receives a request without `X-PAYMENT`, it responds:

```http
HTTP/1.1 402 Payment Required
Content-Type: application/json

{
  "version": 2,
  "scheme": "exact",
  "network": "solana:devnet",
  "facilitator": "https://app.purch.xyz/facilitator",
  "amount": "2000",
  "asset": {
    "address": "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU",
    "decimals": 6
  },
  "payTo": "<TREASURY_WALLET_ADDRESS>",
  "description": "Web Scraper — fetch and parse any public URL"
}
```

Amount is in atomic USDC units (`price * 1_000_000`). A `$0.002` skill has `amount: "2000"`.

---

## Purch x402 Configuration

| Config | Value |
|---|---|
| Facilitator URL | `https://app.purch.xyz/facilitator` |
| Server ID | `ad1c686d-5f67-4160-ad50-72175071d9a7` |
| Network | `solana:devnet` |
| USDC mint (devnet) | `4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU` |

---

## Deployment

### Vercel (recommended)

```bash
npx vercel --prod
```

Set all environment variables in Vercel project settings. The `NEXT_PUBLIC_APP_URL` should be your production domain.

### Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

```bash
docker build -t skilldock .
docker run -p 3000:3000 --env-file .env.local skilldock
```

---

## Get Devnet USDC

To test skills, you need devnet USDC:

1. Open Phantom wallet → switch to **Solana Devnet**
2. Visit [spl-token-faucet.com](https://spl-token-faucet.com)
3. Select **USDC** and enter your devnet public key
4. Claim free devnet USDC

USDC devnet mint: `4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU`

---

## FAQ

**Do I need an account?**  
No. Skills are gated by payment, not identity.

**What wallet do I need?**  
Any Solana wallet. Phantom is recommended for browser use. For server-side agents, use a keypair directly.

**Is this mainnet?**  
No — devnet only during the hackathon. Mainnet deployment follows after security review.

**How does Purch verify payment?**  
Via the Purch facilitator at `https://app.purch.xyz/facilitator`, which checks the USDC transfer on Solana devnet in real time.

**Can my AI agent use these skills autonomously?**  
Yes. Use the MCP definitions or any x402-compatible Solana client. The agent downloads the skill schema, signs a USDC transaction, and retries the request automatically.

**Can I build my own skills?**  
Yes. See [Register Your Own Skills](#register-your-own-skills).

**What are the rate limits?**  
None. Every request is individually paid for. Economics prevent abuse naturally.

---

## Architecture Decisions

**Why x402?**  
x402 is a draft HTTP extension that makes micropayments a native part of the request/response cycle. No SDK required on the consuming side — just an HTTP client that can handle 402 responses.

**Why Solana?**  
Sub-second finality, ~$0.00025 transaction fees, and mature USDC infrastructure make Solana the only chain where $0.001 skill prices are economically viable.

**Why Purch?**  
Purch's facilitator abstracts Solana transaction construction and verification, letting SkillDock focus on skill execution rather than on-chain plumbing.

**Why Supabase?**  
Zero-config Postgres with real-time subscriptions, row-level security, and a generous free tier. The execution log feeds directly into the live feed and leaderboard.

---

## Contributing

Pull requests welcome. Key areas:

- Additional skills (image generation, code execution, data analysis)
- Mainnet USDC support
- `skilldock-mcp` npm package (auto-loads all skills into any MCP client)
- Agent-to-agent payment routing
- Skill versioning and deprecation

---

## License

MIT — see [LICENSE](LICENSE).

---

*Built for the Purch x402 Hackathon · Powered by Solana USDC micropayments*
