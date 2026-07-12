'use client'

// ══════════════════════════════════════════════════════════════════════════════
// Ravenof Digital — KOLEKCIJA (landscape, 3 zonos, be popup'ų):
// • KAIRĖ: paieška + filtrai (frakcija/retumas/tipas/rikiavimas/tik turimos).
// • CENTRAS: didelis kortų grid, puslapiuojamas ← → (swipe + mygtukai), be scroll.
// • DEŠINĖ: pasirinktos kortos detalės + craft/disenchant + pakų CTA (visada matomas).
// ══════════════════════════════════════════════════════════════════════════════
import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Search, Lock } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { LoadingOrRetry } from './ui/LoadingOrRetry'
import { playUiClick, playSuccess } from '@/lib/ui-sound'
import { getCraftConfig, disenchantCard, craftCard, type CraftConfig } from '@/lib/gamification/craft'
import { useT, useContent } from '@/lib/i18n/react'
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
const SORT_DEFS: { key: SortKey; labelKey: string }[] = [
  { key: 'cost-asc',  labelKey: 'collection.sort.costAsc' },
  { key: 'cost-desc', labelKey: 'collection.sort.costDesc' },
  { key: 'name',      labelKey: 'collection.sort.name' },
  { key: 'rarity',    labelKey: 'collection.sort.rarity' },
  { key: 'owned',     labelKey: 'collection.sort.owned' },
]

const SEL: React.CSSProperties = { background: 'rgba(10,8,16,0.9)', border: `1px solid rgba(${GOLD},0.3)`, color: 'var(--text-primary)', fontSize: 12, borderRadius: 10, padding: '7px 8px', minHeight: 36, width: '100%' }

