import { useEffect, useRef, useState, useCallback } from 'react'
import { KeyRound, Settings as SettingsIcon, X } from 'lucide-react'
import { useChatStore } from '../stores/chatStore'
import { useConfigStore } from '../stores/configStore'
import type { Page } from '../App'

// expose chat store globally for agent done events
declare const window: any
import { MessageBubble } from '../components/chat/MessageBubble'
import { ChatInput } from '../components/chat/ChatInput'

// Renders a unified-diff (or plain code) block with +/- line coloring.
export function DiffBlock({ text }: { text: string }) {
  const body = (text || '').replace(/```diff\n?|```/g, '')
  const lines = body.split('\n')
  return (
    <pre style={{ margin: '0 0 10px', padding: '8px 10px', background: 'var(--surface-1)', border: '1px solid var(--line-1)', borderRadius: 6, fontSize: 11, whiteSpace: 'pre-wrap', wordBreak: 'break-word', maxHeight: 260, overflow: 'auto', fontFamily: 'var(--font-mono)', lineHeight: 1.5 }}>
      {lines.map((l, i) => {
        const add = l.startsWith('+'), del = l.startsWith('-')
        return <div key={i} style={{
          color: add ? 'var(--ok)' : del ? 'var(--err)' : 'var(--ink-3)',
          background: add ? 'oklch(72% 0.155 150 / 0.08)' : del ? 'oklch(68% 0.22 25 / 0.08)' : 'transparent',
        }}>{l || ' '}</div>
      })}
    </pre>
  )
}

const QUICK_PROMPTS = [
  'List my GitHub repos',
  'What changed in my Downloads today?',
  'Build a landing page for a SaaS',
  'Summarize the news from this week',
]

const MISSING_CHAT_PROVIDER_ERROR = /No API keys configured for any model in your fallback chain/i

export function isMissingChatProviderError(error: unknown) {
  return typeof error === 'string' && MISSING_CHAT_PROVIDER_ERROR.test(error)
}

function NoKeysCard({ onOpenSettings, onUseOllama, onDismiss }: { onOpenSettings: () => void; onUseOllama: () => void; onDismiss: () => void }) {
  return (
    <div
      style={{
        background: 'linear-gradient(135deg, var(--accent-soft), var(--surface-1))',
        border: '1px solid var(--accent-line)',
        borderRadius: 14,
        padding: '16px 18px',
        marginBottom: 20,
        color: 'var(--ink-1)',
        display: 'grid',
        gridTemplateColumns: 'auto 1fr auto',
        gap: 14,
        alignItems: 'start',
        boxShadow: '0 12px 40px oklch(0% 0 0 / 0.18)',
      }}
      className="fade-up"
    >
      <div style={{ width: 38, height: 38, borderRadius: 12, background: 'var(--accent)', color: 'var(--accent-text-on)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
        <KeyRound size={18} />
      </div>
      <div>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 5 }}>No model is configured</div>
        <p style={{ margin: 0, color: 'var(--ink-3)', fontSize: 12.5, lineHeight: 1.55, maxWidth: 560 }}>
          MacVis needs at least one chat provider before it can answer. Add an API key for Anthropic, OpenAI, Gemini, OpenRouter, or Groq, or point it at a local Ollama server.
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
          <button onClick={onOpenSettings} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 11px', borderRadius: 8, border: '1px solid var(--accent)', background: 'var(--accent)', color: 'var(--accent-text-on)', fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}>
            <SettingsIcon size={14} />
            Open Settings →
          </button>
          <button onClick={onUseOllama} style={{ padding: '8px 11px', borderRadius: 8, border: '1px solid var(--line-2)', background: 'var(--surface-3)', color: 'var(--ink-2)', fontSize: 12.5, cursor: 'pointer' }}>
            Use Ollama (no key needed)
          </button>
        </div>
      </div>
      <button onClick={onDismiss} aria-label="Dismiss no model configured message" style={{ background: 'none', border: 'none', color: 'var(--ink-4)', cursor: 'pointer', display: 'flex', padding: 2 }}>
        <X size={15} />
      </button>
    </div>
  )
}

