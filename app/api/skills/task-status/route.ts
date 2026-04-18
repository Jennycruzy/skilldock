import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const taskId = searchParams.get('taskId');

  if (!taskId) {
    return NextResponse.json({ error: 'taskId query parameter is required' }, { status: 400 });
  }

  const supabase = getServiceSupabase();

  const { data, error } = await supabase
    .from('task_queue')
    .select('*')
    .eq('id', taskId)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'Task not found' }, { status: 404 });
  }

  return NextResponse.json(data, {
    headers: { 'Access-Control-Allow-Origin': '*' },
  });
}

// List open tasks
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({})) as Record<string, unknown>;
  const limit = Math.min(50, Number(body.limit) || 20);
  const status = (body.status as string) || 'open';

  const supabase = getServiceSupabase();

  const { data, error } = await supabase
    .from('task_queue')
    .select('*')
    .eq('status', status)
    .order('posted_at', { ascending: false })
    .limit(limit);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ tasks: data || [] }, {
    headers: { 'Access-Control-Allow-Origin': '*' },
  });
}
