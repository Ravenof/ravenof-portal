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

  const hpColor = isCritical
    ? '#ef4444'
    : isDanger
    ? '#f97316'
    : 'var(--gold)'

  const borderColor = isActive
    ? '#d4af37'
    : isCritical
    ? 'rgba(239,68,68,0.4)'
    : 'rgba(255,255,255,0.07)'

  const panelBg = isActive
    ? 'linear-gradient(180deg,#17120a 0%,#0d0a0f 100%)'
    : 'linear-gradient(180deg,#111118 0%,#0a0a0f 100%)'

  const boxShadow = isActive
    ? '0 0 0 1px rgba(212,175,55,0.18), 0 4px 32px rgba(212,175,55,0.10)'
    : isCritical
    ? '0 0 0 1px rgba(239,68,68,0.15), 0 4px 20px rgba(239,68,68,0.08)'
    : 'none'

  return (
    <div
      className={'relative rounded-2xl overflow-hidden' + (isActive ? ' lt-active-glow' : '')}
      style={{
        background: panelBg,
        border: `2px solid ${borderColor}`,
        boxShadow,
        minHeight: '300px',
        transition: 'border-color .25s ease, box-shadow .25s ease',
      }}
    >
      {/* Flash overlay */}
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

      {/* Corner ornaments when active */}
      {isActive && (
        <>
          <span style={{ position:'absolute', top:6, left:6, width:14, height:14, borderTop:'1.5px solid rgba(212,175,55,0.55)', borderLeft:'1.5px solid rgba(212,175,55,0.55)', borderRadius:'2px 0 0 0', pointerEvents:'none', zIndex:2 }} />
          <span style={{ position:'absolute', top:6, right:6, width:14, height:14, borderTop:'1.5px solid rgba(212,175,55,0.55)', borderRight:'1.5px solid rgba(212,175,55,0.55)', borderRadius:'0 2px 0 0', pointerEvents:'none', zIndex:2 }} />
          <span style={{ position:'absolute', bottom:6, left:6, width:14, height:14, borderBottom:'1.5px solid rgba(212,175,55,0.55)', borderLeft:'1.5px solid rgba(212,175,55,0.55)', borderRadius:'0 0 0 2px', pointerEvents:'none', zIndex:2 }} />
          <span style={{ position:'absolute', bottom:6, right:6, width:14, height:14, borderBottom:'1.5px solid rgba(212,175,55,0.55)', borderRight:'1.5px solid rgba(212,175,55,0.55)', borderRadius:'0 0 2px 0', pointerEvents:'none', zIndex:2 }} />
        </>
      )}

      <div className="relative z-10 flex flex-col items-center p-5 gap-3 h-full">
        {/* Name input */}
        <input
          value={name}
          onChange={(e) => onNameChange(sideIdx, e.target.value)}
          className="text-center text-sm font-semibold bg-transparent border-b w-full max-w-[220px] outline-none pb-1 tracking-wide"
          style={{
            color: isActive ? 'var(--gold)' : 'var(--text-primary)',
            borderColor: isActive ? 'rgba(212,175,55,0.5)' : 'rgba(255,255,255,0.1)',
            fontFamily: 'Cinzel, Georgia, serif',
            transition: 'color .25s ease, border-color .25s ease',
          }}
        />

        {/* HP number */}
        <div
          className="font-bold leading-none select-none py-2"
          style={{
            color: hpColor,
            fontFamily: 'Cinzel, Georgia, serif',
            fontSize: 'clamp(4rem, 10vw, 6rem)',
            textShadow: isCritical
              ? '0 0 28px rgba(239,68,68,0.65)'
              : isDanger
              ? '0 0 20px rgba(249,115,22,0.45)'
              : isActive
              ? '0 0 16px rgba(212,175,55,0.28)'
              : 'none',
            transition: 'color .2s ease, text-shadow .2s ease',
          }}
        >
          {hp}
        </div>

        {/* Status badge */}
        {isCritical && (
          <span
            className="text-xs font-bold px-3 py-0.5 rounded-full tracking-widest uppercase"
            style={{
              background: 'rgba(239,68,68,0.18)',
              color: '#ef4444',
              border: '1px solid rgba(239,68,68,0.35)',
              fontFamily: 'Cinzel, Georgia, serif',
              letterSpacing: '0.12em',
            }}
          >
            PRALAIMEJO
          </span>
        )}
        {isDanger && !isCritical && (
          <span
            className="text-xs font-bold px-3 py-0.5 rounded-full tracking-widest uppercase"
            style={{
              background: 'rgba(249,115,22,0.18)',
              color: '#f97316',
              border: '1px solid rgba(249,115,22,0.35)',
              fontFamily: 'Cinzel, Georgia, serif',
              letterSpacing: '0.12em',
            }}
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
