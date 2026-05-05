import { useConfigStore } from '../../stores/configStore'

export function StatusBar() {
  const model = useConfigStore(s => s.config?.models?.default || 'claude-opus-4-5')

  return (
    <div
      style={{
        height: 26,
        borderTop: '1px solid var(--line-1)',
        background: 'var(--surface-2)',
        padding: '0 14px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontFamily: 'var(--font-mono)',
        fontSize: 10.5,
        color: 'var(--ink-4)',
        letterSpacing: '0.04em',
        flexShrink: 0,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: 999,
              background: 'var(--ok)',
              boxShadow: '0 0 6px oklch(72% 0.155 150 / 0.6)',
            }}
          />
          <span style={{ textTransform: 'uppercase' }}>ready</span>
        </span>
        <span style={{ color: 'var(--line-2)' }}>·</span>
        <span style={{ textTransform: 'uppercase' }}>0 mcps</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span>{model}</span>
      </div>
    </div>
  )
}
