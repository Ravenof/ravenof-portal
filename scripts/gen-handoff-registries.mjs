#!/usr/bin/env node
// ════════════════════════════════════════════════════════════════════════════
//  Profile/Progression handoff (Fazė 5) → TS registrai + SQL seed'as
//  ─────────────────────────────────────────────────────────────────────────
//  Šaltinis (source of truth): asffa/asset-maps/*.csv iš dizaino paketo.
//  Generuoja:
//    src/lib/profile/ranks.ts           — 50 rangų (progresijos tvarka + badge)
//    src/lib/profile/achievements.ts    — 70 pasiekimų (kategorijos, sąlygos)
//    supabase/migrations/_generated_achievements_seed.sql — seed'as migracijai
//  Paleidimas: node scripts/gen-handoff-registries.mjs   (npm run handoff:gen)
//  Perleisti, kai atkeliaus trūkstami badge'ai 63–70 arba pasikeis manifestai.
// ════════════════════════════════════════════════════════════════════════════
import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
// Manifestai laikomi repo viduje (docs/profile-handoff), kad generavimas veiktų
// ir be 42 MB dizaino paketo; `asffa/` – originalus paketas (į git nededamas).
const MAPS = fs.existsSync(path.join(ROOT, 'docs', 'profile-handoff', 'asset-maps'))
  ? path.join(ROOT, 'docs', 'profile-handoff', 'asset-maps')
  : path.join(ROOT, 'asffa', 'asset-maps')
const q = (s) => `'${String(s).replace(/'/g, "\\'")}'`
// Gamyboje assetai serveriuojami kaip WebP (~18 % PNG svorio). Manifestai lieka
// tiesos šaltiniu VARDAMS, tik plėtinys pakeičiamas.
const webp = (f) => (f ? String(f).replace(/\.png$/i, '.webp') : f)
const sq = (s) => `'${String(s).replace(/'/g, "''")}'`

/** Minimalus CSV skaitytuvas (palaiko kabutėse esančius kablelius). */
function readCsv(file) {
  const txt = fs.readFileSync(file, 'utf8').replace(/^﻿/, '')
  const rows = []
  let cur = [], val = '', quoted = false
  for (let i = 0; i < txt.length; i++) {
    const ch = txt[i]
    if (quoted) {
      if (ch === '"' && txt[i + 1] === '"') { val += '"'; i++ }
      else if (ch === '"') quoted = false
      else val += ch
    } else if (ch === '"') quoted = true
    else if (ch === ',') { cur.push(val); val = '' }
    else if (ch === '\n') { cur.push(val); rows.push(cur); cur = []; val = '' }
    else if (ch !== '\r') val += ch
  }
  if (val.length || cur.length) { cur.push(val); rows.push(cur) }
  const head = rows.shift().map((h) => h.trim())
  return rows.filter((r) => r.some((c) => c.trim() !== '')).map((r) => Object.fromEntries(head.map((h, i) => [h, (r[i] ?? '').trim()])))
}

// ── 1. Rangai ───────────────────────────────────────────────────────────────
const ranks = readCsv(path.join(MAPS, 'ranked-manifest.csv'))
if (ranks.length !== 50) throw new Error(`ranked-manifest.csv: laukta 50 eilučių, rasta ${ranks.length}`)

