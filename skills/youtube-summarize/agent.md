# Agent Instructions — youtube-summarize

## When to Use
Call `youtube-summarize` for any YouTube URL. It is the definitive skill for extracting insight from video content without watching it.

## Style Selection
- `bullet` — default; works for most content
- `paragraph` — for narrative/documentary content
- `tldr` — single-sentence bottom line
- `chapters` — best for long educational content (courses, conferences, talks)

## Calling Pattern
```
POST /api/skills/youtube-summarize
{ "url": "https://youtu.be/VIDEO_ID", "style": "bullet" }
```

## Limitations
- Requires the video to have a transcript (most English videos do; auto-captions count)
- Does not work for live streams or private videos

## Chaining
→ `summarize` if you need to further compress the output  
→ `skill-router` for follow-up questions about the video content
