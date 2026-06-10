'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient, getCachedUser } from '@/lib/supabase/server'
import { parseCsvArray } from '@/lib/loreAdmin'

// ── Auth guard ────────────────────────────────────────────────
async function requireAdmin() {
  const supabase = await createClient()
  const user = await getCachedUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || profile.role !== 'admin') redirect('/cards?error=no_access')
  return supabase
}

function revalidateLore() {
  revalidatePath('/admin/lore')
  revalidatePath('/lore')
}

// ════════════════════════════════════════
// ERAS
// ════════════════════════════════════════
export async function saveEra(formData: FormData) {
  const supabase = await requireAdmin()
  const id   = (formData.get('_id') as string) || null
  const name = (formData.get('name') as string)?.trim()
  const slug = (formData.get('slug') as string)?.trim()

  if (!name) redirect('/admin/lore/eras?error=' + encodeURIComponent('Pavadinimas privalomas'))
  if (!slug) redirect('/admin/lore/eras?error=' + encodeURIComponent('Slug privalomas'))

  const payload = {
    name,
    slug,
    description:    (formData.get('description') as string)?.trim() || null,
    timeline_index: parseInt((formData.get('timeline_index') as string) || '0', 10),
    status:         (formData.get('status') as string) || 'draft',
    sort_order:     parseInt((formData.get('sort_order') as string) || '0', 10),
  }

  const { error } = id
    ? await supabase.from('lore_eras').update(payload).eq('id', id)
    : await supabase.from('lore_eras').insert(payload)

  if (error) redirect('/admin/lore/eras?error=' + encodeURIComponent(error.message))
  revalidateLore()
  redirect('/admin/lore/eras')
}

export async function deleteEra(id: string): Promise<{ error?: string }> {
  const supabase = await requireAdmin()
  const { error } = await supabase.from('lore_eras').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidateLore()
  return {}
}

// ════════════════════════════════════════
// LOCATIONS
// ════════════════════════════════════════
export async function saveLocation(formData: FormData) {
  const supabase = await requireAdmin()
  const id   = (formData.get('_id') as string) || null
  const name = (formData.get('name') as string)?.trim()
  const slug = (formData.get('slug') as string)?.trim()

  if (!name) redirect('/admin/lore/locations?error=' + encodeURIComponent('Pavadinimas privalomas'))
  if (!slug) redirect('/admin/lore/locations?error=' + encodeURIComponent('Slug privalomas'))

  const payload = {
    name,
    slug,
    type:                  (formData.get('type') as string) || 'unknown',
    short_description:     (formData.get('short_description') as string)?.trim() || null,
    description:           (formData.get('description') as string)?.trim() || null,
    x:                     parseFloat((formData.get('x') as string) || '50'),
    y:                     parseFloat((formData.get('y') as string) || '50'),
    region:                (formData.get('region') as string)?.trim() || null,
    faction_ids:           parseCsvArray((formData.get('faction_ids') as string) || ''),
    related_event_ids:     parseCsvArray((formData.get('related_event_ids') as string) || ''),
    related_character_ids: parseCsvArray((formData.get('related_character_ids') as string) || ''),
    related_artifact_ids:  parseCsvArray((formData.get('related_artifact_ids') as string) || ''),
    related_card_numbers:  parseCsvArray((formData.get('related_card_numbers') as string) || ''),
    first_era_index:       parseInt((formData.get('first_era_index') as string) || '0', 10),
    image_url:             (formData.get('image_url') as string)?.trim() || null,
    status:                (formData.get('status') as string) || 'draft',
    sort_order:            parseInt((formData.get('sort_order') as string) || '0', 10),
  }

  const { error } = id
    ? await supabase.from('lore_locations').update(payload).eq('id', id)
    : await supabase.from('lore_locations').insert(payload)

  if (error) redirect('/admin/lore/locations?error=' + encodeURIComponent(error.message))
  revalidateLore()
  redirect('/admin/lore/locations')
}

export async function deleteLocation(id: string): Promise<{ error?: string }> {
  const supabase = await requireAdmin()
  const { error } = await supabase.from('lore_locations').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidateLore()
  return {}
}

