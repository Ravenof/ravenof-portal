'use client'

// ── Admin: avatarų balsų peržiūra ir pataisos (821) ──────────────────────────
// Klipai guli žaidimo failuose; čia juos galima perklausyti, pažymėti blogus (išjungiami
// žaidime), pakeisti nauju failu arba pridėti papildomų. Viskas – lentelėje avatar_vo_overrides,
// failai – bucket'e 'avatar-audio'. Žaidimas pataisas pasiima kovos pradžioje (be naujos versijos).
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import voManifest from '@/lib/game/avatarVoManifest.json'
import voScript from '@/lib/game/avatarVoScript.json'
import type { VoOverride } from '@/lib/game/avatarVoOverrides'

type Lang = 'lt' | 'en'
const VO = voManifest as unknown as { voices: Record<string, Partial<Record<Lang, Record<string, number>>>> }
const SCRIPT = voScript as unknown as { names: Record<string, [string, string]>; lines: Record<string, Record<string, [string, string]>> }

const EVENT_ORDER = ['fightStart', 'hit', 'bigHit', 'lowHp', 'spellCast', 'attack', 'kill', 'victory', 'defeat', 'selected', 'idle', 'timer', 'emoteHello', 'emoteWellPlayed', 'emoteThreat', 'emoteThanks', 'emoteOops']
const EVENT_LABEL: Record<string, string> = {
  fightStart: 'Kovos pradžia', hit: 'Smūgis (balsinė reakcija)', bigHit: 'Didelis smūgis', lowHp: 'Mažai gyvybių', spellCast: 'Burtas', attack: 'Puolimas',
  kill: 'Sunaikintas priešo padaras', victory: 'Pergalė', defeat: 'Pralaimėjimas', selected: 'Pasirinkimas', idle: 'Atsitiktinė replika', timer: 'Laikmatis',
  emoteHello: 'Emocija: sveikas', emoteWellPlayed: 'Emocija: gerai sužaista', emoteThreat: 'Emocija: grasinimas', emoteThanks: 'Emocija: ačiū', emoteOops: 'Emocija: oi',
}
const avatarId = (slug: string) => 'av_' + slug.replace(/-/g, '_')
const btn = 'text-[11px] px-2 py-1 rounded disabled:opacity-40'
const tone = (bg: string, bd: string, col: string) => ({ background: bg, border: '1px solid ' + bd, color: col }) as React.CSSProperties

