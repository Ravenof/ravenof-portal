'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { parseCsvArray } from '@/lib/loreAdmin'

// ── Auth guard ────────────────────────────────────────────────
async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
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
export async function saveEra(_prev: unknown, formData: FormData) {
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
export async function saveLocation(_prev: unknown, formData: FormData) {
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
export async function saveLoreEvent(_prev: unknown, formData: FormData) {
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
export async function saveCharacter(_prev: unknown, formData: FormData) {
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
export async function saveArtifact(_prev: unknown, formData: FormData) {
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
