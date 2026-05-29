import { useState, useRef, useEffect } from 'react'
import { ArrowUp, Square, Paperclip, Mic, X, Loader } from 'lucide-react'

export interface Attachment { name: string; mimeType: string; data: string; preview: string }

interface Props {
  onSend: (message: string, attachments?: Attachment[]) => void
  onStop: () => void
  isStreaming: boolean
  disabled?: boolean
}

function fileToAttachment(file: File): Promise<Attachment> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const url = String(reader.result)
      const data = url.split(',')[1] || ''
      resolve({ name: file.name || 'image', mimeType: file.type || 'image/png', data, preview: url })
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

async function blobToBase64(blob: Blob): Promise<string> {
  const buf = new Uint8Array(await blob.arrayBuffer())
  let bin = ''
  for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i])
  return btoa(bin)
}

export function ChatInput({ onSend, onStop, isStreaming, disabled }: Props) {
  const [value, setValue] = useState('')
  const [focused, setFocused] = useState(false)
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [recording, setRecording] = useState(false)
  const [transcribing, setTranscribing] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const ref = useRef<HTMLTextAreaElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)

  useEffect(() => {
    if (ref.current) {
      ref.current.style.height = 'auto'
      ref.current.style.height = Math.min(ref.current.scrollHeight, 200) + 'px'
    }
  }, [value])

  const addFiles = async (files: FileList | File[]) => {
    const imgs = Array.from(files).filter(f => f.type.startsWith('image/'))
    const next = await Promise.all(imgs.map(fileToAttachment))
    if (next.length) setAttachments(a => [...a, ...next])
  }

  const send = () => {
    const t = value.trim()
    if ((!t && attachments.length === 0) || isStreaming) return
    onSend(t, attachments.length ? attachments : undefined)
    setValue(''); setAttachments([])
  }

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); send() }
    else if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  const toggleMic = async () => {
    if (recording) { recorderRef.current?.stop(); setRecording(false); return }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mr = new MediaRecorder(stream)
      const chunks: BlobPart[] = []
      mr.ondataavailable = e => { if (e.data.size) chunks.push(e.data) }
      mr.onstop = async () => {
        stream.getTracks().forEach(t => t.stop())
        const blob = new Blob(chunks, { type: mr.mimeType || 'audio/webm' })
        setTranscribing(true)
        try {
          const b64 = await blobToBase64(blob)
          const r = await window.macvis.voice.transcribe(b64, blob.type)
          if (r?.ok && r.text) setValue(v => (v ? v + ' ' : '') + r.text.trim())
          else if (r?.error) setValue(v => v) // keep; error shown via placeholder below
        } finally { setTranscribing(false) }
      }
      recorderRef.current = mr
      mr.start(); setRecording(true)
    } catch {
      setRecording(false)
    }
  }

  const canSend = (!!value.trim() || attachments.length > 0) && !disabled

  return (
    <div style={{ padding: '14px 24px 18px', background: 'linear-gradient(180deg, transparent 0%, var(--surface-1) 30%)', flexShrink: 0 }}>
      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={e => { e.preventDefault(); setDragOver(false); if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files) }}
        style={{
          maxWidth: 760, margin: '0 auto',
          background: 'var(--surface-2)',
          border: `1px solid ${dragOver ? 'var(--accent)' : focused ? 'var(--line-3)' : 'var(--line-2)'}`,
          borderRadius: 12, padding: '12px 14px 10px',
          transition: 'border-color 150ms var(--ease), box-shadow 150ms var(--ease)',
          boxShadow: focused ? '0 0 0 3px var(--accent-soft), 0 4px 16px -4px rgb(0 0 0 / 0.4)' : '0 4px 16px -4px rgb(0 0 0 / 0.4)',
        }}
      >
        {/* attachment chips */}
        {attachments.length > 0 && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
            {attachments.map((a, i) => (
              <div key={i} style={{ position: 'relative', width: 52, height: 52, borderRadius: 8, overflow: 'hidden', border: '1px solid var(--line-2)' }}>
                <img src={a.preview} alt={a.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <button onClick={() => setAttachments(at => at.filter((_, j) => j !== i))}
                  style={{ position: 'absolute', top: 2, right: 2, width: 16, height: 16, borderRadius: 999, border: 'none', background: 'rgba(0,0,0,0.6)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>
                  <X size={10} />
                </button>
              </div>
            ))}
          </div>
        )}

        <textarea
          ref={ref}
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={onKey}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onPaste={e => { const imgs = Array.from(e.clipboardData.files).filter(f => f.type.startsWith('image/')); if (imgs.length) { e.preventDefault(); addFiles(imgs) } }}
          placeholder={transcribing ? 'Transcribing…' : recording ? 'Listening… click the mic to stop' : 'Ask MacVis anything…  (drop or paste an image)'}
          disabled={disabled}
          rows={1}
          style={{ width: '100%', minHeight: 22, background: 'transparent', border: 'none', outline: 'none', resize: 'none', color: 'var(--ink-1)', fontSize: 14, lineHeight: 1.55, fontFamily: 'var(--font-display)', letterSpacing: '-0.005em' }}
          className="selectable"
        />

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <input ref={fileRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={e => { if (e.target.files) addFiles(e.target.files); e.target.value = '' }} />
            <button onClick={() => fileRef.current?.click()} title="Attach image" style={iconBtn}><Paperclip size={15} /></button>
            <button onClick={toggleMic} title={recording ? 'Stop recording' : 'Voice input'}
              style={{ ...iconBtn, color: recording ? 'var(--err)' : transcribing ? 'var(--accent-bright)' : 'var(--ink-3)' }}>
              {transcribing ? <Loader size={15} className="spin" /> : <Mic size={15} />}
            </button>
            <span style={{ fontSize: 10.5, color: 'var(--ink-4)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.08em', marginLeft: 4 }}>
              ↵ send · ⇧↵ newline
            </span>
          </div>
          <button
            onClick={isStreaming ? onStop : send}
            disabled={!isStreaming && !canSend}
            style={{
              width: 30, height: 30, borderRadius: 8, border: 'none',
              background: isStreaming ? 'var(--err)' : canSend ? 'var(--accent)' : 'var(--surface-3)',
              color: isStreaming || canSend ? 'oklch(98% 0 0)' : 'var(--ink-4)',
              cursor: isStreaming || canSend ? 'pointer' : 'default',
              display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 120ms var(--ease)',
              boxShadow: isStreaming || canSend ? 'inset 0 1px 0 0 var(--accent-inset), 0 1px 3px oklch(0% 0 0 / 0.4), 0 0 12px var(--accent-glow)' : 'none',
            }}
          >
            {isStreaming ? <Square size={11} fill="currentColor" /> : <ArrowUp size={14} strokeWidth={2.5} />}
          </button>
        </div>
      </div>
    </div>
  )
}

const iconBtn: React.CSSProperties = {
  width: 28, height: 28, borderRadius: 7, border: 'none', background: 'transparent',
  color: 'var(--ink-3)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
}
