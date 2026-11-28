'use client'
// ── Paskyros lygio pakopos emblema (848 → 849 tikri paveikslėliai) ───────────
// 10 pakopų + Prestižas: public/ravenof-ui/levels/emblem-01…11(.webp | -s.webp).
// Visos vietos (antraštė, lygių ekranas, kovos pabaiga) naudoja šį komponentą.
//
// Paveikslėliai skirtingo silueto (karūnos, sparnai), todėl kiekvienas dedamas
// taip, kad jo LYGIO PLOKŠTELĖ atsidurtų toje pačioje dėžutės vietoje – skaičius
// visada ten pat, o puošyba gali išlįsti už dėžutės ribų (išdėstymo nekeičia).
import { RANK_GROUPS, getRankGroupForLevel } from '@/lib/gamification/levels'

/** Pakopos numeris 0–9 pagal lygį. */
export function tierIndexForLevel(level: number): number {
  const g = getRankGroupForLevel(level)
  const i = RANK_GROUPS.indexOf(g)
  return i < 0 ? 0 : i
}

// [plotis, aukštis (šaltinio px), plokštelės centras x, y, plokštelės aukštis (dalimis), mastelis]
// Reikšmės išmatuotos iš store-media/level-emblems-src paveikslėlių (brief'as: projekto doc paskyros-lygiu-assets-brief).
const EMBLEMS: [number, number, number, number, number, number][] = [
  [904, 1001, 0.499, 0.792, 0.176, 1.0],    // 1 Naujokas
  [907, 1001, 0.499, 0.792, 0.176, 1.0],    // 2 Žaidėjas
  [905, 1001, 0.499, 0.792, 0.177, 1.0],    // 3 Taktikas
  [905, 1001, 0.499, 0.793, 0.177, 1.002],  // 4 Patyręs
  [908, 1002, 0.499, 0.792, 0.177, 1.005],  // 5 Veteranas
  [858, 1016, 0.499, 0.807, 0.162, 1.033],  // 6 Meistras
  [874, 1020, 0.5, 0.802, 0.171, 1.022],    // 7 Didmeistris
  [934, 921, 0.5, 0.793, 0.176, 1.044],     // 8 Legenda
  [933, 1020, 0.498, 0.73, 0.123, 1.192],   // 9 Elitas
  [933, 1001, 0.498, 0.799, 0.166, 1.041],  // 10 Panteonas
  [933, 989, 0.499, 0.766, 0.159, 1.066],   // 11 Prestižas
]
// Lygio skaičiaus spalva pagal pakopą
const NUM_COLOR = ['#b9b3c2', '#b4b9c8', '#e3a765', '#c9dbe8', '#e8eaf0', '#f2c45a', '#ffc070', '#dccbff', '#ffd879', '#fff3d0', '#ff8a8a']
const PLAQUE_Y = 0.792   // kur dėžutėje atsiduria plokštelės centras
const BASE_H = 1001      // 1 pakopos aukštis = dėžutės aukštis

export function LevelEmblem({ level, size = 48, showLevel = true, title, prestige = false }: { level: number; size?: number; showLevel?: boolean; title?: string; prestige?: boolean }) {
  const idx = prestige ? 10 : Math.min(9, Math.max(0, tierIndexForLevel(level)))
  const [w, h, cx, cy, ph, k] = EMBLEMS[idx]
  const boxW = size
  const boxH = Math.round(size * 1.107)
  const s = (boxH / BASE_H) * k
  const imgW = w * s
  const imgH = h * s
  const n = String(idx + 1).padStart(2, '0')
  const src = `/ravenof-ui/levels/emblem-${n}${size <= 44 ? '-s' : ''}.webp`
  // mažuose dydžiuose skaičius didesnis už plokštelę – kitaip neįskaitomas
  const font = Math.max(ph * imgH * 0.74, 9)
  return (
    <span role="img" aria-label={title ?? String(level)} title={title || undefined}
      style={{ position: 'relative', display: 'block', flex: 'none', width: boxW, height: boxH }}>
      <img src={src} alt="" draggable={false}
        style={{ position: 'absolute', left: boxW / 2 - cx * imgW, top: PLAQUE_Y * boxH - cy * imgH, width: imgW, height: imgH, maxWidth: 'none', pointerEvents: 'none', userSelect: 'none' }} />
      {showLevel && (
        <span aria-hidden style={{ position: 'absolute', left: 0, right: 0, top: PLAQUE_Y * boxH, transform: 'translateY(-50%)', textAlign: 'center',
          font: `800 ${font.toFixed(1)}px/1 var(--ravenof-font-display, Cinzel, Georgia, serif)`, color: NUM_COLOR[idx],
          textShadow: '0 0 3px #000, 0 1px 2px #000, 0 0 6px rgba(0,0,0,.9)' }}>{level}</span>
      )}
    </span>
  )
}
