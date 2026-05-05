import { MessageSquare, Settings, Plug, Sparkles, Globe, Send } from 'lucide-react'
import type { Page } from '../../App'

const NAV_ITEMS: { id: Page; icon: React.ReactNode; label: string; shortcut: string }[] = [
  { id: 'chat', icon: <MessageSquare size={18} />, label: 'Chat', shortcut: '⌘1' },
  { id: 'mcps', icon: <Plug size={18} />, label: 'MCPs', shortcut: '⌘2' },
  { id: 'skills', icon: <Sparkles size={18} />, label: 'Skills', shortcut: '⌘3' },
  { id: 'webbuilder', icon: <Globe size={18} />, label: 'Web Builder', shortcut: '⌘4' },
  { id: 'telegram', icon: <Send size={18} />, label: 'Telegram', shortcut: '⌘5' },
]

interface Props {
  currentPage: Page
  onNavigate: (page: Page) => void
}

export function Sidebar({ currentPage, onNavigate }: Props) {
  return (
    <div
      className="flex flex-col items-center py-2 gap-1"
      style={{
        width: 56,
        background: 'var(--bg-secondary)',
        borderRight: '1px solid var(--border)',
        flexShrink: 0,
      }}
    >
      {NAV_ITEMS.map(item => (
        <button
          key={item.id}
          onClick={() => onNavigate(item.id)}
          title={`${item.label} ${item.shortcut}`}
          className="relative flex items-center justify-center rounded-lg transition-colors"
          style={{
            width: 38,
            height: 38,
            background: currentPage === item.id ? 'var(--accent-dim)' : 'transparent',
            color: currentPage === item.id ? 'var(--accent)' : 'var(--text-muted)',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          {item.icon}
        </button>
      ))}

      <div style={{ flex: 1 }} />

      <button
        onClick={() => onNavigate('settings')}
        title="Settings ⌘,"
        className="flex items-center justify-center rounded-lg transition-colors"
        style={{
          width: 38,
          height: 38,
          background: currentPage === 'settings' ? 'var(--accent-dim)' : 'transparent',
          color: currentPage === 'settings' ? 'var(--accent)' : 'var(--text-muted)',
          border: 'none',
          cursor: 'pointer',
        }}
      >
        <Settings size={18} />
      </button>
    </div>
  )
}
