// ════════════════════════════════════════════════════════════════════════════
// Admin poligonas — VISŲ aktyvių kortų užkrovimas (vienas kartas per sesiją).
// Mapping'as tas pats kaip kampanijos scenarijaus pool'o (mapRow) → kortos
// elgiasi lygiai taip pat, kaip tikroje kovoje.
// ════════════════════════════════════════════════════════════════════════════

import { createClient } from '@/lib/supabase/client'
import { ensureCardTranslations } from '@/lib/cards/i18n'
import { SEL, mapRow, type Row } from '@/lib/campaign/scenarioCards'
import type { PgCard } from './deck'

const PAGE = 500
const MAX = 4000

/** Visos aktyvios kortos (su prakeiksmais — pjūviai juos atfiltruoja patys). */
export async function loadAllCards(): Promise<PgCard[]> {
  await ensureCardTranslations()
  const supabase = createClient()
  const out: PgCard[] = []
  for (let from = 0; from < MAX; from += PAGE) {
    const { data, error } = await supabase
      .from('cards').select(SEL).eq('status', 'active')
      .order('gold_cost', { ascending: true }).order('name', { ascending: true })
      .range(from, from + PAGE - 1)
    if (error) break
    const rows = (data as unknown as Row[] | null) ?? []
    for (const r of rows) out.push(mapRow(r))
    if (rows.length < PAGE) break
  }
  return out
}

export type PgMeta = {
  factions: { id: number; name: string }[]
  rarities: string[]
  subtypes: string[]
}

/** Filtrų sąrašai — sudaromi iš pačių kortų (be papildomų užklausų). */
export function metaFromCards(cards: PgCard[]): PgMeta {
  const fm = new Map<number, string>()
  const rs = new Set<string>()
  const st = new Set<string>()
  for (const c of cards) {
    if (c.factionId != null && c.factionName) fm.set(c.factionId, c.factionName)
    if (c.rarityName) rs.add(c.rarityName)
    if (c.subtype) st.add(c.subtype)
  }
  return {
    factions: [...fm.entries()].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name, 'lt')),
    rarities: [...rs].sort((a, b) => a.localeCompare(b, 'lt')),
    subtypes: [...st].sort((a, b) => a.localeCompare(b, 'lt')),
  }
}