export function AvatarVoicesClient() {
  const slugs = useMemo(() => Object.keys(VO.voices).sort((a, b) => (SCRIPT.names[a]?.[0] ?? a).localeCompare(SCRIPT.names[b]?.[0] ?? b, 'lt')), [])
  const [slug, setSlug] = useState(slugs[0] ?? '')
  const [lang, setLang] = useState<Lang>('lt')
  const [rows, setRows] = useState<VoOverride[]>([])
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [onlyBad, setOnlyBad] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [playing, setPlaying] = useState<string | null>(null)
  const supabase = useMemo(() => createClient(), [])

  const load = useCallback(async () => {
    if (!slug) return
    const { data, error } = await supabase.from('avatar_vo_overrides').select('*').eq('avatar_id', avatarId(slug)).eq('lang', lang).order('id')
    if (error) { setMsg({ ok: false, text: 'Nepavyko nuskaityti pataisų: ' + error.message + ' (ar paleista migracija 20261121_avatar_vo_overrides?)' }); setRows([]); return }
    setRows((data as VoOverride[]) ?? [])
  }, [slug, lang, supabase])
  useEffect(() => { setMsg(null); void load() }, [load])

  const events = VO.voices[slug]?.[lang] ?? {}
  const evNames = [...EVENT_ORDER.filter((e) => e in events), ...Object.keys(events).filter((e) => !EVENT_ORDER.includes(e))]
  const builtinUrl = (ev: string, n: number) => `/avatars/v2/${slug}/vo/${lang}/${ev}-${n}.mp3`
  const textOf = (ev: string, n: number) => SCRIPT.lines[slug]?.[`${ev}-${n}`]?.[lang === 'lt' ? 0 : 1] ?? ''
  const rowFor = (ev: string, n: number) => rows.find((r) => r.event === ev && r.variant === n) ?? null
  const extras = (ev: string) => rows.filter((r) => r.event === ev && r.variant == null)

  const play = (url: string) => {
    try {
      audioRef.current?.pause()
      if (playing === url) { setPlaying(null); return }
      const a = new Audio(url); audioRef.current = a; setPlaying(url)
      a.onended = () => setPlaying((p) => (p === url ? null : p))
      a.onerror = () => { setPlaying(null); setMsg({ ok: false, text: 'Nepavyko sugroti: ' + url }) }
      void a.play()
    } catch { /* */ }
  }

  const run = async (fn: () => Promise<string | null>) => {
    setBusy(true); setMsg(null)
    try { const err = await fn(); if (err) setMsg({ ok: false, text: err }); await load() } finally { setBusy(false) }
  }
  const upsertVariant = (ev: string, n: number, patch: Partial<VoOverride>) => run(async () => {
    const cur = rowFor(ev, n)
    const { data: u } = await supabase.auth.getUser()
    if (cur) {
      const next = { disabled: cur.disabled, file_url: cur.file_url, ...patch }
      // nieko nebekeičia → eilutės nebereikia
      if (!next.disabled && !next.file_url) { const { error } = await supabase.from('avatar_vo_overrides').delete().eq('id', cur.id); return error?.message ?? null }
      const { error } = await supabase.from('avatar_vo_overrides').update({ ...patch, updated_by: u.user?.id ?? null, updated_at: new Date().toISOString() }).eq('id', cur.id)
      return error?.message ?? null
    }
    const { error } = await supabase.from('avatar_vo_overrides').insert({ avatar_id: avatarId(slug), lang, event: ev, variant: n, disabled: false, file_url: null, ...patch, updated_by: u.user?.id ?? null })
    return error?.message ?? null
  })
  const uploadFile = async (ev: string, tag: string, file: File): Promise<{ url?: string; error?: string }> => {
    if (!/audio\//.test(file.type) && !/\.(mp3|ogg|wav)$/i.test(file.name)) return { error: 'Tai ne garso failas.' }
    if (file.size > 2 * 1024 * 1024) return { error: 'Failas per didelis (daugiausia 2 MB vienam klipui).' }
    const ext = (file.name.match(/\.[a-z0-9]+$/i)?.[0] ?? '.mp3').toLowerCase()
    const path = `vo/${slug}/${lang}/${ev}-${tag}-${Date.now()}${ext}`
    const { error } = await supabase.storage.from('avatar-audio').upload(path, file, { upsert: true, contentType: file.type || 'audio/mpeg', cacheControl: '31536000' })
    if (error) return { error: 'Įkelti nepavyko: ' + error.message }
    return { url: supabase.storage.from('avatar-audio').getPublicUrl(path).data.publicUrl }
  }
  const replaceVariant = (ev: string, n: number, file: File) => run(async () => {
    const up = await uploadFile(ev, String(n), file); if (up.error) return up.error
    const cur = rowFor(ev, n)
    const { data: u } = await supabase.auth.getUser()
    const { error } = cur
      ? await supabase.from('avatar_vo_overrides').update({ file_url: up.url, disabled: false, updated_by: u.user?.id ?? null, updated_at: new Date().toISOString() }).eq('id', cur.id)
      : await supabase.from('avatar_vo_overrides').insert({ avatar_id: avatarId(slug), lang, event: ev, variant: n, disabled: false, file_url: up.url, updated_by: u.user?.id ?? null })
    return error?.message ?? null
  })
  const addExtra = (ev: string, file: File) => run(async () => {
    const up = await uploadFile(ev, 'x', file); if (up.error) return up.error
    const { data: u } = await supabase.auth.getUser()
    const { error } = await supabase.from('avatar_vo_overrides').insert({ avatar_id: avatarId(slug), lang, event: ev, variant: null, disabled: false, file_url: up.url, note: file.name, updated_by: u.user?.id ?? null })
    return error?.message ?? null
  })
  const removeRow = (id: number) => run(async () => { const { error } = await supabase.from('avatar_vo_overrides').delete().eq('id', id); return error?.message ?? null })

  const badList = rows.filter((r) => r.variant != null && r.disabled)
  const copyBad = async () => {
    const name = SCRIPT.names[slug]?.[lang === 'lt' ? 0 : 1] ?? slug
    const lines = badList.sort((a, b) => a.event.localeCompare(b.event) || (a.variant ?? 0) - (b.variant ?? 0))
      .map((r) => `${slug}/${lang}/${r.event}-${r.variant}.mp3\t${textOf(r.event, r.variant ?? 0)}`)
    const text = `${name} (${lang.toUpperCase()}) – blogi klipai: ${lines.length}\n` + lines.join('\n')
    try { await navigator.clipboard.writeText(text); setMsg({ ok: true, text: `Nukopijuota: ${lines.length} eil.` }) } catch { setMsg({ ok: false, text: 'Nepavyko nukopijuoti.' }) }
  }

  if (!slugs.length) return <div className="text-sm" style={{ color: 'var(--text-muted)' }}>Dar nė vienas avataras neturi įkeltų balso klipų.</div>

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <select value={slug} onChange={(e) => setSlug(e.target.value)} className="px-2 py-1.5 text-sm rounded bg-[var(--bg-elevated)] border border-[var(--bg-border)] text-[var(--text-primary)]">
          {slugs.map((s) => <option key={s} value={s}>{SCRIPT.names[s]?.[0] ?? s}</option>)}
        </select>
        {(['lt', 'en'] as Lang[]).map((l) => (
          <button key={l} type="button" onClick={() => setLang(l)} disabled={!VO.voices[slug]?.[l]} className={btn}
            style={lang === l ? tone('rgba(240,180,41,0.18)', 'rgba(240,180,41,0.6)', 'var(--gold)') : tone('var(--bg-elevated)', 'var(--bg-border)', 'var(--text-secondary)')}>{l.toUpperCase()}</button>
        ))}
        <label className="flex items-center gap-1 text-xs ml-2" style={{ color: 'var(--text-secondary)' }}>
          <input type="checkbox" checked={onlyBad} onChange={(e) => setOnlyBad(e.target.checked)} /> rodyti tik pažymėtus ir pakeistus
        </label>
        <span className="text-xs ml-auto" style={{ color: badList.length ? '#fca5a5' : 'var(--text-muted)' }}>Blogų: {badList.length}</span>
        <button type="button" onClick={copyBad} disabled={!badList.length} className={btn} style={tone('var(--bg-elevated)', 'var(--bg-border)', 'var(--text-secondary)')}>Kopijuoti blogų sąrašą</button>
      </div>
      {msg && <div className="text-xs" style={{ color: msg.ok ? '#7bd389' : '#ef4444' }}>{msg.text}</div>}
      <div className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
        „Blogas" išjungia klipą žaidime (lieka kiti variantai). „Pakeisti" įkelia naują failą vietoj jo. Pakeitimai įsigalioja kitos kovos pradžioje, naujos versijos nereikia.
        Dialogų eilučių čia dar nėra.
      </div>

      {evNames.map((ev) => {
        const n = events[ev] ?? 0
        const idx = Array.from({ length: n }, (_, i) => i + 1)
        const ex = extras(ev)
        const live = idx.filter((i) => !rowFor(ev, i)?.disabled).length + ex.length
        const shown = onlyBad ? idx.filter((i) => rowFor(ev, i)) : idx
        if (onlyBad && !shown.length && !ex.length) return null
        return (
          <section key={ev} className="rounded-lg p-3" style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-border)' }}>
            <div className="flex items-center gap-2 mb-2">
              <h2 className="text-sm font-bold" style={{ color: 'var(--gold)' }}>{EVENT_LABEL[ev] ?? ev}</h2>
              <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{ev}</span>
              <span className="text-[11px] ml-auto" style={{ color: live === 0 ? '#ef4444' : 'var(--text-muted)' }}>{live === 0 ? 'Visi išjungti – šis įvykis tylės' : `veikia ${live}`}</span>
            </div>
            <div className="flex flex-col gap-1">
              {shown.map((i) => {
                const r = rowFor(ev, i)
                const url = r?.file_url || builtinUrl(ev, i)
                return (
                  <div key={i} className="flex flex-wrap items-center gap-2 px-2 py-1 rounded" style={{ background: r?.disabled ? 'rgba(239,68,68,0.08)' : r?.file_url ? 'rgba(125,211,252,0.07)' : 'transparent', opacity: r?.disabled ? 0.75 : 1 }}>
                    <button type="button" onClick={() => play(url)} className={btn} style={tone('rgba(240,180,41,0.14)', 'rgba(240,180,41,0.4)', 'var(--gold)')}>{playing === url ? '■' : '▶'} {i}</button>
                    <span className="text-xs flex-1 min-w-[220px]" style={{ color: 'var(--text-secondary)', textDecoration: r?.disabled ? 'line-through' : undefined }}>{textOf(ev, i) || '—'}</span>
                    {r?.file_url && <span className="text-[10px] px-1.5 py-0.5 rounded" style={tone('rgba(125,211,252,0.12)', 'rgba(125,211,252,0.4)', '#7dd3fc')}>pakeistas</span>}
                    <button type="button" disabled={busy} onClick={() => upsertVariant(ev, i, { disabled: !r?.disabled })} className={btn}
                      style={r?.disabled ? tone('rgba(123,211,137,0.14)', 'rgba(123,211,137,0.4)', '#7bd389') : tone('rgba(239,68,68,0.12)', 'rgba(239,68,68,0.4)', '#fca5a5')}>{r?.disabled ? 'Grąžinti' : 'Blogas'}</button>
                    <label className={btn + ' cursor-pointer'} style={tone('var(--bg-elevated)', 'var(--bg-border)', 'var(--text-secondary)')}>
                      Pakeisti
                      <input type="file" accept=".mp3,.ogg,.wav,audio/mpeg,audio/ogg,audio/wav" className="hidden" disabled={busy} onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) void replaceVariant(ev, i, f) }} />
                    </label>
                    {r?.file_url && <button type="button" disabled={busy} onClick={() => upsertVariant(ev, i, { file_url: null })} className={btn} style={tone('var(--bg-elevated)', 'var(--bg-border)', 'var(--text-muted)')}>Originalas</button>}
                  </div>
                )
              })}
              {ex.map((r) => (
                <div key={r.id} className="flex flex-wrap items-center gap-2 px-2 py-1 rounded" style={{ background: 'rgba(123,211,137,0.07)' }}>
                  <button type="button" onClick={() => r.file_url && play(r.file_url)} className={btn} style={tone('rgba(123,211,137,0.14)', 'rgba(123,211,137,0.4)', '#7bd389')}>{playing === r.file_url ? '■' : '▶'} +</button>
                  <span className="text-xs flex-1 min-w-[220px]" style={{ color: 'var(--text-secondary)' }}>Papildomas klipas{r.note ? `: ${r.note}` : ''}</span>
                  <button type="button" disabled={busy} onClick={() => removeRow(r.id)} className={btn} style={tone('rgba(239,68,68,0.12)', 'rgba(239,68,68,0.4)', '#fca5a5')}>Ištrinti</button>
                </div>
              ))}
              <label className={btn + ' cursor-pointer self-start mt-1'} style={tone('var(--bg-elevated)', 'var(--bg-border)', 'var(--text-secondary)')}>
                + Pridėti klipą šiam įvykiui
                <input type="file" accept=".mp3,.ogg,.wav,audio/mpeg,audio/ogg,audio/wav" className="hidden" disabled={busy} onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) void addExtra(ev, f) }} />
              </label>
            </div>
          </section>
        )
      })}
    </div>
  )
}
