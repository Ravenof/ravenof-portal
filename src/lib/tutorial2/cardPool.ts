// ════════════════════════════════════════════════════════════════════════════
// Tutorial card pool — loads TUT-### cards (status='hidden') by name and maps
// them to engine TutCards. Used by the director to build scripted hands/decks/
// boards. Mirrors TutorialGame.mapDbCard using engine/game public helpers.
//
// 2026-09-19: TIKROS KORTOS VIETOJ TUT (Donato sprendimas – atskirų tutorial kortų
// su savo art'u nedarom). Kiekvienai TUT kortai ieškom aktyvios kolekcijos kortos,
// kuri MECHANIŠKAI IDENTIŠKA (tipas, kaina, ★/HP, raktažodžiai, efektų mapping'ai,
// čempiono fazė) – frakcija nesvarbi. Radus, tutorial'e rodoma tikra korta (vardas,
// paveikslėlis, frakcija, retumas), o pamokos scenarijus (kuris kortas vadina TUT
// vardais) perrašomas per `rewriteLesson()` – žr. TutorialDirector. Neradus –
// lieka TUT korta, kaip iki šiol. Parinkimas deterministinis (pagal card_number),
// viena tikra korta – vienai TUT kortai.
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

// ── Mechaninis parašas: dvi kortos „tos pačios", jei parašai sutampa ─────────
// Iš gameplay išmetam tik pateikimą (garsai, animacijos, balsai, admin pastabos, skill'ų
// pavadinimai); viskas, kas keičia žaidimo eigą, lieka. Tuščios reikšmės normalizuojamos.
const PRESENTATION_KEYS = new Set(['projectile', 'vfx', 'sfx', 'animation', 'animationType', 'sound', 'soundType', 'summonFx', 'voiceLines', 'needsEffectMapping', 'name', 'label', 'description', 'icon'])
function strip(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(strip)
  if (v && typeof v === 'object') {
    const out: Record<string, unknown> = {}
    for (const k of Object.keys(v as Record<string, unknown>).sort()) {
      if (PRESENTATION_KEYS.has(k)) continue
      const s = strip((v as Record<string, unknown>)[k])
      if (s === undefined || s === null || (Array.isArray(s) && s.length === 0) || (typeof s === 'object' && Object.keys(s as object).length === 0)) continue
      out[k] = s
    }
    return out
  }
  return v
}
function signature(c: Omit<TutCard, 'uid'>): string {
  const gp = { ...(c.gameplay ?? {}) } as Record<string, unknown>
  delete gp.keywords                          // raktažodžiai lyginami atskirai (sujungti su DB keyword lentele)
  if (gp.virtualEnabled === undefined) gp.virtualEnabled = true
  return JSON.stringify({
    type: c.type, gold: c.gold, atk: c.attack ?? null, hp: c.health ?? null,
    phase: c.type === 'champion' ? c.championPhase ?? 1 : null,
    kw: [...c.keywords].sort(),
    // LT teksto parserio rezultatas svarbus tik legacy kelyje (kai nėra mapping'ų) – tada variklis eina pagal tekstą
    effect: c.mappings?.length ? null : strip(c.effect),
    gp: strip(gp),
  })
}

export class CardPool {
  private byName = new Map<string, Omit<TutCard, 'uid'>>()
  /** TUT vardas → tikros kortos vardas (kai rasta identiška kolekcijos korta) */
  private alias = new Map<string, string>()
  private counter = 0

  static async load(): Promise<CardPool> {
    const pool = new CardPool()
    try {
      const supabase = createClient()
      await ensureCardTranslations()
      const { data } = await supabase.from('cards').select(SEL).like('card_number', 'TUT-%').limit(200)
      const tut = ((data as unknown as Row[] | null) ?? []).map((r) => ({ row: r, card: mapRow(r) }))
      for (const t of tut) pool.byName.set(t.row.name, t.card)

      // Tikros kortos su tuo pačiu mechaniniu parašu → pakeičia TUT kortą (vardas, art'as, frakcija, retumas).
      try {
        const { data: real } = await supabase.from('cards').select(SEL).eq('status', 'active').not('card_number', 'like', 'TUT-%').limit(2000)
        const bySig = new Map<string, { row: Row; card: Omit<TutCard, 'uid'> }[]>()
        for (const r of (real as unknown as Row[] | null) ?? []) {
          const card = mapRow(r)
          const sig = signature(card)
          const arr = bySig.get(sig) ?? []
          arr.push({ row: r, card }); bySig.set(sig, arr)
        }
        const used = new Set<string>()
        // deterministiškai: TUT kortos pagal numerį, kandidatai pagal card_number
        for (const t of [...tut].sort((a, b) => String(a.row.card_number).localeCompare(String(b.row.card_number)))) {
          const cands = (bySig.get(signature(t.card)) ?? [])
            .filter((c) => !used.has(c.row.id) && c.row.name !== t.row.name && !!c.row.image_url)
            .sort((a, b) => String(a.row.card_number ?? '').localeCompare(String(b.row.card_number ?? '')))
          const pick = cands[0]
          if (!pick) continue
          used.add(pick.row.id)
          pool.alias.set(t.row.name, pick.row.name)
          pool.byName.set(pick.row.name, pick.card)
        }
        if (pool.alias.size) console.info(`[tutorial] tikros kortos vietoj TUT: ${pool.alias.size}/${tut.length}`, Object.fromEntries(pool.alias))
      } catch (e) { console.warn('[tutorial] tikrų kortų pakeitimas nepavyko – liekam su TUT kortomis', e) }
    } catch { /* tuščias pool – director parodys klaidą */ }
    return pool
  }

  /** Galutinis vardas (tikros kortos, jei pakeista). */
  resolve(name: string): string { return this.alias.get(name) ?? name }
  has(name: string) { return this.byName.has(this.resolve(name)) }

  /**
   * Pamokos config'e visus TUT kortų vardus (setup, enemyScript, complete.cardName, allow…,
   * dialogų tekstus) pakeičia tikrų kortų vardais. Gilus, nekeičia originalo.
   */
  rewriteLesson<T>(cfg: T): T {
    if (this.alias.size === 0) return cfg
    const swap = (v: unknown): unknown => {
      if (typeof v === 'string') {
        const exact = this.alias.get(v)
        if (exact) return exact
        // dialogų / užuominų tekstuose – tik pilnas vardas (be linksniavimo)
        let s = v
        for (const [from, to] of this.alias) if (s.includes(from)) s = s.split(from).join(to)
        return s
      }
      if (Array.isArray(v)) return v.map(swap)
      if (v && typeof v === 'object') {
        const out: Record<string, unknown> = {}
        for (const [k, val] of Object.entries(v as Record<string, unknown>)) out[k] = swap(val)
        return out
      }
      return v
    }
    return swap(cfg) as T
  }

  /** Build a fresh TutCard instance (unique uid) by card name. */
  card(name: string, suffix = 'x'): TutCard | null {
    const base = this.byName.get(this.resolve(name))
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
