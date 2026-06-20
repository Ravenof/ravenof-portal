// ── AI viešasis įėjimas ───────────────────────────────────────────────────────
// Tikroji logika padalinta į ./ai/* modulius (scoring engine). Šis failas išlaiko
// stabilų importo kelią ('@/lib/tutorial/ai') ir re-eksportuoja viešąjį API.

export { aiNextAction, decideAiTurn, findLethalSequence, other } from './ai/aiEngine'
export type { AiAction, AiDifficulty, AiWeightDelta } from './ai/aiTypes'