// ════════════════════════════════════════
// EVENTS
// ════════════════════════════════════════
export async function saveLoreEvent(formData: FormData) {
  const supabase = await requireAdmin()
  const id    = (formData.get('_id') as string) || null
  const title = (formData.get('title') as string)?.trim()
  const slug  = (formData.get('slug') as string)?.trim()

  if (!title) redirect('/admin/lore/events?error=' + encodeURIComponent('Pavadinimas privalomas'))
  if (!slug)  redirect('/admin/lore/events?error=' + encodeURIComponent('Slug privalomas'))

  const payload = {
    title,
    slug,
    summary:             (formData.get('summary') as string)?.trim() || null,
    full_text:           (formData.get('full_text') as string)?.trim() || null,
    era_slug:            (formData.get('era_slug') as string)?.trim() || null,
    timeline_index:      parseInt((formData.get('timeline_index') as string) || '0', 10),
    location_slug:       (formData.get('location_slug') as string)?.trim() || null,
    faction_ids:         parseCsvArray((formData.get('faction_ids') as string) || ''),
    character_slugs:     parseCsvArray((formData.get('character_slugs') as string) || ''),
    artifact_slugs:      parseCsvArray((formData.get('artifact_slugs') as string) || ''),
    related_card_numbers:parseCsvArray((formData.get('related_card_numbers') as string) || ''),
    source_type:         (formData.get('source_type') as string)?.trim() || null,
    source_title:        (formData.get('source_title') as string)?.trim() || null,
    event_type:          (formData.get('event_type') as string)?.trim() || null,
    status:              (formData.get('status') as string) || 'draft',
    sort_order:          parseInt((formData.get('sort_order') as string) || '0', 10),
  }

  const { error } = id
    ? await supabase.from('lore_events').update(payload).eq('id', id)
    : await supabase.from('lore_events').insert(payload)

  if (error) redirect('/admin/lore/events?error=' + encodeURIComponent(error.message))
  revalidateLore()
  redirect('/admin/lore/events')
}

export async function deleteLoreEvent(id: string): Promise<{ error?: string }> {
  const supabase = await requireAdmin()
  const { error } = await supabase.from('lore_events').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidateLore()
  return {}
}

// ════════════════════════════════════════
// CHARACTERS
// ════════════════════════════════════════
export async function saveCharacter(formData: FormData) {
  const supabase = await requireAdmin()
  const id   = (formData.get('_id') as string) || null
  const name = (formData.get('name') as string)?.trim()
  const slug = (formData.get('slug') as string)?.trim()

  if (!name) redirect('/admin/lore/characters?error=' + encodeURIComponent('Pavadinimas privalomas'))
  if (!slug) redirect('/admin/lore/characters?error=' + encodeURIComponent('Slug privalomas'))

  const payload = {
    name,
    slug,
    faction_id:          (formData.get('faction_id') as string)?.trim() || null,
    role:                (formData.get('role') as string)?.trim() || null,
    status_value:        (formData.get('status_value') as string)?.trim() || 'unknown',
    short_description:   (formData.get('short_description') as string)?.trim() || null,
    description:         (formData.get('description') as string)?.trim() || null,
    related_event_slugs: parseCsvArray((formData.get('related_event_slugs') as string) || ''),
    related_card_numbers:parseCsvArray((formData.get('related_card_numbers') as string) || ''),
    image_url:           (formData.get('image_url') as string)?.trim() || null,
    status:              (formData.get('status') as string) || 'draft',
    sort_order:          parseInt((formData.get('sort_order') as string) || '0', 10),
  }

  const { error } = id
    ? await supabase.from('lore_characters').update(payload).eq('id', id)
    : await supabase.from('lore_characters').insert(payload)

  if (error) redirect('/admin/lore/characters?error=' + encodeURIComponent(error.message))
  revalidateLore()
  redirect('/admin/lore/characters')
}

export async function deleteCharacter(id: string): Promise<{ error?: string }> {
  const supabase = await requireAdmin()
  const { error } = await supabase.from('lore_characters').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidateLore()
  return {}
}

