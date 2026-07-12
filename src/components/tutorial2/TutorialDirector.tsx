'use client'

// ════════════════════════════════════════════════════════════════════════════
// TutorialDirector — orchestrates one data-driven lesson over TutorialGame:
// scripted setup, action gating (no fail), scripted enemy turns, step machine
// (dialogue → act → complete), highlight/objective overlay, analytics, reward.
// ════════════════════════════════════════════════════════════════════════════

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { TutorialGame, DEMO_DECK_ID, type TutorialHooks } from '@/components/tutorial/TutorialGame'
import { applyNetAction, beginTurn, endTurn, recomputeAuras, P, type GameState, type GameEvent, type NetAction, type TargetRef, type Side, type BoardArtifact } from '@/lib/tutorial/engine'
import { CardPool } from '@/lib/tutorial2/cardPool'
import { TutorialAnalytics } from '@/lib/tutorial2/analytics'
import { completeLesson } from '@/lib/tutorial2/lessonLoader'
import type { LessonRow, LessonStep, HighlightTarget, AllowedAction, ScriptedAction } from '@/lib/tutorial2/lessonTypes'
import { TutorialOverlay, type OverlayDialogue } from './TutorialOverlay'
import { useT } from '@/lib/i18n/react'

const ANCHOR_TUT: Record<string, string> = {
  hand: 'hand', gold: 'gold', 'hp-you': 'hp', 'hp-ai': 'ai-area', 'deck-you': 'deck', 'deck-ai': 'ai-area',
  'discard-you': 'discard', 'discard-ai': 'ai-area', 'units-you': 'units-you', 'units-ai': 'units-ai',
  zmk: 'zmk', 'artifacts-you': 'artifacts', 'reactions-you': 'reactions', field: 'field',
  'end-turn': 'end-turn', 'discard-gold': 'discard-gold', 'enemy-area': 'ai-area', board: 'units-you',
}

