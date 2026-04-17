import { NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { withPurchPayment } from '@/lib/payment-middleware';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const STYLE_PROMPTS: Record<string, string> = {
  bullet: 'Summarize the following text as a concise bullet-point list (5–8 bullets). Start each bullet with "•".',
  paragraph: 'Summarize the following text in 2–3 concise paragraphs.',
  tldr: 'Give a TL;DR summary of the following text in 1–2 sentences.',
};

const handler = withPurchPayment({
  price: 0.01,
  description: 'AI Summarizer — summarize text using Claude Haiku',
  skillId: 'summarize',
})(async (req: NextRequest) => {
  const body = await req.json();
  const { text, style = 'bullet' } = body as { text: string; style?: 'bullet' | 'paragraph' | 'tldr' };

  if (!text || typeof text !== 'string') {
    throw new Error('text is required');
  }

  const styleKey = ['bullet', 'paragraph', 'tldr'].includes(style) ? style : 'bullet';
  const systemPrompt = STYLE_PROMPTS[styleKey];

  const message = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 512,
    messages: [
      {
        role: 'user',
        content: `${systemPrompt}\n\n---\n\n${text.slice(0, 8000)}`,
      },
    ],
  });

  const summary = message.content
    .filter((c) => c.type === 'text')
    .map((c) => (c as { type: 'text'; text: string }).text)
    .join('');

  return {
    summary,
    wordCount: summary.split(/\s+/).filter(Boolean).length,
    style: styleKey,
    model: message.model,
  };
});

export { handler as POST };
