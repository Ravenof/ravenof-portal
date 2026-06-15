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
import type { RealtimeChannel } from '@supabase/supabase-js'
import { GameCard } from '@/components/ui/GameCard'
import {
  playShuffle, playCardDraw, playCardPlace, playCardFlip,
  playUiClick, playSuccess, playError, playCardPick,
  isUiSoundEnabled, toggleUiSound, subscribeUiSound,
} from '@/lib/ui-sound'
import {
  GameState, GameEvent, TutCard, BoardUnit, TargetRef, Side,
  createGame, beginTurn, endTurn,
  championSkills, canUnitAttack, legalTargets, cloneState, P,
  swapPerspective, applyNetAction, swapAction, type NetAction,
  parseEffect, detectKeywords, mapCardType, effectiveAtk, projectileForCard,
  STATUS_META, TutStatus, boardCreatureCap,
} from '@/lib/tutorial/engine'
import { aiNextAction } from '@/lib/tutorial/ai'
import { parseGameplayConfig, EFFECT_TYPES, type ZmkCardDef, type EffectMapping } from '@/lib/game/types'
import { mappingNeedsSelection } from '@/lib/game/effectEngine'
import { resolveTargets } from '@/lib/game/targetResolver'
import { playBattleSound } from '@/lib/game/soundManager'
import { startAmbient, stopAmbient } from '@/lib/tutorial/ambient'
import { GUIDED_STEPS, MECHANIC_TIPS, TutStep, TipKey } from '@/lib/tutorial/script'

export type PvPNet = { isHost: boolean; mySide: Side; matchId: string; opponentId?: string }
type Props = { deckId: string; deckName: string; onClose: () => void; practice?: boolean; opponentDeckId?: string | null; opponentFaction?: number | null; opponentName?: string; net?: PvPNet }

// ── Duomenų užkrovimas ────────────────────────────────────────────────────────

type DbRow = {
  quantity: number
  is_side_deck?: boolean | null
  card: {
    id: string; name: string; image_url: string | null
    gold_cost: number | null; attack: number | null; health: number | null
    effect_text: string | null; description: string | null; is_champion: boolean | null
    subtype?: string | null
    champion_group?: string | null
    champion_phase?: number | null
    gameplay?: unknown
    card_type: { name: string } | null
    rarity: { color_hex: string | null } | null
    faction: { color_hex: string | null } | null
    card_keywords: { keyword: { name: string } | null }[] | null
  } | null
}

const ZMK_IMG: Record<string, string> = {
  '+0': '/rules/zmk/card-plus0-sm.webp', '+1': '/rules/zmk/card-plus1-sm.webp', '-1': '/rules/zmk/card-minus1-sm.webp',
  '+2': '/rules/zmk/card-plus2-sm.webp', '-2': '/rules/zmk/card-minus2-sm.webp',
  'x2': '/rules/zmk/card-x2-sm.webp', 'x0': '/rules/zmk/card-x0-sm.webp',
}
/** ŽMK kortos nuotrauka: admin zmk_cards.image_url > taisyklių numatytoji. */
function zmkImg(g: GameState | null, v: string): string | null {
  return g?.zmkDefs?.[v]?.image_url || ZMK_IMG[v] || null
}

function mapDbCard(c: NonNullable<DbRow['card']>): Omit<TutCard, 'uid'> {
  const kwNames = (c.card_keywords ?? []).map((k) => k.keyword?.name ?? '').filter(Boolean)
  const text = [c.effect_text, c.description].filter(Boolean).join(' ')
  const gameplay = parseGameplayConfig(c.gameplay)
  return {
    id: c.id,
    name: c.name,
    image: c.image_url,
    gold: c.gold_cost ?? 100,
    attack: c.attack,
    health: c.health,
    type: mapCardType(c.card_type?.name, !!c.is_champion),
    subtype: c.subtype ?? null,
    championGroup: c.champion_group ?? null,
    championPhase: c.champion_phase ?? null,
    keywords: Array.from(new Set([...detectKeywords(kwNames, text), ...((gameplay?.keywords ?? []) as ReturnType<typeof detectKeywords>)])),
    effectText: text,
    rarityColor: c.rarity?.color_hex ?? '#d4af37',
    factionColor: c.faction?.color_hex ?? '#d4af37',
    effect: parseEffect(text),
    gameplay,
    // Admin mapping > legacy teksto parseris (mappings tušti = legacy kelias)
    mappings: gameplay?.virtualEnabled === false ? [] : gameplay?.effectMappings ?? [],
    needsMapping: !gameplay?.effectMappings?.length && !!text,
  }
}

function rowsToDeck(rows: DbRow[], suffix: string): TutCard[] {
  const out: TutCard[] = []
  for (const r of rows) {
    if (!r.card) continue
    const base = mapDbCard(r.card)
    for (let i = 0; i < r.quantity; i++) out.push({ ...base, uid: `${base.id}-${suffix}-${i}` })
  }
  return out
}

/** Demo kaladė taisyklių puslapiui: subalansuota iš aktyvių DB kortų. */
export const DEMO_DECK_ID = '__demo__'

function buildDemoDeck(cards: Omit<TutCard, 'uid'>[]): TutCard[] {
  const shuffled = [...cards].sort(() => Math.random() - 0.5)
  const units = shuffled.filter((c) => c.type === 'unit')
  const others = shuffled.filter((c) => c.type !== 'unit' && c.type !== 'curse')
  const picked: Omit<TutCard, 'uid'>[] = []
  // ~60% padarų, kad kova būtų gyva
  for (let i = 0; picked.length < 22 && units.length > 0; i++) picked.push(units[i % units.length])
  for (let i = 0; picked.length < 35 && others.length > 0 && i < others.length; i++) picked.push(others[i])
  while (picked.length < 30 && picked.length > 0) picked.push(picked[picked.length % Math.max(1, units.length)])
  return picked.map((c, i) => ({ ...c, uid: `${c.id}-demo-${i}` }))
}

// ── Maža kortos „veido" reprezentacija ───────────────────────────────────────

const STATUS_GLOW: Record<TutStatus, string> = {
  frozen: '#38bdf8', burning: '#fb923c', poisoned: '#84cc16', stunned: '#facc15', silenced: '#a78bfa',
}

function MiniCard({ c, w, dim, faceDown, readable }: { c: TutCard; w: number; dim?: boolean; faceDown?: boolean; readable?: boolean }) {
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
  // Skaitomas (zoomed) režimas: didesni ženkliukai + pavadinimas ir efekto tekstas ant kortos
  const badge = Math.max(9, Math.round(w * (readable ? 0.085 : 0.1)))
  const nameSize = Math.max(10, Math.round(w * 0.085))
  const textSize = Math.max(9, Math.round(w * 0.064))
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
          <span className="leading-tight font-semibold px-0.5" style={{ fontSize: nameSize, color: 'var(--text-secondary)' }}>{c.name}</span>
          {readable && c.effectText && <span className="leading-snug px-0.5 mt-0.5" style={{ fontSize: textSize, color: 'var(--text-muted)', display: '-webkit-box', WebkitLineClamp: 5, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{c.effectText}</span>}
        </div>
      )}
      {(!readable || !c.image) && (<>
        <span className="absolute top-0.5 left-0.5 rounded-full font-bold"
          style={{ background: 'rgba(0,0,0,0.85)', color: 'var(--gold)', fontSize: badge, padding: '0 ' + Math.round(badge * 0.4) + 'px' }}>{c.gold}</span>
        {c.attack !== null && c.type === 'unit' && (
          <span className="absolute bottom-0.5 left-0.5 rounded font-bold"
            style={{ background: 'rgba(0,0,0,0.85)', color: '#f87171', fontSize: badge, padding: '0 ' + Math.round(badge * 0.4) + 'px' }}>{c.attack}</span>
        )}
        {c.health !== null && c.type !== 'spell' && (
          <span className="absolute bottom-0.5 right-0.5 rounded font-bold"
            style={{ background: 'rgba(0,0,0,0.85)', color: '#4ade80', fontSize: badge, padding: '0 ' + Math.round(badge * 0.4) + 'px' }}>{c.health}</span>
        )}
      </>)}
    </div>
  )
}

// ── Padaro plytelė kovos lauke ───────────────────────────────────────────────

