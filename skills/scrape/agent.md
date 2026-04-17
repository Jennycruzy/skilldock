# Agent Instructions — scrape

## When to Use
Call `scrape` when you need the actual content of a webpage: article text, product descriptions, documentation, social posts, or any public URL content.

## When NOT to Use
- When you already have the text — don't re-fetch it
- For PDF or binary files — use a dedicated parser
- For login-gated content — scrape can't authenticate

## Calling Pattern
```
POST /api/skills/scrape
{ "url": "<target_url>" }
```

## Interpreting the Response
- `bodyText` is the main readable content — pass this to `summarize` if it's long
- `links` gives you follow-up URLs to crawl if needed
- If `bodyText` is empty or very short, the page may require JS rendering

## Chaining
→ `summarize` (for long body text)  
→ `skill-router` (for multi-step research)

## Cost Awareness
Each scrape costs $0.002. For multi-page crawls, budget accordingly.
