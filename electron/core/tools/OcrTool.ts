import { execFile } from 'child_process'
import { promisify } from 'util'
import fs from 'fs/promises'
import os from 'os'
import path from 'path'

const execFileAsync = promisify(execFile)

function resolve(p: string): string {
  return p.startsWith('~') ? p.replace('~', process.env.HOME || '') : p
}

// macOS Vision OCR via a tiny Swift script (run with the system `swift`).
const SWIFT_SRC = `import Foundation
import Vision
import AppKit
let args = CommandLine.arguments
guard args.count > 1, let img = NSImage(contentsOfFile: args[1]),
      let cg = img.cgImage(forProposedRect: nil, context: nil, hints: nil) else {
  FileHandle.standardError.write("cannot load image\\n".data(using: .utf8)!); exit(1)
}
let req = VNRecognizeTextRequest()
req.recognitionLevel = .accurate
req.usesLanguageCorrection = true
let handler = VNImageRequestHandler(cgImage: cg, options: [:])
try? handler.perform([req])
let lines = (req.results ?? []).compactMap { $0.topCandidates(1).first?.string }
print(lines.joined(separator: "\\n"))
`

let swiftChecked = false
let hasSwift = false
async function swiftAvailable(): Promise<boolean> {
  if (swiftChecked) return hasSwift
  swiftChecked = true
  try { await execFileAsync('swift', ['--version']); hasSwift = true } catch { hasSwift = false }
  return hasSwift
}

export const OcrTool = {
  definition: {
    name: 'ocr',
    description:
      'Extract text from an image file (screenshot, scan, photo) using on-device macOS Vision OCR. ' +
      'Use when you need the literal text out of an image rather than a visual description.',
    input_schema: {
      type: 'object',
      properties: { path: { type: 'string', description: 'Absolute path (or ~) to an image file' } },
      required: ['path'],
    },
  },

  async execute({ path: imgPath }: any) {
    const resolved = resolve(imgPath)
    if (!(await swiftAvailable())) {
      return 'OCR needs the Swift toolchain (install Xcode Command Line Tools: xcode-select --install). ' +
        'Alternatively, read the image directly with read_file and describe it.'
    }
    const script = path.join(os.tmpdir(), `macvis-ocr-${Date.now()}.swift`)
    try {
      await fs.writeFile(script, SWIFT_SRC)
      const { stdout } = await execFileAsync('swift', [script, resolved], { timeout: 60000, maxBuffer: 1024 * 1024 * 8 })
      await fs.unlink(script).catch(() => {})
      const text = stdout.trim()
      return text || '(no text detected in the image)'
    } catch (err: any) {
      await fs.unlink(script).catch(() => {})
      return `OCR failed: ${err.message || String(err)}`
    }
  },
}
