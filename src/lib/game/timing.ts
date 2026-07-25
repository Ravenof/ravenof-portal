// ── Centrinės kovos sekų trukmės (vienas šaltinis UI'ui IR varikliui) ────────
// Šios konstantos naudojamos ir gameplay eilėje (engine tick'ai), ir animacijose.
// NIEKADA nedubliuoti skaičių komponentuose — importuoti iš čia.

/** Pauzė tarp Kovos šūksnio (battlecry) iškviečiamų padarų. Kiekvienas padaras
 *  į mūšio būseną įrašomas atskirai, praėjus šiam laikui (ne vien vizualiai). */
export const BATTLECRY_SEQUENTIAL_SUMMON_DELAY_MS = 700

/** Reakcijos grandinės animacijos trukmė: nuo reakcijos kortos atskleidimo iki
 *  grandinės apsivijimo apie taikinį. Efekto rezultatas rodomas tik po jos. */
export const REACTION_CHAIN_ANIMATION_DURATION_MS = 2000

// ── Reakcijos grandinės (Reaction Chain VFX) fazės ───────────────────────────
// Aprobuota seka (etalonas: ravenof-fx-preview-reaction-chain.html, 2026-07-25).
// Gameplay būsena taikoma TIK pasibaigus `showcase` fazei (t. y. ties `effect`
// pradžia) — vartus valdo animacijos completion signalas, ne setTimeout.
export const REACTION_CHAIN_PHASES = {
  /** Reakcijos korta atsiverčia + rune flare; taikinys pradeda švytėti. */
  detect: 350,
  /** Strėlės antgalis priekyje, grandys velkasi Bezier trajektorija. */
  chain: 1000,
  /** Smūgis, grandinė įtraukiama, 2 kilpos apsivynioja + susiveržimas. */
  wrap: 650,
  /** Reakcijos kortos parodymas (showcase) centre. */
  showcase: 1200,
  /** Grandinė sudūžta; ČIA taikoma žaidimo būsena + efekto specifinis VFX. */
  effect: 700,
} as const

/** Kiek trunka animacija iki momento, kai galima taikyti gameplay būseną. */
export const REACTION_CHAIN_GATE_MS =
  REACTION_CHAIN_PHASES.detect + REACTION_CHAIN_PHASES.chain + REACTION_CHAIN_PHASES.wrap + REACTION_CHAIN_PHASES.showcase

/** Visa animacija su efekto faze. */
export const REACTION_CHAIN_TOTAL_MS = REACTION_CHAIN_GATE_MS + REACTION_CHAIN_PHASES.effect

/** `prefers-reduced-motion` / žemos kokybės režimas: be skrydžio. */
export const REACTION_CHAIN_REDUCED_GATE_MS = 900
