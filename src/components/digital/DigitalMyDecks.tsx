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
import { Edit2, Trash2, Copy, Plus, Lock, Globe, CheckCircle2, AlertCircle, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { LoadingOrRetry } from './ui/LoadingOrRetry'
import { playUiClick, playSuccess, playError, playCardFlip } from '@/lib/ui-sound'
import { PlaytestButton } from '@/components/decks/PlaytestButton'
import { DECK_MIN, DECK_MAX } from '@/lib/deck-validation'
import { getStarterDecks } from '@/lib/starterDecks'
import { rarityColor } from '@/lib/digital/rarity'
import { SmartImg } from '@/components/ui/SmartImg'
import { useT } from '@/lib/i18n/react'
import { cardImage, cardText, ensureCardTranslations } from '@/lib/cards/i18n'

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

  useEffect(() => { load() }, [load])
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
      <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
        <div className="text-5xl">📚</div>
        <div>
          <p className="text-base font-bold" style={{ fontFamily: 'var(--rvn-font-display)', color: '#f3ead3' }}>{t('decks.my.emptyTitle')}</p>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>{t('decks.my.emptySub')}</p>
        </div>
        <button onClick={() => { playUiClick(); onCreate() }} className="inline-flex items-center gap-2 px-5 rounded-xl text-sm font-bold" style={{ minHeight: 48, background: 'rgba(240,180,41,0.92)', color: '#1a0f04', fontFamily: 'var(--rvn-font-display)' }}><Plus className="w-4 h-4" /> {t('decks.my.createCta')}</button>
      </div>
    )
  }

  // lentynos po 5 (landscape; paskutinėje — „nauja kaladė" vieta)
  const PER_SHELF = 5
  const tiles: (Deck | 'new')[] = [...decks, 'new']
  const shelves: (Deck | 'new')[][] = []
  for (let i = 0; i < tiles.length; i += PER_SHELF) shelves.push(tiles.slice(i, i + PER_SHELF))

  return (
    <div className="space-y-1">
      {shelves.map((row, si) => (
        <div key={si}>
          <div className="grid grid-cols-5 gap-2.5 px-1" style={{ alignItems: 'start' }}>
            {row.map((tile) =>
              tile === 'new' ? (
                <button key="new" onClick={() => { playUiClick(); onCreate() }} className="rvn-press block w-full">
                  <span className="flex flex-col items-center justify-center gap-1.5" style={{ aspectRatio: '3 / 4', borderRadius: 10, border: `1.5px dashed rgba(${GOLD},0.4)`, background: `rgba(${GOLD},0.04)`, color: 'var(--gold)' }}>
                    <Plus className="w-6 h-6" />
                    <span className="rvn-disp" style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.04em' }}>{t('decks.my.newDeck')}</span>
                  </span>
                  <span className="block" style={{ height: 33 }} />
                </button>
              ) : (
                <DeckBox key={tile.id} d={tile} cover={tile.factionId != null ? covers[tile.factionId] ?? null : null} onClick={() => openDrawer(tile)} />
              )
            )}
            {row.length < PER_SHELF && Array.from({ length: PER_SHELF - row.length }, (_, i) => <div key={`pad-${i}`} />)}
          </div>
          {/* lentynos lenta (lapukai užlipa ant jos) */}
          <div aria-hidden style={{ height: 18, borderRadius: 3, margin: '-30px -2px 0', position: 'relative', zIndex: 0,
            background: 'linear-gradient(180deg, #6b4f26 0%, #4a3419 45%, #241807 100%)',
            borderTop: `1px solid rgba(${GOLD},0.55)`, boxShadow: '0 6px 14px rgba(0,0,0,0.55), inset 0 -2px 4px rgba(0,0,0,0.6)' }} />
          <div aria-hidden style={{ height: 18 }} />
        </div>
      ))}

      {/* ── ŠONINIS MENIU (drawer) ── */}
      <AnimatePresence>
        {openDeck && (
          <>
            <motion.div className="fixed inset-0 z-[150]" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(3px)' }}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={closeDrawer} />
            <motion.aside className="fixed top-0 right-0 bottom-0 z-[155] flex flex-col"
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'tween', duration: 0.28, ease: [0.3, 0.7, 0.3, 1] }}
              style={{ width: 'min(410px, 94vw)', background: 'linear-gradient(200deg, #171021, #0a0810)', borderLeft: `1px solid rgba(${GOLD},0.4)`, boxShadow: '-16px 0 50px rgba(0,0,0,0.75)' }}>

              {/* Antraštė */}
              <div className="flex items-center gap-3 px-4 pb-3" style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 14px)', borderBottom: `1px solid rgba(${GOLD},0.2)` }}>
                <CoverThumb cover={openDeck.factionId != null ? covers[openDeck.factionId] ?? null : null} color={openDeck.factionColor} size={46} />
                <div className="flex-1 min-w-0">
                  <h2 className="text-[15px] font-bold leading-tight truncate" style={{ fontFamily: 'var(--rvn-font-display)', color: '#f3ead3' }}>{openDeck.name}</h2>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5 text-[10.5px]" style={{ color: 'var(--text-muted)' }}>
                    <span className="px-1.5 rounded" style={{ background: openDeck.factionColor + '22', color: openDeck.factionColor }}>{openDeck.faction ?? t('decks.my.noFaction')}</span>
                    <span className="inline-flex items-center gap-0.5">{openDeck.visibility === 'public' ? <><Globe className="w-3 h-3" /> {t('decks.my.public')}</> : <><Lock className="w-3 h-3" /> {t('decks.my.private')}</>}</span>
                  </div>
                </div>
                <button onClick={closeDrawer} aria-label={t('common.close')} className="flex items-center justify-center rounded-full shrink-0" style={{ width: 34, height: 34, background: 'rgba(10,8,16,0.9)', border: `1px solid rgba(${GOLD},0.4)`, color: 'var(--gold)' }}><X className="w-4 h-4" /></button>
              </div>

              {/* Turinys */}
              <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4" style={{ paddingBottom: 'calc(16px + env(safe-area-inset-bottom, 0px))' }}>
                <DrawerBody deck={openDeck} cards={deckCards} onCard={(c) => { playUiClick(); setCardView(c) }} />

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
      {cardView && <CardDetail c={cardView} onClose={() => setCardView(null)} />}

      {confirmDel && (
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

      {toast && <div className="fixed left-1/2 -translate-x-1/2 z-[180] px-4 py-2 rounded-full text-xs font-semibold" style={{ bottom: 'calc(92px + env(safe-area-inset-bottom, 0px))', background: 'rgba(10,8,16,0.96)', border: `1px solid rgba(${GOLD},0.5)`, color: 'var(--gold)' }}>{toast}</div>}
    </div>
  )
}

