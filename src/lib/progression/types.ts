// ════════════════════════════════════════════════════════════════════════════
//  PROGRESSION v2 — duomenų kontraktas (DTO)
//  Vienintelis tiesos šaltinis dėl formos; reikšmės VISADA iš serverio.
//  UI NESKAIČIUOJA: claim eligibility, reset laikų, sumų, reroll kainos,
//  sezono lygio, boosterio turinio, kompensacijos ar pasirinkimų sekos.
//  SQL: supabase/migrations/2026084*_*.sql
// ════════════════════════════════════════════════════════════════════════════

// ── Valiutos ir atlygio tipai ───────────────────────────────────────────────
export type ProgressionCurrency = 'silver' | 'essence' | 'rubies'
export type CardRarityCode = 'rare' | 'epic' | 'legendary'
export type FactionAlignment = 'light' | 'dark'

export type RewardDefinition =
  | { type: 'silver'; amount: number }
  | { type: 'essence'; amount: number }
  | { type: 'rubies'; amount: number }
  | { type: 'season_xp'; amount: number }
  | { type: 'faction_booster_choice'; quantity: number }
  | { type: 'card_choice'; rarity: CardRarityCode }
  | { type: 'card_back'; cosmeticId: string }
  | { type: 'player_avatar'; cosmeticId: string }

/** Realiai suteiktas atlygis (serverio grąžinamas po claim'o). */
export type GrantedReward =
  | { type: ProgressionCurrency | 'season_xp'; amount: number }
  | { type: 'card_back' | 'player_avatar'; cosmeticId: string }

export type Balances = { silver: number; rubies: number; essence: number }

// ── Pasirinkimai ────────────────────────────────────────────────────────────
export type FactionOption = {
  factionId: number
  slug: string
  name: string
  alignment: FactionAlignment
  /** frakcijos kolekcijos pilnumas % (serverio skaičiuojamas) */
  collectionProgressPct?: number
}

export type CardChoiceOption = {
  cardId: string
  nameLt: string
  nameEn: string
  factionId: number
  factionSlug: string
  factionName: string
  alignment: FactionAlignment
  rarity: CardRarityCode
  imageUrl: string | null
  effectTextLt: string
  effectTextEn: string
  goldCost: number
  ownedCount: number
  copyLimit: number
  duplicateEssence: number
  /** true, kai copy limit pasiektas — pasirinkus skiriama esencijos kompensacija */
  disabled: boolean
}

export type PendingRewardChoice = {
  choiceId: string
  choiceType: 'faction_booster' | 'card'
  sourceType: 'login' | 'season' | 'daily_quest' | 'daily_chest' | string
  sourceId: string
  seq: number
  rarity: CardRarityCode | null
  options: FactionOption[] | CardChoiceOption[]
  createdAt: string
}

export function isCardChoice(c: PendingRewardChoice): boolean { return c.choiceType === 'card' }
export function cardOptions(c: PendingRewardChoice): CardChoiceOption[] {
  return c.choiceType === 'card' ? (c.options as CardChoiceOption[]) : []
}
export function factionOptions(c: PendingRewardChoice): FactionOption[] {
  return c.choiceType === 'faction_booster' ? (c.options as FactionOption[]) : []
}

// ── Daily Login ─────────────────────────────────────────────────────────────
export type LoginRewardDay = {
  day: number
  rewards: RewardDefinition[]
  milestone: boolean
  claimed: boolean
  claimedAt: string | null
}

export type LoginRewardState = {
  cycleId: string | null
  cycleIndex: number
  economyVersion: number
  cyclePosition: number
  cycleLength: number
  cycleStartedAt: string | null
  claimedToday: boolean
  claimableDay: number | null
  nextClaimAt: string | null
  /** kito UTC vidurnakčio ISO laikas (countdown) */
  resetAt: string
  /** paeiliui atsiimtų parų serija */
  streak: number
  /** praleistos paros nuo ciklo pradžios */
  missedDays: number
  cycleCompleted: boolean
  claimedDays: number[]
  rewards: LoginRewardDay[]
  pendingChoices: PendingRewardChoice[]
  balances: Balances
  serverTime: string
}

