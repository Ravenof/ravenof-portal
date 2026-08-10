'use client'

// ── HP „ghost" juosta (game-feel fazė 6) ─────────────────────────────────────
// Skaičius, kuris tiesiog pasikeičia iš 6 į 2, nepasako, kad buvo prarasti 4 HP.
// Ghost juosta palieka prarastą dalį matomą ~300 ms raudonai, tada ją suskleidžia.
// Gydymas veikia veidrodiškai (žalias „delayed fill" iš apačios).
//
// Trukmės — TIK iš `timing.ts` (HP_GHOST). Jokio layout shift: keičiamas tik
// vidinių elementų `width`, konteineris fiksuoto dydžio.

import React, { useEffect, useRef, useState } from 'react'
import { HP_GHOST as T } from '@/lib/game/timing'
import { prefersReducedMotion } from '@/lib/game/tactile'

/**
 * Ghost reikšmės sekimas (bendras juostai ir herojaus flakonui).
 * Grąžina reikšmę, kuri po žalos dar `holdMs` laiko lieka ties senuoju HP.
 */
export function useHpGhost(hp: number): number {
  const [ghost, setGhost] = useState(hp)
  const prev = useRef(hp)
  const timer = useRef<number | null>(null)
  useEffect(() => {
    const before = prev.current
    prev.current = hp
    if (before === hp) return
    if (timer.current !== null) window.clearTimeout(timer.current)
    if (hp < before) {
      setGhost((gPrev) => Math.max(gPrev, before))   // serija prailgina, nemirksi
      timer.current = window.setTimeout(() => setGhost(hp), T.holdMs)
    } else {
      setGhost(hp)
    }
  }, [hp])
  useEffect(() => () => { if (timer.current !== null) window.clearTimeout(timer.current) }, [])
  return ghost
}

type Props = {
  hp: number
  maxHp: number
  /** Juostos aukštis px (default 3). */
  height?: number
  className?: string
}

export function HpGhostBar({ hp, maxHp, height = 3, className }: Props) {
  const safeMax = Math.max(1, maxHp)
  const cur = Math.max(0, Math.min(safeMax, hp))
  /** Praeities reikšmė, iš kurios „nusileidžia" ghost segmentas. */
  const [ghost, setGhost] = useState(cur)
  const prev = useRef(cur)
  const timers = useRef<number[]>([])

  useEffect(() => {
    const before = prev.current
    prev.current = cur
    if (before === cur) return
    for (const t of timers.current) window.clearTimeout(t)
    timers.current = []

    if (cur < before) {
      // Žala: ghost lieka ties senąja reikšme, tada susitraukia.
      setGhost(before)
      if (prefersReducedMotion()) {
        timers.current.push(window.setTimeout(() => setGhost(cur), T.holdMs))
      } else {
        // Kelių smūgių serija: naujas hold PRAILGINA ghost'ą, o ne mirksi —
        // `setGhost(before)` čia yra maksimumas, o ne perrašymas žemyn.
        timers.current.push(window.setTimeout(() => setGhost(cur), T.holdMs))
      }
    } else {
      // Gydymas: juosta prisipildo, ghost seka iš paskos (žalias fill).
      setGhost(cur)
    }
  }, [cur])

  useEffect(() => () => { for (const t of timers.current) window.clearTimeout(t) }, [])

  const pct = (cur / safeMax) * 100
  const ghostPct = (Math.max(ghost, cur) / safeMax) * 100
  const healing = ghost < cur
  const reduced = prefersReducedMotion()

  return (
    <div className={className} aria-hidden
      style={{ position: 'relative', width: '100%', height, borderRadius: height, overflow: 'hidden',
        background: 'rgba(0,0,0,0.72)', boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.6)' }}>
      {/* prarasta dalis (ghost) */}
      <span style={{
        position: 'absolute', left: 0, top: 0, bottom: 0, width: `${ghostPct}%`,
        background: healing ? 'rgba(94,240,192,0.55)' : 'rgba(239,68,68,0.9)',
        transition: reduced ? 'none' : `width ${healing ? T.healFillMs : T.collapseMs}ms ease-in`,
      }} />
      {/* dabartinis HP */}
      <span style={{
        position: 'absolute', left: 0, top: 0, bottom: 0, width: `${pct}%`,
        background: pct > 50 ? 'linear-gradient(90deg,#4ade80,#22c55e)'
          : pct > 25 ? 'linear-gradient(90deg,#fbbf24,#f59e0b)'
          : 'linear-gradient(90deg,#f87171,#ef4444)',
        transition: reduced ? 'none' : 'width 90ms linear',
      }} />
    </div>
  )
}
