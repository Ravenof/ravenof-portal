'use client'

// Per-kortos „iškvietimo balsų" įkėlimas. Keli garso failai → cards.gameplay.voiceLines
// (URL masyvas). Mūšyje sugroja vienas atsitiktinis (žr. lib/game/voiceManager.ts).

import { useRef, useState } from 'react'
import { Upload, Loader2, Play, Trash2, Music } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

type Props = {
  value: string[]
  cardNumber: string
  cardId: string | null
  onChange: (urls: string[]) => void
}

const MAX_SIZE = 2 * 1024 * 1024 // 2 MB / failas
const ALLOWED_TYPES = ['audio/mpeg', 'audio/ogg', 'audio/wav', 'audio/x-wav', 'audio/webm']
const ALLOWED_LABEL = 'MP3, OGG arba WAV'

function safeName(filename: string): string {
  return filename.toLowerCase().replace(/[^a-z0-9.]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
}

export function VoiceLinesUpload({ value, cardNumber, cardId, onChange }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  async function handleFiles(files: FileList) {
    setError(null)
    const supabase = createClient()
    const folder = cardNumber.trim()
      ? `cards/${cardNumber.trim()}/voice`
      : cardId ? `cards/${cardId}/voice` : `cards/temp/voice`

    setLoading(true)
    const added: string[] = []
    try {
      for (const file of Array.from(files)) {
        if (!ALLOWED_TYPES.includes(file.type)) { setError(`Leidžiami tik ${ALLOWED_LABEL} (${file.name})`); continue }
        if (file.size === 0 || file.size > MAX_SIZE) { setError(`Failas per didelis/tuščias: ${file.name} (maks. 2 MB)`); continue }
        const path = `${folder}/${Date.now()}-${safeName(file.name)}`
        const { error: upErr } = await supabase.storage
          .from('card-audio')
          .upload(path, file, { upsert: true, contentType: file.type })
        if (upErr) { setError(upErr.message); continue }
        const { data: { publicUrl } } = supabase.storage.from('card-audio').getPublicUrl(path)
        added.push(publicUrl)
      }
      if (added.length) onChange([...value, ...added])
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  function preview(url: string) {
    try {
      if (audioRef.current) { audioRef.current.pause() }
      const a = new Audio(url)
      a.volume = 0.7
      audioRef.current = a
      void a.play()
    } catch { /* tyliai */ }
  }

  function remove(url: string) {
    onChange(value.filter((u) => u !== url))
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Music className="w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
        <label className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
          Iškvietimo balsai (atsitiktinis grojamas summon metu)
        </label>
      </div>

      {value.length > 0 && (
        <ul className="space-y-1">
          {value.map((url, i) => (
            <li key={url} className="flex items-center gap-2 rounded-lg px-2 py-1"
              style={{ background: 'var(--bg-elevated)', border: '1px solid var(--bg-border)' }}>
              <button type="button" onClick={() => preview(url)} title="Klausyti"
                className="p-1 rounded hover:opacity-70" style={{ color: 'var(--gold)' }}>
                <Play className="w-3.5 h-3.5" />
              </button>
              <span className="text-[11px] flex-1 truncate" style={{ color: 'var(--text-muted)' }}>
                {i + 1}. {url.split('/').pop()}
              </span>
              <button type="button" onClick={() => remove(url)} title="Pašalinti"
                className="p-1 rounded hover:opacity-70" style={{ color: '#ef4444' }}>
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <input ref={fileRef} type="file" accept={ALLOWED_TYPES.join(',')} multiple className="hidden"
        onChange={(e) => { if (e.target.files?.length) handleFiles(e.target.files) }} />

      <button type="button" onClick={() => fileRef.current?.click()} disabled={loading}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-opacity hover:opacity-80"
        style={{ background: 'var(--bg-elevated)', border: '1px solid var(--bg-border)', color: 'var(--text-secondary)', opacity: loading ? 0.6 : 1 }}>
        {loading ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Keliama...</> : <><Upload className="w-3.5 h-3.5" /> Pridėti balsą(-us)</>}
      </button>

      {error && <p className="text-xs" style={{ color: '#ef4444' }}>{error}</p>}
      <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
        {ALLOWED_LABEL} · maks. 2 MB/failas · patarimas: mono, ~96 kbps, 1–3 s
      </p>
    </div>
  )
}
