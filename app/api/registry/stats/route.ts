import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { SKILLS_REGISTRY } from '@/lib/skills-registry';

export async function GET() {
  const supabase = getServiceSupabase();

  try {
    const [execResult, provResult] = await Promise.all([
      supabase.from('skill_executions').select('amount_usdc, skill_id'),
      supabase.from('skill_providers').select('id'),
    ]);

    const executions = execResult.data || [];
    const providers = provResult.data || [];

    const totalVolumeUsdc = executions.reduce((sum, e) => sum + (e.amount_usdc || 0), 0);

    return NextResponse.json({
      totalSkills: SKILLS_REGISTRY.length,
      totalExecutions: executions.length,
      totalVolumeUsdc: parseFloat(totalVolumeUsdc.toFixed(4)),
      uniqueProviders: providers.length + 1, // +1 for SkillDock itself
    });
  } catch {
    return NextResponse.json({
      totalSkills: SKILLS_REGISTRY.length,
      totalExecutions: 0,
      totalVolumeUsdc: 0,
      uniqueProviders: 1,
    });
  }
}
