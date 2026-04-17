import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ success: true });
}

export async function POST(req: NextRequest) {
  const text = await req.text().catch(() => '');

  // If it's already a plain JWT string, return it as-is
  if (text.startsWith('eyJ')) {
    return new NextResponse(text, {
      headers: { 'Content-Type': 'text/plain' },
    });
  }

  // If it's JSON, parse and return as-is
  try {
    const body = JSON.parse(text);
    return NextResponse.json(body);
  } catch {
    return NextResponse.json({ jwt: text });
  }
}
