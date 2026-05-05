import { MessageSquare, Settings as SettingsIcon, Plug, Sparkles, Globe, Send } from 'lucide-react'
import type { Page } from '../../App'

const NAV: { id: Page; icon: React.ReactNode; label: string; shortcut: string }[] = [
  { id: 'chat', icon: <MessageSquare size={17} />, label: 'Chat', shortcut: '⌘1' },
  { id: 'mcps', icon: <Plug size={17} />, label: 'Integrations', shortcut: '⌘2' },
  { id: 'skills', icon: <Sparkles size={17} />, label: 'Skills', shortcut: '⌘3' },
  { id: 'webbuilder', icon: <Globe size={17} />, label: 'Web Builder', shortcut: '⌘4' },
  { id: 'telegram', icon: <Send size={17} />, label: 'Telegram', shortcut: '⌘5' },
]

interface Props {
  currentPage: Page
  onNavigate: (page: Page) => void
}

function NavItem({
  active, icon, label, shortcut, onClick,
}: { active: boolean; icon: React.ReactNode; label: string; shortcut: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      title={`${label}  ${shortcut}`}
      style={{
        position: 'relative',
        width: 36,
        height: 36,
        borderRadius: 10,
        background: active ? 'var(--surface-3)' : 'transparent',
        color: active ? 'var(--ink-1)' : 'var(--ink-3)',
        border: 'none',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'background 150ms var(--ease), color 150ms var(--ease)',
      }}
      onMouseEnter={e => {
        if (!active) (e.currentTarget as HTMLElement).style.color = 'var(--ink-1)'
      }}
      onMouseLeave={e => {
        if (!active) (e.currentTarget as HTMLElement).style.color = 'var(--ink-3)'
      }}
    >
      {icon}
      {active && (
        <span
          style={{
            position: 'absolute',
            left: -10,
            top: '50%',
            transform: 'translateY(-50%)',
            width: 3,
            height: 18,
            borderRadius: '0 2px 2px 0',
            background: 'var(--accent)',
          }}
        />
      )}
    </button>
  )
}

export function Sidebar({ currentPage, onNavigate }: Props) {
  return (
    <div
      style={{
        width: 56,
        background: 'var(--surface-2)',
        borderRight: '1px solid var(--line-1)',
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '14px 0',
        gap: 4,
      }}
    >
      {NAV.map(item => (
        <NavItem
          key={item.id}
          active={currentPage === item.id}
          icon={item.icon}
          label={item.label}
          shortcut={item.shortcut}
          onClick={() => onNavigate(item.id)}
        />
      ))}

      <div style={{ flex: 1 }} />

      <NavItem
        active={currentPage === 'settings'}
        icon={<SettingsIcon size={17} />}
        label="Settings"
        shortcut="⌘,"
        onClick={() => onNavigate('settings')}
      />
    </div>
  )
}
