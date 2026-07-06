'use client'

// ── Reitingo kova — pagrindinis orkestratorius (Ranked Home + srautas + panelės) ─
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { playUiClick } from '@/lib/ui-sound'
import { awardGold, RANKED_WIN_REWARD, RANKED_LOSS_REWARD } from '@/lib/economy'
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
import { RvnIcon } from '../ui/RvnIcon'
import { SectionTitle, RButton } from './_ui'
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

type Deck = { id: string; name: string; faction: string | null; factionIcon: string | null; factionColor: string | null }

const RPANEL: React.CSSProperties = { background: 'linear-gradient(160deg, rgba(26,10,12,0.96), rgba(9,7,12,0.98))', border: '1px solid rgba(239,68,68,0.26)', boxShadow: 'inset 0 0 40px rgba(0,0,0,0.55)' }

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
    getRankedDecks().then(setDecks) // pradinį pasirinkimą atstato DeckSelect (locked_deck_id — load() aukščiau turi pirmenybę)
    getFactionIdMap().then(setFactionIds)
    // „Lazy cron": jei reikia (≥11 val.), paleidžia botų tarpusavio kovas (K/D gyvas be pg_cron)
    createClient().rpc('rvn_maybe_simulate_bot_matches').then(() => {}, () => {})
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
    // Fair ekonomika: ranked kova visada duoda aukso (80 pergalė / 25 pralaimėjimas)
    void awardGold(r.result === 'win' ? 'ranked_win' : 'ranked_loss', r.result === 'win' ? RANKED_WIN_REWARD : RANKED_LOSS_REWARD)
    const res = await reportMatch(input)
    if ('error' in res) { setToast('Nepavyko įrašyti rezultato: ' + res.error); setFlow('idle'); await load(); return }
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

  const Back = () => (
    <button onClick={() => { playUiClick(); setView('home') }} className="text-xs mb-3 inline-flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>← Atgal į reitingą</button>
  )

  return (
    <div className={view === 'home' ? 'h-full min-h-0' : 'space-y-5 pb-4'}>
      {view !== 'home' && <Back />}

      {view === 'home' && rv && profile && (
        <div className="h-full flex flex-col min-h-0" style={{ gap: 'clamp(4px,1vh,10px)' }}>
          {/* Antraštė + sezonas */}
          <div className="flex items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <RvnIcon name="fi-ranked" size={30} fallback={<span style={{ fontSize: 24 }}>🏆</span>} />
              <div className="min-w-0">
                <div className="rvn-disp font-black uppercase leading-none" style={{ fontSize: 'clamp(15px,3vh,26px)', color: 'var(--gold)' }}>Reitingo kova</div>
                <div className="truncate" style={{ fontSize: 'clamp(8px,1.3vh,12px)', color: 'var(--text-muted)' }}>Kilk rangais, rink atlygius ir tapk sezono čempionu</div>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1 shrink-0">
              <div className="whitespace-nowrap" style={{ fontSize: 'clamp(9px,1.4vh,12px)', color: 'var(--text-secondary)' }}>
                <span>{season?.name ?? 'Sezonas'}</span>
                {timer && <span style={{ color: timer.endingSoon ? '#fbbf24' : 'var(--text-muted)' }}> · Liko {formatTimeLeft(timer)}</span>}
              </div>
              <div className="flex gap-1">
                {([['leaderboard', '🏆', 'Topas'], ['history', '📜', 'Kovos'], ['achievements', '🏅', 'Pasiekimai'], ['season', '📅', 'Sezonai']] as [View, string, string][]).map(([v, ic, lbl]) => (
                  <button key={v} onClick={() => { playUiClick(); setView(v) }} title={lbl} className="rvn-press rounded-lg flex items-center justify-center" style={{ width: 26, height: 26, fontSize: 13, background: 'rgba(10,8,16,0.6)', border: '1px solid rgba(239,68,68,0.3)' }}>{ic}</button>
                ))}
              </div>
            </div>
          </div>

          {/* 3 stulpeliai: statistika · rangas+CTA · atlygiai */}
          <div className="flex-1 min-h-0 grid gap-2" style={{ gridTemplateColumns: 'minmax(150px,1fr) minmax(0,1.5fr) minmax(150px,1fr)' }}>

            {/* KAIRĖ: sezono statistika */}
            <section className="rounded-2xl flex flex-col min-h-0 overflow-hidden p-2.5 justify-between" style={RPANEL}>
              <div className="rvn-disp font-extrabold uppercase tracking-wide shrink-0" style={{ fontSize: 'clamp(10px,1.5vh,13px)', color: 'var(--gold)' }}>Jūsų sezono statistika</div>
              <div className="grid grid-cols-2 gap-1.5 my-1.5">
                {([['Pergalės', profile.wins, '#86efac'], ['Pralaimėjimai', profile.losses, '#f87171'], ['Serija', profile.win_streak, 'var(--gold)'], ['K/D', formatKD(profile.total_kills, profile.total_deaths), 'var(--text-primary)']] as [string, React.ReactNode, string][]).map(([l, v, c], i) => (
                  <div key={i} className="rounded-lg flex flex-col items-center justify-center py-1.5 gap-0.5" style={{ background: 'rgba(10,8,16,0.55)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <span className="rvn-disp font-black tabular-nums leading-none" style={{ fontSize: 'clamp(14px,2.6vh,22px)', color: c }}>{v}</span>
                    <span style={{ fontSize: 'clamp(7px,1.1vh,10px)', color: 'var(--text-muted)' }}>{l}</span>
                  </div>
                ))}
              </div>
              <div className="text-center shrink-0" style={{ fontSize: 'clamp(7px,1.1vh,10px)', color: 'var(--text-muted)' }}>Šį sezoną gauta: <b style={{ color: 'var(--text-secondary)' }}>{profile.portal_exp_earned} XP</b> · <b style={{ color: 'var(--gold)' }}>{profile.ranked_gold_earned} aukso</b></div>
            </section>

            {/* CENTRAS: rango ženklelis + progresas + CTA */}
            <section className="rounded-2xl flex flex-col items-center justify-between min-h-0 overflow-hidden px-3 py-2.5" style={RPANEL}>
              <RankBadge step={profile.rank_step} size={54} showLabel />
              <div className="w-full" style={{ maxWidth: 340 }}>
                <div className="flex justify-between mb-1" style={{ fontSize: 'clamp(8px,1.1vh,10px)', color: 'var(--text-muted)' }}>
                  <span>Dabartinis rangas</span>
                  <span>{rv.isMax ? 'Maks. rangas' : `Kitas rangas: ${formatRank(nextRv!.step)}`}</span>
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
                  <div className="h-full rounded-full" style={{ width: `${rv.isMax ? 100 : ((profile.rank_step % 3) / 3) * 100 + 16}%`, background: 'linear-gradient(90deg,#b3793f,#f0b429,#fcd34d)' }} />
                </div>
                <p className="text-center mt-1" style={{ fontSize: 'clamp(8px,1.1vh,10px)', color: profile.loss_counter > 0 ? '#fbbf24' : 'var(--text-muted)' }}>
                  {profile.loss_counter > 0 ? `Iki rango kritimo: ${2 - profile.loss_counter} pralaimėjimas` : 'Apsauga nuo kritimo pilna'}
                </p>
              </div>
              {decks && decks.length > 0 ? (
                <div className="w-full" style={{ maxWidth: 340 }}>
                  <RButton full onClick={startQueue} disabled={!selDeck}>⚔ IEŠKOTI KOVOS</RButton>
                  {selDeckObj && <p className="text-center mt-1 truncate" style={{ fontSize: 'clamp(8px,1.1vh,11px)', color: 'var(--text-secondary)' }}>Pasirinkta: <b style={{ color: '#fca5a5' }}>{selDeckObj.name}</b>{selDeckObj.faction ? ` · ${selDeckObj.faction}` : ''}</p>}
                </div>
              ) : (
                <Link href="/digital/decks?tab=builder" onClick={() => playUiClick()} className="px-4 py-2 rounded-xl text-xs font-bold" style={{ background: 'rgba(239,68,68,0.18)', border: '1px solid rgba(239,68,68,0.55)', color: '#fca5a5', fontFamily: 'var(--rvn-font-display)' }}>Sukurti kaladę</Link>
              )}
            </section>

            {/* DEŠINĖ: ranked atlygiai */}
            <section className="rounded-2xl flex flex-col min-h-0 overflow-hidden p-2.5 text-center justify-between" style={RPANEL}>
              <div className="rvn-disp font-extrabold uppercase tracking-wide shrink-0" style={{ fontSize: 'clamp(10px,1.5vh,13px)', color: 'var(--gold)' }}>Ranked atlygiai</div>
              <div className="flex flex-col items-center justify-center gap-0.5 my-1">
                <span style={{ fontSize: 'clamp(9px,1.2vh,11px)', color: 'var(--text-muted)' }}>Kitas atlygis</span>
                <span className="rvn-disp font-black" style={{ fontSize: 'clamp(13px,2.4vh,20px)', color: 'var(--gold)' }}>{rv.isMax ? 'Maks. rangas' : formatRank(nextRv!.step)}</span>
                <div className="flex items-center justify-center rounded-xl my-1" style={{ width: 'clamp(40px,7vh,64px)', height: 'clamp(40px,7vh,64px)', background: 'radial-gradient(circle at 50% 30%, rgba(139,92,246,0.35), rgba(10,8,16,0.9))', border: '1px solid rgba(139,92,246,0.4)', fontSize: 'clamp(20px,4vh,34px)' }}>🎁</div>
                <span style={{ fontSize: 'clamp(7px,1.1vh,10px)', color: 'var(--text-muted)', lineHeight: 1.3 }}>Sezono pabaigoje gausi atlygius pagal aukščiausią pasiektą rangą.</span>
              </div>
              <button onClick={() => { playUiClick(); setView('rewards') }} className="rvn-press rounded-xl py-2 shrink-0 font-bold" style={{ fontSize: 'clamp(9px,1.3vh,12px)', background: 'rgba(139,92,246,0.16)', border: '1px solid rgba(139,92,246,0.45)', color: '#c4b5fd', fontFamily: 'var(--rvn-font-display)' }}>Peržiūrėti atlygius →</button>
            </section>
          </div>

          {/* APAČIA: reitingo kaladžių karuselė */}
          {decks && decks.length > 0 && (
            <div className="shrink-0">
              <div className="rvn-disp uppercase tracking-wide mb-1" style={{ fontSize: 'clamp(9px,1.3vh,11px)', color: 'var(--gold)' }}>Reitingo kaladės</div>
              <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
                {decks.map((d) => {
                  const sel = d.id === selDeck
                  return (
                    <button key={d.id} onClick={() => { playUiClick(); setSelDeck(d.id) }}
                      className="rvn-press shrink-0 rounded-xl flex items-center gap-2 px-2.5 py-1.5 text-left relative"
                      style={{ width: 'clamp(128px,19vw,188px)', border: sel ? '1.5px solid #ef4444' : '1px solid rgba(255,255,255,0.08)', background: sel ? 'linear-gradient(135deg, rgba(239,68,68,0.16), rgba(10,8,16,0.9))' : 'rgba(10,8,16,0.6)', boxShadow: sel ? '0 0 14px rgba(239,68,68,0.35)' : 'none' }}>
                      <span className="shrink-0 flex items-center justify-center rounded-lg overflow-hidden" style={{ width: 34, height: 34, background: 'rgba(0,0,0,0.4)', border: '1px solid ' + (d.factionColor ? `rgba(${d.factionColor},0.6)` : 'rgba(240,180,41,0.3)') }}>
                        {d.factionIcon ? <RvnIcon name={d.factionIcon} size={26} fallback={<span>⚔</span>} /> : <span style={{ fontSize: 16 }}>⚔</span>}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate rvn-disp font-bold" style={{ fontSize: 'clamp(10px,1.4vh,13px)', color: '#fff' }}>{d.name}</span>
                        <span className="block truncate" style={{ fontSize: 'clamp(8px,1vh,10px)', color: 'var(--text-muted)' }}>{d.faction ?? '—'}</span>
                        <span className="block" style={{ fontSize: 'clamp(7px,0.9vh,9px)', color: '#86efac' }}>Paruošta</span>
                      </span>
                      {sel && <span className="absolute top-1 right-1 flex items-center justify-center rounded-full" style={{ width: 15, height: 15, background: '#ef4444', color: '#fff', fontSize: 10, fontWeight: 900 }}>✓</span>}
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {view === 'leaderboard' && (<><SectionTitle icon="🏆">Topas</SectionTitle><Leaderboard /></>)}
      {view === 'rewards' && (<><SectionTitle icon="🎁">Apdovanojimai</SectionTitle><Rewards bestRankStep={profile?.best_rank_step ?? 0} onChanged={load} /></>)}
      {view === 'achievements' && (<><SectionTitle icon="🏅">Pasiekimai</SectionTitle><Achievements onChanged={load} /></>)}
      {view === 'history' && (<><SectionTitle icon="📜">Kovų istorija</SectionTitle><MatchHistory /></>)}
      {view === 'season' && (<><SectionTitle icon="📅">Sezono istorija</SectionTitle><SeasonHistory /></>)}

      {toast && (
        <div className="fixed left-1/2 -translate-x-1/2 z-[180] px-4 py-2 rounded-full text-xs font-semibold" style={{ bottom: 'calc(92px + env(safe-area-inset-bottom, 0px))', background: 'rgba(10,8,16,0.95)', border: '1px solid rgba(240,180,41,0.5)', color: 'var(--gold)' }}>{toast}</div>
      )}
    </div>
  )
}
