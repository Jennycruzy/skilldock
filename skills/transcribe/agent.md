# Agent Instructions — transcribe

## When to Use
Call `transcribe` when you have a direct URL to an audio or video file and need its spoken content as text.

## When NOT to Use
- YouTube URLs — use `youtube-summarize` instead (it handles transcription + summary together)
- Files over 24MB — they will fail
- Podcasts behind paywalls — direct access needed

## Format Selection
- `raw` — verbatim transcript; best for factual content, interviews, lectures
- `lyrics` — AI restructures output as song lyrics with verses and chorus

## Calling Pattern
```
POST /api/skills/transcribe
{ "url": "https://example.com/podcast.mp3", "format": "raw" }
```

## After Transcribing
→ `summarize` to condense a long transcript  
→ `skill-router` to answer questions about the content

## Cost Awareness
At $0.050 this is the most expensive skill. Verify the URL is accessible before calling.
