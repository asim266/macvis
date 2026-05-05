import { Plug } from 'lucide-react'

export function MCPs() {
  return (
    <div
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 32,
        gap: 14,
      }}
      className="fade-up"
    >
      <div
        style={{
          width: 44, height: 44, borderRadius: 12,
          background: 'var(--surface-3)',
          border: '1px solid var(--line-1)',
          display: 'grid', placeItems: 'center',
          color: 'var(--ink-3)',
        }}
      >
        <Plug size={20} />
      </div>
      <div style={{ textAlign: 'center', maxWidth: 360 }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--ink-1)', letterSpacing: '-0.015em', marginBottom: 4 }}>
          MCP Connections
        </h2>
        <p style={{ fontSize: 12.5, color: 'var(--ink-3)', lineHeight: 1.55 }}>
          MCP manager coming in Phase 4. Configure your platform integrations under{' '}
          <strong style={{ color: 'var(--ink-2)', fontWeight: 500 }}>Settings → Integrations</strong>.
        </p>
      </div>
    </div>
  )
}
