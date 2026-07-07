'use client'

// ══════════════════════════════════════════════════════════════════════════════
// Ravenof Digital — KOLEKCIJA (landscape, 3 zonos, be popup'ų):
// • KAIRĖ: paieška + filtrai (frakcija/retumas/tipas/rikiavimas/tik turimos).
// • CENTRAS: didelis kortų grid, puslapiuojamas ← → (swipe + mygtukai), be scroll.
// • DEŠINĖ: pasirinktos kortos detalės + craft/disenchant + pakų CTA (visada matomas).
// ══════════════════════════════════════════════════════════════════════════════
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { AnimatePresence, motion } from 'framer-motion'
import { Search, Lock, ChevronLeft, ChevronRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { playUiClick, playCardFlip, playSuccess } from '@/lib/ui-sound'
import { getCraftConfig, disenchantCard, craftCard, CRAFT_ERR_LT, type CraftConfig } from '@/lib/gamification/craft'
import { getActivePacks, getPackInventory, type Pack } from '@/lib/economy'
import { requestOpenStore, emitWalletChanged } from '@/lib/digital/native'
import { rarityColor } from '@/lib/digital/rarity'
import { GameCard } from '@/components/ui/GameCard'
import { PackOpen } from './PackOpen'
import { EmptyState } from './ui/HubKit'
import { SmartImg } from '@/components/ui/SmartImg'

const GOLD = '240,180,41'
const PANEL: React.CSSProperties = { background: 'linear-gradient(160deg, rgba(20,16,28,0.96), rgba(9,7,12,0.98))', border: `1px solid rgba(${GOLD},0.22)`, boxShadow: 'inset 0 0 40px rgba(0,0,0,0.5)' }

type Col = {
  id: string; name: string; image: string | null
  faction: string | null; factionSlug: string | null
  type: string | null; rarity: string | null; copyLimit: number; raritySort: number
  gold: number; atk: number | null; hp: number | null; effect: string | null; isChampion: boolean
  owned: number
}

type SortKey = 'cost-asc' | 'cost-desc' | 'name' | 'rarity' | 'owned'
const SORTS: { key: SortKey; label: string }[] = [
  { key: 'cost-asc',  label: 'Kaina ↑' },
  { key: 'cost-desc', label: 'Kaina ↓' },
  { key: 'name',      label: 'Pavadinimas A–Ž' },
  { key: 'rarity',    label: 'Retumas' },
  { key: 'owned',     label: 'Turimos pirma' },
]

const SEL: React.CSSProperties = { background: 'rgba(10,8,16,0.9)', border: `1px solid rgba(${GOLD},0.3)`, color: 'var(--text-primary)', fontSize: 12, borderRadius: 10, padding: '7px 8px', minHeight: 36, width: '100%' }

export function DigitalCollection() {
  const [cards, setCards] = useState<Col[] | null>(null)
  const [loggedOut, setLoggedOut] = useState(false)
  const [packList, setPackList] = useState<Pack[]>([])
  const [inv, setInv] = useState<Record<string, number>>({})
  const [chooser, setChooser] = useState(false)
  const [openingPack, setOpeningPack] = useState<Pack | null>(null)

  const [q, setQ] = useState('')
  const [faction, setFaction] = useState('all')
  const [rarity, setRarity] = useState('all')
  const [type, setType] = useState('all')
  const [sort, setSort] = useState<SortKey>('cost-asc')
  const [ownedOnly, setOwnedOnly] = useState(false)
  const [selId, setSelId] = useState<string | null>(null)

  const [page, setPage] = useState(0)
  const [dir, setDir] = useState(1)
  const touchX = useRef<number | null>(null)

  // ── centro grid matavimas: kortos kuo didesnės, telpa be scroll ──────────
  const gridAreaRef = useRef<HTMLDivElement>(null)
  const [dims, setDims] = useState({ cols: 4, rows: 2, cardW: 96 })
  useLayoutEffect(() => {
    const el = gridAreaRef.current
    if (!el) return
    const GAP = 8
    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect()
      if (r.width < 40 || r.height < 40) return
      const rows = r.height >= 330 ? 2 : 1
      const labelH = 0 // pavadinimas kortoje overlay, ne po ja
      const cardH = Math.floor((r.height - GAP * (rows - 1)) / rows) - labelH
      const cardW = Math.max(72, Math.min(150, Math.floor(cardH / 1.42)))
      const cols = Math.max(3, Math.min(10, Math.floor((r.width + GAP) / (cardW + GAP))))
      setDims((d) => (d.cols === cols && d.rows === rows && d.cardW === cardW ? d : { cols, rows, cardW }))
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [cards, loggedOut])

  const load = useCallback(async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoggedOut(true); setCards([]); return }
    const [{ data: cardRows }, { data: colRows }] = await Promise.all([
      supabase.from('cards').select(`
        id, name, image_url, gold_cost, attack, health, description, effect_text, is_champion,
        faction:factions ( name, slug ),
        card_type:card_types ( name ),
        rarity:rarities ( name, copy_limit, sort_order )
      `).eq('status', 'active').order('gold_cost').order('name'),
      supabase.from('user_collections').select('card_id, quantity').eq('user_id', user.id),
    ])
    type R = { id: string; name: string; image_url: string | null; gold_cost: number; attack: number | null; health: number | null; description: string | null; effect_text: string | null; is_champion: boolean; faction: { name: string; slug: string } | null; card_type: { name: string } | null; rarity: { name: string; copy_limit: number; sort_order: number } | null }
    const owned: Record<string, number> = Object.fromEntries(((colRows as { card_id: string; quantity: number }[]) ?? []).map((r) => [r.card_id, r.quantity]))
    const list: Col[] = ((cardRows as unknown as R[]) ?? []).map((r) => ({
      id: r.id, name: r.name, image: r.image_url,
      faction: r.faction?.name ?? null, factionSlug: r.faction?.slug ?? null,
      type: r.card_type?.name ?? null, rarity: r.rarity?.name ?? null,
      copyLimit: r.rarity?.copy_limit ?? 2, raritySort: r.rarity?.sort_order ?? 0,
      gold: r.gold_cost, atk: r.attack, hp: r.health, effect: r.effect_text ?? r.description, isChampion: r.is_champion,
      owned: owned[r.id] ?? 0,
    }))
    setCards(list)
  }, [])

  const refreshInv = useCallback(() => { getPackInventory().then(setInv) }, [])
  useEffect(() => { load(); refreshInv(); getActivePacks().then(setPackList) }, [load, refreshInv])
  const ownedPacks = packList.filter((p) => (inv[p.id] ?? 0) > 0)
  const totalPacks = Object.values(inv).reduce((a, b) => a + b, 0)
  const openPacks = () => { playUiClick(); if (ownedPacks.length === 0) { requestOpenStore(); return } if (ownedPacks.length === 1) setOpeningPack(ownedPacks[0]); else setChooser(true) }

  const factions = useMemo(() => {
    const m = new Map<string, string>()
    for (const c of cards ?? []) if (c.faction) m.set(c.factionSlug ?? c.faction, c.faction)
    return Array.from(m, ([slug, name]) => ({ slug, name }))
  }, [cards])
  const rarities = useMemo(() => {
    const m = new Map<string, number>()
    for (const c of cards ?? []) if (c.rarity) m.set(c.rarity, c.raritySort)
    return Array.from(m, ([name, sortv]) => ({ name, sort: sortv })).sort((a, b) => a.sort - b.sort)
  }, [cards])
  const types = useMemo(() => Array.from(new Set((cards ?? []).map((c) => c.type).filter(Boolean))) as string[], [cards])

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    const list = (cards ?? []).filter((c) => {
      if (ownedOnly && c.owned <= 0) return false
      if (faction !== 'all' && (c.factionSlug ?? c.faction) !== faction) return false
      if (rarity !== 'all' && c.rarity !== rarity) return false
      if (type !== 'all' && c.type !== type) return false
      if (needle && !c.name.toLowerCase().includes(needle)) return false
      return true
    })
    const by: Record<SortKey, (a: Col, b: Col) => number> = {
      'cost-asc':  (a, b) => a.gold - b.gold || a.name.localeCompare(b.name),
      'cost-desc': (a, b) => b.gold - a.gold || a.name.localeCompare(b.name),
      'name':      (a, b) => a.name.localeCompare(b.name),
      'rarity':    (a, b) => b.raritySort - a.raritySort || a.gold - b.gold || a.name.localeCompare(b.name),
      'owned':     (a, b) => (b.owned > 0 ? 1 : 0) - (a.owned > 0 ? 1 : 0) || b.owned - a.owned || a.gold - b.gold,
    }
    return [...list].sort(by[sort])
  }, [cards, q, faction, rarity, type, ownedOnly, sort])

  useEffect(() => { setPage(0) }, [q, faction, rarity, type, ownedOnly, sort])

  const perPage = dims.cols * dims.rows
  const pageCount = Math.max(1, Math.ceil(filtered.length / perPage))
  const clamped = Math.min(page, pageCount - 1)
  const pagedCards = useMemo(() => filtered.slice(clamped * perPage, clamped * perPage + perPage), [filtered, clamped, perPage])

  const selected = useMemo(() => filtered.find((c) => c.id === selId) ?? pagedCards[0] ?? filtered[0] ?? null, [filtered, selId, pagedCards])

  const go = (d: number) => {
    const next = clamped + d
    if (next < 0 || next >= pageCount) return
    playCardFlip(); setDir(d); setPage(next)
  }

  const ownedCount = (cards ?? []).filter((c) => c.owned > 0).length
  const activeFilters = (faction !== 'all' ? 1 : 0) + (rarity !== 'all' ? 1 : 0) + (type !== 'all' ? 1 : 0) + (ownedOnly ? 1 : 0)
  const resetFilters = () => { setFaction('all'); setRarity('all'); setType('all'); setSort('cost-asc'); setOwnedOnly(false); setQ('') }

  if (cards === null) return <p className="text-center text-sm py-16" style={{ color: 'var(--text-muted)' }}>Kraunama…</p>

  if (loggedOut) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-3 text-center px-6">
        <span style={{ fontSize: 40 }}>🎴</span>
        <div className="rvn-disp font-black uppercase" style={{ fontSize: 22, color: 'var(--gold)' }}>Kolekcija</div>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Prisijunk, kad matytum kolekciją. <Link href="/login?next=/digital/collection" className="underline" style={{ color: 'var(--gold)' }}>Prisijungti</Link></p>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col min-h-0" style={{ gap: 'clamp(4px,1vh,10px)' }}>
      {/* ── Antraštė ── */}
      <div className="flex items-baseline justify-center gap-3 shrink-0">
        <div className="rvn-disp font-black uppercase leading-none" style={{ fontSize: 'clamp(16px,3.2vh,28px)', color: 'var(--gold)', letterSpacing: '0.04em' }}>Kolekcija</div>
        <div style={{ fontSize: 'clamp(9px,1.4vh,12px)', color: 'var(--text-muted)' }}>Surinkta {ownedCount}/{cards.length} · rodoma {filtered.length}</div>
      </div>

      <div className="flex-1 min-h-0 grid gap-2" style={{ gridTemplateColumns: 'minmax(160px,0.85fr) minmax(0,2.6fr) minmax(190px,1fr)' }}>

        {/* ── KAIRĖ: filtrai ── */}
        <section className="rounded-2xl flex flex-col min-h-0 overflow-hidden p-2.5" style={PANEL}>
          <div className="rvn-disp font-extrabold uppercase tracking-wide mb-2 shrink-0 flex items-center justify-between" style={{ fontSize: 'clamp(10px,1.5vh,13px)', color: 'var(--gold)' }}>
            <span>Filtrai</span>
            {activeFilters > 0 && (
              <button onClick={() => { playUiClick(); resetFilters() }} className="rvn-press rounded-md px-1.5 py-0.5" style={{ fontSize: 9, background: `rgba(${GOLD},0.14)`, border: `1px solid rgba(${GOLD},0.4)`, color: 'var(--gold)' }}>Išvalyti ({activeFilters})</button>
            )}
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-2">
            <div className="relative shrink-0">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ width: 14, height: 14, color: 'var(--text-muted)' }} />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ieškoti…"
                className="w-full outline-none" style={{ ...SEL, paddingLeft: 30 }} />
            </div>
            <FilterField label="Rikiuoti">
              <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)} style={SEL}>
                {SORTS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
              </select>
            </FilterField>
            <FilterField label="Retumas">
              <select value={rarity} onChange={(e) => setRarity(e.target.value)} style={SEL}>
                <option value="all">Visi retumai</option>
                {rarities.map((r) => <option key={r.name} value={r.name}>{r.name}</option>)}
              </select>
            </FilterField>
            <FilterField label="Tipas">
              <select value={type} onChange={(e) => setType(e.target.value)} style={SEL}>
                <option value="all">Visi tipai</option>
                {types.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </FilterField>
            <FilterField label="Frakcija">
              <div className="flex flex-col gap-1">
                <FactionBtn active={faction === 'all'} label="Visos frakcijos" onClick={() => { playUiClick(); setFaction('all') }} />
                {factions.map((f) => <FactionBtn key={f.slug} active={faction === f.slug} label={f.name} onClick={() => { playUiClick(); setFaction(f.slug) }} />)}
              </div>
            </FilterField>
            <button onClick={() => { playUiClick(); setOwnedOnly((v) => !v) }}
              className="shrink-0 w-full flex items-center justify-between px-2.5 py-2 rounded-xl font-semibold"
              style={{ fontSize: 11, background: ownedOnly ? 'rgba(34,197,94,0.14)' : 'rgba(10,8,16,0.7)', border: `1px solid ${ownedOnly ? 'rgba(34,197,94,0.55)' : `rgba(${GOLD},0.25)`}`, color: ownedOnly ? '#86efac' : 'var(--text-secondary)' }}>
              <span>Tik turimos</span>
              <span className="relative inline-block rounded-full" style={{ width: 30, height: 16, background: ownedOnly ? 'rgba(34,197,94,0.5)' : 'rgba(255,255,255,0.12)' }}>
                <span className="absolute top-0.5 rounded-full bg-white transition-all" style={{ width: 12, height: 12, left: ownedOnly ? 16 : 2 }} />
              </span>
            </button>
          </div>
        </section>

        {/* ── CENTRAS: kortų grid + puslapiavimas ── */}
        <section className="rounded-2xl flex flex-col min-h-0 overflow-hidden p-2.5" style={PANEL}>
          {filtered.length === 0 ? (
            <div className="flex-1 flex items-center justify-center">
              {ownedOnly
                ? <EmptyState icon="🃏" title="Kolekcija dar tuščia" sub="Atplėšk pakuotę, kad rinktum kortas." accent="251,146,60" ctaLabel="🎁 Atplėšti pakuotę" onCta={openPacks} />
                : <EmptyState icon="🔍" title="Nieko nerasta" sub="Pabandyk kitą paiešką ar filtrą." />}
            </div>
          ) : (
            <>
              <div ref={gridAreaRef} className="flex-1 min-h-0 relative overflow-hidden"
                onTouchStart={(e) => { touchX.current = e.touches[0].clientX }}
                onTouchEnd={(e) => {
                  if (touchX.current == null) return
                  const dx = e.changedTouches[0].clientX - touchX.current
                  touchX.current = null
                  if (Math.abs(dx) > 48) go(dx < 0 ? 1 : -1)
                }}>
                <AnimatePresence mode="popLayout" initial={false} custom={dir}>
                  <motion.div key={clamped} custom={dir}
                    initial={{ x: dir > 0 ? 60 : -60, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: dir > 0 ? -60 : 60, opacity: 0 }}
                    transition={{ duration: 0.22, ease: 'easeOut' }}
                    className="absolute inset-0 grid content-center justify-center gap-2"
                    style={{ gridTemplateColumns: `repeat(${dims.cols}, ${dims.cardW}px)` }}>
                    {pagedCards.map((c) => (
                      <CardCell key={c.id} c={c} selected={selected?.id === c.id} width={dims.cardW}
                        onClick={() => { playUiClick(); setSelId(c.id) }} />
                    ))}
                  </motion.div>
                </AnimatePresence>
              </div>
              <div className="shrink-0 flex items-center justify-center gap-3" style={{ marginTop: 6 }}>
                <button onClick={() => go(-1)} disabled={clamped === 0} aria-label="Ankstesnis puslapis"
                  className="rvn-press flex items-center justify-center rounded-lg disabled:opacity-25"
                  style={{ width: 34, height: 30, background: `rgba(${GOLD},0.14)`, border: `1px solid rgba(${GOLD},0.35)`, color: 'var(--gold)' }}>
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <span className="rvn-disp tabular-nums" style={{ fontSize: 12, fontWeight: 700, color: 'var(--gold)', letterSpacing: '0.1em', minWidth: 64, textAlign: 'center' }}>
                  {clamped + 1} / {pageCount}
                </span>
                <button onClick={() => go(1)} disabled={clamped >= pageCount - 1} aria-label="Kitas puslapis"
                  className="rvn-press flex items-center justify-center rounded-lg disabled:opacity-25"
                  style={{ width: 34, height: 30, background: `rgba(${GOLD},0.14)`, border: `1px solid rgba(${GOLD},0.35)`, color: 'var(--gold)' }}>
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </>
          )}
          </section>

        {/* ── DEŠINĖ: kortos detalės + pakų CTA ── */}
        <section className="rounded-2xl flex flex-col min-h-0 overflow-hidden p-2.5" style={PANEL}>
          <div className="flex-1 min-h-0 overflow-y-auto">
            {selected ? <CardDetail key={selected.id} c={selected} onChanged={load} /> : (
              <div className="h-full flex items-center justify-center text-center px-3" style={{ fontSize: 12, color: 'var(--text-muted)' }}>Pasirink kortą, kad matytum detales.</div>
            )}
          </div>
          <button onClick={openPacks}
            className="shrink-0 mt-2 w-full rounded-xl font-bold rvn-press"
            style={{ minHeight: 42, fontSize: 12, background: 'linear-gradient(180deg,#fdba74,#f59e42)', color: '#1a0f04', fontFamily: 'var(--rvn-font-display)', letterSpacing: '0.04em', boxShadow: '0 6px 20px rgba(0,0,0,0.5)' }}>
            {totalPacks > 0 ? `🎁 Atplėšti pakus (${totalPacks})` : '🛒 Į parduotuvę'}
          </button>
        </section>
      </div>

      {/* ── Pakų pasirinkimo modalas ── */}
      {chooser && (
        <div className="fixed inset-0 z-[160] flex items-center justify-center p-4" style={{ background: 'rgba(4,3,8,0.9)' }} onClick={() => setChooser(false)}>
          <div className="w-[min(360px,92vw)] rounded-2xl p-5" style={{ border: '1px solid rgba(251,146,60,0.5)', background: 'linear-gradient(160deg,#17111f,#0a0810)' }} onClick={(e) => e.stopPropagation()}>
            <p className="text-base font-bold mb-3 text-center" style={{ fontFamily: 'var(--rvn-font-display)', color: '#fdba74', letterSpacing: '0.06em' }}>🎁 Kurį paką atplėšti?</p>
            <div className="space-y-2">
              {ownedPacks.map((pk) => (
                <button key={pk.id} onClick={() => { playUiClick(); setChooser(false); setOpeningPack(pk) }} className="w-full text-left px-3 py-2.5 rounded-xl transition-transform active:scale-[0.98]" style={{ background: 'rgba(251,146,60,0.14)', border: '1px solid rgba(251,146,60,0.45)' }}>
                  <span className="text-sm font-bold" style={{ color: '#fdba74', fontFamily: 'var(--rvn-font-display)' }}>{pk.name}</span>
                  <span className="text-xs ml-2" style={{ color: 'var(--text-muted)' }}>×{inv[pk.id]}</span>
                </button>
              ))}
            </div>
            <button onClick={() => { playUiClick(); setChooser(false) }} className="mt-3 w-full text-xs" style={{ color: 'var(--text-muted)' }}>Atšaukti</button>
          </div>
        </div>
      )}

      {openingPack && (
        <PackOpen packId={openingPack.id} packName={openingPack.name} packImage={openingPack.image_url}
          onClose={() => { setOpeningPack(null); refreshInv(); emitWalletChanged() }}
          onOpened={() => { refreshInv(); emitWalletChanged(); load() }} />
      )}
    </div>
  )
}

