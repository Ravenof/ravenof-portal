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
import { useT } from '@/lib/i18n/react'


export function CampaignMapScreen({ slug }: { slug: string }) {
  const t = useT()
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

  if (data === null) return <div className="ravenof-body flex items-center justify-center py-16"><span className="ravenof-spinner" style={{ width: 40, height: 40 }} /></div>
  if (data === 'missing') return (
    <div className="text-center py-16">
      <p className="text-sm mb-3" style={{ color: 'var(--ravenof-text-secondary)', font: '400 13px var(--ravenof-font-body)' }}>{t('battle.campaign.notFound')}</p>
      <Link href="/digital/campaign" className="text-xs" style={{ color: 'var(--ravenof-gold)' }}>‹ {t('battle.campaign.title')}</Link>
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
      {/* Full-bleed žemėlapis tarp header'io ir ekrano apačios (rail kairėje) */}
      <div className="fixed right-0 z-10"
        style={{ left: 'calc(74px + max(0px, env(safe-area-inset-left, 0px)))', top: 'calc(env(safe-area-inset-top,0px) + 52px)', bottom: 'env(safe-area-inset-bottom,0px)' }}>
        <CampaignMap campaign={campaign} nodes={nodeViews} onSelect={(n) => { playUiClick(); setSelected(n) }} />

        {/* Top overlay: back + title + progress */}
        <div className="absolute top-0 left-0 right-0 z-20 pointer-events-none">
          <div className="flex items-center justify-between gap-2 px-3 py-2"
            style={{ background: 'linear-gradient(180deg, rgba(6,4,11,0.92), rgba(6,4,11,0))' }}>
            <Link href="/digital/campaign" onClick={() => playUiClick()} className="pointer-events-auto"
              style={{ font: '700 11px var(--ravenof-font-display)', letterSpacing: 1, textTransform: 'uppercase', background: 'rgba(11,9,16,0.8)', border: '1px solid var(--ravenof-border-strong)', color: 'var(--ravenof-text-primary)', padding: '6px 10px' }}>‹ {t('battle.campaign.title')}</Link>
            <div className="text-center min-w-0 flex-1">
              <p className="truncate" style={{ font: '700 14px var(--ravenof-font-display)', letterSpacing: 0.5, textTransform: 'uppercase', color: 'var(--ravenof-text-primary)', margin: 0 }}>{campaign.title}</p>
            </div>
            <span className="whitespace-nowrap tabular-nums" style={{ font: '400 11px var(--ravenof-font-body)', background: 'rgba(11,9,16,0.8)', border: '1px solid var(--ravenof-border-hairline)', color: 'var(--ravenof-text-secondary)', padding: '5px 9px' }}>{done}/{nodeViews.length}</span>
          </div>
        </div>

        {/* Deck warning toast */}
        {!playerDeck && decks.length === 0 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 px-4 py-2 text-center pointer-events-auto"
            style={{ background: 'rgba(11,9,16,0.9)', border: '1px solid var(--ravenof-border-gold)' }}>
            <span style={{ font: '400 12px var(--ravenof-font-body)', color: 'var(--ravenof-text-primary)' }}>{t('battle.campaign.needDeck')} </span>
            <Link href="/digital/decks?tab=builder" style={{ font: '700 12px var(--ravenof-font-body)', color: 'var(--ravenof-gold)' }}>{t('battle.campaign.createDeck')} ›</Link>
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
