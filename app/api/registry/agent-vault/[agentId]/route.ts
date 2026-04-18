import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { Connection, PublicKey, clusterApiUrl } from '@solana/web3.js';

const USDC_MINT_DEVNET = '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU';

async function getUsdcBalance(walletAddress: string): Promise<number> {
  try {
    const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
    const walletPk = new PublicKey(walletAddress);
    const mint = new PublicKey(USDC_MINT_DEVNET);
    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(walletPk, { mint });
    if (tokenAccounts.value.length === 0) return 0;
    return (tokenAccounts.value[0].account.data.parsed?.info?.tokenAmount?.uiAmount as number) || 0;
  } catch {
    return 0;
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  const { agentId } = await params;
  const supabase = getServiceSupabase();

  const { data: vault, error } = await supabase
    .from('agent_vaults')
    .select('*')
    .eq('agent_id', agentId)
    .single();

  if (error || !vault) {
    return NextResponse.json({ error: 'Vault not found', agentId }, { status: 404 });
  }

  // Fetch live USDC balance
  const balanceUsdc = await getUsdcBalance(vault.usdc_address as string);

  // Fetch recent inbound payments
  const { data: executions } = await supabase
    .from('skill_executions')
    .select('*')
    .eq('provider_wallet', vault.usdc_address)
    .order('created_at', { ascending: false })
    .limit(10);

  return NextResponse.json(
    {
      agentId,
      vaultAddress: vault.usdc_address,
      crossmintWalletId: vault.crossmint_wallet_id,
      network: vault.network,
      balanceUsdc,
      recentPayments: executions || [],
      createdAt: vault.created_at,
    },
    {
      headers: { 'Access-Control-Allow-Origin': '*' },
    }
  );
}
