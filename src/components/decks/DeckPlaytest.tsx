'use client'

// ── DeckPlaytest — kaladės išbandymo režimas ──────────────────────────────────
// Maišai, trauki po vieną kortą į ranką, meti kortas ant stalo, tampai,
// apžiūrinėji (3D tilt). Garsai per ui-sound. Veikia desktop ir mobile.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { X, Shuffle, Hand as HandIcon, RotateCcw } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { GameCard } from '@/components/ui/GameCard'
import {
  playShuffle, playCardDraw, playCardPick, playCardPlace,
  playCardFlip, playUiClick, playError,
} from '@/lib/ui-sound'

type CardLite = {
  id: string
  name: string
  image: string | null
  gold: number | null
  attack: number | null
  health: number | null
  rarityColor: string
  factionColor: string
}

type PlayCard = { uid: string; c: CardLite }
type TableCard = { pc: PlayCard; left: number; top: number; rot: number; z: number }

// Long-press (mobile): apžiūra atidaroma palaikius pirštą ~450ms ant kortos.
// Pele (desktop) — paprastas click. Tap'as po drag'o ant touch nebeatidaro popup'o.
const LONG_PRESS_MS = 450
const MOVE_CANCEL_PX = 8

function useLongPress(onTrigger: () => void) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const startRef = useRef<{ x: number; y: number } | null>(null)
  // Kai long-press suveikė — vėlesnis dragEnd ignoruojamas (kad korta
  // nenukristų ant stalo, kol atidaryta apžiūra)
  const firedRef = useRef(false)

  const cancel = useCallback(() => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null }
    startRef.current = null
  }, [])

  useEffect(() => cancel, [cancel])

  const handlers = {
    onPointerDown: (e: React.PointerEvent) => {
      if (e.pointerType !== 'touch') return
      firedRef.current = false
      startRef.current = { x: e.clientX, y: e.clientY }
      timerRef.current = setTimeout(() => {
        timerRef.current = null
        firedRef.current = true
        try { navigator.vibrate?.(15) } catch { /* tyliai */ }
        onTrigger()
      }, LONG_PRESS_MS)
    },
    onPointerMove: (e: React.PointerEvent) => {
      if (!startRef.current || !timerRef.current) return
      if (Math.hypot(e.clientX - startRef.current.x, e.clientY - startRef.current.y) > MOVE_CANCEL_PX) cancel()
    },
    onPointerUp: cancel,
    onPointerCancel: cancel,
    onPointerLeave: cancel,
  }

  return { handlers, cancel, firedRef }
}

/** onTap tik pelei — touch naudoja long-press */
function mouseOnlyTap(cb: () => void) {
  return (e: MouseEvent | TouchEvent | PointerEvent) => {
    if ((e as PointerEvent).pointerType === 'mouse') cb()
  }
}

function fisherYates<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// ── Kortos vaizdas (ranka / stalas) ──────────────────────────────────────────
function CardFace({ c, width }: { c: CardLite; width: number }) {
  const h = Math.round(width * 4 / 3)
  return (
    <div
      className="relative rounded-lg overflow-hidden select-none"
      style={{
        width, height: h,
        background: 'var(--bg-surface)',
        border: '1.5px solid ' + c.rarityColor + '90',
        boxShadow: '0 4px 14px rgba(0,0,0,0.6), 0 0 10px ' + c.rarityColor + '25',
      }}
    >
      {c.image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={c.image} alt={c.name} draggable={false}
          className="absolute inset-0 w-full h-full object-cover pointer-events-none" />
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 px-1 text-center"
          style={{ background: c.factionColor + '18' }}>
          <span className="text-lg opacity-40" style={{ color: c.factionColor }}>⚜</span>
          <span className="text-[9px] leading-tight font-semibold" style={{ color: 'var(--text-secondary)' }}>
            {c.name}
          </span>
        </div>
      )}
      {c.gold !== null && (
        <span className="absolute top-0.5 left-0.5 px-1 rounded-full text-[9px] font-bold"
          style={{ background: 'rgba(0,0,0,0.8)', color: 'var(--gold)' }}>
          {c.gold}
        </span>
      )}
      {(c.attack !== null || c.health !== null) && (
        <span className="absolute bottom-0.5 right-0.5 px-1 rounded text-[9px] font-bold"
          style={{ background: 'rgba(0,0,0,0.8)', color: 'var(--text-primary)' }}>
          {c.attack ?? '–'}/{c.health ?? '–'}
        </span>
      )}
    </div>
  )
}

