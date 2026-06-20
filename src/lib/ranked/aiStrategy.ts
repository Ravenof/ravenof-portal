// ── Reitingo botų strategijos modifikatoriai → AI svorių delta ───────────────
// Kiekvienas botas turi strategyType + intensyvumus (aggression/control/trade/risk).
// Juos verčiame ADITYVIAIS pokyčiais ant difficulty bazės (žr. aiTypes.AiWeights):
//   faceBias        ↑ = agresyvesnis į veidą
//   tradeThreshold  ↑ = trade'ina tik kai aiškiai pelninga (vengia trade'ų)
//   spellWasteGuard ↑ = griežčiau vengia bevertių burtų (taupo burtus)
//   removalMinValue ↑ = saugo removal vertingiems taikiniams
//   jitter          ↑ = daugiau rizikos / mažiau optimalūs ėjimai

import type { AiWeightDelta } from '@/lib/tutorial/ai'
import type { StrategyType, Intensity, RankedBot } from './bots'

const LV: Record<Intensity, number> = { very_low: -2, low: -1, medium: 0, high: 1, very_high: 2 }

/** Bazinė delta pagal archetipą. */
const BASE: Record<StrategyType, AiWeightDelta> = {
  aggro:     { faceBias: 4,  tradeThreshold: 2,    spellWasteGuard: -0.2, removalMinValue: -2, jitter: 0.4 },
  control:   { faceBias: -3, tradeThreshold: -0.4, spellWasteGuard: 0.6,  removalMinValue: 4,  lookahead: true },
  tempo:     { faceBias: 1,  tradeThreshold: 0.4,  spellWasteGuard: 0.2,  removalMinValue: 0 },
  curse:     { faceBias: -1, tradeThreshold: -0.2, spellWasteGuard: 0.5,  removalMinValue: 3,  lookahead: true },
  stealth:   { faceBias: 2,  tradeThreshold: 2.5,  spellWasteGuard: 0.3,  removalMinValue: 1 },
  defensive: { faceBias: -4, tradeThreshold: -1,   spellWasteGuard: 0.3,  removalMinValue: 2,  lookahead: true },
  midrange:  { faceBias: 0,  tradeThreshold: 0.3,  spellWasteGuard: 0.1,  removalMinValue: 1 },
}

/** Galutinė strategijos delta konkrečiam botui (archetipas + intensyvumai). */
export function strategyWeights(bot: Pick<RankedBot, 'strategyType' | 'aggression' | 'controlPreference' | 'tradePreference' | 'riskTolerance'>): AiWeightDelta {
  const base = BASE[bot.strategyType] ?? BASE.midrange
  const aggr = LV[bot.aggression]
  const ctrl = LV[bot.controlPreference]
  const trade = LV[bot.tradePreference]
  const risk = LV[bot.riskTolerance]
  return {
    // agresyvumas stumia į veidą; rizika prideda truputį „face overcommit"
    faceBias: (base.faceBias ?? 0) + aggr * 1.5 + risk * 0.5,
    // didesnis trade preference = NORIAU trade'ina (žemesnis slenkstis); mažesnis = vengia
    tradeThreshold: (base.tradeThreshold ?? 0) - trade * 0.8,
    // kontrolė = griežčiau saugo burtus ir removal
    spellWasteGuard: (base.spellWasteGuard ?? 0) + ctrl * 0.25,
    removalMinValue: (base.removalMinValue ?? 0) + ctrl * 1.5,
    // rizika = daugiau jitter (mažiau nuspėjamas, kartais ne pats optimaliausias ėjimas)
    jitter: (base.jitter ?? 0) + Math.max(0, risk) * 0.5,
    lookahead: base.lookahead,
  }
}
