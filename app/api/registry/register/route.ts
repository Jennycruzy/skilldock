import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, wallet_address, manifest_url } = body as {
    name: string;
    wallet_address: string;
    manifest_url: string;
  };

  if (!name || !wallet_address || !manifest_url) {
    return NextResponse.json({ error: 'name, wallet_address, and manifest_url are required' }, { status: 400 });
  }

  // Validate and fetch manifest
  let manifest: Record<string, unknown>;
  try {
    const res = await fetch(manifest_url, { signal: AbortSignal.timeout(10_000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    manifest = await res.json();
  } catch (e) {
    return NextResponse.json(
      { error: `Failed to fetch manifest: ${e instanceof Error ? e.message : 'Unknown error'}` },
      { status: 400 }
    );
  }

  // Validate required manifest fields
  if (!manifest.provider || !manifest.skills || !Array.isArray(manifest.skills)) {
    return NextResponse.json(
      { error: 'Manifest must have provider and skills[] fields' },
      { status: 400 }
    );
  }

  const skills = manifest.skills as unknown[];
  const skillCount = skills.length;

  const supabase = getServiceSupabase();

  const { data, error } = await supabase
    .from('skill_providers')
    .upsert(
      {
        name,
        wallet_address,
        manifest_url,
        verified: true,
        skill_count: skillCount,
      },
      { onConflict: 'manifest_url' }
    )
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    provider: data,
    parsedSkills: skills.map((s: unknown) => {
      const skill = s as Record<string, unknown>;
      return { id: skill.id, name: skill.name, price: skill.price, endpoint: skill.endpoint };
    }),
  });
}
