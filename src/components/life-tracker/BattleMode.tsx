'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import type { ActionType } from '@/types/life-tracker'

function calcGold(round: number): number {
  return Math.min(round * 100, 1000)
}

type Props = {
  names: [string, string]
  hp: [number, number]
  round: number
  activeSide: 0 | 1
  logLength: number
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

export function BattleMode({
  names, hp, round, activeSide, logLength,
  onHpChange, onUndo, onNextTurn, onNewGame, onExit,
  flashType0, flashKey0, flashType1, flashKey1,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [confirmNewGame, setConfirmNewGame] = useState(false)
  const [gold, setGold] = useState<[number, number]>([calcGold(round), calcGold(round)])
  const prevRoundRef = useRef(round)

  // Reset gold for both players when round increments
  useEffect(() => {
    if (prevRoundRef.current !== round) {
      prevRoundRef.current = round
      setGold([calcGold(round), calcGold(round)])
    }
  }, [round])

  // Try fullscreen on mount; clean up on unmount
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    el.requestFullscreen?.().catch(() => { /* silently ignore if not supported */ })
    return () => {
      if (document.fullscreenElement) {
        document.exitFullscreen?.().catch(() => {})
      }
    }
  }, [])

  const handleExit = useCallback(() => {
    if (document.fullscreenElement) {
      document.exitFullscreen?.().catch(() => {})
    }
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
    onNewGame()
  }, [onNewGame])

  const activeName = names[activeSide]

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 flex flex-col overflow-hidden select-none"
      style={{ background: 'var(--bg-base)' }}
    >
      {/* ===== PLAYER 2 — top, rotated 180deg ===== */}
      <div
        className="flex-1 flex flex-col items-center justify-center gap-2 px-4 py-3"
        style={{ transform: 'rotate(180deg)', minHeight: 0 }}
      >
        <PlayerZone
          sideIdx={1}
          name={names[1]}
          hp={hp[1]}
          isActive={activeSide === 1}
          flashType={flashType1}
          flashKey={flashKey1}
          onHpChange={onHpChange}
        />
      </div>

      {/* ===== MIDDLE ZONE ===== */}
      <div
        className="flex-shrink-0 px-4 py-3 space-y-2.5"
        style={{
          background: 'var(--bg-surface)',
          borderTop: '1px solid var(--bg-border)',
          borderBottom: '1px solid var(--bg-border)',
        }}
      >
        {/* Ejimas + active player */}
        <div className="flex items-center justify-between gap-3">
          <span
            className="text-xl font-bold"
            style={{ fontFamily: 'Cinzel, Georgia, serif', color: 'var(--gold)' }}
          >
            Ejimas {round}
          </span>
          <span
            className="text-sm font-semibold px-3 py-1 rounded-full"
            style={{
              background: 'rgba(212,175,55,0.15)',
              color: 'var(--gold)',
              border: '1px solid rgba(212,175,55,0.3)',
            }}
          >
            Zaidzia: {activeName}
          </span>
        </div>

        {/* Gold per player */}
        <div className="grid grid-cols-2 gap-3">
          {([0, 1] as const).map((sideIdx) => (
            <div key={sideIdx} className="flex items-center gap-1.5">
              <span
                className="text-xs truncate flex-shrink min-w-0"
                style={{ color: 'var(--text-muted)', maxWidth: '4rem' }}
              >
                {names[sideIdx]}
              </span>
              <div className="flex items-center gap-1 ml-auto">
                <button
                  onClick={() => adjustGold(sideIdx, -1)}
                  className="w-7 h-7 rounded-lg text-sm font-bold active:scale-95 transition-transform flex items-center justify-center"
                  style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)' }}
                  aria-label={`${names[sideIdx]} auksas minus 1`}
                >
                  &minus;
                </button>
                <span
                  className="text-sm font-bold tabular-nums w-14 text-center"
                  style={{ color: 'var(--gold)', fontFamily: 'Cinzel, Georgia, serif' }}
                >
                  {gold[sideIdx]}&thinsp;&#10052;
                </span>
                <button
                  onClick={() => adjustGold(sideIdx, 1)}
                  className="w-7 h-7 rounded-lg text-sm font-bold active:scale-95 transition-transform flex items-center justify-center"
                  style={{ background: 'rgba(34,197,94,0.15)', color: '#4ade80', border: '1px solid rgba(34,197,94,0.3)' }}
                  aria-label={`${names[sideIdx]} auksas plius 1`}
                >
                  +
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Action buttons */}
        <div className="flex gap-1.5">
          <button
            onClick={onUndo}
            disabled={logLength === 0}
            className="px-3 py-2.5 rounded-xl text-xs font-medium transition hover:opacity-80 disabled:opacity-30 min-h-[44px]"
            style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)', border: '1px solid var(--bg-border)' }}
            aria-label="Atsaukti paskutini veiksma"
          >
            &#8617; Atsaukti
          </button>
          <button
            onClick={onNextTurn}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold transition hover:opacity-90 active:scale-95 min-h-[44px]"
            style={{ background: 'var(--gold)', color: '#0a0a0f' }}
          >
            Kitas ejimas &rarr;
          </button>
          <button
            onClick={() => setConfirmNewGame(true)}
            className="px-3 py-2.5 rounded-xl text-xs font-medium transition hover:opacity-80 min-h-[44px]"
            style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)', border: '1px solid var(--bg-border)' }}
          >
            Nauja partija
          </button>
          <button
            onClick={handleExit}
            className="px-3 py-2.5 rounded-xl text-xs font-medium transition hover:opacity-80 min-h-[44px]"
            style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)' }}
          >
            Iseiti
          </button>
        </div>
      </div>

      {/* ===== PLAYER 1 — bottom, normal orientation ===== */}
      <div className="flex-1 flex flex-col items-center justify-center gap-2 px-4 py-3" style={{ minHeight: 0 }}>
        <PlayerZone
          sideIdx={0}
          name={names[0]}
          hp={hp[0]}
          isActive={activeSide === 0}
          flashType={flashType0}
          flashKey={flashKey0}
          onHpChange={onHpChange}
        />
      </div>

      {/* ===== Confirm: Nauja partija ===== */}
      {confirmNewGame && (
        <div
          className="absolute inset-0 z-10 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.80)', backdropFilter: 'blur(4px)' }}
        >
          <div
            className="rounded-2xl p-6 w-full max-w-xs space-y-4"
            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--bg-border)' }}
          >
            <p
              className="text-base font-semibold text-center"
              style={{ color: 'var(--text-primary)', fontFamily: 'Cinzel, Georgia, serif' }}
            >
              Ar tikrai pradeti nauja partija?
            </p>
            <p className="text-xs text-center" style={{ color: 'var(--text-muted)' }}>
              HP ir zurnalo duomenys bus issvalyti.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmNewGame(false)}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium transition hover:opacity-80"
                style={{ background: 'var(--bg-border)', color: 'var(--text-secondary)' }}
              >
                Atsaukti
              </button>
              <button
                onClick={handleConfirmNewGame}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold transition hover:opacity-90 active:scale-95"
                style={{ background: '#ef4444', color: 'white' }}
              >
                Taip
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// PlayerZone — compact HP panel for BattleMode
// ─────────────────────────────────────────────────────────────────────────────
type PlayerZoneProps = {
  sideIdx: 0 | 1
  name: string
  hp: number
  isActive: boolean
  flashType: ActionType | null
  flashKey: number
  onHpChange: (sideIdx: 0 | 1, delta: number) => void
}

