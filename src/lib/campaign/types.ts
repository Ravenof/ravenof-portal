// ════════════════════════════════════════════════════════════════════════════
// Ravenof Campaign Mode — shared data models
// Mirrors the DB schema in supabase/migrations/20260707_campaigns.sql.
// Battle/scenario/wave/objective config lives in node JSONB so the system is
// fully data-driven: new campaigns/missions need NO code changes.
// ════════════════════════════════════════════════════════════════════════════

export type Visibility = 'draft' | 'active' | 'hidden'
export type CampaignType = 'story' | 'challenge' | 'event' | 'tutorial'

/** Mission types — extend this union AND the runtime switch in CampaignRuntime. */
export type MissionType =
  | 'STANDARD_CARD_BATTLE'
  | 'AMBUSH'
  | 'WAVE_DEFENSE'
  | 'GATE_DEFENSE'
  | 'WALL_DEFENSE'
  | 'BOSS_BATTLE'
  | 'SURVIVAL'
  | 'ESCORT'
  | 'PUZZLE'
  | 'STORY_ONLY'
  | 'CUSTOM'

export type NodeIconType =
  | 'battle' | 'story' | 'boss' | 'siege' | 'gate' | 'wave'
  | 'elite' | 'reward' | 'lock'

export const MISSION_TYPES: { value: MissionType; label: string; icon: NodeIconType }[] = [
  { value: 'STANDARD_CARD_BATTLE', label: 'Įprasta kova',        icon: 'battle' },
  { value: 'AMBUSH',               label: 'Pasala',              icon: 'siege'  },
  { value: 'WAVE_DEFENSE',         label: 'Bangų gynyba',        icon: 'wave'   },
  { value: 'GATE_DEFENSE',         label: 'Vartų gynyba',        icon: 'gate'   },
  { value: 'WALL_DEFENSE',         label: 'Sienos gynyba',       icon: 'gate'   },
  { value: 'BOSS_BATTLE',          label: 'Bosas',               icon: 'boss'   },
  { value: 'SURVIVAL',             label: 'Išgyvenimas',         icon: 'wave'   },
  { value: 'ESCORT',               label: 'Palyda',              icon: 'battle' },
  { value: 'PUZZLE',               label: 'Galvosūkis',          icon: 'elite'  },
  { value: 'STORY_ONLY',           label: 'Istorija (be kovos)', icon: 'story'  },
  { value: 'CUSTOM',               label: 'Pasirinktinė',        icon: 'elite'  },
]

// ──────────────────────────────── Campaign ─────────────────────────────────
export interface Campaign {
  id: string
  slug: string
  title: string
  subtitle?: string | null
  description?: string | null
  coverImageUrl?: string | null
  campaignType: CampaignType
  lorePeriod?: string | null
  relatedFactions: string[]
  /** null => app uses the Atlas world map (/maps/ravenof-world-map.png). */
  mapImageUrl?: string | null
  mapNaturalW: number
  mapNaturalH: number
  startNodeId?: string | null
  visibility: Visibility
  requiredLevel: number
  requiredProgress: Record<string, unknown>
  sortOrder: number
  metadata: Record<string, unknown>
  createdAt?: string
  updatedAt?: string
}

export interface CampaignChapter {
  id: string
  campaignId: string
  title: string
  description?: string | null
  sortOrder: number
  backgroundImageUrl?: string | null
  backgroundVideoUrl?: string | null
  narration?: string | null
  metadata: Record<string, unknown>
}

// ──────────────────────────────── Objectives ───────────────────────────────
/** Objective kinds the runtime/engine can evaluate. `custom` is scored by scenario. */
export type ObjectiveKind =
  | 'win'              // win the battle
  | 'survive_turns'    // survive N turns
  | 'defeat_within'    // win before turn N
  | 'protect_objective'// objective HP stays >= N
  | 'keep_unit_alive'  // named friendly unit survives
  | 'kill_count'       // kill N enemies (optionally of a tag)
  | 'no_more_than'     // use no more than N of a card type (e.g. spells)
  | 'keep_alive_count' // keep >= N units of a tag alive
  | 'prevent_breach'   // wall/gate not breached
  | 'custom'

export interface MissionObjective {
  id: string
  kind: ObjectiveKind
  label: string                 // localized display text
  primary: boolean              // primary => required to win; secondary => stars
  /** kind-specific params, e.g. { turns:8 }, { hp:10 }, { count:10, tag:'demon' }. */
  params?: Record<string, number | string>
}

// ──────────────────────────────── Battle config ────────────────────────────
export type PlayerDeckMode =
  | 'collection'   // player picks one of their decks
  | 'story'        // predefined story deck (storyDeckId)
  | 'faction'      // generated from a faction
  | 'generated'    // auto-generated balanced deck
  | 'locked'       // fixed mission deck, no edit

