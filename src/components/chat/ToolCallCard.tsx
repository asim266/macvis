import { Wrench, CheckCircle, AlertCircle, Loader } from 'lucide-react'
import type { ToolCall } from '../../stores/chatStore'

interface Props {
  toolCall: ToolCall
}

export function ToolCallCard({ toolCall }: Props) {
  return (
    <div
      style={{
        background: 'var(--bg-tertiary)',
        border: '1px solid var(--border)',
        borderRadius: 8,
        padding: '8px 12px',
        margin: '4px 0',
        fontSize: 13,
      }}
    >
      <div className="flex items-center gap-2" style={{ marginBottom: toolCall.result ? 8 : 0 }}>
        {toolCall.status === 'running' ? (
          <Loader size={13} className="animate-spin" style={{ color: 'var(--warning)' }} />
        ) : toolCall.status === 'done' ? (
          <CheckCircle size={13} style={{ color: 'var(--success)' }} />
        ) : (
          <AlertCircle size={13} style={{ color: 'var(--error)' }} />
        )}
        <span style={{ color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
          {toolCall.name}
        </span>
        {toolCall.input?.command && (
          <span style={{ color: 'var(--text-muted)', fontFamily: 'monospace', fontSize: 12 }}>
            {String(toolCall.input.command).slice(0, 60)}
          </span>
        )}
        <span
          style={{
            marginLeft: 'auto',
            fontSize: 11,
            color: toolCall.status === 'running' ? 'var(--warning)' : toolCall.status === 'done' ? 'var(--success)' : 'var(--error)',
          }}
        >
          {toolCall.status}
        </span>
      </div>
      {toolCall.result && (
        <pre
          style={{
            margin: 0,
            padding: '6px 8px',
            background: 'var(--bg-elevated)',
            borderRadius: 4,
            fontSize: 12,
            color: 'var(--text-secondary)',
            maxHeight: 200,
            overflow: 'auto',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}
          className="selectable"
        >
          {String(toolCall.result).slice(0, 2000)}
          {String(toolCall.result).length > 2000 ? '\n... (truncated)' : ''}
        </pre>
      )}
    </div>
  )
}