// ════════════════════════════════════════
// ARTIFACTS
// ════════════════════════════════════════
export async function saveArtifact(formData: FormData) {
  const supabase = await requireAdmin()
  const id   = (formData.get('_id') as string) || null
  const name = (formData.get('name') as string)?.trim()
  const slug = (formData.get('slug') as string)?.trim()

  if (!name) redirect('/admin/lore/artifacts?error=' + encodeURIComponent('Pavadinimas privalomas'))
  if (!slug) redirect('/admin/lore/artifacts?error=' + encodeURIComponent('Slug privalomas'))

  const payload = {
    name,
    slug,
    artifact_type:         (formData.get('artifact_type') as string)?.trim() || null,
    short_description:     (formData.get('short_description') as string)?.trim() || null,
    description:           (formData.get('description') as string)?.trim() || null,
    current_location_slug: (formData.get('current_location_slug') as string)?.trim() || null,
    related_event_slugs:   parseCsvArray((formData.get('related_event_slugs') as string) || ''),
    related_card_numbers:  parseCsvArray((formData.get('related_card_numbers') as string) || ''),
    image_url:             (formData.get('image_url') as string)?.trim() || null,
    status:                (formData.get('status') as string) || 'draft',
    sort_order:            parseInt((formData.get('sort_order') as string) || '0', 10),
  }

  const { error } = id
    ? await supabase.from('lore_artifacts').update(payload).eq('id', id)
    : await supabase.from('lore_artifacts').insert(payload)

  if (error) redirect('/admin/lore/artifacts?error=' + encodeURIComponent(error.message))
  revalidateLore()
  redirect('/admin/lore/artifacts')
}

export async function deleteArtifact(id: string): Promise<{ error?: string }> {
  const supabase = await requireAdmin()
  const { error } = await supabase.from('lore_artifacts').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidateLore()
  return {}
}

// ════════════════════════════════════════
// XML BULK IMPORT
// ════════════════════════════════════════

type ImportResult = {
  inserted: { eras: number; locations: number; events: number; characters: number; artifacts: number; factions: number }
  errors: string[]
}

/** Pull every attribute from one XML self-closing tag string */
function xmlAttrs(tag: string): Record<string, string> {
  const result: Record<string, string> = {}
  const re = /(\w+)="([^"]*)"/g
  let m
  while ((m = re.exec(tag)) !== null) result[m[1]] = m[2]
  return result
}

/** Return all self-closing <tagName .../> occurrences as attribute maps */
function xmlFind(xml: string, tagName: string): Record<string, string>[] {
  // Matches both <tag .../> and <tag ...></tag>
  const re = new RegExp(`<${tagName}(?:\\s+([^>]*?))?\\s*/?>`, 'gsi')
  const out: Record<string, string>[] = []
  let m
  while ((m = re.exec(xml)) !== null) out.push(xmlAttrs(m[0]))
  return out
}

function csv(s?: string): string[] {
  if (!s) return []
  return s.split(',').map((x) => x.trim()).filter(Boolean)
}

