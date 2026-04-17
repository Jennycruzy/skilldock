# Agent Instructions — google-search

## When to Use
Call `google-search` when the question requires finding current information, multiple sources, or discovering URLs to scrape. It is your discovery layer.

## Search Type Selection
- `search` — general web results (default)
- `news` — recent events, press releases, market news
- `images` — when visual context matters

## Query Writing
- Be specific: "Solana price April 2026" not "crypto price"
- For news: include time qualifiers — "this week", "latest"
- `answerBox` gives direct answers to factual questions — check it first

## Chaining
→ `scrape` (take links from `organic` and scrape the most relevant ones)  
→ `summarize` (summarize the snippets if `answerBox` is empty)  
→ `skill-router` orchestrates this automatically

## Cost Awareness
$0.005 per search. For a single research task, 2–3 searches is usually sufficient.
