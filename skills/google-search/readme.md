# google-search — Google Search

**Endpoint:** `POST /api/skills/google-search`  
**Price:** $0.005 USDC  
**Tags:** web, data

## What It Does
Searches Google and returns structured results: organic links, knowledge panel, answer boxes, top stories, and related searches.

## Input
```json
{
  "query": "search query",
  "num": 10,
  "type": "search" | "news" | "images"
}
```
`num` max is 20, defaults to 10. `type` defaults to `"search"`.

## Output
```json
{
  "query": "search query",
  "organic": [{ "title": "...", "link": "...", "snippet": "..." }],
  "knowledgeGraph": { "title": "...", "description": "..." },
  "answerBox": { "answer": "..." },
  "topStories": [...],
  "relatedSearches": [...]
}
```

## Notes
- Requires `SERPER_API_KEY` (free tier available at serper.dev)
- `answerBox` contains direct answers for factual queries
- `type=news` returns recent news articles