export async function bulkImportLore(formData: FormData): Promise<ImportResult> {
  const supabase = await requireAdmin()
  const xml = (formData.get('xml') as string | null)?.trim() ?? ''
  if (!xml) return { inserted: { eras: 0, locations: 0, events: 0, characters: 0, artifacts: 0, factions: 0 }, errors: ['XML laukas tuščias'] }

  const errors: string[] = []
  let erasOk = 0, locsOk = 0, eventsOk = 0, charsOk = 0, artsOk = 0, factionsOk = 0

  // ── Eras ──────────────────────────────────────
  for (const a of xmlFind(xml, 'era')) {
    if (!a.name || !a.slug) { errors.push(`Era: trūksta name arba slug`); continue }
    const { error } = await supabase.from('lore_eras').upsert({
      name:           a.name.trim(),
      slug:           a.slug.trim(),
      description:    a.description?.trim() || null,
      timeline_index: parseInt(a.timeline_index ?? '0', 10),
      sort_order:     parseInt(a.sort_order     ?? '0', 10),
      status:         a.status ?? 'draft',
    }, { onConflict: 'slug' })
    if (error) errors.push(`Era "${a.name}": ${error.message}`)
    else erasOk++
  }

  // ── Locations ─────────────────────────────────
  for (const a of xmlFind(xml, 'location')) {
    if (!a.name || !a.slug) { errors.push(`Location: trūksta name arba slug`); continue }
    const { error } = await supabase.from('lore_locations').upsert({
      name:                  a.name.trim(),
      slug:                  a.slug.trim(),
      type:                  a.type ?? 'miestas',
      x:                     parseFloat(a.x ?? '50'),
      y:                     parseFloat(a.y ?? '50'),
      first_era_index:       parseInt(a.first_era_index ?? '0', 10),
      region:                a.region?.trim() || null,
      short_description:     a.short_description?.trim() || null,
      description:           a.description?.trim() || null,
      faction_ids:           csv(a.faction_ids),
      related_card_numbers:  csv(a.related_card_numbers),
      sort_order:            parseInt(a.sort_order ?? '0', 10),
      status:                a.status ?? 'draft',
    }, { onConflict: 'slug' })
    if (error) errors.push(`Location "${a.name}": ${error.message}`)
    else locsOk++
  }

  // ── Lore events ───────────────────────────────
  for (const a of xmlFind(xml, 'event')) {
    if (!a.title || !a.slug) { errors.push(`Event: trūksta title arba slug`); continue }
    const { error } = await supabase.from('lore_events').upsert({
      title:                a.title.trim(),
      slug:                 a.slug.trim(),
      summary:              a.summary?.trim() || null,
      full_text:            a.full_text?.trim() || null,
      era_slug:             a.era_slug?.trim() || null,
      timeline_index:       parseInt(a.timeline_index ?? '0', 10),
      location_slug:        a.location_slug?.trim() || null,
      event_type:           a.event_type?.trim() || null,
      related_card_numbers: csv(a.related_card_numbers),
      sort_order:           parseInt(a.sort_order ?? '0', 10),
      status:               a.status ?? 'draft',
    }, { onConflict: 'slug' })
    if (error) errors.push(`Event "${a.title}": ${error.message}`)
    else eventsOk++
  }

  // ── Characters ────────────────────────────────
  for (const a of xmlFind(xml, 'character')) {
    if (!a.name || !a.slug) { errors.push(`Character: trūksta name arba slug`); continue }
    const { error } = await supabase.from('lore_characters').upsert({
      name:                  a.name.trim(),
      slug:                  a.slug.trim(),
      faction_id:            a.faction_id?.trim() || null,
      role:                  a.role?.trim() || null,
      status_value:          a.status_value?.trim() || 'unknown',
      short_description:     a.short_description?.trim() || null,
      description:           a.description?.trim() || null,
      related_card_numbers:  csv(a.related_card_numbers),
      sort_order:            parseInt(a.sort_order ?? '0', 10),
      status:                a.status ?? 'draft',
    }, { onConflict: 'slug' })
    if (error) errors.push(`Character "${a.name}": ${error.message}`)
    else charsOk++
  }

  // ── Artifacts ─────────────────────────────────
  for (const a of xmlFind(xml, 'artifact')) {
    if (!a.name || !a.slug) { errors.push(`Artifact: trūksta name arba slug`); continue }
    const { error } = await supabase.from('lore_artifacts').upsert({
      name:                  a.name.trim(),
      slug:                  a.slug.trim(),
      artifact_type:         a.artifact_type?.trim() || null,
      short_description:     a.short_description?.trim() || null,
      description:           a.description?.trim() || null,
      current_location_slug: a.current_location_slug?.trim() || null,
      related_event_slugs:   csv(a.related_event_slugs),
      related_card_numbers:  csv(a.related_card_numbers),
      sort_order:            parseInt(a.sort_order ?? '0', 10),
      status:                a.status ?? 'draft',
    }, { onConflict: 'slug' })
    if (error) errors.push(`Artifact "${a.name}": ${error.message}`)
    else artsOk++
  }

  // ── Factions ──────────────────────────────────
  for (const a of xmlFind(xml, 'faction')) {
    if (!a.name || !a.slug) { errors.push(`Faction: trūksta name arba slug`); continue }
    const { error } = await supabase.from('lore_factions').upsert({
      name:        a.name.trim(),
      slug:        a.slug.trim(),
      color:       a.color?.trim() || '#d4af37',
      description: a.description?.trim() || null,
      sort_order:  parseInt(a.sort_order ?? '0', 10),
      status:      a.status ?? 'draft',
    }, { onConflict: 'slug' })
    if (error) errors.push(`Faction "${a.name}": ${error.message}`)
    else factionsOk++
  }

  revalidateLore()
  return { inserted: { eras: erasOk, locations: locsOk, events: eventsOk, characters: charsOk, artifacts: artsOk, factions: factionsOk }, errors }
}

