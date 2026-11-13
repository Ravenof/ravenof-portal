'use client'

// ── SkillComicUpload — čempiono gebėjimo komikso intarpo paveikslėlis ─────────
// Vienas platus paveikslėlis → card-cinematics bucket (cards/<nr>/comic/), WebP.
// 1 ir 2 gebėjimas – vienas kadras; 3 gebėjimas (arba kainuojantis auksą) – auksinis
// ultimate su akių juosta (ji imama iš kortos iškvietimo rinkinio close-up).

import { useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Upload, Loader2, Trash2, ImageIcon } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toWebp, LONG_CACHE } from '@/lib/img-optimize'
import type { SkillComic, ComicFocusPoint, SummonComic, CinematicFrameTheme } from '@/lib/game/types'
import { COMIC_RGB } from '@/lib/game/cinematics'
import type { ComicSpec } from '@/lib/game/comicStage'
import { ComicCinematicOverlay } from '@/components/tutorial/ComicCinematicOverlay'

const MAX_BYTES = 8 * 1024 * 1024
const inputStyle: React.CSSProperties = {
  padding: '0.15rem 0.3rem', borderRadius: '0.4rem', fontSize: '0.75rem', width: 48,
  background: 'var(--bg-elevated)', border: '1px solid var(--bg-border)', color: 'var(--text-primary)', outline: 'none',
}

