# youtube-summarize — YouTube Summarizer

**Endpoint:** `POST /api/skills/youtube-summarize`  
**Price:** $0.025 USDC  
**Tags:** persona, video

## What It Does
Fetches a YouTube video's transcript and produces an AI summary. Supports bullet, paragraph, TL;DR, and chapter formats.

## Input
```json
{
  "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  "style": "bullet" | "paragraph" | "tldr" | "chapters"
}
```
`style` defaults to `"bullet"`.

## Supported URL Formats
- `youtube.com/watch?v=...`
- `youtu.be/...`
- `youtube.com/shorts/...`

## Output
```json
{
  "videoId": "dQw4w9WgXcQ",
  "videoUrl": "https://www.youtube.com/watch?v=...",
  "title": "Video Title",
  "summary": "• Key point one\n• Key point two",
  "style": "bullet",
  "durationMinutes": 3.5,
  "transcriptWordCount": 840
}
```

## Notes
- `chapters` style splits the summary by video chapters
- Requires a video with available captions/transcript
