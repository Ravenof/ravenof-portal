// ════════════════════════════════════════════════════════════════════════════
// Campaign Seed types — a portable, code-defined campaign that the admin
// "Seed / Rebuild" tool turns into DB rows (safe-merge). Everything references
// other entities by stable `seedKey`, never by DB uuid, so a seed can be
// re-applied any number of times.
// ════════════════════════════════════════════════════════════════════════════

import type {
  CampaignType, MissionType, NodeIconType, MissionObjective,
  BattleConfig, ScenarioConfig, RewardPayload, UnlockRule, CutsceneStep, CutsceneType,
} from './types'

export interface SeedCampaign {
  seedKey: string
  slug: string
  title: string
  subtitle?: string
  description?: string
  campaignType: CampaignType
  lorePeriod?: string
  relatedFactions: string[]
  coverImageUrl?: string | null
  mapImageUrl?: string | null      // null => Atlas world map
  visibility?: 'draft' | 'active' | 'hidden'
}

export interface SeedChapter {
  seedKey: string
  title: string
  description?: string
  sortOrder: number
  narration?: string
}

export interface SeedCutscene {
  seedKey: string
  title: string
  type: CutsceneType
  backgroundImageUrl?: string | null
  backgroundVideoUrl?: string | null
  musicUrl?: string | null
  ambientUrl?: string | null
  skippable?: boolean
  autoplay?: boolean
  steps: CutsceneStep[]
}

export interface SeedNode {
  seedKey: string
  chapterSeedKey?: string
  title: string
  subtitle?: string
  description?: string
  loreText?: string
  posX: number
  posY: number
  iconType: NodeIconType
  missionType: MissionType
  unlockRule?: UnlockRule
  prevSeedKeys?: string[]
  nextSeedKeys?: string[]
  objectives?: MissionObjective[]
  preCutsceneSeedKey?: string | null
  postCutsceneSeedKey?: string | null
  failureCutsceneSeedKey?: string | null
  /** enemyFactionName resolved to id at rebuild time; storyDeckPackage is documentation. */
  battleConfig?: BattleConfig & { enemyFactionName?: string; storyDeckPackage?: string }
  scenario?: ScenarioConfig
  rewardPayload?: RewardPayload
  status?: 'draft' | 'active' | 'hidden'
  // canon / source
  sourceChapter?: string
  sourceEventIds?: string[]
  canonSummary?: string
  canonCharacters?: string[]
  canonLocations?: string[]
}

/** A lore-accurate deck package (documentation + future card-creation target). */
export interface SeedDeckPackage {
  key: string
  title: string
  availability: string            // which nodes it covers
  identity: string
  mechanics: string[]
  champion?: { name: string; skills: string[] }
  cards: { name: string; role?: string; count?: number }[]
}

export interface SeedEnemyPackage {
  key: string
  title: string
  faction: string
  notes: string
  units?: string[]
  behavior?: string[]
}

export interface CampaignSeed {
  campaign: SeedCampaign
  chapters: SeedChapter[]
  cutscenes: SeedCutscene[]
  nodes: SeedNode[]
  deckPackages: SeedDeckPackage[]
  enemyPackages: SeedEnemyPackage[]
}
