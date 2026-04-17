import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ success: true });
}

export async function POST(req: NextRequest) {
  const text = await req.text().catch(() => '');

  if (text.startsWith('eyJ')) {
    return new NextResponse(text, {
      headers: { 'Content-Type': 'text/plain' },
    });
  }

  try {
    const body = JSON.parse(text);
    return NextResponse.json(body);
  } catch {
    return NextResponse.json({ success: true });
  }
}
