export type Faction = {
  id: number
  name: string
  slug: string
  color_hex: string
  icon_url: string | null
  description: string | null
  sort_order: number
}

export type CardType = {
  id: number
  name: string
  sort_order: number
}

export type Rarity = {
  id: number
  name: string
  copy_limit: number
  sort_order: number
  color_hex: string
}

export type Keyword = {
  id: number
  name: string
  description: string | null
}

export type CardStatus = 'active' | 'hidden' | 'draft' | 'banned'

export type Card = {
  id: string
  card_number: string | null
  name: string
  faction_id: number | null
  card_type_id: number | null
  rarity_id: number | null
  gold_cost: number | null
  attack: number | null
  health: number | null
  description: string | null
  effect_text: string | null
  image_url: string | null
  is_champion: boolean
  status: CardStatus
  created_at: string
  updated_at: string
}

export type CardWithRelations = Card & {
  faction: Faction | null
  card_type: CardType | null
  rarity: Rarity | null
  card_keywords: { keyword: Keyword }[]
}

export type CollectionMap = Record<string, number>

// ── DECK BUILDER ──────────────────────────────────────────────
export type DeckVisibility = 'private' | 'unlisted' | 'public'

export type Deck = {
  id: string
  user_id: string
  name: string
  description: string | null
  faction_id: number | null
  visibility: DeckVisibility
  card_count: number
  avg_gold_cost: number
  created_at: string
  updated_at: string
}

export type DeckWithRelations = Deck & {
  faction: Faction | null
}

export type DeckCard = {
  id: string
  deck_id: string
  card_id: string
  quantity: number
  created_at: string
  updated_at: string
}

/** Korta su kiekiu deck builder'e (local state) */
export type DeckEntry = {
  card: CardWithRelations
  quantity: number
}

export type Profile = {
  id: string
  username: string
  display_name: string | null
  avatar_url: string | null
  bio: string | null
  is_public: boolean
  created_at: string
  updated_at: string
}
