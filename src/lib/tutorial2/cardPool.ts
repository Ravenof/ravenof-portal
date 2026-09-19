// ════════════════════════════════════════════════════════════════════════════
// Tutorial card pool — TIKROS kolekcijos kortos (status='active') pagal vardą.
// Director'ius iš jų renka scenarijaus rankas / kalades / lentas (žr. lessonSeeds.ts).
//
// 2026-09-19 (Donato sprendimas): atskirų TUT-### kortų NEBĖRA – pamokos naudoja tik
// realias kortas, parinktas pagal status ir efektus. Todėl pool'as nieko „nepakeičia"
// ir jokių slaptų kortų neskaito – užtenka įprastos cards RLS (status='active').
//
// Čempionai: visos fazės turi TĄ PATĮ vardą, todėl scenarijuje fazė nurodoma sufiksu
// „Vardas|2" (1 fazė – ir be sufikso). Vardas be sufikso visur kitur (allow, complete,
// highlight) tinka bet kuriai fazei, nes ten lyginamas card.name.
// ════════════════════════════════════════════════════════════════════════════

import { createClient } from '@/lib/supabase/client'
import { parseEffect, detectKeywords, mapCardType, type TutCard, type BoardUnit } from '@/lib/tutorial/engine'
import { parseGameplayConfig } from '@/lib/game/types'
import { ensureCardTranslations, localizeTutCard } from '@/lib/cards/i18n'

const SEL = `id, card_number, name, image_url, gold_cost, attack, health, effect_text, description, is_champion, subtype, champion_group, champion_phase, gameplay, card_type:card_types ( name ), rarity:rarities ( name, color_hex ), faction:factions ( id, name, color_hex ), card_keywords ( keyword:keywords ( name ) )`

type Row = {
  id: string; card_number: string | null; name: string; image_url: string | null; gold_cost: number | null
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

/** „Vardas|2" → { name: 'Vardas', phase: 2 }; be sufikso – phase null. */
function parseRef(ref: string): { name: string; phase: number | null } {
  const i = ref.lastIndexOf('|')
  if (i < 0) return { name: ref, phase: null }
  const ph = Number(ref.slice(i + 1))
  return Number.isFinite(ph) ? { name: ref.slice(0, i), phase: ph } : { name: ref, phase: null }
}

export class CardPool {
  /** raktas: vardas (ne čempionams / 1 fazei) ir „vardas|fazė" (čempionams) */
  private byKey = new Map<string, Omit<TutCard, 'uid'>>()
  private counter = 0

  static async load(): Promise<CardPool> {
    const pool = new CardPool()
    try {
      const supabase = createClient()
      await ensureCardTranslations()
      const { data } = await supabase.from('cards').select(SEL).eq('status', 'active').limit(2000)
      const rows = ((data as unknown as Row[] | null) ?? [])
        .filter((r) => !String(r.card_number ?? '').startsWith('TUT-'))
        // deterministiškai: jei vardai kartotųsi, laimi mažesnis card_number
        .sort((a, b) => String(a.card_number ?? '').localeCompare(String(b.card_number ?? '')))
      for (const r of rows) {
        const card = mapRow(r)
        if (r.champion_phase != null) {
          pool.byKey.set(`${r.name}|${r.champion_phase}`, card)
          // be sufikso – 1 fazė (arba žemiausia rasta)
          const cur = pool.byKey.get(r.name)
          if (!cur || (cur.championPhase ?? 99) > r.champion_phase) pool.byKey.set(r.name, card)
        } else if (!pool.byKey.has(r.name)) {
          pool.byKey.set(r.name, card)
        }
      }
    } catch { /* tuščias pool – director parodys klaidą */ }
    return pool
  }

  private lookup(ref: string): Omit<TutCard, 'uid'> | undefined {
    const direct = this.byKey.get(ref)
    if (direct) return direct
    const { name, phase } = parseRef(ref)
    return phase != null ? this.byKey.get(`${name}|${phase}`) ?? this.byKey.get(name) : this.byKey.get(name)
  }

  /** Galutinis (rodomas) kortos vardas – be „|fazė" sufikso. */
  resolve(ref: string): string { return this.lookup(ref)?.name ?? parseRef(ref).name }
  has(ref: string) { return !!this.lookup(ref) }

  /** Pamokos config'as naudojamas toks, koks yra (paliktas dėl director API suderinamumo). */
  rewriteLesson<T>(cfg: T): T { return cfg }

  /** Build a fresh TutCard instance (unique uid) by card name (or „name|phase"). */
  card(ref: string, suffix = 'x'): TutCard | null {
    const base = this.lookup(ref)
    if (!base) return null
    return { ...base, uid: `${base.id}-${suffix}-${this.counter++}` }
  }

  cards(refs: string[], suffix = 'x'): TutCard[] {
    return refs.map((n) => this.card(n, suffix)).filter((c): c is TutCard => !!c)
  }

  /** Board unit (not summon-sick: can act this turn). */
  unit(ref: string, suffix = 'b'): BoardUnit | null {
    const c = this.card(ref, suffix)
    if (!c) return null
    return {
      uid: c.uid, card: c, atk: c.attack ?? 0, hp: c.health ?? 1, maxHp: c.health ?? 1,
      shield: false, stealth: false, statuses: {}, summonedOnTurn: -1, attacksUsed: 0,
      isChampion: c.type === 'champion', phase: c.championPhase ?? 1, abilityUsed: false,
    }
  }
}
