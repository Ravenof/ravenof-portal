'use client'

// ══════════════════════════════════════════════════════════════════════════════
// Ravenof Digital — KOLEKCIJOS KNYGA: 9 kortos puslapyje (3×3), 3D puslapio
// vertimo efektas (framer-motion + garsas), paieška / filtrai (frakcija,
// retumas, tipas) / rikiavimas (kaina, pavadinimas, retumas, turimos) + swipe.
// Puslapiavimas montuoja tik 9 GameCard vienu metu — greitesnis krovimas.
// ══════════════════════════════════════════════════════════════════════════════
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { AnimatePresence, motion } from 'framer-motion'
import { Search, Lock, X, ChevronLeft, ChevronRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { playUiClick, playCardFlip } from '@/lib/ui-sound'
import { getActivePacks, getPackInventory, type Pack } from '@/lib/economy'
import { requestOpenStore, emitWalletChanged } from '@/lib/digital/native'
import { rarityColor } from '@/lib/digital/rarity'
import { GameCard } from '@/components/ui/GameCard'
import { PackOpen } from './PackOpen'
import { EmptyState, PageHero } from './ui/HubKit'

const PER_PAGE = 9
const GOLD = '240,180,41'
const oct = (b: number) => `polygon(${b}px 0, calc(100% - ${b}px) 0, 100% ${b}px, 100% calc(100% - ${b}px), calc(100% - ${b}px) 100%, ${b}px 100%, 0 calc(100% - ${b}px), 0 ${b}px)`

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
  const [preview, setPreview] = useState<Col | null>(null)

  const [page, setPage] = useState(0)
  const [dir, setDir] = useState(1)
  const touchX = useRef<number | null>(null)

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

  // filtrams pasikeitus — grįžtam į 1 puslapį
  useEffect(() => { setPage(0) }, [q, faction, rarity, type, ownedOnly, sort])

  const pageCount = Math.max(1, Math.ceil(filtered.length / PER_PAGE))
  const clamped = Math.min(page, pageCount - 1)
  const pagedCards = useMemo(() => {
    const slice = filtered.slice(clamped * PER_PAGE, clamped * PER_PAGE + PER_PAGE)
    return Array.from({ length: PER_PAGE }, (_, i) => slice[i] ?? null)
  }, [filtered, clamped])

  const go = (d: number) => {
    const next = clamped + d
    if (next < 0 || next >= pageCount) return
    playCardFlip(); setDir(d); setPage(next)
  }

  const ownedCount = (cards ?? []).filter((c) => c.owned > 0).length

  if (cards === null) return <p className="text-center text-sm py-16" style={{ color: 'var(--text-muted)' }}>Kraunama…</p>

  const selStyle: React.CSSProperties = { background: 'rgba(10,8,16,0.9)', border: `1px solid rgba(${GOLD},0.3)`, color: 'var(--text-secondary)', fontSize: 11.5, borderRadius: 10, padding: '7px 8px', minHeight: 38, width: '100%' }

  return (
    <div className="space-y-3" style={{ paddingBottom: 64 }}>
      <PageHero compact iconName="fi-collection" icon={<span style={{ fontSize: 28 }}>🎴</span>} title="KOLEKCIJA" sub={`Tavo kortų knyga · surinkta ${ownedCount}/${cards.length}`} />

      {loggedOut ? (
        <p className="text-sm text-center py-12" style={{ color: 'var(--text-muted)' }}>Prisijunk, kad matytum kolekciją. <Link href="/login?next=/digital/collection" className="underline" style={{ color: 'var(--gold)' }}>Prisijungti</Link></p>
      ) : (
      <>
        {/* Paieška */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ieškoti kortos…"
            className="w-full pl-9 pr-3 rounded-xl text-sm outline-none"
            style={{ minHeight: 42, background: 'rgba(10,8,16,0.9)', border: `1px solid rgba(${GOLD},0.3)`, color: 'var(--text-primary)' }} />
        </div>

        {/* Filtrai + rikiavimas */}
        <div className="grid grid-cols-2 gap-1.5">
          <select value={faction} onChange={(e) => setFaction(e.target.value)} style={selStyle}>
            <option value="all">Visos frakcijos</option>
            {factions.map((f) => <option key={f.slug} value={f.slug}>{f.name}</option>)}
          </select>
          <select value={rarity} onChange={(e) => setRarity(e.target.value)} style={selStyle}>
            <option value="all">Visi retumai</option>
            {rarities.map((r) => <option key={r.name} value={r.name}>{r.name}</option>)}
          </select>
          <select value={type} onChange={(e) => setType(e.target.value)} style={selStyle}>
            <option value="all">Visi tipai</option>
            {types.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)} style={selStyle}>
            {SORTS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
        </div>

        <div className="flex items-center justify-between gap-2">
          <button onClick={() => { playUiClick(); setOwnedOnly((v) => !v) }}
            className="inline-flex items-center gap-2 px-3 rounded-full text-xs font-semibold transition-colors"
            style={{ minHeight: 36, background: ownedOnly ? 'rgba(34,197,94,0.18)' : 'rgba(10,8,16,0.9)', border: `1px solid ${ownedOnly ? 'rgba(34,197,94,0.6)' : `rgba(${GOLD},0.3)`}`, color: ownedOnly ? '#86efac' : 'var(--text-muted)' }}>
            <span className="relative inline-block rounded-full" style={{ width: 28, height: 15, background: ownedOnly ? 'rgba(34,197,94,0.5)' : 'rgba(255,255,255,0.12)' }}>
              <span className="absolute top-0.5 rounded-full bg-white transition-all" style={{ width: 11, height: 11, left: ownedOnly ? 15 : 2 }} />
            </span>
            Tik turimos
          </button>
          <span className="text-[11px] tabular-nums" style={{ color: 'var(--text-muted)' }}>{filtered.length} kortų</span>
        </div>

        {/* ── KNYGA ── */}
        {filtered.length === 0 ? (
          ownedOnly ? (
            <EmptyState icon="🃏" title="Kolekcija dar tuščia" sub="Atplėšk pakuotę, kad rinktum kortas ir kurtum galingesnes kaladės." accent="251,146,60"
              ctaLabel="🎁 Atplėšti pakuotę" onCta={openPacks} />
          ) : (
            <EmptyState icon="🔍" title="Nieko nerasta" sub="Pabandyk kitą paiešką ar filtrą." />
          )
        ) : (
        <>
          <div className="relative mx-auto max-w-[470px]" style={{ perspective: 1600 }}
            onTouchStart={(e) => { touchX.current = e.touches[0].clientX }}
            onTouchEnd={(e) => {
              if (touchX.current == null) return
              const dx = e.changedTouches[0].clientX - touchX.current
              touchX.current = null
              if (Math.abs(dx) > 48) go(dx < 0 ? 1 : -1)
            }}>
            {/* knygos „lapai" už nugaros */}
            <div aria-hidden className="absolute inset-0" style={{ transform: 'translate(5px, 6px)', clipPath: oct(14), background: 'linear-gradient(160deg,#241a33,#0d0a14)', opacity: 0.7 }} />
            <div aria-hidden className="absolute inset-0" style={{ transform: 'translate(2.5px, 3px)', clipPath: oct(14), background: 'linear-gradient(160deg,#2d2140,#100c18)', opacity: 0.85 }} />

            {/* viršelio rėmas */}
            <div className="relative" style={{ clipPath: oct(14), background: `linear-gradient(160deg, rgba(${GOLD},0.55), rgba(${GOLD},0.28))`, padding: 2.5 }}>
              <div className="p-3" style={{ clipPath: oct(13), background: `radial-gradient(130% 70% at 50% 0%, rgba(${GOLD},0.09), rgba(10,8,16,0.97) 62%), linear-gradient(160deg,#1a1228,#0a0810)` }}>
                <AnimatePresence mode="wait" initial={false} custom={dir}>
                  <motion.div key={clamped}
                    initial={{ rotateY: dir > 0 ? 80 : -80, opacity: 0.25 }}
                    animate={{ rotateY: 0, opacity: 1 }}
                    exit={{ rotateY: dir > 0 ? -80 : 80, opacity: 0.25 }}
                    transition={{ duration: 0.38, ease: [0.3, 0.6, 0.3, 1] }}
                    style={{ transformOrigin: dir > 0 ? 'left center' : 'right center', transformStyle: 'preserve-3d' }}
                    className="grid grid-cols-3 gap-2">
                    {pagedCards.map((c, i) => c
                      ? <CardCell key={c.id} c={c} onClick={() => { playUiClick(); setPreview(c) }} />
                      : <div key={`empty-${i}`} className="rounded-lg" style={{ aspectRatio: '2.5 / 3.5', border: `1px dashed rgba(${GOLD},0.18)`, background: `rgba(${GOLD},0.02)` }} />)}
                  </motion.div>
                </AnimatePresence>

                {/* puslapio numeris knygos apačioje */}
                <div className="flex items-center justify-center gap-3 mt-3">
                  <button onClick={() => go(-1)} disabled={clamped === 0} aria-label="Ankstesnis puslapis"
                    className="rvn-press flex items-center justify-center disabled:opacity-25"
                    style={{ width: 38, height: 38, clipPath: oct(8), background: `rgba(${GOLD},0.14)`, border: 'none', color: 'var(--gold)' }}>
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <span className="rvn-disp tabular-nums" style={{ fontSize: 12, fontWeight: 700, color: 'var(--gold)', letterSpacing: '0.1em', minWidth: 72, textAlign: 'center' }}>
                    {clamped + 1} / {pageCount}
                  </span>
                  <button onClick={() => go(1)} disabled={clamped >= pageCount - 1} aria-label="Kitas puslapis"
                    className="rvn-press flex items-center justify-center disabled:opacity-25"
                    style={{ width: 38, height: 38, clipPath: oct(8), background: `rgba(${GOLD},0.14)`, border: 'none', color: 'var(--gold)' }}>
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
          <p className="text-center text-[10px]" style={{ color: 'rgba(150,160,185,0.55)' }}>Braukk per knygą arba spausk rodykles</p>
        </>
        )}
      </>
      )}

      {/* Sticky CTA */}
      <div className="fixed left-0 right-0 z-30 px-4" style={{ bottom: 'calc(72px + env(safe-area-inset-bottom, 0px))' }}>
        <button onClick={openPacks}
          className="mx-auto block w-[min(420px,100%)] px-4 py-2.5 rounded-full text-xs font-bold transition-transform active:scale-[0.98]"
          style={{ background: 'rgba(251,146,60,0.92)', color: '#1a0f04', fontFamily: 'var(--rvn-font-display)', letterSpacing: '0.04em', boxShadow: '0 6px 20px rgba(0,0,0,0.5)' }}>
          {totalPacks > 0 ? `🎁 Atplėšti pakus (${totalPacks})` : '🛒 Į parduotuvę'}
        </button>
      </div>

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

      {preview && <PreviewModal c={preview} onClose={() => setPreview(null)} />}
    </div>
  )
}

function CardCell({ c, onClick }: { c: Col; onClick: () => void }) {
  const [bad, setBad] = useState(false)
  const owned = c.owned > 0
  const col = rarityColor(c.rarity)
  return (
    <GameCard glowColor={owned ? col + '88' : 'rgba(120,120,140,0.3)'} sounds={owned}>
      <button onClick={onClick} className="relative block w-full overflow-hidden rounded-lg"
        style={{ aspectRatio: '2.5 / 3.5', border: `2px solid ${owned ? col : 'rgba(120,120,140,0.4)'}`, boxShadow: owned ? `0 0 10px ${col}44` : 'none' }}>
        {c.image && !bad
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={c.image} alt={c.name} onError={() => setBad(true)} draggable={false} loading="lazy"
              className="absolute inset-0 w-full h-full object-cover"
              style={{ filter: owned ? undefined : 'grayscale(1) brightness(0.55)', opacity: owned ? 1 : 0.55 }} />
          : <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 px-1 text-center" style={{ background: 'linear-gradient(160deg,#1a1325,#0a0810)', filter: owned ? undefined : 'grayscale(1)', opacity: owned ? 1 : 0.55 }}>
              <span className="text-xl">🎴</span><span className="text-[9px] leading-tight" style={{ color: '#fff' }}>{c.name}</span>
            </div>}

        {!owned && (
          <span className="absolute inset-0 flex items-center justify-center">
            <Lock className="w-5 h-5" style={{ color: 'rgba(255,255,255,0.7)', filter: 'drop-shadow(0 1px 3px #000)' }} />
          </span>
        )}

        {owned && (
          <span className="absolute top-1 right-1 px-1 rounded-full text-[9px] font-bold leading-tight"
            style={{ background: 'rgba(0,0,0,0.82)', color: col, border: `1px solid ${col}` }}>×{c.owned}</span>
        )}

        <span className="absolute top-1 left-1 flex items-center justify-center rounded-full text-[9px] font-bold"
          style={{ width: 16, height: 16, background: 'rgba(240,180,41,0.92)', color: '#1a0f04', filter: owned ? undefined : 'grayscale(0.6)' }}>{c.gold}</span>

        <div className="absolute bottom-0 left-0 right-0 px-1 py-0.5" style={{ background: 'rgba(0,0,0,0.8)' }}>
          <p className="text-[8px] leading-tight truncate text-center" style={{ color: owned ? '#fff' : 'var(--text-muted)' }}>{c.name}</p>
        </div>
      </button>
    </GameCard>
  )
}

function PreviewModal({ c, onClose }: { c: Col; onClose: () => void }) {
  const [bad, setBad] = useState(false)
  const owned = c.owned > 0
  const col = rarityColor(c.rarity)
  return (
    <div className="fixed inset-0 z-[160] flex items-center justify-center p-5" style={{ background: 'rgba(4,3,8,0.9)' }} onClick={onClose}>
      <div className="relative w-[min(360px,94vw)] rounded-2xl overflow-hidden" style={{ border: `2px solid ${col}`, background: 'linear-gradient(160deg,#15101f,#0a0810)' }} onClick={(e) => e.stopPropagation()}>
        <button onClick={() => { playUiClick(); onClose() }} className="absolute top-2 right-2 z-10 flex items-center justify-center rounded-full" style={{ width: 32, height: 32, background: 'rgba(0,0,0,0.6)', color: '#fff' }} aria-label="Uždaryti"><X className="w-4 h-4" /></button>
        <div className="relative w-full" style={{ aspectRatio: '2.5 / 3.5', maxHeight: '52vh' }}>
          {c.image && !bad
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={c.image} alt={c.name} onError={() => setBad(true)} draggable={false} className="absolute inset-0 w-full h-full object-contain" style={{ filter: owned ? undefined : 'grayscale(1) brightness(0.6)' }} />
            : <div className="absolute inset-0 flex items-center justify-center text-5xl">🎴</div>}
          {!owned && <span className="absolute inset-0 flex items-center justify-center"><Lock className="w-10 h-10" style={{ color: 'rgba(255,255,255,0.75)' }} /></span>}
        </div>
        <div className="p-4 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-base font-bold" style={{ fontFamily: 'var(--rvn-font-display)', color: '#f3ead3' }}>{c.name}</h2>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ color: col, border: `1px solid ${col}` }}>{c.rarity ?? '—'}</span>
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px]" style={{ color: 'var(--text-muted)' }}>
            <span>🪙 {c.gold}</span>
            {c.atk != null && <span>⚔️ {c.atk}</span>}
            {c.hp != null && <span>❤️ {c.hp}</span>}
            {c.faction && <span>· {c.faction}</span>}
            {c.type && <span>· {c.type}</span>}
          </div>
          {c.effect && <p className="text-xs leading-snug" style={{ color: 'var(--text-secondary)' }}>{c.effect}</p>}
          <p className="text-xs font-semibold" style={{ color: owned ? '#86efac' : '#fca5a5' }}>
            {owned ? `Turima: ×${c.owned}` : 'Kortos dar neturi'}
          </p>
        </div>
      </div>
    </div>
  )
}
