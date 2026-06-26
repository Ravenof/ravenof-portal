'use client'

// ── MissionIntroPanel — bottom-sheet shown when a map node is selected ─────────
import { createPortal } from 'react-dom'
import { playUiClick } from '@/lib/ui-sound'
import { MISSION_TYPES } from '@/lib/campaign/types'
import type { NodeView } from '@/lib/campaign/types'

const GOLD = '240,180,41'

export function MissionIntroPanel({ node, hasPreCutscene, onStart, onClose }: {
  node: NodeView
  hasPreCutscene: boolean
  onStart: () => void
  onClose: () => void
}) {
  if (typeof document === 'undefined') return null
  const mt = MISSION_TYPES.find((m) => m.value === node.missionType)
  const primary = node.objectives.filter((o) => o.primary)
  const secondary = node.objectives.filter((o) => !o.primary)
  const rw = node.rewardPayload ?? {}
  const completed = node.state === 'completed'
  const canReplay = !completed || (node.replay?.allowed ?? true)

  return createPortal(
    <div className="fixed inset-0 z-[210] flex items-end justify-center" style={{ background: 'rgba(4,3,8,0.82)' }} onClick={onClose}>
      <div className="w-full sm:w-[min(460px,96vw)] rounded-t-3xl sm:rounded-3xl sm:mb-6 px-5 pt-5"
        style={{ background: `radial-gradient(120% 80% at 50% 0%, rgba(${GOLD},0.12), rgba(10,8,16,0.98) 60%), linear-gradient(160deg,#17111f,#0a0810)`, border: `1px solid rgba(${GOLD},0.4)`, paddingBottom: 'calc(20px + env(safe-area-inset-bottom,0px))', maxHeight: '82vh', overflowY: 'auto' }}
        onClick={(e) => e.stopPropagation()}>
        <div className="w-10 h-1 rounded-full mx-auto mb-4 sm:hidden" style={{ background: 'rgba(255,255,255,0.18)' }} />

        <div className="flex items-center gap-2 mb-1">
          <span className="text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider"
            style={{ background: `rgba(${GOLD},0.16)`, color: `rgb(${GOLD})`, fontFamily: 'var(--rvn-font-display)' }}>
            {mt?.label ?? node.missionType}
          </span>
          {completed && <span className="text-[10px]" style={{ color: '#fcd34d' }}>{'★'.repeat(node.stars)}{'☆'.repeat(3 - node.stars)}</span>}
          {hasPreCutscene && <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>🎬 su intarpu</span>}
        </div>

        <h2 className="text-xl font-extrabold leading-tight" style={{ fontFamily: 'var(--rvn-font-display)', color: 'var(--gold)' }}>{node.title}</h2>
        {node.subtitle && <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>{node.subtitle}</p>}

        {node.loreText && (
          <p className="text-[13px] mt-3 leading-relaxed italic" style={{ color: '#cbb68a' }}>{node.loreText}</p>
        )}
        {node.description && (
          <p className="text-[13px] mt-2 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{node.description}</p>
        )}

        {!!primary.length && (
          <div className="mt-4">
            <p className="text-[10px] uppercase tracking-widest mb-1.5" style={{ color: `rgb(${GOLD})`, fontFamily: 'var(--rvn-font-display)' }}>Pagrindinis tikslas</p>
            {primary.map((o) => <p key={o.id} className="text-[13px]" style={{ color: '#f3ead3' }}>◆ {o.label}</p>)}
          </div>
        )}
        {!!secondary.length && (
          <div className="mt-3">
            <p className="text-[10px] uppercase tracking-widest mb-1.5" style={{ color: 'var(--text-muted)', fontFamily: 'var(--rvn-font-display)' }}>Papildomi tikslai (žvaigždės)</p>
            {secondary.map((o) => <p key={o.id} className="text-[12px]" style={{ color: 'var(--text-secondary)' }}>◇ {o.label}</p>)}
          </div>
        )}

        {/* Rewards */}
        <div className="mt-4 flex flex-wrap gap-2">
          {rw.gold ? <RewardChip>🪙 {rw.gold}</RewardChip> : null}
          {rw.exp ? <RewardChip>✦ {rw.exp} XP</RewardChip> : null}
          {rw.boosters ? <RewardChip>📦 {rw.boosters} pak.</RewardChip> : null}
          {rw.cardMin ? <RewardChip>🃏 {rw.cardMin}+</RewardChip> : null}
          {rw.cards?.length ? <RewardChip>🃏 {rw.cards.length} korta(-os)</RewardChip> : null}
          {rw.codexUnlocks?.length ? <RewardChip>📖 kodeksas</RewardChip> : null}
        </div>

        <div className="flex gap-2 mt-5">
          <button onClick={() => { playUiClick(); onStart() }} disabled={!canReplay}
            className="flex-1 rounded-xl text-sm font-bold transition-transform active:scale-95 disabled:opacity-40"
            style={{ minHeight: 52, background: `rgba(${GOLD},0.92)`, color: '#1a1206', fontFamily: 'var(--rvn-font-display)', letterSpacing: '0.05em' }}>
            {node.missionType === 'STORY_ONLY' ? 'Skaityti istoriją' : completed ? 'Žaisti dar kartą' : 'Pradėti misiją'}
          </button>
          <button onClick={() => { playUiClick(); onClose() }} className="rounded-xl text-sm px-4" style={{ minHeight: 52, color: 'var(--text-muted)', border: '1px solid rgba(255,255,255,0.12)' }}>Atgal</button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

function RewardChip({ children }: { children: React.ReactNode }) {
  return <span className="text-[11px] px-2.5 py-1 rounded-lg" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#f3ead3' }}>{children}</span>
}