export type EnemyDeckMode =
  | 'deck'         // predefined deck id
  | 'faction'      // generated from faction
  | 'waves'        // built from scenario waves
  | 'boss'         // boss deck id
  | 'mixed'

export type AiProfile =
  | 'aggressive' | 'defensive' | 'trade' | 'boss' | 'wave_attacker'
  | 'objective_attacker' | 'siege' | 'protector' | 'chaotic_demon' | 'tactical'

export interface BattleConfig {
  playerDeckMode: PlayerDeckMode
  storyDeckId?: string | null
  playerFactionId?: number | null
  allowDeckEdit?: boolean

  enemyDeckMode: EnemyDeckMode
  enemyDeckId?: string | null
  enemyFactionId?: number | null
  enemyName?: string | null

  allowedFactions?: number[]
  bannedCardIds?: string[]
  requiredCardIds?: string[]

  startingHandOverride?: string[]   // card ids
  startingGold?: number | null
  maxGold?: number | null
  startingChampionId?: string | null
  enemyChampionId?: string | null

  turnLimit?: number | null
  aiProfile?: AiProfile
  difficulty?: 'easy' | 'normal' | 'hard'
}

// ──────────────────────────────── Scenario (rules + waves + map) ────────────
export type ScenarioTrigger =
  | 'onBattleStart' | 'onTurnStart' | 'onTurnEnd' | 'onCardPlayed'
  | 'onUnitDeath' | 'onObjectiveHpChange' | 'onWaveDefeated'
  | 'onBossPhase' | 'onCondition' | 'onVictory' | 'onDefeat'

export type ScenarioActionType =
  | 'spawnUnit' | 'spawnRandomUnit' | 'spawnWave'
  | 'damageObjective' | 'healObjective' | 'protectObjective'
  | 'lockZone' | 'forceTargetPriority' | 'restrictCardTypes' | 'restrictAttacks'
  | 'addBuff' | 'addField' | 'dialogue'
  | 'setBossPhase' | 'win' | 'lose'

export interface ScenarioAction {
  type: ScenarioActionType
  // free-form, action-specific. e.g. { waveId }, { unitCardId, side, pos },
  // { objectiveId, amount }, { cutsceneStep }, { phase }, { priority }
  [k: string]: unknown
}

export interface ScenarioRule {
  trigger: ScenarioTrigger
  /** absolute turn for onTurnStart/onTurnEnd. */
  turn?: number
  /** repeat every N turns (for periodic spawns). */
  everyTurns?: number
  /** simple condition expressions evaluated by the scenario engine. */
  conditions?: ScenarioCondition[]
  actions: ScenarioAction[]
  once?: boolean
}

export interface ScenarioCondition {
  // e.g. { lhs:'objective.gate.hp', op:'<=', rhs:0 }
  lhs: string
  op: '==' | '!=' | '<' | '<=' | '>' | '>='
  rhs: number | string
}

export type SpawnSide = 'top' | 'bottom' | 'left' | 'right' | 'gate' | 'wall' | 'random' | 'lane'

export interface ScenarioWave {
  id: string
  name: string
  triggerType: 'turn' | 'condition' | 'afterWave'
  turn?: number
  afterWaveId?: string
  spawnSide: SpawnSide
  spawnPositions?: number[]
  unitPool?: string[]          // card ids to randomize from
  exactUnits?: string[]        // explicit card ids spawned every time
  randomCount?: number
  difficultyScale?: number     // multiplier on stats
  delayBetween?: number        // turns between sub-spawns
  warningText?: string
  voiceLineUrl?: string
  fxKey?: string
  mustClear?: boolean          // must be cleared for victory
  repeats?: boolean
  maxRepeats?: number
}

export interface ScenarioObjectiveObject {
  id: string                   // e.g. 'gate', 'wall', 'commander'
  kind: 'gate' | 'wall' | 'relic' | 'commander' | 'convoy' | 'custom'
  label: string
  hp: number
  maxHp: number
  side: 'player' | 'enemy'
  x?: number                   // % on battle map overlay
  y?: number
  iconKey?: string
}

export interface BattleMapConfig {
  backgroundImageUrl?: string | null
  backgroundVideoUrl?: string | null
  lanes?: number
  spawnPoints?: { id: string; side: SpawnSide; x: number; y: number }[]
  blockedZones?: { x: number; y: number; w: number; h: number }[]
  overlays?: { id: string; x: number; y: number; label?: string; iconKey?: string }[]
}

export interface ScenarioConfig {
  rules?: ScenarioRule[]
  waves?: ScenarioWave[]
  objectives?: ScenarioObjectiveObject[]   // gate/wall/commander HP objects
  startingBoard?: ScenarioUnit[]           // player-side preplaced units
  startingEnemyBoard?: ScenarioUnit[]      // enemy-side preplaced units
  startingArtifacts?: string[]
  startingFields?: string[]
  startingCurses?: string[]
  battleMap?: BattleMapConfig
  victory?: ScenarioCondition[]            // custom victory conditions
  defeat?: ScenarioCondition[]             // custom defeat conditions
  survivalTurns?: number
}

