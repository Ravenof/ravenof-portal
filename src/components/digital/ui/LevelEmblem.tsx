'use client'
// ── Paskyros lygio pakopos emblema (848) ─────────────────────────────────────
// LAIKINA vektorinė emblema, kol nėra tikrų paveikslėlių (emblem-01…10). Forma
// visoms pakopoms ta pati (skydas su varnu ir lygio plokštele), keičiasi tik
// spalvos — taip pat, kaip bus su tikrais failais. Kai jie atsiras, užtenka
// pakeisti šį komponentą: visos vietos (antraštė, lygių ekranas, kovos pabaiga)
// naudoja jį.
import { RANK_GROUPS, getRankGroupForLevel } from '@/lib/gamification/levels'

/** Pakopos numeris 1–10 pagal lygį. */
export function tierIndexForLevel(level: number): number {
  const g = getRankGroupForLevel(level)
  const i = RANK_GROUPS.indexOf(g)
  return i < 0 ? 0 : i
}

// [rėmas, vidus, varnas] — nuo geležies iki aukso/baltos
const TONES: [string, string, string][] = [
  ['#6b6474', '#15121b', '#8d8698'], // Naujokas – geležis
  ['#8a8fa0', '#161420', '#b4b9c8'], // Žaidėjas – kalta geležis
  ['#b07a3c', '#1a1410', '#d49a55'], // Taktikas – bronza
  ['#9fb4c4', '#121820', '#c9dbe8'], // Patyręs – plienas
  ['#c9ccd4', '#14161a', '#e8eaf0'], // Veteranas – sidabras
  ['#d4a33b', '#1a1508', '#f2c45a'], // Meistras – auksas
  ['#e0863a', '#1c0f0a', '#ffb060'], // Didmeistris – auksas ir raudonis
  ['#b79cf0', '#150f22', '#dccbff'], // Legenda – platina ir violetas
  ['#f0b429', '#0a0810', '#ffd879'], // Elitas – obsidianas ir auksas
  ['#fff0c2', '#221a08', '#ffffff'], // Panteonas – spindintis auksas
]

export function LevelEmblem({ level, size = 48, showLevel = true, title }: { level: number; size?: number; showLevel?: boolean; title?: string }) {
  const [rim, fill, bird] = TONES[tierIndexForLevel(level)] ?? TONES[0]
  return (
    <svg width={size} height={Math.round(size * 1.107)} viewBox="0 0 112 124" role="img" aria-label={title ?? String(level)} style={{ flex: 'none', display: 'block' }}>
      <path d="M56 4 L104 20 V66 C104 94 82 112 56 120 C30 112 8 94 8 66 V20 Z" fill={fill} stroke={rim} strokeWidth="4" />
      <path d="M56 17 L93 30 V64 C93 86 77 100 56 107 C35 100 19 86 19 64 V30 Z" fill="none" stroke={rim} strokeOpacity=".45" strokeWidth="1.5" />
      <path d={showLevel ? 'M38 56 C44 38 62 34 74 42 L84 38 L78 48 C80 60 70 72 56 72 L44 80 L48 68 C42 66 38 62 38 56 Z' : 'M38 62 C44 44 62 40 74 48 L84 44 L78 54 C80 66 70 78 56 78 L44 86 L48 74 C42 72 38 68 38 62 Z'} fill={bird} />
      {showLevel && (
        <>
          <rect x="34" y="84" width="44" height="26" rx="3" fill="#07060A" stroke={rim} strokeWidth="2" />
          <text x="56" y="103.5" textAnchor="middle" fontFamily="Cinzel, Georgia, serif" fontWeight="800" fontSize="19" fill={bird}>{level}</text>
        </>
      )}
    </svg>
  )
}
