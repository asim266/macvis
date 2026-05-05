export function TitleBar() {
  return (
    <div
      className="flex items-center justify-center relative"
      style={{
        height: 40,
        background: 'var(--bg-primary)',
        borderBottom: '1px solid var(--border)',
        WebkitAppRegion: 'drag',
        flexShrink: 0,
      } as any}
    >
      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', letterSpacing: '0.02em' }}>
        MacVis
      </span>
    </div>
  )
}
