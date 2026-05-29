import { ipcMain } from 'electron'
import { execFile, spawn } from 'child_process'
import fs from 'fs/promises'
import path from 'path'
import os from 'os'
import { ConfigStore } from '../core/config/ConfigStore'

async function speakElevenLabs(text: string, key: string): Promise<boolean> {
  try {
    const voiceId = '21m00Tcm4TlvDq8ikWAM' // default "Rachel"
    const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: { 'xi-api-key': key, 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, model_id: 'eleven_multilingual_v2' }),
    })
    if (!res.ok) return false
    const buf = Buffer.from(await res.arrayBuffer())
    const file = path.join(os.tmpdir(), `macvis-tts-${Date.now()}.mp3`)
    await fs.writeFile(file, buf)
    spawn('afplay', [file], { detached: true, stdio: 'ignore' }).unref()
    return true
  } catch { return false }
}

export function setupVoiceHandlers() {
  // Speak text aloud — ElevenLabs if configured, else macOS `say`.
  ipcMain.handle('voice:speak', async (_, { text }) => {
    if (!text) return { ok: false }
    const key = ConfigStore.getInstance().get('apiKeys.elevenlabs') as string
    if (key) {
      const ok = await speakElevenLabs(text, key)
      if (ok) return { ok: true, via: 'elevenlabs' }
    }
    spawn('say', [String(text).slice(0, 4000)], { detached: true, stdio: 'ignore' }).unref()
    return { ok: true, via: 'say' }
  })

  ipcMain.handle('voice:stopSpeaking', async () => {
    execFile('killall', ['say'], () => {})
    execFile('killall', ['afplay'], () => {})
    return { ok: true }
  })

  // Transcribe recorded audio (base64) via Whisper (OpenAI or Groq).
  ipcMain.handle('voice:transcribe', async (_, { audio, mimeType }) => {
    const config = ConfigStore.getInstance()
    const openai = config.get('apiKeys.openai') as string
    const groq = config.get('apiKeys.groq') as string
    if (!openai && !groq) return { ok: false, error: 'Add an OpenAI or Groq API key in Settings to enable voice input.' }

    const url = openai ? 'https://api.openai.com/v1/audio/transcriptions' : 'https://api.groq.com/openai/v1/audio/transcriptions'
    const key = openai || groq
    const model = openai ? 'whisper-1' : 'whisper-large-v3'
    try {
      const buf = Buffer.from(audio, 'base64')
      const form = new FormData()
      form.append('file', new Blob([buf], { type: mimeType || 'audio/webm' }), 'audio.webm')
      form.append('model', model)
      const res = await fetch(url, { method: 'POST', headers: { Authorization: `Bearer ${key}` }, body: form as any })
      const data = await res.json() as any
      if (!res.ok) return { ok: false, error: data?.error?.message || `HTTP ${res.status}` }
      return { ok: true, text: data.text || '' }
    } catch (err: any) {
      return { ok: false, error: err.message || String(err) }
    }
  })
}
