import { useState, useRef, useEffect } from 'react'
import { Send, Square } from 'lucide-react'

interface Props {
  onSend: (message: string) => void
  onStop: () => void
  isStreaming: boolean
  disabled?: boolean
}

export function ChatInput({ onSend, onStop, isStreaming, disabled }: Props) {
  const [value, setValue] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + 'px'
    }
  }, [value])

  const handleSend = () => {
    const trimmed = value.trim()
    if (!trimmed || isStreaming) return
    onSend(trimmed)
    setValue('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div
      style={{
        borderTop: '1px solid var(--border)',
        padding: '12px 16px',
        background: 'var(--bg-primary)',
      }}
    >
      <div
        className="flex items-end gap-3"
        style={{
          background: 'var(--bg-tertiary)',
          border: '1px solid var(--border-bright)',
          borderRadius: 12,
          padding: '10px 14px',
        }}
      >
        <textarea
          ref={textareaRef}
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Message MacVis...  (⌘↵ to send)"
          disabled={disabled}
          rows={1}
          style={{
            flex: 1,
            background: 'transparent',
            border: 'none',
            outline: 'none',
            resize: 'none',
            color: 'var(--text-primary)',
            fontSize: 14,
            lineHeight: 1.6,
            fontFamily: 'inherit',
          }}
          className="selectable"
        />
        <button
          onClick={isStreaming ? onStop : handleSend}
          disabled={!isStreaming && (!value.trim() || !!disabled)}
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            border: 'none',
            background: isStreaming ? 'var(--error)' : value.trim() ? 'var(--accent)' : 'var(--bg-elevated)',
            color: 'white',
            cursor: isStreaming || value.trim() ? 'pointer' : 'default',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            transition: 'background 150ms',
          }}
        >
          {isStreaming ? <Square size={14} fill="white" /> : <Send size={14} />}
        </button>
      </div>
    </div>
  )
}
