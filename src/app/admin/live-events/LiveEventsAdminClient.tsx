'use client'

// ── Admin: live eventai + evento parduotuvė ──────────────────────────────────
// Lentelės live_events / event_shop_items (admin RLS). Serverio logika –
// supabase/migrations/20261115b_live_events.sql.
import { useCallback, useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toWebp, LONG_CACHE } from '@/lib/img-optimize'

type Recurrence = { days?: number[]; from?: number; to?: number } | null
type Row = {
  id: string; slug: string; kind: 'multiplier' | 'login_gift' | 'info'
  title_lt: string; title_en: string | null; body_lt: string | null; body_en: string | null
  image_url: string | null; image_focus: number[] | null; accent: string; cta_route: string | null
  priority: number; show_popup: boolean; enabled: boolean
  starts_at: string | null; ends_at: string | null; recurrence: Recurrence
  config: Record<string, unknown>; rewards: unknown
}
type Draft = Omit<Row, 'id'> & { id?: string }
type ShopRow = { id: string; kind: string; ref: string; amount: number; name_lt: string; name_en: string | null; price_tokens: number; limit_per_user: number | null; sort_order: number; is_active: boolean }

const KIND_LABEL: Record<Row['kind'], string> = { multiplier: 'Daugiklis', login_gift: 'Prisijungimo dovana', info: 'Tik baneris' }
const DAYS = [[1, 'Pr'], [2, 'An'], [3, 'Tr'], [4, 'Kt'], [5, 'Pn'], [6, 'Št'], [0, 'Sk']] as const
const ROUTES = [['', '— nėra —'], ['/digital/pve', 'Kova su DI'], ['/digital/ranked', 'Reitingas'], ['/digital/pvp', 'Draugiška kova'], ['/digital/collection', 'Kolekcija'], ['/digital/decks', 'Kaladės'], ['/digital/quests', 'Užduotys'], ['/digital/rewards', 'Kasdieniai atlygiai'], ['/digital/season', 'Sezono kelias']] as const
const DURATIONS = [[24, '24 val.'], [48, '48 val.'], [72, '3 d.'], [168, '7 d.'], [336, '14 d.']] as const

const box: React.CSSProperties = { background: 'var(--bg-surface)', border: '1px solid var(--bg-border)' }
const inp: React.CSSProperties = { background: '#0a0810', border: '1px solid var(--bg-border)', color: 'var(--text-primary)', borderRadius: 8, padding: '6px 8px', fontSize: 12, width: '100%' }
const lbl: React.CSSProperties = { fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: 3 }
const btn = (tone: 'gold' | 'ghost' | 'red' | 'green' = 'ghost'): React.CSSProperties => ({
  fontSize: 12, fontWeight: 700, padding: '6px 12px', borderRadius: 8, cursor: 'pointer',
  background: tone === 'gold' ? 'var(--gold)' : tone === 'red' ? 'rgba(248,113,113,.14)' : tone === 'green' ? 'rgba(52,211,153,.16)' : 'rgba(255,255,255,.04)',
  color: tone === 'gold' ? '#0a0a0f' : tone === 'red' ? '#f87171' : tone === 'green' ? '#34d399' : 'var(--text-primary)',
  border: `1px solid ${tone === 'gold' ? 'var(--gold)' : tone === 'red' ? 'rgba(248,113,113,.4)' : tone === 'green' ? 'rgba(52,211,153,.45)' : 'var(--bg-border)'}`,
})

/** Tas pats skaičiavimas kaip serverio rvn__event_live (Vilniaus laiku). */
function isLive(e: Row, now = new Date()): boolean {
  if (!e.enabled) return false
  if (e.starts_at && now < new Date(e.starts_at)) return false
  if (e.ends_at && now >= new Date(e.ends_at)) return false
  const r = e.recurrence
  if (!r) return true
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Vilnius', weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(now)
  const wd = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(parts.find((p) => p.type === 'weekday')?.value ?? '')
  const h = Number(parts.find((p) => p.type === 'hour')?.value ?? 0) % 24 + Number(parts.find((p) => p.type === 'minute')?.value ?? 0) / 60
  if (r.days && r.days.length > 0 && !r.days.includes(wd)) return false
  if (r.from != null && r.to != null && !(h >= r.from && h < r.to)) return false
  return true
}

