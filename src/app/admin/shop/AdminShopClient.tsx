'use client'

// ── Parduotuvės administravimas: kosmetika · pakuotės · starter kaladės ───────
import { useEffect, useMemo, useRef, useState } from 'react'
import { RARITY_COPY_LIMIT, NEUTRAL_FACTION_ID, DECK_MIN, DECK_MAX } from '@/lib/deck-validation'
import { costCurve, COST_CURVE_LABELS, displayCost } from '@/lib/cards/cost'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ShopImageUpload } from '@/components/admin/ShopImageUpload'

type Cosmetic = { id: string; kind: string; name: string; description: string | null; price_gold: number; css: string | null; emoji: string | null; image_url: string | null; sort_order: number; is_active: boolean }
type Pack = { id: string; name: string; description: string | null; price_gold: number; is_active: boolean; sort_order: number; image_url: string | null; cards_per_pack: number }
type StarterDeck = { id: string; name: string; description: string | null; faction_id: number | null; image_url: string | null; price_gold: number; is_active: boolean; sort_order: number }
type SDC = { starter_deck_id: string; card_id: string; quantity: number }
type Faction = { id: number; name: string }
type CardLite = {
  id: string; name: string; card_number: string | null; gold_cost: number | null
  faction_id: number | null; rarity_id: number | null; card_type_id: number | null
  attack: number | null; health: number | null; subtype: string | null; image_url: string | null
  card_type?: { name: string } | null
  rarity?: { name: string; sort_order: number } | null
}

type Props = {
  cosmetics: Cosmetic[]; packs: Pack[]; starterDecks: StarterDeck[]
  starterDeckCards: SDC[]; factions: Faction[]; cards: CardLite[]
}

const card = { background: 'var(--bg-surface)', border: '1px solid var(--bg-border)' }
const inp = 'w-full px-2.5 py-1.5 rounded-lg text-sm'
const inpStyle = { background: 'var(--bg-elevated)', border: '1px solid var(--bg-border)', color: 'var(--text-primary)' } as const
const btn = 'px-3 py-1.5 rounded-lg text-xs font-semibold transition-opacity hover:opacity-80'

export function AdminShopClient(props: Props) {
  const router = useRouter()
  const [tab, setTab] = useState<'cosmetics' | 'avatars' | 'packs' | 'starter'>('cosmetics')
  const [err, setErr] = useState<string | null>(null)
  const [ok, setOk] = useState<string | null>(null)
  const supabase = createClient()
  const flash = (m: string, isErr = false) => { if (isErr) { setErr(m); setOk(null) } else { setOk(m); setErr(null) }; setTimeout(() => { setErr(null); setOk(null) }, 3000) }
  const reload = () => router.refresh()

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {([['cosmetics', '✨ Kosmetika'], ['avatars', '🦸 Avatarai'], ['packs', '🎁 Pakuotės'], ['starter', '🃏 Starter kaladės']] as const).map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} className={btn}
            style={{ background: tab === k ? 'rgba(240,180,41,0.15)' : 'var(--bg-surface)', border: '1px solid ' + (tab === k ? 'rgba(240,180,41,0.4)' : 'var(--bg-border)'), color: tab === k ? 'var(--gold)' : 'var(--text-muted)' }}>
            {l}
          </button>
        ))}
      </div>

      {err && <p className="text-sm px-3 py-2 rounded-lg" style={{ background: 'rgba(239,68,68,0.1)', color: '#fca5a5' }}>{err}</p>}
      {ok && <p className="text-sm px-3 py-2 rounded-lg" style={{ background: 'rgba(34,197,94,0.1)', color: '#86efac' }}>{ok}</p>}

      {tab === 'cosmetics' && <CosmeticsTab items={props.cosmetics} supabase={supabase} flash={flash} reload={reload} />}
      {tab === 'avatars' && <AvatarsTab items={props.cosmetics.filter((c) => c.kind === 'avatar')} supabase={supabase} flash={flash} reload={reload} />}
      {tab === 'packs' && <PacksTab items={props.packs} supabase={supabase} flash={flash} reload={reload} />}
      {tab === 'starter' && <StarterTab decks={props.starterDecks} deckCards={props.starterDeckCards} factions={props.factions} cards={props.cards} supabase={supabase} flash={flash} reload={reload} />}
    </div>
  )
}

/* eslint-disable @typescript-eslint/no-explicit-any */
type Common = { supabase: ReturnType<typeof createClient>; flash: (m: string, e?: boolean) => void; reload: () => void }

