import { NextRequest } from 'next/server';
import { withPurchPayment } from '@/lib/payment-middleware';
import { getServiceSupabase } from '@/lib/supabase';

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

  // Look up vault if agent is registered
  let vaultAddress: string | null = null;
  const { data: vaultData } = await supabase
    .from('agent_vaults')
    .select('usdc_address')
    .eq('usdc_address', postedByWallet)
    .maybeSingle();

  if (vaultData) {
    vaultAddress = vaultData.usdc_address;
  } else {
    vaultAddress = postedByWallet;
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
    vaultAddress,
    monitorUrl: `${APP_URL}/api/skills/task-status?taskId=${taskData.id}`,
  };
}

export const POST = withPurchPayment({
  price: 0.015,
  description: 'Task Delegator — post a task to the SkillDock agent marketplace',
  skillId: 'task-delegate',
})(handler);
