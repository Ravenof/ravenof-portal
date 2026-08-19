'use client'

// ════════════════════════════════════════════════════════════════════════════
// TutorialDirector V3 — režisuoja vieną data-driven pamoką virš TutorialGame:
//   scripted setup → žingsnių mašina (dialogas su BALSU → close-up → veiksmas
//   → patvirtinimas) → gate (pralaimėti neįmanoma) → scripted priešo ėjimai →
//   analitika → atlygis.
//
// V3 naujovės (žr. TUTORIAL-V3-HANDOFF.md):
//   • BALSAS: kiekviena dialogo eilutė gali turėti `voiceId` (Senasis Korvas).
//     Auto-advance TIK balsui pasibaigus (+pauzė); be failo — pagal teksto ilgį.
//     Bakstelėjimas burbule visada praleidžia (fade 150 ms).
//   • CLOSE-UP: `zoom`/`zoomLevel` perduodami overlay'ui (kamera).
//   • RODYKLĖS: `arrowStyle` (point/pulse/drag-path) + `arrowFrom`.
//   • `apply`: deklaratyvios būsenos mutacijos žingsnio pradžioje (statusų
//     demonstracijos, ŽMK įjungimas, prakeiksmų sėjimas) per TutorialGame API.
//   • `complete: { on:'inspect' }` — „laikai–matai" mokymas.
// ════════════════════════════════════════════════════════════════════════════

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { TutorialGame, DEMO_DECK_ID, type TutorialHooks, type TutorialGameApi } from '@/components/tutorial/TutorialGame'
import { applyNetAction, beginTurn, endTurn, recomputeAuras, P, PERMANENT, type GameState, type GameEvent, type NetAction, type TargetRef, type Side, type BoardArtifact, type TutCard, type TutStatus } from '@/lib/tutorial/engine'
import { CardPool } from '@/lib/tutorial2/cardPool'
import { TutorialAnalytics } from '@/lib/tutorial2/analytics'
import { completeLesson } from '@/lib/tutorial2/lessonLoader'
import { playTutorialVoice, prefetchLessonVoices, stopTutorialVoice, estimateReadMs } from '@/lib/tutorial2/tutorialVoice'
import { setAvatarVoiceMuted } from '@/lib/game/avatarAudio'
import { setMusicScale } from '@/lib/game/musicManager'
import type { LessonRow, LessonStep, HighlightTarget, AllowedAction, ScriptedAction, StepMutation, Dialogue } from '@/lib/tutorial2/lessonTypes'
import { TutorialOverlay, type OverlayDialogue } from './TutorialOverlay'
import { RewardChip, SafeRewardImage } from '@/components/digital/ui/RewardBits'
import type { RewardPayloadItem } from '@/lib/rewards/rewardVisuals'
import { WRONG_VOICE_IDS, GOOD_VOICE_IDS } from '@/data/tutorialLessons/systemVoice'
import { useT } from '@/lib/i18n/react'

const ANCHOR_TUT: Record<string, string> = {
  hand: 'hand', gold: 'gold', 'hp-you': 'hp', 'hp-ai': 'hp-ai', 'deck-you': 'deck', 'deck-ai': 'ai-area',
  'discard-you': 'discard', 'discard-ai': 'ai-area', 'units-you': 'units-you', 'units-ai': 'units-ai',
  zmk: 'zmk', 'curses-you': 'curses', 'artifacts-you': 'artifacts', 'reactions-you': 'reactions', field: 'field',
  'end-turn': 'end-turn', 'discard-gold': 'discard-gold', 'enemy-area': 'ai-area', board: 'units-you',
  coin: 'coin', 'pick-scene': 'pick-scene',
}

/** Pauzė po balso, kol pereinam prie kitos eilutės (kad kvėptų). */
const AFTER_VOICE_MS = 520
const WRONG_VOICES = WRONG_VOICE_IDS
/** Muzikos garsumo daugiklis visai pamokai (pasakotojas > muzika). */
const LESSON_MUSIC_SCALE = 0.45
/** Anti-deadlock: kiek laukiam veiksmo žingsnio, po to duodam rankinį „Tęsti". */
const STUCK_MS = 15000
/** Kaip dažnai perkraunam užbaigimo sąlygą be naujų įvykių (enemyTurnDone ir pan.). */
const RECHECK_MS = 1200

