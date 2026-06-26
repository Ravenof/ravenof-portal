'use client'

// ── PremiumCinematics eilė (queue) — React hook ──────────────────────────────
// Bendra eilė summon IR championSkill kino pop-up'ams. Niekada nerodo dviejų vienu metu.
// Cap'inta, dedupinama (tas pats card/skill efektų grandinėje nesidubliuoja).

import { useCallback, useRef, useState } from 'react'
import type { ActiveCinematic, CinematicCardInput, SummonTriggerContext } from './cinematics'
import { buildSummonCinematic, buildSkillCinematic } from './cinematics'

const DEFAULT_MAX_QUEUE = 3
const DEDUPE_WINDOW_MS = 1200  // tas pats dedupeKey per šį langą → praleidžiama

export type CinematicQueueApi = {
  current: ActiveCinematic | null
  enqueueSummonCinematic: (card: CinematicCardInput, ctx?: SummonTriggerContext) => void
  enqueueChampionSkillCinematic: (card: CinematicCardInput, skillIndex: number, ctx?: { skillNameFromEngine?: string }) => void
  enqueue: (item: ActiveCinematic | null) => void
  skip: () => void
  finish: () => void
  clear: () => void
}

export function useCinematicQueue(maxQueue: number = DEFAULT_MAX_QUEUE): CinematicQueueApi {
  const [current, setCurrent] = useState<ActiveCinematic | null>(null)
  const queueRef = useRef<ActiveCinematic[]>([])
  const currentRef = useRef<ActiveCinematic | null>(null)
  const recentRef = useRef<Map<string, number>>(new Map())

  const advance = useCallback(() => {
    const next = queueRef.current.shift() ?? null
    currentRef.current = next
    setCurrent(next)
  }, [])

  const enqueue = useCallback((item: ActiveCinematic | null) => {
    if (!item) return
    const now = Date.now()
    // dedupe (ta pati korta/skill per trumpą langą — pvz. efektų grandinė)
    const last = recentRef.current.get(item.dedupeKey)
    if (last && now - last < DEDUPE_WINDOW_MS) return
    recentRef.current.set(item.dedupeKey, now)
    // valom seną dedupe info
    if (recentRef.current.size > 32) {
      for (const [k, t] of recentRef.current) { if (now - t > DEDUPE_WINDOW_MS * 4) recentRef.current.delete(k) }
    }

    if (!currentRef.current) {
      currentRef.current = item
      setCurrent(item)
      return
    }
    // jau rodom — į eilę (jei nedubliuojam tos pačios eilėje ir neviršijam cap)
    if (queueRef.current.some((q) => q.dedupeKey === item.dedupeKey)) return
    if (queueRef.current.length >= maxQueue) {
      // numetam seniausią low-priority (summon prieš championSkill? abu vienodi — numetam patį seniausią)
      queueRef.current.shift()
    }
    queueRef.current.push(item)
  }, [maxQueue])

  const enqueueSummonCinematic = useCallback((card: CinematicCardInput, ctx?: SummonTriggerContext) => {
    enqueue(buildSummonCinematic(card, ctx))
  }, [enqueue])

  const enqueueChampionSkillCinematic = useCallback((card: CinematicCardInput, skillIndex: number, ctx?: { skillNameFromEngine?: string }) => {
    enqueue(buildSkillCinematic(card, skillIndex, ctx))
  }, [enqueue])

  const finish = useCallback(() => { advance() }, [advance])
  const skip = useCallback(() => { advance() }, [advance])
  const clear = useCallback(() => { queueRef.current = []; currentRef.current = null; setCurrent(null) }, [])

  return { current, enqueueSummonCinematic, enqueueChampionSkillCinematic, enqueue, skip, finish, clear }
}
