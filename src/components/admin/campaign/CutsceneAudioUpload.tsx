'use client'

// ────────────────────────────────────────────────────────────────────────────
// Cutscene audio įkėlimas admin'e — VIETOJ rankinio URL rašymo.
// Failai keliami į Supabase storage 'card-audio' bucket'ą, kelias
// campaign/<folder>/... (metų cacheControl, kaip VoiceLinesUpload).
// Grąžinamas public URL įrašomas į cutscene lauką; žaidėjo pusėje failas
// automatiškai kešuojamas įrenginyje (lib/campaign/mediaCache.ts).
//
// AudioUploadField  — vienas URL laukas (muzika / ambient / žingsnio balsas).
// AudioLibraryUpload — keli failai iš eilės + „kopijuoti URL" (motion-comic
//                      JSON sekcijai, kol nėra vizualaus editoriaus).
// ────────────────────────────────────────────────────────────────────────────

import { useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const BUCKET = 'card-audio'
const MAX_SIZE = 10 * 1024 * 1024 // 10 MB (muzikos takeliai didesni už balsus)
const ALLOWED = ['audio/mpeg', 'audio/ogg', 'audio/wav', 'audio/x-wav', 'audio/webm', 'audio/mp4', 'audio/aac']
const inp: React.CSSProperties = { background: 'var(--bg-base)', border: '1px solid var(--bg-border)', color: 'var(--text-primary)' }

function safeName(filename: string): string {
  return filename.toLowerCase().replace(/[^a-z0-9.]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
}

async function uploadOne(file: File, folder: string): Promise<{ url?: string; error?: string }> {
  if (!ALLOWED.includes(file.type)) return { error: `Leidžiami tik MP3/OGG/WAV/M4A (${file.name})` }
  if (file.size === 0 || file.size > MAX_SIZE) return { error: `Failas per didelis/tuščias: ${file.name} (maks. 10 MB)` }
  const supabase = createClient()
  const path = `campaign/${folder}/${Date.now()}-${safeName(file.name)}`
  const { error } = await supabase.storage.from(BUCKET)
    .upload(path, file, { upsert: true, contentType: file.type, cacheControl: '31536000' })
  if (error) return { error: error.message }
  const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return { url: publicUrl }
}

let previewAudio: HTMLAudioElement | null = null
function preview(url: string) {
  try { previewAudio?.pause(); previewAudio = new Audio(url); previewAudio.volume = 0.7; void previewAudio.play() } catch { /* */ }
}

// ── Vienas audio laukas ─────────────────────────────────────────────────────
export function AudioUploadField({ label, value, onChange, folder }: {
  label: string
  value: string | null | undefined
  onChange: (url: string | null) => void
  /** storage poaplankis, pvz. cutscene id */
  folder: string
}) {
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const pick = async (files: FileList | null) => {
    if (!files?.length) return
    setBusy(true); setErr(null)
    const r = await uploadOne(files[0], folder)
    if (r.error) setErr(r.error)
    else if (r.url) onChange(r.url)
    setBusy(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <div className="min-w-0">
      <div className="flex items-center gap-1.5">
        <span className="text-[10px] shrink-0 w-16 truncate" style={{ color: 'var(--text-muted)' }} title={label}>{label}</span>
        {value ? (
          <>
            <button type="button" onClick={() => preview(value)} title="Perklausyti"
              className="px-2 py-1 rounded text-xs shrink-0" style={inp}>▶</button>
            <span className="flex-1 min-w-0 truncate text-[10px]" style={{ color: 'var(--text-muted)' }} title={value}>
              {decodeURIComponent(value.split('/').pop() ?? value)}
            </span>
            <button type="button" onClick={() => onChange(null)} title="Pašalinti"
              className="px-1.5 py-1 rounded text-[10px] shrink-0" style={{ color: '#f87171' }}>✕</button>
          </>
        ) : (
          <span className="flex-1 min-w-0 truncate text-[10px] italic" style={{ color: 'var(--text-muted)', opacity: 0.6 }}>nėra failo</span>
        )}
        <button type="button" onClick={() => fileRef.current?.click()} disabled={busy}
          className="px-2 py-1 rounded text-[10px] font-bold shrink-0"
          style={{ background: 'rgba(240,180,41,0.15)', border: '1px solid rgba(240,180,41,0.4)', color: 'var(--gold)', opacity: busy ? 0.5 : 1 }}>
          {busy ? '…' : '⬆ Įkelti'}
        </button>
        <input ref={fileRef} type="file" accept="audio/*" className="hidden" onChange={(e) => void pick(e.target.files)} />
      </div>
      {err && <p className="text-[10px] mt-0.5" style={{ color: '#f87171' }}>{err}</p>}
    </div>
  )
}

// ── Kelių failų biblioteka (motion-comic JSON sekcijai) ─────────────────────
export function AudioLibraryUpload({ folder }: { folder: string }) {
  const [items, setItems] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const pick = async (files: FileList | null) => {
    if (!files?.length) return
    setBusy(true); setErr(null)
    for (const f of Array.from(files)) {
      const r = await uploadOne(f, folder)
      if (r.error) setErr(r.error)
      else if (r.url) setItems((xs) => [...xs, r.url!])
    }
    setBusy(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  const copy = async (url: string) => {
    try { await navigator.clipboard.writeText(url); setCopied(url); setTimeout(() => setCopied((c) => c === url ? null : c), 1500) }
    catch { /* */ }
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => fileRef.current?.click()} disabled={busy}
          className="px-3 py-1.5 rounded text-xs font-bold"
          style={{ background: 'rgba(240,180,41,0.15)', border: '1px solid rgba(240,180,41,0.4)', color: 'var(--gold)', opacity: busy ? 0.5 : 1 }}>
          {busy ? 'Keliama…' : '⬆ Įkelti audio (VO / muzika / SFX)'}
        </button>
        <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>įkelk failą ir nukopijuok URL į JSON (voiceUrl / musicUrl / sfxUrl)</span>
      </div>
      <input ref={fileRef} type="file" accept="audio/*" multiple className="hidden" onChange={(e) => void pick(e.target.files)} />
      {err && <p className="text-[10px]" style={{ color: '#f87171' }}>{err}</p>}
      {items.map((url) => (
        <div key={url} className="flex items-center gap-1.5">
          <button type="button" onClick={() => preview(url)} className="px-2 py-0.5 rounded text-xs" style={inp}>▶</button>
          <span className="flex-1 min-w-0 truncate text-[10px]" style={{ color: 'var(--text-muted)' }} title={url}>
            {decodeURIComponent(url.split('/').pop() ?? url)}
          </span>
          <button type="button" onClick={() => void copy(url)} className="px-2 py-0.5 rounded text-[10px] font-bold"
            style={{ background: copied === url ? 'rgba(74,222,128,0.15)' : 'rgba(255,255,255,0.05)', border: '1px solid var(--bg-border)', color: copied === url ? '#4ade80' : 'var(--text-muted)' }}>
            {copied === url ? '✓ Nukopijuota' : 'Kopijuoti URL'}
          </button>
        </div>
      ))}
    </div>
  )
}