function PlayerZone({ sideIdx, name, hp, isActive, flashType, flashKey, onHpChange }: PlayerZoneProps) {
  const color = hpColor(hp)
  const isCritical = hp <= 0
  const isDanger = hp > 0 && hp <= 10

  return (
    <div
      className={'relative rounded-2xl overflow-hidden w-full max-w-lg' + (isActive ? ' lt-active-glow' : '')}
      style={{
        background: 'var(--bg-surface)',
        border: '2px solid ' + (isActive ? 'var(--gold)' : 'var(--bg-border)'),
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
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
          className="text-sm font-semibold"
          style={{ color: 'var(--text-primary)', fontFamily: 'Cinzel, Georgia, serif' }}
        >
          {name}
        </p>

        {/* HP */}
        <div
          className="text-7xl font-bold leading-none"
          style={{
            color,
            fontFamily: 'Cinzel, Georgia, serif',
            textShadow: isCritical ? '0 0 24px rgba(239,68,68,0.6)' : undefined,
          }}
        >
          {hp}
        </div>

        {/* Status badges */}
        {isCritical && (
          <span
            className="text-xs font-bold px-2 py-0.5 rounded-full"
            style={{ background: 'rgba(239,68,68,0.2)', color: '#ef4444' }}
          >
            PRALAIMEJO
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

        {/* HP buttons */}
        <div className="w-full space-y-1.5">
          <div className="flex gap-1.5">
            {[-10, -5, -1].map((v) => (
              <button
                key={v}
                onClick={() => onHpChange(sideIdx, v)}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-all active:scale-95"
                style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171', border: '1px solid rgba(239,68,68,0.35)' }}
                aria-label={`${v} HP`}
              >
                {v}
              </button>
            ))}
          </div>
          <div className="flex gap-1.5">
            {[1, 5, 10].map((v) => (
              <button
                key={v}
                onClick={() => onHpChange(sideIdx, v)}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-all active:scale-95"
                style={{ background: 'rgba(34,197,94,0.15)', color: '#4ade80', border: '1px solid rgba(34,197,94,0.35)' }}
                aria-label={`+${v} HP`}
              >
                +{v}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
