export function TitleBar() {
  return (
    <div
      style={{
        height: 38,
        background: 'linear-gradient(180deg, var(--surface-2) 0%, var(--surface-1) 100%)',
        borderBottom: '1px solid var(--line-1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        WebkitAppRegion: 'drag',
        flexShrink: 0,
        position: 'relative',
      } as any}
    >
      <div
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 11,
          fontWeight: 500,
          color: 'var(--ink-3)',
          letterSpacing: '0.16em',
          textTransform: 'uppercase',
        }}
      >
        macvis
      </div>
    </div>
  )
}
