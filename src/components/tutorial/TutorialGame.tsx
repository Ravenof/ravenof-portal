'use client'

// ── TutorialGame — „Išmokyk mane žaisti" ──────────────────────────────────────
// Pilnas mokomasis mūšis prieš AI: kovos laukas su zonomis, auksas, HP,
// žetonai, ŽMK, pop-up scenarijus ir dark fantasy ambient muzika.
// Varikliukas: src/lib/tutorial/engine.ts, AI: ai.ts, scenarijus: script.ts.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { X, Swords, Music, VolumeX } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { GameCard } from '@/components/ui/GameCard'
import {
  playShuffle, playCardDraw, playCardPlace, playCardFlip,
  playUiClick, playSuccess, playError, playCardPick,
  isUiSoundEnabled, toggleUiSound, subscribeUiSound,
} from '@/lib/ui-sound'
import {
  GameState, GameEvent, TutCard, BoardUnit, TargetRef, Side,
  createGame, beginTurn, endTurn, playCard, attack, discardForGold,
  useChampionAbility, canUnitAttack, legalTargets, cloneState, P,
  parseEffect, detectKeywords, mapCardType, effectiveAtk,
  STATUS_META, TutStatus,
} from '@/lib/tutorial/engine'
import { aiNextAction } from '@/lib/tutorial/ai'
import { startAmbient, stopAmbient } from '@/lib/tutorial/ambient'
import { GUIDED_STEPS, MECHANIC_TIPS, TutStep, TipKey } from '@/lib/tutorial/script'

type Props = { deckId: string; deckName: string; onClose: () => void }

// ── Duomenų užkrovimas ────────────────────────────────────────────────────────

type DbRow = {
  quantity: number
  card: {
    id: string; name: string; image_url: string | null
    gold_cost: number | null; attack: number | null; health: number | null
    effect_text: string | null; description: string | null; is_champion: boolean | null
    card_type: { name: string } | null
    rarity: { color_hex: string | null } | null
    faction: { color_hex: string | null } | null
    card_keywords: { keyword: { name: string } | null }[] | null
  } | null
}

function rowsToDeck(rows: DbRow[], suffix: string): TutCard[] {
  const out: TutCard[] = []
  for (const r of rows) {
    const c = r.card
    if (!c) continue
    const kwNames = (c.card_keywords ?? []).map((k) => k.keyword?.name ?? '').filter(Boolean)
    const text = [c.effect_text, c.description].filter(Boolean).join(' ')
    const base: Omit<TutCard, 'uid'> = {
      id: c.id,
      name: c.name,
      image: c.image_url,
      gold: c.gold_cost ?? 100,
      attack: c.attack,
      health: c.health,
      type: mapCardType(c.card_type?.name, !!c.is_champion),
      keywords: detectKeywords(kwNames, text),
      effectText: text,
      rarityColor: c.rarity?.color_hex ?? '#d4af37',
      factionColor: c.faction?.color_hex ?? '#d4af37',
      effect: parseEffect(text),
    }
    for (let i = 0; i < r.quantity; i++) out.push({ ...base, uid: `${c.id}-${suffix}-${i}` })
  }
  return out
}

// ── Maža kortos „veido" reprezentacija ───────────────────────────────────────

function MiniCard({ c, w, dim, faceDown }: { c: TutCard; w: number; dim?: boolean; faceDown?: boolean }) {
  const h = Math.round(w * 4 / 3)
  if (faceDown) {
    return (
      <div className="rounded-lg flex items-center justify-center select-none"
        style={{
          width: w, height: h,
          background: 'linear-gradient(145deg, #1a1325, #0d0a14)',
          border: '1.5px solid rgba(240,180,41,0.25)',
          boxShadow: '0 3px 10px rgba(0,0,0,0.6)',
        }}>
        <span className="text-xl opacity-30" style={{ color: 'var(--gold)' }}>🐦‍⬛</span>
      </div>
    )
  }
  return (
    <div className="relative rounded-lg overflow-hidden select-none"
      style={{
        width: w, height: h,
        background: 'var(--bg-surface)',
        border: '1.5px solid ' + c.rarityColor + '90',
        boxShadow: '0 3px 10px rgba(0,0,0,0.6), 0 0 8px ' + c.rarityColor + '22',
        opacity: dim ? 0.45 : 1,
      }}>
      {c.image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={c.image} alt={c.name} draggable={false}
          className="absolute inset-0 w-full h-full object-cover pointer-events-none" />
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5 px-1 text-center"
          style={{ background: c.factionColor + '18' }}>
          <span className="text-base opacity-40" style={{ color: c.factionColor }}>⚜</span>
          <span className="text-[8px] leading-tight font-semibold" style={{ color: 'var(--text-secondary)' }}>{c.name}</span>
        </div>
      )}
      <span className="absolute top-0.5 left-0.5 px-1 rounded-full text-[9px] font-bold"
        style={{ background: 'rgba(0,0,0,0.8)', color: 'var(--gold)' }}>{c.gold}</span>
      {c.attack !== null && c.type === 'unit' && (
        <span className="absolute bottom-0.5 left-0.5 px-1 rounded text-[9px] font-bold"
          style={{ background: 'rgba(0,0,0,0.8)', color: '#f87171' }}>{c.attack}</span>
      )}
      {c.health !== null && c.type !== 'spell' && (
        <span className="absolute bottom-0.5 right-0.5 px-1 rounded text-[9px] font-bold"
          style={{ background: 'rgba(0,0,0,0.8)', color: '#4ade80' }}>{c.health}</span>
      )}
    </div>
  )
}

// ── Padaro plytelė kovos lauke ───────────────────────────────────────────────

