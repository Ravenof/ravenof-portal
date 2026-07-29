// ── Kanoninis rangų modelis: 150 žingsnių, 50 rangų × 3 medaliai (audit #6) ──
import { beforeAll, describe, expect, it } from 'vitest'
import { setLocale } from '@/lib/i18n/core'

// Testai tikrina LT (numatytąją produkto kalbą) — Node aplinkoje navigator
// grąžintų en, todėl kalbą nustatome aiškiai.
beforeAll(() => setLocale('lt', { explicit: true, syncProfile: false }))
import {
  rankNumberFromStep, medalTierFromStep, stepFromRank, formatRank, rankDisplay,
  toRoman, applyWin, applyLoss, MAX_RANK_STEP, MIN_RANK_STEP,
} from '@/lib/ranked/rank'

describe('rankNumberFromStep / medalTierFromStep', () => {
  it('step 0 = 50 Bronza (įėjimas)', () => {
    expect(rankNumberFromStep(0)).toBe(50)
    expect(medalTierFromStep(0)).toBe('bronze')
  })
  it('step 1/2 = 50 Sidabras / 50 Auksas', () => {
    expect(rankNumberFromStep(1)).toBe(50)
    expect(medalTierFromStep(1)).toBe('silver')
    expect(rankNumberFromStep(2)).toBe(50)
    expect(medalTierFromStep(2)).toBe('gold')
  })
  it('step 3 = 49 Bronza (rangų riba)', () => {
    expect(rankNumberFromStep(3)).toBe(49)
    expect(medalTierFromStep(3)).toBe('bronze')
  })
  it('step 149 = 1 Auksas (viršūnė)', () => {
    expect(rankNumberFromStep(149)).toBe(1)
    expect(medalTierFromStep(149)).toBe('gold')
  })
  it('stepFromRank apverčia atgal', () => {
    for (const s of [0, 1, 2, 3, 74, 148, 149]) {
      expect(stepFromRank(rankNumberFromStep(s), medalTierFromStep(s))).toBe(s)
    }
  })
})

describe('toRoman', () => {
  it('50 → L, 49 → XLIX, 1 → I, 4 → IV', () => {
    expect(toRoman(50)).toBe('L')
    expect(toRoman(49)).toBe('XLIX')
    expect(toRoman(1)).toBe('I')
    expect(toRoman(4)).toBe('IV')
  })
})

describe('formatRank — kanoninis formatas visiems ekranams', () => {
  it('step 0 → „Bronza L"', () => {
    expect(formatRank(0)).toBe('Bronza L')
  })
  it('step 1 → „Sidabras L"', () => {
    expect(formatRank(1)).toBe('Sidabras L')
  })
  it('step 3 → „Bronza XLIX"', () => {
    expect(formatRank(3)).toBe('Bronza XLIX')
  })
})

describe('rankDisplay — perėjimai ir progresas', () => {
  it('step 1 (50 Sidabras): kitas žingsnis 50 Auksas, iki 49 rango liko 2 pergalės', () => {
    const d = rankDisplay(1)
    expect(d.rankNumber).toBe(50)
    expect(d.medalTier).toBe('silver')
    expect(d.stepsToNextNumber).toBe(2)
    expect(d.nextLabel).toBe('Auksas L')
  })
  it('step 2 (50 Auksas): kitas žingsnis — 49 Bronza (todėl „Bronza" gali būti aukščiau už „Auksą")', () => {
    const d = rankDisplay(2)
    expect(d.nextLabel).toBe('Bronza XLIX')
    expect(d.stepsToNextNumber).toBe(1)
  })
  it('max range nėra kito', () => {
    const d = rankDisplay(MAX_RANK_STEP)
    expect(d.isMax).toBe(true)
    expect(d.nextLabel).toBeNull()
    expect(d.stepsToNextNumber).toBe(0)
  })
  it('turi lokalizuotą rango vardą ir ženklelį', () => {
    const d = rankDisplay(0)
    expect(d.name).toBe('Atvykėlis')
    expect(d.badgeSrc).toContain('rank-50')
  })
})

describe('applyWin / applyLoss — ribos', () => {
  it('pergalė +1 žingsnis; lubose lieka', () => {
    expect(applyWin(5, 1).stepAfter).toBe(6)
    expect(applyWin(MAX_RANK_STEP, 0).stepAfter).toBe(MAX_RANK_STEP)
    expect(applyWin(MAX_RANK_STEP, 0).hitCeiling).toBe(true)
  })
  it('2-as pralaimėjimas nuleidžia; dugne lieka 50 Bronza', () => {
    expect(applyLoss(5, 0).stepAfter).toBe(5)   // 1-as — tik skaitiklis
    expect(applyLoss(5, 1).stepAfter).toBe(4)   // 2-as — krenta
    expect(applyLoss(MIN_RANK_STEP, 1).stepAfter).toBe(MIN_RANK_STEP)
    expect(applyLoss(MIN_RANK_STEP, 1).hitFloor).toBe(true)
  })
})
