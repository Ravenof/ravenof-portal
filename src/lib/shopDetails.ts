// ── Parduotuvės detalios peržiūros duomenys ─────────────────────────────────
// Starter kaladės sudėtis ir boosterio galimos frakcijos. Abi lentelės turi
// viešo skaitymo RLS politikas (starter_deck_cards.sdc_read, pack_factions_read),
// tad jokių naujų RPC/migracijų nereikia.
import { createClient } from '@/lib/supabase/client'

export type StarterCard = {
  id: string
  name: string
  imageUrl: string | null
  quantity: number
  rarity: string | null
  rarityColor: string | null
  raritySort: number
  faction: string | null
  gold: number | null
}

type SdcRow = {
  quantity: number | null
  cards: {
    id: string; name: string; image_url: string | null; gold_cost: number | null
    faction: { name: string } | { name: string }[] | null
    rarity: { name: string; color_hex: string | null; sort_order: number | null } | { name: string; color_hex: string | null; sort_order: number | null }[] | null
  } | null
}
const one = <T,>(v: T | T[] | null | undefined): T | null => (Array.isArray(v) ? v[0] ?? null : v ?? null)

/** Starter kaladės kortos (rūšiuota: retumas ↓, tada kaina ↑, tada pavadinimas). */
export async function getStarterDeckCards(starterDeckId: string): Promise<StarterCard[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('starter_deck_cards')
    .select('quantity, cards ( id, name, image_url, gold_cost, faction:factions ( name ), rarity:rarities ( name, color_hex, sort_order ) )')
    .eq('starter_deck_id', starterDeckId)
  if (error) { console.warn('[shop] starter cards:', error.message); return [] }
  const rows = (data as unknown as SdcRow[]) ?? []
  const out: StarterCard[] = []
  for (const r of rows) {
    const c = r.cards
    if (!c) continue
    const rar = one(c.rarity)
    const fac = one(c.faction)
    out.push({
      id: c.id, name: c.name, imageUrl: c.image_url ?? null,
      quantity: r.quantity ?? 1,
      rarity: rar?.name ?? null, rarityColor: rar?.color_hex ?? null, raritySort: rar?.sort_order ?? 0,
      faction: fac?.name ?? null, gold: c.gold_cost ?? null,
    })
  }
  out.sort((a, b) => b.raritySort - a.raritySort || (a.gold ?? 0) - (b.gold ?? 0) || a.name.localeCompare(b.name, 'lt'))
  return out
}

export type PackFaction = { id: number; name: string }

/** Boosterio galimos frakcijos (tuščias sąrašas = visos frakcijos). */
export async function getPackFactions(packId: string): Promise<PackFaction[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('pack_factions')
    .select('faction_id, factions ( id, name, sort_order )')
    .eq('pack_id', packId)
  if (error) { console.warn('[shop] pack factions:', error.message); return [] }
  const rows = (data as unknown as { faction_id: number; factions: { id: number; name: string; sort_order: number | null } | { id: number; name: string; sort_order: number | null }[] | null }[]) ?? []
  return rows
    .map((r) => { const f = one(r.factions); return { id: f?.id ?? r.faction_id, name: f?.name ?? '', sort: f?.sort_order ?? 0 } })
    .filter((f) => !!f.name)
    .sort((a, b) => a.sort - b.sort)
    .map(({ id, name }) => ({ id, name }))
}
