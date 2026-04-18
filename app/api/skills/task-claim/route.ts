import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { taskId, claimedBy, claimedByWallet } = body as {
    taskId: string;
    claimedBy: string;
    claimedByWallet: string;
  };

  if (!taskId || !claimedBy || !claimedByWallet) {
    return NextResponse.json(
      { error: 'taskId, claimedBy, and claimedByWallet are required' },
      { status: 400 }
    );
  }

  const supabase = getServiceSupabase();

  // Fetch current task state
  const { data: existing, error: fetchErr } = await supabase
    .from('task_queue')
    .select('*')
    .eq('id', taskId)
    .single();

  if (fetchErr || !existing) {
    return NextResponse.json({ error: 'Task not found' }, { status: 404 });
  }

  if (existing.status !== 'open') {
    return NextResponse.json({ error: 'ALREADY_CLAIMED', currentStatus: existing.status }, { status: 409 });
  }

  if (new Date(existing.expires_at) < new Date()) {
    return NextResponse.json({ error: 'TASK_EXPIRED' }, { status: 410 });
  }

  const { data: updated, error: updateErr } = await supabase
    .from('task_queue')
    .update({
      status: 'claimed',
      claimed_by: claimedBy,
      claimed_by_wallet: claimedByWallet,
      claimed_at: new Date().toISOString(),
    })
    .eq('id', taskId)
    .eq('status', 'open')
    .select()
    .single();

  if (updateErr || !updated) {
    return NextResponse.json({ error: 'ALREADY_CLAIMED' }, { status: 409 });
  }

  return NextResponse.json(updated);
}
