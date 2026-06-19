// ── Centrinė kovos efektų animacijų konfigūracija ─────────────────────────────
// Susieja loginį efekto tipą su animacijos aprašu (kaip atrodo, iš kur prasideda,
// kiek trunka, kaip reaguoja taikinys, koks garsas). Naudoja BattleFxLayer +
// TutorialGame log apdorojimas. Pacing taisyklė: efektas PRASIDEDA nuo source
// kortos ir nukeliauja į taikinį; rezultatas (skaičius/reakcija) sutampa su smūgiu.

export type FxKind =
  | 'projectile' | 'slash' | 'beam' | 'healStream' | 'buffSurge' | 'debuffDrain'
  | 'aoeWave' | 'curseMark' | 'disintegrate' | 'shield' | 'freeze'
  | 'summonPortal' | 'graveRise' | 'drawStream' | 'stealthFade' | 'goldSteal'
  | 'burn' | 'poison'

export type FxIntensity = 'small' | 'normal' | 'big'

export type FxOrigin = 'sourceCard' | 'target' | 'deck' | 'board'

export type EffectAnim = {
  animation: FxKind
  duration: number          // sekundėmis (rekomendacijos: small 0.8-1.2, normal 1.3-2.0, big 2.0-2.8)
  origin: FxOrigin
  targetReaction: 'shakeFlash' | 'crackDissolve' | 'glow' | 'multiShake' | 'pop' | 'darken' | 'frost' | 'none'
  sound?: string            // soundManager raktas
}

// Loginis efekto tipas → animacijos aprašas
export const effectAnimationMap: Record<string, EffectAnim> = {
  damage:     { animation: 'projectile', duration: 1.3, origin: 'sourceCard', targetReaction: 'shakeFlash',   sound: 'impact' },
  burn:       { animation: 'projectile', duration: 1.4, origin: 'sourceCard', targetReaction: 'shakeFlash',   sound: 'impact' },
  destroy:    { animation: 'slash',      duration: 1.6, origin: 'sourceCard', targetReaction: 'crackDissolve', sound: 'death' },
  heal:       { animation: 'healStream', duration: 1.4, origin: 'sourceCard', targetReaction: 'glow',          sound: 'heal' },
  buff:       { animation: 'buffSurge',  duration: 1.2, origin: 'sourceCard', targetReaction: 'pop',           sound: 'heal' },
  debuff:     { animation: 'debuffDrain',duration: 1.3, origin: 'sourceCard', targetReaction: 'darken',        sound: 'freeze' },
  curse:      { animation: 'curseMark',  duration: 1.5, origin: 'sourceCard', targetReaction: 'darken',        sound: 'curse' },
  aoeDamage:  { animation: 'aoeWave',    duration: 1.8, origin: 'sourceCard', targetReaction: 'multiShake',    sound: 'impact' },
  attack:     { animation: 'slash',      duration: 1.0, origin: 'sourceCard', targetReaction: 'shakeFlash',    sound: 'attack' },
  spell:      { animation: 'projectile', duration: 1.3, origin: 'sourceCard', targetReaction: 'shakeFlash',    sound: 'spellCast' },
  shield:     { animation: 'shield',     duration: 1.2, origin: 'target',     targetReaction: 'glow',          sound: 'heal' },
  freeze:     { animation: 'freeze',     duration: 1.4, origin: 'sourceCard', targetReaction: 'frost',         sound: 'freeze' },
  draw:       { animation: 'drawStream', duration: 1.2, origin: 'deck',       targetReaction: 'none',          sound: 'draw' },
  summon:     { animation: 'summonPortal',duration: 1.4, origin: 'board',     targetReaction: 'pop',           sound: 'summon' },
  revive:     { animation: 'graveRise',  duration: 1.8, origin: 'board',      targetReaction: 'pop',           sound: 'summon' },
}

// ── Frakcijų vizualiniai stiliai ──────────────────────────────────────────────
export type FactionPalette = { primary: string; secondary: string; particle: string }

const FACTION_FX: { match: RegExp; pal: FactionPalette }[] = [
  { match: /mirt|mar[šs]/i,        pal: { primary: '#5ef0c0', secondary: '#1a6b52', particle: '#aef5dd' } }, // Mirties maršas – nekrotinis žalsvas
  { match: /mistik|melodij/i,       pal: { primary: '#a78bfa', secondary: '#4c1d95', particle: '#c4b5fd' } }, // Mistikos melodija – arkanas violetinis
  { match: /inkviz|legion/i,        pal: { primary: '#ffe08a', secondary: '#b8860b', particle: '#fff4c2' } }, // Inkvizicija – auksinė šviesa
  { match: /[šs]vies|pulk/i,        pal: { primary: '#7cc4ff', secondary: '#1e5fa5', particle: '#cfe6ff' } }, // Šviesos pulkas – mithrilo mėlyna
  { match: /demon|orda/i,           pal: { primary: '#ff5a4a', secondary: '#7a1010', particle: '#ff9a3a' } }, // Demonų orda – raudona/juoda korupcija
  { match: /goblin|gauj/i,          pal: { primary: '#ffd24a', secondary: '#7a5a10', particle: '#ffe89a' } }, // Goblinai – kibirkštys/skardis
  { match: /pl[ėe][šs]ik|nakt/i,    pal: { primary: '#d4af37', secondary: '#2a2a35', particle: '#ffe89a' } }, // Plėšikai – auksas/šešėliai
  { match: /ryt|v[ėe]j/i,           pal: { primary: '#9fe8d0', secondary: '#2a4a44', particle: '#d8f5ec' } }, // Rytų vėjas – vėjo/smėlio
]

export function factionPalette(name?: string | null, fallback = '#d4af37'): FactionPalette {
  if (name) for (const f of FACTION_FX) if (f.match.test(name)) return f.pal
  return { primary: fallback, secondary: '#2a2a35', particle: fallback }
}

// Projektilo tipo spalva (perrašo frakciją, kai aiškus elementas)
export const PROJECTILE_COLOR: Record<string, string> = {
  fireball: '#ff7a1a', darkCurse: '#a855f7', healingGlow: '#5ef0c0', freezeBurst: '#7cc4ff',
  stunBurst: '#ffd24a', destroyStrike: '#ff4a4a', arrow: '#e8e0c8', lightning: '#9fc4ff', poisonGlob: '#84cc16',
}

// Frakcijos „parašas" – kokia kryptinė animacija labiausiai tinka jos žalai
export function factionDirectionalKind(name?: string | null): 'projectile' | 'slash' | 'beam' {
  if (!name) return 'projectile'
  if (/[šs]vies|pulk|pl[ėe][šs]ik|nakt|ryt|v[ėe]j/i.test(name)) return 'slash'   // riteriai / vagys / vėjas – kirtis
  if (/inkviz|legion/i.test(name)) return 'beam'                                   // šventas spindulys
  return 'projectile'                                                              // magai / demonai / nekro / goblinai
}
