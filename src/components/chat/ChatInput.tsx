import { useState, useRef, useEffect } from 'react'
import { ArrowUp, Square } from 'lucide-react'

interface Props {
  onSend: (message: string) => void
  onStop: () => void
  isStreaming: boolean
  disabled?: boolean
}

export function ChatInput({ onSend, onStop, isStreaming, disabled }: Props) {
  const [value, setValue] = useState('')
  const [focused, setFocused] = useState(false)
  const ref = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (ref.current) {
      ref.current.style.height = 'auto'
      ref.current.style.height = Math.min(ref.current.scrollHeight, 200) + 'px'
    }
  }, [value])

  const send = () => {
    const t = value.trim()
    if (!t || isStreaming) return
    onSend(t)
    setValue('')
  }

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      send()
    } else if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  const canSend = !!value.trim() && !disabled

  return (
    <div
      style={{
        padding: '14px 24px 18px',
        background: 'linear-gradient(180deg, transparent 0%, var(--surface-1) 30%)',
        flexShrink: 0,
      }}
    >
      <div
        style={{
          maxWidth: 760,
          margin: '0 auto',
          background: 'var(--surface-2)',
          border: `1px solid ${focused ? 'var(--line-3)' : 'var(--line-2)'}`,
          borderRadius: 12,
          padding: '12px 14px 10px',
          transition: 'border-color 150ms var(--ease), box-shadow 150ms var(--ease)',
          boxShadow: focused
            ? '0 0 0 3px var(--accent-soft), 0 4px 16px -4px rgb(0 0 0 / 0.4)'
            : '0 4px 16px -4px rgb(0 0 0 / 0.4)',
        }}
      >
        <textarea
          ref={ref}
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={onKey}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder="Ask MacVis anything…"
          disabled={disabled}
          rows={1}
          style={{
            width: '100%',
            minHeight: 22,
            background: 'transparent',
            border: 'none',
            outline: 'none',
            resize: 'none',
            color: 'var(--ink-1)',
            fontSize: 14,
            lineHeight: 1.55,
            fontFamily: 'var(--font-display)',
            letterSpacing: '-0.005em',
          }}
          className="selectable"
        />
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: 8,
          }}
        >
          <div
            style={{
              fontSize: 10.5,
              color: 'var(--ink-4)',
              fontFamily: 'var(--font-mono)',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
            }}
          >
            ↵ to send · ⇧↵ for newline
          </div>
          <button
            onClick={isStreaming ? onStop : send}
            disabled={!isStreaming && !canSend}
            style={{
              width: 30,
              height: 30,
              borderRadius: 8,
              border: 'none',
              background: isStreaming
                ? 'var(--err)'
                : canSend
                  ? 'var(--accent)'
                  : 'var(--surface-3)',
              color: isStreaming || canSend ? 'oklch(98% 0 0)' : 'var(--ink-4)',
              cursor: isStreaming || canSend ? 'pointer' : 'default',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 120ms var(--ease)',
              boxShadow:
                isStreaming || canSend
                  ? 'inset 0 1px 0 0 oklch(95% 0.05 25 / 0.35), 0 1px 3px oklch(0% 0 0 / 0.4), 0 0 12px var(--accent-glow)'
                  : 'none',
            }}
          >
            {isStreaming ? <Square size={11} fill="currentColor" /> : <ArrowUp size={14} strokeWidth={2.5} />}
          </button>
        </div>
      </div>
    </div>
  )
}