function statusOf(e: Row): { text: string; color: string } {
  if (!e.enabled) return { text: 'Išjungtas', color: 'var(--text-muted)' }
  if (isLive(e)) return { text: 'GYVAS', color: '#34d399' }
  if (e.ends_at && new Date() >= new Date(e.ends_at)) return { text: 'Baigėsi', color: '#f87171' }
  return { text: 'Laukia grafiko', color: '#f0b429' }
}

function scheduleText(e: Row): string {
  const out: string[] = []
  const f = (s: string) => new Date(s).toLocaleString('lt-LT', { timeZone: 'Europe/Vilnius', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
  if (e.starts_at || e.ends_at) out.push(`${e.starts_at ? f(e.starts_at) : '…'} – ${e.ends_at ? f(e.ends_at) : 'be pabaigos'}`)
  const r = e.recurrence
  if (r?.days?.length) out.push(DAYS.filter(([d]) => r.days!.includes(d)).map(([, n]) => n).join(', '))
  if (r && r.from != null && r.to != null) out.push(`${r.from}–${r.to} val.`)
  return out.join(' · ') || 'visada, kol įjungtas'
}

const toLocalInput = (iso: string | null) => {
  if (!iso) return ''
  const d = new Date(iso); const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`
}
const fromLocalInput = (v: string) => (v ? new Date(v).toISOString() : null)

const EMPTY: Draft = {
  slug: '', kind: 'multiplier', title_lt: '', title_en: '', body_lt: '', body_en: '', image_url: null, image_focus: [50, 50],
  accent: '#d4a33b', cta_route: '/digital/pve', priority: 50, show_popup: true, enabled: false, starts_at: null, ends_at: null,
  recurrence: null, config: { silver: 2, modes: ['bot', 'unranked'] }, rewards: [],
}

const CONFIG_HELP = `Daugiklis: {"silver":2,"account_xp":2,"season_xp":2,"modes":["bot","unranked"]}
   + "first_win_only":true – tik pirmai dienos pergalei; "win_only":true – tik pergalėms
Dovana:    {"mode":"daily"}     kasdien, kol eventas gyvas
           {"mode":"once"}      vieną kartą per eventą
           {"mode":"calendar"}  N dienų kalendorius (atlygiai – masyvas masyvų)
           {"mode":"returning","absent_days":7}  sugrįžusiam po pertraukos`

const REWARD_HELP = `Atlygių pavyzdžiai (masyvas):
[{"type":"currency","currency":"silver","amount":200}]   sidabras (taip pat essence)
[{"type":"event_tokens","amount":50}]                    evento žetonai
[{"type":"item","item_type":"pack","item_id":"standard_pack","quantity":1}]   boosteris
[{"type":"cosmetic_pool","kind":"card_back","ids":[],"fallback":[{"type":"event_tokens","amount":150}]}]
   → pirma neturima kosmetika: iš "ids" sąrašo, o jei jis tuščias – bet kuri tos
     rūšies (card_back / avatar); jei viską turi – duodamas "fallback".
Kalendoriui – masyvas masyvų: po vieną kiekvienai dienai.`

function BannerPreview({ d }: { d: Draft }) {
  const focus = d.image_focus ?? [50, 50]
  const pos = `${focus[0]}% ${focus[1]}%`
  const img: React.CSSProperties = { position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: pos }
  if (!d.image_url) return null
  return (
    <div className="grid gap-3" style={{ gridTemplateColumns: '2fr 1fr' }}>
      <div>
        <label style={lbl}>Pop-up (visas ekranas)</label>
        <div style={{ position: 'relative', aspectRatio: '16 / 9', overflow: 'hidden', background: '#07060a' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={d.image_url} alt="" style={img} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, rgba(7,6,10,.94) 0%, rgba(7,6,10,.78) 34%, rgba(7,6,10,.18) 68%, rgba(7,6,10,.05) 100%)' }} />
          <div style={{ position: 'absolute', left: 14, top: '34%', right: '45%' }}>
            <div style={{ fontSize: 9, fontWeight: 700, background: d.accent, color: '#07060a', display: 'inline-block', padding: '1px 6px', letterSpacing: 2 }}>EVENTAS</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#fff', lineHeight: 1.1, marginTop: 4 }}>{d.title_lt || 'Pavadinimas'}</div>
            <div style={{ fontSize: 10, color: '#b9b2c2', marginTop: 4 }}>{d.body_lt}</div>
          </div>
        </div>
      </div>
      <div>
        <label style={lbl}>Mažas baneris (kompiuteryje)</label>
        <div style={{ position: 'relative', height: 96, overflow: 'hidden', border: `1px solid ${d.accent}`, background: '#0c0a11' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={d.image_url} alt="" style={img} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, rgba(7,6,10,.93) 0%, rgba(7,6,10,.7) 45%, rgba(7,6,10,.15) 100%)' }} />
          <div style={{ position: 'absolute', left: 12, top: 30, fontSize: 14, fontWeight: 700, color: '#fff' }}>{d.title_lt || 'Pavadinimas'}</div>
        </div>
        <label style={{ ...lbl, marginTop: 8 }}>Mažas baneris (telefone)</label>
        <div style={{ position: 'relative', height: 38, overflow: 'hidden', border: `1px solid ${d.accent}`, background: '#0c0a11' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={d.image_url} alt="" style={img} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, rgba(7,6,10,.93) 0%, rgba(7,6,10,.7) 45%, rgba(7,6,10,.15) 100%)' }} />
          <div style={{ position: 'absolute', left: 10, top: 11, fontSize: 11, fontWeight: 700, color: '#fff' }}>{d.title_lt || 'Pavadinimas'}</div>
        </div>
      </div>
    </div>
  )
}

export function LiveEventsAdminClient() {
  const [rows, setRows] = useState<Row[] | null>(null)
  const [shop, setShop] = useState<ShopRow[]>([])
  const [loadErr, setLoadErr] = useState<string | null>(null)
  const [edit, setEdit] = useState<Draft | null>(null)
  const [cfgText, setCfgText] = useState('')
  const [rwText, setRwText] = useState('')
  const [msg, setMsg] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [launchFor, setLaunchFor] = useState<string | null>(null)
  const [delFor, setDelFor] = useState<string | null>(null)
  const [, setTick] = useState(0)

  const load = useCallback(async () => {
    const supabase = createClient()
    const [{ data, error }, { data: sh }] = await Promise.all([
      supabase.from('live_events').select('*').order('priority', { ascending: false }).order('created_at', { ascending: false }),
      supabase.from('event_shop_items').select('*').order('sort_order').order('price_tokens'),
    ])
    if (error) { setLoadErr(error.message); setRows([]); return }
    setLoadErr(null); setRows((data as Row[]) ?? []); setShop((sh as ShopRow[]) ?? [])
  }, [])
  useEffect(() => { void load() }, [load])
  useEffect(() => { const i = setInterval(() => setTick((v) => v + 1), 30000); return () => clearInterval(i) }, [])

  const flash = (t: string) => { setMsg(t); setTimeout(() => setMsg(null), 3500) }

  const openEdit = (r: Row | null) => {
    const base: Draft = r ? { ...r } : { ...EMPTY }
    setEdit(base)
    setCfgText(JSON.stringify(base.config ?? {}, null, 2))
    setRwText(JSON.stringify(base.rewards ?? [], null, 2))
  }

  const patchRow = async (id: string, patch: Partial<Row>, okText: string) => {
    setBusy(true)
    const supabase = createClient()
    const { error } = await supabase.from('live_events').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', id)
    setBusy(false)
    if (error) { flash('❌ ' + error.message); return }
    flash(okText); void load()
  }

  /** „Paleisti dabar": pasikartojantiems – tik įjungia; kitiems – langas nuo dabar N valandų. */
  const launch = (r: Row, hours: number) => {
    setLaunchFor(null)
    const now = new Date()
    if (r.recurrence) return patchRow(r.id, { enabled: true, starts_at: null, ends_at: null }, `✓ „${r.title_lt}“ įjungtas pagal grafiką`)
    return patchRow(r.id, { enabled: true, starts_at: now.toISOString(), ends_at: new Date(now.getTime() + hours * 3600000).toISOString() }, `✓ „${r.title_lt}“ paleistas ${hours} val.`)
  }

  const save = async () => {
    if (!edit) return
    let config: Record<string, unknown>, rewards: unknown
    try { config = JSON.parse(cfgText || '{}') } catch { flash('❌ Netaisyklingas „config“ JSON'); return }
    try { rewards = JSON.parse(rwText || '[]') } catch { flash('❌ Netaisyklingas „atlygiai“ JSON'); return }
    if (!Array.isArray(rewards)) { flash('❌ Atlygiai turi būti masyvas [ ... ]'); return }
    const slug = edit.slug.trim().toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '')
    if (!slug || !edit.title_lt.trim()) { flash('❌ Reikia slug ir pavadinimo (LT)'); return }
    const rec = edit.recurrence
    const hasDays = !!rec?.days && rec.days.length > 0
    const hasHours = rec?.from != null && rec?.to != null
    const recurrence = hasDays || hasHours
      ? { ...(hasDays ? { days: rec!.days } : {}), ...(hasHours ? { from: rec!.from, to: rec!.to } : {}) }
      : null
    const payload = {
      slug, kind: edit.kind, title_lt: edit.title_lt.trim(), title_en: edit.title_en?.trim() || null,
      body_lt: edit.body_lt?.trim() || null, body_en: edit.body_en?.trim() || null,
      image_url: edit.image_url, image_focus: edit.image_focus ?? [50, 50], accent: edit.accent || '#d4a33b',
      cta_route: edit.cta_route || null, priority: Number(edit.priority) || 0, show_popup: edit.show_popup, enabled: edit.enabled,
      starts_at: edit.starts_at, ends_at: edit.ends_at, recurrence, config, rewards, updated_at: new Date().toISOString(),
    }
    setBusy(true)
    const supabase = createClient()
    const { error } = edit.id
      ? await supabase.from('live_events').update(payload).eq('id', edit.id)
      : await supabase.from('live_events').insert(payload)
    setBusy(false)
    if (error) { flash('❌ ' + error.message); return }
    flash('✓ Išsaugota'); setEdit(null); void load()
  }

  const remove = async (id: string) => {
    setDelFor(null); setBusy(true)
    const supabase = createClient()
    const { error } = await supabase.from('live_events').delete().eq('id', id)
    setBusy(false)
    if (error) { flash('❌ ' + error.message); return }
    flash('✓ Ištrinta'); void load()
  }

  const uploadImage = async (file: File) => {
    if (!edit) return
    if (!['image/webp', 'image/jpeg', 'image/png'].includes(file.type)) { flash('❌ Reikia WebP / JPG / PNG'); return }
    setBusy(true)
    try {
      const opt = await toWebp(file, { maxW: 1920 })
      const supabase = createClient()
      const path = `events/${(edit.slug || 'event').replace(/[^a-z0-9-]+/gi, '-')}-${Date.now()}.${opt.ext}`
      const { error } = await supabase.storage.from('card-cinematics').upload(path, opt.blob, { upsert: true, contentType: opt.contentType, cacheControl: LONG_CACHE })
      if (error) { flash('❌ ' + error.message); return }
      const { data: { publicUrl } } = supabase.storage.from('card-cinematics').getPublicUrl(path)
      setEdit((e) => (e ? { ...e, image_url: publicUrl } : e))
    } catch (e) { flash('❌ ' + String(e)) } finally { setBusy(false) }
  }

  const saveShop = async (it: ShopRow, patch: Partial<ShopRow>) => {
    const supabase = createClient()
    const { error } = await supabase.from('event_shop_items').update(patch).eq('id', it.id)
    if (error) { flash('❌ ' + error.message); return }
    setShop((s) => s.map((x) => (x.id === it.id ? { ...x, ...patch } : x)))
  }

  const focus = edit?.image_focus ?? [50, 50]
  const live = useMemo(() => (rows ?? []).filter((r) => isLive(r)).length, [rows])

  if (!rows) return <p style={{ color: 'var(--text-muted)' }}>Kraunama…</p>
  if (loadErr) return (
    <div className="rounded-xl p-4" style={box}>
      <p className="text-sm" style={{ color: '#f87171' }}>Nepavyko nuskaityti eventų: {loadErr}</p>
      <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>Greičiausiai dar nepaleista migracija <code>20261115b_live_events.sql</code> (Supabase → SQL Editor).</p>
    </div>
  )

  return (
    <div className="space-y-5">
      {msg && <div className="fixed top-4 right-4 z-50 px-4 py-2 rounded-lg text-sm font-bold" style={{ background: '#14111a', border: '1px solid var(--gold)', color: 'var(--text-primary)' }}>{msg}</div>}

      <div className="flex items-center justify-between">
        <p className="text-sm" style={{ color: 'var(--text-primary)' }}>Dabar gyvų: <b style={{ color: live ? '#34d399' : 'var(--text-muted)' }}>{live}</b> iš {rows.length}</p>
        <button style={btn('gold')} onClick={() => openEdit(null)}>+ Naujas eventas</button>
      </div>

      {/* ── Sąrašas ── */}
      <div className="space-y-2">
        {rows.map((r) => {
          const st = statusOf(r)
          return (
            <div key={r.id} className="rounded-xl p-3 flex items-center gap-3 flex-wrap" style={{ ...box, borderLeft: `4px solid ${r.accent}` }} data-testid={`evt-row-${r.slug}`}>
              <div style={{ width: 96, height: 54, background: '#0a0810', flex: '0 0 auto', overflow: 'hidden', borderRadius: 6 }}>
                {r.image_url
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={r.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: `${r.image_focus?.[0] ?? 50}% ${r.image_focus?.[1] ?? 50}%` }} />
                  : <div className="w-full h-full grid place-items-center text-[10px]" style={{ color: 'var(--text-muted)' }}>be banerio</div>}
              </div>
              <div className="flex-1 min-w-[220px]">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{r.title_lt}</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded" style={{ color: st.color, border: `1px solid ${st.color}` }}>{st.text}</span>
                  <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{KIND_LABEL[r.kind]}</span>
                </div>
                <div className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{scheduleText(r)} · <code>{r.slug}</code> · prioritetas {r.priority}</div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {launchFor === r.id ? (
                  <>
                    {r.recurrence
                      ? <button style={btn('green')} disabled={busy} onClick={() => void launch(r, 0)}>Įjungti pagal grafiką</button>
                      : DURATIONS.map(([h, n]) => <button key={h} style={btn('green')} disabled={busy} onClick={() => void launch(r, h)}>{n}</button>)}
                    <button style={btn()} onClick={() => setLaunchFor(null)}>Atšaukti</button>
                  </>
                ) : delFor === r.id ? (
                  <>
                    <button style={btn('red')} disabled={busy} onClick={() => void remove(r.id)}>Tikrai trinti</button>
                    <button style={btn()} onClick={() => setDelFor(null)}>Atšaukti</button>
                  </>
                ) : (
                  <>
                    {r.enabled
                      ? <button style={btn('red')} disabled={busy} onClick={() => void patchRow(r.id, { enabled: false }, `✓ „${r.title_lt}“ sustabdytas`)}>Sustabdyti</button>
                      : <button style={btn('green')} disabled={busy} onClick={() => setLaunchFor(r.id)}>Paleisti dabar</button>}
                    <button style={btn()} onClick={() => openEdit(r)}>Redaguoti</button>
                    <button style={btn()} onClick={() => setDelFor(r.id)}>Trinti</button>
                  </>
                )}
              </div>
            </div>
          )
        })}
        {rows.length === 0 && <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Eventų dar nėra.</p>}
      </div>

      {/* ── Forma ── */}
      {edit && (
        <div className="rounded-xl p-4 space-y-3" style={{ ...box, borderColor: 'var(--gold)' }} data-testid="evt-form">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold" style={{ color: 'var(--gold)' }}>{edit.id ? 'Redaguoti eventą' : 'Naujas eventas'}</h2>
            <div className="flex gap-2">
              <button style={btn('gold')} disabled={busy} onClick={() => void save()}>Išsaugoti</button>
              <button style={btn()} onClick={() => setEdit(null)}>Uždaryti</button>
            </div>
          </div>

          <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
            <div><label style={lbl}>Slug (unikalus)</label><input style={inp} value={edit.slug} onChange={(e) => setEdit({ ...edit, slug: e.target.value })} /></div>
            <div><label style={lbl}>Tipas</label>
              <select style={inp} value={edit.kind} onChange={(e) => setEdit({ ...edit, kind: e.target.value as Row['kind'] })}>
                {Object.entries(KIND_LABEL).map(([k, n]) => <option key={k} value={k}>{n}</option>)}
              </select></div>
            <div><label style={lbl}>Mygtukas „Pirmyn“ veda į</label>
              <select style={inp} value={edit.cta_route ?? ''} onChange={(e) => setEdit({ ...edit, cta_route: e.target.value || null })}>
                {ROUTES.map(([v, n]) => <option key={v} value={v}>{n}</option>)}
              </select></div>
            <div><label style={lbl}>Pavadinimas LT</label><input style={inp} value={edit.title_lt} onChange={(e) => setEdit({ ...edit, title_lt: e.target.value })} /></div>
            <div><label style={lbl}>Pavadinimas EN</label><input style={inp} value={edit.title_en ?? ''} onChange={(e) => setEdit({ ...edit, title_en: e.target.value })} /></div>
            <div className="flex gap-2">
              <div style={{ flex: 1 }}><label style={lbl}>Spalva</label><input type="color" style={{ ...inp, padding: 2, height: 31 }} value={edit.accent} onChange={(e) => setEdit({ ...edit, accent: e.target.value })} /></div>
              <div style={{ flex: 1 }}><label style={lbl}>Prioritetas</label><input type="number" style={inp} value={edit.priority} onChange={(e) => setEdit({ ...edit, priority: Number(e.target.value) })} /></div>
            </div>
            <div><label style={lbl}>Aprašymas LT</label><textarea style={inp} rows={2} value={edit.body_lt ?? ''} onChange={(e) => setEdit({ ...edit, body_lt: e.target.value })} /></div>
            <div><label style={lbl}>Aprašymas EN</label><textarea style={inp} rows={2} value={edit.body_en ?? ''} onChange={(e) => setEdit({ ...edit, body_en: e.target.value })} /></div>
            <div className="flex flex-col gap-2 justify-center">
              <label className="text-xs flex items-center gap-2" style={{ color: 'var(--text-primary)' }}><input type="checkbox" checked={edit.show_popup} onChange={(e) => setEdit({ ...edit, show_popup: e.target.checked })} /> Rodyti pilno ekrano pop-up įjungus žaidimą</label>
              <label className="text-xs flex items-center gap-2" style={{ color: 'var(--text-primary)' }}><input type="checkbox" checked={edit.enabled} onChange={(e) => setEdit({ ...edit, enabled: e.target.checked })} /> Įjungtas</label>
            </div>
          </div>

          {/* Grafikas */}
          <div className="rounded-lg p-3 space-y-2" style={{ background: 'rgba(255,255,255,.02)', border: '1px solid var(--bg-border)' }}>
            <div className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>Grafikas</div>
            <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
              <div><label style={lbl}>Pradžia (tuščia = iškart)</label><input type="datetime-local" style={inp} value={toLocalInput(edit.starts_at)} onChange={(e) => setEdit({ ...edit, starts_at: fromLocalInput(e.target.value) })} /></div>
              <div><label style={lbl}>Pabaiga (tuščia = be pabaigos)</label><input type="datetime-local" style={inp} value={toLocalInput(edit.ends_at)} onChange={(e) => setEdit({ ...edit, ends_at: fromLocalInput(e.target.value) })} /></div>
              <div><label style={lbl}>Kartoti savaitės dienomis</label>
                <div className="flex gap-1 flex-wrap">
                  {DAYS.map(([d, n]) => {
                    const on = edit.recurrence?.days?.includes(d) ?? false
                    return (
                      <button key={d} type="button" style={{ ...btn(on ? 'gold' : 'ghost'), padding: '4px 8px' }}
                        onClick={() => { const cur = edit.recurrence?.days ?? []; const days = on ? cur.filter((x) => x !== d) : [...cur, d]; setEdit({ ...edit, recurrence: { ...(edit.recurrence ?? {}), days } }) }}>{n}</button>
                    )
                  })}
                </div></div>
              <div><label style={lbl}>Tik valandomis (nuo – iki, Vilniaus laiku)</label>
                <div className="flex gap-2">
                  <input type="number" min={0} max={24} placeholder="nuo" style={inp} value={edit.recurrence?.from ?? ''} onChange={(e) => setEdit({ ...edit, recurrence: { ...(edit.recurrence ?? {}), from: e.target.value === '' ? undefined : Number(e.target.value) } })} />
                  <input type="number" min={0} max={24} placeholder="iki" style={inp} value={edit.recurrence?.to ?? ''} onChange={(e) => setEdit({ ...edit, recurrence: { ...(edit.recurrence ?? {}), to: e.target.value === '' ? undefined : Number(e.target.value) } })} />
                </div></div>
            </div>
            <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Savaitgalio eventas: pažymėk Št ir Sk, datas palik tuščias. Laimingoji valanda: nuo 19 iki 21. Vienkartinis eventas: tik pradžia ir pabaiga.</p>
          </div>

          {/* Baneris */}
          <div className="rounded-lg p-3 space-y-2" style={{ background: 'rgba(255,255,255,.02)', border: '1px solid var(--bg-border)' }}>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>Baneris (16:9, be teksto)</div>
              <div className="flex items-center gap-2">
                <input type="file" accept="image/webp,image/jpeg,image/png" aria-label="Evento baneris" className="text-xs" style={{ color: 'var(--text-muted)' }}
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) void uploadImage(f); e.target.value = '' }} />
                {edit.image_url && <button style={btn('red')} onClick={() => setEdit({ ...edit, image_url: null })}>Pašalinti</button>}
              </div>
            </div>
            <BannerPreview d={edit} />
            {edit.image_url && (
              <div className="grid gap-3" style={{ gridTemplateColumns: '1fr 1fr' }}>
                <div><label style={lbl}>Židinys X: {focus[0]}%</label><input type="range" min={0} max={100} value={focus[0]} className="w-full" onChange={(e) => setEdit({ ...edit, image_focus: [Number(e.target.value), focus[1]] })} /></div>
                <div><label style={lbl}>Židinys Y: {focus[1]}%</label><input type="range" min={0} max={100} value={focus[1]} className="w-full" onChange={(e) => setEdit({ ...edit, image_focus: [focus[0], Number(e.target.value)] })} /></div>
              </div>
            )}
          </div>

          {/* Config + atlygiai */}
          <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
            <div>
              <label style={lbl}>Nustatymai (config JSON)</label>
              <textarea style={{ ...inp, fontFamily: 'monospace', fontSize: 11 }} rows={8} spellCheck={false} value={cfgText} onChange={(e) => setCfgText(e.target.value)} />
              <pre className="text-[10px] mt-1 whitespace-pre-wrap" style={{ color: 'var(--text-muted)' }}>{CONFIG_HELP}</pre>
            </div>
            <div>
              <label style={lbl}>Atlygiai (JSON) – tik prisijungimo dovanoms</label>
              <textarea style={{ ...inp, fontFamily: 'monospace', fontSize: 11 }} rows={8} spellCheck={false} value={rwText} onChange={(e) => setRwText(e.target.value)} />
              <pre className="text-[10px] mt-1 whitespace-pre-wrap" style={{ color: 'var(--text-muted)' }}>{REWARD_HELP}</pre>
            </div>
          </div>
        </div>
      )}

      {/* ── Evento parduotuvė ── */}
      <div className="rounded-xl p-4" style={box}>
        <h2 className="text-sm font-bold mb-1" style={{ color: 'var(--gold)' }}>Evento parduotuvė ({shop.length})</h2>
        <p className="text-[11px] mb-3" style={{ color: 'var(--text-muted)' }}>Prekės, perkamos už evento žetonus. Kaina išsaugoma išėjus iš laukelio.</p>
        <div className="space-y-1">
          {shop.map((it) => (
            <div key={it.id} className="flex items-center gap-2 text-xs flex-wrap" style={{ color: 'var(--text-primary)', opacity: it.is_active ? 1 : 0.5 }}>
              <span style={{ width: 70, color: 'var(--text-muted)' }}>{it.kind}</span>
              <span className="flex-1 min-w-[160px]">{it.name_lt} <code style={{ color: 'var(--text-muted)' }}>{it.ref.length > 24 ? it.ref.slice(0, 8) + '…' : it.ref}</code></span>
              <label className="flex items-center gap-1">kaina <input type="number" min={1} defaultValue={it.price_tokens} style={{ ...inp, width: 72 }}
                onBlur={(e) => { const v = Number(e.target.value); if (v > 0 && v !== it.price_tokens) void saveShop(it, { price_tokens: v }) }} /></label>
              <label className="flex items-center gap-1"><input type="checkbox" checked={it.is_active} onChange={(e) => void saveShop(it, { is_active: e.target.checked })} /> aktyvi</label>
            </div>
          ))}
          {shop.length === 0 && <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Tuščia.</p>}
        </div>
      </div>
    </div>
  )
}
