import { useEffect, useState, useCallback } from 'react'
import { Folder, ExternalLink, Play, Trash2, Code2, RefreshCw, FolderOpen, Globe } from 'lucide-react'

interface ProjectInfo {
  name: string
  path: string
  type: string
  createdAt: number
  modifiedAt: number
  size: number
  fileCount: number
  hasGit: boolean
  description?: string
  entryFile?: string
}

const TYPE_META: Record<string, { icon: string; color: string; label: string }> = {
  html:    { icon: '🌐', color: 'oklch(72% 0.16 200)', label: 'HTML' },
  react:   { icon: '⚛',  color: 'oklch(70% 0.18 220)', label: 'React' },
  next:    { icon: '▲',  color: 'oklch(95% 0.01 0)',   label: 'Next.js' },
  vue:     { icon: '💚', color: 'oklch(72% 0.16 150)', label: 'Vue' },
  node:    { icon: '⬢',  color: 'oklch(72% 0.16 145)', label: 'Node' },
  python:  { icon: '🐍', color: 'oklch(78% 0.14 80)',  label: 'Python' },
  go:      { icon: '🐹', color: 'oklch(72% 0.13 200)', label: 'Go' },
  rust:    { icon: '🦀', color: 'oklch(68% 0.18 35)',  label: 'Rust' },
  unknown: { icon: '📄', color: 'var(--ink-3)',         label: 'Project' },
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / 1024 / 1024).toFixed(1) + ' MB'
}

function formatDate(ts: number): string {
  const now = Date.now()
  const diff = now - ts
  if (diff < 60_000) return 'just now'
  if (diff < 3600_000) return Math.floor(diff / 60_000) + 'm ago'
  if (diff < 86_400_000) return Math.floor(diff / 3600_000) + 'h ago'
  if (diff < 7 * 86_400_000) return Math.floor(diff / 86_400_000) + 'd ago'
  return new Date(ts).toLocaleDateString()
}

function ProjectCard({
  project, onOpenFinder, onOpenEditor, onOpenBrowser, onRun, onDelete,
}: {
  project: ProjectInfo
  onOpenFinder: () => void
  onOpenEditor: () => void
  onOpenBrowser: () => void
  onRun: () => void
  onDelete: () => void
}) {
  const meta = TYPE_META[project.type] || TYPE_META.unknown
  const [confirmDelete, setConfirmDelete] = useState(false)
  const canRunInBrowser = project.type === 'html' || project.entryFile === 'index.html'
  const canRun = project.type !== 'unknown'

  return (
    <div
      style={{
        background: 'var(--surface-2)',
        border: '1px solid var(--line-1)',
        borderRadius: 12,
        padding: '16px 18px',
        transition: 'border-color 200ms var(--ease), transform 200ms var(--ease)',
        position: 'relative',
        overflow: 'hidden',
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--line-2)' }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--line-1)' }}
    >
      {/* Top: icon + name + type pill */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 10 }}>
        <div style={{
          width: 38, height: 38, borderRadius: 9,
          background: 'var(--surface-3)',
          border: '1px solid var(--line-1)',
          display: 'grid', placeItems: 'center', flexShrink: 0,
          fontSize: 18,
        }}>{meta.icon}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 14, fontWeight: 600,
            color: 'var(--ink-1)',
            letterSpacing: '-0.01em',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>{project.name}</div>
          <div style={{ display: 'flex', gap: 8, marginTop: 3, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 9.5, fontWeight: 600,
              color: meta.color,
              textTransform: 'uppercase', letterSpacing: '0.08em',
              border: `1px solid ${meta.color}`,
              padding: '1.5px 6px', borderRadius: 999,
              opacity: 0.85,
            }}>{meta.label}</span>
            <span style={{ fontSize: 11, color: 'var(--ink-4)', fontFamily: 'var(--font-mono)' }}>
              {project.fileCount} files · {formatSize(project.size)}
            </span>
          </div>
        </div>
      </div>

      {/* Description / path */}
      {project.description ? (
        <p style={{
          fontSize: 12, color: 'var(--ink-3)', lineHeight: 1.5,
          marginBottom: 12,
          overflow: 'hidden',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical' as any,
        }}>{project.description}</p>
      ) : (
        <p style={{
          fontSize: 11, color: 'var(--ink-4)', fontFamily: 'var(--font-mono)',
          marginBottom: 12,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>~/.macvis/workspace/projects/{project.name}</p>
      )}

      {/* Footer: timestamp + actions */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <span style={{
          fontSize: 11, color: 'var(--ink-4)',
          fontFamily: 'var(--font-mono)',
          letterSpacing: '0.02em',
        }}>
          modified {formatDate(project.modifiedAt)}
        </span>

        <div style={{ display: 'flex', gap: 4 }}>
          {canRunInBrowser && (
            <ActionButton onClick={onOpenBrowser} title="Open in browser" icon={<Globe size={13} />} />
          )}
          {canRun && !canRunInBrowser && (
            <ActionButton onClick={onRun} title="Run project" icon={<Play size={13} />} accent />
          )}
          <ActionButton onClick={onOpenEditor} title="Open in editor" icon={<Code2 size={13} />} />
          <ActionButton onClick={onOpenFinder} title="Open in Finder" icon={<FolderOpen size={13} />} />
          <ActionButton
            onClick={() => {
              if (confirmDelete) {
                onDelete()
                setConfirmDelete(false)
              } else {
                setConfirmDelete(true)
                setTimeout(() => setConfirmDelete(false), 3000)
              }
            }}
            title={confirmDelete ? 'Click again to confirm' : 'Delete project'}
            icon={<Trash2 size={13} />}
            danger={confirmDelete}
          />
        </div>
      </div>
    </div>
  )
}

function ActionButton({
  onClick, title, icon, accent, danger,
}: { onClick: () => void; title: string; icon: React.ReactNode; accent?: boolean; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        width: 28, height: 28, borderRadius: 6,
        border: '1px solid',
        borderColor: danger ? 'var(--err)' : accent ? 'var(--accent)' : 'var(--line-1)',
        background: danger ? 'oklch(68% 0.22 25 / 0.12)' : accent ? 'var(--accent-soft)' : 'var(--surface-3)',
        color: danger ? 'var(--err)' : accent ? 'var(--accent-bright)' : 'var(--ink-2)',
        cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'all 120ms var(--ease)',
      }}
      onMouseEnter={e => {
        if (!danger && !accent) {
          e.currentTarget.style.background = 'var(--surface-4)'
          e.currentTarget.style.color = 'var(--ink-1)'
        }
      }}
      onMouseLeave={e => {
        if (!danger && !accent) {
          e.currentTarget.style.background = 'var(--surface-3)'
          e.currentTarget.style.color = 'var(--ink-2)'
        }
      }}
    >
      {icon}
    </button>
  )
}

