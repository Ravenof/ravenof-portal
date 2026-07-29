// ── Kainos normalizacija: DB šimtais → UI skalė (audit #3) ──────────────────
import { describe, expect, it } from 'vitest'
import { costCurve, costCurveIndex, displayCost, displayAvgCost, COST_CURVE_LABELS } from '@/lib/cards/cost'

describe('displayCost', () => {
  it('200 → 2, 300 → 3, 700 → 7', () => {
    expect(displayCost(200)).toBe(2)
    expect(displayCost(300)).toBe(3)
    expect(displayCost(700)).toBe(7)
  })
  it('100 → 1, 900 → 9, 0/null → 0', () => {
    expect(displayCost(100)).toBe(1)
    expect(displayCost(900)).toBe(9)
    expect(displayCost(0)).toBe(0)
    expect(displayCost(null)).toBe(0)
  })
})

describe('costCurveIndex — stulpeliai 1..8+', () => {
  it('200 patenka į „2" stulpelį', () => {
    expect(COST_CURVE_LABELS[costCurveIndex(200)]).toBe('2')
  })
  it('300 patenka į „3" stulpelį', () => {
    expect(COST_CURVE_LABELS[costCurveIndex(300)]).toBe('3')
  })
  it('700 patenka į „7" stulpelį (NE į 8+)', () => {
    expect(COST_CURVE_LABELS[costCurveIndex(700)]).toBe('7')
  })
  it('tik virš ribos (800, 900) patenka į „8+"', () => {
    expect(COST_CURVE_LABELS[costCurveIndex(800)]).toBe('8+')
    expect(COST_CURVE_LABELS[costCurveIndex(900)]).toBe('8+')
  })
  it('100 ir 0 — pirmame stulpelyje', () => {
    expect(costCurveIndex(100)).toBe(0)
    expect(costCurveIndex(0)).toBe(0)
  })
})

describe('costCurve — 39 kortų kaladė nesukrenta į paskutinį stulpelį', () => {
  it('skirsto pagal realią kainą', () => {
    // 13 kortų po 200, 13 po 300, 13 po 700 = 39
    const entries = [
      { gold: 200, qty: 13 },
      { gold: 300, qty: 13 },
      { gold: 700, qty: 13 },
    ]
    const curve = costCurve(entries)
    expect(curve.reduce((a, b) => a + b, 0)).toBe(39)
    expect(curve[costCurveIndex(200)]).toBe(13)
    expect(curve[costCurveIndex(300)]).toBe(13)
    expect(curve[costCurveIndex(700)]).toBe(13)
    expect(curve[COST_CURVE_LABELS.indexOf('8+')]).toBe(0) // NIEKO 8+ stulpelyje
  })
})

describe('displayAvgCost', () => {
  it('350 (šimtais) → 3.5', () => {
    expect(displayAvgCost(350)).toBe(3.5)
  })
  it('0/null → 0', () => {
    expect(displayAvgCost(0)).toBe(0)
    expect(displayAvgCost(null)).toBe(0)
  })
})
