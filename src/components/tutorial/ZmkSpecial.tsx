'use client'

// ── ŽMK ×2 / ×0 prezentacija (game-feel fazė 7) ──────────────────────────────
// Ravenof kovos parašas: KIEKVIENA žala eina per ŽMK. Bet jei visos septynios
// reikšmės atrodo vienodai, sistema tampa nematoma. Čia dvi kraštinės reikšmės
// gauna savo momentą:
//
//   ×2 „Kritinis smūgis"  — tyla (muzika −12 dB) → korta trenkiasi į centrą →
//                            bass hit → ×2 glifas. Po to impact eina su
//                            DEVASTATING profiliu (žala jau padvigubinta, tad
//                            resolveSeverity dažniausiai tai duoda pats).
//   ×0 „Visiška nesėkmė"  — korta blėsta, glifas subyra, tylus „fizzle".
//
// Trukmės — TIK iš `timing.ts` (ZMK_PRESENT). Reduced-motion: statinis glifas.

import React, { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { ZMK_PRESENT as T } from '@/lib/game/timing'
import { playBattleSound } from '@/lib/game/soundManager'
import { duckMusic } from '@/lib/game/musicManager'
import { prefersReducedMotion } from '@/lib/game/tactile'
import { t as tGlobal } from '@/lib/i18n/core'

export type ZmkSpecialKind = 'x2' | 'x0'

/** 2v2 turi 4 seat'us; prezentacijai svarbu tik „mano" ar „priešo" pusė. */
export type ZmkSide = string

export function ZmkSpecial({ kind, side, onDone }: {
  kind: ZmkSpecialKind
  side: ZmkSide
  onDone: () => void
}) {
  const crit = kind === 'x2'
  const reduced = prefersReducedMotion()
  const total = crit
    ? (reduced ? 400 : T.critAnticipationMs + T.critSlamMs + T.critHoldMs)
    : (reduced ? 300 : T.fizzleMs)

  // SVARBU: efektas privalo suveikti TIKSLIAI VIENĄ kartą per sumontavimą.
  // `onDone` iš tėvo ateina kaip inline arrow, tad kiekvienas tėvo re-render'is
  // duoda naują funkcijos identitetą. Jei jis būtų dep'uose, efektas persileistų
  // per kiekvieną re-render'į ir garsas grotų vėl ir vėl (pypsėjimas).
  // Todėl: callback'as laikomas ref'e, deps = [] (montavimas), garsas — su guard'u.
  const onDoneRef = useRef(onDone)
  onDoneRef.current = onDone
  const firedRef = useRef(false)

  useEffect(() => {
    if (firedRef.current) return
    firedRef.current = true
    let alive = true
    const timers: number[] = []
    if (crit) {
      // Anticipacija: muzika pasitraukia, kad bass hit turėtų kur nuskambėti.
      duckMusic(T.critDuckDb, T.critAnticipationMs + T.critSlamMs)
      timers.push(window.setTimeout(() => { if (alive) playBattleSound('zmkCrit', 0.7) }, reduced ? 0 : T.critAnticipationMs))
    } else {
      playBattleSound('zmkFizzle', 0.5)
    }
    timers.push(window.setTimeout(() => { if (alive) onDoneRef.current() }, total))
    return () => { alive = false; for (const x of timers) window.clearTimeout(x) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const col = crit ? '#ffd24a' : '#7a8391'
  const label = crit ? '×2' : '×0'
  const caption = crit
    ? tGlobal('battle.game.zmkCritTitle')
    : tGlobal('battle.game.zmkFizzleTitle')
  const who = (side === 'you' || side === 'ally') ? tGlobal('battle.game.zmkSideYou') : tGlobal('battle.game.zmkSideAi')

  return (
    <div className="fixed inset-0 z-[132] flex items-center justify-center pointer-events-none" aria-hidden>
      {/* vinjetė – tik kritiniam, kad ×0 liktų „tylus" */}
      {crit && !reduced && (
        <motion.div className="absolute inset-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.72, 0.55, 0] }}
          transition={{ duration: total / 1000, times: [0, 0.28, 0.7, 1] }}
          style={{ background: 'radial-gradient(circle at 50% 50%, transparent 30%, rgba(4,2,8,0.82) 100%)' }} />
      )}
      <motion.div
        className="flex flex-col items-center gap-1"
        initial={reduced ? { opacity: 1 } : crit ? { scale: 3.2, opacity: 0, rotate: -8 } : { scale: 1, opacity: 0.9 }}
        animate={reduced
          ? { opacity: 1 }
          : crit
            ? { scale: [3.2, 0.94, 1.06, 1], opacity: [0, 1, 1, 1], rotate: [-8, 2, 0, 0] }
            : { scale: [1, 1.04, 0.86], opacity: [0.9, 0.75, 0], filter: ['blur(0px)', 'blur(1px)', 'blur(6px)'] }}
        transition={{ duration: total / 1000, times: crit ? [0, 0.42, 0.62, 1] : [0, 0.4, 1], ease: crit ? 'easeOut' : 'easeIn' }}>
        <span style={{
          fontFamily: 'var(--rvn-font-display)', fontWeight: 900,
          fontSize: 'min(140px, 26vw)', lineHeight: 1, color: col,
          textShadow: crit
            ? `0 0 34px ${col}, 0 0 12px #fff, 0 6px 10px rgba(0,0,0,0.95)`
            : '0 2px 8px rgba(0,0,0,0.9)',
          WebkitTextStroke: crit ? '2px rgba(255,255,255,0.65)' : undefined,
        }}>{label}</span>
        <span className="px-3 py-1 rounded-full text-xs font-bold"
          style={{ background: 'rgba(8,6,12,0.92)', border: `1px solid ${col}`, color: col,
            fontFamily: 'var(--rvn-font-display)', letterSpacing: '0.08em' }}>
          {who} · {caption}
        </span>
      </motion.div>
    </div>
  )
}

/** Specialaus permaišymo švysnis prie ŽMK zonos (po ×2 / ×0). */
export function ZmkReshuffleFlash({ side, onDone }: { side: ZmkSide; onDone: () => void }) {
  // Ta pati taisyklė kaip `ZmkSpecial`: vienkartinis efektas, callback'as per ref'ą.
  const onDoneRef = useRef(onDone)
  onDoneRef.current = onDone
  useEffect(() => {
    const t = window.setTimeout(() => onDoneRef.current(), T.reshuffleMs)
    return () => window.clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const el = typeof document !== 'undefined'
    ? document.querySelector(`[data-pile="deck-${side}"]`) ?? document.querySelector(`[data-tut="hp"]`)
    : null
  const r = el?.getBoundingClientRect()
  const x = r ? r.left + r.width / 2 : (typeof window !== 'undefined' ? window.innerWidth / 2 : 0)
  const y = r ? r.top + r.height / 2 : (typeof window !== 'undefined' ? window.innerHeight / 2 : 0)
  return (
    <div className="fixed inset-0 z-[130] pointer-events-none" aria-hidden>
      <motion.div className="absolute" style={{ left: x, top: y, transform: 'translate(-50%,-50%)' }}
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: [0.5, 1.25, 1], opacity: [0, 1, 0] }}
        transition={{ duration: T.reshuffleMs / 1000, ease: 'easeOut' }}>
        <span className="px-2 py-1 rounded-md text-[11px] font-bold"
          style={{ background: 'rgba(8,6,12,0.92)', border: '1px solid var(--gold)', color: 'var(--gold)',
            fontFamily: 'var(--rvn-font-display)', whiteSpace: 'nowrap' }}>
          {tGlobal('battle.game.zmkReshuffled')}
        </span>
      </motion.div>
    </div>
  )
}
