// ════════════════════════════════════════════════════════════════════════════
// Tutorial v2 — data-driven lesson schema (shared by seeds, director, admin).
// A lesson = setup (scripted decks/hands/draws) + ordered steps. Each step
// introduces ONE concept: dialogue (pauses), highlight/dim, gated actions,
// optional scripted enemy turn, and a completion trigger. Everything below is
// serialisable JSON (stored in tutorial_lessons.config) so lessons are fully
// authorable from the admin panel without code changes.
// ════════════════════════════════════════════════════════════════════════════

/** Named UI zones the overlay can spotlight / point an arrow at. */
export type TutorialAnchor =
  | 'hand' | 'gold' | 'hp-you' | 'hp-ai' | 'deck-you' | 'deck-ai'
  | 'discard-you' | 'discard-ai' | 'units-you' | 'units-ai'
  | 'zmk' | 'artifacts-you' | 'reactions-you' | 'field'
  | 'end-turn' | 'discard-gold' | 'enemy-area' | 'champion-you' | 'champion-ai' | 'board'

/** A thing on screen the director can target for highlight / arrow / zoom. */
export type HighlightTarget =
  | { kind: 'anchor'; anchor: TutorialAnchor }
  | { kind: 'handCard'; cardName?: string; index?: number }
  | { kind: 'unit'; side: 'you' | 'ai'; cardName?: string; index?: number }
  | { kind: 'button'; id: 'end-turn' | 'discard-gold' | 'next' }

/** Guide dialogue line (dark-fantasy mentor). Max ~2 short sentences ON SCREEN. */
export interface Dialogue {
  id?: string
  /** 'guide' (mentor) | 'enemy' | 'narrator' — drives bubble side/portrait. */
  speaker?: 'guide' | 'enemy' | 'narrator'
  name?: string
  /** Ekrane rodoma santrauka (trumpa!). */
  text: string
  portrait?: string | null
  /**
   * V3 — balso takelio ID (be prefikso): failas `card-audio/tutorial/tut-{voiceId}.mp3`.
   * Jei failo nėra arba garsas išjungtas — auto-advance pagal teksto ilgį.
   */
  voiceId?: string
  /**
   * V3 — PILNAS ištariamas tekstas (titrai). Jei nenurodyta — titrų nerodom,
   * balsas laikomas atitinkančiu `text`.
   */
  voiceText?: string
}

/** Whitelisted player actions for a step. Anything not listed is blocked. */
export type AllowedActionKind =
  | 'play-unit' | 'play-spell' | 'play-artifact' | 'play-any'
  | 'attack-unit' | 'attack-face' | 'attack-any'
  | 'use-champion' | 'upgrade-champion'
  | 'discard-gold' | 'end-turn' | 'next' | 'none'

export interface AllowedAction {
  kind: AllowedActionKind
  /** Restrict to a specific card by name (e.g. only this hand card is playable). */
  cardName?: string
  /** Restrict attack/target to a specific enemy/unit by name. */
  targetName?: string
}

/** How a step finishes and the next begins. */
export type CompletionTrigger =
  | { on: 'next' }                                            // player taps "Toliau"
  | { on: 'auto'; delayMs?: number }                          // auto-advance
  | { on: 'event'; eventType: string; side?: 'you' | 'ai'; cardName?: string; count?: number }
  | { on: 'enemyTurnDone' }                                   // after scripted enemy turn
  | { on: 'win' }                                             // enemy champion/HP at 0
  | { on: 'inspect'; cardName?: string }                      // V3: žaidėjas palaikė pirštą ant kortos (hold-to-view)
  | { on: 'voiceDone' }                                       // V3: kai baigia groti paskutinė balso eilutė

/** One scripted enemy (or forced) action. */
export type ScriptedAction =
  | { type: 'play'; cardName: string; targetCard?: string; targetFace?: boolean }
  | { type: 'attack'; attackerCard: string; targetCard?: string; face?: boolean }
  | { type: 'useChampion'; skillIndex?: number; targetCard?: string; targetFace?: boolean }
  | { type: 'endTurn' }
  | { type: 'wait'; ms: number }
  | { type: 'say'; text: string; speaker?: 'guide' | 'enemy' | 'narrator' }

/** Scripted board/deck setup — guarantees a deterministic lesson. */
export interface ScriptedSide {
  hand?: string[]       // card names placed in opening hand (in order)
  deck?: string[]       // top-of-deck order (drawn in sequence)
  board?: string[]      // creatures pre-placed on board
  champion?: string     // champion card name
  artifacts?: string[]
  field?: string
  gold?: number         // override starting gold for the lesson
  hp?: number           // override starting champion/player HP
  curses?: string[]     // V3: prakeiksmų šoninė kaladė (curse tipo kortų vardai)
  reactions?: string[]  // V3: iš anksto padėtos (užverstos) reakcijos
}

export interface LessonSetup {
  player?: ScriptedSide
  enemy?: ScriptedSide
  /** Forced draws per turn (overrides RNG): names drawn at each of your turns. */
  drawSequence?: { you?: string[][]; ai?: string[][] }
  /** Disable the damage-modifier deck for early lessons (deterministic combat). */
  disableZmk?: boolean
}

