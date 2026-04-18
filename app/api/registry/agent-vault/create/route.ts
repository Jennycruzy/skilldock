import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { agentId } = body as { agentId: string };

  if (!agentId) {
    return NextResponse.json({ error: 'agentId is required' }, { status: 400 });
  }

  const supabase = getServiceSupabase();

  // Check if vault already exists
  const { data: existing } = await supabase
    .from('agent_vaults')
    .select('*')
    .eq('agent_id', agentId)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({
      success: true,
      vault: existing,
      message: 'Vault already exists',
    });
  }

  // Create Crossmint embedded wallet for this agent
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
      // Fall back to generated address — still save to DB
    }
  }

  // Save vault record
  const { data: vaultData, error: vaultErr } = await supabase
    .from('agent_vaults')
    .insert({
      agent_id: agentId,
      crossmint_wallet_id: walletId,
      usdc_address: walletAddress,
      network: 'solana-devnet',
    })
    .select()
    .single();

  if (vaultErr) {
    return NextResponse.json({ error: vaultErr.message }, { status: 500 });
  }

  // Update skill_providers with wallet info
  await supabase
    .from('skill_providers')
    .update({
      crossmint_wallet_id: walletId,
      treasury_wallet_address: walletAddress,
    })
    .eq('id', agentId);

  return NextResponse.json({
    success: true,
    vault: vaultData,
    message: 'Vault created successfully',
  });
}