// ════════════════════════════════════════
// FACTIONS
// ════════════════════════════════════════
export async function saveFaction(formData: FormData) {
  const supabase = await requireAdmin()
  const id   = (formData.get('_id') as string) || null
  const name = (formData.get('name') as string)?.trim()
  const slug = (formData.get('slug') as string)?.trim()

  if (!name) redirect('/admin/lore/factions?error=' + encodeURIComponent('Pavadinimas privalomas'))
  if (!slug) redirect('/admin/lore/factions?error=' + encodeURIComponent('Slug privalomas'))

  const payload = {
    name,
    slug,
    color:       (formData.get('color') as string)?.trim() || '#d4af37',
    description: (formData.get('description') as string)?.trim() || null,
    status:      (formData.get('status') as string) || 'draft',
    sort_order:  parseInt((formData.get('sort_order') as string) || '0', 10),
  }

  const { error } = id
    ? await supabase.from('lore_factions').update(payload).eq('id', id)
    : await supabase.from('lore_factions').insert(payload)

  if (error) redirect('/admin/lore/factions?error=' + encodeURIComponent(error.message))
  revalidateLore()
  redirect('/admin/lore/factions')
}

export async function deleteFaction(id: string): Promise<{ error?: string }> {
  const supabase = await requireAdmin()
  const { error } = await supabase.from('lore_factions').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidateLore()
  return {}
}

// ════════════════════════════════════════
// CARD ↔ LORE LINKING
// ════════════════════════════════════════

export async function setCardLoreLinks(
  cardNumber: string,
  locationSlugs: string[],
  characterSlugs: string[],
  artifactSlugs: string[],
): Promise<{ error?: string }> {
  const supabase = await requireAdmin()

  // 1. Remove card from all lore entities that currently reference it
  const tables = [
    { table: 'lore_locations',  col: 'related_card_numbers' },
    { table: 'lore_characters', col: 'related_card_numbers' },
    { table: 'lore_artifacts',  col: 'related_card_numbers' },
  ] as const

  for (const { table, col } of tables) {
    const { data: rows } = await supabase
      .from(table)
      .select('id, slug, related_card_numbers')
      .contains(col, [cardNumber])

    for (const row of rows ?? []) {
      const newArr = ((row as Record<string, string[]>)[col] ?? []).filter((n: string) => n !== cardNumber)
      await supabase.from(table).update({ [col]: newArr }).eq('id', row.id)
    }
  }

  // 2. Add card to newly selected entities
  async function addToSlugs(table: string, slugs: string[]) {
    for (const slug of slugs) {
      const { data: row } = await supabase
        .from(table)
        .select('id, related_card_numbers')
        .eq('slug', slug)
        .single()
      if (!row) continue
      const existing: string[] = (row as Record<string, string[]>).related_card_numbers ?? []
      if (!existing.includes(cardNumber)) {
        await supabase.from(table).update({ related_card_numbers: [...existing, cardNumber] }).eq('id', row.id)
      }
    }
  }

  await addToSlugs('lore_locations',  locationSlugs)
  await addToSlugs('lore_characters', characterSlugs)
  await addToSlugs('lore_artifacts',  artifactSlugs)

  revalidateLore()
  revalidatePath('/admin/cards')
  return {}
}
