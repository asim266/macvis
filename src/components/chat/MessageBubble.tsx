import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { ToolCallCard } from './ToolCallCard'
import type { Message } from '../../stores/chatStore'

interface Props {
  message: Message
  isStreaming?: boolean
}

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
            width: 22,
            height: 22,
            borderRadius: 6,
            background: 'linear-gradient(135deg, var(--accent) 0%, oklch(60% 0.15 30) 100%)',
            display: 'grid',
            placeItems: 'center',
            fontSize: 11,
            fontWeight: 700,
            color: 'oklch(15% 0 0)',
            fontFamily: 'var(--font-mono)',
            letterSpacing: 0,
            boxShadow: '0 1px 3px rgb(0 0 0 / 0.4), inset 0 1px 0 oklch(95% 0.05 55 / 0.3)',
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
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
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
