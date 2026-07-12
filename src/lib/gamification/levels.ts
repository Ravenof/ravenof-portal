/**
 * Ravenof Level Progression — Source of Truth
 *
 * 50-level system. Level is determined solely by total XP.
 * Max level 50 is reached at 100 000 XP.
 *
 * IMPORTANT: The SQL function calculate_level_from_xp() in the DB migration
 * must always match these thresholds exactly.
 */

// ---------------------------------------------------------------------------
// Level thresholds
// ---------------------------------------------------------------------------

import { t } from '@/lib/i18n/core'

export type LevelThreshold = {
  level: number
  /** i18n raktas (progression.levelTitle.N), NE gatavas tekstas. */
  title: string
  requiredTotalXp: number
}

export const LEVEL_THRESHOLDS: LevelThreshold[] = [
  { level:  1, title: 'progression.levelTitle.1',           requiredTotalXp:       0 },
  { level:  2, title: 'progression.levelTitle.2',   requiredTotalXp:     100 },
  { level:  3, title: 'progression.levelTitle.3',               requiredTotalXp:     250 },
  { level:  4, title: 'progression.levelTitle.4',          requiredTotalXp:     500 },
  { level:  5, title: 'progression.levelTitle.5',       requiredTotalXp:     850 },
  { level:  6, title: 'progression.levelTitle.6',           requiredTotalXp:   1_250 },
  { level:  7, title: 'progression.levelTitle.7',        requiredTotalXp:   1_750 },
  { level:  8, title: 'progression.levelTitle.8',           requiredTotalXp:   2_350 },
  { level:  9, title: 'progression.levelTitle.9',              requiredTotalXp:   3_000 },
  { level: 10, title: 'progression.levelTitle.10',            requiredTotalXp:   3_750 },
  { level: 11, title: 'progression.levelTitle.11',              requiredTotalXp:   4_600 },
  { level: 12, title: 'progression.levelTitle.12',              requiredTotalXp:   5_500 },
  { level: 13, title: 'progression.levelTitle.13',           requiredTotalXp:   6_500 },
  { level: 14, title: 'progression.levelTitle.14',           requiredTotalXp:   7_600 },
  { level: 15, title: 'progression.levelTitle.15',            requiredTotalXp:   8_800 },
  { level: 16, title: 'progression.levelTitle.16',   requiredTotalXp:  10_100 },
  { level: 17, title: 'progression.levelTitle.17',      requiredTotalXp:  11_500 },
  { level: 18, title: 'progression.levelTitle.18',        requiredTotalXp:  13_000 },
  { level: 19, title: 'progression.levelTitle.19',         requiredTotalXp:  14_600 },
  { level: 20, title: 'progression.levelTitle.20',            requiredTotalXp:  16_300 },
  { level: 21, title: 'progression.levelTitle.21',             requiredTotalXp:  18_100 },
  { level: 22, title: 'progression.levelTitle.22',        requiredTotalXp:  20_000 },
  { level: 23, title: 'progression.levelTitle.23',            requiredTotalXp:  22_000 },
  { level: 24, title: 'progression.levelTitle.24',            requiredTotalXp:  24_100 },
  { level: 25, title: "Ravenof Veteran'as",          requiredTotalXp:  26_300 },
  { level: 26, title: 'progression.levelTitle.26',         requiredTotalXp:  28_600 },
  { level: 27, title: 'progression.levelTitle.27',            requiredTotalXp:  31_000 },
  { level: 28, title: 'progression.levelTitle.28',          requiredTotalXp:  33_500 },
  { level: 29, title: 'progression.levelTitle.29',        requiredTotalXp:  36_100 },
  { level: 30, title: 'progression.levelTitle.30',            requiredTotalXp:  38_800 },
  { level: 31, title: 'progression.levelTitle.31',           requiredTotalXp:  41_700 },
  { level: 32, title: 'progression.levelTitle.32',            requiredTotalXp:  44_800 },
  { level: 33, title: 'progression.levelTitle.33',     requiredTotalXp:  48_100 },
  { level: 34, title: 'progression.levelTitle.34',           requiredTotalXp:  51_600 },
  { level: 35, title: 'progression.levelTitle.35',           requiredTotalXp:  55_300 },
  { level: 36, title: 'progression.levelTitle.36',             requiredTotalXp:  59_200 },
  { level: 37, title: 'progression.levelTitle.37',           requiredTotalXp:  63_300 },
  { level: 38, title: 'progression.levelTitle.38',             requiredTotalXp:  67_600 },
  { level: 39, title: 'progression.levelTitle.39',          requiredTotalXp:  72_100 },
  { level: 40, title: 'progression.levelTitle.40',             requiredTotalXp:  76_800 },
  { level: 41, title: 'progression.levelTitle.41',             requiredTotalXp:  81_500 },
  { level: 42, title: 'progression.levelTitle.42',             requiredTotalXp:  86_000 },
  { level: 43, title: 'progression.levelTitle.43',        requiredTotalXp:  90_000 },
  { level: 44, title: 'progression.levelTitle.44',            requiredTotalXp:  93_500 },
  { level: 45, title: 'progression.levelTitle.45',              requiredTotalXp:  96_500 },
  { level: 46, title: 'progression.levelTitle.46',               requiredTotalXp:  98_000 },
  { level: 47, title: 'progression.levelTitle.47',         requiredTotalXp:  99_000 },
  { level: 48, title: 'progression.levelTitle.48',          requiredTotalXp:  99_500 },
  { level: 49, title: 'progression.levelTitle.49',             requiredTotalXp:  99_800 },
  { level: 50, title: 'progression.levelTitle.50',       requiredTotalXp: 100_000 },
]