export function Projects() {
  const [projects, setProjects] = useState<ProjectInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [workspace, setWorkspace] = useState('')

  const refresh = useCallback(async () => {
    setLoading(true)
    const [list, dir] = await Promise.all([
      window.macvis.projects.list(),
      window.macvis.projects.workspaceDir(),
    ])
    setProjects(list)
    setWorkspace(dir)
    setLoading(false)
  }, [])

  useEffect(() => { refresh() }, [refresh])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--surface-2)' }}>
      {/* Drag region top */}
      <div className="drag-region" style={{
        height: 38, flexShrink: 0,
        background: 'var(--surface-2)',
        display: 'flex', alignItems: 'center',
        padding: '0 24px',
        fontSize: 12.5, color: 'var(--ink-2)', fontWeight: 500,
        letterSpacing: '-0.005em',
      }}>
        Projects
      </div>

      {/* Header */}
      <div style={{
        padding: '20px 32px 16px',
        borderBottom: '1px solid var(--line-1)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
        gap: 16,
      }}>
        <div>
          <h1 style={{
            fontSize: 20, fontWeight: 600, color: 'var(--ink-1)',
            letterSpacing: '-0.025em', marginBottom: 4,
          }}>Projects</h1>
          <p style={{ fontSize: 12, color: 'var(--ink-3)', fontFamily: 'var(--font-mono)' }}>
            {workspace}
          </p>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={refresh}
            style={{
              padding: '7px 12px', borderRadius: 7,
              border: '1px solid var(--line-1)',
              background: 'var(--surface-3)',
              color: 'var(--ink-2)',
              fontSize: 12, fontWeight: 500,
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 6,
              transition: 'all 120ms var(--ease)',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface-4)'; e.currentTarget.style.color = 'var(--ink-1)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'var(--surface-3)'; e.currentTarget.style.color = 'var(--ink-2)' }}
          >
            <RefreshCw size={12} />
            Refresh
          </button>
          <button
            onClick={() => window.macvis.projects.openInFinder(workspace)}
            style={{
              padding: '7px 12px', borderRadius: 7,
              border: '1px solid var(--line-1)',
              background: 'var(--surface-3)',
              color: 'var(--ink-2)',
              fontSize: 12, fontWeight: 500,
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 6,
              transition: 'all 120ms var(--ease)',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface-4)'; e.currentTarget.style.color = 'var(--ink-1)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'var(--surface-3)'; e.currentTarget.style.color = 'var(--ink-2)' }}
          >
            <ExternalLink size={12} />
            Open folder
          </button>
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflowY: 'auto', minHeight: 0, padding: '20px 32px 32px' }}>
        {loading ? (
          <div style={{ color: 'var(--ink-3)', fontSize: 13, padding: 16 }}>Loading…</div>
        ) : projects.length === 0 ? (
          <div className="fade-up" style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', textAlign: 'center',
            minHeight: 'calc(100vh - 200px)', gap: 16,
          }}>
            <div style={{
              width: 56, height: 56, borderRadius: 14,
              background: 'var(--surface-3)',
              border: '1px solid var(--line-1)',
              display: 'grid', placeItems: 'center',
              color: 'var(--ink-3)',
            }}>
              <Folder size={26} />
            </div>
            <div>
              <h2 style={{ fontSize: 17, fontWeight: 600, color: 'var(--ink-1)', letterSpacing: '-0.015em', marginBottom: 6 }}>
                No projects yet
              </h2>
              <p style={{ fontSize: 13, color: 'var(--ink-3)', maxWidth: 380, lineHeight: 1.55 }}>
                Ask MacVis in chat to <em>"create a Next.js todo app"</em> or <em>"build a landing page"</em> — projects you create will show up here.
              </p>
            </div>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: 12,
          }} className="fade-up">
            {projects.map(p => (
              <ProjectCard
                key={p.path}
                project={p}
                onOpenFinder={() => window.macvis.projects.openInFinder(p.path)}
                onOpenEditor={() => window.macvis.projects.openInEditor(p.path)}
                onOpenBrowser={() => window.macvis.projects.openInBrowser(p.path)}
                onRun={async () => {
                  const r = await window.macvis.projects.run(p.path)
                  if (!r.ok) alert('Run failed: ' + r.error)
                }}
                onDelete={async () => {
                  await window.macvis.projects.delete(p.path)
                  refresh()
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
