import { useEffect, useRef, useState, useCallback } from 'react'
import { Plus, X } from 'lucide-react'
import { useChatStore } from '../stores/chatStore'
import { useConfigStore } from '../stores/configStore'
import { MessageBubble } from '../components/chat/MessageBubble'
import { ChatInput } from '../components/chat/ChatInput'

const QUICK_PROMPTS = [
  'List my GitHub repos',
  'What changed in my Downloads today?',
  'Build a landing page for a SaaS',
]

export function Chat() {
  const {
    sessions, activeSessionId, isStreaming, streamingMessageId,
    createSession, setActiveSession,
    addMessage, appendStream, addOrUpdateToolCall,
    setStreaming, setStreamingMessageId,
  } = useChatStore()

  const { load, loaded } = useConfigStore()
  const bottomRef = useRef<HTMLDivElement>(null)
  const [noApiKey, setNoApiKey] = useState(false)

  const activeSession = sessions.find(s => s.id === activeSessionId)

  useEffect(() => { if (!loaded) load() }, [loaded, load])
  useEffect(() => { if (sessions.length === 0) createSession() }, [sessions.length, createSession])
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
          name: data.name, input: data.input, result: data.result, status: data.status,
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
    if (activeSessionId) window.macvis.agent.stop(activeSessionId)
  }, [activeSessionId])

  const isEmpty = !activeSession?.messages.length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Session tabs */}
      <div
        style={{
          height: 40,
          borderBottom: '1px solid var(--line-1)',
          background: 'var(--surface-1)',
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          padding: '0 16px',
          flexShrink: 0,
          overflowX: 'auto',
        }}
      >
        {sessions.map(session => (
          <button
            key={session.id}
            onClick={() => setActiveSession(session.id)}
            style={{
              padding: '6px 12px',
              borderRadius: 7,
              border: '1px solid',
              borderColor: session.id === activeSessionId ? 'var(--line-2)' : 'transparent',
              background: session.id === activeSessionId ? 'var(--surface-3)' : 'transparent',
              color: session.id === activeSessionId ? 'var(--ink-1)' : 'var(--ink-3)',
              fontSize: 12,
              fontWeight: 500,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              maxWidth: 180,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              transition: 'all 120ms var(--ease)',
            }}
          >
            {session.title}
          </button>
        ))}
        <button
          onClick={createSession}
          title="New chat ⌘N"
          style={{
            width: 24, height: 24, borderRadius: 6,
            background: 'transparent', border: 'none', cursor: 'pointer',
            color: 'var(--ink-3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 120ms var(--ease)',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = 'var(--surface-3)'
            e.currentTarget.style.color = 'var(--ink-1)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'transparent'
            e.currentTarget.style.color = 'var(--ink-3)'
          }}
        >
          <Plus size={14} />
        </button>
      </div>

      {/* Messages or empty state */}
      <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
        <div style={{ maxWidth: 760, margin: '0 auto', padding: '28px 32px', minHeight: '100%' }}>
          {noApiKey && (
            <div
              style={{
                background: 'oklch(68% 0.18 22 / 0.08)',
                border: '1px solid oklch(68% 0.18 22 / 0.4)',
                borderRadius: 10,
                padding: '12px 16px',
                marginBottom: 20,
                fontSize: 13,
                color: 'var(--err)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}
            >
              <span>
                No Anthropic API key. Open <strong style={{ fontWeight: 600 }}>Settings → API Keys</strong> to add one.
              </span>
              <button onClick={() => setNoApiKey(false)} style={{ background: 'none', border: 'none', color: 'var(--err)', cursor: 'pointer', display: 'flex' }}>
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
                minHeight: 'calc(100vh - 160px)',
                gap: 0,
              }}
            >
              <div
                style={{
                  width: 56, height: 56, borderRadius: 16,
                  background: 'linear-gradient(135deg, var(--accent) 0%, oklch(58% 0.18 25) 100%)',
                  display: 'grid', placeItems: 'center',
                  fontSize: 26, fontWeight: 700,
                  color: 'oklch(15% 0 0)',
                  fontFamily: 'var(--font-mono)',
                  boxShadow: '0 0 60px -10px var(--accent-line), inset 0 1px 0 oklch(95% 0.05 55 / 0.3)',
                  marginBottom: 24,
                }}
              >
                M
              </div>
              <h1 style={{ fontSize: 24, fontWeight: 600, color: 'var(--ink-1)', letterSpacing: '-0.025em', marginBottom: 6 }}>
                What can I do for you?
              </h1>
              <p style={{ fontSize: 13, color: 'var(--ink-3)', maxWidth: 380, lineHeight: 1.6, marginBottom: 28 }}>
                Local-first AI with full Mac access. Ask me to write code, deploy a site, list files, draft emails — anything.
              </p>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center', maxWidth: 540 }}>
                {QUICK_PROMPTS.map(p => (
                  <button
                    key={p}
                    onClick={() => handleSend(p)}
                    style={{
                      padding: '7px 13px',
                      background: 'var(--surface-2)',
                      border: '1px solid var(--line-1)',
                      borderRadius: 999,
                      fontSize: 12,
                      color: 'var(--ink-2)',
                      cursor: 'pointer',
                      transition: 'all 150ms var(--ease)',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.borderColor = 'var(--line-2)'
                      e.currentTarget.style.color = 'var(--ink-1)'
                      e.currentTarget.style.background = 'var(--surface-3)'
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.borderColor = 'var(--line-1)'
                      e.currentTarget.style.color = 'var(--ink-2)'
                      e.currentTarget.style.background = 'var(--surface-2)'
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
