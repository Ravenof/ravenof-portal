// ── 2v2 kortų užkrovimas (žaidėjo kaladė + botų kaladės) ─────────────────────
// FAZĖ 2 supaprastinta: naudojami tik kūriniai (atk+hp). Žaidėjo – iš jo kaladės;
// botų – atsitiktiniai tos frakcijos (arba bet kokie) kūriniai.

import { createClient } from '@/lib/supabase/client'
import type { SeatId } from './types'
import type { T2Card, T2Effect } from './engine'
import { parseGameplayConfig } from '@/lib/game/types'
import type { CoopSetup } from './setup'

type CardRow = {
  id: string; name: string; image_url: string | null; gold_cost: number | null
  attack: number | null; health: number | null; is_champion: boolean | null
  rarity: { color_hex: string | null } | null
  faction: { slug: string | null; color_hex: string | null } | null
  gameplay?: unknown
}

function parseBattlecry(gameplay: unknown): T2Effect[] {
  const cfg = parseGameplayConfig(gameplay)
  const out: T2Effect[] = []
  for (const m of (cfg?.effectMappings ?? [])) {
    if (m.trigger !== 'onSummon' && m.trigger !== 'onPlay') continue
    const v = m.value ?? 1
    const multi = ['allEnemyUnits', 'allEnemyTargets', 'allUnits'].includes(m.target) || ((m.targetTypes?.length ?? 0) > 1)
    switch (m.effect) {
      case 'damage': out.push({ kind: multi ? 'aoeDamage' : 'damage', value: v }); break
      case 'heal': out.push({ kind: 'heal', value: v }); break
      case 'buffAttack': out.push({ kind: 'buffAtk', value: v }); break
      case 'buffHealth': out.push({ kind: 'buffHp', value: v }); break
      case 'drawCards': out.push({ kind: 'draw', value: v }); break
      case 'drawUntilHand': out.push({ kind: 'draw', value: Math.max(1, v - 4) }); break
    }
  }
  return out.slice(0, 3) // saugiklis
}

function toCard(r: CardRow, i: number): T2Card {
  return {
    uid: `${r.id}#${i}`, id: r.id, name: r.name, image: r.image_url,
    gold: r.gold_cost ?? 100, atk: r.attack ?? 1, hp: r.health ?? 1,
    factionColor: r.faction?.color_hex ?? '#d4af37', rarityColor: r.rarity?.color_hex ?? '#d4af37',
    effects: parseBattlecry(r.gameplay),
  }
}
const isUnit = (r: CardRow) => r.attack != null && r.health != null && !r.is_champion

const SEL = 'id, name, image_url, gold_cost, attack, health, is_champion, gameplay, rarity:rarities ( color_hex ), faction:factions ( slug, color_hex )'

function shuffle<T>(a: T[]): T[] { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]] } return b }

/** Užkrauna kūrinių kalades visiems 4 seat'ams. */
export async function loadCoopCards(setup: CoopSetup): Promise<Record<SeatId, T2Card[]>> {
  const supabase = createClient()
  // 1) bendras kūrinių telkinys botams
  const { data: poolData } = await supabase.from('cards').select(SEL).eq('status', 'active').not('attack', 'is', null).not('health', 'is', null).limit(400)
  const pool = ((poolData as unknown as CardRow[]) ?? []).filter(isUnit)

  // 2) žaidėjo kaladė
  const { data: deckData } = await supabase.from('deck_cards').select(`quantity, is_side_deck, card:cards ( ${SEL} )`).eq('deck_id', setup.playerDeckId)
  type DR = { quantity: number; is_side_deck: boolean | null; card: CardRow | null }
  const playerUnits: T2Card[] = []
  let pi = 0
  for (const r of ((deckData as unknown as DR[]) ?? [])) {
    if (r.is_side_deck || !r.card || !isUnit(r.card)) continue
    for (let q = 0; q < (r.quantity ?? 1); q++) playerUnits.push(toCard(r.card, pi++))
  }
  // jei kaladėje per mažai kūrinių – papildom iš telkinio
  while (playerUnits.length < 12 && pool.length) playerUnits.push(toCard(pool[Math.floor(Math.random() * pool.length)], pi++))

  const out = {} as Record<SeatId, T2Card[]>
  out.p0 = shuffle(playerUnits)

  // 3) botų kaladės (po ~16 kūrinių; prioritetas – jų frakcija)
  for (const team of setup.state.teams) {
    for (const seat of team.seats) {
      if (seat.controller !== 'ai') continue
      const slug = seat.factionSlug
      let cands = slug ? pool.filter((c) => c.faction?.slug === slug) : pool
      if (cands.length < 8) cands = pool
      const deck: T2Card[] = []
      const sh = shuffle(cands)
      for (let k = 0; k < 16; k++) deck.push(toCard(sh[k % sh.length], k))
      out[seat.id] = shuffle(deck)
    }
  }
  return out
}
