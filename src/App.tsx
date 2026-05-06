import { useState } from 'react'
import { Sidebar } from './components/layout/Sidebar'
import { Chat } from './pages/Chat'
import { Settings } from './pages/Settings'
import { MCPs } from './pages/MCPs'

export type Page = 'chat' | 'settings' | 'mcps' | 'skills' | 'webbuilder' | 'telegram'

export default function App() {
  const [page, setPage] = useState<Page>('chat')

  return (
    <div style={{ display: 'flex', height: '100%', width: '100%', background: 'var(--surface-2)' }}>
      <Sidebar currentPage={page} onNavigate={setPage} />
      <main style={{ flex: 1, overflow: 'hidden', position: 'relative', display: 'flex', flexDirection: 'column' }}>
        {page === 'chat' && <Chat />}
        {page === 'settings' && <Settings />}
        {page === 'mcps' && <MCPs />}
        {(page === 'skills' || page === 'webbuilder' || page === 'telegram') && (
          <div style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--ink-3)',
            fontSize: 14,
            letterSpacing: '-0.01em',
          }}>
            Coming soon
          </div>
        )}
      </main>
    </div>
  )
}