function FilterField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block shrink-0">
      <span className="block mb-1 font-bold uppercase" style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: '0.14em' }}>{label}</span>
      {children}
    </label>
  )
}

function FactionBtn({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="rvn-press w-full text-left rounded-lg px-2 py-1.5 truncate"
      style={{ fontSize: 11, fontWeight: 600, border: active ? `1.5px solid rgba(${GOLD},0.9)` : '1px solid rgba(255,255,255,0.08)', background: active ? `linear-gradient(135deg, rgba(${GOLD},0.16), rgba(10,8,16,0.9))` : 'rgba(10,8,16,0.6)', color: active ? 'var(--gold)' : 'var(--text-secondary)' }}>
      {label}
    </button>
  )
}

function CardCell({ c, selected, width, onClick }: { c: Col; selected: boolean; width: number; onClick: () => void }) {
  const [bad, setBad] = useState(false)
  const owned = c.owned > 0
  const col = rarityColor(c.rarity)
  return (
    <GameCard glowColor={owned ? col + '88' : 'rgba(120,120,140,0.3)'} sounds={owned}>
      <button onClick={onClick} className="relative block overflow-hidden rounded-lg"
        style={{ width, aspectRatio: '2.5 / 3.5', border: selected ? `2px solid rgb(${GOLD})` : `2px solid ${owned ? col : 'rgba(120,120,140,0.4)'}`, boxShadow: selected ? `0 0 14px rgba(${GOLD},0.55)` : owned ? `0 0 10px ${col}44` : 'none' }}>
        {c.image && !bad
          ? <SmartImg src={c.image} width={240} alt={c.name} onFail={() => setBad(true)}
              className="absolute inset-0 w-full h-full object-cover"
              style={{ filter: owned ? undefined : 'grayscale(1) brightness(0.55)', opacity: owned ? 1 : 0.55 }} />
          : <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 px-1 text-center" style={{ background: 'linear-gradient(160deg,#1a1325,#0a0810)', filter: owned ? undefined : 'grayscale(1)', opacity: owned ? 1 : 0.55 }}>
              <span className="text-xl">🎴</span><span style={{ fontSize: 9, lineHeight: 1.1, color: '#fff' }}>{c.name}</span>
            </div>}
        {!owned && (
          <span className="absolute inset-0 flex items-center justify-center">
            <Lock className="w-5 h-5" style={{ color: 'rgba(255,255,255,0.7)', filter: 'drop-shadow(0 1px 3px #000)' }} />
          </span>
        )}
        {owned && (
          <span className="absolute top-1 left-1 px-1 rounded-full font-bold leading-tight"
            style={{ fontSize: 9, background: 'rgba(0,0,0,0.82)', color: col, border: `1px solid ${col}` }}>×{c.owned}</span>
        )}
        <div className="absolute bottom-0 left-0 right-0 px-1 py-0.5" style={{ background: 'rgba(0,0,0,0.8)' }}>
          <p className="truncate text-center" style={{ fontSize: 8, lineHeight: 1.2, color: owned ? '#fff' : 'var(--text-muted)' }}>{c.name}</p>
        </div>
      </button>
    </GameCard>
  )
}

