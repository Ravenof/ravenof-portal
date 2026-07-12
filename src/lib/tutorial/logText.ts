// ── Kovos log'o teksto generavimas iš struktūrinių įvykių ────────────────────
// Engine į log'ą deda { key, params } (jokio gatavo teksto). Tekstas gimsta TIK
// render'e — todėl pakeitus kalbą persirenderuoja ir istoriniai įrašai.
//
// Params reikšmė su `$t:` prefiksu = įdėtas vertimo raktas (pvz. statuso vardas).
import { t as tGlobal, type TParams } from '@/lib/i18n/core'
import type { GameEvent } from './engine'

type TFn = (key: string, params?: TParams) => string

/** Bendras rezolveris: raktas + params (su `$t:` nuorodomis) → tekstas. */
export function ltext(key: string | undefined, rawParams?: Record<string, string | number>, t: TFn = tGlobal): string {
  if (!key) return ''
  if (!rawParams) return t(key)
  const params: TParams = {}
  for (const [k, v] of Object.entries(rawParams)) {
    params[k] = typeof v === 'string' && v.startsWith('$t:') ? t(v.slice(3)) : v
  }
  return t(key, params)
}

/** Įvykio tekstas dabartine (arba paduota t) kalba. */
export function eventText(e: GameEvent, t: TFn = tGlobal): string {
  if (!e.key) return e.msg ?? ''
  return ltext(e.key, e.params, t)
}

/** Veiksmo klaidos tekstas (PlayResult.reason = i18n raktas). */
export function resultText(r: { ok: false; reason: string; reasonParams?: Record<string, string | number> }, t: TFn = tGlobal): string {
  return ltext(r.reason, r.reasonParams, t)
}