export function Chat({ onNavigate }: { onNavigate?: (page: Page) => void }) {
  const {
    sessions, activeSessionId, isStreaming, streamingMessageId,
    createSession,
    addMessage, appendStream, addOrUpdateToolCall,
    setStreaming, setStreamingMessageId,
  } = useChatStore()

  const { load, loaded, set: setConfig } = useConfigStore()
  const sessionsLoaded = useChatStore(s => s.sessionsLoaded)
  const bottomRef = useRef<HTMLDivElement>(null)
  const [noApiKey, setNoApiKey] = useState(false)
  const [todos, setTodos] = useState<{ content: string; status: string; activeForm?: string }[]>([])
  const [approval, setApproval] = useState<{ id: string; name: string; input: any; reason?: string; diff?: string } | null>(null)
  const [usage, setUsage] = useState<{ inputTokens: number; outputTokens: number; cacheReadTokens?: number } | null>(null)

  // Live task list emitted by the todo_write tool
  useEffect(() => {
    const unsub = window.macvis?.agent?.onTodos?.((data: any) => setTodos(data.todos || []))
    const unsubApp = window.macvis?.agent?.onApproval?.((data: any) => setApproval(data))
    const unsubUsage = window.macvis?.agent?.onUsage?.((data: any) => setUsage(data))
    return () => { unsub?.(); unsubApp?.(); unsubUsage?.() }
  }, [])

  const respondApproval = (ok: boolean) => {
    if (approval) window.macvis.agent.approve(approval.id, ok)
    setApproval(null)
  }

  const activeSession = sessions.find(s => s.id === activeSessionId)

  useEffect(() => { if (!loaded) load() }, [loaded, load])
  // Only create a session after persistence has loaded AND there are zero sessions
  useEffect(() => {
    if (sessionsLoaded && sessions.length === 0) createSession()
  }, [sessionsLoaded, sessions.length, createSession])
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [activeSession?.messages.length, activeSession?.messages[activeSession.messages.length - 1]?.content])

  const handleSend = useCallback(async (text: string, attachments?: any[]) => {
    if (!activeSessionId) return

    const config = await window.macvis.config.get()
    const speak = !!config?.ui?.speakResponses
    // Check that AT LEAST ONE chat provider has a key configured. The agent's
    // fallback chain will pick whichever is set. Ollama uses a URL (no key
    // required) so it counts as "configured" if set.
    const keys = config?.apiKeys || {}
    const hasAnyChatKey =
      !!keys.anthropic ||
      !!keys.openai ||
      !!keys.openrouter ||
      !!keys.gemini ||
      !!keys.groq ||
      !!keys.ollama
    if (!hasAnyChatKey) {
      setNoApiKey(true)
      return
    }
    setNoApiKey(false)
    setTodos([])

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
          name: data.name, input: data.input, result: data.result, image: data.image, status: data.status,
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
        if (speak) {
          const msg = useChatStore.getState().sessions.find(s => s.id === activeSessionId)?.messages.find(m => m.id === assistantId)
          if (msg?.content) window.macvis.voice?.speak?.(msg.content)
        }
        unsubs.forEach(u => u())
      }
    }))

    unsubs.push(window.macvis.agent.onError((data: any) => {
      if (data.sessionId === activeSessionId) {
        if (isMissingChatProviderError(data.error)) {
          useChatStore.getState().resetMessageContent(activeSessionId, assistantId)
          setNoApiKey(true)
          setStreaming(false)
          setStreamingMessageId(null)
          unsubs.forEach(u => u())
          return
        }
        appendStream(activeSessionId, assistantId, `\n\n**Error:** ${data.error}`)
        setStreaming(false)
        setStreamingMessageId(null)
        unsubs.forEach(u => u())
      }
    }))

    await window.macvis.agent.run(text, activeSessionId, attachments)
  }, [activeSessionId, addMessage, appendStream, addOrUpdateToolCall, setStreaming, setStreamingMessageId])

  const handleStop = useCallback(() => {
    if (activeSessionId) window.macvis.agent.stop(activeSessionId)
  }, [activeSessionId])

  const openChatSettings = useCallback(() => onNavigate?.('settings'), [onNavigate])

  const useOllama = useCallback(async () => {
    await setConfig('apiKeys.ollama', 'http://localhost:11434')
    setNoApiKey(false)
    onNavigate?.('settings')
  }, [onNavigate, setConfig])

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
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1,
          }}>
            {activeSession?.title || 'New chat'}
          </span>
        )}
        {usage && (usage.inputTokens + usage.outputTokens) > 0 && (
          <span className="no-drag" title="Tokens this session (cached input shown in green)" style={{ marginLeft: 'auto', fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--ink-4)', whiteSpace: 'nowrap' }}>
            ↑{(usage.inputTokens / 1000).toFixed(1)}k
            {usage.cacheReadTokens ? <span style={{ color: 'var(--ok)' }}> ({(usage.cacheReadTokens / 1000).toFixed(1)}k cached)</span> : null}
            {' '}↓{(usage.outputTokens / 1000).toFixed(1)}k tok
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
            <NoKeysCard onOpenSettings={openChatSettings} onUseOllama={useOllama} onDismiss={() => setNoApiKey(false)} />
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

      {approval && (
        <div style={{ maxWidth: 760, margin: '0 auto', width: '100%', padding: '0 32px 8px' }}>
          <div style={{
            background: 'oklch(68% 0.22 25 / 0.06)', border: '1px solid oklch(68% 0.22 25 / 0.35)',
            borderRadius: 10, padding: '12px 14px',
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--warn)', textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: 'var(--font-mono)', marginBottom: 6 }}>
              ⚠ Approval needed
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--ink-1)', marginBottom: 6 }}>
              The agent wants to run <strong>{approval.name}</strong>{approval.reason ? <> — <span style={{ color: 'var(--ink-3)' }}>{approval.reason}</span></> : null}:
            </div>
            <DiffBlock text={approval.diff || approval.input?.command || approval.input?.path || JSON.stringify(approval.input, null, 2)} />
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => respondApproval(true)} style={{ flex: 1, padding: '8px', borderRadius: 7, border: '1px solid var(--accent)', background: 'var(--accent)', color: 'var(--accent-text-on)', fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}>Approve</button>
              <button onClick={() => respondApproval(false)} style={{ flex: 1, padding: '8px', borderRadius: 7, border: '1px solid var(--line-2)', background: 'var(--surface-3)', color: 'var(--ink-1)', fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}>Deny</button>
            </div>
          </div>
        </div>
      )}

      {todos.length > 0 && (
        <div style={{
          maxWidth: 760, margin: '0 auto', width: '100%', padding: '0 32px 8px',
        }}>
          <div style={{
            background: 'var(--surface-1)', border: '1px solid var(--line-1)', borderRadius: 10,
            padding: '10px 14px',
          }}>
            <div style={{
              fontSize: 9.5, fontWeight: 700, color: 'var(--ink-4)', textTransform: 'uppercase',
              letterSpacing: '0.12em', fontFamily: 'var(--font-mono)', marginBottom: 6,
              display: 'flex', justifyContent: 'space-between',
            }}>
              <span>Tasks</span>
              <span>{todos.filter(t => t.status === 'completed').length}/{todos.length}</span>
            </div>
            {todos.map((t, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 8, fontSize: 12,
                padding: '2px 0',
                color: t.status === 'completed' ? 'var(--ink-4)' : t.status === 'in_progress' ? 'var(--accent-bright)' : 'var(--ink-2)',
              }}>
                <span style={{ width: 14, flexShrink: 0, textAlign: 'center' }}>
                  {t.status === 'completed' ? '✓' : t.status === 'in_progress' ? '◐' : '○'}
                </span>
                <span style={{ textDecoration: t.status === 'completed' ? 'line-through' : 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {t.status === 'in_progress' && t.activeForm ? t.activeForm : t.content}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <ChatInput onSend={handleSend} onStop={handleStop} isStreaming={isStreaming} />
    </div>
  )
}
