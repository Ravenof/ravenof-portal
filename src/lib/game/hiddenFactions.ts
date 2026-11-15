// ── Laikinai paslėptos frakcijos ─────────────────────────────────────────────
// Frakcija, kuri dar neišleista: jos nerodom frakcijų sąrašuose, o jos kaladės
// dingsta iš kaladžių pasirinkimų. Pačios KORTOS slepiamos duomenų bazėje
// (cards.status = 'hidden'), žr. supabase/migrations/20261115_hide_rytu_vejas.sql.
//
// IŠLEIDŽIANT frakciją: ištuštinti šiuos tris sąrašus ir paleisti
// supabase/migrations/_restore_rytu_vejas.sql.
export const HIDDEN_FACTION_IDS: number[] = [13]
export const HIDDEN_FACTION_SLUGS: string[] = ['rytu-vejas']
export const HIDDEN_FACTION_NAMES: string[] = ['Rytų vėjas']

type FactionLike = { id?: number | string | null; slug?: string | null; name?: string | null }

export function isHiddenFaction(f: FactionLike | null | undefined): boolean {
  if (!f) return false
  if (f.id != null && HIDDEN_FACTION_IDS.includes(Number(f.id))) return true
  if (f.slug && HIDDEN_FACTION_SLUGS.includes(f.slug)) return true
  if (f.name && HIDDEN_FACTION_NAMES.includes(f.name)) return true
  return false
}

/** Frakcijų sąrašas be paslėptųjų. */
export function withoutHiddenFactions<T extends FactionLike>(rows: T[] | null | undefined): T[] {
  return (rows ?? []).filter((f) => !isHiddenFaction(f))
}

/** PostgREST `.or()` filtras `decks` užklausoms: kaladės be frakcijos arba su
 *  nepaslėpta frakcija. Kai paslėptų nėra – visada teisinga sąlyga. */
export const DECKS_VISIBLE_OR: string = HIDDEN_FACTION_IDS.length
  ? `faction_id.is.null,faction_id.not.in.(${HIDDEN_FACTION_IDS.join(',')})`
  : 'id.not.is.null'
