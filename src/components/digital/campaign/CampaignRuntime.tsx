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
import { completeNode, cutsceneById, markCutsceneWatched } from '@/lib/campaign/missionLoader'
import type { Campaign, Cutscene, NodeView, MissionResult } from '@/lib/campaign/types'
import type { CampaignBattleResult } from '@/components/tutorial/TutorialGame'

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
      // spawn / spawnWave / addBuff / addField / restrict* — gyvos lentos taikymas
      // dar neįjungtas (kitas etapas); 'end' ir 'objectiveHp' jau atsispindi stRef.
    }
  }, [cutscenes, campaign.id, enqueueMidCutscene])

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
      case 'battleStart': run('onBattleStart'); break
      case 'turnStart':
        if (prevTurnRef.current && prevTurnRef.current !== e.turn) run('onTurnEnd', { ...snap, turn: prevTurnRef.current })
        prevTurnRef.current = e.turn
        run('onTurnStart'); run('onCondition')
        break
      case 'cardPlayed':
        run('onCardPlayed', snap, { cardId: e.cardId, cardName: e.cardName, side: e.side }); run('onCondition')
        break
      case 'unitDeath':
        run('onUnitDeath', snap, { cardId: e.cardId, cardName: e.cardName, side: e.side }); run('onCondition')
        break
      case 'hpChange': run('onCondition'); break
      case 'battleEnd': run(e.winner === 'player' ? 'onVictory' : 'onDefeat'); break
    }
    if (out.length) applyScenarioEffects(out)
  }, [applyScenarioEffects])

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
          campaignPaused={!!midCutscene}
          onClose={() => {
            // battle closed: route by captured result
            if (result?.result === 'win') setPhase('post')
            else if (result?.result === 'lose') setPhase('fail')
            else onExit() // abandoned before a result
          }}
        />
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
