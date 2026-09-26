'use client'

// ══════════════════════════════════════════════════════════════════════════════
// Ravenof Digital — DECK BUILDER v4 (landscape, 2 zonos: ALBUMAS + KALADĖ):
// • KAIRĖ (albumas): kortų albumo grid per visą plotį su kompaktiška filtrų
//   juosta viršuje (paieška / frakcija / tik turimos / universalios / vaizdas).
//   Jei frakcija nepasirinkta — frakcijos pasirinkimo ekranas albumo vietoje.
// • DEŠINĖ (drop zona): kaladės sąrašas su +/-, gyva statistika (aukso kreivė),
//   pavadinimas/matomumas, validacija ir IŠSAUGOTI — visada matomi.
// • Drag & drop: tempk kortą iš albumo ant kaladės panelės dešinėje.
// ══════════════════════════════════════════════════════════════════════════════
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, animate, motion, useMotionValue, useSpring, useTransform, useVelocity } from 'framer-motion'
import { ChevronLeft, Search, Plus, Minus, Lock, Save, Loader2, X, Layers } from 'lucide-react'
import { useDeckBuilderStore } from '@/stores/deckBuilderStore'
import { createClient } from '@/lib/supabase/client'
import { validateDeck, getCopyLimit, isCurseCard, canAddSideCard, NEUTRAL_FACTION_ID, DECK_MIN, DECK_MAX, SIDE_DECK_MAX, formatDeckCount } from '@/lib/deck-validation'
import { costCurve, COST_CURVE_LABELS, displayAvgCost } from '@/lib/cards/cost'
import { ravenofRarityColor as rarityColor, ravenofFactionIcon } from '@/components/digital/ui/RavenofKit'
import { playUiClick, playSuccess, playError, playCardPick, playCardPlace } from '@/lib/ui-sound'
import type { CardWithRelations, Faction, CollectionMap, DeckVisibility } from '@/types'
import { SmartImg } from '@/components/ui/SmartImg'
import { GameCard } from '@/components/ui/GameCard'
import { useT, useContent, useCardI18n } from '@/lib/i18n/react'
import { useDesktopUi } from './ui/useDesktopUi'
import { DT, deskGrid } from './ui/deskTokens'
import { useDialogFocus } from './ui/DeskKit'

const GOLD = '212,163,59'
// hover preview tik įrenginiams su tikra pele (touch emuliuoja mouse eventus,
// bet mouseleave niekada neįvyksta — preview užstrigdavo ekrane)
const HOVER_OK = typeof window !== 'undefined' && !!window.matchMedia?.('(hover: hover) and (pointer: fine)').matches
const GHOST_W = 76
const GHOST_H = Math.round(GHOST_W * 1.4)
const PANEL: React.CSSProperties = { background: 'var(--ravenof-bg-surface)', border: '1px solid var(--ravenof-border-strong)' }

type InitialDeck = {
  id: string; name: string; description: string; factionId: number | null
  visibility: DeckVisibility; entries: { card: CardWithRelations; quantity: number }[]
  sideEntries: { card: CardWithRelations; quantity: number }[]
} | null

type Props = {
  userId: string; cards: CardWithRelations[]; factions: Faction[]; collection: CollectionMap
  initialDeck: InitialDeck; onSaved: () => void; onBack: () => void
}

const IDENTITY: { re: RegExp; lineKey: string }[] = [
  { re: /mirt/i,            lineKey: 'deckBuilder.identity.death' },
  { re: /plėšik|plesik/i,   lineKey: 'deckBuilder.identity.thieves' },
  { re: /vryhiok/i,         lineKey: 'deckBuilder.identity.vryhiok' },
  { re: /demon/i,           lineKey: 'deckBuilder.identity.demons' },
  { re: /inkvizic/i,        lineKey: 'deckBuilder.identity.inquisition' },
  { re: /švies|svies/i,     lineKey: 'deckBuilder.identity.light' },
  { re: /mistik/i,          lineKey: 'deckBuilder.identity.mystic' },
  { re: /ryt/i,             lineKey: 'deckBuilder.identity.east' },
]
const identityFor = (name: string) => IDENTITY.find((x) => x.re.test(name))

/** Per tamsi frakcijos spalva (pvz. Mirties maršas) ikonai pašviesinama link kaulo spalvos, kad būtų matoma. */
function glyphColor(hex?: string | null): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex ?? '')
  if (!m) return '#E8DFCC'
  const n = parseInt(m[1], 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255
  const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255
  if (lum >= 0.35) return `#${m[1]}`
  const k = 0.5, mix = (c: number, t: number) => Math.round(c * (1 - k) + t * k)
  return `rgb(${mix(r, 232)},${mix(g, 223)},${mix(b, 204)})`
}

/** Tikra frakcijos ikona (public/ravenof-ui/factions/<slug>.png), nuspalvinta frakcijos spalva — ne emoji. */
function FactionGlyph({ f, size }: { f: Pick<Faction, 'slug' | 'color_hex'>; size: number }) {
  const url = ravenofFactionIcon(f.slug)
  return (
    <span aria-hidden className="inline-block shrink-0" style={{
      width: size, height: size, background: glyphColor(f.color_hex),
      WebkitMask: `url('${url}') center / contain no-repeat`, mask: `url('${url}') center / contain no-repeat`,
      filter: 'drop-shadow(0 0 6px rgba(0,0,0,.6))',
    }} />
  )
}

