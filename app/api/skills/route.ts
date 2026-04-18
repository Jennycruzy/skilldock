import { NextResponse } from 'next/server';
import { SKILLS_REGISTRY } from '@/lib/skills-registry';

export async function GET() {
  const APP_URL = 'https://skilldock.duckdns.org';
  const FACILITATOR = process.env.NEXT_PUBLIC_PURCH_FACILITATOR_URL || 'https://app.purch.xyz/facilitator';
  const NETWORK = `solana:${process.env.NEXT_PUBLIC_SOLANA_NETWORK || 'devnet'}`;

  return NextResponse.json({
    provider: 'SkillDock',
    version: '2.0.0',
    facilitator: FACILITATOR,
    network: NETWORK,
    serverID: process.env.PURCH_SERVER_ID || 'ad1c686d-5f67-4160-ad50-72175071d9a7',
    skills: SKILLS_REGISTRY.map((s) => ({
      ...s,
      mcpDownloadUrl: `${APP_URL}/api/skills/${s.id}/mcp`,
    })),
  });
}
