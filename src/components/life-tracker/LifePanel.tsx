'use client'

import type { ActionType } from '@/types/life-tracker'
import { HPControls } from './HPControls'

type Props = {
  sideIdx: 0 | 1
  name: string
  hp: number
  isActive: boolean
  flashType: ActionType | null
  flashKey: number
  onHpChange: (sideIdx: 0 | 1, delta: number) => void
  onNameChange: (sideIdx: 0 | 1, name: string) => void
}

export function LifePanel({
  sideIdx,
  name,
  hp,
  isActive,
  flashType,
  flashKey,
  onHpChange,
  onNameChange,
}: Props) {
  const isDanger = hp > 0 && hp <= 10
  const isCritical = hp <= 0

  const hpColor = isCritical ? '#ef4444' : isDanger ? '#f97316' : 'var(--gold)'

  return (
    <div
      className={'relative rounded-2xl overflow-hidden' + (isActive ? ' lt-active-glow' : '')}
      style={{
        background: 'var(--bg-surface)',
        border: '2px solid ' + (isActive ? 'var(--gold)' : 'var(--bg-border)'),
        minHeight: '300px',
      }}
    >
      {/* Flash overlay — key change forces animation restart */}
      <div
        key={flashKey}
        className={
          flashType === 'damage'
            ? 'lt-flash-dmg'
            : flashType === 'heal'
            ? 'lt-flash-heal'
            : ''
        }
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          zIndex: 1,
          borderRadius: 'inherit',
        }}
      />

      <div className="relative z-10 flex flex-col items-center p-5 gap-3 h-full">
        {/* Name input */}
        <input
          value={name}
          onChange={(e) => onNameChange(sideIdx, e.target.value)}
          className="text-center text-sm font-semibold bg-transparent border-b w-full max-w-[200px] outline-none pb-0.5"
          style={{
            color: 'var(--text-primary)',
            borderColor: isActive ? 'var(--gold)' : 'var(--bg-border)',
            fontFamily: 'Cinzel, Georgia, serif',
          }}
        />

        {/* HP number */}
        <div
          className="text-8xl font-bold leading-none select-none py-2"
          style={{
            color: hpColor,
            fontFamily: 'Cinzel, Georgia, serif',
            textShadow: isCritical ? '0 0 24px rgba(239,68,68,0.6)' : undefined,
          }}
        >
          {hp}
        </div>

        {/* Status badge */}
        {isCritical && (
          <span
            className="text-xs font-bold px-2 py-0.5 rounded-full"
            style={{ background: 'rgba(239,68,68,0.2)', color: '#ef4444' }}
          >
            PRALAIMĖJO
          </span>
        )}
        {isDanger && !isCritical && (
          <span
            className="text-xs font-bold px-2 py-0.5 rounded-full"
            style={{ background: 'rgba(249,115,22,0.2)', color: '#f97316' }}
          >
            KRITINIS
          </span>
        )}

        {/* HP Controls */}
        <HPControls sideIdx={sideIdx} onHpChange={onHpChange} />
      </div>
    </div>
  )
}
