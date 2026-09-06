// ── Įskiepijamas atsitiktinių skaičių šaltinis ──────────────────────────────
// Žaidimo variklis (engine.ts, effectEngine.ts, curseEngine.ts, aiEngine.ts)
// NIEKADA nekviečia Math.random tiesiogiai – tik rng(). Produkcijoje tai
// Math.random; fixture įrašymui / replay – seeded mulberry32, kad partija būtų
// deterministinė ir atkartojama C# variklyje (Ravenof.Rules.Rng – tas pats
// algoritmas bitas į bitą).

export type Rng = () => number

let current: Rng = Math.random

/** Grąžina [0, 1) – kaip Math.random. */
export function rng(): number { return current() }

/** Pakeičia šaltinį (null → atgal į Math.random). */
export function setRng(fn: Rng | null): void { current = fn ?? Math.random }

/**
 * mulberry32 – 32 bitų PRNG. Tas pats algoritmas įgyvendintas C# pusėje
 * (Ravenof.Rules/Rng.cs). Grąžina [0, 1) su 2^-32 žingsniu.
 */
export function mulberry32(seed: number): Rng {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Patogumas: setRng(mulberry32(seed)). */
export function seedRng(seed: number): void { setRng(mulberry32(seed)) }