export function SkillComicUpload({ value, onChange, cardId, cardNumber, skillIndex, isUlt, skillName, summonComic }: {
  value: SkillComic | undefined
  onChange: (next: SkillComic | undefined) => void
  cardId: string | null
  cardNumber: string
  skillIndex: number
  isUlt: boolean
  skillName: string
  /** Kortos iškvietimo rinkinys – iš jo imama spalva ir ultimate akių juosta. */
  summonComic?: SummonComic
}) {
  const v: Partial<SkillComic> = value ?? {}
  const def: ComicFocusPoint = isUlt ? [50, 35] : [50, 50]
  const f = v.focus ?? def
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pv, setPv] = useState<{ rep: boolean; n: number } | null>(null)
  const ref = useRef<HTMLInputElement>(null)

  const patch = (p: Partial<SkillComic>) => {
    const next = { ...v, ...p, enabled: (p.enabled ?? v.enabled) === true } as SkillComic
    onChange(!next.enabled && !next.image ? undefined : next)
  }
  async function upload(file: File) {
    setError(null)
    if (!['image/webp', 'image/jpeg', 'image/png'].includes(file.type)) { setError(`Netinkamas formatas (${file.name}). Reikia WebP / JPG / PNG.`); return }
    if (file.size === 0) { setError('Failas tuščias.'); return }
    if (file.size > MAX_BYTES) { setError(`Per didelis: ${(file.size / 1048576).toFixed(1)} MB (max 8 MB prieš suspaudimą).`); return }
    setBusy(true)
    try {
      const opt = await toWebp(file, { maxW: 1600 })
      const supabase = createClient()
      const base = cardNumber.trim() || cardId || 'temp'
      const path = `cards/${base}/comic/${Date.now()}-skill${skillIndex + 1}.${opt.ext}`
      const { error: upErr } = await supabase.storage.from('card-cinematics')
        .upload(path, opt.blob, { upsert: true, contentType: opt.contentType, cacheControl: LONG_CACHE })
      if (upErr) { setError(upErr.message); return }
      const { data: { publicUrl } } = supabase.storage.from('card-cinematics').getPublicUrl(path)
      patch({ image: publicUrl, enabled: v.enabled ?? true })
    } catch (e) {
      setError(String(e))
    } finally {
      setBusy(false)
      if (ref.current) ref.current.value = ''
    }
  }
  const setFocus = (i: 0 | 1, raw: string) => {
    const cur: ComicFocusPoint = [...f] as ComicFocusPoint
    const n = Number(raw); cur[i] = Number.isFinite(n) ? Math.min(100, Math.max(0, Math.round(n))) : def[i]
    patch({ focus: cur })
  }
  const theme = (summonComic?.frameTheme ?? 'default') as CinematicFrameTheme
  const spec = (rep: boolean): ComicSpec => isUlt
    ? { level: 'full', kind: 'ult', rep, image: v.image, imageFocus: v.focus, closeup: summonComic?.closeup, focus: summonComic?.focus, title: skillName || 'Gebėjimo pavadinimas', rgb: theme === 'holy' ? '255,246,215' : '255,200,70' }
    : { level: 'short', kind: 'skill', rep, image: v.image, imageFocus: v.focus, side: skillIndex === 1 ? 'left' : 'right', soft: skillIndex === 1, title: rep ? '' : (skillName || 'Gebėjimo pavadinimas'), rgb: COMIC_RGB[theme] ?? COMIC_RGB.default }

  return (
    <div className="space-y-1.5">
      <label className="flex items-center gap-2 cursor-pointer">
        <input type="checkbox" checked={!!v.enabled} onChange={(e) => patch({ enabled: e.target.checked })} className="w-4 h-4 accent-yellow-400" />
        <span className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
          Įjungti komikso intarpą ({isUlt ? 'ultimate – auksinis, du kadrai' : 'vienas kadras'}; turi pirmenybę prieš video)
        </span>
      </label>
      <div className="rounded-lg px-2 py-1.5 flex items-center gap-2" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--bg-border)' }}>
        {v.image
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={v.image} alt="" style={{ width: 54, height: 34, objectFit: 'cover', objectPosition: `${f[0]}% ${f[1]}%`, borderRadius: 4, flexShrink: 0 }} />
          : <ImageIcon className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--text-muted)' }} />}
        <span className="text-[11px] flex-1 truncate" style={{ color: v.image ? 'var(--text-secondary)' : 'var(--text-muted)' }}>
          Gebėjimo kadras <span style={{ color: 'var(--text-muted)' }}>· {isUlt ? '~3:2, platus' : '~2:1, platus'}</span>{v.image ? '' : ' — (nėra)'}
        </span>
        {v.image && (
          <span className="flex items-center gap-1 text-[10px]" style={{ color: 'var(--text-muted)' }} title="Fokuso taškas (object-position %): kuri paveikslėlio vieta lieka kadre">
            X<input type="number" min={0} max={100} value={f[0]} onChange={(e) => setFocus(0, e.target.value)} style={inputStyle} />
            Y<input type="number" min={0} max={100} value={f[1]} onChange={(e) => setFocus(1, e.target.value)} style={inputStyle} />
          </span>
        )}
        <input ref={ref} type="file" accept="image/webp,image/jpeg,image/png" className="hidden"
          onChange={(e) => { const fl = e.target.files?.[0]; if (fl) void upload(fl) }} />
        <button type="button" onClick={() => ref.current?.click()} disabled={busy} className="p-1 rounded hover:opacity-70" title={v.image ? 'Pakeisti' : 'Įkelti'} style={{ color: 'var(--text-secondary)' }}>
          {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
        </button>
        {v.image && (
          <button type="button" onClick={() => patch({ image: undefined })} className="p-1 rounded hover:opacity-70" title="Pašalinti" style={{ color: '#ef4444' }}>
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[10px] font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>Peržiūra:</span>
        {([[false, 'Pirmas kartas'], [true, 'Pakartotinis']] as [boolean, string][]).map(([rep, lb]) => (
          <button key={lb} type="button" disabled={!v.image} onClick={() => setPv({ rep, n: Date.now() })}
            className="px-2.5 py-1 rounded-lg text-[11px] font-bold"
            style={{ background: 'var(--gold)', color: '#0a0a0f', cursor: v.image ? 'pointer' : 'not-allowed', opacity: v.image ? 1 : 0.5 }}>▶ {lb}</button>
        ))}
      </div>
      {error && <p className="text-[11px]" style={{ color: '#ef4444' }}>{error}</p>}
      {v.enabled && !v.image && <p className="text-[10px]" style={{ color: '#ef4444' }}>⛔ Įjungta, bet nėra paveikslėlio – intarpas nebus rodomas.</p>}
      {isUlt && v.image && !summonComic?.closeup && <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>ℹ Akių juosta imama iš iškvietimo rinkinio close-up – jo nėra, todėl ultimate rodys tik didįjį kadrą.</p>}
      {pv && typeof document !== 'undefined' && createPortal(
        <ComicCinematicOverlay key={pv.n} comic={spec(pv.rep)} onFinished={() => setPv(null)} />, document.body,
      )}
    </div>
  )
}
