'use client'

// ══════════════════════════════════════════════════════════════════════════════
// Ravenof Digital — DECK BUILDER v2 „smooth & physical":
// • Fizinis drag & drop: palaikyk kortą (touch ~190 ms / pele iškart) — ji
//   „pakyla" (ghost su spyruokline fizika), tempk ant apatinės juostos ir
//   paleisk — korta įskrenda į kaladę (fly-in), kitaip spyruokliškai grįžta.
// • Kaladės panelė (bottom sheet): kortų sąrašas su +/- ir gyva statistika —
//   animuota AUKSO KREIVĖ su vidurkio žymekliu, tipų/retumų suvestinė.
// • Viskas su garsais, haptika ir spring animacijomis.
// ══════════════════════════════════════════════════════════════════════════════
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, animate, motion, useMotionValue, useSpring, useTransform, useVelocity } from 'framer-motion'
import { ChevronLeft, Search, Plus, Minus, Eye, Lock, Save, Loader2, ChevronDown, X, Layers } from 'lucide-react'
import { useDeckBuilderStore } from '@/stores/deckBuilderStore'
import { createClient } from '@/lib/supabase/client'
import { validateDeck, getCopyLimit, isCurseCard, NEUTRAL_FACTION_ID, DECK_MIN, DECK_MAX } from '@/lib/deck-validation'
import { rarityColor } from '@/lib/digital/rarity'
import { playUiClick, playSuccess, playError, playCardPick, playCardPlace, playPanelOpen } from '@/lib/ui-sound'
import type { CardWithRelations, Faction, CollectionMap, DeckVisibility } from '@/types'

const GOLD = '240,180,41'
const GHOST_W = 76
const GHOST_H = Math.round(GHOST_W * 1.4)

type InitialDeck = {
  id: string; name: string; description: string; factionId: number | null
  visibility: DeckVisibility; entries: { card: CardWithRelations; quantity: number }[]
  sideEntries: { card: CardWithRelations; quantity: number }[]
} | null

type Props = {
  userId: string; cards: CardWithRelations[]; factions: Faction[]; collection: CollectionMap
  initialDeck: InitialDeck; onSaved: () => void; onBack: () => void
}

const IDENTITY: { re: RegExp; line: string; icon: string }[] = [
  { re: /mirt/i,            line: 'Mirusiųjų legionai ir aukos magija', icon: '💀' },
  { re: /plėšik|plesik/i,   line: 'Greiti smūgiai ir grobio gauja',     icon: '🗡️' },
  { re: /vryhiok/i,         line: 'Žvėriška jėga ir chaosas',           icon: '🐺' },
  { re: /demon/i,           line: 'Prakeiksmai ir pragaro ugnis',       icon: '👹' },
  { re: /inkvizic/i,        line: 'Disciplina ir šventas teismas',      icon: '⚖️' },
  { re: /švies|svies/i,     line: 'Gydymas ir apsauga',                 icon: '✨' },
  { re: /mistik/i,          line: 'Burtai ir magijos srautas',          icon: '🔮' },
  { re: /ryt/i,             line: 'Šešėliai ir vikrumas',               icon: '🍃' },
]
const identityFor = (name: string) => IDENTITY.find((x) => x.re.test(name))

