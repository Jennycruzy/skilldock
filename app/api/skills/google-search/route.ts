import { NextRequest } from 'next/server';
import { withPurchPayment } from '@/lib/payment-middleware';

const handler = withPurchPayment({
  price: 0.005,
  description: 'Search Google and get structured results — titles, links, snippets, and knowledge panel data.',
  skillId: 'google-search',
})(async (req: NextRequest) => {
  const body = await req.json();
  const { query, num = 10, type = 'search' } = body as {
    query: string;
    num?: number;
    type?: 'search' | 'news' | 'images';
  };

  if (!query) throw new Error('query is required');

  const apiKey = process.env.SERPER_API_KEY;
  if (!apiKey) throw new Error('SERPER_API_KEY is not configured. Get a free key at serper.dev');

  const res = await fetch(`https://google.serper.dev/${type}`, {
    method: 'POST',
    headers: {
      'X-API-KEY': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ q: query, num: Math.min(num, 20) }),
    signal: AbortSignal.timeout(10_000),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Serper API error: ${res.status} — ${err}`);
  }

  const data = await res.json();

  return {
    query,
    type,
    organic: (data.organic || []).map((r: {
      title: string;
      link: string;
      snippet: string;
      position: number;
      date?: string;
    }) => ({
      title: r.title,
      link: r.link,
      snippet: r.snippet,
      position: r.position,
      date: r.date,
    })),
    knowledgeGraph: data.knowledgeGraph || null,
    answerBox: data.answerBox || null,
    topStories: data.topStories || [],
    relatedSearches: (data.relatedSearches || []).map((r: { query: string }) => r.query),
    searchParameters: data.searchParameters,
  };
});

export { handler as POST };
