'use client'

// ── Parduotuvės administravimas: kosmetika · pakuotės · starter kaladės ───────
import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ShopImageUpload } from '@/components/admin/ShopImageUpload'

type Cosmetic = { id: string; kind: string; name: string; description: string | null; price_gold: number; css: string | null; emoji: string | null; image_url: string | null; sort_order: number; is_active: boolean }
type Pack = { id: string; name: string; description: string | null; price_gold: number; is_active: boolean; sort_order: number; image_url: string | null; cards_per_pack: number }
type StarterDeck = { id: string; name: string; description: string | null; faction_id: number | null; image_url: string | null; price_gold: number; is_active: boolean; sort_order: number }
type SDC = { starter_deck_id: string; card_id: string; quantity: number }
type Faction = { id: number; name: string }
type CardLite = { id: string; name: string; card_number: string | null; gold_cost: number | null; faction_id: number | null; rarity_id: number | null; image_url: string | null }

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
  const [tab, setTab] = useState<'cosmetics' | 'packs' | 'starter'>('cosmetics')
  const [err, setErr] = useState<string | null>(null)
  const [ok, setOk] = useState<string | null>(null)
  const supabase = createClient()
  const flash = (m: string, isErr = false) => { if (isErr) { setErr(m); setOk(null) } else { setOk(m); setErr(null) }; setTimeout(() => { setErr(null); setOk(null) }, 3000) }
  const reload = () => router.refresh()

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {([['cosmetics', '✨ Kosmetika'], ['packs', '🎁 Pakuotės'], ['starter', '🃏 Starter kaladės']] as const).map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} className={btn}
            style={{ background: tab === k ? 'rgba(240,180,41,0.15)' : 'var(--bg-surface)', border: '1px solid ' + (tab === k ? 'rgba(240,180,41,0.4)' : 'var(--bg-border)'), color: tab === k ? 'var(--gold)' : 'var(--text-muted)' }}>
            {l}
          </button>
        ))}
      </div>

      {err && <p className="text-sm px-3 py-2 rounded-lg" style={{ background: 'rgba(239,68,68,0.1)', color: '#fca5a5' }}>{err}</p>}
      {ok && <p className="text-sm px-3 py-2 rounded-lg" style={{ background: 'rgba(34,197,94,0.1)', color: '#86efac' }}>{ok}</p>}

      {tab === 'cosmetics' && <CosmeticsTab items={props.cosmetics} supabase={supabase} flash={flash} reload={reload} />}
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
  const set = (k: keyof StarterDeck, v: any) => setForm((f) => ({ ...f, [k]: v }))

  const cardById = useMemo(() => { const m = new Map<string, CardLite>(); for (const c of cards) m.set(c.id, c); return m }, [cards])
  const total = useMemo(() => [...sel.values()].reduce((a, b) => a + b, 0), [sel])
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    let list = cards
    if (form.faction_id != null) list = list.filter((c) => c.faction_id === form.faction_id || c.faction_id === 14)
    if (q) list = list.filter((c) => c.name.toLowerCase().includes(q) || (c.card_number ?? '').toLowerCase().includes(q))
    return list.slice(0, 60)
  }, [cards, search, form.faction_id])

  const loadDeck = (d: StarterDeck) => {
    setForm({ ...d, description: d.description ?? '', image_url: d.image_url ?? '' }); setEditing(true)
    const m = new Map<string, number>()
    for (const r of deckCards.filter((x) => x.starter_deck_id === d.id)) m.set(r.card_id, r.quantity)
    setSel(m)
  }
  const reset = () => { setForm(blank); setEditing(false); setSel(new Map()); setSearch('') }
  const addCard = (id: string) => setSel((m) => { const n = new Map(m); n.set(id, (n.get(id) ?? 0) + 1); return n })
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

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="rounded-xl p-4 space-y-2.5" style={card}>
        <p className="text-sm font-bold" style={{ color: 'var(--gold)' }}>{editing ? 'Redaguoti starter kaladę' : 'Nauja starter kaladė'}</p>
        <label className="block text-xs" style={{ color: 'var(--text-muted)' }}>Pavadinimas
          <input className={inp} style={inpStyle} value={form.name} onChange={(e) => set('name', e.target.value)} /></label>
        <label className="block text-xs" style={{ color: 'var(--text-muted)' }}>Aprašymas
          <input className={inp} style={inpStyle} value={form.description ?? ''} onChange={(e) => set('description', e.target.value)} /></label>
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

        {/* Kortų rinkiklis */}
        <div className="pt-1">
          <p className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Kortos · iš viso {total} <span style={{ color: total >= 30 && total <= 40 ? '#86efac' : '#fca5a5' }}>(rekom. 30–40)</span></p>
          {[...sel.entries()].length > 0 && (
            <div className="mt-1.5 space-y-1 max-h-40 overflow-y-auto">
              {[...sel.entries()].map(([id, q]) => {
                const c = cardById.get(id)
                return (
                  <div key={id} className="flex items-center gap-2 text-xs px-2 py-1 rounded" style={{ background: 'var(--bg-elevated)' }}>
                    <span className="flex-1 truncate" style={{ color: 'var(--text-primary)' }}>{c?.name ?? id}</span>
                    <button className="px-1.5 rounded" style={{ background: 'var(--bg-surface)', color: 'var(--text-muted)' }} onClick={() => decCard(id)}>−</button>
                    <span style={{ color: 'var(--gold)', minWidth: 16, textAlign: 'center' }}>{q}</span>
                    <button className="px-1.5 rounded" style={{ background: 'var(--bg-surface)', color: 'var(--text-muted)' }} onClick={() => addCard(id)}>+</button>
                  </div>
                )
              })}
            </div>
          )}
          <input className={inp + ' mt-2'} style={inpStyle} placeholder="Ieškoti kortos…" value={search} onChange={(e) => setSearch(e.target.value)} />
          <div className="mt-1.5 space-y-1 max-h-48 overflow-y-auto">
            {filtered.map((c) => (
              <button key={c.id} onClick={() => addCard(c.id)} className="w-full flex items-center gap-2 text-xs px-2 py-1 rounded text-left hover:opacity-80" style={{ background: 'var(--bg-elevated)' }}>
                <span className="flex-1 truncate" style={{ color: 'var(--text-primary)' }}>{c.name}</span>
                <span style={{ color: 'var(--text-muted)' }}>🪙{c.gold_cost ?? '—'}</span>
                <span style={{ color: 'var(--gold)' }}>+</span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-2 pt-1">
          <button className={btn} style={{ background: 'var(--gold)', color: '#0a0a0f' }} onClick={save}>Išsaugoti</button>
          {editing && <button className={btn} style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)' }} onClick={reset}>Atšaukti</button>}
        </div>
      </div>

      <div className="space-y-2">
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