export function DigitalDeckBuilder({ userId, cards, factions, collection, initialDeck, onSaved, onBack }: Props) {
  const store = useDeckBuilderStore()
  const [q, setQ] = useState('')
  const [showUniversal, setShowUniversal] = useState(true)
  const [view, setView] = useState<'list' | 'grid'>('list')
  const [descOpen, setDescOpen] = useState(false)
  const [preview, setPreview] = useState<CardWithRelations | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
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
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), 2200); return () => clearTimeout(t) }, [toast])
  const flash = (m: string, err = false) => { (err ? playError : playUiClick)(); setToast(m) }

  const deckQtyOf = (id: string) => store.entries.find((e) => e.card.id === id)?.quantity ?? 0
  const ownedOf = useCallback((id: string) => tester ? 99 : (collection[id] ?? 0), [tester, collection])
  const total = store.entries.reduce((s, e) => s + e.quantity, 0)

  const pool = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return cards.filter((c) => {
      if (isCurseCard(c)) return false
      if (store.factionId == null) return false
      const isNeutral = c.faction_id === NEUTRAL_FACTION_ID
      if (c.faction_id !== store.factionId && !(showUniversal && isNeutral)) return false
      if (store.ownedOnly && ownedOf(c.id) <= 0) return false
      if (needle && !c.name.toLowerCase().includes(needle)) return false
      return true
    })
  }, [cards, q, store.factionId, store.ownedOnly, showUniversal, ownedOf])

  const canAdd = useCallback((c: CardWithRelations): string | null => {
    const owned = ownedOf(c.id)
    const dq = deckQtyOf(c.id)
    if (dq >= getCopyLimit(c)) return 'Pasiektas kopijų limitas'
    if (owned <= 0) return 'Šios kortos neturi'
    if (dq >= owned) return `Turi tik ×${owned} — daugiau įsidėti negali`
    return null
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ownedOf, store.entries])

  const tryAdd = (c: CardWithRelations): boolean => {
    const why = canAdd(c)
    if (why) { flash(why, true); return false }
    const r = store.addCard(c)
    if (!r.ok) { flash(r.reason ?? 'Negalima pridėti', true); return false }
    return true
  }
  const dec = (c: CardWithRelations) => { const dq = deckQtyOf(c.id); if (dq > 0) { playUiClick(); store.setQuantity(c.id, dq - 1) } }

  // ── DRAG & DROP ──────────────────────────────────────────────────────────
  const [dragCard, setDragCard] = useState<CardWithRelations | null>(null)
  const [overDrop, setOverDrop] = useState(false)
  const [dropPulse, setDropPulse] = useState(0)
  const ghostX = useMotionValue(0)
  const ghostY = useMotionValue(0)
  const ghostScale = useMotionValue(1)
  const ghostOpacity = useMotionValue(1)
  // fizinis sekimas: ghost velkasi paskui pirštą su spyruokle + pakrypsta pagal greitį
  const ghostSX = useSpring(ghostX, { stiffness: 1400, damping: 80, mass: 0.6 })
  const ghostSY = useSpring(ghostY, { stiffness: 1400, damping: 80, mass: 0.6 })
  const ghostVX = useVelocity(ghostSX)
  const ghostTiltRaw = useTransform(ghostVX, [-1600, 0, 1600], [10, -3, -16])
  const ghostTilt = useSpring(ghostTiltRaw, { stiffness: 260, damping: 22 })
  const dropRef = useRef<HTMLDivElement>(null)
  const pendingRef = useRef<{ card: CardWithRelations; rect: DOMRect; sx: number; sy: number; touch: boolean; timer: number | null } | null>(null)
  const activeRef = useRef(false)
  const suppressClickRef = useRef(false)
  const dragCardRef = useRef<CardWithRelations | null>(null)

  const hitDrop = (x: number, y: number) => {
    const r = dropRef.current?.getBoundingClientRect()
    return !!r && x >= r.left - 8 && x <= r.right + 8 && y >= r.top - 26 && y <= r.bottom + 8
  }

  const onTouchMoveBlock = useCallback((e: TouchEvent) => { if (activeRef.current) e.preventDefault() }, [])

  const startDrag = useCallback((p: NonNullable<typeof pendingRef.current>, x: number, y: number) => {
    activeRef.current = true
    dragCardRef.current = p.card
    ghostScale.set(0.7); ghostOpacity.set(1)
    ghostX.set(x - GHOST_W / 2); ghostY.set(y - GHOST_H * 0.72)
    ghostSX.jump(x - GHOST_W / 2); ghostSY.jump(y - GHOST_H * 0.72)
    setDragCard(p.card)
    animate(ghostScale, 1.06, { type: 'spring', stiffness: 420, damping: 22 })
    playCardPick()
    try { navigator.vibrate?.(14) } catch { /* */ }
  }, [ghostScale, ghostOpacity, ghostX, ghostY])

  const endDragCleanup = useCallback(() => {
    setDragCard(null); setOverDrop(false)
    dragCardRef.current = null
  }, [])

  const onMove = useCallback((e: PointerEvent) => {
    const p = pendingRef.current
    if (!p) return
    const dx = e.clientX - p.sx, dy = e.clientY - p.sy
    if (!activeRef.current) {
      if (p.touch) { if (Math.hypot(dx, dy) > 16 && p.timer != null) { clearTimeout(p.timer); p.timer = null; pendingRef.current = null } }
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
  }, [ghostX, ghostY, startDrag])

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
      const ok = dropped ? tryAdd(card) : false
      if (dropped && ok) {
        playCardPlace()
        try { navigator.vibrate?.([10, 30, 18]) } catch { /* */ }
        setDropPulse((k) => k + 1)
        const r = dropRef.current?.getBoundingClientRect()
        const tx = r ? r.left + r.width * 0.5 - GHOST_W / 2 : ghostX.get()
        const ty = r ? r.top + r.height * 0.5 - GHOST_H / 2 : ghostY.get()
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

  const dragProps = (card: CardWithRelations) => ({
    onPointerDown: (e: React.PointerEvent) => {
      if (ownedOf(card.id) <= 0) return
      if (dragCard) return
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
      const touch = e.pointerType === 'touch'
      const p = { card, rect, sx: e.clientX, sy: e.clientY, touch, timer: null as number | null }
      pendingRef.current = p
      if (touch) p.timer = window.setTimeout(() => { if (pendingRef.current === p && !activeRef.current) startDrag(p, p.sx, p.sy) }, 130)
      window.addEventListener('pointermove', onMove)
      window.addEventListener('pointerup', onUp)
      window.addEventListener('pointercancel', onUp)
      window.addEventListener('touchmove', onTouchMoveBlock, { passive: false })
    },
    onClickCapture: (e: React.MouseEvent) => { if (suppressClickRef.current) { e.preventDefault(); e.stopPropagation() } },
  })

  // ── Validacija / summary ─────────────────────────────────────────────────
  const warnings = validateDeck(store.entries, store.factionId, store.name)
  const errors = warnings.filter((w) => w.type === 'error')
  const canSave = errors.length === 0 && !saving
  const reason = !store.factionId ? 'Pasirink frakciją'
    : !store.name.trim() ? 'Įrašyk pavadinimą'
    : total < DECK_MIN ? `Trūksta ${DECK_MIN - total} kortų`
    : total > DECK_MAX ? `Per daug kortų (${total}/${DECK_MAX})`
    : errors.length ? errors[0].message : null

  const save = async () => {
    if (!canSave) { flash(reason ?? 'Kaladė negalioja', true); return }
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
        const rows = store.entries.map((e) => ({ deck_id: id!, card_id: e.card.id, quantity: e.quantity }))
        if (rows.length) { const { error } = await supabase.from('deck_cards').insert(rows); if (error) throw error }
        store.markSaved(id)
      }
      playSuccess(); setToast('Kaladė išsaugota'); setTimeout(onSaved, 700)
    } catch (err) {
      flash('Nepavyko išsaugoti: ' + ((err as { message?: string })?.message ?? ''), true)
    } finally { setSaving(false) }
  }

  const dragGhostCol = dragCard ? rarityColor(dragCard.rarity?.name) : '#f0b429'

  return (
    <div className="space-y-3" style={{ paddingBottom: 108 }}>
      {/* Antraštė */}
      <div className="flex items-center gap-2">
        <button onClick={() => { playUiClick(); onBack() }} className="flex items-center justify-center rounded-lg shrink-0" style={{ width: 36, height: 36, background: 'rgba(10,8,16,0.9)', border: `1px solid rgba(${GOLD},0.3)`, color: 'var(--gold)' }} aria-label="Atgal"><ChevronLeft className="w-5 h-5" /></button>
        <h1 className="flex-1 text-base font-bold" style={{ fontFamily: 'var(--rvn-font-display)', color: 'var(--gold)', letterSpacing: '0.06em' }}>Deck Builder{tester && <span className="ml-2 align-middle text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(139,92,246,0.2)', border: '1px solid rgba(139,92,246,0.55)', color: '#c4b5fd', letterSpacing: '0.08em' }}>TESTER</span>}</h1>
        <span className="px-2.5 py-1 rounded-full text-xs font-bold tabular-nums" style={{ background: total >= DECK_MIN && total <= DECK_MAX ? 'rgba(34,197,94,0.16)' : `rgba(${GOLD},0.14)`, border: `1px solid ${total >= DECK_MIN && total <= DECK_MAX ? 'rgba(34,197,94,0.5)' : `rgba(${GOLD},0.4)`}`, color: total >= DECK_MIN && total <= DECK_MAX ? '#86efac' : 'var(--gold)', fontFamily: 'var(--rvn-font-display)' }}>{total}/{DECK_MIN}</span>
      </div>

      {/* 1 — Frakcija */}
      <Section step={1} title="Pasirink frakciją">
        <div className="grid grid-cols-2 gap-2">
          {factions.filter((f) => f.id !== NEUTRAL_FACTION_ID).map((f) => {
            const sel = store.factionId === f.id
            const id = identityFor(f.name)
            return (
              <button key={f.id} onClick={() => { playUiClick(); if (f.id !== store.factionId && store.entries.length && !window.confirm('Pakeitus frakciją kaladės kortos bus pašalintos. Tęsti?')) return; store.setFaction(sel ? null : f.id) }}
                className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-left transition-transform active:scale-[0.98]"
                style={{ minHeight: 58, background: sel ? `${f.color_hex}26` : 'rgba(10,8,16,0.85)', border: `1.5px solid ${sel ? f.color_hex : `rgba(${GOLD},0.18)`}`, boxShadow: sel ? `0 0 12px ${f.color_hex}55` : 'none' }}>
                <span className="text-xl shrink-0">{id?.icon ?? '🛡️'}</span>
                <span className="min-w-0">
                  <span className="block text-[12px] font-bold leading-tight truncate" style={{ color: sel ? f.color_hex : '#f3ead3', fontFamily: 'var(--rvn-font-display)' }}>{f.name}</span>
                  <span className="block text-[9px] leading-tight truncate" style={{ color: 'var(--text-muted)' }}>{id?.line ?? ''}</span>
                </span>
              </button>
            )
          })}
        </div>
      </Section>

      {/* 2 — Pavadinimas + matomumas */}
      <Section step={2} title="Kaladės informacija">
        <input value={store.name} onChange={(e) => store.setName(e.target.value)} placeholder="Kaladės pavadinimas…"
          className="w-full px-3 rounded-xl text-sm font-semibold outline-none" style={{ minHeight: 44, background: 'rgba(10,8,16,0.9)', border: `1px solid ${store.name.trim() ? `rgba(${GOLD},0.3)` : 'rgba(239,68,68,0.6)'}`, color: 'var(--text-primary)', fontFamily: 'var(--rvn-font-display)' }} />
        <div className="grid grid-cols-2 gap-2">
          {([['private', '🔒 Privati'], ['public', '🌐 Vieša']] as const).map(([v, label]) => (
            <button key={v} onClick={() => { playUiClick(); store.setVisibility(v as DeckVisibility) }} className="px-3 rounded-xl text-xs font-bold transition-colors" style={{ minHeight: 42, background: store.visibility === v ? `rgba(${GOLD},0.18)` : 'rgba(10,8,16,0.85)', border: `1px solid ${store.visibility === v ? `rgba(${GOLD},0.6)` : `rgba(${GOLD},0.2)`}`, color: store.visibility === v ? 'var(--gold)' : 'var(--text-muted)', fontFamily: 'var(--rvn-font-display)' }}>{label}</button>
          ))}
        </div>
        <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{store.visibility === 'public' ? 'Vieša kaladė bus matoma Bendruomenės kaladžių sąraše.' : 'Privati kaladė matoma tik tau.'}</p>
        <button onClick={() => setDescOpen((v) => !v)} className="flex items-center gap-1 text-[11px]" style={{ color: 'var(--text-muted)' }}><ChevronDown className={`w-3.5 h-3.5 transition-transform ${descOpen ? 'rotate-180' : ''}`} /> Aprašymas (neprivaloma)</button>
        {descOpen && <input value={store.description} onChange={(e) => store.setDescription(e.target.value)} placeholder="Trumpas aprašymas…" className="w-full px-3 rounded-xl text-sm outline-none" style={{ minHeight: 40, background: 'rgba(10,8,16,0.9)', border: `1px solid rgba(${GOLD},0.2)`, color: 'var(--text-primary)' }} />}
      </Section>

      {/* 3 — Kortos */}
      <Section step={3} title="Pridėk kortas">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ieškoti…" className="w-full pl-9 pr-3 rounded-xl text-sm outline-none" style={{ minHeight: 44, background: 'rgba(10,8,16,0.9)', border: `1px solid rgba(${GOLD},0.3)`, color: 'var(--text-primary)' }} />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Toggle on={store.ownedOnly} onClick={() => { playUiClick(); store.setOwnedOnly(!store.ownedOnly) }} label="Tik turimos" color="34,197,94" />
          <Toggle on={showUniversal} onClick={() => { playUiClick(); setShowUniversal((v) => !v) }} label="Universalios" color="96,165,250" />
          <div className="inline-flex rounded-full overflow-hidden ml-auto" style={{ border: `1px solid rgba(${GOLD},0.3)` }}>
            {(['list', 'grid'] as const).map((vw) => (
              <button key={vw} onClick={() => { playUiClick(); setView(vw) }} className="px-3 text-[11px] font-semibold" style={{ minHeight: 36, background: view === vw ? `rgba(${GOLD},0.18)` : 'rgba(10,8,16,0.9)', color: view === vw ? 'var(--gold)' : 'var(--text-muted)' }}>{vw === 'list' ? 'Sąrašas' : 'Tinklelis'}</button>
            ))}
          </div>
        </div>
        <p className="text-[10px]" style={{ color: 'rgba(150,160,185,0.6)' }}>💡 Palaikyk kortą ir tempk ją ant apatinės juostos — pridėsi į kaladę</p>

        {store.factionId == null ? (
          <p className="text-center text-sm py-10" style={{ color: 'var(--text-muted)' }}>Pirma pasirink frakciją ↑</p>
        ) : pool.length === 0 ? (
          <p className="text-center text-sm py-10" style={{ color: 'var(--text-muted)' }}>Kortų nerasta.</p>
        ) : view === 'list' ? (
          <div className="space-y-1.5">
            {pool.map((c) => <CardRow key={c.id} c={c} owned={ownedOf(c.id)} deckQty={deckQtyOf(c.id)} dragging={dragCard?.id === c.id} dragProps={dragProps(c)} onAdd={() => tryAdd(c)} onDec={() => dec(c)} onPreview={() => { playUiClick(); setPreview(c) }} />)}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {pool.map((c) => <CardTile key={c.id} c={c} owned={ownedOf(c.id)} deckQty={deckQtyOf(c.id)} dragging={dragCard?.id === c.id} dragProps={dragProps(c)} onAdd={() => tryAdd(c)} onPreview={() => { playUiClick(); setPreview(c) }} />)}
          </div>
        )}
      </Section>

      {/* ── Sticky juosta / DROP ZONA ── */}
      <div className="fixed left-0 right-0 z-30 px-3" style={{ bottom: 'calc(64px + env(safe-area-inset-bottom, 0px))' }}>
        <motion.div ref={dropRef} key={dropPulse}
          initial={dropPulse > 0 ? { scale: 1.035 } : false}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 380, damping: 14 }}
          className="mx-auto max-w-screen-sm flex items-center gap-2 px-3 py-2 rounded-2xl"
          style={{
            background: overDrop ? 'rgba(24,17,8,0.98)' : 'rgba(7,5,12,0.97)',
            border: `1.5px solid rgba(${GOLD},${dragCard ? (overDrop ? 1 : 0.65) : 0.3})`,
            boxShadow: overDrop ? `0 0 26px rgba(${GOLD},0.5), 0 8px 24px rgba(0,0,0,0.6)` : dragCard ? `0 0 14px rgba(${GOLD},0.3), 0 8px 24px rgba(0,0,0,0.6)` : '0 8px 24px rgba(0,0,0,0.6)',
            transition: 'box-shadow .15s ease, border-color .15s ease, background .15s ease',
          }}>
          {dragCard ? (
            <div className="flex-1 flex items-center justify-center gap-2 py-1.5">
              <Layers className="w-4 h-4" style={{ color: 'var(--gold)' }} />
              <span className="rvn-disp" style={{ fontSize: 13, fontWeight: 800, color: 'var(--gold)', letterSpacing: '0.04em' }}>
                {overDrop ? 'Paleisk — į kaladę!' : 'Tempk čia — pridėti į kaladę'}
              </span>
            </div>
          ) : (
            <>
              <button onClick={() => { playPanelOpen(); setSheetOpen(true) }} className="rvn-press flex items-center gap-2 shrink-0 px-2 py-1 rounded-xl" style={{ background: `rgba(${GOLD},0.1)`, border: `1px solid rgba(${GOLD},0.35)` }}>
                <Layers className="w-4 h-4" style={{ color: 'var(--gold)' }} />
                <span className="leading-tight text-left">
                  <AnimatePresence mode="popLayout" initial={false}>
                    <motion.span key={total} initial={{ y: -10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 10, opacity: 0 }} transition={{ duration: 0.18 }}
                      className="block text-sm font-bold tabular-nums" style={{ color: total >= DECK_MIN && total <= DECK_MAX ? '#86efac' : 'var(--gold)', fontFamily: 'var(--rvn-font-display)' }}>{total}/{DECK_MIN}</motion.span>
                  </AnimatePresence>
                  <span className="block text-[9px]" style={{ color: 'var(--text-muted)' }}>🪙 vid. {store.avgGold()} · statistika</span>
                </span>
              </button>
              <div className="flex-1 text-[11px] truncate" style={{ color: reason ? '#fca5a5' : '#86efac' }}>{reason ?? 'Kaladė galioja ✓'}</div>
              <button onClick={save} disabled={!canSave} className="flex items-center gap-1.5 px-4 rounded-xl text-sm font-bold transition-transform active:scale-95 disabled:opacity-40" style={{ minHeight: 44, background: canSave ? `rgba(${GOLD},0.92)` : 'rgba(255,255,255,0.06)', color: canSave ? '#1a0f04' : 'var(--text-muted)', fontFamily: 'var(--rvn-font-display)' }}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Išsaugoti
              </button>
            </>
          )}
        </motion.div>
      </div>

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

      {/* ── Kaladės panelė (statistika + sąrašas) ── */}
      <AnimatePresence>
        {sheetOpen && (
          <DeckSheet entries={store.entries} total={total} onClose={() => { playUiClick(); setSheetOpen(false) }}
            onInc={(c) => tryAdd(c)} onDec={(c) => dec(c)} onCard={(c) => { playUiClick(); setPreview(c) }} />
        )}
      </AnimatePresence>

      {preview && <BuilderPreview c={preview} owned={ownedOf(preview.id)} deckQty={deckQtyOf(preview.id)} onAdd={() => tryAdd(preview)} onClose={() => setPreview(null)} />}

      {toast && <div className="fixed left-1/2 -translate-x-1/2 z-[210] px-4 py-2 rounded-full text-xs font-semibold" style={{ bottom: 'calc(120px + env(safe-area-inset-bottom, 0px))', background: 'rgba(10,8,16,0.96)', border: `1px solid rgba(${GOLD},0.5)`, color: 'var(--gold)' }}>{toast}</div>}
    </div>
  )
}

