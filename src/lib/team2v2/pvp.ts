// ── 2v2 PvP matchmaking klientas (kambariai + RPC apvalkalai + kaladės užkrovimas) ─
// Kanoninės vietos: a1=you, a2=ally (komanda A); b1=ai, b2=foe2 (komanda B). a1 = host.
import { createClient } from '@/lib/supabase/client'
import { mapCardType, detectKeywords, parseEffect, type TutCard, type Side, type TargetRef } from '@/lib/tutorial/engine'
import { parseGameplayConfig } from '@/lib/game/types'
import type { CoopSeatMeta } from '@/lib/team2v2/load'
import { ensureCardTranslations, localizeTutCard } from '@/lib/cards/i18n'

export type Slot = 'a1' | 'a2' | 'b1' | 'b2'
export const SLOT_SEAT: Record<Slot, Side> = { a1: 'you', a2: 'ally', b1: 'ai', b2: 'foe2' }
export const SLOTS: Slot[] = ['a1', 'a2', 'b1', 'b2']

export type Pvp2v2Room = {
  id: string; code: string | null; is_public: boolean
  status: 'waiting' | 'ready' | 'active' | 'finished' | 'abandoned'
  host_id: string
  a1_id: string | null; a1_deck: string | null; a1_name: string | null
  a2_id: string | null; a2_deck: string | null; a2_name: string | null
  b1_id: string | null; b1_deck: string | null; b1_name: string | null
  b2_id: string | null; b2_deck: string | null; b2_name: string | null
  winner_team: 'A' | 'B' | null
  created_at: string; updated_at: string
}

export function slotOf(room: Pvp2v2Room, uid: string): Slot | null {
  for (const s of SLOTS) if (room[`${s}_id` as keyof Pvp2v2Room] === uid) return s
  return null
}
export function seatOf(room: Pvp2v2Room, uid: string): Side | null {
  const s = slotOf(room, uid); return s ? SLOT_SEAT[s] : null
}
export function roomFull(room: Pvp2v2Room): boolean {
  return !!(room.a1_id && room.a2_id && room.b1_id && room.b2_id)
}
export function slotName(room: Pvp2v2Room, s: Slot): string | null {
  return (room[`${s}_name` as keyof Pvp2v2Room] as string | null) ?? null
}

// ── RPC apvalkalai ───────────────────────────────────────────────────────────
export async function createRoom2v2(deckId: string, isPublic: boolean): Promise<Pvp2v2Room> {
  const { data, error } = await createClient().rpc('rvn_2v2_create', { p_deck: deckId, p_public: isPublic })
  if (error) throw new Error(error.message); return data as Pvp2v2Room
}
export async function quickRoom2v2(deckId: string): Promise<Pvp2v2Room> {
  const { data, error } = await createClient().rpc('rvn_2v2_quick', { p_deck: deckId })
  if (error) throw new Error(error.message); return data as Pvp2v2Room
}
export async function joinCode2v2(code: string, deckId: string): Promise<Pvp2v2Room> {
  const { data, error } = await createClient().rpc('rvn_2v2_join_code', { p_code: code, p_deck: deckId })
  if (error) throw new Error(error.message); return data as Pvp2v2Room
}
export async function leaveRoom2v2(roomId: string): Promise<void> {
  const { error } = await createClient().rpc('rvn_2v2_leave', { p_room: roomId })
  if (error) throw new Error(error.message)
}
export async function fetchRoom2v2(roomId: string): Promise<Pvp2v2Room | null> {
  const { data } = await createClient().from('pvp2v2_rooms').select('*').eq('id', roomId).maybeSingle()
  return (data as Pvp2v2Room | null) ?? null
}

// ── Vieno žaidėjo kaladės užkrovimas (siunčiama hostui per realtime) ──────────
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

/** Užkrauna žaidėjo pagrindinę kaladę su uid prefiksu = jo vietos seatas (unikalu per visus 4). */
export async function loadDeckForSeat(deckId: string, seat: Side): Promise<TutCard[] | null> {
  const supabase = createClient()
  await ensureCardTranslations()
  const { data } = await supabase.from('deck_cards').select(`quantity, is_side_deck, card:cards ( ${SEL} )`).eq('deck_id', deckId)
  type DR = { quantity: number; is_side_deck: boolean | null; card: Row | null }
  const out: TutCard[] = []
  let pi = 0
  for (const r of ((data as unknown as DR[]) ?? [])) {
    if (r.is_side_deck || !r.card) continue
    for (let q = 0; q < (r.quantity ?? 1); q++) out.push(mapCard(r.card, `${seat}-${pi++}`))
  }
  if (out.length < 10) return null
  return shuffle(out)
}

// ── Realaus laiko protokolas (host-authoritative broadcast) ──────────────────
// Hostas (a1) laiko kanoninę GameState; klientai siunčia veiksmus su savo seatu,
// hostas pritaiko (g.active=seat) ir transliuoja visą būseną atgal.

export type Net2v2Action =
  | { t: 'play'; seat: Side; uid: string }
  | { t: 'attack'; seat: Side; attacker: string; target: TargetRef }
  | { t: 'end'; seat: Side }

export type Pvp2v2Net = {
  roomId: string
  mySeat: Side          // žiūrovo kanoninė vieta (you/ally/ai/foe2)
  isHost: boolean
  myDeck: TutCard[]     // šio žaidėjo kaladė (siunčiama hostui)
}

export const seatMetaFromRoom = (room: Pvp2v2Room): Record<Side, CoopSeatMeta> => ({
  you: { name: room.a1_name ?? 'A1', avatar: '🛡️', faction: null },
  ally: { name: room.a2_name ?? 'A2', avatar: '⚔️', faction: null },
  ai: { name: room.b1_name ?? 'B1', avatar: '🗡️', faction: null },
  foe2: { name: room.b2_name ?? 'B2', avatar: '🏹', faction: null },
})
