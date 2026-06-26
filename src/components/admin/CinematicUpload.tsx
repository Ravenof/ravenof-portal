'use client'

// ── CinematicUpload — Premium kino (summon ARBA championSkill) įkėlimo widget ─
// Pernaudoja Supabase storage modelį (kaip CardImageUpload/VoiceLinesUpload), bet
// į „card-cinematics" bucket'ą. Saugo TIK URL + metaduomenis (ne failą) į gameplay.
// WebM (primary) + MP4 (fallback) + poster (WebP/JPG/PNG) + duration/theme/title/triggers.

import { useRef, useState } from 'react'
import { Upload, Loader2, Trash2, Play, Film, ImageIcon } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import {
  CINEMATIC_FRAME_THEMES, CINEMATIC_TRIGGER_SOURCES,
  CINEMATIC_MAX_BYTES, CINEMATIC_WARN_BYTES, CINEMATIC_MAX_DURATION_MS,
  CINEMATIC_MIN_DURATION_MS_SUMMON, CINEMATIC_MIN_DURATION_MS_SKILL,
  CINEMATIC_DEFAULT_DURATION_MS_SUMMON, CINEMATIC_DEFAULT_DURATION_MS_SKILL,
  type CinematicFrameTheme, type CinematicTriggerSource,
} from '@/lib/game/types'

// Bendra forma (SummonCinematic supersetas; SkillCinematic neturi triggerSources).
export type CinematicData = {
  enabled?: boolean
  webm?: string
  mp4?: string
  poster?: string
  durationMs?: number
  titleOverride?: string
  frameTheme?: CinematicFrameTheme
  triggerSources?: CinematicTriggerSource[]
  uploadedAt?: string
  updatedAt?: string
}

type Slot = 'webm' | 'mp4' | 'poster'

const ACCEPT: Record<Slot, string> = {
  webm: 'video/webm',
  mp4: 'video/mp4',
  poster: 'image/webp,image/jpeg,image/png',
}
const TYPE_OK: Record<Slot, (t: string) => boolean> = {
  webm: (t) => t === 'video/webm',
  mp4: (t) => t === 'video/mp4',
  poster: (t) => ['image/webp', 'image/jpeg', 'image/png'].includes(t),
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '0.4rem 0.5rem', borderRadius: '0.4rem', fontSize: '0.75rem',
  background: 'var(--bg-elevated)', border: '1px solid var(--bg-border)', color: 'var(--text-primary)', outline: 'none',
}
const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: '0.6rem', fontWeight: 600, color: 'var(--text-muted)',
  marginBottom: '0.2rem', textTransform: 'uppercase', letterSpacing: '0.05em',
}