export interface ScenarioUnit {
  cardId: string
  side: 'player' | 'enemy'
  slot?: number
  buffs?: { attack?: number; health?: number }
}

// ──────────────────────────────── Cutscenes ────────────────────────────────
export type CutsceneType = 'dialogue' | 'cinematic' | 'video' | 'image_sequence' | 'narration' | 'mixed'
export type CutsceneSide = 'left' | 'right' | 'center' | 'narrator'

export interface CutsceneStep {
  id: string
  characterId?: string | null
  characterName?: string | null
  portraitUrl?: string | null
  side: CutsceneSide
  emotion?: string | null
  text: string
  voiceUrl?: string | null
  screenEffect?: 'shake' | 'flash' | 'fade' | 'embers' | null
  backgroundImageUrl?: string | null
  videoUrl?: string | null
  choices?: { key: string; label: string; nextStepId?: string }[]
  nextStepId?: string | null
}

export interface Cutscene {
  id: string
  campaignId?: string | null
  title: string
  type: CutsceneType
  backgroundImageUrl?: string | null
  backgroundVideoUrl?: string | null
  musicUrl?: string | null
  ambientUrl?: string | null
  skippable: boolean
  autoplay: boolean
  steps: CutsceneStep[]
  metadata: Record<string, unknown>
}

// ──────────────────────────────── Rewards ──────────────────────────────────
/** Superset of rvn__grant_payload ({gold,exp,boosters,cardMin}) + campaign extras. */
export interface RewardPayload {
  gold?: number
  exp?: number
  boosters?: number
  cardMin?: 'magic' | 'unique' | 'epic' | 'legendary'
  cards?: string[]              // specific card ids (campaign-only cards etc.)
  cosmetics?: string[]
  deckUnlocks?: string[]
  factionRep?: { faction: string; amount: number }[]
  achievement?: string
  codexUnlocks?: string[]
  characterUnlocks?: string[]
  mapUnlocks?: string[]
}

// ──────────────────────────────── Node / Mission ───────────────────────────
export type UnlockRuleType = 'all_prev' | 'any_prev' | 'always' | 'objective'

export interface UnlockRule {
  type: UnlockRuleType
  requiredObjectives?: string[]
}

export interface CampaignNode {
  id: string
  campaignId: string
  chapterId?: string | null
  title: string
  subtitle?: string | null
  description?: string | null
  loreText?: string | null
  posX: number                  // percent
  posY: number                  // percent
  iconType: NodeIconType
  nodeColor?: string | null
  missionType: MissionType
  unlockRule: UnlockRule
  prevNodeIds: string[]
  nextNodeIds: string[]
  branchChoice?: { prompt: string; options: { key: string; label: string; nextNodeId: string }[] } | null
  objectives: MissionObjective[]
  preCutsceneId?: string | null
  postCutsceneId?: string | null
  failureCutsceneId?: string | null
  battleConfig: BattleConfig
  scenario: ScenarioConfig
  rewardPayload: RewardPayload
  replay: { allowed: boolean; rewardOnReplay?: boolean }
  difficulty: Record<string, unknown>
  adminNotes?: string | null
  status: Visibility
  sortOrder: number
  // ── Canon / source (admin-only) — ties mission to the Varngradas novel/Atlas ──
  sourceChapter?: string | null      // e.g. 'VIII', 'Prologas'
  sourceEventIds?: string[]          // Atlas event ids, e.g. ['E08-01','E08-02']
  canonSummary?: string | null
  canonCharacters?: string[]
  canonLocations?: string[]
  seedKey?: string | null            // stable key for Seed/Rebuild safe-merge
}

// ──────────────────────────────── Progress ─────────────────────────────────
export interface CampaignProgress {
  campaignId: string
  completedNodeIds: string[]
  unlockedNodeIds: string[]
  nodeStars: Record<string, number>
  nodeObjectives: Record<string, string[]>
  failedAttempts: Record<string, number>
  rewardsClaimed: string[]
  choices: Record<string, string>
  cutscenesWatched: string[]
  currentChapterId?: string | null
  lastNodeId?: string | null
  difficulty?: string | null
}

/** Derived per-node UI state for the map renderer. */
export type NodeVisualState = 'locked' | 'available' | 'current' | 'completed'

export interface NodeView extends CampaignNode {
  state: NodeVisualState
  stars: number
}

// result reported back from a mission to the runtime
export interface MissionResult {
  nodeId: string
  result: 'win' | 'lose'
  stars: number
  objectives: string[]          // completed objective ids
  choiceKey?: string
}
