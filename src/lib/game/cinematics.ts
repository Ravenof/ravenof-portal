// ── PremiumCinematics — bendra logika (tipai, temos, trigeriai, fallback) ─────
// Be UI/React priklausomybių (gryni helperiai). React queue: cinematicQueue.ts.
// Overlay: components/tutorial/RavenofCinematicOverlay.tsx.

import type {
  GameplayConfig, SummonCinematic, SkillCinematic, CinematicFrameTheme, CinematicTriggerSource,
} from './types'
import {
  CINEMATIC_MAX_DURATION_MS,
  CINEMATIC_MIN_DURATION_MS_SUMMON, CINEMATIC_MIN_DURATION_MS_SKILL,
  CINEMATIC_DEFAULT_DURATION_MS_SUMMON, CINEMATIC_DEFAULT_DURATION_MS_SKILL,
} from './types'
import {
  isSummonCinematicsEnabled, isChampionSkillCinematicsEnabled,
} from '@/lib/settings'

export type PremiumCinematicType = 'summon' | 'championSkill'

// Aktyvus kino objektas, perduodamas overlay'ui.
export type ActiveCinematic = {
  type: PremiumCinematicType
  cardId: string
  cardName: string
  cardImage?: string | null
  skillId?: string
  skillName?: string
  webm?: string
  mp4?: string
  poster?: string
  durationMs: number
  title: string
  frameTheme: CinematicFrameTheme
  cropX: number         // 0..100 object-position X (vertikalus mobile rėmas crop'ina šonus)
  cropY: number         // 0..100 object-position Y
  staticOnly: boolean   // nėra video → rodom tik poster/kortos artą (zoom/glow)
  dedupeKey: string
}

// Minimali kortos forma, kurios reikia kino logikai (atitinka TutCard ir DB Card).
export type CinematicCardInput = {
  id: string
  name: string
  image?: string | null
  rarityName?: string | null
  type?: string | null        // sumapintas tipas (pvz. 'champion')
  isChampion?: boolean | null
  factionName?: string | null
  gameplay?: GameplayConfig | null
}

export type SummonTriggerContext = { source?: CinematicTriggerSource }

// ── Temų paletė (overlay rėmui/švytėjimui; lengva, be sunkaus blur) ───────────
export const CINEMATIC_THEME_PALETTE: Record<CinematicFrameTheme, {
  glow: string; glow2: string; border: string; tint: string
}> = {
  default:     { glow: 'rgba(150,170,200,0.55)', glow2: 'rgba(90,110,150,0.35)',  border: 'rgba(190,205,225,0.85)', tint: 'rgba(120,140,170,0.10)' },
  undead:      { glow: 'rgba(90,240,200,0.50)',  glow2: 'rgba(60,160,210,0.35)',  border: 'rgba(120,240,210,0.85)', tint: 'rgba(40,120,110,0.12)' },
  demon:       { glow: 'rgba(255,90,50,0.55)',   glow2: 'rgba(140,20,10,0.40)',   border: 'rgba(255,120,70,0.88)',  tint: 'rgba(120,20,10,0.14)' },
  holy:        { glow: 'rgba(255,225,150,0.50)', glow2: 'rgba(220,180,90,0.32)',  border: 'rgba(255,230,170,0.85)', tint: 'rgba(220,190,120,0.10)' },
  mystic:      { glow: 'rgba(180,120,255,0.52)', glow2: 'rgba(110,70,200,0.36)',  border: 'rgba(200,150,255,0.86)', tint: 'rgba(110,70,180,0.13)' },
  goblin:      { glow: 'rgba(150,210,70,0.50)',  glow2: 'rgba(150,110,40,0.35)',  border: 'rgba(180,220,90,0.85)',  tint: 'rgba(110,120,40,0.13)' },
  pirate:      { glow: 'rgba(120,180,230,0.48)', glow2: 'rgba(40,70,110,0.40)',   border: 'rgba(170,200,235,0.85)', tint: 'rgba(40,70,110,0.14)' },
  eastern:     { glow: 'rgba(150,220,200,0.46)', glow2: 'rgba(170,170,140,0.32)', border: 'rgba(200,225,210,0.85)', tint: 'rgba(120,150,140,0.10)' },
  inquisition: { glow: 'rgba(230,60,50,0.52)',   glow2: 'rgba(120,110,120,0.34)', border: 'rgba(235,90,80,0.88)',   tint: 'rgba(120,30,30,0.13)' },
}

