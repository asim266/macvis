import { useEffect, useRef, useState } from 'react'
import { TerminalSquare } from 'lucide-react'

export function Terminal() {
  const [output, setOutput] = useState('')
  const [input, setInput] = useState('')
  const [history, setHistory] = useState<string[]>([])
  const [histIdx, setHistIdx] = useState(-1)
  const idRef = useRef<string | null>(null)
  const outRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    let unsub: (() => void) | undefined
    let mounted = true
    window.macvis.terminal.create().then((r: any) => {
      if (!mounted) return
      idRef.current = r.id
    })
    unsub = window.macvis.terminal.onData((d: any) => {
      if (d.id === idRef.current) setOutput(o => (o + d.data).slice(-60000))
    })
    return () => { mounted = false; unsub?.(); if (idRef.current) window.macvis.terminal.kill(idRef.current) }
  }, [])

  useEffect(() => { outRef.current?.scrollTo({ top: 1e9 }) }, [output])

  const run = () => {
    const cmd = input
    if (!idRef.current) return
    setOutput(o => o + `\n$ ${cmd}\n`)
    window.macvis.terminal.input(idRef.current, cmd + '\n')
    if (cmd.trim()) setHistory(h => [...h, cmd])
    setHistIdx(-1)
    setInput('')
  }

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') { e.preventDefault(); run() }
    else if (e.key === 'ArrowUp') { e.preventDefault(); const i = histIdx < 0 ? history.length - 1 : Math.max(0, histIdx - 1); if (history[i] != null) { setHistIdx(i); setInput(history[i]) } }
    else if (e.key === 'ArrowDown') { e.preventDefault(); if (histIdx >= 0) { const i = histIdx + 1; if (i >= history.length) { setHistIdx(-1); setInput('') } else { setHistIdx(i); setInput(history[i]) } } }
    else if (e.key === 'c' && e.ctrlKey) { if (idRef.current) window.macvis.terminal.input(idRef.current, '\x03') }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--surface-2)' }}>
      <div className="drag-region" style={{ height: 38, flexShrink: 0, display: 'flex', alignItems: 'center', padding: '0 24px', fontSize: 12.5, color: 'var(--ink-2)', fontWeight: 500 }}>Terminal</div>
      <div style={{ padding: '12px 24px 6px', display: 'flex', alignItems: 'center', gap: 8 }}>
        <TerminalSquare size={16} style={{ color: 'var(--accent-bright)' }} />
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-1)' }}>Shell Console</span>
        <span style={{ fontSize: 11, color: 'var(--ink-4)' }}>persistent bash session · cwd & env persist between commands</span>
      </div>
      <div style={{ flex: 1, minHeight: 0, padding: '6px 24px 16px', display: 'flex', flexDirection: 'column' }}>
        <div ref={outRef} onClick={() => inputRef.current?.focus()}
          style={{ flex: 1, overflowY: 'auto', background: '#0a0c10', border: '1px solid var(--line-1)', borderRadius: 10, padding: '12px 14px', fontFamily: 'var(--font-mono)', fontSize: 12, lineHeight: 1.55, color: '#d6dae0', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
          className="selectable">
          {output || 'Starting shell…'}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, background: '#0a0c10', border: '1px solid var(--line-2)', borderRadius: 10, padding: '8px 12px' }}>
          <span style={{ color: 'var(--accent-bright)', fontFamily: 'var(--font-mono)', fontSize: 13 }}>$</span>
          <input ref={inputRef} value={input} onChange={e => setInput(e.target.value)} onKeyDown={onKey} autoFocus
            placeholder="type a command and press Enter"
            style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: '#e6eaf0', fontSize: 13, fontFamily: 'var(--font-mono)' }} />
        </div>
      </div>
    </div>
  )
}
