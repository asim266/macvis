import fs from 'fs/promises'
import path from 'path'
import { execFile } from 'child_process'
import { promisify } from 'util'

const execFileAsync = promisify(execFile)

function resolve(p: string): string {
  return p.startsWith('~') ? p.replace('~', process.env.HOME || '') : p
}

const TEXTUTIL_EXT = new Set(['.docx', '.doc', '.rtf', '.rtfd', '.html', '.htm', '.odt', '.webarchive'])
const PLAIN_EXT = new Set(['.txt', '.md', '.markdown', '.json', '.csv', '.tsv', '.log', '.yml', '.yaml', '.xml', '.ts', '.tsx', '.js', '.jsx', '.py', '.go', '.rs', '.java', '.c', '.cpp', '.h', '.css', '.sh'])
const SHEET_EXT = new Set(['.xlsx', '.xls', '.xlsm'])

/** Extract readable text from a document (pdf, docx, xlsx, csv, code, etc.). */
export async function extractText(filePath: string, maxChars = 200_000): Promise<string> {
  const file = resolve(filePath)
  const ext = path.extname(file).toLowerCase()

  // PDF
  if (ext === '.pdf') {
    try {
      const pdfParse = require('pdf-parse')
      const buf = await fs.readFile(file)
      const data = await pdfParse(buf)
      return (data.text || '').slice(0, maxChars)
    } catch (err: any) {
      return `[Could not parse PDF: ${err.message}]`
    }
  }

  // Word / RTF / HTML → textutil (macOS built-in)
  if (TEXTUTIL_EXT.has(ext)) {
    try {
      const { stdout } = await execFileAsync('textutil', ['-convert', 'txt', '-stdout', file], { maxBuffer: 1024 * 1024 * 32 })
      return stdout.slice(0, maxChars)
    } catch (err: any) {
      return `[Could not convert ${ext}: ${err.message}]`
    }
  }

  // Spreadsheets → CSV per sheet
  if (SHEET_EXT.has(ext)) {
    try {
      const XLSX = require('xlsx')
      const buf = await fs.readFile(file)
      const wb = XLSX.read(buf, { type: 'buffer' })
      const parts: string[] = []
      for (const name of wb.SheetNames) {
        parts.push(`# Sheet: ${name}\n` + XLSX.utils.sheet_to_csv(wb.Sheets[name]))
      }
      return parts.join('\n\n').slice(0, maxChars)
    } catch (err: any) {
      return `[Could not parse spreadsheet: ${err.message}]`
    }
  }

  // Plain text / code / csv
  if (PLAIN_EXT.has(ext) || ext === '') {
    try { return (await fs.readFile(file, 'utf-8')).slice(0, maxChars) } catch (err: any) { return `[Could not read file: ${err.message}]` }
  }

  // Fallback: best-effort utf-8
  try { return (await fs.readFile(file, 'utf-8')).slice(0, maxChars) }
  catch { return `[Unsupported file type: ${ext}]` }
}

export function isTextLike(filePath: string): boolean {
  const ext = path.extname(filePath).toLowerCase()
  return PLAIN_EXT.has(ext) || TEXTUTIL_EXT.has(ext) || SHEET_EXT.has(ext) || ext === '.pdf'
}
