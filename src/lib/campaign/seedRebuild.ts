// ════════════════════════════════════════════════════════════════════════════
// Seed / Rebuild — turns a code-defined CampaignSeed into DB rows with SAFE MERGE.
// Entities are matched by stable seedKey (campaigns: metadata.seedKey; chapters/
// nodes/cutscenes: seed_key column). Two modes:
//   • 'merge' (default, safe): create missing entities; for existing ones, only
//     FILL empty/default fields — never overwrite manually edited text, positions
//     or gameplay config that already has a value.
//   • 'reset': overwrite everything from the seed (also removes the old generic
//     sample campaign so there are no duplicates).
// Runs client-side with the admin's RLS (admins already have write access).
// ════════════════════════════════════════════════════════════════════════════

import { createClient } from '@/lib/supabase/client'
import type { CampaignSeed, SeedNode } from './seedTypes'

export type RebuildMode = 'merge' | 'reset'
export interface RebuildReport {
  ok: boolean
  mode: RebuildMode
  log: string[]
  counts: { created: number; updated: number; skipped: number }
  error?: string
}

const OLD_SAMPLE_SLUG = 'prazaro-kilme-varnagrado-uzrakinimas' // pre-canon generic seed

const isEmpty = (v: unknown): boolean =>
  v === null || v === undefined || v === '' ||
  (Array.isArray(v) && v.length === 0) ||
  (typeof v === 'object' && !Array.isArray(v) && Object.keys(v as object).length === 0)

/** Build a patch that only fills columns empty in `existing` (safe-merge). */
function fillPatch(existing: Record<string, unknown>, desired: Record<string, unknown>): Record<string, unknown> {
  const patch: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(desired)) {
    if (isEmpty(existing[k])) patch[k] = v
  }
  return patch
}

