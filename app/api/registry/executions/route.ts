import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50);

  const supabase = getServiceSupabase();

  const { data, error } = await supabase
    .from('skill_executions')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    // Return empty array if table doesn't exist yet
    return NextResponse.json({ executions: [] });
  }

  return NextResponse.json({ executions: data || [] });
}
