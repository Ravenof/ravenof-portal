// ════════════════════════════════════════════════════════════════════════════
// Scenario card pool — užkrauna VISAS kortas, kurias mini misijos scenarijus
// (bangų unitPool/exactUnits, startingBoard'ai, spawnUnit veiksmai) pagal DB id
// ir paverčia variklio TutCard. Mapping'as veidrodinis tutorial2/cardPool.ts
// (TutorialGame.mapDbCard) — per tuos pačius public engine helper'ius.
// ════════════════════════════════════════════════════════════════════════════

import { createClient } from '@/lib/supabase/client'
import { parseEffect, detectKeywords, mapCardType, type TutCard } from '@/lib/tutorial/engine'
import { parseGameplayConfig } from '@/lib/game/types'
import { ensureCardTranslations, localizeTutCard } from '@/lib/cards/i18n'
import type { ScenarioConfig } from './types'

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

/** Surenka visus kortų id, kuriuos scenarijus gali spawn'inti (grynas). */
export function collectScenarioCardIds(cfg: ScenarioConfig | null | undefined): string[] {
  if (!cfg) return []
  const ids = new Set<string>()
  for (const w of cfg.waves ?? []) {
    for (const id of w.exactUnits ?? []) ids.add(id)
    for (const id of w.unitPool ?? []) ids.add(id)
  }
  for (const u of cfg.startingBoard ?? []) ids.add(u.cardId)
  for (const u of cfg.startingEnemyBoard ?? []) ids.add(u.cardId)
  for (const r of cfg.rules ?? []) {
    for (const a of r.actions ?? []) {
      if (a.type === 'spawnUnit' || a.type === 'spawnRandomUnit') {
        const id = a['unitCardId'] ?? a['cardId']
        if (id) ids.add(String(id))
      }
    }
  }
  return [...ids]
}

/** id → kortos bazė. Klaidos atveju grąžina tuščią Map (spawn'ai tyliai praleidžiami). */
export async function loadScenarioCards(ids: string[]): Promise<Map<string, Omit<TutCard, 'uid'>>> {
  const out = new Map<string, Omit<TutCard, 'uid'>>()
  if (!ids.length) return out
  try {
    await ensureCardTranslations()
    const supabase = createClient()
    // po 100 id per užklausą (saugus .in limitas)
    for (let i = 0; i < ids.length; i += 100) {
      const { data } = await supabase.from('cards').select(SEL).in('id', ids.slice(i, i + 100))
      for (const r of (data as unknown as Row[] | null) ?? []) out.set(r.id, mapRow(r))
    }
  } catch { /* tuščias pool — spawn'ai praleidžiami, kova tęsiasi */ }
  return out
}

let seq = 0
/** Šviežia TutCard kopija su unikaliu uid (spawn'ui). */
export function freshCard(base: Omit<TutCard, 'uid'>): TutCard {
  return { ...base, uid: `${base.id}-camp-${seq++}` }
}
