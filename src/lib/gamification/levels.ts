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

export type LevelThreshold = {
  level: number
  title: string
  requiredTotalXp: number
}

export const LEVEL_THRESHOLDS: LevelThreshold[] = [
  { level:  1, title: 'Bevardis Naujokas',           requiredTotalXp:       0 },
  { level:  2, title: 'Pirmojo Žingsnio Žaidėjas',   requiredTotalXp:     100 },
  { level:  3, title: 'Kortų Mokinys',               requiredTotalXp:     250 },
  { level:  4, title: 'Kaladės Pameistrys',          requiredTotalXp:     500 },
  { level:  5, title: 'Pradedantis Strategas',       requiredTotalXp:     850 },
  { level:  6, title: 'Arenos Stebėtojas',           requiredTotalXp:   1_250 },
  { level:  7, title: 'Frakcijos Ieškotojas',        requiredTotalXp:   1_750 },
  { level:  8, title: 'Jaunasis Taktikas',           requiredTotalXp:   2_350 },
  { level:  9, title: 'Kortų Rinkėjas',              requiredTotalXp:   3_000 },
  { level: 10, title: 'Ravenof Žaidėjas',            requiredTotalXp:   3_750 },
  { level: 11, title: 'Kaladės Kalvis',              requiredTotalXp:   4_600 },
  { level: 12, title: 'Arenos Dalyvis',              requiredTotalXp:   5_500 },
  { level: 13, title: 'Frakcijos Sekėjas',           requiredTotalXp:   6_500 },
  { level: 14, title: 'Mūšio Planuotojas',           requiredTotalXp:   7_600 },
  { level: 15, title: 'Ravenof Taktikas',            requiredTotalXp:   8_800 },
  { level: 16, title: 'Kolekcijos Prižiūrėtojas',   requiredTotalXp:  10_100 },
  { level: 17, title: 'Strategijų Medžiotojas',      requiredTotalXp:  11_500 },
  { level: 18, title: 'Turnyro Pretendentas',        requiredTotalXp:  13_000 },
  { level: 19, title: 'Bendruomenės Veidas',         requiredTotalXp:  14_600 },
  { level: 20, title: 'Patyręs Žaidėjas',            requiredTotalXp:  16_300 },
  { level: 21, title: 'Frakcijos Karys',             requiredTotalXp:  18_100 },
  { level: 22, title: 'Kaladžių Architektas',        requiredTotalXp:  20_000 },
  { level: 23, title: 'Arenos Veteranas',            requiredTotalXp:  22_000 },
  { level: 24, title: 'Čempionų Sekėjas',            requiredTotalXp:  24_100 },
  { level: 25, title: "Ravenof Veteran'as",          requiredTotalXp:  26_300 },
  { level: 26, title: 'Kolekcijos Meistras',         requiredTotalXp:  28_600 },
  { level: 27, title: 'Frakcijų Žinovas',            requiredTotalXp:  31_000 },
  { level: 28, title: 'Turnyrų Reguliaras',          requiredTotalXp:  33_500 },
  { level: 29, title: 'Bendruomenės Ramstis',        requiredTotalXp:  36_100 },
  { level: 30, title: 'Ravenof Meistras',            requiredTotalXp:  38_800 },
  { level: 31, title: 'Čempionų Meistras',           requiredTotalXp:  41_700 },
  { level: 32, title: 'Meta Formuotojas',            requiredTotalXp:  44_800 },
  { level: 33, title: 'Didysis Kolekcionierius',     requiredTotalXp:  48_100 },
  { level: 34, title: 'Arenos Komandoras',           requiredTotalXp:  51_600 },
  { level: 35, title: 'Frakcijos Legenda',           requiredTotalXp:  55_300 },
  { level: 36, title: 'Turnyrų Grėsmė',             requiredTotalXp:  59_200 },
  { level: 37, title: 'Ravenof Strategas',           requiredTotalXp:  63_300 },
  { level: 38, title: 'Pergalių Kalvis',             requiredTotalXp:  67_600 },
  { level: 39, title: 'Aukštasis Taktikas',          requiredTotalXp:  72_100 },
  { level: 40, title: 'Ravenof Legenda',             requiredTotalXp:  76_800 },
  { level: 41, title: 'Čempionų Vedlys',             requiredTotalXp:  81_500 },
  { level: 42, title: 'Arenos Valdovas',             requiredTotalXp:  86_000 },
  { level: 43, title: 'Frakcijų Architektas',        requiredTotalXp:  90_000 },
  { level: 44, title: 'Senasis Meistras',            requiredTotalXp:  93_500 },
  { level: 45, title: 'Turnyrų Karūna',              requiredTotalXp:  96_500 },
  { level: 46, title: 'Ravenof Ikona',               requiredTotalXp:  98_000 },
  { level: 47, title: 'Amžinasis Strategas',         requiredTotalXp:  99_000 },
  { level: 48, title: 'Legendų Saugotojas',          requiredTotalXp:  99_500 },
  { level: 49, title: 'Panteono Vardas',             requiredTotalXp:  99_800 },
  { level: 50, title: 'Ravenof Nemirtingasis',       requiredTotalXp: 100_000 },
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
  return LEVEL_THRESHOLDS[level - 1]?.title ?? 'Bevardis Naujokas'
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
  const title = threshold.title
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
