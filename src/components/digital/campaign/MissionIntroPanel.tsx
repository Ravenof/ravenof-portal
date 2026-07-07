'use client'

// ── MissionIntroPanel — landscape dialogas pasirinkus žemėlapio mazgą:
//    kairė = lore/aprašymas/tikslai (scroll), dešinė = atlygiai + CTA (pinned).
import { createPortal } from 'react-dom'
import { playUiClick } from '@/lib/ui-sound'
import { useEscClose } from '@/lib/useEscClose'
import { MISSION_TYPES } from '@/lib/campaign/types'
import type { NodeView } from '@/lib/campaign/types'

const GOLD = '240,180,41'

export function MissionIntroPanel({ node, hasPreCutscene, onStart, onClose }: {
  node: NodeView
  hasPreCutscene: boolean
  onStart: () => void
  onClose: () => void
}) {
  useEscClose(onClose)
  if (typeof document === 'undefined') return null
  const mt = MISSION_TYPES.find((m) => m.value === node.missionType)
  const primary = node.objectives.filter((o) => o.primary)
  const secondary = node.objectives.filter((o) => !o.primary)
  const rw = node.rewardPayload ?? {}
  const completed = node.state === 'completed'
  const canReplay = !completed || (node.replay?.allowed ?? true)

  return createPortal(
    <div className="fixed inset-0 z-[210] flex items-center justify-center p-3" style={{ background: 'rgba(4,3,8,0.82)', backdropFilter: 'blur(3px)' }} onClick={onClose}>
      <div className="w-[min(780px,96vw)] max-h-[92vh] rounded-2xl flex flex-col overflow-hidden"
        style={{ background: `radial-gradient(120% 80% at 50% 0%, rgba(${GOLD},0.12), rgba(10,8,16,0.98) 60%), linear-gradient(160deg,#17111f,#0a0810)`, border: `1px solid rgba(${GOLD},0.4)` }}
        onClick={(e) => e.stopPropagation()}>

        {/* Antraštė */}
        <div className="px-5 pt-4 pb-2.5 shrink-0" style={{ borderBottom: `1px solid rgba(${GOLD},0.16)` }}>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider"
              style={{ background: `rgba(${GOLD},0.16)`, color: `rgb(${GOLD})`, fontFamily: 'var(--rvn-font-display)' }}>
              {mt?.label ?? node.missionType}
            </span>
            {completed && <span className="text-[10px]" style={{ color: '#fcd34d' }}>{'★'.repeat(node.stars)}{'☆'.repeat(3 - node.stars)}</span>}
            {hasPreCutscene && <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>🎬 su intarpu</span>}
          </div>
          <h2 className="font-extrabold leading-tight" style={{ fontSize: 'clamp(16px,3vh,21px)', fontFamily: 'var(--rvn-font-display)', color: 'var(--gold)' }}>{node.title}</h2>
          {node.subtitle && <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>{node.subtitle}</p>}
        </div>

        {/* 2 stulpeliai */}
        <div className="flex-1 min-h-0 grid gap-3 px-5 py-3" style={{ gridTemplateColumns: 'minmax(0,1.7fr) minmax(200px,1fr)' }}>
          {/* KAIRĖ: lore + tikslai */}
          <div className="min-h-0 overflow-y-auto pr-1">
            {node.loreText && (
              <p className="leading-relaxed italic" style={{ fontSize: 13, color: '#cbb68a' }}>{node.loreText}</p>
            )}
            {node.description && (
              <p className="mt-2 leading-relaxed" style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{node.description}</p>
            )}
            {!!primary.length && (
              <div className="mt-4">
                <p className="text-[10px] uppercase tracking-widest mb-1.5" style={{ color: `rgb(${GOLD})`, fontFamily: 'var(--rvn-font-display)' }}>Pagrindinis tikslas</p>
                {primary.map((o) => <p key={o.id} style={{ fontSize: 13, color: '#f3ead3' }}>◆ {o.label}</p>)}
              </div>
            )}
            {!!secondary.length && (
              <div className="mt-3">
                <p className="text-[10px] uppercase tracking-widest mb-1.5" style={{ color: 'var(--text-muted)', fontFamily: 'var(--rvn-font-display)' }}>Papildomi tikslai (žvaigždės)</p>
                {secondary.map((o) => <p key={o.id} style={{ fontSize: 12, color: 'var(--text-secondary)' }}>◇ {o.label}</p>)}
              </div>
            )}
          </div>

          {/* DEŠINĖ: atlygiai + CTA */}
          <div className="min-h-0 flex flex-col">
            <div className="flex-1 min-h-0 overflow-y-auto">
              <p className="text-[10px] uppercase tracking-widest mb-1.5" style={{ color: 'var(--text-muted)', fontFamily: 'var(--rvn-font-display)' }}>Atlygiai</p>
              <div className="flex flex-col gap-1.5">
                {rw.gold ? <RewardChip>🪙 {rw.gold}</RewardChip> : null}
                {rw.exp ? <RewardChip>✦ {rw.exp} XP</RewardChip> : null}
                {rw.boosters ? <RewardChip>📦 {rw.boosters} pak.</RewardChip> : null}
                {rw.cardMin ? <RewardChip>🃏 {rw.cardMin}+</RewardChip> : null}
                {rw.cards?.length ? <RewardChip>🃏 {rw.cards.length} korta(-os)</RewardChip> : null}
                {rw.codexUnlocks?.length ? <RewardChip>📖 kodeksas</RewardChip> : null}
                {!rw.gold && !rw.exp && !rw.boosters && !rw.cardMin && !rw.cards?.length && !rw.codexUnlocks?.length && (
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>—</span>
                )}
              </div>
            </div>
            <div className="shrink-0 flex flex-col gap-1.5 pt-2">
              <button onClick={() => { playUiClick(); onStart() }} disabled={!canReplay}
                className="rvn-press w-full rounded-xl text-sm font-bold disabled:opacity-40"
                style={{ minHeight: 46, background: `rgba(${GOLD},0.92)`, color: '#1a1206', fontFamily: 'var(--rvn-font-display)', letterSpacing: '0.05em' }}>
                {node.missionType === 'STORY_ONLY' ? 'Skaityti istoriją' : completed ? 'Žaisti dar kartą' : 'Pradėti misiją'}
              </button>
              <button onClick={() => { playUiClick(); onClose() }} className="rvn-press w-full rounded-xl text-xs" style={{ minHeight: 34, color: 'var(--text-muted)', border: '1px solid rgba(255,255,255,0.12)' }}>Atgal</button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}

function RewardChip({ children }: { children: React.ReactNode }) {
  return <span className="px-2.5 py-1.5 rounded-lg" style={{ fontSize: 11.5, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#f3ead3' }}>{children}</span>
}
