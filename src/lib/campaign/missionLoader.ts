// ════════════════════════════════════════════════════════════════════════════
// Mission / Campaign loader — Supabase IO + row↔model mapping + node-state calc.
// Shared by player runtime and admin builder.
// ════════════════════════════════════════════════════════════════════════════

import { createClient } from '@/lib/supabase/client'
import type {
  Campaign, CampaignChapter, CampaignNode, Cutscene, CampaignProgress,
  NodeView, NodeVisualState, MissionResult, BattleConfig, ScenarioConfig, RewardPayload,
} from './types'

export const ATLAS_MAP = '/maps/ravenof-world-map.png'
export const ATLAS_W = 1448
export const ATLAS_H = 1086

/* eslint-disable @typescript-eslint/no-explicit-any */
export function mapCampaignRow(r: any): Campaign {
  return {
    id: r.id, slug: r.slug, title: r.title, subtitle: r.subtitle, description: r.description,
    coverImageUrl: r.cover_image_url, campaignType: r.campaign_type, lorePeriod: r.lore_period,
    relatedFactions: r.related_factions ?? [], mapImageUrl: r.map_image_url,
    mapNaturalW: r.map_natural_w ?? ATLAS_W, mapNaturalH: r.map_natural_h ?? ATLAS_H,
    startNodeId: r.start_node_id, visibility: r.visibility, requiredLevel: r.required_level ?? 0,
    requiredProgress: r.required_progress ?? {}, sortOrder: r.sort_order ?? 0, metadata: r.metadata ?? {},
    createdAt: r.created_at, updatedAt: r.updated_at,
  }
}

export function mapChapterRow(r: any): CampaignChapter {
  return {
    id: r.id, campaignId: r.campaign_id, title: r.title, description: r.description,
    sortOrder: r.sort_order ?? 0, backgroundImageUrl: r.background_image_url,
    backgroundVideoUrl: r.background_video_url, narration: r.narration, metadata: r.metadata ?? {},
  }
}

export function mapNodeRow(r: any): CampaignNode {
  return {
    id: r.id, campaignId: r.campaign_id, chapterId: r.chapter_id, title: r.title, subtitle: r.subtitle,
    description: r.description, loreText: r.lore_text, posX: Number(r.pos_x ?? 50), posY: Number(r.pos_y ?? 50),
    iconType: r.icon_type ?? 'battle', nodeColor: r.node_color, missionType: r.mission_type,
    unlockRule: r.unlock_rule ?? { type: 'all_prev' }, prevNodeIds: r.prev_node_ids ?? [],
    nextNodeIds: r.next_node_ids ?? [], branchChoice: r.branch_choice ?? null,
    objectives: r.objectives ?? [], preCutsceneId: r.pre_cutscene_id, postCutsceneId: r.post_cutscene_id,
    failureCutsceneId: r.failure_cutscene_id, battleConfig: (r.battle_config ?? {}) as BattleConfig,
    scenario: (r.scenario ?? {}) as ScenarioConfig, rewardPayload: (r.reward_payload ?? {}) as RewardPayload,
    replay: r.replay ?? { allowed: true }, difficulty: r.difficulty ?? {}, adminNotes: r.admin_notes,
    status: r.status ?? 'active', sortOrder: r.sort_order ?? 0,
  }
}