/**
 * V3 — deklaratyvus būsenos pakeitimas žingsnio pradžioje. Leidžia scriptinti
 * demonstracijas (statusų karuselė L6, prakeiksmai L7, ŽMK įjungimas L2)
 * NEPERRAŠANT variklio: direktorius jį pritaiko per TutorialGame `mutate` API.
 */
export interface StepMutation {
  /** Įjungti tikrą ŽMK kaladę (L2: iki tol visos kortos +0). */
  enableZmk?: boolean
  /** Išjungti ŽMK (visos kortos +0 — deterministinė kova). */
  disableZmk?: boolean
  /** Nustatyti auksą (ne pridėti). */
  goldYou?: number
  goldAi?: number
  /** Pridėti kortas į ranką (pagal vardą). */
  addHandYou?: string[]
  /** Pastatyti padarus ant lentos (nebe „summoning sick"). */
  addBoardYou?: string[]
  addBoardAi?: string[]
  /** Nuvalyti lentą prieš demonstraciją. */
  clearBoardYou?: boolean
  clearBoardAi?: boolean
  /** Uždėti būseną/raktažodį ant padaro (demonstracijoms). */
  setStatus?: { side: 'you' | 'ai'; cardName: string; status: 'frozen' | 'burning' | 'poisoned' | 'stunned' | 'silenced' | 'blessed' | 'shield' | 'stealth' | 'taunt' | 'sprint' }[]
  /** Prakeiksmų šoninė kaladė (L7): kortų vardai. */
  cursesYou?: string[]
  /** Įdėti prakeiksmą į priešo kaladės VIRŠŲ (L7 demonstracijai). */
  seedEnemyDeckTop?: string[]
  /** Nustatyti priešo/žaidėjo kaladės dydį (L8 fatigue demonstracijai). */
  deckCountYou?: number
  deckCountAi?: number
}

export interface LessonStep {
  id: string
  /** Permanent objective banner text (persists until a later step changes it). */
  objective?: string
  /** Guide lines shown before the player acts (game pauses, skippable). */
  dialogue?: Dialogue[]
  /** Spotlight these targets; everything else is dimmed. */
  highlight?: HighlightTarget[]
  /** Animated arrow points at this target. */
  arrowTo?: HighlightTarget | null
  /**
   * V3 — rodyklės stilius:
   *   'point'     — klasikinė šokinėjanti rodyklė (numatyta)
   *   'pulse'     — rodyklė + 3 pulsuojantys žiedai aplink taikinį
   *   'drag-path' — animuota punktyrinė kreivė nuo `arrowFrom` iki `arrowTo`
   *                 su judančiu „vaiduoklišku" pirštu (drag mokymui)
   */
  arrowStyle?: 'point' | 'pulse' | 'drag-path'
  /** V3 — drag-path pradžia (kortos rankoje pozicija). */
  arrowFrom?: HighlightTarget | null
  /** Soft camera zoom toward this target. */
  zoom?: HighlightTarget | null
  /** V3 — priverstinis zoom mastelis (default: auto pagal taikinio dydį, 1.35–2.2×). */
  zoomLevel?: number
  /** V3 — būsenos pakeitimai, atliekami ĮEINANT į šį žingsnį (scripted demonstracijoms). */
  apply?: StepMutation
  /** Whitelisted actions; everything else is blocked (no failing the lesson). */
  allow?: AllowedAction[]
  /** Scripted enemy actions to run when this step hands the turn to the enemy. */
  enemyScript?: ScriptedAction[]
  /** How this step completes. */
  complete: CompletionTrigger
  /** Gentle nudge if the player tries a blocked action. */
  wrongHint?: string
}

export interface LessonConfig {
  guideName?: string
  guidePortrait?: string | null
  /** Show the zones primer overlay before the first battle (Level 1). */
  primer?: boolean
  /**
   * V3 (L8) — įjungti TIKRĄ kovos pradžios srautą: monetos metimas + mulligan.
   * Visose kitose pamokose jis išjungtas (scriptuota: visada pradeda žaidėjas).
   */
  matchStartFlow?: boolean
  /** V3 — pamokos balso eilučių ID sąrašas (prefetch pamokos pradžioje). Auto-surenkamas, jei nenurodyta. */
  voiceIds?: string[]
  setup: LessonSetup
  steps: LessonStep[]
}

/** A reward payload compatible with rvn__grant_payload (+ cosmetic/badge tags). */
export interface LessonReward {
  exp?: number
  gold?: number
  boosters?: number
  cardMin?: 'magic' | 'unique' | 'epic' | 'legendary'
  badge?: string
  cosmetics?: string[]
}

/** Code-defined seed (mirrors campaign seedRebuild pattern). */
export interface LessonSeed {
  seedKey: string
  slug: string
  sortOrder: number
  title: string
  subtitle?: string
  description?: string
  icon?: string
  estMinutes?: number
  status?: 'active' | 'draft' | 'hidden'
  reward: LessonReward
  config: LessonConfig
}

/** Row shape returned by rvn_tutorial_state. */
export interface LessonRow {
  id: string
  seed_key: string | null
  slug: string
  sort_order: number
  title: string
  subtitle: string | null
  description: string | null
  icon: string | null
  est_minutes: number | null
  config: LessonConfig
  reward_payload: LessonReward
  status: string
}

export interface LessonProgressRow {
  user_id: string
  lesson_id: string
  completed: boolean
  attempts: number
  best_time_ms: number | null
  reward_claimed: boolean
  completed_at: string | null
}