const rankTs = `// ⚠️ GENERUOTAS FAILAS — nekeisk ranka.
// Šaltinis: asffa/asset-maps/ranked-manifest.csv · generatorius: scripts/gen-handoff-registries.mjs
// Rangų progresija: 50 Bronze → 50 Silver → 50 Gold → 49 Bronze → … → 1 Gold.

export type RankTier = 'bronze' | 'silver' | 'gold'
export const RANK_TIERS: RankTier[] = ['bronze', 'silver', 'gold']

export type RankDef = {
  /** Progresijos eilė nuo įėjimo (1 = 50-as rangas, 50 = 1-as rangas). */
  order: number
  /** Rango numeris: 50 = įėjimas, 1 = aukščiausias. */
  rank: number
  nameLt: string
  badgeFile: string
}

export const RANKS: RankDef[] = [
${ranks.map((r) => `  { order: ${+r.progression_order}, rank: ${+r.rank_number}, nameLt: ${q(r.name_lt)}, badgeFile: ${q(webp(r.badge_file))} },`).join('\n')}
]

const BY_RANK = new Map<number, RankDef>(RANKS.map((r) => [r.rank, r]))
export const rankDef = (rankNumber: number): RankDef | null => BY_RANK.get(rankNumber) ?? null

/** Rango ženklo iliustracija (apatinis sluoksnis). */
export const rankBadgeSrc = (rankNumber: number): string | null => {
  const d = BY_RANK.get(rankNumber)
  return d ? \`/ravenof-ui/ranks/badges/\${d.badgeFile}\` : null
}
/** Pakopos rėmas (VIRŠUTINIS sluoksnis; bendras visiems rangams). */
export const rankFrameSrc = (tier: RankTier): string => \`/ravenof-ui/ranks/frames/\${tier}-frame.webp\`

/** Bendras žingsnis 1..150 (1 = 50 Bronze, 150 = 1 Gold) – palyginimams/progresui. */
export function rankStepIndex(rankNumber: number, tier: RankTier): number {
  const d = BY_RANK.get(rankNumber)
  if (!d) return 0
  return (d.order - 1) * 3 + RANK_TIERS.indexOf(tier) + 1
}
/** Kitas rangas progresijoje (Bronze → Silver → Gold → aukštesnis rangas). */
export function nextRankStep(rankNumber: number, tier: RankTier): { rank: number; tier: RankTier } | null {
  const ti = RANK_TIERS.indexOf(tier)
  if (ti < 2) return { rank: rankNumber, tier: RANK_TIERS[ti + 1] }
  const d = BY_RANK.get(rankNumber)
  if (!d || d.order >= RANKS.length) return null
  return { rank: RANKS[d.order].rank, tier: 'bronze' }
}
/** Profilio etiketė: „50 RANGAS · Atvykėlis". */
export const rankLabel = (rankNumber: number): string => {
  const d = BY_RANK.get(rankNumber)
  return d ? \`\${d.rank} RANGAS · \${d.nameLt}\` : \`\${rankNumber} RANGAS\`
}
`
fs.writeFileSync(path.join(ROOT, 'src', 'lib', 'profile', 'ranks.ts'), rankTs)

// ── 2. Pasiekimai ───────────────────────────────────────────────────────────
const ach = readCsv(path.join(MAPS, 'achievement-manifest.csv'))
if (ach.length !== 70) throw new Error(`achievement-manifest.csv: laukta 70 eilučių, rasta ${ach.length}`)

const CATEGORY_KEYS = {
  'Pradžia ir profilis': 'start',
  'Kovos ir pergalės': 'combat',
  'Taktika ir mechanikos': 'tactics',
  'Kaladės ir frakcijos': 'decks',
  'Kolekcija': 'collection',
  'Ranked': 'ranked',
  'Dienos aktyvumas': 'daily',
  'Bendruomenė': 'community',
}
const rows = ach.map((r) => {
  const id = +r.id
  const catKey = CATEGORY_KEYS[r.category]
  if (!catKey) throw new Error(`Nežinoma kategorija: ${r.category} (id ${id})`)
  return {
    id, code: `ach_${String(id).padStart(2, '0')}`, catKey, category: r.category,
    nameLt: r.name_lt, requirementLt: r.requirement_lt,
    badgeFile: webp(r.badge_file) || null, status: r.status,
  }
})
const totals = {}
for (const r of rows) totals[r.catKey] = (totals[r.catKey] ?? 0) + 1

