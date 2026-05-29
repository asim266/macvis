import { useEffect, useState, lazy, Suspense } from 'react'
import { Sidebar } from './components/layout/Sidebar'
import { Chat } from './pages/Chat'
import { Settings } from './pages/Settings'
import { MCPs } from './pages/MCPs'
import { Projects } from './pages/Projects'
import { Skills } from './pages/Skills'
// Agents pulls in three.js (~2MB) — lazy-load so the app starts fast.
const Agents = lazy(() => import('./pages/Agents').then(m => ({ default: m.Agents })))
import { Schedules } from './pages/Schedules'
import { Terminal } from './pages/Terminal'
import { useChatStore } from './stores/chatStore'
import { useConfigStore } from './stores/configStore'

export type Page = 'chat' | 'settings' | 'mcps' | 'skills' | 'projects' | 'agents' | 'schedules' | 'terminal'

export default function App() {
  const [page, setPage] = useState<Page>('chat')
  const loadSessions = useChatStore(s => s.loadSessions)
  const accent = useConfigStore(s => s.config?.ui?.accent || 'green')

  // Apply the theme accent attribute to <html> so [data-accent="..."] CSS rules match
  useEffect(() => {
    document.documentElement.setAttribute('data-accent', accent)
  }, [accent])

  useEffect(() => {
    loadSessions()

    // Reload sessions when a Telegram message arrives so the new chat appears
    const unsubTelegram = window.macvis?.telegram?.onMessage?.((_data: any) => {
      // Small delay to let SessionStore.saveNow finish on the main side
      setTimeout(() => loadSessions(), 800)
      // And again after the response is likely written
      setTimeout(() => loadSessions(), 4000)
    })

    return () => { unsubTelegram?.() }
  }, [loadSessions])

  return (
    <div style={{ display: 'flex', height: '100%', width: '100%', background: 'var(--surface-2)' }}>
      <Sidebar currentPage={page} onNavigate={setPage} />
      <main style={{ flex: 1, overflow: 'hidden', position: 'relative', display: 'flex', flexDirection: 'column' }}>
        {page === 'chat' && <Chat />}
        {page === 'settings' && <Settings />}
        {page === 'mcps' && <MCPs />}
        {page === 'projects' && <Projects />}
        {page === 'skills' && <Skills />}
        {page === 'agents' && (
          <Suspense fallback={<div style={{ flex: 1, display: 'grid', placeItems: 'center', color: 'var(--ink-4)', fontSize: 13 }}>Loading 3D scene…</div>}>
            <Agents />
          </Suspense>
        )}
        {page === 'schedules' && <Schedules />}
        {page === 'terminal' && <Terminal />}
      </main>
    </div>
  )
}
