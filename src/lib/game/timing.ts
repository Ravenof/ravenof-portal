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

// ── Kortų tactile sluoksnis (game-feel fazė 2) ───────────────────────────────
// Tier 0 pojūtis: hover / paspaudimas / tempimas / snap / grąžinimas.
// Šiuos veiksmus žaidėjas mato šimtus kartų per sesiją, todėl jie turi būti
// GREITI (visos trukmės < 260 ms) ir vienodi visuose ranka piešiamuose keliuose.
export const CARD_TACTILE = {
  /** Kortos pakilimas rankoje hover metu (px). */
  hoverLiftPx: 12,
  /** Maksimalus 3D pakreipimas pagal žymeklį (laipsniais). */
  hoverTiltDeg: 10,
  /** Hover perėjimo trukmė. */
  hoverMs: 140,
  /** Paspaudimo kompresija (scale) ir jos trukmė. */
  pressScale: 0.97,
  pressMs: 70,
  /** Tempimo inercija: kiek ghost'as vejasi žymeklį per kadrą (0..1). */
  dragLerp: 0.3,
  /** Maks. leistinas atsilikimas nuo žymeklio (px) – kad nenuslystų per toli. */
  dragMaxLagPx: 22,
  /** Magnetinės snap zonos spindulys aplink slotą (px). */
  snapRadiusPx: 52,
  /** Kortos „atsisėdimo" į slotą trukmė. */
  snapMs: 130,
  /** Raudonas pulsas ant negalimo taikinio / sloto. */
  invalidPulseMs: 90,
  /** Grįžimas į ranką po negalimo drop'o. */
  returnMs: 220,
} as const

// ── Reakcijų grandinės kompresija (game-feel fazė 3) ─────────────────────────
// Pirma reakcija kovoje rodoma pilnai (3900 ms) — tai „momentas". Vėlesnės tos
// pačios kovos reakcijos sutrumpinamos: kanoninis fazių EILIŠKUMAS nekinta,
// keičiasi tik TRUKMĖS. Spectacle budget: tas pats spektaklis, rodomas penktą
// kartą, nustoja būti spektakliu ir tampa laukimu.
export const REACTION_CHAIN_PHASES_COMPACT = {
  detect: 250,
  chain: 550,
  wrap: 400,
  showcase: 700,
  effect: 500,
} as const

export const REACTION_CHAIN_GATE_COMPACT_MS =
  REACTION_CHAIN_PHASES_COMPACT.detect + REACTION_CHAIN_PHASES_COMPACT.chain +
  REACTION_CHAIN_PHASES_COMPACT.wrap + REACTION_CHAIN_PHASES_COMPACT.showcase

export const REACTION_CHAIN_TOTAL_COMPACT_MS =
  REACTION_CHAIN_GATE_COMPACT_MS + REACTION_CHAIN_PHASES_COMPACT.effect

/** Muzikos „duck" prieš stiprų smūgį (fazės 3–5 dalinasi tuo pačiu helper'iu). */
export const AUDIO_DUCK = {
  /** Kiek dB nutildoma muzika (neigiamas skaičius). */
  defaultDb: -3,
  /** Kiek laiko muzika lieka nutildyta. */
  holdMs: 80,
  /** Nutildymo / atstatymo perėjimo trukmė. */
  rampMs: 60,
} as const

// ── Hit-stop (game-feel fazė 5) ──────────────────────────────────────────────
// Konkrečios trukmės gyvena `impactProfiles.ts` (kiekvienam severity), čia —
// bendri apribojimai, galiojantys visiems profiliams.
export const HIT_STOP = {
  /** `rvn-vfx-quality = low`: hit-stop ribojamas iki šio dydžio. */
  lowQualityMaxMs: 40,
  /** Taikinio „punch" (scale 1 → 0.94 → 1.03 → 1) trukmė po hold'o. */
  punchMs: 220,
  /** Blyksnio ant taikinio trukmė. */
  flashMs: 120,
} as const

// ── HP „ghost" juosta (game-feel fazė 6) ─────────────────────────────────────
// HP nukrenta iškart (po hit-stop hold'o), bet prarasta dalis dar akimirką lieka
// matoma raudonai — žaidėjas pamato, KIEK prarado, o ne tik kad kažkas pasikeitė.
export const HP_GHOST = {
  /** Kiek laiko prarasta dalis lieka stovėti. */
  holdMs: 300,
  /** Susitraukimo trukmė po hold'o. */
  collapseMs: 200,
  /** Gydymo „delayed fill" trukmė. */
  healFillMs: 260,
  /** HEAVY+ smūgio HP konteinerio purtymas. */
  shakeMs: 150,
  shakePx: 2,
} as const

// ── ŽMK prezentacija (game-feel fazė 7) ──────────────────────────────────────
// ŽMK traukimas yra Ravenof kovos parašas — kiekviena žala eina per jį. Bet
// 6 iš 20 kortų yra „+0", tad ROUTINE traukimas privalo likti greitas; papildomą
// laiką gauna TIK ×2 / ×0 / pranašumo atvejai (spectacle budget).
export const ZMK_PRESENT = {
  /** „+0" ir kiti kasdieniai — tik greitas flip. */
  routineMs: 250,
  /** ×2 „Kritinis smūgis": tyla prieš smūgį. */
  critAnticipationMs: 150,
  /** ×2: kortos „slam" į centrą + bass. */
  critSlamMs: 420,
  /** ×2: glifo laikymas ekrane. */
  critHoldMs: 520,
  /** ×2 anticipacijos duck (gilesnis nei įprastas). */
  critDuckDb: -12,
  /** ×0 „Visiška nesėkmė": projektilis užgęsta, skaičius subyra. */
  fizzleMs: 620,
  /** Specialaus permaišymo (po ×2/×0) švysnis prie ŽMK zonos. */
  reshuffleMs: 700,
} as const
