/**
 * Lore Atlas data fetcher.
 * Tries to load published data from Supabase.
 * Falls back to the static src/data/lore.ts if Supabase returns no rows.
 *
 * Maps Supabase row shapes → LoreLocation / LoreEra types expected by /lore components.
 */

import { createClient } from '@/lib/supabase/server'
import type { LoreEra, LoreFaction, LoreLocation, LoreEvent, LoreCharacter, LoreArtifact, LorePeriod } from '@/data/lore'

// ── Supabase row shapes ───────────────────────────────────────

type DbFaction = {
  id: string; name: string; slug: string; color: string; status: string
}

type DbEra = {
  id: string; name: string; slug: string; description: string | null
  timeline_index: number; status: string
}

type DbLocation = {
  id: string; name: string; slug: string; type: string
  short_description: string | null; description: string | null
  x: number; y: number; faction_ids: string[]
  related_event_ids: string[]; related_character_ids: string[]
  related_artifact_ids: string[]; related_card_numbers: string[]
  first_era_index: number; status: string
  image_url: string | null; ambient_url: string | null
}

type DbEvent = {
  id: string; title: string; slug: string; summary: string | null
  timeline_index: number; era_slug: string | null; location_slug: string | null
  status: string
  image_url: string | null; audio_url: string | null
  period_slug: string | null; previous_event_slug: string | null
  character_slugs: string[] | null
}

type DbPeriod = {
  id: string; era_slug: string; name: string; slug: string
  description: string | null; timeline_index: number; status: string
}

type DbLocationState = {
  location_slug: string; period_slug: string
  description: string | null; image_url: string | null
}

type DbCharacter = {
  id: string; name: string; slug: string; faction_id: string | null
  role: string | null; short_description: string | null; status: string
}

type DbArtifact = {
  id: string; name: string; slug: string; artifact_type: string | null
  short_description: string | null; status: string
}

// ── ERA_COLORS: fallback palette when DB has no color field ──
const ERA_PALETTE = ['#6b7280','#7c3aed','#dc2626','#1d4ed8','#15803d','#b45309']

// ── Map DB rows → frontend types ─────────────────────────────

function mapFaction(row: DbFaction): LoreFaction {
  return { id: row.slug, name: row.name, color: row.color }
}

function mapEra(row: DbEra, idx: number): LoreEra {
  return {
    id:          row.slug,
    name:        row.name,
    index:       row.timeline_index,
    color:       ERA_PALETTE[idx % ERA_PALETTE.length],
    description: row.description ?? '',
  }
}

function mapLocation(row: DbLocation): LoreLocation {
  return {
    id:            row.slug,
    name:          row.name,
    type:          (row.type as LoreLocation['type']) ?? 'miestas',
    x:             row.x,
    y:             row.y,
    description:   row.description ?? row.short_description ?? '',
    factionId:     row.faction_ids?.[0] ?? undefined,
    factionIds:    row.faction_ids ?? [],
    firstEraIndex: row.first_era_index,
    eventIds:      row.related_event_ids ?? [],
    characterIds:  row.related_character_ids ?? [],
    artifactIds:   row.related_artifact_ids ?? [],
    // Map plain card numbers to the expected { name, cardNumber } shape
    relatedCards:  (row.related_card_numbers ?? []).map((n) => ({ name: n, cardNumber: n })),
    imageUrl:      row.image_url ?? undefined,
    ambientUrl:    row.ambient_url ?? undefined,
  }
}