// ── Dešinės panelės kortos detalės (buvęs PreviewModal — dabar inline) ────────
function CardDetail({ c, onChanged }: { c: Col; onChanged?: () => void }) {
  const [bad, setBad] = useState(false)
  const [cfg, setCfg] = useState<CraftConfig | null>(null)
  const [essence, setEssence] = useState(0)
  const [ownedNow, setOwnedNow] = useState(c.owned)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  useEffect(() => { getCraftConfig().then((r) => { if (r) { setCfg(r.config); setEssence(r.essence) } }) }, [])
  const tier = String((c.type && /champion|čempion/i.test(c.type)) ? 6 : Math.min(6, Math.max(1, c.raritySort || 1)))
  const dustVal = cfg ? (cfg.disenchant[tier] ?? 0) : 0
  const craftCost = cfg ? (cfg.craft[tier] ?? 0) : 0
  const canDust = ownedNow > c.copyLimit
  const canCraft = ownedNow < c.copyLimit
  const doDust = async () => { if (busy) return; setBusy(true); playUiClick(); const r = await disenchantCard(c.id, 1); if (r && 'ok' in r) { playSuccess(); setOwnedNow((n) => n - 1); setEssence(r.essence ?? essence); onChanged?.() } else if (r && 'error' in r) setMsg(CRAFT_ERR_LT[r.error] ?? 'Nepavyko'); setBusy(false) }
  const doCraft = async () => { if (busy) return; setBusy(true); playUiClick(); const r = await craftCard(c.id); if (r && 'ok' in r) { playSuccess(); setOwnedNow((n) => n + 1); setEssence(r.essence ?? essence); onChanged?.() } else if (r && 'error' in r) setMsg(CRAFT_ERR_LT[r.error] ?? 'Nepavyko'); setBusy(false) }
  const owned = ownedNow > 0
  const col = rarityColor(c.rarity)
  return (
    <div className="flex flex-col gap-2">
      <div className="relative w-full rounded-xl overflow-hidden shrink-0 mx-auto" style={{ aspectRatio: '2.5 / 3.5', maxWidth: 190, border: `2px solid ${col}`, boxShadow: `0 0 16px ${col}33` }}>
        {c.image && !bad
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={c.image} alt={c.name} onError={() => setBad(true)} draggable={false} className="absolute inset-0 w-full h-full object-cover" style={{ filter: owned ? undefined : 'grayscale(1) brightness(0.6)' }} />
          : <div className="absolute inset-0 flex items-center justify-center text-4xl" style={{ background: 'linear-gradient(160deg,#1a1325,#0a0810)' }}>🎴</div>}
        {!owned && <span className="absolute inset-0 flex items-center justify-center"><Lock className="w-8 h-8" style={{ color: 'rgba(255,255,255,0.75)' }} /></span>}
      </div>
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-bold truncate" style={{ fontSize: 14, fontFamily: 'var(--rvn-font-display)', color: '#f3ead3' }}>{c.name}</h2>
        <span className="font-bold px-1.5 py-0.5 rounded-full shrink-0" style={{ fontSize: 10, color: col, border: `1px solid ${col}` }}>{c.rarity ?? '—'}</span>
      </div>
      <div className="flex flex-wrap gap-x-2.5 gap-y-0.5" style={{ fontSize: 11, color: 'var(--text-muted)' }}>
        <span>🪙 {c.gold}</span>
        {c.atk != null && <span>⚔️ {c.atk}</span>}
        {c.hp != null && <span>❤️ {c.hp}</span>}
        {c.faction && <span>· {c.faction}</span>}
        {c.type && <span>· {c.type}</span>}
      </div>
      {c.effect && <p className="leading-snug" style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{c.effect}</p>}
      <p className="font-semibold" style={{ fontSize: 11, color: owned ? '#86efac' : '#fca5a5' }}>
        {owned ? `Turima: ×${ownedNow}` : 'Kortos dar neturi'}
      </p>
      <div className="flex items-center justify-between gap-2 pt-1.5" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        <span style={{ fontSize: 11, color: '#c4b5fd' }}>🔮 {essence}</span>
        <div className="flex gap-1.5">
          {canDust && (
            <button onClick={doDust} disabled={busy} className="rvn-press px-2 py-1.5 rounded-lg font-bold" style={{ fontSize: 10, background: 'rgba(139,92,246,0.16)', border: '1px solid rgba(139,92,246,0.5)', color: '#c4b5fd' }}>Dulkinti +🔮{dustVal}</button>
          )}
          {canCraft && (
            <button onClick={doCraft} disabled={busy || essence < craftCost} className="rvn-press px-2 py-1.5 rounded-lg font-extrabold" style={{ fontSize: 10, background: essence >= craftCost ? 'linear-gradient(180deg,#ffe28c,#f3b62c)' : 'rgba(255,255,255,0.06)', color: essence >= craftCost ? '#3a2406' : 'var(--text-muted)' }}>Sukurti 🔮{craftCost}</button>
          )}
        </div>
      </div>
      {msg && <p className="text-center" style={{ fontSize: 10, color: '#fca5a5' }}>{msg}</p>}
    </div>
  )
}
