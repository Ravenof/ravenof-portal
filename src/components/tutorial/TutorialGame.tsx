'use client'

// ── TutorialGame — „Išmokyk mane žaisti" ──────────────────────────────────────
// Pilnas mokomasis mūšis prieš AI: kovos laukas su zonomis, auksas, HP,
// žetonai, ŽMK, pop-up scenarijus ir dark fantasy ambient muzika.
// Varikliukas: src/lib/tutorial/engine.ts, AI: ai.ts, scenarijus: script.ts.

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
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
  parseEffect, detectKeywords, mapCardType, effectiveAtk, projectileForCard, type TutCardType,
  effectiveCost, auraSpellDamageBonus,
  STATUS_META, TutStatus, boardCreatureCap, type ZmkValue,
} from '@/lib/tutorial/engine'
import { eventText, resultText } from '@/lib/tutorial/logText'
import { ensureCardTranslations, localizeTutCard } from '@/lib/cards/i18n'
import { useT } from '@/lib/i18n/react'
import { t as tGlobal } from '@/lib/i18n/core'
import { statusName, statusTooltip } from '@/lib/game/statusVfx'
import { aiNextAction } from '@/lib/tutorial/ai'
import type { AiDifficulty, AiWeightDelta } from '@/lib/tutorial/ai'
import { awardGold, PVE_REWARD, PVP_REWARD, PVE_LOSS_REWARD, PVP_LOSS_REWARD, type GoldReason } from '@/lib/economy'
import { reportMatchV2, recordRankedMatch, type MatchMode, type LevelRewardEntry } from '@/lib/economy'
import { getLevelForXp, getLevelProgress, levelReward } from '@/lib/gamification/levels'
import { reportQuestEvent } from '@/lib/gamification/quests'
import { friendRequestById } from '@/lib/social'
import { parseGameplayConfig, EFFECT_TYPES, type ZmkCardDef, type EffectMapping, type SummonEffectType, type BattleSoundType } from '@/lib/game/types'
import { mappingNeedsSelection } from '@/lib/game/effectEngine'
import { resolveTargets, resolveMappingTargets } from '@/lib/game/targetResolver'
import { playBattleSound } from '@/lib/game/soundManager'
import { publishStatusVfx, type VfxStatusId } from '@/lib/game/statusVfx'
import { RewardChip } from '@/components/digital/ui/RewardBits'
import { CardStatusVfxLayer } from '@/components/tutorial/CardStatusVfxLayer'
import { cachedBattleSkins, getEquippedBattleSkins, type SkinVisual } from '@/lib/cosmetics'
import { playCardVoice, prefetchCardVoice } from '@/lib/game/voiceManager'
import { avatarMapFor, cardVoiceUrls, loadVoices } from '@/lib/game/audioI18n'
import { getCachedVideoUrl, preloadAvatarVideos } from '@/lib/game/avatarVideoCache'
import { getCosmetics, getAvatarAudio } from '@/lib/cosmetics'
import { setAvatarAudioMap, resetAvatarAudio, playAvatarAudio, stopAvatarAudio } from '@/lib/game/avatarAudio'
import { startBattleMusic, startMenuMusic } from '@/lib/game/musicManager'
import { isSummonFxEnabled } from '@/lib/settings'
import { SummonBurst, SUMMON_SHAKE } from './SummonBurst'
import { RavenofCinematicOverlay } from './RavenofCinematicOverlay'
import { useCinematicQueue } from '@/lib/game/cinematicQueue'
import { collectDeckCinematicPosters, preloadCinematicPosters, collectDeckCinematicVideos, preloadCinematicVideos, type CinematicCardInput } from '@/lib/game/cinematics'
import { ArenaBackground, randomArena, type ArenaKey } from './ArenaBackground'
import { BattleFxLayer, type BattleFxHandle, type AoeVariant } from './BattleFxLayer'
import BattleLayout from './BattleLayout'
import { factionPalette, PROJECTILE_COLOR, factionDirectionalKind } from '@/lib/game/effectAnimations'
import { GUIDED_STEPS, MECHANIC_TIPS, TutStep, TipKey } from '@/lib/tutorial/script'
import { lockLandscape, unlockOrientation, isPortraitNow } from '@/lib/digital/native'

export type PvPNet = { isHost: boolean; mySide: Side; matchId: string; opponentId?: string; resume?: boolean }
const PVP_ACTIVE_KEY = 'rvn-pvp-active'
const pvpStateKey = (id: string) => 'rvn-pvp-state-' + id
type RankedResultPayload = { result: 'win' | 'loss'; turns: number; stats: import('@/lib/ranked/types').PlayerMatchStats }
// Campaign mode: lightweight battle result reported to the campaign runtime (zero-coupling).
export type CampaignBattleResult = { result: 'win' | 'lose'; turns: number; stats: { spellsPlayed: number; creaturesKilled: number; championsKilled: number; hpRemaining: number; hpLowest: number } }
// ── Tutorial v2 director hooks (žr. src/components/tutorial2) ──
export type TutorialHooks = {
  active: boolean
  applySetup?: (g: GameState) => void                     // perrašo ką tik sukurtą žaidimą (rankos/kaladės/lenta)
  gate?: (a: NetAction, g: GameState) => { ok: boolean; hint?: string }  // gate'ina žaidėjo veiksmus
  enemyTurn?: (g: GameState) => void                      // vykdo scripted priešo veiksmus (po 1 per tiką)
  onEvents?: (fresh: GameEvent[], g: GameState) => void   // praneša director'iui apie naujus įvykius
}

type Props = { deckId: string; deckName: string; onClose: () => void; ranked?: boolean; onRankedResult?: (r: RankedResultPayload) => void; practice?: boolean; opponentDeckId?: string | null; opponentStarterId?: string | null; opponentFaction?: number | null; opponentName?: string; difficulty?: AiDifficulty; net?: PvPNet; aiStrategy?: AiWeightDelta; onCampaignResult?: (r: CampaignBattleResult) => void; tutorial?: TutorialHooks }

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
    rarity: { name?: string | null; color_hex: string | null } | null
    faction: { id?: number | null; name?: string | null; color_hex: string | null } | null
    card_keywords: { keyword: { name: string } | null }[] | null
  } | null
}

const ZMK_IMG: Record<string, string> = {
  '+0': '/rules/zmk/card-plus0-sm.webp', '+1': '/rules/zmk/card-plus1-sm.webp', '-1': '/rules/zmk/card-minus1-sm.webp',
  '+2': '/rules/zmk/card-plus2-sm.webp', '-2': '/rules/zmk/card-minus2-sm.webp',
  'x2': '/rules/zmk/card-x2-sm.webp', 'x0': '/rules/zmk/card-x0-sm.webp',
}
/** ŽMK kortos nuotrauka: admin zmk_cards.image_url > taisyklių numatytoji. */
export function zmkImg(g: GameState | null, v: string): string | null {
  return g?.zmkDefs?.[v]?.image_url || ZMK_IMG[v] || null
}

function mapDbCard(c: NonNullable<DbRow['card']>): Omit<TutCard, 'uid'> {
  const kwNames = (c.card_keywords ?? []).map((k) => k.keyword?.name ?? '').filter(Boolean)
  const text = [c.effect_text, c.description].filter(Boolean).join(' ')   // LT – variklio parseriui
  const gameplay = parseGameplayConfig(c.gameplay)
  return localizeTutCard({
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
    rarityName: c.rarity?.name ?? null,
    factionColor: c.faction?.color_hex ?? '#d4af37',
    factionId: c.faction?.id ?? null,
    factionName: c.faction?.name ?? null,
    effect: parseEffect(text),
    gameplay,
    // Admin mapping > legacy teksto parseris (mappings tušti = legacy kelias)
    mappings: gameplay?.virtualEnabled === false ? [] : gameplay?.effectMappings ?? [],
    needsMapping: !gameplay?.effectMappings?.length && !!text,
  })
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
  frozen: '#38bdf8', burning: '#fb923c', poisoned: '#84cc16', stunned: '#facc15', silenced: '#a78bfa', blessed: '#fcd34d',
}
const RAIL_PANEL = { background: 'rgba(13,10,20,0.66)', border: '1px solid rgba(240,180,41,0.22)', boxShadow: 'inset 0 0 30px rgba(0,0,0,0.5)' }
const ICON_BASE = '/icons/status/'
const STATUS_ICON: Record<TutStatus, string> = {
  frozen: 'frozen', burning: 'burning', poisoned: 'poison', stunned: 'stunned', silenced: 'silenced', blessed: 'light',
}

const CARD_BACK_SRC: Record<'plain' | 'curse' | 'zmk', string> = {
  plain: '/card-backs/back.webp', curse: '/card-backs/curse.webp', zmk: '/card-backs/zmk.webp',
}
// Pasirinkta (equipped) kortų nugarėlė — nustatoma TutorialGame mount'e; 'plain'
// nugarėlės rodo ją vietoj default back.webp. PvP: varžovo elementai (owner='opp')
// rodo JO nugarėlę, gautą per broadcast 'skin' (senas klientas — tyliai ignoruoja).
let EQUIPPED_BACK: SkinVisual | null = null
let OPP_BACK: SkinVisual | null = null
/** Log raktai, reiškiantys „iškviesta efektu" (ne iš rankos) – kino/FX atrankai. */
const SUMMON_BY_EFFECT_KEYS = new Set([
  'battleLog.summonByEffect', 'battleLog.summonChosen', 'battleLog.raiseFromGrave', 'battleLog.curseRaise',
])

let OPP_BACK_KNOWN = false  // ar varžovas ATSIUNTĖ savo skin (skiriamas „nežinoma" nuo „neturi")
export function setEquippedBack(v: SkinVisual | null) { EQUIPPED_BACK = v }
export function setOppBack(v: SkinVisual | null, known = false) { OPP_BACK = v; OPP_BACK_KNOWN = known }
export function PileBack({ kind, owner = 'me' }: { kind: 'plain' | 'curse' | 'zmk'; owner?: 'me' | 'opp' }) {
  const [ok, setOk] = useState(false)
  const [customFailed, setCustomFailed] = useState(false)
  // opp: žinomas skin (arba žinomas „neturi" -> default); nežinoma (botai/senas klientas) -> tavo skin
  const skin = owner === 'me' ? EQUIPPED_BACK : (OPP_BACK_KNOWN ? OPP_BACK : EQUIPPED_BACK)
  const custom = kind === 'plain' && !customFailed ? skin : null
  // css-only nugarėlė (gradientas) — be <img>
  if (custom && !custom.url && custom.css) {
    return <div aria-hidden style={{ position: 'absolute', inset: 0, background: custom.css }} />
  }
  const src = custom?.url ?? CARD_BACK_SRC[kind]
  return <img src={src} alt="" draggable={false} onLoad={() => setOk(true)}
    onError={() => { if (custom?.url) { setCustomFailed(true); setOk(false) } else setOk(false) }}
    style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: ok ? 1 : 0, transition: 'opacity .2s' }} />
}

// ── Varžovo rankos vėduoklė (kortų nugarėlės; lenkiasi link žvilgsnio – card-back kosmetikai) ─
function OppHandFan({ count, big }: { count: number; big?: boolean }) {
  const [tilt, setTilt] = useState({ x: 0, y: 0 })
  useEffect(() => {
    let raf = 0
    const onMove = (e: PointerEvent) => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const nx = Math.max(-1, Math.min(1, (e.clientX / Math.max(1, window.innerWidth)) * 2 - 1))
        const ny = Math.max(-1, Math.min(1, (e.clientY / Math.max(1, window.innerHeight)) * 2 - 1))
        setTilt((t) => (Math.abs(t.x - nx) < 0.03 && Math.abs(t.y - ny) < 0.03 ? t : { x: nx, y: ny }))
      })
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    return () => { window.removeEventListener('pointermove', onMove); cancelAnimationFrame(raf) }
  }, [])
  const pw = big ? 44 : 30
  const ph = Math.round(pw * 4 / 3)
  const step = Math.round(pw * 0.42)
  const n = Math.min(count, 6)
  if (count <= 0) {
    return (
      <div data-pile="hand-ai" className="flex flex-col items-center gap-0.5">
        <div style={{ width: pw, height: ph, opacity: 0.4, border: '1px solid rgba(240,180,41,0.3)', borderRadius: 6 }} />
        <span className="text-[8px] uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Ranka</span>
      </div>
    )
  }
  const mid = (n - 1) / 2
  return (
    <div data-pile="hand-ai" className="flex flex-col items-center gap-0.5">
      <div className="relative" style={{ width: pw + (n - 1) * step, height: ph + 10, perspective: 520 }}>
        {Array.from({ length: n }).map((_, i) => {
          const off = i - mid
          const rot = off * 9 + tilt.x * 9
          const tx = off * step
          const ty = Math.abs(off) * 3 - tilt.y * 3
          return (
            <div key={i} className="absolute rounded-md overflow-hidden" style={{ left: '50%', top: 2, width: pw, height: ph, border: '1px solid rgba(240,180,41,0.35)', background: '#0d0a14', transform: `translateX(-50%) translateX(${tx}px) translateY(${ty}px) rotate(${rot}deg)`, transformOrigin: 'bottom center', transition: 'transform 0.18s ease-out', boxShadow: '0 2px 7px rgba(0,0,0,0.55)' }}>
              <PileBack kind="plain" owner="opp" />
            </div>
          )
        })}
        <span className="absolute -bottom-1 right-0 px-1 rounded text-[10px] font-bold" style={{ color: 'var(--gold)', background: 'rgba(0,0,0,0.8)' }}>{count}</span>
      </div>
      <span className="text-[8px] uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Ranka</span>
    </div>
  )
}

// ── ŽMK pranašumo/nepalankumo traukimas: 2 kortos, nepanaudota subyra į gabalus ──
const zmkCol = (v: string) => (v.startsWith('+') && v !== '+0') ? '#4ade80' : v.startsWith('-') ? '#f87171' : '#f0b429'
function ZmkRollCard({ v, game }: { v: ZmkValue; game: GameState | null }) {
  const img = zmkImg(game, v)
  const c = zmkCol(v)
  return (
    <div className="relative rounded-xl overflow-hidden flex items-center justify-center" style={{ width: 'min(94px,24vw)', aspectRatio: '2.5 / 3.5', border: `2px solid ${c}`, background: '#14101e', boxShadow: `0 0 22px ${c}66` }}>
      {img ? <img src={img} alt={`ŽMK ${v}`} draggable={false} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
        : <span className="font-black text-2xl" style={{ color: c, fontFamily: 'var(--rvn-font-display)' }}>{v.replace('x', '×')}</span>}
    </div>
  )
}
function ZmkRoll({ roll, game }: { roll: { side: Side; a: ZmkValue; b: ZmkValue; picked: ZmkValue; adv: boolean }; game: GameState | null }) {
  const { a, b, picked, adv, side } = roll
  const broken: ZmkValue = picked === a ? b : a
  const bc = zmkCol(broken)
  return (
    <div className="flex flex-col items-center gap-3">
      <span className="px-3 py-1 rounded-full text-xs font-bold" style={{ background: 'rgba(8,6,12,0.92)', border: `1px solid ${adv ? '#4ade80' : '#f87171'}`, color: adv ? '#4ade80' : '#f87171', fontFamily: 'var(--rvn-font-display)', letterSpacing: '0.06em' }}>
        {side === 'you' ? tGlobal('battle.game.yourZmk') : tGlobal('battle.game.enemyZmk')} · {adv ? tGlobal('battle.game.favorable') : tGlobal('battle.game.unfavorable')}
      </span>
      <div className="flex items-center gap-5">
        {/* Panaudota – lieka, padidėja, švyti */}
        <motion.div initial={{ scale: 0.4, rotateY: 90, opacity: 0 }} animate={{ scale: [0.4, 1, 1.14, 1.1], rotateY: 0, opacity: [0, 1, 1, 1] }} transition={{ duration: 0.7, times: [0, 0.5, 0.8, 1] }} style={{ transformStyle: 'preserve-3d' }}>
          <ZmkRollCard v={picked} game={game} />
          <div className="text-center text-[10px] font-bold mt-1" style={{ color: zmkCol(picked) }}>✓ panaudota</div>
        </motion.div>
        {/* Nepanaudota – subyra į gabalus */}
        <div className="relative">
          <motion.div initial={{ scale: 0.4, rotateY: -90, opacity: 0 }} animate={{ scale: [0.4, 1, 1, 0.15], opacity: [0, 1, 1, 0], rotate: [0, 0, -7, 12] }} transition={{ duration: 1.0, times: [0, 0.35, 0.55, 1], ease: 'easeIn' }}>
            <ZmkRollCard v={broken} game={game} />
          </motion.div>
          {Array.from({ length: 9 }).map((_, i) => {
            const ang = (i / 9) * Math.PI * 2
            const dist = 60 + (i % 3) * 24
            return (
              <motion.div key={i} className="absolute left-1/2 top-1/2" style={{ width: 9, height: 13, background: bc, borderRadius: 2, boxShadow: `0 0 6px ${bc}` }}
                initial={{ x: -4, y: -6, opacity: 0, scale: 0.5 }}
                animate={{ x: Math.cos(ang) * dist, y: Math.sin(ang) * dist, opacity: [0, 1, 0], rotate: ang * 60, scale: [0.5, 1, 0.3] }}
                transition={{ duration: 0.75, delay: 0.55, ease: 'easeOut' }} />
            )
          })}
        </div>
      </div>
    </div>
  )
}

export function HpVial({ hp, maxHp, scale = 1 }: { hp: number; maxHp: number; scale?: number }) {
  const ratio = Math.max(0, Math.min(1, hp / Math.max(1, maxHp)))
  const hue = ratio * 120
  const top = `hsl(${hue},88%,58%)`, bot = `hsl(${hue},86%,36%)`
  const crit = hp > 0 && hp <= 10
  const clip = "path('M18 2 L18 15 C 9 18, 4 27, 5 39 C 6 51, 13 57, 23 57 C 33 57, 40 51, 41 39 C 42 27, 37 18, 28 15 L 28 2 C 28 0.6 27 0 23 0 C 19 0 18 0.6 18 2 Z')"
  const inner = (
    <span style={{ position: 'relative', display: 'inline-block', width: 46, height: 60, flex: '0 0 auto',
      filter: crit ? 'drop-shadow(0 0 7px rgba(239,68,68,0.85))' : `drop-shadow(0 0 5px ${top}55) drop-shadow(0 2px 3px rgba(0,0,0,0.5))` }}>
      <span className="hpv2" style={{ clipPath: clip, WebkitClipPath: clip }}>
        <span className="hpv2-liquid" style={{ height: `${Math.max(2, ratio * 100)}%`, background: `linear-gradient(180deg, ${top}, ${bot})` }}>
          <span className="hpv2-wave" style={{ background: top }} />
          <span className="hpv2-wave hpv2-wave2" style={{ background: bot }} />
          {[0, 1, 2].map((i) => <span key={i} className="hpv2-bub" style={{ left: `${28 + i * 20}%`, animationDelay: `${i * 1.1}s`, animationDuration: `${3 + i}s` }} />)}
        </span>
        <span className="hpv2-glass" />
        <span className="hpv2-shine" />
      </span>
      <span style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: 13, height: 6, borderRadius: '3px 3px 1px 1px', background: 'linear-gradient(180deg,#9a6a3a,#5a3a1c)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.3), 0 1px 2px rgba(0,0,0,0.5)' }} />
      <span style={{ position: 'absolute', top: 31, left: '50%', transform: 'translateX(-50%)', minWidth: 30, height: 17, padding: '0 5px', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'linear-gradient(180deg,#2c2218,#14100a)', borderRadius: 3, borderTop: '1px solid rgba(212,175,55,0.35)', borderBottom: '1px solid rgba(0,0,0,0.7)', borderLeft: '1px solid rgba(0,0,0,0.4)', borderRight: '1px solid rgba(0,0,0,0.4)',
        boxShadow: '0 1px 3px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.06)' }}>
        <span style={{ fontFamily: 'var(--rvn-font-display)', fontWeight: 800, fontSize: hp >= 100 ? 10 : 13, lineHeight: 1, color: crit ? '#ff6b6b' : '#e8c84a', textShadow: '0 1px 1px rgba(0,0,0,0.9)' }}>{Math.max(0, hp)}</span>
      </span>
    </span>
  )
  if (scale === 1) return inner
  return <span style={{ display: 'inline-block', width: 46 * scale, height: 60 * scale, flex: '0 0 auto' }}><span style={{ display: 'inline-block', transformOrigin: 'top left', transform: `scale(${scale})` }}>{inner}</span></span>
}

export type BattleAvatar = { id: string; name: string; imageUrl: string | null; emoji: string | null; videos?: string[]; fit?: { x: number; y: number; zoom: number } | null }

