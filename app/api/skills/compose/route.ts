import { NextRequest } from 'next/server';
import * as cheerio from 'cheerio';
import Anthropic from '@anthropic-ai/sdk';
import { withPurchPayment } from '@/lib/payment-middleware';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const handler = withPurchPayment({
  price: 0.011,
  description: 'Compose: Scrape + Summarize — extract and summarize any URL in one call',
  skillId: 'compose',
})(async (req: NextRequest) => {
  const body = await req.json();
  const { url, summaryStyle = 'bullet' } = body as { url: string; summaryStyle?: string };

  if (!url || typeof url !== 'string') {
    throw new Error('url is required');
  }

  new URL(url); // validate

  // Step 1: Scrape
  const scrapeStart = Date.now();
  const response = await fetch(url, {
    headers: { 'User-Agent': 'SkillDock/1.0 (+https://skilldock.vercel.app)' },
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) throw new Error(`Fetch failed: ${response.status}`);

  const html = await response.text();
  const $ = cheerio.load(html);
  $('script, style, noscript').remove();

  const title = $('title').text().trim() || $('h1').first().text().trim();
  const bodyText = $('body').text().replace(/\s+/g, ' ').trim().slice(0, 2000);
  const scrapeMs = Date.now() - scrapeStart;

  // Step 2: Summarize
  const summarizeStart = Date.now();
  const styleMap: Record<string, string> = {
    bullet: 'Summarize as concise bullet points (5–8 bullets starting with "•").',
    paragraph: 'Summarize in 2–3 concise paragraphs.',
    tldr: 'Give a one-sentence TL;DR.',
  };
  const styleKey = ['bullet', 'paragraph', 'tldr'].includes(summaryStyle) ? summaryStyle : 'bullet';

  const message = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 512,
    messages: [
      {
        role: 'user',
        content: `${styleMap[styleKey]}\n\n---\n\n${bodyText}`,
      },
    ],
  });

  const summary = message.content
    .filter((c) => c.type === 'text')
    .map((c) => (c as { type: 'text'; text: string }).text)
    .join('');

  const summarizeMs = Date.now() - summarizeStart;

  return {
    url,
    title,
    summary,
    scrapeMs,
    summarizeMs,
    totalMs: scrapeMs + summarizeMs,
  };
});

export { handler as POST };