export function DigitalCollection() {
  const t = useT()
  const tc = useContent()
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

  // ── Kolekcija v2: dominuojantis grid su vidiniu scroll (be puslapiavimo) ──
  // Tankis: compact = daugiau kortų; comfortable = didesnės. Persistinama.
  const [density, setDensity] = useState<'compact' | 'comfortable'>(() => {
    if (typeof window === 'undefined') return 'compact'
    const saved = localStorage.getItem('rvn-col-density')
    if (saved === 'compact' || saved === 'comfortable') return saved
    return window.innerHeight < 520 ? 'compact' : 'comfortable'
  })
  const setDensityP = (d: 'compact' | 'comfortable') => { setDensity(d); try { localStorage.setItem('rvn-col-density', d) } catch { /* */ } }
  // Inspector: didele rezoliucija — šoninis, sutraukiamas (sesijos atmintis);
  // mažame landscape — slide-over tik pasirinkus kortą.
  const [inspectorOpen, setInspectorOpen] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true
    return sessionStorage.getItem('rvn-col-inspector') !== '0'
  })
  const toggleInspector = () => setInspectorOpen((v) => { try { sessionStorage.setItem('rvn-col-inspector', v ? '0' : '1') } catch { /* */ } return !v })
  const [wide, setWide] = useState(true)
  useEffect(() => {
    const check = () => setWide(window.innerWidth >= 900 && window.innerHeight >= 500)
    check(); window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])
  const [mobileDetail, setMobileDetail] = useState(false)

  const [loadSlow, setLoadSlow] = useState(false)
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

  const selected = useMemo(() => filtered.find((c) => c.id === selId) ?? filtered[0] ?? null, [filtered, selId])

  const ownedCount = (cards ?? []).filter((c) => c.owned > 0).length
  const activeFilters = (faction !== 'all' ? 1 : 0) + (rarity !== 'all' ? 1 : 0) + (type !== 'all' ? 1 : 0) + (ownedOnly ? 1 : 0)
  const resetFilters = () => { setFaction('all'); setRarity('all'); setType('all'); setSort('cost-asc'); setOwnedOnly(false); setQ('') }

  useEffect(() => {
    if (cards !== null) { setLoadSlow(false); return }
    const t = setTimeout(() => setLoadSlow(true), 10_000)
    return () => clearTimeout(t)
  }, [cards])

  if (loggedOut) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-3 text-center px-6">
        <span style={{ fontSize: 40 }}>🎴</span>
        <div className="rvn-disp font-black uppercase" style={{ fontSize: 22, color: 'var(--gold)' }}>{t('collection.title')}</div>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{t('collection.loginPrompt')} <Link href="/digital/login?next=/digital/collection" className="underline" style={{ color: 'var(--gold)' }}>{t('collection.signIn')}</Link></p>
      </div>
    )
  }

  if (cards === null) return <LoadingOrRetry timedOut={loadSlow} onRetry={() => { setLoadSlow(false); void load() }} />

  return (
    <div className="h-full flex flex-col min-h-0" style={{ gap: 'clamp(4px,1vh,8px)' }}>
      {/* ── Kompaktiška antraštė + filtrų juosta (viena eilė; siauram — horizontalus scroll) ── */}
      <div className="shrink-0 flex items-center gap-1.5 overflow-x-auto pb-0.5" data-testid="collection-toolbar" style={{ scrollbarWidth: 'none' }}>
        <div className="shrink-0 flex items-baseline gap-2 pr-1">
          <span className="rvn-disp font-black uppercase leading-none" style={{ fontSize: 'clamp(14px,2.6vh,20px)', color: 'var(--gold)', letterSpacing: '0.04em' }}>{t('collection.title')}</span>
          <span className="whitespace-nowrap" style={{ fontSize: 'clamp(8px,1.3vh,10.5px)', color: 'var(--text-muted)' }}>{ownedCount}/{cards.length} · {t('collection.shown', { count: filtered.length })}</span>
        </div>
        <div className="relative shrink-0" style={{ width: 'clamp(120px, 16vw, 200px)' }}>
          <Search className="absolute left-2 top-1/2 -translate-y-1/2" style={{ width: 13, height: 13, color: 'var(--text-muted)' }} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('collection.searchPlaceholder')} aria-label={t('collection.searchAria')}
            className="w-full outline-none" style={{ ...SEL, paddingLeft: 26 }} />
        </div>
        <select value={faction} onChange={(e) => { playUiClick(); setFaction(e.target.value) }} aria-label={t('collection.faction')} className="shrink-0" style={{ ...SEL, maxWidth: 150 }}>
          <option value="all">{t('collection.allFactions')}</option>
          {factions.map((f) => <option key={f.slug} value={f.slug}>{tc('faction', f.slug, 'name', f.name)}</option>)}
        </select>
        <select value={type} onChange={(e) => { playUiClick(); setType(e.target.value) }} aria-label={t('collection.type')} className="shrink-0" style={{ ...SEL, maxWidth: 120 }}>
          <option value="all">{t('collection.allTypes')}</option>
          {types.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <select value={rarity} onChange={(e) => { playUiClick(); setRarity(e.target.value) }} aria-label={t('collection.rarity')} className="shrink-0" style={{ ...SEL, maxWidth: 120 }}>
          <option value="all">{t('collection.allRarities')}</option>
          {rarities.map((r) => <option key={r.name} value={r.name}>{r.name}</option>)}
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)} aria-label={t('collection.sortAria')} className="shrink-0" style={{ ...SEL, maxWidth: 130 }}>
          {SORT_DEFS.map((so) => <option key={so.key} value={so.key}>{t(so.labelKey)}</option>)}
        </select>
        <button onClick={() => { playUiClick(); setOwnedOnly((v) => !v) }} data-testid="owned-toggle"
          className="rvn-press shrink-0 px-2.5 rounded-lg font-bold whitespace-nowrap"
          style={{ height: 30, fontSize: 10.5, background: ownedOnly ? 'rgba(34,197,94,0.16)' : 'rgba(10,8,16,0.7)', border: `1px solid ${ownedOnly ? 'rgba(34,197,94,0.55)' : 'rgba(255,255,255,0.12)'}`, color: ownedOnly ? '#86efac' : 'var(--text-secondary)' }}>
          {ownedOnly ? '✓ ' : ''}{t('collection.owned')}
        </button>
        <button onClick={() => { playUiClick(); setDensityP(density === 'compact' ? 'comfortable' : 'compact') }} title={density === 'compact' ? t('collection.biggerCards') : t('collection.moreCards')} data-testid="density-toggle"
          className="rvn-press shrink-0 px-2 rounded-lg font-bold" style={{ height: 30, fontSize: 12, background: 'rgba(10,8,16,0.7)', border: '1px solid rgba(255,255,255,0.12)', color: 'var(--text-secondary)' }}>
          {density === 'compact' ? '▥' : '▦'}
        </button>
        {activeFilters > 0 && (
          <button onClick={() => { playUiClick(); resetFilters() }} className="rvn-press shrink-0 px-2 rounded-lg whitespace-nowrap" style={{ height: 30, fontSize: 9.5, background: `rgba(${GOLD},0.12)`, border: `1px solid rgba(${GOLD},0.4)`, color: 'var(--gold)' }}>{t('collection.clearFilters', { count: activeFilters })}</button>
        )}
        <button onClick={openPacks} data-testid="packs-btn"
          className="rvn-press shrink-0 ml-auto px-3 rounded-lg font-extrabold whitespace-nowrap"
          style={{ height: 30, fontSize: 11, fontFamily: 'var(--rvn-font-display)',
            background: totalPacks > 0 ? 'linear-gradient(180deg,#fdba74,#f59e42)' : 'rgba(10,8,16,0.7)',
            border: totalPacks > 0 ? '1px solid #fed7aa' : '1px solid rgba(255,255,255,0.14)',
            color: totalPacks > 0 ? '#1a0f04' : 'var(--text-muted)' }}>
          🎁 {totalPacks > 0 ? t('collection.packsN', { count: totalPacks }) : t('collection.toShop')}
        </button>
      </div>

      {/* ── PAGRINDAS: dominuojantis kortų naršyklė + sutraukiamas inspector ── */}
      <div className="flex-1 min-h-0 flex gap-2">
        <section className="rounded-2xl flex-1 min-w-0 min-h-0 overflow-hidden p-2" style={PANEL} data-testid="card-browser">
          {filtered.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              {ownedOnly
                ? <EmptyState icon="🃏" title={t('collection.emptyTitle')} sub={t('collection.emptySub')} accent="251,146,60" ctaLabel={t('collection.openPackCta')} onCta={openPacks} />
                : <EmptyState icon="🔍" title={t('collection.nothingFound')} sub={t('collection.nothingFoundSub')} />}
            </div>
          ) : (
            <div className="h-full min-h-0 overflow-y-auto pr-0.5" style={{ overscrollBehavior: 'contain', scrollbarGutter: 'stable' }}>
              <div className="grid gap-2 content-start" style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${density === 'compact' ? 'clamp(88px, 8vw, 118px)' : 'clamp(112px, 10.5vw, 150px)'}, 1fr))` }}>
                {filtered.map((c) => (
                  <CardCell key={c.id} c={c} selected={selected?.id === c.id} width={0}
                    onClick={() => { playUiClick(); setSelId(c.id); if (!wide) setMobileDetail(true) }} />
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Inspector (tik plačiame lange): kompaktiškas, sutraukiamas */}
        {wide && (inspectorOpen ? (
          <section className="rounded-2xl shrink-0 flex flex-col min-h-0 overflow-hidden p-2 relative" style={{ ...PANEL, width: 250 }} data-testid="inspector">
            <button onClick={() => { playUiClick(); toggleInspector() }} aria-label="Suskleisti detales" data-testid="inspector-collapse"
              className="rvn-press absolute top-1.5 left-1.5 z-10 flex items-center justify-center rounded-lg"
              style={{ width: 24, height: 24, background: 'rgba(10,8,16,0.9)', border: '1px solid rgba(255,255,255,0.15)', color: 'var(--text-secondary)', fontSize: 13 }}>›</button>
            <div className="flex-1 min-h-0 overflow-y-auto">
              {selected ? <CardDetail key={selected.id} c={selected} onChanged={load} /> : (
                <div className="h-full flex items-center justify-center text-center px-3" style={{ fontSize: 12, color: 'var(--text-muted)' }}>{t('collection.pickCard')}</div>
              )}
            </div>
          </section>
        ) : (
          <button onClick={() => { playUiClick(); toggleInspector() }} aria-label={t('collection.showDetails')} data-testid="inspector-open"
            className="rvn-press shrink-0 rounded-2xl flex items-center justify-center" style={{ ...PANEL, width: 26, color: 'var(--gold)', fontSize: 14 }}>‹</button>
        ))}
      </div>

      {/* Mažo landscape kortos detalės — slide-over (neuždengia nav, Esc/tap uždaro) */}
      {!wide && mobileDetail && selected && (
        <div className="fixed inset-0 z-[150] flex justify-end" style={{ background: 'rgba(4,3,8,0.7)' }} onClick={() => setMobileDetail(false)}>
          <div onClick={(e) => e.stopPropagation()} className="h-full flex flex-col overflow-hidden p-2.5"
            style={{ width: 'min(280px, 78vw)', background: 'linear-gradient(160deg, rgba(20,16,28,0.99), rgba(9,7,12,0.99))', borderLeft: `1px solid rgba(${GOLD},0.4)`, paddingBottom: 'max(10px, env(safe-area-inset-bottom))' }}>
            <button onClick={() => setMobileDetail(false)} className="self-end shrink-0 px-2 py-0.5 rounded-lg" style={{ fontSize: 12, color: 'var(--text-muted)', border: '1px solid rgba(255,255,255,0.12)' }}>{t('collection.closeX')}</button>
            <div className="flex-1 min-h-0 overflow-y-auto mt-1">
              <CardDetail key={selected.id} c={selected} onChanged={load} />
            </div>
          </div>
        </div>
      )}

      {/* ── Pakų pasirinkimo modalas ── */}
      {chooser && (
        <div className="fixed inset-0 z-[160] flex items-center justify-center p-4" style={{ background: 'rgba(4,3,8,0.9)' }} onClick={() => setChooser(false)}>
          <div className="w-[min(360px,92vw)] rounded-2xl p-5" style={{ border: '1px solid rgba(251,146,60,0.5)', background: 'linear-gradient(160deg,#17111f,#0a0810)' }} onClick={(e) => e.stopPropagation()}>
            <p className="text-base font-bold mb-3 text-center" style={{ fontFamily: 'var(--rvn-font-display)', color: '#fdba74', letterSpacing: '0.06em' }}>{t('collection.whichPack')}</p>
            <div className="space-y-2">
              {ownedPacks.map((pk) => (
                <button key={pk.id} onClick={() => { playUiClick(); setChooser(false); setOpeningPack(pk) }} className="w-full text-left px-3 py-2.5 rounded-xl transition-transform active:scale-[0.98]" style={{ background: 'rgba(251,146,60,0.14)', border: '1px solid rgba(251,146,60,0.45)' }}>
                  <span className="text-sm font-bold" style={{ color: '#fdba74', fontFamily: 'var(--rvn-font-display)' }}>{pk.name}</span>
                  <span className="text-xs ml-2" style={{ color: 'var(--text-muted)' }}>×{inv[pk.id]}</span>
                </button>
              ))}
            </div>
            <button onClick={() => { playUiClick(); setChooser(false) }} className="mt-3 w-full text-xs" style={{ color: 'var(--text-muted)' }}>{t('common.cancel')}</button>
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



function CardCell({ c, selected, width, onClick }: { c: Col; selected: boolean; width: number; onClick: () => void }) {
  const [bad, setBad] = useState(false)
  const owned = c.owned > 0
  const col = rarityColor(c.rarity)
  return (
    <GameCard glowColor={owned ? col + '88' : 'rgba(120,120,140,0.3)'} sounds={owned}>
      <button onClick={onClick} className="relative block overflow-hidden rounded-lg"
        style={{ width: width > 0 ? width : '100%', aspectRatio: '2.5 / 3.5', border: selected ? `2px solid rgb(${GOLD})` : `2px solid ${owned ? col : 'rgba(120,120,140,0.4)'}`, boxShadow: selected ? `0 0 14px rgba(${GOLD},0.55)` : owned ? `0 0 10px ${col}44` : 'none' }}>
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
  const t = useT()
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
  const doDust = async () => { if (busy) return; setBusy(true); playUiClick(); const r = await disenchantCard(c.id, 1); if (r && 'ok' in r) { playSuccess(); setOwnedNow((n) => n - 1); setEssence(r.essence ?? essence); onChanged?.() } else if (r && 'error' in r) setMsg(t(`collection.craftErr.${r.error}`) === `collection.craftErr.${r.error}` ? t('collection.failed') : t(`collection.craftErr.${r.error}`)); setBusy(false) }
  const doCraft = async () => { if (busy) return; setBusy(true); playUiClick(); const r = await craftCard(c.id); if (r && 'ok' in r) { playSuccess(); setOwnedNow((n) => n + 1); setEssence(r.essence ?? essence); onChanged?.() } else if (r && 'error' in r) setMsg(t(`collection.craftErr.${r.error}`) === `collection.craftErr.${r.error}` ? t('collection.failed') : t(`collection.craftErr.${r.error}`)); setBusy(false) }
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
        {owned ? t('collection.ownedCount', { count: ownedNow }) : t('collection.notOwned')}
      </p>
      <div className="flex items-center justify-between gap-2 pt-1.5" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        <span style={{ fontSize: 11, color: '#c4b5fd' }}>🔮 {essence}</span>
        <div className="flex gap-1.5">
          {canDust && (
            <button onClick={doDust} disabled={busy} className="rvn-press px-2 py-1.5 rounded-lg font-bold" style={{ fontSize: 10, background: 'rgba(139,92,246,0.16)', border: '1px solid rgba(139,92,246,0.5)', color: '#c4b5fd' }}>{t('collection.disenchant')} +🔮{dustVal}</button>
          )}
          {canCraft && (
            <button onClick={doCraft} disabled={busy || essence < craftCost} className="rvn-press px-2 py-1.5 rounded-lg font-extrabold" style={{ fontSize: 10, background: essence >= craftCost ? 'linear-gradient(180deg,#ffe28c,#f3b62c)' : 'rgba(255,255,255,0.06)', color: essence >= craftCost ? '#3a2406' : 'var(--text-muted)' }}>{t('collection.craft')} 🔮{craftCost}</button>
          )}
        </div>
      </div>
      {msg && <p className="text-center" style={{ fontSize: 10, color: '#fca5a5' }}>{msg}</p>}
    </div>
  )
}
