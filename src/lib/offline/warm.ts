// ── Offline cache „pašildymas" (app bundle) ──────────────────────────────────
// Pirmą kartą prisijungus su tinklu iš anksto įvykdomos pagrindinės skaitymo
// užklausos, kad kolekcija, kaladžių kūrimas ir PvE veiktų be tinklo iškart
// (offlineFetch.ts jas kešuoja pagal URL). Kviečiama po auth state change.
import { createClient } from '@/lib/supabase/client'

const CARD_SEL = `
  id, card_number, name, gold_cost, attack, health,
  description, effect_text, image_url, is_champion, status,
  faction_id, card_type_id, rarity_id,
  faction:factions ( id, name, slug, color_hex, icon_url ),
  card_type:card_types ( id, name, icon_url ),
  rarity:rarities ( id, name, copy_limit, color_hex ),
  card_keywords ( keyword:keywords ( id, name ) )
`

let warmedFor: string | null = null

export async function warmOfflineCache(): Promise<void> {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return
  const sb = createClient()
  const { data: { session } } = await sb.auth.getSession()
  const uid = session?.user.id ?? 'anon'
  if (warmedFor === uid) return
  warmedFor = uid
  const jobs: PromiseLike<unknown>[] = [
    sb.from('cards').select(CARD_SEL).eq('status', 'active').order('gold_cost').order('name'),
    sb.from('factions').select('*').order('sort_order'),
    sb.from('factions').select('id, name, icon_url, color_hex').order('sort_order').limit(20),
    sb.from('rarities').select('*'),
    sb.from('card_types').select('*'),
    sb.from('zmk_cards').select('*').order('sort_order'),
  ]
  if (session) {
    const u = session.user.id
    jobs.push(
      sb.from('user_collections').select('card_id, quantity').eq('user_id', u),
      sb.from('decks').select('id, name, faction_id, visibility, card_count, avg_gold_cost, faction:factions ( name, color_hex )').eq('user_id', u).not('name', 'ilike', '[Kampanija]%').order('updated_at', { ascending: false }),
      sb.from('decks').select('id, name, faction:factions ( name, icon_url, color_hex )').eq('user_id', u).not('name', 'ilike', '[Kampanija]%').order('updated_at', { ascending: false }),
      sb.from('profiles').select('digital_settings').eq('id', u).maybeSingle(),
      sb.from('profiles').select('role').eq('id', u).maybeSingle(),
      sb.auth.getUser(),
    )
  }
  await Promise.allSettled(jobs)
  // Kaladžių kortos – atskira užklausa pagal id sąrašą (ta pati forma kaip DigitalPvE/MyDecks).
  if (session) {
    const { data: decks } = await sb.from('decks').select('id').eq('user_id', session.user.id)
    const ids = (decks ?? []).map((d) => d.id as string)
    if (ids.length) await Promise.allSettled([
      sb.from('deck_cards').select('deck_id, card_id, quantity').in('deck_id', ids),
      sb.from('deck_cards').select('deck_id, card_id, quantity, is_side_deck').in('deck_id', ids),
    ])
  }
}
