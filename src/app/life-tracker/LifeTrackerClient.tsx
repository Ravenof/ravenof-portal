'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import type { GameMode, GameState, LogEntry, ActionType } from '@/types/life-tracker'
import { defaultState, loadState, saveState } from '@/lib/life-tracker-storage'
import { playDamageSound, playHealSound, playTurnSound } from '@/lib/life-tracker-sound'
import { LifePanel } from '@/components/life-tracker/LifePanel'
import { TurnTracker } from '@/components/life-tracker/TurnTracker'
import { ActionLog } from '@/components/life-tracker/ActionLog'
import { SoundToggle } from '@/components/life-tracker/SoundToggle'

type FlashState = { side: 0 | 1; type: ActionType; key: number }

export function LifeTrackerClient() {
  const [state, setState] = useState<GameState>(() => defaultState('1v1'))
  const [hydrated, setHydrated] = useState(false)
  const [flash, setFlash] = useState<FlashState | null>(null)
  const soundRef = useRef(true)

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
      const actionType: ActionType = delta < 0 ? 'damage' : 'heal'

      setState((prev) => {
        const prevHp = prev.hp[sideIdx]
        const newHp = prevHp + delta
        const newHp2: [number, number] = [prev.hp[0], prev.hp[1]]
        newHp2[sideIdx] = newHp

        const entry: LogEntry = {
          id: Math.random().toString(36).slice(2) + Date.now().toString(36),
          turn: prev.turn,
          sideIdx,
          targetName: prev.names[sideIdx],
          change: delta,
          prevHp,
          newHp,
          actionType,
          timestamp: Date.now(),
        }

        return {
          ...prev,
          hp: newHp2,
          log: [entry, ...prev.log].slice(0, 20),
        }
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
    setState((prev) => ({
      ...prev,
      turn: prev.turn + 1,
      activeSide: prev.activeSide === 0 ? 1 : 0,
    }))
    if (soundRef.current) playTurnSound()
  }, [])

  const handleResetTurn = useCallback(() => {
    if (!window.confirm('Atstatyti ejima i 1?')) return
    setState((prev) => ({ ...prev, turn: 1, activeSide: 0 }))
  }, [])

  const handleReset = useCallback(() => {
    if (!window.confirm('Pradedam is naujo? HP ir log bus issvalyti.')) return
    setState((prev) => ({
      ...defaultState(prev.mode),
      names: prev.names,
      soundEnabled: prev.soundEnabled,
    }))
  }, [])

  const handleModeChange = useCallback((newMode: GameMode) => {
    if (!window.confirm(`Pakeitus mode i ${newMode}, zaidimas bus resetintas. Testi?`)) return
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
          {/* Mode selector + Reset */}
          <div className="flex items-center gap-2">
            {(['1v1', '2v2'] as GameMode[]).map((m) => (
              <button
                key={m}
                onClick={() => state.mode !== m && handleModeChange(m)}
                className="px-5 py-1.5 rounded-lg text-sm font-bold transition"
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
              className="ml-auto px-3 py-1.5 rounded-lg text-xs transition hover:opacity-80"
              style={{
                background: 'var(--bg-surface)',
                color: 'var(--text-muted)',
                border: '1px solid var(--bg-border)',
              }}
            >
              Reset Game
            </button>
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
            turn={state.turn}
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
            &#8617; Undo paskutini veiksma
          </button>

          {/* Action Log */}
          <ActionLog log={state.log} />
        </div>
      </div>
    </>
  )
}
