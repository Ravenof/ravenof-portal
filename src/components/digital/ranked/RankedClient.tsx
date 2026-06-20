'use client'

// ── Reitingo kova — pagrindinis orkestratorius (Ranked Home + srautas + panelės) ─
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { playUiClick } from '@/lib/ui-sound'
import {
  ensureProfile, getActiveSeason, lockDeck, getRankedDecks, reportMatch,
  getFactionIdMap, type ReportMatchInput,
} from '@/lib/ranked/client'
import type { RankedProfile, RankedSeason, MatchReportResult, PlayerMatchStats } from '@/lib/ranked/types'
import {
  formatRank, nextStepView, rankView, formatKD,
} from '@/lib/ranked/rank'
import { seasonTimer, formatTimeLeft } from '@/lib/ranked/season'
import { RANKED_BOT_BY_SLUG } from '@/lib/ranked/bots'
import { strategyWeights } from '@/lib/ranked/aiStrategy'
import { RankBadge } from './RankBadge'
import { OctPanel, SectionTitle, RButton, oct } from './_ui'
import { RankedQueue, type MatchedOpponent } from './RankedQueue'
import { MatchFound } from './MatchFound'
import { RankedResult } from './RankedResult'
import { Leaderboard } from './Leaderboard'
import { Rewards } from './Rewards'
import { Achievements } from './Achievements'
import { MatchHistory } from './MatchHistory'
import { SeasonHistory } from './SeasonHistory'

const TutorialGame = dynamic(() => import('@/components/tutorial/TutorialGame').then((m) => m.TutorialGame), { ssr: false })

type View = 'home' | 'leaderboard' | 'rewards' | 'achievements' | 'history' | 'season'
type Flow = 'idle' | 'queue' | 'found' | 'playing' | 'result'

type Deck = { id: string; name: string; faction: string | null }