// ── Kaladės panelė: gyva statistika + kortų valdymas ─────────────────────────
function DeckSheet({ entries, total, onClose, onInc, onDec, onCard }: {
  entries: { card: CardWithRelations; quantity: number }[]
  total: number
  onClose: () => void
  onInc: (c: CardWithRelations) => void
  onDec: (c: CardWithRelations) => void
  onCard: (c: CardWithRelations) => void
}) {
  const sorted = useMemo(() => [...entries].sort((a, b) => (a.card.gold_cost ?? 0) - (b.card.gold_cost ?? 0) || a.card.name.localeCompare(b.card.name)), [entries])
  const stats = useMemo(() => {
    const golds = entries.flatMap((e) => Array(e.quantity).fill(e.card.gold_cost ?? 0) as number[])
    const avg = golds.length ? golds.reduce((a, b) => a + b, 0) / golds.length : 0
    const curve = Array.from({ length: 8 }, (_, i) => entries.filter((e) => (i < 7 ? (e.card.gold_cost ?? 0) === i : (e.card.gold_cost ?? 0) >= 7)).reduce((a, e) => a + e.quantity, 0))
    const types = new Map<string, number>()
    const rars = new Map<string, number>()
    let champions = 0
    for (const e of entries) {
      types.set(e.card.card_type?.name ?? 'Kita', (types.get(e.card.card_type?.name ?? 'Kita') ?? 0) + e.quantity)
      rars.set(e.card.rarity?.name ?? '—', (rars.get(e.card.rarity?.name ?? '—') ?? 0) + e.quantity)
      if (e.card.is_champion) champions += e.quantity
    }
    return { avg, curve, types: Array.from(types), rars: Array.from(rars), champions }
  }, [entries])
  const curveMax = Math.max(1, ...stats.curve)
  const valid = total >= DECK_MIN && total <= DECK_MAX

  return (
    <>
      <motion.div className="fixed inset-0 z-[150]" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(3px)' }}
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
      <motion.div className="fixed left-0 right-0 bottom-0 z-[155] flex flex-col"
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'tween', duration: 0.3, ease: [0.3, 0.7, 0.3, 1] }}
        style={{ maxHeight: '80vh', borderRadius: '20px 20px 0 0', background: 'linear-gradient(175deg, #171021, #0a0810)', border: `1px solid rgba(${GOLD},0.4)`, borderBottom: 'none', boxShadow: '0 -14px 50px rgba(0,0,0,0.8)' }}>
        <div className="flex items-center justify-between px-4 pt-3.5 pb-2.5 shrink-0" style={{ borderBottom: `1px solid rgba(${GOLD},0.18)` }}>
          <p className="text-base font-bold inline-flex items-center gap-2" style={{ fontFamily: 'var(--rvn-font-display)', color: 'var(--gold)', letterSpacing: '0.08em' }}>
            <Layers className="w-4 h-4" /> KALADĖ · {total}/{DECK_MIN}
          </p>
          <button onClick={onClose} aria-label="Uždaryti" className="flex items-center justify-center rounded-full" style={{ width: 32, height: 32, background: 'rgba(10,8,16,0.9)', border: `1px solid rgba(${GOLD},0.4)`, color: 'var(--gold)' }}><X className="w-4 h-4" /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4" style={{ paddingBottom: 'calc(18px + env(safe-area-inset-bottom, 0px))' }}>
          {/* Suvestinė */}
          <div className="grid grid-cols-3 gap-2">
            <StatBox label="Kortų" value={`${total}/${DECK_MIN}`} accent={valid ? '74,222,128' : '252,165,165'} />
            <StatBox label="Aukso vid." value={stats.avg.toFixed(1)} accent={GOLD} />
            <StatBox label="Čempionai" value={String(stats.champions)} accent="139,92,246" />
          </div>

          {/* Animuota aukso kreivė */}
          <div>
            <p className="text-[10px] font-bold uppercase mb-1.5" style={{ color: 'var(--text-muted)', letterSpacing: '0.14em' }}>Aukso kreivė</p>
            <div className="relative rounded-xl px-2 pt-2 pb-1" style={{ background: 'rgba(10,8,16,0.6)', border: `1px solid rgba(${GOLD},0.18)` }}>
              <div className="flex items-end gap-1" style={{ height: 96 }}>
                {stats.curve.map((n, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center justify-end gap-0.5" style={{ height: '100%' }}>
                    <AnimatePresence mode="popLayout" initial={false}>
                      <motion.span key={n} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.16 }}
                        className="text-[9px] tabular-nums" style={{ color: n > 0 ? 'var(--gold)' : 'rgba(150,160,185,0.3)' }}>{n > 0 ? n : ''}</motion.span>
                    </AnimatePresence>
                    <motion.div className="w-full rounded-t"
                      animate={{ height: Math.max(n > 0 ? 8 : 2, (n / curveMax) * 62) }}
                      transition={{ type: 'spring', stiffness: 320, damping: 26, delay: i * 0.02 }}
                      style={{ background: n > 0 ? `linear-gradient(180deg, #ffe28c, rgb(${GOLD}) 40%, rgba(${GOLD},0.4))` : 'rgba(255,255,255,0.06)',
                        boxShadow: n > 0 ? `0 0 8px rgba(${GOLD},0.4), inset 0 1px 0 rgba(255,255,255,0.4)` : 'none' }} />
                    <span className="text-[9px] tabular-nums" style={{ color: 'var(--text-muted)' }}>{i < 7 ? i : '7+'}</span>
                  </div>
                ))}
              </div>
              {/* vidurkio žymeklis */}
              {total > 0 && (
                <motion.div className="absolute pointer-events-none" animate={{ left: `${6 + Math.min(7, stats.avg) / 7 * 88}%` }} transition={{ type: 'spring', stiffness: 200, damping: 24 }}
                  style={{ top: 4, bottom: 16 }}>
                  <div style={{ width: 1.5, height: '100%', background: `linear-gradient(180deg, transparent, rgba(${GOLD},0.75), transparent)` }} />
                  <span className="absolute rvn-disp" style={{ top: -2, left: 4, fontSize: 8.5, fontWeight: 800, color: `rgba(${GOLD},0.9)`, whiteSpace: 'nowrap' }}>vid. {stats.avg.toFixed(1)}</span>
                </motion.div>
              )}
            </div>
          </div>

          {/* Tipai + retumai */}
          {(stats.types.length > 0 || stats.rars.length > 0) && (
            <div className="flex flex-wrap gap-1.5">
              {stats.types.map(([t, n]) => (
                <span key={t} className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', color: 'var(--text-secondary)' }}>{t} <b style={{ color: '#f3ead3' }}>{n}</b></span>
              ))}
              {stats.rars.map(([r, n]) => (
                <span key={r} className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: rarityColor(r) + '14', border: `1px solid ${rarityColor(r)}55`, color: rarityColor(r) }}>{r} <b>{n}</b></span>
              ))}
            </div>
          )}

          {/* Kortų sąrašas su +/- */}
          {sorted.length === 0 ? (
            <p className="text-center text-sm py-8" style={{ color: 'var(--text-muted)' }}>Kaladė tuščia — tempk kortas iš sąrašo žemyn ant juostos.</p>
          ) : (
            <div className="space-y-1">
              <AnimatePresence initial={false}>
                {sorted.map((e) => {
                  const col = rarityColor(e.card.rarity?.name)
                  return (
                    <motion.div key={e.card.id} layout initial={{ opacity: 0, x: -14 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 14, height: 0, marginBottom: 0 }} transition={{ duration: 0.18 }}
                      className="flex items-center gap-2 px-2 py-1.5 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderLeft: `3px solid ${col}` }}>
                      <span className="flex items-center justify-center rounded-full shrink-0 tabular-nums" style={{ width: 20, height: 20, fontSize: 10, fontWeight: 800, background: `rgba(${GOLD},0.9)`, color: '#1a0f04' }}>{e.card.gold_cost}</span>
                      <button onClick={() => onCard(e.card)} className="flex-1 min-w-0 text-left">
                        <span className="block text-[12px] font-semibold truncate" style={{ color: '#f3ead3' }}>{e.card.is_champion ? '★ ' : ''}{e.card.name}</span>
                        <span className="block text-[9.5px] truncate" style={{ color: 'var(--text-muted)' }}>{[e.card.card_type?.name, e.card.rarity?.name].filter(Boolean).join(' · ')}</span>
                      </button>
                      <button onClick={() => onDec(e.card)} className="rvn-press flex items-center justify-center rounded-lg shrink-0" style={{ width: 30, height: 30, background: 'rgba(239,68,68,0.14)', border: '1px solid rgba(239,68,68,0.4)', color: '#fca5a5' }} aria-label="Mažiau"><Minus className="w-3.5 h-3.5" /></button>
                      <AnimatePresence mode="popLayout" initial={false}>
                        <motion.span key={e.quantity} initial={{ scale: 1.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}
                          className="text-[12px] font-bold tabular-nums text-center shrink-0" style={{ width: 22, color: 'var(--gold)' }}>×{e.quantity}</motion.span>
                      </AnimatePresence>
                      <button onClick={() => onInc(e.card)} className="rvn-press flex items-center justify-center rounded-lg shrink-0" style={{ width: 30, height: 30, background: 'rgba(34,197,94,0.14)', border: '1px solid rgba(34,197,94,0.45)', color: '#86efac' }} aria-label="Daugiau"><Plus className="w-3.5 h-3.5" /></button>
                    </motion.div>
                  )
                })}
              </AnimatePresence>
            </div>
          )}
        </div>
      </motion.div>
    </>
  )
}

