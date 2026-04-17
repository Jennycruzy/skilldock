# Agent Instructions — compose

## When to Use
Use `compose` when you have a URL and need a summary in one shot. It saves you a round-trip and costs $0.001 less than calling `scrape` + `summarize` separately.

## When to Use Separate Calls Instead
- When you need `bodyText` for further processing beyond summarization
- When you want to scrape once and summarize multiple ways
- When you need the full link list from the scrape

## Calling Pattern
```
POST /api/skills/compose
{ "url": "https://example.com", "summaryStyle": "bullet" }
```

## Chaining
This is already a composed skill — no further chaining needed for simple read-and-summarize tasks.  
For more complex workflows: `skill-router` orchestrates `compose` automatically.
