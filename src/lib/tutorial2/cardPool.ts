// ════════════════════════════════════════════════════════════════════════════
// Tutorial card pool — loads TUT-### cards (status='hidden') by name and maps
// them to engine TutCards. Used by the director to build scripted hands/decks/
// boards. Mirrors TutorialGame.mapDbCard using engine/game public helpers.
// ════════════════════════════════════════════════════════════════════════════

import { createClient } from '@/lib/supabase/client'
import { parseEffect, detectKeywords, mapCardType, type TutCard, type BoardUnit } from '@/lib/tutorial/engine'
import { parseGameplayConfig } from '@/lib/game/types'
import { ensureCardTranslations, localizeTutCard } from '@/lib/cards/i18n'

const SEL = `id, name, image_url, gold_cost, attack, health, effect_text, description, is_champion, subtype, champion_group, champion_phase, gameplay, card_type:card_types ( name ), rarity:rarities ( name, color_hex ), faction:factions ( id, name, color_hex ), card_keywords ( keyword:keywords ( name ) )`

type Row = {
  id: string; name: string; image_url: string | null; gold_cost: number | null
  attack: number | null; health: number | null; effect_text: string | null; description: string | null
  is_champion: boolean | null; subtype: string | null; champion_group: string | null; champion_phase: number | null
  gameplay: unknown
  card_type: { name: string } | null
  rarity: { name: string | null; color_hex: string | null } | null
  faction: { id: number; name: string; color_hex: string | null } | null
  card_keywords: { keyword: { name: string } | null }[] | null
}

function mapRow(c: Row): Omit<TutCard, 'uid'> {
  const kwNames = (c.card_keywords ?? []).map((k) => k.keyword?.name ?? '').filter(Boolean)
  const text = [c.effect_text, c.description].filter(Boolean).join(' ')
  const gameplay = parseGameplayConfig(c.gameplay)
  // Efektų parseris dirba su LT tekstu; rodomus laukus lokalizuojam po to.
  return localizeTutCard({
    id: c.id, name: c.name, image: c.image_url, gold: c.gold_cost ?? 100,
    attack: c.attack, health: c.health, type: mapCardType(c.card_type?.name, !!c.is_champion),
    subtype: c.subtype ?? null, championGroup: c.champion_group ?? null, championPhase: c.champion_phase ?? null,
    keywords: Array.from(new Set([...detectKeywords(kwNames, text), ...((gameplay?.keywords ?? []) as ReturnType<typeof detectKeywords>)])),
    effectText: text, rarityColor: c.rarity?.color_hex ?? '#d4af37', rarityName: c.rarity?.name ?? null,
    factionColor: c.faction?.color_hex ?? '#d4af37', factionId: c.faction?.id ?? null, factionName: c.faction?.name ?? null,
    effect: parseEffect(text), gameplay,
    mappings: gameplay?.virtualEnabled === false ? [] : gameplay?.effectMappings ?? [],
    needsMapping: !gameplay?.effectMappings?.length && !!text,
  })
}

export class CardPool {
  private byName = new Map<string, Omit<TutCard, 'uid'>>()
  private counter = 0

  static async load(): Promise<CardPool> {
    const pool = new CardPool()
    try {
      const supabase = createClient()
      await ensureCardTranslations()
      const { data } = await supabase.from('cards').select(SEL).like('card_number', 'TUT-%').limit(200)
      for (const r of (data as unknown as Row[] | null) ?? []) pool.byName.set(r.name, mapRow(r))
    } catch { /* tuščias pool – director parodys klaidą */ }
    return pool
  }

  has(name: string) { return this.byName.has(name) }

  /** Build a fresh TutCard instance (unique uid) by card name. */
  card(name: string, suffix = 'x'): TutCard | null {
    const base = this.byName.get(name)
    if (!base) return null
    return { ...base, uid: `${base.id}-${suffix}-${this.counter++}` }
  }

  cards(names: string[], suffix = 'x'): TutCard[] {
    return names.map((n) => this.card(n, suffix)).filter((c): c is TutCard => !!c)
  }

  /** Board unit (not summon-sick: can act this turn). */
  unit(name: string, suffix = 'b'): BoardUnit | null {
    const c = this.card(name, suffix)
    if (!c) return null
    return {
      uid: c.uid, card: c, atk: c.attack ?? 0, hp: c.health ?? 1, maxHp: c.health ?? 1,
      shield: false, stealth: false, statuses: {}, summonedOnTurn: -1, attacksUsed: 0,
      isChampion: c.type === 'champion', phase: 1, abilityUsed: false,
    }
  }
}
