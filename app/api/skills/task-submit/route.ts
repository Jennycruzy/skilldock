import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { transferUsdcViaCrossmint } from '@/lib/crossmint-transfer';

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

  const { data: task } = await supabase
    .from('task_queue')
    .select('*')
    .eq('id', taskId)
    .single();

  if (!task) return NextResponse.json({ error: 'Task not found' }, { status: 404 });
  if (task.claimed_by !== claimedBy) return NextResponse.json({ error: 'Not the task claimer' }, { status: 403 });
  if (task.status !== 'claimed') return NextResponse.json({ error: 'Task is not in claimed status' }, { status: 409 });

  if (costUsdc > task.budget_usdc) {
    return NextResponse.json(
      { error: `costUsdc (${costUsdc}) exceeds task budget (${task.budget_usdc})` },
      { status: 400 }
    );
  }

  // Look up both vaults
  const { data: postingVault } = await supabase
    .from('agent_vaults')
    .select('usdc_address, crossmint_wallet_id')
    .eq('usdc_address', task.posted_by_wallet)
    .maybeSingle();

  const { data: claimingVault } = await supabase
    .from('agent_vaults')
    .select('usdc_address, crossmint_wallet_id')
    .eq('usdc_address', task.claimed_by_wallet)
    .maybeSingle();

  if (!postingVault?.crossmint_wallet_id || !claimingVault?.usdc_address) {
    return NextResponse.json(
      { error: 'One or both agent vaults not found. Both agents must be registered.' },
      { status: 404 }
    );
  }

  // Reject fake/placeholder vault addresses
  const isFakeAddress = (addr: string) => addr.startsWith('vault_') || addr.startsWith('local_');
  if (isFakeAddress(postingVault.usdc_address) || isFakeAddress(claimingVault.usdc_address)) {
    return NextResponse.json(
      { error: 'One or both vaults have placeholder addresses. Re-register agents with CROSSMINT_SERVER_API_KEY set.' },
      { status: 400 }
    );
  }

  // Execute real on-chain USDC transfer from posting agent vault → claiming agent vault
  let paymentTxHash: string;
  try {
    paymentTxHash = await transferUsdcViaCrossmint(
      postingVault.crossmint_wallet_id,
      postingVault.usdc_address,
      claimingVault.usdc_address,
      costUsdc,
    );
  } catch (err) {
    return NextResponse.json(
      { error: `USDC transfer failed: ${err instanceof Error ? err.message : String(err)}` },
      { status: 502 }
    );
  }

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

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase.from('skill_executions').insert({
    skill_id: 'task-submit',
    tx_hash: paymentTxHash,
    amount_usdc: costUsdc,
    duration_ms: 100,
    provider_wallet: claimingVault.usdc_address,
  });

  return NextResponse.json({
    taskId: updated.id,
    status: 'completed',
    result: updated.result,
    costUsdc: updated.cost_usdc,
    paymentTxHash,
    postingAgentVault: postingVault.usdc_address,
    claimingAgentVault: claimingVault.usdc_address,
    explorerUrl: `https://explorer.solana.com/tx/${paymentTxHash}?cluster=devnet`,
  });
}
