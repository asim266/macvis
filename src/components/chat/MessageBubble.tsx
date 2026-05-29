import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import hljs from 'highlight.js'
import 'highlight.js/styles/github-dark.css'
import { Copy, Check } from 'lucide-react'
import { ToolCallCard } from './ToolCallCard'
import type { Message } from '../../stores/chatStore'

interface Props {
  message: Message
  isStreaming?: boolean
}

function CodeBlock({ className, children }: any) {
  const [copied, setCopied] = useState(false)
  const text = String(children ?? '').replace(/\n$/, '')
  const lang = /language-(\w+)/.exec(className || '')?.[1]
  const isBlock = !!lang || text.includes('\n')
  if (!isBlock) {
    return <code style={{ background: 'var(--surface-3)', padding: '1px 5px', borderRadius: 4, fontFamily: 'var(--font-mono)', fontSize: '0.92em' }}>{children}</code>
  }
  let html = ''
  try { html = lang && hljs.getLanguage(lang) ? hljs.highlight(text, { language: lang }).value : hljs.highlightAuto(text).value }
  catch { html = text.replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c] as string)) }
  const copy = () => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500) }
  return (
    <div style={{ position: 'relative', margin: '10px 0', border: '1px solid var(--line-1)', borderRadius: 8, overflow: 'hidden', background: '#0d1117' }}>
      <button onClick={copy} title="Copy" style={{ position: 'absolute', top: 6, right: 6, zIndex: 1, display: 'flex', alignItems: 'center', gap: 4, padding: '4px 8px', borderRadius: 6, border: '1px solid var(--line-2)', background: 'var(--surface-3)', color: copied ? 'var(--ok)' : 'var(--ink-3)', fontSize: 10.5, cursor: 'pointer', fontFamily: 'var(--font-mono)' }}>
        {copied ? <Check size={11} /> : <Copy size={11} />}{lang || 'code'}
      </button>
      <pre style={{ margin: 0, padding: '12px 14px', overflow: 'auto', fontSize: 12, lineHeight: 1.55, fontFamily: 'var(--font-mono)' }}>
        <code className={`hljs ${className || ''}`} dangerouslySetInnerHTML={{ __html: html }} />
      </pre>
    </div>
  )
}

const MD_COMPONENTS = { code: CodeBlock }

export function MessageBubble({ message, isStreaming }: Props) {
  if (message.role === 'user') {
    return (
      <div className="fade-up" style={{ display: 'flex', justifyContent: 'flex-end', margin: '14px 0' }}>
        <div
          style={{
            background: 'var(--surface-2)',
            border: '1px solid var(--line-1)',
            borderRadius: '14px 14px 4px 14px',
            padding: '10px 14px',
            maxWidth: '78%',
            fontSize: 13.5,
            lineHeight: 1.55,
            color: 'var(--ink-1)',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}
          className="selectable"
        >
          {message.content}
        </div>
      </div>
    )
  }

  return (
    <div className="fade-up" style={{ margin: '20px 0' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <div
          style={{
            width: 24,
            height: 24,
            borderRadius: 7,
            background: 'linear-gradient(135deg, var(--accent-bright) 0%, var(--accent-grad-end) 100%)',
            display: 'grid',
            placeItems: 'center',
            fontSize: 11,
            fontWeight: 700,
            color: 'var(--accent-text-on)',
            fontFamily: 'var(--font-mono)',
            letterSpacing: 0,
            boxShadow: '0 2px 6px var(--accent-glow), inset 0 1px 0 var(--accent-inset)',
          }}
        >
          M
        </div>
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: 'var(--ink-2)',
            fontFamily: 'var(--font-mono)',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
          }}
        >
          macvis
        </span>
        {isStreaming && (
          <span
            style={{
              fontSize: 10,
              color: 'var(--ink-4)',
              fontFamily: 'var(--font-mono)',
              letterSpacing: '0.04em',
            }}
            className="pulse-soft"
          >
            thinking…
          </span>
        )}
      </div>

      {/* Tool calls */}
      {message.toolCalls?.map(tc => (
        <ToolCallCard key={tc.id} toolCall={tc} />
      ))}

      {/* Content */}
      {message.content && (
        <div
          style={{
            fontSize: 13.5,
            lineHeight: 1.65,
            color: 'var(--ink-1)',
            marginTop: message.toolCalls?.length ? 10 : 0,
          }}
          className="selectable prose"
        >
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={MD_COMPONENTS}>{message.content}</ReactMarkdown>
        </div>
      )}

      {isStreaming && !message.content && !message.toolCalls?.length && (
        <div
          style={{
            color: 'var(--ink-4)',
            fontSize: 13,
            display: 'flex',
            gap: 4,
          }}
          className="pulse-soft"
        >
          <span style={{ width: 6, height: 6, borderRadius: 999, background: 'var(--ink-3)', display: 'inline-block', marginTop: 8 }} />
          <span style={{ width: 6, height: 6, borderRadius: 999, background: 'var(--ink-3)', display: 'inline-block', marginTop: 8, animationDelay: '0.2s' }} />
          <span style={{ width: 6, height: 6, borderRadius: 999, background: 'var(--ink-3)', display: 'inline-block', marginTop: 8, animationDelay: '0.4s' }} />
        </div>
      )}
    </div>
  )
}
