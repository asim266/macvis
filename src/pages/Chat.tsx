import { useEffect, useRef, useState, useCallback } from 'react'
import { X } from 'lucide-react'
import { useChatStore } from '../stores/chatStore'
import { useConfigStore } from '../stores/configStore'

// expose chat store globally for agent done events
declare const window: any
import { MessageBubble } from '../components/chat/MessageBubble'
import { ChatInput } from '../components/chat/ChatInput'

const QUICK_PROMPTS = [
  'List my GitHub repos',
  'What changed in my Downloads today?',
  'Build a landing page for a SaaS',
  'Summarize the news from this week',
]

export function Chat() {
  const {
    sessions, activeSessionId, isStreaming, streamingMessageId,
    createSession,
    addMessage, appendStream, addOrUpdateToolCall,
    setStreaming, setStreamingMessageId,
  } = useChatStore()

  const { load, loaded } = useConfigStore()
  const sessionsLoaded = useChatStore(s => s.sessionsLoaded)
  const bottomRef = useRef<HTMLDivElement>(null)
  const [noApiKey, setNoApiKey] = useState(false)

  const activeSession = sessions.find(s => s.id === activeSessionId)

  useEffect(() => { if (!loaded) load() }, [loaded, load])
  // Only create a session after persistence has loaded AND there are zero sessions
  useEffect(() => {
    if (sessionsLoaded && sessions.length === 0) createSession()
  }, [sessionsLoaded, sessions.length, createSession])
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
      if (data.sessionId !== activeSessionId) return
      if (data.type === 'text') {
        appendStream(activeSessionId, assistantId, data.content)
      } else if (data.type === 'reset') {
        // Provider failed mid-stream; wipe the partial assistant content for fallback
        useChatStore.getState().resetMessageContent(activeSessionId, assistantId)
      }
    }))

    unsubs.push(window.macvis.agent.onToolCall((data: any) => {
      if (data.sessionId === activeSessionId) {
        addOrUpdateToolCall(activeSessionId, assistantId, {
          id: data.id,
          name: data.name, input: data.input, result: data.result, status: data.status,
        })
      }
    }))

    unsubs.push(window.macvis.agent.onDone((data: any) => {
      if (data.sessionId === activeSessionId) {
        setStreaming(false)
        setStreamingMessageId(null)
        if (data.title) {
          useChatStore.getState().updateSessionTitle(activeSessionId, data.title)
        }
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
    if (activeSessionId) window.macvis.agent.stop(activeSessionId)
  }, [activeSessionId])

  const isEmpty = !activeSession?.messages.length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }}>
      {/* Drag region across the top */}
      <div
        className="drag-region"
        style={{
          height: 38,
          flexShrink: 0,
          background: 'var(--surface-2)',
          borderBottom: isEmpty ? 'none' : '1px solid var(--line-1)',
          display: 'flex',
          alignItems: 'center',
          padding: '0 24px',
          fontSize: 12.5,
          color: 'var(--ink-3)',
          letterSpacing: '-0.005em',
          fontWeight: 500,
        }}
      >
        {!isEmpty && (
          <span style={{
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%',
          }}>
            {activeSession?.title || 'New chat'}
          </span>
        )}
      </div>

      {/* Decorative red glow in background (only on empty state) */}
      {isEmpty && (
        <div
          className="bg-glow"
          style={{
            top: '40%', left: '50%',
            transform: 'translate(-50%, -50%)',
            opacity: 0.25,
          }}
        />
      )}

      {/* Messages or empty state */}
      <div style={{ flex: 1, overflowY: 'auto', minHeight: 0, position: 'relative', zIndex: 1 }}>
        <div style={{ maxWidth: 760, margin: '0 auto', padding: '24px 32px', minHeight: '100%' }}>
          {noApiKey && (
            <div
              style={{
                background: 'var(--accent-soft)',
                border: '1px solid var(--accent-line)',
                borderRadius: 10,
                padding: '12px 16px',
                marginBottom: 20,
                fontSize: 13,
                color: 'var(--accent-bright)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}
              className="fade-up"
            >
              <span>
                No Anthropic API key. Open <strong style={{ fontWeight: 600 }}>Settings → API Keys</strong> to add one.
              </span>
              <button onClick={() => setNoApiKey(false)} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', display: 'flex' }}>
                <X size={14} />
              </button>
            </div>
          )}

          {isEmpty ? (
            <div
              className="fade-up"
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                minHeight: 'calc(100vh - 200px)',
              }}
            >
              <div
                style={{
                  width: 64, height: 64, borderRadius: 18,
                  background: 'linear-gradient(135deg, var(--accent-bright) 0%, var(--accent-grad-end) 100%)',
                  display: 'grid', placeItems: 'center',
                  fontSize: 30, fontWeight: 700,
                  color: 'var(--accent-text-on)',
                  fontFamily: 'var(--font-mono)',
                  boxShadow: '0 0 80px -10px var(--accent-glow), 0 8px 24px oklch(0% 0 0 / 0.4), inset 0 1px 0 var(--accent-inset)',
                  marginBottom: 22,
                }}
              >
                M
              </div>
              <h1 style={{
                fontSize: 26,
                fontWeight: 600,
                color: 'var(--ink-1)',
                letterSpacing: '-0.025em',
                marginBottom: 8,
              }}>
                What can I do for you?
              </h1>
              <p style={{
                fontSize: 13.5,
                color: 'var(--ink-3)',
                maxWidth: 420,
                lineHeight: 1.6,
                marginBottom: 32,
              }}>
                Local-first AI with full Mac access. Ask me to write code, deploy a site, list files, draft emails — anything.
              </p>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: 8,
                width: '100%',
                maxWidth: 560,
              }}>
                {QUICK_PROMPTS.map((p, i) => (
                  <button
                    key={p}
                    onClick={() => handleSend(p)}
                    style={{
                      padding: '10px 14px',
                      background: 'var(--surface-3)',
                      border: '1px solid var(--line-1)',
                      borderRadius: 10,
                      fontSize: 12.5,
                      color: 'var(--ink-2)',
                      cursor: 'pointer',
                      textAlign: 'left',
                      lineHeight: 1.4,
                      transition: 'all 150ms var(--ease)',
                      animation: `fade-up 300ms ${100 + i * 50}ms var(--ease) both`,
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.borderColor = 'var(--accent-line)'
                      e.currentTarget.style.color = 'var(--ink-1)'
                      e.currentTarget.style.background = 'var(--surface-4)'
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.borderColor = 'var(--line-1)'
                      e.currentTarget.style.color = 'var(--ink-2)'
                      e.currentTarget.style.background = 'var(--surface-3)'
                    }}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {activeSession?.messages.map(msg => (
                <MessageBubble
                  key={msg.id}
                  message={msg}
                  isStreaming={isStreaming && msg.id === streamingMessageId}
                />
              ))}
              <div ref={bottomRef} />
            </>
          )}
        </div>
      </div>

      <ChatInput onSend={handleSend} onStop={handleStop} isStreaming={isStreaming} />
    </div>
  )
}
