'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export type OpenedCard = {
  id: string
  card_number: string | null
  name: string
  image_url: string | null
  gold_cost: number | null
  rarity_name: string | null
  rarity_color: string | null
  faction_name: string | null
  faction_color: string | null
  is_new: boolean   // true if user didn't own this card before
}

export async function openPack(packId: string): Promise<{ cards?: OpenedCard[]; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Prisijunkite norėdami atidaryti paketus' }

  // Load pack definition
  const { data: pack, error: packErr } = await supabase
    .from('card_packs')
    .select('id, name, cards_per_pack, daily_limit, is_active')
    .eq('id', packId)
    .eq('is_active', true)
    .single()
  if (packErr || !pack) return { error: 'Paketas nerastas' }

  // Check daily limit
  if (pack.daily_limit > 0) {
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const { count } = await supabase
      .from('user_pack_openings')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('pack_id', packId)
      .gte('opened_at', todayStart.toISOString())
    if ((count ?? 0) >= pack.daily_limit) {
      return { error: 'Šiandien jau atidarytas šis paketas. Bandykite rytoj!' }
    }
  }

  // Load card pool with weights
  const { data: pool, error: poolErr } = await supabase
    .from('pack_card_pool')
    .select('card_id, weight')
    .eq('pack_id', packId)
  if (poolErr || !pool || pool.length === 0) return { error: 'Paketo kortų baseinas tuščias' }

  // Weighted random selection
  const totalWeight = pool.reduce((s, p) => s + p.weight, 0)
  const selectedIds: string[] = []
  const take = Math.min(pack.cards_per_pack, pool.length)

  // Build weighted array
  const poolCopy = [...pool]
  for (let i = 0; i < take; i++) {
    let rand = Math.random() * poolCopy.reduce((s, p) => s + p.weight, 0)
    let chosen = poolCopy[poolCopy.length - 1]
    for (const p of poolCopy) {
      rand -= p.weight
      if (rand <= 0) { chosen = p; break }
    }
    selectedIds.push(chosen.card_id)
    // Allow duplicates from pool (don't remove chosen)
  }

  // Fetch card details
  const { data: cards, error: cardsErr } = await supabase
    .from('cards')
    .select(`
      id, card_number, name, image_url, gold_cost,
      rarity:rarities ( name, color_hex ),
      faction:factions ( name, color_hex )
    `)
    .in('id', selectedIds)
  if (cardsErr || !cards) return { error: 'Klaida gaunant kortų duomenis' }

  // Check which cards user already owns
  const { data: owned } = await supabase
    .from('user_collections')
    .select('card_id')
    .eq('user_id', user.id)
    .in('card_id', selectedIds)
  const ownedSet = new Set((owned ?? []).map((o: { card_id: string }) => o.card_id))

  // Upsert into user_collections
  const upserts = selectedIds.map((cid) => ({
    user_id: user.id,
    card_id: cid,
    quantity: 1,
  }))
  // For each card, increment quantity if already owned
  for (const cid of selectedIds) {
    const { data: existing } = await supabase
      .from('user_collections')
      .select('quantity')
      .eq('user_id', user.id)
      .eq('card_id', cid)
      .maybeSingle()
    if (existing) {
      await supabase
        .from('user_collections')
        .update({ quantity: existing.quantity + 1 })
        .eq('user_id', user.id)
        .eq('card_id', cid)
    } else {
      await supabase
        .from('user_collections')
        .insert({ user_id: user.id, card_id: cid, quantity: 1 })
    }
  }

  // Log opening
  await supabase.from('user_pack_openings').insert({
    user_id: user.id,
    pack_id: packId,
    cards_received: selectedIds,
  })

  // Award XP: 5 XP per card opened
  try {
    await supabase.rpc('award_xp', {
      p_user_id: user.id,
      p_amount: selectedIds.length * 5,
      p_source: 'pack_opening',
    })
  } catch { /* XP award is best-effort */ }

  revalidatePath('/my-cards')
  revalidatePath('/packs')

  // Map to response type — preserve order of selectedIds
  type RawCard = {
    id: string
    card_number: string | null
    name: string
    image_url: string | null
    gold_cost: number | null
    rarity: { name: string; color_hex: string } | null
    faction: { name: string; color_hex: string } | null
  }

  const cardMap: Record<string, RawCard> = {}
  for (const c of (cards as unknown as RawCard[])) cardMap[c.id] = c

  const result: OpenedCard[] = selectedIds.map((cid) => {
    const c = cardMap[cid]
    return {
      id: cid,
      card_number: c?.card_number ?? null,
      name: c?.name ?? 'Nežinoma korta',
      image_url: c?.image_url ?? null,
      gold_cost: c?.gold_cost ?? null,
      rarity_name: c?.rarity?.name ?? null,
      rarity_color: c?.rarity?.color_hex ?? null,
      faction_name: c?.faction?.name ?? null,
      faction_color: c?.faction?.color_hex ?? null,
      is_new: !ownedSet.has(cid),
    }
  })

  void totalWeight // suppress unused warning
  void upserts

  return { cards: result }
}
