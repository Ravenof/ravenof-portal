'use client'

// ── ComicUpload — komikso intarpo („Kirtis") paveikslėlių rinkinys kortai ─────
// 3 lizdai (close-up, veiksmas, herojus) → card-cinematics bucket (cards/<nr>/comic/),
// konvertuojama į WebP. Saugo tik URL + fokuso taškus į gameplay.summonComic.
// „▶" mygtukai groja tikrą intarpą (tas pats comicStage kaip kovoje).

import { useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Upload, Loader2, Trash2, ImageIcon } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toWebp, LONG_CACHE } from '@/lib/img-optimize'
import { CINEMATIC_FRAME_THEMES, type CinematicFrameTheme, type SummonComic, type ComicFocusPoint } from '@/lib/game/types'
import { COMIC_RGB } from '@/lib/game/cinematics'
import { COMIC_TEMPLATES, COMIC_KITS, type ComicLevel, type ComicTemplate, type ComicKit } from '@/lib/game/comicStage'
import { ComicCinematicOverlay } from '@/components/tutorial/ComicCinematicOverlay'

type Slot = 'closeup' | 'action' | 'hero'
const SLOTS: { slot: Slot; label: string; hint: string; maxW: number; focus: ComicFocusPoint }[] = [
  { slot: 'closeup', label: 'Close-up (akys / veidas)', hint: '~3:1, labai platus', maxW: 1600, focus: [50, 50] },
  { slot: 'action', label: 'Veiksmas', hint: '~2:1, platus', maxW: 1600, focus: [55, 62] },
  { slot: 'hero', label: 'Herojus (visa figūra)', hint: '~3:4, stačias', maxW: 1100, focus: [48, 30] },
]
const MAX_BYTES = 8 * 1024 * 1024

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '0.4rem 0.5rem', borderRadius: '0.4rem', fontSize: '0.75rem',
  background: 'var(--bg-elevated)', border: '1px solid var(--bg-border)', color: 'var(--text-primary)', outline: 'none',
}
const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: '0.6rem', fontWeight: 600, color: 'var(--text-muted)',
  marginBottom: '0.2rem', textTransform: 'uppercase', letterSpacing: '0.05em',
}

