import fs from 'fs/promises'
import path from 'path'

function resolve(p: string): string {
  return p.startsWith('~') ? p.replace('~', process.env.HOME || '') : p
}

async function makeDocx(filePath: string, content: string): Promise<string> {
  const { Document, Packer, Paragraph, HeadingLevel } = require('docx')
  const children = (content || '').split('\n').map((line: string) => {
    const t = line.trimEnd()
    if (t.startsWith('### ')) return new Paragraph({ text: t.slice(4), heading: HeadingLevel.HEADING_3 })
    if (t.startsWith('## ')) return new Paragraph({ text: t.slice(3), heading: HeadingLevel.HEADING_2 })
    if (t.startsWith('# ')) return new Paragraph({ text: t.slice(2), heading: HeadingLevel.HEADING_1 })
    if (/^[-*] /.test(t)) return new Paragraph({ text: t.slice(2), bullet: { level: 0 } })
    return new Paragraph(t)
  })
  const doc = new Document({ sections: [{ children }] })
  const buf = await Packer.toBuffer(doc)
  await fs.writeFile(filePath, buf)
  return `Created Word document: ${filePath}`
}

function makeXlsx(filePath: string, sheets: any[], content?: string): string {
  const XLSX = require('xlsx')
  const wb = XLSX.utils.book_new()
  let added = 0
  if (Array.isArray(sheets) && sheets.length) {
    for (const s of sheets) {
      const rows = s.rows || []
      const ws = XLSX.utils.aoa_to_sheet(rows)
      XLSX.utils.book_append_sheet(wb, ws, (s.name || `Sheet${++added}`).slice(0, 31))
    }
  } else if (content) {
    const rows = content.split('\n').map(l => l.split(','))
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), 'Sheet1')
  } else {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['']]), 'Sheet1')
  }
  XLSX.writeFile(wb, filePath)
  return `Created spreadsheet: ${filePath}`
}

async function makePptx(filePath: string, slides: any[], content?: string): Promise<string> {
  const pptxgen = require('pptxgenjs')
  const pptx = new pptxgen()
  let list = slides
  if ((!list || !list.length) && content) {
    list = content.split(/\n(?=# )/).map(block => {
      const lines = block.split('\n').filter(Boolean)
      const title = (lines[0] || '').replace(/^#\s*/, '')
      const bullets = lines.slice(1).map(l => l.replace(/^[-*]\s*/, ''))
      return { title, bullets }
    })
  }
  for (const s of (list || [{ title: 'Slide', bullets: [] }])) {
    const slide = pptx.addSlide()
    slide.addText(s.title || '', { x: 0.5, y: 0.3, w: 9, fontSize: 28, bold: true })
    if (s.bullets?.length) slide.addText(s.bullets.map((b: string) => ({ text: b, options: { bullet: true } })), { x: 0.5, y: 1.3, w: 9, h: 4, fontSize: 18 })
  }
  await pptx.writeFile({ fileName: filePath })
  return `Created presentation: ${filePath}`
}

export const CreateDocumentTool = {
  definition: {
    name: 'create_document',
    description:
      'Create a real Office document on disk: Word (.docx), Excel (.xlsx), or PowerPoint (.pptx) — plus plain txt/md/csv. ' +
      'For docx/pptx pass markdown-ish `content` (# headings, - bullets) or structured `slides`. For xlsx pass `sheets` ' +
      '([{name, rows:[[...]]}]) or csv `content`.',
    input_schema: {
      type: 'object',
      properties: {
        type: { type: 'string', enum: ['docx', 'xlsx', 'pptx', 'txt', 'md', 'csv'] },
        path: { type: 'string', description: 'Output path (extension should match type)' },
        content: { type: 'string', description: 'Markdown/text body (docx/pptx/txt/md) or CSV text (xlsx/csv)' },
        sheets: { type: 'array', description: 'xlsx: [{name, rows:[[cell,...]]}]', items: { type: 'object', properties: { name: { type: 'string' }, rows: { type: 'array', items: { type: 'array', items: {} } } } } },
        slides: { type: 'array', description: 'pptx: [{title, bullets:[...]}]', items: { type: 'object', properties: { title: { type: 'string' }, bullets: { type: 'array', items: { type: 'string' } } } } },
      },
      required: ['type', 'path'],
    },
  },

  async execute({ type, path: filePath, content, sheets, slides }: any) {
    const resolved = resolve(filePath)
    await fs.mkdir(path.dirname(resolved), { recursive: true })
    try {
      switch (type) {
        case 'docx': return await makeDocx(resolved, content || '')
        case 'xlsx': return makeXlsx(resolved, sheets, content)
        case 'pptx': return await makePptx(resolved, slides, content)
        case 'txt': case 'md': case 'csv':
          await fs.writeFile(resolved, content || '')
          return `Created ${type} file: ${resolved}`
        default: return `Unknown document type: ${type}`
      }
    } catch (err: any) {
      return `Failed to create ${type}: ${err.message || String(err)}`
    }
  },
}
