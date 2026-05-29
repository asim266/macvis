---
name: Text-to-Speech & Media
description: Generate voiceovers and media assets (ElevenLabs).
when_to_use: Generating speech/voiceovers or working with audio media assets.
icon: 🔊
---

# Text-to-Speech & Media

## ElevenLabs (via MCP or API)
- If the **ElevenLabs MCP** is connected, use its tools (already authed).
- Else use the API with `$ELEVENLABS_API_KEY`. Pick a voice id; stream or save MP3.

```bash
curl -s -X POST "https://api.elevenlabs.io/v1/text-to-speech/$VOICE_ID" \
  -H "xi-api-key: $ELEVENLABS_API_KEY" -H "Content-Type: application/json" \
  -d '{"text":"...", "model_id":"eleven_multilingual_v2"}' --output out.mp3
```

## Writing for the ear
- Short sentences. Spell out tricky terms phonetically. Add pauses with punctuation.
- Keep segments under ~30s for natural pacing; chunk long scripts.

## Output
- Save assets under the project dir; tell the user the path. Play with `afplay out.mp3` (macOS) to verify.

## Don't
- Don't clone a real person's voice without consent. Respect content/IP rights and platform ToS.
