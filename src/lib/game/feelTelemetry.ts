// ── Game-feel telemetrija ────────────────────────────────────────────────────
// Matuoja, kiek laiko žaidėjas per kovą laukia animacijų ir kaip greitai gauna
// pirmą vizualinį atsaką į savo įvestį. Be šių skaičių bet kokia diskusija
// „ar 3.9 s per ilga" yra spėlionė.
//
// Būsena laikoma MODULYJE (kaip reactionSnapshots), NE GameState — kad PvP
// broadcast payload'as nedidėtų ir kad svečio klientas matuotų savo patirtį.
// Visos reikšmės — vieno kliento, vienos kovos.

export type FeelTelemetry = {
  /** Kiek ms per kovą įvestis buvo užrakinta animacijų (tik savo ėjimo metu). */
  animationLockMsTotal: number
  /** Vidurkis vienam ėjimui (apvalintas). */
  animationLockMsPerTurn: number
  /** Mediana nuo pointer-down ant kortos iki pirmo vizualinio atsako. */
  inputToFirstFeedbackMs: number
  /** Kiek matavimų sudarė medianą (0 = nepatikima). */
  inputFeedbackSamples: number
  /** Kiek kartų kinas buvo praleistas (skip) šioje kovoje. */
  cinematicsSkipped: number
  /** Kinų nustatymai kovos pradžioje: 1 = summon, 2 = champion skill (bitmask). */
  cinematicsEnabledAtStart: number
}

const EMPTY: FeelTelemetry = {
  animationLockMsTotal: 0,
  animationLockMsPerTurn: 0,
  inputToFirstFeedbackMs: 0,
  inputFeedbackSamples: 0,
  cinematicsSkipped: 0,
  cinematicsEnabledAtStart: 0,
}

const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now())

let lockTotalMs = 0
let lockedSince: number | null = null
let feedbackSamples: number[] = []
let inputStartedAt: number | null = null
let cinematicsSkipped = 0
let cinematicsEnabledAtStart = 0

/** Kovos pradžia: viską nunulinam ir įsimenam kinų nustatymus. */
export function resetFeelTelemetry(opts?: { summonCinematics?: boolean; skillCinematics?: boolean }): void {
  lockTotalMs = 0
  lockedSince = null
  feedbackSamples = []
  inputStartedAt = null
  cinematicsSkipped = 0
  cinematicsEnabledAtStart = (opts?.summonCinematics ? 1 : 0) | (opts?.skillCinematics ? 2 : 0)
}

/**
 * Įvesties užrakto būsenos pokytis. Kviečiama iš `actionsLocked` useEffect'o.
 * Skaičiuojamas TIK savo ėjimo laikas — priešo ėjimo animacijos nėra „laukimas
 * su rankomis ant klaviatūros".
 */
export function noteLockState(locked: boolean, myTurn: boolean): void {
  const active = locked && myTurn
  if (active && lockedSince === null) lockedSince = now()
  else if (!active && lockedSince !== null) {
    lockTotalMs += now() - lockedSince
    lockedSince = null
  }
}

/** Pointer-down ant rankos kortos (arba kitas žaidėjo veiksmo pradžios taškas). */
export function noteInputStart(): void {
  inputStartedAt = now()
}

/**
 * Pirmas vizualinis atsakas į tą įvestį (kortos pakilimas, showcase, FX).
 * Idempotentinis: skaičiuojamas tik PIRMAS atsakas po `noteInputStart`.
 */
export function noteFirstFeedback(): void {
  if (inputStartedAt === null) return
  const dt = now() - inputStartedAt
  inputStartedAt = null
  // Apsauga nuo šiukšlių: > 5 s beveik tikrai reiškia, kad žaidėjas laikė kortą.
  if (dt >= 0 && dt < 5000) feedbackSamples.push(dt)
}

/** Įvestis nutrūko be jokio atsako (pvz. drag atšauktas) — matavimą metam. */
export function cancelInputMeasure(): void {
  inputStartedAt = null
}

/** Žaidėjas praleido kiną / showcase. */
export function noteCinematicSkipped(): void {
  cinematicsSkipped += 1
}

function median(xs: number[]): number {
  if (xs.length === 0) return 0
  const a = [...xs].sort((x, y) => x - y)
  const mid = Math.floor(a.length / 2)
  return a.length % 2 ? a[mid] : Math.round((a[mid - 1] + a[mid]) / 2)
}

/** Galutinės reikšmės kovai pasibaigus. `turns` = g.globalTurn. */
export function collectFeelTelemetry(turns: number): FeelTelemetry {
  // Jei kova baigėsi užrakto metu — uždarom atvirą intervalą.
  const openMs = lockedSince !== null ? now() - lockedSince : 0
  const total = Math.round(lockTotalMs + openMs)
  return {
    animationLockMsTotal: total,
    animationLockMsPerTurn: turns > 0 ? Math.round(total / turns) : 0,
    inputToFirstFeedbackMs: Math.round(median(feedbackSamples)),
    inputFeedbackSamples: feedbackSamples.length,
    cinematicsSkipped,
    cinematicsEnabledAtStart,
  }
}

/**
 * DEV pagalba: atspausdina game-feel skaičius į naršyklės konsolę kovos gale.
 * Kad nereikėtų naršyti Network tab'e ieškant `rvn_report_match_stats` payload'o —
 * tiesiog atsidarai konsolę (F12) ir matai tris skaičius, kurie rūpi.
 * Produkcijoje tyli.
 */
export function debugLogFeelTelemetry(stats: Partial<FeelTelemetry> & { turns?: number }): void {
  if (typeof console === 'undefined') return
  if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'production') return
  const lock = stats.animationLockMsTotal ?? 0
  const perTurn = stats.animationLockMsPerTurn ?? 0
  const fb = stats.inputToFirstFeedbackMs ?? 0
  const n = stats.inputFeedbackSamples ?? 0
  /* eslint-disable no-console */
  console.groupCollapsed(
    `%c[GAME-FEEL] laukimas ${(lock / 1000).toFixed(1)} s · atsakas ${fb} ms`,
    'color:#f0b429;font-weight:bold',
  )
  console.log(`Ėjimų kovoje ................. ${stats.turns ?? '?'}`)
  console.log(`Laukta animacijų (viso) ...... ${lock} ms  (${(lock / 1000).toFixed(1)} s)`)
  console.log(`  → vidutiniškai per ėjimą ... ${perTurn} ms`)
  console.log(`Įvestis → pirmas atsakas ..... ${fb} ms  (mediana iš ${n} matavimų)`)
  console.log(`Kinas praleistas ............. ${stats.cinematicsSkipped ?? 0}×`)
  console.log('%cGERAI, jei: atsakas < 100 ms, laukimas per ėjimą < ~2000 ms', 'color:#5ef0c0')
  console.groupEnd()
  /* eslint-enable no-console */
}

/** Testams / debug'ui. */
export function __feelTelemetrySnapshot(): FeelTelemetry & { lockOpen: boolean } {
  return { ...collectFeelTelemetry(0), lockOpen: lockedSince !== null }
}

export const EMPTY_FEEL_TELEMETRY: FeelTelemetry = EMPTY
