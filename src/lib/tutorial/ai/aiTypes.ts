// ── AI tipai + debug ─────────────────────────────────────────────────────────
// Bendri tipai AI scoring engine'ui. Atskira nuo logikos, kad nebūtų ciklų.

import type { TargetRef } from '../engine'

export type AiDifficulty = 'easy' | 'normal' | 'hard'

export type AiAction =
  | { kind: 'play'; cardName: string }
  | { kind: 'attack'; cardName: string }
  | { kind: 'ability' }
  | { kind: 'discardGold'; cardName: string }
  | null

/** Įvertintas taikinys (burtui ar atakai). */
export type ScoredTarget = { target?: TargetRef; score: number; reason: string }

/** Difficulty svoriai – moduliuoja AI elgesį. */
export type AiWeights = {
  faceBias: number          // kiek labiau linkęs eiti į veidą
  jitter: number            // atsitiktinė variacija (kad nebūtų nuspėjamas)
  tradeThreshold: number    // min trade score, kad atakuotų padarą (žemiau – geriau veidas/praleisti)
  spellWasteGuard: number   // kiek griežtai vengia bevertių burtų (didesnis = griežčiau)
  removalMinValue: number   // hard: min taikinio vertė, kad „eikvotų" hard removal
  lookahead: boolean        // ar vertina priešo kitą ėjimą
}

export const DIFFICULTY_WEIGHTS: Record<AiDifficulty, AiWeights> = {
  easy:   { faceBias: 6,  jitter: 4,   tradeThreshold: 3,  spellWasteGuard: 0.4, removalMinValue: 0,  lookahead: false },
  normal: { faceBias: 0,  jitter: 1.2, tradeThreshold: 0.5, spellWasteGuard: 1,   removalMinValue: 0,  lookahead: true  },
  hard:   { faceBias: -2, jitter: 0.4, tradeThreshold: 0,   spellWasteGuard: 1.4, removalMinValue: 5,  lookahead: true  },
}

/** Debug įjungiamas dev mode (NEXT_PUBLIC_AI_DEBUG=1 arba window.__AI_DEBUG__). */
export const AI_DEBUG: boolean = (() => {
  try {
    if (typeof process !== 'undefined' && process.env && process.env.NEXT_PUBLIC_AI_DEBUG === '1') return true
  } catch { /* ignore */ }
  try {
    if (typeof window !== 'undefined' && (window as unknown as { __AI_DEBUG__?: boolean }).__AI_DEBUG__) return true
  } catch { /* ignore */ }
  return false
})()

export function aiLog(payload: Record<string, unknown>): void {
  if (AI_DEBUG) {
    // eslint-disable-next-line no-console
    console.log('[AI]', payload)
  }
}
