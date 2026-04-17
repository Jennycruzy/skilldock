import { NextRequest, NextResponse } from 'next/server';
import { getSkill } from '@/lib/skills-registry';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ skillId: string }> }
) {
  const { skillId } = await params;
  const skill = getSkill(skillId);

  if (!skill) {
    return NextResponse.json({ error: `Skill '${skillId}' not found` }, { status: 404 });
  }

  return NextResponse.json(skill.mcpToolDefinition, {
    headers: {
      'Content-Disposition': `attachment; filename="skilldock_${skillId}.mcp.json"`,
    },
  });
}
