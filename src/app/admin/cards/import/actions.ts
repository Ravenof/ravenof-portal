'use server'

import { revalidatePath, revalidateTag } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient, getCachedUser } from '@/lib/supabase/server'

export type ImportRowInput = {
  card_number: string
  name: string
  faction: string
  type: string
  rarity: string
  gold_cost: string
  attack: string
  health: string
  description: string
  effect_text: string
  image_url: string
  is_champion: string
  status: string
}

export type ImportError = {
  row: number
  card_number: string
  message: string
}

export type ImportResult = {
  inserted: number
  updated: number
  errors: ImportError[]
}

function parseIntOrNull(s: string): number | null {
  if (!s.trim()) return null
  const n = parseInt(s.trim(), 10)
  return Number.isNaN(n) ? null : n
}

export async function importCards(rows: ImportRowInput[]): Promise<ImportResult> {
  const supabase = await createClient()

  const user = await getCachedUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (!profile || profile.role !== 'admin') {
    throw new Error('Not authorized')
  }

  const [{ data: factions }, { data: cardTypes }, { data: rarities }, { data: existingCards }] =
    await Promise.all([
      supabase.from('factions').select('id, name'),
      supabase.from('card_types').select('id, name'),
      supabase.from('rarities').select('id, name'),
      supabase.from('cards').select('card_number'),
    ])

  const factionMap: Record<string, number> = Object.fromEntries(
    (factions ?? []).map((f: { id: number; name: string }) => [f.name.toLowerCase(), f.id])
  )
  const typeMap: Record<string, number> = Object.fromEntries(
    (cardTypes ?? []).map((t: { id: number; name: string }) => [t.name.toLowerCase(), t.id])
  )
  const rarityMap: Record<string, number> = Object.fromEntries(
    (rarities ?? []).map((r: { id: number; name: string }) => [r.name.toLowerCase(), r.id])
  )
  const existingNumbers = new Set(
    (existingCards ?? []).map((c: { card_number: string }) => c.card_number)
  )

  const result: ImportResult = { inserted: 0, updated: 0, errors: [] }

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const rowNum = i + 2 // 1-indexed + header row

    if (!row.card_number.trim()) {
      result.errors.push({ row: rowNum, card_number: '—', message: 'Trūksta card_number' })
      continue
    }
    if (!row.name.trim()) {
      result.errors.push({ row: rowNum, card_number: row.card_number, message: 'Trūksta name' })
      continue
    }

    const factionId = factionMap[row.faction.toLowerCase().trim()]
    if (!factionId) {
      result.errors.push({ row: rowNum, card_number: row.card_number, message: `Nežinoma frakcija: "${row.faction}"` })
      continue
    }

    const typeId = typeMap[row.type.toLowerCase().trim()]
    if (!typeId) {
      result.errors.push({ row: rowNum, card_number: row.card_number, message: `Nežinomas tipas: "${row.type}"` })
      continue
    }

    const rarityId = rarityMap[row.rarity.toLowerCase().trim()]
    if (!rarityId) {
      result.errors.push({ row: rowNum, card_number: row.card_number, message: `Nežinomas retumas: "${row.rarity}"` })
      continue
    }

    const goldCost = parseInt(row.gold_cost.trim(), 10)
    if (Number.isNaN(goldCost) || goldCost < 100 || goldCost > 1000) {
      result.errors.push({ row: rowNum, card_number: row.card_number, message: `Neteisinga gold_cost: "${row.gold_cost}" (100–1000)` })
      continue
    }

    const validStatuses = ['active', 'hidden', 'draft', 'banned']
    const status = validStatuses.includes(row.status.toLowerCase().trim())
      ? row.status.toLowerCase().trim()
      : 'draft'

    const isChampion = ['true', '1', 'yes', 'taip'].includes(row.is_champion.toLowerCase().trim())

    const cardData = {
      card_number: row.card_number.trim(),
      name: row.name.trim(),
      faction_id: factionId,
      card_type_id: typeId,
      rarity_id: rarityId,
      gold_cost: goldCost,
      attack: parseIntOrNull(row.attack),
      health: parseIntOrNull(row.health),
      description: row.description.trim() || null,
      effect_text: row.effect_text.trim() || null,
      image_url: row.image_url.trim() || null,
      is_champion: isChampion,
      status,
    }

    const isUpdate = existingNumbers.has(row.card_number.trim())

    const { error: upsertError } = await supabase
      .from('cards')
      .upsert(cardData, { onConflict: 'card_number' })

    if (upsertError) {
      result.errors.push({ row: rowNum, card_number: row.card_number, message: upsertError.message })
    } else if (isUpdate) {
      result.updated++
    } else {
      result.inserted++
    }
  }

  revalidatePath('/admin/cards')
  revalidatePath('/cards')
  revalidateTag('cards') // invalidates deck-builder card cache

  return result
}
