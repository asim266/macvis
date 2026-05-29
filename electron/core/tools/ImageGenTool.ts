import fs from 'fs/promises'
import path from 'path'
import os from 'os'
import { imageResult, type ToolReturn } from './types'

const OUT_DIR = path.join(os.homedir(), '.macvis', 'workspace', 'generated')

async function save(b64: string, ext = 'png'): Promise<string> {
  await fs.mkdir(OUT_DIR, { recursive: true })
  const file = path.join(OUT_DIR, `img-${Date.now()}.${ext}`)
  await fs.writeFile(file, Buffer.from(b64, 'base64'))
  return file
}

async function openaiImage(key: string, prompt: string, size: string): Promise<{ b64: string }> {
  const res = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({ model: 'gpt-image-1', prompt, size: size || '1024x1024', n: 1 }),
  })
  const data = await res.json() as any
  if (!res.ok) throw new Error(data?.error?.message || `OpenAI image error ${res.status}`)
  const b64 = data?.data?.[0]?.b64_json
  if (!b64) throw new Error('OpenAI returned no image data')
  return { b64 }
}

async function geminiImage(key: string, prompt: string): Promise<{ b64: string }> {
  const model = 'gemini-2.5-flash-image-preview'
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseModalities: ['IMAGE', 'TEXT'] },
    }),
  })
  const data = await res.json() as any
  if (!res.ok) throw new Error(data?.error?.message || `Gemini image error ${res.status}`)
  const parts = data?.candidates?.[0]?.content?.parts || []
  const img = parts.find((p: any) => p.inlineData?.data)
  if (!img) throw new Error('Gemini returned no image data')
  return { b64: img.inlineData.data }
}

export const ImageGenTool = {
  definition: {
    name: 'image_gen',
    description:
      'Generate an image from a text prompt. Saves a PNG to ~/.macvis/workspace/generated/ and shows it. ' +
      'Uses OpenAI (gpt-image-1) or Google Gemini image, whichever key is configured.',
    input_schema: {
      type: 'object',
      properties: {
        prompt: { type: 'string', description: 'Description of the image to generate' },
        size: { type: 'string', description: 'e.g. 1024x1024, 1536x1024 (OpenAI only)' },
      },
      required: ['prompt'],
    },
  },

  async execute({ prompt, size }: any, config?: any): Promise<ToolReturn> {
    const openaiKey = config?.get?.('apiKeys.openai')
    const geminiKey = config?.get?.('apiKeys.nanoBanana') || config?.get?.('apiKeys.gemini')

    try {
      let b64: string
      let via: string
      if (geminiKey && !openaiKey) {
        ({ b64 } = await geminiImage(geminiKey, prompt)); via = 'Gemini'
      } else if (openaiKey) {
        ({ b64 } = await openaiImage(openaiKey, prompt, size)); via = 'OpenAI'
      } else if (geminiKey) {
        ({ b64 } = await geminiImage(geminiKey, prompt)); via = 'Gemini'
      } else {
        return 'No image-generation key set. Add an OpenAI key or a Gemini/Nano Banana key in Settings.'
      }
      const file = await save(b64)
      return imageResult(b64, 'image/png', `[generated image via ${via} — saved to ${file}]`)
    } catch (err: any) {
      return `Image generation failed: ${err.message || String(err)}`
    }
  },
}
