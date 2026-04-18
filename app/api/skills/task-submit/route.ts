import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { taskId, claimedBy, result, costUsdc } = body as {
    taskId: string;
    claimedBy: string;
    result: Record<string, unknown>;
    costUsdc: number;
  };

  if (!taskId || !claimedBy || !result || costUsdc === undefined) {
    return NextResponse.json(
      { error: 'taskId, claimedBy, result, and costUsdc are required' },
      { status: 400 }
    );
  }

  const supabase = getServiceSupabase();

  const { data: existing } = await supabase
    .from('task_queue')
    .select('*')
    .eq('id', taskId)
    .single();

  if (!existing) {
    return NextResponse.json({ error: 'Task not found' }, { status: 404 });
  }

  if (existing.claimed_by !== claimedBy) {
    return NextResponse.json({ error: 'Not the task claimer' }, { status: 403 });
  }

  if (existing.status !== 'claimed') {
    return NextResponse.json({ error: 'Task is not in claimed status' }, { status: 409 });
  }

  // Look up wallet addresses for both agents
  const { data: postingVault } = await supabase
    .from('agent_vaults')
    .select('usdc_address, crossmint_wallet_id')
    .eq('usdc_address', existing.posted_by_wallet)
    .maybeSingle();

  const { data: claimingVault } = await supabase
    .from('agent_vaults')
    .select('usdc_address, crossmint_wallet_id')
    .eq('usdc_address', existing.claimed_by_wallet)
    .maybeSingle();

  // Simulate USDC transfer between vaults
  // In production: call Crossmint API to sign a real USDC transfer tx
  const paymentTxHash = `vault_transfer_${Date.now()}`;

  const { data: updated, error } = await supabase
    .from('task_queue')
    .update({
      status: 'completed',
      result,
      cost_usdc: costUsdc,
      completed_at: new Date().toISOString(),
    })
    .eq('id', taskId)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Log the payment in skill_executions
  await supabase.from('skill_executions').insert({
    skill_id: 'task-submit',
    tx_hash: paymentTxHash,
    amount_usdc: costUsdc,
    duration_ms: 100,
    provider_wallet: claimingVault?.usdc_address || existing.claimed_by_wallet,
  });

  return NextResponse.json({
    taskId: updated.id,
    status: 'completed',
    result: updated.result,
    costUsdc: updated.cost_usdc,
    paymentTxHash,
    postingAgentVault: postingVault?.usdc_address || existing.posted_by_wallet,
    claimingAgentVault: claimingVault?.usdc_address || existing.claimed_by_wallet,
    explorerUrl: `https://explorer.solana.com/tx/${paymentTxHash}?cluster=devnet`,
  });
}