function StatBox({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div className="rounded-xl px-2 py-2 text-center" style={{ background: `rgba(${accent},0.08)`, border: `1px solid rgba(${accent},0.3)` }}>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.p key={value} initial={{ y: -8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 8, opacity: 0 }} transition={{ duration: 0.16 }}
          className="rvn-disp tabular-nums" style={{ fontSize: 15, fontWeight: 800, color: `rgb(${accent})`, lineHeight: 1.1 }}>{value}</motion.p>
      </AnimatePresence>
      <p className="text-[9px] mt-0.5" style={{ color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{label}</p>
    </div>
  )
}

function Section({ step, title, children }: { step: number; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl p-3 space-y-2.5" style={{ background: 'rgba(10,8,16,0.65)', border: `1px solid rgba(${GOLD},0.16)` }}>
      <div className="flex items-center gap-2">
        <span className="flex items-center justify-center rounded-full text-[10px] font-bold" style={{ width: 18, height: 18, background: `rgba(${GOLD},0.18)`, border: `1px solid rgba(${GOLD},0.5)`, color: 'var(--gold)' }}>{step}</span>
        <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-secondary)', letterSpacing: '0.12em' }}>{title}</span>
      </div>
      {children}
    </div>
  )
}

function Toggle({ on, onClick, label, color }: { on: boolean; onClick: () => void; label: string; color: string }) {
  return (
    <button onClick={onClick} className="inline-flex items-center gap-1.5 px-2.5 rounded-full text-[11px] font-semibold" style={{ minHeight: 36, background: on ? `rgba(${color},0.18)` : 'rgba(10,8,16,0.9)', border: `1px solid ${on ? `rgba(${color},0.6)` : `rgba(${GOLD},0.25)`}`, color: on ? `rgb(${color})` : 'var(--text-muted)' }}>
      <span className="relative inline-block rounded-full" style={{ width: 26, height: 14, background: on ? `rgba(${color},0.5)` : 'rgba(255,255,255,0.12)' }}>
        <span className="absolute top-0.5 rounded-full bg-white transition-all" style={{ width: 10, height: 10, left: on ? 14 : 2 }} />
      </span>{label}
    </button>
  )
}

function Thumb({ c, owned, size = 44 }: { c: CardWithRelations; owned: number; size?: number }) {
  const [bad, setBad] = useState(false)
  const col = rarityColor(c.rarity?.name)
  return (
    <span className="relative block overflow-hidden rounded-md shrink-0" style={{ width: size, height: size, border: `1.5px solid ${owned > 0 ? col : 'rgba(120,120,140,0.4)'}` }}>
      {c.image_url && !bad
        // eslint-disable-next-line @next/next/no-img-element
        ? <img src={c.image_url} alt="" onError={() => setBad(true)} draggable={false} loading="lazy" decoding="async" className="absolute inset-0 w-full h-full object-cover" style={{ filter: owned > 0 ? undefined : 'grayscale(1) brightness(0.5)' }} />
        : <span className="absolute inset-0 flex items-center justify-center text-sm" style={{ background: '#15101f' }}>🎴</span>}
      {owned <= 0 && <span className="absolute inset-0 flex items-center justify-center"><Lock className="w-3.5 h-3.5" style={{ color: 'rgba(255,255,255,0.7)' }} /></span>}
    </span>
  )
}

type DragHandlers = { onPointerDown: (e: React.PointerEvent) => void; onClickCapture: (e: React.MouseEvent) => void }

function CardRow({ c, owned, deckQty, dragging, dragProps, onAdd, onDec, onPreview }: { c: CardWithRelations; owned: number; deckQty: number; dragging: boolean; dragProps: DragHandlers; onAdd: () => void; onDec: () => void; onPreview: () => void }) {
  const col = rarityColor(c.rarity?.name)
  const limit = getCopyLimit(c)
  const addDisabled = owned <= 0 || deckQty >= owned || deckQty >= limit
  return (
    <div className="flex items-center gap-2.5 p-1.5 rounded-xl" {...dragProps}
      style={{ background: deckQty > 0 ? `rgba(${GOLD},0.08)` : 'rgba(10,8,16,0.6)', border: `1px solid ${deckQty > 0 ? `rgba(${GOLD},0.35)` : `rgba(${GOLD},0.12)`}`, opacity: dragging ? 0.35 : 1, transition: 'opacity .15s' }}>
      <Thumb c={c} owned={owned} />
      <span className="flex items-center justify-center rounded-full text-[10px] font-bold shrink-0" style={{ width: 20, height: 20, background: `rgba(${GOLD},0.9)`, color: '#1a0f04' }}>{c.gold_cost}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-[12px] font-semibold leading-tight truncate" style={{ color: owned > 0 ? '#f3ead3' : 'var(--text-muted)' }}>{c.name}</span>
        <span className="block text-[9px] leading-tight truncate" style={{ color: col }}>{c.rarity?.name ?? ''} · {c.card_type?.name ?? ''} {owned > 0 && owned < 99 ? `· turi ×${owned}` : ''}</span>
      </span>
      <span className="text-[10px] font-bold tabular-nums shrink-0" style={{ color: deckQty > 0 ? 'var(--gold)' : 'var(--text-muted)' }}>{deckQty}/{Math.min(limit, owned || limit)}</span>
      <button onClick={onPreview} className="flex items-center justify-center rounded-lg shrink-0" style={{ width: 30, height: 30, color: 'var(--text-muted)' }} aria-label="Peržiūra"><Eye className="w-4 h-4" /></button>
      {deckQty > 0 && <button onClick={onDec} className="flex items-center justify-center rounded-lg shrink-0" style={{ width: 30, height: 30, background: 'rgba(239,68,68,0.16)', border: '1px solid rgba(239,68,68,0.4)', color: '#fca5a5' }} aria-label="Pašalinti"><Minus className="w-4 h-4" /></button>}
      <button onClick={onAdd} disabled={addDisabled} className="flex items-center justify-center rounded-lg shrink-0 disabled:opacity-30" style={{ width: 30, height: 30, background: 'rgba(34,197,94,0.16)', border: '1px solid rgba(34,197,94,0.45)', color: '#86efac' }} aria-label="Pridėti"><Plus className="w-4 h-4" /></button>
    </div>
  )
}

function CardTile({ c, owned, deckQty, dragging, dragProps, onAdd, onPreview }: { c: CardWithRelations; owned: number; deckQty: number; dragging: boolean; dragProps: DragHandlers; onAdd: () => void; onPreview: () => void }) {
  const col = rarityColor(c.rarity?.name)
  const limit = getCopyLimit(c)
  const addDisabled = owned <= 0 || deckQty >= owned || deckQty >= limit
  return (
    <div className="relative" {...dragProps} style={{ opacity: dragging ? 0.35 : 1, transition: 'opacity .15s' }}>
      <button onClick={onPreview} className="relative block w-full overflow-hidden rounded-lg" style={{ aspectRatio: '2.5 / 3.5', border: `2px solid ${owned > 0 ? col : 'rgba(120,120,140,0.4)'}` }}>
        <Thumb c={c} owned={owned} size={9999} />
      </button>
      {deckQty > 0 && <span className="absolute top-1 left-1 px-1.5 rounded-full text-[10px] font-bold" style={{ background: `rgba(${GOLD},0.95)`, color: '#1a0f04' }}>{deckQty}</span>}
      <button onClick={onAdd} disabled={addDisabled} className="absolute bottom-1 right-1 flex items-center justify-center rounded-full disabled:opacity-30" style={{ width: 26, height: 26, background: 'rgba(34,197,94,0.92)', color: '#04210f' }} aria-label="Pridėti"><Plus className="w-4 h-4" /></button>
    </div>
  )
}

function BuilderPreview({ c, owned, deckQty, onAdd, onClose }: { c: CardWithRelations; owned: number; deckQty: number; onAdd: () => boolean; onClose: () => void }) {
  const [bad, setBad] = useState(false)
  const col = rarityColor(c.rarity?.name)
  const limit = getCopyLimit(c)
  const addDisabled = owned <= 0 || deckQty >= owned || deckQty >= limit
  return (
    <div className="fixed inset-0 z-[160] flex items-center justify-center p-5" style={{ background: 'rgba(4,3,8,0.9)' }} onClick={onClose}>
      <div className="relative w-[min(340px,92vw)] rounded-2xl overflow-hidden" style={{ border: `2px solid ${col}`, background: 'linear-gradient(160deg,#15101f,#0a0810)' }} onClick={(e) => e.stopPropagation()}>
        <button onClick={() => { playUiClick(); onClose() }} className="absolute top-2 right-2 z-10 flex items-center justify-center rounded-full" style={{ width: 32, height: 32, background: 'rgba(0,0,0,0.6)', color: '#fff' }}><X className="w-4 h-4" /></button>
        <div className="relative w-full" style={{ aspectRatio: '2.5 / 3.5', maxHeight: '48vh' }}>
          {c.image_url && !bad
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={c.image_url} alt={c.name} onError={() => setBad(true)} draggable={false} className="absolute inset-0 w-full h-full object-contain" style={{ filter: owned > 0 ? undefined : 'grayscale(1) brightness(0.6)' }} />
            : <div className="absolute inset-0 flex items-center justify-center text-5xl">🎴</div>}
          {owned <= 0 && <span className="absolute inset-0 flex items-center justify-center"><Lock className="w-9 h-9" style={{ color: 'rgba(255,255,255,0.75)' }} /></span>}
        </div>
        <div className="p-4 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-base font-bold" style={{ fontFamily: 'var(--rvn-font-display)', color: '#f3ead3' }}>{c.name}</h2>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ color: col, border: `1px solid ${col}` }}>{c.rarity?.name ?? '—'}</span>
          </div>
          <div className="flex flex-wrap gap-x-3 text-[11px]" style={{ color: 'var(--text-muted)' }}>
            <span>🪙 {c.gold_cost}</span>{c.attack != null && <span>⚔️ {c.attack}</span>}{c.health != null && <span>❤️ {c.health}</span>}{c.faction?.name && <span>· {c.faction.name}</span>}{c.card_type?.name && <span>· {c.card_type.name}</span>}
          </div>
          {(c.effect_text || c.description) && <p className="text-xs leading-snug" style={{ color: 'var(--text-secondary)' }}>{c.effect_text || c.description}</p>}
          <p className="text-[11px] font-semibold" style={{ color: owned > 0 ? '#86efac' : '#fca5a5' }}>{owned > 0 ? `Turima ×${owned} · kaladėje ${deckQty}/${Math.min(limit, owned)}` : 'Kortos dar neturi'}</p>
          <button onClick={() => { onAdd() }} disabled={addDisabled} className="w-full px-4 rounded-xl text-sm font-bold disabled:opacity-40" style={{ minHeight: 44, background: 'rgba(34,197,94,0.18)', border: '1px solid rgba(34,197,94,0.5)', color: '#86efac', fontFamily: 'var(--rvn-font-display)' }}>Pridėti į kaladę</button>
        </div>
      </div>
    </div>
  )
}
