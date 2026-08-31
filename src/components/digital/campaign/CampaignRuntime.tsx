'use client'

// ════════════════════════════════════════════════════════════════════════════
// CampaignRuntime — orchestrates a single mission:
//   pre-cutscene → battle (TutorialGame) → post/failure-cutscene → reward → save
//
// GYVI SCENARIJAUS TRIGERIAI: TutorialGame per `onCampaignEvent` siunčia kovos
// įvykius (ėjimas, sulošta korta, mirtis, HP, pabaiga); čia jie leidžiami per
// scenarioEngine.runTrigger. `dialogue` efektai (cutsceneId arba inline text)
// parodomi VIRŠ kovos — `campaignPaused` užšaldo AI ir įvestį, kol scena baigsis.
// Tikslai (keep_unit_alive, kill_count pagal tag, defeat_within…) vertinami iš
// TIKRO paskutinio snapshot'o, ne iš suvestinės. Spawn/wave efektų taikymas į
// gyvą lentą — kitas etapas (žr. waveEngine.ts).
// ════════════════════════════════════════════════════════════════════════════

import { useCallback, useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import { createPortal } from 'react-dom'
import { playUiClick } from '@/lib/ui-sound'
import { CutscenePlayer } from './CutscenePlayer'
import {
  initScenarioState, runTrigger, scoreObjectives,
  type BattleSnapshot, type ScenarioEffect, type ScenarioState, type TriggerContext,
} from '@/lib/campaign/scenarioEngine'
import type { CampaignEngineEvent } from '@/lib/campaign/battleBridge'
import { allMustClearDefeated, findWave, initWaveState, resolveWave, wavesForTurn, type SpawnInstruction, type WaveRuntimeState } from '@/lib/campaign/waveEngine'
import { collectScenarioCardIds, freshCard, loadScenarioCards } from '@/lib/campaign/scenarioCards'
import { cachedMediaUrl } from '@/lib/campaign/mediaCache'
import { forceBattleEnd, spawnExternalUnit, type Side, type TutCard } from '@/lib/tutorial/engine'
import { completeNode, cutsceneById, markCutsceneWatched } from '@/lib/campaign/missionLoader'
import type { Campaign, Cutscene, NodeView, MissionResult, ScenarioUnit } from '@/lib/campaign/types'
import type { CampaignBattleResult, TutorialGameApi } from '@/components/tutorial/TutorialGame'

const TutorialGame = dynamic(() => import('@/components/tutorial/TutorialGame').then((m) => m.TutorialGame), { ssr: false })

type Phase = 'pre' | 'battle' | 'post' | 'fail' | 'reward'
const GOLD = '240,180,41'

export function CampaignRuntime({ campaign, node, cutscenes, playerDeckId, playerDeckName, onComplete, onExit }: {
  campaign: Campaign
  node: NodeView
  cutscenes: Cutscene[]
  playerDeckId: string
  playerDeckName: string
  onComplete: (r: MissionResult) => void
  onExit: () => void
}) {
  const storyOnly = node.missionType === 'STORY_ONLY'
  const pre = cutsceneById(cutscenes, node.preCutsceneId)
  const [phase, setPhase] = useState<Phase>(pre ? 'pre' : (storyOnly ? 'post' : 'battle'))
  const [choiceKey, setChoiceKey] = useState<string | undefined>(undefined)
  const [result, setResult] = useState<MissionResult | null>(null)
  const [saving, setSaving] = useState(false)

  const bc = node.battleConfig ?? {}
  const enemyDeckId = bc.enemyDeckId ?? null
  const enemyFaction = bc.enemyFactionId ?? null
  const difficulty = bc.difficulty ?? 'normal'

  // ── Gyva scenarijaus būsena (Set'ai mutuojami vietoje → ref, ne state) ──
  const scenarioCfgRef = useRef(node.scenario ?? {})
  const stRef = useRef<ScenarioState>(initScenarioState(scenarioCfgRef.current))
  const killsRef = useRef<Record<string, number>>({})
  const snapRef = useRef<BattleSnapshot | null>(null)
  const prevTurnRef = useRef(0)
  const [midCutscene, setMidCutscene] = useState<Cutscene | null>(null)
  const midQueueRef = useRef<Cutscene[]>([])

  // ── Gyvos lentos valdymas: variklio mutate API + scenario kortų pool'as ──
  const apiRef = useRef<TutorialGameApi | null>(null)
  const cardsRef = useRef<Map<string, Omit<TutCard, 'uid'>> | null>(null)
  const waveStateRef = useRef<WaveRuntimeState>(initWaveState())
  const activeWavesRef = useRef<Set<string>>(new Set())
  const waveTurnsDoneRef = useRef<Set<number>>(new Set())
  const startInjectedRef = useRef(false)
  const [objVersion, setObjVersion] = useState(0)
  const [warnings, setWarnings] = useState<{ id: number; text: string }[]>([])
  const warnSeq = useRef(0)

  const pushWarning = useCallback((text: string | undefined | null) => {
    if (!text) return
    const id = ++warnSeq.current
    setWarnings((ws) => [...ws, { id, text }])
    setTimeout(() => setWarnings((ws) => ws.filter((w) => w.id !== id)), 3500)
  }, [])

  const toEngineSide = (s: 'player' | 'enemy'): Side => s === 'player' ? 'you' : 'ai'

  /** Spawn'ina kortą į gyvą lentą (jei pool'e yra ir API paruoštas). */
  const doSpawn = useCallback((side: 'player' | 'enemy', cardId: string, buffs?: { attack?: number; health?: number }) => {
    const base = cardsRef.current?.get(cardId)
    const api = apiRef.current
    if (!base || !api) return
    api.mutate((g) => { spawnExternalUnit(g, toEngineSide(side), freshCard(base), { buffs }) })
  }, [])

  /** Vienos bangos spawn'as: priešų daliniai + įspėjimas + balso linija. */
  const spawnWaveNow = useCallback((instr: SpawnInstruction) => {
    const api = apiRef.current
    if (!api) return
    stRef.current.spawnedWaveIds.add(instr.waveId)
    activeWavesRef.current.add(instr.waveId)
    pushWarning(instr.warningText ?? null)
    if (instr.voiceLineUrl) {
      void cachedMediaUrl(instr.voiceLineUrl).then((src) => { if (src) new Audio(src).play().catch(() => {}) })
    }
    api.mutate((g) => {
      for (const u of instr.units) {
        const base = cardsRef.current?.get(u.cardId)
        if (base) spawnExternalUnit(g, 'ai', freshCard(base), { buffs: { attack: u.attack, health: u.health } })
      }
    })
  }, [pushWarning])

  /** startingBoard / startingEnemyBoard injekcija kovos pradžioje (vieną kartą). */
  const tryInjectStart = useCallback(() => {
    if (startInjectedRef.current) return
    const cfg = scenarioCfgRef.current
    const api = apiRef.current
    const pool = cardsRef.current
    if (!api || !pool) return
    const own = cfg.startingBoard ?? []
    const foe = cfg.startingEnemyBoard ?? []
    if (!own.length && !foe.length) { startInjectedRef.current = true; return }
    startInjectedRef.current = true
    api.mutate((g) => {
      const place = (u: ScenarioUnit) => {
        const base = pool.get(u.cardId)
        if (base) spawnExternalUnit(g, toEngineSide(u.side), freshCard(base), { buffs: u.buffs, summonSick: false })
      }
      own.forEach(place); foe.forEach(place)
    })
  }, [])
  const tryInjectStartRef = useRef(tryInjectStart)
  useEffect(() => { tryInjectStartRef.current = tryInjectStart }, [tryInjectStart])

  const onCampaignApi = useCallback((api: TutorialGameApi) => {
    apiRef.current = api
    tryInjectStartRef.current()
  }, [])

  // scenario kortų pool'as užkraunamas iš karto (spawn'ai laukia, kol bus)
  useEffect(() => {
    let alive = true
    loadScenarioCards(collectScenarioCardIds(scenarioCfgRef.current)).then((m) => {
      if (alive) { cardsRef.current = m; tryInjectStartRef.current() }
    })
    return () => { alive = false }
  }, [])

  const enqueueMidCutscene = useCallback((c: Cutscene) => {
    setMidCutscene((cur) => { if (cur) { midQueueRef.current.push(c); return cur } return c })
  }, [])

  const onMidCutsceneDone = useCallback(() => {
    setMidCutscene((cur) => {
      if (cur && cutsceneById(cutscenes, cur.id)) markCutsceneWatched(campaign.id, cur.id)
      return midQueueRef.current.shift() ?? null
    })
  }, [cutscenes, campaign.id])

  const applyScenarioEffects = useCallback((effects: ScenarioEffect[]) => {
    for (const ef of effects) {
      if (ef.kind === 'dialogue') {
        const persistent = ef.cutsceneId ? cutsceneById(cutscenes, ef.cutsceneId) : null
        if (persistent) { enqueueMidCutscene(persistent); continue }
        if (!ef.text) continue
        // inline in-battle dialogas — efemerinė vieno žingsnio scena per VN playerį
        enqueueMidCutscene({
          id: `inline-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          campaignId: campaign.id, title: 'Dialogas', type: 'dialogue',
          skippable: true, autoplay: true, metadata: {},
          steps: [{
            id: 's1', side: ef.characterName ? 'left' : 'narrator',
            characterName: ef.characterName ?? null, portraitUrl: ef.portraitUrl ?? null, text: ef.text,
          }],
        })
      }
      else if (ef.kind === 'spawn') {
        doSpawn(ef.side, ef.cardId, ef.buffs)
      } else if (ef.kind === 'spawnWave') {
        const w = findWave(scenarioCfgRef.current, ef.waveId)
        if (w) spawnWaveNow(resolveWave(w))
      } else if (ef.kind === 'addBuff') {
        apiRef.current?.mutate((g) => {
          const p = ef.target === 'player' ? g.you : g.ai
          for (const u of p.units) {
            if (!u) continue
            if (ef.attack) u.atk += ef.attack
            if (ef.health) { u.hp += ef.health; u.maxHp += ef.health }
          }
        })
      } else if (ef.kind === 'end') {
        apiRef.current?.mutate((g) => forceBattleEnd(g, ef.result === 'win' ? 'you' : 'ai'))
      } else if (ef.kind === 'objectiveHp') {
        setObjVersion((v) => v + 1)
      }
      // addField / restrictCardTypes / forceTargetPriority — advisory, kol kas ignoruojami.
    }
  }, [cutscenes, campaign.id, enqueueMidCutscene, doSpawn, spawnWaveNow])

  /** Kovos variklio įvykiai → scenario taisyklės (kviečia TutorialGame). */
  const handleEngineEvent = useCallback((e: CampaignEngineEvent, raw: BattleSnapshot) => {
    const st = stRef.current
    if (e.t === 'unitDeath' && e.side === 'enemy' && e.tag) {
      killsRef.current[e.tag] = (killsRef.current[e.tag] ?? 0) + 1
    }
    const snap: BattleSnapshot = {
      ...raw, killsByTag: { ...killsRef.current }, objectives: st.objectives, bossPhase: st.bossPhase,
    }
    snapRef.current = snap
    const cfg = scenarioCfgRef.current
    const out: ScenarioEffect[] = []
    const run = (trigger: Parameters<typeof runTrigger>[2], s: BattleSnapshot = snap, ctx?: TriggerContext) =>
      out.push(...runTrigger(cfg, st, trigger, s, ctx))
    switch (e.t) {
      case 'battleStart':
        tryInjectStartRef.current()
        run('onBattleStart')
        break
      case 'turnStart': {
        if (prevTurnRef.current && prevTurnRef.current !== e.turn) run('onTurnEnd', { ...snap, turn: prevTurnRef.current })
        prevTurnRef.current = e.turn
        run('onTurnStart'); run('onCondition')
        // ── ėjimu paremtos bangos (kartą per globalTurn reikšmę) ──
        if (!waveTurnsDoneRef.current.has(e.turn)) {
          waveTurnsDoneRef.current.add(e.turn)
          for (const instr of wavesForTurn(cfg, waveStateRef.current, e.turn)) spawnWaveNow(instr)
          // survivalTurns: išgyvenai visus ėjimus → pergalė
          if (cfg.survivalTurns && e.turn > cfg.survivalTurns) {
            apiRef.current?.mutate((g) => forceBattleEnd(g, 'you'))
          }
        }
        break
      }
      case 'cardPlayed':
        run('onCardPlayed', snap, { cardId: e.cardId, cardName: e.cardName, side: e.side }); run('onCondition')
        break
      case 'unitDeath': {
        run('onUnitDeath', snap, { cardId: e.cardId, cardName: e.cardName, side: e.side }); run('onCondition')
        // ── bangos įveikimas: aktyvių bangų priešai išnaikinti (priešo lenta tuščia) ──
        if (e.side === 'enemy' && activeWavesRef.current.size && snap.enemyBoard.length === 0) {
          for (const wid of activeWavesRef.current) {
            st.defeatedWaveIds.add(wid)
            run('onWaveDefeated')
          }
          activeWavesRef.current.clear()
          if (allMustClearDefeated(cfg, st.defeatedWaveIds)) {
            apiRef.current?.mutate((g) => forceBattleEnd(g, 'you'))
          }
        }
        break
      }
      case 'hpChange': run('onCondition'); break
      case 'battleEnd': run(e.winner === 'player' ? 'onVictory' : 'onDefeat'); break
    }
    if (out.length) applyScenarioEffects(out)
  }, [applyScenarioEffects, spawnWaveNow])

  // score a finished battle against the node's objectives — su TIKRU paskutiniu
  // snapshot'u (lentos, kills pagal tag, objective HP), jei kova jį pateikė
  const scoreBattle = (won: boolean, r?: CampaignBattleResult): MissionResult => {
    const live = snapRef.current
    const snap: BattleSnapshot = live ? {
      ...live,
      turn: r?.turns ?? live.turn,
      playerHp: r?.stats.hpRemaining ?? live.playerHp,
      spellsPlayed: r?.stats.spellsPlayed ?? live.spellsPlayed,
    } : {
      turn: r?.turns ?? 0, phase: 'player',
      playerHp: r?.stats.hpRemaining ?? (won ? 1 : 0), enemyHp: won ? 0 : 1,
      playerBoard: [], enemyBoard: [],
      spellsPlayed: r?.stats.spellsPlayed ?? 0,
      enemyKills: (r?.stats.creaturesKilled ?? 0) + (r?.stats.championsKilled ?? 0),
      killsByTag: {}, objectives: {}, bossPhase: 0,
    }
    const st = live ? stRef.current : initScenarioState(scenarioCfgRef.current)
    const { completed, stars } = scoreObjectives(node.objectives ?? [], snap, st, won)
    return { nodeId: node.id, result: won ? 'win' : 'lose', stars: won ? Math.max(1, stars) : 0, objectives: completed, choiceKey }
  }

  const onBattleResult = (r: CampaignBattleResult) => {
    const res = scoreBattle(r.result === 'win', r)
    setResult(res)
  }

  const finishStory = () => { setResult({ nodeId: node.id, result: 'win', stars: 1, objectives: ['win'], choiceKey }); setPhase('reward') }

  // persist + bubble up
  const persist = async (res: MissionResult) => {
    setSaving(true)
    try { await completeNode(res) } catch { /* */ }
    setSaving(false)
    onComplete(res)
  }

  // auto-advance when a phase has no cutscene to show (avoids setState-in-render)
  useEffect(() => {
    if (phase === 'post') {
      const post = cutsceneById(cutscenes, node.postCutsceneId) ?? (storyOnly ? cutsceneById(cutscenes, node.preCutsceneId) : null)
      if (!post) { if (storyOnly) finishStory(); else setPhase('reward') }
    } else if (phase === 'fail') {
      if (!cutsceneById(cutscenes, node.failureCutsceneId)) {
        persist(result ?? { nodeId: node.id, result: 'lose', stars: 0, objectives: [], choiceKey })
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  // ── PRE cutscene ──
  if (phase === 'pre' && pre) {
    return <CutscenePlayer cutscene={pre} onDone={(key) => {
      setChoiceKey(key); markCutsceneWatched(campaign.id, pre.id)
      setPhase(storyOnly ? 'post' : 'battle')
    }} />
  }

  // ── BATTLE ──
  if (phase === 'battle') {
    return (
      <>
        <TutorialGame
          deckId={playerDeckId}
          deckName={playerDeckName}
          practice
          opponentDeckId={enemyDeckId}
          opponentFaction={enemyDeckId ? null : enemyFaction}
          opponentName={bc.enemyName ?? 'Priešas'}
          difficulty={difficulty}
          onCampaignResult={onBattleResult}
          onCampaignEvent={handleEngineEvent}
          onCampaignApi={onCampaignApi}
          campaignPaused={!!midCutscene}
          onClose={() => {
            // battle closed: route by captured result
            if (result?.result === 'win') setPhase('post')
            else if (result?.result === 'lose') setPhase('fail')
            else onExit() // abandoned before a result
          }}
        />
        {/* ── Scenarijaus HUD: objektų HP + bangų įspėjimai (virš kovos, nekliudo) ── */}
        <ScenarioHud objectives={Object.values(stRef.current.objectives)} warnings={warnings} objVersion={objVersion} />
        {midCutscene && <CutscenePlayer cutscene={midCutscene} onDone={onMidCutsceneDone} />}
      </>
    )
  }

  // ── POST (win) cutscene → reward ──
  if (phase === 'post') {
    const post = cutsceneById(cutscenes, node.postCutsceneId) ?? (storyOnly ? cutsceneById(cutscenes, node.preCutsceneId) : null)
    if (post) return <CutscenePlayer cutscene={post} onDone={() => { markCutsceneWatched(campaign.id, post.id); if (storyOnly) finishStory(); else setPhase('reward') }} />
    return null // effect advances
  }

  // ── FAIL cutscene → done ──
  if (phase === 'fail') {
    const fail = cutsceneById(cutscenes, node.failureCutsceneId)
    const res = result ?? { nodeId: node.id, result: 'lose' as const, stars: 0, objectives: [], choiceKey }
    if (fail) return <CutscenePlayer cutscene={fail} onDone={() => { markCutsceneWatched(campaign.id, fail.id); persist(res) }} />
    return null // effect persists
  }

  // ── REWARD screen ──
  if (phase === 'reward') {
    const res = result ?? { nodeId: node.id, result: 'win' as const, stars: 1, objectives: ['win'], choiceKey }
    const rw = node.rewardPayload ?? {}
    const firstClear = node.state !== 'completed'
    return createPortal(
      <div className="fixed inset-0 z-[300] flex items-center justify-center p-5" style={{ background: 'rgba(4,3,8,0.92)' }}>
        <div className="w-full max-w-sm rounded-3xl px-6 py-7 text-center"
          style={{ background: `radial-gradient(120% 80% at 50% 0%, rgba(${GOLD},0.16), rgba(10,8,16,0.98) 60%), linear-gradient(160deg,#17111f,#0a0810)`, border: `1px solid rgba(${GOLD},0.5)` }}>
          <p className="text-4xl mb-1">🏆</p>
          <h2 className="text-xl font-extrabold" style={{ fontFamily: 'var(--rvn-font-display)', color: 'var(--gold)' }}>Misija įveikta</h2>
          <p className="text-2xl mt-2" style={{ color: '#fcd34d' }}>{'★'.repeat(res.stars)}{'☆'.repeat(3 - res.stars)}</p>

          {firstClear ? (
            <div className="mt-4 flex flex-wrap gap-2 justify-center">
              {rw.gold ? <Chip>🪙 {rw.gold}</Chip> : null}
              {rw.exp ? <Chip>✦ {rw.exp} XP</Chip> : null}
              {rw.boosters ? <Chip>📦 {rw.boosters} pak.</Chip> : null}
              {rw.cardMin ? <Chip>🃏 {rw.cardMin}+</Chip> : null}
              {!rw.gold && !rw.exp && !rw.boosters && !rw.cardMin ? <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Istorija tęsiasi…</span> : null}
            </div>
          ) : (
            <p className="text-xs mt-4" style={{ color: 'var(--text-muted)' }}>Pakartota — atlygis skiriamas tik pirmą kartą.</p>
          )}

          <button disabled={saving} onClick={() => { playUiClick(); persist(res) }}
            className="w-full mt-6 rounded-xl text-sm font-bold transition-transform active:scale-95 disabled:opacity-50"
            style={{ minHeight: 52, background: `rgba(${GOLD},0.92)`, color: '#1a1206', fontFamily: 'var(--rvn-font-display)', letterSpacing: '0.05em' }}>
            {saving ? 'Saugoma…' : 'Tęsti žemėlapyje ▸'}
          </button>
        </div>
      </div>,
      document.body,
    )
  }

  return null
}

function Chip({ children }: { children: React.ReactNode }) {
  return <span className="text-[12px] px-3 py-1.5 rounded-lg" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: '#f3ead3' }}>{children}</span>
}

// ── Scenarijaus HUD kovoje: gate/wall/relikto HP juostelės + bangų įspėjimai ──
function ScenarioHud({ objectives, warnings }: {
  objectives: import('@/lib/campaign/types').ScenarioObjectiveObject[]
  warnings: { id: number; text: string }[]
  objVersion: number
}) {
  if (typeof document === 'undefined') return null
  if (!objectives.length && !warnings.length) return null
  return createPortal(
    <div className="fixed inset-x-0 flex flex-col items-center gap-1.5 pointer-events-none" style={{
      zIndex: 280, top: 'calc(6px + env(safe-area-inset-top, 0px))',
    }}>
      {objectives.length > 0 && (
        <div className="flex flex-wrap justify-center gap-1.5 px-3">
          {objectives.map((o) => {
            const pct = o.maxHp > 0 ? Math.max(0, Math.min(1, o.hp / o.maxHp)) : 0
            const friendly = o.side === 'player'
            const col = friendly ? (pct > 0.5 ? '#34d399' : pct > 0.25 ? '#fcd34d' : '#f87171') : '#a78bfa'
            const icon = o.kind === 'gate' ? '🚪' : o.kind === 'wall' ? '🧱' : o.kind === 'relic' ? '🏺' : o.kind === 'commander' ? '🛡️' : o.kind === 'convoy' ? '🐎' : '◆'
            return (
              <div key={o.id} className="px-2.5 py-1 rounded-lg" style={{ background: 'rgba(8,6,13,0.85)', border: `1px solid ${col}55`, minWidth: 120 }}>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-bold" style={{ color: '#e8dfc8' }}>{icon} {o.label}</span>
                  <span className="text-[10px] font-bold tabular-nums" style={{ color: col }}>{o.hp}/{o.maxHp}</span>
                </div>
                <div className="mt-0.5 h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.1)' }}>
                  <div className="h-full rounded-full" style={{ width: `${pct * 100}%`, background: col, transition: 'width 0.4s ease' }} />
                </div>
              </div>
            )
          })}
        </div>
      )}
      {warnings.map((w) => (
        <div key={w.id} className="px-4 py-1.5 rounded-xl text-sm font-bold" style={{
          background: 'rgba(30,10,14,0.92)', border: '1px solid rgba(248,113,113,0.55)', color: '#fecaca',
          fontFamily: 'var(--rvn-font-display)', letterSpacing: '0.04em',
          animation: 'rvncamp-warn 0.4s ease-out 1',
        }}>
          ⚠ {w.text}
        </div>
      ))}
      <style>{`@keyframes rvncamp-warn { from { opacity: 0; transform: translateY(-8px) } to { opacity: 1; transform: translateY(0) } }`}</style>
    </div>,
    document.body,
  )
}
