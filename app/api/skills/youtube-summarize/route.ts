import { NextRequest } from 'next/server';
import { withPurchPayment } from '@/lib/payment-middleware';
import { YoutubeTranscript } from 'youtube-transcript';
import Anthropic from '@anthropic-ai/sdk';

function getAnthropic() {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error('ANTHROPIC_API_KEY is not configured on this server.');
  return new Anthropic({ apiKey: key });
}

function extractVideoId(url: string): string | null {
  const patterns = [
    /[?&]v=([a-zA-Z0-9_-]{11})/,           // youtube.com/watch?v=ID
    /youtu\.be\/([a-zA-Z0-9_-]{11})/,        // youtu.be/ID
    /embed\/([a-zA-Z0-9_-]{11})/,            // youtube.com/embed/ID
    /shorts\/([a-zA-Z0-9_-]{11})/,           // youtube.com/shorts/ID
    /^([a-zA-Z0-9_-]{11})$/,                 // bare ID
  ];
  for (const re of patterns) {
    const m = url.match(re);
    if (m) return m[1];
  }
  return null;
}

async function fetchVideoTitle(videoId: string): Promise<string> {
  try {
    const res = await fetch(
      `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`,
      { signal: AbortSignal.timeout(5_000) }
    );
    if (!res.ok) return 'Unknown title';
    const data = await res.json();
    return data.title ?? 'Unknown title';
  } catch {
    return 'Unknown title';
  }
}

const handler = withPurchPayment({
  price: 0.025,
  description:
    'Watch any YouTube video and get an AI-generated summary. Extracts captions and summarises via Claude. Supports bullet, paragraph, and TL;DR styles.',
  skillId: 'youtube-summarize',
})(async (req: NextRequest) => {
  const body = await req.json();
  const { url, style = 'bullet' } = body as { url: string; style?: string };

  if (!url) throw new Error('url is required — provide a YouTube video URL.');

  const videoId = extractVideoId(url);
  if (!videoId) {
    throw new Error(
      `Could not extract a YouTube video ID from: "${url}". ` +
      `Supported formats: youtube.com/watch?v=ID, youtu.be/ID, youtube.com/shorts/ID`
    );
  }

  // ── Fetch transcript ───────────────────────────────────────────────────────
  let transcriptSegments: { text: string; duration: number; offset: number }[];
  try {
    transcriptSegments = await YoutubeTranscript.fetchTranscript(videoId);
  } catch (err) {
    throw new Error(
      `No transcript available for this video. ` +
      `The video may have captions disabled, be age-restricted, or be private. ` +
      `(${err instanceof Error ? err.message : String(err)})`
    );
  }

  if (!transcriptSegments.length) {
    throw new Error('Transcript is empty — captions may not be available for this video.');
  }

  const fullTranscript = transcriptSegments.map((s) => s.text).join(' ');
  const totalDurationMs = transcriptSegments.reduce((acc, s) => acc + s.duration, 0);
  const durationMinutes = Math.round(totalDurationMs / 1000 / 60);

  // ── Fetch video title ──────────────────────────────────────────────────────
  const [title] = await Promise.all([fetchVideoTitle(videoId)]);

  // ── Summarise with Claude ──────────────────────────────────────────────────
  const styleInstructions: Record<string, string> = {
    bullet:    'Format as a clear list of bullet points covering the key topics, insights, and takeaways.',
    paragraph: 'Write a flowing 2–3 paragraph summary that reads naturally.',
    tldr:      'Write a single sharp TL;DR sentence of no more than 30 words.',
    chapters:  'Break the content into timestamped chapter summaries (use approximate timestamps based on the content flow).',
  };

  const instruction = styleInstructions[style] ?? styleInstructions.bullet;

  const anthropic = getAnthropic();
  const msg = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: `You are summarising a YouTube video titled: "${title}".
${instruction}
Be concise and focus on the most valuable insights for someone who hasn't watched it.

Transcript (${fullTranscript.split(' ').length} words):
${fullTranscript.slice(0, 12_000)}${fullTranscript.length > 12_000 ? '\n[transcript truncated]' : ''}`,
      },
    ],
  });

  return {
    videoId,
    videoUrl: `https://www.youtube.com/watch?v=${videoId}`,
    title,
    summary: (msg.content[0] as { text: string }).text,
    style,
    durationMinutes,
    transcriptWordCount: fullTranscript.split(' ').length,
    transcriptSegments: transcriptSegments.length,
  };
});

export { handler as POST };
