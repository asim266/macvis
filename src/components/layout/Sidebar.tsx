import { Plus, Settings as SettingsIcon, Plug, Sparkles, Globe, Send, MessageSquare, MoreHorizontal } from 'lucide-react'
import { useChatStore } from '../../stores/chatStore'
import { useConfigStore } from '../../stores/configStore'
import type { Page } from '../../App'

interface Props {
  currentPage: Page
  onNavigate: (page: Page) => void
}

const NAV_ITEMS: { id: Page; icon: React.ReactNode; label: string }[] = [
  { id: 'mcps', icon: <Plug size={15} />, label: 'Integrations' },
  { id: 'skills', icon: <Sparkles size={15} />, label: 'Skills' },
  { id: 'webbuilder', icon: <Globe size={15} />, label: 'Web Builder' },
  { id: 'telegram', icon: <Send size={15} />, label: 'Telegram' },
]

export function Sidebar({ currentPage, onNavigate }: Props) {
  const { sessions, activeSessionId, createSession, setActiveSession } = useChatStore()
  const model = useConfigStore(s => s.config?.models?.default || 'claude-opus-4-5')

  const goToChat = (sessionId: string) => {
    setActiveSession(sessionId)
    onNavigate('chat')
  }

  const handleNewChat = () => {
    createSession()
    onNavigate('chat')
  }

  return (
    <aside
      style={{
        width: 248,
        flexShrink: 0,
        background: 'var(--surface-1)',
        borderRight: '1px solid var(--line-1)',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
      }}
    >
      {/* macOS traffic light gap + drag region */}
      <div className="drag-region" style={{ height: 38, flexShrink: 0 }} />

      {/* Brand */}
      <div style={{ padding: '4px 18px 16px', display: 'flex', alignItems: 'center', gap: 10 }} className="drag-region">
        <div
          style={{
            width: 26, height: 26, borderRadius: 7,
            background: 'linear-gradient(135deg, var(--accent-bright) 0%, oklch(54% 0.22 18) 100%)',
            display: 'grid', placeItems: 'center',
            fontSize: 12, fontWeight: 700,
            color: 'oklch(98% 0 0)',
            fontFamily: 'var(--font-mono)',
            boxShadow: '0 2px 8px var(--accent-glow), inset 0 1px 0 oklch(95% 0.05 25 / 0.4)',
          }}
        >
          M
        </div>
        <div
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 12,
            fontWeight: 600,
            color: 'var(--ink-1)',
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
          }}
        >
          macvis
        </div>
      </div>

      {/* New chat button */}
      <div style={{ padding: '0 12px 12px' }} className="no-drag">
        <button
          onClick={handleNewChat}
          style={{
            width: '100%',
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '8px 12px',
            background: 'var(--accent)',
            border: '1px solid var(--accent)',
            borderRadius: 8,
            color: 'oklch(98% 0 0)',
            fontSize: 12.5, fontWeight: 600,
            cursor: 'pointer',
            letterSpacing: '-0.005em',
            transition: 'all 120ms var(--ease)',
            boxShadow: 'inset 0 1px 0 oklch(95% 0.05 25 / 0.3), 0 1px 3px oklch(0% 0 0 / 0.4), 0 0 16px var(--accent-glow)',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--accent-hover)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'var(--accent)' }}
        >
          <Plus size={14} strokeWidth={2.5} />
          <span>New chat</span>
          <span
            style={{
              marginLeft: 'auto',
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              fontWeight: 500,
              opacity: 0.85,
              letterSpacing: '0.04em',
            }}
          >
            ⌘N
          </span>
        </button>
      </div>

      {/* Section label */}
      <div style={{
        padding: '6px 18px',
        fontSize: 10,
        fontWeight: 600,
        color: 'var(--ink-4)',
        textTransform: 'uppercase',
        letterSpacing: '0.12em',
        fontFamily: 'var(--font-mono)',
      }}>
        Recent
      </div>

      {/* Sessions list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 8px', minHeight: 0 }} className="no-drag">
        {sessions.length === 0 && (
          <div style={{
            padding: '12px 14px',
            fontSize: 11.5,
            color: 'var(--ink-4)',
            fontStyle: 'italic',
          }}>
            No conversations yet
          </div>
        )}

        {sessions.slice().reverse().map(session => {
          const active = currentPage === 'chat' && session.id === activeSessionId
          return (
            <button
              key={session.id}
              onClick={() => goToChat(session.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 9,
                width: '100%',
                padding: '7px 10px',
                marginBottom: 1,
                background: active ? 'var(--surface-3)' : 'transparent',
                border: '1px solid',
                borderColor: active ? 'var(--line-2)' : 'transparent',
                borderRadius: 7,
                color: active ? 'var(--ink-1)' : 'var(--ink-2)',
                fontSize: 12.5,
                fontWeight: active ? 500 : 400,
                cursor: 'pointer',
                textAlign: 'left',
                letterSpacing: '-0.005em',
                transition: 'all 100ms var(--ease)',
              }}
              onMouseEnter={e => {
                if (!active) {
                  e.currentTarget.style.background = 'var(--surface-3)'
                  e.currentTarget.style.color = 'var(--ink-1)'
                }
              }}
              onMouseLeave={e => {
                if (!active) {
                  e.currentTarget.style.background = 'transparent'
                  e.currentTarget.style.color = 'var(--ink-2)'
                }
              }}
            >
              <MessageSquare size={12} style={{ flexShrink: 0, color: active ? 'var(--accent-bright)' : 'var(--ink-4)' }} />
              <span style={{
                flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {session.title || 'New chat'}
              </span>
            </button>
          )
        })}
      </div>

      {/* Bottom nav */}
      <div
        style={{
          padding: '10px 8px 8px',
          borderTop: '1px solid var(--line-1)',
          display: 'flex',
          flexDirection: 'column',
          gap: 1,
        }}
        className="no-drag"
      >
        {NAV_ITEMS.map(item => {
          const active = currentPage === item.id
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                width: '100%',
                padding: '7px 10px',
                background: active ? 'var(--accent-soft)' : 'transparent',
                border: '1px solid',
                borderColor: active ? 'var(--accent-line)' : 'transparent',
                borderRadius: 7,
                color: active ? 'var(--accent-bright)' : 'var(--ink-3)',
                fontSize: 12.5, fontWeight: active ? 500 : 400,
                cursor: 'pointer',
                textAlign: 'left',
                letterSpacing: '-0.005em',
                transition: 'all 120ms var(--ease)',
              }}
              onMouseEnter={e => {
                if (!active) {
                  e.currentTarget.style.background = 'var(--surface-3)'
                  e.currentTarget.style.color = 'var(--ink-1)'
                }
              }}
              onMouseLeave={e => {
                if (!active) {
                  e.currentTarget.style.background = 'transparent'
                  e.currentTarget.style.color = 'var(--ink-3)'
                }
              }}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          )
        })}

        {/* Settings */}
        <button
          onClick={() => onNavigate('settings')}
          style={{
            display: 'flex', alignItems: 'center', gap: 10,
            width: '100%',
            padding: '7px 10px',
            background: currentPage === 'settings' ? 'var(--accent-soft)' : 'transparent',
            border: '1px solid',
            borderColor: currentPage === 'settings' ? 'var(--accent-line)' : 'transparent',
            borderRadius: 7,
            color: currentPage === 'settings' ? 'var(--accent-bright)' : 'var(--ink-3)',
            fontSize: 12.5, fontWeight: currentPage === 'settings' ? 500 : 400,
            cursor: 'pointer',
            textAlign: 'left',
            letterSpacing: '-0.005em',
            transition: 'all 120ms var(--ease)',
          }}
          onMouseEnter={e => {
            if (currentPage !== 'settings') {
              e.currentTarget.style.background = 'var(--surface-3)'
              e.currentTarget.style.color = 'var(--ink-1)'
            }
          }}
          onMouseLeave={e => {
            if (currentPage !== 'settings') {
              e.currentTarget.style.background = 'transparent'
              e.currentTarget.style.color = 'var(--ink-3)'
            }
          }}
        >
          <SettingsIcon size={15} />
          <span>Settings</span>
          <span style={{
            marginLeft: 'auto',
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            color: 'var(--ink-4)',
          }}>
            ⌘,
          </span>
        </button>

        {/* Status footer */}
        <div
          style={{
            marginTop: 8,
            padding: '8px 10px',
            background: 'var(--surface-3)',
            border: '1px solid var(--line-1)',
            borderRadius: 8,
            display: 'flex', alignItems: 'center', gap: 8,
          }}
        >
          <span
            style={{
              width: 7, height: 7, borderRadius: 999,
              background: 'var(--ok)',
              boxShadow: '0 0 8px oklch(72% 0.155 150 / 0.7)',
              flexShrink: 0,
            }}
            className="pulse-soft"
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: 10.5,
              fontWeight: 600,
              color: 'var(--ink-2)',
              fontFamily: 'var(--font-mono)',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}>
              ready
            </div>
            <div style={{
              fontSize: 10.5,
              color: 'var(--ink-4)',
              fontFamily: 'var(--font-mono)',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              marginTop: 1,
            }}>
              {model}
            </div>
          </div>
        </div>
      </div>
    </aside>
  )
}