// ── Frakcija → tema (lietuviški frakcijų vardai) ──────────────────────────────
const FACTION_THEME: Record<string, CinematicFrameTheme> = {
  'mirties maršas': 'undead',
  'demonų orda': 'demon',
  'šviesos pulkas': 'holy',
  'mistikos melodija': 'mystic',
  'vryhioko gauja': 'goblin',
  'plėšikų naktis': 'pirate',
  'rytų vėjas': 'eastern',
  'inkvizicijos legionas': 'inquisition',
}

export function factionTheme(factionName?: string | null): CinematicFrameTheme {
  if (!factionName) return 'default'
  return FACTION_THEME[factionName.trim().toLowerCase()] ?? 'default'
}

export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false
  try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches } catch { return false }
}

function clampDuration(ms: number | undefined, min: number, def: number): number {
  const n = typeof ms === 'number' && Number.isFinite(ms) ? ms : def
  return Math.min(CINEMATIC_MAX_DURATION_MS, Math.max(min, Math.round(n)))
}

function hasVideo(c?: { webm?: string; mp4?: string }): boolean {
  return !!(c && (c.webm || c.mp4))
}

// ── Summon trigerio sąlyga: Legendinis ARBA Čempionas ARBA is_champion ────────
export function shouldTriggerSummonCinematic(card: CinematicCardInput): boolean {
  const rarity = (card.rarityName ?? '').trim().toLowerCase()
  const type = (card.type ?? '').trim().toLowerCase()
  return rarity === 'legendinis' || type === 'champion' || type === 'čempionas' || !!card.isChampion
}

// ── Summon kino sukūrimas (arba null, jei nereikia rodyti) ────────────────────
export function buildSummonCinematic(card: CinematicCardInput, ctx: SummonTriggerContext = {}): ActiveCinematic | null {
  if (!isSummonCinematicsEnabled()) return null
  if (!shouldTriggerSummonCinematic(card)) return null

  const sc: SummonCinematic | undefined = card.gameplay?.summonCinematic
  if (!sc || !sc.enabled) return null

  // Trigerio šaltinio filtras (numatyta: tik playedFromHand)
  const allowed = (sc.triggerSources && sc.triggerSources.length ? sc.triggerSources : ['playedFromHand']) as CinematicTriggerSource[]
  const source = ctx.source ?? 'playedFromHand'
  if (!allowed.includes(source)) return null

  const theme: CinematicFrameTheme = sc.frameTheme ?? factionTheme(card.factionName)
  const video = hasVideo(sc)
  return {
    type: 'summon',
    cardId: card.id,
    cardName: card.name,
    cardImage: card.image ?? null,
    webm: sc.webm,
    mp4: sc.mp4,
    poster: sc.poster ?? card.image ?? undefined,
    durationMs: clampDuration(sc.durationMs, CINEMATIC_MIN_DURATION_MS_SUMMON, CINEMATIC_DEFAULT_DURATION_MS_SUMMON),
    title: (sc.titleOverride ?? '').trim() || card.name,
    frameTheme: theme,
    cropX: typeof sc.cropX === 'number' ? sc.cropX : 50,
    cropY: typeof sc.cropY === 'number' ? sc.cropY : 50,
    staticOnly: !video,
    dedupeKey: `summon:${card.id}`,
  }
}