export function TutorialDirector({ lesson, onExit }: { lesson: LessonRow; onExit: (completed: boolean) => void }) {
  const t = useT()
  const cfg = lesson.config
  const steps = useMemo(() => cfg.steps ?? [], [cfg])
  const [pool, setPool] = useState<CardPool | null>(null)
  const [stepIdx, setStepIdx] = useState(0)
  const [dialogueIdx, setDialogueIdx] = useState(0)
  const [phase, setPhase] = useState<'loading' | 'play' | 'reward'>('loading')
  const [reward, setReward] = useState<LessonRow['reward_payload']>({})

  const stepIdxRef = useRef(0)
  const dialogueActiveRef = useRef(true)
  const enemyCursor = useRef(0)
  const enemyDone = useRef(false)
  const gameRef = useRef<GameState | null>(null)
  const advancing = useRef(false)
  const analytics = useRef<TutorialAnalytics | null>(null)
  const startedAt = useRef(0)

  const step: LessonStep | undefined = steps[stepIdx]

  // ── load card pool + analytics ──
  useEffect(() => {
    let alive = true
    analytics.current = new TutorialAnalytics(lesson.slug, lesson.id)
    CardPool.load().then((p) => {
      if (!alive) return
      setPool(p); setPhase('play'); startedAt.current = Date.now()
      analytics.current?.lessonStart()
      analytics.current?.stepStart(steps[0]?.id ?? 'start')
    })
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lesson.id])

  // keep refs synced
  useEffect(() => { stepIdxRef.current = stepIdx }, [stepIdx])
  useEffect(() => {
    const len = step?.dialogue?.length ?? 0
    dialogueActiveRef.current = dialogueIdx < len
  }, [dialogueIdx, step])

  // ── step machine ──
  const enterStep = useCallback((idx: number) => {
    enemyCursor.current = 0; enemyDone.current = false
    setStepIdx(idx); setDialogueIdx(0)
    analytics.current?.stepStart(steps[idx]?.id ?? String(idx))
  }, [steps])

  const finishLesson = useCallback(async () => {
    if (phase === 'reward') return
    setPhase('reward')
    analytics.current?.lessonComplete()
    const res = await completeLesson(lesson.id, Date.now() - startedAt.current)
    setReward(res.reward ?? lesson.reward_payload ?? {})
  }, [phase, lesson.id, lesson.reward_payload])

  const advanceStep = useCallback(() => {
    if (advancing.current) return
    advancing.current = true
    const cur = stepIdxRef.current
    analytics.current?.stepComplete(steps[cur]?.id ?? String(cur))
    const next = cur + 1
    setTimeout(() => {
      advancing.current = false
      if (next >= steps.length) void finishLesson()
      else enterStep(next)
    }, 120)
  }, [steps, enterStep, finishLesson])

  // dialogue "Toliau"
  const onNext = useCallback(() => {
    const s = steps[stepIdxRef.current]; if (!s) return
    const len = s.dialogue?.length ?? 0
    if (dialogueIdx < len - 1) { setDialogueIdx((i) => i + 1); return }
    // last line dismissed
    if (s.complete.on === 'next') { advanceStep(); return }
    setDialogueIdx(len) // enter act/wait mode
    if (s.complete.on === 'auto') setTimeout(() => advanceStep(), s.complete.delayMs ?? 800)
  }, [steps, dialogueIdx, advanceStep])

  // ── scripted enemy action ──
  const runScripted = useCallback((g: GameState, a: ScriptedAction) => {
    const findFoe = (name?: string): TargetRef => {
      if (!name) return { kind: 'player', side: 'you' }
      const t = g.you.units.find((x) => x?.card.name === name)
      return t ? { kind: 'unit', side: 'you', uid: t.uid } : { kind: 'player', side: 'you' }
    }
    if (a.type === 'play') {
      const u = g.ai.hand.find((c) => c.name === a.cardName); if (!u) return
      const target = a.targetFace ? ({ kind: 'player', side: 'you' } as TargetRef) : a.targetCard ? findFoe(a.targetCard) : undefined
      applyNetAction(g, { t: 'play', actor: 'ai', uid: u.uid, target })
    } else if (a.type === 'attack') {
      const at = g.ai.units.find((x) => x?.card.name === a.attackerCard); if (!at) return
      applyNetAction(g, { t: 'attack', actor: 'ai', uid: at.uid, target: a.face ? { kind: 'player', side: 'you' } : findFoe(a.targetCard) })
    } else if (a.type === 'useChampion') {
      applyNetAction(g, { t: 'champ', actor: 'ai', skillIndex: a.skillIndex ?? 0, target: a.targetFace ? { kind: 'player', side: 'you' } : a.targetCard ? findFoe(a.targetCard) : undefined })
    } else if (a.type === 'endTurn') {
      endTurn(g); if (!g.winner) beginTurn(g); enemyDone.current = true
    }
  }, [])

  // ── completion matcher ──
  const checkComplete = useCallback((fresh: GameEvent[], g: GameState) => {
    const s = steps[stepIdxRef.current]; if (!s || dialogueActiveRef.current) return
    const c = s.complete
    if (g.winner === 'you' && (c.on === 'win')) { advanceStep(); return }
    if (c.on === 'win' && fresh.some((e) => e.t === 'win' && e.side === 'you')) { advanceStep(); return }
    if (c.on === 'enemyTurnDone' && enemyDone.current && g.active === 'you') { advanceStep(); return }
    if (c.on === 'event') {
      const hit = fresh.some((e) => e.t === c.eventType && (!c.side || e.side === c.side) && (!c.cardName || e.cardName === c.cardName))
      if (hit) advanceStep()
    }
    // safety: player accidentally won earlier
    if (g.winner === 'you' && c.on !== 'win' && c.on !== 'next') { /* let current step resolve; ignore */ }
  }, [steps, advanceStep])

  // ── action gating ──
  const matchAction = useCallback((a: NetAction, allow: AllowedAction[], g: GameState): boolean => {
    for (const al of allow) {
      const k = al.kind
      if (a.t === 'play') {
        const card = g.you.hand.find((c) => c.uid === a.uid)
        if (!card) continue
        const champOnBoard = g.you.units.some((u) => u?.isChampion)
        const isUpgrade = card.type === 'champion' && champOnBoard
        if (k === 'upgrade-champion' && isUpgrade) return true
        const kindOk = k === 'play-any' || (k === 'play-unit' && card.type === 'unit') || (k === 'play-spell' && card.type === 'spell') || (k === 'play-artifact' && card.type === 'artifact')
        if (kindOk && (!al.cardName || al.cardName === card.name)) return true
      } else if (a.t === 'attack') {
        const faceT = a.target.kind === 'player'
        if (k === 'attack-any') return true
        if (k === 'attack-face' && faceT) return true
        if (k === 'attack-unit' && a.target.kind === 'unit') {
          if (!al.targetName) return true
          const tuid = a.target.uid
          const t = g.ai.units.find((u) => u?.uid === tuid)
          if (t?.card.name === al.targetName) return true
        }
      } else if (a.t === 'champ' && k === 'use-champion') return true
      else if (a.t === 'endTurn' && k === 'end-turn') return true
      else if (a.t === 'discardForGold' && k === 'discard-gold') return true
    }
    return false
  }, [])

  // ── scripted setup (mutate fresh game) ──
  const applySetup = useCallback((g: GameState) => {
    if (!pool) return
    const setup = cfg.setup ?? {}
    const fill = (side: Side, sc?: typeof setup.player) => {
      if (!sc) return
      const p = P(g, side)
      const sfx = side === 'you' ? 'y' : 'e'
      if (sc.hand) p.hand = pool.cards(sc.hand, sfx + 'h')
      if (sc.deck) p.deck = pool.cards(sc.deck, sfx + 'd')
      const units: (typeof p.units) = [null, null, null, null, null]
      let slot = 0
      for (const nm of sc.board ?? []) { const u = pool.unit(nm, sfx + 'b'); if (u && slot < 5) units[slot++] = u }
      if (sc.champion) { const ch = pool.unit(sc.champion, sfx + 'c'); if (ch && slot < 5) { ch.isChampion = true; units[slot++] = ch } }
      if ((sc.board && sc.board.length) || sc.champion) p.units = units
      if (sc.artifacts) { const arts: (BoardArtifact | null)[] = [null, null]; let ai = 0; for (const nm of sc.artifacts) { const c = pool.card(nm, sfx + 'a'); if (c && ai < 2) arts[ai++] = { uid: c.uid, card: c, hp: 1, maxHp: 1 } } p.artifacts = arts }
      if (sc.field) { const c = pool.card(sc.field, sfx + 'f'); if (c) g.field = { card: c, owner: side } }
      if (typeof sc.gold === 'number') p.gold = sc.gold
      if (typeof sc.hp === 'number') { p.hp = sc.hp; p.maxHp = Math.max(p.maxHp, sc.hp) }
    }
    fill('you', setup.player)
    fill('ai', setup.enemy)
    if (setup.disableZmk) {
      const flat = Array.from({ length: 24 }, () => '+0' as const)
      g.you.zmk = [...flat]; g.you.zmkGrave = []
      g.ai.zmk = [...flat]; g.ai.zmkGrave = []
    }
    recomputeAuras(g)
  }, [pool, cfg])

  const hooks: TutorialHooks = useMemo(() => ({
    active: true,
    applySetup,
    gate: (a, g) => {
      const s = steps[stepIdxRef.current]
      if (dialogueActiveRef.current) return { ok: false, hint: t('onboarding.tutorial.readFirst') }
      const allow = s?.allow ?? []
      if (allow.length === 0) return { ok: false, hint: t('onboarding.tutorial.pressNext') }
      if (matchAction(a, allow, g)) return { ok: true }
      analytics.current?.wrongAction(s?.id ?? '?')
      return { ok: false, hint: s?.wrongHint ?? t('onboarding.tutorial.wrongAction') }
    },
    enemyTurn: (g) => {
      const s = steps[stepIdxRef.current]
      const script = s?.enemyScript ?? []
      if (enemyCursor.current < script.length) runScripted(g, script[enemyCursor.current++])
      else { endTurn(g); if (!g.winner) beginTurn(g); enemyDone.current = true }
    },
    onEvents: (fresh, g) => { gameRef.current = g; checkComplete(fresh, g) },
  }), [applySetup, steps, matchAction, runScripted, checkComplete])

  // ── overlay data ──
  const objective = useMemo(() => {
    for (let i = stepIdx; i >= 0; i--) if (steps[i]?.objective) return steps[i].objective!
    return null
  }, [stepIdx, steps])

  const curDialogue: OverlayDialogue | null = (() => {
    const d = step?.dialogue?.[dialogueIdx]
    return d ? { name: d.name ?? cfg.guideName, text: d.text, speaker: d.speaker } : null
  })()

  const resolveSel = useCallback((t: HighlightTarget): string | null => {
    if (t.kind === 'anchor') return `[data-tut="${ANCHOR_TUT[t.anchor] ?? t.anchor}"]`
    if (t.kind === 'button') return `[data-tut="${t.id}"]`
    if (t.kind === 'handCard') return t.cardName ? `[data-hand-card="${t.cardName}"]` : '[data-tut="hand"]'
    if (t.kind === 'unit') {
      const g = gameRef.current; if (!g) return null
      const u = P(g, t.side).units.find((x) => (t.cardName ? x?.card.name === t.cardName : !!x))
      return u ? `[data-unit-uid="${u.uid}"]` : `[data-tut="units-${t.side}"]`
    }
    return null
  }, [])

  const highlightSelectors = useMemo(() => (step?.highlight ?? []).map(resolveSel).filter((x): x is string => !!x),
    [step, resolveSel, stepIdx, dialogueIdx])
  const arrowSelector = useMemo(() => (step?.arrowTo ? resolveSel(step.arrowTo) : null),
    [step, resolveSel, stepIdx, dialogueIdx])

  if (phase === 'loading') {
    return <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'grid', placeItems: 'center', background: '#06040b', color: 'var(--gold)' }}>{t('onboarding.tutorial.loadingLesson')}</div>
  }

  return (
    <>
      <TutorialGame deckId={DEMO_DECK_ID} deckName={lesson.title} onClose={() => onExit(false)} tutorial={hooks} />
      {phase === 'play' && (
        <TutorialOverlay
          objective={objective}
          dialogue={curDialogue}
          highlightSelectors={highlightSelectors}
          arrowSelector={arrowSelector}
          step={stepIdx + 1}
          total={steps.length}
          showNext={!!curDialogue}
          onNext={onNext}
          onSkipLesson={() => { analytics.current?.lessonSkip(); onExit(false) }}
          onExit={() => onExit(false)}
        />
      )}
      {phase === 'reward' && <RewardScreen title={lesson.title} reward={reward} onDone={() => onExit(true)} />}
    </>
  )
}

