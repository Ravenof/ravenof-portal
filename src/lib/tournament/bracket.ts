// ── Turnyrų double elimination tinklelis (4 / 8 / 16) ─────────────────────────
// Gryna logika be DB: generuoja kovų šabloną, kurį `rvn_tourney_start` įrašo į
// `tournament_matches`. Tas pats šablonas naudojamas UI (tinklelio piešimui) ir testams.
//
// Struktūra (N = 2^k):
//   W1..Wk      – viršutinis tinklelis (W1: N/2 kovų, ... Wk: finalas)
//   L1..L(2k-2) – apatinis: nelyginiai raundai = apatinio laimėtojai tarpusavyje,
//                 lyginiai = apatinio laimėtojai prieš naujai nukritusius iš W
//   GF1         – viršutinio laimėtojas (A) prieš apatinio laimėtoją (B)
//   GF2         – bracket reset: žaidžiama TIK jei GF1 laimėjo B (apatinio žaidėjas)
// Vietos: pralaimėjęs L raunde r užima vietą N − (iškritusių iki r imtinai) + 1.

export type TourneySize = 4 | 8 | 16
export type BracketSide = 'W' | 'L' | 'GF'
/** Kur keliauja žaidėjas: į kitą kovą (key) ir jos slotą (a/b). */
export type Dest = { key: string; slot: 'a' | 'b' }

export type MatchSpec = {
  key: string                 // 'W1-0', 'L3-1', 'GF1', 'GF2'
  bracket: BracketSide
  round: number               // W: 1..k, L: 1..2k-2, GF: 1..2
  idx: number                 // eilė raunde (0..)
  /** Tik W1: pradinės vietos (seed indeksai 0..N-1). */
  seedA?: number
  seedB?: number
  winTo: Dest | null          // null = finalas (GF)
  loseTo: Dest | null         // null = iškrenta
  /** Vieta pralaimėjusiam, kai jis iškrenta (L raundai; GF – žr. žemiau). */
  loserPlace: number | null
}

export function log2(n: number): number { return Math.round(Math.log2(n)) }

/**
 * Standartinis seeding'o išdėstymas (1v16, 8v9, ...): stipriausi susitinka vėliausiai.
 * Seeding'as turnyre atsitiktinis, bet išdėstymas vis tiek standartinis.
 */
export function seedOrder(n: number): number[] {
  let order = [0, 1]
  while (order.length < n) {
    const m = order.length * 2
    order = order.flatMap((s) => [s, m - 1 - s])
  }
  return order
}

export function buildBracket(size: TourneySize): MatchSpec[] {
  const k = log2(size)
  const specs: MatchSpec[] = []
  const wKey = (r: number, i: number) => `W${r}-${i}`
  const lKey = (r: number, i: number) => `L${r}-${i}`
  const wCount = (r: number) => size >> r                   // W1: N/2 ...
  const lRounds = 2 * (k - 1)
  // L raundo kovų skaičius: L1,L2 = N/4; L3,L4 = N/8; ...
  const lCount = (r: number) => size >> (Math.ceil(r / 2) + 1)

  // Kiek žaidėjų iškrenta iki L raundo r imtinai (vietos skaičiavimui)
  const elimThrough = (r: number) => { let s = 0; for (let j = 1; j <= r; j++) s += lCount(j); return s }

  // ── Viršutinis tinklelis ──
  const so = seedOrder(size)
  for (let r = 1; r <= k; r++) {
    for (let i = 0; i < wCount(r); i++) {
      const spec: MatchSpec = {
        key: wKey(r, i), bracket: 'W', round: r, idx: i,
        winTo: r < k ? { key: wKey(r + 1, i >> 1), slot: i % 2 === 0 ? 'a' : 'b' } : { key: 'GF1', slot: 'a' },
        loseTo: null, loserPlace: null,
      }
      if (r === 1) { spec.seedA = so[2 * i]; spec.seedB = so[2 * i + 1] }
      // Pralaimėjusieji → apatinis tinklelis
      if (r === 1) {
        // W1 pralaimėtojai poromis į L1 (k=2 atveju L1 turi 1 kovą)
        spec.loseTo = { key: lKey(1, i >> 1), slot: i % 2 === 0 ? 'a' : 'b' }
      } else {
        // Wr pralaimėtojai krenta į L(2r-2) „b" slotą; tvarka apversta (mažiau pakartotinių susitikimų)
        const lr = 2 * r - 2
        const n = lCount(lr)
        const target = r % 2 === 0 ? n - 1 - i : i
        spec.loseTo = { key: lKey(lr, target), slot: 'b' }
      }
      specs.push(spec)
    }
  }

  // ── Apatinis tinklelis ──
  for (let r = 1; r <= lRounds; r++) {
    const n = lCount(r)
    for (let i = 0; i < n; i++) {
      let winTo: Dest
      if (r === lRounds) winTo = { key: 'GF1', slot: 'b' }
      else if (r % 2 === 1) winTo = { key: lKey(r + 1, i), slot: 'a' }               // → lyginis raundas, prieš nukritusį iš W
      else winTo = { key: lKey(r + 1, i >> 1), slot: i % 2 === 0 ? 'a' : 'b' }       // → nelyginis: poros
      specs.push({
        key: lKey(r, i), bracket: 'L', round: r, idx: i, winTo, loseTo: null,
        loserPlace: size - elimThrough(r) + 1,
      })
    }
  }

  // ── Grand final (+ reset) ──
  specs.push({ key: 'GF1', bracket: 'GF', round: 1, idx: 0, winTo: null, loseTo: null, loserPlace: 2 })
  specs.push({ key: 'GF2', bracket: 'GF', round: 2, idx: 0, winTo: null, loseTo: null, loserPlace: 2 })
  return specs
}

/** Vietų grupės atlygiui: 1, 2, 3, 4, 5–6, 7–8, 9–12, 13–16. */
export function placeBucket(place: number): string {
  if (place <= 4) return String(place)
  if (place <= 6) return '5-6'
  if (place <= 8) return '7-8'
  if (place <= 12) return '9-12'
  return '13-16'
}

/** Kovų skaičius (be GF2): 2N − 2; su reset – 2N − 1. */
export function matchCount(size: TourneySize): { min: number; max: number } {
  return { min: 2 * size - 2, max: 2 * size - 1 }
}