function safeName(filename: string): string {
  return filename.toLowerCase().replace(/[^a-z0-9.]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
}

function readVideoDuration(file: File): Promise<number | null> {
  return new Promise((resolve) => {
    try {
      const url = URL.createObjectURL(file)
      const v = document.createElement('video')
      v.preload = 'metadata'
      v.onloadedmetadata = () => { URL.revokeObjectURL(url); resolve(Number.isFinite(v.duration) ? v.duration : null) }
      v.onerror = () => { URL.revokeObjectURL(url); resolve(null) }
      v.src = url
    } catch { resolve(null) }
  })
}

export function CinematicUpload({
  value, onChange, cardId, cardNumber, kind, skillId, defaultTitle, showTriggerSources = false,
}: {
  value: CinematicData | undefined
  onChange: (next: CinematicData | undefined) => void
  cardId: string | null
  cardNumber: string
  kind: 'summon' | 'skill'
  skillId?: string
  defaultTitle?: string
  showTriggerSources?: boolean
}) {
  const v: CinematicData = value ?? {}
  const [busy, setBusy] = useState<Slot | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [warns, setWarns] = useState<string[]>([])
  const refs = { webm: useRef<HTMLInputElement>(null), mp4: useRef<HTMLInputElement>(null), poster: useRef<HTMLInputElement>(null) }

  const defaultDuration = kind === 'summon' ? CINEMATIC_DEFAULT_DURATION_MS_SUMMON : CINEMATIC_DEFAULT_DURATION_MS_SKILL
  const minDuration = kind === 'summon' ? CINEMATIC_MIN_DURATION_MS_SUMMON : CINEMATIC_MIN_DURATION_MS_SKILL

  const patch = (p: Partial<CinematicData>) => {
    const next = { ...v, ...p, updatedAt: new Date().toISOString() }
    // jei viskas tuščia ir disabled → grąžinam undefined (švarus gameplay JSON)
    const empty = !next.enabled && !next.webm && !next.mp4 && !next.poster && !next.titleOverride
      && !next.durationMs && !next.frameTheme && !(next.triggerSources?.length)
    onChange(empty ? undefined : next)
  }

  const folder = () => {
    const base = (cardNumber.trim() || cardId || 'temp')
    return kind === 'summon'
      ? `cards/${base}/summon`
      : `cards/${base}/skills/${skillId ?? 'skill'}`
  }

  async function upload(slot: Slot, file: File) {
    setError(null)
    const localWarns: string[] = []
    if (!TYPE_OK[slot](file.type)) {
      setError(`Netinkamas formatas (${file.name}). Reikia: ${slot === 'poster' ? 'WebP/JPG/PNG' : slot.toUpperCase()}.`)
      return
    }
    if (file.size === 0) { setError('Failas tuščias.'); return }
    if (file.size > CINEMATIC_MAX_BYTES) {
      setError(`Per didelis: ${(file.size / 1048576).toFixed(1)} MB (hard max ${(CINEMATIC_MAX_BYTES / 1048576).toFixed(0)} MB).`)
      return
    }
    if (file.size > CINEMATIC_WARN_BYTES) {
      localWarns.push(`⚠ ${slot.toUpperCase()} ${(file.size / 1048576).toFixed(1)} MB > 2 MB — apsvarstyk suspaudimą (mobile).`)
    }
    if (slot !== 'poster') {
      const dur = await readVideoDuration(file)
      if (dur != null && dur * 1000 > CINEMATIC_MAX_DURATION_MS) {
        localWarns.push(`⚠ ${slot.toUpperCase()} trukmė ${dur.toFixed(1)} s > 3.5 s — per ilgas kino.`)
      }
    }

    setBusy(slot)
    try {
      const supabase = createClient()
      const path = `${folder()}/${Date.now()}-${slot}-${safeName(file.name)}`
      const { error: upErr } = await supabase.storage.from('card-cinematics')
        .upload(path, file, { upsert: true, contentType: file.type })
      if (upErr) { setError(upErr.message); return }
      const { data: { publicUrl } } = supabase.storage.from('card-cinematics').getPublicUrl(path)
      patch({ [slot]: publicUrl, uploadedAt: v.uploadedAt ?? new Date().toISOString() } as Partial<CinematicData>)
      setWarns(localWarns)
    } catch (e) {
      setError(String(e))
    } finally {
      setBusy(null)
      if (refs[slot].current) refs[slot].current!.value = ''
    }
  }

  const removeSlot = (slot: Slot) => patch({ [slot]: undefined } as Partial<CinematicData>)
  const toggleTrigger = (t: CinematicTriggerSource) => {
    const cur = v.triggerSources ?? ['playedFromHand']
    const next = cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t]
    patch({ triggerSources: next.length ? next : undefined })
  }

  // Validacijos užuominos
  const validation: string[] = []
  if (v.enabled && !v.webm && !v.mp4 && !v.poster) validation.push('⛔ Įjungta, bet nėra NEI video, NEI poster — nieko nebus rodoma.')
  if (v.enabled && (v.webm || v.mp4) && !v.poster) validation.push('⚠ Nėra poster — reduced-motion / video krovimo fallback bus silpnesnis.')
  if (v.enabled && v.webm && !v.mp4) validation.push('⚠ Yra WebM, bet nėra MP4 — senesni/Apple naršyklių palaikymas silpnesnis.')
  if (v.enabled && !v.webm && !v.mp4 && v.poster) validation.push('ℹ Tik poster — bus rodomas statinis vaizdas (be video).')

  const SlotRow = ({ slot, label }: { slot: Slot; label: string }) => {
    const url = v[slot]
    const Icon = slot === 'poster' ? ImageIcon : Film
    return (
      <div className="flex items-center gap-2 rounded-lg px-2 py-1.5"
        style={{ background: 'var(--bg-elevated)', border: '1px solid var(--bg-border)' }}>
        <Icon className="w-3.5 h-3.5 shrink-0" style={{ color: url ? 'var(--gold)' : 'var(--text-muted)' }} />
        <span className="text-[11px] flex-1 truncate" style={{ color: url ? 'var(--text-secondary)' : 'var(--text-muted)' }}>
          {label}{url ? `: ${url.split('/').pop()}` : ' — (nėra)'}
        </span>
        {url && slot === 'poster' && (
          <a href={url} target="_blank" rel="noreferrer" className="p-1 rounded hover:opacity-70" title="Atidaryti" style={{ color: 'var(--gold)' }}>
            <Play className="w-3.5 h-3.5" />
          </a>
        )}
        <input ref={refs[slot]} type="file" accept={ACCEPT[slot]} className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(slot, f) }} />
        <button type="button" onClick={() => refs[slot].current?.click()} disabled={busy === slot}
          className="p-1 rounded hover:opacity-70" title={url ? 'Pakeisti' : 'Įkelti'} style={{ color: 'var(--text-secondary)' }}>
          {busy === slot ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
        </button>
        {url && (
          <button type="button" onClick={() => removeSlot(slot)} className="p-1 rounded hover:opacity-70" title="Pašalinti" style={{ color: '#ef4444' }}>
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {/* Enable toggle */}
      <label className="flex items-center gap-2 cursor-pointer">
        <input type="checkbox" checked={!!v.enabled} onChange={(e) => patch({ enabled: e.target.checked })} className="w-4 h-4 accent-yellow-400" />
        <span className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Įjungti kino pop-up</span>
      </label>

      <div className={v.enabled ? '' : 'opacity-60'}>
        <SlotRow slot="webm" label="Primary / WebM" />
        <div className="h-1.5" />
        <SlotRow slot="mp4" label="Fallback / MP4" />
        <div className="h-1.5" />
        <SlotRow slot="poster" label="Poster (WebP/JPG/PNG)" />

        {/* Preview player */}
        {(v.webm || v.mp4) && (
          <div className="mt-2 rounded-lg overflow-hidden" style={{ border: '1px solid var(--bg-border)', maxWidth: 280 }}>
            <video controls muted playsInline preload="metadata" poster={v.poster}
              style={{ width: '100%', display: 'block', background: '#000' }}>
              {v.webm && <source src={v.webm} type="video/webm" />}
              {v.mp4 && <source src={v.mp4} type="video/mp4" />}
            </video>
          </div>
        )}
        {!v.webm && !v.mp4 && v.poster && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={v.poster} alt="poster" className="mt-2 rounded-lg" style={{ maxWidth: 200, border: '1px solid var(--bg-border)' }} />
        )}

        {/* Metadata */}
        <div className="grid grid-cols-2 gap-2 mt-2">
          <div>
            <label style={labelStyle}>Trukmė (ms) — override</label>
            <input type="number" min={minDuration} max={CINEMATIC_MAX_DURATION_MS} placeholder={String(defaultDuration)}
              value={v.durationMs ?? ''} onChange={(e) => patch({ durationMs: e.target.value ? Number(e.target.value) : undefined })}
              style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Rėmo tema</label>
            <select value={v.frameTheme ?? ''} onChange={(e) => patch({ frameTheme: (e.target.value || undefined) as CinematicFrameTheme | undefined })} style={inputStyle}>
              <option value="">(auto pagal frakciją)</option>
              {CINEMATIC_FRAME_THEMES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
        </div>
        <div className="mt-2">
          <label style={labelStyle}>Pavadinimas — override</label>
          <input type="text" placeholder={defaultTitle ? `(tuščia → „${defaultTitle}")` : '(tuščia → kortos vardas)'}
            value={v.titleOverride ?? ''} onChange={(e) => patch({ titleOverride: e.target.value || undefined })} style={inputStyle} />
        </div>

        {showTriggerSources && (
          <div className="mt-2">
            <label style={labelStyle}>Trigerio šaltiniai (kada rodyti)</label>
            <div className="flex flex-wrap gap-2">
              {CINEMATIC_TRIGGER_SOURCES.map((ts) => {
                const checked = (v.triggerSources ?? ['playedFromHand']).includes(ts.value)
                return (
                  <label key={ts.value} className="flex items-center gap-1 text-[11px] cursor-pointer px-2 py-1 rounded"
                    style={{ background: 'var(--bg-elevated)', border: '1px solid var(--bg-border)', color: 'var(--text-secondary)' }}>
                    <input type="checkbox" checked={checked} onChange={() => toggleTrigger(ts.value)} className="w-3 h-3 accent-yellow-400" />
                    {ts.label}
                  </label>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {error && <p className="text-[11px]" style={{ color: '#ef4444' }}>{error}</p>}
      {warns.map((w, i) => <p key={i} className="text-[10px]" style={{ color: '#f59e0b' }}>{w}</p>)}
      {validation.map((w, i) => <p key={i} className="text-[10px]" style={{ color: w.startsWith('⛔') ? '#ef4444' : w.startsWith('ℹ') ? 'var(--text-muted)' : '#f59e0b' }}>{w}</p>)}
      <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
        WebM+MP4+poster · 2.0–2.8 s (max 3.5) · 1280×720 · ~1–2 MB (max 5) · be garso · be teksto/vardo įdeginto į video.
      </p>
    </div>
  )
}