// ── Čempiono skill kino sukūrimas ─────────────────────────────────────────────
export function buildSkillCinematic(
  card: CinematicCardInput,
  skillIndex: number,
  ctx: { skillNameFromEngine?: string } = {},
): ActiveCinematic | null {
  if (!isChampionSkillCinematicsEnabled()) return null
  if (skillIndex < 0) return null

  const skill = card.gameplay?.championSkillConfig?.skills?.[skillIndex]
  const cine: SkillCinematic | undefined = skill?.cinematic
  if (!cine || !cine.enabled) return null

  const skillName = (cine.titleOverride ?? '').trim()
    || (skill?.name ?? '').trim()
    || ctx.skillNameFromEngine?.trim()
    || `${card.name} skill`
  const theme: CinematicFrameTheme = cine.frameTheme ?? factionTheme(card.factionName)
  const video = hasVideo(cine)
  const skillId = `skill-${skillIndex + 1}`
  return {
    type: 'championSkill',
    cardId: card.id,
    cardName: card.name,
    cardImage: card.image ?? null,
    skillId,
    skillName: (skill?.name ?? '').trim() || skillName,
    webm: cine.webm,
    mp4: cine.mp4,
    poster: cine.poster ?? card.image ?? undefined,
    durationMs: clampDuration(cine.durationMs, CINEMATIC_MIN_DURATION_MS_SKILL, CINEMATIC_DEFAULT_DURATION_MS_SKILL),
    title: skillName,
    frameTheme: theme,
    cropX: typeof cine.cropX === 'number' ? cine.cropX : 50,
    cropY: typeof cine.cropY === 'number' ? cine.cropY : 50,
    staticOnly: !video,
    dedupeKey: `skill:${card.id}:${skillId}`,
  }
}

// ── Preload: tik posteriai (greitas „first frame"); video lieka lazy ──────────
const _preloaded = new Set<string>()
export function preloadCinematicPosters(urls: Array<string | undefined | null>): void {
  if (typeof window === 'undefined') return
  for (const u of urls) {
    if (!u || _preloaded.has(u)) continue
    _preloaded.add(u)
    try { const img = new window.Image(); img.decoding = 'async'; img.src = u } catch { /* */ }
  }
}

// Surenka deck'o kino posterius (Legendiniai/Čempionai + jų skill'ai) preload'ui.
export function collectDeckCinematicPosters(cards: CinematicCardInput[]): string[] {
  const out: string[] = []
  for (const c of cards) {
    const sc = c.gameplay?.summonCinematic
    if (sc?.enabled && sc.poster) out.push(sc.poster)
    const skills = c.gameplay?.championSkillConfig?.skills ?? []
    for (const sk of skills) { if (sk.cinematic?.enabled && sk.cinematic.poster) out.push(sk.cinematic.poster) }
  }
  return out
}

// Preload deck'o summon video (Legendiniai/Čempionai) — kad pirmas iškvietimas grotų iškart.
// Cap'inta (mobile data). Skill video paliekam lazy (poster fallback dengia, jei lėtas tinklas).
const _preloadedV = new Set<string>()
const _preloadEls: HTMLVideoElement[] = []   // laikom REFERENCIJAS – kitaip naršyklė GC'ina <video> ir nutraukia parsisiuntimą
const MAX_PRELOAD_VIDEOS = 6
let _canWebm: boolean | null = null
/** Ar naršyklė gali groti WebM (Safari/iOS – ne). Kešuojama. */
export function canPlayWebm(): boolean {
  if (_canWebm !== null) return _canWebm
  try { const v = document.createElement('video'); _canWebm = !!v.canPlayType && v.canPlayType('video/webm') !== '' } catch { _canWebm = false }
  return _canWebm
}
export function preloadCinematicVideos(urls: Array<string | undefined | null>): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return
  let n = 0
  for (const u of urls) {
    if (!u || _preloadedV.has(u)) continue
    if (n >= MAX_PRELOAD_VIDEOS) break
    _preloadedV.add(u); n++
    try {
      const v = document.createElement('video')
      v.preload = 'auto'; v.muted = true; v.playsInline = true; v.src = u
      try { v.load() } catch { /* */ }
      _preloadEls.push(v)            // referencija išlaikoma → download nenutraukiamas iki cache
      if (_preloadEls.length > MAX_PRELOAD_VIDEOS) { const old = _preloadEls.shift(); try { old?.removeAttribute('src'); old?.load() } catch { /* */ } }
    } catch { /* */ }
  }
}

// Parenka URL pagal tai, ką naršyklė tikrai gros (Safari/iOS – mp4, ne webm), kad
// preload'intume būtent tą failą, kurį overlay paskui naudos.
export function collectDeckCinematicVideos(cards: CinematicCardInput[]): string[] {
  const out: string[] = []
  const preferWebm = canPlayWebm()
  for (const c of cards) {
    const sc = c.gameplay?.summonCinematic
    if (sc?.enabled) {
      const u = preferWebm ? (sc.webm || sc.mp4) : (sc.mp4 || sc.webm)
      if (u) out.push(u)
    }
  }
  return out
}
