// ════════════════════════════════════════════════════════════════════════════
// Admin poligonas (/admin/playground) — kortų pjūviai ir kaladės surinkimas.
//
// GRYNAS sluoksnis: jokio React, jokio DB — tik funkcijos, kurias lengva
// testuoti. Kaladės tvarka = TRAUKIMO tvarka (index 0 traukiamas pirmas);
// variklis traukia per `deck.pop()`, todėl faktinei kaladei masyvas
// apverčiamas (žr. applySandboxSetup).
// ════════════════════════════════════════════════════════════════════════════

import type { GameState, TutCard, TutCardType, TutKeyword } from '@/lib/tutorial/engine'
import type { AiDifficulty } from '@/lib/tutorial/ai'

export type PgCard = Omit<TutCard, 'uid'>

/** Iš ko sudaroma žaidėjo kaladė. */
export type PgSlice =
  | 'manual'        // rankinis pasirinkimas + tvarka
  | 'faction'       // visos frakcijos kortos iš eilės
  | 'filter'        // tipas / retumas / raktažodis / subtype / paieška
  | 'needsMapping'  // kortos su tekstu, bet BE admin effect mappings

export type PgSort = 'costAsc' | 'costDesc' | 'name' | 'random'

export type PgFilters = {
  factionId: number | ''
  type: TutCardType | ''
  rarity: string
  keyword: TutKeyword | ''
  subtype: string
  query: string
}

export type PgConfig = {
  slice: PgSlice
  /** Rankinio pjūvio kortų id — TA PAČIA tvarka, kuria bus traukiama. */
  manual: string[]
  filters: PgFilters
  sort: PgSort
  /** Kiek kiekvienos kortos kopijų (ne rankiniam pjūviui). */
  copies: number
  /** Kaladės riba (0 = be ribos). */
  deckLimit: number
  handSize: number
  startGold: number
  infiniteGold: boolean
  passiveAi: boolean
  difficulty: AiDifficulty
  oppFactionId: number | ''
}

export const DEFAULT_PG_CONFIG: PgConfig = {
  slice: 'manual',
  manual: [],
  filters: { factionId: '', type: '', rarity: '', keyword: '', subtype: '', query: '' },
  sort: 'costAsc',
  copies: 1,
  deckLimit: 40,
  handSize: 5,
  startGold: 1000,
  infiniteGold: true,
  passiveAi: true,
  difficulty: 'normal',
  oppFactionId: '',
}

const norm = (v: string) => v.trim().toLowerCase()

/** Ar korta atitinka filtrų rinkinį (naudojama ir paieškos sąraše). */
export function matchesFilters(c: PgCard, f: PgFilters): boolean {
  if (f.factionId !== '' && c.factionId !== f.factionId) return false
  if (f.type && c.type !== f.type) return false
  if (f.rarity && (c.rarityName ?? '') !== f.rarity) return false
  if (f.keyword && !(c.keywords ?? []).includes(f.keyword)) return false
  if (f.subtype && norm(c.subtype ?? '') !== norm(f.subtype)) return false
  if (f.query) {
    const q = norm(f.query)
    if (!norm(c.name).includes(q) && !norm(c.effectText ?? '').includes(q)) return false
  }
  return true
}

function sortCards(list: PgCard[], sort: PgSort): PgCard[] {
  const out = [...list]
  if (sort === 'costAsc') out.sort((a, b) => a.gold - b.gold || a.name.localeCompare(b.name, 'lt'))
  else if (sort === 'costDesc') out.sort((a, b) => b.gold - a.gold || a.name.localeCompare(b.name, 'lt'))
  else if (sort === 'name') out.sort((a, b) => a.name.localeCompare(b.name, 'lt'))
  else out.sort(() => Math.random() - 0.5)
  return out
}

/**
 * Pjūvis → kortų eilė (index 0 = traukiama pirma).
 * `manual` pjūvyje tvarka yra vartotojo, todėl rikiavimas NETAIKOMAS.
 */
export function sliceCards(all: PgCard[], cfg: PgConfig): PgCard[] {
  const byId = new Map(all.map((c) => [c.id, c]))
  if (cfg.slice === 'manual') {
    const out: PgCard[] = []
    for (const id of cfg.manual) { const c = byId.get(id); if (c) out.push(c) }
    return out
  }
  let pool = all
  if (cfg.slice === 'faction') pool = all.filter((c) => cfg.filters.factionId === '' || c.factionId === cfg.filters.factionId)
  else if (cfg.slice === 'filter') pool = all.filter((c) => matchesFilters(c, cfg.filters))
  else if (cfg.slice === 'needsMapping') pool = all.filter((c) => !!c.needsMapping && matchesFilters(c, cfg.filters))
  // Prakeiksmai į pagrindinę kaladę nededami — jie gyvena šoninėje kaladėje.
  pool = pool.filter((c) => c.type !== 'curse')
  const sorted = sortCards(pool, cfg.sort)
  const copies = Math.max(1, Math.min(10, cfg.copies))
  const out: PgCard[] = []
  for (const c of sorted) for (let i = 0; i < copies; i++) out.push(c)
  return out
}

let uidSeq = 0
/** Šviežia TutCard kopija su unikaliu uid. */
export function freshPgCard(base: PgCard): TutCard {
  return { ...base, uid: `${base.id}-pg${uidSeq++}` }
}

/** Sintetinis manekenas — nėra DB kortos, tik taikinys lentoje. */
export function makeDummyCard(atk: number, hp: number, name = 'Manekenas'): PgCard {
  return {
    id: '__dummy__',
    name,
    image: null,
    gold: 0,
    attack: atk,
    health: hp,
    type: 'unit',
    subtype: 'MANEKENAS',
    championGroup: null,
    championPhase: null,
    keywords: [],
    effectText: '',
    rarityColor: '#8a8a99',
    rarityName: null,
    factionColor: '#8a8a99',
    factionId: null,
    factionName: null,
    effect: null,
    gameplay: null,
    mappings: [],
    needsMapping: false,
  }
}

/** „Begalinis" HP manekenui (variklis skaičių traktuoja įprastai). */
export const PG_INFINITE_HP = 9999

/**
 * Poligono setup'as: perrašo žaidėjo kaladę/ranką/auksą ką tik sukurtoje kovoje.
 * Kviečiama iš TutorialGame `sandbox.applySetup` (po createGame + beginTurn).
 */
export function applySandboxSetup(g: GameState, ordered: PgCard[], cfg: PgConfig): void {
  const limit = cfg.deckLimit > 0 ? Math.min(cfg.deckLimit, ordered.length) : ordered.length
  const cards = ordered.slice(0, limit).map(freshPgCard)
  const hand = cards.slice(0, Math.max(0, Math.min(cfg.handSize, 10)))
  const rest = cards.slice(hand.length)
  g.you.hand = hand
  // variklis traukia deck.pop() → apverčiam, kad tvarka atitiktų sąrašą
  g.you.deck = [...rest].reverse()
  g.you.fatigue = 0
  g.you.gold = Math.max(0, cfg.startGold)
}
