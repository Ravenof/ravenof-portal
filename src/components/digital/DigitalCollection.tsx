'use client'

// ══════════════════════════════════════════════════════════════════════════════
// Ravenof Digital — KOLEKCIJA (patvirtintas UI, Fazė 1 — collection-default.png):
// • Viršus: pavadinimas + paieška + „Tik turimos" + rikiavimas (+ pakų CTA kai turi).
// • Filtrų juosta: frakcijų ikonos · retumo gemos · tipų ikonos.
// • Centras: 6 kortų puslapis (grid 6×1) + ‹ 1/7 › puslapiavimas.
// • Kortos detalės: RavenofCardDetailModal (craft/disenchant logika išsaugota).
// Duomenų sluoksnis (Supabase užklausos, filtrai, vertimai) — nekeičiamas.
// ══════════════════════════════════════════════════════════════════════════════
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { LoadingOrRetry } from './ui/LoadingOrRetry'
import { playUiClick } from '@/lib/ui-sound'
import { useT, useContent, useGameContent } from '@/lib/i18n/react'
import { getActivePacks, getPackInventory, markCollectionSeen, type Pack } from '@/lib/economy'
import { requestOpenStore, emitWalletChanged } from '@/lib/digital/native'
import { GameCard } from '@/components/ui/GameCard'
import { PackOpen } from './PackOpen'
import { SmartImg } from '@/components/ui/SmartImg'
import { cardImage, cardText, ensureCardTranslations } from '@/lib/cards/i18n'
import { RavenofCardDetailModal, type RavenofCardDetail } from './RavenofCardDetailModal'
import { RavenofTextField, ravenofFactionColor, ravenofFactionIcon, ravenofRarityColor, ravenofRarityGem, ravenofCardTypeIcon } from './ui/RavenofKit'
import { useDesktopUi } from './ui/useDesktopUi'
import { DT, deskGrid } from './ui/deskTokens'
import { DeskDialog } from './ui/DeskKit'

type Col = RavenofCardDetail

type SortKey = 'cost-asc' | 'cost-desc' | 'name' | 'rarity' | 'owned'
const SORT_ORDER: SortKey[] = ['cost-asc', 'cost-desc', 'name', 'rarity', 'owned']
const SORT_LABEL: Record<SortKey, string> = {
  'cost-asc': 'collection.sortShort.costAsc',
  'cost-desc': 'collection.sortShort.costDesc',
  'name': 'collection.sortShort.name',
  'rarity': 'collection.sortShort.rarity',
  'owned': 'collection.sortShort.owned',
}

const PAGE_SIZE = 24 // audit #17: žymiai daugiau kortų puslapyje (buvo 6 → ~88 psl.)