function mapEvent(
  row: DbEvent,
  eraIndexBySlug: Record<string, number>,
  periodOrderBySlug: Record<string, number>
): LoreEvent {
  // SVARBU: eraIndex = EROS timeline_index (per era_slug lookup), NE įvykio
  // timeline_index. Globalus order = era*1e6 + periodas*1e3 + įvykio indeksas.
  const eraIdx = row.era_slug ? (eraIndexBySlug[row.era_slug] ?? 0) : 0
  const periodIdx = row.period_slug ? (periodOrderBySlug[row.period_slug] ?? 0) : 0
  return {
    id:          row.slug,
    name:        row.title,
    description: row.summary ?? '',
    eraIndex:    eraIdx,
    locationId:  row.location_slug ?? '',
    imageUrl:    row.image_url ?? undefined,
    audioUrl:    row.audio_url ?? undefined,
    periodId:    row.period_slug ?? undefined,
    prevEventId: row.previous_event_slug ?? undefined,
    characterIds: row.character_slugs ?? [],
    order:       eraIdx * 1_000_000 + periodIdx * 1_000 + (row.timeline_index ?? 0),
  }
}

function mapPeriod(row: DbPeriod): LorePeriod {
  return {
    id:          row.slug,
    eraId:       row.era_slug,
    name:        row.name,
    index:       row.timeline_index,
    description: row.description ?? undefined,
  }
}

function mapCharacter(row: DbCharacter): LoreCharacter {
  return {
    id:          row.slug,
    name:        row.name,
    title:       row.role ?? undefined,
    factionId:   row.faction_id ?? undefined,
    description: row.short_description ?? '',
  }
}

function mapArtifact(row: DbArtifact): LoreArtifact {
  return {
    id:          row.slug,
    name:        row.name,
    description: row.short_description ?? '',
  }
}

// ── Main fetcher ──────────────────────────────────────────────

export type LoreAtlasData = {
  eras:       LoreEra[]
  periods:    LorePeriod[]
  locations:  LoreLocation[]
  events:     LoreEvent[]
  characters: LoreCharacter[]
  artifacts:  LoreArtifact[]
  factions:   LoreFaction[]
  source:     'supabase' | 'static'
}

