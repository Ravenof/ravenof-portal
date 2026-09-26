'use client'

// ══════════════════════════════════════════════════════════════════════════════
// Ravenof Digital — MANO KALADĖS „LENTYNA":
// • Kaladės — dėžutės lentynose (po 3), viršelis = starter kaladės paveikslas
//   pagal frakciją (iš parduotuvės), fallback — frakcijos spalvos gradientas.
// • Paspaudus dėžutę — šoninis meniu (drawer) su: kortų sąrašu (tap → detali
//   peržiūra), aukso kreive (gold curve), tipų/retumų suvestine, vidurkiu,
//   trūkstamomis kortomis ir veiksmais (redaguoti / išbandyti / kopijuoti /
//   ištrinti / matomumas).
// ══════════════════════════════════════════════════════════════════════════════
import { useCallback, useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Edit2, Trash2, Copy, Lock, Globe, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { LoadingOrRetry } from './ui/LoadingOrRetry'
import { playUiClick, playSuccess, playError, playCardFlip } from '@/lib/ui-sound'
import { PlaytestButton } from '@/components/decks/PlaytestButton'
import { isDeckSizeValid, formatDeckCount } from '@/lib/deck-validation'
import { costCurve, COST_CURVE_LABELS, displayAvgCost } from '@/lib/cards/cost'
import { getStarterDecks } from '@/lib/starterDecks'
import { rarityColor } from '@/lib/digital/rarity'
import { SmartImg } from '@/components/ui/SmartImg'
import { useT, useGameContent } from '@/lib/i18n/react'
import { cardImage, cardText, ensureCardTranslations } from '@/lib/cards/i18n'
import { useActiveDeck } from '@/lib/digital/activeDeck'
import { useDesktopUi } from './ui/useDesktopUi'
import { DT, deskGrid } from './ui/deskTokens'
import { DeskDialog, useDialogFocus } from './ui/DeskKit'

const GOLD = '240,180,41'

type Deck = {
  id: string; name: string; faction: string | null; factionId: number | null; factionColor: string
  visibility: string; cardCount: number; avgGold: number; missing: number | null
}

type DeckCard = {
  id: string; name: string; image: string | null; gold: number
  atk: number | null; hp: number | null; effect: string | null
  rarity: string | null; type: string | null; isChampion: boolean
  qty: number; side: boolean
}

export function DigitalMyDecks({ userId, onEdit, onCreate }: { userId: string; onEdit: (id: string) => void; onCreate: () => void }) {
  const t = useT()
  const gc = useGameContent()
  const { desktop } = useDesktopUi()
  const [decks, setDecks] = useState<Deck[] | null>(null)
  const [covers, setCovers] = useState<Record<number, string>>({})
  const [openDeck, setOpenDeck] = useState<Deck | null>(null)
  const [deckCards, setDeckCards] = useState<DeckCard[] | null>(null)
  const [cardView, setCardView] = useState<DeckCard | null>(null)
  const [confirmDel, setConfirmDel] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const flash = (m: string, err = false) => { (err ? playError : playSuccess)(); setToast(m) }
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), 2000); return () => clearTimeout(t) }, [toast])

  const [loadSlow, setLoadSlow] = useState(false)
  const load = useCallback(async () => {
    const supabase = createClient()
    const [{ data: deckRows }, { data: colRows }] = await Promise.all([
      supabase.from('decks').select('id, name, faction_id, visibility, card_count, avg_gold_cost, faction:factions ( name, color_hex )').eq('user_id', userId).not('name', 'ilike', '[Kampanija]%').order('updated_at', { ascending: false }),
      supabase.from('user_collections').select('card_id, quantity').eq('user_id', userId),
    ])
    type DR = { id: string; name: string; faction_id: number | null; visibility: string; card_count: number; avg_gold_cost: number; faction: { name: string; color_hex: string } | null }
    const rows = (deckRows as unknown as DR[]) ?? []
    const owned: Record<string, number> = Object.fromEntries(((colRows as { card_id: string; quantity: number }[]) ?? []).map((r) => [r.card_id, r.quantity]))
    const ids = rows.map((d) => d.id)
    const missingMap: Record<string, number> = {}
    if (ids.length) {
      const { data: dc } = await supabase.from('deck_cards').select('deck_id, card_id, quantity').in('deck_id', ids)
      for (const r of ((dc as { deck_id: string; card_id: string; quantity: number }[]) ?? [])) {
        const have = owned[r.card_id] ?? 0
        if (have < r.quantity) missingMap[r.deck_id] = (missingMap[r.deck_id] ?? 0) + (r.quantity - have)
      }
    }
    setDecks(rows.map((d) => ({ id: d.id, name: d.name, faction: d.faction?.name ?? null, factionId: d.faction_id, factionColor: d.faction?.color_hex ?? '#f0b429', visibility: d.visibility, cardCount: d.card_count, avgGold: d.avg_gold_cost, missing: ids.includes(d.id) ? (missingMap[d.id] ?? 0) : 0 })))
  }, [userId])

  useEffect(() => { load(); void useActiveDeck.getState().refresh() }, [load])
  const adState = useActiveDeck()
  // Starter kaladžių viršeliai pagal frakciją (iš parduotuvės).
  // sessionStorage cache — viršeliai matomi iškart, be RPC laukimo.
  useEffect(() => {
    try { const c = sessionStorage.getItem('rvn-deck-covers'); if (c) setCovers(JSON.parse(c)) } catch { /* */ }
    getStarterDecks().then((sd) => {
      const m: Record<number, string> = {}
      for (const s of sd ?? []) if (s.factionId != null && s.imageUrl) m[s.factionId] = s.imageUrl
      setCovers(m)
      try { sessionStorage.setItem('rvn-deck-covers', JSON.stringify(m)) } catch { /* */ }
    })
  }, [])

  // ── Drawer: kaladės kortos ─────────────────────────────────────────────────
  const openDrawer = useCallback(async (d: Deck) => {
    playCardFlip(); setOpenDeck(d); setDeckCards(null)
    const supabase = createClient()
    await ensureCardTranslations()
    const { data } = await supabase.from('deck_cards')
      .select('quantity, is_side_deck, card:cards ( id, name, image_url, gold_cost, attack, health, effect_text, description, is_champion, rarity:rarities ( name ), card_type:card_types ( name ) )')
      .eq('deck_id', d.id)
    type Row = { quantity: number; is_side_deck: boolean | null; card: { id: string; name: string; image_url: string | null; gold_cost: number; attack: number | null; health: number | null; effect_text: string | null; description: string | null; is_champion: boolean; rarity: { name: string } | null; card_type: { name: string } | null } | null }
    const list: DeckCard[] = ((data as unknown as Row[]) ?? []).filter((r) => r.card).map((r) => ({
      id: r.card!.id, name: cardText(r.card!.id, 'name', r.card!.name), image: cardImage(r.card!.id, r.card!.image_url), gold: r.card!.gold_cost,
      atk: r.card!.attack, hp: r.card!.health,
      effect: cardText(r.card!.id, 'effect_text', r.card!.effect_text) || cardText(r.card!.id, 'description', r.card!.description),
      rarity: r.card!.rarity?.name ?? null, type: r.card!.card_type?.name ?? null, isChampion: r.card!.is_champion,
      qty: r.quantity, side: !!r.is_side_deck,
    }))
    list.sort((a, b) => a.gold - b.gold || a.name.localeCompare(b.name))
    setDeckCards(list)
  }, [])

  const closeDrawer = () => { playUiClick(); setOpenDeck(null); setDeckCards(null); setCardView(null) }
  // Desktop: Escape + fokuso gaudyklė šoniniam meniu (kai atidaryta kortos peržiūra ar trynimo patvirtinimas — jie patys valdo fokusą)
  const drawerRef = useDialogFocus<HTMLElement>(closeDrawer, desktop && !!openDeck && !cardView && !confirmDel)

  const duplicate = async (id: string) => {
    setBusy(id); playUiClick()
    const supabase = createClient()
    try {
      const { data: orig, error: oErr } = await supabase.from('decks').select('name, description, faction_id, card_count, avg_gold_cost').eq('id', id).single()
      if (oErr || !orig) throw oErr ?? new Error('no deck')
      const o = orig as { name: string; description: string | null; faction_id: number | null; card_count: number; avg_gold_cost: number }
      const { data: nd, error } = await supabase.from('decks').insert({ user_id: userId, name: t('decks.my.copyPrefix', { name: o.name }), description: o.description, faction_id: o.faction_id, visibility: 'private', card_count: o.card_count, avg_gold_cost: o.avg_gold_cost }).select('id').single()
      if (error) throw error
      const { data: cards } = await supabase.from('deck_cards').select('card_id, quantity, is_side_deck').eq('deck_id', id)
      const rows = ((cards as { card_id: string; quantity: number; is_side_deck: boolean | null }[]) ?? []).map((c) => ({ deck_id: nd.id, card_id: c.card_id, quantity: c.quantity, is_side_deck: c.is_side_deck ?? false }))
      if (rows.length) await supabase.from('deck_cards').insert(rows)
      flash(t('decks.my.copied')); closeDrawer(); load()
    } catch { flash(t('decks.my.copyFailed'), true) } finally { setBusy(null) }
  }

  const del = async (id: string) => {
    setBusy(id); playUiClick()
    const supabase = createClient()
    try {
      await supabase.from('deck_cards').delete().eq('deck_id', id)
      const { error } = await supabase.from('decks').delete().eq('id', id).eq('user_id', userId)
      if (error) throw error
      flash(t('decks.my.deleted')); setConfirmDel(null); closeDrawer(); load()
    } catch { flash(t('decks.my.deleteFailed'), true) } finally { setBusy(null) }
  }

  useEffect(() => {
    if (decks !== null) { setLoadSlow(false); return }
    const t = setTimeout(() => setLoadSlow(true), 10_000)
    return () => clearTimeout(t)
  }, [decks])

  if (decks === null) return <LoadingOrRetry timedOut={loadSlow} onRetry={() => { setLoadSlow(false); void load() }} />

  if (decks.length === 0) {
    return (
      <div className="ravenof-body h-full flex flex-col items-center justify-center text-center" style={{ gap: 13 }}>
        <div className="relative" style={{ width: 66, height: 84 }}>
          <div className="absolute inset-0" style={{ border: '1px dashed #3d3345', borderRadius: 6, transform: 'rotate(-9deg)', background: 'var(--ravenof-bg-surface-2)' }} />
          <div className="absolute inset-0" style={{ border: '1px dashed #4a4552', borderRadius: 6, transform: 'rotate(7deg)', background: 'var(--ravenof-bg-surface-2)' }} />
          <div className="absolute inset-0 flex items-center justify-center" style={{ border: '1px solid var(--ravenof-border-strong)', borderRadius: 6, background: 'var(--ravenof-bg-surface)', font: '300 30px var(--ravenof-font-body)', color: 'var(--ravenof-gold)' }}>+</div>
        </div>
        <div>
          <p style={{ font: `700 ${desktop ? DT.fs.h2 : 15}px var(--ravenof-font-display)`, color: 'var(--ravenof-text-primary)' }}>{t('decks.my.emptyTitle')}</p>
          <p style={{ font: `400 ${desktop ? DT.fs.body : 11}px var(--ravenof-font-body)`, color: 'var(--ravenof-text-secondary)', marginTop: desktop ? 6 : 3 }}>{t('decks.my.emptySub')}</p>
        </div>
        <button onClick={() => { playUiClick(); onCreate() }} className={desktop ? 'rvn-d-btn rvn-d-btn-primary' : 'ravenof-btn ravenof-btn-primary'} style={desktop ? undefined : { fontSize: 12, padding: '11px 26px', minHeight: 0 }}>{t('decks.my.createCta')}</button>
      </div>
    )
  }

  // Patvirtintas UI (decks-mine.png): horizontali kaladžių eilė + „nauja kaladė" tile.
  // Vienintelis sąmoningas horizontalus scroll (RESPONSIVE_RULES).
  const setActiveDeck = async (id: string) => {
    playUiClick()
    const r = await useActiveDeck.getState().setActive(id)
    if (!r.ok) flash(t('decks.invalidSizeHint'), true)
  }

  return (
    <div className="ravenof-body h-full flex flex-col min-h-0">
      {desktop ? (
        /* DESKTOP: kelių eilučių adaptyvus grid (180–220px), „Nauja kaladė" – pirma plytelė; be horizontalaus scroll */
        <div style={{ ...deskGrid(DT.card.deck, DT.sp.lg), justifyContent: 'start', paddingBottom: DT.sp.xl }} data-testid="my-decks-grid">
          <button onClick={() => { playUiClick(); onCreate() }} className="ravenof-press flex flex-col items-center justify-center"
            style={{ minHeight: 320, gap: DT.sp.md, border: '1.5px dashed rgba(212,163,59,0.45)', background: 'rgba(212,163,59,0.04)', cursor: 'pointer', padding: DT.sp.lg }}>
            <span className="flex items-center justify-center" style={{ width: 64, height: 64, border: '1px solid rgba(212,163,59,0.55)', font: '300 40px/1 var(--ravenof-font-body)', color: 'var(--ravenof-gold)' }}>+</span>
            <span style={{ font: `700 ${DT.fs.h3}px var(--ravenof-font-display)`, letterSpacing: '.08em', color: 'var(--ravenof-gold-bright, var(--ravenof-gold))', textAlign: 'center', textTransform: 'uppercase' }}>{t('decks.my.newDeck')}</span>
            <span className="rvn-d-help" style={{ textAlign: 'center' }}>{t('decks.my.emptySub')}</span>
          </button>
          {decks.map((d) => (
            <DeskDeckCard key={d.id} d={d} cover={d.factionId != null ? covers[d.factionId] ?? null : null}
              isActive={adState.activeDeckId === d.id} busy={busy === d.id}
              factionLabel={gc.faction(d.faction) || t('decks.my.noFaction')}
              onOpen={() => openDrawer(d)} onActivate={() => void setActiveDeck(d.id)} onEdit={() => { playUiClick(); onEdit(d.id) }}
              onCopy={() => duplicate(d.id)} onDelete={() => { playUiClick(); setConfirmDel(d.id) }} />
          ))}
        </div>
      ) : (
      <div className="flex-1 min-h-0 flex overflow-x-auto ravenof-scroll" style={{ gap: 10 }}>
        {decks.map((d) => {
          const valid = d.faction !== null && isDeckSizeValid(d.cardCount) && (d.missing ?? 0) === 0
          const isActive = adState.activeDeckId === d.id
          const cover = d.factionId != null ? covers[d.factionId] ?? null : null
          return (
            <div key={d.id} className="relative flex flex-col min-h-0" style={{ flex: '1 0 172px', maxWidth: 200, border: `1px solid ${isActive ? 'var(--ravenof-gold)' : 'var(--ravenof-border-hairline)'}`, background: 'var(--ravenof-bg-surface-2)', boxShadow: isActive ? '0 0 14px rgba(212,163,59,0.25)' : 'none' }}>
              <button onClick={() => openDrawer(d)} className="relative flex-1 min-h-0 overflow-hidden text-left" style={{ background: 'none', border: 0, padding: 0, cursor: 'pointer' }} aria-label={d.name}>
                {cover
                  ? <span className="absolute inset-0" style={{ background: 'linear-gradient(160deg,#1a1325,#0a0810)' }}><SmartImg src={cover} width={260} loading="eager" className="absolute inset-0 w-full h-full object-cover" style={{ objectPosition: '50% 12%' }} /></span>
                  : <span className="absolute inset-0 flex items-center justify-center text-3xl" style={{ background: `radial-gradient(120% 90% at 50% 20%, ${d.factionColor}33, rgba(10,8,16,0.98) 70%), linear-gradient(160deg,#1a1325,#0a0810)` }}>🎴</span>}
                <span className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(180deg, transparent 30%, rgba(7,6,10,.95))' }} />
                {isActive && <span className="absolute" style={{ top: 6, left: 6, font: '700 9px var(--ravenof-font-display)', color: 'var(--ravenof-on-gold)', background: 'var(--ravenof-grad-gold)', padding: '3px 8px', letterSpacing: 1 }}>{t('decks.my.activeBadge')}</span>}
                {!valid && <span className="absolute" style={{ top: 6, right: 6, font: '700 9px var(--ravenof-font-body)', color: 'var(--ravenof-danger-bright)', background: 'rgba(7,6,10,.85)', border: '1px solid #8D2D3855', padding: '2px 6px' }}>{t('decks.my.invalidBadge')}</span>}
                <span className="absolute" style={{ left: 9, bottom: 6, right: 6 }}>
                  <span className="block truncate" style={{ font: '700 14px var(--ravenof-font-display)', color: 'var(--ravenof-text-primary)', textTransform: 'uppercase', letterSpacing: '.03em' }}>{d.name}</span>
                  <span className="block truncate" style={{ font: '400 10.5px var(--ravenof-font-body)', color: d.factionColor }}>{gc.faction(d.faction) || t('decks.my.noFaction')} · {formatDeckCount(d.cardCount)}</span>
                </span>
              </button>
              <div className="shrink-0 grid grid-cols-2" style={{ borderTop: '1px solid var(--ravenof-border-hairline)' }}>
                {/* Aktyvi = NEinteraktyvi būsena; Aktyvinti — tik galiojančioms kaladėms */}
                {isActive
                  ? <span aria-current="true" style={{ font: '700 9.5px var(--ravenof-font-display)', letterSpacing: 1, color: 'var(--ravenof-on-gold)', background: 'var(--ravenof-grad-gold)', padding: '8px 4px', textAlign: 'center', border: 0, borderRight: '1px solid var(--ravenof-border-hairline)', borderBottom: '1px solid var(--ravenof-border-hairline)' }}>★ {t('decks.my.activeBadge')}</span>
                  : <button onClick={() => void setActiveDeck(d.id)} disabled={!valid} title={valid ? undefined : t('decks.invalidSizeHint')} className="ravenof-press" style={{ font: '600 9.5px var(--ravenof-font-body)', color: valid ? 'var(--ravenof-text-secondary)' : 'rgba(150,160,185,0.35)', padding: '8px 4px', textAlign: 'center', cursor: valid ? 'pointer' : 'not-allowed', background: 'none', border: 0, borderRight: '1px solid var(--ravenof-border-hairline)', borderBottom: '1px solid var(--ravenof-border-hairline)' }}>★ {t('decks.my.setActive')}</button>}
                <button onClick={() => { playUiClick(); onEdit(d.id) }} className="ravenof-press" style={{ font: '600 9.5px var(--ravenof-font-body)', color: 'var(--ravenof-text-primary)', padding: '8px 4px', textAlign: 'center', cursor: 'pointer', background: 'none', border: 0, borderBottom: '1px solid var(--ravenof-border-hairline)' }}>✎ {t('decks.my.edit')}</button>
                <button onClick={() => duplicate(d.id)} disabled={busy === d.id} className="ravenof-press" style={{ font: '600 9.5px var(--ravenof-font-body)', color: 'var(--ravenof-text-secondary)', padding: '8px 4px', textAlign: 'center', cursor: 'pointer', background: 'none', border: 0, borderRight: '1px solid var(--ravenof-border-hairline)' }}>⧉ {t('decks.my.copyShort')}</button>
                <button onClick={() => setConfirmDel(d.id)} className="ravenof-press" style={{ font: '600 9.5px var(--ravenof-font-body)', color: 'var(--ravenof-danger)', padding: '8px 4px', textAlign: 'center', cursor: 'pointer', background: 'none', border: 0 }}>✕ {t('decks.my.deleteShort')}</button>
              </div>
            </div>
          )
        })}
        <button onClick={() => { playUiClick(); onCreate() }} className="ravenof-press flex flex-col items-center justify-center shrink-0" style={{ width: 110, gap: 8, border: '1px dashed var(--ravenof-border-strong)', background: 'none', cursor: 'pointer' }}>
          <span style={{ font: '300 26px var(--ravenof-font-body)', color: 'var(--ravenof-gold)' }}>+</span>
          <span style={{ font: '700 10px var(--ravenof-font-display)', letterSpacing: 1, color: 'var(--ravenof-text-secondary)', textAlign: 'center', padding: '0 8px', textTransform: 'uppercase' }}>{t('decks.my.newDeck')}</span>
        </button>
      </div>
      )}

      {/* ── ŠONINIS MENIU (drawer) ── */}
      <AnimatePresence>
        {openDeck && (
          <>
            <motion.div className="fixed inset-0 z-[150]" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(3px)' }}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={closeDrawer} />
            <motion.aside ref={drawerRef} role="dialog" aria-modal="true" aria-label={openDeck.name} tabIndex={-1} className="fixed top-0 right-0 bottom-0 z-[155] flex flex-col outline-none"
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'tween', duration: 0.28, ease: [0.3, 0.7, 0.3, 1] }}
              style={{ width: desktop ? 'min(480px, 40vw)' : 'min(410px, 94vw)', background: 'linear-gradient(200deg, #171021, #0a0810)', borderLeft: `1px solid rgba(${GOLD},0.4)`, boxShadow: '-16px 0 50px rgba(0,0,0,0.75)' }}>

              {/* Antraštė */}
              <div className="flex items-center gap-3 px-4 pb-3" style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 14px)', borderBottom: `1px solid rgba(${GOLD},0.2)` }}>
                <CoverThumb cover={openDeck.factionId != null ? covers[openDeck.factionId] ?? null : null} color={openDeck.factionColor} size={desktop ? 56 : 46} />
                <div className="flex-1 min-w-0">
                  <h2 className={desktop ? 'font-bold leading-tight rvn-clamp2' : 'text-[15px] font-bold leading-tight truncate'} style={{ fontFamily: 'var(--rvn-font-display)', color: '#f3ead3', fontSize: desktop ? DT.fs.h2 : undefined }}>{openDeck.name}</h2>
                  <div className={`flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5 ${desktop ? '' : 'text-[10.5px]'}`} style={{ color: 'var(--text-muted)', fontSize: desktop ? DT.fs.help : undefined }}>
                    <span className="px-1.5 rounded" style={{ background: openDeck.factionColor + '22', color: openDeck.factionColor }}>{openDeck.faction ?? t('decks.my.noFaction')}</span>
                    <span className="inline-flex items-center gap-0.5">{openDeck.visibility === 'public' ? <><Globe className="w-3 h-3" /> {t('decks.my.public')}</> : <><Lock className="w-3 h-3" /> {t('decks.my.private')}</>}</span>
                  </div>
                </div>
                <button onClick={closeDrawer} aria-label={t('common.close')} data-dlg-close="1" className="flex items-center justify-center rounded-full shrink-0" style={{ width: desktop ? DT.ctl : 34, height: desktop ? DT.ctl : 34, background: 'rgba(10,8,16,0.9)', border: `1px solid rgba(${GOLD},0.4)`, color: 'var(--gold)' }}><X className="w-4 h-4" /></button>
              </div>

              {/* Turinys */}
              <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4" style={{ paddingBottom: 'calc(16px + env(safe-area-inset-bottom, 0px))' }}>
                <DrawerBody desktop={desktop} deck={openDeck} cards={deckCards} onCard={(c) => { playUiClick(); setCardView(c) }} />

                {/* Veiksmai */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button onClick={() => { playUiClick(); onEdit(openDeck.id) }} className="rvn-press inline-flex items-center justify-center gap-1.5 rounded-xl text-xs font-bold" style={{ minHeight: 44, background: `rgba(${GOLD},0.14)`, border: `1px solid rgba(${GOLD},0.45)`, color: 'var(--gold)', fontFamily: 'var(--rvn-font-display)' }}><Edit2 className="w-3.5 h-3.5" /> {t('decks.my.edit')}</button>
                  <PlaytestButton deckId={openDeck.id} deckName={openDeck.name} variant="compact" />
                  <button onClick={() => duplicate(openDeck.id)} disabled={busy === openDeck.id} className="rvn-press inline-flex items-center justify-center gap-1.5 rounded-xl text-xs font-bold disabled:opacity-40" style={{ minHeight: 44, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.15)', color: 'var(--text-secondary)' }}><Copy className="w-3.5 h-3.5" /> {t('decks.my.copy')}</button>
                  <button onClick={() => setConfirmDel(openDeck.id)} className="rvn-press inline-flex items-center justify-center gap-1.5 rounded-xl text-xs font-bold" style={{ minHeight: 44, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.4)', color: '#fca5a5' }}><Trash2 className="w-3.5 h-3.5" /> {t('decks.my.delete')}</button>
                </div>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Kortos detali peržiūra */}
      {cardView && <CardDetail desktop={desktop} c={cardView} onClose={() => setCardView(null)} />}

      {confirmDel && desktop && (
        <DeskDialog onClose={() => setConfirmDel(null)} title={t('decks.my.confirmDeleteTitle')} width={DT.modal.sm} zIndex={170} closeLabel={t('common.close')}
          footer={<>
            <button onClick={() => { playUiClick(); setConfirmDel(null) }} className="rvn-d-btn rvn-d-btn-ghost">{t('common.cancel')}</button>
            <button onClick={() => del(confirmDel)} disabled={busy === confirmDel} className="rvn-d-btn rvn-d-btn-danger"><Trash2 size={16} /> {t('decks.my.delete')}</button>
          </>}>
          <p className="rvn-d-body" style={{ color: 'var(--ravenof-text-secondary)', margin: 0 }}>
            <b style={{ color: 'var(--ravenof-text-primary)' }}>{decks.find((x) => x.id === confirmDel)?.name}</b> — {t('decks.my.confirmDeleteBody')}
          </p>
        </DeskDialog>
      )}
      {confirmDel && !desktop && (
        <div className="fixed inset-0 z-[170] flex items-center justify-center p-6" style={{ background: 'rgba(4,3,8,0.9)' }} onClick={() => setConfirmDel(null)}>
          <div className="w-[min(330px,92vw)] rounded-2xl p-5 text-center" style={{ border: '1px solid rgba(239,68,68,0.4)', background: 'linear-gradient(160deg,#17111f,#0a0810)' }} onClick={(e) => e.stopPropagation()}>
            <p className="text-base font-bold mb-1" style={{ fontFamily: 'var(--rvn-font-display)', color: '#fca5a5' }}>{t('decks.my.confirmDeleteTitle')}</p>
            <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>{t('decks.my.confirmDeleteBody')}</p>
            <div className="flex gap-2">
              <button onClick={() => { playUiClick(); setConfirmDel(null) }} className="flex-1 rounded-xl text-sm font-bold" style={{ minHeight: 44, background: 'rgba(255,255,255,0.06)', border: `1px solid rgba(${GOLD},0.3)`, color: 'var(--text-secondary)' }}>{t('common.cancel')}</button>
              <button onClick={() => del(confirmDel)} disabled={busy === confirmDel} className="flex-1 rounded-xl text-sm font-bold disabled:opacity-50" style={{ minHeight: 44, background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.6)', color: '#fca5a5', fontFamily: 'var(--rvn-font-display)' }}>{t('decks.my.delete')}</button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className="fixed left-1/2 -translate-x-1/2 z-[180] px-4 py-2 rounded-full text-xs font-semibold" style={{ fontSize: desktop ? 14 : undefined, bottom: 'calc(92px + env(safe-area-inset-bottom, 0px))', background: 'rgba(10,8,16,0.96)', border: `1px solid rgba(${GOLD},0.5)`, color: 'var(--gold)' }}>{toast}</div>}
    </div>
  )
}

// ── DESKTOP kaladės kortelė: viršelis (fiksuotas santykis, contain) · info · veiksmai ──
function DeskDeckCard({ d, cover, isActive, busy, factionLabel, onOpen, onActivate, onEdit, onCopy, onDelete }: {
  d: Deck; cover: string | null; isActive: boolean; busy: boolean; factionLabel: string
  onOpen: () => void; onActivate: () => void; onEdit: () => void; onCopy: () => void; onDelete: () => void
}) {
  const t = useT()
  const valid = d.faction !== null && isDeckSizeValid(d.cardCount) && (d.missing ?? 0) === 0
  const act: React.CSSProperties = { minHeight: 40, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '0 6px', font: `600 13px var(--ravenof-font-body)`, background: 'none', border: 0, cursor: 'pointer', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0 }
  return (
    <div className="relative flex flex-col" style={{ minWidth: 0, border: `1px solid ${isActive ? 'var(--ravenof-gold)' : 'var(--ravenof-border-strong)'}`, background: 'var(--ravenof-bg-surface-2)', boxShadow: isActive ? '0 0 16px rgba(212,163,59,0.28)' : 'none' }}>
      {/* Viršelis — fiksuotas 4:5 santykis, visas paveikslas (contain), niekada netempiamas iki ekrano aukščio */}
      <button onClick={onOpen} className="ravenof-press relative block w-full overflow-hidden text-left" aria-label={d.name}
        style={{ aspectRatio: '4 / 5', padding: 0, border: 0, cursor: 'pointer', background: `radial-gradient(120% 90% at 50% 25%, ${d.factionColor}33, rgba(10,8,16,0.98) 72%), linear-gradient(160deg,#1a1325,#0a0810)` }}>
        {cover
          ? <SmartImg src={cover} width={440} loading="eager" className="absolute inset-0 w-full h-full" style={{ objectFit: 'contain' }} />
          : <span className="absolute inset-0 flex items-center justify-center" style={{ fontSize: 44 }}>🎴</span>}
        {isActive && <span className="absolute" style={{ top: 8, left: 8, font: `700 ${DT.fs.label}px var(--ravenof-font-display)`, color: 'var(--ravenof-on-gold)', background: 'var(--ravenof-grad-gold)', padding: '4px 10px', letterSpacing: 1 }}>★ {t('decks.my.activeBadge')}</span>}
        {!valid && <span className="absolute" style={{ top: 8, right: 8, font: `700 ${DT.fs.label}px var(--ravenof-font-body)`, color: 'var(--ravenof-danger-bright)', background: 'rgba(7,6,10,.9)', border: '1px solid #8D2D3888', padding: '3px 8px' }}>{t('decks.my.invalidBadge')}</span>}
      </button>
      {/* Info */}
      <div className="flex flex-col flex-1" style={{ padding: '10px 12px 12px', gap: 4, borderTop: `2px solid ${d.factionColor}` }}>
        <button onClick={onOpen} className="rvn-clamp2 text-left" title={d.name}
          style={{ font: `700 ${DT.fs.h3}px/1.25 var(--ravenof-font-display)`, color: 'var(--ravenof-text-primary)', letterSpacing: '.02em', background: 'none', border: 0, padding: 0, cursor: 'pointer' }}>{d.name}</button>
        <span style={{ font: `600 ${DT.fs.help}px var(--ravenof-font-body)`, color: d.factionColor }}>{factionLabel}</span>
        <span style={{ font: `400 ${DT.fs.label + 0.5}px/1.35 var(--ravenof-font-body)`, color: isDeckSizeValid(d.cardCount) ? 'var(--ravenof-text-secondary)' : 'var(--ravenof-danger-bright)' }}>{formatDeckCount(d.cardCount)}</span>
        {(d.missing ?? 0) > 0 && <span style={{ font: `400 ${DT.fs.label + 0.5}px/1.35 var(--ravenof-font-body)`, color: 'rgba(240,180,41,0.9)' }}>{t('decks.my.missingCards', { count: d.missing ?? 0 })}</span>}
      </div>
      {/* Veiksmai (≥40px, 13px etiketės) */}
      <div className="grid grid-cols-2" style={{ borderTop: '1px solid var(--ravenof-border-hairline)' }}>
        {isActive
          ? <span aria-current="true" style={{ ...act, cursor: 'default', font: `700 12.5px var(--ravenof-font-display)`, letterSpacing: 1, color: 'var(--ravenof-on-gold)', background: 'var(--ravenof-grad-gold)', borderRight: '1px solid var(--ravenof-border-hairline)', borderBottom: '1px solid var(--ravenof-border-hairline)' }}>★ {t('decks.my.activeBadge')}</span>
          : <button onClick={onActivate} disabled={!valid} title={valid ? undefined : t('decks.invalidSizeHint')} className="ravenof-press" style={{ ...act, color: valid ? 'var(--ravenof-gold)' : 'rgba(150,160,185,0.4)', cursor: valid ? 'pointer' : 'not-allowed', borderRight: '1px solid var(--ravenof-border-hairline)', borderBottom: '1px solid var(--ravenof-border-hairline)' }}>★ {t('decks.my.setActive')}</button>}
        <button onClick={onEdit} className="ravenof-press" style={{ ...act, color: 'var(--ravenof-text-primary)', borderBottom: '1px solid var(--ravenof-border-hairline)' }}><Edit2 size={15} /> {t('decks.my.edit')}</button>
        <button onClick={onCopy} disabled={busy} className="ravenof-press disabled:opacity-40" style={{ ...act, color: 'var(--ravenof-text-secondary)', borderRight: '1px solid var(--ravenof-border-hairline)' }}><Copy size={15} /> {t('decks.my.copyShort')}</button>
        <button onClick={onDelete} className="ravenof-press" style={{ ...act, color: 'var(--ravenof-danger-bright, #fca5a5)' }}><Trash2 size={15} /> {t('decks.my.deleteShort')}</button>
      </div>
    </div>
  )
}

function CoverThumb({ cover, color, size }: { cover: string | null; color: string; size: number }) {
  return (
    <span className="relative block overflow-hidden shrink-0" style={{ width: size, height: size * 1.33, borderRadius: 8, border: `1px solid ${color}66` }}>
      {cover
        ? <SmartImg src={cover} width={120} className="absolute inset-0 w-full h-full object-cover" />
        : <span className="absolute inset-0 flex items-center justify-center text-lg" style={{ background: `linear-gradient(160deg, ${color}33, #0a0810)` }}>🎴</span>}
    </span>
  )
}

// ── Drawer turinys: statistika + kortų sąrašas ────────────────────────────────
function DrawerBody({ deck, cards, onCard, desktop = false }: { deck: Deck; cards: DeckCard[] | null; onCard: (c: DeckCard) => void; desktop?: boolean }) {
  const t = useT()
  const stats = useMemo(() => {
    if (!cards) return null
    const main = cards.filter((c) => !c.side)
    const side = cards.filter((c) => c.side)
    const total = main.reduce((a, c) => a + c.qty, 0)
    const golds = main.flatMap((c) => Array(c.qty).fill(c.gold) as number[])
    const avg = golds.length ? golds.reduce((a, b) => a + b, 0) / golds.length : 0
    // KANONINĖ kainos kreivė — DB reikšmės šimtais (200–700) → 1..8+ stulpeliai
    const curve = costCurve(main.map((c) => ({ gold: c.gold, qty: c.qty })))
    const types = new Map<string, number>()
    const rars = new Map<string, number>()
    for (const c of main) {
      types.set(c.type ?? 'Kita', (types.get(c.type ?? 'Kita') ?? 0) + c.qty)
      rars.set(c.rarity ?? '—', (rars.get(c.rarity ?? '—') ?? 0) + c.qty)
    }
    const champions = main.filter((c) => c.isChampion).reduce((a, c) => a + c.qty, 0)
    return { main, side, total, avg, curve, types: Array.from(types), rars: Array.from(rars), champions }
  }, [cards])

  if (!cards || !stats) return <p className="text-center text-sm py-10" style={{ color: 'var(--text-muted)' }}>{t('common.loading')}</p>

  const curveMax = Math.max(1, ...stats.curve)
  const valid = deck.faction !== null && isDeckSizeValid(stats.total)

  return (
    <>
      {/* Suvestinė */}
      <div className="grid grid-cols-3 gap-2">
        <StatBox desktop={desktop} label={t('decks.my.statCards')} value={String(stats.total)} accent={valid ? '74,222,128' : '252,165,165'} />
        <StatBox desktop={desktop} label={t('decks.my.statAvgGold')} value={displayAvgCost(stats.avg).toFixed(1)} accent={GOLD} />
        <StatBox desktop={desktop} label={t('decks.my.statChampions')} value={String(stats.champions)} accent="139,92,246" />
      </div>
      <p className={`${desktop ? '' : 'text-[11px] '}px-3 py-1.5 rounded-lg`} style={{ fontSize: desktop ? DT.fs.help : undefined, background: valid ? 'rgba(74,222,128,0.06)' : 'rgba(252,165,165,0.08)', color: valid ? 'rgba(74,222,128,0.9)' : '#fca5a5', border: `1px solid ${valid ? 'rgba(74,222,128,0.2)' : 'rgba(252,165,165,0.3)'}` }}>
        {formatDeckCount(stats.total)}{!valid && !isDeckSizeValid(stats.total) ? ` · ${t('decks.invalidBadge')}` : ''}
      </p>
      {deck.missing != null && deck.missing > 0 && (
        <p className={`${desktop ? '' : 'text-[11px] '}px-3 py-2 rounded-lg`} style={{ fontSize: desktop ? DT.fs.help : undefined, background: 'rgba(240,180,41,0.08)', color: 'rgba(240,180,41,0.9)', border: '1px solid rgba(240,180,41,0.25)' }}>
          {t('decks.my.missingCards', { count: deck.missing })}
        </p>
      )}

      {/* Aukso kreivė */}
      <div>
        <SectionLabel desktop={desktop}>{t('decks.my.goldCurve')}</SectionLabel>
        <div className="flex items-end gap-1" style={{ height: desktop ? 104 : 84 }}>
          {stats.curve.map((n, i) => (
            <div key={i} className="flex-1 flex flex-col items-center justify-end gap-0.5" style={{ height: '100%' }}>
              <span className={`${desktop ? '' : 'text-[9px] '}tabular-nums`} style={{ fontSize: desktop ? DT.fs.label : undefined, color: n > 0 ? 'var(--gold)' : 'rgba(150,160,185,0.35)' }}>{n > 0 ? n : ''}</span>
              <div className="w-full rounded-t" style={{ height: `${Math.max(n > 0 ? 8 : 2, (n / curveMax) * 58)}px`,
                background: n > 0 ? `linear-gradient(180deg, rgb(${GOLD}), rgba(${GOLD},0.45))` : 'rgba(255,255,255,0.06)',
                boxShadow: n > 0 ? `0 0 6px rgba(${GOLD},0.35)` : 'none' }} />
              <span className={`${desktop ? '' : 'text-[9px] '}tabular-nums`} style={{ fontSize: desktop ? DT.fs.label : undefined, color: 'var(--text-muted)' }}>{COST_CURVE_LABELS[i]}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Tipai + retumai */}
      <div className="flex flex-wrap gap-1.5">
        {stats.types.map(([t, n]) => (
          <span key={t} className={`${desktop ? '' : 'text-[10px] '}px-2 py-0.5 rounded-full`} style={{ fontSize: desktop ? DT.fs.label : undefined, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', color: 'var(--text-secondary)' }}>{t} <b style={{ color: '#f3ead3' }}>{n}</b></span>
        ))}
        {stats.rars.map(([r, n]) => (
          <span key={r} className={`${desktop ? '' : 'text-[10px] '}px-2 py-0.5 rounded-full`} style={{ fontSize: desktop ? DT.fs.label : undefined, background: rarityColor(r) + '14', border: `1px solid ${rarityColor(r)}55`, color: rarityColor(r) }}>{r} <b>{n}</b></span>
        ))}
      </div>

      {/* Kortų sąrašas */}
      <div>
        <SectionLabel desktop={desktop}>Pagrindinė kaladė · {stats.total}</SectionLabel>
        <div className="space-y-1">
          {stats.main.map((c) => <CardRow desktop={desktop} key={c.id} c={c} onClick={() => onCard(c)} />)}
        </div>
      </div>
      {stats.side.length > 0 && (
        <div>
          <SectionLabel desktop={desktop}>Šalutinė kaladė · {stats.side.reduce((a, c) => a + c.qty, 0)}</SectionLabel>
          <div className="space-y-1">
            {stats.side.map((c) => <CardRow desktop={desktop} key={c.id} c={c} onClick={() => onCard(c)} />)}
          </div>
        </div>
      )}
    </>
  )
}

function StatBox({ label, value, accent, desktop = false }: { label: string; value: string; accent: string; desktop?: boolean }) {
  return (
    <div className="rounded-xl px-2 py-2 text-center" style={{ background: `rgba(${accent},0.08)`, border: `1px solid rgba(${accent},0.3)` }}>
      <p className="rvn-disp tabular-nums" style={{ fontSize: desktop ? DT.fs.stat : 15, fontWeight: 800, color: `rgb(${accent})`, lineHeight: 1.1 }}>{value}</p>
      <p className={desktop ? 'mt-0.5' : 'text-[9px] mt-0.5'} style={{ fontSize: desktop ? DT.fs.label : undefined, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{label}</p>
    </div>
  )
}

function SectionLabel({ children, desktop = false }: { children: React.ReactNode; desktop?: boolean }) {
  return <p className={desktop ? 'font-bold uppercase mb-2' : 'text-[10px] font-bold uppercase mb-1.5'} style={{ fontSize: desktop ? DT.fs.label : undefined, color: 'var(--text-muted)', letterSpacing: '0.14em' }}>{children}</p>
}

function CardRow({ c, onClick, desktop = false }: { c: DeckCard; onClick: () => void; desktop?: boolean }) {
  const col = rarityColor(c.rarity)
  if (desktop) return (
    <button onClick={onClick} className="rvn-press w-full flex items-center gap-2.5 px-2.5 rounded-lg text-left"
      style={{ minHeight: 44, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderLeftWidth: 3, borderLeftColor: col }}>
      <span className="flex items-center justify-center rounded-full shrink-0 tabular-nums" style={{ width: 26, height: 26, fontSize: 12, fontWeight: 800, background: `rgba(${GOLD},0.9)`, color: '#1a0f04' }}>{c.gold}</span>
      <span className="flex-1 min-w-0">
        <span className="block font-semibold truncate" style={{ fontSize: 14, color: '#f3ead3' }} title={c.name}>{c.isChampion ? '★ ' : ''}{c.name}</span>
        <span className="block truncate" style={{ fontSize: DT.fs.label, color: 'var(--text-muted)' }}>{[c.type, c.rarity].filter(Boolean).join(' · ')}</span>
      </span>
      {(c.atk != null || c.hp != null) && <span className="tabular-nums shrink-0" style={{ fontSize: 13, color: 'var(--text-muted)' }}>{c.atk ?? '—'}/{c.hp ?? '—'}</span>}
      <span className="font-bold tabular-nums shrink-0" style={{ fontSize: 14, color: col }}>×{c.qty}</span>
    </button>
  )
  return (
    <button onClick={onClick} className="rvn-press w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left"
      style={{ background: 'rgba(255,255,255,0.03)', borderLeft: `3px solid ${col}`, border: '1px solid rgba(255,255,255,0.06)', borderLeftWidth: 3, borderLeftColor: col }}>
      <span className="flex items-center justify-center rounded-full shrink-0 tabular-nums" style={{ width: 20, height: 20, fontSize: 10, fontWeight: 800, background: `rgba(${GOLD},0.9)`, color: '#1a0f04' }}>{c.gold}</span>
      <span className="flex-1 min-w-0">
        <span className="block text-[12px] font-semibold truncate" style={{ color: '#f3ead3' }}>{c.isChampion ? '★ ' : ''}{c.name}</span>
        <span className="block text-[9.5px] truncate" style={{ color: 'var(--text-muted)' }}>{[c.type, c.rarity].filter(Boolean).join(' · ')}</span>
      </span>
      {(c.atk != null || c.hp != null) && <span className="text-[10px] tabular-nums shrink-0" style={{ color: 'var(--text-muted)' }}>{c.atk ?? '—'}/{c.hp ?? '—'}</span>}
      <span className="text-[11px] font-bold tabular-nums shrink-0" style={{ color: col }}>×{c.qty}</span>
    </button>
  )
}

function CardDetail({ c, onClose, desktop = false }: { c: DeckCard; onClose: () => void; desktop?: boolean }) {
  const t = useT()
  const [bad, setBad] = useState(false)
  const col = rarityColor(c.rarity)
  const ref = useDialogFocus<HTMLDivElement>(onClose, desktop)
  return (
    <div className="fixed inset-0 z-[165] flex items-center justify-center p-5" style={{ background: 'rgba(4,3,8,0.9)' }} onClick={onClose}>
      <div ref={ref} role={desktop ? 'dialog' : undefined} aria-modal={desktop ? true : undefined} aria-label={desktop ? c.name : undefined} tabIndex={desktop ? -1 : undefined}
        className={`relative ${desktop ? 'w-[min(420px,92vw)] outline-none' : 'w-[min(340px,92vw)]'} rounded-2xl overflow-hidden`} style={{ border: `2px solid ${col}`, background: 'linear-gradient(160deg,#15101f,#0a0810)' }} onClick={(e) => e.stopPropagation()}>
        <button onClick={() => { playUiClick(); onClose() }} className="absolute top-2 right-2 z-10 flex items-center justify-center rounded-full" style={{ width: desktop ? 40 : 32, height: desktop ? 40 : 32, background: 'rgba(0,0,0,0.6)', color: '#fff' }} aria-label={t('common.close')}><X className="w-4 h-4" /></button>
        <div className="relative w-full" style={{ aspectRatio: '2.5 / 3.5', maxHeight: desktop ? '56vh' : '50vh' }}>
          {c.image && !bad
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={c.image} alt={c.name} onError={() => setBad(true)} draggable={false} className="absolute inset-0 w-full h-full object-contain" />
            : <div className="absolute inset-0 flex items-center justify-center text-5xl">🎴</div>}
        </div>
        <div className="p-4 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <h3 className={desktop ? 'font-bold' : 'text-base font-bold'} style={{ fontFamily: 'var(--rvn-font-display)', color: '#f3ead3', fontSize: desktop ? DT.fs.h2 : undefined }}>{c.isChampion ? '★ ' : ''}{c.name}</h3>
            <span className={desktop ? 'font-bold px-2 py-0.5 rounded-full shrink-0' : 'text-[11px] font-bold px-2 py-0.5 rounded-full shrink-0'} style={{ fontSize: desktop ? DT.fs.label : undefined, color: col, border: `1px solid ${col}` }}>{c.rarity ?? '—'}</span>
          </div>
          <div className={desktop ? 'flex flex-wrap gap-x-3 gap-y-0.5' : 'flex flex-wrap gap-x-3 gap-y-0.5 text-[11px]'} style={{ fontSize: desktop ? DT.fs.help : undefined, color: 'var(--text-muted)' }}>
            <span>🪙 {c.gold}</span>
            {c.atk != null && <span>⚔️ {c.atk}</span>}
            {c.hp != null && <span>❤️ {c.hp}</span>}
            {c.type && <span>· {c.type}</span>}
            <span>· kaladėje ×{c.qty}</span>
          </div>
          {c.effect && <p className={desktop ? 'leading-snug' : 'text-xs leading-snug'} style={{ fontSize: desktop ? DT.fs.body : undefined, color: 'var(--text-secondary)' }}>{c.effect}</p>}
        </div>
      </div>
    </div>
  )
}
