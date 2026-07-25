// ════════════════════════════════════════════════════════════════════════════
//  PROGRESSION v2 — atsakymo formos apsauga
//  ─────────────────────────────────────────────────────────────────────────
//  Kodėl to reikia (reali 2026-07-25 avarija):
//  jei duomenų bazėje to paties pavadinimo funkcija yra SENA (`returns setof`),
//  PostgREST grąžina MASYVĄ, o ne vieną `jsonb` objektą. Tada UI kode
//  `snapshot.quests.filter(...)` metė `TypeError: Cannot read properties of
//  undefined` — React error boundary parodė „Application error: a client-side
//  exception has occurred" ir visa programa liko baltame ekrane.
//
//  Todėl netinkamos formos atsakymas VISADA paverčiamas įprasta klaida —
//  ekranas parodo klaidos būseną su „Bandyti dar kartą", o ne nulūžta.
//  Gryna logika be React/Supabase → padengta `npm run progression:test:shape`.
// ════════════════════════════════════════════════════════════════════════════
import type { ProgressionResult } from './types'

export const SHAPE_ERROR = 'unexpected_response_shape'

/** Atsakymas turi būti vienas objektas (ne masyvas, ne primityvas). */
export function asObject<T>(fn: string, data: unknown): ProgressionResult<T> | null {
  if (data == null) return null
  if (typeof data !== 'object' || Array.isArray(data)) {
    console.warn(`[progression] ${fn}: netinkamas atsakymo formatas`, data)
    return { error: SHAPE_ERROR }
  }
  return data as ProgressionResult<T>
}

/** Būtinas laukas turi būti masyvas — kitaip UI lūžtų jį renderindamas. */
export function requireArray<T>(
  fn: string, r: ProgressionResult<T> | null, field: string,
): ProgressionResult<T> | null {
  if (!r || 'error' in (r as Record<string, unknown>)) return r
  if (!Array.isArray((r as Record<string, unknown>)[field])) {
    console.warn(`[progression] ${fn}: trūksta lauko "${field}"`, r)
    return { error: SHAPE_ERROR }
  }
  return r
}