// ── Season Path ─────────────────────────────────────────────────────────────
export type SeasonTrackState = {
  rewards: RewardDefinition[]
  claimed: boolean
  claimable: boolean
  /** pass takelis be Season Pass */
  locked?: boolean
}

export type SeasonLevelRow = {
  level: number
  xpRequired: number
  reached: boolean
  free: SeasonTrackState
  pass: SeasonTrackState
}

export type SeasonPathState = {
  season: {
    id: string
    title: string
    theme: string | null
    startsAt: string
    endsAt: string | null
    economyVersion: number
  }
  xp: number
  level: number
  levels: number
  xpPerLevel: number
  totalXp: number
  /** XP dabartiniame lygyje ir kiek reikia kitam */
  xpIntoLevel: number
  xpForNextLevel: number
  hasPass: boolean
  passPrice: { silver: number; rubies: number }
  rows: SeasonLevelRow[]
  pendingChoices: PendingRewardChoice[]
  balances: Balances
  serverTime: string
}

// ── Daily Quests ────────────────────────────────────────────────────────────
export type QuestDifficulty = 'easy' | 'medium' | 'hard'

export type DailyQuest = {
  id: number
  difficulty: QuestDifficulty
  templateCode: string
  objectiveType: string
  /** i18n raktai — tekstas renderinamas per t() */
  titleKey: string
  descKey: string
  target: number
  progress: number
  factionId: number | null
  rewards: RewardDefinition[]
  completed: boolean
  claimed: boolean
  rerollable: boolean
  /** 0 = nemokamas; null reiškia, kad reroll nebegalimas */
  rerollCostSilver: number | null
}

export type DailyQuestsState = {
  dateKey: string
  resetAt: string
  quests: DailyQuest[]
  allCompleted: boolean
  chest: { rewards: RewardDefinition[]; claimable: boolean; claimed: boolean }
  reroll: { used: number; max: number; freeRemaining: number; nextCostSilver: number | null }
  dailyMax: { silver: number; essence: number; season_xp: number }
  pendingChoices: PendingRewardChoice[]
  balances: Balances
  serverTime: string
}

// ── Bendras claim rezultatas ────────────────────────────────────────────────
export type ProgressionSnapshot = LoginRewardState | SeasonPathState | DailyQuestsState | FullProgressionSnapshot

export type ClaimResult<S = ProgressionSnapshot> =
  | { status: 'completed'; grantedRewards: GrantedReward[]; snapshot: S }
  | { status: 'choice_required'; pendingChoices: PendingRewardChoice[]; grantedRewards: GrantedReward[]; snapshot: S }

export type ProgressionError = { error: string; [k: string]: unknown }
export type ProgressionResult<T> = T | ProgressionError

export function isProgressionError<T>(r: ProgressionResult<T> | null): r is ProgressionError {
  return !!r && typeof r === 'object' && 'error' in (r as Record<string, unknown>)
}

// ── Boosterio rezultatas ────────────────────────────────────────────────────
export type BoosterCard = {
  slot: number
  cardId: string | null
  name?: string
  factionId: number
  rarity: 'common' | 'magic' | CardRarityCode
  compensated: boolean
  essence?: number
}

export type BoosterResult = {
  factionId: number
  cards: BoosterCard[]
  essenceCompensation: number
}

// ── Pilnas snapshot ─────────────────────────────────────────────────────────
export type FullProgressionSnapshot = {
  login: LoginRewardState
  season: SeasonPathState
  quests: DailyQuestsState
  pendingChoices: PendingRewardChoice[]
  balances: Balances
  economyVersion: number
  serverTime: string
}

// ── Ekonomikos konfigūracija (tik skaitymui, iš serverio) ──────────────────
export type ProgressionConfig = {
  economyVersion: number
  loginCycle: { length: number; rewards: { day: number; rewards: RewardDefinition[]; milestone: boolean }[] }
  seasonPath: Record<string, unknown>
  dailyQuests: Record<string, unknown>
  booster: Record<string, unknown>
  factions: FactionOption[]
}
