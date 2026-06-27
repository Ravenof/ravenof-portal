// ════════════════════════════════════════════════════════════════════════════
// Campaign validation — surfaces errors/warnings in the admin builder.
// Pure functions; no IO. Used by the Validation panel and on save.
// ════════════════════════════════════════════════════════════════════════════

import type { Campaign, CampaignNode, Cutscene } from './types'

export interface ValidationIssue {
  level: 'error' | 'warning'
  scope: string       // 'campaign' | nodeId | cutsceneId
  message: string
}

export function validateCampaign(
  campaign: Campaign, nodes: CampaignNode[], cutscenes: Cutscene[], knownCardIds?: Set<string>,
): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  const push = (level: ValidationIssue['level'], scope: string, message: string) =>
    issues.push({ level, scope, message })

  if (!campaign.title?.trim()) push('error', 'campaign', 'Trūksta kampanijos pavadinimo.')
  if (!campaign.slug?.trim()) push('error', 'campaign', 'Trūksta „slug" (URL).')

  const nodeIds = new Set(nodes.map((n) => n.id))
  const cutsceneIds = new Set(cutscenes.map((c) => c.id))

  if (!nodes.length) {
    push('error', 'campaign', 'Kampanija neturi nė vieno mazgo (misijos).')
  } else {
    const start = campaign.startNodeId
    if (!start) push('error', 'campaign', 'Nenustatytas pradinis mazgas (start node).')
    else if (!nodeIds.has(start)) push('error', 'campaign', 'Pradinis mazgas nerastas mazgų sąraše.')
  }

  for (const n of nodes) {
    const s = n.id
    if (n.posX == null || n.posY == null) push('error', s, `Mazgas „${n.title}" be pozicijos žemėlapyje.`)
    // broken connections
    for (const id of n.nextNodeIds ?? []) if (!nodeIds.has(id)) push('error', s, `„${n.title}" rodo į neegzistuojantį kitą mazgą.`)
    for (const id of n.prevNodeIds ?? []) if (!nodeIds.has(id)) push('error', s, `„${n.title}" remiasi neegzistuojančiu ankstesniu mazgu.`)
    // cutscene references
    for (const [k, id] of [['pre', n.preCutsceneId], ['post', n.postCutsceneId], ['fail', n.failureCutsceneId]] as const) {
      if (id && !cutsceneIds.has(id)) push('warning', s, `„${n.title}" ${k}-cutscene nuoroda neegzistuoja.`)
    }
    // battle config for battle missions
    const isBattle = n.missionType !== 'STORY_ONLY'
    if (isBattle) {
      const bc = n.battleConfig ?? {}
      const hasEnemy = bc.enemyDeckMode === 'waves'
        ? (n.scenario?.waves?.length ?? 0) > 0
        : !!(bc.enemyDeckId || bc.enemyFactionId)
      if (!hasEnemy) push('error', s, `Kovos misija „${n.title}" neturi priešo kaladės/bangų.`)
      if (!n.battleConfig) push('error', s, `Kovos misija „${n.title}" be kovos konfigūracijos.`)
    }
    // reward card ids
    if (knownCardIds) {
      for (const cid of n.rewardPayload?.cards ?? []) {
        if (!knownCardIds.has(cid)) push('warning', s, `Atlygis nurodo nežinomą kortos id (${cid}).`)
      }
      for (const cid of n.battleConfig?.requiredCardIds ?? []) {
        if (!knownCardIds.has(cid)) push('warning', s, `Privaloma korta nežinoma (${cid}).`)
      }
    }
    // objectives need a primary
    if (isBattle && !(n.objectives ?? []).some((o) => o.primary)) {
      push('warning', s, `„${n.title}" neturi pagrindinio tikslo (primary objective).`)
    }
    // ── Canon completeness (Varngradas novel) ──
    if (n.status === 'active') {
      if (!n.sourceChapter?.trim()) push('warning', s, `Kanonas: „${n.title}" be skyriaus (sourceChapter).`)
      const major = isBattle || (n.objectives?.length ?? 0) > 0 || n.missionType === 'STORY_ONLY'
      if (major && !n.preCutsceneId && !n.postCutsceneId) {
        push('warning', s, `Kanonas: svarbus mazgas „${n.title}" neturi nei pre, nei post cutscene.`)
      }
    }
  }

  // ── Campaign-wide canon rules (Varngradas) ──
  const lower = (x?: string | null) => (x ?? '').toLowerCase()
  const finalNode = nodes.find((n) => (n.title || '').toLowerCase().includes('nekrenta') || /(final|16)/i.test(n.seedKey ?? ''))
  if (finalNode) {
    const txt = lower(finalNode.description) + ' ' + lower(finalNode.loreText) + ' ' + lower(finalNode.canonSummary)
    if (/(belzator).*(žū|miršt|sunaikin|nužud)|(žū|miršt|sunaikin|nužud).*(belzator)/.test(txt)) {
      push('error', finalNode.id, 'Kanonas: finale Belzatoras turi ATSITRAUKTI (sužeistas), ne žūti/būti sunaikintas.')
    }
  }
  // Varngradas spelling consistency (no Varnagrad / Varngrad mix)
  for (const n of nodes) {
    const blob = [n.title, n.subtitle, n.description, n.loreText, n.canonSummary].map((x) => x ?? '').join(' ')
    if (/Varnagrad/.test(blob)) push('warning', n.id, `Pavadinimo darna: „${n.title}" naudoja „Varnagrad" – kanonas yra „Varngradas".`)
    if (/\bVarngrad\b/.test(blob)) push('warning', n.id, `Pavadinimo darna: „${n.title}" naudoja „Varngrad" – kanonas yra „Varngradas".`)
  }
  // Prazaras must not be written as undead villain in this prequel
  for (const c of cutscenes) {
    const t = (c.steps ?? []).map((st) => st.text ?? '').join(' ').toLowerCase()
    if (/prazar/.test(t) && /(nemiręs|nemirėlis|piktadar|blogio valdov|undead)/.test(t)) {
      push('warning', c.id, 'Kanonas: šioje novelėje Prazaras nėra nemirėlis/piktadarys (tik būsimas kabliukas).')
    }
  }

  // cutscene steps need text
  for (const c of cutscenes) {
    if (!c.steps?.length) push('warning', c.id, `Cutscene „${c.title}" neturi žingsnių.`)
    for (const st of c.steps ?? []) {
      if (!st.text?.trim() && !st.videoUrl) {
        push('warning', c.id, `Cutscene „${c.title}" turi žingsnį be teksto.`)
        break
      }
    }
  }

  // unreachable nodes (impossible unlock path)
  if (nodes.length && campaign.startNodeId && nodeIds.has(campaign.startNodeId)) {
    const reachable = new Set<string>([campaign.startNodeId])
    let changed = true
    while (changed) {
      changed = false
      for (const n of nodes) {
        if (!reachable.has(n.id)) continue
        for (const nx of n.nextNodeIds ?? []) if (!reachable.has(nx)) { reachable.add(nx); changed = true }
      }
    }
    for (const n of nodes) {
      if (n.status !== 'hidden' && !reachable.has(n.id)) {
        push('warning', n.id, `Mazgas „${n.title}" nepasiekiamas iš pradinio mazgo.`)
      }
    }
  }

  return issues
}
