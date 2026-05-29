// Shared types + helpers for the native tool layer.
import type { ContentBlockText, ContentBlockImage } from '../agent/providers/types'

/**
 * A tool's execute() may return either a plain string OR an image-bearing
 * result. Image results carry provider-ready blocks (text + image) plus a
 * compact `display` string that is shown in the UI and persisted to the flat
 * session JSON (we never write base64 to disk).
 */
export interface ImageToolResult {
  type: 'image_result'
  blocks: Array<ContentBlockText | ContentBlockImage>
  display: string
}

export type ToolReturn = string | ImageToolResult

export function isImageToolResult(v: any): v is ImageToolResult {
  return !!v && typeof v === 'object' && v.type === 'image_result' && Array.isArray(v.blocks)
}

/** Build an image tool result from base64 PNG/JPEG data. */
export function imageResult(data: string, mimeType: string, caption: string): ImageToolResult {
  return {
    type: 'image_result',
    blocks: [
      { type: 'text', text: caption },
      { type: 'image', data, mimeType },
    ],
    display: caption,
  }
}