function UnitTile({ g, u, w, selected, targetable, canAct, dimmed, onClick }: {
  g: GameState; u: BoardUnit; w: number
  selected?: boolean; targetable?: boolean; canAct?: boolean; dimmed?: boolean
  onClick?: () => void
}) {
  const h = Math.round(w * 4 / 3)
  const atk = effectiveAtk(g, u)
  const ring = selected ? '#f0b429' : targetable ? '#ef4444' : canAct ? 'rgba(74,222,128,0.7)' : 'transparent'
  const activeStatuses = Object.keys(u.statuses) as TutStatus[]
  const sGlow = activeStatuses.length ? STATUS_GLOW[activeStatuses[0]] : null
  return (
    <motion.button
      layout
      initial={{ scale: 0.6, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.6, opacity: 0 }}
      onClick={onClick}
      className="relative rounded-lg overflow-visible select-none"
      style={{ width: w, height: h, cursor: onClick ? 'pointer' : 'default', opacity: dimmed ? 0.4 : 1, filter: dimmed ? 'grayscale(0.7)' : undefined, transition: 'opacity 0.2s, filter 0.2s' }}
    >
      <div className="absolute inset-0 rounded-lg overflow-hidden"
        style={{
          background: 'var(--bg-surface)',
          border: u.isChampion ? '2px solid #f0b429' : '1.5px solid ' + u.card.rarityColor + '90',
          boxShadow: ring !== 'transparent'
            ? `0 0 0 2px ${ring}, 0 0 14px ${ring}`
            : sGlow ? `0 0 0 2px ${sGlow}cc, 0 0 16px ${sGlow}aa`
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
        {activeStatuses.map((s) => (
          <Token key={s} title={STATUS_META[s].name} color={STATUS_GLOW[s]}>{STATUS_META[s].icon}</Token>
        ))}
      </div>
    </motion.button>
  )
}

function Token({ children, title, color }: { children: React.ReactNode; title: string; color?: string }) {
  return (
    <span title={title}
      className="inline-flex items-center justify-center rounded-full text-[10px] leading-none"
      style={{
        minWidth: 17, height: 17, padding: '0 3px',
        background: color ? `radial-gradient(circle at 35% 30%, ${color}55, #14101e)` : 'radial-gradient(circle at 35% 30%, #2a2138, #14101e)',
        border: '1px solid ' + (color ? color + 'cc' : 'rgba(240,180,41,0.5)'),
        boxShadow: color ? `0 0 6px ${color}aa` : '0 1px 4px rgba(0,0,0,0.7)',
        color: color ?? 'var(--gold)',
      }}>
      {children}
    </span>
  )
}

// ── Pagrindinis komponentas ───────────────────────────────────────────────────

type SelectMode =
  | { kind: 'attacker'; uid: string }
  | { kind: 'spell'; uid: string }
  | { kind: 'sacrifice'; cardUid: string; picked: string[] }
  | { kind: 'discard' }
  | { kind: 'spellMulti'; uid: string; need: number; picked: TargetRef[] }
  | null

/** Grąžina sužaidimo/iškvietimo mapping'ą, kuriam žaidėjas turi pasirinkti taikinį (arba null). */
function selectionMappingFor(c: TutCard): EffectMapping | null {
  for (const m of (c.mappings ?? [])) {
    const t = m.trigger
    const isEntry = c.type === 'spell' ? (t === 'onCast' || t === 'onPlay') : (t === 'onSummon' || t === 'onPlay')
    if (isEntry && mappingNeedsSelection(m)) return m
  }
  return null
}

/** Galiojantys pavieniai taikiniai (TargetRef) burto mapping'ui (be lauko/sėlinimo). */
function spellTargetRefs(game: GameState, side: Side, m: EffectMapping): TargetRef[] {
  const out: TargetRef[] = []
  for (const t of resolveTargets(game, side, m.target)) {
    if (t.kind === 'field') continue
    if (t.kind === 'unit' && t.side === 'ai') { const u = game.ai.units.find((x) => x?.uid === t.uid); if (u?.stealth) continue }
    out.push(t as TargetRef)
  }
  return out
}

// ── Drag & drop (Hearthstone tipo) ───────────────────────────────────────────
type DragState = { card: TutCard; uid: string; targeted: boolean; origin: { x: number; y: number }; x: number; y: number; mode: 'card' | 'arrow' }

function cardDropZoneOf(c: TutCard): 'unit' | 'spell' | 'artifact' | 'field' | 'reaction' {
  if (c.type === 'spell') return 'spell'
  if (c.type === 'artifact') return 'artifact'
  if (c.type === 'field') return 'field'
  if (c.type === 'reaction') return 'reaction'
  return 'unit'
}
/** Ar kortai (sužaidžiant) reikia rankiniu būdu rinktis taikinį? */
function cardNeedsTarget(game: GameState, c: TutCard): boolean {
  const sm = selectionMappingFor(c)
  if (sm) return spellTargetRefs(game, 'you', sm).length > 0
  return (c.type === 'spell' || (c.type === 'unit' && c.keywords.includes('battlecry'))) && !!c.effect?.targeted
}

export function TutorialGame({ deckId, deckName, onClose, practice = false, opponentDeckId = null, opponentFaction = null, opponentName, net }: Props) {
  const [game, setGame] = useState<GameState | null>(null)
  const isHost = !!net?.isHost
  const isGuest = !!net && !net.isHost
  const vsRemote = !!net
  const loadOpp = practice || isHost          // host kraują priešo (svečio) kaladę
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [deckCards, setDeckCards] = useState<TutCard[] | null>(null)
  const [oppCards, setOppCards] = useState<TutCard[] | null>(null)
  const [zmkDefs, setZmkDefs] = useState<ZmkCardDef[] | null>(null)
  const [curseCards, setCurseCards] = useState<TutCard[]>([])
  const [extrasLoaded, setExtrasLoaded] = useState(false)
  const [stepIdx, setStepIdx] = useState((practice || !!net) ? GUIDED_STEPS.length : 0)
  const [tipQueue, setTipQueue] = useState<TipKey[]>([])
  const [select, setSelect] = useState<SelectMode>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [zmkFlash, setZmkFlash] = useState<{ cards: { v: string; side: Side }[]; n: number } | null>(null)
  // ŽMK 'draw' režimas: eilė kortų, kurias žaidėjas atverčia pats
  const [zmkPending, setZmkPending] = useState<{ v: string; side: Side; revealed: boolean }[]>([])
  // Prakeiksmo aktyvacijos overlay
  const [curseShow, setCurseShow] = useState<{ name: string; msg: string; image: string | null } | null>(null)
  // Projectile animacijos
  const [projectiles, setProjectiles] = useState<{ id: number; emoji: string; from: { x: number; y: number }; to: { x: number; y: number } }[]>([])
  const [impacts, setImpacts] = useState<{ id: number; x: number; y: number; emoji: string }[]>([])
  const projIdRef = useRef(0)
  // Rankos padidinimas
  const [handExpanded, setHandExpanded] = useState(false)
  // Sutrauktas tutorial popup
  const [popupCollapsed, setPopupCollapsed] = useState(false)
  // Tutorial pagalbos auksas suteiktas tik kartą
  const grantedGoldRef = useRef(false)
  const [inspect, setInspect] = useState<TutCard | null>(null)
  const [showLog, setShowLog] = useState(false)
  const [hoverCard, setHoverCard] = useState<{ card: TutCard; x: number; y: number } | null>(null)
  const [pileView, setPileView] = useState<{ title: string; cards: TutCard[] } | null>(null)
  const [peekSel, setPeekSel] = useState<string[]>([])
  const [summonSel, setSummonSel] = useState<string[]>([])
  // PvP: varžovo profilis + ėjimo laikmatis
  const [oppProfile, setOppProfile] = useState<{ id: string; username: string; display_name: string | null; avatar_url: string | null; level: number | null; is_public: boolean } | null>(null)
  const [oppDecks, setOppDecks] = useState<{ id: string; name: string }[]>([])
  const [oppOpen, setOppOpen] = useState(false)
  const [turnLeft, setTurnLeft] = useState(60)
  const [champPopup, setChampPopup] = useState<string | null>(null)
  const [champSwap, setChampSwap] = useState<{ cardUid: string; name: string; phase: number; options: number[] } | null>(null)
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null)
  const [millShow, setMillShow] = useState<{ side: Side; cards: TutCard[] } | null>(null)
  const millSeenRef = useRef(0)
  const [drag, setDrag] = useState<DragState | null>(null)
  const dragRef = useRef<DragState | null>(null)
  const dragMovedRef = useRef(false)
  const handRef = useRef<HTMLDivElement | null>(null)
  const handPanelRef = useRef<HTMLDivElement | null>(null)
  const [flyingCards, setFlyingCards] = useState<{ id: number; card: TutCard; from: { x: number; y: number }; to: { x: number; y: number } }[]>([])
  const flyIdRef = useRef(0)
  const unitRectsRef = useRef<Map<string, { x: number; y: number }>>(new Map())
  const lpRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Sužaistų kortų log: vardas -> korta (iš kaladės + prakeiksmų)
  const cardByName = useMemo(() => {
    const m: Record<string, TutCard> = {}
    for (const c of deckCards ?? []) m[c.name] = c
    for (const c of curseCards) m[c.name] = c
    return m
  }, [deckCards, curseCards])

  const [soundOn, setSoundOn] = useState(true)
  const seenRef = useRef(0)
  const shownTipsRef = useRef<Set<string>>(new Set())
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const step: TutStep | null = stepIdx < GUIDED_STEPS.length ? GUIDED_STEPS[stepIdx] : null
  const activeTip: TipKey | null = !step && tipQueue.length > 0 ? tipQueue[0] : null
  // Pop-up be reikalaujamo veiksmo (arba patarimas) – pristabdo AI ir veiksmus.
  // Sutrauktas popup nebeblokuoja. ŽMK 'draw' eilė irgi pristabdo AI.
  const popupBlocks = ((!!step && !step.require) || !!activeTip) && !popupCollapsed
  const zmkBlocks = zmkPending.length > 0
  const peekBlocks = !!game?.pendingPeek
  const revealBlocks = !!game?.pendingReveal
  const summonBlocks = !!game?.pendingSummon
  const choiceBlocks = !!game?.pendingChoice
  const isTouch = typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches
  const handW = isTouch ? 72 : 96
  const unitW = isTouch ? 58 : 90
  // Mažas ekranas – pop-up'ai rodomi kaip bottom sheet, kad tilptų
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 640px)')
    setIsMobile(mq.matches)
    const onChange = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    mq.addEventListener?.('change', onChange)
    return () => mq.removeEventListener?.('change', onChange)
  }, [])

  // Pradėjus žaidimą: pilnas ekranas + neleisti ekranui užmigti (kiek naršyklė leidžia)
  useEffect(() => {
    let wakeLock: { release?: () => Promise<void> } | null = null
    let dead = false
    const reqWake = async () => {
      try {
        const nav = navigator as Navigator & { wakeLock?: { request: (t: string) => Promise<{ release?: () => Promise<void> }> } }
        if (nav.wakeLock && !dead) wakeLock = await nav.wakeLock.request('screen')
      } catch { /* nesvarbu */ }
    }
    const reqFs = async () => {
      try {
        const el = document.documentElement as HTMLElement & { webkitRequestFullscreen?: () => Promise<void> }
        if (document.fullscreenElement) return
        if (el.requestFullscreen) await el.requestFullscreen()
        else if (el.webkitRequestFullscreen) await el.webkitRequestFullscreen()
      } catch { /* iPhone Safari nepalaiko – ignoruojam */ }
    }
    reqWake()
    reqFs()
    // jei auto fullscreen neleido (reikia gesto) – pirmas palietimas įjungs
    const onFirstTap = () => { reqFs(); reqWake() }
    window.addEventListener('pointerdown', onFirstTap, { once: true })
    const onVis = () => { if (document.visibilityState === 'visible' && !dead) reqWake() }
    document.addEventListener('visibilitychange', onVis)
    return () => {
      dead = true
      window.removeEventListener('pointerdown', onFirstTap)
      document.removeEventListener('visibilitychange', onVis)
      try { wakeLock?.release?.() } catch { /* */ }
      try { if (document.fullscreenElement) document.exitFullscreen() } catch { /* */ }
    }
  }, [])

  // ── Užkrovimas ──
  useEffect(() => {
    let alive = true
    const supabase = createClient()
    if (deckId === DEMO_DECK_ID) {
      supabase
        .from('cards')
        .select(`
          id, name, image_url, gold_cost, attack, health,
          effect_text, description, is_champion, subtype, champion_group, champion_phase, gameplay,
          card_type:card_types ( name ),
          rarity:rarities ( color_hex ),
          faction:factions ( color_hex ),
          card_keywords ( keyword:keywords ( name ) )
        `)
        .eq('status', 'active')
        .limit(120)
        .then(({ data, error }) => {
          if (!alive) return
          if (error || !data || data.length === 0) {
            setErrorMsg('Nepavyko užkrauti mokomosios kaladės kortų')
            setLoading(false)
            return
          }
          const mapped = (data as unknown as NonNullable<DbRow['card']>[]).map(mapDbCard)
          setDeckCards(buildDemoDeck(mapped))
          setLoading(false)
        })
      return () => { alive = false }
    }
    supabase
      .from('deck_cards')
      .select(`
        quantity,
        is_side_deck,
        card:cards (
          id, name, image_url, gold_cost, attack, health,
          effect_text, description, is_champion, subtype, champion_group, champion_phase, gameplay,
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
        const mainRows = rows.filter((r) => !r.is_side_deck)
        const sideRows = rows.filter((r) => r.is_side_deck)
        setDeckCards(rowsToDeck(mainRows, 'p'))
        // Prakeiksmų side deck – tik tos kortos, kurias žaidėjas pasirinko (Demonai)
        setCurseCards(rowsToDeck(sideRows, 'cu'))
        setLoading(false)
      })
    return () => { alive = false }
  }, [deckId])

  // ── ŽMK definicijos (zmk_cards) + prakeiksmų side deck (curse tipo kortos) ──
  useEffect(() => {
    let alive = true
    const supabase = createClient()
    Promise.all([
      supabase.from('zmk_cards').select('*').eq('active', true).order('sort_order'),
      supabase.from('cards').select(`
        id, name, image_url, gold_cost, attack, health,
        effect_text, description, is_champion, subtype, champion_group, champion_phase, gameplay,
        card_type:card_types ( name ),
        rarity:rarities ( color_hex ),
        faction:factions ( color_hex ),
        card_keywords ( keyword:keywords ( name ) )
      `).eq('status', 'active').limit(300),
    ]).then(([zmkRes, cardsRes]) => {
      if (!alive) return
      // zmk_cards lentelės gali nebūti (migracija nepaleista) – fallback default
      if (!zmkRes.error && zmkRes.data && zmkRes.data.length > 0) {
        setZmkDefs(zmkRes.data as unknown as ZmkCardDef[])
      }
      // Tik DEMO kaladei prakeiksmai imami iš visų curse kortų; tikros kaladės
      // naudoja žaidėjo išsaugotą side deck'ą (užkraunamas viršuje su deck_cards).
      if (deckId === DEMO_DECK_ID && !cardsRes.error && cardsRes.data) {
        const all = (cardsRes.data as unknown as NonNullable<DbRow['card']>[]).map(mapDbCard)
        const curses = all.filter((c) => c.type === 'curse').map((c, i) => ({ ...c, uid: c.id + '-cu' + i }))
        setCurseCards(curses)
      }
      setExtrasLoaded(true)
    }).catch(() => { if (alive) setExtrasLoaded(true) })
    return () => { alive = false }
  }, [deckId])

  // ── Žaidimo (per)kūrimas ──
  const initGame = useCallback((cards: TutCard[], opp?: TutCard[] | null) => {
    const aiSource = opp && opp.length > 0 ? opp : cards
    const g = createGame(
      cards.map((c, i) => ({ ...c, uid: c.uid + '-y' + i })),
      aiSource.map((c, i) => ({ ...c, uid: c.uid + '-a' + i })),
      'you',
      { zmkDefs, curseCards },
    )
    beginTurn(g)
    seenRef.current = g.log.length
    setGame(g)
    playShuffle()
  }, [zmkDefs, curseCards])

  // Praktika / PvP host: priešo (svečio) kaladė
  useEffect(() => {
    if (!loadOpp) return
    let alive = true
    const supabase = createClient()
    const sel = `id, name, image_url, gold_cost, attack, health, effect_text, description, is_champion, subtype, champion_group, champion_phase, gameplay, card_type:card_types ( name ), rarity:rarities ( color_hex ), faction:factions ( color_hex ), card_keywords ( keyword:keywords ( name ) )`
    if (opponentDeckId) {
      supabase.from('deck_cards').select(`quantity, is_side_deck, card:cards ( ${sel} )`).eq('deck_id', opponentDeckId).then(({ data }) => {
        if (!alive) return
        try {
          const rows = ((data as unknown as DbRow[]) ?? []).filter((r) => !(r as { is_side_deck?: boolean }).is_side_deck)
          const built = rowsToDeck(rows, 'o')
          setOppCards(built.length > 0 ? built : [])
        } catch { setOppCards([]) }
      }, () => { if (alive) setOppCards([]) })
    } else if (opponentFaction) {
      supabase.from('cards').select(sel).eq('status', 'active').in('faction_id', [opponentFaction, 14]).limit(250).then(({ data }) => {
        if (!alive) return
        try {
          const mapped = ((data as unknown as NonNullable<DbRow['card']>[]) ?? []).map(mapDbCard)
          setOppCards(buildDemoDeck(mapped))
        } catch { setOppCards([]) }
      }, () => { if (alive) setOppCards([]) })
    } else {
      setOppCards([])
    }
    return () => { alive = false }
  }, [loadOpp, opponentDeckId, opponentFaction])

  const oppReady = !loadOpp || oppCards !== null
  useEffect(() => {
    // Svečias žaidimo nekuria – laukia būsenos iš host'o.
    if (isGuest) return
    if (deckCards && extrasLoaded && oppReady && !game) initGame(deckCards, oppCards)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deckCards, extrasLoaded, oppReady, initGame, isGuest])

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

  const rectFor = useCallback((ref?: { side?: Side; uid?: string; kind?: string }): { x: number; y: number } | null => {
    if (!ref) return null
    let el: Element | null = null
    if (ref.uid) el = document.querySelector(`[data-unit-uid="${ref.uid}"]`) ?? document.querySelector(`[data-artifact-uid="${ref.uid}"]`)
    if (!el && ref.side) el = document.querySelector(`[data-player="${ref.side}"]`)
    if (!el) return null
    const r = el.getBoundingClientRect()
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 }
  }, [])

  const PROJ_EMOJI: Record<string, string> = useMemo(() => ({
    fireball: '🔥', darkCurse: '🟣', healingGlow: '✨', freezeBurst: '❄️',
    stunBurst: '💫', destroyStrike: '⚔️', arrow: '🏹', lightning: '⚡', poisonGlob: '☣️',
  }), [])

  const spawnProjectile = useCallback((from: { x: number; y: number }, to: { x: number; y: number }, emoji: string) => {
    const id = ++projIdRef.current
    setProjectiles((ps) => [...ps, { id, emoji, from, to }])
    setTimeout(() => {
      setProjectiles((ps) => ps.filter((x) => x.id !== id))
      setImpacts((im) => [...im, { id, x: to.x, y: to.y, emoji }])
      playBattleSound('impact', 0.35)
      setTimeout(() => setImpacts((im) => im.filter((x) => x.id !== id)), 500)
    }, 420)
  }, [])

  const pushToast = useCallback((msg: string) => {
    playError()
    setToast(msg)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 3200)
  }, [])

  const queueTip = useCallback((k: TipKey) => {
    if (practice || vsRemote) return
    if (shownTipsRef.current.has(k)) return
    shownTipsRef.current.add(k)
    setTipQueue((q) => [...q, k])
  }, [practice])

  // ── Naujų įvykių apdorojimas: garsai, ŽMK, patarimai, žingsnių progresas ──
  useEffect(() => {
    if (!game) return
    const fresh = game.log.slice(seenRef.current)
    seenRef.current = game.log.length
    let zmkN = 0
    const zmkBatch: { v: string; side: Side }[] = []
    for (const e of fresh) {
      // garsai: engine pateiktas sound hint > numatytasis pagal tipą
      if (e.sound) playBattleSound(e.sound)
      switch (e.t) {
        case 'draw': if (!e.sound) playCardDraw(); break
        case 'play': case 'artifact': case 'champion': if (!e.sound) playBattleSound('summon'); break
        case 'spell': case 'ability': if (!e.sound) playBattleSound('spellCast'); break
        case 'attack': if (!e.sound) playBattleSound('attack'); break
        case 'zmk':
          zmkN += 1
          if (game.zmkMode === 'draw') {
            setZmkPending((q) => [...q, { v: e.zmk ?? '?', side: e.side, revealed: false }])
          } else {
            zmkBatch.push({ v: e.zmk ?? '?', side: e.side })
          }
          if (!e.sound) playBattleSound('zmkFlip')
          if (e.zmk === 'x2' || e.zmk === 'x0') queueTip('zmk-special')
          break
        case 'death': {
          const uid = e.src?.uid
          const card = e.cardName ? cardByName[e.cardName] : null
          const from = uid ? unitRectsRef.current.get(uid) : null
          const pileEl = document.querySelector(`[data-pile="discard-${e.side}"]`)
          if (card && from && pileEl) {
            const r = pileEl.getBoundingClientRect()
            const to = { x: r.left + r.width / 2, y: r.top + r.height / 2 }
            const id = ++flyIdRef.current
            setFlyingCards((f) => [...f, { id, card, from, to }])
            setTimeout(() => setFlyingCards((f) => f.filter((x) => x.id !== id)), 650)
          }
          break
        }
        case 'win': if (e.side === 'you') playSuccess(); else playError(); break
        case 'lastwish': queueTip('lastwish'); break
        case 'battlecry': queueTip('battlecry'); break
        case 'reactionTrigger': queueTip('reaction'); break
        case 'field': queueTip('field'); if (!e.sound) playBattleSound('field'); break
        case 'evolve': queueTip('evolve'); playSuccess(); break
        case 'handBurn': queueTip('hand-burn'); break
        case 'curse': {
          queueTip('curse')
          playBattleSound('curse')
          const cc = [...game.you.discard, ...game.ai.discard].find((c) => c.name === e.cardName)
          setCurseShow({ name: e.cardName ?? 'Prakeiksmas', msg: e.msg, image: cc?.image ?? null })
          setTimeout(() => setCurseShow(null), 2600)
          break
        }
        case 'coin': queueTip('coin'); break
        case 'status': if (e.status) queueTip(('status-' + e.status) as TipKey); break
        default: break
      }
      if (e.t === 'champion') queueTip('champion')
      if (e.t === 'artifact') queueTip('artifact')
      if (e.t === 'play' && /Sprintas/.test(e.msg)) queueTip('sprint')
      // projectile animacija (spell / ability / attack su src+tgt)
      if (e.src && e.tgt && (e.t === 'spell' || e.t === 'ability' || e.t === 'attack')) {
        const emoji = e.t === 'attack' ? '⚔️' : PROJ_EMOJI[e.projectile ?? ''] ?? (e.projectile && e.projectile !== 'none' ? '✨' : '')
        if (emoji) {
          // setTimeout – kad DOM jau būtų atnaujintas
          const src = e.src, tgt = e.tgt
          setTimeout(() => {
            const from = rectFor(src)
            const to = rectFor(tgt)
            if (from && to) spawnProjectile(from, to, emoji)
          }, 30)
        }
      }
    }
    if (zmkBatch.length > 0) setZmkFlash({ cards: zmkBatch, n: seenRef.current })

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
  }, [game, step, queueTip, PROJ_EMOJI, rectFor, spawnProjectile, cardByName])

  // ŽMK flash dingsta
  useEffect(() => {
    if (!zmkFlash) return
    const t = setTimeout(() => setZmkFlash(null), 2000)
    return () => clearTimeout(t)
  }, [zmkFlash])

  // Padarų pozicijų momentinė nuotrauka (sunaikinimo skrydžio animacijai). Be deps – po kiekvieno render'io.
  useEffect(() => {
    const m = new Map<string, { x: number; y: number }>()
    document.querySelectorAll('[data-unit-uid]').forEach((el) => {
      const id = el.getAttribute('data-unit-uid')
      if (!id) return
      const r = el.getBoundingClientRect()
      m.set(id, { x: r.left + r.width / 2, y: r.top + r.height / 2 })
    })
    unitRectsRef.current = m
  })

  // ── Tutorial fallback: žingsnis niekada neprašo neįmanomo veiksmo ──
  useEffect(() => {
    if (!game || !step?.require || game.active !== 'you' || game.winner) return
    if (step.require === 'play-unit' || step.require === 'any-play') {
      const playable = game.you.hand.some((c) =>
        c.type !== 'curse' && game.you.gold >= c.gold &&
        (c.type !== 'unit' || game.you.units.some((u) => u === null)) &&
        (c.type !== 'champion'))
      if (!playable) {
        if (!practice && !vsRemote && !grantedGoldRef.current && game.you.hand.some((c) => c.type !== 'curse' && c.type !== 'champion')) {
          // suteikiam mokymo aukso, kad žingsnis būtų įvykdomas
          grantedGoldRef.current = true
          setGame((prev) => {
            if (!prev) return prev
            const g2 = cloneState(prev)
            const cheapest = Math.min(...g2.you.hand.filter((c) => c.type !== 'curse' && c.type !== 'champion').map((c) => c.gold))
            const need = Math.max(0, cheapest - g2.you.gold)
            g2.you.gold += Math.max(need, 100)
            g2.log.push({ t: 'gold', side: 'you', value: need, msg: `🎓 Mokymui pridedama aukso – dabar gali sužaisti kortą.` })
            return g2
          })
        } else {
          // vis tiek neįmanoma (pvz. tuščia ranka) – praleidžiam žingsnį
          setStepIdx((i) => i + 1)
        }
      }
    } else if (step.require === 'attack') {
      const canAttack = game.you.units.some((u) => u && canUnitAttack(game, 'you', u).ok)
      if (!canAttack) setStepIdx((i) => i + 1)
    }
  }, [game, step])

  // ── AI ėjimo ciklas ──
  useEffect(() => {
    if (vsRemote) return  // PvP – jokio AI
    if (!game || game.winner || game.active !== 'ai' || popupBlocks || zmkBlocks || peekBlocks || revealBlocks || summonBlocks || choiceBlocks) return
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
  }, [game, popupBlocks, zmkBlocks, peekBlocks, revealBlocks, summonBlocks, choiceBlocks])

  // ── Žaidėjo veiksmai ──
  const myTurn = !!game && game.active === 'you' && !game.winner

  // ── PvP realtime: kanalas + veiksmų dispečeris ──
  const channelRef = useRef<RealtimeChannel | null>(null)
  useEffect(() => {
    if (!net) return
    const supabase = createClient()
    const ch = supabase.channel('pvp-' + net.matchId, { config: { broadcast: { self: false } } })
    if (net.isHost) {
      ch.on('broadcast', { event: 'action' }, ({ payload }) => {
        const a = payload as NetAction
        setGame((prev) => { if (!prev) return prev; const g = cloneState(prev); applyNetAction(g, a); return g })
      })
      ch.on('broadcast', { event: 'hello' }, () => {
        setGame((prev) => { if (prev) ch.send({ type: 'broadcast', event: 'state', payload: prev }); return prev })
      })
    } else {
      ch.on('broadcast', { event: 'state' }, ({ payload }) => {
        setGame(swapPerspective(payload as GameState))
      })
    }
    ch.subscribe((status) => {
      if (status === 'SUBSCRIBED' && !net.isHost) ch.send({ type: 'broadcast', event: 'hello', payload: {} })
    })
    channelRef.current = ch
    return () => { supabase.removeChannel(ch); channelRef.current = null }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [net?.matchId])

  // Host transliuoja autoritetinę būseną po kiekvieno pasikeitimo
  useEffect(() => {
    if (isHost && game && channelRef.current) {
      channelRef.current.send({ type: 'broadcast', event: 'state', payload: game })
    }
  }, [game, isHost])

  /** Struktūruotas veiksmas: svečias siunčia host'ui, host/lokalus – taiko vietoje. */
  const doAction = useCallback((a: NetAction) => {
    if (isGuest) {
      channelRef.current?.send({ type: 'broadcast', event: 'action', payload: swapAction(a) })
      return
    }
    setGame((prev) => {
      if (!prev) return prev
      const g = cloneState(prev)
      const r = applyNetAction(g, a)
      if (r && !r.ok) { pushToast(r.reason ?? 'Veiksmas negalimas'); return prev }
      return g
    })
  }, [isGuest, pushToast])

  // PvP: užkraunam varžovo viešą profilį + viešas kalades
  useEffect(() => {
    if (!net?.opponentId) return
    const supabase = createClient()
    supabase.from('profiles').select('id, username, display_name, avatar_url, level, is_public').eq('id', net.opponentId).maybeSingle()
      .then(({ data }) => { if (data) setOppProfile(data as typeof oppProfile) })
    supabase.from('decks').select('id, name').eq('user_id', net.opponentId).eq('visibility', 'public').order('updated_at', { ascending: false }).limit(6)
      .then(({ data }) => setOppDecks(((data as { id: string; name: string }[]) ?? [])))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [net?.opponentId])

  // PvP: 60s ėjimo laikmatis – aktyvus žaidėjas, pasibaigus, automatiškai baigia ėjimą
  useEffect(() => {
    if (!vsRemote || !game || game.winner) return
    setTurnLeft(60)
    const start = Date.now()
    const iv = setInterval(() => {
      const left = Math.max(0, 60 - Math.floor((Date.now() - start) / 1000))
      setTurnLeft(left)
      if (left <= 0) {
        clearInterval(iv)
        if (game.active === 'you') doAction({ t: 'endTurn', actor: 'you' })
      }
    }, 500)
    return () => clearInterval(iv)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vsRemote, game?.globalTurn, game?.active, game?.winner])

  const onHandCardClick = (c: TutCard) => {
    if (!myTurn) { pushToast('Palauk savo ėjimo.'); return }
    if (popupBlocks) return
    if (step?.require === 'end-turn') { pushToast('Dabar spausk „Baigti ėjimą".'); return }
    if (select?.kind === 'discard') {
      doAction({ t: 'discardForGold', actor: 'you', uid: c.uid })
      setSelect(null)
      return
    }
    if (select?.kind === 'sacrifice') {
      if (c.uid === select.cardUid) { pushToast('Negali paaukoti paties Čempiono.'); return }
      const picked = select.picked.includes(c.uid) ? select.picked : [...select.picked, c.uid]
      if (picked.length >= 2) {
        doAction({ t: 'play', actor: 'you', uid: select.cardUid, tributeHandUids: picked.slice(0, 2) })
        setSelect(null)
      } else {
        playUiClick()
        setSelect({ ...select, picked })
        pushToast(`Tribute iš rankos: ${picked.length}/2 (arba paspausk padarą lauke = 1 tšk).`)
      }
      return
    }
    if (c.type === 'champion') {
      const fam = c.championGroup ?? null
      const ph = c.championPhase ?? null
      const champOnField = game!.you.units.find((u) => u?.isChampion && (fam ? u.card.championGroup === fam : true))
      const canEvolveNow = ph != null && !!champOnField && champOnField.phase === ph - 1
      // Aukštesnė fazė, kurios dabar negalima nei iškviesti (≠1), nei evoliucionuoti → siūlom keisti į žemesnę
      if (ph != null && ph > 1 && !canEvolveNow) {
        const opts: number[] = []
        for (let tp = 1; tp < ph; tp++) if (game!.you.deck.some((d) => d.championGroup === fam && d.championPhase === tp)) opts.push(tp)
        if (opts.length > 0) { playUiClick(); setChampSwap({ cardUid: c.uid, name: c.name, phase: ph, options: opts }); return }
        pushToast(`Reikia ${ph - 1} fazės Čempiono lauke (arba turėk žemesnę fazę kaladėje, kad pakeistum).`)
        return
      }
      const hasBoardSac = game!.you.units.some((u) => u && !u.isChampion)
      const handSacCount = game!.you.hand.filter((h) => h.uid !== c.uid).length
      if (!hasBoardSac && handSacCount < 2) { pushToast('Čempionui reikia tribute: 1 padaras lauke ARBA 2 kortos rankoje.'); return }
      if (game!.you.gold < c.gold) { pushToast(`Trūksta aukso: kaina ${c.gold}, turi ${game!.you.gold}.`); return }
      playUiClick()
      setSelect({ kind: 'sacrifice', cardUid: c.uid, picked: [] })
      pushToast('Tribute: padaras lauke (1 tšk) ARBA 2 kortos rankoje (0/2).')
      return
    }
    const selMap = selectionMappingFor(c)
    const legacyNeedsTarget = (c.type === 'spell' || (c.type === 'unit' && c.keywords.includes('battlecry'))) && !!c.effect?.targeted
    if (selMap || legacyNeedsTarget) {
      if (game!.you.gold < c.gold) { pushToast(`Trūksta aukso: kaina ${c.gold}, turi ${game!.you.gold}.`); return }
      // Jei mapping reikalauja taikinio, bet lauke nėra galimų taikinių – tiesiog sužaidžiam (auto).
      if (selMap && resolveTargets(game!, 'you', selMap.target).length === 0) {
        doAction({ t: 'play', actor: 'you', uid: c.uid }); setSelect(null); return
      }
      const need = Math.max(1, selMap?.hitCount ?? 1)
      const avail = selMap ? spellTargetRefs(game!, 'you', selMap).length : 0
      playUiClick()
      if (selMap && need > 1 && avail > 1) {
        setSelect({ kind: 'spellMulti', uid: c.uid, need: Math.min(need, avail), picked: [] })
        pushToast(`Pasirink taikinius: 0/${Math.min(need, avail)}`)
        return
      }
      setSelect({ kind: 'spell', uid: c.uid })
      pushToast('Pasirink taikinį efektui (pažymėti padarai).')
      return
    }
    doAction({ t: 'play', actor: 'you', uid: c.uid })
    setSelect(null)
  }

  const onMyUnitClick = (u: BoardUnit) => {
    if (!myTurn || popupBlocks) return
    if (select?.kind === 'sacrifice') {
      if (u.isChampion) { pushToast('Čempiono paaukoti negalima.'); return }
      const cardUid = select.cardUid
      doAction({ t: 'play', actor: 'you', uid: cardUid, sacrificeUid: u.uid })
      setSelect(null)
      return
    }
    if (select?.kind === 'spell') {
      const uid = select.uid
      doAction({ t: 'play', actor: 'you', uid, target: { kind: 'unit', side: 'you', uid: u.uid } })
      setSelect(null)
      return
    }
    if (u.isChampion) {
      playUiClick()
      setChampPopup(u.uid)
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
      doAction({ t: 'attack', actor: 'you', uid, target: t })
      setSelect(null)
    } else if (select?.kind === 'spell') {
      const uid = select.uid
      doAction({ t: 'play', actor: 'you', uid, target: t })
      setSelect(null)
    } else if (select?.kind === 'spellMulti') {
      const key = t.kind + ':' + ('uid' in t ? t.uid : t.side)
      if (select.picked.some((p) => (p.kind + ':' + ('uid' in p ? p.uid : p.side)) === key)) return
      const picked = [...select.picked, t]
      if (picked.length >= select.need) {
        doAction({ t: 'play', actor: 'you', uid: select.uid, targets: picked })
        setSelect(null)
      } else {
        playUiClick()
        setSelect({ ...select, picked })
        pushToast(`Pasirink taikinius: ${picked.length}/${select.need}`)
      }
    }
  }

  const onEndTurn = () => {
    if (!myTurn || popupBlocks) return
    if (step && step.require && step.require !== 'end-turn') { pushToast('Pirmiausia atlik užduotį iš patarimo.'); return }
    playUiClick()
    setSelect(null)
doAction({ t: 'endTurn', actor: 'you' })
  }

  // teisėti taikiniai pažymėjimui
  const targetSet = useMemo(() => {
    if (!game) return new Set<string>()
    // Drag of a targeted card → highlight valid targets
    if (drag?.targeted) {
      const sm = selectionMappingFor(drag.card)
      const s = new Set<string>()
      if (sm) for (const t of spellTargetRefs(game, 'you', sm)) s.add(t.kind + ':' + ('uid' in t ? t.uid : t.side))
      else { for (const u of game.ai.units) if (u && !u.stealth) s.add('unit:' + u.uid); s.add('player:ai') }
      return s
    }
    if (!select) return new Set<string>()
    if (select.kind === 'attacker') {
      const ts = legalTargets(game, 'you')
      return new Set(ts.map((t) => t.kind + ':' + ('uid' in t ? t.uid : t.side)))
    }
    if (select.kind === 'spell') {
      const card = game.you.hand.find((c) => c.uid === select.uid)
      const sm = card ? selectionMappingFor(card) : null
      if (sm) {
        const s = new Set<string>()
        for (const t of resolveTargets(game, 'you', sm.target)) {
          if (t.kind === 'field') continue
          if (t.kind === 'unit' && t.side === 'ai') { const u = game.ai.units.find((x) => x?.uid === t.uid); if (u?.stealth) continue }
          s.add(t.kind + ':' + ('uid' in t ? t.uid : t.side))
        }
        return s
      }
      const s = new Set<string>()
      for (const u of game.ai.units) if (u && !u.stealth) s.add('unit:' + u.uid)
      for (const u of game.you.units) if (u) s.add('unit:' + u.uid)
      for (const a of game.ai.artifacts) if (a) s.add('artifact:' + a.uid)
      s.add('player:ai'); s.add('player:you')
      return s
    }
    if (select.kind === 'spellMulti') {
      const card = game.you.hand.find((c) => c.uid === select.uid)
      const sm = card ? selectionMappingFor(card) : null
      const s = new Set<string>()
      if (sm) for (const t of spellTargetRefs(game, 'you', sm)) s.add(t.kind + ':' + ('uid' in t ? t.uid : t.side))
      return s
    }
    return new Set<string>()
  }, [game, select, drag])

  // ── Drag & drop valdiklis (Hearthstone tipo: tempk kortą ant lentos) ──
  const elToTargetRef = (el: Element | null): TargetRef | null => {
    let n = el as HTMLElement | null
    while (n && n !== document.body) {
      const u = n.dataset?.unitUid
      if (u) { const side: Side = game!.you.units.some((x) => x?.uid === u) ? 'you' : 'ai'; return { kind: 'unit', side, uid: u } }
      const a = n.dataset?.artifactUid
      if (a) { const side: Side = game!.you.artifacts.some((x) => x?.uid === a) ? 'you' : 'ai'; return { kind: 'artifact', side, uid: a } }
      const pl = n.dataset?.player
      if (pl === 'you' || pl === 'ai') return { kind: 'player', side: pl }
      n = n.parentElement
    }
    return null
  }

  // Vienas pirštas: tempimas Į ŠONUS = ranka scrollinama (native pan-x), tempimas AUKŠTYN = žaidžiama korta.
  const beginHandPointer = (card: TutCard, e: React.PointerEvent) => {
    if (!myTurn || popupBlocks) return
    const sx = e.clientX, sy = e.clientY
    const selKind = select?.kind
    const wasExpanded = handExpanded
    let started = false
    dragMovedRef.current = false
    const handTop = () => (handPanelRef.current ?? handRef.current)?.getBoundingClientRect().top ?? Infinity
    let lp: ReturnType<typeof setTimeout> | null = null
    function cleanup() {
      if (lp) { clearTimeout(lp); lp = null }
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
    }
    function move(ev: PointerEvent) {
      const dx = ev.clientX - sx, dy = ev.clientY - sy
      if (!started) {
        if (dy < -14 && Math.abs(dy) > Math.abs(dx)) {
          started = true; dragMovedRef.current = true
          if (lp) { clearTimeout(lp); lp = null }
          if (wasExpanded) setHandExpanded(false)
          const d: DragState = { card, uid: card.uid, targeted: !!game && cardNeedsTarget(game, card), origin: { x: sx, y: sy }, x: ev.clientX, y: ev.clientY, mode: 'card' }
          dragRef.current = d; setDrag(d)
        } else if (Math.abs(dx) > 10) { cleanup(); return } else return
      }
      const d = dragRef.current; if (!d) return
      const onBoard = ev.clientY < handTop() - 10
      const nd: DragState = { ...d, x: ev.clientX, y: ev.clientY, mode: d.targeted && onBoard ? 'arrow' : 'card' }
      dragRef.current = nd; setDrag(nd)
    }
    function up(ev: PointerEvent) {
      cleanup()
      if (!started) {
        if (Math.hypot(ev.clientX - sx, ev.clientY - sy) < 12) {
          if (selKind === 'discard') { onHandCardClick(card); return }
          if (!handExpanded) { playUiClick(); setHandExpanded(true) }
          else if (!isTouch) { setHandExpanded(false); onHandCardClick(card) }
          // touch + atvira ranka: palietimas = tik skaitymas; žaidžiama tempiant AUKŠTYN
        }
        return
      }
      const d = dragRef.current; dragRef.current = null; setDrag(null)
      if (!d) return
      if (selKind === 'discard') { onHandCardClick(d.card); return }
      const onBoard = ev.clientY < handTop() - 10
      if (!onBoard) { playCardPick(); return }
      const tgt = elToTargetRef(document.elementFromPoint(ev.clientX, ev.clientY))
      const sm = selectionMappingFor(d.card)
      const multi = !!sm && (sm.hitCount ?? 1) > 1 && sm.requiresSelection !== false
      const valid = new Set<string>()
      if (game) {
        if (sm) for (const t of spellTargetRefs(game, 'you', sm)) valid.add(t.kind + ':' + ('uid' in t ? t.uid : t.side))
        else { for (const u of game.ai.units) if (u && !u.stealth) valid.add('unit:' + u.uid); valid.add('player:ai') }
      }
      if (d.targeted && !multi && tgt && valid.has(tgt.kind + ':' + ('uid' in tgt ? tgt.uid : tgt.side))) {
        doAction({ t: 'play', actor: 'you', uid: d.uid, target: tgt }); setSelect(null)
      } else {
        onHandCardClick(d.card)
      }
    }
    lp = setTimeout(() => { if (!started) setInspect(card) }, 480)
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
  }

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
  const renderPile = (label: string, count: number, opts?: { tut?: string; faceUp?: boolean; cards?: TutCard[]; pileKey?: string }) => {
    const interactive = !!opts?.cards && count > 0
    const open = () => opts?.cards && setPileView({ title: label, cards: opts.cards })
    return (
      <div data-tut={opts?.tut} data-pile={opts?.pileKey} className="flex flex-col items-center gap-0.5">
        <div
          className={'relative rounded-md flex items-center justify-center ' + (interactive ? 'cursor-pointer' : '')}
          style={{
            width: isTouch ? 34 : 44, height: isTouch ? 46 : 60,
            background: opts?.faceUp ? 'rgba(240,180,41,0.08)' : 'linear-gradient(145deg, #1a1325, #0d0a14)',
            border: '1px solid rgba(240,180,41,0.3)',
          }}
          onMouseEnter={interactive ? open : undefined}
          onMouseLeave={interactive ? () => setPileView(null) : undefined}
          onTouchStart={interactive ? () => { lpRef.current = setTimeout(open, 320) } : undefined}
          onTouchEnd={interactive ? () => { if (lpRef.current) { clearTimeout(lpRef.current); lpRef.current = null } } : undefined}
          onTouchMove={interactive ? () => { if (lpRef.current) { clearTimeout(lpRef.current); lpRef.current = null } } : undefined}
          title={interactive ? `Peržiūrėti (${count}) – vesk pele / palaikyk pirštą` : undefined}>
          <span className="text-[11px] font-bold" style={{ color: 'var(--gold)' }}>{count}</span>
          {interactive && <span className="absolute -top-1.5 -right-1.5 text-[9px]">👁</span>}
        </div>
        <span className="text-[8px] uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>{label}</span>
      </div>
    )
  }

  const renderUnitsRow = (side: Side, tut: string) => {
    if (!game) return null
    const p = P(game, side)
    const cap = boardCreatureCap(game, side)
    const slots = Math.max(cap, p.units.length)
    const myDropGlow = side === 'you' && !!drag && !drag.targeted && (cardDropZoneOf(drag.card) === 'unit' || cardDropZoneOf(drag.card) === 'spell')
    return (
      <div data-tut={tut} className="flex flex-wrap justify-center gap-1 sm:gap-2 min-h-[80px] sm:min-h-[124px] items-center">
        <AnimatePresence>
          {Array.from({ length: slots }).map((_, i) => { const u = p.units[i]; return u ? (
            <div key={u.uid} data-unit-uid={u.uid}
              onContextMenu={(e) => { e.preventDefault(); setInspect(u.card) }}
              onMouseEnter={!isTouch ? (ev) => setHoverCard({ card: u.card, x: ev.clientX, y: ev.clientY }) : undefined}
              onMouseMove={!isTouch ? (ev) => setHoverCard((hh) => hh ? { ...hh, x: ev.clientX, y: ev.clientY } : { card: u.card, x: ev.clientX, y: ev.clientY }) : undefined}
              onMouseLeave={!isTouch ? () => setHoverCard(null) : undefined}
              onTouchStart={() => { lpRef.current = setTimeout(() => { playCardFlip(); setInspect(u.card) }, 450) }}
              onTouchEnd={() => { if (lpRef.current) { clearTimeout(lpRef.current); lpRef.current = null } }}
              onTouchMove={() => { if (lpRef.current) { clearTimeout(lpRef.current); lpRef.current = null } }}>
              <UnitTile
                g={game} u={u} w={unitW}
                selected={select?.kind === 'attacker' && select.uid === u.uid}
                targetable={side === 'ai' ? targetSet.has('unit:' + u.uid) : (select?.kind === 'spell' || select?.kind === 'sacrifice') && targetSet.has('unit:' + u.uid) || (select?.kind === 'sacrifice' && !u.isChampion)}
                canAct={side === 'you' && myTurn && !u.isChampion && canUnitAttack(game, 'you', u).ok}
                dimmed={
                  (select?.kind === 'attacker' || select?.kind === 'spell') && side === 'ai' && !targetSet.has('unit:' + u.uid) ||
                  select?.kind === 'sacrifice' && side === 'you' && u.isChampion
                }
                onClick={() => side === 'you' ? onMyUnitClick(u) : onTargetClick({ kind: 'unit', side: 'ai', uid: u.uid })}
              />
            </div>
          ) : (
            <div key={side + '-slot-' + i} className="rounded-lg"
              style={{
                width: unitW, height: Math.round(unitW * 4 / 3),
                border: myDropGlow ? '2px solid rgba(74,222,128,0.85)' : '1px dashed rgba(240,180,41,0.18)',
                background: myDropGlow ? 'rgba(74,222,128,0.12)' : 'rgba(240,180,41,0.02)',
                boxShadow: myDropGlow ? '0 0 14px rgba(74,222,128,0.6)' : undefined,
                transition: 'box-shadow 0.15s, border-color 0.15s',
              }} />
          ) })}
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
            <button key={a.uid} data-artifact-uid={a.uid}
              onClick={() => side === 'ai' && onTargetClick({ kind: 'artifact', side: 'ai', uid: a.uid })}
              onContextMenu={(e) => { e.preventDefault(); setInspect(a.card) }}
              className="relative rounded-md overflow-hidden"
              style={{
                width: isTouch ? 40 : 50, height: isTouch ? 54 : 68,
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
              style={{ width: isTouch ? 40 : 50, height: isTouch ? 54 : 68, border: '1px dashed rgba(240,180,41,0.25)' }}>⭐</div>
          ))}
        </div>
        <div data-tut={side === 'you' ? 'reactions' : undefined} className="flex gap-1">
          {p.reactions.map((r, i) => r ? (
            <div key={r.uid} className="relative rounded-md"
              style={{ width: isTouch ? 40 : 50, height: isTouch ? 54 : 68, background: 'linear-gradient(145deg, #1a1325, #0d0a14)', border: '1px solid rgba(139,92,246,0.5)' }}>
              <span className="absolute inset-0 flex items-center justify-center text-sm opacity-50">⚡</span>
              <span className="absolute -top-1.5 left-1/2 -translate-x-1/2 px-1 rounded-full text-[8px] font-bold"
                style={{ background: 'rgba(0,0,0,0.9)', color: 'var(--gold)', border: '1px solid rgba(240,180,41,0.5)' }}>{r.paid}⚜</span>
            </div>
          ) : (
            <div key={side + '-rea-' + i} className="rounded-md flex items-center justify-center text-[10px] opacity-25"
              style={{ width: isTouch ? 40 : 50, height: isTouch ? 54 : 68, border: '1px dashed rgba(139,92,246,0.3)' }}>⚡</div>
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
        data-player={side}
        onClick={() => side === 'ai' && onTargetClick({ kind: 'player', side: 'ai' })}
        disabled={!targetable}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
        style={{
          background: 'rgba(0,0,0,0.5)',
          border: targetable ? '2px solid #ef4444' : '1px solid rgba(239,68,68,0.35)',
          boxShadow: targetable ? '0 0 12px rgba(239,68,68,0.6)' : 'none',
          cursor: targetable ? 'pointer' : 'default',
        }}>
        <span className="text-sm sm:text-lg">❤️</span>
        <span className="text-sm sm:text-lg font-bold" style={{ color: p.hp <= 10 ? '#ef4444' : 'var(--text-primary)', fontFamily: 'var(--rvn-font-display)' }}>
          {Math.max(0, p.hp)}
        </span>
      </button>
    )
  }

  const goldBar = (side: Side) => {
    if (!game) return null
    const p = P(game, side)
    return (
      <div data-tut={side === 'you' ? 'gold' : undefined} className="flex items-center gap-1.5 px-2 py-1 rounded-full"
        style={{ background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(240,180,41,0.4)' }}>
        <span className="inline-flex items-center justify-center rounded-full shrink-0"
          style={{
            width: 22, height: 22,
            background: 'radial-gradient(circle at 35% 30%, #fff4c2 0%, #f5c542 38%, #d49a1e 70%, #9c6b12 100%)',
            border: '1.5px solid #fff1b0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.6), inset 0 0 3px rgba(255,255,255,0.6), inset 0 -2px 3px rgba(120,80,10,0.6)',
            color: '#7a5210', fontSize: 11, fontWeight: 900, fontFamily: 'var(--rvn-font-display)',
            textShadow: '0 1px 0 rgba(255,255,255,0.35)',
          }}>⚜</span>
        <span className="text-sm sm:text-lg font-bold tabular-nums" style={{ color: 'var(--gold)', fontFamily: 'var(--rvn-font-display)' }}>{p.gold}</span>
      </div>
    )
  }

  const lastMsg = game?.log[game.log.length - 1]?.msg ?? ''

  // Targeting kursorius: spell – projectile emoji, ataka – kardai
  const targetingCursor = useMemo(() => {
    if (!select || select.kind === 'discard' || select.kind === 'sacrifice') return undefined
    const emoji = select.kind === 'attacker'
      ? '⚔️'
      : PROJ_EMOJI[
          (game?.you.hand.find((c) => select.kind === 'spell' && c.uid === select.uid)
            ? projectileForCard(game.you.hand.find((c) => c.uid === (select as { uid: string }).uid)!)
            : 'fireball')
        ] ?? '🔥'
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='32' height='32'><text x='2' y='24' font-size='22'>${emoji}</text></svg>`
    return `url("data:image/svg+xml,${encodeURIComponent(svg)}") 16 16, crosshair`
  }, [select, game, PROJ_EMOJI])

  // Taikymo etiketė prie kursoriaus (desktop): koks efektas vyks
  const selectLabel = useMemo(() => {
    if (!select || !game) return ''
    if (select.kind === 'attacker') { const u = game.you.units.find((x) => x?.uid === select.uid); return `⚔ Ataka${u ? ' ' + effectiveAtk(game, u) : ''}` }
    if (select.kind === 'spell' || select.kind === 'spellMulti') {
      const card = game.you.hand.find((c) => c.uid === select.uid)
      const m = card ? selectionMappingFor(card) : null
      const eff = m ? (EFFECT_TYPES.find((e) => e.value === m.effect)?.label ?? 'Efektas') : 'Burtas'
      const val = m && m.value != null ? ' ' + m.value : ''
      const cnt = select.kind === 'spellMulti' ? ` (${select.picked.length}/${select.need})` : ''
      return `✨ ${eff}${val}${cnt}`
    }
    if (select.kind === 'sacrifice') return `⚜ Tribute (${select.picked.length}/2)`
    return ''
  }, [select, game])

  useEffect(() => {
    if (!select || isTouch) { setCursorPos(null); return }
    const onMove = (e: MouseEvent) => setCursorPos({ x: e.clientX, y: e.clientY })
    window.addEventListener('mousemove', onMove)
    return () => window.removeEventListener('mousemove', onMove)
  }, [select, isTouch])

  // Mill pop-up (kortos iš kaladės -> kapinynas)
  useEffect(() => {
    const lm = game?.lastMill
    if (!lm || lm.id === millSeenRef.current) return
    millSeenRef.current = lm.id
    setMillShow({ side: lm.side, cards: lm.cards })
    const t = setTimeout(() => setMillShow(null), 2200)
    return () => clearTimeout(t)
  }, [game?.lastMill?.id])

  return createPortal(
    <div className="fixed inset-0 z-[120] flex flex-col select-none"
      style={{
        paddingBottom: 'env(safe-area-inset-bottom)',
        paddingTop: 'env(safe-area-inset-top)',
        background: 'radial-gradient(ellipse at 50% 0%, #1a1325 0%, #0a0810 60%, #060409 100%)',
        cursor: targetingCursor,
        WebkitUserSelect: 'none',
        WebkitTouchCallout: 'none',
        userSelect: 'none',
        overflowX: 'hidden',
      }}>
      {/* viršutinė juosta */}
      <div className="flex items-center justify-between px-3 py-2 shrink-0"
        style={{ borderBottom: '1px solid rgba(240,180,41,0.15)', background: 'rgba(0,0,0,0.35)' }}>
        <div className="flex items-center gap-2 min-w-0">
          {vsRemote ? (
            <>
              <button onClick={() => { playUiClick(); setOppOpen(true) }} className="flex items-center gap-2 min-w-0 rounded-lg px-1.5 py-1 transition-colors hover:bg-white/5" title="Varžovo profilis">
                <span className="text-[10px] uppercase tracking-wide shrink-0" style={{ color: 'var(--text-muted)' }}>vs</span>
                {oppProfile?.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={oppProfile.avatar_url} alt="" className="w-6 h-6 rounded-full object-cover shrink-0" style={{ border: '1px solid rgba(240,180,41,0.4)' }} />
                ) : (
                  <span className="w-6 h-6 rounded-full shrink-0 flex items-center justify-center text-[11px]" style={{ background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.4)' }}>⚔️</span>
                )}
                <span className="text-xs sm:text-sm font-bold truncate" style={{ fontFamily: 'var(--rvn-font-display)', color: 'var(--text-primary)' }}>
                  {oppProfile?.display_name || oppProfile?.username || opponentName || 'Varžovas'}
                </span>
              </button>
              {!game?.winner && (
                <span className="text-xs font-bold tabular-nums shrink-0 px-1.5 py-0.5 rounded" style={{ color: turnLeft <= 10 ? '#fca5a5' : 'var(--text-secondary)', background: turnLeft <= 10 ? 'rgba(239,68,68,0.12)' : 'transparent' }}>
                  ⏱ {turnLeft}s
                </span>
              )}
            </>
          ) : (
            <>
              <Swords className="w-4 h-4 shrink-0" style={{ color: 'var(--gold)' }} />
              <span className="text-xs sm:text-sm font-bold truncate" style={{ fontFamily: 'var(--rvn-font-display)', color: 'var(--text-primary)' }}>
                Mokomoji kova · {deckName}
              </span>
            </>
          )}
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

      {!loading && !errorMsg && !game && (
        <div className="flex-1 flex items-center justify-center">
          <span className="text-sm animate-pulse" style={{ color: 'var(--gold)' }}>Ruošiama kova…</span>
        </div>
      )}
      {game && !loading && (
        <div className="flex-1 min-h-0 flex flex-col overflow-y-auto sm:overflow-hidden px-2 py-1.5 gap-1">
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
                {renderPile('Kapinynas', game.ai.discard.length, { faceUp: true, cards: game.ai.discard, pileKey: 'discard-ai' })}
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
                  <MiniCard c={game.field.card} w={isTouch ? 36 : 48} />
                </button>
              ) : (
                <div className="rounded-md flex items-center justify-center text-xs opacity-25"
                  style={{ width: isTouch ? 36 : 48, height: isTouch ? 48 : 64, border: '1px dashed rgba(240,180,41,0.3)' }}>🌍</div>
              )}
              <span className="text-[8px] uppercase tracking-wide hidden sm:block" style={{ color: 'var(--text-muted)' }}>Laukas</span>
            </div>
            <div className="flex-1 max-w-md text-center px-2">
              <p className="text-[10px] sm:text-[11px] leading-snug line-clamp-2" style={{ color: 'var(--text-secondary)' }}>{lastMsg}</p>
            </div>
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
                {renderPile('Kaladė', game.you.deck.length, { tut: 'deck' })}
                {renderPile('Kapinynas', game.you.discard.length, { tut: 'discard', faceUp: true, cards: game.you.discard, pileKey: 'discard-you' })}
                {renderPile('ŽMK', game.you.zmk.length, { tut: 'zmk' })}
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
                onClick={() => { playUiClick(); setHandExpanded((v) => !v) }}
                className="px-2.5 py-1 rounded-full text-[11px] font-bold transition-all"
                style={{
                  background: handExpanded ? 'rgba(240,180,41,0.25)' : 'rgba(0,0,0,0.5)',
                  border: '1px solid rgba(240,180,41,0.4)',
                  color: 'var(--gold)',
                }}
                title={handExpanded ? 'Sumažinti ranką' : 'Padidinti ranką – kortos aiškiai matomos ir žaidžiamos'}>
                {handExpanded ? '🔍−' : '🔍+'}
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

            {/* ranka (sutraukta vėduoklė); palietus kortą – atsiveria didelė skaitoma ranka (overlay) */}
            <div data-tut="hand" ref={handRef}
              className="flex justify-center items-end gap-0 min-h-[104px] sm:min-h-[150px] pb-1 overflow-x-auto">
              <AnimatePresence>
                {game.you.hand.map((c, i) => {
                  const n = game.you.hand.length
                  const off = i - (n - 1) / 2
                  const afford = game.you.gold >= c.gold
                  const isDragging = drag?.uid === c.uid && dragMovedRef.current
                  return (
                    <motion.div key={c.uid} layout
                      initial={{ y: 55, opacity: 0, scale: 0.85 }}
                      animate={{ y: 0, opacity: isDragging ? 0.25 : 1, rotate: Math.max(-12, Math.min(12, off * (n > 8 ? 2 : 3.5))) }}
                      exit={{ y: -40, opacity: 0, scale: 0.8 }}
                      whileHover={{ y: -14, zIndex: 30, rotate: 0 }}
                      style={{ marginLeft: i === 0 ? 0 : -(handW * 0.32), zIndex: i }}
                      onContextMenu={(e) => { e.preventDefault(); setInspect(c) }}>
                      <GameCard glowColor={c.rarityColor} sounds={false} liftPx={0}>
                        <div onPointerDown={(e) => beginHandPointer(c, e)} className="block cursor-grab active:cursor-grabbing"
                          style={{ touchAction: 'pan-x', filter: select?.kind === 'discard' ? 'hue-rotate(40deg)' : undefined, opacity: isDragging ? 0.3 : 1 }}>
                          <MiniCard c={c} w={handW} dim={!afford && select?.kind !== 'discard'} />
                        </div>
                      </GameCard>
                    </motion.div>
                  )
                })}
              </AnimatePresence>
              {game.you.hand.length === 0 && (
                <span className="text-[10px] self-center mx-auto" style={{ color: 'var(--text-muted)' }}>Ranka tuščia</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── pasirinkimo užuomina ── */}
      <AnimatePresence>
        {select && select.kind !== 'discard' && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="fixed bottom-28 sm:bottom-32 left-0 right-0 mx-auto w-fit z-[125] px-3 py-1.5 rounded-full text-[10px] sm:text-[11px] font-semibold pointer-events-none max-w-[94vw] text-center"
            style={{ background: 'rgba(0,0,0,0.85)', border: '1px solid rgba(240,180,41,0.5)', color: 'var(--gold)' }}>
            {select.kind === 'attacker' && '⚔ Pasirink taikinį (raudonas apvadas) arba spausk Esc'}
            {select.kind === 'spell' && '✨ Pasirink burto taikinį arba spausk Esc'}
            {select.kind === 'sacrifice' && `⚜ Tribute: padaras lauke (1 tšk) ARBA 2 kortos rankoje (${select.picked.length}/2)`}
          </motion.div>
        )}
        {select?.kind === 'discard' && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="fixed bottom-28 sm:bottom-32 left-0 right-0 mx-auto w-fit z-[125] px-3 py-1.5 rounded-full text-[10px] sm:text-[11px] font-semibold pointer-events-none max-w-[94vw] text-center"
            style={{ background: 'rgba(0,0,0,0.85)', border: '1px solid rgba(240,180,41,0.5)', color: 'var(--gold)' }}>
            🗑 Pasirink kortą rankoje, kurią išmesi už +100 aukso
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── klaidos toast ── */}
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="fixed top-14 left-0 right-0 mx-auto w-fit z-[130] px-4 py-2 rounded-xl text-xs font-semibold max-w-[90vw] text-center"
            style={{ background: 'rgba(40,10,10,0.95)', border: '1px solid rgba(239,68,68,0.5)', color: '#fca5a5' }}>
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── vedamo žingsnio pop-up ── */}
      <AnimatePresence>
        {/* PvP: varžovo viešas profilis */}
        {oppOpen && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.78)' }} onClick={() => setOppOpen(false)}>
            <div className="rounded-2xl p-5 w-[min(400px,94vw)]" style={{ background: 'linear-gradient(145deg, #1a1325, #0d0a14)', border: '1px solid rgba(239,68,68,0.4)' }} onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center gap-3 mb-3">
                {oppProfile?.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={oppProfile.avatar_url} alt="" className="w-14 h-14 rounded-full object-cover" style={{ border: '1px solid rgba(240,180,41,0.4)' }} />
                ) : (
                  <span className="w-14 h-14 rounded-full flex items-center justify-center text-2xl" style={{ background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.4)' }}>⚔️</span>
                )}
                <div className="min-w-0">
                  <p className="text-base font-bold truncate" style={{ fontFamily: 'var(--rvn-font-display)', color: 'var(--text-primary)' }}>{oppProfile?.display_name || oppProfile?.username || opponentName || 'Varžovas'}</p>
                  {oppProfile?.username && <p className="text-xs" style={{ color: 'var(--text-muted)' }}>@{oppProfile.username}{oppProfile.level != null ? ` · Lygis ${oppProfile.level}` : ''}</p>}
                </div>
              </div>
              <p className="text-[11px] uppercase tracking-wide mb-1.5" style={{ color: 'var(--text-muted)', fontFamily: 'var(--rvn-font-display)' }}>Viešos kaladės</p>
              {oppDecks.length === 0 ? (
                <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>Nėra viešų kaladžių.</p>
              ) : (
                <div className="space-y-1 mb-3 max-h-44 overflow-y-auto">
                  {oppDecks.map((d) => (
                    <a key={d.id} href={'/community-decks/' + d.id} target="_blank" rel="noreferrer" className="block rounded-lg px-3 py-1.5 text-xs transition-colors hover:bg-white/5" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--bg-border)', color: 'var(--text-secondary)' }}>📚 {d.name}</a>
                  ))}
                </div>
              )}
              <button onClick={() => setOppOpen(false)} className="w-full px-4 py-2 rounded-xl text-sm" style={{ color: 'var(--text-muted)', border: '1px solid var(--bg-border)' }}>Uždaryti</button>
            </div>
          </div>
        )}

        {step && !popupCollapsed && (
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
              className="absolute left-0 right-0 mx-auto w-[min(420px,94vw)] rounded-2xl p-4"
              style={{
                pointerEvents: 'auto',
                maxHeight: isMobile ? '42vh' : '70vh',
                overflowY: 'auto',
                // Mobile: popup VIRŠUJE, kad neuždengtų rankos ir kortų
                top: isMobile ? 52 : anchorRect ? (anchorRect.top > window.innerHeight / 2 ? '18%' : undefined) : '30%',
                bottom: !isMobile && anchorRect && anchorRect.top <= window.innerHeight / 2 ? '22%' : undefined,
                background: 'linear-gradient(145deg, #1e1729, #120d1c)',
                border: '1px solid rgba(240,180,41,0.45)',
                boxShadow: '0 12px 40px rgba(0,0,0,0.8), 0 0 24px rgba(240,180,41,0.12)',
              }}>
              <p className="text-sm font-bold mb-1.5" style={{ fontFamily: 'var(--rvn-font-display)', color: 'var(--gold)' }}>{step.title}</p>
              <p className="text-xs leading-relaxed mb-3" style={{ color: 'var(--text-secondary)' }}>{step.text}</p>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button onClick={() => { playUiClick(); setStepIdx(GUIDED_STEPS.length) }}
                    className="text-[10px] underline opacity-60 hover:opacity-100" style={{ color: 'var(--text-muted)' }}>
                    Praleisti mokymą
                  </button>
                  <button onClick={() => { playUiClick(); setPopupCollapsed(true) }}
                    className="text-[10px] underline opacity-60 hover:opacity-100" style={{ color: 'var(--text-muted)' }}
                    title="Sutraukti – galėsi žaisti, patarimas lauks">
                    − Sutraukti
                  </button>
                </div>
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
        {activeTip && !popupCollapsed && (
          <motion.div key={activeTip} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
            className="fixed left-0 right-0 mx-auto z-[127] w-[min(380px,94vw)] rounded-2xl p-3.5 bottom-2 sm:bottom-36"
            style={{
              maxHeight: '50vh',
              overflowY: 'auto',
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
            <div className="flex justify-between items-center">
              <button onClick={() => { playUiClick(); setPopupCollapsed(true) }}
                className="text-[10px] underline opacity-60 hover:opacity-100" style={{ color: 'var(--text-muted)' }}>
                − Sutraukti
              </button>
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
            <div className="space-y-1">
              {game.log.slice(-80).map((e, i) => {
                const card = e.cardName ? cardByName[e.cardName] : null
                const zImg = e.t === 'zmk' && e.zmk ? zmkImg(game, e.zmk) : null
                const sideColor = e.side === 'you' ? 'rgba(96,165,250,0.7)' : 'rgba(167,139,250,0.7)'
                return (
                  <div key={i} className="flex items-start gap-1.5">
                    {card ? (
                      <div
                        onClick={() => { playCardFlip(); setInspect(card) }}
                        onMouseEnter={(ev) => setHoverCard({ card, x: ev.clientX, y: ev.clientY })}
                        onMouseMove={(ev) => setHoverCard((h) => h ? { ...h, x: ev.clientX, y: ev.clientY } : h)}
                        onMouseLeave={() => setHoverCard(null)}
                        onTouchStart={() => { lpRef.current = setTimeout(() => { playCardFlip(); setInspect(card) }, 450) }}
                        onTouchEnd={() => { if (lpRef.current) { clearTimeout(lpRef.current); lpRef.current = null } }}
                        onTouchMove={() => { if (lpRef.current) { clearTimeout(lpRef.current); lpRef.current = null } }}
                        className="shrink-0 cursor-pointer rounded overflow-hidden"
                        style={{ outline: '1.5px solid ' + sideColor }}
                        title={`${card.name} (spausk/laikyk – apžiūrėti)`}>
                        <MiniCard c={card} w={28} />
                      </div>
                    ) : zImg ? (
                      <div className="shrink-0 rounded overflow-hidden" style={{ width: 20, aspectRatio: '2.5 / 3.5', border: '1px solid var(--gold)' }}>
                        <img src={zImg} alt={e.zmk ?? ''} style={{ width: '100%', height: '100%', objectFit: 'cover' }} draggable={false} />
                      </div>
                    ) : null}
                    <p className="text-[10px] leading-snug" style={{
                      color: e.side === 'you' ? 'var(--text-secondary)' : '#a78bfa',
                      opacity: e.t === 'startTurn' ? 1 : 0.9,
                      fontWeight: e.t === 'startTurn' ? 700 : 400,
                      paddingTop: (card || zImg) ? 2 : 0,
                    }}>
                      {e.msg}
                    </p>
                  </div>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── sužaistos kortos hover peržiūra (PC) ── */}
      {hoverCard && typeof document !== 'undefined' && createPortal(
        <div className="fixed z-[200] pointer-events-none"
          style={{
            left: Math.min(hoverCard.x + 16, (typeof window !== 'undefined' ? window.innerWidth : 800) - 200),
            top: Math.min(hoverCard.y + 16, (typeof window !== 'undefined' ? window.innerHeight : 600) - 300),
          }}>
          <div className="rounded-xl overflow-hidden" style={{ width: 180, background: 'var(--bg-surface)', border: '2px solid ' + hoverCard.card.rarityColor, boxShadow: '0 8px 30px rgba(0,0,0,0.7)' }}>
            <MiniCard c={hoverCard.card} w={180} />
            <div className="p-2">
              <p className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>{hoverCard.card.name}</p>
              {hoverCard.card.effectText && (
                <p className="text-[10px] mt-0.5 leading-snug" style={{ color: 'var(--text-secondary)' }}>{hoverCard.card.effectText}</p>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── Čempiono skills popup ── */}
      <AnimatePresence>
        {champPopup && game && (() => {
          const ch = game.you.units.find((u) => u?.uid === champPopup) as BoardUnit | undefined
          if (!ch) return null
          const skills = championSkills(ch)
          return (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[134] flex items-center justify-center p-4"
              style={{ background: 'rgba(0,0,0,0.68)' }} onClick={() => setChampPopup(null)}>
              <motion.div initial={{ scale: 0.92, y: 10 }} animate={{ scale: 1, y: 0 }} onClick={(e) => e.stopPropagation()}
                className="rounded-2xl p-4 w-[min(380px,92vw)]"
                style={{ background: 'linear-gradient(145deg, #1e1729, #120d1c)', border: '1px solid rgba(240,180,41,0.5)' }}>
                <p className="text-sm font-bold mb-1" style={{ fontFamily: 'var(--rvn-font-display)', color: 'var(--gold)' }}>
                  ⚜ {ch.card.name} — {ch.phase} fazė
                </p>
                <p className="text-[11px] mb-3" style={{ color: ch.abilityUsed ? '#f87171' : 'var(--text-muted)' }}>
                  {ch.abilityUsed ? 'Šį ėjimą skill jau panaudotas.' : 'Pasirink skill (tik 1 per ėjimą)'}
                </p>
                <div className="space-y-2">
                  {skills.length === 0 && (
                    <p className="text-xs text-center py-3" style={{ color: 'var(--text-muted)' }}>Šis Čempionas neturi sukonfigūruotų skills.</p>
                  )}
                  {skills.map((sk, i) => {
                    const disabled = !sk.unlocked || ch.abilityUsed
                    return (
                      <button key={i} disabled={disabled}
                        onClick={() => { setChampPopup(null); doAction({ t: 'champ', actor: 'you', skillIndex: i }) }}
                        className="w-full text-left px-3 py-2 rounded-xl transition-all disabled:opacity-40"
                        style={{ background: sk.unlocked ? 'rgba(240,180,41,0.12)' : 'var(--bg-elevated)', border: '1px solid ' + (sk.unlocked ? 'rgba(240,180,41,0.4)' : 'var(--bg-border)') }}>
                        <span className="text-xs font-bold" style={{ color: sk.unlocked ? 'var(--gold)' : 'var(--text-muted)' }}>
                          {i + 1}. {sk.name} {!sk.unlocked && `🔒 (reikia ${i + 1} fazės)`}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </motion.div>
            </motion.div>
          )
        })()}
      </AnimatePresence>

      {/* ── Čempiono fazės keitimas į mažesnę ── */}
      <AnimatePresence>
        {champSwap && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[135] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }} onClick={() => setChampSwap(null)}>
            <motion.div initial={{ scale: 0.92, y: 10 }} animate={{ scale: 1, y: 0 }} onClick={(e) => e.stopPropagation()}
              className="rounded-2xl p-4 w-[min(360px,92vw)] text-center" style={{ background: 'linear-gradient(145deg,#1e1729,#120d1c)', border: '1px solid rgba(240,180,41,0.5)' }}>
              <p className="text-sm font-bold mb-1" style={{ fontFamily: 'var(--rvn-font-display)', color: 'var(--gold)' }}>⇩ Keisti Čempiono fazę</p>
              <p className="text-[11px] mb-3" style={{ color: 'var(--text-secondary)' }}>„{champSwap.name}" ({champSwap.phase} fazė) keičiama į žemesnės fazės kortą iš kaladės (dabar evoliucija negalima).</p>
              <div className="flex flex-col gap-2">
                {champSwap.options.map((tp) => (
                  <button key={tp} onClick={() => { playUiClick(); doAction({ t: 'swapChampPhase', actor: 'you', uid: champSwap.cardUid, phase: tp }); setChampSwap(null) }}
                    className="px-4 py-2 rounded-xl text-sm font-bold" style={{ background: 'rgba(240,180,41,0.14)', border: '1px solid rgba(240,180,41,0.45)', color: 'var(--gold)', fontFamily: 'var(--rvn-font-display)' }}>
                    → {tp} fazė
                  </button>
                ))}
              </div>
            </motion.div>
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

      {/* ── sutraukto popup atstatymo mygtukas ── */}
      <AnimatePresence>
        {popupCollapsed && (step || activeTip) && (
          <motion.button initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
            onClick={() => { playUiClick(); setPopupCollapsed(false) }}
            className="fixed right-2 top-1/3 z-[126] px-2.5 py-2 rounded-full text-base"
            style={{ background: 'linear-gradient(145deg, #1e1729, #120d1c)', border: '1px solid rgba(240,180,41,0.5)', boxShadow: '0 4px 16px rgba(0,0,0,0.7)' }}
            title="Rodyti mokymo patarimą">
            🎓
          </motion.button>
        )}
      </AnimatePresence>

      {/* ── projectile / impact sluoksnis ── */}
      <div className="fixed inset-0 z-[128] pointer-events-none">
        <AnimatePresence>
          {projectiles.map((pr) => (
            <motion.div key={pr.id}
              initial={{ left: pr.from.x - 16, top: pr.from.y - 16, scale: 0.6, opacity: 0.9 }}
              animate={{ left: pr.to.x - 16, top: pr.to.y - 16, scale: 1.15, opacity: 1 }}
              transition={{ duration: 0.42, ease: 'easeIn' }}
              className="absolute text-3xl"
              style={{ textShadow: '0 0 14px rgba(240,180,41,0.8)' }}>
              {pr.emoji}
            </motion.div>
          ))}
          {impacts.map((im) => (
            <motion.div key={'imp' + im.id}
              initial={{ scale: 0.4, opacity: 1 }}
              animate={{ scale: 2.2, opacity: 0 }}
              transition={{ duration: 0.5 }}
              className="absolute text-3xl"
              style={{ left: im.x - 18, top: im.y - 18 }}>
              💥
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* ── skrendančios kortos (sunaikinta/panaudota → kapinynas) ── */}
      <div className="fixed inset-0 z-[129] pointer-events-none">
        <AnimatePresence>
          {flyingCards.map((fc) => (
            <motion.div key={fc.id}
              initial={{ left: fc.from.x - 18, top: fc.from.y - 24, opacity: 1, scale: 1, rotate: 0 }}
              animate={{ left: fc.to.x - 12, top: fc.to.y - 16, opacity: 0.15, scale: 0.4, rotate: 35 }}
              transition={{ duration: 0.6, ease: 'easeIn' }}
              className="absolute"
              style={{ filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.6))' }}>
              <MiniCard c={fc.card} w={36} />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* ── ŽMK auto-traukimo flash (fiksuotas, centruotas; rodo VISAS traukimo kortas – pvz. puolančio ir gynėjo) ── */}
      <AnimatePresence>
        {zmkFlash && (
          <motion.div key={zmkFlash.n} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[130] flex items-center justify-center pointer-events-none">
            <div className="flex items-end justify-center gap-3 flex-wrap">
              {zmkFlash.cards.map((zc, idx) => {
                const col = zc.v.startsWith('+') && zc.v !== '+0' ? '#4ade80' : zc.v.startsWith('-') ? '#f87171' : 'var(--gold)'
                return (
                  <motion.div key={idx} initial={{ scale: 0.4, opacity: 0.3, rotateY: 90 }} animate={{ scale: 1, opacity: 1, rotateY: 0 }} exit={{ scale: 0.7, opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 240, damping: 18, delay: idx * 0.12 }}
                    className="flex flex-col items-center gap-1.5" style={{ transformStyle: 'preserve-3d' }}>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                      style={{ background: '#14101e', border: `1px solid ${zc.side === 'you' ? 'rgba(96,165,250,0.8)' : 'rgba(167,139,250,0.8)'}`, color: zc.side === 'you' ? '#93c5fd' : '#c4b5fd', fontFamily: 'var(--rvn-font-display)' }}>
                      {zc.side === 'you' ? 'Tavo ŽMK' : 'Priešo ŽMK'}
                    </span>
                    {zmkImg(game, zc.v) ? (
                      <div className="rounded-xl overflow-hidden" style={{ width: 'min(110px, 26vw)', aspectRatio: '2.5 / 3.5', border: '2px solid var(--gold)', boxShadow: '0 0 28px rgba(240,180,41,0.55)' }}>
                        <img src={zmkImg(game, zc.v)!} alt={`ŽMK ${zc.v}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} draggable={false} />
                      </div>
                    ) : null}
                    <span className="px-3 py-1 rounded-lg font-black text-base"
                      style={{ background: 'linear-gradient(145deg, #2a2138, #14101e)', border: '2px solid var(--gold)', color: col, boxShadow: '0 0 14px rgba(240,180,41,0.35)', fontFamily: 'var(--rvn-font-display)' }}>
                      ŽMK {zc.v.replace('x', '×')}
                    </span>
                  </motion.div>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── iškvietimo pasirinkimas (summonChoose) ── */}
      <AnimatePresence>
        {game?.pendingSummon && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[133] flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.7)' }}>
            <motion.div initial={{ scale: 0.92, y: 10 }} animate={{ scale: 1, y: 0 }}
              className="rounded-2xl p-4 w-[min(580px,94vw)] max-h-[86vh] overflow-y-auto text-center"
              style={{ background: 'linear-gradient(145deg, #1a1325, #0d0a14)', border: '1px solid rgba(240,180,41,0.5)' }}>
              <p className="text-sm font-bold mb-1" style={{ fontFamily: 'var(--rvn-font-display)', color: 'var(--gold)' }}>Pasirink iškvietimui</p>
              <p className="text-xs mb-3" style={{ color: 'var(--text-secondary)' }}>
                Pažymėk {game.pendingSummon.choose} ({summonSel.length}/{game.pendingSummon.choose})
              </p>
              <div className="flex flex-wrap gap-2 justify-center mb-4">
                {game.pendingSummon.options.map((o) => {
                  const sel = summonSel.includes(o.card.uid)
                  const full = summonSel.length >= game!.pendingSummon!.choose
                  const zl = o.zone === 'hand' ? 'Ranka' : o.zone === 'deck' ? 'Kaladė' : 'Kapinynas'
                  return (
                    <button key={o.card.uid} onClick={() => { playUiClick(); setSummonSel((q) => q.includes(o.card.uid) ? q.filter((x) => x !== o.card.uid) : (q.length >= game!.pendingSummon!.choose ? q : [...q, o.card.uid])) }}
                      className="relative transition-transform" style={{ transform: sel ? 'translateY(-6px) scale(1.04)' : undefined, opacity: !sel && full ? 0.5 : 1 }} title={o.card.name}>
                      <div style={{ outline: sel ? '2px solid #22c55e' : '2px solid transparent', borderRadius: 10 }}>
                        <MiniCard c={o.card} w={isTouch ? 60 : 74} />
                      </div>
                      <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-[8px] px-1 rounded-full" style={{ background: '#14101e', color: 'var(--text-muted)' }}>{zl}</span>
                    </button>
                  )
                })}
              </div>
              <button disabled={summonSel.length !== game.pendingSummon.choose}
                onClick={() => { playSuccess(); const sel = summonSel; setSummonSel([]); doAction({ t: 'resolveSummon', uids: sel }) }}
                className="px-5 py-2 rounded-xl text-sm font-bold transition-all disabled:opacity-40"
                style={{ background: 'rgba(34,197,94,0.22)', border: '1px solid rgba(34,197,94,0.5)', color: '#86efac', fontFamily: 'var(--rvn-font-display)' }}>
                Iškviesti pažymėtas
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── pasirink 1 iš kelių efektų / tutor korta į ranką ── */}
      <AnimatePresence>
        {game?.pendingChoice && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[134] flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.72)' }}>
            <motion.div initial={{ scale: 0.92, y: 10 }} animate={{ scale: 1, y: 0 }}
              className="rounded-2xl p-4 w-[min(600px,94vw)] max-h-[86vh] overflow-y-auto text-center"
              style={{ background: 'linear-gradient(145deg, #1a1325, #0d0a14)', border: '1px solid rgba(240,180,41,0.5)' }}>
              <p className="text-sm font-bold mb-3" style={{ fontFamily: 'var(--rvn-font-display)', color: 'var(--gold)' }}>{game.pendingChoice.title}</p>
              {game.pendingChoice.kind === 'tutorHand' && game.pendingChoice.cards ? (
                <div className="flex flex-wrap gap-2 justify-center">
                  {game.pendingChoice.cards.map((c, i) => (
                    <button key={c.uid + '-ch-' + i} onClick={() => { playSuccess(); doAction({ t: 'resolveChoice', index: i }) }} className="transition-transform hover:-translate-y-1" title={c.name}>
                      <MiniCard c={c} w={isTouch ? 60 : 74} />
                    </button>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col gap-2 items-stretch">
                  {game.pendingChoice.options.map((opt, i) => (
                    <button key={'opt-' + i} onClick={() => { playSuccess(); doAction({ t: 'resolveChoice', index: i }) }}
                      className="px-4 py-3 rounded-xl text-sm font-bold transition-all"
                      style={{ background: 'rgba(240,180,41,0.16)', border: '1px solid rgba(240,180,41,0.5)', color: 'var(--gold)', fontFamily: 'var(--rvn-font-display)' }}>
                      {opt.label}{opt.sub ? <span className="block text-[10px] font-normal mt-0.5" style={{ color: 'var(--text-secondary)' }}>{opt.sub}</span> : null}
                    </button>
                  ))}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── drag & drop vaizdas: korta seka pirštą / taikymo rodyklė ── */}
      {drag && dragMovedRef.current && typeof document !== 'undefined' && createPortal(
        drag.mode === 'arrow' ? (
          <svg className="fixed inset-0 z-[210] pointer-events-none" width="100%" height="100%">
            <defs>
              <marker id="rvn-arrow" markerWidth="10" markerHeight="10" refX="5" refY="3" orient="auto">
                <path d="M0,0 L6,3 L0,6 Z" fill="#f0b429" />
              </marker>
            </defs>
            <line x1={drag.origin.x} y1={drag.origin.y} x2={drag.x} y2={drag.y}
              stroke="#f0b429" strokeWidth="4" strokeDasharray="3 9" strokeLinecap="round" markerEnd="url(#rvn-arrow)" opacity="0.95" />
            <circle cx={drag.x} cy={drag.y} r="20" fill="none" stroke="#ef4444" strokeWidth="3" />
            <text x={drag.x} y={drag.y + 8} fontSize="22" textAnchor="middle">🎯</text>
          </svg>
        ) : (
          <div className="fixed z-[210] pointer-events-none" style={{ left: drag.x, top: drag.y, transform: 'translate(-50%, -50%) rotate(-4deg)' }}>
            <div style={{ filter: 'drop-shadow(0 10px 20px rgba(0,0,0,0.65))' }}>
              <MiniCard c={drag.card} w={isTouch ? 96 : 120} />
            </div>
          </div>
        ),
        document.body)}

      {/* ── išskleista ranka: scroll-snap karuselė (didelės skaitomos kortos), tempk AUKŠTYN = žaidi ── */}
      {handExpanded && game && (() => {
        const vh = typeof window !== 'undefined' ? window.innerHeight : 720
        const panelH = Math.min(Math.round(vh * 0.5), 460)
        const cardH = panelH - 92
        const handCardW = Math.max(150, Math.round(cardH * 0.75))
        const pad = 'calc(50% - ' + Math.round(handCardW / 2) + 'px)'
        return (
          <div className="fixed inset-0 z-[122]"
            onPointerDown={(e) => { if (e.target === e.currentTarget) { playUiClick(); setHandExpanded(false) } }}>
            <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.5)' }}
              onPointerDown={() => { playUiClick(); setHandExpanded(false) }} />
            <div ref={handPanelRef} className="absolute left-0 right-0 bottom-0 flex flex-col"
              style={{ height: panelH, background: 'linear-gradient(to top, #07050b 78%, rgba(7,5,11,0))', paddingBottom: 'env(safe-area-inset-bottom)' }}
              onPointerDown={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between px-3 pt-2 pb-1 shrink-0">
                <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>↑ Tempk kortą aukštyn — žaisti · braukite šonu</span>
                <button onClick={() => { playUiClick(); setHandExpanded(false) }} className="text-xs px-2.5 py-1 rounded-full"
                  style={{ background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(240,180,41,0.4)', color: 'var(--gold)' }}>✕</button>
              </div>
              <div className="flex-1 min-h-0 overflow-x-auto overflow-y-hidden flex items-center gap-4"
                style={{ scrollSnapType: 'x mandatory', touchAction: 'pan-x', paddingLeft: pad, paddingRight: pad }}>
                {game.you.hand.length === 0 && <span className="mx-auto text-xs" style={{ color: 'var(--text-muted)' }}>Ranka tuščia</span>}
                {game.you.hand.map((c) => {
                  const afford = game.you.gold >= c.gold
                  const isDragging = drag?.uid === c.uid && dragMovedRef.current
                  return (
                    <div key={c.uid}
                      onPointerDown={(e) => beginHandPointer(c, e)}
                      onContextMenu={(e) => { e.preventDefault(); setInspect(c) }}
                      className="shrink-0 cursor-grab active:cursor-grabbing"
                      style={{ scrollSnapAlign: 'center', touchAction: 'pan-x', opacity: isDragging ? 0.15 : 1, filter: select?.kind === 'discard' ? 'hue-rotate(40deg)' : undefined, boxShadow: afford ? '0 0 16px rgba(240,180,41,0.25)' : undefined, borderRadius: 12 }}>
                      <MiniCard c={c} w={handCardW} readable dim={!afford && select?.kind !== 'discard'} />
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )
      })()}

      {/* ── kelių taikinių parinkimo indikatorius (1/N) ── */}
      {select?.kind === 'spellMulti' && (
        <div className="fixed left-1/2 -translate-x-1/2 bottom-24 z-[120] px-4 py-2 rounded-full text-sm font-bold pointer-events-none"
          style={{ background: 'rgba(13,10,20,0.92)', border: '1px solid rgba(240,180,41,0.6)', color: 'var(--gold)', fontFamily: 'var(--rvn-font-display)' }}>
          🎯 Pasirink taikinius: {select.picked.length}/{select.need}
        </div>
      )}

      {/* ── taikymo etiketė prie kursoriaus (desktop) ── */}
      {cursorPos && selectLabel && !isTouch && createPortal(
        <div className="fixed z-[205] pointer-events-none px-2 py-1 rounded-md text-[11px] font-bold"
          style={{ left: cursorPos.x + 18, top: cursorPos.y + 18, background: 'rgba(13,10,20,0.95)', border: '1px solid rgba(240,180,41,0.6)', color: 'var(--gold)' }}>
          {selectLabel}
        </div>, document.body)}

      {/* ── mill pop-up: kortos -> kapinynas ── */}
      <AnimatePresence>
        {millShow && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[136] flex items-center justify-center p-4 pointer-events-none">
            <div className="rounded-2xl p-4 text-center pointer-events-auto" style={{ background: 'rgba(13,10,20,0.95)', border: '1px solid rgba(240,180,41,0.5)' }}>
              <p className="text-sm font-bold mb-2" style={{ fontFamily: 'var(--rvn-font-display)', color: 'var(--gold)' }}>
                🪦 {millShow.side === 'you' ? 'Tavo' : 'Priešininko'} {millShow.cards.length} korta(-os) → kapinynas
              </p>
              <div className="flex flex-wrap gap-2 justify-center max-w-[80vw]">
                {millShow.cards.map((c, i) => (
                  <motion.div key={c.uid + '-mill-' + i} initial={{ y: -10, opacity: 0 }} animate={{ y: 24, opacity: [0, 1, 1, 0.3] }} transition={{ duration: 1.8, delay: i * 0.12 }}>
                    <MiniCard c={c} w={isTouch ? 54 : 66} />
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── kaladės viršaus peržiūra (tik skaitymui) ── */}
      <AnimatePresence>
        {game?.pendingReveal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[133] flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.7)' }} onClick={() => doAction({ t: 'clearReveal' })}>
            <motion.div initial={{ scale: 0.92, y: 10 }} animate={{ scale: 1, y: 0 }} onClick={(e) => e.stopPropagation()}
              className="rounded-2xl p-4 w-[min(560px,94vw)] max-h-[86vh] overflow-y-auto text-center"
              style={{ background: 'linear-gradient(145deg, #1a1325, #0d0a14)', border: '1px solid rgba(240,180,41,0.5)' }}>
              <p className="text-sm font-bold mb-1" style={{ fontFamily: 'var(--rvn-font-display)', color: 'var(--gold)' }}>
                {game.pendingReveal.title}
              </p>
              <p className="text-xs mb-3" style={{ color: 'var(--text-secondary)' }}>Viršutinės kortos (kairė = viršus). Lieka kaladėje.</p>
              <div className="flex flex-wrap gap-2 justify-center mb-4">
                {game.pendingReveal.cards.map((c, i) => (
                  <div key={c.uid + '-rv-' + i} className="relative" title={c.name}>
                    <span className="absolute -top-1 -left-1 z-10 text-[9px] px-1 rounded-full font-bold" style={{ background: 'var(--gold)', color: '#0a0a0f' }}>{i + 1}</span>
                    <MiniCard c={c} w={isTouch ? 60 : 74} />
                  </div>
                ))}
              </div>
              <button onClick={() => doAction({ t: 'clearReveal' })}
                className="px-5 py-2 rounded-xl text-sm font-bold"
                style={{ background: 'rgba(240,180,41,0.2)', border: '1px solid rgba(240,180,41,0.5)', color: 'var(--gold)', fontFamily: 'var(--rvn-font-display)' }}>
                Gerai
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── peržiūrėk N → pasirink K išmesti (peekDiscard) ── */}
      <AnimatePresence>
        {game?.pendingPeek && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[133] flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.7)' }}>
            <motion.div initial={{ scale: 0.92, y: 10 }} animate={{ scale: 1, y: 0 }}
              className="rounded-2xl p-4 w-[min(560px,94vw)] max-h-[86vh] overflow-y-auto text-center"
              style={{ background: 'linear-gradient(145deg, #1a1325, #0d0a14)', border: '1px solid rgba(240,180,41,0.5)' }}>
              <p className="text-sm font-bold mb-1" style={{ fontFamily: 'var(--rvn-font-display)', color: 'var(--gold)' }}>
                Priešininko kaladės peržiūra
              </p>
              <p className="text-xs mb-3" style={{ color: 'var(--text-secondary)' }}>
                Pažymėk {game.pendingPeek.choose} kortą(-as), kurią(-ias) išmesti į kapinyną ({peekSel.length}/{game.pendingPeek.choose})
              </p>
              <div className="flex flex-wrap gap-2 justify-center mb-4">
                {game.pendingPeek.cards.map((c) => {
                  const sel = peekSel.includes(c.uid)
                  const full = peekSel.length >= game!.pendingPeek!.choose
                  return (
                    <button key={c.uid} onClick={() => {
                      playUiClick()
                      setPeekSel((q) => q.includes(c.uid) ? q.filter((x) => x !== c.uid) : (q.length >= game!.pendingPeek!.choose ? q : [...q, c.uid]))
                    }}
                      className="relative transition-transform"
                      style={{ transform: sel ? 'translateY(-6px) scale(1.04)' : undefined, opacity: !sel && full ? 0.5 : 1 }}
                      title={c.name}>
                      <div style={{ outline: sel ? '2px solid #ef4444' : '2px solid transparent', borderRadius: 10 }}>
                        <MiniCard c={c} w={isTouch ? 64 : 78} />
                      </div>
                      {sel && <span className="absolute -top-2 -right-2 text-xs px-1.5 rounded-full font-bold" style={{ background: '#ef4444', color: '#fff' }}>✕</span>}
                    </button>
                  )
                })}
              </div>
              <button
                disabled={peekSel.length !== game.pendingPeek.choose}
                onClick={() => { playSuccess(); const sel = peekSel; setPeekSel([]); doAction({ t: 'resolvePeek', uids: sel }) }}
                className="px-5 py-2 rounded-xl text-sm font-bold transition-all disabled:opacity-40"
                style={{ background: 'rgba(240,180,41,0.22)', border: '1px solid rgba(240,180,41,0.5)', color: 'var(--gold)', fontFamily: 'var(--rvn-font-display)' }}>
                Išmesti pažymėtas
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── kapinyno (ar kitos pilės) peržiūra – hover (PC) / palaikius pirštą (mobile) ── */}
      <AnimatePresence>
        {pileView && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[132] flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.62)' }}
            onClick={() => setPileView(null)}>
            <motion.div initial={{ scale: 0.92, y: 10 }} animate={{ scale: 1, y: 0 }} onClick={(e) => e.stopPropagation()}
              className="rounded-2xl p-4 w-[min(460px,93vw)] max-h-[82vh] overflow-y-auto"
              style={{ background: 'linear-gradient(145deg, #1a1325, #0d0a14)', border: '1px solid rgba(240,180,41,0.4)' }}>
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--gold)', fontFamily: 'var(--rvn-font-display)' }}>
                  {pileView.title} ({pileView.cards.length})
                </p>
                <button onClick={() => setPileView(null)} className="text-sm px-2" style={{ color: 'var(--text-muted)' }}>✕</button>
              </div>
              {pileView.cards.length === 0 ? (
                <p className="text-xs text-center py-6" style={{ color: 'var(--text-muted)' }}>Tuščia</p>
              ) : (
                <div className="flex flex-wrap gap-2 justify-center">
                  {pileView.cards.map((c, i) => (
                    <button key={c.uid + '-pv-' + i} onClick={() => { playCardFlip(); setInspect(c) }} title={c.name} className="transition-transform hover:scale-105">
                      <MiniCard c={c} w={isTouch ? 58 : 66} />
                    </button>
                  ))}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── ŽMK 'draw' režimo modalas: žaidėjas pats atverčia kortą ── */}
      <AnimatePresence>
        {zmkPending.length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[129] flex items-center justify-center"
            style={{ background: 'rgba(0,0,0,0.6)' }}>
            <motion.div initial={{ scale: 0.7, y: 12 }} animate={{ scale: 1, y: 0 }}
              className="rounded-2xl p-5 text-center w-[min(300px,86vw)]"
              style={{ background: 'linear-gradient(145deg, #1e1729, #120d1c)', border: '1px solid rgba(240,180,41,0.5)' }}>
              <p className="text-xs font-bold mb-3" style={{ fontFamily: 'var(--rvn-font-display)', color: 'var(--gold)' }}>
                ŽMK traukimas ({zmkPending[0].side === 'you' ? 'tavo' : 'priešininko'} žala)
              </p>
              {!zmkPending[0].revealed ? (
                <button
                  onClick={() => { playBattleSound('zmkFlip'); setZmkPending((q) => [{ ...q[0], revealed: true }, ...q.slice(1)]) }}
                  className="mx-auto block rounded-xl transition-transform hover:scale-105 active:scale-95"
                  style={{ width: 90, height: 120, background: 'linear-gradient(145deg, #1a1325, #0d0a14)', border: '2px solid rgba(240,180,41,0.4)' }}>
                  <span className="text-3xl opacity-40">🐦‍⬛</span>
                  <p className="text-[9px] mt-1" style={{ color: 'var(--text-muted)' }}>Spausk atversti</p>
                </button>
              ) : (
                <motion.div initial={{ rotateY: 90, opacity: 0.3 }} animate={{ rotateY: 0, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 240, damping: 18 }} className="space-y-2" style={{ transformStyle: 'preserve-3d' }}>
                  {zmkImg(game, zmkPending[0].v) ? (
                    <div className="mx-auto rounded-xl overflow-hidden" style={{ width: 100, aspectRatio: '2.5 / 3.5', border: '2px solid var(--gold)', boxShadow: '0 0 20px rgba(240,180,41,0.45)' }}>
                      <img src={zmkImg(game, zmkPending[0].v)!} alt={`ŽMK ${zmkPending[0].v}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} draggable={false} />
                    </div>
                  ) : (
                    <div className="mx-auto rounded-xl flex flex-col items-center justify-center"
                      style={{ width: 100, height: 140, background: 'rgba(240,180,41,0.08)', border: '2px solid var(--gold)' }}>
                      <span className="text-2xl font-black" style={{ color: 'var(--gold)', fontFamily: 'var(--rvn-font-display)' }}>
                        {zmkPending[0].v.replace('x', '×')}
                      </span>
                    </div>
                  )}
                  <p className="text-xs font-black" style={{ color: 'var(--gold)', fontFamily: 'var(--rvn-font-display)' }}>
                    {zmkPending[0].v.replace('x', '×')}<span style={{ color: 'var(--text-secondary)', fontWeight: 400 }}> · {game?.zmkDefs[zmkPending[0].v]?.name ?? ''}</span>
                  </p>
                  <button onClick={() => { playUiClick(); setZmkPending((q) => q.slice(1)) }}
                    className="px-4 py-1.5 rounded-lg text-xs font-bold"
                    style={{ background: 'rgba(240,180,41,0.2)', border: '1px solid rgba(240,180,41,0.5)', color: 'var(--gold)' }}>
                    Toliau
                  </button>
                </motion.div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── prakeiksmo aktyvacijos overlay ── */}
      <AnimatePresence>
        {curseShow && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[131] flex items-center justify-center pointer-events-none"
            style={{ background: 'radial-gradient(circle, rgba(80,20,120,0.35), rgba(0,0,0,0.7))' }}>
            <motion.div
              initial={{ scale: 0.4, rotate: -8, opacity: 0 }}
              animate={{ scale: 1, rotate: 0, opacity: 1 }}
              transition={{ type: 'spring', damping: 14 }}
              className="rounded-2xl p-5 text-center w-[min(320px,88vw)]"
              style={{ background: 'linear-gradient(145deg, #241430, #130a1c)', border: '2px solid rgba(168,85,247,0.7)', boxShadow: '0 0 40px rgba(168,85,247,0.5)' }}>
              <p className="text-3xl mb-1">🕸</p>
              {curseShow.image && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={curseShow.image} alt={curseShow.name} className="mx-auto mb-2 rounded-lg" style={{ width: 100 }} />
              )}
              <p className="text-sm font-bold mb-1" style={{ fontFamily: 'var(--rvn-font-display)', color: '#c4b5fd' }}>
                Prakeiksmas: {curseShow.name}
              </p>
              <p className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>{curseShow.msg}</p>
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