export function DigitalCollection() {
  const t = useT()
  const gc = useGameContent()
  const tc = useContent()
  // Desktop (≥1024): puslapio antraštė + kairė filtrų kolona + adaptyvus grid. Mobile — nekeičiamas.
  const { desktop } = useDesktopUi()
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
  // Numatytai rodomos TIK turimos kortos (vartotojo pageidavimas); išjungus – filtras skaičiuojamas kaip aktyvus
  const [ownedOnly, setOwnedOnly] = useState(true)
  /** Kortos, kurių žaidėjas dar nematė kolekcijoje (user_collections.is_new). */
  const [newIds, setNewIds] = useState<Set<string>>(new Set())
  const [newOnly, setNewOnly] = useState(false)
  const [selId, setSelId] = useState<string | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [page, setPage] = useState(0)

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
      supabase.from('user_collections').select('card_id, quantity, is_new').eq('user_id', user.id),
    ])
    type R = { id: string; name: string; image_url: string | null; gold_cost: number; attack: number | null; health: number | null; description: string | null; effect_text: string | null; is_champion: boolean; faction: { name: string; slug: string } | null; card_type: { name: string } | null; rarity: { name: string; copy_limit: number; sort_order: number } | null }
    const colList = (colRows as { card_id: string; quantity: number; is_new?: boolean }[]) ?? []
    const owned: Record<string, number> = Object.fromEntries(colList.map((r) => [r.card_id, r.quantity]))
    setNewIds(new Set(colList.filter((r) => r.is_new).map((r) => r.card_id)))
    await ensureCardTranslations()   // kortų EN vertimai + EN vaizdai
    const list: Col[] = ((cardRows as unknown as R[]) ?? []).map((r) => ({
      id: r.id, name: cardText(r.id, 'name', r.name), image: cardImage(r.id, r.image_url),
      faction: r.faction?.name ?? null, factionSlug: r.faction?.slug ?? null,
      type: r.card_type?.name ?? null, rarity: r.rarity?.name ?? null,
      copyLimit: r.rarity?.copy_limit ?? 2, raritySort: r.rarity?.sort_order ?? 0,
      gold: r.gold_cost, atk: r.attack, hp: r.health,
      effect: cardText(r.id, 'effect_text', r.effect_text) || cardText(r.id, 'description', r.description), isChampion: r.is_champion,
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
      if (newOnly && !newIds.has(c.id)) return false
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
  }, [cards, q, faction, rarity, type, ownedOnly, newOnly, newIds, sort])

  // Puslapiavimas (prototipas: 6 kortos puslapyje)
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const curPage = Math.min(page, pages - 1)
  const pageCards = filtered.slice(curPage * PAGE_SIZE, curPage * PAGE_SIZE + PAGE_SIZE)
  useEffect(() => { setPage(0) }, [q, faction, rarity, type, ownedOnly, newOnly, sort])

  const selected = useMemo(() => filtered.find((c) => c.id === selId) ?? null, [filtered, selId])
  const selIdx = selected ? filtered.findIndex((c) => c.id === selected.id) : -1

  const ownedCount = (cards ?? []).filter((c) => c.owned > 0).length
  const activeFilters = (faction !== 'all' ? 1 : 0) + (rarity !== 'all' ? 1 : 0) + (type !== 'all' ? 1 : 0) + (ownedOnly ? 0 : 1) + (newOnly ? 1 : 0) + (q.trim() ? 1 : 0)
  const resetFilters = () => { setFaction('all'); setRarity('all'); setType('all'); setSort('cost-asc'); setOwnedOnly(true); setNewOnly(false); setQ('') }

  // ── „Naujos" žymos ────────────────────────────────────────────────────────
  //  Žymą nuimam, kai kortą atsidarai (pamatei), arba mygtuku – visoms iškart.
  const clearNew = useCallback((ids?: string[]) => {
    setNewIds((prev) => {
      if (!ids) return new Set<string>()
      const next = new Set(prev); ids.forEach((id) => next.delete(id)); return next
    })
    void markCollectionSeen(ids)
  }, [])
  const openCard = (id: string) => { setSelId(id); setDetailOpen(true); if (newIds.has(id)) clearNew([id]) }
  // filtras išsijungia pats, kai naujų nebelieka
  useEffect(() => { if (newOnly && newIds.size === 0) setNewOnly(false) }, [newOnly, newIds])

  useEffect(() => {
    if (cards !== null) { setLoadSlow(false); return }
    const t = setTimeout(() => setLoadSlow(true), 10_000)
    return () => clearTimeout(t)
  }, [cards])

  if (loggedOut) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-3 text-center px-6">
        <span style={{ fontSize: desktop ? 56 : 40 }}>🎴</span>
        <div className="ravenof-disp font-black uppercase" style={{ fontSize: desktop ? DT.fs.h1 : 22, color: 'var(--ravenof-gold)' }}>{t('collection.title')}</div>
        <p className="text-sm" style={{ color: 'var(--ravenof-text-muted)', ...(desktop ? { fontSize: DT.fs.body } : null) }}>{t('collection.loginPrompt')} <Link href="/digital/login?next=/digital/collection" className="underline" style={{ color: 'var(--ravenof-gold)' }}>{t('collection.signIn')}</Link></p>
      </div>
    )
  }

  if (cards === null && desktop && !loadSlow) return <DeskCollectionSkeleton title={t('collection.title')} label={t('common.loading')} />
  if (cards === null) return <LoadingOrRetry timedOut={loadSlow} onRetry={() => { setLoadSlow(false); void load() }} />

  const cycleSort = () => { playUiClick(); setSort((s) => SORT_ORDER[(SORT_ORDER.indexOf(s) + 1) % SORT_ORDER.length]) }

  // Modalai / overlay'ai – bendri mobile ir desktop išdėstymams
  const overlays = (
    <>
      {/* ── Kortos detalių modalas (patvirtintas) ── */}
      {detailOpen && selected && (
        <RavenofCardDetailModal
          c={selected}
          onClose={() => setDetailOpen(false)}
          onPrev={filtered.length > 1 ? () => setSelId(filtered[(selIdx - 1 + filtered.length) % filtered.length].id) : undefined}
          onNext={filtered.length > 1 ? () => setSelId(filtered[(selIdx + 1) % filtered.length].id) : undefined}
          onChanged={load}
        />
      )}

      {/* ── Pakų pasirinkimo modalas ── */}
      {chooser && !desktop && (
        <div className="fixed inset-0 z-[160] flex items-center justify-center p-4" style={{ background: 'rgba(4,3,8,0.9)' }} onClick={() => setChooser(false)}>
          <div className="w-[min(360px,92vw)] ravenof-panel p-5" onClick={(e) => e.stopPropagation()}>
            <p className="text-center" style={{ font: '700 14px var(--ravenof-font-display)', color: 'var(--ravenof-gold-bright)', letterSpacing: '0.06em', marginBottom: 12 }}>{t('collection.whichPack')}</p>
            <div className="space-y-2">
              {ownedPacks.map((pk) => (
                <button key={pk.id} onClick={() => { playUiClick(); setChooser(false); setOpeningPack(pk) }} className="ravenof-press w-full text-left px-3 py-2.5" style={{ background: 'rgba(212,163,59,0.1)', border: '1px solid var(--ravenof-border-accent)', cursor: 'pointer' }}>
                  <span style={{ font: '700 13px var(--ravenof-font-display)', color: 'var(--ravenof-gold-bright)' }}>{pk.name}</span>
                  <span className="ml-2" style={{ font: '400 12px var(--ravenof-font-body)', color: 'var(--ravenof-text-secondary)' }}>×{inv[pk.id]}</span>
                </button>
              ))}
            </div>
            <button onClick={() => { playUiClick(); setChooser(false) }} className="mt-3 w-full ravenof-btn ravenof-btn-secondary" style={{ minHeight: 34, fontSize: 10 }}>{t('common.cancel')}</button>
          </div>
        </div>
      )}

      {chooser && desktop && (
        <DeskDialog onClose={() => setChooser(false)} title={t('collection.whichPack')} width={DT.modal.sm} zIndex={160} closeLabel={t('common.close')}
          footer={<button onClick={() => { playUiClick(); setChooser(false) }} className="rvn-d-btn rvn-d-btn-ghost">{t('common.cancel')}</button>}>
          <div className="flex flex-col" style={{ gap: DT.sp.sm }}>
            {ownedPacks.map((pk) => (
              <button key={pk.id} onClick={() => { playUiClick(); setChooser(false); setOpeningPack(pk) }} className="ravenof-press w-full text-left flex items-center"
                style={{ minHeight: DT.ctl + 6, padding: '8px 16px', gap: 12, background: 'rgba(212,163,59,0.1)', border: '1px solid var(--ravenof-border-accent)', cursor: 'pointer' }}>
                <span className="flex-1 min-w-0" style={{ font: `700 ${DT.fs.h3}px var(--ravenof-font-display)`, color: 'var(--ravenof-gold-bright)' }}>{pk.name}</span>
                <span style={{ font: `600 ${DT.fs.body}px var(--ravenof-font-body)`, color: 'var(--ravenof-text-secondary)' }}>×{inv[pk.id]}</span>
              </button>
            ))}
          </div>
        </DeskDialog>
      )}
      {openingPack && (
        <PackOpen packId={openingPack.id} packName={openingPack.name} packImage={openingPack.image_url}
          onClose={() => { setOpeningPack(null); refreshInv(); emitWalletChanged() }}
          onOpened={() => { refreshInv(); emitWalletChanged(); load() }} />
      )}
    </>
  )

  // ══ DESKTOP išdėstymas ══════════════════════════════════════════════════════
  //  Antraštė (pavadinimas + turimų skaičius · paieška ≥320 · rikiavimas · pakai)
  //  Kairė kolona 256px: filtrų grupės su matomomis etiketėmis (frakcija / retumas / tipas / kita)
  //  Dešinė: adaptyvus kortų grid (DT.card.collection 168–196px) + tas pats puslapiavimas.
  if (desktop) {
    const chip = (active: boolean, accent = 'var(--ravenof-gold)') => ({
      display: 'inline-flex', alignItems: 'center', gap: 8, minHeight: DT.ctlSm, padding: '0 12px', maxWidth: '100%',
      font: `600 13px/1.2 var(--ravenof-font-body)`, textAlign: 'left' as const, cursor: 'pointer',
      color: active ? 'var(--ravenof-text-primary)' : 'var(--ravenof-text-secondary)',
      background: active ? 'rgba(212,163,59,0.12)' : 'var(--ravenof-bg-surface-2)',
      border: `1px solid ${active ? accent : 'var(--ravenof-border-hairline)'}`,
    })
    const pagerBtn = (enabled: boolean) => ({
      width: DT.ctl, height: DT.ctl, fontSize: 22, border: '1px solid var(--ravenof-border-strong)', background: 'none',
      cursor: enabled ? 'pointer' : 'default', color: enabled ? 'var(--ravenof-text-primary)' : '#4a4552',
    })
    const emptyOwned = ownedOnly && activeFilters === 0
    return (
      <div className="ravenof-body h-full flex flex-col min-h-0 ravenof-in" data-desk="1">
        {/* ── Puslapio antraštė ── */}
        <div className="shrink-0 flex items-center flex-wrap" data-testid="collection-toolbar" style={{ gap: DT.sp.lg, paddingBottom: DT.sp.xl }}>
          <div style={{ flex: '1 1 240px', minWidth: 0 }}>
            <h1 className="rvn-d-h1" style={{ textTransform: 'uppercase' }}>{t('collection.title')}</h1>
            <div className="rvn-d-help" style={{ marginTop: 4 }} data-testid="collection-count">
              {t('collection.ownedOf', { owned: ownedCount, total: cards.length })}{activeFilters > 0 ? ` · ${t('collection.showingN', { count: filtered.length })}` : ''}
            </div>
          </div>
          {totalPacks > 0 && (
            <button onClick={openPacks} data-testid="packs-btn" className="rvn-d-btn rvn-d-btn-primary">{t('collection.packsN', { count: totalPacks })}</button>
          )}
          <RavenofTextField type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('collection.searchPlaceholder')} aria-label={t('collection.searchAria')}
            style={{ width: 320, maxWidth: '100%' }} />
          <label className="flex items-center" style={{ gap: DT.sp.sm }}>
            <span className="rvn-d-label">{t('collection.sortAria')}</span>
            <select className="ravenof-field" value={sort} data-testid="sort-select" aria-label={t('collection.sortAria')}
              onChange={(e) => { playUiClick(); setSort(e.target.value as SortKey) }} style={{ minWidth: 190, cursor: 'pointer' }}>
              {SORT_ORDER.map((k) => <option key={k} value={k}>{t(SORT_LABEL[k].replace('sortShort', 'sort'))}</option>)}
            </select>
          </label>
        </div>

        <div className="flex-1 min-h-0 flex" style={{ gap: DT.sp.xl }}>
          {/* ── Kairė filtrų kolona ── */}
          <aside className="shrink-0 overflow-y-auto ravenof-scroll flex flex-col" data-testid="collection-filters"
            style={{ width: DT.side.filter - 4, gap: DT.sp.xl, paddingRight: DT.sp.sm, paddingBottom: DT.sp.lg }}>
            <DeskFilterGroup label={t('collection.faction')}>
              <button onClick={() => { playUiClick(); setFaction('all') }} aria-pressed={faction === 'all'} className="ravenof-press" style={chip(faction === 'all')}>{t('collection.allFactions')}</button>
              {factions.map((f) => {
                const active = faction === f.slug
                const name = tc('faction', f.slug, 'name', f.name)
                return (
                  <button key={f.slug} onClick={() => { playUiClick(); setFaction(active ? 'all' : f.slug) }} title={name} aria-pressed={active} className="ravenof-press" style={chip(active, ravenofFactionColor(f.slug))}>
                    <span aria-hidden style={{ flex: 'none', width: 20, height: 20, background: `url('${ravenofFactionIcon(f.slug)}') center / contain no-repeat`, filter: active || faction === 'all' ? 'none' : 'grayscale(.85) brightness(.75)' }} />
                    <span style={{ minWidth: 0 }}>{name}</span>
                  </button>
                )
              })}
            </DeskFilterGroup>
            <DeskFilterGroup label={t('collection.rarity')}>
              <button onClick={() => { playUiClick(); setRarity('all') }} aria-pressed={rarity === 'all'} className="ravenof-press" style={chip(rarity === 'all')}>{t('collection.allRarities')}</button>
              {rarities.map((r) => {
                const active = rarity === r.name
                return (
                  <button key={r.name} onClick={() => { playUiClick(); setRarity(active ? 'all' : r.name) }} title={gc.rarity(r.name)} aria-pressed={active} className="ravenof-press" style={chip(active, ravenofRarityColor(r.name))}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={ravenofRarityGem(r.name)} alt="" style={{ flex: 'none', width: 16, height: 20, objectFit: 'contain' }} />
                    <span style={{ minWidth: 0, color: active ? ravenofRarityColor(r.name) : undefined }}>{gc.rarity(r.name)}</span>
                  </button>
                )
              })}
            </DeskFilterGroup>
            <DeskFilterGroup label={t('collection.type')}>
              <button onClick={() => { playUiClick(); setType('all') }} aria-pressed={type === 'all'} className="ravenof-press" style={chip(type === 'all')}>{t('collection.allTypes')}</button>
              {types.map((ty) => {
                const active = type === ty
                const icon = ravenofCardTypeIcon(ty)
                return (
                  <button key={ty} onClick={() => { playUiClick(); setType(active ? 'all' : ty) }} title={gc.cardType(ty)} aria-pressed={active} className="ravenof-press" style={chip(active)}>
                    {icon && <span aria-hidden style={{ flex: 'none', width: 18, height: 18, background: active ? 'var(--ravenof-gold-bright)' : 'var(--ravenof-text-secondary)', WebkitMask: `url('${icon}') center / contain no-repeat`, mask: `url('${icon}') center / contain no-repeat`, display: 'inline-block' }} />}
                    <span style={{ minWidth: 0 }}>{gc.cardType(ty)}</span>
                  </button>
                )
              })}
            </DeskFilterGroup>
            <DeskFilterGroup label={t('collection.owned')}>
              <button onClick={() => { playUiClick(); setOwnedOnly((v) => !v) }} data-testid="owned-toggle" aria-pressed={ownedOnly} className="ravenof-press" style={chip(ownedOnly)}>
                <span aria-hidden style={{ width: 14, height: 14, flex: 'none', border: `1px solid ${ownedOnly ? 'var(--ravenof-gold)' : 'var(--ravenof-border-strong)'}`, background: ownedOnly ? 'var(--ravenof-gold)' : 'transparent' }} />
                {t('collection.ownedOnlyShort')}
              </button>
              {newIds.size > 0 && (
                <button onClick={() => { playUiClick(); setNewOnly((v) => !v) }} data-testid="new-toggle" aria-pressed={newOnly} className="ravenof-press" style={{ ...chip(newOnly), color: newOnly ? 'var(--ravenof-on-gold)' : 'var(--ravenof-gold-bright)', background: newOnly ? 'var(--ravenof-grad-gold)' : 'var(--ravenof-bg-surface-2)', borderColor: 'var(--ravenof-gold)', fontWeight: 700 }}>
                  {t('collection.newOnlyShort', { count: newIds.size })}
                </button>
              )}
              {newIds.size > 0 && newOnly && (
                <button onClick={() => { playUiClick(); clearNew() }} className="ravenof-press" style={chip(false)}>✓ {t('collection.markAllSeen')}</button>
              )}
            </DeskFilterGroup>
            {activeFilters > 0 && (
              <button onClick={() => { playUiClick(); resetFilters() }} className="rvn-d-btn rvn-d-btn-ghost" style={{ width: '100%', color: 'var(--ravenof-danger-bright)', borderColor: '#8D2D3888' }}>
                ✕ {t('collection.clearFilters', { count: activeFilters })}
              </button>
            )}
          </aside>

          {/* ── Katalogas ── */}
          <section className="flex-1 min-w-0 min-h-0 flex flex-col">
            {filtered.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center" style={{ gap: DT.sp.lg, border: '1px dashed var(--ravenof-border-hairline)', background: 'rgba(15,13,21,.35)', padding: DT.sp.xxl }}>
                <div className="relative" style={{ width: 96, height: 130 }}>
                  <div className="absolute inset-0" style={{ border: '1px dashed #3d3345', borderRadius: 7, transform: 'rotate(-9deg)' }} />
                  <div className="absolute inset-0" style={{ border: '1px dashed #4a4552', borderRadius: 7, transform: 'rotate(8deg)' }} />
                  <div className="absolute inset-0" style={{ border: '1px solid var(--ravenof-border-strong)', borderRadius: 7, background: 'var(--ravenof-bg-surface)' }} />
                </div>
                <div>
                  <div className="rvn-d-h2">{emptyOwned ? t('collection.emptyTitle') : t('collection.nothingFound')}</div>
                  <div className="rvn-d-help" style={{ marginTop: 6 }}>{emptyOwned ? t('collection.emptySub') : t('collection.nothingFoundSub')}</div>
                </div>
                {emptyOwned ? (
                  <button onClick={openPacks} className="rvn-d-btn rvn-d-btn-primary">{t('collection.openPackCta')}</button>
                ) : (
                  <button onClick={() => { playUiClick(); resetFilters() }} className="rvn-d-btn rvn-d-btn-primary">{t('collection.clearFilters', { count: activeFilters })}</button>
                )}
              </div>
            ) : (
              <>
                <div className="flex-1 min-h-0 overflow-y-auto ravenof-scroll" data-testid="card-browser"
                  style={{ ...deskGrid(DT.card.collection, DT.sp.lg), paddingTop: 6, paddingBottom: DT.sp.lg, paddingRight: DT.sp.xs }}>
                  {pageCards.map((c) => (
                    <RavenofCardCell key={c.id} desk c={c} onClick={() => { playUiClick(); openCard(c.id) }} notOwnedLabel={t('collection.notOwnedBadge')} isNew={newIds.has(c.id)} newLabel={t('collection.newBadge')} />
                  ))}
                </div>
                <div className="shrink-0 flex items-center justify-center" style={{ gap: DT.sp.lg, paddingTop: DT.sp.md, borderTop: '1px solid var(--ravenof-border-hairline)' }}>
                  <button onClick={() => { if (curPage > 0) { playUiClick(); setPage(curPage - 1) } }} aria-label={t('collection.prevPage')} title={t('collection.prevPage')} disabled={curPage === 0} className="ravenof-press flex items-center justify-center" style={pagerBtn(curPage > 0)}>‹</button>
                  <span style={{ font: `600 ${DT.fs.body}px var(--ravenof-font-body)`, color: 'var(--ravenof-text-secondary)', minWidth: 64, textAlign: 'center' }}>{curPage + 1} / {pages}</span>
                  <button onClick={() => { if (curPage < pages - 1) { playUiClick(); setPage(curPage + 1) } }} aria-label={t('collection.nextPage')} title={t('collection.nextPage')} disabled={curPage >= pages - 1} className="ravenof-press flex items-center justify-center" style={pagerBtn(curPage < pages - 1)}>›</button>
                </div>
              </>
            )}
          </section>
        </div>

        {overlays}
      </div>
    )
  }

  return (
    <div className="ravenof-body h-full flex flex-col min-h-0 ravenof-in">
      {/* ── Viršutinė juosta: pavadinimas · paieška · tik turimos · rikiavimas ── */}
      <div className="shrink-0 flex items-center" data-testid="collection-toolbar" style={{ gap: 8, paddingBottom: 8 }}>
        <div style={{ font: '700 15px var(--ravenof-font-display)', letterSpacing: 1, textTransform: 'uppercase', color: 'var(--ravenof-text-primary)' }}>{t('collection.title')}</div>
        <div style={{ font: '400 11px var(--ravenof-font-body)', color: 'var(--ravenof-text-secondary)' }}>
          {t('collection.ownedOf', { owned: ownedCount, total: cards.length })}{activeFilters > 0 ? ` · ${t('collection.showingN', { count: filtered.length })}` : ''}
        </div>
        <div className="flex-1" />
        {totalPacks > 0 && (
          <button onClick={openPacks} data-testid="packs-btn" className="ravenof-press shrink-0" style={{ font: '700 10.5px var(--ravenof-font-display)', letterSpacing: 1, color: 'var(--ravenof-on-gold)', background: 'var(--ravenof-grad-gold)', border: 0, padding: '7px 12px', cursor: 'pointer', clipPath: 'polygon(6px 0,100% 0,calc(100% - 6px) 100%,0 100%)', textTransform: 'uppercase' }}>
            {t('collection.packsN', { count: totalPacks })}
          </button>
        )}
        <RavenofTextField value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('collection.searchPlaceholder')} aria-label={t('collection.searchAria')}
          style={{ width: 150, padding: '7px 10px', fontSize: 12 }} />
        <button onClick={() => { playUiClick(); setOwnedOnly((v) => !v) }} data-testid="owned-toggle" className="ravenof-press shrink-0"
          style={{ font: '600 10.5px var(--ravenof-font-body)', color: ownedOnly ? 'var(--ravenof-gold-bright)' : 'var(--ravenof-text-secondary)', background: 'none', border: `1px solid ${ownedOnly ? 'var(--ravenof-gold)' : 'var(--ravenof-border-strong)'}`, padding: '7px 10px', cursor: 'pointer' }}>
          {t('collection.ownedOnlyShort')}
        </button>
        {newIds.size > 0 && (
          <button onClick={() => { playUiClick(); setNewOnly((v) => !v) }} data-testid="new-toggle" className="ravenof-press shrink-0"
            style={{ font: '700 10.5px var(--ravenof-font-body)', color: newOnly ? 'var(--ravenof-on-gold)' : 'var(--ravenof-gold-bright)', background: newOnly ? 'var(--ravenof-grad-gold)' : 'none', border: `1px solid var(--ravenof-gold)`, padding: '7px 10px', cursor: 'pointer' }}>
            {t('collection.newOnlyShort', { count: newIds.size })}
          </button>
        )}
        {newIds.size > 0 && newOnly && (
          <button onClick={() => { playUiClick(); clearNew() }} title={t('collection.markAllSeen')} aria-label={t('collection.markAllSeen')} className="ravenof-press shrink-0"
            style={{ font: '600 11px var(--ravenof-font-body)', color: 'var(--ravenof-text-secondary)', background: 'none', border: '1px solid var(--ravenof-border-strong)', padding: '7px 10px', cursor: 'pointer' }}>✓</button>
        )}
        <button onClick={cycleSort} aria-label={t('collection.sortAria')} data-testid="sort-cycle" className="ravenof-press shrink-0"
          style={{ font: '600 10.5px var(--ravenof-font-body)', color: 'var(--ravenof-text-secondary)', background: 'none', border: '1px solid var(--ravenof-border-strong)', padding: '7px 10px', cursor: 'pointer' }}>
          ⇅ {t(SORT_LABEL[sort])}
        </button>
        {activeFilters > 0 && (
          <button onClick={() => { playUiClick(); resetFilters() }} aria-label={t('collection.clearFilters', { count: activeFilters })} className="ravenof-press shrink-0"
            style={{ font: '600 11px var(--ravenof-font-body)', color: 'var(--ravenof-danger)', background: 'none', border: '1px solid #8D2D3855', padding: '7px 10px', cursor: 'pointer' }}>✕</button>
        )}
      </div>

      {/* ── Filtrų juosta: frakcijos · retumai · tipai ── */}
      <div className="shrink-0 flex items-center overflow-x-auto ravenof-scroll" style={{ gap: 6, paddingBottom: 8, scrollbarWidth: 'none' }}>
        {factions.map((f) => {
          const active = faction === f.slug
          return (
            <button key={f.slug} onClick={() => { playUiClick(); setFaction(active ? 'all' : f.slug) }} title={tc('faction', f.slug, 'name', f.name)} aria-label={tc('faction', f.slug, 'name', f.name)} aria-pressed={active}
              className="ravenof-press flex items-center justify-center shrink-0"
              style={{ width: 27, height: 27, border: `1px solid ${active ? ravenofFactionColor(f.slug) : 'var(--ravenof-border-hairline)'}`, background: 'var(--ravenof-bg-surface-2)', cursor: 'pointer' }}>
              <span aria-hidden style={{ display: 'inline-block', width: 17, height: 17, background: `url('${ravenofFactionIcon(f.slug)}') center / contain no-repeat`, filter: active ? 'none' : 'grayscale(.85) brightness(.75)' }} />
            </button>
          )
        })}
        <span className="shrink-0" style={{ width: 1, height: 18, background: 'var(--ravenof-border-hairline)' }} />
        {rarities.map((r) => {
          const active = rarity === r.name
          return (
            <button key={r.name} onClick={() => { playUiClick(); setRarity(active ? 'all' : r.name) }} title={gc.rarity(r.name)} aria-label={gc.rarity(r.name)} aria-pressed={active}
              className="ravenof-press flex items-center justify-center shrink-0"
              style={{ width: 26, height: 26, border: `1px solid ${active ? ravenofRarityColor(r.name) : 'var(--ravenof-border-hairline)'}`, background: 'var(--ravenof-bg-surface-2)', cursor: 'pointer', opacity: active || rarity === 'all' ? 1 : 0.45 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={ravenofRarityGem(r.name)} alt="" style={{ width: 16, height: 19, objectFit: 'contain' }} />
            </button>
          )
        })}
        <span className="shrink-0" style={{ width: 1, height: 18, background: 'var(--ravenof-border-hairline)' }} />
        {types.map((ty) => {
          const active = type === ty
          const icon = ravenofCardTypeIcon(ty)
          return (
            <button key={ty} onClick={() => { playUiClick(); setType(active ? 'all' : ty) }} title={gc.cardType(ty)} aria-label={gc.cardType(ty)} aria-pressed={active}
              className="ravenof-press flex items-center justify-center shrink-0"
              style={{ width: 27, height: 27, border: `1px solid ${active ? 'var(--ravenof-gold)' : 'var(--ravenof-border-hairline)'}`, background: 'var(--ravenof-bg-surface-2)', cursor: 'pointer' }}>
              {icon
                ? <span aria-hidden style={{ width: 16, height: 16, background: active ? 'var(--ravenof-gold-bright)' : 'var(--ravenof-text-secondary)', WebkitMask: `url('${icon}') center / contain no-repeat`, mask: `url('${icon}') center / contain no-repeat`, display: 'inline-block' }} />
                : <span style={{ font: '600 9px var(--ravenof-font-body)', color: active ? 'var(--ravenof-gold-bright)' : 'var(--ravenof-text-secondary)' }}>{gc.cardType(ty).slice(0, 2)}</span>}
            </button>
          )
        })}
      </div>

      {/* ── Kortų puslapis / tuščia būsena ── */}
      {filtered.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center" style={{ gap: 12 }}>
          <div className="relative" style={{ width: 56, height: 72 }}>
            <div className="absolute inset-0" style={{ border: '1px dashed #3d3345', borderRadius: 5, transform: 'rotate(-9deg)' }} />
            <div className="absolute inset-0" style={{ border: '1px dashed #4a4552', borderRadius: 5, transform: 'rotate(8deg)' }} />
            <div className="absolute inset-0" style={{ border: '1px solid var(--ravenof-border-strong)', borderRadius: 5, background: 'var(--ravenof-bg-surface)' }} />
          </div>
          <div className="text-center">
            <div style={{ font: '700 14px var(--ravenof-font-display)', color: 'var(--ravenof-text-primary)' }}>{ownedOnly && activeFilters === 0 ? t('collection.emptyTitle') : t('collection.nothingFound')}</div>
            <div style={{ font: '400 11px var(--ravenof-font-body)', color: 'var(--ravenof-text-secondary)', marginTop: 3 }}>{ownedOnly && activeFilters === 0 ? t('collection.emptySub') : t('collection.nothingFoundSub')}</div>
          </div>
          {ownedOnly && activeFilters === 0 ? (
            <button onClick={openPacks} className="ravenof-btn ravenof-btn-primary" style={{ fontSize: 11, letterSpacing: 1.5, padding: '9px 20px', minHeight: 0 }}>{t('collection.openPackCta')}</button>
          ) : (
            <button onClick={() => { playUiClick(); resetFilters() }} className="ravenof-btn ravenof-btn-primary" style={{ fontSize: 11, letterSpacing: 1.5, padding: '9px 20px', minHeight: 0 }}>{t('collection.clearFilters', { count: activeFilters })}</button>
          )}
        </div>
      ) : (
        <>
          {/* Responsyvus kelių eilučių tinklelis su slinktimi — ekranas nebešvaisto vietos */}
          <div className="flex-1 grid min-h-0 overflow-y-auto ravenof-scroll" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(118px, 1fr))', gap: 8, alignContent: 'start' }} data-testid="card-browser">
            {pageCards.map((c) => (
              <RavenofCardCell key={c.id} c={c} onClick={() => { playUiClick(); openCard(c.id) }} notOwnedLabel={t('collection.notOwnedBadge')} isNew={newIds.has(c.id)} newLabel={t('collection.newBadge')} />
            ))}
          </div>
          <div className="shrink-0 flex items-center justify-center" style={{ gap: 14, paddingTop: 8 }}>
            <button onClick={() => { if (curPage > 0) { playUiClick(); setPage(curPage - 1) } }} aria-label={t('collection.prevPage')} disabled={curPage === 0} className="ravenof-press flex items-center justify-center"
              style={{ width: 44, height: 34, border: '1px solid var(--ravenof-border-strong)', background: 'none', cursor: curPage > 0 ? 'pointer' : 'default', color: curPage > 0 ? 'var(--ravenof-text-primary)' : '#4a4552' }}>‹</button>
            <span style={{ font: '600 11px var(--ravenof-font-body)', color: 'var(--ravenof-text-secondary)' }}>{curPage + 1}/{pages}</span>
            <button onClick={() => { if (curPage < pages - 1) { playUiClick(); setPage(curPage + 1) } }} aria-label={t('collection.nextPage')} disabled={curPage >= pages - 1} className="ravenof-press flex items-center justify-center"
              style={{ width: 44, height: 34, border: '1px solid var(--ravenof-border-strong)', background: 'none', cursor: curPage < pages - 1 ? 'pointer' : 'default', color: curPage < pages - 1 ? 'var(--ravenof-text-primary)' : '#4a4552' }}>›</button>
          </div>
        </>
      )}

      {overlays}
    </div>
  )
}

