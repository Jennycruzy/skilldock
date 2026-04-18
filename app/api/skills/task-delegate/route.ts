import { NextRequest } from 'next/server';
import { withPurchPayment } from '@/lib/payment-middleware';
import { getServiceSupabase } from '@/lib/supabase';
import { getUsdcBalance } from '@/lib/crossmint-transfer';

async function handler(req: NextRequest): Promise<Record<string, unknown>> {
  const body = await req.json();
  const { task, budget, requiredSkills, postedBy, postedByWallet } = body as {
    task: string;
    budget: number;
    requiredSkills: string[];
    postedBy: string;
    postedByWallet: string;
  };

  if (!task || !budget || !requiredSkills || !postedBy || !postedByWallet) {
    throw new Error('task, budget, requiredSkills, postedBy, and postedByWallet are required');
  }

  const supabase = getServiceSupabase();

  // Verify vault exists and has enough USDC to cover the budget
  const { data: vaultData } = await supabase
    .from('agent_vaults')
    .select('usdc_address, crossmint_wallet_id')
    .eq('usdc_address', postedByWallet)
    .maybeSingle();

  if (!vaultData) {
    throw new Error('Agent vault not found. Register your agent first to get a vault.');
  }

  const isFakeAddress = (addr: string) => addr.startsWith('vault_') || addr.startsWith('local_');
  if (!isFakeAddress(vaultData.usdc_address)) {
    const balance = await getUsdcBalance(vaultData.usdc_address);
    if (balance < budget) {
      throw new Error(
        `INSUFFICIENT_VAULT_BALANCE: vault has ${balance.toFixed(6)} USDC, task budget is ${budget} USDC. ` +
        `Send at least ${(budget - balance).toFixed(6)} more USDC to ${vaultData.usdc_address}`
      );
    }
  }

  const expiresAt = new Date(Date.now() + 3600 * 1000).toISOString();

  const { data: taskData, error } = await supabase
    .from('task_queue')
    .insert({
      task,
      budget_usdc: budget,
      required_skills: requiredSkills,
      status: 'open',
      posted_by: postedBy,
      posted_by_wallet: postedByWallet,
      expires_at: expiresAt,
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to create task: ${error.message}`);

  const APP_URL = 'https://skilldock.duckdns.org';

  return {
    taskId: taskData.id,
    task: taskData.task,
    budget: taskData.budget_usdc,
    requiredSkills: taskData.required_skills,
    status: taskData.status,
    expiresAt: taskData.expires_at,
    vaultAddress: vaultData.usdc_address,
    vaultBalance: null,
    monitorUrl: `${APP_URL}/api/skills/task-status?taskId=${taskData.id}`,
  };
}

export const POST = withPurchPayment({
  price: 0.015,
  description: 'Task Delegator — post a task to the SkillDock agent marketplace',
  skillId: 'task-delegate',
})(handler);
