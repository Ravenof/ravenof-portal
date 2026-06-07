'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import type { ActionType } from '@/types/life-tracker'
import { playWinSound, playCoinSound } from '@/lib/life-tracker-sound'
import { LTButton } from './LTButton'

function calcGold(round: number): number {
  return Math.min(round * 100, 1000)
}

type Props = {
  names: [string, string]
  hp: [number, number]
  round: number
  activeSide: 0 | 1
  logLength: number
  soundEnabled: boolean
  onHpChange: (sideIdx: 0 | 1, delta: number) => void
  onUndo: () => void
  onNextTurn: () => void
  onNewGame: () => void
  onExit: () => void
  flashType0: ActionType | null
  flashKey0: number
  flashType1: ActionType | null
  flashKey1: number
}

function hpColor(hp: number): string {
  if (hp <= 0)  return '#ef4444'
  if (hp <= 10) return '#f97316'
  return '#d4af37'
}

const GOLD_STEP = 100

export function BattleMode({
  names, hp, round, activeSide, logLength, soundEnabled,
  onHpChange, onUndo, onNextTurn, onNewGame, onExit,
  flashType0, flashKey0, flashType1, flashKey1,
}: Props) {
  const containerRef   = useRef<HTMLDivElement>(null)
  const [confirmNewGame, setConfirmNewGame] = useState(false)
  const [gold, setGold] = useState<[number, number]>([calcGold(round), calcGold(round)])
  const prevRoundRef   = useRef(round)
  const winPlayedRef   = useRef(false)

  const winner: 0 | 1 | 'draw' | null =
    hp[0] <= 0 && hp[1] <= 0 ? 'draw'
    : hp[0] <= 0 ? 1
    : hp[1] <= 0 ? 0
    : null

  const winMessage =
    winner === 'draw' ? 'Partija baigta.'
    : winner === 0    ? `${names[0]} laimėjo!`
    : winner === 1    ? `${names[1]} laimėjo!`
    : null

  useEffect(() => {
    if (winner !== null && !winPlayedRef.current && soundEnabled) {
      winPlayedRef.current = true
      playWinSound()
    }
  }, [winner, soundEnabled])

  useEffect(() => {
    if (prevRoundRef.current !== round) {
      prevRoundRef.current = round
      setGold([calcGold(round), calcGold(round)])
    }
  }, [round])

  // Fullscreen
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    el.requestFullscreen?.().catch(() => {})
    return () => { if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {}) }
  }, [])

  const handleExit = useCallback(() => {
    if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {})
    onExit()
  }, [onExit])

  const adjustGold = useCallback((sideIdx: 0 | 1, delta: number) => {
    setGold((prev) => {
      const next: [number, number] = [prev[0], prev[1]]
      next[sideIdx] = Math.max(0, next[sideIdx] + delta)
      return next
    })
    if (soundEnabled) playCoinSound()
  }, [soundEnabled])

  const handleConfirmNewGame = useCallback(() => {
    setConfirmNewGame(false)
    setGold([calcGold(1), calcGold(1)])
    winPlayedRef.current = false
    onNewGame()
  }, [onNewGame])

  const activeName = names[activeSide]

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 flex flex-col overflow-hidden select-none"
      style={{ background: 'var(--bg-base)' }}
    >
      {/* PLAYER 2 -- top, rotated 180deg */}
      <div
        className="flex-1 flex flex-col items-center justify-center gap-2 px-3 py-2"
        style={{ transform: 'rotate(180deg)', minHeight: 0 }}
      >
        <PlayerZone
          sideIdx={1}
          name={names[1]}
          hp={hp[1]}
          gold={gold[1]}
          isActive={activeSide === 1}
          flashType={flashType1}
          flashKey={flashKey1}
          onHpChange={onHpChange}
          onGoldAdjust={(delta) => adjustGold(1, delta)}
        />
      </div>

      {/* MIDDLE ZONE */}
      <div
        className="flex-shrink-0 px-3 py-2.5 space-y-2"
        style={{
          background: 'linear-gradient(180deg,#17120a 0%,#0d0a00 100%)',
          borderTop: '2px solid rgba(212,175,55,0.28)',
          borderBottom: '2px solid rgba(90,62,8,0.7)',
          boxShadow: 'inset 0 1px 0 rgba(232,200,74,.08), 0 4px 12px rgba(0,0,0,.5)',
        }}
      >
        {/* Ėjimas + zaidzia */}
        <div className="flex items-center justify-between gap-2">
          <span
            className="text-lg font-bold"
            style={{
              fontFamily: 'Cinzel, Georgia, serif',
              color: '#d4af37',
              textShadow: '0 0 12px rgba(212,175,55,.4)',
              letterSpacing: '0.05em',
            }}
          >
            Ėjimas {round}
          </span>
          <span
            className="text-xs font-semibold px-2.5 py-0.5 rounded-full"
            style={{
              background: 'rgba(212,175,55,0.10)',
              color: '#d4af37',
              borderTop: '1px solid rgba(232,200,74,.35)',
              borderRight: '1px solid rgba(212,175,55,.18)',
              borderBottom: '1px solid rgba(90,62,8,.5)',
              borderLeft: '1px solid rgba(212,175,55,.18)',
              fontFamily: 'Cinzel, Georgia, serif',
              letterSpacing: '0.04em',
            }}
          >
            Žaidžia: {activeName}
          </span>
        </div>

        {/* Action buttons -- 2 rows for mobile */}
        <div className="space-y-1.5">
          <LTButton variant="primary" size="sm" fullWidth onClick={onNextTurn}>
            Kitas ėjimas →
          </LTButton>
          <div className="flex gap-1.5">
            <LTButton variant="muted" size="sm" fullWidth onClick={onUndo} disabled={logLength === 0} aria-label="Atšaukti paskutinį veiksmą">
              ↩ Atšaukti
            </LTButton>
            <LTButton variant="secondary" size="sm" fullWidth onClick={() => setConfirmNewGame(true)}>
              Nauja partija
            </LTButton>
            <LTButton variant="danger" size="sm" fullWidth onClick={handleExit} aria-label="Išeiti iš kovos režimo">
              Išeiti
            </LTButton>
          </div>
        </div>
      </div>

      {/* PLAYER 1 -- bottom */}
      <div className="flex-1 flex flex-col items-center justify-center gap-2 px-3 py-2" style={{ minHeight: 0 }}>
        <PlayerZone
          sideIdx={0}
          name={names[0]}
          hp={hp[0]}
          gold={gold[0]}
          isActive={activeSide === 0}
          flashType={flashType0}
          flashKey={flashKey0}
          onHpChange={onHpChange}
          onGoldAdjust={(delta) => adjustGold(0, delta)}
        />
      </div>

      {/* Win Overlay */}
      {winner !== null && (
        <div
          className="absolute inset-0 z-10 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,.82)', backdropFilter: 'blur(6px)' }}
        >
          <div
            className="rounded-2xl p-8 w-full max-w-xs space-y-5 text-center"
            style={{
              background: 'linear-gradient(180deg,#1e1608,#0a0800)',
              borderTop: '2px solid rgba(232,200,74,.55)',
              borderRight: '2px solid rgba(160,120,32,.35)',
              borderBottom: '2px solid rgba(90,62,8,.6)',
              borderLeft: '2px solid rgba(160,120,32,.35)',
              boxShadow: '0 8px 40px rgba(0,0,0,.8), 0 0 48px rgba(212,175,55,.18)',
            }}
          >
            <div className="text-5xl" aria-hidden>🏆</div>
            <p className="text-2xl font-bold" style={{ fontFamily: 'Cinzel, Georgia, serif', color: '#d4af37', textShadow: '0 0 16px rgba(212,175,55,.5)' }}>
              {winMessage}
            </p>
            <div className="flex gap-3">
              <LTButton variant="primary" size="md" fullWidth onClick={() => setConfirmNewGame(true)}>
                Nauja partija
              </LTButton>
              <LTButton variant="muted" size="md" fullWidth onClick={handleExit}>
                Išeiti
              </LTButton>
            </div>
          </div>
        </div>
      )}

      {/* Confirm: Nauja partija */}
      {confirmNewGame && (
        <div
          className="absolute inset-0 z-[11] flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,.87)', backdropFilter: 'blur(4px)' }}
        >
          <div
            className="rounded-2xl p-6 w-full max-w-xs space-y-4"
            style={{
              background: 'linear-gradient(180deg,#17120a,#0a0800)',
              borderTop: '1.5px solid rgba(212,175,55,.25)',
              borderRight: '1.5px solid rgba(212,175,55,.10)',
              borderBottom: '1.5px solid rgba(90,62,8,.55)',
              borderLeft: '1.5px solid rgba(212,175,55,.10)',
            }}
          >
            <p className="text-base font-semibold text-center" style={{ color: 'var(--text-primary)', fontFamily: 'Cinzel, Georgia, serif' }}>
              Ar tikrai pradėti naują partiją?
            </p>
            <p className="text-xs text-center" style={{ color: 'var(--text-muted)' }}>
              HP ir žurnalo duomenys bus išvalyti.
            </p>
            <div className="flex gap-3">
              <LTButton variant="muted" size="sm" fullWidth onClick={() => setConfirmNewGame(false)}>
                Atšaukti
              </LTButton>
              <LTButton variant="danger" size="sm" fullWidth onClick={handleConfirmNewGame}>
                Taip
              </LTButton>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// PlayerZone
type PlayerZoneProps = {
  sideIdx: 0 | 1
  name: string
  hp: number
  gold: number
  isActive: boolean
  flashType: ActionType | null
  flashKey: number
  onHpChange: (sideIdx: 0 | 1, delta: number) => void
  onGoldAdjust: (delta: number) => void
}

function PlayerZone({ sideIdx, name, hp, gold, isActive, flashType, flashKey, onHpChange, onGoldAdjust }: PlayerZoneProps) {
  const color      = hpColor(hp)
  const isCritical = hp <= 0
  const isDanger   = hp > 0 && hp <= 10

  const bTop  = isActive ? '#e8c84a' : isCritical ? 'rgba(239,68,68,.35)' : 'rgba(255,255,255,.10)'
  const bSide = isActive ? '#a07820' : isCritical ? 'rgba(239,68,68,.20)' : 'rgba(255,255,255,.05)'
  const bBot  = isActive ? '#5a3e08' : isCritical ? 'rgba(239,68,68,.12)' : 'rgba(0,0,0,.5)'
  const panelBg = isActive
    ? 'linear-gradient(180deg,#1e1608 0%,#110e05 50%,#0a0800 100%)'
    : 'linear-gradient(180deg,#13131e 0%,#0c0c14 50%,#080810 100%)'
  const shadow = isActive
    ? '0 4px 20px rgba(0,0,0,.7), 0 0 28px rgba(212,175,55,.18), inset 0 1px 0 rgba(232,200,74,.10), inset 0 -2px 8px rgba(0,0,0,.6)'
    : isCritical
    ? '0 4px 16px rgba(0,0,0,.65), 0 0 16px rgba(239,68,68,.12), inset 0 1px 0 rgba(255,255,255,.04), inset 0 -2px 8px rgba(0,0,0,.5)'
    : '0 4px 12px rgba(0,0,0,.55), inset 0 1px 0 rgba(255,255,255,.04), inset 0 -2px 8px rgba(0,0,0,.45)'

  return (
    <div
      className={'relative rounded-2xl overflow-hidden w-full max-w-lg' + (isActive ? ' lt-active-glow' : '')}
      style={{
        background: panelBg,
        borderTop: `2.5px solid ${bTop}`,
        borderRight: `2.5px solid ${bSide}`,
        borderBottom: `2.5px solid ${bBot}`,
        borderLeft: `2.5px solid ${bSide}`,
        boxShadow: shadow,
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        transition: 'none',
      }}
    >
      {/* Flash overlay */}
      <div
        key={flashKey}
        className={flashType === 'damage' ? 'lt-flash-dmg' : flashType === 'heal' ? 'lt-flash-heal' : ''}
        style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 1, borderRadius: 'inherit' }}
      />

      {/* Corner ornaments */}
      {(['tl','tr','bl','br'] as const).map((corner) => {
        const isTop  = corner.startsWith('t')
        const isLeft = corner.endsWith('l')
        const c      = isActive ? 'rgba(212,175,55,0.60)' : 'rgba(255,255,255,0.10)'
        const s: React.CSSProperties = {
          position: 'absolute', width: 16, height: 16, pointerEvents: 'none', zIndex: 2,
          [isTop  ? 'top'    : 'bottom']: 6,
          [isLeft ? 'left'   : 'right' ]: 6,
          borderTop:    isTop  ? `2px solid ${c}` : undefined,
          borderBottom: !isTop ? `2px solid ${c}` : undefined,
          borderLeft:   isLeft ? `2px solid ${c}` : undefined,
          borderRight:  !isLeft ? `2px solid ${c}` : undefined,
          borderRadius: isTop && isLeft ? '3px 0 0 0' : isTop ? '0 3px 0 0' : isLeft ? '0 0 0 3px' : '0 0 3px 0',
        }
        return <span key={corner} style={s} />
      })}

      <div className="relative z-10 flex flex-col items-center justify-center gap-1.5 p-3 flex-1">
        {/* Name */}
        <p className="text-sm font-semibold tracking-wide" style={{ color: isActive ? '#d4af37' : 'var(--text-primary)', fontFamily: 'Cinzel, Georgia, serif', textShadow: isActive ? '0 0 8px rgba(212,175,55,.3)' : 'none' }}>
          {name}
        </p>

        {/* HP number */}
        <div
          className="font-bold leading-none"
          style={{
            color,
            fontFamily: 'Cinzel, Georgia, serif',
            fontSize: 'clamp(3.5rem, 8vw, 5rem)',
            letterSpacing: '-0.02em',
            textShadow: isCritical
              ? '0 0 28px rgba(239,68,68,.7), 0 0 55px rgba(239,68,68,.3)'
              : isDanger
              ? '0 0 20px rgba(249,115,22,.55)'
              : isActive
              ? '0 0 18px rgba(212,175,55,.4)'
              : 'none',
          }}
        >
          {hp}
        </div>

        {isCritical && (
          <span
            className="text-xs font-bold px-2 py-0.5 rounded-full uppercase"
            style={{
              background: 'rgba(239,68,68,.15)',
              color: '#ef4444',
              borderTop: '1px solid rgba(248,113,113,.5)',
              borderRight: '1px solid rgba(239,68,68,.25)',
              borderBottom: '1px solid rgba(127,29,29,.5)',
              borderLeft: '1px solid rgba(239,68,68,.25)',
              fontFamily: 'Cinzel, Georgia, serif',
              letterSpacing: '0.12em',
              boxShadow: '0 0 8px rgba(239,68,68,.2)',
            }}
          >
            PRALAIMĖJO
          </span>
        )}
        {isDanger && !isCritical && (
          <span
            className="text-xs font-bold px-2 py-0.5 rounded-full uppercase"
            style={{
              background: 'rgba(249,115,22,.15)',
              color: '#f97316',
              borderTop: '1px solid rgba(253,186,116,.5)',
              borderRight: '1px solid rgba(249,115,22,.25)',
              borderBottom: '1px solid rgba(124,45,18,.5)',
              borderLeft: '1px solid rgba(249,115,22,.25)',
              fontFamily: 'Cinzel, Georgia, serif',
              letterSpacing: '0.12em',
            }}
          >
            KRITINIS
          </span>
        )}

        {/* HP buttons */}
        <div className="w-full space-y-1.5 mt-0.5">
          <div className="flex gap-1.5">
            {[-10, -5, -1].map((v) => (
              <LTButton key={v} variant="damage" size="sm" style={{ flex: 1 }} onPointerDown={(e) => { e.preventDefault(); onHpChange(sideIdx, v) }} aria-label={`${v} HP`}>
                {v}
              </LTButton>
            ))}
          </div>
          <div className="flex gap-1.5">
            {[1, 5, 10].map((v) => (
              <LTButton key={v} variant="heal" size="sm" style={{ flex: 1 }} onPointerDown={(e) => { e.preventDefault(); onHpChange(sideIdx, v) }} aria-label={`+${v} HP`}>
                +{v}
              </LTButton>
            ))}
          </div>
        </div>

        {/* Auksas */}
        <div className="flex items-center gap-2 mt-1">
          <LTButton variant="damage" size="xs" onClick={() => onGoldAdjust(-GOLD_STEP)} aria-label="Atimti auksus">
            −
          </LTButton>
          <span className="text-sm font-bold tabular-nums min-w-[4.5rem] text-center" style={{ color: '#d4af37', fontFamily: 'Cinzel, Georgia, serif', textShadow: '0 0 8px rgba(212,175,55,.3)' }}>
            {gold} ❄
          </span>
          <LTButton variant="heal" size="xs" onClick={() => onGoldAdjust(GOLD_STEP)} aria-label="Prideti auksus">
            +
          </LTButton>
        </div>
      </div>
    </div>
  )
}
