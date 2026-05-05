import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { ToolCallCard } from './ToolCallCard'
import type { Message } from '../../stores/chatStore'

interface Props {
  message: Message
  isStreaming?: boolean
}

export function MessageBubble({ message, isStreaming }: Props) {
  const isUser = message.role === 'user'

  if (isUser) {
    return (
      <div className="flex justify-end mb-4">
        <div
          style={{
            background: 'var(--bg-tertiary)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            padding: '10px 14px',
            maxWidth: '75%',
            fontSize: 14,
            lineHeight: 1.6,
            color: 'var(--text-primary)',
          }}
          className="selectable"
        >
          {message.content}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col mb-6">
      <div className="flex items-center gap-2 mb-2">
        <span style={{ fontSize: 16 }}>🦞</span>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>MacVis</span>
        {isStreaming && (
          <span style={{ fontSize: 11, color: 'var(--warning)' }}>typing...</span>
        )}
      </div>

      {message.toolCalls?.map(tc => (
        <ToolCallCard key={tc.id} toolCall={tc} />
      ))}

      {message.content && (
        <div
          style={{ fontSize: 14, lineHeight: 1.8, color: 'var(--text-primary)' }}
          className="selectable prose"
        >
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {message.content}
          </ReactMarkdown>
        </div>
      )}

      {isStreaming && !message.content && !message.toolCalls?.length && (
        <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>
          <span className="animate-pulse">●</span>
        </div>
      )}
    </div>
  )
}
