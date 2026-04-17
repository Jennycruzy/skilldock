import { NextRequest } from 'next/server';
import * as cheerio from 'cheerio';
import { withPurchPayment } from '@/lib/payment-middleware';

const BROWSER_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'Cache-Control': 'no-cache',
};

// ── ScrapingBee (handles JS-rendered sites, social media, dynamic pages) ──────
// Sign up free at scrapingbee.com — 1,000 free credits, no card needed
async function scrapeWithScrapingBee(url: string) {
  const apiKey = process.env.SCRAPINGBEE_API_KEY;
  if (!apiKey) return null;

  const params = new URLSearchParams({
    api_key: apiKey,
    url,
    render_js: 'true',         // renders JavaScript like a real browser
    premium_proxy: 'false',    // set true for extra-protected sites (costs more credits)
    return_page_source: 'true',
  });

  const res = await fetch(`https://app.scrapingbee.com/api/v1/?${params}`, {
    signal: AbortSignal.timeout(30_000),
  });

  if (!res.ok) return null;

  const html = await res.text();
  const $ = (await import('cheerio')).load(html);
  $('script, style, noscript, nav, footer, aside').remove();

  const title =
    $('meta[property="og:title"]').attr('content') ||
    $('title').text().trim() ||
    $('h1').first().text().trim() || '';

  const metaDescription =
    $('meta[name="description"]').attr('content') ||
    $('meta[property="og:description"]').attr('content') || '';

  const contentEl =
    $('article').length ? $('article') :
    $('main').length ? $('main') :
    $('body');

  const bodyText = contentEl.text().replace(/\s+/g, ' ').trim().slice(0, 3000);
  const wordCount = bodyText.split(/\s+/).filter(Boolean).length;

  const links: string[] = [];
  $('a[href]').each((_, el) => {
    if (links.length >= 15) return false;
    const href = $(el).attr('href') || '';
    if (href.startsWith('http')) links.push(href);
  });

  return {
    title,
    metaDescription,
    bodyText,
    wordCount,
    links,
    source: 'scrapingbee',
  };
}

// ── Direct fetch (works for simple public HTML pages) ─────────────────────────
async function scrapeDirectly(url: string) {
  const response = await fetch(url, {
    headers: BROWSER_HEADERS,
    redirect: 'follow',
    signal: AbortSignal.timeout(12_000),
  });

  if (!response.ok) throw new Error(`HTTP ${response.status} ${response.statusText}`);

  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('text/html') && !contentType.includes('text/plain')) {
    throw new Error(`Non-HTML content returned (${contentType})`);
  }

  const html = await response.text();
  const $ = cheerio.load(html);
  $('script, style, noscript, nav, footer, aside').remove();

  const title =
    $('meta[property="og:title"]').attr('content') ||
    $('title').text().trim() ||
    $('h1').first().text().trim() || '';

  const metaDescription =
    $('meta[name="description"]').attr('content') ||
    $('meta[property="og:description"]').attr('content') || '';

  const contentEl =
    $('article').length ? $('article') :
    $('main').length ? $('main') :
    $('body');

  const bodyText = contentEl.text().replace(/\s+/g, ' ').trim().slice(0, 3000);
  const wordCount = bodyText.split(/\s+/).filter(Boolean).length;

  const links: string[] = [];
  $('a[href]').each((_, el) => {
    if (links.length >= 15) return false;
    const href = $(el).attr('href') || '';
    if (href.startsWith('http')) links.push(href);
  });

  if (!title && !bodyText) {
    throw new Error(
      'Page returned no readable content — it may require JavaScript rendering. ' +
      'Set SCRAPINGBEE_API_KEY in .env.local to enable full JS rendering for any site (free at scrapingbee.com).'
    );
  }

  return { title, metaDescription, bodyText, wordCount, links, source: 'direct' };
}

const handler = withPurchPayment({
  price: 0.002,
  description:
    'Fetch and parse any public URL. With Firecrawl configured, renders JavaScript and handles social media, paywalls, and dynamic sites.',
  skillId: 'scrape',
})(async (req: NextRequest) => {
  const body = await req.json();
  const { url } = body as { url: string };

  if (!url || typeof url !== 'string') throw new Error('url is required');

  const parsed = new URL(url);
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error('Only http/https URLs are supported');
  }

  // Try ScrapingBee first (handles JS sites, social media, etc.)
  const scrapingBeeResult = await scrapeWithScrapingBee(url);
  if (scrapingBeeResult) {
    return { ...scrapingBeeResult, scrapedAt: new Date().toISOString() };
  }

  // Fall back to direct fetch
  const directResult = await scrapeDirectly(url);
  return { ...directResult, scrapedAt: new Date().toISOString() };
});

export { handler as POST };