// ───────────────────────────── KOSMETIKA ─────────────────────────────
function CosmeticsTab({ items, supabase, flash, reload }: { items: Cosmetic[] } & Common) {
  const blank: Cosmetic = { id: '', kind: 'card_back', name: '', description: '', price_gold: 500, css: '', emoji: '', image_url: '', sort_order: 0, is_active: true }
  const [form, setForm] = useState<Cosmetic>(blank)
  const [editing, setEditing] = useState(false)
  const set = (k: keyof Cosmetic, v: any) => setForm((f) => ({ ...f, [k]: v }))

  const save = async () => {
    if (!form.id.trim() || !form.name.trim()) { flash('Reikia ID ir pavadinimo', true); return }
    const { error } = await supabase.from('cosmetics').upsert({
      id: form.id.trim(), kind: form.kind, name: form.name.trim(), description: form.description || null,
      price_gold: form.price_gold, css: form.css || null, emoji: form.emoji || null, image_url: form.image_url || null,
      sort_order: form.sort_order, is_active: form.is_active,
    }, { onConflict: 'id' })
    if (error) { flash(error.message, true); return }
    flash('Išsaugota'); setForm(blank); setEditing(false); reload()
  }
  const del = async (id: string) => {
    if (!confirm('Trinti kosmetiką ' + id + '?')) return
    const { error } = await supabase.from('cosmetics').delete().eq('id', id)
    if (error) { flash(error.message, true); return }
    flash('Ištrinta'); reload()
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="rounded-xl p-4 space-y-2.5" style={card}>
        <p className="text-sm font-bold" style={{ color: 'var(--gold)' }}>{editing ? 'Redaguoti' : 'Nauja kosmetika'}</p>
        <label className="block text-xs" style={{ color: 'var(--text-muted)' }}>ID (slug, pvz. cb_ember)
          <input className={inp} style={{ ...inpStyle, opacity: editing ? 0.5 : 1 }} disabled={editing} value={form.id} onChange={(e) => set('id', e.target.value)} /></label>
        <label className="block text-xs" style={{ color: 'var(--text-muted)' }}>Tipas
          <select className={inp} style={inpStyle} value={form.kind} onChange={(e) => set('kind', e.target.value)}>
            <option value="card_back">Kortų nugarėlė</option><option value="board">Lenta</option><option value="avatar">Avataras</option>
          </select></label>
        <label className="block text-xs" style={{ color: 'var(--text-muted)' }}>Pavadinimas
          <input className={inp} style={inpStyle} value={form.name} onChange={(e) => set('name', e.target.value)} /></label>
        <label className="block text-xs" style={{ color: 'var(--text-muted)' }}>Aprašymas
          <input className={inp} style={inpStyle} value={form.description ?? ''} onChange={(e) => set('description', e.target.value)} /></label>
        <div className="grid grid-cols-2 gap-2">
          <label className="block text-xs" style={{ color: 'var(--text-muted)' }}>Kaina (auksas)
            <input type="number" className={inp} style={inpStyle} value={form.price_gold} onChange={(e) => set('price_gold', Number(e.target.value))} /></label>
          <label className="block text-xs" style={{ color: 'var(--text-muted)' }}>Eilė
            <input type="number" className={inp} style={inpStyle} value={form.sort_order} onChange={(e) => set('sort_order', Number(e.target.value))} /></label>
        </div>
        <label className="block text-xs" style={{ color: 'var(--text-muted)' }}>Paveikslėlis (arba CSS/emoji žemiau)</label>
        <ShopImageUpload currentUrl={form.image_url} folder="cosmetics" onUpload={(u) => set('image_url', u)} />
        <div className="grid grid-cols-2 gap-2">
          <label className="block text-xs" style={{ color: 'var(--text-muted)' }}>CSS (gradientas)
            <input className={inp} style={inpStyle} value={form.css ?? ''} onChange={(e) => set('css', e.target.value)} placeholder="linear-gradient(...)" /></label>
          <label className="block text-xs" style={{ color: 'var(--text-muted)' }}>Emoji
            <input className={inp} style={inpStyle} value={form.emoji ?? ''} onChange={(e) => set('emoji', e.target.value)} /></label>
        </div>
        <label className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
          <input type="checkbox" checked={form.is_active} onChange={(e) => set('is_active', e.target.checked)} /> Aktyvus</label>
        <div className="flex gap-2 pt-1">
          <button className={btn} style={{ background: 'var(--gold)', color: '#0a0a0f' }} onClick={save}>Išsaugoti</button>
          {editing && <button className={btn} style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)' }} onClick={() => { setForm(blank); setEditing(false) }}>Atšaukti</button>}
        </div>
      </div>

      <div className="space-y-2">
        {items.map((c) => (
          <div key={c.id} className="flex items-center gap-2 rounded-xl p-2.5" style={card}>
            <div className="w-10 h-10 rounded overflow-hidden flex items-center justify-center shrink-0" style={{ background: c.css ?? '#0a0810' }}>
              {c.image_url
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={c.image_url} alt="" className="w-full h-full object-cover" /> : <span>{c.emoji}</span>}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{c.name} <span className="text-xs" style={{ color: 'var(--text-muted)' }}>· {c.kind}</span></p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>🪙 {c.price_gold} {c.is_active ? '' : '· paslėpta'}</p>
            </div>
            <button className={btn} style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }} onClick={() => { setForm({ ...c, description: c.description ?? '', css: c.css ?? '', emoji: c.emoji ?? '', image_url: c.image_url ?? '' }); setEditing(true) }}>Redaguoti</button>
            <button className={btn} style={{ background: 'rgba(239,68,68,0.1)', color: '#fca5a5' }} onClick={() => del(c.id)}>✕</button>
          </div>
        ))}
        {items.length === 0 && <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Kosmetikos nėra.</p>}
      </div>
    </div>
  )
}

// ───────────────────────────── PAKUOTĖS ─────────────────────────────
function PacksTab({ items, supabase, flash, reload }: { items: Pack[] } & Common) {
  const blank: Pack = { id: '', name: '', description: '', price_gold: 200, is_active: true, sort_order: 0, image_url: '', cards_per_pack: 10 }
  const [form, setForm] = useState<Pack>(blank)
  const [editing, setEditing] = useState(false)
  const set = (k: keyof Pack, v: any) => setForm((f) => ({ ...f, [k]: v }))

  const save = async () => {
    if (!form.name.trim()) { flash('Reikia pavadinimo', true); return }
    const row: any = { name: form.name.trim(), description: form.description || null, price_gold: form.price_gold, is_active: form.is_active, sort_order: form.sort_order, image_url: form.image_url || null, cards_per_pack: form.cards_per_pack }
    const q = editing && form.id ? supabase.from('card_packs').update(row).eq('id', form.id) : supabase.from('card_packs').insert(row)
    const { error } = await q
    if (error) { flash(error.message, true); return }
    flash('Išsaugota'); setForm(blank); setEditing(false); reload()
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="rounded-xl p-4 space-y-2.5" style={card}>
        <p className="text-sm font-bold" style={{ color: 'var(--gold)' }}>{editing ? 'Redaguoti pakuotę' : 'Nauja pakuotė'}</p>
        <label className="block text-xs" style={{ color: 'var(--text-muted)' }}>Pavadinimas
          <input className={inp} style={inpStyle} value={form.name} onChange={(e) => set('name', e.target.value)} /></label>
        <label className="block text-xs" style={{ color: 'var(--text-muted)' }}>Aprašymas
          <input className={inp} style={inpStyle} value={form.description ?? ''} onChange={(e) => set('description', e.target.value)} /></label>
        <div className="grid grid-cols-3 gap-2">
          <label className="block text-xs" style={{ color: 'var(--text-muted)' }}>Kaina
            <input type="number" className={inp} style={inpStyle} value={form.price_gold} onChange={(e) => set('price_gold', Number(e.target.value))} /></label>
          <label className="block text-xs" style={{ color: 'var(--text-muted)' }}>Kortų sk.
            <input type="number" className={inp} style={inpStyle} value={form.cards_per_pack} onChange={(e) => set('cards_per_pack', Number(e.target.value))} /></label>
          <label className="block text-xs" style={{ color: 'var(--text-muted)' }}>Eilė
            <input type="number" className={inp} style={inpStyle} value={form.sort_order} onChange={(e) => set('sort_order', Number(e.target.value))} /></label>
        </div>
        <ShopImageUpload currentUrl={form.image_url} folder="packs" onUpload={(u) => set('image_url', u)} />
        <label className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
          <input type="checkbox" checked={form.is_active} onChange={(e) => set('is_active', e.target.checked)} /> Aktyvi</label>
        <div className="flex gap-2 pt-1">
          <button className={btn} style={{ background: 'var(--gold)', color: '#0a0a0f' }} onClick={save}>Išsaugoti</button>
          {editing && <button className={btn} style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)' }} onClick={() => { setForm(blank); setEditing(false) }}>Atšaukti</button>}
        </div>
        <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Pastaba: kortų retumo / frakcijų logika boosteriams nustatoma per DB (pack_factions). Čia keiti tik metaduomenis.</p>
      </div>

      <div className="space-y-2">
        {items.map((p) => (
          <div key={p.id} className="flex items-center gap-2 rounded-xl p-2.5" style={card}>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{p.name}</p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>🪙 {p.price_gold} · {p.cards_per_pack} kortų {p.is_active ? '' : '· paslėpta'}</p>
            </div>
            <button className={btn} style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }} onClick={() => { setForm({ ...p, description: p.description ?? '', image_url: p.image_url ?? '' }); setEditing(true) }}>Redaguoti</button>
          </div>
        ))}
        {items.length === 0 && <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Pakuočių nėra.</p>}
      </div>
    </div>
  )
}

