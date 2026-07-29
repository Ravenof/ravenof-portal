// ══════════════════════════════════════════════════════════════════════════════
// KANONINĖ KORTŲ KAINOS NORMALIZACIJA — vienintelis šaltinis visam UI.
// DB `gold_cost` saugomas ŠIMTAIS (100–900), o UI rodo 1–9 skalę
// (žr. supabase/migrations/20260714_campaign_card_rescale.sql).
// NIEKADA nekartokite šios konversijos komponentuose — importuokite iš čia.
// ══════════════════════════════════════════════════════════════════════════════

/** DB reikšmė → rodoma kaina: 200 → 2, 300 → 3, 700 → 7. */
export const COST_SCALE = 100

/** Kainos kreivės stulpelių etiketės (bendros deck list / drawer / builder / admin). */
export const COST_CURVE_LABELS = ['1', '2', '3', '4', '5', '6', '7', '8+'] as const
export const COST_CURVE_BUCKETS = COST_CURVE_LABELS.length

/** DB gold_cost (šimtais) → rodoma kaina (2–7 skalė). 200→2, 350→4 (apvalinama aukštyn iki pilno taško virš sveiko). */
export function displayCost(goldCost: number | null | undefined): number {
  const g = Math.max(0, goldCost ?? 0)
  return Math.ceil(g / COST_SCALE)
}

/** Vidutinė kaina rodymui: DB avg (šimtais) → 1 skaičius po kablelio (3.5, ne 350.0). */
export function displayAvgCost(avgGoldCost: number | null | undefined): number {
  return Math.round(((avgGoldCost ?? 0) / COST_SCALE) * 10) / 10
}

/** Kreivės stulpelio indeksas (0..7): kaina 1 → 0, … kaina 7 → 6, kaina 8+ → 7. 0 kainos kortos patenka į „1" stulpelį. */
export function costCurveIndex(goldCost: number | null | undefined): number {
  const c = displayCost(goldCost)
  return Math.max(0, Math.min(COST_CURVE_BUCKETS - 1, c - 1))
}

/** Suskaičiuoja kainos kreivę: 8 stulpeliai pagal COST_CURVE_LABELS. */
export function costCurve(entries: Array<{ gold: number | null | undefined; qty: number }>): number[] {
  const buckets = Array<number>(COST_CURVE_BUCKETS).fill(0)
  for (const e of entries) buckets[costCurveIndex(e.gold)] += Math.max(0, e.qty)
  return buckets
}