// ── Kortos langelis (prototipo grid; GameCard = game-feel wrapper išsaugotas) ──
function RavenofCardCell({ c, onClick, notOwnedLabel, isNew, newLabel, desk = false }: { c: Col; onClick: () => void; notOwnedLabel: string; isNew?: boolean; newLabel?: string; desk?: boolean }) {
  const [bad, setBad] = useState(false)
  const owned = c.owned > 0
  return (
    <GameCard glowColor={owned ? ravenofRarityColor(c.rarity) + '88' : 'rgba(120,120,140,0.3)'} sounds={owned}>
      <button onClick={onClick} className="ravenof-press w-full block" style={{ background: 'none', border: 0, padding: 0, cursor: 'pointer', minWidth: 0 }} {...(desk ? { title: c.name } : null)}>
        <span role="img" aria-label={c.name} className="relative block w-full" style={{ aspectRatio: '1044 / 1416', borderRadius: 5, border: `1px solid ${owned ? 'var(--ravenof-border-strong)' : '#221e29'}`, overflow: 'hidden' }}>
          {c.image && !bad
            ? <SmartImg src={c.image} width={desk ? 400 : 240} alt={c.name} onFail={() => setBad(true)}
                className="absolute inset-0 w-full h-full"
                style={{ objectFit: 'contain', filter: owned ? undefined : 'grayscale(1) brightness(0.55)' }} />
            : <span className="absolute inset-0 flex flex-col items-center justify-center gap-1 px-1 text-center" style={{ background: 'linear-gradient(160deg,#1a1325,#0a0810)', filter: owned ? undefined : 'grayscale(1) brightness(0.7)' }}>
                <span className="text-xl">🎴</span><span style={{ fontSize: desk ? 13 : 9, lineHeight: 1.1, color: '#fff' }}>{c.name}</span>
              </span>}
          {isNew && (
            <span className="absolute" style={{ top: desk ? 8 : 4, left: desk ? 8 : 4, zIndex: 2, font: desk ? '800 12px var(--ravenof-font-display)' : '800 8px var(--ravenof-font-display)', letterSpacing: 0.8, textTransform: 'uppercase', color: '#1a1206', background: 'linear-gradient(135deg,#ffe9a8,#f0b429)', padding: desk ? '3px 8px' : '2px 5px', borderRadius: 3, boxShadow: '0 2px 8px rgba(240,180,41,.55)' }}>{newLabel}</span>
          )}
          {owned ? (
            <span className="absolute" style={{ bottom: desk ? 8 : 4, right: desk ? 8 : 4, font: desk ? '700 13px var(--ravenof-font-body)' : '700 10px var(--ravenof-font-body)', color: 'var(--ravenof-text-primary)', background: 'rgba(7,6,10,.85)', border: '1px solid var(--ravenof-border-strong)', padding: desk ? '3px 8px' : '2px 6px' }}>×{c.owned}</span>
          ) : (
            <span className="absolute whitespace-nowrap" style={{ bottom: desk ? 8 : 4, left: '50%', transform: 'translateX(-50%)', font: desk ? '600 12px var(--ravenof-font-body)' : '600 9px var(--ravenof-font-body)', color: 'var(--ravenof-text-secondary)', background: 'rgba(7,6,10,.85)', border: '1px solid var(--ravenof-border-strong)', padding: desk ? '3px 10px' : '2px 7px' }}>{notOwnedLabel}</span>
          )}
        </span>
      </button>
    </GameCard>
  )
}


