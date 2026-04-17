# Agent Instructions — summarize

## When to Use
Call `summarize` when you have a block of text that is too long to reason over directly, or when a human needs a quick digest.

## Style Selection
- `bullet` — best for reference material, documentation, lists of facts
- `paragraph` — best for narrative content, news articles, stories
- `tldr` — best when you only need the single most important thing

## Calling Pattern
```
POST /api/skills/summarize
{ "text": "<content>", "style": "bullet" }
```

## Chaining
← `scrape` (feed bodyText here)  
← `youtube-summarize` (already does this internally)  
→ `skill-router` (to reason over the summary)

## Cost Awareness
At $0.010, summarize is the most expensive single-call skill after `transcribe`. Use `tldr` style when you only need a quick fact.