const achTs = `// ⚠️ GENERUOTAS FAILAS — nekeisk ranka.
// Šaltinis: asffa/asset-maps/achievement-manifest.csv · scripts/gen-handoff-registries.mjs
// 70 gamybinių pasiekimų. 63–70 badge'ai dar negeneruoti (art blocker) — jiems
// badgeFile = null ir status = 'pending'; NIEKADA nepakeisti atsitiktine ikona.

export type AchievementCategory = ${Object.values(CATEGORY_KEYS).map((k) => q(k)).join(' | ')}

export const ACHIEVEMENT_CATEGORIES: { key: AchievementCategory; nameLt: string; total: number }[] = [
${Object.entries(CATEGORY_KEYS).map(([lt, key]) => `  { key: ${q(key)}, nameLt: ${q(lt)}, total: ${totals[key]} },`).join('\n')}
]

export type AchievementDef = {
  id: number
  code: string
  category: AchievementCategory
  nameLt: string
  requirementLt: string
  badgeFile: string | null
  status: 'generated' | 'pending'
}

export const ACHIEVEMENTS: AchievementDef[] = [
${rows.map((r) => `  { id: ${r.id}, code: ${q(r.code)}, category: ${q(r.catKey)}, nameLt: ${q(r.nameLt)}, requirementLt: ${q(r.requirementLt)}, badgeFile: ${r.badgeFile ? q(r.badgeFile) : 'null'}, status: ${q(r.status === 'generated' ? 'generated' : 'pending')} },`).join('\n')}
]

export const ACHIEVEMENT_TOTAL = ACHIEVEMENTS.length
const BY_CODE = new Map<string, AchievementDef>(ACHIEVEMENTS.map((a) => [a.code, a]))
export const achievementDef = (code: string): AchievementDef | null => BY_CODE.get(code) ?? null

/** Pasiekimo iliustracija (512×512 WebP su alfa). null = dar negeneruota. */
export const achievementBadgeSrc = (code: string): string | null => {
  const a = BY_CODE.get(code)
  return a?.badgeFile ? \`/ravenof-ui/achievements/\${a.badgeFile}\` : null
}
export const achievementsByCategory = (key: AchievementCategory): AchievementDef[] =>
  ACHIEVEMENTS.filter((a) => a.category === key)
`
fs.writeFileSync(path.join(ROOT, 'src', 'lib', 'profile', 'achievements.ts'), achTs)

// ── 3. SQL seed'as (naudoja migracija) ──────────────────────────────────────
const seed = `-- ⚠️ GENERUOTAS FAILAS (scripts/gen-handoff-registries.mjs) — nekeisk ranka.
-- 70 gamybinių pasiekimų iš asffa/asset-maps/achievement-manifest.csv
--
-- ❗ Tai TIK seed'as (perrašo pavadinimus/sąlygas/ženklus). Lenteles, RLS ir RPC
--    sukuria supabase/migrations/20260851_achievements_v2.sql — JĮ paleisk PIRMĄ.
--    Tas pats seed'as jau įeina į 20260851, tad pirmą kartą šio failo leisti nereikia.
do $$ begin
  if to_regclass('public.rvn_achievements') is null then
    raise exception 'Lentelės public.rvn_achievements nėra. Pirma paleisk supabase/migrations/20260851_achievements_v2.sql';
  end if;
end $$;

insert into public.rvn_achievements (code, sort_order, category, name_lt, requirement_lt, badge_file, status) values
${rows.map((r) => `  (${sq(r.code)}, ${r.id}, ${sq(r.catKey)}, ${sq(r.nameLt)}, ${sq(r.requirementLt)}, ${r.badgeFile ? sq(r.badgeFile) : 'null'}, ${sq(r.status === 'generated' ? 'generated' : 'pending')})`).join(',\n')}
on conflict (code) do update set
  sort_order = excluded.sort_order, category = excluded.category, name_lt = excluded.name_lt,
  requirement_lt = excluded.requirement_lt, badge_file = excluded.badge_file, status = excluded.status,
  updated_at = now();
`
fs.writeFileSync(path.join(ROOT, 'supabase', 'migrations', '_generated_achievements_seed.sql'), seed)

console.log(`✓ ranks: ${ranks.length} · achievements: ${rows.length} (generated ${rows.filter((r) => r.status === 'generated').length}, pending ${rows.filter((r) => r.status !== 'generated').length})`)
console.log('  → src/lib/profile/ranks.ts')
console.log('  → src/lib/profile/achievements.ts')
console.log('  → supabase/migrations/_generated_achievements_seed.sql')
