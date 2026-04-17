# summarize — AI Summarizer

**Endpoint:** `POST /api/skills/summarize`  
**Price:** $0.010 USDC  
**Tags:** web, data

## What It Does
Summarizes any text using Claude. Returns a condensed version in bullet points, paragraph, or TL;DR style.

## Input
```json
{
  "text": "Long text to summarize...",
  "style": "bullet" | "paragraph" | "tldr"
}
```
`style` defaults to `"bullet"` if omitted.

## Output
```json
{
  "summary": "• Point one\n• Point two\n...",
  "wordCount": 120,
  "style": "bullet",
  "model": "claude-haiku-4-5-20251001"
}
```

## Notes
- Input text is capped at 4000 characters internally
- `tldr` produces a single sentence
- Best chained after `scrape` to condense web content