// ── Fizinė kaladė lentynoje: kortų šūsnis + parchment lapukas ant lentynos ────
function DeckBox({ d, cover, onClick }: { d: Deck; cover: string | null; onClick: () => void }) {
  const valid = d.faction !== null && d.cardCount >= DECK_MIN && d.cardCount <= DECK_MAX
  return (
    <button onClick={onClick} className="rvn-press relative block w-full text-left">
      {/* kortų šūsnis (fizinis storis) — be outline, tik vaizdas + šešėliai */}
      <span className="relative block" style={{ aspectRatio: '3 / 4' }}>
        <span aria-hidden className="absolute inset-0 rounded-[7px]" style={{ transform: 'translate(5px, 5px) rotate(1.2deg)', background: 'linear-gradient(160deg,#1c1526,#0b0812)', boxShadow: '0 2px 5px rgba(0,0,0,0.5)' }} />
        <span aria-hidden className="absolute inset-0 rounded-[7px]" style={{ transform: 'translate(2.5px, 2.5px) rotate(0.5deg)', background: 'linear-gradient(160deg,#241a33,#100c18)', boxShadow: '0 2px 4px rgba(0,0,0,0.45)' }} />
        <span className="absolute inset-0 rounded-[7px] overflow-hidden" style={{ boxShadow: '0 7px 18px rgba(0,0,0,0.65), inset 0 1px 0 rgba(255,255,255,0.10), inset 0 0 0 1px rgba(0,0,0,0.45)' }}>
          {cover
            ? <SmartImg src={cover} width={260} loading="eager" className="absolute inset-0 w-full h-full object-cover" />
            : <span className="absolute inset-0 flex items-center justify-center text-3xl" style={{ background: `radial-gradient(120% 90% at 50% 20%, ${d.factionColor}33, rgba(10,8,16,0.98) 70%), linear-gradient(160deg,#1a1325,#0a0810)` }}>🎴</span>}
          {/* šviesos atspindys viršuje — fizinis paviršius */}
          <span aria-hidden className="absolute inset-x-0 top-0" style={{ height: '30%', background: 'linear-gradient(180deg, rgba(255,255,255,0.10), transparent)' }} />
        </span>
        <span className="absolute flex items-center justify-center rounded-full" style={{ top: 3, right: 3, width: 16, height: 16, background: 'rgba(0,0,0,0.7)', zIndex: 2 }}>
          {valid
            ? <CheckCircle2 style={{ width: 11, height: 11, color: '#4ade80' }} />
            : <AlertCircle style={{ width: 11, height: 11, color: '#fca5a5' }} />}
        </span>
        {d.missing != null && d.missing > 0 && (
          <span className="absolute px-1 rounded-full text-[8px] font-bold" style={{ top: 3, left: 3, zIndex: 2, background: 'rgba(0,0,0,0.75)', color: 'rgba(240,180,41,0.9)', border: '1px solid rgba(240,180,41,0.35)' }}>-{d.missing}</span>
        )}
      </span>
      {/* parchment lapukas — užklijuotas ant lentynos */}
      <span className="relative block mx-auto" style={{ width: '88%', marginTop: 1, zIndex: 3, transform: 'rotate(-1.2deg)' }}>
        <span className="block rounded-[3px] px-1.5 pt-2 pb-1 text-center" style={{ background: 'linear-gradient(170deg, #efe3c0, #d9c691 85%, #c9b478)', boxShadow: '0 2px 5px rgba(0,0,0,0.55), inset 0 0 6px rgba(120,90,30,0.25)' }}>
          <span className="block text-[9px] font-bold leading-tight truncate" style={{ color: '#3a2b12', fontFamily: 'var(--rvn-font-display)' }}>{d.name}</span>
          <span className="block text-[8px] leading-tight truncate" style={{ color: '#6b5426' }}>{d.faction ?? 'Be frakcijos'} · {d.cardCount} kortų</span>
        </span>
        {/* lipni juostelė */}
        <span aria-hidden className="absolute left-1/2" style={{ top: -3, width: 26, height: 7, transform: 'translateX(-50%) rotate(1.5deg)', background: 'rgba(255,255,255,0.22)', borderRadius: 1, boxShadow: '0 1px 2px rgba(0,0,0,0.25)' }} />
      </span>
    </button>
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
function DrawerBody({ deck, cards, onCard }: { deck: Deck; cards: DeckCard[] | null; onCard: (c: DeckCard) => void }) {
  const t = useT()
  const stats = useMemo(() => {
    if (!cards) return null
    const main = cards.filter((c) => !c.side)
    const side = cards.filter((c) => c.side)
    const total = main.reduce((a, c) => a + c.qty, 0)
    const golds = main.flatMap((c) => Array(c.qty).fill(c.gold) as number[])
    const avg = golds.length ? golds.reduce((a, b) => a + b, 0) / golds.length : 0
    const curve = Array.from({ length: 8 }, (_, i) => main.filter((c) => (i < 7 ? c.gold === i : c.gold >= 7)).reduce((a, c) => a + c.qty, 0))
    const types = new Map<string, number>()
    const rars = new Map<string, number>()
    for (const c of main) {
      types.set(c.type ?? 'Kita', (types.get(c.type ?? 'Kita') ?? 0) + c.qty)
      rars.set(c.rarity ?? '—', (rars.get(c.rarity ?? '—') ?? 0) + c.qty)
    }
    const champions = main.filter((c) => c.isChampion).reduce((a, c) => a + c.qty, 0)
    return { main, side, total, avg, curve, types: Array.from(types), rars: Array.from(rars), champions }
  }, [cards])

  if (!cards || !stats) return <p className="text-center text-sm py-10" style={{ color: 'var(--text-muted)' }}>Kraunama…</p>

  const curveMax = Math.max(1, ...stats.curve)
  const valid = deck.faction !== null && deck.cardCount >= DECK_MIN && deck.cardCount <= DECK_MAX

  return (
    <>
      {/* Suvestinė */}
      <div className="grid grid-cols-3 gap-2">
        <StatBox label={t('decks.my.statCards')} value={String(stats.total)} accent={valid ? '74,222,128' : '252,165,165'} />
        <StatBox label={t('decks.my.statAvgGold')} value={stats.avg.toFixed(1)} accent={GOLD} />
        <StatBox label={t('decks.my.statChampions')} value={String(stats.champions)} accent="139,92,246" />
      </div>
      {deck.missing != null && deck.missing > 0 && (
        <p className="text-[11px] px-3 py-2 rounded-lg" style={{ background: 'rgba(240,180,41,0.08)', color: 'rgba(240,180,41,0.9)', border: '1px solid rgba(240,180,41,0.25)' }}>
          {t('decks.my.missingCards', { count: deck.missing })}
        </p>
      )}

      {/* Aukso kreivė */}
      <div>
        <SectionLabel>{t('decks.my.goldCurve')}</SectionLabel>
        <div className="flex items-end gap-1" style={{ height: 84 }}>
          {stats.curve.map((n, i) => (
            <div key={i} className="flex-1 flex flex-col items-center justify-end gap-0.5" style={{ height: '100%' }}>
              <span className="text-[9px] tabular-nums" style={{ color: n > 0 ? 'var(--gold)' : 'rgba(150,160,185,0.35)' }}>{n > 0 ? n : ''}</span>
              <div className="w-full rounded-t" style={{ height: `${Math.max(n > 0 ? 8 : 2, (n / curveMax) * 58)}px`,
                background: n > 0 ? `linear-gradient(180deg, rgb(${GOLD}), rgba(${GOLD},0.45))` : 'rgba(255,255,255,0.06)',
                boxShadow: n > 0 ? `0 0 6px rgba(${GOLD},0.35)` : 'none' }} />
              <span className="text-[9px] tabular-nums" style={{ color: 'var(--text-muted)' }}>{i < 7 ? i : '7+'}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Tipai + retumai */}
      <div className="flex flex-wrap gap-1.5">
        {stats.types.map(([t, n]) => (
          <span key={t} className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', color: 'var(--text-secondary)' }}>{t} <b style={{ color: '#f3ead3' }}>{n}</b></span>
        ))}
        {stats.rars.map(([r, n]) => (
          <span key={r} className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: rarityColor(r) + '14', border: `1px solid ${rarityColor(r)}55`, color: rarityColor(r) }}>{r} <b>{n}</b></span>
        ))}
      </div>

      {/* Kortų sąrašas */}
      <div>
        <SectionLabel>Pagrindinė kaladė · {stats.total}</SectionLabel>
        <div className="space-y-1">
          {stats.main.map((c) => <CardRow key={c.id} c={c} onClick={() => onCard(c)} />)}
        </div>
      </div>
      {stats.side.length > 0 && (
        <div>
          <SectionLabel>Šalutinė kaladė · {stats.side.reduce((a, c) => a + c.qty, 0)}</SectionLabel>
          <div className="space-y-1">
            {stats.side.map((c) => <CardRow key={c.id} c={c} onClick={() => onCard(c)} />)}
          </div>
        </div>
      )}
    </>
  )
}

function StatBox({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div className="rounded-xl px-2 py-2 text-center" style={{ background: `rgba(${accent},0.08)`, border: `1px solid rgba(${accent},0.3)` }}>
      <p className="rvn-disp tabular-nums" style={{ fontSize: 15, fontWeight: 800, color: `rgb(${accent})`, lineHeight: 1.1 }}>{value}</p>
      <p className="text-[9px] mt-0.5" style={{ color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{label}</p>
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-[10px] font-bold uppercase mb-1.5" style={{ color: 'var(--text-muted)', letterSpacing: '0.14em' }}>{children}</p>
}

function CardRow({ c, onClick }: { c: DeckCard; onClick: () => void }) {
  const col = rarityColor(c.rarity)
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

function CardDetail({ c, onClose }: { c: DeckCard; onClose: () => void }) {
  const t = useT()
  const [bad, setBad] = useState(false)
  const col = rarityColor(c.rarity)
  return (
    <div className="fixed inset-0 z-[165] flex items-center justify-center p-5" style={{ background: 'rgba(4,3,8,0.9)' }} onClick={onClose}>
      <div className="relative w-[min(340px,92vw)] rounded-2xl overflow-hidden" style={{ border: `2px solid ${col}`, background: 'linear-gradient(160deg,#15101f,#0a0810)' }} onClick={(e) => e.stopPropagation()}>
        <button onClick={() => { playUiClick(); onClose() }} className="absolute top-2 right-2 z-10 flex items-center justify-center rounded-full" style={{ width: 32, height: 32, background: 'rgba(0,0,0,0.6)', color: '#fff' }} aria-label={t('common.close')}><X className="w-4 h-4" /></button>
        <div className="relative w-full" style={{ aspectRatio: '2.5 / 3.5', maxHeight: '50vh' }}>
          {c.image && !bad
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={c.image} alt={c.name} onError={() => setBad(true)} draggable={false} className="absolute inset-0 w-full h-full object-contain" />
            : <div className="absolute inset-0 flex items-center justify-center text-5xl">🎴</div>}
        </div>
        <div className="p-4 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-base font-bold" style={{ fontFamily: 'var(--rvn-font-display)', color: '#f3ead3' }}>{c.isChampion ? '★ ' : ''}{c.name}</h3>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full shrink-0" style={{ color: col, border: `1px solid ${col}` }}>{c.rarity ?? '—'}</span>
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px]" style={{ color: 'var(--text-muted)' }}>
            <span>🪙 {c.gold}</span>
            {c.atk != null && <span>⚔️ {c.atk}</span>}
            {c.hp != null && <span>❤️ {c.hp}</span>}
            {c.type && <span>· {c.type}</span>}
            <span>· kaladėje ×{c.qty}</span>
          </div>
          {c.effect && <p className="text-xs leading-snug" style={{ color: 'var(--text-secondary)' }}>{c.effect}</p>}
        </div>
      </div>
    </div>
  )
}
