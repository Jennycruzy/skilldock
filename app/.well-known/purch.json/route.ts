import { NextResponse } from 'next/server';
import { SKILLS_REGISTRY } from '@/lib/skills-registry';

export async function GET() {
  const APP_URL = 'https://skilldock.duckdns.org';
  const FACILITATOR = process.env.NEXT_PUBLIC_PURCH_FACILITATOR_URL || 'https://app.purch.xyz/facilitator';
  const NETWORK = `solana:${process.env.NEXT_PUBLIC_SOLANA_NETWORK || 'devnet'}`;

  return NextResponse.json(
    {
      provider: 'SkillDock',
      version: '2.0.0',
      description: 'Pay-per-skill AI marketplace with per-agent treasury vaults powered by Purch x402 on Solana USDC',
      url: APP_URL,
      facilitator: FACILITATOR,
      network: NETWORK,
      serverID: process.env.PURCH_SERVER_ID || 'ad1c686d-5f67-4160-ad50-72175071d9a7',
      treasury: process.env.TREASURY_WALLET_ADDRESS || '',
      skills: SKILLS_REGISTRY.map((s) => ({
        id: s.id,
        name: s.name,
        description: s.description,
        endpoint: s.endpoint,
        method: s.method,
        price: s.price,
        inputSchema: s.inputSchema,
        outputSchema: s.outputSchema,
        tags: s.tags,
        mcpToolDefinition: s.mcpToolDefinition,
        mcpDownloadUrl: `${APP_URL}/api/skills/${s.id}/mcp`,
      })),
    },
    {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=300',
      },
    }
  );
}