function UnitTile({ g, u, w, selected, targetable, canAct, onClick }: {
  g: GameState; u: BoardUnit; w: number
  selected?: boolean; targetable?: boolean; canAct?: boolean
  onClick?: () => void
}) {
  const h = Math.round(w * 4 / 3)
  const atk = effectiveAtk(g, u)
  const ring = selected ? '#f0b429' : targetable ? '#ef4444' : canAct ? 'rgba(74,222,128,0.7)' : 'transparent'
  return (
    <motion.button
      layout
      initial={{ scale: 0.6, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.6, opacity: 0 }}
      onClick={onClick}
      className="relative rounded-lg overflow-visible select-none"
      style={{ width: w, height: h, cursor: onClick ? 'pointer' : 'default' }}
    >
      <div className="absolute inset-0 rounded-lg overflow-hidden"
        style={{
          background: 'var(--bg-surface)',
          border: u.isChampion ? '2px solid #f0b429' : '1.5px solid ' + u.card.rarityColor + '90',
          boxShadow: ring !== 'transparent'
            ? `0 0 0 2px ${ring}, 0 0 14px ${ring}`
            : '0 3px 10px rgba(0,0,0,0.6)',
        }}>
        {u.card.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={u.card.image} alt={u.card.name} draggable={false}
            className="absolute inset-0 w-full h-full object-cover pointer-events-none" />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5 px-1 text-center"
            style={{ background: u.card.factionColor + '18' }}>
            <span className="text-base opacity-40" style={{ color: u.card.factionColor }}>{u.isChampion ? '⚜' : '🜏'}</span>
            <span className="text-[8px] leading-tight font-semibold" style={{ color: 'var(--text-secondary)' }}>{u.card.name}</span>
          </div>
        )}
        {/* stat juosta */}
        <div className="absolute bottom-0 inset-x-0 flex justify-between px-0.5 pb-0.5">
          {!u.isChampion ? (
            <span className="px-1 rounded text-[10px] font-bold" style={{ background: 'rgba(0,0,0,0.85)', color: '#f87171' }}>{atk}</span>
          ) : (
            <span className="px-1 rounded text-[10px] font-bold" style={{ background: 'rgba(0,0,0,0.85)', color: 'var(--gold)' }}>F{u.phase}</span>
          )}
          <span className="px-1 rounded text-[10px] font-bold"
            style={{ background: 'rgba(0,0,0,0.85)', color: u.hp < u.maxHp ? '#fbbf24' : '#4ade80' }}>{u.hp}</span>
        </div>
      </div>
      {/* žetonai: būsenos + skydas + sėlinimas + pasišaipymas */}
      <div className="absolute -top-2 inset-x-0 flex justify-center gap-0.5 pointer-events-none flex-wrap">
        {u.shield && <Token title="Magiškasis skydas">✦★</Token>}
        {u.stealth && <Token title="Sėlinimas">◑</Token>}
        {u.card.keywords.includes('taunt') && <Token title="Pasišaipymas">⊙</Token>}
        {(Object.keys(u.statuses) as TutStatus[]).map((s) => (
          <Token key={s} title={STATUS_META[s].name}>{STATUS_META[s].icon}</Token>
        ))}
      </div>
    </motion.button>
  )
}

function Token({ children, title }: { children: React.ReactNode; title: string }) {
  return (
    <span title={title}
      className="inline-flex items-center justify-center rounded-full text-[9px] leading-none"
      style={{
        minWidth: 16, height: 16, padding: '0 3px',
        background: 'radial-gradient(circle at 35% 30%, #2a2138, #14101e)',
        border: '1px solid rgba(240,180,41,0.5)',
        boxShadow: '0 1px 4px rgba(0,0,0,0.7)',
        color: 'var(--gold)',
      }}>
      {children}
    </span>
  )
}

// ── Pagrindinis komponentas ───────────────────────────────────────────────────

type SelectMode =
  | { kind: 'attacker'; uid: string }
  | { kind: 'spell'; uid: string }
  | { kind: 'sacrifice'; cardUid: string }
  | { kind: 'discard' }
  | null