// ── Desktop filtrų grupė (matoma etiketė + čipai su ikonomis ir pavadinimais) ──
function DeskFilterGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div role="group" aria-label={label}>
      <div className="rvn-d-label" style={{ marginBottom: DT.sp.sm }}>{label}</div>
      <div className="flex flex-wrap" style={{ gap: DT.sp.sm }}>{children}</div>
    </div>
  )
}

// ── Desktop krovimo būsena: antraštė + filtrų kolonos ir grid'o skeletas ──
function DeskCollectionSkeleton({ title, label }: { title: string; label: string }) {
  return (
    <div className="ravenof-body h-full flex flex-col min-h-0" role="status" aria-label={label}>
      <div className="shrink-0" style={{ paddingBottom: DT.sp.xl }}>
        <h1 className="rvn-d-h1" style={{ textTransform: 'uppercase' }}>{title}</h1>
        <div className="rvn-d-help" style={{ marginTop: 4 }}>{label}</div>
      </div>
      <div className="flex-1 min-h-0 flex" style={{ gap: DT.sp.xl }}>
        <div className="shrink-0 flex flex-col animate-pulse" style={{ width: DT.side.filter - 4, gap: DT.sp.md }}>
          {Array.from({ length: 7 }, (_, i) => <div key={i} style={{ height: DT.ctlSm, background: 'var(--ravenof-bg-surface-2)', border: '1px solid var(--ravenof-border-hairline)', width: i % 3 === 0 ? '45%' : '100%' }} />)}
        </div>
        <div className="flex-1 min-w-0 overflow-hidden animate-pulse" style={deskGrid(DT.card.collection, DT.sp.lg)}>
          {Array.from({ length: 12 }, (_, i) => <div key={i} style={{ aspectRatio: '1044 / 1416', borderRadius: 5, background: 'linear-gradient(160deg,#1a1325,#0a0810)', border: '1px solid var(--ravenof-border-hairline)' }} />)}
        </div>
      </div>
    </div>
  )
}
