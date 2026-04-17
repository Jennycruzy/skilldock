import { NextRequest } from 'next/server';
import { withPurchPayment } from '@/lib/payment-middleware';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';

const MAX_FILE_SIZE = 24 * 1024 * 1024; // 24MB — Whisper limit is 25MB

function getOpenAI() {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error('OPENAI_API_KEY is not configured on this server.');
  return new OpenAI({ apiKey: key });
}

function getAnthropic() {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error('ANTHROPIC_API_KEY is not configured on this server.');
  return new Anthropic({ apiKey: key });
}

const handler = withPurchPayment({
  price: 0.05,
  description:
    'Transcribe any audio or video file (MP3, MP4, WAV, M4A) from a public URL. Returns raw transcript or formatted as song lyrics.',
  skillId: 'transcribe',
})(async (req: NextRequest) => {
  const body = await req.json();
  const { url, format = 'lyrics' } = body as { url: string; format?: string };

  if (!url) throw new Error('url is required — provide a public link to an MP3, MP4, WAV, or M4A file.');

  // ── Fetch the audio/video file ─────────────────────────────────────────────
  let fileRes: Response;
  try {
    fileRes = await fetch(url, { signal: AbortSignal.timeout(30_000) });
  } catch {
    throw new Error(`Could not reach file URL: ${url}`);
  }

  if (!fileRes.ok) {
    throw new Error(`Failed to fetch file (HTTP ${fileRes.status}): ${url}`);
  }

  const contentLength = fileRes.headers.get('content-length');
  if (contentLength && parseInt(contentLength) > MAX_FILE_SIZE) {
    throw new Error(`File too large (${Math.round(parseInt(contentLength) / 1024 / 1024)}MB). Maximum is 24MB.`);
  }

  const buffer = await fileRes.arrayBuffer();
  if (buffer.byteLength > MAX_FILE_SIZE) {
    throw new Error(`File too large (${Math.round(buffer.byteLength / 1024 / 1024)}MB). Maximum is 24MB.`);
  }

  // Detect format from URL or content-type
  const contentType = fileRes.headers.get('content-type') || '';
  let filename = 'audio.mp3';
  let mimeType = 'audio/mpeg';

  const ext = url.split('?')[0].split('.').pop()?.toLowerCase();
  if (ext === 'mp4' || contentType.includes('mp4')) { filename = 'audio.mp4'; mimeType = 'video/mp4'; }
  else if (ext === 'wav' || contentType.includes('wav')) { filename = 'audio.wav'; mimeType = 'audio/wav'; }
  else if (ext === 'm4a' || contentType.includes('m4a')) { filename = 'audio.m4a'; mimeType = 'audio/mp4'; }
  else if (ext === 'webm' || contentType.includes('webm')) { filename = 'audio.webm'; mimeType = 'audio/webm'; }

  const file = new File([buffer], filename, { type: mimeType });

  // ── Whisper transcription ──────────────────────────────────────────────────
  const openai = getOpenAI();
  const transcription = await openai.audio.transcriptions.create({
    file,
    model: 'whisper-1',
    response_format: 'verbose_json',
  });

  const rawText: string = (transcription as { text: string }).text;
  const language: string = (transcription as { language?: string }).language ?? 'unknown';
  const duration: number = (transcription as { duration?: number }).duration ?? 0;

  // ── Format as lyrics if requested ─────────────────────────────────────────
  if (format === 'lyrics') {
    const anthropic = getAnthropic();
    const msg = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2048,
      messages: [
        {
          role: 'user',
          content: `You are a lyrics formatter. The text below is a raw transcription of a song or audio recording.
Format it as song lyrics with proper structure: add verse labels (Verse 1, Chorus, Bridge, Outro etc.) where appropriate, preserve rhyme patterns, and split into natural lines.
If it doesn't appear to be a song, format it as a clean readable transcript with paragraph breaks.

Raw transcription:
${rawText}`,
        },
      ],
    });

    return {
      format: 'lyrics',
      lyrics: (msg.content[0] as { text: string }).text,
      rawTranscript: rawText,
      language,
      durationSeconds: Math.round(duration),
      fileSizeKB: Math.round(buffer.byteLength / 1024),
    };
  }

  // Raw transcript
  return {
    format: 'raw',
    transcript: rawText,
    language,
    durationSeconds: Math.round(duration),
    fileSizeKB: Math.round(buffer.byteLength / 1024),
  };
});

export { handler as POST };