export function TutorialGame({ deckId, deckName, onClose }: Props) {
  const [game, setGame] = useState<GameState | null>(null)
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [deckCards, setDeckCards] = useState<TutCard[] | null>(null)
  const [stepIdx, setStepIdx] = useState(0)
  const [tipQueue, setTipQueue] = useState<TipKey[]>([])
  const [select, setSelect] = useState<SelectMode>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [zmkFlash, setZmkFlash] = useState<{ v: string; side: Side; n: number } | null>(null)
  const [inspect, setInspect] = useState<TutCard | null>(null)
  const [showLog, setShowLog] = useState(false)
  const [soundOn, setSoundOn] = useState(true)
  const seenRef = useRef(0)
  const shownTipsRef = useRef<Set<string>>(new Set())
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const step: TutStep | null = stepIdx < GUIDED_STEPS.length ? GUIDED_STEPS[stepIdx] : null
  const activeTip: TipKey | null = !step && tipQueue.length > 0 ? tipQueue[0] : null
  // Pop-up be reikalaujamo veiksmo (arba patarimas) – pristabdo AI ir veiksmus
  const popupBlocks = (!!step && !step.require) || !!activeTip
  const isTouch = typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches
  const handW = isTouch ? 58 : 78
  const unitW = isTouch ? 56 : 72

  // ── Užkrovimas ──
  useEffect(() => {
    let alive = true
    const supabase = createClient()
    supabase
      .from('deck_cards')
      .select(`
        quantity,
        card:cards (
          id, name, image_url, gold_cost, attack, health,
          effect_text, description, is_champion,
          card_type:card_types ( name ),
          rarity:rarities ( color_hex ),
          faction:factions ( color_hex ),
          card_keywords ( keyword:keywords ( name ) )
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
        const rows = data as unknown as DbRow[]
        setDeckCards(rowsToDeck(rows, 'p'))
        setLoading(false)
      })
    return () => { alive = false }
  }, [deckId])

  // ── Žaidimo (per)kūrimas ──
  const initGame = useCallback((cards: TutCard[]) => {
    const g = createGame(
      cards.map((c, i) => ({ ...c, uid: c.uid + '-y' + i })),
      cards.map((c, i) => ({ ...c, uid: c.uid + '-a' + i })),
      'you',
    )
    beginTurn(g)
    seenRef.current = g.log.length
    setGame(g)
    playShuffle()
  }, [])

  useEffect(() => { if (deckCards) initGame(deckCards) }, [deckCards, initGame])

  // ── Ambient muzika + garso būsenos sekimas ──
  useEffect(() => {
    const stop = startAmbient()
    setSoundOn(isUiSoundEnabled())
    const unsub = subscribeUiSound(setSoundOn)
    return () => { stop(); unsub() }
  }, [])

  // ── Body scroll lock + Escape ──
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (inspect) setInspect(null)
        else if (select) setSelect(null)
        else onClose()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [inspect, select, onClose])

  const pushToast = useCallback((msg: string) => {
    playError()
    setToast(msg)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 3200)
  }, [])

  const queueTip = useCallback((k: TipKey) => {
    if (shownTipsRef.current.has(k)) return
    shownTipsRef.current.add(k)
    setTipQueue((q) => [...q, k])
  }, [])

  // ── Naujų įvykių apdorojimas: garsai, ŽMK, patarimai, žingsnių progresas ──
  useEffect(() => {
    if (!game) return
    const fresh = game.log.slice(seenRef.current)
    seenRef.current = game.log.length
    let zmkN = 0
    for (const e of fresh) {
      switch (e.t) {
        case 'draw': playCardDraw(); break
        case 'play': case 'artifact': case 'champion': playCardPlace(); break
        case 'spell': case 'ability': playCardFlip(); break
        case 'attack': playCardPick(); break
        case 'zmk':
          zmkN += 1
          setZmkFlash({ v: e.zmk ?? '?', side: e.side, n: zmkN })
          playCardFlip()
          if (e.zmk === 'x2' || e.zmk === 'x0') queueTip('zmk-special')
          break
        case 'win': if (e.side === 'you') playSuccess(); else playError(); break
        case 'lastwish': queueTip('lastwish'); break
        case 'battlecry': queueTip('battlecry'); break
        case 'reactionTrigger': queueTip('reaction'); break
        case 'field': queueTip('field'); break
        case 'evolve': queueTip('evolve'); playSuccess(); break
        case 'handBurn': queueTip('hand-burn'); break
        case 'curse': queueTip('curse'); break
        case 'coin': queueTip('coin'); break
        case 'status': if (e.status) queueTip(('status-' + e.status) as TipKey); break
        default: break
      }
      if (e.t === 'champion') queueTip('champion')
      if (e.t === 'artifact') queueTip('artifact')
      if (e.t === 'play' && /Sprintas/.test(e.msg)) queueTip('sprint')
    }
    // lentos skenavimas raktažodžių patarimams
    for (const s of ['you', 'ai'] as Side[]) {
      for (const u of P(game, s).units) {
        if (!u) continue
        if (u.card.keywords.includes('taunt')) queueTip('taunt')
        if (u.stealth) queueTip('stealth')
        if (u.shield) queueTip('shield')
        if (u.statuses.poisoned) queueTip('unfavorable')
      }
    }
    // vedamų žingsnių progresas pagal įvykius
    if (step?.require) {
      const done = fresh.some((e) =>
        (step.require === 'play-unit' && (e.t === 'play' || e.t === 'spell' || e.t === 'artifact') && e.side === 'you') ||
        (step.require === 'attack' && e.t === 'attack' && e.side === 'you') ||
        (step.require === 'end-turn' && e.t === 'endTurn' && e.side === 'you') ||
        (step.require === 'any-play' && e.side === 'you' && ['play', 'spell', 'artifact'].includes(e.t)))
      if (done) setStepIdx((i) => i + 1)
    }
  }, [game, step, queueTip])

  // ŽMK flash dingsta
  useEffect(() => {
    if (!zmkFlash) return
    const t = setTimeout(() => setZmkFlash(null), 1500)
    return () => clearTimeout(t)
  }, [zmkFlash])

  // ── AI ėjimo ciklas ──
  useEffect(() => {
    if (!game || game.winner || game.active !== 'ai' || popupBlocks) return
    const t = setTimeout(() => {
      setGame((prev) => {
        if (!prev || prev.winner || prev.active !== 'ai') return prev
        const g = cloneState(prev)
        const act = aiNextAction(g)
        if (!act) {
          endTurn(g)
          if (!g.winner) beginTurn(g)
        }
        return g
      })
    }, 1000)
    return () => clearTimeout(t)
  }, [game, popupBlocks])

  // ── Žaidėjo veiksmai ──
  const myTurn = !!game && game.active === 'you' && !game.winner

  const update = useCallback((fn: (g: GameState) => { ok: boolean; reason?: string } | void) => {
    setGame((prev) => {
      if (!prev) return prev
      const g = cloneState(prev)
      const r = fn(g)
      if (r && !r.ok) {
        pushToast(r.reason ?? 'Veiksmas negalimas')
        return prev
      }
      return g
    })
  }, [pushToast])

  const onHandCardClick = (c: TutCard) => {
    if (!myTurn) { pushToast('Palauk savo ėjimo.'); return }
    if (popupBlocks) return
    if (step?.require === 'end-turn') { pushToast('Dabar spausk „Baigti ėjimą".'); return }
    if (select?.kind === 'discard') {
      update((g) => discardForGold(g, 'you', c.uid))
      setSelect(null)
      return
    }
    if (c.type === 'champion') {
      const hasSac = game!.you.units.some((u) => u && !u.isChampion)
      if (!hasSac) { pushToast('Čempionui reikia paaukoti padarą – pirmiausia turėk padarą lauke.'); return }
      if (game!.you.gold < c.gold) { pushToast(`Trūksta aukso: kaina ${c.gold}, turi ${game!.you.gold}.`); return }
      playUiClick()
      setSelect({ kind: 'sacrifice', cardUid: c.uid })
      return
    }
    const needsTarget = (c.type === 'spell' || (c.type === 'unit' && c.keywords.includes('battlecry'))) && c.effect?.targeted
    if (needsTarget) {
      if (game!.you.gold < c.gold) { pushToast(`Trūksta aukso: kaina ${c.gold}, turi ${game!.you.gold}.`); return }
      playUiClick()
      setSelect({ kind: 'spell', uid: c.uid })
      return
    }
    update((g) => playCard(g, 'you', c.uid))
    setSelect(null)
  }

  const onMyUnitClick = (u: BoardUnit) => {
    if (!myTurn || popupBlocks) return
    if (select?.kind === 'sacrifice') {
      if (u.isChampion) { pushToast('Čempiono paaukoti negalima.'); return }
      const cardUid = select.cardUid
      update((g) => playCard(g, 'you', cardUid, { sacrificeUid: u.uid }))
      setSelect(null)
      return
    }
    if (select?.kind === 'spell') {
      const uid = select.uid
      update((g) => playCard(g, 'you', uid, { target: { kind: 'unit', side: 'you', uid: u.uid } }))
      setSelect(null)
      return
    }
    if (u.isChampion) {
      update((g) => useChampionAbility(g, 'you'))
      return
    }
    const can = canUnitAttack(game!, 'you', u)
    if (!can.ok) { pushToast(can.reason ?? ''); return }
    playUiClick()
    setSelect(select?.kind === 'attacker' && select.uid === u.uid ? null : { kind: 'attacker', uid: u.uid })
  }

  const onTargetClick = (t: TargetRef) => {
    if (!myTurn || popupBlocks) return
    if (select?.kind === 'attacker') {
      const uid = select.uid
      update((g) => attack(g, 'you', uid, t))
      setSelect(null)
    } else if (select?.kind === 'spell') {
      const uid = select.uid
      update((g) => playCard(g, 'you', uid, { target: t }))
      setSelect(null)
    }
  }

  const onEndTurn = () => {
    if (!myTurn || popupBlocks) return
    if (step && step.require && step.require !== 'end-turn') { pushToast('Pirmiausia atlik užduotį iš patarimo.'); return }
    playUiClick()
    setSelect(null)
    update((g) => {
      endTurn(g)
      if (!g.winner) beginTurn(g)
    })
  }

  // teisėti taikiniai pažymėjimui
  const targetSet = useMemo(() => {
    if (!game || !select) return new Set<string>()
    if (select.kind === 'attacker') {
      const ts = legalTargets(game, 'you')
      return new Set(ts.map((t) => t.kind + ':' + ('uid' in t ? t.uid : t.side)))
    }
    if (select.kind === 'spell') {
      const s = new Set<string>()
      for (const u of game.ai.units) if (u && !u.stealth) s.add('unit:' + u.uid)
      for (const u of game.you.units) if (u) s.add('unit:' + u.uid)
      for (const a of game.ai.artifacts) if (a) s.add('artifact:' + a.uid)
      s.add('player:ai'); s.add('player:you')
      return s
    }
    return new Set<string>()
  }, [game, select])

  // ── Pop-up inkaro matavimas ──
  const anchorKey = step?.anchor ?? (activeTip ? null : null)
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null)
  useEffect(() => {
    if (!step || step.anchor === 'center') { setAnchorRect(null); return }
    const measure = () => {
      const el = document.querySelector(`[data-tut="${step.anchor}"]`)
      setAnchorRect(el ? el.getBoundingClientRect() : null)
    }
    measure()
    window.addEventListener('resize', measure)
    const t = setInterval(measure, 600)
    return () => { window.removeEventListener('resize', measure); clearInterval(t) }
  }, [step, anchorKey, game])

  if (typeof document === 'undefined') return null

  // ── Pagalbiniai render gabalai ──
  const renderPile = (label: string, count: number, tut?: string, faceUp = false) => (
    <div data-tut={tut} className="flex flex-col items-center gap-0.5">
      <div className="relative rounded-md flex items-center justify-center"
        style={{
          width: 34, height: 46,
          background: faceUp ? 'rgba(240,180,41,0.08)' : 'linear-gradient(145deg, #1a1325, #0d0a14)',
          border: '1px solid rgba(240,180,41,0.3)',
        }}>
        <span className="text-[11px] font-bold" style={{ color: 'var(--gold)' }}>{count}</span>
      </div>
      <span className="text-[8px] uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>{label}</span>
    </div>
  )

  const renderUnitsRow = (side: Side, tut: string) => {
    if (!game) return null
    const p = P(game, side)
    return (
      <div data-tut={tut} className="flex justify-center gap-1.5 sm:gap-2 min-h-[80px] items-center">
        <AnimatePresence>
          {p.units.map((u, i) => u ? (
            <div key={u.uid} onContextMenu={(e) => { e.preventDefault(); setInspect(u.card) }}>
              <UnitTile
                g={game} u={u} w={unitW}
                selected={select?.kind === 'attacker' && select.uid === u.uid}
                targetable={side === 'ai' ? targetSet.has('unit:' + u.uid) : (select?.kind === 'spell' || select?.kind === 'sacrifice') && targetSet.has('unit:' + u.uid) || (select?.kind === 'sacrifice' && !u.isChampion)}
                canAct={side === 'you' && myTurn && !u.isChampion && canUnitAttack(game, 'you', u).ok}
                onClick={() => side === 'you' ? onMyUnitClick(u) : onTargetClick({ kind: 'unit', side: 'ai', uid: u.uid })}
              />
            </div>
          ) : (
            <div key={side + '-slot-' + i} className="rounded-lg"
              style={{
                width: unitW, height: Math.round(unitW * 4 / 3),
                border: '1px dashed rgba(240,180,41,0.18)',
                background: 'rgba(240,180,41,0.02)',
              }} />
          ))}
        </AnimatePresence>
      </div>
    )
  }

  const renderSideZones = (side: Side) => {
    if (!game) return null
    const p = P(game, side)
    return (
      <div data-tut={side === 'you' ? 'artifacts' : undefined} className="flex justify-center gap-3 items-center">
        <div className="flex gap-1">
          {p.artifacts.map((a, i) => a ? (
            <button key={a.uid}
              onClick={() => side === 'ai' && onTargetClick({ kind: 'artifact', side: 'ai', uid: a.uid })}
              onContextMenu={(e) => { e.preventDefault(); setInspect(a.card) }}
              className="relative rounded-md overflow-hidden"
              style={{
                width: 40, height: 54,
                border: targetSet.has('artifact:' + a.uid) ? '2px solid #ef4444' : '1px solid rgba(240,180,41,0.4)',
              }}>
              {a.card.image
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={a.card.image} alt={a.card.name} className="absolute inset-0 w-full h-full object-cover" />
                : <div className="absolute inset-0 flex items-center justify-center text-sm" style={{ background: 'rgba(240,180,41,0.07)' }}>⭐</div>}
              <span className="absolute bottom-0 right-0 px-0.5 rounded-tl text-[9px] font-bold"
                style={{ background: 'rgba(0,0,0,0.85)', color: '#4ade80' }}>{a.hp}</span>
            </button>
          ) : (
            <div key={side + '-art-' + i} className="rounded-md flex items-center justify-center text-[10px] opacity-25"
              style={{ width: 40, height: 54, border: '1px dashed rgba(240,180,41,0.25)' }}>⭐</div>
          ))}
        </div>
        <div data-tut={side === 'you' ? 'reactions' : undefined} className="flex gap-1">
          {p.reactions.map((r, i) => r ? (
            <div key={r.uid} className="relative rounded-md"
              style={{ width: 40, height: 54, background: 'linear-gradient(145deg, #1a1325, #0d0a14)', border: '1px solid rgba(139,92,246,0.5)' }}>
              <span className="absolute inset-0 flex items-center justify-center text-sm opacity-50">⚡</span>
              <span className="absolute -top-1.5 left-1/2 -translate-x-1/2 px-1 rounded-full text-[8px] font-bold"
                style={{ background: 'rgba(0,0,0,0.9)', color: 'var(--gold)', border: '1px solid rgba(240,180,41,0.5)' }}>{r.paid}⚜</span>
            </div>
          ) : (
            <div key={side + '-rea-' + i} className="rounded-md flex items-center justify-center text-[10px] opacity-25"
              style={{ width: 40, height: 54, border: '1px dashed rgba(139,92,246,0.3)' }}>⚡</div>
          ))}
        </div>
      </div>
    )
  }

  const hpBar = (side: Side) => {
    if (!game) return null
    const p = P(game, side)
    const targetable = side === 'ai' && targetSet.has('player:ai')
    return (
      <button
        data-tut={side === 'you' ? 'hp' : undefined}
        onClick={() => side === 'ai' && onTargetClick({ kind: 'player', side: 'ai' })}
        disabled={!targetable}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
        style={{
          background: 'rgba(0,0,0,0.5)',
          border: targetable ? '2px solid #ef4444' : '1px solid rgba(239,68,68,0.35)',
          boxShadow: targetable ? '0 0 12px rgba(239,68,68,0.6)' : 'none',
          cursor: targetable ? 'pointer' : 'default',
        }}>
        <span className="text-sm">❤️</span>
        <span className="text-sm font-bold" style={{ color: p.hp <= 10 ? '#ef4444' : 'var(--text-primary)', fontFamily: 'var(--rvn-font-display)' }}>
          {Math.max(0, p.hp)}
        </span>
      </button>
    )
  }

  const goldBar = (side: Side) => {
    if (!game) return null
    const p = P(game, side)
    return (
      <div data-tut={side === 'you' ? 'gold' : undefined} className="flex items-center gap-1 px-2.5 py-1 rounded-full"
        style={{ background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(240,180,41,0.4)' }}>
        <span className="text-sm">⚜</span>
        <span className="text-sm font-bold" style={{ color: 'var(--gold)', fontFamily: 'var(--rvn-font-display)' }}>{p.gold}</span>
      </div>
    )
  }

  const lastMsg = game?.log[game.log.length - 1]?.msg ?? ''

  return createPortal(
    <div className="fixed inset-0 z-[120] flex flex-col"
      style={{
        background: 'radial-gradient(ellipse at 50% 0%, #1a1325 0%, #0a0810 60%, #060409 100%)',
      }}>
      {/* viršutinė juosta */}
      <div className="flex items-center justify-between px-3 py-2 shrink-0"
        style={{ borderBottom: '1px solid rgba(240,180,41,0.15)', background: 'rgba(0,0,0,0.35)' }}>
        <div className="flex items-center gap-2 min-w-0">
          <Swords className="w-4 h-4 shrink-0" style={{ color: 'var(--gold)' }} />
          <span className="text-xs sm:text-sm font-bold truncate" style={{ fontFamily: 'var(--rvn-font-display)', color: 'var(--text-primary)' }}>
            Mokomoji kova · {deckName}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={() => { toggleUiSound(); playUiClick() }} title={soundOn ? 'Išjungti garsą ir muziką' : 'Įjungti garsą ir muziką'}
            className="p-1.5 rounded-lg transition-colors hover:bg-white/5">
            {soundOn ? <Music className="w-4 h-4" style={{ color: 'var(--gold)' }} /> : <VolumeX className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />}
          </button>
          <button onClick={() => { playUiClick(); setShowLog((v) => !v) }} title="Įvykių žurnalas"
            className="p-1.5 rounded-lg transition-colors hover:bg-white/5 text-sm">📜</button>
          <button onClick={() => { playUiClick(); onClose() }} title="Užverti (Esc)"
            className="p-1.5 rounded-lg transition-colors hover:bg-white/5">
            <X className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
          </button>
        </div>
      </div>

      {loading && (
        <div className="flex-1 flex items-center justify-center">
          <span className="text-sm animate-pulse" style={{ color: 'var(--text-secondary)' }}>Maišomos kaladės…</span>
        </div>
      )}
      {errorMsg && (
        <div className="flex-1 flex items-center justify-center">
          <span className="text-sm" style={{ color: '#ef4444' }}>{errorMsg}</span>
        </div>
      )}

      {game && !loading && (
        <div className="flex-1 flex flex-col overflow-hidden px-2 py-1.5 gap-1">
          {/* ── AI pusė ── */}
          <div data-tut="ai-area" className="shrink-0">
            <div className="flex items-center justify-center gap-2 sm:gap-3 flex-wrap">
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full" style={{ background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.35)' }}>
                <span className="text-base">🜏</span>
                <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: '#a78bfa' }}>Priešininkas</span>
                {game.active === 'ai' && !game.winner && <span className="text-[9px] animate-pulse" style={{ color: 'var(--gold)' }}>galvoja…</span>}
              </div>
              {hpBar('ai')}
              {goldBar('ai')}
              <div className="flex items-end gap-2">
                {renderPile('Ranka', game.ai.hand.length)}
                {renderPile('Kaladė', game.ai.deck.length)}
                {renderPile('Krūva', game.ai.discard.length, undefined, true)}
                {renderPile('ŽMK', game.ai.zmk.length)}
              </div>
            </div>
            <div className="mt-1">{renderSideZones('ai')}</div>
            <div className="mt-1">{renderUnitsRow('ai', 'units-ai')}</div>
          </div>

          {/* ── vidurio juosta: lauko korta + įvykiai + ŽMK flash ── */}
          <div className="shrink-0 flex items-center justify-center gap-3 py-1 relative"
            style={{ borderTop: '1px solid rgba(240,180,41,0.1)', borderBottom: '1px solid rgba(240,180,41,0.1)' }}>
            <div data-tut="field" className="flex items-center gap-1.5">
              {game.field ? (
                <button onContextMenu={(e) => { e.preventDefault(); setInspect(game.field!.card) }}
                  onClick={() => setInspect(game.field!.card)}>
                  <MiniCard c={game.field.card} w={36} />
                </button>
              ) : (
                <div className="rounded-md flex items-center justify-center text-xs opacity-25"
                  style={{ width: 36, height: 48, border: '1px dashed rgba(240,180,41,0.3)' }}>🌍</div>
              )}
              <span className="text-[8px] uppercase tracking-wide hidden sm:block" style={{ color: 'var(--text-muted)' }}>Laukas</span>
            </div>
            <div className="flex-1 max-w-md text-center px-2">
              <p className="text-[10px] sm:text-[11px] leading-snug line-clamp-2" style={{ color: 'var(--text-secondary)' }}>{lastMsg}</p>
            </div>
            <AnimatePresence>
              {zmkFlash && (
                <motion.div
                  key={zmkFlash.n + zmkFlash.v}
                  initial={{ scale: 0.3, opacity: 0, rotateY: 90 }}
                  animate={{ scale: 1, opacity: 1, rotateY: 0 }}
                  exit={{ scale: 0.6, opacity: 0 }}
                  className="absolute left-1/2 -translate-x-1/2 -top-7 z-10 px-3 py-1.5 rounded-lg font-black text-lg"
                  style={{
                    background: 'linear-gradient(145deg, #2a2138, #14101e)',
                    border: '2px solid var(--gold)',
                    color: zmkFlash.v.startsWith('+') && zmkFlash.v !== '+0' ? '#4ade80' : zmkFlash.v.startsWith('-') ? '#f87171' : 'var(--gold)',
                    boxShadow: '0 0 20px rgba(240,180,41,0.4)',
                    fontFamily: 'var(--rvn-font-display)',
                  }}>
                  ŽMK {zmkFlash.v.replace('x', '×')}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* ── Tavo pusė ── */}
          <div className="flex-1 flex flex-col justify-end gap-1 min-h-0">
            {renderUnitsRow('you', 'units-you')}
            {renderSideZones('you')}

            {/* valdymo juosta */}
            <div className="flex items-center justify-center gap-2 sm:gap-3 flex-wrap shrink-0">
              {hpBar('you')}
              {goldBar('you')}
              <div className="flex items-end gap-2">
                {renderPile('Kaladė', game.you.deck.length, 'deck')}
                {renderPile('Krūva', game.you.discard.length, 'discard', true)}
                {renderPile('ŽMK', game.you.zmk.length, 'zmk')}
              </div>
              <button
                data-tut="discard-gold"
                onClick={() => {
                  if (!myTurn || popupBlocks) return
                  if (game.you.discardedForGold) { pushToast('Jau išmetei kortą šį ėjimą.'); return }
                  playUiClick()
                  setSelect(select?.kind === 'discard' ? null : { kind: 'discard' })
                }}
                className="px-2.5 py-1 rounded-full text-[11px] font-bold transition-all"
                style={{
                  background: select?.kind === 'discard' ? 'rgba(240,180,41,0.25)' : 'rgba(0,0,0,0.5)',
                  border: '1px solid rgba(240,180,41,0.4)',
                  color: game.you.discardedForGold ? 'var(--text-muted)' : 'var(--gold)',
                }}
                title="Išmesk 1 kortą iš rankos ir gauk +100 aukso (1×/ėjimą)">
                +100⚜
              </button>
              <button
                data-tut="end-turn"
                onClick={onEndTurn}
                disabled={!myTurn}
                className="px-4 py-1.5 rounded-xl text-xs font-bold transition-all hover:scale-[1.03] active:scale-95 disabled:opacity-40"
                style={{
                  background: myTurn ? 'linear-gradient(135deg, rgba(240,180,41,0.25), rgba(240,180,41,0.08))' : 'rgba(0,0,0,0.4)',
                  border: '1px solid rgba(240,180,41,0.5)',
                  color: 'var(--gold)',
                  fontFamily: 'var(--rvn-font-display)',
                  letterSpacing: '0.05em',
                }}>
                {myTurn ? 'Baigti ėjimą' : 'Priešininko ėjimas…'}
              </button>
            </div>

            {/* ranka */}
            <div data-tut="hand" className="flex justify-center items-end gap-0 min-h-[110px] pb-1 overflow-x-auto">
              <AnimatePresence>
                {game.you.hand.map((c, i) => {
                  const n = game.you.hand.length
                  const off = i - (n - 1) / 2
                  const afford = game.you.gold >= c.gold
                  return (
                    <motion.div
                      key={c.uid}
                      layout
                      initial={{ y: 60, opacity: 0 }}
                      animate={{ y: 0, opacity: 1, rotate: Math.max(-12, Math.min(12, off * (n > 8 ? 2 : 3.5))) }}
                      exit={{ y: -40, opacity: 0, scale: 0.8 }}
                      whileHover={{ y: -14, zIndex: 30, rotate: 0 }}
                      style={{ marginLeft: i === 0 ? 0 : -(handW * 0.32), zIndex: i }}
                      onContextMenu={(e) => { e.preventDefault(); setInspect(c) }}
                    >
                      <GameCard glowColor={c.rarityColor} sounds={false} liftPx={0}>
                        <button onClick={() => onHandCardClick(c)} className="block"
                          style={{ filter: select?.kind === 'discard' ? 'hue-rotate(40deg)' : undefined }}>
                          <MiniCard c={c} w={handW} dim={!afford && select?.kind !== 'discard'} />
                        </button>
                      </GameCard>
                    </motion.div>
                  )
                })}
              </AnimatePresence>
              {game.you.hand.length === 0 && (
                <span className="text-[10px] self-center" style={{ color: 'var(--text-muted)' }}>Ranka tuščia</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── pasirinkimo užuomina ── */}
      <AnimatePresence>
        {select && select.kind !== 'discard' && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="fixed bottom-32 left-1/2 -translate-x-1/2 z-[125] px-3 py-1.5 rounded-full text-[11px] font-semibold pointer-events-none"
            style={{ background: 'rgba(0,0,0,0.85)', border: '1px solid rgba(240,180,41,0.5)', color: 'var(--gold)' }}>
            {select.kind === 'attacker' && '⚔ Pasirink taikinį (raudonas apvadas) arba spausk Esc'}
            {select.kind === 'spell' && '✨ Pasirink burto taikinį arba spausk Esc'}
            {select.kind === 'sacrifice' && '⚜ Pasirink padarą, kurį paaukosi Čempionui'}
          </motion.div>
        )}
        {select?.kind === 'discard' && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="fixed bottom-32 left-1/2 -translate-x-1/2 z-[125] px-3 py-1.5 rounded-full text-[11px] font-semibold pointer-events-none"
            style={{ background: 'rgba(0,0,0,0.85)', border: '1px solid rgba(240,180,41,0.5)', color: 'var(--gold)' }}>
            🗑 Pasirink kortą rankoje, kurią išmesi už +100 aukso
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── klaidos toast ── */}
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="fixed top-14 left-1/2 -translate-x-1/2 z-[130] px-4 py-2 rounded-xl text-xs font-semibold max-w-[90vw] text-center"
            style={{ background: 'rgba(40,10,10,0.95)', border: '1px solid rgba(239,68,68,0.5)', color: '#fca5a5' }}>
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── vedamo žingsnio pop-up ── */}
      <AnimatePresence>
        {step && (
          <motion.div key={step.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[126]"
            style={{ pointerEvents: step.require ? 'none' : 'auto', background: step.require ? 'transparent' : 'rgba(0,0,0,0.55)' }}>
            {/* inkaro pašvietimas */}
            {anchorRect && (
              <div className="absolute rounded-xl pointer-events-none animate-pulse"
                style={{
                  left: anchorRect.left - 6, top: anchorRect.top - 6,
                  width: anchorRect.width + 12, height: anchorRect.height + 12,
                  border: '2px solid var(--gold)',
                  boxShadow: '0 0 22px rgba(240,180,41,0.55), inset 0 0 14px rgba(240,180,41,0.15)',
                }} />
            )}
            <motion.div
              initial={{ y: 14, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
              className="absolute left-1/2 -translate-x-1/2 w-[min(420px,92vw)] rounded-2xl p-4"
              style={{
                pointerEvents: 'auto',
                top: anchorRect ? (anchorRect.top > window.innerHeight / 2 ? '18%' : undefined) : '50%',
                bottom: anchorRect && anchorRect.top <= window.innerHeight / 2 ? '22%' : undefined,
                transform: anchorRect ? 'translateX(-50%)' : 'translate(-50%, -50%)',
                background: 'linear-gradient(145deg, #1e1729, #120d1c)',
                border: '1px solid rgba(240,180,41,0.45)',
                boxShadow: '0 12px 40px rgba(0,0,0,0.8), 0 0 24px rgba(240,180,41,0.12)',
              }}>
              <p className="text-sm font-bold mb-1.5" style={{ fontFamily: 'var(--rvn-font-display)', color: 'var(--gold)' }}>{step.title}</p>
              <p className="text-xs leading-relaxed mb-3" style={{ color: 'var(--text-secondary)' }}>{step.text}</p>
              <div className="flex items-center justify-between">
                <button onClick={() => { playUiClick(); setStepIdx(GUIDED_STEPS.length) }}
                  className="text-[10px] underline opacity-60 hover:opacity-100" style={{ color: 'var(--text-muted)' }}>
                  Praleisti mokymą
                </button>
                {!step.require ? (
                  <button onClick={() => { playUiClick(); setStepIdx((i) => i + 1) }}
                    className="px-4 py-1.5 rounded-lg text-xs font-bold transition-all hover:scale-[1.03] active:scale-95"
                    style={{
                      background: 'linear-gradient(135deg, rgba(240,180,41,0.3), rgba(240,180,41,0.1))',
                      border: '1px solid rgba(240,180,41,0.5)', color: 'var(--gold)',
                      fontFamily: 'var(--rvn-font-display)',
                    }}>
                    Toliau →
                  </button>
                ) : (
                  <span className="text-[10px] italic animate-pulse" style={{ color: 'var(--gold)' }}>Atlik veiksmą…</span>
                )}
              </div>
              <div className="flex gap-1 mt-3">
                {GUIDED_STEPS.map((s, i) => (
                  <div key={s.id} className="h-1 flex-1 rounded-full"
                    style={{ background: i <= stepIdx ? 'var(--gold)' : 'rgba(240,180,41,0.15)' }} />
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── mechanikos patarimas ── */}
      <AnimatePresence>
        {activeTip && (
          <motion.div key={activeTip} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
            className="fixed bottom-36 left-1/2 -translate-x-1/2 z-[127] w-[min(380px,92vw)] rounded-2xl p-3.5"
            style={{
              background: 'linear-gradient(145deg, #1e1729, #120d1c)',
              border: '1px solid rgba(139,92,246,0.5)',
              boxShadow: '0 10px 32px rgba(0,0,0,0.8), 0 0 20px rgba(139,92,246,0.15)',
            }}>
            <p className="text-xs font-bold mb-1" style={{ fontFamily: 'var(--rvn-font-display)', color: '#a78bfa' }}>
              Nauja mechanika · {MECHANIC_TIPS[activeTip].title}
            </p>
            <p className="text-[11px] leading-relaxed mb-2.5" style={{ color: 'var(--text-secondary)' }}>
              {MECHANIC_TIPS[activeTip].text}
            </p>
            <div className="flex justify-end">
              <button onClick={() => { playUiClick(); setTipQueue((q) => q.slice(1)) }}
                className="px-3.5 py-1 rounded-lg text-[11px] font-bold transition-all hover:scale-[1.03] active:scale-95"
                style={{ background: 'rgba(139,92,246,0.2)', border: '1px solid rgba(139,92,246,0.5)', color: '#c4b5fd' }}>
                Supratau
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── įvykių žurnalas ── */}
      <AnimatePresence>
        {showLog && game && (
          <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 30 }}
            className="fixed right-2 top-12 bottom-2 z-[124] w-[min(300px,80vw)] rounded-xl p-3 overflow-y-auto"
            style={{ background: 'rgba(10,8,16,0.95)', border: '1px solid rgba(240,180,41,0.25)' }}>
            <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--gold)' }}>Įvykių žurnalas</p>
            {game.log.slice(-60).map((e, i) => (
              <p key={i} className="text-[10px] leading-relaxed mb-1"
                style={{ color: e.side === 'you' ? 'var(--text-secondary)' : '#a78bfa', opacity: e.t === 'startTurn' ? 1 : 0.85, fontWeight: e.t === 'startTurn' ? 700 : 400 }}>
                {e.msg}
              </p>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── kortos apžiūra ── */}
      <AnimatePresence>
        {inspect && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[135] flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.75)' }}
            onClick={() => { playCardPlace(); setInspect(null) }}>
            <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} onClick={(e) => e.stopPropagation()}>
              <GameCard glowColor={inspect.rarityColor} intensity={12}>
                <div className="flex flex-col rounded-xl overflow-hidden" style={{ width: 'min(260px, 70vw)', background: 'var(--bg-surface)', border: '2px solid ' + inspect.rarityColor }}>
                  <MiniCard c={inspect} w={Math.min(260, typeof window !== 'undefined' ? window.innerWidth * 0.7 : 260)} />
                  <div className="p-3">
                    <p className="text-sm font-bold mb-1" style={{ fontFamily: 'var(--rvn-font-display)', color: 'var(--text-primary)' }}>{inspect.name}</p>
                    {inspect.keywords.length > 0 && (
                      <p className="text-[10px] mb-1" style={{ color: 'var(--gold)' }}>
                        {inspect.keywords.map((k) => KEYWORD_LABELS[k]).join(' · ')}
                      </p>
                    )}
                    <p className="text-[11px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                      {inspect.effectText || 'Korta be specialaus efekto.'}
                    </p>
                  </div>
                </div>
              </GameCard>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── pergalės / pralaimėjimo modalas ── */}
      <AnimatePresence>
        {game?.winner && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="fixed inset-0 z-[140] flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.8)' }}>
            <motion.div initial={{ scale: 0.7, y: 20 }} animate={{ scale: 1, y: 0 }}
              className="rounded-2xl p-6 text-center w-[min(380px,90vw)]"
              style={{
                background: 'linear-gradient(145deg, #1e1729, #120d1c)',
                border: '1px solid ' + (game.winner === 'you' ? 'rgba(240,180,41,0.6)' : 'rgba(239,68,68,0.5)'),
                boxShadow: '0 16px 50px rgba(0,0,0,0.9)',
              }}>
              <p className="text-4xl mb-2">{game.winner === 'you' ? '🏆' : '💀'}</p>
              <p className="text-lg font-bold mb-1" style={{ fontFamily: 'var(--rvn-font-display)', color: game.winner === 'you' ? 'var(--gold)' : '#f87171' }}>
                {game.winner === 'you' ? 'Pergalė!' : 'Pralaimėjai…'}
              </p>
              <p className="text-xs mb-5" style={{ color: 'var(--text-secondary)' }}>
                {game.winner === 'you'
                  ? 'Puiku! Dabar žinai, kaip žaisti Ravenof. Laikas tikram mūšiui!'
                  : 'Nieko tokio – tai treniruotė. Pabandyk dar kartą, dabar jau žinai taisykles!'}
              </p>
              <div className="flex gap-2 justify-center">
                <button onClick={() => { playUiClick(); if (deckCards) { shownTipsRef.current.clear(); setStepIdx(GUIDED_STEPS.length); setTipQueue([]); initGame(deckCards) } }}
                  className="px-4 py-2 rounded-xl text-xs font-bold transition-all hover:scale-[1.03] active:scale-95"
                  style={{
                    background: 'linear-gradient(135deg, rgba(240,180,41,0.3), rgba(240,180,41,0.1))',
                    border: '1px solid rgba(240,180,41,0.5)', color: 'var(--gold)',
                    fontFamily: 'var(--rvn-font-display)',
                  }}>
                  ⚔ Žaisti dar kartą
                </button>
                <button onClick={() => { playUiClick(); onClose() }}
                  className="px-4 py-2 rounded-xl text-xs font-bold transition-all hover:scale-[1.03] active:scale-95"
                  style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.15)', color: 'var(--text-secondary)' }}>
                  Užverti
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>,
    document.body
  )
}

const KEYWORD_LABELS: Record<string, string> = {
  sprint: '▶ Sprintas',
  taunt: '⊙ Pasišaipymas',
  shield: '✦★ Magiškasis skydas',
  stealth: '◑ Sėlinimas',
  battlecry: '📣 Kovos šūksnis',
  lastwish: '🕯 Paskutinis noras',
}
