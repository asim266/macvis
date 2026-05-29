import { extractText } from '../documents/extract'

export const DocumentTool = {
  definition: {
    name: 'document',
    description:
      'Extract readable text from a document so you can read or summarize it: PDF, Word (.docx/.doc), RTF, HTML, ' +
      'Excel/spreadsheets (.xlsx/.xls → CSV), and plain text/code. Use this before answering questions about a file ' +
      'the user points to. For very large files, narrow with read_file afterward.',
    input_schema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Absolute path (or ~) to the document' },
        max_chars: { type: 'number', description: 'Truncate output (default 200000)' },
      },
      required: ['path'],
    },
  },

  async execute({ path: filePath, max_chars }: any) {
    const text = await extractText(filePath, max_chars || 200_000)
    if (!text.trim()) return '(no extractable text in this document)'
    return text
  },
}
