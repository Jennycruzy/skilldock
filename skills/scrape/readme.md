# scrape — Web Scraper

**Endpoint:** `POST /api/skills/scrape`  
**Price:** $0.002 USDC  
**Tags:** web, data

## What It Does
Fetches any public URL and returns structured content: title, meta description, clean body text, outbound links, and word count. Handles both plain HTML and JavaScript-rendered pages (if ScrapingBee is configured).

## Input
```json
{ "url": "https://example.com" }
```

## Output
```json
{
  "title": "Page Title",
  "metaDescription": "...",
  "bodyText": "...",
  "wordCount": 412,
  "links": ["https://..."],
  "scrapedAt": "2026-04-17T09:00:00Z"
}
```

## Notes
- `bodyText` is capped at 3000 characters
- Only `http://` and `https://` protocols are supported
- With `SCRAPINGBEE_API_KEY` set, JavaScript-rendered pages and social media work
