'use client'

// ── Reitingo kova — pagrindinis orkestratorius (Ranked Home + srautas + panelės) ─
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { playUiClick } from '@/lib/ui-sound'
import { awardGold, RANKED_WIN_REWARD, RANKED_LOSS_REWARD } from '@/lib/economy'
import {
  ensureProfile, getActiveSeason, lockDeck, getRankedDecks, reportMatch,
  getFactionIdMap, getLeaderboard, type ReportMatchInput,
} from '@/lib/ranked/client'
import type { RankedProfile, RankedSeason, MatchReportResult, PlayerMatchStats, LeaderboardRow } from '@/lib/ranked/types'
import { rankView, medalLabel } from '@/lib/ranked/rank'
import { seasonTimer, formatTimeLeft } from '@/lib/ranked/season'
import { RANKED_BOT_BY_SLUG } from '@/lib/ranked/bots'
import { strategyWeights } from '@/lib/ranked/aiStrategy'
import { ActiveDeckSelectorModal } from '@/components/digital/ActiveDeckSelectorModal'
import { useActiveDeck, deckValidity, activeDeckOf } from '@/lib/digital/activeDeck'
import { SectionTitle } from './_ui'
import { RankedQueue, type MatchedOpponent } from './RankedQueue'
import { MatchFound } from './MatchFound'
import { RankedResult } from './RankedResult'
import { Leaderboard } from './Leaderboard'
import { Rewards } from './Rewards'
import { Achievements } from './Achievements'
import { MatchHistory } from './MatchHistory'
import { SeasonHistory } from './SeasonHistory'
import { useT } from '@/lib/i18n/react'
import { RAVENOF_ASSET } from '../ui/RavenofKit'
import { getStarterDecks } from '@/lib/starterDecks'

const TutorialGame = dynamic(() => import('@/components/tutorial/TutorialGame').then((m) => m.TutorialGame), { ssr: false })

type View = 'home' | 'leaderboard' | 'rewards' | 'achievements' | 'history' | 'season'
type Flow = 'idle' | 'queue' | 'found' | 'playing' | 'result'

type Deck = { id: string; name: string; faction: string | null; factionIcon: string | null; factionColor: string | null }

