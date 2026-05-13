import { useEffect, useState } from 'react'
import { Sidebar } from './components/layout/Sidebar'
import { Chat } from './pages/Chat'
import { Settings } from './pages/Settings'
import { MCPs } from './pages/MCPs'
import { Projects } from './pages/Projects'
import { useChatStore } from './stores/chatStore'
import { useConfigStore } from './stores/configStore'

export type Page = 'chat' | 'settings' | 'mcps' | 'skills' | 'projects'

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
        {page === 'skills' && (
          <div style={{
            flex: 1,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--ink-3)', fontSize: 14, letterSpacing: '-0.01em',
          }}>
            Coming soon
          </div>
        )}
      </main>
    </div>
  )
}