export function DigitalDeckBuilder({ userId, cards: cardsRaw, factions, collection, initialDeck, onSaved, onBack }: Props) {
  const t = useT()
  const tc = useContent()
  const cx = useCardI18n()
  // Kortų vertimai (Fazė 6): lokalizuojam sąrašą vieną kartą – visa žemiau
  // esanti paieška/rikiavimas/atvaizdavimas dirba su rodoma kalba.
  const cards = useMemo(() => cardsRaw.map((c) => ({
    ...c,
    name: cx.name(c.id, c.name),
    effect_text: cx.effect(c.id, c.effect_text),
    description: cx.description(c.id, c.description),
    image_url: cx.image(c.id, c.image_url),
  })), [cardsRaw, cx])
  const store = useDeckBuilderStore()
  const { desktop } = useDesktopUi()
  const [q, setQ] = useState('')
  const [showUniversal, setShowUniversal] = useState(true)
  const [preview, setPreview] = useState<CardWithRelations | null>(null)
  const [descOpen, setDescOpen] = useState(false)
  // desktop: pelės hover — plaukiojantis kortos paveikslo preview
  const [hover, setHover] = useState<{ card: CardWithRelations; x: number; y: number; lim?: number; rect?: { left: number; right: number; top: number; bottom: number } } | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [tester, setTester] = useState(false)

  // Testerio/admino statusas: gali statyti kaladės iš VISŲ kortų (net neturimų)
  useEffect(() => {
    createClient().from('profiles').select('role').eq('id', userId).maybeSingle()
      .then(({ data }) => { const r = (data as { role?: string } | null)?.role; setTester(r === 'tester' || r === 'admin') })
  }, [userId])

  useEffect(() => {
    if (initialDeck) store.loadExisting(initialDeck.id, initialDeck.name, initialDeck.description, initialDeck.factionId, initialDeck.visibility, initialDeck.entries, initialDeck.sideEntries ?? [])
    else store.initNew()
    // deps: deck id — „Redaguoti" iš sąrašo perkrauna builder'į su ta kalade
  }, [initialDeck?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), 2200); return () => clearTimeout(t) }, [toast])
  const flash = (m: string, err = false) => { (err ? playError : playUiClick)(); setToast(m) }

  const deckQtyOf = (id: string) => store.entries.find((e) => e.card.id === id)?.quantity ?? 0
  const sideQtyOf = (id: string) => store.sideEntries.find((e) => e.card.id === id)?.quantity ?? 0
  const ownedOf = useCallback((id: string) => tester ? 99 : (collection[id] ?? 0), [tester, collection])
  const total = store.entries.reduce((s, e) => s + e.quantity, 0)
  const sideTotal = store.sideEntries.reduce((s, e) => s + e.quantity, 0)

  // ── Prakeiksmų šoninė kaladė (Demonų frakcija) ────────────────────────────
  // Demonai statomi kaip visi kiti (30–40 kortų pagrindinė kaladė), o PAPILDOMAI
  // gauna iki 20 prakeiksmų šoninėje kaladėje (deck_cards.is_side_deck = true).
  // Mūšyje jos nededamos į savo kaladę — jos įmaišomos priešui (curseEngine).
  const factionName = factions.find((f) => f.id === store.factionId)?.name ?? ''
  const isDemonDeck = /demon/i.test(factionName)
  const canUseSide = isDemonDeck || store.sideEntries.length > 0
  const [mode, setMode] = useState<'main' | 'side'>('main')
  useEffect(() => { if (!canUseSide && mode === 'side') setMode('main') }, [canUseSide, mode])

  const pool = useMemo(() => {
    const needle = q.trim().toLowerCase()
    const side = mode === 'side'
    return cards.filter((c) => {
      // Šoninės kaladės režimu albume rodom TIK prakeiksmus (ir atvirkščiai)
      if (isCurseCard(c) !== side) return false
      if (store.factionId == null) return false
      const isNeutral = c.faction_id === NEUTRAL_FACTION_ID
      if (c.faction_id !== store.factionId && !(showUniversal && isNeutral)) return false
      if (store.ownedOnly && ownedOf(c.id) <= 0) return false
      if (needle && !c.name.toLowerCase().includes(needle)) return false
      return true
    })
  }, [cards, q, mode, store.factionId, store.ownedOnly, showUniversal, ownedOf])

  const canAdd = useCallback((c: CardWithRelations): string | null => {
    const owned = ownedOf(c.id)
    const dq = deckQtyOf(c.id)
    if (dq >= getCopyLimit(c)) return t('deckBuilder.copyLimitReached')
    if (owned <= 0) return t('deckBuilder.notOwned')
    if (dq >= owned) return t('deckBuilder.ownedOnlyN', { count: owned })
    return null
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ownedOf, store.entries])

  // Prakeiksmai — TOKIOS PAT kolekcinės kortos kaip demonų: gaunami iš boosterių,
  // todėl galioja ir nuosavybės riba, ir kopijų limitas, ir 20 kortų riba.
  const canAddSide = useCallback((c: CardWithRelations): string | null => {
    const owned = ownedOf(c.id)
    const sq = sideQtyOf(c.id)
    if (owned <= 0) return t('deckBuilder.notOwned')
    if (sq >= owned) return t('deckBuilder.ownedOnlyN', { count: owned })
    const r = canAddSideCard(c, store.sideEntries)
    return r.ok ? null : (r.reason ?? t('deckBuilder.cannotAdd'))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ownedOf, store.sideEntries])

  /** Prideda kortą į teisingą kaladę: prakeiksmas → šoninė, kita → pagrindinė. */
  const tryAdd = (c: CardWithRelations): boolean => {
    if (isCurseCard(c)) {
      if (!canUseSide) { flash(t('deckBuilder.sideDemonsOnly'), true); return false }
      const whyS = canAddSide(c)
      if (whyS) { flash(whyS, true); return false }
      const rs = store.addSideCard(c)
      if (!rs.ok) { flash(rs.reason ?? t('deckBuilder.cannotAdd'), true); return false }
      return true
    }
    const why = canAdd(c)
    if (why) { flash(why, true); return false }
    const r = store.addCard(c)
    if (!r.ok) { flash(r.reason ?? t('deckBuilder.cannotAdd'), true); return false }
    return true
  }
  const dec = (c: CardWithRelations) => {
    if (isCurseCard(c)) { const sq = sideQtyOf(c.id); if (sq > 0) { playUiClick(); store.setSideQuantity(c.id, sq - 1) } return }
    const dq = deckQtyOf(c.id); if (dq > 0) { playUiClick(); store.setQuantity(c.id, dq - 1) }
  }

  // ── DRAG & DROP (drop zona = dešinė kaladės panelė) ──────────────────────
  const [dragCard, setDragCard] = useState<CardWithRelations | null>(null)
  const [overDrop, setOverDrop] = useState(false)
  const [dropPulse, setDropPulse] = useState(0)
  const ghostX = useMotionValue(0)
  const ghostY = useMotionValue(0)
  const ghostScale = useMotionValue(1)
  const ghostOpacity = useMotionValue(1)
  const ghostSX = useSpring(ghostX, { stiffness: 1400, damping: 80, mass: 0.6 })
  const ghostSY = useSpring(ghostY, { stiffness: 1400, damping: 80, mass: 0.6 })
  const ghostVX = useVelocity(ghostSX)
  const ghostTiltRaw = useTransform(ghostVX, [-1600, 0, 1600], [10, -3, -16])
  const ghostTilt = useSpring(ghostTiltRaw, { stiffness: 260, damping: 22 })
  const dropRef = useRef<HTMLDivElement>(null)
  const pendingRef = useRef<{ card: CardWithRelations; rect: DOMRect; sx: number; sy: number; touch: boolean; timer: number | null; fromDeck: boolean } | null>(null)
  const activeRef = useRef(false)
  const suppressClickRef = useRef(false)
  const dragCardRef = useRef<CardWithRelations | null>(null)

  const hitDrop = (x: number, y: number) => {
    const r = dropRef.current?.getBoundingClientRect()
    return !!r && x >= r.left - 26 && x <= r.right + 8 && y >= r.top - 8 && y <= r.bottom + 8
  }

  const onTouchMoveBlock = useCallback((e: TouchEvent) => { if (activeRef.current) e.preventDefault() }, [])

  const startDrag = useCallback((p: NonNullable<typeof pendingRef.current>, x: number, y: number) => {
    activeRef.current = true
    dragCardRef.current = p.card
    ghostScale.set(0.7); ghostOpacity.set(1)
    ghostX.set(x - GHOST_W / 2); ghostY.set(y - GHOST_H * 0.72)
    ghostSX.jump(x - GHOST_W / 2); ghostSY.jump(y - GHOST_H * 0.72)
    setDragCard(p.card)
    setHover(null)
    animate(ghostScale, 1.06, { type: 'spring', stiffness: 420, damping: 22 })
    playCardPick()
    try { navigator.vibrate?.(14) } catch { /* */ }
  }, [ghostScale, ghostOpacity, ghostX, ghostY, ghostSX, ghostSY])

  const endDragCleanup = useCallback(() => {
    setDragCard(null); setOverDrop(false)
    dragCardRef.current = null
  }, [])

  const onMove = useCallback((e: PointerEvent) => {
    const p = pendingRef.current
    if (!p) return
    const dx = e.clientX - p.sx, dy = e.clientY - p.sy
    if (!activeRef.current) {
      if (p.touch) {
        const adx = Math.abs(dx), ady = Math.abs(dy)
        // horizontalus judesys = drag IŠKART (nereikia laikyti); vertikalus = scroll
        if (adx > 10 && adx > ady * 1.15) { if (p.timer != null) { clearTimeout(p.timer); p.timer = null } startDrag(p, e.clientX, e.clientY) }
        else if (ady > 12 && ady > adx) { if (p.timer != null) { clearTimeout(p.timer); p.timer = null } pendingRef.current = null }
      }
      else if (Math.hypot(dx, dy) > 6) startDrag(p, e.clientX, e.clientY)
      return
    }
    ghostX.set(e.clientX - GHOST_W / 2)
    ghostY.set(e.clientY - GHOST_H * 0.72)
    const hit = hitDrop(e.clientX, e.clientY)
    setOverDrop((prev) => {
      if (prev !== hit) animate(ghostScale, hit ? 1.18 : 1.06, { type: 'spring', stiffness: 500, damping: 24 })
      return hit
    })
  }, [ghostX, ghostY, startDrag, ghostScale])

  const onUp = useCallback((e: PointerEvent) => {
    const p = pendingRef.current
    if (p?.timer != null) clearTimeout(p.timer)
    window.removeEventListener('pointermove', onMove)
    window.removeEventListener('pointerup', onUp)
    window.removeEventListener('pointercancel', onUp)
    window.removeEventListener('touchmove', onTouchMoveBlock)
    const card = dragCardRef.current
    if (activeRef.current && p && card) {
      suppressClickRef.current = true
      setTimeout(() => { suppressClickRef.current = false }, 320)
      const dropped = hitDrop(e.clientX, e.clientY)
      if (p.fromDeck) {
        // vilkimas IŠ kaladės: paleidus už jos ribų — išimam 1 kopiją
        if (!dropped) {
          const st = useDeckBuilderStore.getState()
          const curse = isCurseCard(card)
          const dq = curse
            ? (st.sideEntries.find((x) => x.card.id === card.id)?.quantity ?? 0)
            : (st.entries.find((x) => x.card.id === card.id)?.quantity ?? 0)
          if (dq > 0) {
            playCardPlace()
            if (curse) st.setSideQuantity(card.id, dq - 1); else st.setQuantity(card.id, dq - 1)
            try { navigator.vibrate?.(12) } catch { /* */ }
          }
          animate(ghostScale, 0.2, { duration: 0.22 })
          animate(ghostOpacity, 0, { duration: 0.24 })
          window.setTimeout(endDragCleanup, 260)
        } else {
          animate(ghostX, p.rect.left + p.rect.width / 2 - GHOST_W / 2, { type: 'spring', stiffness: 340, damping: 26 })
          animate(ghostY, p.rect.top + p.rect.height / 2 - GHOST_H / 2, { type: 'spring', stiffness: 340, damping: 26 })
          animate(ghostScale, 0.6, { duration: 0.22 })
          animate(ghostOpacity, 0, { duration: 0.24, delay: 0.06 })
          window.setTimeout(endDragCleanup, 320)
        }
        pendingRef.current = null
        activeRef.current = false
        return
      }
      const ok = dropped ? tryAdd(card) : false
      if (dropped && ok) {
        playCardPlace()
        try { navigator.vibrate?.([10, 30, 18]) } catch { /* */ }
        setDropPulse((k) => k + 1)
        const r = dropRef.current?.getBoundingClientRect()
        const tx = r ? r.left + r.width * 0.5 - GHOST_W / 2 : ghostX.get()
        const ty = r ? r.top + r.height * 0.35 - GHOST_H / 2 : ghostY.get()
        animate(ghostX, tx, { type: 'spring', stiffness: 520, damping: 34 })
        animate(ghostY, ty, { type: 'spring', stiffness: 520, damping: 34 })
        animate(ghostScale, 0.22, { duration: 0.24 })
        animate(ghostOpacity, 0, { duration: 0.26 })
        window.setTimeout(endDragCleanup, 300)
      } else {
        // spyruokliškai grįžta į vietą
        animate(ghostX, p.rect.left + p.rect.width / 2 - GHOST_W / 2, { type: 'spring', stiffness: 340, damping: 26 })
        animate(ghostY, p.rect.top + p.rect.height / 2 - GHOST_H / 2, { type: 'spring', stiffness: 340, damping: 26 })
        animate(ghostScale, 0.6, { duration: 0.22 })
        animate(ghostOpacity, 0, { duration: 0.24, delay: 0.06 })
        window.setTimeout(endDragCleanup, 320)
      }
    }
    pendingRef.current = null
    activeRef.current = false
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onMove, onTouchMoveBlock, endDragCleanup, ghostX, ghostY, ghostScale, ghostOpacity])

  const makeDragProps = (card: CardWithRelations, fromDeck: boolean) => ({
    onPointerDown: (e: React.PointerEvent) => {
      if (!fromDeck && ownedOf(card.id) <= 0) return
      if (dragCard) return
      setHover(null)
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
      const touch = e.pointerType === 'touch'
      const p = { card, rect, sx: e.clientX, sy: e.clientY, touch, timer: null as number | null, fromDeck }
      pendingRef.current = p
      if (touch) p.timer = window.setTimeout(() => { if (pendingRef.current === p && !activeRef.current) startDrag(p, p.sx, p.sy) }, 160)
      window.addEventListener('pointermove', onMove)
      window.addEventListener('pointerup', onUp)
      window.addEventListener('pointercancel', onUp)
      window.addEventListener('touchmove', onTouchMoveBlock, { passive: false })
    },
    onClickCapture: (e: React.MouseEvent) => { if (suppressClickRef.current) { e.preventDefault(); e.stopPropagation() } },
  })
  const dragProps = (card: CardWithRelations) => makeDragProps(card, false)
  const dragPropsDeck = (card: CardWithRelations) => makeDragProps(card, true)

  // ── Validacija / summary ─────────────────────────────────────────────────
  const warnings = validateDeck(store.entries, store.factionId, store.name)
  const errors = warnings.filter((w) => w.type === 'error')
  const canSave = errors.length === 0 && !saving
  const reason = !store.factionId ? t('deckBuilder.reasonPickFaction')
    : !store.name.trim() ? t('deckBuilder.reasonName')
    : total < DECK_MIN ? t('deckBuilder.reasonMissing', { count: DECK_MIN - total })
    : total > DECK_MAX ? t('deckBuilder.reasonTooMany', { total, max: DECK_MAX })
    : errors.length ? errors[0].message : null

  const save = async () => {
    if (!canSave) { flash(reason ?? t('deckBuilder.invalidDeck'), true); return }
    setSaving(true)
    const supabase = createClient()
    const avg = total === 0 ? 0 : Math.round(store.entries.reduce((s, e) => s + (e.card.gold_cost ?? 0) * e.quantity, 0) / total)
    try {
      let id = store.deckId
      if (id) {
        const { error } = await supabase.from('decks').update({ name: store.name.trim(), description: store.description.trim() || null, faction_id: store.factionId, visibility: store.visibility, card_count: total, avg_gold_cost: avg, updated_at: new Date().toISOString() }).eq('id', id).eq('user_id', userId)
        if (error) throw error
      } else {
        const { data, error } = await supabase.from('decks').insert({ user_id: userId, name: store.name.trim(), description: store.description.trim() || null, faction_id: store.factionId, visibility: store.visibility, card_count: total, avg_gold_cost: avg }).select('id').single()
        if (error) throw error
        id = data.id
      }
      if (id) {
        await supabase.from('deck_cards').delete().eq('deck_id', id)
        // SVARBU: išsaugom IR prakeiksmų šoninę kaladę (is_side_deck), kitaip
        // ji būtų ištrinta kiekvieną kartą redaguojant kaladę /digital builder'yje.
        const rows = [
          ...store.entries.map((e) => ({ deck_id: id!, card_id: e.card.id, quantity: e.quantity, is_side_deck: false })),
          ...store.sideEntries.map((e) => ({ deck_id: id!, card_id: e.card.id, quantity: e.quantity, is_side_deck: true })),
        ]
        if (rows.length) { const { error } = await supabase.from('deck_cards').insert(rows); if (error) throw error }
        store.markSaved(id)
      }
      playSuccess(); setToast(t('deckBuilder.saved')); setTimeout(onSaved, 700)
    } catch (err) {
      flash(t('deckBuilder.saveFailed', { msg: (err as { message?: string })?.message ?? '' }), true)
    } finally { setSaving(false) }
  }

  const dragGhostCol = dragCard ? rarityColor(dragCard.rarity?.name) : '#f0b429'
  const selFaction = factions.find((f) => f.id === store.factionId)

  const pickFaction = (f: Faction) => {
    playUiClick()
    if (f.id !== store.factionId && store.entries.length && !window.confirm(t('deckBuilder.factionChangeConfirm'))) return
    store.setFaction(f.id === store.factionId ? null : f.id)
  }

  // ── Statistika dešinei panelei ────────────────────────────────────────────
  const stats = useMemo(() => {
    const golds = store.entries.flatMap((e) => Array(e.quantity).fill(e.card.gold_cost ?? 0) as number[])
    const avg = golds.length ? golds.reduce((a, b) => a + b, 0) / golds.length : 0
    // KANONINĖ kainos kreivė — DB gold_cost šimtais (200–700) → 1..8+ stulpeliai
    const curve = costCurve(store.entries.map((e) => ({ gold: e.card.gold_cost, qty: e.quantity })))
    let champions = 0
    for (const e of store.entries) if (e.card.is_champion) champions += e.quantity
    return { avg, curve, champions }
  }, [store.entries])
  // Builder'yje viršutinė profilio juosta (ir nav rail) slepiama — kortų sąrašui daugiau aukščio.
  // TIK mobile: desktop'e vietos pakanka, rail ir antraštė lieka matomi (navigacija neišnyksta).
  useEffect(() => {
    if (desktop) return
    document.body.dataset.rvnHideHeader = '1'
    return () => { delete document.body.dataset.rvnHideHeader }
  }, [desktop])
  // Desktop: frakcijos pasirinkimo žingsnis su tuščia kalade — be dešinės panelės (kompaktiškas centruotas grid)
  const deskPickOnly = desktop && store.factionId == null && store.entries.length === 0 && store.sideEntries.length === 0
  // Hover preview dešinė riba — niekada neuždengia kaladės panelės (desktop)
  const hoverLimit = () => {
    const r = desktop ? dropRef.current?.getBoundingClientRect() : null
    return r ? r.left - 12 : window.innerWidth - 8
  }
  const deckTitle = store.name.trim() || (store.deckId ? t('decks.title') : t('decks.my.newDeck'))
  const backBtnD = (
    <button onClick={() => { playUiClick(); onBack() }} className="rvn-dlg-close ravenof-press" style={{ width: DT.ctl, height: DT.ctl, color: 'var(--ravenof-gold)', borderColor: `rgba(${GOLD},0.4)` }} aria-label={t('deckBuilder.back')}><ChevronLeft size={22} /></button>
  )
  const testerBadge = tester && <span className="font-bold px-1 rounded-full" style={{ fontSize: desktop ? 12 : 8, padding: desktop ? '1px 6px' : undefined, background: 'rgba(139,92,246,0.2)', border: '1px solid rgba(139,92,246,0.55)', color: '#c4b5fd' }}>TESTER</span>

  const curveMax = Math.max(1, ...stats.curve)
  const sortedEntries = useMemo(() => [...store.entries].sort((a, b) => (a.card.gold_cost ?? 0) - (b.card.gold_cost ?? 0) || a.card.name.localeCompare(b.card.name)), [store.entries])
  const sortedSide = useMemo(() => [...store.sideEntries].sort((a, b) => (a.card.gold_cost ?? 0) - (b.card.gold_cost ?? 0) || a.card.name.localeCompare(b.card.name)), [store.sideEntries])
  const shownEntries = mode === 'side' ? sortedSide : sortedEntries

  return (
    <div className="ravenof-body ravenof-in h-full max-h-full flex flex-col min-h-0 overflow-hidden" style={{ gap: desktop ? DT.sp.lg : 'clamp(4px,1vh,8px)' }}>
      {/* DESKTOP antraštė: ‹ atgal · pavadinimas · frakcija */}
      {desktop && (
        <div className="shrink-0 flex items-center" style={{ gap: DT.sp.lg, minHeight: 48, paddingTop: DT.sp.xs }}>
          {backBtnD}
          <div className="flex-1 min-w-0">
            <div className="rvn-d-label">{t('decks.title')} · {t('decks.tabs.builder')}</div>
            <h1 className="rvn-d-h1 truncate" title={deckTitle} style={{ marginTop: 2 }}>{deckTitle}</h1>
          </div>
          {selFaction && (
            <span className="shrink-0 inline-flex items-center" style={{ gap: 8, minHeight: 36, padding: '0 14px', font: `700 14px var(--ravenof-font-display)`, letterSpacing: '.04em', color: selFaction.color_hex ?? 'var(--ravenof-gold)', border: `1px solid ${selFaction.color_hex ? selFaction.color_hex + '88' : `rgba(${GOLD},0.4)`}`, background: 'rgba(10,8,16,0.7)' }}>
              <FactionGlyph f={selFaction} size={20} />{tc('faction', selFaction.id, 'name', selFaction.name)}
            </span>
          )}
          {testerBadge}
        </div>
      )}
      <div className={`flex-1 min-h-0 grid ${desktop ? '' : 'gap-2'}`} style={{ gridTemplateColumns: desktop ? (deskPickOnly ? 'minmax(0,1fr)' : `minmax(0,1fr) ${DT.side.deck}px`) : 'minmax(0,2.55fr) minmax(220px,1.05fr)', gridTemplateRows: 'minmax(0, 1fr)', gap: desktop ? DT.sp.lg : undefined }}>

        {/* ── KAIRĖ: ALBUMAS (filtrų juosta + kortų grid) ── */}
        <section className={`flex flex-col min-h-0 overflow-hidden ${desktop ? '' : 'p-2.5'}`} style={desktop ? (deskPickOnly ? { padding: 0 } : { ...PANEL, padding: DT.sp.lg }) : PANEL}>
          {store.factionId == null && desktop ? (
            /* DESKTOP frakcijos pasirinkimas: kompaktiškas centruotas grid (≤1100px), 260–320px plytelės */
            <div className="flex-1 min-h-0 overflow-y-auto ravenof-scroll">
              <div className="flex flex-col" style={{ maxWidth: 1100, margin: '0 auto', padding: `${DT.sp.xl}px ${DT.sp.xl}px`, ...PANEL }}>
                <h2 className="rvn-d-h2" style={{ textAlign: 'center', textTransform: 'uppercase', color: 'var(--ravenof-gold)' }}>{t('deckBuilder.pickDeckFaction')}</h2>
                <div style={{ ...deskGrid([260, 320], DT.sp.lg), marginTop: DT.sp.xl }} data-testid="faction-grid">
                  {factions.filter((f) => f.id !== NEUTRAL_FACTION_ID).map((f) => {
                    const id = identityFor(f.name)
                    const on = f.id === store.factionId
                    return (
                      <button key={f.id} onClick={() => pickFaction(f)} className="ravenof-press flex items-center text-left"
                        style={{ minHeight: 96, gap: DT.sp.lg, padding: `${DT.sp.lg}px ${DT.sp.lg}px`, cursor: 'pointer', background: on ? `rgba(${GOLD},0.1)` : 'rgba(10,8,16,0.85)', border: `1.5px solid ${f.color_hex ? f.color_hex + '77' : `rgba(${GOLD},0.3)`}`, boxShadow: f.color_hex ? `inset 0 0 28px ${f.color_hex}14` : undefined }}>
                        <span className="shrink-0 flex items-center justify-center" style={{ width: 52, height: 52, border: `1px solid ${f.color_hex ? f.color_hex + '55' : `rgba(${GOLD},0.3)`}`, background: 'rgba(0,0,0,0.35)' }}><FactionGlyph f={f} size={34} /></span>
                        <span className="min-w-0 flex flex-col" style={{ gap: 4 }}>
                          <span className="rvn-clamp2" style={{ font: `700 ${DT.fs.h3 + 1}px/1.2 var(--ravenof-font-display)`, color: f.color_hex ?? '#f3ead3', letterSpacing: '.03em' }}>{tc('faction', f.id, 'name', f.name)}</span>
                          {id && <span className="rvn-d-help" style={{ lineHeight: 1.35 }}>{t(id.lineKey)}</span>}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          ) : store.factionId == null ? (
            <div className="flex-1 min-h-0 flex flex-col">
              <div className="relative mb-2 shrink-0">
                <button onClick={() => { playUiClick(); onBack() }} className="rvn-press absolute left-0 top-1/2 -translate-y-1/2 flex items-center justify-center rounded-lg" style={{ width: 32, height: 32, background: 'rgba(10,8,16,0.9)', border: `1px solid rgba(${GOLD},0.3)`, color: 'var(--ravenof-gold)' }} aria-label={t('deckBuilder.back')}><ChevronLeft className="w-5 h-5" /></button>
                <div className="rvn-disp font-extrabold uppercase tracking-wide text-center" style={{ fontSize: 'clamp(11px,1.7vh,14px)', color: 'var(--ravenof-gold)' }}>{t('deckBuilder.pickDeckFaction')}</div>
              </div>
              <div className="flex-1 min-h-0 overflow-y-auto grid grid-cols-2 gap-2 content-start">
                {factions.filter((f) => f.id !== NEUTRAL_FACTION_ID).map((f) => {
                  const id = identityFor(f.name)
                  return (
                    <button key={f.id} onClick={() => pickFaction(f)} className="rvn-press flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left"
                      style={{ minHeight: 56, background: 'rgba(10,8,16,0.85)', border: `1.5px solid ${f.color_hex ? f.color_hex + '66' : `rgba(${GOLD},0.25)`}` }}>
                      <span className="shrink-0 flex items-center justify-center" style={{ width: 30, height: 30 }}><FactionGlyph f={f} size={26} /></span>
                      <span className="min-w-0">
                        <span className="block font-bold leading-tight truncate" style={{ fontSize: 13, color: f.color_hex ?? '#f3ead3', fontFamily: 'var(--rvn-font-display)' }}>{tc('faction', f.id, 'name', f.name)}</span>
                        <span className="block leading-tight truncate" style={{ fontSize: 10, color: 'var(--ravenof-text-secondary)' }}>{id ? t(id.lineKey) : ''}</span>
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          ) : (
            <>
              {/* Filtrų juosta (back čia — atskiros antraštės eilutės nebėra, plotas kortoms) */}
              <div className={`shrink-0 flex items-center flex-wrap ${desktop ? '' : 'gap-1.5 mb-2'}`} style={desktop ? { gap: DT.sp.sm, marginBottom: DT.sp.md } : undefined}>
                {!desktop && <button onClick={() => { playUiClick(); onBack() }} className="rvn-press flex items-center justify-center rounded-lg shrink-0" style={{ width: 32, height: 32, background: 'rgba(10,8,16,0.9)', border: `1px solid rgba(${GOLD},0.3)`, color: 'var(--ravenof-gold)' }} aria-label={t('deckBuilder.back')}><ChevronLeft className="w-5 h-5" /></button>}
                <div className="relative flex-1" style={{ minWidth: desktop ? 220 : 120 }}>
                  <Search className={`absolute top-1/2 -translate-y-1/2 ${desktop ? 'left-3' : 'left-2.5'}`} style={{ width: desktop ? 17 : 13, height: desktop ? 17 : 13, color: 'var(--ravenof-text-secondary)' }} />
                  <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('deckBuilder.searchAlbum')} className="w-full outline-none rounded-lg"
                    style={{ minHeight: desktop ? DT.ctl : 32, paddingLeft: desktop ? 38 : 28, paddingRight: 8, fontSize: desktop ? DT.fs.body : 11.5, background: 'rgba(10,8,16,0.9)', border: `1px solid rgba(${GOLD},0.3)`, color: 'var(--ravenof-text-primary)' }} />
                </div>
                <select value={store.factionId ?? ''} onChange={(e) => { const f = factions.find((x) => x.id === Number(e.target.value)); if (f) pickFaction(f) }}
                  className="rounded-lg outline-none" style={{ minHeight: desktop ? DT.ctl : 32, maxWidth: desktop ? 260 : 150, fontSize: desktop ? DT.fs.body : 11, padding: desktop ? '0 10px' : '0 6px', background: 'rgba(10,8,16,0.9)', border: `1px solid ${selFaction?.color_hex ? selFaction.color_hex + '88' : `rgba(${GOLD},0.3)`}`, color: selFaction?.color_hex ?? 'var(--text-primary)' }}>
                  {factions.filter((f) => f.id !== NEUTRAL_FACTION_ID).map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
                </select>
                <button onClick={() => { playUiClick(); store.setOwnedOnly(!store.ownedOnly) }} aria-pressed={store.ownedOnly} className={`rvn-press rounded-lg font-semibold ${desktop ? 'px-4' : 'px-2'}`}
                  style={{ minHeight: desktop ? DT.ctl : 32, fontSize: desktop ? 13 : 10, background: store.ownedOnly ? 'rgba(79,158,82,0.16)' : 'rgba(10,8,16,0.8)', border: `1px solid ${store.ownedOnly ? 'rgba(79,158,82,0.55)' : `rgba(${GOLD},0.25)`}`, color: store.ownedOnly ? '#7fbf82' : 'var(--text-muted)' }}>
                  {t('deckBuilder.ownedOnly')}
                </button>
                <button onClick={() => { playUiClick(); setShowUniversal((v) => !v) }} aria-pressed={showUniversal} className={`rvn-press rounded-lg font-semibold ${desktop ? 'px-4' : 'px-2'}`}
                  style={{ minHeight: desktop ? DT.ctl : 32, fontSize: desktop ? 13 : 10, background: showUniversal ? 'rgba(96,165,250,0.16)' : 'rgba(10,8,16,0.8)', border: `1px solid ${showUniversal ? 'rgba(96,165,250,0.55)' : `rgba(${GOLD},0.25)`}`, color: showUniversal ? '#93c5fd' : 'var(--text-muted)' }}>
                  {t('deckBuilder.universal')}
                </button>
              </div>

              {/* Kortų albumo GRID (tokios pat plytelės kaip Kolekcijoje: kortos pav.,
                  retumo švytėjimas, ×turima; papildomai — kaina, ×kaladėje ir [+]):
                  hover (pelė) = plaukiojantis didelis pav.; tap = peržiūra su Pridėti;
                  palaikyk+tempk = drag į kaladę; [+] = greitas pridėjimas. */}
              {pool.length === 0 ? (
                <p className="flex-1 flex items-center justify-center text-center text-sm" style={{ fontSize: desktop ? DT.fs.body : undefined, color: 'var(--ravenof-text-secondary)' }}>{t('deckBuilder.noCards')}</p>
              ) : (
                <div className="flex-1 min-h-0 overflow-y-auto grid pr-0.5 ravenof-scroll" style={desktop ? { ...deskGrid(DT.card.builder, DT.sp.md), paddingRight: DT.sp.xs, paddingTop: 2 } : { gridTemplateColumns: 'repeat(auto-fill, minmax(104px, 1fr))', gap: 8, alignContent: 'start' }} data-testid="album-grid">
                  {pool.map((c) => (
                    <AlbumTile key={c.id} desktop={desktop} c={c} owned={ownedOf(c.id)} deckQty={isCurseCard(c) ? sideQtyOf(c.id) : deckQtyOf(c.id)} dragging={dragCard?.id === c.id}
                      dragProps={dragProps(c)}
                      onAdd={() => tryAdd(c)}
                      onPreview={() => { playUiClick(); setPreview(c) }}
                      onHover={(x, y, rect) => setHover((h) => (desktop && h?.card === c && h.rect ? h : { card: c, x, y, lim: hoverLimit(), rect }))}
                      onHoverEnd={() => setHover(null)} />
                  ))}
                </div>
              )}
            </>
          )}
        </section>

        {/* ── DEŠINĖ: kaladė (drop zona) + statistika + išsaugoti ── */}
        {!deskPickOnly && <motion.section ref={dropRef} key={dropPulse}
          initial={dropPulse > 0 ? { scale: 1.02 } : false}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 380, damping: 16 }}
          className={`flex flex-col min-h-0 overflow-hidden ${desktop ? '' : 'p-2.5'}`}
          style={{
            height: '100%', maxHeight: '100%',
            ...PANEL,
            ...(desktop ? { padding: DT.sp.lg } : null),
            border: `1.5px solid rgba(${GOLD},${dragCard ? (overDrop ? 1 : 0.65) : 0.22})`,
            boxShadow: overDrop ? `0 0 26px rgba(${GOLD},0.5), inset 0 0 40px rgba(0,0,0,0.5)` : dragCard ? `0 0 14px rgba(${GOLD},0.3), inset 0 0 40px rgba(0,0,0,0.5)` : 'inset 0 0 40px rgba(0,0,0,0.5)',
            transition: 'box-shadow .15s ease, border-color .15s ease',
          }}>
          <div className={`flex items-center justify-between gap-2 shrink-0 ${desktop ? 'flex-wrap mb-3' : 'mb-1.5'}`}>
            {canUseSide ? (
              /* Demonai: pagrindinė kaladė + prakeiksmų šoninė kaladė (iki 20) */
              <span className="flex items-center gap-1 min-w-0">
                {([['main', t('deckBuilder.tabMain'), `${total}`], ['side', t('deckBuilder.tabSide'), `${sideTotal}`]] as const).map(([k, label, n]) => {
                  const on = mode === k
                  return (
                    <button key={k} onClick={() => { playUiClick(); setMode(k as 'main' | 'side') }} aria-pressed={on} className={`rvn-press rounded-lg font-bold inline-flex items-center ${desktop ? 'px-3 gap-1.5' : 'px-2 gap-1'}`}
                      style={{ minHeight: desktop ? DT.ctlSm : 26, fontSize: desktop ? 12 : 10, letterSpacing: '.04em', textTransform: 'uppercase',
                        background: on ? `rgba(${GOLD},0.9)` : 'rgba(10,8,16,0.8)', color: on ? '#1a0f04' : 'var(--ravenof-text-secondary)',
                        border: `1px solid rgba(${GOLD},${on ? 0.9 : 0.25})`, fontFamily: 'var(--rvn-font-display)' }}>
                      {k === 'main' ? <Layers className="w-3 h-3" /> : <span style={{ fontSize: 11 }}>🕸</span>}{label}
                      <span className="tabular-nums" style={{ opacity: .85 }}>{n}</span>
                    </button>
                  )
                })}
                {!desktop && testerBadge}
              </span>
            ) : (
              <span className="rvn-disp font-extrabold uppercase inline-flex items-center gap-1.5" style={{ fontSize: desktop ? 15 : 'clamp(10px,1.5vh,13px)', color: 'var(--ravenof-gold)', letterSpacing: '0.06em' }}>
                <Layers className={desktop ? 'w-4 h-4' : 'w-3.5 h-3.5'} /> {t('deckBuilder.tabMain')}
                {!desktop && testerBadge}
              </span>
            )}
            {mode === 'side'
              ? <span className="tabular-nums rvn-disp font-bold" style={{ fontSize: desktop ? 14 : 11, color: sideTotal > 0 && sideTotal <= SIDE_DECK_MAX ? '#c4b5fd' : 'var(--gold)' }}>{sideTotal}/{SIDE_DECK_MAX}</span>
              : <span className="tabular-nums rvn-disp font-bold" style={{ fontSize: desktop ? 13 : 11, color: total >= DECK_MIN && total <= DECK_MAX ? '#7fbf82' : 'var(--gold)' }}>{formatDeckCount(total)} · 🪙 {displayAvgCost(stats.avg).toFixed(1)}{stats.champions > 0 ? ` · ★${stats.champions}` : ''}</span>}
          </div>

          {/* KOMPAKTU: vardas + matomumo ikona + ✎ vienoje eilėje — SĄRAŠUI maksimalus aukštis */}
          <div className={`flex items-center shrink-0 ${desktop ? 'gap-2 mb-2' : 'gap-1.5 mb-1.5'}`}>
            <input value={store.name} onChange={(e) => store.setName(e.target.value)} placeholder={t('deckBuilder.deckNamePlaceholder')} aria-label={t('deckBuilder.deckNamePlaceholder')}
              className={`flex-1 min-w-0 rounded-lg font-semibold outline-none ${desktop ? 'px-3' : 'px-2.5'}`} style={{ minHeight: desktop ? DT.ctl : 32, fontSize: desktop ? DT.fs.body : 12, background: 'rgba(10,8,16,0.9)', border: `1px solid ${store.name.trim() ? `rgba(${GOLD},0.3)` : 'rgba(180,68,79,0.6)'}`, color: 'var(--ravenof-text-primary)', fontFamily: 'var(--rvn-font-display)' }} />
            <button onClick={() => { playUiClick(); store.setVisibility((store.visibility === 'private' ? 'public' : 'private') as DeckVisibility) }}
              title={store.visibility === 'private' ? t('deckBuilder.privateHint') : t('deckBuilder.publicHint')}
              aria-label={store.visibility === 'private' ? t('deckBuilder.privateHint') : t('deckBuilder.publicHint')}
              className="rvn-press shrink-0 rounded-lg flex items-center justify-center" style={{ width: desktop ? DT.ctl : 32, height: desktop ? DT.ctl : 32, fontSize: desktop ? 18 : 14, background: `rgba(${GOLD},0.12)`, border: `1px solid rgba(${GOLD},0.4)` }}>
              {store.visibility === 'private' ? '🔒' : '🌐'}
            </button>
            <button onClick={() => { playUiClick(); setDescOpen((v) => !v) }} title={t('deckBuilder.description')} aria-label={t('deckBuilder.description')} aria-expanded={descOpen}
              className="rvn-press shrink-0 rounded-lg flex items-center justify-center" style={{ width: desktop ? DT.ctl : 32, height: desktop ? DT.ctl : 32, fontSize: desktop ? 17 : 13, background: descOpen || store.description ? `rgba(${GOLD},0.18)` : 'rgba(10,8,16,0.85)', border: `1px solid rgba(${GOLD},0.3)`, color: 'var(--ravenof-gold)' }}>✎</button>
          </div>

          {descOpen && (
            <input value={store.description} onChange={(e) => store.setDescription(e.target.value)} placeholder={t('deckBuilder.descriptionPlaceholder')} autoFocus
              className={`w-full rounded-lg outline-none shrink-0 ${desktop ? 'px-3 mb-2' : 'px-2.5 mb-1.5'}`} style={{ minHeight: desktop ? DT.ctl : 28, fontSize: desktop ? 14 : 10.5, background: 'rgba(10,8,16,0.75)', border: `1px solid rgba(${GOLD},0.18)`, color: 'var(--ravenof-text-secondary)' }} />
          )}

          {/* Kaladės sąrašas — min-h-0 LEIDŽIA trauktis (kitaip pilna kaladė išstumia
              Išsaugoti už panelės), o inline minHeight:96 garantuoja, kad nesusitrauks iki 0 */}
          <div className="flex-1 min-h-0 overflow-y-auto" style={{ minHeight: 56, overscrollBehavior: 'contain', scrollbarGutter: 'stable' }}>
            {shownEntries.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center gap-1.5 text-center px-2" style={{ border: `1.5px dashed rgba(${GOLD},${dragCard ? 0.7 : 0.25})`, borderRadius: 10 }}>
                <Layers className={desktop ? 'w-7 h-7' : 'w-5 h-5'} style={{ color: `rgba(${GOLD},0.6)` }} />
                <p style={{ fontSize: desktop ? DT.fs.help : 10.5, color: 'var(--ravenof-text-secondary)', lineHeight: 1.35 }}>{dragCard ? t('deckBuilder.dropHere') : mode === 'side' ? t('deckBuilder.sideHint', { max: SIDE_DECK_MAX }) : t('deckBuilder.dragHint')}</p>
              </div>
            ) : (
              <div className={desktop ? 'space-y-1.5' : 'space-y-1'}>
                <AnimatePresence initial={false}>
                  {shownEntries.map((e) => {
                    const col = rarityColor(e.card.rarity?.name)
                    return (
                      <motion.div key={e.card.id} layout initial={{ opacity: 0, x: -14 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 14, height: 0, marginBottom: 0 }} transition={{ duration: 0.18 }}
                        {...dragPropsDeck(e.card)}
                        className={`flex items-center rounded-lg select-none touch-pan-y ${desktop ? 'gap-2 px-2 py-1.5' : 'gap-1.5 px-1.5 py-1'}`}
                        style={{ background: `linear-gradient(90deg, ${col}26 0%, rgba(10,8,16,0.85) 55%)`, border: `1px solid ${col}44`, borderLeft: `3px solid ${col}`, opacity: dragCard?.id === e.card.id ? 0.35 : 1, transition: 'opacity .15s' }}>
                        <span className="flex items-center justify-center rounded-full shrink-0 tabular-nums" style={{ width: desktop ? 24 : 17, height: desktop ? 24 : 17, fontSize: desktop ? 11.5 : 9, fontWeight: 800, background: `rgba(${GOLD},0.9)`, color: '#1a0f04' }}>{e.card.gold_cost}</span>
                        <button onClick={() => { playUiClick(); setPreview(e.card) }} className="flex-1 min-w-0 text-left">
                          <span className="block font-semibold truncate" title={desktop ? e.card.name : undefined} style={{ fontSize: desktop ? 14 : 10.5, color: 'var(--ravenof-text-primary)' }}>{e.card.is_champion ? '★ ' : ''}{e.card.name}</span>
                        </button>
                        <button onClick={() => dec(e.card)} className="rvn-press flex items-center justify-center rounded-md shrink-0" style={{ width: desktop ? 32 : 24, height: desktop ? 32 : 24, background: 'rgba(180,68,79,0.14)', border: '1px solid rgba(180,68,79,0.4)', color: '#c65563' }} aria-label={t('deckBuilder.less')}><Minus className={desktop ? 'w-4 h-4' : 'w-3 h-3'} /></button>
                        <span className="font-bold tabular-nums text-center shrink-0" style={{ width: desktop ? 28 : 18, fontSize: desktop ? 14 : 10.5, color: 'var(--ravenof-gold)' }}>×{e.quantity}</span>
                        <button onClick={() => tryAdd(e.card)} className="rvn-press flex items-center justify-center rounded-md shrink-0" style={{ width: desktop ? 32 : 24, height: desktop ? 32 : 24, background: 'rgba(79,158,82,0.14)', border: '1px solid rgba(79,158,82,0.45)', color: '#7fbf82' }} aria-label={t('deckBuilder.more')}><Plus className={desktop ? 'w-4 h-4' : 'w-3 h-3'} /></button>
                      </motion.div>
                    )
                  })}
                </AnimatePresence>
              </div>
            )}
          </div>

          {/* Statistika PO kaladės sąrašo: aukso kreivė + suvestinė */}
          <div className={`shrink-0 rounded-lg ${desktop ? 'px-2.5 pt-2 pb-1.5 mt-3' : 'px-1.5 pt-1 pb-0.5 mt-1.5'}`} style={{ background: 'rgba(10,8,16,0.6)', border: `1px solid rgba(${GOLD},0.15)` }}>
            <div className={`flex items-end ${desktop ? 'gap-1' : 'gap-0.5'}`} style={{ height: desktop ? 64 : 'clamp(14px,3.4vh,34px)' }}>
              {stats.curve.map((n, i) => (
                <div key={i} className="flex-1 flex flex-col items-center justify-end" style={{ height: '100%' }}>
                  <motion.div className="w-full rounded-t" animate={{ height: Math.max(n > 0 ? 4 : 1.5, (n / curveMax) * (desktop ? 42 : 24)) }} transition={{ type: 'spring', stiffness: 320, damping: 26 }}
                    style={{ background: n > 0 ? `linear-gradient(180deg, #ffe28c, rgb(${GOLD}) 40%, rgba(${GOLD},0.4))` : 'rgba(255,255,255,0.06)' }} />
                  <span className="tabular-nums" style={{ fontSize: desktop ? DT.fs.label : 7.5, color: 'var(--ravenof-text-secondary)' }}>{COST_CURVE_LABELS[i]}</span>
                </div>
              ))}
            </div>
            <div className={`flex justify-between px-0.5 pb-0.5 ${desktop ? 'pt-1.5' : ''}`} style={{ fontSize: desktop ? 13 : 8.5, color: 'var(--ravenof-text-secondary)' }}>
              <span>{t('deckBuilder.avgShort')} <b style={{ color: 'var(--ravenof-gold)' }}>{displayAvgCost(stats.avg).toFixed(1)}</b></span>
              <span>{t('deckBuilder.championsShort')} <b style={{ color: '#c4b5fd' }}>{stats.champions}</b></span>
              <span>Σ <b style={{ color: total >= DECK_MIN && total <= DECK_MAX ? '#7fbf82' : '#f3ead3' }}>{total}</b></span>
            </div>
          </div>

          {/* Validacija + išsaugoti — visada matomi (safe-area, niekada po nav) */}
          <div className={`shrink-0 relative ${desktop ? 'pt-3 space-y-2' : 'pt-1.5 space-y-1.5'}`} data-testid="builder-actions"
            style={{ paddingBottom: 'max(2px, env(safe-area-inset-bottom))', zIndex: 2, minHeight: 56, background: 'linear-gradient(0deg, rgba(12,9,18,0.98) 75%, transparent)' }}>
            <p className={desktop ? 'text-center' : 'truncate text-center'} role="status" style={{ fontSize: desktop ? DT.fs.help : 10, lineHeight: desktop ? 1.35 : 1.2, color: reason ? (desktop ? '#e0707c' : '#c65563') : '#7fbf82' }}>{reason ?? t('deckBuilder.deckValid')}</p>
            <button onClick={save} disabled={!canSave} className="rvn-press w-full flex items-center justify-center gap-1.5 rounded-xl font-bold disabled:opacity-40"
              style={{ minHeight: desktop ? DT.cta : 'clamp(36px,6vh,44px)', fontSize: desktop ? 14 : 12, letterSpacing: desktop ? '.08em' : undefined, background: canSave ? `rgba(${GOLD},0.92)` : 'rgba(255,255,255,0.06)', color: canSave ? '#1a0f04' : 'var(--text-muted)', fontFamily: 'var(--rvn-font-display)' }}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} {t('deckBuilder.save')}
            </button>
          </div>
        </motion.section>}
      </div>

      {/* Desktop hover kortos preview (tik tikra pelė; touch — niekada) */}
      {HOVER_OK && hover && !dragCard && !preview && <HoverCardPreview card={hover.card} x={hover.x} y={hover.y} rightLimit={hover.lim} rect={hover.rect} desktop={desktop} />}

      {/* ── Vilkimo „vaiduoklis" ── */}
      {dragCard && (
        <motion.div className="fixed z-[200] pointer-events-none" style={{ left: 0, top: 0, x: ghostSX, y: ghostSY, scale: ghostScale, opacity: ghostOpacity, width: GHOST_W, height: GHOST_H, rotate: ghostTilt }}>
          <div className="relative w-full h-full overflow-hidden rounded-lg" style={{ border: `2px solid ${dragGhostCol}`, boxShadow: `0 18px 40px rgba(0,0,0,0.7), 0 0 20px ${dragGhostCol}66`, background: '#15101f' }}>
            {dragCard.image_url
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={dragCard.image_url} alt="" draggable={false} className="absolute inset-0 w-full h-full object-cover" />
              : <span className="absolute inset-0 flex items-center justify-center text-2xl">🎴</span>}
            <span className="absolute top-0.5 left-0.5 flex items-center justify-center rounded-full text-[10px] font-bold" style={{ width: 18, height: 18, background: `rgba(${GOLD},0.95)`, color: '#1a0f04' }}>{dragCard.gold_cost}</span>
          </div>
        </motion.div>
      )}

      {preview && <BuilderPreview desktop={desktop} c={preview} owned={ownedOf(preview.id)} deckQty={isCurseCard(preview) ? sideQtyOf(preview.id) : deckQtyOf(preview.id)} onAdd={() => tryAdd(preview)} onClose={() => setPreview(null)} />}

      {toast && <div className="fixed left-1/2 -translate-x-1/2 z-[210] px-4 py-2 rounded-full text-xs font-semibold" style={{ fontSize: desktop ? 14 : undefined, bottom: 'calc(84px + env(safe-area-inset-bottom, 0px))', background: 'rgba(10,8,16,0.96)', border: `1px solid rgba(${GOLD},0.5)`, color: 'var(--ravenof-gold)' }}>{toast}</div>}
    </div>
  )
}

type DragHandlers = { onPointerDown: (e: React.PointerEvent) => void; onClickCapture: (e: React.MouseEvent) => void }

// ── Albumo plytelė (Kolekcijos RavenofCardCell išvaizda + deck builder valdikliai) ──
function AlbumTile({ c, owned, deckQty, dragging, dragProps, onAdd, onPreview, onHover, onHoverEnd, desktop = false }: {
  desktop?: boolean
  c: CardWithRelations; owned: number; deckQty: number; dragging: boolean; dragProps: DragHandlers
  onAdd: () => void; onPreview: () => void; onHover: (x: number, y: number, rect?: { left: number; right: number; top: number; bottom: number }) => void; onHoverEnd: () => void
}) {
  const t = useT()
  const [bad, setBad] = useState(false)
  const col = rarityColor(c.rarity?.name)
  const limit = getCopyLimit(c)
  const has = owned > 0
  const inDeck = deckQty > 0
  const addDisabled = !has || deckQty >= owned || deckQty >= limit
  return (
    <div className="relative select-none touch-pan-y" {...dragProps}
      onMouseEnter={HOVER_OK ? (e) => { const r = e.currentTarget.getBoundingClientRect(); onHover(e.clientX, e.clientY, { left: r.left, right: r.right, top: r.top, bottom: r.bottom }) } : undefined}
      onMouseMove={HOVER_OK && !desktop ? (e) => onHover(e.clientX, e.clientY) : undefined}
      onMouseLeave={HOVER_OK ? onHoverEnd : undefined}
      style={{ opacity: dragging ? 0.35 : 1, transition: 'opacity .15s', minWidth: 0 }}>
      <GameCard glowColor={has ? col + '88' : 'rgba(120,120,140,0.3)'} sounds={has}>
        <button onClick={onPreview} aria-label={desktop ? c.name : undefined} className="ravenof-press w-full block" style={{ background: 'none', border: 0, padding: 0, cursor: 'pointer', minWidth: 0 }}>
          <span role="img" aria-label={c.name} className="relative block w-full" style={{ aspectRatio: '1044 / 1416', borderRadius: 5, border: inDeck ? `1.5px solid rgba(${GOLD},0.85)` : `1px solid ${has ? 'var(--ravenof-border-strong)' : '#221e29'}`, boxShadow: inDeck ? `0 0 0 1px rgba(${GOLD},0.35), 0 0 12px rgba(${GOLD},0.35)` : undefined, overflow: 'hidden' }}>
            {c.image_url && !bad
              ? <SmartImg src={c.image_url} width={240} alt={c.name} onFail={() => setBad(true)}
                  className="absolute inset-0 w-full h-full"
                  style={{ objectFit: 'contain', filter: has ? undefined : 'grayscale(1) brightness(0.55)' }} />
              : <span className="absolute inset-0 flex flex-col items-center justify-center gap-1 px-1 text-center" style={{ background: 'linear-gradient(160deg,#1a1325,#0a0810)', filter: has ? undefined : 'grayscale(1) brightness(0.7)' }}>
                  <span className="text-xl">🎴</span><span style={{ fontSize: desktop ? 12 : 9, lineHeight: 1.1, color: '#fff' }}>{c.name}</span>
                </span>}
            {/* kaina (viršuje kairėje) */}
            <span className="absolute flex items-center justify-center rounded-full tabular-nums" style={{ top: 4, left: 4, zIndex: 2, width: desktop ? 24 : 18, height: desktop ? 24 : 18, fontSize: desktop ? 12 : 9.5, fontWeight: 800, background: `rgba(${GOLD},0.95)`, color: '#1a0f04', boxShadow: '0 1px 4px rgba(0,0,0,.6)' }}>{c.gold_cost}</span>
            {/* kiek kaladėje (viršuje dešinėje) */}
            {inDeck && (
              <span className="absolute tabular-nums" style={{ top: 4, right: 4, zIndex: 2, font: `800 ${desktop ? 12 : 9.5}px var(--ravenof-font-display)`, color: '#1a0f04', background: 'linear-gradient(135deg,#ffe9a8,#f0b429)', padding: desktop ? '3px 7px' : '2px 5px', borderRadius: 3, boxShadow: '0 2px 8px rgba(240,180,41,.55)' }}>{deckQty}/{Math.min(limit, owned)}</span>
            )}
            {has ? (
              <span className="absolute" style={{ bottom: 4, right: 4, font: `700 ${desktop ? 12 : 10}px var(--ravenof-font-body)`, color: 'var(--ravenof-text-primary)', background: 'rgba(7,6,10,.85)', border: '1px solid var(--ravenof-border-strong)', padding: desktop ? '3px 8px' : '2px 6px' }}>×{owned}</span>
            ) : (
              <span className="absolute whitespace-nowrap flex items-center gap-1" style={{ bottom: 4, left: '50%', transform: 'translateX(-50%)', font: `600 ${desktop ? 12 : 9}px var(--ravenof-font-body)`, color: 'var(--ravenof-text-secondary)', background: 'rgba(7,6,10,.85)', border: '1px solid var(--ravenof-border-strong)', padding: desktop ? '3px 8px' : '2px 7px' }}><Lock className={desktop ? 'w-3 h-3' : 'w-2.5 h-2.5'} />{t('collection.notOwnedBadge')}</span>
            )}
          </span>
        </button>
      </GameCard>
      {/* greitas [+] (apačioje kairėje, virš plytelės) */}
      {has && (
        <button onClick={(e) => { e.stopPropagation(); onAdd() }} disabled={addDisabled} className="rvn-press absolute flex items-center justify-center rounded-md disabled:opacity-25"
          style={{ left: 4, bottom: 4, zIndex: 3, width: desktop ? 34 : 24, height: desktop ? 34 : 24, background: 'rgba(20,40,22,0.92)', border: '1px solid rgba(79,158,82,0.6)', color: '#7fbf82', boxShadow: '0 2px 6px rgba(0,0,0,.6)' }} aria-label={t('deckBuilder.add')} title={desktop ? t('deckBuilder.addToDeck') : undefined}><Plus className={desktop ? 'w-5 h-5' : 'w-3.5 h-3.5'} /></button>
      )}
    </div>
  )
}

// ── Plaukiojantis kortos paveikslo preview (desktop hover) ────────────────────
function HoverCardPreview({ card, x, y, rightLimit, rect, desktop = false }: { card: CardWithRelations; x: number; y: number; rightLimit?: number; rect?: { left: number; right: number; top: number; bottom: number }; desktop?: boolean }) {
  if (typeof window === 'undefined') return null
  // Didelis, iskaitomas preview: iki 380px plocio / ~62% ekrano auksčio (kad tilptų tekstas)
  const W = desktop ? Math.max(240, Math.min(320, Math.floor((window.innerHeight * 0.56) / 1.4))) : Math.max(240, Math.min(380, Math.floor((window.innerHeight * 0.62) / 1.4)))
  const H = Math.round(W * 1.4)
  if (desktop && rect) {
    // Desktop: pririšta prie PLYTELĖS (ne žymeklio) — šalia jos, niekada neuždengia pačios plytelės
    // (+ mygtuko), kaladės panelės ir nav rail; nejuda kartu su pele.
    const maxR = rightLimit ?? window.innerWidth - 8
    const minL = DT.railW + 8
    const l = rect.right + 12 + W <= maxR ? rect.right + 12 : rect.left - 12 - W >= minL ? rect.left - 12 - W : Math.max(minL, Math.min(rect.right + 12, maxR - W))
    const tp = Math.min(Math.max(8, (rect.top + rect.bottom) / 2 - H / 2), window.innerHeight - H - 8)
    return <HoverCardPreviewBox card={card} left={l} top={tp} W={W} H={H} />
  }
  // rodyti tai pusei, kur daugiau vietos (kad neuždengtų pačios plytelės).
  // Desktop: dešinė riba = kaladės panelės kairys kraštas (preview niekada neuždengia kaladės / Išsaugoti),
  // kairė riba = už nav rail.
  const maxRight = desktop && rightLimit != null ? rightLimit : window.innerWidth - 8
  const minLeft = desktop ? DT.railW + 8 : 8
  const left = x + 24 + W <= maxRight ? x + 24 : Math.max(minLeft, Math.min(x - 24 - W, maxRight - W))
  const top = Math.min(Math.max(8, y - H / 2), window.innerHeight - H - 8)
  return <HoverCardPreviewBox card={card} left={left} top={top} W={W} H={H} />
}

function HoverCardPreviewBox({ card, left, top, W, H }: { card: CardWithRelations; left: number; top: number; W: number; H: number }) {
  const col = rarityColor(card.rarity?.name)
  return (
    <div className="fixed z-[220] pointer-events-none rounded-xl overflow-hidden" style={{ left, top, width: W, height: H, border: `2px solid ${col}`, boxShadow: `0 18px 50px rgba(0,0,0,0.8), 0 0 28px ${col}66`, background: '#0d0a14' }}>
      {card.image_url
        ? <SmartImg src={card.image_url} width={800} className="absolute inset-0 w-full h-full object-cover" />
        : <span className="absolute inset-0 flex items-center justify-center text-4xl">🎴</span>}
      <span className="absolute bottom-0 left-0 right-0 px-2 py-1 text-center" style={{ background: 'rgba(0,0,0,0.82)' }}>
        <span className="block font-bold truncate" style={{ fontSize: 14, color: '#fff' }}>{card.name}</span>
        <span className="block" style={{ fontSize: 11, color: col }}>{card.rarity?.name ?? ''}{card.card_type?.name ? ' · ' + card.card_type.name : ''}</span>
      </span>
    </div>
  )
}

function BuilderPreview({ c, owned, deckQty, onAdd, onClose, desktop = false }: { c: CardWithRelations; owned: number; deckQty: number; onAdd: () => boolean; onClose: () => void; desktop?: boolean }) {
  const t = useT()
  const [bad, setBad] = useState(false)
  const col = rarityColor(c.rarity?.name)
  const limit = getCopyLimit(c)
  const addDisabled = owned <= 0 || deckQty >= owned || deckQty >= limit
  // Desktop: Escape + fokuso gaudyklė (mobile – kaip buvo)
  const ref = useDialogFocus<HTMLDivElement>(onClose, desktop)
  return (
    <div className="fixed inset-0 z-[160] flex items-center justify-center p-5" style={{ background: 'rgba(4,3,8,0.9)' }} onClick={onClose}>
      <div ref={ref} role={desktop ? 'dialog' : undefined} aria-modal={desktop ? true : undefined} aria-label={desktop ? c.name : undefined} tabIndex={desktop ? -1 : undefined}
        className={`relative ${desktop ? 'w-[min(760px,94vw)] outline-none' : 'w-[min(560px,94vw)]'} max-h-[92vh] rounded-2xl overflow-hidden flex`} style={{ border: `2px solid ${col}`, background: 'linear-gradient(160deg,#15101f,#0a0810)' }} onClick={(e) => e.stopPropagation()}>
        <button onClick={() => { playUiClick(); onClose() }} data-dlg-close="1" aria-label={t('common.close')} className="absolute top-2 right-2 z-10 flex items-center justify-center rounded-full" style={{ width: desktop ? 40 : 32, height: desktop ? 40 : 32, background: 'rgba(0,0,0,0.6)', color: '#fff' }}><X className={desktop ? 'w-5 h-5' : 'w-4 h-4'} /></button>
        <div className="relative shrink-0" style={{ width: '42%', aspectRatio: '2.5 / 3.5' }}>
          {c.image_url && !bad
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={c.image_url} alt={c.name} onError={() => setBad(true)} draggable={false} className={`absolute inset-0 w-full h-full ${desktop ? 'object-contain' : 'object-cover'}`} style={{ filter: owned > 0 ? undefined : 'grayscale(1) brightness(0.6)' }} />
            : <div className="absolute inset-0 flex items-center justify-center text-5xl">🎴</div>}
          {owned <= 0 && <span className="absolute inset-0 flex items-center justify-center"><Lock className="w-9 h-9" style={{ color: 'rgba(255,255,255,0.75)' }} /></span>}
        </div>
        <div className={`flex-1 min-w-0 flex flex-col overflow-y-auto ${desktop ? 'p-6 gap-3' : 'p-4 gap-2'}`} style={desktop ? { paddingRight: 56 } : undefined}>
          <div className={desktop ? 'flex items-start justify-between gap-2 flex-wrap' : 'flex items-center justify-between gap-2'}>
            <h2 className={desktop ? 'font-bold rvn-clamp2' : 'text-base font-bold truncate'} style={{ fontFamily: 'var(--rvn-font-display)', color: 'var(--ravenof-text-primary)', fontSize: desktop ? DT.fs.h2 : undefined }}>{c.name}</h2>
            <span className={desktop ? 'font-bold px-2 py-0.5 rounded-full shrink-0' : 'text-[11px] font-bold px-2 py-0.5 rounded-full shrink-0'} style={{ fontSize: desktop ? DT.fs.label : undefined, color: col, border: `1px solid ${col}` }}>{c.rarity?.name ?? '—'}</span>
          </div>
          <div className={desktop ? 'flex flex-wrap gap-x-3' : 'flex flex-wrap gap-x-3 text-[11px]'} style={{ fontSize: desktop ? DT.fs.help : undefined, color: 'var(--ravenof-text-secondary)' }}>
            <span>🪙 {c.gold_cost}</span>{c.attack != null && <span>⚔️ {c.attack}</span>}{c.health != null && <span>❤️ {c.health}</span>}{c.faction?.name && <span>· {c.faction.name}</span>}{c.card_type?.name && <span>· {c.card_type.name}</span>}
          </div>
          {(c.effect_text || c.description) && <p className={desktop ? 'leading-snug' : 'text-xs leading-snug'} style={{ fontSize: desktop ? DT.fs.body : undefined, color: 'var(--ravenof-text-secondary)' }}>{c.effect_text || c.description}</p>}
          <p className={desktop ? 'font-semibold mt-auto' : 'text-[11px] font-semibold mt-auto'} style={{ fontSize: desktop ? DT.fs.help : undefined, color: owned > 0 ? '#7fbf82' : '#c65563' }}>{owned > 0 ? t('deckBuilder.ownedInDeck', { owned, qty: deckQty, max: Math.min(limit, owned) }) : t('deckBuilder.notOwnedYet')}</p>
          <button onClick={() => { onAdd() }} disabled={addDisabled} className="w-full px-4 rounded-xl text-sm font-bold disabled:opacity-40" style={{ minHeight: desktop ? DT.cta : 42, background: 'rgba(79,158,82,0.18)', border: '1px solid rgba(79,158,82,0.5)', color: '#7fbf82', fontFamily: 'var(--rvn-font-display)' }}>{t('deckBuilder.addToDeck')}</button>
        </div>
      </div>
    </div>
  )
}
