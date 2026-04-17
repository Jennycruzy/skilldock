# compose — Scrape + Summarize

**Endpoint:** `POST /api/skills/compose`  
**Price:** $0.011 USDC  
**Tags:** web, compose

## What It Does
Give a URL, get an AI summary. Chains `scrape` and `summarize` internally at a combined price cheaper than calling both separately.

## Input
```json
{
  "url": "https://example.com",
  "summaryStyle": "bullet" | "paragraph" | "tldr"
}
```

## Output
```json
{
  "url": "https://example.com",
  "title": "Page Title",
  "summary": "• Key point one\n• Key point two",
  "scrapeMs": 420,
  "summarizeMs": 810,
  "totalMs": 1230
}
```

## Notes
- Single request — no need to chain calls manually
- `summaryStyle` defaults to `"bullet"`
- Timing fields let you measure latency
