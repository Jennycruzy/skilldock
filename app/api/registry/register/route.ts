import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';

async function createAgentVault(agentId: string): Promise<{ walletId: string; walletAddress: string }> {
  const crossmintApiKey = process.env.CROSSMINT_SERVER_API_KEY || process.env.NEXT_PUBLIC_CROSSMINT_API_KEY;
  let walletId = `local_${agentId}`;
  let walletAddress = `vault_${agentId.replace(/-/g, '').slice(0, 32)}`;

  if (crossmintApiKey) {
    try {
      const response = await fetch('https://staging.crossmint.com/api/v1-alpha2/wallets', {
        method: 'POST',
        headers: {
          'X-API-KEY': crossmintApiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'solana-mpc-wallet',
          linkedUser: `email:${agentId}@skilldock.xyz`,
        }),
        signal: AbortSignal.timeout(15_000),
      });

      if (response.ok) {
        const wallet = await response.json() as Record<string, unknown>;
        walletId = (wallet.id as string) || walletId;
        walletAddress = (wallet.publicKey as string) || walletAddress;
      }
    } catch {
      // Fall back to generated address
    }
  }

  return { walletId, walletAddress };
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, wallet_address, manifest_url } = body as {
    name: string;
    wallet_address: string;
    manifest_url: string;
  };

  if (!name || !wallet_address || !manifest_url) {
    return NextResponse.json({ error: 'name, wallet_address, and manifest_url are required' }, { status: 400 });
  }

  // Validate and fetch manifest
  let manifest: Record<string, unknown>;
  try {
    const res = await fetch(manifest_url, { signal: AbortSignal.timeout(10_000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    manifest = await res.json();
  } catch (e) {
    return NextResponse.json(
      { error: `Failed to fetch manifest: ${e instanceof Error ? e.message : 'Unknown error'}` },
      { status: 400 }
    );
  }

  if (!manifest.provider || !manifest.skills || !Array.isArray(manifest.skills)) {
    return NextResponse.json(
      { error: 'Manifest must have provider and skills[] fields' },
      { status: 400 }
    );
  }

  const skills = manifest.skills as unknown[];
  const skillCount = skills.length;

  const supabase = getServiceSupabase();

  const { data, error } = await supabase
    .from('skill_providers')
    .upsert(
      {
        name,
        wallet_address,
        manifest_url,
        verified: true,
        skill_count: skillCount,
      },
      { onConflict: 'manifest_url' }
    )
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Auto-create vault for this agent
  const { walletId, walletAddress: vaultAddress } = await createAgentVault(data.id);

  // Save vault to agent_vaults table
  await supabase
    .from('agent_vaults')
    .upsert(
      {
        agent_id: data.id,
        crossmint_wallet_id: walletId,
        usdc_address: vaultAddress,
        network: 'solana-devnet',
      },
      { onConflict: 'agent_id' }
    );

  // Update provider with vault info
  await supabase
    .from('skill_providers')
    .update({
      crossmint_wallet_id: walletId,
      treasury_wallet_address: vaultAddress,
    })
    .eq('id', data.id);

  return NextResponse.json({
    success: true,
    provider: { ...data, treasury_wallet_address: vaultAddress },
    vaultAddress,
    parsedSkills: skills.map((s: unknown) => {
      const skill = s as Record<string, unknown>;
      return { id: skill.id, name: skill.name, price: skill.price, endpoint: skill.endpoint };
    }),
  });
}
