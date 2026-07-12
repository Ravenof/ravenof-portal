'use client'

// ── Žaidimo turinio taksonomijos vertimai (frakcijos, retumai, kortų tipai) ──
// Problema: dauguma komponentų iš DB gauna tik LT PAVADINIMĄ (deck.faction,
// card.rarity, card.type), be ID. Vertimai gyvena `content_translations`,
// raktas = ID. Šis modulis vieną kartą užkrauna taksonomijų sąrašus ir susieja
// LT pavadinimą → ID → vertimą. Vienas šaltinis visiems ekranams.
//
//   const g = useGameContent()
//   g.faction(deck.faction)      // „Mirties maršas" → „March of Death"
//   g.rarity(card.rarity)        // „Legendinė"      → „Legendary"
//   g.cardType(card.type)        // „Padaras"        → „Creature"
//
// LT vardas naudojamas TIK kaip legacy paieškos raktas — vertimai visada
// saugomi pagal stabilų ID.

import { createClient } from '@/lib/supabase/client'
import { getLocale, subscribe as subscribeLocale } from './core'
import { tContent, loadContentTranslations, type ContentOwnerType } from './content'

type Taxonomy = 'faction' | 'rarity' | 'card_type'
type Entry = { id: string | number; name: string; slug?: string | null }

const TABLES: Record<Taxonomy, string> = { faction: 'factions', rarity: 'rarities', card_type: 'card_types' }

const byName = new Map<Taxonomy, Map<string, Entry>>()
const listeners = new Set<() => void>()
let loading: Promise<void> | null = null
let loaded = false

function notify() { listeners.forEach((l) => l()) }

/** Vieną kartą užkrauna taksonomijas + turinio vertimus. */
export async function loadGameContent(): Promise<void> {
  if (loaded) return
  if (loading) return loading
  loading = (async () => {
    try {
      const supabase = createClient()
      const [f, r, c] = await Promise.all([
        supabase.from('factions').select('id, name, slug'),
        supabase.from('rarities').select('id, name'),
        supabase.from('card_types').select('id, name'),
      ])
      const put = (tx: Taxonomy, rows: Entry[] | null) => {
        const m = new Map<string, Entry>()
        for (const e of rows ?? []) if (e?.name) m.set(e.name.trim().toLowerCase(), e)
        byName.set(tx, m)
      }
      put('faction', (f.data as Entry[] | null))
      put('rarity', (r.data as Entry[] | null))
      put('card_type', (c.data as Entry[] | null))
      await loadContentTranslations()
    } catch (e) {
      console.warn('[i18n] nepavyko užkrauti taksonomijų:', e)
    }
    loaded = true
    notify()
  })()
  try { await loading } finally { loading = null }
}

function resolve(tx: Taxonomy, value: string | number | null | undefined): string {
  if (value == null || value === '') return ''
  const locale = getLocale()
  if (locale === 'lt') return String(value)
  // ID paduotas tiesiogiai
  if (typeof value === 'number') return tContent(tx as ContentOwnerType, value, 'name', String(value), locale)
  const hit = byName.get(tx)?.get(value.trim().toLowerCase())
  if (!hit) { void loadGameContent(); return value }              // dar neužkrauta / nežinoma → LT
  return tContent(tx as ContentOwnerType, hit.id, 'name', value, locale)
}

export function factionName(v: string | number | null | undefined): string { return resolve('faction', v) }
export function rarityName(v: string | number | null | undefined): string { return resolve('rarity', v) }
export function cardTypeName(v: string | number | null | undefined): string { return resolve('card_type', v) }

export function subscribeGameContent(cb: () => void): () => void {
  listeners.add(cb)
  const off = subscribeLocale(cb)
  return () => { listeners.delete(cb); off() }
}
export function isGameContentLoaded(): boolean { return loaded }
export function __resetGameContent(): void { byName.clear(); loaded = false }
/** Ar taksonomijų lentelės nurodo į ID (t. y. saugu naudoti tik ID raktus). */
export const TAXONOMY_TABLES = TABLES
