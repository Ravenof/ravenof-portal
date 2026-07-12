// ── 2v2 kortų užkrovimas (žaidėjo kaladė + 3 botų kaladės) → TutCard[] ────────
// Naudoja tuos pačius helperius kaip 1v1 (parseGameplayConfig/detectKeywords/
// mapCardType/parseEffect), tad kortos turi pilną mechaniką (efektai/ŽMK/champion).
import { createClient } from '@/lib/supabase/client'
import { mapCardType, detectKeywords, parseEffect, type TutCard } from '@/lib/tutorial/engine'
import { parseGameplayConfig } from '@/lib/game/types'
import { RANKED_BOTS, type RankedBot } from '@/lib/ranked/bots'
import { strategyWeights } from '@/lib/ranked/aiStrategy'
import type { AiWeightDelta } from '@/lib/tutorial/ai'
import { ensureCardTranslations, localizeTutCard } from '@/lib/cards/i18n'

const SEL = `id, name, image_url, gold_cost, attack, health, effect_text, description, is_champion, subtype, champion_group, champion_phase, gameplay,
  card_type:card_types ( name ), rarity:rarities ( color_hex ), faction:factions ( id, name, color_hex, slug ), card_keywords ( keyword:keywords ( name ) )`

type Row = {
  id: string; name: string; image_url: string | null; gold_cost: number | null; attack: number | null; health: number | null
  effect_text: string | null; description: string | null; is_champion: boolean | null; subtype: string | null
  champion_group: string | null; champion_phase: number | null; gameplay: unknown
  card_type: { name: string } | null; rarity: { color_hex: string | null } | null
  faction: { id: number | null; name: string | null; color_hex: string | null; slug: string | null } | null
  card_keywords: { keyword: { name: string } | null }[] | null
}

function mapCard(c: Row, uid: string): TutCard {
  const kwNames = (c.card_keywords ?? []).map((k) => k.keyword?.name ?? '').filter(Boolean)
  const text = [c.effect_text, c.description].filter(Boolean).join(' ')
  const gameplay = parseGameplayConfig(c.gameplay)
  return localizeTutCard({
    uid, id: c.id, name: c.name, image: c.image_url,
    gold: c.gold_cost ?? 100, attack: c.attack, health: c.health,
    type: mapCardType(c.card_type?.name, !!c.is_champion),
    subtype: c.subtype ?? null, championGroup: c.champion_group ?? null, championPhase: c.champion_phase ?? null,
    keywords: Array.from(new Set([...detectKeywords(kwNames, text), ...((gameplay?.keywords ?? []) as ReturnType<typeof detectKeywords>)])),
    effectText: text, rarityColor: c.rarity?.color_hex ?? '#d4af37',
    factionColor: c.faction?.color_hex ?? '#d4af37', factionId: c.faction?.id ?? null, factionName: c.faction?.name ?? null,
    effect: parseEffect(text), gameplay,
    mappings: gameplay?.virtualEnabled === false ? [] : gameplay?.effectMappings ?? [],
    needsMapping: !gameplay?.effectMappings?.length && !!text,
  })
}

function shuffle<T>(a: T[]): T[] { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]] } return b }

export type CoopSeatMeta = { name: string; avatar: string; faction: string | null; botSlug?: string; difficulty?: 'easy' | 'normal' | 'hard'; aiStrategy?: AiWeightDelta }
export type Coop2v2 = {
  decks: { you: TutCard[]; ally: TutCard[]; ai: TutCard[]; foe2: TutCard[] }
  meta: { you: CoopSeatMeta; ally: CoopSeatMeta; ai: CoopSeatMeta; foe2: CoopSeatMeta }
}

/** Sukuria 2v2 co-op kortas: žaidėjo kaladė + 3 botai (ally + 2 priešai). */
export async function buildCoop2v2(playerDeckId: string, playerName: string): Promise<Coop2v2 | null> {
  const supabase = createClient()
  await ensureCardTranslations()
  // 3 skirtingi botai
  const pool = shuffle([...RANKED_BOTS])
  const [allyBot, foe1, foe2bot] = pool.slice(0, 3)

  // bendras kūrinių+kortų telkinys botų kaladėms
  const { data: poolData } = await supabase.from('cards').select(SEL).eq('status', 'active').limit(500)
  const allRows = (poolData as unknown as Row[]) ?? []
  if (allRows.length === 0) return null

  const botDeck = (bot: RankedBot): TutCard[] => {
    let cands = bot.factionSlug ? allRows.filter((r) => r.faction?.slug === bot.factionSlug) : allRows
    if (cands.length < 12) cands = allRows
    const sh = shuffle(cands)
    const out: TutCard[] = []
    for (let i = 0; i < 24; i++) out.push(mapCard(sh[i % sh.length], `${bot.slug}-${i}`))
    return out
  }

  // žaidėjo kaladė (main deck)
  const { data: deckData } = await supabase.from('deck_cards').select(`quantity, is_side_deck, card:cards ( ${SEL} )`).eq('deck_id', playerDeckId)
  type DR = { quantity: number; is_side_deck: boolean | null; card: Row | null }
  const youDeck: TutCard[] = []
  let pi = 0
  for (const r of ((deckData as unknown as DR[]) ?? [])) {
    if (r.is_side_deck || !r.card) continue
    for (let q = 0; q < (r.quantity ?? 1); q++) youDeck.push(mapCard(r.card, `you-${pi++}`))
  }
  if (youDeck.length < 10) return null

  const meta = (b: RankedBot): CoopSeatMeta => ({ name: `${b.name} (AI)`, avatar: b.avatar || '🤖', faction: b.faction, botSlug: b.slug, difficulty: b.difficultyModifier, aiStrategy: strategyWeights(b) })
  return {
    decks: { you: shuffle(youDeck), ally: botDeck(allyBot), ai: botDeck(foe1), foe2: botDeck(foe2bot) },
    meta: {
      you: { name: playerName || 'Tu', avatar: '🛡️', faction: null },
      ally: meta(allyBot), ai: meta(foe1), foe2: meta(foe2bot),
    },
  }
}