export function RankedClient() {
  const [season, setSeason] = useState<RankedSeason | null>(null)
  const [profile, setProfile] = useState<RankedProfile | null>(null)
  const [decks, setDecks] = useState<Deck[] | null>(null)
  const [selDeck, setSelDeck] = useState('')
  const [myName, setMyName] = useState('Žaidėjas')
  const [factionIds, setFactionIds] = useState<Record<string, number>>({})
  const [view, setView] = useState<View>('home')
  const [flow, setFlow] = useState<Flow>('idle')
  const [opp, setOpp] = useState<MatchedOpponent | null>(null)
  const [result, setResult] = useState<(MatchReportResult & { won: boolean }) | null>(null)
  const [lastStats, setLastStats] = useState<PlayerMatchStats | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const matchIdRef = useRef<string>('')

  const load = useCallback(async () => {
    const [s, p] = await Promise.all([getActiveSeason(), ensureProfile()])
    setSeason(s); setProfile(p)
    if (p?.locked_deck_id) setSelDeck(p.locked_deck_id)
  }, [])

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) supabase.from('profiles').select('display_name, username').eq('id', user.id).maybeSingle()
        .then(({ data }) => { const d = data as { display_name: string | null; username: string | null } | null; if (d) setMyName(d.display_name ?? d.username ?? 'Žaidėjas') })
    })
    getRankedDecks().then((d) => { setDecks(d); setSelDeck((cur) => cur || d[0]?.id || '') })
    getFactionIdMap().then(setFactionIds)
    load()
  }, [load])

  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), 2400); return () => clearTimeout(t) }, [toast])

  const timer = useMemo(() => season ? seasonTimer(season.end_date) : null, [season])
  const rv = profile ? rankView(profile.rank_step) : null
  const nextRv = profile ? nextStepView(profile.rank_step) : null
  const selDeckObj = decks?.find((d) => d.id === selDeck)

  const startQueue = async () => {
    if (!selDeck) { setToast('Pirma pasirink kaladę.'); return }
    playUiClick()
    await lockDeck(selDeck)
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
    const res = await reportMatch(input)
    if ('error' in res) { setToast('Nepavyko įrašyti rezultato.'); setFlow('idle'); await load(); return }
    setResult({ ...res, won: r.result === 'win' })
    setFlow('result')
    await load()
  }

  // ── Srauto overlay'ai ──────────────────────────────────────────────────────
  if (flow === 'queue') {
    return <RankedQueue deckId={selDeck} onCancel={() => setFlow('idle')}
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
          deckId={selDeck}
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
        deckId={selDeck}
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
  const navBtn = (v: View, icon: string, label: string) => (
    <button onClick={() => { playUiClick(); setView(v) }}
      className="flex flex-col items-center justify-center gap-1 px-2 py-2.5 rounded-lg transition-all hover:scale-[1.03] active:scale-95"
      style={{ background: view === v ? 'rgba(240,180,41,0.16)' : 'rgba(10,8,16,0.6)', border: '1px solid ' + (view === v ? 'rgba(240,180,41,0.45)' : 'rgba(255,255,255,0.07)') }}>
      <span className="text-lg">{icon}</span>
      <span className="text-[10px] font-semibold" style={{ fontFamily: 'var(--rvn-font-display)', color: view === v ? 'var(--gold)' : 'var(--text-muted)', letterSpacing: '0.04em' }}>{label}</span>
    </button>
  )

  const Back = () => (
    <button onClick={() => { playUiClick(); setView('home') }} className="text-xs mb-3 inline-flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>← Atgal į reitingą</button>
  )

  return (
    <div className="space-y-5 pb-4">
      {view !== 'home' && <Back />}

      {view === 'home' && rv && profile && (
        <>
          {/* Sezono juosta */}
          <div className="flex items-center justify-between text-[11px]" style={{ color: 'var(--text-muted)' }}>
            <span>{season?.name ?? 'Sezonas'}</span>
            {timer && <span style={{ color: timer.endingSoon ? '#fbbf24' : 'var(--text-muted)' }}>Liko laiko: {formatTimeLeft(timer)}</span>}
          </div>
          {timer?.endingSoon && (
            <p className="text-center text-[11px] px-3 py-1.5 rounded-lg" style={{ background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.35)', color: '#fcd34d' }}>
              ⚠ Sezonas baigiasi greitai — suspėk pakilti!
            </p>
          )}

          {/* Rango kortelė */}
          <OctPanel b={16}>
            <div className="px-5 py-6 flex flex-col items-center gap-3">
              <RankBadge step={profile.rank_step} size={104} showLabel />
              <div className="w-full max-w-[280px]">
                <div className="flex justify-between text-[10px] mb-1" style={{ color: 'var(--text-muted)' }}>
                  <span>Dabartinis rangas</span>
                  <span>{rv.isMax ? 'Maks. rangas' : `Iki: ${formatRank(nextRv!.step)}`}</span>
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
                  <div className="h-full rounded-full" style={{ width: `${rv.isMax ? 100 : ((profile.rank_step % 3) / 3) * 100 + 16}%`, background: 'linear-gradient(90deg,#b3793f,#f0b429,#fcd34d)' }} />
                </div>
                <p className="text-center text-[11px] mt-2" style={{ color: profile.loss_counter > 0 ? '#fbbf24' : 'var(--text-muted)' }}>
                  Pralaimėjimai iki rango kritimo: {profile.loss_counter}/2
                </p>
              </div>
            </div>
          </OctPanel>

          {/* Kaladės pasirinkimas + Ieškoti kovos */}
          {decks === null ? (
            <p className="text-center text-sm" style={{ color: 'var(--text-muted)' }}>Kraunama…</p>
          ) : decks.length === 0 ? (
            <div className="text-center">
              <p className="text-sm mb-3" style={{ color: 'var(--text-muted)' }}>Neturi kaladžių — reitingo kovai reikia bent vienos.</p>
              <Link href="/digital/deck" onClick={() => playUiClick()} className="inline-block px-5 py-2.5 rounded-xl text-sm font-bold" style={{ background: 'rgba(239,68,68,0.18)', border: '1px solid rgba(239,68,68,0.55)', color: '#fca5a5', fontFamily: 'var(--rvn-font-display)' }}>Sukurti kaladę</Link>
            </div>
          ) : (
            <div className="space-y-2.5">
              <div style={{ clipPath: oct(11), background: 'rgba(239,68,68,0.4)', padding: 2 }}>
                <div className="px-4 py-3" style={{ clipPath: oct(10), background: 'linear-gradient(160deg,#15101f,#0a0810)' }}>
                  <label className="text-[10px] font-semibold block mb-1.5 text-center" style={{ color: '#fca5a5', fontFamily: 'var(--rvn-font-display)', letterSpacing: '0.1em' }}>⚔ REITINGO KALADĖ</label>
                  <select value={selDeck} onChange={(e) => setSelDeck(e.target.value)} style={{ width: '100%', padding: '0.45rem 0.6rem', borderRadius: '0.4rem', fontSize: '0.85rem', background: 'var(--bg-elevated)', border: '1px solid var(--bg-border)', color: 'var(--text-primary)', outline: 'none', textAlign: 'center' }}>
                    {decks.map((d) => <option key={d.id} value={d.id}>{d.name}{d.faction ? ` (${d.faction})` : ''}</option>)}
                  </select>
                </div>
              </div>
              <RButton full onClick={startQueue} disabled={!selDeck}>⚔ IEŠKOTI KOVOS</RButton>
            </div>
          )}

          {/* Statistikos santrauka */}
          <div className="grid grid-cols-4 gap-2">
            {[
              ['Pergalės', profile.wins, '#86efac'],
              ['Pralaimėjimai', profile.losses, '#f87171'],
              ['Serija', profile.win_streak, 'var(--gold)'],
              ['K/D', formatKD(profile.total_kills, profile.total_deaths), 'var(--text-primary)'],
            ].map(([l, v, c], i) => (
              <div key={i} className="text-center px-1 py-2.5 rounded-lg" style={{ background: 'rgba(10,8,16,0.55)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <p className="text-base font-bold tabular-nums" style={{ color: c as string, fontFamily: 'var(--rvn-font-display)' }}>{v}</p>
                <p className="text-[9px]" style={{ color: 'var(--text-muted)' }}>{l}</p>
              </div>
            ))}
          </div>
          <p className="text-center text-[10px]" style={{ color: 'var(--text-muted)' }}>
            Geriausias rangas: <b style={{ color: 'var(--text-secondary)' }}>{formatRank(profile.best_rank_step)}</b> · Iš ranked: {profile.portal_exp_earned} EXP · {profile.ranked_gold_earned} 🪙
          </p>

          {/* Navigacija */}
          <div className="grid grid-cols-5 gap-2">
            {navBtn('leaderboard', '🏆', 'Topas')}
            {navBtn('rewards', '🎁', 'Atlygiai')}
            {navBtn('achievements', '🏅', 'Pasiekimai')}
            {navBtn('history', '📜', 'Kovos')}
            {navBtn('season', '📅', 'Sezonai')}
          </div>
        </>
      )}

      {view === 'leaderboard' && (<><SectionTitle icon="🏆">Topas</SectionTitle><Leaderboard /></>)}
      {view === 'rewards' && (<><SectionTitle icon="🎁">Apdovanojimai</SectionTitle><Rewards bestRankStep={profile?.best_rank_step ?? 0} onChanged={load} /></>)}
      {view === 'achievements' && (<><SectionTitle icon="🏅">Pasiekimai</SectionTitle><Achievements onChanged={load} /></>)}
      {view === 'history' && (<><SectionTitle icon="📜">Kovų istorija</SectionTitle><MatchHistory /></>)}
      {view === 'season' && (<><SectionTitle icon="📅">Sezono istorija</SectionTitle><SeasonHistory /></>)}

      {toast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[180] px-4 py-2 rounded-full text-xs font-semibold" style={{ background: 'rgba(10,8,16,0.95)', border: '1px solid rgba(240,180,41,0.5)', color: 'var(--gold)' }}>{toast}</div>
      )}
    </div>
  )
}
