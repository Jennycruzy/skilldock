# transcribe — Audio / Video Transcriber

**Endpoint:** `POST /api/skills/transcribe`  
**Price:** $0.050 USDC  
**Tags:** persona, audio

## What It Does
Transcribes any public MP3, MP4, WAV, or M4A file. Returns a raw transcript or AI-formatted song lyrics.

## Input
```json
{
  "url": "https://example.com/audio.mp3",
  "format": "raw" | "lyrics"
}
```
`format` defaults to `"raw"`.

## Output
```json
{
  "format": "raw",
  "rawTranscript": "Full verbatim transcript...",
  "lyrics": null,
  "transcript": "Full verbatim transcript...",
  "language": "en",
  "durationSeconds": 182,
  "fileSizeKB": 2840
}
```

## Notes
- File size limit: 24MB
- `format=lyrics` uses AI to structure the output as verse/chorus
- Powered by OpenAI Whisper
- Supports: MP3, MP4, WAV, M4A