export function mapCutsceneRow(r: any): Cutscene {
  return {
    id: r.id, campaignId: r.campaign_id, title: r.title, type: r.type,
    backgroundImageUrl: r.background_image_url, backgroundVideoUrl: r.background_video_url,
    musicUrl: r.music_url, ambientUrl: r.ambient_url, skippable: r.skippable ?? true,
    autoplay: r.autoplay ?? false, steps: r.steps ?? [], metadata: r.metadata ?? {},
  }
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export async function loadCampaigns(opts?: { includeHidden?: boolean }): Promise<Campaign[]> {
  const supabase = createClient()
  let q = supabase.from('campaigns').select('*').order('sort_order')
  if (!opts?.includeHidden) q = q.eq('visibility', 'active')
  const { data } = await q
  return (data ?? []).map(mapCampaignRow)
}

export interface FullCampaign {
  campaign: Campaign
  chapters: CampaignChapter[]
  nodes: CampaignNode[]
  cutscenes: Cutscene[]
}

export async function loadFullCampaign(idOrSlug: string): Promise<FullCampaign | null> {
  const supabase = createClient()
  const isUuid = /^[0-9a-f]{8}-/i.test(idOrSlug)
  const { data: c } = await supabase.from('campaigns').select('*')
    .eq(isUuid ? 'id' : 'slug', idOrSlug).maybeSingle()
  if (!c) return null
  const campaignId = c.id
  const [chap, nodes, cuts] = await Promise.all([
    supabase.from('campaign_chapters').select('*').eq('campaign_id', campaignId).order('sort_order'),
    supabase.from('campaign_nodes').select('*').eq('campaign_id', campaignId).order('sort_order'),
    supabase.from('campaign_cutscenes').select('*').eq('campaign_id', campaignId),
  ])
  return {
    campaign: mapCampaignRow(c),
    chapters: (chap.data ?? []).map(mapChapterRow),
    nodes: (nodes.data ?? []).map(mapNodeRow),
    cutscenes: (cuts.data ?? []).map(mapCutsceneRow),
  }
}

export async function loadProgress(campaignId: string): Promise<CampaignProgress | null> {
  const supabase = createClient()
  const { data } = await supabase.rpc('rvn_campaign_state', { p_campaign: campaignId })
  if (!data) return null
  const d = data as Record<string, unknown>
  return {
    campaignId: String(d.campaignId),
    completedNodeIds: (d.completedNodeIds as string[]) ?? [],
    unlockedNodeIds: (d.unlockedNodeIds as string[]) ?? [],
    nodeStars: (d.nodeStars as Record<string, number>) ?? {},
    nodeObjectives: (d.nodeObjectives as Record<string, string[]>) ?? {},
    failedAttempts: (d.failedAttempts as Record<string, number>) ?? {},
    rewardsClaimed: (d.rewardsClaimed as string[]) ?? [],
    choices: (d.choices as Record<string, string>) ?? {},
    cutscenesWatched: (d.cutscenesWatched as string[]) ?? [],
    currentChapterId: (d.currentChapterId as string) ?? null,
    lastNodeId: (d.lastNodeId as string) ?? null,
    difficulty: (d.difficulty as string) ?? null,
  }
}

export async function completeNode(result: MissionResult): Promise<{ ok: boolean; unlocked: string[]; firstClear: boolean }> {
  const supabase = createClient()
  const { data } = await supabase.rpc('rvn_campaign_complete_node', {
    p_payload: {
      nodeId: result.nodeId, result: result.result, stars: result.stars,
      objectives: result.objectives, choiceKey: result.choiceKey,
    },
  })
  const d = (data ?? {}) as Record<string, unknown>
  return { ok: !!d.ok, unlocked: (d.unlocked as string[]) ?? [], firstClear: !!d.firstClear }
}

export async function markCutsceneWatched(campaignId: string, cutsceneId: string): Promise<void> {
  const supabase = createClient()
  await supabase.rpc('rvn_campaign_mark_cutscene', { p_campaign: campaignId, p_cutscene: cutsceneId })
}

/** Derive per-node UI state from progress. Pure. */
export function computeNodeViews(nodes: CampaignNode[], progress: CampaignProgress | null): NodeView[] {
  const completed = new Set(progress?.completedNodeIds ?? [])
  const unlocked = new Set(progress?.unlockedNodeIds ?? [])
  const current = progress?.lastNodeId
  return nodes.filter((n) => n.status !== 'hidden').map((n) => {
    let state: NodeVisualState
    if (completed.has(n.id)) state = 'completed'
    else if (unlocked.has(n.id)) state = (n.id === current ? 'current' : 'available')
    else state = 'locked'
    return { ...n, state, stars: progress?.nodeStars?.[n.id] ?? 0 }
  })
}

export function cutsceneById(cutscenes: Cutscene[], id?: string | null): Cutscene | null {
  if (!id) return null
  return cutscenes.find((c) => c.id === id) ?? null
}