export async function rebuildCampaign(seed: CampaignSeed, mode: RebuildMode = 'merge'): Promise<RebuildReport> {
  const supabase = createClient()
  const log: string[] = []
  const counts = { created: 0, updated: 0, skipped: 0 }
  try {
    // factions name → id
    const { data: facs } = await supabase.from('factions').select('id, name')
    const facId = new Map((facs ?? []).map((f: { id: number; name: string }) => [f.name, f.id]))

    // story decks (created by 20260710 cards migration) — name → id
    const { data: decks } = await supabase.from('decks').select('id, name').like('name', '[Kampanija]%')
    const deckId = new Map((decks ?? []).map((d: { id: string; name: string }) => [d.name, d.id]))
    const PKG_DECK: Record<string, string> = {
      pkg1: '[Kampanija] Varngrado gynėjai',
      pkg2: '[Kampanija] Trijų jėgų frontas',
      pkg3: '[Kampanija] Varngrado Užraktas',
    }

    // ── reset cleanup: drop the old generic sample so we don't keep duplicates ──
    if (mode === 'reset') {
      const { data: old } = await supabase.from('campaigns').select('id, metadata').eq('slug', OLD_SAMPLE_SLUG)
      for (const c of old ?? []) {
        const sk = (c.metadata as { seedKey?: string } | null)?.seedKey
        if (sk !== seed.campaign.seedKey) {
          await supabase.from('campaigns').delete().eq('id', (c as { id: string }).id)
          log.push('🗑 Pašalinta sena pavyzdinė kampanija (Varnagrado).')
        }
      }
    }

    // ── campaign (match by metadata.seedKey) ──
    const campDesired = {
      slug: seed.campaign.slug, title: seed.campaign.title, subtitle: seed.campaign.subtitle ?? null,
      description: seed.campaign.description ?? null, campaign_type: seed.campaign.campaignType,
      lore_period: seed.campaign.lorePeriod ?? null, related_factions: seed.campaign.relatedFactions,
      cover_image_url: seed.campaign.coverImageUrl ?? null, map_image_url: seed.campaign.mapImageUrl ?? null,
      visibility: seed.campaign.visibility ?? 'draft',
      metadata: { seedKey: seed.campaign.seedKey },
    }
    const { data: campExisting } = await supabase.from('campaigns').select('*')
      .filter('metadata->>seedKey', 'eq', seed.campaign.seedKey).maybeSingle()

    let campaignId: string
    if (!campExisting) {
      const { data, error } = await supabase.from('campaigns').insert(campDesired).select('id').single()
      if (error) throw error
      campaignId = data.id; counts.created++; log.push('➕ Sukurta kampanija.')
    } else {
      campaignId = campExisting.id
      const patch = mode === 'reset' ? campDesired : fillPatch(campExisting, campDesired)
      // never clobber metadata.seedKey
      if (mode !== 'reset') delete (patch as Record<string, unknown>).metadata
      if (Object.keys(patch).length) { await supabase.from('campaigns').update(patch).eq('id', campaignId); counts.updated++; log.push('✏️ Atnaujinta kampanija.') }
      else counts.skipped++
    }

    // ── chapters (by seed_key) ──
    const chapterId = new Map<string, string>()
    for (const ch of seed.chapters) {
      const desired = { campaign_id: campaignId, seed_key: ch.seedKey, title: ch.title, description: ch.description ?? null, sort_order: ch.sortOrder, narration: ch.narration ?? null }
      const { data: ex } = await supabase.from('campaign_chapters').select('*').eq('campaign_id', campaignId).eq('seed_key', ch.seedKey).maybeSingle()
      if (!ex) { const { data } = await supabase.from('campaign_chapters').insert(desired).select('id').single(); chapterId.set(ch.seedKey, data!.id); counts.created++ }
      else { chapterId.set(ch.seedKey, ex.id); const patch = mode === 'reset' ? desired : fillPatch(ex, desired); if (Object.keys(patch).length) { await supabase.from('campaign_chapters').update(patch).eq('id', ex.id); counts.updated++ } else counts.skipped++ }
    }

    // ── cutscenes (by seed_key) ──
    const cutsceneId = new Map<string, string>()
    for (const cs of seed.cutscenes) {
      const desired = { campaign_id: campaignId, seed_key: cs.seedKey, title: cs.title, type: cs.type,
        background_image_url: cs.backgroundImageUrl ?? null, background_video_url: cs.backgroundVideoUrl ?? null,
        music_url: cs.musicUrl ?? null, ambient_url: cs.ambientUrl ?? null,
        skippable: cs.skippable ?? true, autoplay: cs.autoplay ?? false, steps: cs.steps }
      const { data: ex } = await supabase.from('campaign_cutscenes').select('*').eq('campaign_id', campaignId).eq('seed_key', cs.seedKey).maybeSingle()
      if (!ex) { const { data } = await supabase.from('campaign_cutscenes').insert(desired).select('id').single(); cutsceneId.set(cs.seedKey, data!.id); counts.created++ }
      else { cutsceneId.set(cs.seedKey, ex.id); const patch = mode === 'reset' ? desired : fillPatch(ex, desired); if (Object.keys(patch).length) { await supabase.from('campaign_cutscenes').update(patch).eq('id', ex.id); counts.updated++ } else counts.skipped++ }
    }

    // ── nodes pass 1: upsert core fields (no prev/next yet, need ids) ──
    const nodeId = new Map<string, string>()
    const buildNodeRow = (n: SeedNode) => ({
      campaign_id: campaignId, seed_key: n.seedKey, chapter_id: n.chapterSeedKey ? (chapterId.get(n.chapterSeedKey) ?? null) : null,
      title: n.title, subtitle: n.subtitle ?? null, description: n.description ?? null, lore_text: n.loreText ?? null,
      pos_x: n.posX, pos_y: n.posY, icon_type: n.iconType, mission_type: n.missionType,
      unlock_rule: n.unlockRule ?? { type: 'all_prev' }, objectives: n.objectives ?? [],
      pre_cutscene_id: n.preCutsceneSeedKey ? (cutsceneId.get(n.preCutsceneSeedKey) ?? null) : null,
      post_cutscene_id: n.postCutsceneSeedKey ? (cutsceneId.get(n.postCutsceneSeedKey) ?? null) : null,
      failure_cutscene_id: n.failureCutsceneSeedKey ? (cutsceneId.get(n.failureCutsceneSeedKey) ?? null) : null,
      battle_config: resolveBattle(n, facId, deckId, PKG_DECK), scenario: n.scenario ?? {}, reward_payload: n.rewardPayload ?? {},
      status: n.status ?? 'active', source_chapter: n.sourceChapter ?? null, source_event_ids: n.sourceEventIds ?? [],
      canon_summary: n.canonSummary ?? null, canon_characters: n.canonCharacters ?? [], canon_locations: n.canonLocations ?? [],
    })
    for (const n of seed.nodes) {
      const desired = buildNodeRow(n)
      const { data: ex } = await supabase.from('campaign_nodes').select('*').eq('campaign_id', campaignId).eq('seed_key', n.seedKey).maybeSingle()
      if (!ex) { const { data } = await supabase.from('campaign_nodes').insert(desired).select('id').single(); nodeId.set(n.seedKey, data!.id); counts.created++ }
      else { nodeId.set(n.seedKey, ex.id); const patch = mode === 'reset' ? desired : fillPatch(ex, desired); if (Object.keys(patch).length) { await supabase.from('campaign_nodes').update(patch).eq('id', ex.id); counts.updated++ } else counts.skipped++ }
    }

    // ── nodes pass 2: resolve prev/next seedKeys → ids ──
    for (const n of seed.nodes) {
      const id = nodeId.get(n.seedKey); if (!id) continue
      const prev = (n.prevSeedKeys ?? []).map((k) => nodeId.get(k)).filter(Boolean)
      const next = (n.nextSeedKeys ?? []).map((k) => nodeId.get(k)).filter(Boolean)
      // In merge mode, only set connections if the row had none (preserve manual edits)
      const { data: ex } = await supabase.from('campaign_nodes').select('prev_node_ids, next_node_ids').eq('id', id).maybeSingle()
      const conn: Record<string, unknown> = {}
      if (mode === 'reset' || isEmpty(ex?.prev_node_ids)) conn.prev_node_ids = prev
      if (mode === 'reset' || isEmpty(ex?.next_node_ids)) conn.next_node_ids = next
      if (Object.keys(conn).length) await supabase.from('campaign_nodes').update(conn).eq('id', id)
    }

    // ── start node ──
    const startId = nodeId.get('node00')
    if (startId) await supabase.from('campaigns').update({ start_node_id: startId }).eq('id', campaignId)

    log.push(`✓ ${mode === 'reset' ? 'Pilnas perrašymas' : 'Saugus sujungimas'} baigtas.`)
    return { ok: true, mode, log, counts }
  } catch (e) {
    return { ok: false, mode, log, counts, error: (e as Error).message }
  }
}

/** Resolve enemyFactionName → enemy_faction_id and strip seed-only doc keys. */
function resolveBattle(
  n: SeedNode, facId: Map<string, number>,
  deckId: Map<string, string>, pkgDeck: Record<string, string>,
): Record<string, unknown> {
  const bc = { ...(n.battleConfig ?? {}) } as Record<string, unknown>
  const fname = bc.enemyFactionName as string | undefined
  if (fname && facId.has(fname)) bc.enemyFactionId = facId.get(fname)
  delete bc.enemyFactionName
  // story deck: map package → deck id; force 'story' mode so the canon deck is used.
  const pkg = bc.storyDeckPackage as string | undefined
  if (pkg && pkgDeck[pkg] && deckId.has(pkgDeck[pkg])) {
    bc.storyDeckId = deckId.get(pkgDeck[pkg])
    bc.playerDeckMode = 'story'
  }
  return bc
}
