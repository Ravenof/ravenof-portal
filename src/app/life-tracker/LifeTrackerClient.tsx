'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import type { GameMode, GameState, LogEntry, ActionType } from '@/types/life-tracker'
import { defaultState, loadState, saveState } from '@/lib/life-tracker-storage'
import { playDamageSound, playHealSound, playTurnSound, playSwordClashSound } from '@/lib/life-tracker-sound'
import { LifePanel } from '@/components/life-tracker/LifePanel'
import { TurnTracker } from '@/components/life-tracker/TurnTracker'
import { ActionLog } from '@/components/life-tracker/ActionLog'
import { SoundToggle } from '@/components/life-tracker/SoundToggle'
import { BattleMode } from '@/components/life-tracker/BattleMode'
import { BattleModeIntro } from '@/components/life-tracker/BattleModeIntro'

type FlashState = { side: 0 | 1; type: ActionType; key: number }

function calcGold(round: number): number {
  return Math.min(round * 100, 1000)
}

export function LifeTrackerClient() {
  const [state, setState] = useState<GameState>(() => defaultState('1v1'))
  const [hydrated, setHydrated] = useState(false)
  const [flash, setFlash] = useState<FlashState | null>(null)
  const [showIntro, setShowIntro] = useState(false)
  const [battleMode, setBattleMode] = useState(false)

  // Refs to avoid stale closures in callbacks
  const soundRef = useRef(true)
  const stateRef = useRef(state)
  useEffect(() => { stateRef.current = state }, [state])

  // Hydrate from localStorage after mount
  useEffect(() => {
    const saved = loadState()
    if (saved) {
      setState(saved)
      soundRef.current = saved.soundEnabled
    }
    setHydrated(true)
  }, [])

  // Persist on every state change (after hydration)
  useEffect(() => {
    if (hydrated) saveState(state)
  }, [state, hydrated])

  // Keep soundRef in sync
  useEffect(() => {
    soundRef.current = state.soundEnabled
  }, [state.soundEnabled])

  const triggerFlash = useCallback((side: 0 | 1, type: ActionType) => {
    setFlash((prev) => ({ side, type, key: (prev?.key ?? 0) + 1 }))
  }, [])

  const handleHpChange = useCallback(
    (sideIdx: 0 | 1, delta: number) => {
      const cur = stateRef.current
      const prevHp = cur.hp[sideIdx]
      const rawNewHp = prevHp + delta
      const cappedHp = delta > 0 ? Math.min(rawNewHp, cur.maxHp) : rawNewHp
      const actualDelta = cappedHp - prevHp
      if (actualDelta === 0) return

      const actionType: ActionType = actualDelta < 0 ? 'damage' : 'heal'

      setState((prev) => {
        const prevHpInner = prev.hp[sideIdx]
        const rawNew = prevHpInner + delta
        const capped = delta > 0 ? Math.min(rawNew, prev.maxHp) : rawNew
        const actual = capped - prevHpInner
        if (actual === 0) return prev

        const newHpArr: [number, number] = [prev.hp[0], prev.hp[1]]
        newHpArr[sideIdx] = capped

        const entry: LogEntry = {
          id: Math.random().toString(36).slice(2) + Date.now().toString(36),
          round: prev.round,
          sideIdx,
          targetName: prev.names[sideIdx],
          change: actual,
          prevHp: prevHpInner,
          newHp: capped,
          actionType: actual < 0 ? 'damage' : 'heal',
          timestamp: Date.now(),
        }

        return { ...prev, hp: newHpArr, log: [entry, ...prev.log].slice(0, 20) }
      })

      triggerFlash(sideIdx, actionType)
      if (soundRef.current) {
        if (actionType === 'damage') playDamageSound()
        else playHealSound()
      }
    },
    [triggerFlash],
  )

  const handleUndo = useCallback(() => {
    setState((prev) => {
      if (prev.log.length === 0) return prev
      const [last, ...rest] = prev.log
      const newHp: [number, number] = [prev.hp[0], prev.hp[1]]
      newHp[last.sideIdx] = last.prevHp
      return { ...prev, hp: newHp, log: rest }
    })
  }, [])

  const handleNextTurn = useCallback(() => {
    setState((prev) => {
      const nextSide: 0 | 1 = prev.activeSide === 0 ? 1 : 0
      const newRound = nextSide === 0 ? prev.round + 1 : prev.round
      return { ...prev, round: newRound, activeSide: nextSide }
    })
    if (soundRef.current) playTurnSound()
  }, [])

  const handleResetTurn = useCallback(() => {
    if (!window.confirm('Atstatyti ratą į 1?')) return
    setState((prev) => ({ ...prev, round: 1, activeSide: 0 }))
  }, [])

  const handleReset = useCallback(() => {
    if (!window.confirm('Pradedame iš naujo? HP ir žurnalas bus išvalyti.')) return
    setState((prev) => ({
      ...defaultState(prev.mode),
      names: prev.names,
      soundEnabled: prev.soundEnabled,
    }))
  }, [])

  // Silent reset for BattleMode (confirm dialog handled inside BattleMode)
  const handleResetSilent = useCallback(() => {
    setState((prev) => ({
      ...defaultState(prev.mode),
      names: prev.names,
      soundEnabled: prev.soundEnabled,
    }))
  }, [])

  const handleModeChange = useCallback((newMode: GameMode) => {
    if (!window.confirm(`Pakeitus režimą į ${newMode}, žaidimas bus atstatytas. Tęsti?`)) return
    setState((prev) => ({
      ...defaultState(newMode),
      soundEnabled: prev.soundEnabled,
    }))
  }, [])

  const handleNameChange = useCallback((sideIdx: 0 | 1, name: string) => {
    setState((prev) => {
      const newNames: [string, string] = [prev.names[0], prev.names[1]]
      newNames[sideIdx] = name
      return { ...prev, names: newNames }
    })
  }, [])

  const handleSoundToggle = useCallback(() => {
    setState((prev) => ({ ...prev, soundEnabled: !prev.soundEnabled }))
  }, [])

  const handleEnterBattleMode = useCallback(() => {
    if (soundRef.current) playSwordClashSound()
    setShowIntro(true)
  }, [])

  const flashForSide = (sideIdx: 0 | 1): { type: ActionType | null; key: number } =>
    flash?.side === sideIdx
      ? { type: flash.type, key: flash.key }
      : { type: null, key: 0 }

  if (!hydrated) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: 'var(--bg-base)' }}
      >
        <p style={{ color: 'var(--text-muted)' }}>Kraunama...</p>
      </div>
    )
  }

  const gold = calcGold(state.round)
  const { type: flash0, key: fk0 } = flashForSide(0)
  const { type: flash1, key: fk1 } = flashForSide(1)
  const is2v2 = state.mode === '2v2'

  return (
    <>
      <style>{`
        @keyframes lt-flash-dmg {
          0%, 25% { background: rgba(239,68,68,0.38); }
          100% { background: transparent; }
        }
        @keyframes lt-flash-heal {
          0%, 25% { background: rgba(34,197,94,0.38); }
          100% { background: transparent; }
        }
        .lt-flash-dmg { animation: lt-flash-dmg 0.5s ease-out forwards; }
        .lt-flash-heal { animation: lt-flash-heal 0.5s ease-out forwards; }
        @keyframes lt-glow {
          0%, 100% { box-shadow: 0 0 0 0 rgba(212,175,55,0.0); }
          50% { box-shadow: 0 0 20px 3px rgba(212,175,55,0.22); }
        }
        .lt-active-glow { animation: lt-glow 2.2s ease-in-out infinite; }
      `}</style>

      {/* Sword crossing intro animation */}
      {showIntro && (
        <BattleModeIntro
          onComplete={() => {
            setShowIntro(false)
            setBattleMode(true)
          }}
        />
      )}

      {/* Battle Mode overlay */}
      {battleMode && (
        <BattleMode
          names={state.names}
          hp={state.hp}
          round={state.round}
          activeSide={state.activeSide}
          logLength={state.log.length}
          soundEnabled={state.soundEnabled}
          onHpChange={handleHpChange}
          onUndo={handleUndo}
          onNextTurn={handleNextTurn}
          onNewGame={handleResetSilent}
          onExit={() => setBattleMode(false)}
          flashType0={flash0}
          flashKey0={fk0}
          flashType1={flash1}
          flashKey1={fk1}
        />
      )}

      <div className="min-h-screen" style={{ background: 'var(--bg-base)' }}>
        {/* Header */}
        <header
          className="sticky top-0 z-20 border-b px-4 py-3 flex items-center justify-between gap-3"
          style={{
            background: 'rgba(10,10,15,0.95)',
            backdropFilter: 'blur(12px)',
            borderColor: 'var(--bg-border)',
          }}
        >
          <div className="flex items-center gap-3">
            <Link
              href="/cards"
              className="text-xs hover:opacity-70 transition-opacity"
              style={{ color: 'var(--text-muted)' }}
            >
              &larr; Kortų bazė
            </Link>
            <span style={{ color: 'var(--bg-border)' }}>|</span>
            <h1
              className="text-lg font-bold"
              style={{ fontFamily: 'Cinzel, Georgia, serif', color: 'var(--gold)' }}
            >
              Life Tracker
            </h1>
          </div>
          <SoundToggle enabled={state.soundEnabled} onToggle={handleSoundToggle} />
        </header>

        <div className="max-w-screen-xl mx-auto px-3 py-4 space-y-3">
          {/* Mode selector + Reset + Kovos režimas */}
          <div className="flex items-center gap-2 flex-wrap">
            {(['1v1', '2v2'] as GameMode[]).map((m) => (
              <button
                key={m}
                onClick={() => state.mode !== m && handleModeChange(m)}
                className="px-5 py-2.5 rounded-lg text-sm font-bold transition min-h-[44px]"
                style={{
                  background: state.mode === m ? 'var(--gold)' : 'var(--bg-surface)',
                  color: state.mode === m ? '#0a0a0f' : 'var(--text-muted)',
                  border: '1px solid ' + (state.mode === m ? 'var(--gold)' : 'var(--bg-border)'),
                }}
              >
                {m}
              </button>
            ))}

            <button
              onClick={handleReset}
              className="px-3 py-2.5 rounded-lg text-xs transition hover:opacity-80 min-h-[44px]"
              style={{
                background: 'var(--bg-surface)',
                color: 'var(--text-muted)',
                border: '1px solid var(--bg-border)',
              }}
            >
              Reset Game
            </button>

            {/* Kovos režimas button */}
            <div className="ml-auto flex flex-col items-end gap-1">
              <button
                onClick={() => !is2v2 && handleEnterBattleMode()}
                disabled={is2v2}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold transition hover:opacity-90 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed min-h-[44px]"
                style={{
                  background: is2v2 ? 'var(--bg-surface)' : 'linear-gradient(135deg, #7c3aed, #4f46e5)',
                  color: is2v2 ? 'var(--text-muted)' : 'white',
                  border: '1px solid ' + (is2v2 ? 'var(--bg-border)' : '#7c3aed'),
                }}
                aria-label="Įjungti Kovos režimą"
              >
                &#9876; Kovos režimas
              </button>
              {is2v2 && (
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  Kovos režimas šiuo metu pritaikytas 1 prieš 1 partijai.
                </p>
              )}
            </div>
          </div>

          {/* HP Panels */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {([0, 1] as const).map((sideIdx) => {
              const { type: flashType, key: flashKey } = flashForSide(sideIdx)
              return (
                <LifePanel
                  key={sideIdx}
                  sideIdx={sideIdx}
                  name={state.names[sideIdx]}
                  hp={state.hp[sideIdx]}
                  isActive={state.activeSide === sideIdx}
                  flashType={flashType}
                  flashKey={flashKey}
                  onHpChange={handleHpChange}
                  onNameChange={handleNameChange}
                />
              )
            })}
          </div>

          {/* Turn Tracker */}
          <TurnTracker
            round={state.round}
            gold={gold}
            activeName={state.names[state.activeSide]}
            onNextTurn={handleNextTurn}
            onResetTurn={handleResetTurn}
          />

          {/* Undo */}
          <button
            onClick={handleUndo}
            disabled={state.log.length === 0}
            className="w-full py-3 rounded-xl text-sm font-medium transition hover:opacity-80 disabled:opacity-30"
            style={{
              background: 'var(--bg-surface)',
              color: 'var(--text-secondary)',
              border: '1px solid var(--bg-border)',
            }}
          >
            &#8617; Atšaukti paskutinį veiksmą
          </button>

          {/* Action Log */}
          <ActionLog log={state.log} />
        </div>
      </div>
    </>
  )
}
