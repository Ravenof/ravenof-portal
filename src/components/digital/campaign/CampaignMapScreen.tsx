'use client'

// ════════════════════════════════════════════════════════════════════════════
// CampaignMapScreen — full-screen player campaign screen: loads campaign +
// progress, renders the Atlas map full-bleed, the mission intro sheet and drives
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
      supabase.from('decks').select('id, name').eq('user_id', user.id).not('name', 'ilike', '[Kampanija]%').order('updated_at', { ascending: false })
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
  const done = nodeViews.filter((n) => n.state === 'completed').length

  const resolveDeck = (n: NodeView): { id: string; name: string } | null => {
    const bc = n.battleConfig ?? {}
    if (bc.playerDeckMode === 'story' && bc.storyDeckId) return { id: bc.storyDeckId, name: 'Istorinė kaladė' }
    return playerDeck
  }

  const startNode = (n: NodeView) => {
    setSelected(null)
    if (n.missionType !== 'STORY_ONLY' && !resolveDeck(n)) return
    setActiveNode(n)
  }

  const onMissionComplete = async () => { setActiveNode(null); await reload() }

  return (
    <>
      {/* Full-bleed map between header and bottom nav */}
      <div className="fixed left-0 right-0 z-10"
        style={{ top: 'calc(env(safe-area-inset-top,0px) + 49px)', bottom: 'calc(env(safe-area-inset-bottom,0px) + 58px)' }}>
        <CampaignMap campaign={campaign} nodes={nodeViews} onSelect={(n) => { playUiClick(); setSelected(n) }} />

        {/* Top overlay: back + title + progress */}
        <div className="absolute top-0 left-0 right-0 z-20 pointer-events-none">
          <div className="flex items-center justify-between gap-2 px-3 py-2"
            style={{ background: 'linear-gradient(180deg, rgba(6,4,11,0.92), rgba(6,4,11,0))' }}>
            <Link href="/digital/campaign" onClick={() => playUiClick()} className="pointer-events-auto text-xs px-2 py-1 rounded-lg"
              style={{ background: 'rgba(10,8,16,0.8)', border: '1px solid rgba(255,255,255,0.12)', color: 'var(--text-secondary)' }}>← Kampanijos</Link>
            <div className="text-center min-w-0 flex-1">
              <p className="text-sm font-extrabold truncate" style={{ fontFamily: 'var(--rvn-font-display)', color: 'var(--gold)' }}>{campaign.title}</p>
            </div>
            <span className="text-[11px] px-2 py-1 rounded-lg whitespace-nowrap" style={{ background: 'rgba(10,8,16,0.8)', color: 'var(--text-muted)' }}>{done}/{nodeViews.length}</span>
          </div>
        </div>

        {/* Deck warning toast */}
        {!playerDeck && decks.length === 0 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 rounded-xl px-4 py-2 text-center pointer-events-auto"
            style={{ background: `rgba(${GOLD},0.12)`, border: `1px solid rgba(${GOLD},0.4)` }}>
            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Kovinėms misijoms reikia kaladės. </span>
            <Link href="/digital/decks?tab=builder" className="text-xs font-bold" style={{ color: 'var(--gold)' }}>Sukurti →</Link>
          </div>
        )}
      </div>

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
    </>
  )
}