function RewardScreen({ title, reward, onDone }: { title: string; reward: LessonRow['reward_payload']; onDone: () => void }) {
  const t = useT()
  const items: { icon: string; label: string }[] = []
  if (reward.gold) items.push({ icon: '🪙', label: `+${reward.gold} aukso` })
  if (reward.exp) items.push({ icon: '✦', label: `+${reward.exp} EXP` })
  if (reward.boosters) items.push({ icon: '📦', label: `${reward.boosters} boosteris` })
  if (reward.cardMin) items.push({ icon: '🃏', label: `Korta (${reward.cardMin})` })
  if (typeof document === 'undefined') return null
  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 360, display: 'grid', placeItems: 'center', background: 'rgba(4,3,8,0.88)', backdropFilter: 'blur(4px)' }}>
      <div style={{ width: 'min(440px, 92vw)', textAlign: 'center', padding: 28, borderRadius: 20, background: 'linear-gradient(160deg, rgba(20,15,28,0.98), rgba(8,6,14,0.98))', border: '1.5px solid rgba(240,180,41,0.5)', boxShadow: '0 18px 60px rgba(0,0,0,0.7)' }}>
        <div style={{ fontSize: 46 }}>🏆</div>
        <h2 style={{ fontFamily: 'var(--rvn-font-display, Cinzel, serif)', color: 'var(--gold)', fontSize: 22, margin: '6px 0 2px' }}>{t('onboarding.tutorial.lessonDone')}</h2>
        <p style={{ color: 'var(--text-secondary, #c9c2d6)', fontSize: 13, marginBottom: 16 }}>{title}</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
          {items.map((it, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '9px 14px', borderRadius: 12, background: 'rgba(240,180,41,0.1)', border: '1px solid rgba(240,180,41,0.3)', color: '#f3ead3', fontWeight: 700 }}>
              <span style={{ fontSize: 20 }}>{it.icon}</span> {it.label}
            </div>
          ))}
          {items.length === 0 && <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>{t('onboarding.tutorial.alreadyRewarded')}</div>}
        </div>
        <button onClick={onDone} style={{ width: '100%', padding: '12px', borderRadius: 12, fontWeight: 800, fontSize: 15, background: 'linear-gradient(135deg, rgba(240,180,41,0.35), rgba(240,180,41,0.12))', border: '1.5px solid rgba(240,180,41,0.6)', color: 'var(--gold)', fontFamily: 'var(--rvn-font-display, Cinzel, serif)', cursor: 'pointer' }}>{t('onboarding.tutorial.continue')}</button>
      </div>
    </div>,
    document.body,
  )
}