/** Rango numeris romėnišku formatu (patvirtintas UI). */
function toRoman(n: number): string {
  const map: [number, string][] = [[50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']]
  let out = ''; let v = Math.max(1, Math.min(50, Math.round(n)))
  for (const [num, sym] of map) while (v >= num) { out += sym; v -= num }
  return out
}


export function RankedClient() {
  const t = useT()
  const [season, setSeason] = useState<RankedSeason | null>(null)
  const [profile, setProfile] = useState<RankedProfile | null>(null)
  const [decks, setDecks] = useState<Deck[] | null>(null)
  const [myName, setMyName] = useState(t('battle.player'))
  const [factionIds, setFactionIds] = useState<Record<string, number>>({})
  const [view, setView] = useState<View>('home')
  const [flow, setFlow] = useState<Flow>('idle')
  const [opp, setOpp] = useState<MatchedOpponent | null>(null)
  const [result, setResult] = useState<(MatchReportResult & { won: boolean }) | null>(null)
  const [lastStats, setLastStats] = useState<PlayerMatchStats | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [leaders, setLeaders] = useState<LeaderboardRow[] | null>(null)
  const [deckSelOpen, setDeckSelOpen] = useState(false)
  const [covers, setCovers] = useState<Record<number, string>>({})
  const router = useRouter()
  const matchIdRef = useRef<string>('')

  const load = useCallback(async () => {
    const [s, p] = await Promise.all([getActiveSeason(), ensureProfile()])
    setSeason(s); setProfile(p)
  }, [])

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) supabase.from('profiles').select('display_name, username').eq('id', user.id).maybeSingle()
        .then(({ data }) => { const d = data as { display_name: string | null; username: string | null } | null; if (d) setMyName(d.display_name ?? d.username ?? t('battle.player')) })
    })
    getRankedDecks().then(setDecks)
    getFactionIdMap().then(setFactionIds)
    getLeaderboard(3, 0).then((rows) => setLeaders(rows.slice(0, 3)))
    void useActiveDeck.getState().refresh()
    getStarterDecks().then((sd) => {
      const m: Record<number, string> = {}
      for (const st of sd ?? []) if (st.factionId != null && st.imageUrl) m[st.factionId] = st.imageUrl
      setCovers(m)
    })
    // „Lazy cron": jei reikia (≥11 val.), paleidžia botų tarpusavio kovas (K/D gyvas be pg_cron)
    createClient().rpc('rvn_maybe_simulate_bot_matches').then(() => {}, () => {})
    load()
  }, [load])

  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), 2400); return () => clearTimeout(t) }, [toast])

  const timer = useMemo(() => season ? seasonTimer(season.end_date) : null, [season])
  const seasonMonths = useMemo(() => season ? Math.max(1, Math.round((new Date(season.end_date).getTime() - new Date(season.start_date).getTime()) / (30 * 864e5))) : null, [season])
  const rv = profile ? rankView(profile.rank_step) : null
  const adState = useActiveDeck()
  const globalDeck = activeDeckOf(adState)
  const globalOk = deckValidity(globalDeck).valid
  // KOVOS kaladė išvedama TIESIOGIAI iš globalios aktyvios (ne per selDeck state —
  // locked_deck_id/auto-select efektai lenktyniaudavo ir perrašydavo pasirinkimą!)
  const rankedEligible = !!globalDeck && globalOk && !!decks?.some((d) => d.id === globalDeck.id)
  const battleDeck = rankedEligible ? (decks?.find((d) => d.id === globalDeck!.id) ?? null) : null
  const selDeckObj = battleDeck

  const startQueue = async () => {
    if (!battleDeck) { setToast(t('ranked.deckInvalidChange')); return }
    playUiClick()
    await lockDeck(battleDeck.id)
    matchIdRef.current = `rm-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    setFlow('queue')
  }

  const opponentFactionId = (o: MatchedOpponent): number | null => {
    if (o.factionSlug && factionIds[o.factionSlug] != null) return factionIds[o.factionSlug]
    const vals = Object.values(factionIds)
    return vals.length ? vals[Math.floor(Math.random() * vals.length)] : null
  }

  const handleResult = async (r: { result: 'win' | 'loss'; turns: number; stats: PlayerMatchStats }) => {
    if (!opp) return
    setLastStats(r.stats)
    const input: ReportMatchInput = {
      opponentKind: opp.kind, opponentId: opp.id, opponentName: opp.name, opponentRankStep: opp.rankStep,
      result: r.result, playerFaction: selDeckObj?.faction ?? null, opponentFaction: opp.faction,
      durationSeconds: r.turns * 30, turnsPlayed: r.turns, stats: r.stats, clientMatchId: opp.net?.matchId ?? matchIdRef.current,
    }
    // Fair ekonomika: ranked kova visada duoda aukso (80 pergalė / 25 pralaimėjimas)
    void awardGold(r.result === 'win' ? 'ranked_win' : 'ranked_loss', r.result === 'win' ? RANKED_WIN_REWARD : RANKED_LOSS_REWARD)
    const res = await reportMatch(input)
    if ('error' in res) { setToast(t('ranked.reportFailed', { msg: res.error })); setFlow('idle'); await load(); return }
    setResult({ ...res, won: r.result === 'win' })
    setFlow('result')
    await load()
  }

  // ── Srauto overlay'ai ──────────────────────────────────────────────────────
  if (flow === 'queue') {
    return <RankedQueue deckId={battleDeck?.id ?? ''} onCancel={() => setFlow('idle')}
      onMatch={(o) => { setOpp(o); setFlow('found') }} />
  }
  if (flow === 'found' && opp) {
    return <MatchFound me={{ name: myName, rankStep: profile?.rank_step ?? 0 }}
      opponent={{ name: opp.name, avatar: opp.avatar, faction: opp.faction, rankStep: opp.rankStep }}
      onReady={() => setFlow('playing')} />
  }
  if (flow === 'playing' && opp && selDeckObj) {
    // Realus žaidėjas → realtime PvP sync (net); botas → praktika prieš AI su strategija.
    if (opp.net) {
      return (
        <TutorialGame
          deckId={selDeckObj.id}
          deckName={selDeckObj.name}
          ranked
          net={opp.net}
          opponentDeckId={opp.opponentDeckId ?? null}
          opponentName={opp.name}
          onRankedResult={handleResult}
          onClose={() => { if (flow === 'playing') { setFlow('idle'); load() } }}
        />
      )
    }
    return (
      <TutorialGame
        deckId={selDeckObj.id}
        deckName={selDeckObj.name}
        ranked
        practice
        opponentFaction={opponentFactionId(opp)}
        opponentName={opp.name}
        difficulty={opp.difficulty}
        aiStrategy={opp.kind === 'bot' && opp.id ? (() => { const b = RANKED_BOT_BY_SLUG.get(opp.id!); return b ? strategyWeights(b) : undefined })() : undefined}
        onRankedResult={handleResult}
        onClose={() => { if (flow === 'playing') { setFlow('idle'); load() } }}
      />
    )
  }
  if (flow === 'result' && result) {
    return (
      <RankedResult result={result} opponentName={opp?.name ?? ''} stats={lastStats ?? {
        creaturesKilled: 0, creaturesLost: 0, championsKilled: 0, championsLost: 0, totalKills: 0, totalDeaths: 0,
        damageDealtToEnemyPlayer: 0, damageTaken: 0, cardsPlayed: 0, spellsPlayed: 0, effectsTriggered: 0,
      }}
        onAgain={() => { setResult(null); startQueue() }}
        onHome={() => { setResult(null); setFlow('idle'); setView('home') }}
        onLeaderboard={() => { setResult(null); setFlow('idle'); setView('leaderboard') }}
        onRewards={() => { setResult(null); setFlow('idle'); setView('rewards') }}
      />
    )
  }

  // ── Panelės ────────────────────────────────────────────────────────────────

  const Back = () => (
    <button onClick={() => { playUiClick(); setView('home') }} className="text-xs mb-3 inline-flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>{t('ranked.backToRanked')}</button>
  )

  return (
    <div className={view === 'home' ? 'h-full min-h-0' : 'space-y-5 pb-4'}>
      {view !== 'home' && <Back />}

      {view === 'home' && rv && profile && (
        <div className="ravenof-body h-full flex flex-col min-h-0 ravenof-in" style={{ padding: '12px 20px 14px max(20px, env(safe-area-inset-left, 0px))' }}>
          {/* Antraštė: atgal + pavadinimas + sezonas + sub-view nav */}
          <div className="flex items-center shrink-0" style={{ gap: 10, paddingBottom: 10 }}>
            <button onClick={() => { playUiClick(); router.push('/digital') }} aria-label={t('ranked.backToRanked')} className="ravenof-iconbtn" style={{ fontSize: 16 }}>‹</button>
            <div style={{ font: '700 15px var(--ravenof-font-display)', letterSpacing: 1, textTransform: 'uppercase', color: 'var(--ravenof-text-primary)' }}>{t('home.rankedTitle')}</div>
            <div className="flex-1" />
            {([['leaderboard', '🏆'], ['history', '📜'], ['achievements', '🏅'], ['season', '📅'], ['rewards', '🎁']] as [View, string][]).map(([v, ic]) => (
              <button key={v} onClick={() => { playUiClick(); setView(v) }} className="ravenof-press" style={{ width: 26, height: 26, fontSize: 12, background: 'none', border: '1px solid var(--ravenof-border-hairline)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{ic}</button>
            ))}
            <div style={{ font: '400 11px var(--ravenof-font-body)', color: 'var(--ravenof-text-secondary)' }}>
              {season?.name ? `${t('home.season')} ${season.name}` : t('ranked.season')}{timer ? ` · ${formatTimeLeft(timer)}` : ''}
            </div>
          </div>

          <div className="flex-1 flex min-h-0" style={{ gap: 12 }}>
            {/* KAIRĖ: rango herbas */}
            <div className="relative flex flex-col justify-center text-center overflow-hidden" style={{ flex: 1.1, border: '1px solid var(--ravenof-border-hairline)', background: 'linear-gradient(180deg,var(--ravenof-bg-surface),var(--ravenof-bg-surface-2))', padding: 12 }}>
              <div className="absolute inset-0" style={{ background: `url('${RAVENOF_ASSET}/backgrounds/background-cathedral-ruins.webp') no-repeat center / cover`, opacity: .3 }} />
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`${RAVENOF_ASSET}/ranks/rank-${rv.medalTier}.png`} alt="" style={{ width: 64, height: 'auto', display: 'block', margin: '0 auto', filter: 'drop-shadow(0 0 14px rgba(200,205,214,.35))' }} />
                <div style={{ font: '700 15px var(--ravenof-font-display)', marginTop: 10, letterSpacing: 1, textTransform: 'uppercase', color: 'var(--ravenof-text-primary)' }}>{medalLabel(rv.medalTier)} · {toRoman(rv.rankNumber)}</div>
                <div style={{ font: '400 11px var(--ravenof-font-body)', color: 'var(--ravenof-text-secondary)', marginTop: 2 }}>{t('ranked.stepOf', { n: rv.rankNumber })}</div>
                <div style={{ height: 4, background: 'var(--ravenof-border-strong)', margin: '9px 18px 0', position: 'relative' }}>
                  <span style={{ position: 'absolute', inset: 0, width: `${Math.round((profile.rank_step / 149) * 100)}%`, background: 'linear-gradient(90deg,#7d8494,#dfe3ea)' }} />
                </div>
                <div className="flex justify-between" style={{ margin: '5px 18px 0', font: '400 10px var(--ravenof-font-body)', color: 'var(--ravenof-text-secondary)' }}>
                  <span style={{ color: rv.medalTier === 'bronze' ? 'var(--ravenof-text-primary)' : undefined }}>{medalLabel('bronze')}</span>
                  <span style={{ color: rv.medalTier === 'silver' ? '#dfe3ea' : undefined }}>{medalLabel('silver')}</span>
                  <span style={{ color: rv.medalTier === 'gold' ? 'var(--ravenof-gold-bright)' : undefined }}>{medalLabel('gold')}</span>
                </div>
                <div style={{ font: '400 10px var(--ravenof-font-body)', color: profile.loss_counter > 0 ? '#fbbf24' : 'var(--ravenof-text-secondary)', marginTop: 8 }}>
                  {profile.wins}W · {profile.losses}L{profile.loss_counter > 0 ? ` · ${t('ranked.lossWarning', { count: 2 - profile.loss_counter })}` : ''}
                </div>
              </div>
            </div>

            {/* CENTRAS: taisyklės + kaladė + ŽAISTI */}
            <div className="flex flex-col min-w-0" style={{ flex: 1.4, gap: 8 }}>
              <div className="flex shrink-0" style={{ gap: 6 }}>
                <div style={{ flex: 1, background: 'var(--ravenof-bg-surface-2)', border: '1px solid var(--ravenof-border-hairline)', padding: '7px 4px', textAlign: 'center' }}>
                  <div style={{ font: '700 13px var(--ravenof-font-display)', color: 'var(--ravenof-success)' }}>+1</div>
                  <div style={{ font: '400 9.5px var(--ravenof-font-body)', color: 'var(--ravenof-text-secondary)' }}>{t('ranked.perWin')}</div>
                </div>
                <div style={{ flex: 1, background: 'var(--ravenof-bg-surface-2)', border: '1px solid var(--ravenof-border-hairline)', padding: '7px 4px', textAlign: 'center' }}>
                  <div style={{ font: '700 13px var(--ravenof-font-display)', color: 'var(--ravenof-danger)' }}>−1 / 2</div>
                  <div style={{ font: '400 9.5px var(--ravenof-font-body)', color: 'var(--ravenof-text-secondary)' }}>{t('ranked.perLosses')}</div>
                </div>
                <div style={{ flex: 1, background: 'var(--ravenof-bg-surface-2)', border: '1px solid var(--ravenof-border-hairline)', padding: '7px 4px', textAlign: 'center' }}>
                  <div style={{ font: '700 13px var(--ravenof-font-display)', color: 'var(--ravenof-text-primary)' }}>{seasonMonths ?? 3} {t('ranked.monthsShort')}</div>
                  <div style={{ font: '400 9.5px var(--ravenof-font-body)', color: 'var(--ravenof-text-secondary)' }}>{t('ranked.seasonLen')}</div>
                </div>
              </div>

              <div className="shrink-0" style={{ font: '500 9px var(--ravenof-font-body)', letterSpacing: 1.5, color: 'var(--ravenof-text-secondary)', textTransform: 'uppercase' }}>{t('ranked.yourDeck')}</div>
              <button onClick={() => { playUiClick(); setDeckSelOpen(true) }} data-testid="active-deck-summary" className="ravenof-press flex items-center shrink-0 text-left" style={{ gap: 10, background: 'var(--ravenof-bg-surface)', border: '1px solid #3d3345', padding: '7px 10px', cursor: 'pointer' }}>
                <span className="shrink-0 overflow-hidden relative" style={{ width: 34, height: 45, borderRadius: 3, border: '1px solid var(--ravenof-border-strong)', background: globalDeck?.factionId != null && covers[globalDeck.factionId] ? `url('${covers[globalDeck.factionId]}') no-repeat top / cover` : 'linear-gradient(160deg,#1a1325,#0a0810)' }} />
                <span className="flex-1 min-w-0">
                  <span className="block truncate" style={{ font: '700 12px var(--ravenof-font-display)', color: 'var(--ravenof-text-primary)' }}>{!adState.loaded ? t('common.loading') : globalDeck ? globalDeck.name : t('ranked.pickActiveDeck')}</span>
                  {globalDeck && <span className="block truncate" style={{ font: '400 11px var(--ravenof-font-body)', color: globalDeck.factionColor ?? 'var(--ravenof-text-secondary)' }}>{globalDeck.faction ?? '—'} · {t('decks.cardsShort', { count: globalDeck.cardCount })}</span>}
                </span>
                {globalDeck && (rankedEligible
                  ? <span className="shrink-0" style={{ font: '700 10px var(--ravenof-font-body)', color: 'var(--ravenof-success)', border: '1px solid #6F856255', padding: '2px 7px' }}>{t('ranked.validChip')}</span>
                  : <span className="shrink-0" style={{ font: '700 10px var(--ravenof-font-body)', color: 'var(--ravenof-danger)', border: '1px solid #8D2D3855', padding: '2px 7px' }}>{t('ranked.invalidChip')}</span>)}
                <span style={{ color: 'var(--ravenof-text-secondary)' }}>›</span>
              </button>

              <div className="flex-1" />
              {!rankedEligible && (
                <p role="status" className="text-center shrink-0" style={{ font: '400 11px var(--ravenof-font-body)', color: 'var(--ravenof-danger-bright)' }}>
                  {!globalDeck ? t('ranked.pickActiveDeck') : !globalOk ? deckValidity(globalDeck).reason : t('ranked.deckNotEligible')}
                </p>
              )}
              {decks && decks.length === 0 ? (
                <Link href="/digital/decks?tab=builder" onClick={() => playUiClick()} className="ravenof-btn ravenof-btn-secondary shrink-0 w-full" style={{ minHeight: 46 }}>{t('ranked.createDeck')}</Link>
              ) : (
                <button onClick={startQueue} disabled={!battleDeck} className="ravenof-press shrink-0 w-full" style={{
                  textAlign: 'center', font: '800 15px var(--ravenof-font-display)', letterSpacing: 3, textTransform: 'uppercase',
                  color: battleDeck ? '#f6e8c6' : '#5e5868',
                  background: battleDeck ? `url('${RAVENOF_ASSET}/buttons/button-primary-normal.png') center / 100% 100% no-repeat` : 'var(--ravenof-bg-elevated)',
                  padding: 13, border: 0, cursor: battleDeck ? 'pointer' : 'default', textShadow: battleDeck ? '0 1px 4px rgba(0,0,0,.8)' : 'none',
                }}>{t('home.play')}</button>
              )}
            </div>

            {/* DEŠINĖ: lyderiai */}
            <div className="flex flex-col min-w-0" style={{ flex: 1, gap: 6 }}>
              <div className="flex items-baseline justify-between shrink-0">
                <div style={{ font: '700 11px var(--ravenof-font-display)', letterSpacing: 1, textTransform: 'uppercase', color: 'var(--ravenof-text-primary)' }}>{t('ranked.leaders')}</div>
                <button onClick={() => { playUiClick(); setView('leaderboard') }} className="ravenof-press" style={{ font: '400 10.5px var(--ravenof-font-body)', color: 'var(--ravenof-gold)', background: 'none', border: 0, cursor: 'pointer' }}>{t('ranked.viewAll')} ›</button>
              </div>
              {(leaders ?? []).map((l, i) => (
                <div key={l.entity_id} className="flex items-center min-h-0" style={{ flex: 1, gap: 8, background: 'var(--ravenof-bg-surface-2)', border: '1px solid var(--ravenof-border-hairline)', padding: '6px 10px' }}>
                  <span style={{ font: '700 12px var(--ravenof-font-display)', color: i === 0 ? 'var(--ravenof-gold)' : i === 1 ? '#c7d0db' : '#b3793f', width: 18 }}>{toRoman(l.position)}</span>
                  <span className="flex-1 truncate" style={{ font: '500 11.5px var(--ravenof-font-body)', color: 'var(--ravenof-text-primary)' }}>{l.name}</span>
                  <span className="shrink-0" style={{ font: '400 10.5px var(--ravenof-font-body)', color: 'var(--ravenof-text-secondary)' }}>{medalLabel(l.medal_tier)} {toRoman(l.rank_number)}</span>
                </div>
              ))}
              {leaders === null && <div className="flex-1 flex items-center justify-center" style={{ font: '400 11px var(--ravenof-font-body)', color: 'var(--ravenof-text-secondary)' }}>{t('common.loading')}</div>}
              {leaders !== null && leaders.length === 0 && <div className="flex-1 flex items-center justify-center" style={{ font: '400 11px var(--ravenof-font-body)', color: 'var(--ravenof-text-secondary)' }}>{t('ranked.leaderboardEmpty')}</div>}
            </div>
          </div>

          {deckSelOpen && <ActiveDeckSelectorModal onClose={() => setDeckSelOpen(false)} />}
        </div>
      )}

      {view === 'leaderboard' && (<><SectionTitle icon="🏆">{t('ranked.sections.top')}</SectionTitle><Leaderboard /></>)}
      {view === 'rewards' && (<><SectionTitle icon="🎁">{t('ranked.sections.rewards')}</SectionTitle><Rewards bestRankStep={profile?.best_rank_step ?? 0} onChanged={load} /></>)}
      {view === 'achievements' && (<><SectionTitle icon="🏅">{t('ranked.sections.achievements')}</SectionTitle><Achievements onChanged={load} /></>)}
      {view === 'history' && (<><SectionTitle icon="📜">{t('ranked.sections.history')}</SectionTitle><MatchHistory /></>)}
      {view === 'season' && (<><SectionTitle icon="📅">{t('ranked.sections.seasonHistory')}</SectionTitle><SeasonHistory /></>)}

      {toast && (
        <div className="fixed left-1/2 -translate-x-1/2 z-[180] px-4 py-2 rounded-full text-xs font-semibold" style={{ bottom: 'calc(92px + env(safe-area-inset-bottom, 0px))', background: 'rgba(10,8,16,0.95)', border: '1px solid rgba(240,180,41,0.5)', color: 'var(--gold)' }}>{toast}</div>
      )}
    </div>
  )
}