export function TutorialDirector({ lesson, onExit }: { lesson: LessonRow; onExit: (completed: boolean) => void }) {
  const t = useT()
  const cfg = lesson.config
  const steps = useMemo(() => cfg.steps ?? [], [cfg])
  const [pool, setPool] = useState<CardPool | null>(null)
  const [stepIdx, setStepIdx] = useState(0)
  const [dialogueIdx, setDialogueIdx] = useState(0)
  const [phase, setPhase] = useState<'loading' | 'play' | 'reward'>('loading')
  const [reward, setReward] = useState<LessonRow['reward_payload']>({})
  const [voicePlaying, setVoicePlaying] = useState(false)
  const [stuck, setStuck] = useState(false)

  const stepIdxRef = useRef(0)
  const dialogueActiveRef = useRef(true)
  const enemyCursor = useRef(0)
  const enemyDone = useRef(false)
  const gameRef = useRef<GameState | null>(null)
  const advancing = useRef(false)
  const analytics = useRef<TutorialAnalytics | null>(null)
  const startedAt = useRef(0)
  const apiRef = useRef<TutorialGameApi | null>(null)
  const voiceSeq = useRef(0)
  const appliedStep = useRef<string | null>(null)
  const wrongVoiceAt = useRef(0)

  const step: LessonStep | undefined = steps[stepIdx]

  // Visą pamoką avatarų vienetės tyli (kortų balsai lieka) ir muzika groja tyliau
  // (0.45 × nustatymo) — pasakotojas turi būti girdimas. QA 2026-08-18.
  useEffect(() => {
    setAvatarVoiceMuted(true)
    setMusicScale(LESSON_MUSIC_SCALE)
    return () => { setAvatarVoiceMuted(false); setMusicScale(1) }
  }, [])

  // ── load card pool + analytics + voice prefetch ──
  useEffect(() => {
    let alive = true
    analytics.current = new TutorialAnalytics(lesson.slug, lesson.id)
    const ids = cfg.voiceIds ?? collectVoiceIds(steps)
    prefetchLessonVoices([...ids, ...WRONG_VOICES, ...GOOD_VOICE_IDS])
    CardPool.load().then((p) => {
      if (!alive) return
      setPool(p); setPhase('play'); startedAt.current = Date.now()
      analytics.current?.lessonStart()
      analytics.current?.stepStart(steps[0]?.id ?? 'start')
    })
    return () => { alive = false; stopTutorialVoice() }
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
    setStuck(false)
    setStepIdx(idx); setDialogueIdx(0)
    analytics.current?.stepStart(steps[idx]?.id ?? String(idx))
  }, [steps])

  const finishLesson = useCallback(async () => {
    if (phase === 'reward') return
    stopTutorialVoice()
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

  // ── dialogo eiga (balsas / „Toliau") ──
  const advanceDialogue = useCallback(() => {
    const s = steps[stepIdxRef.current]; if (!s) return
    const len = s.dialogue?.length ?? 0
    setDialogueIdx((i) => {
      if (i < len - 1) return i + 1
      // paskutinė eilutė: arba baigiam žingsnį, arba pereinam į „veiksmo" režimą
      if (s.complete.on === 'next' || s.complete.on === 'voiceDone') { setTimeout(() => advanceStep(), 60); return len }
      if (s.complete.on === 'auto') setTimeout(() => advanceStep(), s.complete.delayMs ?? 800)
      return len
    })
  }, [steps, advanceStep])

  const onNext = useCallback(() => {
    voiceSeq.current++          // nutraukiam laukiantį auto-advance
    stopTutorialVoice()
    setVoicePlaying(false)
    advanceDialogue()
  }, [advanceDialogue])

  // Balso grojimas kiekvienai dialogo eilutei + auto-advance jai pasibaigus.
  useEffect(() => {
    if (phase !== 'play') return
    const s = steps[stepIdx]
    const d: Dialogue | undefined = s?.dialogue?.[dialogueIdx]
    if (!d) { setVoicePlaying(false); return }
    const seq = ++voiceSeq.current
    let timer = 0
    setVoicePlaying(true)
    void (async () => {
      const res = await playTutorialVoice(d.voiceId)
      if (seq !== voiceSeq.current) return
      setVoicePlaying(false)
      const wait = res.played ? AFTER_VOICE_MS : estimateReadMs(d.voiceText ?? d.text)
      timer = window.setTimeout(() => { if (seq === voiceSeq.current) advanceDialogue() }, wait)
    })()
    return () => { window.clearTimeout(timer) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepIdx, dialogueIdx, phase])

  // ── žingsnio `apply` mutacijos ──
  const runMutation = useCallback((m: StepMutation) => {
    const api = apiRef.current; const p = pool
    if (!api || !p) return
    api.mutate((g) => {
      const flat = Array.from({ length: 24 }, () => '+0' as const)
      if (m.disableZmk) { g.you.zmk = [...flat]; g.you.zmkGrave = []; g.ai.zmk = [...flat]; g.ai.zmkGrave = [] }
      if (m.enableZmk) {
        const real: GameState['you']['zmk'] = ['+1', '-1', '+0', '+2', '-2', '+1', '-1', '+0', 'x2', '+0', '+1', '-1', '+0', '+2', '-2', '+1', '-1', 'x0', '+0', '+1', '-1', '+0', '+2', '-2']
        g.you.zmk = [...real]; g.you.zmkGrave = []
        g.ai.zmk = [...real]; g.ai.zmkGrave = []
      }
      if (typeof m.goldYou === 'number') g.you.gold = m.goldYou
      if (typeof m.goldAi === 'number') g.ai.gold = m.goldAi
      if (m.clearBoardYou) g.you.units = [null, null, null, null, null]
      if (m.clearBoardAi) g.ai.units = [null, null, null, null, null]
      if (m.addHandYou?.length) g.you.hand = [...g.you.hand, ...p.cards(m.addHandYou, 'mh')]
      const place = (side: Side, names: string[]) => {
        const ps = P(g, side)
        for (const nm of names) {
          const slot = ps.units.findIndex((u) => u === null)
          if (slot < 0) break
          const u = p.unit(nm, side === 'you' ? 'mb' : 'me')
          if (u) ps.units[slot] = u
        }
      }
      if (m.addBoardYou?.length) place('you', m.addBoardYou)
      if (m.addBoardAi?.length) place('ai', m.addBoardAi)
      for (const st of m.setStatus ?? []) {
        const u = P(g, st.side).units.find((x) => x?.card.name === st.cardName)
        if (!u) continue
        if (st.status === 'shield') u.shield = true
        else if (st.status === 'stealth') u.stealth = true
        else if (st.status === 'taunt' || st.status === 'sprint') { if (!u.card.keywords.includes(st.status)) u.card = { ...u.card, keywords: [...u.card.keywords, st.status] } }
        else u.statuses[st.status as TutStatus] = PERMANENT
      }
      if (m.cursesYou?.length) g.you.curses = p.cards(m.cursesYou, 'cu')
      if (m.seedEnemyDeckTop?.length) g.ai.deck = [...p.cards(m.seedEnemyDeckTop, 'sd'), ...g.ai.deck]
      if (typeof m.deckCountYou === 'number') g.you.deck = g.you.deck.slice(0, m.deckCountYou)
      if (typeof m.deckCountAi === 'number') g.ai.deck = g.ai.deck.slice(0, m.deckCountAi)
      recomputeAuras(g)
    })
  }, [pool])

  useEffect(() => {
    if (phase !== 'play') return
    const s = steps[stepIdx]
    if (!s?.apply) return
    const key = `${stepIdx}:${s.id}`
    if (appliedStep.current === key) return
    appliedStep.current = key
    runMutation(s.apply)
  }, [stepIdx, steps, phase, runMutation])

  // ── scripted enemy action ──
  const runScripted = useCallback((g: GameState, a: ScriptedAction) => {
    const findFoe = (name?: string): TargetRef => {
      if (!name) return { kind: 'player', side: 'you' }
      const t = g.you.units.find((x) => x?.card.name === name)
      return t ? { kind: 'unit', side: 'you', uid: t.uid } : { kind: 'player', side: 'you' }
    }
    if (a.type === 'play') {
      // Scenarijaus korta gali būti dar kaladėje (priešas jos neištraukė) — mokymai
      // yra režisuotas spektaklis, tad pasiimam ją į ranką ir, jei reikia, pridedam
      // aukso. Kitaip priešas per savo ėjimą „nieko nedaro" ir atrodo kaip bug'as.
      let u = g.ai.hand.find((c) => c.name === a.cardName)
      if (!u) {
        const di = g.ai.deck.findIndex((c) => c.name === a.cardName)
        if (di >= 0) { u = g.ai.deck[di]; g.ai.deck.splice(di, 1); g.ai.hand.push(u) }
      }
      if (!u) { console.warn('[tutorial] enemyScript: kortos nėra nei rankoje, nei kaladėje:', a.cardName); return }
      if (g.ai.gold < u.gold) g.ai.gold = u.gold
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
    // Mulliganas: tikrinam BŪSENĄ, ne įvykį — jei žaidėjas spėjo patvirtinti dar
    // per ankstesnį žingsnį, įvykis jau būtų praėjęs ir pamoka įstrigtų.
    if (c.on === 'mulliganDone') { if (!g.pendingMulligan?.you) advanceStep(); return }
    if (c.on === 'event') {
      const hit = fresh.some((e) => e.t === c.eventType && (!c.side || e.side === c.side) && (!c.cardName || e.cardName === c.cardName))
      if (hit) advanceStep()
    }
  }, [steps, advanceStep])

  // ── Anti-deadlock (QA 2026-08-18) ──
  // checkComplete kviečiamas TIK atėjus naujiems žaidimo įvykiams. Jei sąlyga
  // išsipildė dar skambant dialogui (pvz. priešas jau baigė ėjimą), naujų įvykių
  // daugiau nebūna ir pamoka pakimba — „laukiam priešininko", o jis nieko nedaro.
  // Todėl: kas RECHECK_MS perkraunam sąlygą su tuščiu įvykių sąrašu, o po STUCK_MS
  // parodom rankinį „Tęsti" (pamoka NIEKADA neužstringa visam laikui).
  const dialogueDone = (step?.dialogue?.length ?? 0) <= dialogueIdx
  useEffect(() => {
    if (phase !== 'play' || !step || !dialogueDone) return
    const on = step.complete.on
    if (on === 'next' || on === 'voiceDone' || on === 'auto') return
    const iv = window.setInterval(() => { const g = gameRef.current; if (g) checkComplete([], g) }, RECHECK_MS)
    const st = window.setTimeout(() => setStuck(true), STUCK_MS)
    return () => { window.clearInterval(iv); window.clearTimeout(st) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, stepIdx, dialogueDone])

  // „laikai–matai" (hold-to-view): žingsnis baigiamas UŽDARIUS peržiūrą, kad
  // pamoka nenušoktų į kitą žingsnį kortai dar esant per visą ekraną (QA 2026-08-18).
  const inspectArmed = useRef(false)
  const onInspect = useCallback((card: TutCard) => {
    const s = steps[stepIdxRef.current]
    if (!s || dialogueActiveRef.current) return
    if (s.complete.on !== 'inspect') return
    if (s.complete.cardName && s.complete.cardName !== card.name) return
    inspectArmed.current = true
  }, [steps])
  const onInspectEnd = useCallback((card: TutCard) => {
    if (!inspectArmed.current) return
    inspectArmed.current = false
    const s = steps[stepIdxRef.current]
    if (!s || s.complete.on !== 'inspect') return
    if (s.complete.cardName && s.complete.cardName !== card.name) return
    advanceStep()
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
          const tu = g.ai.units.find((u) => u?.uid === tuid)
          if (tu?.card.name === al.targetName) return true
        }
      } else if (a.t === 'champ' && k === 'use-champion') return true
      else if (a.t === 'endTurn' && k === 'end-turn') return true
      else if (a.t === 'discardForGold' && k === 'discard-gold') return true
      else if (a.t === 'mulligan' && k === 'mulligan') return true
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
      const warnMissing = (names: string[], where: string) => {
        const miss = names.filter((n) => !pool.has(n))
        if (miss.length) console.warn(`[tutorial] setup.${side}.${where}: šių kortų NĖRA DB (card_number TUT-%):`, miss)
      }
      warnMissing([...(sc.hand ?? []), ...(sc.deck ?? []), ...(sc.board ?? []), ...(sc.artifacts ?? []), ...(sc.reactions ?? []), ...(sc.curses ?? [])], 'kortos')
      if (sc.hand) p.hand = pool.cards(sc.hand, sfx + 'h')
      if (sc.deck) p.deck = pool.cards(sc.deck, sfx + 'd')
      const units: (typeof p.units) = [null, null, null, null, null]
      let slot = 0
      for (const nm of sc.board ?? []) { const u = pool.unit(nm, sfx + 'b'); if (u && slot < 5) units[slot++] = u }
      if (sc.champion) { const ch = pool.unit(sc.champion, sfx + 'c'); if (ch && slot < 5) { ch.isChampion = true; units[slot++] = ch } }
      if ((sc.board && sc.board.length) || sc.champion) p.units = units
      if (sc.artifacts) { const arts: (BoardArtifact | null)[] = [null, null]; let ai = 0; for (const nm of sc.artifacts) { const c = pool.card(nm, sfx + 'a'); if (c && ai < 2) arts[ai++] = { uid: c.uid, card: c, hp: 1, maxHp: 1 } } p.artifacts = arts }
      if (sc.reactions) { let ri = 0; for (const nm of sc.reactions) { const c = pool.card(nm, sfx + 'r'); if (c && ri < p.reactions.length) p.reactions[ri++] = { uid: c.uid, card: c, paid: c.gold } } }
      if (sc.curses) p.curses = pool.cards(sc.curses, sfx + 'cu')
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
    matchStartFlow: !!cfg.matchStartFlow,
    applySetup,
    onApi: (api) => { apiRef.current = api },
    onInspect,
    onInspectEnd,
    gate: (a, g) => {
      const s = steps[stepIdxRef.current]
      if (dialogueActiveRef.current) return { ok: false, hint: t('onboarding.tutorial.readFirst') }
      const allow = s?.allow ?? []
      if (allow.length === 0) return { ok: false, hint: t('onboarding.tutorial.pressNext') }
      if (matchAction(a, allow, g)) return { ok: true }
      analytics.current?.wrongAction(s?.id ?? '?')
      const now = Date.now()
      if (now - wrongVoiceAt.current > 3500) {
        wrongVoiceAt.current = now
        void playTutorialVoice(WRONG_VOICES[Math.floor(Math.random() * WRONG_VOICES.length)])
      }
      return { ok: false, hint: s?.wrongHint ?? t('onboarding.tutorial.wrongAction') }
    },
    enemyTurn: (g) => {
      const s = steps[stepIdxRef.current]
      const script = s?.enemyScript ?? []
      if (enemyCursor.current < script.length) runScripted(g, script[enemyCursor.current++])
      else { endTurn(g); if (!g.winner) beginTurn(g); enemyDone.current = true }
    },
    onEvents: (fresh, g) => { gameRef.current = g; checkComplete(fresh, g) },
  }), [applySetup, steps, matchAction, runScripted, checkComplete, onInspect, onInspectEnd, cfg.matchStartFlow, t])

  // ── overlay data ──
  const objective = useMemo(() => {
    for (let i = stepIdx; i >= 0; i--) if (steps[i]?.objective) return steps[i].objective!
    return null
  }, [stepIdx, steps])

  const curLine = step?.dialogue?.[dialogueIdx]
  const curDialogue: OverlayDialogue | null = curLine
    ? { name: curLine.name ?? cfg.guideName, text: curLine.text, speaker: curLine.speaker, subtitle: curLine.voiceText && curLine.voiceText !== curLine.text ? curLine.voiceText : null }
    : null

  const resolveSel = useCallback((tg: HighlightTarget): string | null => {
    if (tg.kind === 'anchor') {
      if (tg.anchor === 'champion-you' || tg.anchor === 'champion-ai') {
        const g = gameRef.current
        const side: Side = tg.anchor === 'champion-you' ? 'you' : 'ai'
        const ch = g ? P(g, side).units.find((x) => x?.isChampion) : null
        return ch ? `[data-unit-uid="${ch.uid}"]` : `[data-tut="units-${side}"]`
      }
      return `[data-tut="${ANCHOR_TUT[tg.anchor] ?? tg.anchor}"]`
    }
    if (tg.kind === 'button') return `[data-tut="${tg.id}"]`
    if (tg.kind === 'handCard') return tg.cardName ? `[data-hand-card="${tg.cardName}"], [data-pick-card="${tg.cardName}"]` : '[data-tut="hand"]'
    if (tg.kind === 'unit') {
      const g = gameRef.current; if (!g) return null
      const u = P(g, tg.side).units.find((x) => (tg.cardName ? x?.card.name === tg.cardName : !!x))
      return u ? `[data-unit-uid="${u.uid}"]` : `[data-tut="units-${tg.side}"]`
    }
    return null
  }, [])

  const highlightSelectors = useMemo(() => (step?.highlight ?? []).map(resolveSel).filter((x): x is string => !!x),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [step, resolveSel, stepIdx, dialogueIdx])
  const arrowSelector = useMemo(() => (step?.arrowTo ? resolveSel(step.arrowTo) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [step, resolveSel, stepIdx, dialogueIdx])
  const arrowFromSelector = useMemo(() => (step?.arrowFrom ? resolveSel(step.arrowFrom) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [step, resolveSel, stepIdx, dialogueIdx])
  const zoomSelector = useMemo(() => (step?.zoom ? resolveSel(step.zoom) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [step, resolveSel, stepIdx, dialogueIdx])

  if (phase === 'loading') {
    return <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'grid', placeItems: 'center', background: '#06040b', color: 'var(--gold)' }}>{t('onboarding.tutorial.loadingLesson')}</div>
  }

  return (
    <>
      <TutorialGame deckId={DEMO_DECK_ID} deckName={lesson.title} onClose={() => { stopTutorialVoice(); onExit(false) }} tutorial={hooks} />
      {phase === 'play' && (
        <TutorialOverlay
          labels={{
            objective: t('onboarding.tutorial.objectiveLabel'),
            next: t('onboarding.tutorial.next'),
            skipVoice: t('onboarding.tutorial.skipVoice'),
            forceNext: t('onboarding.tutorial.forceNext'),
            skipLesson: t('onboarding.tutorial.skipLesson'),
            confirmTitle: t('onboarding.tutorial.skipConfirmTitle'),
            confirmBody: t('onboarding.tutorial.skipConfirmBody'),
            confirmYes: t('onboarding.tutorial.skipConfirmYes'),
            confirmNo: t('onboarding.tutorial.skipConfirmNo'),
          }}
          portraitUrl={cfg.guidePortrait ?? undefined}
          objective={objective}
          dialogue={curDialogue}
          highlightSelectors={highlightSelectors}
          arrowSelector={arrowSelector}
          arrowStyle={step?.arrowStyle}
          arrowFromSelector={arrowFromSelector}
          zoomSelector={zoomSelector}
          zoomLevel={step?.zoomLevel ?? null}
          step={stepIdx + 1}
          total={steps.length}
          showNext={!!curDialogue}
          voicePlaying={voicePlaying}
          onForceNext={stuck ? () => { setStuck(false); advanceStep() } : null}
          onNext={onNext}
          onSkipLesson={() => { stopTutorialVoice(); analytics.current?.lessonSkip(); onExit(false) }}
          onExit={() => { stopTutorialVoice(); onExit(false) }}
        />
      )}
      {phase === 'reward' && <RewardScreen title={lesson.title} reward={reward} onDone={() => onExit(true)} />}
    </>
  )
}

function collectVoiceIds(steps: LessonStep[]): string[] {
  const out: string[] = []
  for (const s of steps) for (const d of s.dialogue ?? []) if (d.voiceId) out.push(d.voiceId)
  return out
}

function RewardScreen({ title, reward, onDone }: { title: string; reward: LessonRow['reward_payload']; onDone: () => void }) {
  const t = useT()
  // Atlygiai — TIK kanoniniai registro asset'ai (emoji atlygių slotuose uždrausti,
  // žr. [[ravenof-reward-visuals]]). Payload → RewardBits vizualai.
  const items: RewardPayloadItem[] = []
  if (reward.gold) items.push({ type: 'currency', currency: 'silver', amount: reward.gold })
  if (reward.exp) items.push({ type: 'account_xp', amount: reward.exp })
  if (reward.boosters) items.push({ type: 'item', item_type: 'pack', quantity: reward.boosters })
  if (reward.cardMin) items.push({ type: 'item', item_type: 'card', item_id: t('onboarding.tutorial.rewardCard') })
  if (reward.badge) items.push({ type: 'item', item_type: 'badge' })
  if (typeof document === 'undefined') return null
  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 360, display: 'grid', placeItems: 'center', background: 'rgba(4,3,8,0.88)', backdropFilter: 'blur(4px)' }}>
      {/* combat-plate: tas pats geležies rėmas kaip visuose kovos dialoguose */}
      <div className="combat-plate" style={{ width: 'min(460px, 92vw)', textAlign: 'center', padding: '22px 24px 24px' }}>
        <SafeRewardImage src="/digital/icons/emblem-tutorial.png" size={54} alt="" />
        <h2 style={{ fontFamily: 'var(--rvn-font-display, Cinzel, serif)', color: 'var(--gold)', fontSize: 22, margin: '6px 0 2px' }}>{t('onboarding.tutorial.lessonDone')}</h2>
        <p style={{ color: 'var(--text-secondary, #c9c2d6)', fontSize: 13, marginBottom: 16 }}>{title}</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
          {items.map((it, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '9px 14px', borderRadius: 12, background: 'rgba(240,180,41,0.1)', border: '1px solid rgba(240,180,41,0.3)', color: '#f3ead3', fontWeight: 700 }}>
              <RewardChip it={it} size={22} textSize={13.5} color="#f3ead3" />
            </div>
          ))}
          {items.length === 0 && <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>{t('onboarding.tutorial.alreadyRewarded')}</div>}
        </div>
        <button onClick={onDone} className="ravenof-press" style={REWARD_CTA}>{t('onboarding.tutorial.continue')}</button>
      </div>
    </div>,
    document.body,
  )
}

/** Asset CTA (kanonas commit630) — atlygio ekrano „Tęsti". */
const REWARD_CTA: React.CSSProperties = {
  width: 'auto', minWidth: 240, maxWidth: '86%', textAlign: 'center',
  font: '800 13px var(--rvn-font-display, Cinzel, serif)', letterSpacing: 3, textTransform: 'uppercase',
  color: '#f6e8c6', whiteSpace: 'nowrap',
  background: "url('/ravenof-ui/buttons/button-primary-normal.png') center / 100% 100% no-repeat",
  padding: '14px 38px', border: 0, cursor: 'pointer', textShadow: '0 1px 4px rgba(0,0,0,.8)',
  transition: 'filter 0.18s ease',
}