// ───────────────────────────── STARTER KALADĖS ─────────────────────────────
function StarterTab({ decks, deckCards, factions, cards, supabase, flash, reload }: { decks: StarterDeck[]; deckCards: SDC[]; factions: Faction[]; cards: CardLite[] } & Common) {
  const blank: StarterDeck = { id: '', name: '', description: '', faction_id: null, image_url: '', price_gold: 0, is_active: true, sort_order: 0 }
  const [form, setForm] = useState<StarterDeck>(blank)
  const [editing, setEditing] = useState(false)
  const [sel, setSel] = useState<Map<string, number>>(new Map())
  const [search, setSearch] = useState('')
  const [fType, setFType] = useState<number | 'all'>('all')
  const [fRarity, setFRarity] = useState<number | 'all'>('all')
  const [fCost, setFCost] = useState<'all' | '0-2' | '3-5' | '6+'>('all')
  const [onlyFaction, setOnlyFaction] = useState(true)
  const set = (k: keyof StarterDeck, v: any) => setForm((f) => ({ ...f, [k]: v }))

  const cardById = useMemo(() => { const m = new Map<string, CardLite>(); for (const c of cards) m.set(c.id, c); return m }, [cards])
  const total = useMemo(() => [...sel.values()].reduce((a, b) => a + b, 0), [sel])

  // Filtrų reikšmės imamos iš pačių kortų – jokių hardcoded sąrašų
  const types = useMemo(() => {
    const m = new Map<number, string>()
    for (const c of cards) if (c.card_type_id != null && c.card_type?.name) m.set(c.card_type_id, c.card_type.name)
    return [...m.entries()].sort((a, b) => a[1].localeCompare(b[1], 'lt'))
  }, [cards])
  const rarities = useMemo(() => {
    const m = new Map<number, { name: string; sort: number }>()
    for (const c of cards) if (c.rarity_id != null && c.rarity?.name) m.set(c.rarity_id, { name: c.rarity.name, sort: c.rarity.sort_order ?? 0 })
    return [...m.entries()].sort((a, b) => a[1].sort - b[1].sort)
  }, [cards])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return cards.filter((c) => {
      if (onlyFaction && form.faction_id != null && c.faction_id !== form.faction_id && c.faction_id !== NEUTRAL_FACTION_ID) return false
      if (fType !== 'all' && c.card_type_id !== fType) return false
      if (fRarity !== 'all' && c.rarity_id !== fRarity) return false
      if (fCost !== 'all') {
        const g = displayCost(c.gold_cost) // DB šimtais → 1–9 skalė (kanoninis helperis)
        if (fCost === '0-2' && g > 2) return false
        if (fCost === '3-5' && (g < 3 || g > 5)) return false
        if (fCost === '6+' && g < 6) return false
      }
      if (q && !c.name.toLowerCase().includes(q) && !(c.card_number ?? '').toLowerCase().includes(q) && !(c.subtype ?? '').toLowerCase().includes(q)) return false
      return true
    })
  }, [cards, search, form.faction_id, fType, fRarity, fCost, onlyFaction])

  const copyLimit = (c: CardLite) => (c.rarity_id != null ? (RARITY_COPY_LIMIT[c.rarity_id] ?? 2) : 2)
  const curve = useMemo(() => (
    // KANONINĖ kainos kreivė (bendra su /digital builder'iu) — 1..8+ stulpeliai
    costCurve(Array.from(sel, ([id, q]) => ({ gold: cardById.get(id)?.gold_cost ?? 0, qty: q })))
  ), [sel, cardById])

  const loadDeck = (d: StarterDeck) => {
    setForm({ ...d, description: d.description ?? '', image_url: d.image_url ?? '' }); setEditing(true)
    const m = new Map<string, number>()
    for (const r of deckCards.filter((x) => x.starter_deck_id === d.id)) m.set(r.card_id, r.quantity)
    setSel(m)
  }
  const reset = () => { setForm(blank); setEditing(false); setSel(new Map()); setSearch('') }
  const addCard = (c: CardLite) => setSel((m) => {
    const cur = m.get(c.id) ?? 0
    if (cur >= copyLimit(c)) { flash(`${c.name}: daugiau nei ${copyLimit(c)} kopijas dėti negalima`, true); return m }
    const n = new Map(m); n.set(c.id, cur + 1); return n
  })
  const decCard = (id: string) => setSel((m) => { const n = new Map(m); const q = (n.get(id) ?? 0) - 1; if (q <= 0) n.delete(id); else n.set(id, q); return n })

  const save = async () => {
    if (!form.name.trim()) { flash('Reikia pavadinimo', true); return }
    let deckId = form.id
    const row: any = { name: form.name.trim(), description: form.description || null, faction_id: form.faction_id, image_url: form.image_url || null, price_gold: form.price_gold, is_active: form.is_active, sort_order: form.sort_order }
    if (editing && deckId) {
      const { error } = await supabase.from('starter_decks').update(row).eq('id', deckId)
      if (error) { flash(error.message, true); return }
    } else {
      const { data, error } = await supabase.from('starter_decks').insert(row).select('id').single()
      if (error) { flash(error.message, true); return }
      deckId = (data as { id: string }).id
    }
    await supabase.from('starter_deck_cards').delete().eq('starter_deck_id', deckId)
    const rows = [...sel.entries()].map(([card_id, quantity]) => ({ starter_deck_id: deckId, card_id, quantity }))
    if (rows.length > 0) {
      const { error } = await supabase.from('starter_deck_cards').insert(rows)
      if (error) { flash(error.message, true); return }
    }
    flash('Starter kaladė išsaugota'); reset(); reload()
  }
  const del = async (id: string) => {
    if (!confirm('Trinti starter kaladę?')) return
    const { error } = await supabase.from('starter_decks').delete().eq('id', id)
    if (error) { flash(error.message, true); return }
    flash('Ištrinta'); reload()
  }

  const okCount = total >= DECK_MIN && total <= DECK_MAX
  const chip = (active: boolean) => ({
    padding: '4px 9px', borderRadius: 6, fontSize: 11, cursor: 'pointer', whiteSpace: 'nowrap' as const,
    background: active ? 'rgba(240,180,41,0.18)' : 'var(--bg-elevated)',
    border: '1px solid ' + (active ? 'rgba(240,180,41,0.5)' : 'rgba(255,255,255,0.08)'),
    color: active ? 'var(--gold)' : 'var(--text-muted)',
  })

  return (
    <div className="space-y-3">
      {/* ── Kaladės duomenys ── */}
      <div className="rounded-xl p-4 space-y-2.5" style={card}>
        <p className="text-sm font-bold" style={{ color: 'var(--gold)' }}>{editing ? 'Redaguoti starter kaladę' : 'Nauja starter kaladė'}</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <label className="block text-xs" style={{ color: 'var(--text-muted)' }}>Pavadinimas
            <input className={inp} style={inpStyle} value={form.name} onChange={(e) => set('name', e.target.value)} /></label>
          <label className="block text-xs" style={{ color: 'var(--text-muted)' }}>Aprašymas
            <input className={inp} style={inpStyle} value={form.description ?? ''} onChange={(e) => set('description', e.target.value)} /></label>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <label className="block text-xs" style={{ color: 'var(--text-muted)' }}>Frakcija
            <select className={inp} style={inpStyle} value={form.faction_id ?? ''} onChange={(e) => set('faction_id', e.target.value ? Number(e.target.value) : null)}>
              <option value="">— bet kuri —</option>
              {factions.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select></label>
          <label className="block text-xs" style={{ color: 'var(--text-muted)' }}>Kaina
            <input type="number" className={inp} style={inpStyle} value={form.price_gold} onChange={(e) => set('price_gold', Number(e.target.value))} /></label>
          <label className="block text-xs" style={{ color: 'var(--text-muted)' }}>Eilė
            <input type="number" className={inp} style={inpStyle} value={form.sort_order} onChange={(e) => set('sort_order', Number(e.target.value))} /></label>
        </div>
        <ShopImageUpload currentUrl={form.image_url} folder="starter" onUpload={(u) => set('image_url', u)} />
        <label className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
          <input type="checkbox" checked={form.is_active} onChange={(e) => set('is_active', e.target.checked)} /> Aktyvi</label>
      </div>

      {/* ── Kaladės kūrėjas: kairėje kortų fondas, dešinėje kaladė (kaip žaidime) ── */}
      <div className="grid gap-3" style={{ gridTemplateColumns: 'minmax(0,2.4fr) minmax(260px,1fr)' }}>
        <div className="rounded-xl p-3" style={card}>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <input className={inp} style={{ ...inpStyle, maxWidth: 260 }} placeholder="Ieškoti kortos, numerio ar potipio…" value={search} onChange={(e) => setSearch(e.target.value)} />
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{filtered.length} kortų</span>
          </div>
          <div className="flex flex-wrap gap-1.5 mb-2">
            <button style={chip(fType === 'all')} onClick={() => setFType('all')}>Visi tipai</button>
            {types.map(([id, name]) => <button key={id} style={chip(fType === id)} onClick={() => setFType(id)}>{name}</button>)}
          </div>
          <div className="flex flex-wrap gap-1.5 mb-2">
            <button style={chip(fRarity === 'all')} onClick={() => setFRarity('all')}>Visi retumai</button>
            {rarities.map(([id, r]) => <button key={id} style={chip(fRarity === id)} onClick={() => setFRarity(id)}>{r.name}</button>)}
          </div>
          <div className="flex flex-wrap gap-1.5 mb-3">
            {(['all', '0-2', '3-5', '6+'] as const).map((k) => (
              <button key={k} style={chip(fCost === k)} onClick={() => setFCost(k)}>{k === 'all' ? 'Bet kokia kaina' : `🪙 ${k}`}</button>
            ))}
            {form.faction_id != null && (
              <button style={chip(onlyFaction)} onClick={() => setOnlyFaction((v) => !v)}
                title="Rodyti tik kaladės frakcijos ir universalias kortas">
                {onlyFaction ? 'Tik šios frakcijos' : 'Visos frakcijos'}
              </button>
            )}
          </div>

          <div className="overflow-y-auto" style={{ maxHeight: 460 }}>
            <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(112px, 1fr))' }}>
              {filtered.map((c) => {
                const q = sel.get(c.id) ?? 0
                const lim = copyLimit(c)
                const full = q >= lim
                return (
                  <button key={c.id} onClick={() => addCard(c)}
                    onContextMenu={(e) => { e.preventDefault(); decCard(c.id) }}
                    title={`${c.name}${c.subtype ? ' · ' + c.subtype : ''} · 🪙${c.gold_cost ?? '—'} · maks. ${lim}`}
                    className="relative rounded-lg overflow-hidden text-left"
                    style={{ border: '1px solid ' + (q > 0 ? 'rgba(240,180,41,0.6)' : 'rgba(255,255,255,0.08)'), background: 'var(--bg-elevated)', opacity: full ? 0.55 : 1 }}>
                    <div style={{ aspectRatio: '3 / 4', background: '#0d0a14' }}>
                      {c.image_url
                        // eslint-disable-next-line @next/next/no-img-element
                        ? <img src={c.image_url} alt="" loading="lazy" decoding="async" className="w-full h-full" style={{ objectFit: 'cover' }} />
                        : <div className="w-full h-full flex items-center justify-center text-xs" style={{ color: 'var(--text-muted)' }}>{c.name.slice(0, 2)}</div>}
                    </div>
                    <div className="px-1.5 py-1">
                      <p className="text-[10.5px] truncate" style={{ color: 'var(--text-primary)' }}>{c.name}</p>
                      <p className="text-[9.5px]" style={{ color: 'var(--text-muted)' }}>🪙{c.gold_cost ?? '—'}{c.attack != null ? ` · ${c.attack}/${c.health ?? 0}` : ''}</p>
                    </div>
                    <span className="absolute top-1 right-1 text-[10px] font-bold px-1.5 rounded"
                      style={{ background: q > 0 ? 'rgba(240,180,41,0.9)' : 'rgba(0,0,0,0.6)', color: q > 0 ? '#0a0a0f' : 'var(--text-muted)' }}>
                      {q > 0 ? `${q}/${lim}` : `·${lim}`}
                    </span>
                  </button>
                )
              })}
            </div>
            {filtered.length === 0 && <p className="text-xs py-6 text-center" style={{ color: 'var(--text-muted)' }}>Pagal filtrus kortų nerasta.</p>}
          </div>
          <p className="text-[10.5px] mt-2" style={{ color: 'var(--text-muted)' }}>Kairys pelės mygtukas prideda, dešinys – atima.</p>
        </div>

        {/* ── Kaladė ── */}
        <div className="rounded-xl p-3 flex flex-col" style={card}>
          <div className="flex items-baseline justify-between">
            <p className="text-sm font-bold" style={{ color: 'var(--gold)' }}>Kaladė</p>
            <p className="text-xs font-bold" style={{ color: okCount ? '#86efac' : '#fca5a5' }}>{total} / {DECK_MIN}–{DECK_MAX}</p>
          </div>
          {/* kainų kreivė */}
          <div className="flex items-end gap-1 h-12 mt-2 mb-2">
            {curve.map((n, i) => (
              <div key={i} className="flex-1 flex flex-col items-center justify-end gap-0.5">
                <div style={{ width: '100%', height: Math.max(2, (n / Math.max(1, ...curve)) * 34), background: 'rgba(240,180,41,0.5)', borderRadius: 2 }} />
                <span className="text-[8.5px]" style={{ color: 'var(--text-muted)' }}>{COST_CURVE_LABELS[i]}</span>
              </div>
            ))}
          </div>
          <div className="flex-1 overflow-y-auto space-y-1" style={{ maxHeight: 420 }}>
            {[...sel.entries()]
              .map(([id, q]) => ({ c: cardById.get(id), id, q }))
              .sort((a, b) => (a.c?.gold_cost ?? 0) - (b.c?.gold_cost ?? 0) || (a.c?.name ?? '').localeCompare(b.c?.name ?? '', 'lt'))
              .map(({ c, id, q }) => (
                <div key={id} className="flex items-center gap-1.5 text-xs px-2 py-1 rounded" style={{ background: 'var(--bg-elevated)' }}>
                  <span className="text-[10px] px-1 rounded" style={{ background: 'rgba(0,0,0,0.4)', color: 'var(--gold)' }}>{c?.gold_cost ?? '—'}</span>
                  <span className="flex-1 truncate" style={{ color: 'var(--text-primary)' }}>{c?.name ?? id}</span>
                  <button className="rounded" style={{ width: 22, height: 22, background: 'var(--bg-surface)', color: 'var(--text-muted)' }} onClick={() => decCard(id)}>−</button>
                  <span style={{ color: 'var(--gold)', minWidth: 14, textAlign: 'center' }}>{q}</span>
                  <button className="rounded" style={{ width: 22, height: 22, background: 'var(--bg-surface)', color: 'var(--text-muted)' }} onClick={() => c && addCard(c)}>+</button>
                </div>
              ))}
            {sel.size === 0 && <p className="text-xs py-6 text-center" style={{ color: 'var(--text-muted)' }}>Kaladė tuščia.</p>}
          </div>
          <div className="flex gap-2 pt-2">
            <button className={btn} style={{ background: 'var(--gold)', color: '#0a0a0f' }} onClick={save}>Išsaugoti</button>
            {editing && <button className={btn} style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)' }} onClick={reset}>Atšaukti</button>}
          </div>
        </div>
      </div>

      {/* ── Esamos kaladės ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {decks.map((d) => {
          const cnt = deckCards.filter((x) => x.starter_deck_id === d.id).reduce((a, b) => a + b.quantity, 0)
          return (
            <div key={d.id} className="flex items-center gap-2 rounded-xl p-2.5" style={card}>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{d.name}</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{cnt} kortų · 🪙 {d.price_gold} {d.is_active ? '' : '· paslėpta'}</p>
              </div>
              <button className={btn} style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }} onClick={() => loadDeck(d)}>Redaguoti</button>
              <button className={btn} style={{ background: 'rgba(239,68,68,0.1)', color: '#fca5a5' }} onClick={() => del(d.id)}>✕</button>
            </div>
          )
        })}
        {decks.length === 0 && <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Starter kaladžių nėra.</p>}
      </div>
    </div>
  )
}

// ───────────────────────────── AVATARAI ─────────────────────────────
type AvatarForm = { id: string; name: string; description: string; price_gold: number; rarity: string; status: string; owned_by_default: boolean; image_url: string; emoji: string; sort_order: number }
type AvAudioRow = { id: string; cosmetic_id: string; event_type: string; file_url: string; display_name: string | null; enabled: boolean; weight: number }
const AV_EVENTS: [string, string][] = [['fightStart','Pradžios frazė'],['hit','Gauta žala'],['defeat','Pralaimėjimas'],['victory','Pergalė'],['spellCast','Burtų metimas'],['lowHp','Žema gyvybė'],['selected','Pasirinkta']]

function avSafe(f: string) { return f.toLowerCase().replace(/[^a-z0-9.]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') }

function AvatarsTab({ items, supabase, flash, reload }: { items: Cosmetic[] } & Common) {
  const blank: AvatarForm = { id: '', name: '', description: '', price_gold: 500, rarity: 'common', status: 'active', owned_by_default: false, image_url: '', emoji: '☠', sort_order: 0 }
  const [form, setForm] = useState<AvatarForm>(blank)
  const [editing, setEditing] = useState(false)
  const set = (k: keyof AvatarForm, v: any) => setForm((f) => ({ ...f, [k]: v }))

  const save = async () => {
    if (!form.id.trim() || !form.name.trim()) { flash('Reikia ID ir pavadinimo', true); return }
    if (form.status === 'active' && !form.image_url && !form.emoji) { flash('Aktyviam avatarui reikia paveikslėlio arba emoji', true); return }
    if (form.price_gold < 0) { flash('Kaina turi būti ≥ 0', true); return }
    const { error } = await supabase.from('cosmetics').upsert({
      id: form.id.trim(), kind: 'avatar', name: form.name.trim(), description: form.description || null,
      price_gold: form.price_gold, image_url: form.image_url || null, emoji: form.emoji || null,
      rarity: form.rarity, status: form.status, owned_by_default: form.owned_by_default,
      is_active: form.status === 'active', sort_order: form.sort_order, updated_at: new Date().toISOString(),
    }, { onConflict: 'id' })
    if (error) { flash(error.message, true); return }
    flash('Išsaugota'); setForm(blank); setEditing(false); reload()
  }
  const del = async (id: string) => {
    if (!confirm('Trinti avatarą ' + id + '? (kartu jo garsai)')) return
    const { error } = await supabase.from('cosmetics').delete().eq('id', id)
    if (error) { flash(error.message, true); return }
    flash('Ištrinta'); reload()
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="rounded-xl p-4 space-y-2.5" style={card}>
        <p className="text-sm font-bold" style={{ color: 'var(--gold)' }}>{editing ? 'Redaguoti avatarą' : 'Naujas avataras'}</p>
        <label className="block text-xs" style={{ color: 'var(--text-muted)' }}>ID (slug, pvz. av_nekronautas)
          <input className={inp} style={{ ...inpStyle, opacity: editing ? 0.5 : 1 }} disabled={editing} value={form.id} onChange={(e) => set('id', e.target.value)} /></label>
        <label className="block text-xs" style={{ color: 'var(--text-muted)' }}>Pavadinimas
          <input className={inp} style={inpStyle} value={form.name} onChange={(e) => set('name', e.target.value)} /></label>
        <label className="block text-xs" style={{ color: 'var(--text-muted)' }}>Aprašymas
          <input className={inp} style={inpStyle} value={form.description} onChange={(e) => set('description', e.target.value)} /></label>
        <div className="grid grid-cols-3 gap-2">
          <label className="block text-xs" style={{ color: 'var(--text-muted)' }}>Kaina
            <input type="number" min={0} className={inp} style={inpStyle} value={form.price_gold} onChange={(e) => set('price_gold', Number(e.target.value))} /></label>
          <label className="block text-xs" style={{ color: 'var(--text-muted)' }}>Retumas
            <select className={inp} style={inpStyle} value={form.rarity} onChange={(e) => set('rarity', e.target.value)}>
              <option value="common">common</option><option value="rare">rare</option><option value="epic">epic</option><option value="legendary">legendary</option></select></label>
          <label className="block text-xs" style={{ color: 'var(--text-muted)' }}>Būsena
            <select className={inp} style={inpStyle} value={form.status} onChange={(e) => set('status', e.target.value)}>
              <option value="active">active</option><option value="hidden">hidden</option><option value="draft">draft</option></select></label>
        </div>
        <label className="block text-xs" style={{ color: 'var(--text-muted)' }}>Portretas (kvadratinis)</label>
        <ShopImageUpload currentUrl={form.image_url} folder="avatars" onUpload={(u) => set('image_url', u)} />
        <div className="grid grid-cols-2 gap-2">
          <label className="block text-xs" style={{ color: 'var(--text-muted)' }}>Emoji (fallback)
            <input className={inp} style={inpStyle} value={form.emoji} onChange={(e) => set('emoji', e.target.value)} /></label>
          <label className="block text-xs" style={{ color: 'var(--text-muted)' }}>Eilė
            <input type="number" className={inp} style={inpStyle} value={form.sort_order} onChange={(e) => set('sort_order', Number(e.target.value))} /></label>
        </div>
        <label className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
          <input type="checkbox" checked={form.owned_by_default} onChange={(e) => set('owned_by_default', e.target.checked)} /> Turimas pagal nutylėjimą (nemokamas)</label>
        <div className="flex gap-2 pt-1">
          <button className={btn} style={{ background: 'var(--gold)', color: '#0a0a0f' }} onClick={save}>Išsaugoti</button>
          {editing && <button className={btn} style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)' }} onClick={() => { setForm(blank); setEditing(false) }}>Atšaukti</button>}
        </div>
        {editing && <AdminAvatarAudio avatarId={form.id} supabase={supabase} flash={flash} />}
        {editing && <AdminAvatarVideos avatarId={form.id} supabase={supabase} flash={flash} />}
        {editing && (form.image_url || form.emoji) && <AdminAvatarFit avatarId={form.id} imageUrl={form.image_url} supabase={supabase} flash={flash} />}
      </div>

      <div className="space-y-2">
        {items.map((c: any) => (
          <div key={c.id} className="flex items-center gap-2 rounded-xl p-2.5" style={card}>
            <div className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center shrink-0" style={{ background: '#0a0810', border: '1px solid rgba(240,180,41,0.4)' }}>
              {c.image_url
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={c.image_url} alt="" className="w-full h-full object-cover" /> : <span>{c.emoji}</span>}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{c.name} <span className="text-xs" style={{ color: 'var(--text-muted)' }}>· {c.rarity ?? 'common'}</span></p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>🪙 {c.price_gold} · {c.status ?? (c.is_active ? 'active' : 'hidden')}{c.owned_by_default ? ' · nemokamas' : ''}</p>
            </div>
            <button className={btn} style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}
              onClick={() => { setForm({ id: c.id, name: c.name, description: c.description ?? '', price_gold: c.price_gold, rarity: c.rarity ?? 'common', status: c.status ?? (c.is_active ? 'active' : 'hidden'), owned_by_default: !!c.owned_by_default, image_url: c.image_url ?? '', emoji: c.emoji ?? '', sort_order: c.sort_order }); setEditing(true) }}>Redaguoti</button>
            <button className={btn} style={{ background: 'rgba(239,68,68,0.1)', color: '#fca5a5' }} onClick={() => del(c.id)}>✕</button>
          </div>
        ))}
        {items.length === 0 && <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Avatarų nėra.</p>}
      </div>
    </div>
  )
}

function AdminAvatarAudio({ avatarId, supabase, flash }: { avatarId: string; supabase: ReturnType<typeof createClient>; flash: (m: string, e?: boolean) => void }) {
  const [rows, setRows] = useState<AvAudioRow[]>([])
  const [busy, setBusy] = useState(false)
  const load = async () => {
    const { data } = await supabase.from('avatar_audio').select('*').eq('cosmetic_id', avatarId).order('created_at')
    setRows((data as AvAudioRow[]) ?? [])
  }
  useEffect(() => { void load() // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [avatarId])

  const upload = async (ev: string, file: File) => {
    if (!file.type.startsWith('audio/')) { flash('Tik audio failai', true); return }
    if (file.size > 2 * 1024 * 1024) { flash('Maks. 2 MB', true); return }
    setBusy(true)
    try {
      const path = `${avatarId}/${ev}/${Date.now()}-${avSafe(file.name)}`
      const { error: up } = await supabase.storage.from('avatar-audio').upload(path, file, { upsert: true, contentType: file.type, cacheControl: '31536000' })
      if (up) { flash(up.message, true); return }
      const { data: { publicUrl } } = supabase.storage.from('avatar-audio').getPublicUrl(path)
      const { error: ins } = await supabase.from('avatar_audio').insert({ cosmetic_id: avatarId, event_type: ev, file_url: publicUrl, display_name: file.name, enabled: true, weight: 1 })
      if (ins) { flash(ins.message, true); return }
      flash('Įkelta'); await load()
    } finally { setBusy(false) }
  }
  const patch = async (id: string, p: Partial<AvAudioRow>) => {
    await supabase.from('avatar_audio').update({ ...p, updated_at: new Date().toISOString() }).eq('id', id); await load()
  }
  const remove = async (id: string) => { await supabase.from('avatar_audio').delete().eq('id', id); await load() }

  return (
    <div className="mt-3 pt-3 space-y-2" style={{ borderTop: '1px solid var(--bg-border)' }}>
      <p className="text-xs font-bold" style={{ color: 'var(--gold)' }}>🔊 Garsai ({avatarId}) {busy && '· keliama…'}</p>
      {AV_EVENTS.map(([ev, label]) => {
        const clips = rows.filter((r) => r.event_type === ev)
        return (
          <div key={ev} className="rounded-lg p-2" style={{ background: 'var(--bg-elevated)' }}>
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-semibold" style={{ color: 'var(--text-secondary)' }}>{label} <span style={{ color: 'var(--text-muted)' }}>({clips.length})</span></span>
              <label className="text-[10px] cursor-pointer px-2 py-0.5 rounded" style={{ background: 'rgba(240,180,41,0.15)', color: 'var(--gold)' }}>
                + Įkelti<input type="file" accept="audio/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void upload(ev, f); e.target.value = '' }} />
              </label>
            </div>
            {clips.map((r) => (
              <div key={r.id} className="flex items-center gap-1.5 mt-1">
                <audio src={r.file_url} controls preload="none" style={{ height: 26, flex: 1, minWidth: 0 }} />
                <input type="number" min={1} value={r.weight} onChange={(e) => patch(r.id, { weight: Math.max(1, Number(e.target.value)) })} title="Svoris (random)" className="w-12 px-1 py-0.5 rounded text-[11px]" style={inpStyle} />
                <label className="text-[10px] flex items-center gap-1" style={{ color: 'var(--text-muted)' }}><input type="checkbox" checked={r.enabled} onChange={(e) => patch(r.id, { enabled: e.target.checked })} />on</label>
                <button className="text-[11px] px-1.5 py-0.5 rounded" style={{ background: 'rgba(239,68,68,0.12)', color: '#fca5a5' }} onClick={() => remove(r.id)}>✕</button>
              </div>
            ))}
          </div>
        )
      })}
    </div>
  )
}

function AdminAvatarVideos({ avatarId, supabase, flash }: { avatarId: string; supabase: ReturnType<typeof createClient>; flash: (m: string, e?: boolean) => void }) {
  const [vids, setVids] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const load = async () => {
    const { data } = await supabase.from('cosmetics').select('videos').eq('id', avatarId).single()
    setVids(((data as any)?.videos as string[]) ?? [])
  }
  useEffect(() => { void load() // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [avatarId])

  const save = async (next: string[]) => {
    const { error } = await supabase.from('cosmetics').update({ videos: next, updated_at: new Date().toISOString() }).eq('id', avatarId)
    if (error) { flash(error.message, true); return }
    setVids(next)
  }
  const upload = async (file: File) => {
    if (!['video/mp4', 'video/webm'].includes(file.type)) { flash('Tik MP4 / WEBM', true); return }
    if (file.size > 10 * 1024 * 1024) { flash('Maks. 10 MB', true); return }
    setBusy(true)
    try {
      const path = `${avatarId}/${Date.now()}-${avSafe(file.name)}`
      const { error: up } = await supabase.storage.from('avatar-video').upload(path, file, { upsert: true, contentType: file.type, cacheControl: '31536000' })
      if (up) { flash(up.message, true); return }
      const { data: { publicUrl } } = supabase.storage.from('avatar-video').getPublicUrl(path)
      await save([...vids, publicUrl]); flash('Video įkeltas')
    } finally { setBusy(false) }
  }

  return (
    <div className="mt-3 pt-3 space-y-2" style={{ borderTop: '1px solid var(--bg-border)' }}>
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold" style={{ color: 'var(--gold)' }}>🎬 Idle video ({vids.length}) {busy && '· keliama…'}</p>
        <label className="text-[10px] cursor-pointer px-2 py-0.5 rounded" style={{ background: 'rgba(240,180,41,0.15)', color: 'var(--gold)' }}>
          + Įkelti<input type="file" accept="video/mp4,video/webm" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void upload(f); e.target.value = '' }} />
        </label>
      </div>
      <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Groja vietoj portreto atsitiktinai kas 20–60 s.</p>
      <div className="grid grid-cols-2 gap-2">
        {vids.map((u, i) => (
          <div key={i} className="rounded-lg p-1.5" style={{ background: 'var(--bg-elevated)' }}>
            <video src={u} controls muted preload="none" style={{ width: '100%', borderRadius: 4 }} />
            <button className="text-[11px] mt-1 w-full px-1.5 py-0.5 rounded" style={{ background: 'rgba(239,68,68,0.12)', color: '#fca5a5' }}
              onClick={() => save(vids.filter((_, j) => j !== i))}>✕ Šalinti</button>
          </div>
        ))}
        {vids.length === 0 && <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Video nėra (rodomas portretas).</p>}
      </div>
    </div>
  )
}

function AdminAvatarFit({ avatarId, imageUrl, supabase, flash }: { avatarId: string; imageUrl: string; supabase: ReturnType<typeof createClient>; flash: (m: string, e?: boolean) => void }) {
  const [fit, setFit] = useState({ x: 50, y: 50, zoom: 100 })
  const [previewVid, setPreviewVid] = useState<string | null>(null)
  const [vids, setVids] = useState<string[]>([])
  const boxRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    let alive = true
    ;(async () => {
      const { data } = await supabase.from('cosmetics').select('portrait_fit, videos').eq('id', avatarId).single()
      const pf = (data as any)?.portrait_fit
      if (alive && pf) setFit({ x: pf.x ?? 50, y: pf.y ?? 50, zoom: pf.zoom ?? 100 })
      if (alive) setVids(((data as any)?.videos as string[]) ?? [])
    })()
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [avatarId])
  const save = async () => {
    const { error } = await supabase.from('cosmetics').update({ portrait_fit: fit, updated_at: new Date().toISOString() }).eq('id', avatarId)
    if (error) { flash(error.message, true); return }
    flash('Kadravimas išsaugotas')
  }
  const onDrag = (e: React.PointerEvent) => {
    if (e.buttons !== 1) return
    const r = boxRef.current?.getBoundingClientRect(); if (!r) return
    setFit((f) => ({ ...f, x: Math.round(Math.max(0, Math.min(100, ((e.clientX - r.left) / r.width) * 100))), y: Math.round(Math.max(0, Math.min(100, ((e.clientY - r.top) / r.height) * 100))) }))
  }
  const win = { top: '24.5%', left: '24.5%', right: '24%', bottom: '29%' }
  const fitStyle = { width: '100%', height: '100%', objectFit: 'cover', objectPosition: `${fit.x}% ${fit.y}%`, transform: `scale(${Math.max(1, fit.zoom / 100)})`, transformOrigin: 'center' } as React.CSSProperties
  return (
    <div className="mt-3 pt-3 space-y-2" style={{ borderTop: '1px solid var(--bg-border)' }}>
      <p className="text-xs font-bold" style={{ color: 'var(--gold)' }}>🎯 Portreto kadravimas (zoom + vieta)</p>
      <div className="flex gap-3">
        <div ref={boxRef} onPointerDown={onDrag} onPointerMove={onDrag} style={{ position: 'relative', width: 150, height: 150, flexShrink: 0, cursor: 'crosshair', borderRadius: 6, overflow: 'hidden' }}>
          <div style={{ position: 'absolute', overflow: 'hidden', background: '#0a0810', ...win }}>
            {previewVid
              ? <video src={previewVid} autoPlay loop muted playsInline style={fitStyle} />
              : imageUrl
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={imageUrl} alt="" style={fitStyle} draggable={false} />
                : <span className="w-full h-full flex items-center justify-center text-xs" style={{ color: 'var(--text-muted)' }}>nėra</span>}
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icons/frame.png" alt="" className="absolute inset-0 w-full h-full pointer-events-none select-none" draggable={false} />
        </div>
        <div className="flex-1 space-y-2 text-[11px]" style={{ color: 'var(--text-muted)' }}>
          <label className="block">X: {fit.x}%<input type="range" min={0} max={100} value={fit.x} onChange={(e) => setFit((f) => ({ ...f, x: Number(e.target.value) }))} className="w-full" /></label>
          <label className="block">Y: {fit.y}%<input type="range" min={0} max={100} value={fit.y} onChange={(e) => setFit((f) => ({ ...f, y: Number(e.target.value) }))} className="w-full" /></label>
          <label className="block">Zoom: {fit.zoom}%<input type="range" min={100} max={300} value={fit.zoom} onChange={(e) => setFit((f) => ({ ...f, zoom: Number(e.target.value) }))} className="w-full" /></label>
          {vids.length > 0 && (
            <div className="flex flex-wrap gap-1 items-center">
              <span className="text-[10px]">Peržiūra:</span>
              <button className="text-[10px] px-2 py-0.5 rounded" style={{ background: !previewVid ? 'rgba(240,180,41,0.25)' : 'var(--bg-elevated)', color: !previewVid ? 'var(--gold)' : 'var(--text-muted)' }} onClick={() => setPreviewVid(null)}>Nuotrauka</button>
              {vids.map((v, i) => (
                <button key={i} className="text-[10px] px-2 py-0.5 rounded" style={{ background: previewVid === v ? 'rgba(240,180,41,0.25)' : 'var(--bg-elevated)', color: previewVid === v ? 'var(--gold)' : 'var(--text-muted)' }} onClick={() => setPreviewVid(v)}>Video {i + 1}</button>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <button className={btn} style={{ background: 'var(--gold)', color: '#0a0a0f' }} onClick={save}>Išsaugoti kadravimą</button>
            <button className={btn} style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)' }} onClick={() => setFit({ x: 50, y: 50, zoom: 100 })}>Centruoti</button>
          </div>
        </div>
      </div>
      <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Tempk ant peržiūros arba slankikliais. Taikoma ir nuotraukai, ir video.</p>
    </div>
  )
}
