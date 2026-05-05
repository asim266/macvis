import { useEffect, useRef, useState, useCallback } from 'react'
import { Plus } from 'lucide-react'
import { useChatStore } from '../stores/chatStore'
import { useConfigStore } from '../stores/configStore'
import { MessageBubble } from '../components/chat/MessageBubble'
import { ChatInput } from '../components/chat/ChatInput'

export function Chat() {
  const {
    sessions,
    activeSessionId,
    isStreaming,
    streamingMessageId,
    createSession,
    setActiveSession,
    addMessage,
    appendStream,
    addOrUpdateToolCall,
    setStreaming,
    setStreamingMessageId,
  } = useChatStore()

  const { load, loaded } = useConfigStore()
  const bottomRef = useRef<HTMLDivElement>(null)
  const [noApiKey, setNoApiKey] = useState(false)

  const activeSession = sessions.find(s => s.id === activeSessionId)

  useEffect(() => {
    if (!loaded) load()
  }, [loaded, load])

  useEffect(() => {
    if (sessions.length === 0) createSession()
  }, [sessions.length, createSession])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [activeSession?.messages.length, activeSession?.messages[activeSession.messages.length - 1]?.content])

  const handleSend = useCallback(async (text: string) => {
    if (!activeSessionId) return

    const config = await window.macvis.config.get()
    if (!config?.apiKeys?.anthropic) {
      setNoApiKey(true)
      return
    }
    setNoApiKey(false)

    addMessage(activeSessionId, { role: 'user', content: text })
    const assistantId = addMessage(activeSessionId, { role: 'assistant', content: '' })
    setStreamingMessageId(assistantId)
    setStreaming(true)

    const unsubs: (() => void)[] = []

    unsubs.push(window.macvis.agent.onStream((data: any) => {
      if (data.sessionId === activeSessionId && data.type === 'text') {
        appendStream(activeSessionId, assistantId, data.content)
      }
    }))

    unsubs.push(window.macvis.agent.onToolCall((data: any) => {
      if (data.sessionId === activeSessionId) {
        addOrUpdateToolCall(activeSessionId, assistantId, {
          name: data.name,
          input: data.input,
          result: data.result,
          status: data.status,
        })
      }
    }))

    unsubs.push(window.macvis.agent.onDone((data: any) => {
      if (data.sessionId === activeSessionId) {
        setStreaming(false)
        setStreamingMessageId(null)
        unsubs.forEach(u => u())
      }
    }))

    unsubs.push(window.macvis.agent.onError((data: any) => {
      if (data.sessionId === activeSessionId) {
        appendStream(activeSessionId, assistantId, `\n\n**Error:** ${data.error}`)
        setStreaming(false)
        setStreamingMessageId(null)
        unsubs.forEach(u => u())
      }
    }))

    await window.macvis.agent.run(text, activeSessionId)
  }, [activeSessionId, addMessage, appendStream, addOrUpdateToolCall, setStreaming, setStreamingMessageId])

  const handleStop = useCallback(() => {
    if (activeSessionId) {
      window.macvis.agent.stop(activeSessionId)
    }
  }, [activeSessionId])

  return (
    <div className="flex flex-col h-full">
      {/* Session tabs */}
      <div
        className="flex items-center gap-1 px-3 overflow-x-auto"
        style={{
          height: 40,
          borderBottom: '1px solid var(--border)',
          background: 'var(--bg-secondary)',
          flexShrink: 0,
        }}
      >
        {sessions.map(session => (
          <button
            key={session.id}
            onClick={() => setActiveSession(session.id)}
            style={{
              padding: '4px 12px',
              borderRadius: 6,
              border: 'none',
              background: session.id === activeSessionId ? 'var(--bg-elevated)' : 'transparent',
              color: session.id === activeSessionId ? 'var(--text-primary)' : 'var(--text-muted)',
              fontSize: 12,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              maxWidth: 160,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {session.title}
          </button>
        ))}
        <button
          onClick={createSession}
          style={{
            padding: '4px 8px',
            borderRadius: 6,
            border: 'none',
            background: 'transparent',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
          }}
          title="New chat ⌘N"
        >
          <Plus size={14} />
        </button>
      </div>

      {/* Messages */}
      <div
        className="flex-1 overflow-y-auto"
        style={{ padding: '24px 32px', minHeight: 0 }}
      >
        {noApiKey && (
          <div
            style={{
              background: 'rgba(248, 113, 113, 0.1)',
              border: '1px solid var(--error)',
              borderRadius: 8,
              padding: '12px 16px',
              marginBottom: 16,
              fontSize: 13,
              color: 'var(--error)',
            }}
          >
            No Anthropic API key set. Go to <strong>Settings → API Keys</strong> and add your key.
          </div>
        )}

        {!activeSession?.messages.length && (
          <div
            className="flex flex-col items-center justify-center h-full"
            style={{ color: 'var(--text-muted)', gap: 8 }}
          >
            <span style={{ fontSize: 32 }}>🦞</span>
            <span style={{ fontSize: 15, fontWeight: 500, color: 'var(--text-secondary)' }}>MacVis</span>
            <span style={{ fontSize: 13 }}>Your local AI assistant. Ask me anything.</span>
          </div>
        )}

        {activeSession?.messages.map(msg => (
          <MessageBubble
            key={msg.id}
            message={msg}
            isStreaming={isStreaming && msg.id === streamingMessageId}
          />
        ))}
        <div ref={bottomRef} />
      </div>

      <ChatInput
        onSend={handleSend}
        onStop={handleStop}
        isStreaming={isStreaming}
      />
    </div>
  )
}
