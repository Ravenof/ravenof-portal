'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import type { ActionType } from '@/types/life-tracker'
import { playWinSound } from '@/lib/life-tracker-sound'
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
  if (hp <= 0) return '#ef4444'
  if (hp <= 10) return '#f97316'
  return 'var(--gold)'
}

const GOLD_STEP = 100

export function BattleMode({
  names, hp, round, activeSide, logLength, soundEnabled,
  onHpChange, onUndo, onNextTurn, onNewGame, onExit,
  flashType0, flashKey0, flashType1, flashKey1,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [confirmNewGame, setConfirmNewGame] = useState(false)
  const [gold, setGold] = useState<[number, number]>([calcGold(round), calcGold(round)])
  const prevRoundRef = useRef(round)
  const winPlayedRef = useRef(false)

  // Win detection
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

  // Play win sound once per game
  useEffect(() => {
    if (winner !== null && !winPlayedRef.current && soundEnabled) {
      winPlayedRef.current = true
      playWinSound()
    }
  }, [winner, soundEnabled])

  // Reset gold when round advances
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
    return () => {
      if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {})
    }
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
  }, [])

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
      {/* PLAYER 2 — top, rotated 180deg */}
      <div
        className="flex-1 flex flex-col items-center justify-center gap-2 px-4 py-3"
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
        className="flex-shrink-0 px-4 py-3 space-y-2.5"
        style={{
          background: 'linear-gradient(180deg,#13100a,#0d0a0a)',
          borderTop: '1px solid rgba(212,175,55,0.18)',
          borderBottom: '1px solid rgba(212,175,55,0.18)',
        }}
      >
        {/* Ėjimas + active player */}
        <div className="flex items-center justify-between gap-3">
          <span
            className="text-xl font-bold"
            style={{ fontFamily: 'Cinzel, Georgia, serif', color: 'var(--gold)' }}
          >
            Ėjimas {round}
          </span>
          <span
            className="text-sm font-semibold px-3 py-1 rounded-full"
            style={{
              background: 'rgba(212,175,55,0.12)',
              color: 'var(--gold)',
              border: '1px solid rgba(212,175,55,0.28)',
              fontFamily: 'Cinzel, Georgia, serif',
            }}
          >
            Žaidžia: {activeName}
          </span>
        </div>

        {/* Action buttons */}
        <div className="flex gap-1.5">
          <LTButton
            variant="muted"
            size="sm"
            onClick={onUndo}
            disabled={logLength === 0}
            aria-label="Atšaukti paskutinį veiksmą"
          >
            &#8617; Atšaukti
          </LTButton>
          <LTButton
            variant="primary"
            size="sm"
            fullWidth
            onClick={onNextTurn}
          >
            Kitas ėjimas &rarr;
          </LTButton>
          <LTButton
            variant="secondary"
            size="sm"
            onClick={() => setConfirmNewGame(true)}
          >
            Nauja partija
          </LTButton>
          <LTButton
            variant="danger"
            size="sm"
            onClick={handleExit}
            aria-label="Išeiti iš kovos režimo"
          >
            Išeiti
          </LTButton>
        </div>
      </div>

      {/* PLAYER 1 — bottom */}
      <div className="flex-1 flex flex-col items-center justify-center gap-2 px-4 py-3" style={{ minHeight: 0 }}>
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
          style={{ background: 'rgba(0,0,0,0.80)', backdropFilter: 'blur(6px)' }}
        >
          <div
            className="rounded-2xl p-8 w-full max-w-xs space-y-5 text-center"
            style={{
              background: 'linear-gradient(180deg,#1a1408,#0d0a0f)',
              border: '2px solid rgba(212,175,55,0.6)',
              boxShadow: '0 0 48px rgba(212,175,55,0.18)',
            }}
          >
            <div className="text-5xl" aria-hidden>🏆</div>
            <p
              className="text-2xl font-bold"
              style={{ fontFamily: 'Cinzel, Georgia, serif', color: 'var(--gold)' }}
            >
              {winMessage}
            </p>
            <div className="flex gap-3">
              <LTButton
                variant="primary"
                size="md"
                fullWidth
                onClick={() => setConfirmNewGame(true)}
              >
                Nauja partija
              </LTButton>
              <LTButton
                variant="muted"
                size="md"
                fullWidth
                onClick={handleExit}
              >
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
          style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(4px)' }}
        >
          <div
            className="rounded-2xl p-6 w-full max-w-xs space-y-4"
            style={{
              background: 'linear-gradient(180deg,#13100a,#0d0a0f)',
              border: '1px solid rgba(212,175,55,0.22)',
            }}
          >
            <p
              className="text-base font-semibold text-center"
              style={{ color: 'var(--text-primary)', fontFamily: 'Cinzel, Georgia, serif' }}
            >
              Ar tikrai pradėti naują partiją?
            </p>
            <p className="text-xs text-center" style={{ color: 'var(--text-muted)' }}>
              HP ir žurnalo duomenys bus išvalyti.
            </p>
            <div className="flex gap-3">
              <LTButton
                variant="muted"
                size="sm"
                fullWidth
                onClick={() => setConfirmNewGame(false)}
              >
                Atšaukti
              </LTButton>
              <LTButton
                variant="danger"
                size="sm"
                fullWidth
                onClick={handleConfirmNewGame}
              >
                Taip
              </LTButton>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// PlayerZone — compact HP panel for BattleMode
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
  const color = hpColor(hp)
  const isCritical = hp <= 0
  const isDanger = hp > 0 && hp <= 10

  const borderColor = isActive
    ? '#d4af37'
    : isCritical
    ? 'rgba(239,68,68,0.4)'
    : 'rgba(255,255,255,0.07)'

  const panelBg = isActive
    ? 'linear-gradient(180deg,#17120a 0%,#0d0a0f 100%)'
    : 'linear-gradient(180deg,#111118 0%,#0a0a0f 100%)'

  return (
    <div
      className={'relative rounded-2xl overflow-hidden w-full max-w-lg' + (isActive ? ' lt-active-glow' : '')}
      style={{
        background: panelBg,
        border: `2px solid ${borderColor}`,
        boxShadow: isActive ? '0 0 0 1px rgba(212,175,55,0.12)' : 'none',
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        transition: 'border-color .25s ease',
      }}
    >
      {/* Flash overlay */}
      <div
        key={flashKey}
        className={flashType === 'damage' ? 'lt-flash-dmg' : flashType === 'heal' ? 'lt-flash-heal' : ''}
        style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 1, borderRadius: 'inherit' }}
      />

      <div className="relative z-10 flex flex-col items-center justify-center gap-2 p-4 flex-1">
        {/* Name */}
        <p
          className="text-sm font-semibold tracking-wide"
          style={{
            color: isActive ? 'var(--gold)' : 'var(--text-primary)',
            fontFamily: 'Cinzel, Georgia, serif',
          }}
        >
          {name}
        </p>

        {/* HP */}
        <div
          className="font-bold leading-none"
          style={{
            color,
            fontFamily: 'Cinzel, Georgia, serif',
            fontSize: 'clamp(3.5rem, 8vw, 5rem)',
            textShadow: isCritical ? '0 0 24px rgba(239,68,68,0.6)' : undefined,
          }}
        >
          {hp}
        </div>

        {isCritical && (
          <span
            className="text-xs font-bold px-2 py-0.5 rounded-full tracking-widest"
            style={{
              background: 'rgba(239,68,68,0.18)',
              color: '#ef4444',
              border: '1px solid rgba(239,68,68,0.35)',
              fontFamily: 'Cinzel, Georgia, serif',
            }}
          >
            PRALAIMĖJO
          </span>
        )}
        {isDanger && !isCritical && (
          <span
            className="text-xs font-bold px-2 py-0.5 rounded-full tracking-widest"
            style={{
              background: 'rgba(249,115,22,0.18)',
              color: '#f97316',
              border: '1px solid rgba(249,115,22,0.35)',
              fontFamily: 'Cinzel, Georgia, serif',
            }}
          >
            KRITINIS
          </span>
        )}

        {/* HP buttons */}
        <div className="w-full space-y-1.5">
          <div className="flex gap-1.5">
            {[-10, -5, -1].map((v) => (
              <LTButton
                key={v}
                variant="damage"
                size="sm"
                style={{ flex: 1 }}
                onClick={() => onHpChange(sideIdx, v)}
                aria-label={`${v} HP`}
              >
                {v}
              </LTButton>
            ))}
          </div>
          <div className="flex gap-1.5">
            {[1, 5, 10].map((v) => (
              <LTButton
                key={v}
                variant="heal"
                size="sm"
                style={{ flex: 1 }}
                onClick={() => onHpChange(sideIdx, v)}
                aria-label={`+${v} HP`}
              >
                +{v}
              </LTButton>
            ))}
          </div>
        </div>

        {/* Gold row */}
        <div className="flex items-center gap-2 mt-0.5">
          <LTButton
            variant="damage"
            size="xs"
            onClick={() => onGoldAdjust(-GOLD_STEP)}
            aria-label={`Atimti ${GOLD_STEP} aukso`}
          >
            &minus;
          </LTButton>
          <span
            className="text-sm font-bold tabular-nums min-w-[4.5rem] text-center"
            style={{ color: 'var(--gold)', fontFamily: 'Cinzel, Georgia, serif' }}
          >
            {gold}&thinsp;&#10052;
          </span>
          <LTButton
            variant="heal"
            size="xs"
            onClick={() => onGoldAdjust(GOLD_STEP)}
            aria-label={`Pridėti ${GOLD_STEP} aukso`}
          >
            +
          </LTButton>
        </div>
      </div>
    </div>
  )
}