export async function fetchLoreAtlasData(): Promise<LoreAtlasData> {
  try {
    const supabase = await createClient()

    // Fetch core lore tables — these must all succeed for Supabase mode
    const [erasRes, locsRes, eventsRes, charsRes, artsRes] = await Promise.all([
      supabase.from('lore_eras').select('id,name,slug,description,timeline_index,status').eq('status','published').order('timeline_index'),
      supabase.from('lore_locations').select('id,name,slug,type,short_description,description,x,y,faction_ids,related_event_ids,related_character_ids,related_artifact_ids,related_card_numbers,first_era_index,status,image_url,ambient_url').eq('status','published').order('sort_order'),
      supabase.from('lore_events').select('id,title,slug,summary,timeline_index,era_slug,location_slug,status,image_url,audio_url,period_slug,previous_event_slug,character_slugs').eq('status','published').order('timeline_index'),
      supabase.from('lore_characters').select('id,name,slug,faction_id,role,short_description,status').eq('status','published').order('sort_order'),
      supabase.from('lore_artifacts').select('id,name,slug,artifact_type,short_description,status').eq('status','published').order('sort_order'),
    ])

    const dbEras      = (erasRes.data  ?? []) as DbEra[]
    const dbLocations = (locsRes.data  ?? []) as DbLocation[]
    const dbEvents    = (eventsRes.data ?? []) as DbEvent[]
    const dbChars     = (charsRes.data ?? []) as DbCharacter[]
    const dbArts      = (artsRes.data  ?? []) as DbArtifact[]

    // Periodai ir lokacijų būsenos — optional (lentelės gali dar neegzistuoti)
    let dbPeriods: DbPeriod[] = []
    let dbStates: DbLocationState[] = []
    try {
      const [periodsRes, statesRes] = await Promise.all([
        supabase.from('lore_periods')
          .select('id,era_slug,name,slug,description,timeline_index,status')
          .eq('status', 'published').order('timeline_index'),
        supabase.from('lore_location_states')
          .select('location_slug,period_slug,description,image_url'),
      ])
      dbPeriods = (periodsRes.data ?? []) as DbPeriod[]
      dbStates  = (statesRes.data ?? []) as DbLocationState[]
    } catch { /* v2 lentelių dar nėra — atlasas veikia be periodų */ }

    // Factions are optional — table may not exist yet; never fail the whole fetch
    let dbFactions: DbFaction[] = []
    try {
      const factionsRes = await supabase
        .from('lore_factions')
        .select('id,name,slug,color,status')
        .eq('status', 'published')
        .order('sort_order')
      dbFactions = (factionsRes.data ?? []) as DbFaction[]
    } catch { /* lore_factions table doesn't exist yet — continue without it */ }

    // If there are no published locations yet, fall through to static data
    if (dbLocations.length === 0 && dbEras.length === 0) {
      return useStaticData()
    }

    // Build factions: prefer DB table; fall back to deriving from location faction_ids
    let factions: LoreFaction[]
    if (dbFactions.length > 0) {
      factions = dbFactions.map(mapFaction)
    } else {
      // Legacy fallback — derive faction stubs from location faction_ids strings
      const allFactionIds = new Set<string>()
      dbLocations.forEach((l) => l.faction_ids?.forEach((f) => allFactionIds.add(f)))
      factions = Array.from(allFactionIds).map((id, i) => ({
        id,
        name:  id,
        color: ERA_PALETTE[i % ERA_PALETTE.length],
      }))
    }

    const eraIndexBySlug: Record<string, number> = {}
    for (const e of dbEras) eraIndexBySlug[e.slug] = e.timeline_index

    // Globali periodo pozicija: era*1e6 + period.timeline_index*1e3
    const periodOrderBySlug: Record<string, number> = {}
    const periodGlobalOrder: Record<string, number> = {}
    for (const p of dbPeriods) {
      periodOrderBySlug[p.slug] = p.timeline_index
      periodGlobalOrder[p.slug] = (eraIndexBySlug[p.era_slug] ?? 0) * 1_000_000 + p.timeline_index * 1_000
    }

    const events = dbEvents
      .map((row) => mapEvent(row, eraIndexBySlug, periodOrderBySlug))
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))

    // Lokacijų būsenos pagal periodą (chronologine tvarka)
    const statesByLocation: Record<string, { periodId: string; order: number; description: string; imageUrl?: string }[]> = {}
    for (const s of dbStates) {
      if (!(s.period_slug in periodGlobalOrder)) continue
      const arr = statesByLocation[s.location_slug] ?? (statesByLocation[s.location_slug] = [])
      arr.push({
        periodId:    s.period_slug,
        order:       periodGlobalOrder[s.period_slug],
        description: s.description ?? '',
        imageUrl:    s.image_url ?? undefined,
      })
    }
    for (const k of Object.keys(statesByLocation)) statesByLocation[k].sort((a, b) => a.order - b.order)

    const locations = dbLocations.map((row) => ({
      ...mapLocation(row),
      states: statesByLocation[row.slug] ?? [],
    }))

    return {
      eras:       dbEras.map(mapEra),
      periods:    dbPeriods.map(mapPeriod),
      locations,
      events,
      characters: dbChars.map(mapCharacter),
      artifacts:  dbArts.map(mapArtifact),
      factions,
      source:     'supabase',
    }
  } catch {
    // Any error → fall back to static data silently
    return useStaticData()
  }
}

// ── Static fallback ───────────────────────────────────────────

function useStaticData(): LoreAtlasData {
  // Dynamic import to avoid circular import at module level
  const {
    loreEras, loreFactions, loreLocations, loreEvents, loreCharacters, loreArtifacts,
  } = require('@/data/lore')

  return {
    eras:       loreEras,
    periods:    [],
    locations:  loreLocations,
    events:     loreEvents,
    characters: loreCharacters,
    artifacts:  loreArtifacts,
    factions:   loreFactions,
    source:     'static',
  }
}