export function ComicUpload({ value, onChange, cardId, cardNumber }: {
  value: SummonComic | undefined
  onChange: (next: SummonComic | undefined) => void
  cardId: string | null
  cardNumber: string
}) {
  const v: Partial<SummonComic> = value ?? {}
  const [busy, setBusy] = useState<Slot | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pv, setPv] = useState<{ level: ComicLevel; n: number } | null>(null)
  const refs = { closeup: useRef<HTMLInputElement>(null), action: useRef<HTMLInputElement>(null), hero: useRef<HTMLInputElement>(null) }

  const patch = (p: Partial<SummonComic>) => {
    const next = { ...v, ...p, enabled: (p.enabled ?? v.enabled) === true, updatedAt: new Date().toISOString() } as SummonComic
    const empty = !next.enabled && !next.closeup && !next.action && !next.hero && !next.titleOverride && !next.frameTheme && !next.template && !next.kit
    onChange(empty ? undefined : next)
  }

  async function upload(slot: Slot, file: File, maxW: number) {
    setError(null)
    if (!['image/webp', 'image/jpeg', 'image/png'].includes(file.type)) { setError(`Netinkamas formatas (${file.name}). Reikia WebP / JPG / PNG.`); return }
    if (file.size === 0) { setError('Failas tuščias.'); return }
    if (file.size > MAX_BYTES) { setError(`Per didelis: ${(file.size / 1048576).toFixed(1)} MB (max 8 MB prieš suspaudimą).`); return }
    setBusy(slot)
    try {
      const opt = await toWebp(file, { maxW })
      const supabase = createClient()
      const base = cardNumber.trim() || cardId || 'temp'
      const path = `cards/${base}/comic/${Date.now()}-${slot}.${opt.ext}`
      const { error: upErr } = await supabase.storage.from('card-cinematics')
        .upload(path, opt.blob, { upsert: true, contentType: opt.contentType, cacheControl: LONG_CACHE })
      if (upErr) { setError(upErr.message); return }
      const { data: { publicUrl } } = supabase.storage.from('card-cinematics').getPublicUrl(path)
      patch({ [slot]: publicUrl } as Partial<SummonComic>)
    } catch (e) {
      setError(String(e))
    } finally {
      setBusy(null)
      const el = refs[slot].current; if (el) el.value = ''
    }
  }

  const setFocus = (slot: Slot, i: 0 | 1, raw: string, def: ComicFocusPoint) => {
    const cur: ComicFocusPoint = [...(v.focus?.[slot] ?? def)] as ComicFocusPoint
    const n = Number(raw); cur[i] = Number.isFinite(n) ? Math.min(100, Math.max(0, Math.round(n))) : def[i]
    patch({ focus: { ...(v.focus ?? {}), [slot]: cur } })
  }

  const validation: string[] = []
  if (v.enabled && !v.closeup && !v.hero) validation.push('⛔ Įjungta, bet nėra nei close-up, nei herojaus paveikslėlio – intarpas nebus rodomas.')
  else if (v.enabled && !(v.closeup && v.hero)) validation.push('⚠ Yra tik vienas iš close-up / herojaus – bus rodoma tik trumpa (1 kadro) versija.')
  else if (v.enabled && !v.action) validation.push('ℹ Nėra veiksmo paveikslėlio – legendinė / čempionas gaus vidutinę (2 kadrų) versiją vietoj pilnos.')

  const canPreview = !!(v.closeup || v.hero)
  const rgb = COMIC_RGB[(v.frameTheme ?? 'default') as CinematicFrameTheme] ?? COMIC_RGB.default

  return (
    <div className="space-y-2">
      <label className="flex items-center gap-2 cursor-pointer">
        <input type="checkbox" checked={!!v.enabled} onChange={(e) => patch({ enabled: e.target.checked })} className="w-4 h-4 accent-yellow-400" />
        <span className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Įjungti komikso intarpą (turi pirmenybę prieš video)</span>
      </label>

      <div className={v.enabled ? 'space-y-1.5' : 'space-y-1.5 opacity-60'}>
        {SLOTS.map(({ slot, label, hint, maxW, focus }) => {
          const url = v[slot]
          const f = v.focus?.[slot] ?? focus
          return (
            <div key={slot} className="rounded-lg px-2 py-1.5" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--bg-border)' }}>
              <div className="flex items-center gap-2">
                {url
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={url} alt="" style={{ width: 54, height: 34, objectFit: 'cover', objectPosition: `${f[0]}% ${f[1]}%`, borderRadius: 4, flexShrink: 0 }} />
                  : <ImageIcon className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--text-muted)' }} />}
                <span className="text-[11px] flex-1 truncate" style={{ color: url ? 'var(--text-secondary)' : 'var(--text-muted)' }}>
                  {label} <span style={{ color: 'var(--text-muted)' }}>· {hint}</span>{url ? '' : ' — (nėra)'}
                </span>
                {url && (
                  <span className="flex items-center gap-1 text-[10px]" style={{ color: 'var(--text-muted)' }} title="Fokuso taškas (object-position %): kuri paveikslėlio vieta lieka kadre">
                    X<input type="number" min={0} max={100} value={f[0]} onChange={(e) => setFocus(slot, 0, e.target.value, focus)} style={{ ...inputStyle, width: 48, padding: '0.15rem 0.3rem' }} />
                    Y<input type="number" min={0} max={100} value={f[1]} onChange={(e) => setFocus(slot, 1, e.target.value, focus)} style={{ ...inputStyle, width: 48, padding: '0.15rem 0.3rem' }} />
                  </span>
                )}
                <input ref={refs[slot]} type="file" accept="image/webp,image/jpeg,image/png" className="hidden"
                  onChange={(e) => { const fl = e.target.files?.[0]; if (fl) void upload(slot, fl, maxW) }} />
                <button type="button" onClick={() => refs[slot].current?.click()} disabled={busy === slot}
                  className="p-1 rounded hover:opacity-70" title={url ? 'Pakeisti' : 'Įkelti'} style={{ color: 'var(--text-secondary)' }}>
                  {busy === slot ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                </button>
                {url && (
                  <button type="button" onClick={() => patch({ [slot]: undefined } as Partial<SummonComic>)} className="p-1 rounded hover:opacity-70" title="Pašalinti" style={{ color: '#ef4444' }}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          )
        })}

        <div className="grid grid-cols-2 gap-2 mt-2">
          <div>
            <label style={labelStyle}>Šablonas (pilnam intarpui)</label>
            <select value={v.template ?? ''} onChange={(e) => patch({ template: (e.target.value || undefined) as ComicTemplate | undefined })} style={inputStyle}>
              <option value="">Žaibas (numatytas)</option>
              {COMIC_TEMPLATES.filter((t) => t.value !== 'zaibas').map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Personažo vizualai</label>
            <select value={v.kit ?? ''} onChange={(e) => patch({ kit: (e.target.value || undefined) as ComicKit | undefined })} style={inputStyle}>
              <option value="">(be papildomų – tik kadrai)</option>
              {COMIC_KITS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Spalva (tema)</label>
            <select value={v.frameTheme ?? ''} onChange={(e) => patch({ frameTheme: (e.target.value || undefined) as CinematicFrameTheme | undefined })} style={inputStyle}>
              <option value="">(auto pagal frakciją)</option>
              {CINEMATIC_FRAME_THEMES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Pavadinimas — override</label>
            <input type="text" placeholder="(tuščia → kortos vardas)" value={v.titleOverride ?? ''}
              onChange={(e) => patch({ titleOverride: e.target.value || undefined })} style={inputStyle} />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 mt-2">
          <span style={{ ...labelStyle, marginBottom: 0 }}>Peržiūra:</span>
          {([['full', 'Pilnas'], ['medium', 'Vidutinis'], ['short', 'Trumpas']] as [ComicLevel, string][]).map(([lv, lb]) => (
            <button key={lv} type="button" disabled={!canPreview} onClick={() => setPv({ level: lv, n: Date.now() })}
              className="px-2.5 py-1 rounded-lg text-[11px] font-bold"
              style={{ background: 'var(--gold)', color: '#0a0a0f', cursor: canPreview ? 'pointer' : 'not-allowed', opacity: canPreview ? 1 : 0.5 }}>▶ {lb}</button>
          ))}
        </div>
      </div>

      {error && <p className="text-[11px]" style={{ color: '#ef4444' }}>{error}</p>}
      {validation.map((w, i) => <p key={i} className="text-[10px]" style={{ color: w.startsWith('⛔') ? '#ef4444' : w.startsWith('ℹ') ? 'var(--text-muted)' : '#f59e0b' }}>{w}</p>)}
      <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
        Šablonas ir personažo vizualai parenkami čia; lygis parenkamas pats: Legendinė / čempionas – pilnas (3 kadrai), kitos kortos – vidutinis (2 kadrai), pakartotinis iškvietimas toje pačioje kovoje – trumpas.
        Paveikslėliai be teksto ir rėmų; svarbiausia dalis – centre. Peržiūroje spalva „auto" rodoma neutrali – kovoje bus frakcijos.
      </p>

      {pv && typeof document !== 'undefined' && createPortal(
        <ComicCinematicOverlay key={pv.n}
          comic={{ level: pv.level, template: v.template, kit: v.kit, closeup: v.closeup, action: v.action, hero: v.hero, title: pv.level === 'short' ? '' : ((v.titleOverride ?? '').trim() || 'Kortos vardas'), rgb, focus: v.focus }}
          onFinished={() => setPv(null)} />,
        document.body,
      )}
    </div>
  )
}
