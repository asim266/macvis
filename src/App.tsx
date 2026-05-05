import { useState } from 'react'
import { Sidebar } from './components/layout/Sidebar'
import { TitleBar } from './components/layout/TitleBar'
import { StatusBar } from './components/layout/StatusBar'
import { Chat } from './pages/Chat'
import { Settings } from './pages/Settings'
import { MCPs } from './pages/MCPs'

export type Page = 'chat' | 'settings' | 'mcps' | 'skills' | 'webbuilder' | 'telegram'

export default function App() {
  const [page, setPage] = useState<Page>('chat')

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--bg-primary)' }}>
      <TitleBar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar currentPage={page} onNavigate={setPage} />
        <main className="flex-1 overflow-hidden">
          {page === 'chat' && <Chat />}
          {page === 'settings' && <Settings />}
          {page === 'mcps' && <MCPs />}
          {(page === 'skills' || page === 'webbuilder' || page === 'telegram') && (
            <div className="flex items-center justify-center h-full" style={{ color: 'var(--text-muted)' }}>
              Coming soon
            </div>
          )}
        </main>
      </div>
      <StatusBar />
    </div>
  )
}