/** Avatar – mūšio HP taikinys: kvadratinis ornate rėmas (frame.png), portretas/idle-video centre, HP ant skydo. */
export function AvatarFrame({ avatar, hp, maxHp, owner, scale = 1, flash, onVid, dead = false }: {
  avatar: BattleAvatar | null
  hp: number; maxHp: number
  owner: 'player' | 'enemy'
  scale?: number
  flash?: 'hit' | 'heal' | null
  onVid?: (v: string | null) => void
  /** Pralaimėjimo seka: portretas sprogsta ir subyra į šukes (žr. 'win' log įvykį). */
  dead?: boolean
}) {
  const size = Math.round(122 * scale)
  const glow = owner === 'player' ? 'rgba(74,222,128,0.4)' : 'rgba(239,68,68,0.4)'
  const crit = hp > 0 && hp <= maxHp * 0.25
  const videos = avatar?.videos ?? []
  const [vid, setVid] = useState<string | null>(null)
  const [vidReady, setVidReady] = useState(false) // rodom tik nuo pirmo realaus kadro (be play placeholder'io)
  const vidTimer = useRef<number | undefined>(undefined)
  const playRandomVid = () => {
    const src = videos[Math.floor(Math.random() * videos.length)]
    // grojam iš lokalaus blob cache — pasileidžia akimirksniu, be tinklo
    void getCachedVideoUrl(src).then((local) => { setVidReady(false); setVid(local) })
  }
  useEffect(() => {
    setVid(null); setVidReady(false); onVid?.(null)
    if (vidTimer.current) window.clearTimeout(vidTimer.current)
    if (!videos.length) return
    preloadAvatarVideos(videos) // parsiunčiam į Cache Storage mūšio pradžioje
    let alive = true
    vidTimer.current = window.setTimeout(() => { if (alive) playRandomVid() }, 10000 + Math.random() * 20000)
    return () => { alive = false; if (vidTimer.current) window.clearTimeout(vidTimer.current) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [avatar?.id, videos.length])
  const onVidEnd = () => {
    onVid?.(null); setVid(null); setVidReady(false)
    vidTimer.current = window.setTimeout(() => { if (videos.length) playRandomVid() }, 10000 + Math.random() * 20000)
  }
  // watchdog: jei video per 2 s nepradeda groti (pvz., HEVC kodekas, kurio WebView nedekoduoja) — atsisakom be jokių ikonų
  useEffect(() => {
    if (!vid || vidReady) return
    const t = window.setTimeout(() => { if (!vidReady) onVidEnd() }, 2000)
    return () => window.clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vid, vidReady])
  // Vidinio lango įdubos (iš frame.png analizės)
  const win = { top: '24.5%', left: '24.5%', right: '24%', bottom: '29%' }
  const fit = avatar?.fit ?? { x: 50, y: 50, zoom: 100 }
  const fitStyle: React.CSSProperties = { width: '100%', height: '100%', objectFit: 'cover', objectPosition: `${fit.x}% ${fit.y}%`, transform: `scale(${Math.max(1, fit.zoom / 100)})`, transformOrigin: 'center' }
  return (
    <motion.div
      animate={dead ? { x: [0, -7, 7, -5, 5, -2, 0] } : flash === 'hit' ? { x: [0, -3, 3, -2, 2, 0] } : flash === 'heal' ? { scale: [1, 1.05, 1] } : {}}
      transition={{ duration: dead ? 0.55 : 0.34 }}
      className="relative pointer-events-none"
      style={{ width: size, height: size, filter: dead ? 'none' : `drop-shadow(0 0 14px ${glow})` }}>
      {/* portretas / idle-video (po rėmu); žuvus — viskas subyra, lieka tuščia vieta */}
      {!dead && (
        <div className="absolute overflow-hidden" style={{ ...win, borderRadius: 4, background: '#0a0810' }}>
          {/* portretas visada apačioje — video uždengia TIK kai jau realiai groja (seamless) */}
          {avatar?.imageUrl
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={avatar.imageUrl} alt={avatar.name} draggable={false} style={fitStyle} />
            : <span className="w-full h-full flex items-center justify-center" style={{ fontSize: Math.round(size * 0.22) }}>{avatar?.emoji ?? '\u{1F70F}'}</span>}
          {vid && (
            <video key={vid} src={vid} muted playsInline preload="auto" autoPlay
              poster={avatar?.imageUrl ?? undefined} controls={false} disablePictureInPicture
              ref={(v) => { if (v && v.paused) { void v.play().catch(() => { /* blokuota – liks portretas */ }) } }}
              onPlaying={() => { setVidReady(true); onVid?.(vid) }}
              onEnded={onVidEnd}
              onError={onVidEnd}
              className="absolute inset-0"
              style={{ ...fitStyle, opacity: vidReady ? 1 : 0, transition: 'opacity 0.18s ease' }} />
          )}
          {flash && <div className="absolute inset-0" style={{ background: flash === 'hit' ? 'rgba(239,68,68,0.5)' : 'rgba(34,197,94,0.45)', mixBlendMode: 'screen' }} />}
        </div>
      )}
      {/* ── PRALAIMĖJIMAS: VISAS avataras (rėmas + portretas) sprogsta į 16 šukių ──
          Kiekviena šukė – pilnos kompozicijos (portretas + frame.png) iškarpa, tad
          atrodo, kad subyra visas rėmas. Po animacijos vieta lieka TUŠČIA. */}
      {dead && (
        <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 6, overflow: 'visible' }}>
          {/* didysis blyksnis */}
          <motion.div className="absolute rounded-full" style={{ inset: '-60%', background: 'radial-gradient(circle, rgba(255,236,180,0.98) 0%, rgba(255,150,50,0.85) 30%, rgba(200,60,20,0.4) 55%, transparent 72%)' }}
            initial={{ opacity: 0, scale: 0.25 }} animate={{ opacity: [0, 1, 0], scale: [0.25, 1.5, 1.9] }} transition={{ duration: 0.75, ease: 'easeOut' }} />
          {/* smūginė banga */}
          <motion.div className="absolute rounded-full" style={{ left: '50%', top: '50%', width: 12, height: 12, marginLeft: -6, marginTop: -6, border: '3px solid rgba(255,200,110,0.95)', boxShadow: '0 0 26px rgba(255,140,40,0.9), inset 0 0 12px rgba(255,180,80,0.7)' }}
            initial={{ scale: 0.3, opacity: 1 }} animate={{ scale: size * 0.22, opacity: 0 }} transition={{ duration: 0.9, ease: 'easeOut' }} />
          {/* 16 šukių (4×4) — rėmas + portretas kartu */}
          {Array.from({ length: 16 }).map((_, i) => {
            const c = i % 4, r = Math.floor(i / 4)
            const sx = Math.sin(i * 12.9898), sy = Math.cos(i * 78.233)
            const spread = size * (1.3 + 0.6 * Math.abs(Math.sin(i * 4.7)))
            const dx = (c - 1.5) / 1.5 * spread + sx * size * 0.22
            const dy = (r - 1.5) / 1.5 * spread + sy * size * 0.18 + size * 0.45  // gravitacija žemyn
            const rot = (sx + sy) * 340 + (i % 2 ? 120 : -120)
            const delay = 0.04 + Math.abs(Math.sin(i * 9.1)) * 0.14
            return (
              <motion.div key={i} className="absolute overflow-hidden" style={{ left: `${c * 25}%`, top: `${r * 25}%`, width: '25%', height: '25%', filter: 'drop-shadow(0 0 7px rgba(255,140,50,0.9))' }}
                initial={{ x: 0, y: 0, opacity: 1, rotate: 0, scale: 1 }}
                animate={{ x: dx, y: dy, opacity: [1, 1, 0.85, 0], rotate: rot, scale: [1, 1.02, 0.75, 0.3] }}
                transition={{ duration: 1.35, delay, ease: [0.16, 0.6, 0.45, 1] }}>
                {/* pilnos kompozicijos kopija, paslinkta taip, kad šukė rodytų savo iškarpą */}
                <div className="absolute" style={{ width: '400%', height: '400%', left: `${-c * 100}%`, top: `${-r * 100}%` }}>
                  <div className="absolute overflow-hidden" style={{ ...win, borderRadius: 4, background: '#0a0810' }}>
                    {avatar?.imageUrl
                      // eslint-disable-next-line @next/next/no-img-element
                      ? <img src={avatar.imageUrl} alt="" draggable={false} style={fitStyle} />
                      : <span className="w-full h-full flex items-center justify-center" style={{ fontSize: Math.round(size * 0.22) }}>{avatar?.emoji ?? '\u{1F70F}'}</span>}
                  </div>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/icons/frame.png" alt="" draggable={false} className="absolute inset-0 w-full h-full select-none" />
                </div>
              </motion.div>
            )
          })}
          {/* žiežirbos */}
          {Array.from({ length: 14 }).map((_, i) => {
            const ang = (i / 14) * Math.PI * 2 + Math.sin(i * 3.3) * 0.5
            const dist = size * (1.1 + 0.8 * Math.abs(Math.cos(i * 5.9)))
            const s = 3 + (i % 3) * 2
            return (
              <motion.span key={'e' + i} className="absolute rounded-full" style={{ left: '50%', top: '50%', width: s, height: s, background: i % 3 === 0 ? '#ffe9a8' : '#ff9a3d', boxShadow: '0 0 8px rgba(255,150,50,0.95)' }}
                initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                animate={{ x: Math.cos(ang) * dist, y: Math.sin(ang) * dist + size * 0.3, opacity: [1, 1, 0], scale: [1, 0.8, 0.2] }}
                transition={{ duration: 0.85 + (i % 4) * 0.12, delay: 0.02, ease: 'easeOut' }} />
            )
          })}
        </div>
      )}
      {/* ornate rėmas (žuvus — subyrėjęs, nebe rodomas) */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {!dead && <img src="/icons/frame.png" alt="" className="absolute inset-0 w-full h-full select-none" draggable={false} />}
      {/* HP ant apatinio skydo */}
      {!dead && (
        <span className="absolute" style={{ left: '50%', bottom: '9%', transform: 'translateX(-50%)',
          fontFamily: 'var(--rvn-font-display)', fontWeight: 800, fontSize: Math.round(size * 0.155), lineHeight: 1,
          color: crit ? '#ff6b6b' : '#e8c84a', textShadow: '0 1px 2px rgba(0,0,0,0.95), 0 0 6px rgba(0,0,0,0.7)' }}>{Math.max(0, hp)}</span>
      )}
    </motion.div>
  )
}

/** Burtų žalos priedas rankoje (tik žalą darantiems burtams; pasyvi aura). */
function spellDmgBonusFor(game: GameState, c: TutCard): number {
  if (c.type !== 'spell') return 0
  const deals = (c.mappings ?? []).some((m) => m.effect === 'damage' || m.effect === 'burn') || !!c.effect?.damage
  if (!deals) return 0
  return auraSpellDamageBonus(game, 'you', c.gameplay?.spellType)
}

export function MiniCard({ c, w, dim, faceDown, readable, costNow, dmgBonus }: { c: TutCard; w: number; dim?: boolean; faceDown?: boolean; readable?: boolean; costNow?: number; dmgBonus?: number }) {
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
        {(() => {
          const cheaper = costNow != null && costNow < c.gold
          const pricier = costNow != null && costNow > c.gold
          const shown = costNow ?? c.gold
          const cc = cheaper ? '#4ade80' : pricier ? '#fbbf24' : 'var(--gold)'
          return <span className="absolute top-0.5 left-0.5 rounded-full font-bold" style={{ background: 'rgba(0,0,0,0.85)', color: cc, fontSize: badge, padding: '0 ' + Math.round(badge * 0.4) + 'px', boxShadow: cheaper ? '0 0 6px rgba(74,222,128,0.7)' : undefined }}>{shown}</span>
        })()}
        {dmgBonus != null && dmgBonus > 0 && (
          <span className="absolute top-0.5 right-0.5 rounded font-bold" title={tGlobal('battle.game.spellDamageBonusTip')}
            style={{ background: 'rgba(0,0,0,0.85)', color: '#fb923c', fontSize: badge, padding: '0 ' + Math.round(badge * 0.35) + 'px', boxShadow: '0 0 6px rgba(251,146,60,0.7)' }}>+{dmgBonus}</span>
        )}
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

export function UnitTile({ g, u, w, selected, targetable, picked, canAct, dimmed, onClick, hpShown }: {
  g: GameState; u: BoardUnit; w: number
  selected?: boolean; targetable?: boolean; picked?: boolean; canAct?: boolean; dimmed?: boolean
  onClick?: () => void; hpShown?: number
}) {
  const h = Math.round(w * 4 / 3)
  const hpDisp = hpShown ?? u.hp
  const atk = effectiveAtk(g, u)
  const ring = picked ? '#22c55e' : selected ? '#f0b429' : targetable ? '#ef4444' : canAct ? 'rgba(74,222,128,0.7)' : 'transparent'
  const activeStatuses = Object.keys(u.statuses) as TutStatus[]
  const sGlow = activeStatuses.length ? STATUS_GLOW[activeStatuses[0]] : null
  // Status VFX idle sąrašas (statusai + kortos flag'ai)
  const vfxActive: VfxStatusId[] = [
    ...activeStatuses,
    ...(u.shield ? ['shield' as const] : []),
    ...(u.stealth ? ['stealth' as const] : []),
    ...(u.control ? ['control' as const] : []),
    ...(!u.statuses.silenced && (u.card.keywords.includes('taunt') || !!u.auraKw?.includes('taunt')) ? ['taunt' as const] : []),
  ]
  // Ikonų sąrašas (vieninga eilė; >4 sutraukiama)
  const tokenList: { title: string; node: React.ReactNode }[] = [
    ...(u.control ? [{ title: statusName('control'), node: <Token key="ctl" title={u.control.kind === 'endOfTurn' ? tGlobal('battle.game.controlEndOfTurn') : tGlobal('battle.game.controlUntilNextTurn')} color="#e879f9">🧠</Token> }] : []),
    ...(u.shield ? [{ title: statusName('shield'), node: <Token key="sh" title={statusTooltip('shield')} color="#fcd34d" icon={ICON_BASE + 'shield_magic.webp'}>✦★</Token> }] : []),
    ...(u.stealth ? [{ title: statusName('stealth'), node: <Token key="st" title={statusTooltip('stealth')} color="#a78bfa" icon={ICON_BASE + 'stealth.webp'}>◑</Token> }] : []),
    ...((!u.statuses.silenced && u.card.keywords.includes('taunt')) ? [{ title: statusName('taunt'), node: <Token key="tn" title={statusTooltip('taunt')} color="#c9882f" icon={ICON_BASE + 'taunt.webp'}>⊙</Token> }] : []),
    ...((!u.statuses.silenced && (u.card.keywords.includes('sprint') || !!u.auraKw?.includes('sprint')) && u.summonedOnTurn === g.globalTurn) ? [{ title: statusName('sprint'), node: <Token key="sp" title={statusTooltip('sprint')} color="#5fae6a" icon={ICON_BASE + 'sprint.webp'}>»</Token> }] : []),
    ...activeStatuses.map((st) => ({ title: statusName(st), node: <Token key={st} title={statusTooltip(st)} color={STATUS_GLOW[st]} icon={ICON_BASE + STATUS_ICON[st] + '.webp'}>{STATUS_META[st].icon}</Token> })),
  ]
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
      {picked && (
        <span className="absolute -top-2 -right-2 z-30 flex items-center justify-center rounded-full pointer-events-none"
          style={{ width: 22, height: 22, background: '#16a34a', border: '2px solid #bbf7d0', boxShadow: '0 0 10px rgba(34,197,94,0.9)', color: '#fff', fontSize: 13, fontWeight: 900 }}>✓</span>
      )}
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
          <motion.span key={hpDisp} initial={{ scale: 1.55 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 600, damping: 17 }}
            className="px-1 rounded text-[10px] font-bold"
            style={{ display: 'inline-block', background: 'rgba(0,0,0,0.85)', color: hpDisp < u.maxHp ? '#fbbf24' : '#4ade80' }}>{hpDisp}</motion.span>
        </div>
      </div>
      {/* ── Status VFX sluoksnis (idle + one-shot; inkaruota prie kortos) ── */}
      <CardStatusVfxLayer uid={u.uid} active={vfxActive} />
      {/* žetonai: būsenos + skydas + sėlinimas + pasišaipymas (>4 → +N su bendru tooltip) */}
      <div className="absolute -top-2 inset-x-0 flex justify-center gap-0.5 pointer-events-none flex-wrap" style={{ zIndex: 30 }}>
        {tokenList.slice(0, 4).map((tk) => tk.node)}
        {tokenList.length > 4 && (
          <Token title={tokenList.slice(4).map((tk) => tk.title).join(' · ')} color="#f0b429">+{tokenList.length - 4}</Token>
        )}
      </div>
    </motion.button>
  )
}

export function Token({ children, title, color, icon }: { children: React.ReactNode; title: string; color?: string; icon?: string }) {
  if (icon) {
    return (
      <span title={title} className="inline-flex items-center justify-center" style={{ width: 20, height: 20, filter: color ? `drop-shadow(0 0 4px ${color}cc)` : 'drop-shadow(0 1px 2px rgba(0,0,0,0.7))' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={icon} alt={title} draggable={false} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
      </span>
    )
  }
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
  | { kind: 'battlecry'; uid: string }
  | { kind: 'spell'; uid: string; picked?: TargetRef | null }
  | { kind: 'sacrifice'; cardUid: string; picked: string[] }
  | { kind: 'discard' }
  | { kind: 'spellMulti'; uid: string; need: number; picked: TargetRef[] }
  | { kind: 'lastwish'; need: number; picked: TargetRef[] }
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
  for (const t of resolveMappingTargets(game, side, m)) {
    if (t.kind === 'field') continue
    if (t.kind === 'unit' && t.side === 'ai') { const u = game.ai.units.find((x) => x?.uid === t.uid); if (u?.stealth) continue }
    out.push(t as TargetRef)
  }
  return out
}

/** Unikalus TargetRef raktas (palyginimui/pažymėjimui). */
function targetRefKey(t: TargetRef): string {
  return t.kind + ':' + ('uid' in t ? t.uid : t.side)
}

// ── Drag & drop (Hearthstone tipo) ───────────────────────────────────────────
type DragState = { card: TutCard; uid: string; targeted: boolean; origin: { x: number; y: number }; x: number; y: number; mode: 'card' | 'arrow'; attackUid?: string }

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

// ── Messenger stiliaus „chat head" PvP kovai — tampomas burbulas + atsakymo langas ─
type ChatMsg = { mine: boolean; text: string }
function BattleChatHead({ chatLog, chatInput, setChatInput, sendBattleChat, open, setOpen }: {
  chatLog: ChatMsg[]; chatInput: string; setChatInput: (v: string) => void; sendBattleChat: () => void
  open: boolean; setOpen: (v: boolean) => void
}) {
  const t = useT()
  const [pos, setPos] = useState<{ x: number; y: number }>({ x: 12, y: 320 })
  const [seen, setSeen] = useState(0)
  const dragging = useRef(false)
  const moved = useRef(false)
  const startRef = useRef({ px: 0, py: 0, ox: 0, oy: 0 })

  useEffect(() => {
    if (typeof window === 'undefined') return
    setPos({ x: 12, y: window.innerHeight - 170 })
  }, [])
  useEffect(() => { if (open) setSeen(chatLog.length) }, [open, chatLog.length])

  const unread = open ? 0 : Math.max(0, chatLog.length - seen)
  const lastIncoming = [...chatLog].reverse().find((m) => !m.mine)

  const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))
  const onDown = (e: React.PointerEvent) => {
    dragging.current = true; moved.current = false
    startRef.current = { px: e.clientX, py: e.clientY, ox: pos.x, oy: pos.y }
    try { (e.target as HTMLElement).setPointerCapture(e.pointerId) } catch { /* */ }
  }
  const onMove = (e: React.PointerEvent) => {
    if (!dragging.current) return
    const dx = e.clientX - startRef.current.px, dy = e.clientY - startRef.current.py
    if (Math.abs(dx) + Math.abs(dy) > 6) moved.current = true
    const w = typeof window !== 'undefined' ? window.innerWidth : 360
    const h = typeof window !== 'undefined' ? window.innerHeight : 640
    setPos({ x: clamp(startRef.current.ox + dx, 6, w - 58), y: clamp(startRef.current.oy + dy, 50, h - 64) })
  }
  const onUp = () => { if (!dragging.current) return; dragging.current = false; if (!moved.current) setOpen(!open) }

  if (typeof document === 'undefined') return null

  return createPortal(
    <>
      {open && (
        <div className="fixed inset-0 z-[300] flex items-end justify-center" style={{ background: 'rgba(4,3,8,0.55)' }} onClick={() => setOpen(false)}>
          <div className="w-full sm:w-[min(420px,94vw)] rounded-t-2xl sm:rounded-2xl flex flex-col overflow-hidden sm:mb-6" style={{ background: 'linear-gradient(160deg,#17111f,#0a0810)', border: '1px solid rgba(240,180,41,0.35)', boxShadow: '0 -8px 40px rgba(0,0,0,0.7)', height: 'min(60vh,440px)', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-3 py-2.5 shrink-0" style={{ borderBottom: '1px solid rgba(240,180,41,0.18)' }}>
              <span className="text-[12px] font-bold" style={{ color: 'var(--gold)', fontFamily: 'var(--rvn-font-display)', letterSpacing: '0.04em' }}>{t('battle.game.chatTitle')}</span>
              <button onClick={() => setOpen(false)} className="flex items-center justify-center rounded-full" style={{ width: 28, height: 28, color: 'var(--text-muted)' }}>✕</button>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto px-2.5 py-2 space-y-1.5 flex flex-col">
              {chatLog.length === 0 && <span className="text-[11px] text-center my-auto" style={{ color: 'var(--text-muted)' }}>{t('battle.game.chatEmpty')}</span>}
              {chatLog.map((m, i) => <div key={i} className={'max-w-[82%] px-2.5 py-1.5 text-[12px] leading-snug ' + (m.mine ? 'self-end' : 'self-start')} style={{ background: m.mine ? 'rgba(240,180,41,0.2)' : 'rgba(255,255,255,0.07)', color: '#f3ead3', borderRadius: m.mine ? '12px 12px 4px 12px' : '12px 12px 12px 4px' }}>{m.text}</div>)}
            </div>
            <div className="flex gap-1.5 p-2 shrink-0" style={{ borderTop: '1px solid rgba(240,180,41,0.18)' }}>
              <input value={chatInput} onChange={(e) => setChatInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && sendBattleChat()} maxLength={200} placeholder={t('battle.game.chatPlaceholder')} className="flex-1 px-3 rounded-lg text-[13px] outline-none" style={{ minHeight: 42, background: 'rgba(10,8,16,0.9)', border: '1px solid rgba(240,180,41,0.25)', color: 'var(--text-primary)' }} />
              <button onClick={sendBattleChat} className="flex items-center justify-center rounded-lg text-[14px] font-bold" style={{ width: 42, height: 42, background: 'rgba(240,180,41,0.92)', color: '#1a0f04' }}>➤</button>
            </div>
          </div>
        </div>
      )}

      {!open && unread > 0 && lastIncoming && (
        <div className="fixed z-[210] max-w-[200px] px-3 py-1.5 text-[11px] leading-snug" style={{ left: pos.x + 52, top: pos.y + 4, background: 'rgba(17,17,31,0.97)', border: '1px solid rgba(240,180,41,0.35)', color: '#f3ead3', borderRadius: '12px 12px 12px 4px', boxShadow: '0 6px 18px rgba(0,0,0,0.5)' }}>
          {lastIncoming.text}
        </div>
      )}

      {!open && (
        <button onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp}
          className="fixed z-[211] flex items-center justify-center rounded-full text-xl select-none"
          style={{ left: pos.x, top: pos.y, width: 50, height: 50, touchAction: 'none', background: 'rgba(10,8,16,0.94)', border: '1px solid rgba(240,180,41,0.5)', boxShadow: '0 6px 20px rgba(0,0,0,0.55)' }}
          title="Pokalbis (tempk — perkelk, bakstelk — atidaryk)">
          💬
          {unread > 0 && <span className="absolute -top-1 -right-1 flex items-center justify-center text-[10px] font-bold rounded-full" style={{ minWidth: 18, height: 18, padding: '0 4px', background: '#ef4444', color: '#fff', border: '1px solid #0a0810' }}>{unread}</span>}
        </button>
      )}
    </>, document.body)
}

export function TutorialGame({ deckId, deckName, onClose, practice = false, opponentDeckId = null, opponentStarterId = null, opponentFaction = null, opponentName, difficulty = 'normal', net , ranked = false, onRankedResult, aiStrategy, onCampaignResult, tutorial }: Props) {
  const t = useT()
  const [game, setGame] = useState<GameState | null>(null)
  const isHost = !!net?.isHost

  // Kovos fono muzika (grįžus į meniu – menu tema)
  useEffect(() => {
    startBattleMusic()
    return () => { startMenuMusic() }
  }, [])
  const isGuest = !!net && !net.isHost
  const vsRemote = !!net
  const loadOpp = practice || isHost || !!opponentDeckId || !!opponentStarterId || !!opponentFaction  // priešą kraunam ir kai nurodytas opponentDeckId/Faction (pvz. tutorial guided mūšis su GUIDED_STEPS)
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [deckCards, setDeckCards] = useState<TutCard[] | null>(null)
  const [oppCards, setOppCards] = useState<TutCard[] | null>(null)
  const [zmkDefs, setZmkDefs] = useState<ZmkCardDef[] | null>(null)
  const [curseCards, setCurseCards] = useState<TutCard[]>([])
  const [extrasLoaded, setExtrasLoaded] = useState(false)
  const [stepIdx, setStepIdx] = useState((practice || !!net || tutorial?.active) ? GUIDED_STEPS.length : 0)
  const [tipQueue, setTipQueue] = useState<TipKey[]>([])
  const [select, setSelect] = useState<SelectMode>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [zmkFlash, setZmkFlash] = useState<{ placed: { v: string; side: Side; x: number; y: number }[]; n: number } | null>(null)
  const [zmkRoll, setZmkRoll] = useState<{ id: number; side: Side; a: ZmkValue; b: ZmkValue; picked: ZmkValue; adv: boolean } | null>(null)
  // ŽMK 'draw' režimas: eilė kortų, kurias žaidėjas atverčia pats
  const [zmkPending, setZmkPending] = useState<{ v: string; side: Side; revealed: boolean }[]>([])
  // Prakeiksmo aktyvacijos overlay
  const [cardFlash, setCardFlash] = useState<{ card: TutCard | null; cards?: (TutCard | null)[]; title: string; tag: string | null; color: string } | null>(null)
  // „Showcase": prieš efektą kortos miniatiūra atskrenda į centrą, padidėja iki ~40% ekrano,
  // 1 s parodoma ir dingsta (burtai iš rankos / prakeiksmai nuo kaladės / reakcijos iš zonos).
  const [showcases, setShowcases] = useState<{ id: number; card: TutCard | null; from: { x: number; y: number }; kind: 'spell' | 'curse' | 'reaction' }[]>([])
  // Paskutinio veiksmo RANKA pasirinkti keli taikiniai → FX režimas „po projektilą kiekvienam" (ne zona)
  const chosenTargetsRef = useRef<TargetRef[] | null>(null)
  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Monetos metimo animacija (žalia/raudona)
  const [coinAnim, setCoinAnim] = useState<{ side: Side; coin: 'green' | 'red' } | null>(null)
  const coinTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Pilno lauko summon efektas
  const [boardFx, setBoardFx] = useState<{ type: SummonEffectType; x: number; y: number; key: number } | null>(null)
  const fxRef = useRef<BattleFxHandle>(null)
  const arenaRef = useRef<ArenaKey>(randomArena())
  // Kosmetika kovoje: pasirinkta nugarėlė (modulio kintamasis) + lentos fonas
  const [boardSkinUrl, setBoardSkinUrl] = useState<string | null>(null)
  useEffect(() => {
    const apply = (sk: { cardBack: SkinVisual | null; board: SkinVisual | null } | null) => {
      if (!sk) return
      setEquippedBack(sk.cardBack)
      setBoardSkinUrl(sk.board?.url ?? null)
      setSkinTick((t) => t + 1)
    }
    apply(cachedBattleSkins())
    getEquippedBattleSkins().then((sk) => {
      apply(sk)
      // jei PvP kanalas jau atidarytas — pranešam varžovui savo nugarėlę
      try { channelRef.current?.send({ type: 'broadcast', event: 'skin', payload: { back: sk.cardBack } }) } catch { /* */ }
    }).catch(() => {})
  }, [])
  const [, setSkinTick] = useState(0)

  // Projectile animacijos
  const [projectiles, setProjectiles] = useState<{ id: number; emoji: string; from: { x: number; y: number }; to: { x: number; y: number } }[]>([])
  // projectileType → FX elemento variantas (heal/poison/necrotic/curse trail+impact)
  const projVariant = (proj?: string | null): AoeVariant | undefined =>
    proj === 'arrow' ? 'arrow' : proj === 'fireball' ? 'fire' : proj === 'lightning' ? 'lightning' : proj === 'freezeBurst' ? 'ice'
      : proj === 'stunBurst' ? 'lightning' : proj === 'poisonGlob' ? 'poison' : proj === 'darkCurse' ? 'curse'
      : proj === 'healingGlow' ? 'heal' : undefined
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
  // ── Avatarai (mūšio HP taikiniai + balsai) ─────────────────────────────────
  const [youAvatar, setYouAvatar] = useState<BattleAvatar | null>(null)
  const [enemyAvatar, setEnemyAvatar] = useState<BattleAvatar | null>(null)
  const [avatarFlash, setAvatarFlash] = useState<Partial<Record<Side, 'hit' | 'heal' | null>>>({})
  const [avatarDead, setAvatarDead] = useState<Side | null>(null)   // pralaimėjusiojo avataras subyrėjęs
  const [endShown, setEndShown] = useState(false)                    // pabaigos modalas rodomas tik po defeat sekos
  const [youVid, setYouVid] = useState<string | null>(null)
  const [enemyVid, setEnemyVid] = useState<string | null>(null)
  const [avatarInspect, setAvatarInspect] = useState<{ avatar: BattleAvatar | null; vid: string | null } | null>(null)
  const avLpRef = useRef<number | undefined>(undefined)
  const avLpFired = useRef(false)
  const openAvatarInspect = (side: Side) => { setAvatarInspect({ avatar: side === 'you' ? youAvatar : enemyAvatar, vid: side === 'you' ? youVid : enemyVid }) }
  const youAvIdRef = useRef<string | null>(null)
  const enemyAvIdRef = useRef<string | null>(null)
  const fightStartedRef = useRef(false)
  useEffect(() => {
    let alive = true
    ;(async () => {
      const cos = await getCosmetics()
      if (!alive) return
      const items = (cos?.items ?? []).filter((c) => c.kind === 'avatar')
      const mine = items.find((c) => c.id === cos?.equippedAvatar) ?? items.find((c) => c.ownedByDefault) ?? items[0] ?? null
      // PvP: paimam TIKRĄ priešininko pasirinktą avatarą (iš jo profilio); kitaip – default.
      let foeId: string | null = null
      if (net?.opponentId) {
        try { const { data: op } = await createClient().from('profiles').select('equipped_avatar').eq('id', net.opponentId).maybeSingle(); foeId = (op as { equipped_avatar?: string } | null)?.equipped_avatar ?? null } catch { /* */ }
        if (!alive) return
      }
      // Botai (treniruotė / ranked): random avataras kas kovą, ne visada default
      const botPool = items.filter((c) => c.id !== mine?.id)
      const botPick = (botPool.length ? botPool : items)
      const foe = (foeId ? items.find((c) => c.id === foeId) : null)
        ?? (botPick.length ? botPick[Math.floor(Math.random() * botPick.length)] : null)
      const toAv = (c: typeof mine | null): BattleAvatar | null => c ? { id: c.id, name: c.name, imageUrl: c.imageUrl, emoji: c.emoji, videos: c.videos ?? [], fit: c.portraitFit ?? null } : null
      const me = toAv(mine), en = toAv(foe)
      setYouAvatar(me); setEnemyAvatar(en)
      youAvIdRef.current = me?.id ?? null; enemyAvIdRef.current = en?.id ?? null
      const ids = [me?.id, en?.id]
      const [map] = await Promise.all([getAvatarAudio(ids), loadVoices('avatar', ids)])
      if (!alive) return
      resetAvatarAudio(); setAvatarAudioMap(avatarMapFor(ids, map))   // Fazė 7: balsai pagal kalbą + LT fallback
    })()
    return () => { alive = false; stopAvatarAudio() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [net?.opponentId])
  // fightStart: dabartinio ėjimo savininkas pirmas
  useEffect(() => {
    if (!game || fightStartedRef.current || !youAvIdRef.current) return
    fightStartedRef.current = true
    const a = youAvIdRef.current, b = enemyAvIdRef.current
    if (game.active === 'you') { playAvatarAudio(a, 'fightStart'); window.setTimeout(() => playAvatarAudio(b, 'fightStart'), 950) }
    else { playAvatarAudio(b, 'fightStart'); window.setTimeout(() => playAvatarAudio(a, 'fightStart'), 950) }
  }, [game, youAvatar])
  const flashAvatar = useCallback((sd: Side, kind: 'hit' | 'heal') => {
    setAvatarFlash((f) => ({ ...f, [sd]: kind }))
    window.setTimeout(() => setAvatarFlash((f) => ({ ...f, [sd]: null })), 340)
  }, [])
  const logScrollRef = useRef<HTMLDivElement | null>(null)
  const [hoverCard, setHoverCard] = useState<{ card: TutCard; x: number; y: number } | null>(null)
  const [pileView, setPileView] = useState<{ title: string; cards: TutCard[] } | null>(null)

  // ── Tikros kortų tipų ikonos tuščiuose slotuose (card_types.icon_url iš DB) ──
  const [typeIcons, setTypeIcons] = useState<Partial<Record<TutCardType, string>>>({})
  useEffect(() => {
    createClient().from('card_types').select('name, icon_url')
      .then(({ data }) => {
        const m: Partial<Record<TutCardType, string>> = {}
        for (const r of ((data as { name: string; icon_url: string | null }[]) ?? [])) {
          if (!r.icon_url) continue
          const t = mapCardType(r.name, false)
          if (!m[t]) m[t] = r.icon_url
        }
        setTypeIcons(m)
      })
  }, [])
  // Fallback grandinė: DB card_types.icon_url → lokali /icons/card-types/*.png → emoji
  const LOCAL_TYPE_ICON: Partial<Record<TutCardType, string>> = {
    unit: '/icons/card-types/creature.png', spell: '/icons/card-types/spell.png',
    artifact: '/icons/card-types/artefact.png', reaction: '/icons/card-types/reaction.png',
    field: '/icons/card-types/field.png', champion: '/icons/card-types/champion.png',
    curse: '/icons/card-types/curse.png',
  }
  const slotTypeIcon = (kind: TutCardType, size: number, fallback: string, color: string) => {
    const url = typeIcons[kind] ?? LOCAL_TYPE_ICON[kind]
    return url
      // eslint-disable-next-line @next/next/no-img-element
      ? <img src={url} alt="" draggable={false} style={{ width: size, height: size, objectFit: 'contain', opacity: 0.32, filter: 'grayscale(0.35)' }} />
      : <span style={{ fontSize: Math.round(size * 0.8), opacity: 0.18, color }}>{fallback}</span>
  }
  const [peekSel, setPeekSel] = useState<string[]>([])
  const [summonSel, setSummonSel] = useState<string[]>([])
  // PvP: varžovo profilis + ėjimo laikmatis
  const [oppProfile, setOppProfile] = useState<{ id: string; username: string; display_name: string | null; avatar_url: string | null; level: number | null; is_public: boolean } | null>(null)
  const [oppDecks, setOppDecks] = useState<{ id: string; name: string }[]>([])
  const [oppOpen, setOppOpen] = useState(false)
  const [turnDeadline, setTurnDeadline] = useState<number | null>(null)
  const [showRotate, setShowRotate] = useState(false)
  const [myName, setMyName] = useState<string | null>(null)
  const [turnBanner, setTurnBanner] = useState<{ name: string; you: boolean } | null>(null)
  const lastTurnRef = useRef(-1)
  const [oppPresent, setOppPresent] = useState(false)
  const [oppMissingLeft, setOppMissingLeft] = useState<number | null>(null)
  const sawOppRef = useRef(!!net?.resume)
  const graceRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const dragEndRef = useRef(0)
  const logSwipeRef = useRef<{ x: number; y: number } | null>(null)
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
  const [flyingDraws, setFlyingDraws] = useState<{ id: number; card: TutCard | null; from: { x: number; y: number }; to: { x: number; y: number }; side: Side }[]>([])
  const [flyingReturns, setFlyingReturns] = useState<{ id: number; card: TutCard; from: { x: number; y: number }; to: { x: number; y: number }; side: Side }[]>([])
  const [flyingShatters, setFlyingShatters] = useState<{ id: number; card: TutCard; from: { x: number; y: number }; to: { x: number; y: number } }[]>([])
  const [popCards, setPopCards] = useState<{ id: number; card: TutCard | null; x: number; y: number; color: string; tag?: string }[]>([])
  const [deathGhosts, setDeathGhosts] = useState<{ id: number; card: TutCard; x: number; y: number }[]>([])
  const [hpHold, setHpHold] = useState<Record<string, number>>({})
  const flyIdRef = useRef(0)
  const unitRectsRef = useRef<Map<string, { x: number; y: number }>>(new Map())
  const lpRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Sužaistų kortų log: vardas -> korta (iš kaladės + prakeiksmų)
  const cardByName = useMemo(() => {
    const m: Record<string, TutCard> = {}
    for (const c of deckCards ?? []) m[c.name] = c
    for (const c of oppCards ?? []) m[c.name] = c
    for (const c of curseCards) m[c.name] = c
    return m
  }, [deckCards, oppCards, curseCards])

  // Kortos paieška pagal vardą: kaladės + visos žaidimo zonos (kad logas/pop-up'ai
  // rodytų ir varžovo bei sužaistų kortų paveikslus – įskaitant burtus).
  const findCard = useCallback((name?: string | null): TutCard | null => {
    if (!name) return null
    if (cardByName[name]) return cardByName[name]
    if (!game) return null
    for (const p of [game.you, game.ai]) {
      for (const arr of [p.hand, p.deck, p.discard]) { const f = arr.find((c) => c.name === name); if (f) return f }
      for (const u of p.units) if (u?.card.name === name) return u.card
      for (const a of p.artifacts) if (a?.card.name === name) return a.card
    }
    if (game.field?.card.name === name) return game.field.card
    return null
  }, [cardByName, game])

  const [soundOn, setSoundOn] = useState(true)
  const seenRef = useRef(0)

  // ── PremiumCinematics: bendra kino eilė (summon + championSkill) ───────────
  const cine = useCinematicQueue()
  const toCineCard = useCallback((c: TutCard): CinematicCardInput => ({
    id: c.id, name: c.name, image: c.image, rarityName: c.rarityName, type: c.type,
    isChampion: c.type === 'champion', factionName: c.factionName, gameplay: c.gameplay ?? null,
  }), [])
  // PremiumCinematics: preload tik dabartinės kaladės kino posterius (video lieka lazy)
  useEffect(() => {
    if (!deckCards) return
    const cc = deckCards.map(toCineCard)
    preloadCinematicPosters(collectDeckCinematicPosters(cc))
    preloadCinematicVideos(collectDeckCinematicVideos(cc))
  }, [deckCards, toCineCard])
  const shownTipsRef = useRef<Set<string>>(new Set())
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Fazė 7: kortų balsai pagal kalbą (localized_audio) – užkraunam abiejų kaladžių kortoms
  useEffect(() => {
    const ids = [...(deckCards ?? []), ...(oppCards ?? [])].map((c) => c.id)
    if (ids.length) void loadVoices('card', ids)
  }, [deckCards, oppCards])

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
  const copyBlocks = !!game?.pendingCopy
  const lastwishBlocks = !!game?.pendingLastwish
  const returnBlocks = !!game?.pendingReturn
  const isTouch = typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches
  // Horizontal (landscape) layout = DEFAULT. `?layout=v` grąžina seną vertikalų/desktop layout'ą (rollback).
  const useHLayout = typeof window === 'undefined' ? true : new URLSearchParams(window.location.search).get('layout') !== 'v'

  // F7: landscape orientation lock native shell'e; web fallback -> „pasuk telefoną" overlay.
  useEffect(() => {
    if (!useHLayout || !isTouch) { setShowRotate(false); return }
    void lockLandscape()
    const check = () => setShowRotate(isPortraitNow())
    check()
    window.addEventListener('resize', check)
    window.addEventListener('orientationchange', check)
    return () => {
      window.removeEventListener('resize', check)
      window.removeEventListener('orientationchange', check)
      void unlockOrientation()
    }
  }, [useHLayout, isTouch])
  const hMobile = useHLayout && typeof window !== 'undefined' && window.innerHeight < 640  // landscape/žemas ekranas: kompaktiški dydžiai (nesiremiam isTouch – webview'e nepatikimas)
  const handW = hMobile ? 48 : isTouch ? 80 : 124
  const unitW = hMobile ? 57 : isTouch ? 50 : 92
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
          rarity:rarities ( name, color_hex ),
          faction:factions ( id, name, color_hex ),
          card_keywords ( keyword:keywords ( name ) )
        `)
        .eq('status', 'active')
        .limit(120)
        .then(({ data, error }) => {
          if (!alive) return
          if (error || !data || data.length === 0) {
            setErrorMsg(t('battle.game.errTutorialDeck'))
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
          rarity:rarities ( name, color_hex ),
          faction:factions ( id, name, color_hex ),
          card_keywords ( keyword:keywords ( name ) )
        )
      `)
      .eq('deck_id', deckId)
      .then(({ data, error }) => {
        if (!alive) return
        if (error || !data || data.length === 0) {
          setErrorMsg(t('battle.game.errDeck'))
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
    void ensureCardTranslations()
    Promise.all([
      supabase.from('zmk_cards').select('*').eq('active', true).order('sort_order'),
      supabase.from('cards').select(`
        id, name, image_url, gold_cost, attack, health,
        effect_text, description, is_champion, subtype, champion_group, champion_phase, gameplay,
        card_type:card_types ( name ),
        rarity:rarities ( name, color_hex ),
        faction:factions ( id, name, color_hex ),
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
  const matchStartRef = useRef<number>(0)
  const clientMatchIdRef = useRef<string>('')
  const initGame = useCallback((cards: TutCard[], opp?: TutCard[] | null) => {
    matchStartRef.current = Date.now()
    clientMatchIdRef.current = (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`
    matchRewardRef.current = false
    questReportedRef.current = false
    setAvatarDead(null)      // rematch: avataras vėl sveikas
    setEndShown(false)       // rematch: pabaigos modalas paslėptas iki naujos defeat sekos
    resetAvatarAudio()       // rematch: fightStart/defeat/victory frazės vėl gali groti
    const aiSource = opp && opp.length > 0 ? opp : cards
    const g = createGame(
      cards.map((c, i) => ({ ...c, uid: c.uid + '-y' + i })),
      aiSource.map((c, i) => ({ ...c, uid: c.uid + '-a' + i })),
      'you',
      { zmkDefs, curseCards },
    )
    beginTurn(g)
    if (tutorial?.active && tutorial.applySetup) { try { tutorial.applySetup(g) } catch (e) { console.error('[tutorial] applySetup', e) } }
    seenRef.current = g.log.length
    setGame(g)
    playShuffle()
  }, [zmkDefs, curseCards, tutorial])

  // Praktika / PvP host: priešo (svečio) kaladė
  useEffect(() => {
    if (!loadOpp) return
    let alive = true
    const supabase = createClient()
    const sel = `id, name, image_url, gold_cost, attack, health, effect_text, description, is_champion, subtype, champion_group, champion_phase, gameplay, card_type:card_types ( name ), rarity:rarities ( name, color_hex ), faction:factions ( id, name, color_hex ), card_keywords ( keyword:keywords ( name ) )`
    if (opponentDeckId) {
      supabase.from('deck_cards').select(`quantity, is_side_deck, card:cards ( ${sel} )`).eq('deck_id', opponentDeckId).then(({ data }) => {
        if (!alive) return
        try {
          const rows = ((data as unknown as DbRow[]) ?? []).filter((r) => !(r as { is_side_deck?: boolean }).is_side_deck)
          const built = rowsToDeck(rows, 'o')
          // PvP host: jei DB negrąžina kortų (privati varžovo kaladė – RLS), NElaikom tuščios –
          // laukiam, kol svečias atsiųs savo kaladę per realtime (broadcast 'deck').
          if (built.length > 0) setOppCards(built)
          else if (!(net && isHost)) setOppCards([])
        } catch { if (!(net && isHost)) setOppCards([]) }
      }, () => { if (alive && !(net && isHost)) setOppCards([]) })
    } else if (opponentStarterId) {
      // Mokymai: AI žaidžia TIKRA starter kalade (starter_deck_cards – vieša lentelė)
      supabase.from('starter_deck_cards').select(`quantity, card:cards ( ${sel} )`).eq('starter_deck_id', opponentStarterId).then(({ data }) => {
        if (!alive) return
        try { setOppCards(rowsToDeck(((data as unknown as DbRow[]) ?? []), 'o')) } catch { setOppCards([]) }
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
  }, [loadOpp, opponentDeckId, opponentStarterId, opponentFaction])

  const oppReady = !loadOpp || oppCards !== null
  useEffect(() => {
    // Svečias žaidimo nekuria – laukia būsenos iš host'o.
    if (isGuest || game) return
    // Host reconnect: atkuriam išsaugotą būseną vietoj naujo kūrimo
    if (net?.resume && isHost) {
      try { const raw = localStorage.getItem(pvpStateKey(net.matchId)); if (raw) { const g = JSON.parse(raw) as GameState; seenRef.current = g.log.length; setGame(g); return } } catch { /* */ }
    }
    if (deckCards && extrasLoaded && oppReady) initGame(deckCards, oppCards)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deckCards, extrasLoaded, oppReady, initGame, isGuest, net?.resume])

  const closeGame = useCallback(() => {
    try { localStorage.removeItem(PVP_ACTIVE_KEY); if (net) localStorage.removeItem(pvpStateKey(net.matchId)) } catch { /* */ }
    onClose()
  }, [net, onClose])

  // ── Garso būsenos sekimas (kovos muzika tvarkoma atskirame effect'e) ──
  useEffect(() => {
    setSoundOn(isUiSoundEnabled())
    const unsub = subscribeUiSound(setSoundOn)
    return () => { unsub() }
  }, [])

  // ── Body scroll lock + Escape ──
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (avatarInspect) setAvatarInspect(null)
        else if (inspect) setInspect(null)
        else if (select) setSelect(null)
        else closeGame()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [inspect, select, avatarInspect, closeGame])

  const rectFor = useCallback((ref?: { side?: Side; uid?: string; kind?: string }): { x: number; y: number } | null => {
    if (!ref) return null
    let el: Element | null = null
    if (ref.uid) el = document.querySelector(`[data-unit-uid="${ref.uid}"]`) ?? document.querySelector(`[data-artifact-uid="${ref.uid}"]`)
    if (!el && ref.side) el = document.querySelector(`[data-player="${ref.side}"]`)
    if (!el) return null
    const r = el.getBoundingClientRect()
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 }
  }, [])

  // FX fallback centras: kai šaltinio ref'o nėra, taikom į TIKRĄ lentos centrą (landscape'e ≠ ekrano centras).
  // Sena vertikalė (be data-fx-board) -> ekrano centras kaip anksčiau.
  const fxCenter = useCallback((): { x: number; y: number } => {
    if (typeof window === 'undefined') return { x: 180, y: 320 }
    const el = document.querySelector('[data-fx-board]')
    if (el) { const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 } }
    return { x: window.innerWidth / 2, y: window.innerHeight / 2 }
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
    const seenStart = seenRef.current
    const fresh = game.log.slice(seenRef.current)
    seenRef.current = game.log.length
    // ── Status VFX: struktūrizuoti būsenų įvykiai → bus (seq = log indeksas, dedup) ──
    fresh.forEach((e, i) => {
      if (e.statusEvt && e.statusId && e.src?.uid) {
        publishStatusVfx({ seq: seenStart + i, type: e.statusEvt, cardId: e.src.uid, statusId: e.statusId as VfxStatusId, value: e.value })
      }
    })
    if (tutorial?.active && tutorial.onEvents && fresh.length) { try { tutorial.onEvents(fresh, game) } catch (e) { console.error('[tutorial] onEvents', e) } }
    let zmkN = 0
    let drawSeq = 0
    let skipYouDraw = false
    const pendingZmk: { v: string; side: Side }[] = []
    const zmkPlaced: { v: string; side: Side; x: number; y: number }[] = []
    let lastTgtRef: { kind?: string; side?: Side; uid?: string } | null = null
    // ── FX pacing kontekstas (efektai prasideda nuo source kortos, po nusėdimo) ──
    let srcRef: { side: Side; uid?: string } | undefined
    let srcCard: TutCard | null = null
    let srcKind: 'attack' | 'ability' | null = null  // mirties FX: 'attack' → kirtis (melee), kitaip → projektilas + sprogimas
    const projVictims = new Set<string>()  // uid taikinių, kuriems žala JAU paleido projektilą (kad mirtis nedubliuotų)
    let fxSeq = 0
    let showcaseHold = 0   // showcase (burtas/prakeiksmas/reakcija) rodymo trukmė – ŽMK/projektilai/pop atidedami
    let projFired = false
    let aoeFired = false
    let fxElemColor: string | null = null  // pasirinkto efekto elemento spalva (ugnis/žaibas/ledas…) AoE/žalos FX
    let fxElemType: string | null = null     // elemento tipas → AoE variantas (fire/lightning/ice/…)
    const aoeVariant = (): AoeVariant => {
      const t = fxElemType ?? (srcCard?.gameplay?.projectileType ?? null)
      switch (t) {
        case 'fireball': return 'fire'
        case 'lightning': return 'lightning'
        case 'freezeBurst': return 'ice'
        case 'poisonGlob': return 'poison'
        case 'darkCurse': return 'curse'
      case 'arrow': return 'arrow'
        case 'healingGlow': return 'heal'
        default: return 'generic'
      }
    }
    const hasPlay = fresh.some((ev) => ev.t === 'play' || ev.t === 'champion' || ev.t === 'artifact')
    const SETTLE = hasPlay ? 800 : 0
    const aoeMode = fresh.filter((ev) => ev.t === 'damage').length >= 2  // ≥2 žalos taikiniai
    // Tikras AoE (engine markeris fxSource.aoe – mapping'as taiko VISĄ zoną): zoninis efektas, be projektilų.
    // Visais kitais atvejais (rankinis pasirinkimas / hitCount auto) – PO PROJEKTILĄ kiekvienam taikiniui.
    const aoeFlagBatch = fresh.some((ev) => ev.t === 'fxSource' && ev.aoe)
    const chosenMulti = chosenTargetsRef.current
    chosenTargetsRef.current = null
    const multiProj = aoeMode && !!chosenMulti && chosenMulti.length >= 2
    const zoneAoe = aoeMode && aoeFlagBatch && !multiProj
    const perTargetProj = aoeMode && !zoneAoe
    // Masinis gydymas per AoE mapping'ą → žalias zoninis efektas vietoj atskirų srautų
    const healAoe = aoeFlagBatch && fresh.filter((ev) => ev.t === 'heal' && (ev.value ?? 0) > 0 && ev.tgt?.uid).length >= 2
    const rectOf = (r?: { side?: Side; uid?: string }) => rectFor(r) ?? (r?.uid ? unitRectsRef.current.get(r.uid) ?? null : null)
    const palOf = (c?: TutCard | null) => factionPalette(c?.factionName, c?.rarityColor)
    const spawnPop = (card: TutCard | null, at: { x: number; y: number }, color: string, tag?: string) => { const id = ++flyIdRef.current; setPopCards((pp) => [...pp, { id, card, x: at.x, y: at.y, color, tag }]); window.setTimeout(() => setPopCards((pp) => pp.filter((x) => x.id !== id)), 1300) }
    // Showcase: korta skrenda iš šaltinio į centrą, užauga, ~1 s palaikoma, dingsta.
    const spawnShowcase = (card: TutCard | null, from: { x: number; y: number }, kind: 'spell' | 'curse' | 'reaction', delay = 0) => {
      const id = ++flyIdRef.current
      window.setTimeout(() => {
        setShowcases((s) => [...s, { id, card, from, kind }])
        window.setTimeout(() => setShowcases((s) => s.filter((x) => x.id !== id)), 2550)
      }, delay)
    }
    const pileCenter = (sel: string): { x: number; y: number } | null => {
      const el = document.querySelector(sel)
      if (!el) return null
      const r = el.getBoundingClientRect()
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 }
    }
    for (const e of fresh) {
      // garsai: engine pateiktas sound hint > numatytasis pagal tipą
      // (ŽMK traukimas per showcase atidedamas – kad korta „suveiktų" PRIEŠ traukimą)
      if (e.sound) {
        if (e.t === 'zmk' && showcaseHold > 0) { const snd = e.sound, hh = showcaseHold; window.setTimeout(() => playBattleSound(snd), hh) }
        else playBattleSound(e.sound)
      }
      if (e.tgt) lastTgtRef = e.tgt

      if (e.projectile && e.projectile !== 'none') { if (!fxElemColor) fxElemColor = PROJECTILE_COLOR[e.projectile] ?? null; if (!fxElemType) fxElemType = e.projectile }
      switch (e.t) {
        case 'startTurn': if (e.side === 'you') skipYouDraw = true; break
        case 'fxSource': { if (e.src) { srcRef = e.src; srcKind = 'ability' } srcCard = findCard(e.cardName) ?? srcCard; break }
        case 'returnHand': {
          // Korta grąžinama nuo lauko į ranką: lėtai pakyla, tada greit nuskrenda į ranką.
          const uid = e.src?.uid
          const rc = e.cardName ? cardByName[e.cardName] : null
          const from = uid ? unitRectsRef.current.get(uid) : null
          const sd = e.side
          const handEl: Element | null = sd === 'you' ? handRef.current : document.querySelector('[data-pile="hand-ai"]')
          if (rc && from && handEl) {
            const hr = handEl.getBoundingClientRect()
            const to = { x: hr.left + hr.width / 2, y: sd === 'you' ? hr.top + 6 : hr.bottom - 6 }
            const rid = ++flyIdRef.current
            fxRef.current?.spawn({ kind: 'drawStream', from, to, color: '#a78bfa', duration: 0.9 })
            setFlyingReturns((f) => [...f, { id: rid, card: rc, from, to, side: sd }])
            window.setTimeout(() => setFlyingReturns((f) => f.filter((x) => x.id !== rid)), 950)
          }
          break
        }
        case 'draw': {
          if (!e.sound) playCardDraw()
          if (e.side === 'you' && e.cardName) { const dc = findCard(e.cardName); if (dc) prefetchCardVoice(cardVoiceUrls(dc.id, dc.gameplay?.voiceLines)) }
          { const sd = e.side; const dnm = e.cardName; const dseq = drawSeq++; window.setTimeout(() => { const deckEl = document.querySelector(`[data-pile="deck-${sd}"]`); const handEl: Element | null = sd === 'you' ? handRef.current : document.querySelector('[data-pile="hand-ai"]'); if (deckEl && handEl) { const dr = deckEl.getBoundingClientRect(), hr = handEl.getBoundingClientRect(); const fromP = { x: dr.left + dr.width / 2, y: dr.top + dr.height / 2 }; const toP = { x: hr.left + hr.width / 2, y: sd === 'you' ? hr.top + 6 : hr.bottom - 6 }; const dCard = sd === 'you' && dnm ? findCard(dnm) : null; const fid = ++flyIdRef.current; setFlyingDraws((f) => [...f, { id: fid, card: dCard, from: fromP, to: toP, side: sd }]); window.setTimeout(() => setFlyingDraws((f) => f.filter((x) => x.id !== fid)), 1200) } }, 40 + dseq * 220) }
          if (e.side === 'you' && e.cardName && skipYouDraw) { skipYouDraw = false }
          break
        }
        case 'play': case 'artifact': case 'champion': {
          if (!e.sound) playBattleSound('summon')
          const sc = findCard(e.cardName)
          if (sc) playCardVoice(cardVoiceUrls(sc.id, sc.gameplay?.voiceLines), { cardId: sc.id })
          // Premium summon kino pop-up (Legendinis/Čempionas; ne fazės keitimas/artefaktas)
          if (sc && (e.t === 'play' || (e.t === 'champion' && (e.key ?? '').startsWith('battleLog.playChampion')))) {
            const csrc = e.fromZone === 'graveyard' ? 'revived'
              : SUMMON_BY_EFFECT_KEYS.has(e.key ?? '') ? 'summonedByEffect'
              : 'playedFromHand'
            cine.enqueueSummonCinematic(toCineCard(sc), { source: csrc })
          }
          if (sc?.gameplay?.summonEffect && isSummonFxEnabled()) { const st = sc.gameplay.summonEffect, su = e.src; window.setTimeout(() => { const at = su ? rectOf(su) : null; if (at) { setBoardFx({ type: st, x: at.x, y: at.y, key: Date.now() }); fxRef.current?.shakeBoard(SUMMON_SHAKE.has(st) ? 'hard' : 'soft') } }, 150) }
          srcRef = e.src; srcCard = sc; srcKind = 'ability'
          window.setTimeout(() => { playBattleSound('impact', 0.26); fxRef.current?.shakeBoard('soft') }, 330)
          if (SUMMON_BY_EFFECT_KEYS.has(e.key ?? '') && e.cardName) {
            const nm = e.cardName, sd = e.side, pcol = palOf(findCard(nm)), grave = e.fromZone === 'graveyard'
            window.setTimeout(() => { const uid = P(game, sd).units.find((u) => u?.card.name === nm)?.uid; const at = uid ? rectOf({ uid }) : null; if (at) fxRef.current?.spawn({ kind: grave ? 'graveRise' : 'summonPortal', to: at, color: grave ? '#5ef0c0' : pcol.primary, color2: pcol.secondary, duration: grave ? 1.6 : 1.3 }) }, 60)
          }
          if (e.t === 'champion' && (e.key ?? '').startsWith('battleLog.playChampion') && e.cardName) {
            const nm = e.cardName, sd = e.side
            window.setTimeout(() => { const uid = P(game, sd).units.find((u) => u?.card.name === nm)?.uid; const at = uid ? rectOf({ uid }) : null; if (at) { fxRef.current?.spawn({ kind: 'buffSurge', to: at, color: '#ffd24a', duration: 1.0 }); fxRef.current?.shakeBoard('soft') } }, 360)
          }
          break
        }
        case 'spell': case 'ability': {
          if (!e.sound) playBattleSound('spellCast')
          if (e.t === 'spell') playAvatarAudio(e.side === 'you' ? youAvIdRef.current : enemyAvIdRef.current, 'spellCast')
          srcRef = e.src; srcCard = findCard(e.cardName) ?? srcCard; srcKind = 'ability'
          // Premium Čempiono skill kino pop-up (po taikinio pasirinkimo – ability event jau po resolve)
          if (e.t === 'ability' && typeof e.skillIndex === 'number') {
            const cc = findCard(e.cardName)
            if (cc) cine.enqueueChampionSkillCinematic(toCineCard(cc), e.skillIndex)
          }
          if (e.t === 'spell' && e.cardName && (e.key ?? '').startsWith('battleLog.castSpell')) {
            // Showcase: burto miniatiūra iš rankos → centras (užauga iki ~40% ekrano, 1 s), tada efektai
            const card = findCard(e.cardName)
            const from = pileCenter(e.side === 'you' ? '[data-tut="hand"], [data-pile="hand-you"]' : '[data-pile="hand-ai"]')
              ?? (e.side === 'you' && handRef.current ? (() => { const r = handRef.current!.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 } })() : fxCenter())
            spawnShowcase(card, from, 'spell', SETTLE)
            fxSeq += 2250
            showcaseHold = SETTLE + 2200
          } else if (e.t === 'spell' && e.cardName && !e.tgt) {
            const card = findCard(e.cardName)
            const at = (e.src ? rectOf(e.src) : null) ?? fxCenter()
            window.setTimeout(() => spawnPop(card, at, '#60a5fa', e.side === 'you' ? t('battle.game.spellTag') : t('battle.game.enemySpellTag')), 160)
          }
          break
        }
        case 'attack': { if (!e.sound) playBattleSound('attack'); srcRef = e.src; srcCard = findCard(e.cardName) ?? srcCard; srcKind = 'attack'; break }
        case 'zmk':
          zmkN += 1
          if (showcaseHold > 0) fxSeq += 800  // žalos FX ateina PO ŽMK traukimo animacijos
          if (e.zmkPair) {
            const [za, zb] = e.zmkPair
            const payload = { id: ++flyIdRef.current, side: e.side, a: za, b: zb, picked: e.zmkPicked ?? e.zmk ?? za, adv: e.bias === 'advantage' }
            if (showcaseHold > 0) { const hh = showcaseHold; window.setTimeout(() => setZmkRoll(payload), hh) }
            else setZmkRoll(payload)
          } else if (game.zmkMode === 'draw') {
            const item = { v: e.zmk ?? '?', side: e.side, revealed: false }
            if (showcaseHold > 0) { const hh = showcaseHold; window.setTimeout(() => setZmkPending((q) => [...q, item]), hh) }
            else setZmkPending((q) => [...q, item])
          } else {
            pendingZmk.push({ v: e.zmk ?? '?', side: e.side })
          }
          if (!e.sound) playBattleSound('zmkFlip')
          if (e.zmk === 'x2' || e.zmk === 'x0') queueTip('zmk-special')
          break
        case 'death': {
          const uid = e.src?.uid
          const card = e.cardName ? cardByName[e.cardName] : null
          const from = uid ? unitRectsRef.current.get(uid) : null
          const pileEl = document.querySelector(`[data-pile="discard-${e.side}"]`)
          const startFly = () => {
            if (card && from && pileEl) {
              const r = pileEl.getBoundingClientRect()
              const to = { x: r.left + r.width / 2, y: r.top + r.height / 2 }
              const id = ++flyIdRef.current
              if (card.image) {
                // Sunaikinta korta: gabalai išsilaksto → susiburia → nuskrenda į kapinyną.
                setFlyingShatters((f) => [...f, { id, card, from, to }])
                playBattleSound('impact', 0.4)
                window.setTimeout(() => playBattleSound('impact', 0.5), 1000)  // gabalai sukrinta i kapinyna – duslus smugis
                setTimeout(() => setFlyingShatters((f) => f.filter((x) => x.id !== id)), 1250)
              } else {
                setFlyingCards((f) => [...f, { id, card, from, to }])
                setTimeout(() => setFlyingCards((f) => f.filter((x) => x.id !== id)), 650)
              }
            }
          }
          if (from) {
            const base = SETTLE + fxSeq; fxSeq += 120
            const srcR = srcRef && srcRef.side !== e.side ? rectOf(srcRef) : null
            const pc = palOf(card).primary
            if (srcR) {
              const melee = srcKind === 'attack'
              const hadDmg = !!(e.src?.uid && projVictims.has(e.src.uid))  // žala jau paleido projektilą į šį taikinį
              const projKind = melee ? 'slash' : factionDirectionalKind(srcCard?.factionName)
              const projCol = melee ? '#ff4a4a' : palOf(srcCard).primary
              const travel = hadDmg ? 120 : (melee ? 430 : 560)
              let gid = 0
              if (card) { gid = ++flyIdRef.current; const gc = card, gx = from.x, gy = from.y; setDeathGhosts((gs) => [...gs, { id: gid, card: gc, x: gx, y: gy }]) }
              // 1) projektilas/kirtis NUO šaltinio iki taikinio (praleidžiam, jei žala jau jį paleido)
              if (!hadDmg) window.setTimeout(() => fxRef.current?.spawn({ kind: projKind, from: srcR, to: from, color: projCol, duration: melee ? 0.9 : 1.0, variant: melee ? undefined : projVariant(fxElemType ?? srcCard?.gameplay?.projectileType ?? null) }), base)
              // 2) smūgis: sunaikinimas → SPROGIMAS (korta ištaškoma į gabalus); melee → įprastas suirimas
              window.setTimeout(() => {
                if (melee) {
                  fxRef.current?.spawn({ kind: 'disintegrate', to: from, color: pc, duration: 0.9 })
                  fxRef.current?.hitFlash(from.x, from.y, '#ff4a4a')
                } else {
                  fxRef.current?.spawn({ kind: 'disintegrate', to: from, color: pc, duration: 1.0, intensity: 'big' })
                  fxRef.current?.spawn({ kind: 'burn', to: from, color: '#ff8a3a', duration: 0.7, intensity: 'small' })
                  fxRef.current?.hitFlash(from.x, from.y, '#ffd24a')
                  fxRef.current?.shakeBoard('hard')
                  if (e.src?.uid) fxRef.current?.shakeUnit(e.src.uid, 'hard')
                }
                playBattleSound('death', 0.45)
                if (gid) setDeathGhosts((gs) => gs.filter((x) => x.id !== gid))
                startFly()
              }, base + travel)
            } else {
              window.setTimeout(() => { fxRef.current?.spawn({ kind: 'disintegrate', to: from, color: pc, duration: 0.9 }); startFly() }, base)
            }
          } else { startFly() }
          break
        }
        case 'win': {
          // Pralaimėjimo seka: 1) avataras sprogsta į šukes (+explosion garsas) →
          // 2) pralaimėjusiojo defeat frazė → 3) laimėtojo victory frazė → 4) pabaigos ekranas.
          const winSide = e.side
          const loser: Side = winSide === 'you' ? 'ai' : 'you'
          const winId = winSide === 'you' ? youAvIdRef.current : enemyAvIdRef.current
          const loseId = winSide === 'you' ? enemyAvIdRef.current : youAvIdRef.current
          setAvatarDead(loser)
          playBattleSound('explosion', 0.65)
          const avEl = document.querySelector(`[data-player="${loser}"]`)
          if (avEl) {
            const r = avEl.getBoundingClientRect()
            const at = { x: r.left + r.width / 2, y: r.top + r.height / 2 }
            fxRef.current?.spawn({ kind: 'disintegrate', to: at, color: '#ff8a3a', duration: 1.1, intensity: 'big' })
            fxRef.current?.spawn({ kind: 'burn', to: at, color: '#ffb347', duration: 0.8, intensity: 'small' })
            fxRef.current?.hitFlash(at.x, at.y, '#ffb347')
          }
          fxRef.current?.shakeBoard('hard')
          window.setTimeout(() => playAvatarAudio(loseId, 'defeat'), 1000)
          window.setTimeout(() => playAvatarAudio(winId, 'victory'), 3100)
          window.setTimeout(() => { setEndShown(true); if (winSide === 'you') playSuccess(); else playError() }, 5200)
          break
        }
        case 'lastwish': queueTip('lastwish'); break
        case 'battlecry': queueTip('battlecry'); break
        case 'reactionTrigger': {
          queueTip('reaction')
          const card = findCard(e.cardName)
          const from = pileCenter(`[data-pile="reactions-${e.side}"]`) ?? fxCenter()
          spawnShowcase(card, from, 'reaction', SETTLE + fxSeq)
          showcaseHold = SETTLE + fxSeq + 2200
          fxSeq += 2250
          break
        }
        case 'field': {
          queueTip('field'); if (!e.sound) playBattleSound('field')
          const d = SETTLE + fxSeq; fxSeq += 120
          window.setTimeout(() => { const c = fxCenter(); fxRef.current?.spawn({ kind: 'aoeWave', from: { x: c.x, y: c.y }, color: fxElemColor ?? '#ffd24a', duration: 1.7, variant: aoeVariant() }) }, d)
          break
        }
        case 'evolve': queueTip('evolve'); playSuccess(); break
        case 'handBurn': {
          queueTip('hand-burn')
          // Ranka pilna (10): ištraukta korta ~1 s rodoma, tada sprogsta į kapinyną.
          if (e.side !== 'you') { playBattleSound('death', 0.3); break }
          const bc = e.cardName ? cardByName[e.cardName] : null
          if (!bc) break
          const bcenter = fxCenter()
          const bx = bcenter.x
          const by = bcenter.y
          const ghostId = ++flyIdRef.current
          setDeathGhosts((gs) => [...gs, { id: ghostId, card: bc, x: bx, y: by }])
          playBattleSound('draw')
          window.setTimeout(() => spawnPop(null, { x: bx, y: by }, '#f87171', 'Ranka pilna!'), 60)
          window.setTimeout(() => {
            setDeathGhosts((gs) => gs.filter((g) => g.id !== ghostId))
            const pileEl = document.querySelector('[data-pile="discard-you"]')
            if (pileEl) {
              const r = pileEl.getBoundingClientRect()
              const to = { x: r.left + r.width / 2, y: r.top + r.height / 2 }
              const id = ++flyIdRef.current
              setFlyingShatters((fs) => [...fs, { id, card: bc, from: { x: bx, y: by }, to }])
              playBattleSound('death', 0.45)
              playBattleSound('impact', 0.4)
              window.setTimeout(() => playBattleSound('impact', 0.5), 1000)
              window.setTimeout(() => setFlyingShatters((fs) => fs.filter((x) => x.id !== id)), 1250)
            }
          }, 1000)
          break
        }
        case 'curse': {
          queueTip('curse')
          playBattleSound('curse')
          const card = findCard(e.cardName)
          const activated = (e.key ?? '').startsWith('battleLog.curseDrawn') || e.key === 'battleLog.curseForced'
          if (activated) {
            // Showcase: prakeiksmas atskrenda nuo kaladės, iš kurios ištrauktas (e.side = auka)
            const from = pileCenter(`[data-pile="deck-${e.side}"]`) ?? fxCenter()
            spawnShowcase(card, from, 'curse', SETTLE + fxSeq)
            showcaseHold = SETTLE + fxSeq + 2200
            fxSeq += 2250
          } else {
            setCardFlash({ card, title: e.cardName ?? t('battle.game.curseTag'), tag: t('battle.game.curseMixed'), color: '#a78bfa' })
            if (flashTimerRef.current) clearTimeout(flashTimerRef.current)
            flashTimerRef.current = setTimeout(() => setCardFlash(null), 2000)
          }
          if (srcRef) { const sref = srcRef, opp: Side = sref.side === 'you' ? 'ai' : 'you'; const d = SETTLE + fxSeq; fxSeq += 120; window.setTimeout(() => { const from = rectOf(sref); const to = pileCenter(`[data-pile="deck-${opp}"]`) ?? rectFor({ side: opp }); if (from && to) fxRef.current?.spawn({ kind: 'curseMark', from, to, color: '#a855f7', duration: 1.4 }) }, d) }
          break
        }
        case 'coin': {
          playBattleSound('zmkFlip')
          const cc: 'green' | 'red' = e.coin === 'red' ? 'red' : 'green'
          setCoinAnim({ side: e.side, coin: cc })
          if (coinTimerRef.current) clearTimeout(coinTimerRef.current)
          coinTimerRef.current = setTimeout(() => setCoinAnim(null), 1400)
          break
        }
        case 'status': {
          if (e.status) queueTip(('status-' + e.status) as TipKey)
          const su = e.src?.uid, stt = e.status
          if (su && stt && e.key !== 'battleLog.statusEnd') {
            const fxMap: Record<string, { kind: 'freeze' | 'burn' | 'poison' | 'debuffDrain'; col: string }> = {
              frozen: { kind: 'freeze', col: '#38bdf8' }, stunned: { kind: 'freeze', col: '#facc15' },
              burning: { kind: 'burn', col: '#fb923c' }, poisoned: { kind: 'poison', col: '#84cc16' },
              silenced: { kind: 'debuffDrain', col: '#a78bfa' },
            }
            const m = fxMap[stt]
            if (m) { const d = SETTLE + fxSeq; fxSeq += 100; const uu = su; window.setTimeout(() => { const at = unitRectsRef.current.get(uu) ?? rectFor({ uid: uu }); if (at) { fxRef.current?.spawn({ kind: m.kind, from: at, to: at, color: m.col, duration: m.kind === 'freeze' ? 1.2 : 1.4 }); fxRef.current?.shakeUnit(uu, 'soft') } }, d) }
          }
          break
        }
        case 'damage': {
          const tgt = e.tgt, val = e.value
          // Žaidėjo (avataro) žala: hit balsas + float skaičius + flash + lowHp
          if (!e.cardName && (val ?? 0) > 0 && (!tgt || tgt.kind === 'player')) {
            const sd = e.side
            const aid = sd === 'you' ? youAvIdRef.current : enemyAvIdRef.current
            playAvatarAudio(aid, 'hit')
            flashAvatar(sd, 'hit')
            const pat = rectFor({ side: sd })
            if (pat) { const d = SETTLE + fxSeq; fxSeq += 80; window.setTimeout(() => { fxRef.current?.floatNumber(pat.x, pat.y - 14, '-' + val, '#ff5a4a', (val ?? 0) >= 4); fxRef.current?.hitFlash(pat.x, pat.y, '#ff5a4a') }, d) }
            const pp2 = P(game, sd)
            if (pp2.hp > 0 && pp2.hp <= pp2.maxHp * 0.25) playAvatarAudio(aid, 'lowHp')
          }
          { let dp = tgt ? rectOf(tgt) : null
            if (!dp && e.cardName) { const pp = P(game, e.side); const u = pp.units.find((x) => x?.card.name === e.cardName); if (u) dp = rectOf({ uid: u.uid }); if (!dp) { const a = pp.artifacts.find((x) => x?.card.name === e.cardName); if (a) dp = rectOf({ uid: a.uid }) } }
            if (!dp && lastTgtRef) dp = rectOf(lastTgtRef)
            if (!dp) dp = rectFor({ side: e.side })
            if (dp && pendingZmk.length) { for (const z of pendingZmk) zmkPlaced.push({ ...z, x: dp.x, y: dp.y }); pendingZmk.length = 0 } }
          if (tgt && val) {
            if (tgt.uid) projVictims.add(tgt.uid)
            if (tgt.uid && tgt.side) { const cur = P(game, tgt.side).units.find((u) => u?.uid === tgt.uid)?.hp; if (cur != null) { const uid = tgt.uid; setHpHold((h) => ({ ...h, [uid]: cur + val })) } }
            const base = SETTLE + fxSeq; fxSeq += 120
            // elemento spalva: batch e.projectile > source kortos projectileType > frakcijos paletė
            const srcProj = srcCard?.gameplay?.projectileType
            const elemCol = fxElemColor ?? (srcProj && srcProj !== 'none' ? (PROJECTILE_COLOR[srcProj] ?? null) : null)
            const numCol = elemCol ?? '#ff5a4a'
            const sref = srcRef, col = elemCol ?? palOf(srcCard).primary, pf = projFired, am = zoneAoe, mm = perTargetProj
            window.setTimeout(() => {
              const to = rectOf(tgt); if (!to) return
              const from = sref ? rectOf(sref) : null
              // keli taikiniai (pasirinkti ar auto): PO PROJEKTILĄ kiekvienam žalos taikiniui;
              // zona (tikras AoE): jokių projektilų; single: vienas projektilas (jei dar nešautas)
              const fireProj = mm ? !!from : (!am && !!from && !pf)
              if (fireProj) { playBattleSound('spellCast', 0.3); fxRef.current?.spawn({ kind: factionDirectionalKind(srcCard?.factionName), from: from!, to, color: col, duration: 1.0, variant: projVariant(fxElemType ?? srcCard?.gameplay?.projectileType ?? null) }) }
              window.setTimeout(() => {
                if (tgt.uid) { const uid = tgt.uid; setHpHold((h) => { if (!(uid in h)) return h; const n = { ...h }; delete n[uid]; return n }) }
                fxRef.current?.floatNumber(to.x, to.y - 12, '-' + val, numCol, val >= 4)
                fxRef.current?.hitFlash(to.x, to.y, numCol)
                if (tgt.uid) fxRef.current?.shakeUnit(tgt.uid, val >= 5 ? 'hard' : 'normal')
                playBattleSound('impact', 0.3)
              }, fireProj ? 600 : 220)
            }, base)
          }
          break
        }
        case 'heal': {
          const tgt = e.tgt, val = e.value
          if (!e.cardName && (val ?? 0) > 0 && (!tgt || tgt.kind === 'player')) flashAvatar(e.side, 'heal')
          if (tgt?.uid && tgt.side && val) { const cur = P(game, tgt.side).units.find((u) => u?.uid === tgt.uid)?.hp; if (cur != null) { const uid = tgt.uid; setHpHold((h) => ({ ...h, [uid]: Math.max(0, cur - val) })) } }
          const base = SETTLE + fxSeq; fxSeq += 120
          const sref = srcRef
          window.setTimeout(() => {
            const to = tgt ? rectOf(tgt) : rectFor({ side: e.side }); if (!to) return
            const from = sref ? rectOf(sref) : null
            if (from && !healAoe) fxRef.current?.spawn({ kind: 'healStream', from, to, color: '#5ef0c0', duration: 1.2 })
            window.setTimeout(() => { if (tgt?.uid) { const uid = tgt.uid; setHpHold((h) => { if (!(uid in h)) return h; const n = { ...h }; delete n[uid]; return n }) } if (val) fxRef.current?.floatNumber(to.x, to.y - 12, '+' + val, '#5ef0c0'); if (tgt?.uid) fxRef.current?.shakeUnit(tgt.uid, 'soft') }, from ? 420 : 0)
          }, base)
          break
        }
        case 'buff': {
          const tgt = e.tgt, val = e.value ?? 0
          const base = SETTLE + fxSeq; fxSeq += 120
          const sref = srcRef
          window.setTimeout(() => {
            const to = tgt ? rectOf(tgt) : null; if (!to) return
            const up = val >= 0
            const from = sref ? rectOf(sref) ?? to : to
            fxRef.current?.spawn({ kind: up ? 'buffSurge' : 'debuffDrain', from, to, color: up ? '#ffd24a' : '#a855f7', duration: 1.2 })
            if (val) fxRef.current?.floatNumber(to.x, to.y - 12, (up ? '+' : '') + val, up ? '#ffd24a' : '#a855f7')
            if (tgt?.uid) fxRef.current?.shakeUnit(tgt.uid, 'soft')
          }, base)
          break
        }
        case 'gold': {
          const gv = e.value
          if (gv && gv < 0) { const sd = e.side; const d = SETTLE + fxSeq; fxSeq += 80; window.setTimeout(() => { const at = rectFor({ side: sd }); if (at) fxRef.current?.floatNumber(at.x, at.y - 14, String(gv) + ' 🪙', '#ffd24a') }, d) }
          break
        }
        default: break
      }
      if (e.t === 'champion') queueTip('champion')
      if (e.t === 'artifact') queueTip('artifact')
      if (e.t === 'play' && (e.key ?? '').startsWith('battleLog.playUnitSprint')) queueTip('sprint')
      // efekto projektilas/kirtis nuo source kortos (spell / ability / attack)
      if (e.src && e.tgt && (e.t === 'spell' || e.t === 'ability' || e.t === 'attack') && !(e.t === 'spell' && aoeMode)) {
        // burtas su ≥2 žalos taikiniais: projektilus šauna damage įvykiai (po vieną KIEKVIENAM) – čia nešaunam
        const isAtk = e.t === 'attack'
        const proj = e.projectile
        const col = (proj && PROJECTILE_COLOR[proj]) || palOf(srcCard).primary
        const col2 = palOf(srcCard).secondary
        const src = e.src, tgt = e.tgt
        const hold = e.t === 'spell' ? showcaseHold : 0   // burto projektilas – tik PO showcase
        projFired = true
        // Paprastos atakos: puolėjo korta greitai nuskrieja iki taikinio ir grįžta (tik atakoms, ne efektams)
        if (isAtk && src.uid) {
          const to0 = rectOf(tgt)
          if (to0) fxRef.current?.lungeUnit(src.uid, to0)
        }
        window.setTimeout(() => {
          const from = rectOf(src), to = rectOf(tgt)
          if (from && to) {
            fxRef.current?.spawn({ kind: isAtk ? 'slash' : factionDirectionalKind(srcCard?.factionName), from, to, color: col, color2: col2, duration: isAtk ? 1.0 : 1.2, variant: isAtk ? undefined : projVariant(proj) })
            if (isAtk) { playBattleSound('impact', 0.45); fxRef.current?.hitFlash(to.x, to.y, '#ffffff'); fxRef.current?.shakeBoard('soft') }
          }
        }, (isAtk ? 220 : 200) + hold)
        const popAt = rectOf(tgt)
        // Burtams su showcase mažo pop'o NErodome – showcase jį pakeičia (nebesidubliuoja)
        if (popAt && !(e.t === 'spell' && showcaseHold > 0)) { const pc = srcCard, pcol = isAtk ? '#ffffff' : col, ptag = e.t === 'spell' ? (e.side === 'you' ? t('battle.game.spellTag') : t('battle.game.enemySpellTag')) : undefined; window.setTimeout(() => spawnPop(pc, popAt, pcol, ptag), isAtk ? 260 : 220) }
        void PROJ_EMOJI; void spawnProjectile
      }
    }
    if (pendingZmk.length > 0) { const fb = (srcRef ? rectOf(srcRef) : null) ?? fxCenter(); for (const z of pendingZmk) zmkPlaced.push({ ...z, x: fb.x, y: fb.y }) }
    if (zmkPlaced.length > 0) {
      if (showcaseHold > 0) { const hh = showcaseHold, pl = zmkPlaced, nn = seenRef.current; window.setTimeout(() => setZmkFlash({ placed: pl, n: nn }), hh) }
      else setZmkFlash({ placed: zmkPlaced, n: seenRef.current })
    }
    if (zoneAoe && !aoeFired) {
      aoeFired = true
      // Zona = realiai paveikta teritorija: viena pusė → tik tos pusės padarų eilė; abi → visa lenta
      const hitSides = new Set<Side>()
      for (const ev of fresh) {
        if (ev.t !== 'damage' || !(ev.value ?? 0)) continue
        if (ev.tgt?.side) hitSides.add(ev.tgt.side)
        else if (!ev.cardName) hitSides.add(ev.side)
      }
      const zoneEl = hitSides.size === 1
        ? document.querySelector(`[data-tut="units-${[...hitSides][0]}"]`)
        : document.querySelector('[data-fx-root]')
      const zr = zoneEl?.getBoundingClientRect()
      const rect = zr && zr.width > 40 ? { x: zr.left - 10, y: zr.top - 10, w: zr.width + 20, h: zr.height + 20 } : undefined
      const aCol = fxElemColor ?? palOf(srcCard).primary
      const aFrom = rect ? { x: rect.x + rect.w / 2, y: rect.y + rect.h / 2 } : ((srcRef ? rectOf(srcRef) : null) ?? fxCenter())
      const aDelay = showcaseHold > 0 ? showcaseHold : SETTLE
      const av = aoeVariant()
      const aSnd: BattleSoundType = av === 'ice' ? 'freeze' : av === 'heal' || av === 'holy' ? 'heal' : av === 'curse' || av === 'necrotic' ? 'curse' : 'impact'
      window.setTimeout(() => { playBattleSound(aSnd, 0.55); fxRef.current?.spawn({ kind: 'aoeWave', from: aFrom, rect, color: aCol, duration: 1.7, variant: av }) }, aDelay)
    }

    if (healAoe) {
      // Zona = gydomų padarų pusė (viena → tos pusės eilė; abi → visa lenta)
      const hs = new Set<Side>()
      for (const ev of fresh) if (ev.t === 'heal' && (ev.value ?? 0) > 0 && ev.tgt?.side) hs.add(ev.tgt.side)
      const zEl = hs.size === 1
        ? document.querySelector(`[data-tut="units-${[...hs][0]}"]`)
        : document.querySelector('[data-fx-root]')
      const zr2 = zEl?.getBoundingClientRect()
      const rect2 = zr2 && zr2.width > 40 ? { x: zr2.left - 10, y: zr2.top - 10, w: zr2.width + 20, h: zr2.height + 20 } : undefined
      const hFrom = rect2 ? { x: rect2.x + rect2.w / 2, y: rect2.y + rect2.h / 2 } : fxCenter()
      const hDelay = showcaseHold > 0 ? showcaseHold : SETTLE
      window.setTimeout(() => { playBattleSound('heal', 0.5); fxRef.current?.spawn({ kind: 'aoeWave', from: hFrom, rect: rect2, color: '#5ef0c0', duration: 1.6, variant: 'heal' }) }, hDelay)
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
  }, [game, step, queueTip, PROJ_EMOJI, rectFor, fxCenter, spawnProjectile, cardByName, findCard])

  // ŽMK flash dingsta
  useEffect(() => {
    if (!zmkFlash) return
    const t = setTimeout(() => setZmkFlash(null), 2000)
    return () => clearTimeout(t)
  }, [zmkFlash])
  useEffect(() => { if (!zmkRoll) return; const t = setTimeout(() => setZmkRoll(null), 1900); return () => clearTimeout(t) }, [zmkRoll])

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
        c.type !== 'curse' && game.you.gold >= effectiveCost(game, 'you', c) &&
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
            g2.log.push({ t: 'gold', side: 'you', value: need, key: 'battle.game.tutorialGold' })
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

  // Logą atidarius – nuslenkam į naujausią įvykį (apačią)
  useEffect(() => {
    if (showLog && logScrollRef.current) logScrollRef.current.scrollTop = logScrollRef.current.scrollHeight
  }, [showLog, game?.log.length])

  // ── AI ėjimo ciklas ──
  useEffect(() => {
    if (vsRemote) return  // PvP – jokio AI
    if (!game || game.winner || game.active !== 'ai' || popupBlocks || zmkBlocks || peekBlocks || revealBlocks || summonBlocks || choiceBlocks || copyBlocks || lastwishBlocks || returnBlocks) return
    // Botas „mąsto" 1–3 s tarp veiksmų (žmogiškas tempas — spėji pamatyti kas vyksta).
    // Kai rodomas kino pop-up — botas stabteli 5 s (kad spėtum pamatyti), tada žaidžia toliau.
    // Tutorial scripted ėjimai lieka greiti (1 s), kad pamokos nevilkintų.
    const delay = cine.current ? 5000 : (tutorial?.active ? 1000 : (1000 + Math.floor(Math.random() * 2000)))
    const t = setTimeout(() => {
      setGame((prev) => {
        if (!prev || prev.winner || prev.active !== 'ai') return prev
        try {
          const g = cloneState(prev)
          if (tutorial?.active && tutorial.enemyTurn) { tutorial.enemyTurn(g); return g }
          const act = aiNextAction(g, { difficulty, weights: aiStrategy })
          if (!act) {
            endTurn(g)
            if (!g.winner) beginTurn(g)
          }
          return g
        } catch (err) {
          // AI klaida neturi sugriauti viso žaidimo – tiesiog saugiai baigiam ėjimą.
          console.error('[AI] klaida sprendžiant ėjimą – baigiu AI ėjimą:', err)
          const g2 = cloneState(prev)
          try { endTurn(g2); if (!g2.winner) beginTurn(g2) } catch { /* */ }
          return g2
        }
      })
    }, delay)
    return () => clearTimeout(t)
  }, [game, popupBlocks, zmkBlocks, peekBlocks, revealBlocks, summonBlocks, choiceBlocks, copyBlocks, lastwishBlocks, returnBlocks, difficulty, ranked, aiStrategy, cine.current])

  // ── Žaidėjo veiksmai ──
  const myTurn = !!game && game.active === 'you' && !game.winner

  // ── Kovos atlygis + level-up šventė (config-driven v2; bot/unranked; ne demo/ranked/campaign) ──
  // Ranked atlygis skiriamas RankedClient. Bot/unranked eina per rvn_report_match_v2
  // (config reikšmės, validumas, dienos cap, level rewards) — vienas šaltinis.
  const [matchReward, setMatchReward] = useState<{ gold: number; xp: number; seasonXp: number; before: number; after: number; valid: boolean; levelRewards: LevelRewardEntry[] } | null>(null)
  const matchRewardRef = useRef(false)
  useEffect(() => {
    if (!game?.winner || matchRewardRef.current) return
    if (deckId === DEMO_DECK_ID || ranked || onCampaignResult) return
    matchRewardRef.current = true
    const won = game.winner === 'you'
    const mode: MatchMode = vsRemote ? 'unranked' : 'bot'
    const durationSeconds = Math.round((Date.now() - (matchStartRef.current || Date.now())) / 1000)
    const turns = game.globalTurn
    reportMatchV2({
      clientMatchId: clientMatchIdRef.current, mode, result: won ? 'win' : 'loss',
      durationSeconds, turns, playerActions: turns, opponentActions: turns,
      opponentId: net?.opponentId ?? null, opponentType: vsRemote ? 'human' : 'bot',
    }).then((r) => {
      if (!r) return
      const before = r.accountXpBefore ?? 0
      const after = r.accountXpAfter ?? before
      setMatchReward({
        gold: r.rewards?.silver ?? 0, xp: r.rewards?.account_xp ?? 0, seasonXp: r.rewards?.season_xp ?? 0,
        before, after, valid: !!r.valid, levelRewards: r.levelRewards ?? [],
      })
      if (r.valid && getLevelForXp(after) > getLevelForXp(before)) { try { playSuccess() } catch { /* fx niekada nelaužia UI */ } }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game?.winner])

  // Ranked rezultato pranešimas tėvui (kovai pasibaigus; tik kartą)
  const rankedReportedRef = useRef(false)
  const hpLowestRef = useRef(40)
  useEffect(() => { if (game?.you) hpLowestRef.current = Math.min(hpLowestRef.current, game.you.hp) }, [game?.you?.hp])
  useEffect(() => {
    if (!ranked || !game?.winner || rankedReportedRef.current) return
    rankedReportedRef.current = true
    const meWon = game.winner === 'you' // ir host'as, ir svečias lokaliai mato save kaip 'you' (swapPerspective)
    const me = game.you, opp = game.ai
    const cnt = (arr: typeof me.discard, t: string) => arr.filter((c) => c.type === t).length
    const creaturesLost = cnt(me.discard, 'unit'), creaturesKilled = cnt(opp.discard, 'unit')
    const championsLost = cnt(me.discard, 'champion'), championsKilled = cnt(opp.discard, 'champion')
    void recordRankedMatch({ clientMatchId: clientMatchIdRef.current, result: meWon ? 'win' : 'loss',
      durationSeconds: Math.round((Date.now() - (matchStartRef.current || Date.now())) / 1000),
      turns: game.globalTurn, playerActions: game.globalTurn, opponentActions: game.globalTurn, opponentId: net?.opponentId ?? null })
    onRankedResult?.({
      result: meWon ? 'win' : 'loss',
      turns: game.globalTurn,
      stats: {
        creaturesKilled, creaturesLost, championsKilled, championsLost,
        totalKills: creaturesKilled + championsKilled, totalDeaths: creaturesLost + championsLost,
        damageDealtToEnemyPlayer: Math.max(0, opp.maxHp - opp.hp), damageTaken: Math.max(0, me.maxHp - me.hp),
        cardsPlayed: 0, spellsPlayed: cnt(me.discard, 'spell'), effectsTriggered: 0,
        hpRemaining: Math.max(0, me.hp), hpLowest: hpLowestRef.current,
      },
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game?.winner])

  // Dienos užduočių įvykiai (sužaista kova + pergalė) — ne tutorial/demo
  const questReportedRef = useRef(false)
  useEffect(() => {
    if (!game?.winner || questReportedRef.current) return
    if (deckId === DEMO_DECK_ID) return
    questReportedRef.current = true
    reportQuestEvent('play_match')
    if (game.winner === 'you') reportQuestEvent((vsRemote || ranked) ? 'pvp_win' : 'pve_win')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game?.winner])

  // ── Campaign mode: pranešam kovos rezultatą runtime'ui (tik kartą; nieko nekeičia) ──
  const campReportedRef = useRef(false)
  useEffect(() => {
    if (!onCampaignResult || !game?.winner || campReportedRef.current) return
    campReportedRef.current = true
    const me = game.you, opp = game.ai
    const cnt = (arr: typeof me.discard, t: string) => arr.filter((c) => c.type === t).length
    onCampaignResult({
      result: game.winner === 'you' ? 'win' : 'lose',
      turns: game.globalTurn,
      stats: {
        spellsPlayed: cnt(me.discard, 'spell'),
        creaturesKilled: cnt(opp.discard, 'unit'),
        championsKilled: cnt(opp.discard, 'champion'),
        hpRemaining: Math.max(0, me.hp),
        hpLowest: hpLowestRef.current,
      },
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game?.winner])

  // ── PvP realtime: kanalas + veiksmų dispečeris ──
  const channelRef = useRef<RealtimeChannel | null>(null)
  const deckCardsRef = useRef<TutCard[] | null>(null)
  useEffect(() => { deckCardsRef.current = deckCards }, [deckCards])
  const [chReady, setChReady] = useState(false)
  const [chatLog, setChatLog] = useState<{ mine: boolean; text: string }[]>([])
  const [chatInput, setChatInput] = useState('')
  const [chatOpen, setChatOpen] = useState(false)
  const [emoteBubble, setEmoteBubble] = useState<{ side: Side; text: string; id: number } | null>(null)
  const emoteCdRef = useRef(0)
  const [friendAdded, setFriendAdded] = useState<'idle' | 'sent' | 'exists'>('idle')
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
        ch.send({ type: 'broadcast', event: 'skin', payload: { back: EQUIPPED_BACK } })
      })
      // Svečias atsiunčia savo (pasirinktą) kaladę – host ja sukuria AI pusę (be DB/RLS).
      ch.on('broadcast', { event: 'deck' }, ({ payload }) => {
        const cards = (payload as { cards?: TutCard[] }).cards
        if (cards && cards.length > 0) setOppCards(cards)
      })
    } else {
      ch.on('broadcast', { event: 'state' }, ({ payload }) => {
        setGame(swapPerspective(payload as GameState))
      })
      // Host prašo svečio kaladės – atsiunčiam pasirinktą kaladę
      ch.on('broadcast', { event: 'reqdeck' }, () => {
        const cards = deckCardsRef.current
        if (cards && cards.length > 0) ch.send({ type: 'broadcast', event: 'deck', payload: { cards } })
      })
    }
    // Varžovo nugarėlė (kosmetika). Backward-safe: senas klientas be handler'io ignoruoja.
    ch.on('broadcast', { event: 'skin' }, ({ payload }) => {
      const b = (payload as { back?: SkinVisual | null }).back ?? null
      setOppBack(b, true); setSkinTick((t) => t + 1)
    })
    ch.on('broadcast', { event: 'chat' }, ({ payload }) => { const txt = (payload as { text?: string }).text; if (txt) setChatLog((l) => [...l.slice(-40), { mine: false, text: txt }]) })
    ch.on('broadcast', { event: 'emote' }, ({ payload }) => { const t = (payload as { text?: string }).text; if (!t) return; const id = Date.now(); setEmoteBubble({ side: 'ai', text: t, id }); window.setTimeout(() => setEmoteBubble((b) => b && b.id === id ? null : b), 3000) })
    ch.on('presence', { event: 'sync' }, () => {
      const st = ch.presenceState() as Record<string, { side?: Side }[]>
      let opp = false
      for (const arr of Object.values(st)) for (const meta of arr) { if (meta.side && meta.side !== net.mySide) opp = true }
      if (opp) sawOppRef.current = true
      setOppPresent(opp)
    })
    ch.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        try { await ch.track({ side: net.mySide }) } catch { /* */ }
        setChReady(true)
        ch.send({ type: 'broadcast', event: 'skin', payload: { back: EQUIPPED_BACK } })
        if (net.isHost) {
          ch.send({ type: 'broadcast', event: 'reqdeck', payload: {} })
        } else {
          ch.send({ type: 'broadcast', event: 'hello', payload: {} })
          const cards = deckCardsRef.current
          if (cards && cards.length > 0) ch.send({ type: 'broadcast', event: 'deck', payload: { cards } })
        }
      }
    })
    channelRef.current = ch
    setOppBack(null)
    return () => { supabase.removeChannel(ch); channelRef.current = null; setOppBack(null) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [net?.matchId])

  const sendBattleChat = () => {
    const txt = chatInput.trim(); if (!txt || !channelRef.current) return
    channelRef.current.send({ type: 'broadcast', event: 'chat', payload: { text: txt } })
    setChatLog((l) => [...l.slice(-40), { mine: true, text: txt }]); setChatInput('')
  }

  // ── Emote (F5): 5s cooldown; bubble prie savo avataro 3s; PvP -> broadcast 'emote' (senas klientas be handler'io tyliai ignoruoja) ──
  const sendEmote = (text: string) => {
    const now = Date.now()
    if (now < emoteCdRef.current) return
    emoteCdRef.current = now + 5000
    const id = now
    setEmoteBubble({ side: 'you', text, id })
    window.setTimeout(() => setEmoteBubble((b) => b && b.id === id ? null : b), 3000)
    if (vsRemote) channelRef.current?.send({ type: 'broadcast', event: 'emote', payload: { text } })
  }
  const renderEmoteBubbleH = (side: Side) => {
    if (!emoteBubble || emoteBubble.side !== side) return null
    return (
      <div className="absolute left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-2xl text-xl whitespace-nowrap z-40 pointer-events-none"
        style={{ [side === 'ai' ? 'top' : 'bottom']: '100%', marginTop: side === 'ai' ? 4 : undefined, marginBottom: side === 'you' ? 4 : undefined, background: 'rgba(20,14,30,0.96)', border: '1px solid rgba(240,180,41,0.55)', boxShadow: '0 6px 18px rgba(0,0,0,0.7)', animation: 'rvnEmotePop 0.25s ease-out' }}>
        {emoteBubble.text}
      </div>
    )
  }
  // Host transliuoja autoritetinę būseną po kiekvieno pasikeitimo
  useEffect(() => {
    if (isHost && game && channelRef.current) {
      channelRef.current.send({ type: 'broadcast', event: 'state', payload: game })
    }
  }, [game, isHost])

  // Svečias: turėdamas savo kaladę ir paruoštą kanalą – atsiunčia ją host'ui (kad
  // host sukurtų AI pusę iš TIKROS svečio kaladės, o ne nukristų į savo kaladę).
  useEffect(() => {
    if (!net || net.isHost || !chReady || !deckCards || deckCards.length === 0) return
    channelRef.current?.send({ type: 'broadcast', event: 'deck', payload: { cards: deckCards } })
  }, [net, chReady, deckCards])

  // PvP host saugiklis: jei per 8s negavom svečio kaladės (senas klientas) – tęsiam (fallback).
  useEffect(() => {
    if (!net || !isHost || game || oppCards !== null) return
    const t = setTimeout(() => setOppCards((c) => (c === null ? [] : c)), 8000)
    return () => clearTimeout(t)
  }, [net, isHost, game, oppCards])

  // PvP reconnect: išsaugom aktyvią partiją (kad galima grįžti); host saugo ir būseną
  useEffect(() => {
    if (!net) return
    try {
      localStorage.setItem(PVP_ACTIVE_KEY, JSON.stringify({
        matchId: net.matchId, isHost: net.isHost, mySide: net.mySide, opponentId: net.opponentId ?? null,
        deckId, opponentDeckId: opponentDeckId ?? null, opponentName: opponentName ?? null, deckName, ts: Date.now(),
      }))
    } catch { /* */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [net?.matchId])
  useEffect(() => {
    if (!net || !game) return
    if (isHost) { try { localStorage.setItem(pvpStateKey(net.matchId), JSON.stringify(game)) } catch { /* */ } }
    if (game.winner) { try { localStorage.removeItem(PVP_ACTIVE_KEY); localStorage.removeItem(pvpStateKey(net.matchId)) } catch { /* */ } }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game, isHost, net?.matchId])

  // PvP grace: varžovui atsijungus – 30s laukiam; neprisijungus – pergalė
  useEffect(() => {
    const stop = () => { if (graceRef.current) { clearInterval(graceRef.current); graceRef.current = null } }
    if (!net || !game || game.winner || oppPresent || !sawOppRef.current) { stop(); setOppMissingLeft(null); return }
    if (graceRef.current) return
    let left = 30
    setOppMissingLeft(left)
    graceRef.current = setInterval(() => {
      left -= 1
      setOppMissingLeft(left)
      if (left <= 0) {
        stop()
        setGame((g) => { if (!g || g.winner) return g; const c = cloneState(g); c.winner = 'you'; c.log.push({ t: 'win', side: 'you', key: 'battle.game.opponentNoShow' }); return c })
        try { localStorage.removeItem(PVP_ACTIVE_KEY); localStorage.removeItem(pvpStateKey(net.matchId)) } catch { /* */ }
      }
    }, 1000)
    return stop
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [oppPresent, game?.winner, net?.matchId])

  /** Struktūruotas veiksmas: svečias siunčia host'ui, host/lokalus – taiko vietoje. */
  const doAction = useCallback((a: NetAction) => {
    if ((a.t === 'play' || a.t === 'resolveLastwish') && 'targets' in a && a.targets && a.targets.length > 1) chosenTargetsRef.current = a.targets
    if (isGuest) {
      channelRef.current?.send({ type: 'broadcast', event: 'action', payload: swapAction(a) })
      return
    }
    setGame((prev) => {
      if (!prev) return prev
      const g = cloneState(prev)
      if (tutorial?.active && tutorial.gate) {
        const v = tutorial.gate(a, g)
        if (!v.ok) { if (v.hint) pushToast(v.hint); return prev }
      }
      const r = applyNetAction(g, a)
      if (r && !r.ok) {
        pushToast(r.reason ?? 'Veiksmas negalimas')
        // Status VFX: bandymas veikti su frozen/stunned → trigger animacija ant kortos
        const aid = (a as { uid?: string; attackerUid?: string }).attackerUid ?? (a as { uid?: string }).uid
        if (aid && r.reason) {
          const st = r.reason === 'battleLog.err.unitFrozen' ? 'frozen' : r.reason === 'battleLog.err.unitStunned' ? 'stunned' : null
          if (st) publishStatusVfx({ seq: -(Date.now() * 4 + Math.floor(Math.random() * 4)), type: 'trigger', cardId: aid, statusId: st })
        }
        return prev
      }
      return g
    })
  }, [isGuest, pushToast, tutorial])

  // Paskutinis noras su rankiniu taikiniu: įjungiam taikinio pasirinkimo režimą.
  // Jei tinkamų taikinių nebėra (pvz. visi jau žuvo) – auto-resolve.
  useEffect(() => {
    const pl = game?.pendingLastwish
    if (!pl || pl.side !== 'you' || game?.winner) return
    if (select?.kind === 'lastwish') return
    const m = pl.mappings[0]
    if (!m) return
    const avail = spellTargetRefs(game!, 'you', m)
    if (avail.length === 0) { doAction({ t: 'resolveLastwish', targets: [] }); return }
    const need = Math.min(Math.max(1, m.hitCount ?? 1), avail.length)
    setSelect({ kind: 'lastwish', need, picked: [] })
    pushToast(t('battle.game.toastLastwishTarget', { card: pl.cardName, need }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game?.pendingLastwish, game?.winner])

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

  // PvP: ėjimo laikmatis. PERF: parent laiko tik deadline (1 render per ėjimą);
  // tiksintis skaičius renderinamas izoliuotame <TurnTimer/> — visas board
  // NEBE re-renderinamas kas 500 ms. Pabaigos tikrinimas čia — be setState.
  useEffect(() => {
    if (!(vsRemote || ranked) || !game || game.winner) { setTurnDeadline(null); return }
    const deadline = Date.now() + 120_000
    setTurnDeadline(deadline)
    const iv = setInterval(() => {
      if (Date.now() >= deadline) {
        clearInterval(iv)
        if (game.active === 'you') doAction({ t: 'endTurn', actor: 'you' })
      }
    }, 500)
    return () => clearInterval(iv)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vsRemote, ranked, game?.globalTurn, game?.active, game?.winner])

  // Savo profilio vardas (ėjimo juostai)
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      const uid = data.user?.id
      if (!uid) return
      supabase.from('profiles').select('username, display_name').eq('id', uid).maybeSingle()
        .then(({ data: p }) => { const pr = p as { username?: string; display_name?: string } | null; if (pr) setMyName(pr.display_name || pr.username || null) })
    })
  }, [])

  // Backstop: jei dėl kokios nors priežasties 'win' įvykio seka nesuveikė – pabaigos
  // ekranas vis tiek parodomas po 6 s (o avataras pažymimas subyrėjusiu iškart).
  useEffect(() => {
    if (!game?.winner || endShown) return
    if (!avatarDead) setAvatarDead(game.winner === 'you' ? 'ai' : 'you')
    const tm = window.setTimeout(() => setEndShown(true), 6000)
    return () => window.clearTimeout(tm)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game?.winner, endShown])

  // Ėjimui pasikeitus – per vidurį ekrano parodom kieno eilė (nickas + „eilė")
  useEffect(() => {
    if (!game || game.winner) return
    if (game.globalTurn === lastTurnRef.current) return
    lastTurnRef.current = game.globalTurn
    if (game.globalTurn === 0) return
    const you = game.active === 'you'
    const name = you ? (myName || t('battle.game.you')) : (oppProfile?.display_name || oppProfile?.username || opponentName || t('battle.game.opponent'))
    setTurnBanner({ name, you })
    const tm = setTimeout(() => setTurnBanner(null), 1600)
    return () => clearTimeout(tm)
  }, [game?.globalTurn, game?.active, game?.winner, myName, oppProfile, opponentName])

  const onHandCardClick = (c: TutCard) => {
    if (!myTurn) { pushToast(t('battle.game.toastWaitTurn')); return }
    if (popupBlocks) return
    if (step?.require === 'end-turn') { pushToast(t('battle.game.toastEndTurnNow')); return }
    if (select?.kind === 'discard') {
      doAction({ t: 'discardForGold', actor: 'you', uid: c.uid })
      setSelect(null)
      return
    }
    if (select?.kind === 'sacrifice') {
      if (c.uid === select.cardUid) { pushToast(t('battle.game.toastNoSacChampion')); return }
      const picked = select.picked.includes(c.uid) ? select.picked : [...select.picked, c.uid]
      if (picked.length >= 2) {
        doAction({ t: 'play', actor: 'you', uid: select.cardUid, tributeHandUids: picked.slice(0, 2) })
        setSelect(null)
      } else {
        playUiClick()
        setSelect({ ...select, picked })
        pushToast(t('battle.game.toastTributeHand', { picked: picked.length }))
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
        pushToast(t('battle.game.toastNeedPhase', { phase: ph - 1 }))
        return
      }
      const hasBoardSac = game!.you.units.some((u) => u && !u.isChampion)
      const handSacCount = game!.you.hand.filter((h) => h.uid !== c.uid).length
      if (!hasBoardSac && handSacCount < 2) { pushToast(t('battle.game.toastChampionTribute')); return }
      { const cNow = effectiveCost(game!, 'you', c); if (game!.you.gold < cNow) { pushToast(t('battle.game.toastNotEnoughGold', { cost: cNow, gold: game!.you.gold })); return } }
      playUiClick()
      setSelect({ kind: 'sacrifice', cardUid: c.uid, picked: [] })
      pushToast(t('battle.game.toastTributeHint'))
      return
    }
    const selMap = selectionMappingFor(c)
    const legacyNeedsTarget = (c.type === 'spell' || (c.type === 'unit' && c.keywords.includes('battlecry'))) && !!c.effect?.targeted
    if (selMap || legacyNeedsTarget) {
      const cNow = effectiveCost(game!, 'you', c)
      if (game!.you.gold < cNow) { pushToast(t('battle.game.toastNotEnoughGold', { cost: cNow, gold: game!.you.gold })); return }
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
      pushToast(t('battle.game.toastPickEffectTarget'))
      return
    }
    doAction({ t: 'play', actor: 'you', uid: c.uid })
    setSelect(null)
  }

  const onMyUnitClick = (u: BoardUnit) => {
    if (popupBlocks) return
    if (select?.kind === 'lastwish') { toggleSpellTarget({ kind: 'unit', side: 'you', uid: u.uid }); return }
    if (!myTurn) return
    if (Date.now() - dragEndRef.current < 350) return
    if (select?.kind === 'sacrifice') {
      if (u.isChampion) { pushToast(t('battle.game.toastCannotSacChampion')); return }
      const cardUid = select.cardUid
      doAction({ t: 'play', actor: 'you', uid: cardUid, sacrificeUid: u.uid })
      setSelect(null)
      return
    }
    if (select?.kind === 'spell' || select?.kind === 'spellMulti') {
      toggleSpellTarget({ kind: 'unit', side: 'you', uid: u.uid })
      return
    }
    // Special summon Kovos šūksnis laukia taikinio: paspaudus švytinčią kortą → taikinio režimas
    if (game?.pendingBattlecry?.side === 'you' && game.pendingBattlecry.uid === u.uid) {
      playUiClick()
      setSelect(select?.kind === 'battlecry' && select.uid === u.uid ? null : { kind: 'battlecry', uid: u.uid })
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

  // ── Burto taikinių pažymėjimas: bakstelk = pažymi (✓), dar kartą = atžymi; „Gerai" patvirtina ──
  const toggleSpellTarget = (tr: TargetRef) => {
    if (select?.kind === 'spell') {
      const same = select.picked && targetRefKey(select.picked) === targetRefKey(tr)
      playUiClick()
      setSelect({ ...select, picked: same ? null : tr })
    } else if (select?.kind === 'spellMulti' || select?.kind === 'lastwish') {
      const key = targetRefKey(tr)
      const exists = select.picked.some((p) => targetRefKey(p) === key)
      if (exists) { playUiClick(); setSelect({ ...select, picked: select.picked.filter((p) => targetRefKey(p) !== key) }); return }
      if (select.picked.length >= select.need) { pushToast(t('battle.game.toastAlreadyPicked', { need: select.need })); return }
      playUiClick()
      setSelect({ ...select, picked: [...select.picked, tr] })
    }
  }
  const confirmSpellTargets = () => {
    if (select?.kind === 'spell') {
      if (!select.picked) { pushToast(t('battle.game.toastPickTargetFirst')); return }
      playUiClick()
      doAction({ t: 'play', actor: 'you', uid: select.uid, target: select.picked })
      setSelect(null)
    } else if (select?.kind === 'spellMulti') {
      if (select.picked.length !== select.need) { pushToast(t('battle.game.toastPickNTargets', { need: select.need })); return }
      playUiClick()
      doAction({ t: 'play', actor: 'you', uid: select.uid, targets: select.picked })
      setSelect(null)
    } else if (select?.kind === 'lastwish') {
      if (select.picked.length !== select.need) { pushToast(t('battle.game.toastPickNTargets', { need: select.need })); return }
      playSuccess()
      doAction({ t: 'resolveLastwish', targets: select.picked })
      setSelect(null)
    }
  }

  const onTargetClick = (t: TargetRef) => {
    if (popupBlocks) return
    if (select?.kind === 'lastwish') { toggleSpellTarget(t); return }
    if (!myTurn) return
    if (Date.now() - dragEndRef.current < 350) return
    if (select?.kind === 'attacker') {
      const uid = select.uid
      doAction({ t: 'attack', actor: 'you', uid, target: t })
      setSelect(null)
    } else if (select?.kind === 'battlecry') {
      playSuccess()
      doAction({ t: 'resolveBattlecry', target: t })
      setSelect(null)
    } else if (select?.kind === 'spell' || select?.kind === 'spellMulti') {
      toggleSpellTarget(t)
    }
  }

  const onEndTurn = () => {
    if (!myTurn || popupBlocks) return
    if (step && step.require && step.require !== 'end-turn') { pushToast(t('battle.game.toastDoTaskFirst')); return }
    playUiClick()
    setSelect(null)
doAction({ t: 'endTurn', actor: 'you' })
  }

  // teisėti taikiniai pažymėjimui
  const targetSet = useMemo(() => {
    if (!game) return new Set<string>()
    // Atakos tempimas → pažymim teisėtus atakos taikinius
    if (drag?.attackUid) {
      const atkU = game.you.units.find((u) => u?.uid === drag.attackUid) ?? undefined
      const ts = legalTargets(game, 'you', atkU)
      return new Set(ts.map((t) => t.kind + ':' + ('uid' in t ? t.uid : t.side)))
    }
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
      const atkU = game.you.units.find((u) => u?.uid === select.uid) ?? undefined
      const ts = legalTargets(game, 'you', atkU)
      return new Set(ts.map((t) => t.kind + ':' + ('uid' in t ? t.uid : t.side)))
    }
    if (select.kind === 'battlecry') {
      const pb = game.pendingBattlecry
      const un = game.you.units.find((x) => x?.uid === select.uid)
      const m = un && pb && pb.uid === select.uid ? (un.card.mappings ?? [])[pb.idx[0]] : null
      const st = new Set<string>()
      if (m) for (const t of spellTargetRefs(game, 'you', m)) st.add(targetRefKey(t))
      return st
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
    if (select.kind === 'lastwish') {
      const m = game.pendingLastwish?.mappings[0]
      const s = new Set<string>()
      if (m) for (const t of spellTargetRefs(game, 'you', m)) s.add(targetRefKey(t))
      return s
    }
    return new Set<string>()
  }, [game, select, drag])

  // Pažymėtų (✓) taikinių raktai burto select metu
  const pickedKeys = useMemo(() => {
    if (select?.kind === 'spell') return new Set<string>(select.picked ? [targetRefKey(select.picked)] : [])
    if (select?.kind === 'spellMulti' || select?.kind === 'lastwish') return new Set<string>(select.picked.map(targetRefKey))
    return new Set<string>()
  }, [select])
  const canConfirmTargets = select?.kind === 'spell' ? !!select.picked
    : (select?.kind === 'spellMulti' || select?.kind === 'lastwish') ? select.picked.length === select.need : false

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

  // Ataka tempimu: tempk savo padarą ant priešo taikinio (drag&drop). Palietimas (be tempimo) = įprastas pasirinkimas.
  const beginUnitDrag = (u: BoardUnit, e: React.PointerEvent) => {
    if (!myTurn || popupBlocks || !game) return
    if (u.isChampion) return
    if (!canUnitAttack(game, 'you', u).ok) return
    const sx = e.clientX, sy = e.clientY
    // Rodyklės pradžia matuojama GYVAI tempimo pradžios momentu (ne iš seno snapshot,
    // kuris pasensta laukui pasislinkus – summon banner/shake/nauji padarai).
    const liveOrigin = () => {
      const el = document.querySelector('[data-unit-uid="' + u.uid + '"]')
      const r = el?.getBoundingClientRect()
      return r ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : (unitRectsRef.current.get(u.uid) ?? { x: sx, y: sy })
    }
    let started = false
    const cleanup = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
    }
    function move(ev: PointerEvent) {
      if (!started) {
        if (Math.hypot(ev.clientX - sx, ev.clientY - sy) < 10) return
        started = true; dragMovedRef.current = true
        if (lpRef.current) { clearTimeout(lpRef.current); lpRef.current = null }
        const d: DragState = { card: u.card, uid: u.uid, targeted: true, attackUid: u.uid, origin: liveOrigin(), x: ev.clientX, y: ev.clientY, mode: 'arrow' }
        dragRef.current = d; setDrag(d)
      }
      const d = dragRef.current; if (!d) return
      const nd: DragState = { ...d, x: ev.clientX, y: ev.clientY }
      dragRef.current = nd; setDrag(nd)
    }
    function up(ev: PointerEvent) {
      cleanup()
      if (!started) return  // palietimas – tegul suveikia onClick (pasirinkti puolėją)
      dragEndRef.current = Date.now()
      const d = dragRef.current; dragRef.current = null; setDrag(null)
      if (!d) return
      const tgt = elToTargetRef(document.elementFromPoint(ev.clientX, ev.clientY))
      if (!tgt || !game) return
      const key = tgt.kind + ':' + ('uid' in tgt ? tgt.uid : tgt.side)
      const atkU = game.you.units.find((u) => u?.uid === d.uid) ?? undefined
      const ok = legalTargets(game, 'you', atkU).some((t) => (t.kind + ':' + ('uid' in t ? t.uid : t.side)) === key)
      if (ok) { doAction({ t: 'attack', actor: 'you', uid: d.uid, target: tgt }); setSelect(null) }
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
  }

  // Vienas pirštas: tempimas Į ŠONUS = ranka scrollinama (native pan-x), tempimas AUKŠTYN = žaidžiama korta.
  const beginHandPointer = (card: TutCard, e: React.PointerEvent) => {
    if (popupBlocks) return
    if (!myTurn) {
      // Priešo ėjimo metu ranką galima IŠSKLEISTI/SUTRAUKTI (žaisti negalima)
      const sx0 = e.clientX, sy0 = e.clientY
      const up0 = (ev: PointerEvent) => {
        window.removeEventListener('pointerup', up0)
        if (Math.hypot(ev.clientX - sx0, ev.clientY - sy0) < 12 && hMobile) { playUiClick(); setHandExpanded((v) => !v) }
      }
      window.addEventListener('pointerup', up0)
      return
    }
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
          if (!hMobile) { onHandCardClick(card); return }  // desktop: bakstelėjimas = žaisti/pasirinkti
          // Kompaktiška ranka: 1-as bakst = išsiskleisti; 2-as bakst = tik sutraukti (žaidžiama TIK tempiant aukštyn – drag&drop)
          if (!handExpanded) { playUiClick(); setHandExpanded(true) }
          else { playUiClick(); setHandExpanded(false) }
        }
        return
      }
      dragEndRef.current = Date.now()
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
  const renderPile = (label: string, count: number, opts?: { tut?: string; faceUp?: boolean; cards?: TutCard[]; pileKey?: string; back?: 'plain' | 'curse' | 'zmk'; big?: boolean; w?: number }) => {
    const interactive = !!opts?.cards && count > 0
    const open = () => opts?.cards && setPileView({ title: label, cards: opts.cards })
    const pw = opts?.w ?? (opts?.big ? (isTouch ? 56 : 96) : (isTouch ? 34 : 52))
    const ph = Math.round(pw * 4 / 3)
    const topCard = opts?.faceUp && opts?.cards && opts.cards.length > 0 ? opts.cards[opts.cards.length - 1] : null
    const hasArt = !!topCard || (!!opts?.back && count > 0)
    return (
      <div data-tut={opts?.tut} data-pile={opts?.pileKey} className="flex flex-col items-center gap-0.5">
        <div
          className={'relative rounded-md overflow-hidden flex items-center justify-center ' + (interactive ? 'cursor-pointer' : '')}
          style={{
            width: pw, height: ph,
            background: hasArt ? '#0d0a14' : opts?.faceUp ? 'rgba(240,180,41,0.08)' : 'linear-gradient(145deg, #1a1325, #0d0a14)',
            border: '1px solid rgba(240,180,41,0.3)',
            opacity: count === 0 ? 0.4 : 1,
          }}
          onMouseEnter={interactive ? open : undefined}
          onMouseLeave={interactive ? () => setPileView(null) : undefined}
          onTouchStart={interactive ? () => { lpRef.current = setTimeout(open, 320) } : undefined}
          onTouchEnd={interactive ? () => { if (lpRef.current) { clearTimeout(lpRef.current); lpRef.current = null } } : undefined}
          onTouchMove={interactive ? () => { if (lpRef.current) { clearTimeout(lpRef.current); lpRef.current = null } } : undefined}
          title={interactive ? t('battle.game.pileInspect', { count }) : undefined}>
          {topCard ? <MiniCard c={topCard} w={pw} /> : (opts?.back && count > 0 ? <PileBack kind={opts.back} owner={opts?.pileKey?.includes('-ai') ? 'opp' : 'me'} /> : null)}
          <span className={hasArt ? 'absolute bottom-0 right-0 px-1 rounded-tl-md text-[10px] font-bold' : 'text-[11px] font-bold'}
            style={{ color: 'var(--gold)', background: hasArt ? 'rgba(0,0,0,0.8)' : 'transparent', lineHeight: hasArt ? '1.3' : undefined }}>{count}</span>
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
      <div data-tut={tut} className={"flex flex-wrap justify-center gap-1 sm:gap-2 items-center " + (hMobile ? "min-h-[56px]" : "min-h-[80px] sm:min-h-[124px]")}>
        <AnimatePresence>
          {Array.from({ length: slots }).map((_, i) => { const u = p.units[i]; return u ? (
            <motion.div key={u.uid} data-unit-uid={u.uid}
              initial={{ y: -32, scale: 0.82, opacity: 0 }}
              animate={{ y: 0, scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 520, damping: 16, mass: 0.7 }}
              onPointerDown={side === 'you' ? (e) => beginUnitDrag(u, e) : undefined}
              style={side === 'you' ? { touchAction: 'none' } : undefined}
              onContextMenu={(e) => { e.preventDefault(); setInspect(u.card) }}
              onMouseEnter={!isTouch ? (ev) => setHoverCard({ card: u.card, x: ev.clientX, y: ev.clientY }) : undefined}
              onMouseMove={!isTouch ? (ev) => setHoverCard((hh) => hh ? { ...hh, x: ev.clientX, y: ev.clientY } : { card: u.card, x: ev.clientX, y: ev.clientY }) : undefined}
              onMouseLeave={!isTouch ? () => setHoverCard(null) : undefined}
              onTouchStart={() => { lpRef.current = setTimeout(() => { playCardFlip(); setInspect(u.card) }, 450) }}
              onTouchEnd={() => { if (lpRef.current) { clearTimeout(lpRef.current); lpRef.current = null } }}
              onTouchMove={() => { if (lpRef.current) { clearTimeout(lpRef.current); lpRef.current = null } }}>
              <UnitTile
                g={game} u={u} w={unitW} hpShown={hpHold[u.uid]}
                selected={(select?.kind === 'attacker' && select.uid === u.uid) || (select?.kind === 'battlecry' && select.uid === u.uid) || (game.pendingBattlecry?.side === 'you' && game.pendingBattlecry.uid === u.uid)}
                picked={pickedKeys.has('unit:' + u.uid)}
                targetable={side === 'ai' ? targetSet.has('unit:' + u.uid) : (select?.kind === 'spell' || select?.kind === 'sacrifice') && targetSet.has('unit:' + u.uid) || (select?.kind === 'sacrifice' && !u.isChampion)}
                canAct={side === 'you' && myTurn && !u.isChampion && canUnitAttack(game, 'you', u).ok}
                dimmed={
                  (select?.kind === 'attacker' || select?.kind === 'spell') && side === 'ai' && !targetSet.has('unit:' + u.uid) ||
                  select?.kind === 'sacrifice' && side === 'you' && u.isChampion
                }
                onClick={() => side === 'you' ? onMyUnitClick(u) : onTargetClick({ kind: 'unit', side: 'ai', uid: u.uid })}
              />
            </motion.div>
          ) : (
            <div key={side + '-slot-' + i} className="rounded-lg flex items-center justify-center"
              style={{
                width: unitW, height: Math.round(unitW * 4 / 3),
                border: myDropGlow ? '2px solid rgba(74,222,128,0.85)' : '1px solid rgba(240,180,41,0.22)',
                background: myDropGlow ? 'rgba(74,222,128,0.12)' : 'linear-gradient(160deg, rgba(28,23,38,0.9), rgba(10,8,14,0.92))',
                boxShadow: myDropGlow ? '0 0 16px rgba(74,222,128,0.6)' : 'inset 0 2px 12px rgba(0,0,0,0.65), inset 0 0 0 1px rgba(240,180,41,0.05)',
                transition: 'box-shadow 0.15s, border-color 0.15s',
              }}>{slotTypeIcon('unit', Math.round(unitW * 0.44), '✦', 'var(--gold)')}</div>
          ) })}
        </AnimatePresence>
      </div>
    )
  }

  const renderArtifactRow = (side: Side) => {
    if (!game) return null
    const p = P(game, side)
    return (
      <div data-tut={side === 'you' ? 'artifacts' : undefined} className="flex justify-center gap-1 items-center">
        <div className="flex gap-1">
          {p.artifacts.map((a, i) => a ? (
            <button key={a.uid} data-artifact-uid={a.uid}
              onClick={() => side === 'ai' && onTargetClick({ kind: 'artifact', side: 'ai', uid: a.uid })}
              onContextMenu={(e) => { e.preventDefault(); setInspect(a.card) }}
              className="relative rounded-md overflow-hidden"
              style={{
                width: hMobile ? 42 : isTouch ? 40 : 60, height: hMobile ? 56 : isTouch ? 54 : 72,
                border: pickedKeys.has('artifact:' + a.uid) ? '2px solid #22c55e' : targetSet.has('artifact:' + a.uid) ? '2px solid #ef4444' : '1px solid rgba(240,180,41,0.4)',
              }}>
              {pickedKeys.has('artifact:' + a.uid) && (
                <span className="absolute top-0 right-0 z-30 flex items-center justify-center rounded-bl pointer-events-none" style={{ width: 16, height: 16, background: '#16a34a', color: '#fff', fontSize: 11, fontWeight: 900 }}>✓</span>
              )}
              {a.card.image
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={a.card.image} alt={a.card.name} className="absolute inset-0 w-full h-full object-cover" />
                : <div className="absolute inset-0 flex items-center justify-center text-sm" style={{ background: 'rgba(240,180,41,0.07)' }}>⭐</div>}
              <span className="absolute bottom-0 right-0 px-0.5 rounded-tl text-[9px] font-bold"
                style={{ background: 'rgba(0,0,0,0.85)', color: '#4ade80' }}>{a.hp}</span>
            </button>
          ) : (
            <div key={side + '-art-' + i} className="rounded-md flex items-center justify-center"
              style={{ width: hMobile ? 42 : isTouch ? 40 : 64, height: hMobile ? 56 : isTouch ? 54 : 76, border: '1px solid rgba(205,160,70,0.3)', background: 'linear-gradient(160deg, rgba(34,27,16,0.8), rgba(12,9,6,0.9))', boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.6)' }}>{slotTypeIcon('artifact', hMobile ? 22 : isTouch ? 20 : 28, '⬗', '#cda046')}</div>
          ))}
        </div>
      </div>
    )
  }

  const renderReactionRow = (side: Side) => {
    if (!game) return null
    const p = P(game, side)
    return (
      <div className="flex justify-center gap-1 items-center">
        <div data-tut={side === 'you' ? 'reactions' : undefined} data-pile={'reactions-' + side} className="flex gap-1">
          {p.reactions.map((r, i) => r ? (
            side === 'you' ? (
              // Savo reakcijas gali peržiūrėti (užverstas priešui). Priešo – paslėptos.
              <button key={r.uid} type="button"
                onClick={() => { playUiClick(); setPileView({ title: 'Tavo reakcijos (matai tik tu)', cards: p.reactions.filter((x): x is NonNullable<typeof x> => !!x).map((x) => x.card) }) }}
                title={t('battle.game.reactionsTip')}
                className="relative rounded-md overflow-hidden cursor-pointer"
                style={{ width: hMobile ? 42 : isTouch ? 40 : 60, height: hMobile ? 56 : isTouch ? 54 : 72, background: 'linear-gradient(145deg, #241a38, #0d0a14)', border: '1px solid rgba(139,92,246,0.7)' }}>
                <span className="absolute inset-0 flex items-center justify-center text-sm opacity-70">⚡</span>
                <PileBack kind="curse" />
                <span className="absolute bottom-0 left-0 right-0 text-[7px] text-center" style={{ color: 'rgba(167,139,250,0.9)' }}>👁</span>
                <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 px-1.5 py-0.5 rounded-full text-[11px] font-extrabold"
                  style={{ background: 'rgba(0,0,0,0.92)', color: 'var(--gold)', border: '1px solid rgba(240,180,41,0.6)', boxShadow: '0 2px 8px rgba(0,0,0,0.65)' }}>{r.paid}⚜</span>
              </button>
            ) : (
              <div key={r.uid} className="relative rounded-md overflow-hidden"
                style={{ width: hMobile ? 42 : isTouch ? 40 : 60, height: hMobile ? 56 : isTouch ? 54 : 72, background: 'linear-gradient(145deg, #1a1325, #0d0a14)', border: '1px solid rgba(139,92,246,0.5)' }}>
                <span className="absolute inset-0 flex items-center justify-center text-sm opacity-50">⚡</span>
                <PileBack kind="curse" />
                <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 px-1.5 py-0.5 rounded-full text-[11px] font-extrabold"
                  style={{ background: 'rgba(0,0,0,0.92)', color: 'var(--gold)', border: '1px solid rgba(240,180,41,0.6)', boxShadow: '0 2px 8px rgba(0,0,0,0.65)' }}>{r.paid}⚜</span>
              </div>
            )
          ) : (
            <div key={side + '-rea-' + i} className="rounded-md flex items-center justify-center"
              style={{ width: hMobile ? 42 : isTouch ? 40 : 56, height: hMobile ? 56 : isTouch ? 54 : 70, border: '1px solid rgba(139,92,246,0.4)', background: 'linear-gradient(160deg, rgba(26,19,40,0.85), rgba(10,8,16,0.92))', boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.6)' }}>{slotTypeIcon('reaction', hMobile ? 22 : isTouch ? 20 : 26, '⚡', '#a78bfa')}</div>
          ))}
        </div>
      </div>
    )
  }

  const renderSideZones = (side: Side) => {
    if (!game) return null
    return (
      <div className="flex justify-center gap-3 items-center">
        {renderArtifactRow(side)}
        {renderReactionRow(side)}
      </div>
    )
  }

  const dZone = (label: string, content: React.ReactNode) => (
    <div className="flex flex-col items-center justify-center gap-0.5">
      <span style={{ fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(240,180,41,0.42)' }}>{label}</span>
      {content}
    </div>
  )
  const dFieldRow = () => (
    <div className="flex flex-col items-center justify-center gap-0.5">
      <span style={{ fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(167,139,250,0.6)' }}>Lauko korta · bendra</span>
      <div data-tut="field" className="relative flex items-center justify-center gap-2 rounded-lg overflow-hidden" style={{ width: 244, height: 50, border: game?.field ? '1px solid rgba(167,139,250,0.85)' : '1px solid rgba(167,139,250,0.5)', background: 'linear-gradient(120deg, rgba(42,30,62,0.6), rgba(34,27,16,0.5))', boxShadow: game?.field ? 'inset 0 0 26px rgba(167,139,250,0.28), 0 0 16px rgba(167,139,250,0.3)' : 'inset 0 0 26px rgba(167,139,250,0.18), 0 0 14px rgba(240,180,41,0.12)' }}>
        {game?.field ? (
          <button onClick={() => setInspect(game!.field!.card)} onContextMenu={(e) => { e.preventDefault(); setInspect(game!.field!.card) }} className="absolute inset-0 flex items-center justify-center">
            {/* kortos art uždengia VISĄ slotą */}
            {game.field.card.image
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={game.field.card.image} alt="" draggable={false} className="absolute inset-0 w-full h-full object-cover" style={{ objectPosition: '50% 26%', filter: 'brightness(0.9)' }} />
              : null}
            <span className="absolute inset-0" style={{ background: 'linear-gradient(90deg, rgba(10,8,16,0.75), rgba(10,8,16,0.15) 40%, rgba(10,8,16,0.15) 60%, rgba(10,8,16,0.75))' }} />
            <span className="relative text-[12px] font-bold px-2 truncate" style={{ color: '#fff', fontFamily: 'var(--rvn-font-display)', textShadow: '0 1px 6px rgba(0,0,0,0.9), 0 0 12px rgba(167,139,250,0.5)' }}>{game.field.card.name}</span>
          </button>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-[12px]" style={{ color: 'rgba(240,180,41,0.4)' }}>{slotTypeIcon('field', 26, '🌍', '#a78bfa')} {t('battle.game.fieldEmpty')}</span>
        )}
      </div>
    </div>
  )
  const hpBar = (side: Side, scale = 1) => {
    if (!game) return null
    const p = P(game, side)
    const targetable = side === 'ai' && targetSet.has('player:ai')
    return (
      <button
        data-tut={side === 'you' ? 'hp' : undefined}
        data-player={side}
        onClick={() => {
          if (avLpFired.current) { avLpFired.current = false; return }  // buvo long-press – click praleidžiam
          // Tapinus avatarą – lokaliai groja jo „selected" balsas (savo ar priešo; priešui kitam kliente negroja).
          playAvatarAudio(side === 'you' ? youAvIdRef.current : enemyAvIdRef.current, 'selected')
          if (side === 'ai' && targetable) onTargetClick({ kind: 'player', side: 'ai' })
        }}
        onPointerDown={() => { avLpFired.current = false; avLpRef.current = window.setTimeout(() => { avLpFired.current = true; openAvatarInspect(side) }, 420) }}
        onPointerUp={() => { if (avLpRef.current) window.clearTimeout(avLpRef.current) }}
        onPointerLeave={() => { if (avLpRef.current) window.clearTimeout(avLpRef.current) }}
        onPointerCancel={() => { if (avLpRef.current) window.clearTimeout(avLpRef.current) }}
        onContextMenu={(e) => { e.preventDefault(); openAvatarInspect(side) }}
        className="relative flex items-center justify-center p-0.5 rounded-xl cursor-pointer"
        style={{
          background: 'transparent',
          border: pickedKeys.has('player:' + side) ? '2px solid #22c55e' : targetable ? '2px solid #ef4444' : '2px solid transparent',
          boxShadow: pickedKeys.has('player:' + side) ? '0 0 16px rgba(34,197,94,0.7)' : targetable ? '0 0 14px rgba(239,68,68,0.7)' : 'none',
        }}>
        {pickedKeys.has('player:' + side) && (
          <span className="absolute -top-2 -right-2 z-30 flex items-center justify-center rounded-full pointer-events-none" style={{ width: 20, height: 20, background: '#16a34a', border: '2px solid #bbf7d0', color: '#fff', fontSize: 12, fontWeight: 900 }}>✓</span>
        )}
        <AvatarFrame avatar={side === 'you' ? youAvatar : enemyAvatar} hp={p.hp} maxHp={p.maxHp} owner={side === 'you' ? 'player' : 'enemy'} scale={scale} flash={avatarFlash[side]} dead={avatarDead === side} onVid={(v) => (side === 'you' ? setYouVid(v) : setEnemyVid(v))} />
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

  const lastEvent = game?.log[game.log.length - 1]
  const lastMsg = lastEvent ? eventText(lastEvent, t) : ''

  // ── Horizontal (landscape) layout render helper'iai (perduodami BattleLayout'ui; state lieka čia) ──
  const renderHandFanH = () => {
    if (!game) return null
    if (hMobile) {
      // Kompaktiška ranka: maža apačioj; tempi AUKŠTYN = žaidi (drag-to-play); bakst = išsiskleidžia didelis fanas
      // (uždengia artefaktus + dalį padarų), bakst ant kortos = žaidi ir sutraukia. Seno handExpanded overlay nebėra.
      const n = game.you.hand.length
      const big = handExpanded
      const w = big ? Math.round(handW * 2.15) : handW
      const overlap = big ? 0.26 : 0.5
      return (
        <div data-tut="hand" ref={handRef} className="flex justify-center items-end h-full pb-0.5">
          {n === 0 ? <span className="text-[10px] self-center" style={{ color: 'var(--text-muted)' }}>{t('battle.game.handEmpty')}</span> : game.you.hand.map((c, i) => {
            const off = i - (n - 1) / 2
            const afford = game.you.gold >= effectiveCost(game, 'you', c)
            const isDragging = drag?.uid === c.uid && dragMovedRef.current
            return (
              <div key={c.uid} data-hand-card={c.name}
                onPointerDown={(e) => beginHandPointer(c, e)}
                onContextMenu={(e) => { e.preventDefault(); setInspect(c) }}
                className="shrink-0 cursor-grab active:cursor-grabbing"
                style={{ marginLeft: i === 0 ? 0 : -Math.round(w * overlap), zIndex: isDragging ? 60 : i, touchAction: 'pan-x', transform: `translateY(${big ? 0 : Math.round(Math.abs(off) * 3)}px) rotate(${Math.max(-12, Math.min(12, off * (big ? 4 : 3.5)))}deg)`, opacity: isDragging ? 0.3 : 1, filter: select?.kind === 'discard' ? 'hue-rotate(40deg)' : 'drop-shadow(0 4px 10px rgba(0,0,0,0.6))', transition: 'margin-left 0.18s ease, transform 0.18s ease' }}>
                <MiniCard c={c} w={w} costNow={effectiveCost(game, 'you', c)} dmgBonus={spellDmgBonusFor(game, c)} dim={!afford && select?.kind !== 'discard'} />
              </div>
            )
          })}
        </div>
      )
    }
    return (
      <div data-tut="hand" ref={handRef} className="flex justify-center items-end h-full pb-1" style={{ paddingTop: 28 }}>
        <AnimatePresence>
          {game.you.hand.map((c, i) => {
            const afford = game.you.gold >= effectiveCost(game, 'you', c)
            const isDragging = drag?.uid === c.uid && dragMovedRef.current
            const n = game.you.hand.length
            const off = i - (n - 1) / 2
            const rot = off * Math.min(4.5, 24 / Math.max(1, n))
            const ty = Math.round(Math.pow(Math.abs(off), 1.6) * 4)
            return (
              <motion.div key={c.uid} data-hand-card={c.name} layout
                initial={{ y: 70, opacity: 0 }}
                animate={{ y: ty, rotate: rot, opacity: isDragging ? 0.25 : 1 }}
                whileHover={{ y: ty - 36, rotate: 0, scale: 1.14, zIndex: 60 }}
                transition={{ type: 'spring', stiffness: 300, damping: 26 }}
                style={{ marginLeft: i === 0 ? 0 : -(handW * 0.34), zIndex: i, transformOrigin: 'bottom center' }}
                onMouseEnter={(ev) => setHoverCard({ card: c, x: ev.clientX, y: ev.clientY })}
                onMouseMove={(ev) => setHoverCard((hh) => hh ? { ...hh, x: ev.clientX, y: ev.clientY } : { card: c, x: ev.clientX, y: ev.clientY })}
                onMouseLeave={() => setHoverCard(null)}
                onContextMenu={(e) => { e.preventDefault(); setInspect(c) }}>
                <GameCard glowColor={c.rarityColor} sounds={false} liftPx={0}>
                  <div onPointerDown={(e) => beginHandPointer(c, e)} className="block cursor-grab active:cursor-grabbing" style={{ touchAction: 'pan-x', filter: select?.kind === 'discard' ? 'hue-rotate(40deg)' : undefined, opacity: isDragging ? 0.3 : 1, boxShadow: '0 10px 26px rgba(0,0,0,0.65)', borderRadius: 10 }}>
                    <MiniCard c={c} w={handW} dim={!afford && select?.kind !== 'discard'} costNow={effectiveCost(game, 'you', c)} dmgBonus={spellDmgBonusFor(game, c)} />
                  </div>
                </GameCard>
              </motion.div>
            )
          })}
        </AnimatePresence>
        {game.you.hand.length === 0 && <span className="text-xs self-center" style={{ color: 'var(--text-muted)' }}>{t('battle.game.handEmpty')}</span>}
      </div>
    )
  }
  const renderLogH = () => {
    if (!game) return null
    return game.log.slice(-26).map((e, i) => {
      const card = e.t === 'draw' && e.side !== 'you' ? null : findCard(e.cardName)
      const col = e.side === 'you' ? '#4ade80' : '#f87171'
      return (
        <div key={i} className="flex items-center gap-1.5 text-[11px] leading-tight">
          <span style={{ width: 3, alignSelf: 'stretch', background: col, borderRadius: 2, flexShrink: 0 }} />
          {card && (
            <div className="shrink-0 rounded overflow-hidden cursor-pointer" style={{ width: 26, outline: '1px solid ' + col }}
              onClick={() => { playCardFlip(); setInspect(card) }}
              onMouseEnter={!isTouch ? (ev) => setHoverCard({ card, x: ev.clientX, y: ev.clientY }) : undefined}
              onMouseLeave={!isTouch ? () => setHoverCard(null) : undefined}>
              <MiniCard c={card} w={26} />
            </div>
          )}
          <span style={{ color: e.side === 'you' ? 'rgba(190,240,200,0.85)' : 'rgba(240,190,190,0.85)' }}>{eventText(e, t)}</span>
        </div>
      )
    })
  }
  const renderLogStripH = () => {
    if (!game) return null
    // Paskutiniai įvykiai su TEKSTU: kortos thumbnail kairėje + skaitomas aprašymas šalia
    const IGNORE = new Set(['fxSource', 'zmk', 'gold'])
    const items = game.log
      .map((e, idx) => (e.key && !IGNORE.has(e.t) && !(e.t === 'draw' && e.side !== 'you') ? { e, idx, card: findCard(e.cardName) } : null))
      .filter((x): x is NonNullable<{ e: typeof game.log[number]; idx: number; card: TutCard | null }> => !!x)
      .slice(-4)
    if (items.length === 0) return <span className="text-[8px] text-center" style={{ color: 'var(--text-muted)' }}>—</span>
    return items.map(({ e, idx, card }, i) => {
      const col = e.side === 'you' ? '#4ade80' : '#f87171'
      const last = i === items.length - 1
      return (
        <div key={idx} onClick={() => { if (card) { playCardFlip(); setInspect(card) } }}
          className="shrink-0 w-full flex items-center gap-1 rounded-md px-0.5 py-0.5"
          style={{ cursor: card ? 'pointer' : 'default', background: last ? 'rgba(255,255,255,0.06)' : 'transparent', opacity: last ? 1 : 0.75 }}>
          <span className="shrink-0 rounded overflow-hidden" style={{ width: 24, outline: '1.5px solid ' + col }}>
            {card ? <MiniCard c={card} w={24} /> : <span className="flex items-center justify-center" style={{ width: 24, height: 32, background: 'rgba(10,8,16,0.8)', color: col, fontSize: 11 }}>⚔</span>}
          </span>
          <span className="min-w-0 flex-1 leading-tight" style={{ fontSize: 8.5, color: '#d8cfc0', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {eventText(e, t)}
          </span>
        </div>
      )
    })
  }
  const renderEndTurnH = () => {
    if (!game) return null
    return (
      <button data-tut="end-turn" onClick={onEndTurn} disabled={!myTurn}
        className="relative rounded-full flex flex-col items-center justify-center font-extrabold transition-all active:scale-95 disabled:opacity-60"
        style={{ width: 92, height: 92, background: myTurn ? 'radial-gradient(circle at 50% 35%, #2a9a4c, #134f25)' : 'radial-gradient(circle at 50% 35%, #7a1f1f, #3a0f0f)', border: '2px solid ' + (myTurn ? 'rgba(74,222,128,0.8)' : 'rgba(239,68,68,0.5)'), color: myTurn ? '#eafff0' : '#fca5a5', fontFamily: 'var(--rvn-font-display)', boxShadow: myTurn ? '0 0 22px rgba(34,197,94,0.5)' : 'none' }}
        title={myTurn ? 'Baigti ejima' : 'Prieso ejimas'}>
        <span className="text-[11px] leading-tight text-center px-1 font-bold" style={{ whiteSpace: 'pre-line' }}>{myTurn ? t('battle.game.endTurnShort') : t('battle.game.enemyTurnShort')}</span>
      </button>
    )
  }
  const renderDiscardGoldH = () => {
    if (!game) return null
    return (
      <button data-tut="discard-gold"
        onClick={() => { if (!myTurn || popupBlocks) return; if (game.you.discardedForGold) { pushToast('Jau ismetei korta si ejima.'); return } playUiClick(); setSelect(select?.kind === 'discard' ? null : { kind: 'discard' }) }}
        className="px-2 py-1 rounded-full text-[9px] font-bold whitespace-nowrap"
        style={{ background: game.you.discardedForGold ? 'rgba(0,0,0,0.5)' : select?.kind === 'discard' ? 'rgba(34,197,94,0.38)' : 'rgba(34,197,94,0.18)', border: '1px solid rgba(74,222,128,0.6)', color: game.you.discardedForGold ? 'var(--text-muted)' : '#86efac' }}
        title="Ismesk 1 korta is rankos ir gauk +100 aukso">{'+100⚜'}</button>
    )
  }
  const renderFieldH = () => (
    <div className="flex flex-col items-center gap-0.5">
      <span style={{ fontSize: 7, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(167,139,250,0.6)' }}>Laukas</span>
      <div data-tut="field" className="relative flex items-center justify-center rounded-lg overflow-hidden" style={{ width: 52, height: 80, border: game?.field ? '1px solid rgba(167,139,250,0.9)' : '1px dashed rgba(167,139,250,0.45)', background: 'linear-gradient(160deg, rgba(42,30,62,0.6), rgba(34,27,16,0.5))', boxShadow: game?.field ? 'inset 0 0 18px rgba(167,139,250,0.3), 0 0 12px rgba(167,139,250,0.25)' : 'inset 0 0 14px rgba(167,139,250,0.12)' }}>
        {game?.field ? (
          <button onClick={() => setInspect(game!.field!.card)} onContextMenu={(e) => { e.preventDefault(); setInspect(game!.field!.card) }} className="absolute inset-0">
            {game.field.card.image
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={game.field.card.image} alt="" draggable={false} className="absolute inset-0 w-full h-full object-cover" style={{ objectPosition: '50% 30%' }} />
              : <span className="absolute inset-0 flex items-center justify-center text-center px-0.5" style={{ fontSize: 8, lineHeight: 1.15, color: '#e9ddff', background: 'linear-gradient(160deg, rgba(62,45,92,0.85), rgba(24,17,40,0.9))' }}>{game.field.card.name}</span>}
          </button>
        ) : (
          <span className="text-base" style={{ color: 'rgba(167,139,250,0.5)' }}>{slotTypeIcon('field', 22, '🌍', '#a78bfa')}</span>
        )}
      </div>
    </div>
  )

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
    if (select.kind === 'lastwish') {
      const m = game.pendingLastwish?.mappings[0]
      const eff = m ? (EFFECT_TYPES.find((e) => e.value === m.effect)?.label ?? 'Efektas') : 'Paskutinis noras'
      return `🕯 ${eff} (${select.picked.length}/${select.need})`
    }
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

  // ── LAUKO kortos FX: žemės drebėjimas + arenos fono keitimas ──
  // Sužaidus lauko kortą (bet kurio žaidėjo, veikia ir PvP sync'ui, nes stebim state):
  // 3 s viskas dreba, arena fade'ina į lauko kortos backgroundUrl (admin upload).
  const fieldBgUrl = game?.field?.card.gameplay?.fieldEffectConfig?.backgroundUrl ?? null
  const [fieldQuake, setFieldQuake] = useState(false)
  const prevFieldUid = useRef<string | null | undefined>(undefined)
  useEffect(() => {
    const uid = game?.field?.card.uid ?? null
    if (prevFieldUid.current === undefined) { prevFieldUid.current = uid; return }  // mount/reconnect – be drebėjimo
    if (uid && uid !== prevFieldUid.current) {
      prevFieldUid.current = uid
      setFieldQuake(true)
      try { playBattleSound('field', 0.6); playBattleSound('impact', 0.4) } catch { /* fx niekada nelaužia UI */ }
      const t = window.setTimeout(() => setFieldQuake(false), 3000)
      return () => window.clearTimeout(t)
    }
    prevFieldUid.current = uid
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game?.field?.card.uid])

  return createPortal(
    <div data-fx-root className={`fixed inset-0 z-[120] flex flex-col select-none${fieldQuake ? ' rvn-field-quake' : ''}`}
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
      {/* ── mūšio arena (atsitiktinis frakcijos fonas; lauko korta jį perrašo) ── */}
      <ArenaBackground arena={arenaRef.current} overrideUrl={fieldBgUrl} boardUrl={boardSkinUrl} />
      {/* Žemės drebėjimas sužaidus lauko kortą: 3 s gęstanti amplitudė */}
      <style>{`
        @keyframes rvnFieldQuake {
          0%   { transform: translate(0,0) rotate(0deg); }
          4%   { transform: translate(-9px,6px) rotate(-0.55deg); }
          8%   { transform: translate(10px,-7px) rotate(0.6deg); }
          12%  { transform: translate(-10px,-5px) rotate(-0.5deg); }
          16%  { transform: translate(8px,7px) rotate(0.45deg); }
          22%  { transform: translate(-7px,4px) rotate(-0.4deg); }
          28%  { transform: translate(6px,-5px) rotate(0.35deg); }
          36%  { transform: translate(-5px,3px) rotate(-0.28deg); }
          44%  { transform: translate(4px,4px) rotate(0.22deg); }
          54%  { transform: translate(-3px,-2px) rotate(-0.16deg); }
          64%  { transform: translate(2.5px,2px) rotate(0.12deg); }
          74%  { transform: translate(-2px,1px) rotate(-0.08deg); }
          84%  { transform: translate(1px,-1px) rotate(0.05deg); }
          92%  { transform: translate(-0.5px,0.5px) rotate(-0.02deg); }
          100% { transform: translate(0,0) rotate(0deg); }
        }
        .rvn-field-quake { animation: rvnFieldQuake 3s cubic-bezier(.36,.07,.19,.97) both; will-change: transform; }
        @keyframes rvnEmotePop { 0% { transform: translateX(-50%) scale(0.3); opacity: 0; } 60% { transform: translateX(-50%) scale(1.15); opacity: 1; } 100% { transform: translateX(-50%) scale(1); opacity: 1; } }
        @keyframes rvnRotateHint { 0%,100% { transform: rotate(-18deg); } 50% { transform: rotate(72deg); } }
        @media (prefers-reduced-motion: reduce) { .rvn-field-quake { animation: none !important; } }
      `}</style>

      {/* viršutinė juosta (senas layout; H = minimalūs floating mygtukai apačioj) */}
      {!useHLayout && (
      <div className="flex items-center justify-between px-3 py-2 shrink-0"
        style={{ borderBottom: '1px solid rgba(240,180,41,0.15)', background: 'rgba(0,0,0,0.35)' }}>
        <div className="flex items-center gap-2 min-w-0">
          {vsRemote ? (
            <>
              <button onClick={() => { playUiClick(); setOppOpen(true) }} className="flex items-center gap-2 min-w-0 rounded-lg px-1.5 py-1 transition-colors hover:bg-white/5" title={t('battle.game.oppProfileTip')}>
                <span className="text-[10px] uppercase tracking-wide shrink-0" style={{ color: 'var(--text-muted)' }}>vs</span>
                {oppProfile?.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={oppProfile.avatar_url} alt="" className="w-6 h-6 rounded-full object-cover shrink-0" style={{ border: '1px solid rgba(240,180,41,0.4)' }} />
                ) : (
                  <span className="w-6 h-6 rounded-full shrink-0 flex items-center justify-center text-[11px]" style={{ background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.4)' }}>⚔️</span>
                )}
                <span className="text-xs sm:text-sm font-bold truncate" style={{ fontFamily: 'var(--rvn-font-display)', color: 'var(--text-primary)' }}>
                  {oppProfile?.display_name || oppProfile?.username || opponentName || t('battle.game.opponentShort')}
                </span>
              </button>
              {!game?.winner && (
                <TurnTimer deadline={turnDeadline} variant="chip" />
              )}
            </>
          ) : (
            <>
              <Swords className="w-4 h-4 shrink-0" style={{ color: 'var(--gold)' }} />
              <span className="text-xs sm:text-sm font-bold truncate" style={{ fontFamily: 'var(--rvn-font-display)', color: 'var(--text-primary)' }}>
                {ranked ? t('battle.game.titleRanked', { name: opponentName ?? t('battle.game.opponent') }) : practice ? t('battle.game.titlePractice', { name: opponentName ?? t('battle.game.opponent') }) : t('battle.game.titleTutorial', { deck: deckName })}
              </span>
              {ranked && !game?.winner && (
                <TurnTimer deadline={turnDeadline} variant="chip" />
              )}
            </>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={() => { toggleUiSound(); playUiClick() }} title={soundOn ? t('battle.game.soundOff') : t('battle.game.soundOn')}
            className="p-1.5 rounded-lg transition-colors hover:bg-white/5">
            {soundOn ? <Music className="w-4 h-4" style={{ color: 'var(--gold)' }} /> : <VolumeX className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />}
          </button>
          <button onClick={() => { playUiClick(); setShowLog((v) => !v) }} title={t('battle.game.logTip')}
            className="p-1.5 rounded-lg transition-colors hover:bg-white/5 text-sm">📜</button>
          <button onClick={() => { playUiClick(); closeGame() }} title={t('battle.game.closeTip')}
            className="p-1.5 rounded-lg transition-colors hover:bg-white/5">
            <X className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
          </button>
        </div>
      </div>
      )}

      {/* H minimalūs floating valdikliai (banner pašalintas – daugiau vietos lentai) */}
      {useHLayout && (
        <div className="fixed top-1 right-1 z-[130] flex items-center gap-1">
          <button onClick={() => { toggleUiSound(); playUiClick() }} title={soundOn ? t('battle.game.sound') : t('battle.game.soundMuted')} className="p-1.5 rounded-lg" style={{ background: 'rgba(0,0,0,0.42)', border: '1px solid rgba(240,180,41,0.2)' }}>{soundOn ? <Music className="w-4 h-4" style={{ color: 'var(--gold)' }} /> : <VolumeX className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />}</button>
          <button onClick={() => { playUiClick(); closeGame() }} title={t('battle.game.closeTip')} className="p-1.5 rounded-lg" style={{ background: 'rgba(0,0,0,0.42)', border: '1px solid rgba(240,180,41,0.2)' }}><X className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} /></button>
        </div>
      )}

      {loading && (
        <div className="flex-1 flex items-center justify-center">
          <span className="text-sm animate-pulse" style={{ color: 'var(--text-secondary)' }}>{t('battle.game.shuffling')}</span>
        </div>
      )}
      {errorMsg && (
        <div className="flex-1 flex items-center justify-center">
          <span className="text-sm" style={{ color: '#ef4444' }}>{errorMsg}</span>
        </div>
      )}

      {!loading && !errorMsg && !game && (
        <div className="flex-1 flex items-center justify-center">
          <span className="text-sm animate-pulse" style={{ color: 'var(--gold)' }}>{t('battle.game.preparing')}</span>
        </div>
      )}
      {game && !loading && useHLayout && (
        <BattleLayout
          game={game}
          isTouch={isTouch}
          myTurn={myTurn}
          lastMsg={lastMsg}
          turnDeadline={turnDeadline}
          railPanel={RAIL_PANEL}
          hpBar={hpBar}
          goldBar={goldBar}
          renderPile={renderPile}
          renderUnitsRow={renderUnitsRow}
          renderArtifactRow={renderArtifactRow}
          renderReactionRow={renderReactionRow}
          dFieldRow={renderFieldH}
          renderOppHand={(big) => <OppHandFan count={game.ai.hand.length} big={big} />}
          renderHand={renderHandFanH}
          renderLog={renderLogH}
          renderLogStrip={renderLogStripH}
          renderEndTurn={renderEndTurnH}
          renderDiscardGold={renderDiscardGoldH}
          renderEmoteBubble={renderEmoteBubbleH}
          onEmote={sendEmote}
        />
      )}
      {useHLayout && isTouch && showRotate && (
        <div className="fixed inset-0 z-[400] flex flex-col items-center justify-center gap-4 px-6 text-center"
          style={{ background: 'rgba(6,4,11,0.98)' }}>
          <div className="text-6xl" style={{ animation: 'rvnRotateHint 1.6s ease-in-out infinite' }}>🔄</div>
          <p className="text-xl font-bold" style={{ color: 'var(--gold)', fontFamily: 'var(--rvn-font-display)' }}>{t('battle.game.rotateTitle')}</p>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{t('battle.game.rotateText')}</p>
        </div>
      )}
      {game && !loading && !useHLayout && isTouch && (
        <div className="flex-1 min-h-0 flex flex-col overflow-y-auto sm:overflow-hidden px-2 py-1.5 gap-1">
          {/* ── AI pusė ── */}
          <div data-tut="ai-area" className="shrink-0">
            <div className="flex items-center justify-center gap-2 sm:gap-3 flex-wrap">
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full" style={{ background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.35)' }}>
                <span className="text-base">🜏</span>
                <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: '#a78bfa' }}>{t('battle.game.opponent')}</span>
                {game.active === 'ai' && !game.winner && <span className="text-[9px] animate-pulse" style={{ color: 'var(--gold)' }}>galvoja…</span>}
              </div>
              {hpBar('ai')}
              {goldBar('ai')}
              <div className="flex items-end gap-2">
                <OppHandFan count={game.ai.hand.length} />
                {renderPile(t('battle.game.deck'), game.ai.deck.length, { pileKey: 'deck-ai', back: 'plain' })}
                {renderPile('Kapinynas', game.ai.discard.length, { faceUp: true, cards: game.ai.discard, pileKey: 'discard-ai' })}
                {renderPile(t('battle.game.zmk'), game.ai.zmk.length, { back: 'zmk' })}
              </div>
            </div>
            <div className="mt-1 pl-[50px] pr-[38px]">{renderSideZones('ai')}</div>
            <div className="mt-1 pl-[50px] pr-[38px]">{renderUnitsRow('ai', 'units-ai')}</div>
          </div>

          {/* ── vidurio juosta: įvykių tekstas (lauko korta – fixed kairysis slotas) ── */}
          <div className="shrink-0 flex items-center justify-center py-0.5 pl-[50px] pr-[38px]"
            style={{ borderTop: '1px solid rgba(240,180,41,0.1)', borderBottom: '1px solid rgba(240,180,41,0.1)' }}>
            <p className="text-[10px] leading-snug line-clamp-1 text-center" style={{ color: 'var(--text-secondary)' }}>{lastMsg}</p>
          </div>

          {/* ── Tavo pusė ── */}
          <div className="flex-1 flex flex-col justify-end gap-1 min-h-0">
            <div className="pl-[50px] pr-[38px]">{renderUnitsRow('you', 'units-you')}</div>
            <div className="pl-[50px] pr-[38px]">{renderSideZones('you')}</div>

            {/* valdymo juosta: auksas+parduoti (kairė) · avataras (centras) · pile'ai+baigti (dešinė) */}
            <div className="flex items-end justify-between gap-2 shrink-0 px-1">
              {/* kairė: Baigti ėjimą (viršuje) · auksas · parduoti korta */}
              <div className="flex flex-col items-center gap-1">
                {/* FIKSUOTAS dydis: tekstui keičiantis (Baigti ėjimą / Priešo ėjimas…) laukas nebejuda */}
                <button data-tut="end-turn" onClick={onEndTurn} disabled={!myTurn}
                  className="py-1.5 rounded-xl font-bold transition-colors active:scale-95 disabled:opacity-80 whitespace-nowrap text-center"
                  style={{ width: 118, fontSize: 11.5, lineHeight: 1.1, background: myTurn ? 'linear-gradient(135deg, #1f7a3a, #134f25)' : 'linear-gradient(135deg, #7a1f1f, #4a1212)', border: '1px solid ' + (myTurn ? 'rgba(74,222,128,0.7)' : 'rgba(239,68,68,0.6)'), color: myTurn ? '#eafff0' : '#fca5a5', fontFamily: 'var(--rvn-font-display)', letterSpacing: '0.03em', boxShadow: myTurn ? '0 0 16px rgba(34,197,94,0.4)' : 'none' }}>
                  {myTurn ? t('battle.game.endTurn') : t('battle.game.enemyTurn')}
                </button>
                {goldBar('you')}
                <button data-tut="discard-gold"
                  onClick={() => { if (!myTurn || popupBlocks) return; if (game.you.discardedForGold) { pushToast(t('battle.game.toastAlreadyDiscarded')); return } playUiClick(); setSelect(select?.kind === 'discard' ? null : { kind: 'discard' }) }}
                  className="px-2.5 py-1 rounded-full text-[10px] font-bold transition-all whitespace-nowrap"
                  style={{ background: game.you.discardedForGold ? 'rgba(0,0,0,0.5)' : select?.kind === 'discard' ? 'rgba(34,197,94,0.38)' : 'rgba(34,197,94,0.18)', border: '1px solid rgba(74,222,128,0.6)', color: game.you.discardedForGold ? 'var(--text-muted)' : '#86efac' }}
                  title={t('battle.game.discardForGoldTip')}>{t('battle.game.discardForGold')}</button>
              </div>
              {/* centras: avataras */}
              <div className="flex items-end">{hpBar('you')}</div>
              {/* dešinė: pile'ai */}
              <div className="flex flex-col items-center gap-1 justify-end">
                <div className="flex items-end gap-1.5">
                  {renderPile(t('battle.game.deck'), game.you.deck.length, { tut: 'deck', pileKey: 'deck-you', back: 'plain' })}
                  {renderPile('Kapinynas', game.you.discard.length, { tut: 'discard', faceUp: true, cards: game.you.discard, pileKey: 'discard-you' })}
                  {renderPile(t('battle.game.zmk'), game.you.zmk.length, { tut: 'zmk', back: 'zmk' })}
                </div>
              </div>
            </div>
            {/* ranka (sutraukta vėduoklė); palietus kortą – atsiveria didelė skaitoma ranka (overlay) */}
            <div data-tut="hand" ref={handRef}
              className="flex justify-center items-end gap-0 min-h-[104px] sm:min-h-[150px] pb-1 overflow-x-auto">
              <AnimatePresence>
                {game.you.hand.map((c, i) => {
                  const n = game.you.hand.length
                  const off = i - (n - 1) / 2
                  const afford = game.you.gold >= effectiveCost(game, 'you', c)
                  const isDragging = drag?.uid === c.uid && dragMovedRef.current
                  const vw = typeof window !== 'undefined' ? window.innerWidth : 400
                  const step = Math.min(handW * 0.96, (vw - handW - 10) / Math.max(1, n - 1))  // tarpas tarp kortų – kad ~10 tilptų ekrane
                  const ml = i === 0 ? 0 : step - handW
                  return (
                    <motion.div key={c.uid} data-hand-card={c.name} layout
                      initial={{ y: 55, opacity: 0, scale: 0.85 }}
                      animate={{ y: 0, opacity: isDragging ? 0.25 : 1, rotate: Math.max(-12, Math.min(12, off * (n > 8 ? 2 : 3.5))) }}
                      exit={{ y: -40, opacity: 0, scale: 0.8 }}
                      whileHover={{ y: -14, zIndex: 30, rotate: 0 }}
                      style={{ marginLeft: ml, zIndex: i }}
                      onContextMenu={(e) => { e.preventDefault(); setInspect(c) }}>
                      <GameCard glowColor={c.rarityColor} sounds={false} liftPx={0}>
                        <div onPointerDown={(e) => beginHandPointer(c, e)} className="block cursor-grab active:cursor-grabbing"
                          style={{ touchAction: 'pan-x', filter: select?.kind === 'discard' ? 'hue-rotate(40deg)' : undefined, opacity: isDragging ? 0.3 : 1 }}>
                          <MiniCard c={c} w={handW} dim={!afford && select?.kind !== 'discard'} costNow={effectiveCost(game, 'you', c)} dmgBonus={spellDmgBonusFor(game, c)} />
                        </div>
                      </GameCard>
                    </motion.div>
                  )
                })}
              </AnimatePresence>
              {game.you.hand.length === 0 && (
                <span className="text-[10px] self-center mx-auto" style={{ color: 'var(--text-muted)' }}>{t('battle.game.handEmpty')}</span>
              )}
            </div>
          </div>
        </div>
      )}

      {game && !loading && !useHLayout && !isTouch && (
        <div className="flex-1 min-h-0 w-full" style={{ maxWidth: 1600, margin: '0 auto' }}>
          <div style={{ display: 'grid', height: '100%', gridTemplateColumns: '236px minmax(0,1fr) 250px', gridTemplateRows: 'minmax(0,1fr) 178px', gridTemplateAreas: '"left board right" "left hand command"', gap: 10, padding: '6px 14px' }}>

            <aside style={{ gridArea: 'left' }} className="flex flex-col gap-2 min-h-0 overflow-hidden">
              <div className="rounded-xl p-3 flex flex-col gap-2" style={RAIL_PANEL}>
                <div className="flex items-center gap-2">
                  {hpBar('you', 1.05)}
                  <div className="flex flex-col leading-tight">
                    <span className="text-[12px] font-bold uppercase tracking-wider" style={{ color: 'var(--gold)', fontFamily: 'var(--rvn-font-display)' }}>{t('battle.game.player')}</span>
                    <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Nekronautas</span>
                  </div>
                </div>
                <div className="self-center">{goldBar('you')}</div>
              </div>
              <div className="rounded-xl px-1.5 py-3 flex justify-center gap-1.5" style={RAIL_PANEL}>
                {renderPile(t('battle.game.deck'), game.you.deck.length, { tut: 'deck', pileKey: 'deck-you', back: 'plain', w: 66 })}
                {renderPile(t('battle.game.zmk'), game.you.zmk.length, { tut: 'zmk', back: 'zmk', w: 66 })}
                {renderPile('Kapinynas', game.you.discard.length, { tut: 'discard', faceUp: true, cards: game.you.discard, pileKey: 'discard-you', w: 66 })}
              </div>
              <div className="rounded-xl p-2 flex items-center justify-center gap-2 mt-auto" style={RAIL_PANEL}>
                <span className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Efektai</span>
                <div className="flex items-center gap-2" style={{ fontSize: 15 }}>
                  <span title="Skydas" style={{ opacity: game.you.units.some((u) => u?.shield) ? 1 : 0.25 }}>✦</span>
                  <span title={t('battle.game.statusesTip')} style={{ opacity: game.you.units.some((u) => u && Object.keys(u.statuses).length > 0) ? 1 : 0.25 }}>✷</span>
                  <span title={t('battle.game.faction')} style={{ opacity: 0.55 }}>🜏</span>
                </div>
              </div>
            </aside>

            <section style={{ gridArea: 'board' }} className="min-h-0 rounded-2xl relative overflow-hidden">
              <div aria-hidden style={{ position: 'absolute', inset: 0, background: 'radial-gradient(60% 55% at 50% 50%, rgba(240,180,41,0.05), rgba(0,0,0,0.35) 100%)', boxShadow: 'inset 0 0 90px rgba(0,0,0,0.75)', borderRadius: 16, border: '1px solid rgba(240,180,41,0.12)', pointerEvents: 'none' }} />
              <div className="relative" style={{ display: 'grid', height: '100%', gridTemplateRows: 'auto auto auto 1fr auto 1fr auto auto', gap: 3, alignContent: 'center', padding: '6px 22px' }}>
                {dZone(t('battle.game.oppHand', { count: game.ai.hand.length }), <OppHandFan count={game.ai.hand.length} big />)}
                {dZone(t('battle.game.oppReactions'), renderReactionRow('ai'))}
                {dZone(t('battle.game.oppArtifacts'), renderArtifactRow('ai'))}
                {dZone(t('battle.game.oppUnits'), renderUnitsRow('ai', 'units-ai'))}
                {dFieldRow()}
                {dZone('Tavo padarai', renderUnitsRow('you', 'units-you'))}
                {dZone('Tavo artefaktai', renderArtifactRow('you'))}
                {dZone('Tavo reakcijos', renderReactionRow('you'))}
              </div>
            </section>

            <aside style={{ gridArea: 'right' }} className="flex flex-col gap-2 min-h-0 overflow-hidden">
              <div className="rounded-xl p-3 flex flex-col gap-2" style={RAIL_PANEL}>
                <div className="flex items-center gap-2 justify-end">
                  <div className="flex flex-col leading-tight items-end">
                    <span className="text-[12px] font-bold uppercase tracking-wider" style={{ color: '#c4b5fd', fontFamily: 'var(--rvn-font-display)' }}>{t('battle.game.opponent')}</span>
                    <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Ranka: {game.ai.hand.length}{game.active === 'ai' && !game.winner ? ' · galvoja…' : ''}</span>
                  </div>
                  {hpBar('ai', 1.05)}
                </div>
              </div>
              <div className="rounded-xl px-1.5 py-3 flex justify-center gap-1.5" style={RAIL_PANEL}>
                {renderPile(t('battle.game.deck'), game.ai.deck.length, { pileKey: 'deck-ai', back: 'plain', w: 66 })}
                {renderPile(t('battle.game.zmk'), game.ai.zmk.length, { back: 'zmk', w: 66 })}
                {renderPile('Kapinynas', game.ai.discard.length, { faceUp: true, cards: game.ai.discard, pileKey: 'discard-ai', w: 66 })}
              </div>
              <div className="rounded-xl p-2 flex-1 min-h-0 flex flex-col" style={RAIL_PANEL}>
                <span className="text-[10px] uppercase tracking-widest mb-1 shrink-0" style={{ color: 'var(--gold)' }}>{t('battle.game.actionLog')}</span>
                <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-0.5 pr-1">
                  {game.log.slice(-26).map((e, i) => {
                    const card = e.t === 'draw' && e.side !== 'you' ? null : findCard(e.cardName)
                    const col = e.side === 'you' ? '#4ade80' : '#f87171'
                    return (
                      <div key={i} className="flex items-center gap-1.5 text-[10px] leading-tight">
                        <span style={{ width: 3, alignSelf: 'stretch', background: col, borderRadius: 2, flexShrink: 0 }} />
                        {card && (
                          <div className="shrink-0 rounded overflow-hidden cursor-pointer" style={{ width: 18, outline: '1px solid ' + col }}
                            onClick={() => { playCardFlip(); setInspect(card) }}
                            onMouseEnter={!isTouch ? (ev) => setHoverCard({ card, x: ev.clientX, y: ev.clientY }) : undefined}
                            onMouseLeave={!isTouch ? () => setHoverCard(null) : undefined}>
                            <MiniCard c={card} w={18} />
                          </div>
                        )}
                        <span className="truncate" style={{ color: e.side === 'you' ? 'rgba(190,240,200,0.85)' : 'rgba(240,190,190,0.85)' }}>{eventText(e, t)}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </aside>

            <div style={{ gridArea: 'hand' }} className="min-h-0 flex items-end justify-center">
              <div data-tut="hand" ref={handRef} className="flex justify-center items-end h-full pb-2" style={{ paddingTop: 40 }}>
                <AnimatePresence>
                  {game.you.hand.map((c, i) => {
                    const afford = game.you.gold >= effectiveCost(game, 'you', c)
                    const isDragging = drag?.uid === c.uid && dragMovedRef.current
                    const n = game.you.hand.length
                    const off = i - (n - 1) / 2
                    const rot = off * Math.min(4.5, 24 / Math.max(1, n))
                    const ty = Math.round(Math.pow(Math.abs(off), 1.6) * 4)
                    return (
                      <motion.div key={c.uid} data-hand-card={c.name} layout
                        initial={{ y: 70, opacity: 0 }}
                        animate={{ y: ty, rotate: rot, opacity: isDragging ? 0.25 : 1 }}
                        whileHover={{ y: ty - 36, rotate: 0, scale: 1.14, zIndex: 60 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 26 }}
                        style={{ marginLeft: i === 0 ? 0 : -(handW * 0.34), zIndex: i, transformOrigin: 'bottom center' }}
                        onMouseEnter={(ev) => setHoverCard({ card: c, x: ev.clientX, y: ev.clientY })}
                        onMouseMove={(ev) => setHoverCard((hh) => hh ? { ...hh, x: ev.clientX, y: ev.clientY } : { card: c, x: ev.clientX, y: ev.clientY })}
                        onMouseLeave={() => setHoverCard(null)}
                        onContextMenu={(e) => { e.preventDefault(); setInspect(c) }}>
                        <GameCard glowColor={c.rarityColor} sounds={false} liftPx={0}>
                          <div onPointerDown={(e) => beginHandPointer(c, e)} className="block cursor-grab active:cursor-grabbing" style={{ filter: select?.kind === 'discard' ? 'hue-rotate(40deg)' : undefined, opacity: isDragging ? 0.3 : 1, boxShadow: '0 10px 26px rgba(0,0,0,0.65)', borderRadius: 10 }}>
                            <MiniCard c={c} w={handW} dim={!afford && select?.kind !== 'discard'} costNow={effectiveCost(game, 'you', c)} dmgBonus={spellDmgBonusFor(game, c)} />
                          </div>
                        </GameCard>
                      </motion.div>
                    )
                  })}
                </AnimatePresence>
                {game.you.hand.length === 0 && <span className="text-xs self-center" style={{ color: 'var(--text-muted)' }}>{t('battle.game.handEmpty')}</span>}
              </div>
            </div>

            <aside className="rounded-xl p-3 flex flex-col items-center justify-center gap-2" style={{ ...RAIL_PANEL, gridArea: 'command' }}>
              <div className="self-center">{goldBar('you')}</div>
              <button onClick={() => { if (!myTurn || popupBlocks) return; if (game.you.discardedForGold) { pushToast(t('battle.game.toastAlreadyDiscarded')); return } playUiClick(); setSelect(select?.kind === 'discard' ? null : { kind: 'discard' }) }}
                className="w-full px-2.5 py-1.5 rounded-lg text-[11px] font-bold whitespace-nowrap" style={{ background: select?.kind === 'discard' ? 'rgba(240,180,41,0.25)' : 'rgba(0,0,0,0.5)', border: '1px solid rgba(240,180,41,0.4)', color: game.you.discardedForGold ? 'var(--text-muted)' : 'var(--gold)' }} title={t('battle.game.discardForGoldTip')}>{t('battle.game.discardForGold')}</button>
              <button data-tut="end-turn" onClick={onEndTurn} disabled={!myTurn}
                className="w-full px-4 py-3.5 rounded-xl text-base font-extrabold transition-all hover:scale-[1.03] active:scale-95 disabled:opacity-50 whitespace-nowrap"
                style={{ background: myTurn ? 'linear-gradient(135deg, #1f7a3a, #134f25)' : 'rgba(120,30,30,0.35)', border: '1px solid ' + (myTurn ? 'rgba(74,222,128,0.7)' : 'rgba(239,68,68,0.5)'), color: myTurn ? '#eafff0' : '#fca5a5', fontFamily: 'var(--rvn-font-display)', letterSpacing: '0.05em', boxShadow: myTurn ? '0 0 24px rgba(34,197,94,0.45)' : 'none' }}>
                {myTurn ? t('battle.game.endTurn') : t('battle.game.opponentTurn')}
              </button>
            </aside>

          </div>
        </div>
      )}      {/* ── pasirinkimo užuomina ── */}
      <AnimatePresence>
        {select && select.kind !== 'discard' && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="fixed bottom-28 sm:bottom-32 left-0 right-0 mx-auto w-fit z-[125] px-3 py-1.5 rounded-full text-[10px] sm:text-[11px] font-semibold pointer-events-none max-w-[94vw] text-center"
            style={{ background: 'rgba(0,0,0,0.85)', border: '1px solid rgba(240,180,41,0.5)', color: 'var(--gold)' }}>
            {select.kind === 'attacker' && t('battle.game.hintAttacker')}
            {select.kind === 'spell' && t('battle.game.hintSpell')}
            {select.kind === 'sacrifice' && t('battle.game.hintSacrifice', { picked: select.picked.length })}
          </motion.div>
        )}
        {select?.kind === 'discard' && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="fixed bottom-28 sm:bottom-32 left-0 right-0 mx-auto w-fit z-[125] px-3 py-1.5 rounded-full text-[10px] sm:text-[11px] font-semibold pointer-events-none max-w-[94vw] text-center"
            style={{ background: 'rgba(0,0,0,0.85)', border: '1px solid rgba(240,180,41,0.5)', color: 'var(--gold)' }}>
            {t('battle.game.hintDiscard')}
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
                  <p className="text-base font-bold truncate" style={{ fontFamily: 'var(--rvn-font-display)', color: 'var(--text-primary)' }}>{oppProfile?.display_name || oppProfile?.username || opponentName || t('battle.game.opponentShort')}</p>
                  {oppProfile?.username && <p className="text-xs" style={{ color: 'var(--text-muted)' }}>@{oppProfile.username}{oppProfile.level != null ? ` · ${t('quests.season.levelLabel')} ${oppProfile.level}` : ''}</p>}
                </div>
              </div>
              <p className="text-[11px] uppercase tracking-wide mb-1.5" style={{ color: 'var(--text-muted)', fontFamily: 'var(--rvn-font-display)' }}>{t('battle.game.publicDecks')}</p>
              {oppDecks.length === 0 ? (
                <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>{t('battle.game.noPublicDecks')}</p>
              ) : (
                <div className="space-y-1 mb-3 max-h-44 overflow-y-auto">
                  {oppDecks.map((d) => (
                    <a key={d.id} href={'/community-decks/' + d.id} target="_blank" rel="noreferrer" className="block rounded-lg px-3 py-1.5 text-xs transition-colors hover:bg-white/5" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--bg-border)', color: 'var(--text-secondary)' }}>📚 {d.name}</a>
                  ))}
                </div>
              )}
              <button onClick={() => setOppOpen(false)} className="w-full px-4 py-2 rounded-xl text-sm" style={{ color: 'var(--text-muted)', border: '1px solid var(--bg-border)' }}>{t('battle.game.close')}</button>
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
              <p className="text-sm font-bold mb-1.5" style={{ fontFamily: 'var(--rvn-font-display)', color: 'var(--gold)' }}>{t(step.title)}</p>
              <p className="text-xs leading-relaxed mb-3" style={{ color: 'var(--text-secondary)' }}>{t(step.text)}</p>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button onClick={() => { playUiClick(); setStepIdx(GUIDED_STEPS.length) }}
                    className="text-[10px] underline opacity-60 hover:opacity-100" style={{ color: 'var(--text-muted)' }}>
                    {t('battle.game.skipTutorial')}
                  </button>
                  <button onClick={() => { playUiClick(); setPopupCollapsed(true) }}
                    className="text-[10px] underline opacity-60 hover:opacity-100" style={{ color: 'var(--text-muted)' }}
                    title={t('battle.game.collapseTip')}>
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
                  <span className="text-[10px] italic animate-pulse" style={{ color: 'var(--gold)' }}>{t('battle.game.doAction')}</span>
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
              {t('battle.game.newMechanic', { title: t(MECHANIC_TIPS[activeTip].title) })}
            </p>
            <p className="text-[11px] leading-relaxed mb-2.5" style={{ color: 'var(--text-secondary)' }}>
              {t(MECHANIC_TIPS[activeTip].text)}
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
        {/* ── Nuolatinis suskleistas spalvotas log (dešinė): kortų/ŽMK miniatiūros eilės tvarka; žalia=tu, raudona=priešas ── */}
      {/* ── Lauko korta: fixed kairysis slotas (per vidurį), bendras abiem ── */}
      {game && !useHLayout && isTouch && (
        <div className="fixed left-1 top-1/2 -translate-y-1/2 z-[118] flex flex-col items-center gap-0.5">
          <span className="text-[7px] uppercase tracking-wide" style={{ color: 'rgba(167,139,250,0.75)' }}>Laukas</span>
          <div data-tut="field" className="rounded-lg overflow-hidden" style={{ background: 'rgba(10,8,16,0.72)', border: game.field ? '1.5px solid rgba(167,139,250,0.85)' : '1px solid rgba(167,139,250,0.5)', boxShadow: game.field ? '0 0 14px rgba(167,139,250,0.45)' : '0 0 10px rgba(167,139,250,0.28)' }}>
            {game.field ? (
              <button className="block" onContextMenu={(e) => { e.preventDefault(); setInspect(game.field!.card) }} onClick={() => setInspect(game.field!.card)}>
                <MiniCard c={game.field.card} w={48} />
              </button>
            ) : (
              <div className="rounded-md flex items-center justify-center" style={{ width: 48, height: 64, border: '1px dashed rgba(167,139,250,0.4)', margin: 1 }}>{slotTypeIcon('field', 26, '🌍', '#a78bfa')}</div>
            )}
          </div>
        </div>
      )}

      {game && !showLog && !useHLayout && isTouch && (() => {
        const items = game.log
          .map((e, idx) => {
            const card = e.t === 'draw' && e.side !== 'you' ? null : findCard(e.cardName)
            const zi = e.t === 'zmk' && e.zmk ? zmkImg(game, e.zmk) : null
            return (card || zi) ? { e, idx, card, zi } : null
          })
          .filter((x): x is NonNullable<typeof x> => !!x)
          .slice(-3)
        if (items.length === 0) return null
        return (
          <div className="fixed right-1 top-1/2 -translate-y-1/2 z-[118] flex flex-col gap-1 rounded-lg p-1" style={{ maxHeight: '72vh', overflow: 'hidden', background: 'rgba(10,8,16,0.72)', border: '1px solid rgba(240,180,41,0.3)', boxShadow: '0 2px 10px rgba(0,0,0,0.5)' }}>
            {items.map(({ e, idx, card, zi }) => {
              const col = e.side === 'you' ? '#4ade80' : '#f87171'
              return (
                <div key={idx + '-mini'}
                  onClick={() => { if (card) { playCardFlip(); setInspect(card) } else setShowLog(true) }}
                  onMouseEnter={card && !isTouch ? (ev) => setHoverCard({ card, x: ev.clientX, y: ev.clientY }) : undefined}
                  onMouseMove={card && !isTouch ? (ev) => setHoverCard((h) => h ? { ...h, x: ev.clientX, y: ev.clientY } : { card, x: ev.clientX, y: ev.clientY }) : undefined}
                  onMouseLeave={!isTouch ? () => setHoverCard(null) : undefined}
                  onTouchStart={card ? () => { lpRef.current = setTimeout(() => { playCardFlip(); setInspect(card) }, 400) } : undefined}
                  onTouchEnd={() => { if (lpRef.current) { clearTimeout(lpRef.current); lpRef.current = null } }}
                  onTouchMove={() => { if (lpRef.current) { clearTimeout(lpRef.current); lpRef.current = null } }}
                  className="rounded overflow-hidden cursor-pointer shrink-0"
                  style={{ width: 24, aspectRatio: '2.5 / 3.5', outline: '2px solid ' + col, boxShadow: '0 0 6px ' + col + '88' }}
                  title={card ? card.name : (t('battle.game.zmk') + ' ' + (e.zmk ?? ''))}>
                  {card ? <MiniCard c={card} w={24} /> : <img src={zi!} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} draggable={false} />}
                </div>
              )
            })}
          </div>
        )
      })()}

      {showLog && game && (
          <motion.div ref={logScrollRef} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 30 }}
            className="fixed right-2 top-12 bottom-2 z-[124] w-[min(300px,80vw)] rounded-xl p-3 overflow-y-auto"
            style={{ background: 'rgba(10,8,16,0.95)', border: '1px solid rgba(240,180,41,0.25)', touchAction: 'pan-y' }}
            onPointerDown={(e) => { logSwipeRef.current = { x: e.clientX, y: e.clientY } }}
            onPointerMove={(e) => { const st = logSwipeRef.current; if (!st) return; const dx = e.clientX - st.x, dy = e.clientY - st.y; if (dx > 70 && Math.abs(dx) > Math.abs(dy)) { logSwipeRef.current = null; playUiClick(); setShowLog(false) } }}
            onPointerUp={() => { logSwipeRef.current = null }}
            onPointerCancel={() => { logSwipeRef.current = null }}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--gold)' }}>{t('battle.game.eventLog')}</p>
              <button onClick={() => { playUiClick(); setShowLog(false) }} aria-label={t('battle.game.close')} className="text-sm leading-none px-2 py-0.5 rounded-full" style={{ background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(240,180,41,0.4)', color: 'var(--gold)' }}>✕</button>
            </div>
            <div className="space-y-1">
              {game.log.slice(-80).map((e, i) => {
                // Traukimo įvykiai: korta matoma TIK savininkui ('you'). Priešo (po swapPerspective – 'ai') traukimas lieka užverstas.
                const card = e.t === 'draw' && e.side !== 'you' ? null : findCard(e.cardName)
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
                        title={t('battle.game.inspectTip', { card: card.name })}>
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
                      {eventText(e, t)}
                    </p>
                  </div>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── sužaistos kortos hover peržiūra (PC) ── */}
      {!useHLayout && hoverCard && typeof document !== 'undefined' && createPortal(
        <div className="fixed z-[200] pointer-events-none"
          style={{
            left: Math.min(hoverCard.x + 20, (typeof window !== 'undefined' ? window.innerWidth : 800) - 300),
            top: Math.max(8, Math.min(hoverCard.y - 40, (typeof window !== 'undefined' ? window.innerHeight : 600) - 440)),
          }}>
          <div className="rounded-xl overflow-hidden" style={{ width: 280, background: 'var(--bg-surface)', border: '2px solid ' + hoverCard.card.rarityColor, boxShadow: '0 10px 40px rgba(0,0,0,0.8)' }}>
            <MiniCard c={hoverCard.card} w={280} />
            <div className="p-2.5">
              <p className="text-sm font-bold" style={{ color: 'var(--text-primary)', fontFamily: 'var(--rvn-font-display)' }}>{hoverCard.card.name}</p>
              {hoverCard.card.effectText && (
                <p className="text-xs mt-1 leading-snug" style={{ color: 'var(--text-secondary)' }}>{hoverCard.card.effectText}</p>
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
                  {t('battle.game.championPhase', { card: ch.card.name, phase: ch.phase })}
                </p>
                <p className="text-[11px] mb-3" style={{ color: ch.abilityUsed ? '#f87171' : 'var(--text-muted)' }}>
                  {ch.abilityUsed ? t('battle.game.skillUsed') : t('battle.game.pickSkill')}
                </p>
                <div className="space-y-2">
                  {skills.length === 0 && (
                    <p className="text-xs text-center py-3" style={{ color: 'var(--text-muted)' }}>{t('battle.game.noSkills')}</p>
                  )}
                  {skills.map((sk, i) => {
                    const disabled = !sk.unlocked || ch.abilityUsed
                    return (
                      <button key={i} disabled={disabled}
                        onClick={() => { setChampPopup(null); doAction({ t: 'champ', actor: 'you', skillIndex: i }) }}
                        className="w-full text-left px-3 py-2 rounded-xl transition-all disabled:opacity-40"
                        style={{ background: sk.unlocked ? 'rgba(240,180,41,0.12)' : 'var(--bg-elevated)', border: '1px solid ' + (sk.unlocked ? 'rgba(240,180,41,0.4)' : 'var(--bg-border)') }}>
                        <span className="text-xs font-bold" style={{ color: sk.unlocked ? 'var(--gold)' : 'var(--text-muted)' }}>
                          {i + 1}. {sk.name} {!sk.unlocked && t('battle.game.skillLocked', { phase: i + 1 })}
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
              <p className="text-sm font-bold mb-1" style={{ fontFamily: 'var(--rvn-font-display)', color: 'var(--gold)' }}>{t('battle.game.swapPhaseTitle')}</p>
              <p className="text-[11px] mb-3" style={{ color: 'var(--text-secondary)' }}>{t('battle.game.swapPhaseText', { card: champSwap.name, phase: champSwap.phase })}</p>
              <div className="flex flex-col gap-2">
                {champSwap.options.map((tp) => (
                  <button key={tp} onClick={() => { playUiClick(); doAction({ t: 'swapChampPhase', actor: 'you', uid: champSwap.cardUid, phase: tp }); setChampSwap(null) }}
                    className="px-4 py-2 rounded-xl text-sm font-bold" style={{ background: 'rgba(240,180,41,0.14)', border: '1px solid rgba(240,180,41,0.45)', color: 'var(--gold)', fontFamily: 'var(--rvn-font-display)' }}>
                    {t('battle.game.phaseN', { phase: tp })}
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── kortos apžiūra ── */}
      <AnimatePresence>
        {avatarInspect && (() => {
          const av = avatarInspect.avatar
          const af = av?.fit ?? { x: 50, y: 50, zoom: 100 }
          const aFit: React.CSSProperties = { width: '100%', height: '100%', objectFit: 'cover', objectPosition: `${af.x}% ${af.y}%`, transform: `scale(${Math.max(1, af.zoom / 100)})`, transformOrigin: 'center' }
          return (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[200] flex flex-col items-center justify-center p-6 gap-3"
              style={{ background: 'rgba(0,0,0,0.88)' }} onClick={() => setAvatarInspect(null)}>
              <motion.div initial={{ scale: 0.82 }} animate={{ scale: 1 }} className="relative" style={{ width: 'min(380px, 84vw)', aspectRatio: '1' }} onClick={(e) => e.stopPropagation()}>
                <div className="absolute overflow-hidden" style={{ top: '24.5%', left: '24.5%', right: '24%', bottom: '29%', background: '#0a0810', borderRadius: 6 }}>
                  {avatarInspect.vid
                    ? <video src={avatarInspect.vid} autoPlay loop muted playsInline style={aFit} />
                    : av?.imageUrl
                      // eslint-disable-next-line @next/next/no-img-element
                      ? <img src={av.imageUrl} alt={av.name} style={aFit} draggable={false} />
                      : <span className="w-full h-full flex items-center justify-center" style={{ fontSize: 80 }}>{av?.emoji ?? '\u{1F70F}'}</span>}
                </div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/icons/frame.png" alt="" className="absolute inset-0 w-full h-full pointer-events-none select-none" draggable={false} />
              </motion.div>
              <p className="text-base font-bold" style={{ fontFamily: 'var(--rvn-font-display)', color: 'var(--gold)', letterSpacing: '0.06em' }}>{av?.name ?? 'Avataras'}</p>
            </motion.div>
          )
        })()}

        {inspect && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[135] flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.75)' }}
            onClick={() => { playCardPlace(); setInspect(null) }}>
            <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} onClick={(e) => e.stopPropagation()}>
              <GameCard glowColor={inspect.rarityColor} intensity={12}>
                <MiniCard c={inspect} w={Math.min(320, typeof window !== 'undefined' ? window.innerWidth * 0.84 : 320)} />
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
            title={t('battle.game.showTipTip')}>
            🎓
          </motion.button>
        )}
      </AnimatePresence>

      {/* ── kovos FX sluoksnis (projektilai, kirčiai, skaičiai) ── */}
      <BattleFxLayer ref={fxRef} />

      {/* ── pilno lauko summon efektas ── */}
      {boardFx && <SummonBurst type={boardFx.type} x={boardFx.x} y={boardFx.y} effectKey={boardFx.key} onDone={() => setBoardFx(null)} />}

      {/* ── Premium kino pop-up (summon + championSkill); portalas į body, kad position:fixed netruktų board transform ── */}
      {typeof document !== 'undefined' && createPortal(
        <RavenofCinematicOverlay cinematic={cine.current} onFinished={cine.finish} />,
        document.body,
      )}

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

      {/* ── pasmerktos kortos (laiko vietoje kol kirtis atskrieja, tada subyra) ── */}
      <div className="fixed inset-0 z-[127] pointer-events-none">
        <AnimatePresence>
          {deathGhosts.map((g) => (
            <motion.div key={'ghost' + g.id}
              initial={{ opacity: 1, scale: 1 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.55, filter: 'grayscale(1) brightness(1.7)' }}
              transition={{ duration: 0.34, ease: 'easeIn' }}
              className="absolute rvn-doom"
              style={{ left: g.x - unitW / 2, top: g.y - Math.round(unitW * 4 / 3) / 2 }}>
              <MiniCard c={g.card} w={unitW} />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* ── skrendančios kortos (sunaikinta/panaudota → kapinynas) ── */}
      <div className="fixed inset-0 z-[129] pointer-events-none">
        {/* ── sunaikintos kortos gabalai: išsilaksto → susiburia → skrenda į kapinyną ── */}
        <AnimatePresence>
          {flyingShatters.map((fc) => {
            const PW = 18, PH = 25, N = 3
            return Array.from({ length: N * N }).map((_, k) => {
              const c = k % N, r = Math.floor(k / N)
              const dirX = c - 1, dirY = r - 1
              const cellCx = fc.from.x + dirX * PW
              const cellCy = fc.from.y + dirY * PH
              const scX = fc.from.x + dirX * 46
              const scY = fc.from.y + dirY * 46 - 10
              const rot = (dirX + dirY * 2) * 40
              return (
                <motion.div key={fc.id + '-sh-' + k}
                  initial={{ left: cellCx, top: cellCy, opacity: 1, scale: 1, rotate: 0 }}
                  animate={{ left: [cellCx, scX, fc.to.x], top: [cellCy, scY, fc.to.y], opacity: [1, 1, 0.12], scale: [1, 1, 0.28], rotate: [0, rot, rot * 1.6] }}
                  transition={{ duration: 1.1, ease: [0.3, 0, 0.4, 1], times: [0, 0.28, 1] }}
                  className="absolute"
                  style={{
                    width: PW, height: PH, marginLeft: -PW / 2, marginTop: -PH / 2,
                    backgroundImage: `url(${fc.card.image})`, backgroundSize: `${PW * N}px ${PH * N}px`,
                    backgroundPosition: `-${c * PW}px -${r * PH}px`,
                    borderRadius: 2, boxShadow: '0 2px 6px rgba(0,0,0,0.6)',
                  }} />
              )
            })
          })}
        </AnimatePresence>
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

      {/* ── kortos „pop" prie taikinio (burtai / efektai / atakos) ── */}
      <div className="fixed inset-0 z-[130] pointer-events-none">
        <AnimatePresence>
          {popCards.map((pp) => (
            <div key={'pop' + pp.id} className="absolute" style={{ left: pp.x, top: pp.y, transform: 'translateX(-50%)' }}>
              <motion.div initial={{ opacity: 0, scale: 0.5, y: 0 }} animate={{ opacity: [0, 1, 1, 0], scale: [0.5, 1, 1, 0.92], y: [0, -20, -28, -42] }} transition={{ duration: 1.2, ease: 'easeOut', times: [0, 0.25, 0.7, 1] }} className="flex flex-col items-center gap-1">
                {pp.tag && <span className="px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap" style={{ background: 'rgba(8,6,12,0.92)', border: '1px solid ' + pp.color, color: pp.color, fontFamily: 'var(--rvn-font-display)' }}>{pp.tag}</span>}
                {pp.card ? <div style={{ outline: '2px solid ' + pp.color, borderRadius: 10, filter: 'drop-shadow(0 8px 18px rgba(0,0,0,0.7))' }}><MiniCard c={pp.card} w={isTouch ? 66 : 84} /></div> : null}
              </motion.div>
            </div>
          ))}
        </AnimatePresence>
      </div>

      {/* ── Showcase: burtas/prakeiksmas/reakcija atskrenda į centrą ir užauga iki ~40% ekrano ── */}
      <div className="fixed inset-0 z-[132] pointer-events-none">
        <AnimatePresence>
          {showcases.map((sc) => {
            const cx = window.innerWidth / 2, cy = window.innerHeight * 0.46
            const w = Math.round(window.innerHeight * 0.4 * 0.75)   // korta ~40% ekrano aukščio
            const col = sc.kind === 'curse' ? '#a855f7' : sc.kind === 'reaction' ? '#fbbf24' : '#60a5fa'
            return (
              <div key={'sw' + sc.id} className="absolute" style={{ left: cx, top: cy, perspective: 900 }}>
                <motion.div
                  initial={{ x: sc.from.x - cx, y: sc.from.y - cy, scale: 0.16, opacity: 0, rotateY: sc.kind === 'reaction' ? 180 : 0 }}
                  animate={{ x: 0, y: 0, scale: 1, opacity: [0, 1, 1, 1, 0], rotateY: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 2.4, times: [0, 0.1, 0.14, 0.93, 1], ease: 'easeOut' }}
                  className="absolute"
                  style={{ transform: 'translate(-50%, -50%)', marginLeft: -w / 2, marginTop: -Math.round(w * 4 / 3) / 2 }}>
                  <div style={{ outline: '3px solid ' + col, borderRadius: 14, boxShadow: `0 0 44px ${col}88, 0 18px 50px rgba(0,0,0,0.8)` }}>
                    {sc.card
                      ? <MiniCard c={sc.card} w={w} readable />
                      : <div className="flex items-center justify-center rounded-xl" style={{ width: w, height: Math.round(w * 4 / 3), background: 'linear-gradient(145deg, #1a1325, #0d0a14)', border: '1px solid ' + col, fontSize: 40 }}>{sc.kind === 'curse' ? '☠' : sc.kind === 'reaction' ? '⚡' : '✨'}</div>}
                  </div>
                </motion.div>
              </div>
            )
          })}
        </AnimatePresence>
      </div>

      {/* ── grąžinamos į ranką kortos (laukas → lėtai pakyla → greit į ranką) ── */}
      <div className="fixed inset-0 z-[129] pointer-events-none">
        <AnimatePresence>
          {flyingReturns.map((fc) => (
            <motion.div key={'ret' + fc.id}
              initial={{ left: fc.from.x - 20, top: fc.from.y - 26, opacity: 1, scale: 1, rotate: 0 }}
              animate={{ left: [fc.from.x - 20, fc.from.x - 20, fc.to.x - 16], top: [fc.from.y - 26, fc.from.y - 62, fc.to.y - 20], opacity: [1, 1, 0.2], scale: [1, 1.1, 0.5], rotate: [0, 0, fc.side === 'you' ? -10 : 10] }}
              transition={{ duration: 0.85, ease: 'easeIn', times: [0, 0.45, 1] }}
              className="absolute"
              style={{ filter: 'drop-shadow(0 6px 16px rgba(0,0,0,0.65))' }}>
              <MiniCard c={fc.card} w={44} />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* ── skrendančios traukiamos kortos (kaladė → ranka) ── */}
      <div className="fixed inset-0 z-[129] pointer-events-none">
        <AnimatePresence>
          {flyingDraws.map((fc) => {
            const mx = (fc.from.x + fc.to.x) / 2, my = (fc.from.y + fc.to.y) / 2 - 26
            return (
            <motion.div key={'draw' + fc.id}
              initial={{ left: fc.from.x - 38, top: fc.from.y - 50, opacity: 0, scale: 0.4, rotate: fc.side === 'you' ? -16 : 16 }}
              animate={{ left: [fc.from.x - 38, mx - 38, fc.to.x - 38], top: [fc.from.y - 50, my - 50, fc.to.y - 50], opacity: [0, 1, 0.12], scale: [0.4, 1.05, 0.6], rotate: [fc.side === 'you' ? -16 : 16, fc.side === 'you' ? -4 : 4, 0] }}
              transition={{ duration: 0.95, ease: 'easeInOut', times: [0, 0.55, 1] }}
              className="absolute"
              style={{ filter: 'drop-shadow(0 0 14px rgba(240,180,41,0.5)) drop-shadow(0 8px 22px rgba(0,0,0,0.72))' }}>
              {fc.card
                ? <div style={{ outline: '1.5px solid rgba(240,180,41,0.55)', borderRadius: 10 }}><MiniCard c={fc.card} w={76} /></div>
                : <div className="relative rounded-md overflow-hidden" style={{ width: 68, height: 91, border: '1px solid rgba(240,180,41,0.5)', background: '#0d0a14', boxShadow: '0 0 12px rgba(240,180,41,0.35)' }}><PileBack kind="plain" owner={fc.side === 'you' ? 'me' : 'opp'} /></div>}
            </motion.div>
            )
          })}
        </AnimatePresence>
      </div>

      {/* ── ŽMK auto-traukimo miniatiūros PRIE TAIKINIO (mažos, švarios; vietoj didelių centre) ── */}
      <AnimatePresence>
        {zmkFlash && (() => {
          // Grupuojam pagal taikinio poziciją – kiekvienas ŽMK rodomas PRIE savo taikinio (AoE/multi → prie visų).
          const groups = new Map<string, { x: number; y: number; cards: { v: string; side: Side }[] }>()
          for (const p of zmkFlash.placed) {
            const key = Math.round(p.x / 18) + ':' + Math.round(p.y / 18)
            const g = groups.get(key) ?? { x: p.x, y: p.y, cards: [] }
            g.cards.push({ v: p.v, side: p.side })
            groups.set(key, g)
          }
          return (
            <motion.div key={zmkFlash.n} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[130] pointer-events-none">
              {Array.from(groups.values()).map((grp, gi) => (
                <div key={gi} className="absolute" style={{ left: grp.x, top: grp.y - 60, transform: 'translateX(-50%)' }}>
                  <div className="flex items-end justify-center gap-1">
                    {grp.cards.map((zc, idx) => {
                      const col = zc.v.startsWith('+') && zc.v !== '+0' ? '#4ade80' : zc.v.startsWith('-') ? '#f87171' : 'var(--gold)'
                      const sideCol = zc.side === 'you' ? '#4ade80' : '#f87171'
                      return (
                        <motion.div key={idx} initial={{ scale: 0.3, opacity: 0, y: 10, rotateY: 80 }} animate={{ scale: 1, opacity: 1, y: 0, rotateY: 0 }} exit={{ scale: 0.6, opacity: 0, y: -12 }}
                          transition={{ type: 'spring', stiffness: 300, damping: 18, delay: idx * 0.07 }}
                          className="flex flex-col items-center gap-0.5" style={{ transformStyle: 'preserve-3d' }}>
                          {zmkImg(game, zc.v) ? (
                            <div className="rounded-md overflow-hidden" style={{ width: 36, aspectRatio: '2.5 / 3.5', border: '2px solid ' + sideCol, boxShadow: '0 0 11px ' + sideCol + '99' }}>
                              <img src={zmkImg(game, zc.v)!} alt={`ŽMK ${zc.v}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} draggable={false} />
                            </div>
                          ) : null}
                          <span className="px-1.5 rounded font-black text-[11px]"
                            style={{ background: 'rgba(8,6,12,0.92)', border: '1px solid ' + col, color: col, fontFamily: 'var(--rvn-font-display)' }}>
                            {zc.v.replace('x', '×')}
                          </span>
                        </motion.div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </motion.div>
          )
        })()}
      </AnimatePresence>

      {/* ── ŽMK pranašumas / nepalankumas: 2 kortos, nepanaudota subyra ── */}
      <AnimatePresence>
        {zmkRoll && (
          <motion.div key={'roll' + zmkRoll.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[131] flex items-center justify-center pointer-events-none">
            <ZmkRoll roll={zmkRoll} game={game} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── iškvietimo pasirinkimas (summonChoose) ── */}
      <AnimatePresence>
        {game?.pendingReturn && game.pendingReturn.side === 'you' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-[170] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.82)' }}>
            <motion.div initial={{ scale: 0.92, y: 12 }} animate={{ scale: 1, y: 0 }} className="w-[min(430px,94vw)] px-4 py-4 rounded-2xl"
              style={{ background: 'radial-gradient(120% 90% at 50% 0%, rgba(167,139,250,0.16), rgba(10,8,16,0.98) 60%), linear-gradient(160deg, #15101f, #0a0810)', border: '1px solid rgba(167,139,250,0.5)' }}>
              <p className="text-sm font-bold mb-1" style={{ fontFamily: 'var(--rvn-font-display)', color: '#c4b5fd' }}>🌍 Lauko efektas</p>
              <p className="text-[11px] mb-3" style={{ color: 'var(--text-muted)' }}>{t('battle.game.pickReturnUnit')}</p>
              {P(game, 'ai').units.some(Boolean) && (
                <>
                  <p className="text-[10px] uppercase tracking-widest mb-1" style={{ color: '#f87171' }}>{t('battle.game.enemyUnits')}</p>
                  <div className="flex flex-wrap justify-center gap-2 mb-3">
                    {P(game, 'ai').units.filter((x): x is NonNullable<typeof x> => !!x).map((u) => (
                      <button key={u.uid} onClick={() => { playSuccess(); doAction({ t: 'resolveReturn', uid: u.uid }) }} className="transition-transform hover:-translate-y-1 active:scale-95" title={u.card.name}>
                        <MiniCard c={u.card} w={72} />
                      </button>
                    ))}
                  </div>
                </>
              )}
              {P(game, 'you').units.some(Boolean) && (
                <>
                  <p className="text-[10px] uppercase tracking-widest mb-1" style={{ color: '#4ade80' }}>Tavo padarai</p>
                  <div className="flex flex-wrap justify-center gap-2">
                    {P(game, 'you').units.filter((x): x is NonNullable<typeof x> => !!x).map((u) => (
                      <button key={u.uid} onClick={() => { playSuccess(); doAction({ t: 'resolveReturn', uid: u.uid }) }} className="transition-transform hover:-translate-y-1 active:scale-95" title={u.card.name}>
                        <MiniCard c={u.card} w={72} />
                      </button>
                    ))}
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}

        {game?.pendingSummon && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[133] flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.7)' }}>
            <motion.div initial={{ scale: 0.92, y: 10 }} animate={{ scale: 1, y: 0 }}
              className="rounded-2xl p-4 w-[min(580px,94vw)] max-h-[86vh] overflow-y-auto text-center"
              style={{ background: 'linear-gradient(145deg, #1a1325, #0d0a14)', border: '1px solid rgba(240,180,41,0.5)' }}>
              <p className="text-sm font-bold mb-1" style={{ fontFamily: 'var(--rvn-font-display)', color: 'var(--gold)' }}>{t('battle.game.summonPickTitle')}</p>
              <p className="text-xs mb-3" style={{ color: 'var(--text-secondary)' }}>
                {t('battle.game.summonPickMark', { choose: game.pendingSummon.choose, picked: summonSel.length })}
              </p>
              <div className="flex flex-wrap gap-2 justify-center mb-4">
                {game.pendingSummon.options.map((o) => {
                  const sel = summonSel.includes(o.card.uid)
                  const full = summonSel.length >= game!.pendingSummon!.choose
                  const zl = o.zone === 'hand' ? t('battle.game.zoneHand') : o.zone === 'deck' ? t('battle.game.zoneDeck') : t('battle.game.zoneGrave')
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
                {t('battle.game.summonPickBtn')}
              </button>
            </motion.div>
          </motion.div>
        )}

        {game?.pendingCopy && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[133] flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.7)' }}>
            <motion.div initial={{ scale: 0.92, y: 10 }} animate={{ scale: 1, y: 0 }}
              className="rounded-2xl p-4 w-[min(580px,94vw)] max-h-[86vh] overflow-y-auto text-center"
              style={{ background: 'linear-gradient(145deg, #1a1325, #0d0a14)', border: '1px solid rgba(167,139,250,0.5)' }}>
              <p className="text-sm font-bold mb-1" style={{ fontFamily: 'var(--rvn-font-display)', color: '#c4b5fd' }}>{game.pendingCopy.mode === 'lastwish' ? t('battle.game.glwTitle') : t('battle.game.copyTitle')}</p>
              <p className="text-xs mb-3" style={{ color: 'var(--text-secondary)' }}>{game.pendingCopy.mode === 'lastwish' ? t('battle.game.glwText') : t('battle.game.copyText')}</p>
              <div className="flex flex-wrap gap-2 justify-center mb-1">
                {game.pendingCopy.options.map((o) => (
                  <button key={o.card.uid} onClick={() => { playSuccess(); doAction({ t: 'resolveCopy', uid: o.card.uid }) }}
                    className="relative transition-transform hover:-translate-y-1" title={o.card.name}>
                    <div style={{ outline: '2px solid transparent', borderRadius: 10 }}>
                      <MiniCard c={o.card} w={isTouch ? 60 : 74} />
                    </div>
                    <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-[8px] px-1 rounded-full" style={{ background: '#14101e', color: o.side === 'you' ? '#86efac' : '#fca5a5' }}>{o.side === 'you' ? t('battle.game.sideYours') : t('battle.game.sideEnemy')}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── pasirink 1 iš kelių efektų / tutor korta į ranką ── */}
      <AnimatePresence>
        {game?.pendingChoice && ((game.pendingChoice.chooser ?? game.pendingChoice.caster) === 'you') && (
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
      {/* (senas handExpanded bottom-sheet overlay pašalintas – ranka dabar skleidžiasi inline) */}

      {/* ── paskutinės 20s: didelis raudonas laikrodis (PvP) — izoliuotas ── */}
      {(vsRemote || ranked) && !game?.winner && <TurnTimer deadline={turnDeadline} variant="big" />}

      {/* ── varžovas atsijungė: 30s grace ── */}
      {oppMissingLeft !== null && !game?.winner && (
        <div className="fixed inset-x-0 top-12 z-[124] flex justify-center pointer-events-none px-4">
          <div className="px-4 py-2 rounded-xl text-center" style={{ background: 'rgba(90,15,15,0.93)', border: '1px solid rgba(239,68,68,0.6)' }}>
            <p className="text-sm font-bold" style={{ color: '#fca5a5', fontFamily: 'var(--rvn-font-display)' }}>{t('battle.game.opponentDisconnected')}</p>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Laukiama prisijungimo: {oppMissingLeft}s</p>
          </div>
        </div>
      )}

      {/* ── ėjimo pasikeitimo pranešimas (kieno eilė) ── */}
      <AnimatePresence>
        {turnBanner && (
          <motion.div initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[129] flex items-center justify-center pointer-events-none">
            <div className="px-7 py-4 rounded-2xl text-center" style={{ background: 'rgba(10,8,16,0.93)', border: '1px solid ' + (turnBanner.you ? 'rgba(74,222,128,0.6)' : 'rgba(239,68,68,0.6)'), boxShadow: '0 0 36px rgba(0,0,0,0.7)' }}>
              <p className="text-2xl font-bold" style={{ fontFamily: 'var(--rvn-font-display)', color: turnBanner.you ? '#4ade80' : '#f87171' }}>{turnBanner.name}</p>
              <p className="text-sm tracking-wide mt-0.5" style={{ color: 'var(--text-secondary)' }}>{t('battle.game.turnLabel')}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── kelių taikinių parinkimo indikatorius (1/N) ── */}
      {(select?.kind === 'spell' || select?.kind === 'spellMulti' || select?.kind === 'lastwish') && (
        <div className="fixed left-1/2 -translate-x-1/2 bottom-24 z-[121] flex items-center gap-2">
          <div className="px-4 py-2 rounded-full text-sm font-bold pointer-events-none"
            style={{ background: 'rgba(13,10,20,0.92)', border: '1px solid rgba(240,180,41,0.6)', color: 'var(--gold)', fontFamily: 'var(--rvn-font-display)' }}>
            {select.kind === 'lastwish'
              ? <>🕯 {t('battle.game.lastwishTargets', { card: game?.pendingLastwish?.cardName ?? '', picked: select.picked.length, need: select.need })}</>
              : <>🎯 {select.kind === 'spellMulti' ? t('battle.game.targets', { picked: select.picked.length, need: select.need }) : (select.picked ? t('battle.game.targetPicked') : t('battle.game.pickTarget'))}</>}
          </div>
          <button onClick={confirmSpellTargets} disabled={!canConfirmTargets}
            className="px-4 py-2 rounded-full text-sm font-extrabold"
            style={{ background: canConfirmTargets ? 'linear-gradient(145deg,#16a34a,#15803d)' : 'rgba(40,40,46,0.8)', border: '1px solid ' + (canConfirmTargets ? '#4ade80' : 'rgba(255,255,255,0.15)'), color: canConfirmTargets ? '#fff' : 'rgba(255,255,255,0.4)', boxShadow: canConfirmTargets ? '0 0 16px rgba(34,197,94,0.55)' : 'none', cursor: canConfirmTargets ? 'pointer' : 'not-allowed' }}>
            ✓ Gerai
          </button>
          <button onClick={() => { playUiClick(); if (select?.kind === 'lastwish') doAction({ t: 'resolveLastwish', targets: [] }); setSelect(null) }}
            className="px-3 py-2 rounded-full text-sm font-bold"
            style={{ background: 'rgba(13,10,20,0.92)', border: '1px solid rgba(239,68,68,0.5)', color: '#fca5a5' }}>
            ✕
          </button>
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
                {millShow.side === 'you' ? t('battle.game.millYou', { count: millShow.cards.length }) : t('battle.game.millAi', { count: millShow.cards.length })}
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
              <p className="text-xs mb-3" style={{ color: 'var(--text-secondary)' }}>{t('battle.game.deckTopText')}</p>
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
                {t('battle.game.peekTitle')}
              </p>
              <p className="text-xs mb-3" style={{ color: 'var(--text-secondary)' }}>
                {t('battle.game.peekMark', { choose: game.pendingPeek.choose, picked: peekSel.length })}
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
                {t('battle.game.peekBtn')}
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
                <p className="text-xs text-center py-6" style={{ color: 'var(--text-muted)' }}>{t('battle.game.empty')}</p>
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
                {t('battle.game.zmkDrawTitle', { side: zmkPending[0].side === 'you' ? t('battle.game.zmkSideYou') : t('battle.game.zmkSideAi') })}
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

      {/* ── Monetos metimo animacija (žalia/raudona pusė) ── */}
      <AnimatePresence>
        {coinAnim && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[132] flex items-center justify-center pointer-events-none p-4">
            <motion.div initial={{ scale: 0.4, opacity: 0, y: -30 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.7, opacity: 0 }}
              transition={{ type: 'spring', damping: 14 }} className="flex flex-col items-center gap-3">
              {/* Tikra dvipusė moneta: verčiasi (rotateX) ir nutupia ant rezultato pusės. */}
              <div style={{ perspective: 700, width: 100, height: 100 }}>
                <motion.div
                  initial={{ rotateX: 0 }}
                  animate={{ rotateX: 360 * 4 + (coinAnim.coin === 'red' ? 180 : 0) }}
                  transition={{ duration: 1.05, ease: [0.15, 0.6, 0.25, 1] }}
                  style={{ width: 100, height: 100, position: 'relative', transformStyle: 'preserve-3d' }}>
                  {/* ŽALIA pusė (priekis) */}
                  <div style={{
                    position: 'absolute', inset: 0, borderRadius: '50%', backfaceVisibility: 'hidden',
                    background: 'radial-gradient(circle at 35% 30%, #6ee7a8, #16a34a 70%, #0f7a36)',
                    border: '4px solid #bbf7d0', boxShadow: '0 12px 40px rgba(0,0,0,0.6), 0 0 28px rgba(34,197,94,0.6)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 46, color: '#fff',
                  }}>✔</div>
                  {/* RAUDONA pusė (kita) */}
                  <div style={{
                    position: 'absolute', inset: 0, borderRadius: '50%', backfaceVisibility: 'hidden', transform: 'rotateX(180deg)',
                    background: 'radial-gradient(circle at 35% 30%, #fca5a5, #dc2626 70%, #991b1b)',
                    border: '4px solid #fecaca', boxShadow: '0 12px 40px rgba(0,0,0,0.6), 0 0 28px rgba(220,38,38,0.6)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 46, color: '#fff',
                  }}>✘</div>
                </motion.div>
              </div>
              <span className="px-3 py-1 rounded-full text-sm font-bold"
                style={{ background: 'rgba(8,6,12,0.92)', fontFamily: 'var(--rvn-font-display)', letterSpacing: '0.08em',
                  border: '1px solid ' + (coinAnim.coin === 'green' ? '#22c55e' : '#dc2626'),
                  color: coinAnim.coin === 'green' ? '#4ade80' : '#f87171' }}>
                {coinAnim.coin === 'green' ? t('battle.game.coinGreen') : t('battle.game.coinRed')}
              </span>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── kortos „flash" pop-up: sužaistas burtas (1s) / prakeiksmas (įmaišomas/aktyvuojamas) ── */}
      <AnimatePresence>
        {cardFlash && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[131] flex items-start justify-center pointer-events-none px-4" style={{ paddingTop: '9vh' }}>
            <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.85, opacity: 0 }}
              transition={{ type: 'spring', damping: 16 }} className="flex flex-col items-center gap-2">
              {cardFlash.tag && (
                <span className="px-3 py-1 rounded-full text-sm font-bold" style={{ background: 'rgba(8,6,12,0.92)', border: '1px solid ' + cardFlash.color, color: cardFlash.color, fontFamily: 'var(--rvn-font-display)', letterSpacing: '0.06em' }}>{cardFlash.tag}</span>
              )}
              {cardFlash.cards && cardFlash.cards.length > 0 ? (
                <div className="flex flex-wrap items-center justify-center gap-2 max-w-[94vw]">
                  {cardFlash.cards.map((c, ci) => (
                    <div key={ci} style={{ filter: 'drop-shadow(0 10px 24px rgba(0,0,0,0.7))', outline: '2px solid ' + cardFlash.color, borderRadius: 12 }}>
                      {c ? <MiniCard c={c} w={isTouch ? 72 : 96} /> : <div className="px-3 py-2 rounded-lg text-xs" style={{ background: 'rgba(8,6,12,0.95)', border: '1px solid ' + cardFlash.color, color: 'var(--text-primary)' }}>?</div>}
                    </div>
                  ))}
                </div>
              ) : cardFlash.card ? (
                <div style={{ filter: 'drop-shadow(0 14px 34px rgba(0,0,0,0.75))', outline: '2px solid ' + cardFlash.color, borderRadius: 14 }}>
                  <MiniCard c={cardFlash.card} w={isTouch ? 100 : 132} />
                </div>
              ) : (
                <div className="px-5 py-3 rounded-xl text-base font-bold" style={{ background: 'rgba(8,6,12,0.95)', border: '1px solid ' + cardFlash.color, color: 'var(--text-primary)' }}>{cardFlash.title}</div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── pergalės / pralaimėjimo modalas ── */}
      <AnimatePresence>
        {vsRemote && (
          <BattleChatHead chatLog={chatLog} chatInput={chatInput} setChatInput={setChatInput} sendBattleChat={sendBattleChat} open={chatOpen} setOpen={setChatOpen} />
        )}
        {game?.winner && endShown && (
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
                {game.winner === 'you' ? t('battle.game.victory') : t('battle.game.defeat')}
              </p>
              <p className="text-xs mb-5" style={{ color: 'var(--text-secondary)' }}>
                {game.winner === 'you'
                  ? t('battle.game.victoryText')
                  : t('battle.game.defeatText')}
              </p>

              {/* ── Atlygis + level-up šventė ── */}
              {matchReward && matchReward.valid && (matchReward.gold > 0 || matchReward.xp > 0) && (() => {
                const lvlBefore = getLevelForXp(matchReward.before)
                const prog = getLevelProgress(matchReward.after)
                const leveledUp = prog.level > lvlBefore
                const startPct = leveledUp ? 0 : getLevelProgress(matchReward.before).progressPercent
                return (
                  <div className="mb-4">
                    {leveledUp && (
                      <motion.div initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.25, type: 'spring', stiffness: 220, damping: 16 }}
                        className="mb-3 px-3 py-2 rounded-xl relative overflow-hidden"
                        style={{ background: 'radial-gradient(120% 120% at 50% 0%, rgba(240,180,41,0.28), transparent 60%), linear-gradient(160deg, rgba(46,34,64,0.92), rgba(12,9,18,0.96))', border: '1px solid rgba(240,180,41,0.6)', boxShadow: '0 0 26px rgba(240,180,41,0.4)' }}>
                        <div className="text-[11px] font-extrabold tracking-wider" style={{ color: 'var(--gold)', fontFamily: 'var(--rvn-font-display)', textShadow: '0 0 14px rgba(240,180,41,0.6)' }}>✦ NAUJAS LYGIS {prog.level} ✦</div>
                        <div className="text-[10px] mt-0.5" style={{ color: '#e8dcc0' }}>{prog.title}</div>
                        {matchReward.levelRewards.length > 0 && (() => {
                          const agg = { silver: 0, essence: 0, rubies: 0, packs: 0, items: [] as string[] }
                          for (const e of matchReward.levelRewards) for (const it of e.payload) {
                            if (it.type === 'currency') { const a = Number(it.amount) || 0; if (it.currency === 'silver') agg.silver += a; else if (it.currency === 'essence') agg.essence += a; else if (it.currency === 'rubies') agg.rubies += a }
                            else if (it.type === 'item') { if (it.item_type === 'pack') agg.packs += Number(it.quantity) || 0; else if (it.item_type === 'card_back') agg.items.push(t('battle.game.cardBack')) }
                          }
                          const chipEl = (bg: string, bd: string, el: React.ReactNode) => (<span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: bg, border: `1px solid ${bd}` }}>{el}</span>)
                          return (
                            <motion.div initial={{ y: 6, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.45 }} className="flex flex-wrap items-center justify-center gap-1.5 mt-1.5">
                              <span className="text-[9px] uppercase tracking-widest w-full text-center" style={{ color: 'var(--text-muted)' }}>Lygio atlygis</span>
                              {agg.silver > 0 && chipEl('rgba(203,213,225,0.16)', 'rgba(203,213,225,0.5)', <RewardChip it={{ type: 'currency', currency: 'silver', amount: agg.silver }} size={13} textSize={10} color="#cbd5e1" />)}
                              {agg.essence > 0 && chipEl('rgba(139,92,246,0.16)', 'rgba(139,92,246,0.5)', <RewardChip it={{ type: 'currency', currency: 'essence', amount: agg.essence }} size={13} textSize={10} color="#c4b5fd" />)}
                              {agg.rubies > 0 && chipEl('rgba(239,68,68,0.16)', 'rgba(239,68,68,0.5)', <RewardChip it={{ type: 'currency', currency: 'rubies', amount: agg.rubies }} size={13} textSize={10} color="#fca5a5" />)}
                              {agg.packs > 0 && chipEl('rgba(251,146,60,0.16)', 'rgba(251,146,60,0.5)', <RewardChip it={{ type: 'item', item_type: 'pack', quantity: agg.packs }} size={13} textSize={10} color="#fdba74" />)}
                              {agg.items.map((n, i) => <span key={i}>{chipEl('rgba(96,165,250,0.16)', 'rgba(96,165,250,0.5)', <RewardChip it={{ type: 'item', item_type: 'card_back', item_id: n }} size={13} textSize={10} color="#93c5fd" />)}</span>)}
                            </motion.div>
                          )
                        })()}
                      </motion.div>
                    )}
                    <div className="flex items-center justify-center gap-2 mb-2.5">
                      {matchReward.gold > 0 && (
                        <motion.div initial={{ y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5"
                          style={{ background: 'linear-gradient(165deg, rgba(46,34,64,0.9), rgba(12,9,18,0.95))', border: '1px solid rgba(240,180,41,0.4)', color: '#f3ead3' }}>
                          <RewardChip it={{ type: 'currency', currency: 'silver', amount: matchReward.gold }} size={16} textSize={12} color="#f3ead3" />
                        </motion.div>
                      )}
                      {matchReward.xp > 0 && (
                        <motion.div initial={{ y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.18 }}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5"
                          style={{ background: 'linear-gradient(165deg, rgba(46,34,64,0.9), rgba(12,9,18,0.95))', border: '1px solid rgba(96,165,250,0.4)', color: '#cfe0ff' }}>
                          <RewardChip it={{ type: 'account_xp', amount: matchReward.xp }} size={16} textSize={12} color="#cfe0ff" />
                        </motion.div>
                      )}
                      {matchReward.seasonXp > 0 && (
                        <motion.div initial={{ y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.24 }}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5"
                          style={{ background: 'linear-gradient(165deg, rgba(46,34,64,0.9), rgba(12,9,18,0.95))', border: '1px solid rgba(139,92,246,0.4)', color: '#d6c8ff' }}>
                          <RewardChip it={{ type: 'season_xp', amount: matchReward.seasonXp }} size={16} textSize={12} color="#d6c8ff" />
                        </motion.div>
                      )}
                    </div>
                    <div className="px-1">
                      <div className="flex justify-between text-[9px] mb-1" style={{ color: 'var(--text-muted)' }}>
                        <span>Lygis {prog.level}</span>
                        <span>{prog.isMaxLevel ? 'MAX' : `${prog.xpIntoLevel} / ${prog.nextLevelXp - prog.currentLevelXp}`}</span>
                      </div>
                      <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(240,180,41,0.22)' }}>
                        <motion.div initial={{ width: `${startPct}%` }} animate={{ width: `${prog.progressPercent}%` }} transition={{ delay: 0.35, duration: 0.9, ease: 'easeOut' }}
                          style={{ height: '100%', background: 'linear-gradient(90deg,#ffe28c,#f3b62c)', boxShadow: '0 0 10px rgba(240,180,41,0.6)' }} />
                      </div>
                      {!prog.isMaxLevel && (
                        <p className="text-[9px] mt-1 text-center" style={{ color: 'var(--text-muted)' }}>
                          {t('battle.game.nextLevelPrefix')} <span style={{ color: '#e8dcc0', fontWeight: 700 }}>{t('battle.game.levelN', { level: prog.level + 1 })}</span> {t('battle.game.forXp', { xp: prog.xpNeededForNextLevel })}
                          {' '}<RewardChip it={{ type: 'currency', currency: 'silver', amount: 100 }} size={12} textSize={9} color="#cbd5e1" />
                          {' '}<RewardChip it={{ type: 'currency', currency: 'essence', amount: 25 }} size={12} textSize={9} color="#c4b5fd" />
                        </p>
                      )}
                    </div>
                  </div>
                )
              })()}
              {net?.opponentId && (
                <button onClick={async () => { if (friendAdded !== 'idle') return; playUiClick(); const r = await friendRequestById(net.opponentId!); setFriendAdded(r.ok ? 'sent' : 'exists') }} disabled={friendAdded !== 'idle'}
                  className="w-full mb-3 px-4 py-2 rounded-xl text-xs font-bold transition-all hover:scale-[1.02] disabled:opacity-60"
                  style={{ background: 'rgba(96,165,250,0.15)', border: '1px solid rgba(96,165,250,0.5)', color: '#93c5fd', fontFamily: 'var(--rvn-font-display)' }}>
                  {friendAdded === 'sent' ? t('battle.game.friendSent') : friendAdded === 'exists' ? t('battle.game.friendExists') : t('battle.game.friendAdd', { name: opponentName ?? t('battle.game.opponent') })}
                </button>
              )}
              <div className="flex gap-2 justify-center">
                <button onClick={() => { playUiClick(); if (deckCards) { shownTipsRef.current.clear(); setStepIdx(GUIDED_STEPS.length); setTipQueue([]); initGame(deckCards) } }}
                  className="px-4 py-2 rounded-xl text-xs font-bold transition-all hover:scale-[1.03] active:scale-95"
                  style={{
                    background: 'linear-gradient(135deg, rgba(240,180,41,0.3), rgba(240,180,41,0.1))',
                    border: '1px solid rgba(240,180,41,0.5)', color: 'var(--gold)',
                    fontFamily: 'var(--rvn-font-display)',
                  }}>
                  {t('battle.game.playAgain')}
                </button>
                <button onClick={() => { playUiClick(); closeGame() }}
                  className="px-4 py-2 rounded-xl text-xs font-bold transition-all hover:scale-[1.03] active:scale-95"
                  style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.15)', color: 'var(--text-secondary)' }}>
                  {t('battle.game.closeBtn')}
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

const KEYWORD_ICONS: Record<string, string> = {
  sprint: '▶', taunt: '⊙', shield: '✦★', stealth: '◑', battlecry: '📣', lastwish: '🕯',
}
/** Raktažodžio etiketė dabartine kalba (ikona + lokalizuotas pavadinimas). */
function keywordLabel(k: string): string {
  const icon = KEYWORD_ICONS[k] ?? ''
  const name = k === 'battlecry' || k === 'lastwish' ? tGlobal(`statusEffects.keyword.${k}`) : statusName(k)
  return `${icon} ${name}`.trim()
}
const KEYWORD_LABELS: Record<string, string> = new Proxy({}, { get: (_, k: string) => keywordLabel(k) }) as Record<string, string>


// ── Izoliuotas ėjimo laikmatis: tiksi savo intervale, re-renderina TIK save ──
function TurnTimer({ deadline, variant }: { deadline: number | null; variant: 'chip' | 'big' }) {
  const calc = () => deadline == null ? null : Math.max(0, Math.ceil((deadline - Date.now()) / 1000))
  const [left, setLeft] = useState<number | null>(calc)
  useEffect(() => {
    if (deadline == null) { setLeft(null); return }
    const tick = () => setLeft((p) => { const l = Math.max(0, Math.ceil((deadline - Date.now()) / 1000)); return p === l ? p : l })
    tick()
    const iv = setInterval(tick, 500)
    return () => clearInterval(iv)
  }, [deadline])
  if (left == null) return null
  if (variant === 'big') {
    if (left > 20) return null
    return (
      <div className="fixed left-1/2 -translate-x-1/2 top-14 z-[123] pointer-events-none">
        <span className="font-bold tabular-nums animate-pulse" style={{ fontSize: 44, lineHeight: 1, color: '#ef4444', fontFamily: 'var(--rvn-font-display)', textShadow: '0 0 18px rgba(239,68,68,0.85)' }}>⏱ {left}</span>
      </div>
    )
  }
  return (
    <span className="text-xs font-bold tabular-nums shrink-0 px-1.5 py-0.5 rounded" style={{ color: left <= 20 ? '#fca5a5' : 'var(--text-secondary)', background: left <= 20 ? 'rgba(239,68,68,0.12)' : 'transparent' }}>
      ⏱ {left}s
    </span>
  )
}
