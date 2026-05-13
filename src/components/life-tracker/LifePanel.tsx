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
  const isDanger   = hp > 0 && hp <= 10
  const isCritical = hp <= 0

  const hpColor = isCritical ? '#ef4444' : isDanger ? '#f97316' : '#d4af37'

  // Border — bevel-ish: top brighter, bottom darker
  const bTop  = isActive ? '#e8c84a' : isCritical ? 'rgba(239,68,68,.35)' : 'rgba(255,255,255,.10)'
  const bSide = isActive ? '#a07820' : isCritical ? 'rgba(239,68,68,.20)' : 'rgba(255,255,255,.05)'
  const bBot  = isActive ? '#5a3e08' : isCritical ? 'rgba(239,68,68,.12)' : 'rgba(0,0,0,.5)'

  const panelBg = isActive
    ? 'linear-gradient(180deg,#1e1608 0%,#110e05 50%,#0a0800 100%)'
    : 'linear-gradient(180deg,#13131e 0%,#0c0c14 50%,#080810 100%)'

  const boxShadow = isActive
    ? '0 4px 20px rgba(0,0,0,.7), 0 0 28px rgba(212,175,55,.18), inset 0 1px 0 rgba(232,200,74,.10), inset 0 -2px 8px rgba(0,0,0,.6)'
    : isCritical
    ? '0 4px 16px rgba(0,0,0,.65), 0 0 16px rgba(239,68,68,.12), inset 0 1px 0 rgba(255,255,255,.04), inset 0 -2px 8px rgba(0,0,0,.5)'
    : '0 4px 12px rgba(0,0,0,.55), inset 0 1px 0 rgba(255,255,255,.04), inset 0 -2px 8px rgba(0,0,0,.45)'

  return (
    <div
      className={'relative rounded-2xl overflow-hidden' + (isActive ? ' lt-active-glow' : '')}
      style={{
        background: panelBg,
        borderTop: `2.5px solid ${bTop}`,
        borderRight: `2.5px solid ${bSide}`,
        borderBottom: `2.5px solid ${bBot}`,
        borderLeft: `2.5px solid ${bSide}`,
        boxShadow,
        minHeight: '300px',
        transition: 'border-color .25s ease, box-shadow .25s ease',
      }}
    >
      {/* Flash overlay */}
      <div
        key={flashKey}
        className={flashType === 'damage' ? 'lt-flash-dmg' : flashType === 'heal' ? 'lt-flash-heal' : ''}
        style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 1, borderRadius: 'inherit' }}
      />

      {/* Corner ornaments — always shown, brighter when active */}
      {(['tl','tr','bl','br'] as const).map((corner) => {
        const isTop    = corner.startsWith('t')
        const isLeft   = corner.endsWith('l')
        const color    = isActive ? 'rgba(212,175,55,0.65)' : 'rgba(255,255,255,0.12)'
        const base: React.CSSProperties = {
          position: 'absolute',
          width: 18, height: 18,
          pointerEvents: 'none', zIndex: 2,
          [isTop  ? 'top'    : 'bottom']: 7,
          [isLeft ? 'left'   : 'right' ]: 7,
          borderTop:    isTop  ? `2px solid ${color}` : undefined,
          borderBottom: !isTop ? `2px solid ${color}` : undefined,
          borderLeft:   isLeft ? `2px solid ${color}` : undefined,
          borderRight:  !isLeft ? `2px solid ${color}` : undefined,
          borderRadius: `${isTop && isLeft ? '3px 0 0 0' : isTop && !isLeft ? '0 3px 0 0' : !isTop && isLeft ? '0 0 0 3px' : '0 0 3px 0'}`,
        }
        return <span key={corner} style={base} />
      })}

      <div className="relative z-10 flex flex-col items-center p-5 gap-3 h-full">
        {/* Name input */}
        <input
          value={name}
          onChange={(e) => onNameChange(sideIdx, e.target.value)}
          className="text-center text-sm font-semibold bg-transparent border-b w-full max-w-[220px] outline-none pb-1 tracking-wide"
          style={{
            color: isActive ? '#d4af37' : 'var(--text-primary)',
            borderColor: isActive ? 'rgba(212,175,55,0.45)' : 'rgba(255,255,255,0.10)',
            fontFamily: 'Cinzel, Georgia, serif',
            transition: 'color .25s ease, border-color .25s ease',
            textShadow: isActive ? '0 0 8px rgba(212,175,55,.3)' : 'none',
          }}
        />

        {/* HP number */}
        <div
          className="font-bold leading-none select-none py-2"
          style={{
            color: hpColor,
            fontFamily: 'Cinzel, Georgia, serif',
            fontSize: 'clamp(4rem, 10vw, 6rem)',
            letterSpacing: '-0.02em',
            textShadow: isCritical
              ? '0 0 32px rgba(239,68,68,.75), 0 0 60px rgba(239,68,68,.35)'
              : isDanger
              ? '0 0 24px rgba(249,115,22,.6), 0 0 48px rgba(249,115,22,.25)'
              : isActive
              ? '0 0 20px rgba(212,175,55,.45), 0 0 40px rgba(212,175,55,.18)'
              : 'none',
            transition: 'color .2s ease, text-shadow .2s ease',
          }}
        >
          {hp}
        </div>

        {/* Status badge */}
        {isCritical && (
          <span
            className="text-xs font-bold px-3 py-0.5 rounded-full uppercase"
            style={{
              background: 'rgba(239,68,68,.15)',
              color: '#ef4444',
              borderTop: '1px solid rgba(248,113,113,.5)',
              borderRight: '1px solid rgba(239,68,68,.3)',
              borderBottom: '1px solid rgba(127,29,29,.5)',
              borderLeft: '1px solid rgba(239,68,68,.3)',
              fontFamily: 'Cinzel, Georgia, serif',
              letterSpacing: '0.14em',
              boxShadow: '0 0 10px rgba(239,68,68,.22)',
              textShadow: '0 0 6px rgba(239,68,68,.5)',
            }}
          >
            PRALAIMĖJO
          </span>
        )}
        {isDanger && !isCritical && (
          <span
            className="text-xs font-bold px-3 py-0.5 rounded-full uppercase"
            style={{
              background: 'rgba(249,115,22,.15)',
              color: '#f97316',
              borderTop: '1px solid rgba(253,186,116,.5)',
              borderRight: '1px solid rgba(249,115,22,.3)',
              borderBottom: '1px solid rgba(124,45,18,.5)',
              borderLeft: '1px solid rgba(249,115,22,.3)',
              fontFamily: 'Cinzel, Georgia, serif',
              letterSpacing: '0.14em',
              boxShadow: '0 0 10px rgba(249,115,22,.22)',
              textShadow: '0 0 6px rgba(249,115,22,.5)',
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
