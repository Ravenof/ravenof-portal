'use client'

// ════════════════════════════════════════════════════════════════════════════
// CampaignMapScreen — player-facing campaign screen: loads campaign + progress,
// renders the Atlas map with nodes, the mission intro sheet, and drives the
// CampaignRuntime when a mission starts.
// ════════════════════════════════════════════════════════════════════════════

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { playUiClick } from '@/lib/ui-sound'
import { CampaignMap } from './CampaignMap'
import { MissionIntroPanel } from './MissionIntroPanel'
import { CampaignRuntime } from './CampaignRuntime'
import {
  loadFullCampaign, loadProgress, computeNodeViews, cutsceneById,
  type FullCampaign,
} from '@/lib/campaign/missionLoader'
import type { CampaignProgress, NodeView } from '@/lib/campaign/types'

const GOLD = '240,180,41'

export function CampaignMapScreen({ slug }: { slug: string }) {
  const [data, setData] = useState<FullCampaign | null | 'missing'>(null)
  const [progress, setProgress] = useState<CampaignProgress | null>(null)
  const [selected, setSelected] = useState<NodeView | null>(null)
  const [activeNode, setActiveNode] = useState<NodeView | null>(null)
  const [playerDeck, setPlayerDeck] = useState<{ id: string; name: string } | null>(null)
  const [decks, setDecks] = useState<{ id: string; name: string }[]>([])

  const reload = async () => {
    const full = await loadFullCampaign(slug)
    if (!full) { setData('missing'); return }
    setData(full)
    setProgress(await loadProgress(full.campaign.id))
  }

  useEffect(() => {
    reload()
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      supabase.from('decks').select('id, name').eq('user_id', user.id).order('updated_at', { ascending: false })
        .then(({ data }) => {
          const ds = (data as { id: string; name: string }[] | null) ?? []
          setDecks(ds); if (ds.length) setPlayerDeck(ds[0])
        })
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug])

  const nodeViews = useMemo(
    () => (data && data !== 'missing') ? computeNodeViews(data.nodes, progress) : [],
    [data, progress],
  )

  if (data === null) return <p className="text-center py-16 text-sm" style={{ color: 'var(--text-muted)' }}>Kraunama…</p>
  if (data === 'missing') return (
    <div className="text-center py-16">
      <p className="text-sm mb-3" style={{ color: 'var(--text-muted)' }}>Kampanija nerasta.</p>
      <Link href="/digital/campaign" className="text-xs" style={{ color: 'var(--gold)' }}>← Kampanijos</Link>
    </div>
  )

  const { campaign, cutscenes } = data

  // resolve which deck to use for a node: story deck > chosen collection deck
  const resolveDeck = (n: NodeView): { id: string; name: string } | null => {
    const bc = n.battleConfig ?? {}
    if (bc.playerDeckMode === 'story' && bc.storyDeckId) return { id: bc.storyDeckId, name: 'Istorinė kaladė' }
    return playerDeck
  }

  const startNode = (n: NodeView) => {
    setSelected(null)
    if (n.missionType !== 'STORY_ONLY' && !resolveDeck(n)) return // guarded by intro panel UI
    setActiveNode(n)
  }

  const onMissionComplete = async () => {
    setActiveNode(null)
    await reload()
  }

  return (
    <div className="max-w-md mx-auto space-y-3">
      <div className="flex items-center justify-between">
        <Link href="/digital/campaign" onClick={() => playUiClick()} className="text-xs" style={{ color: 'var(--text-muted)' }}>← Kampanijos</Link>
        <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
          {nodeViews.filter((n) => n.state === 'completed').length} / {nodeViews.length} įveikta
        </span>
      </div>

      <div className="text-center">
        <h1 className="text-xl font-extrabold" style={{ fontFamily: 'var(--rvn-font-display)', color: 'var(--gold)', letterSpacing: '0.04em' }}>{campaign.title}</h1>
        {campaign.subtitle && <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{campaign.subtitle}</p>}
      </div>

      <CampaignMap campaign={campaign} nodes={nodeViews} onSelect={(n) => { playUiClick(); setSelected(n) }} />

      {!playerDeck && decks.length === 0 && (
        <div className="rounded-xl px-4 py-3 text-center" style={{ background: `rgba(${GOLD},0.08)`, border: `1px solid rgba(${GOLD},0.3)` }}>
          <p className="text-xs mb-2" style={{ color: 'var(--text-secondary)' }}>Kovinėms misijoms reikia kaladės.</p>
          <Link href="/digital/decks?tab=builder" className="text-xs font-bold" style={{ color: 'var(--gold)' }}>Sukurti kaladę →</Link>
        </div>
      )}

      {selected && (
        <MissionIntroPanel node={selected}
          hasPreCutscene={!!cutsceneById(cutscenes, selected.preCutsceneId)}
          onStart={() => startNode(selected)}
          onClose={() => setSelected(null)} />
      )}

      {activeNode && (
        <CampaignRuntime
          campaign={campaign} node={activeNode} cutscenes={cutscenes}
          playerDeckId={resolveDeck(activeNode)?.id ?? '__demo__'}
          playerDeckName={resolveDeck(activeNode)?.name ?? 'Kaladė'}
          onComplete={onMissionComplete}
          onExit={() => setActiveNode(null)} />
      )}
    </div>
  )
}