function CardBack({ width }: { width: number }) {
  return (
    <div
      className="rounded-lg flex items-center justify-center select-none"
      style={{
        width, height: Math.round(width * 4 / 3),
        background: 'linear-gradient(135deg, #1a1230, #0c0918 60%, #1d1133)',
        border: '1.5px solid rgba(240,180,41,0.4)',
        boxShadow: '0 4px 14px rgba(0,0,0,0.7)',
      }}
    >
      <span className="text-2xl" style={{ color: 'rgba(240,180,41,0.55)', textShadow: '0 0 10px rgba(240,180,41,0.4)' }}>⚜</span>
    </div>
  )
}

// ── Pagrindinis komponentas ───────────────────────────────────────────────────
export function DeckPlaytest({ deckId, deckName, onClose }: {
  deckId: string
  deckName: string
  onClose: () => void
}) {
  const [loading, setLoading]   = useState(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [pile, setPile]   = useState<PlayCard[]>([])
  const [hand, setHand]   = useState<PlayCard[]>([])
  const [table, setTable] = useState<TableCard[]>([])
  const [inspect, setInspect] = useState<{ pc: PlayCard; from: 'hand' | 'table' } | null>(null)
  const [pileShake, setPileShake] = useState(0)
  const zRef = useRef(10)
  // Snapshot ref — veiksmai skaito būseną iš čia, kad setState updater'iai
  // liktų gryni (StrictMode saugu, jokių dvigubų kortų)
  const stateRef = useRef({ pile, hand, table })
  useEffect(() => { stateRef.current = { pile, hand, table } }, [pile, hand, table])
  const tableRef = useRef<HTMLDivElement>(null)
  const isTouch = typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches
  const cardW = isTouch ? 72 : 92

  // ── Kaladės užkrovimas ──
  useEffect(() => {
    let alive = true
    const supabase = createClient()
    supabase
      .from('deck_cards')
      .select(`
        quantity,
        card:cards (
          id, name, image_url, gold_cost, attack, health,
          rarity:rarities ( color_hex ),
          faction:factions ( color_hex )
        )
      `)
      .eq('deck_id', deckId)
      .then(({ data, error }) => {
        if (!alive) return
        if (error || !data || data.length === 0) {
          setErrorMsg('Nepavyko užkrauti kaladės kortų')
          setLoading(false)
          return
        }
        const all: PlayCard[] = []
        for (const row of data as unknown[]) {
          const r = row as { quantity: number; card: {
            id: string; name: string; image_url: string | null
            gold_cost: number | null; attack: number | null; health: number | null
            rarity: { color_hex: string | null } | null
            faction: { color_hex: string | null } | null
          } }
          if (!r.card) continue
          const lite: CardLite = {
            id: r.card.id,
            name: r.card.name,
            image: r.card.image_url,
            gold: r.card.gold_cost,
            attack: r.card.attack,
            health: r.card.health,
            rarityColor: r.card.rarity?.color_hex ?? '#d4af37',
            factionColor: r.card.faction?.color_hex ?? '#d4af37',
          }
          for (let i = 0; i < r.quantity; i++) all.push({ uid: lite.id + '-' + i, c: lite })
        }
        setPile(fisherYates(all))
        setLoading(false)
        playShuffle()
      })
    return () => { alive = false }
  }, [deckId])

  // ── Body scroll lock + Escape ──
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { if (inspect) setInspect(null); else onClose() }
      if (e.key === 'd' || e.key === 'D') draw()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inspect, pile])

  // ── Veiksmai ──
  const draw = useCallback(() => {
    const { pile: cur } = stateRef.current
    if (cur.length === 0) {
      playError()
      setPileShake((s) => s + 1)
      return
    }
    const card = cur[cur.length - 1]
    setPile(cur.slice(0, -1))
    setHand((h) => [...h, card])
    playCardDraw()
  }, [])

  function drawN(n: number) {
    for (let i = 0; i < n; i++) setTimeout(draw, i * 130)
  }

  function shuffleAll() {
    const { pile: cp, hand: ch, table: ct } = stateRef.current
    setPile(fisherYates([...cp, ...ch, ...ct.map((t) => t.pc)]))
    setHand([])
    setTable([])
    setInspect(null)
    playShuffle()
  }

  function playToTable(uid: string, clientX?: number, clientY?: number) {
    const rect = tableRef.current?.getBoundingClientRect()
    const { hand: cur } = stateRef.current
    const pc = cur.find((p) => p.uid === uid)
    if (!pc) return
    const w = rect?.width ?? 600
    const hgt = rect?.height ?? 400
    const cardH = cardW * 4 / 3
    const left = rect && clientX !== undefined
      ? Math.min(Math.max(clientX - rect.left - cardW / 2, 4), w - cardW - 4)
      : w / 2 - cardW / 2 + (Math.random() * 80 - 40)
    const top = rect && clientY !== undefined
      ? Math.min(Math.max(clientY - rect.top - cardH / 2, 4), hgt - cardH - 4)
      : hgt / 2 - cardH / 2 + (Math.random() * 60 - 30)
    setHand(cur.filter((p) => p.uid !== uid))
    setTable((t) => [...t, { pc, left, top, rot: Math.random() * 10 - 5, z: ++zRef.current }])
    playCardPlace()
    setInspect(null)
  }

  function returnToHand(uid: string) {
    const { table: cur } = stateRef.current
    const tc = cur.find((t) => t.pc.uid === uid)
    if (!tc) return
    setTable(cur.filter((t) => t.pc.uid !== uid))
    setHand((h) => [...h, tc.pc])
    playCardPick()
    setInspect(null)
  }

  const fan = useMemo(() => {
    const n = hand.length
    return hand.map((pc, i) => {
      const off = i - (n - 1) / 2
      return { pc, rot: Math.max(-14, Math.min(14, off * (n > 8 ? 2 : 4))), lift: Math.abs(off) * (n > 8 ? 2 : 3) }
    })
  }, [hand])

  const body = (
    <div className="fixed inset-0 z-[100] flex flex-col"
      style={{
        background: [
          // Šilta „žvakės" šviesa stalo centre
          'radial-gradient(ellipse 75% 55% at 50% 38%, rgba(255,176,84,0.14) 0%, rgba(255,150,60,0.05) 45%, transparent 70%)',
          // Vinjetė kraštuose
          'radial-gradient(ellipse at center, transparent 35%, rgba(5,3,2,0.72) 100%)',
          // Medinis taverno stalas
          'url(/playtest/table-wood.jpg) center / cover no-repeat',
        ].join(', '),
        touchAction: 'none',
      }}>

      {/* ── Viršutinė juosta ── */}
      <div className="shrink-0 flex items-center gap-2 px-3 py-2"
        style={{ background: 'rgba(5,5,12,0.85)', borderBottom: '1px solid rgba(240,180,41,0.15)', backdropFilter: 'blur(10px)' }}>
        <span className="text-sm font-bold truncate min-w-0"
          style={{ fontFamily: 'var(--rvn-font-display)', color: 'var(--gold)', letterSpacing: '0.04em' }}>
          🎴 {deckName}
        </span>
        <span className="text-[11px] tabular-nums shrink-0 px-2 py-0.5 rounded-full"
          style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)', border: '1px solid var(--bg-border)' }}>
          🂠 {pile.length} · ✋ {hand.length} · 🎴 {table.length}
        </span>
        <div className="flex-1" />
        <button onClick={() => { playUiClick(); drawN(5) }}
          disabled={pile.length === 0}
          className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs transition-all hover:scale-105 disabled:opacity-30"
          style={{ background: 'var(--bg-elevated)', border: '1px solid rgba(240,180,41,0.25)', color: 'var(--gold)' }}>
          <HandIcon className="w-3.5 h-3.5" /> Pradinė ranka
        </button>
        <button onClick={shuffleAll}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs transition-all hover:scale-105"
          style={{ background: 'var(--bg-elevated)', border: '1px solid rgba(240,180,41,0.25)', color: 'var(--gold)' }}
          title="Visos kortos atgal į kaladę ir maišyti">
          <Shuffle className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Maišyti</span>
        </button>
        <button onClick={onClose}
          className="flex items-center justify-center w-8 h-8 rounded-lg transition-all hover:scale-105"
          style={{ background: 'var(--bg-elevated)', border: '1px solid var(--bg-border)', color: 'var(--text-muted)' }}
          aria-label="Uždaryti">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* ── Stalas ── */}
      <div ref={tableRef} className="relative flex-1 min-h-0 overflow-hidden">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-sm animate-pulse" style={{ color: 'var(--text-muted)' }}>Maišoma kaladė…</p>
          </div>
        )}
        {errorMsg && (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-sm" style={{ color: '#ef4444' }}>{errorMsg}</p>
          </div>
        )}
        {!loading && !errorMsg && table.length === 0 && (
          <p className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-xs text-center px-4 pointer-events-none"
            style={{ color: '#e8d9b8', opacity: 0.55, textShadow: '0 1px 6px rgba(0,0,0,0.9)' }}>
            Trauk kortą iš kaladės (arba spausk D),<br />
            tempk kortas iš rankos ant stalo.<br />
            Apžiūra: palaikyk pirštą / spustelk pele.
          </p>
        )}

        {/* Stalo kortos */}
        {table.map((tc) => (
          <TableCardItem
            key={tc.pc.uid}
            tc={tc}
            cardW={cardW}
            tableRef={tableRef}
            onBringToFront={(uid) => {
              playCardPick()
              setTable((prev) => prev.map((t) => t.pc.uid === uid ? { ...t, z: ++zRef.current } : t))
            }}
            onInspect={(pc) => { playCardFlip(); setInspect({ pc, from: 'table' }) }}
          />
        ))}
      </div>

      {/* ── Ranka + kaladė ── */}
      <div className="shrink-0 flex items-end gap-2 px-2 pb-2 pt-1"
        style={{ background: 'linear-gradient(to top, rgba(12,7,3,0.92) 30%, transparent)' }}>

        {/* Ranka (fan) */}
        <div className="flex-1 min-w-0 overflow-x-auto overflow-y-visible" style={{ touchAction: 'pan-x' }}>
          <div className="flex items-end justify-center px-4" style={{ minHeight: cardW * 4 / 3 + 26, minWidth: 'max-content', margin: '0 auto' }}>
            <AnimatePresence>
              {fan.map(({ pc, rot, lift }, i) => (
                <HandCardItem
                  key={pc.uid}
                  pc={pc}
                  rot={rot}
                  lift={lift}
                  index={i}
                  cardW={cardW}
                  tableRef={tableRef}
                  onPlay={playToTable}
                  onInspect={(p) => { playCardFlip(); setInspect({ pc: p, from: 'hand' }) }}
                />
              ))}
            </AnimatePresence>
            {hand.length === 0 && !loading && (
              <p className="text-[11px] self-center px-4 py-6" style={{ color: 'var(--text-muted)', opacity: 0.5 }}>
                Ranka tuščia
              </p>
            )}
          </div>
        </div>

        {/* Kaladės krūvelė */}
        <motion.button
          key={pileShake}
          onClick={draw}
          animate={pileShake ? { x: [0, -6, 6, -4, 4, 0] } : undefined}
          transition={{ duration: 0.35 }}
          whileHover={{ scale: 1.05, y: -3 }}
          whileTap={{ scale: 0.95 }}
          className="relative shrink-0 mb-1"
          style={{ touchAction: 'manipulation' }}
          title={pile.length > 0 ? 'Traukti kortą (D)' : 'Kaladė tuščia'}
          aria-label="Traukti kortą"
        >
          {/* Krūvelės gylio efektas */}
          {pile.length > 2 && (
            <div className="absolute -top-1 -left-1 opacity-60"><CardBack width={cardW} /></div>
          )}
          {pile.length > 1 && (
            <div className="absolute -top-0.5 -left-0.5 opacity-80"><CardBack width={cardW} /></div>
          )}
          {pile.length > 0 ? (
            <div className="relative"><CardBack width={cardW} /></div>
          ) : (
            <div className="relative rounded-lg flex items-center justify-center"
              style={{
                width: cardW, height: Math.round(cardW * 4 / 3),
                border: '1.5px dashed rgba(240,180,41,0.3)', color: 'var(--text-muted)',
              }}>
              <RotateCcw className="w-4 h-4 opacity-50" />
            </div>
          )}
          <span className="absolute -top-2 -right-2 min-w-[20px] h-5 px-1 rounded-full flex items-center justify-center text-[10px] font-bold tabular-nums"
            style={{ background: 'var(--gold)', color: '#0a0a0f', border: '2px solid #0a0810' }}>
            {pile.length}
          </span>
        </motion.button>
      </div>

      {/* ── Apžiūra (inspect) ── */}
      <AnimatePresence>
        {inspect && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-[110] flex flex-col items-center justify-center gap-4 p-4"
            style={{ background: 'rgba(0,0,0,0.78)', backdropFilter: 'blur(6px)' }}
            onClick={() => setInspect(null)}
          >
            <motion.div
              initial={{ scale: 0.7, rotateY: 25 }}
              animate={{ scale: 1, rotateY: 0 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 260, damping: 22 }}
              onClick={(e) => e.stopPropagation()}
            >
              <GameCard glowColor={inspect.pc.c.rarityColor} intensity={14} liftPx={0} className="rounded-xl">
                <CardFace c={inspect.pc.c} width={isTouch ? 230 : 280} />
              </GameCard>
            </motion.div>
            <p className="text-sm font-bold" style={{ color: 'var(--text-primary)', fontFamily: 'var(--rvn-font-display)' }}
              onClick={(e) => e.stopPropagation()}>
              {inspect.pc.c.name}
            </p>
            <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
              {inspect.from === 'hand' ? (
                <button onClick={() => playToTable(inspect.pc.uid)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold transition-all hover:scale-105"
                  style={{ background: 'var(--gold)', color: '#0a0a0f' }}>
                  🎴 Ant stalo
                </button>
              ) : (
                <button onClick={() => returnToHand(inspect.pc.uid)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold transition-all hover:scale-105"
                  style={{ background: 'var(--gold)', color: '#0a0a0f' }}>
                  ✋ Į ranką
                </button>
              )}
              <button onClick={() => setInspect(null)}
                className="px-4 py-2 rounded-lg text-xs transition-all hover:scale-105"
                style={{ background: 'var(--bg-elevated)', border: '1px solid var(--bg-border)', color: 'var(--text-secondary)' }}>
                Uždaryti
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )

  return createPortal(body, document.body)
}


// ── Stalo korta: drag + long-press apžiūra (touch) / click (pelė) ────────────
function TableCardItem({ tc, cardW, tableRef, onBringToFront, onInspect }: {
  tc: TableCard
  cardW: number
  tableRef: React.RefObject<HTMLDivElement | null>
  onBringToFront: (uid: string) => void
  onInspect: (pc: PlayCard) => void
}) {
  const { handlers: longPress, cancel: cancelLP, firedRef } = useLongPress(() => onInspect(tc.pc))
  return (
    <motion.div
      drag
      dragMomentum={false}
      dragConstraints={tableRef}
      onDragStart={() => { cancelLP(); onBringToFront(tc.pc.uid) }}
      onDragEnd={() => { if (!firedRef.current) playCardPlace() }}
      onTap={mouseOnlyTap(() => onInspect(tc.pc))}
      whileDrag={{ scale: 1.08, rotate: 0, boxShadow: '0 16px 40px rgba(0,0,0,0.8)' }}
      whileHover={{ scale: 1.04 }}
      initial={{ scale: 0.6, opacity: 0, rotate: tc.rot }}
      animate={{ scale: 1, opacity: 1, rotate: tc.rot }}
      className="absolute cursor-grab active:cursor-grabbing"
      style={{ left: tc.left, top: tc.top, zIndex: tc.z, touchAction: 'none' }}
      {...longPress}
    >
      <CardFace c={tc.pc.c} width={cardW} />
    </motion.div>
  )
}

// ── Rankos korta: drag į stalą + long-press apžiūra (touch) / click (pelė) ───
function HandCardItem({ pc, rot, lift, index, cardW, tableRef, onPlay, onInspect }: {
  pc: PlayCard
  rot: number
  lift: number
  index: number
  cardW: number
  tableRef: React.RefObject<HTMLDivElement | null>
  onPlay: (uid: string, x?: number, y?: number) => void
  onInspect: (pc: PlayCard) => void
}) {
  const { handlers: longPress, cancel: cancelLP, firedRef } = useLongPress(() => onInspect(pc))
  return (
    <motion.div
      layout
      drag
      dragSnapToOrigin
      dragElastic={0.2}
      onDragStart={() => { cancelLP(); playCardPick() }}
      onDragEnd={(_, info) => {
        if (firedRef.current) return // apžiūra atidaryta long-press'u — nieko nedarom
        const rect = tableRef.current?.getBoundingClientRect()
        if (rect && info.point.y < rect.bottom - 10) {
          onPlay(pc.uid, info.point.x, info.point.y)
        } else {
          playUiClick()
        }
      }}
      onTap={mouseOnlyTap(() => onInspect(pc))}
      initial={{ y: 90, opacity: 0, rotate: 0 }}
      animate={{ y: lift, opacity: 1, rotate: rot }}
      exit={{ y: -40, opacity: 0, transition: { duration: 0.15 } }}
      whileDrag={{ scale: 1.12, rotate: 0, zIndex: 90 }}
      whileHover={{ y: lift - 14, scale: 1.06, zIndex: 50 }}
      className="relative cursor-grab active:cursor-grabbing"
      style={{
        marginLeft: index === 0 ? 0 : -(cardW * 0.35),
        zIndex: index,
        touchAction: 'none',
        transformOrigin: 'bottom center',
      }}
      {...longPress}
    >
      <CardFace c={pc.c} width={cardW} />
    </motion.div>
  )
}