export const MAX_LEVEL = 50
export const MAX_XP = 100_000

// ---------------------------------------------------------------------------
// Rank groups (Task 6) — used for icon + color display
// ---------------------------------------------------------------------------

export type RankGroup = {
  name: string
  minLevel: number
  maxLevel: number
  icon: string
  color: string
}

export const RANK_GROUPS: RankGroup[] = [
  { name: 'Naujokas',          minLevel:  1, maxLevel:  5, icon: '🌱', color: '#6b7280' },
  { name: 'Žaidėjas',          minLevel:  6, maxLevel: 10, icon: '🎴', color: '#3b82f6' },
  { name: 'Taktikas',          minLevel: 11, maxLevel: 15, icon: '⚔️',  color: '#8b5cf6' },
  { name: 'Patyręs Žaidėjas',  minLevel: 16, maxLevel: 20, icon: '🛡️',  color: '#06b6d4' },
  { name: "Veteran'as",        minLevel: 21, maxLevel: 25, icon: '🏅',  color: '#10b981' },
  { name: 'Meistras',          minLevel: 26, maxLevel: 30, icon: '⚡',  color: '#f59e0b' },
  { name: 'Aukštasis Meistras',minLevel: 31, maxLevel: 35, icon: '🔥',  color: '#ef4444' },
  { name: 'Legenda',           minLevel: 36, maxLevel: 40, icon: '💎',  color: '#ec4899' },
  { name: 'Elitas',            minLevel: 41, maxLevel: 45, icon: '👑',  color: '#f97316' },
  { name: 'Panteonas',         minLevel: 46, maxLevel: 50, icon: '✨',  color: '#d4af37' },
]

// ---------------------------------------------------------------------------
// Level-up rewards — MIRROR of SQL rvn__level_reward (migration 20260804)
// ---------------------------------------------------------------------------

export type LevelReward = { gold: number; boosters: number }

/** Atlygis už pasiektą lygį. VEIDRODIS SQL rvn__level_reward — keiskite abu. */
export function levelReward(level: number): LevelReward {
  const boosters = level % 10 === 0 ? 2 : level % 5 === 0 ? 1 : 0
  return { gold: 100 + level * 25, boosters }
}

// ---------------------------------------------------------------------------
// Core helpers
// ---------------------------------------------------------------------------

/** Clamps xp to valid range. */
function safeXp(totalXp: number): number {
  return Math.max(0, totalXp)
}

/** Returns the level (1–50) for a given total XP amount. */
export function getLevelForXp(totalXp: number): number {
  const xp = safeXp(totalXp)
  // Walk backwards to find the highest threshold the user meets
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (xp >= LEVEL_THRESHOLDS[i].requiredTotalXp) {
      return LEVEL_THRESHOLDS[i].level
    }
  }
  return 1
}

/** Returns the level title for a given total XP amount. */
export function getLevelTitleForXp(totalXp: number): string {
  const level = getLevelForXp(totalXp)
  return t(LEVEL_THRESHOLDS[level - 1]?.title ?? 'progression.levelTitle.1')
}

/** Returns the rank group for a given level. */
export function getRankGroupForLevel(level: number): RankGroup {
  const group = RANK_GROUPS.find((g) => level >= g.minLevel && level <= g.maxLevel)
  return group ?? RANK_GROUPS[0]
}

// ---------------------------------------------------------------------------
// Full progress object
// ---------------------------------------------------------------------------

export type LevelProgress = {
  level: number
  title: string
  totalXp: number
  currentLevelXp: number   // XP required for current level start
  nextLevelXp: number      // XP required for next level (0 if max)
  xpIntoLevel: number      // XP earned since current level started
  xpNeededForNextLevel: number  // XP still needed to reach next level (0 if max)
  progressPercent: number  // 0–100
  isMaxLevel: boolean
  rankGroup: RankGroup
}

/**
 * Returns the full level/XP progress state for a user.
 *
 * - If totalXp < 0 → treated as 0.
 * - If totalXp >= 100 000 → Level 50, isMaxLevel true, progressPercent 100.
 */
export function getLevelProgress(totalXp: number): LevelProgress {
  const xp = safeXp(totalXp)
  const level = getLevelForXp(xp)
  const threshold = LEVEL_THRESHOLDS[level - 1]
  const title = t(threshold.title)
  const rankGroup = getRankGroupForLevel(level)

  if (level >= MAX_LEVEL) {
    return {
      level: MAX_LEVEL,
      title,
      totalXp: xp,
      currentLevelXp: MAX_XP,
      nextLevelXp: 0,
      xpIntoLevel: xp - MAX_XP,
      xpNeededForNextLevel: 0,
      progressPercent: 100,
      isMaxLevel: true,
      rankGroup,
    }
  }

  const nextThreshold = LEVEL_THRESHOLDS[level] // level index = level - 1, so next = level
  const currentLevelXp = threshold.requiredTotalXp
  const nextLevelXp = nextThreshold.requiredTotalXp
  const xpIntoLevel = xp - currentLevelXp
  const range = nextLevelXp - currentLevelXp
  const xpNeededForNextLevel = nextLevelXp - xp
  const progressPercent = range > 0
    ? Math.min(100, Math.max(0, Math.round((xpIntoLevel / range) * 100)))
    : 100

  return {
    level,
    title,
    totalXp: xp,
    currentLevelXp,
    nextLevelXp,
    xpIntoLevel,
    xpNeededForNextLevel,
    progressPercent,
    isMaxLevel: false,
    rankGroup,
  }
}
