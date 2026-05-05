import { Loader, CheckCircle2, AlertCircle } from 'lucide-react'
import type { ToolCall } from '../../stores/chatStore'

const STATUS_COLOR = {
  running: 'var(--warn)',
  done: 'var(--ok)',
  error: 'var(--err)',
} as const

export function ToolCallCard({ toolCall }: { toolCall: ToolCall }) {
  const color = STATUS_COLOR[toolCall.status] || 'var(--ink-3)'
  const Icon = toolCall.status === 'running' ? Loader : toolCall.status === 'done' ? CheckCircle2 : AlertCircle

  const meta =
    toolCall.input?.command ||
    toolCall.input?.path ||
    toolCall.input?.query ||
    (toolCall.input ? Object.keys(toolCall.input)[0] : '')

  return (
    <div
      style={{
        background: 'var(--surface-2)',
        border: '1px solid var(--line-1)',
        borderRadius: 8,
        margin: '6px 0',
        overflow: 'hidden',
        fontFamily: 'var(--font-mono)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '8px 12px',
          borderBottom: toolCall.result ? '1px solid var(--line-1)' : 'none',
          background: 'var(--surface-3)',
        }}
      >
        <Icon
          size={12}
          style={{ color, flexShrink: 0 }}
          className={toolCall.status === 'running' ? 'spin' : ''}
        />
        <span
          style={{
            fontSize: 11.5,
            fontWeight: 600,
            color: 'var(--ink-1)',
            letterSpacing: '-0.005em',
          }}
        >
          {toolCall.name}
        </span>
        {meta && (
          <span
            style={{
              fontSize: 11,
              color: 'var(--ink-3)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              maxWidth: 380,
            }}
          >
            {toolCall.name === 'bash' ? '$ ' : ''}
            {String(meta).slice(0, 80)}
          </span>
        )}
        <span
          style={{
            marginLeft: 'auto',
            fontSize: 9.5,
            fontWeight: 600,
            color,
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
          }}
        >
          {toolCall.status}
        </span>
      </div>
      {toolCall.result && (
        <pre
          style={{
            margin: 0,
            padding: '10px 12px',
            fontSize: 11.5,
            lineHeight: 1.6,
            color: 'var(--ink-2)',
            maxHeight: 220,
            overflow: 'auto',
            background: 'var(--surface-1)',
            border: 'none',
            borderRadius: 0,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            fontFamily: 'var(--font-mono)',
          }}
          className="selectable"
        >
          {String(toolCall.result).slice(0, 1500)}
          {String(toolCall.result).length > 1500 ? '\n… (truncated)' : ''}
        </pre>
      )}
    </div>
  )
}
