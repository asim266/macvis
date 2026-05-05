import { useConfigStore } from '../../stores/configStore'

export function StatusBar() {
  const model = useConfigStore(s => s.config?.models?.default || 'claude-opus-4-5')

  return (
    <div
      className="flex items-center justify-between px-4"
      style={{
        height: 32,
        background: 'var(--bg-secondary)',
        borderTop: '1px solid var(--border)',
        flexShrink: 0,
        fontSize: 11,
        color: 'var(--text-muted)',
      }}
    >
      <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: 'var(--success)',
            display: 'inline-block',
          }}
        />
        Ready
      </span>
      <span style={{ color: 'var(--text-secondary)' }}>{model}</span>
      <span>MacVis</span>
    </div>
  )
}
