'use client'
// ── Turnyro ekranas: lobby → tinklelis (double elimination) → rezultatai ──────
// Serveris (rvn_tourney_*) valdo tinklelį; šis ekranas tik rodo būseną, siunčia
// ready/report ir paleidžia kovas:
//   • žmogus prieš žmogų – esamas PvP kliento šeimininko modelis (A = host)
//   • žmogus prieš botą  – vietinis AI (hard) su boto strategija
//   • stebėjimas         – TutorialGame net.spectator (tik žmogus prieš žmogų)
// Visose turnyro kovose ėjimo laikmatis 60 s; kaladė užrakinta nuo starto.
import { useEffect, useMemo, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import { playUiClick, playError } from '@/lib/ui-sound'
import { useT } from '@/lib/i18n/react'
import { DeskDialog } from '@/components/digital/ui/DeskKit'
import { RANKED_BOT_BY_SLUG } from '@/lib/ranked/bots'
import { strategyWeights } from '@/lib/ranked/aiStrategy'
import { log2, type TourneySize } from '@/lib/tournament/bracket'
import {
  useTournament, getRewardsConfig, tourneyLeave, tourneyKick, tourneyFillBots, tourneyStart, tourneyReady, tourneyReport, tourneyErrKey,
  type Entrant, type TMatch, type TourneyRewardsConfig,
} from '@/lib/tournament/client'
import { TAvatar, RewardLine, sizeKey, placeBuckets } from './shared'
import { placeBucket } from '@/lib/tournament/bracket'

const TutorialGame = dynamic(() => import('@/components/tutorial/TutorialGame').then((m) => m.TutorialGame), { ssr: false })
const TURN_SECONDS = 60

export function TournamentScreen({ id, userId, desktop: D, onExit }: { id: string; userId: string; desktop: boolean; onExit: () => void }) {
  const t = useT()
  const { t: tour, entrants, matches, loaded, reload } = useTournament(id)
  const [cfg, setCfg] = useState<TourneyRewardsConfig | null>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [toast, setToast] = useState('')
  const [play, setPlay] = useState<string | null>(null)          // mano kovos (tournament_matches.id)
  const [spectate, setSpectate] = useState<TMatch | null>(null)
  const [confirmLeave, setConfirmLeave] = useState(false)
  const launchedRef = useRef<Set<string>>(new Set())
  const reportedRef = useRef<Set<string>>(new Set())
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => { void getRewardsConfig().then(setCfg) }, [])
  useEffect(() => { const iv = setInterval(() => setNow(Date.now()), 500); return () => clearInterval(iv) }, [])
  useEffect(() => { if (!toast) return; const x = setTimeout(() => setToast(''), 1800); return () => clearTimeout(x) }, [toast])

  const byId = useMemo(() => new Map(entrants.map((e) => [e.id, e])), [entrants])
  const me = entrants.find((e) => e.user_id === userId) ?? null
  const isHost = tour?.host_id === userId
  const myMatch = me ? matches.find((m) => (m.entrant_a === me.id || m.entrant_b === me.id) && (m.status === 'ready_check' || m.status === 'live')) ?? null : null

  // Mano kova tapo „live" → paleidžiam (vieną kartą per kovą)
  useEffect(() => {
    if (!myMatch || myMatch.status !== 'live' || launchedRef.current.has(myMatch.id) || reportedRef.current.has(myMatch.id)) return
    launchedRef.current.add(myMatch.id)
    setSpectate(null)
    setPlay(myMatch.id)
  }, [myMatch])
  // Mano kovai prasidėjus ready-check'ui – nutraukiam stebėjimą (kad matytųsi patvirtinimo langas)
  const myReadyCheck = myMatch?.status === 'ready_check'
  useEffect(() => { if (myReadyCheck) setSpectate(null) }, [myReadyCheck])
  // Stebima kova baigėsi – grįžtam į tinklelį automatiškai po trumpos pauzės
  const specDone = spectate ? matches.find((m) => m.id === spectate.id)?.status === 'done' : false
  useEffect(() => { if (!specDone) return; const x = setTimeout(() => setSpectate(null), 6000); return () => clearTimeout(x) }, [specDone])

  const act = async (fn: () => Promise<{ error?: string }>) => {
    playUiClick(); setBusy(true); setErr('')
    const r = await fn()
    setBusy(false)
    if (r.error) { playError(); setErr(t(tourneyErrKey(r.error))); return false }
    void reload(); return true
  }

  const report = (m: TMatch, winner: string) => {
    if (reportedRef.current.has(m.id)) return
    reportedRef.current.add(m.id)
    void tourneyReport(m.id, winner).then(() => reload())
  }

  // ── Kova ──
  const playMatch = play ? matches.find((m) => m.id === play) ?? null : null
  if (playMatch && me && tour) {
    const mineA = playMatch.entrant_a === me.id
    const opp = byId.get((mineA ? playMatch.entrant_b : playMatch.entrant_a) ?? '')
    if (opp) {
      const onEnd = (won: boolean) => report(playMatch, won ? me.id : opp.id)
      // Uždarius kovą be rezultato (pasidavimas / išėjimas) – techninis pralaimėjimas
      const close = () => { if (!reportedRef.current.has(playMatch.id) && playMatch.status === 'live') report(playMatch, opp.id); setPlay(null) }
      const deckName = t('battle.tournament.title')
      if (opp.bot_slug) {
        const b = RANKED_BOT_BY_SLUG.get(opp.bot_slug)
        return <TutorialGame key={playMatch.id} deckId={me.deck_id ?? ''} deckName={deckName} opponentFaction={opp.faction_id} opponentName={opp.name}
          difficulty="hard" aiStrategy={b ? strategyWeights(b) : undefined} botChat={{ name: opp.name }} opponentAvatar={opp.avatar}
          rewardMode="unranked" format={tour.format} turnSeconds={TURN_SECONDS} onMatchEnd={onEnd} onClose={close} />
      }
      if (playMatch.pvp_match_id) {
        return <TutorialGame key={playMatch.id} deckId={me.deck_id ?? ''} deckName={deckName} opponentDeckId={mineA ? opp.deck_id : null} opponentName={opp.name}
          net={{ isHost: mineA, mySide: mineA ? 'you' : 'ai', matchId: playMatch.pvp_match_id, opponentId: opp.user_id ?? undefined }}
          format={tour.format} turnSeconds={TURN_SECONDS} onMatchEnd={onEnd} onClose={close} />
      }
    }
  }
  // ── Stebėjimas ──
  if (spectate?.pvp_match_id && tour) {
    const a = byId.get(spectate.entrant_a ?? ''), b = byId.get(spectate.entrant_b ?? '')
    const title = `${a?.name ?? '?'} vs ${b?.name ?? '?'}`
    return <TutorialGame key={'spec-' + spectate.id} deckId={me?.deck_id ?? a?.deck_id ?? ''} deckName={title} opponentName={b?.name}
      net={{ isHost: false, mySide: 'you', matchId: spectate.pvp_match_id, spectator: { title } }} format={tour.format} onClose={() => setSpectate(null)} />
  }

  const fs = (d: number, m: number) => (D ? d : m)
  const wrap = (children: React.ReactNode) => (
    <div className={'ravenof-body ravenof-in h-full flex flex-col min-h-0 overflow-y-auto ravenof-scroll'} style={{ padding: D ? '28px 40px' : '12px 16px 14px max(16px, env(safe-area-inset-left, 0px))' }} data-testid="tourney-screen">
      <div className="w-full flex flex-col" style={{ maxWidth: 1280, margin: '0 auto', gap: fs(20, 10) }}>{children}</div>
      {toast && <div className="ravenof-toast" style={{ position: 'fixed', left: '50%', transform: 'translateX(-50%)', bottom: 'calc(18px + env(safe-area-inset-bottom,0px))', zIndex: 200 }}>{toast}</div>}
    </div>
  )

  if (!loaded) return wrap(<div className="flex justify-center py-10"><span className="ravenof-spinner" style={{ width: 40, height: 40 }} /></div>)
  if (!tour || tour.status === 'abandoned') return wrap(
    <div className="flex flex-col items-center text-center" style={{ gap: 14, padding: 30 }}>
      <p style={{ font: `400 ${fs(16, 13)}px var(--ravenof-font-body)`, color: 'var(--ravenof-text-secondary)' }}>{t('battle.tournament.abandoned')}</p>
      <button className="ravenof-btn ravenof-btn-secondary" onClick={() => { playUiClick(); onExit() }}>{t('battle.tournament.backToFriendly')}</button>
    </div>,
  )

  const size = tour.size as TourneySize
  const places = cfg?.places?.[String(size)]
  const humans = entrants.filter((e) => e.user_id).length
  const leave = async () => {
    setConfirmLeave(false)
    if (tour.status === 'lobby' || (tour.status === 'running' && me?.status === 'active')) await act(() => tourneyLeave(id))
    onExit()
  }

  // ── Antraštė ──
  const header = (
    <div className="flex items-center flex-wrap" style={{ gap: fs(16, 10) }}>
      <button onClick={() => { playUiClick(); if (tour.status === 'finished' || me?.status !== 'active') onExit(); else setConfirmLeave(true) }} aria-label={t('common.back')} className="ravenof-iconbtn" style={{ fontSize: fs(22, 16) }}>‹</button>
      <div className="flex-1 min-w-0">
        <div style={{ font: `700 ${fs(28, 15)}px var(--ravenof-font-display)`, letterSpacing: fs(2, 1), textTransform: 'uppercase', color: 'var(--ravenof-text-primary)' }}>
          {t('battle.tournament.title')} · {t(`battle.tournament.size.${sizeKey(size)}`)}
        </div>
        <div style={{ font: `400 ${fs(14, 11)}px var(--ravenof-font-body)`, color: 'var(--ravenof-text-secondary)' }}>
          {t(tour.format === 'classic' ? 'battle.tournament.formatClassic' : 'battle.tournament.formatZmk')} · {t('battle.tournament.doubleElim')} · {t('battle.tournament.turnTimer', { s: TURN_SECONDS })}
        </div>
      </div>
      {tour.code && tour.status === 'lobby' && (
        <button onClick={() => { navigator.clipboard?.writeText(tour.code!); setToast(t('battle.pvp.codeCopied')) }} className="ravenof-press" title={t('battle.pvp.copy')}
          style={{ font: `700 ${fs(22, 16)}px var(--ravenof-font-display)`, letterSpacing: 6, color: 'var(--ravenof-gold-bright)', background: 'none', border: '1px solid var(--ravenof-border-gold)', padding: '4px 12px', cursor: 'pointer' }}>
          {tour.code}
        </button>
      )}
    </div>
  )

  // ── Lobby ──
  if (tour.status === 'lobby') {
    const seats: (Entrant | null)[] = Array.from({ length: size }, (_, i) => entrants[i] ?? null)
    const full = entrants.length >= size
    return wrap(<>
      {header}
      <div className={D ? 'flex items-start' : 'flex flex-col'} style={{ gap: fs(28, 12) }}>
        <div className="flex-1 min-w-0 flex flex-col" style={{ gap: fs(12, 8) }}>
          <div style={{ font: `700 ${fs(15, 12)}px var(--ravenof-font-display)`, letterSpacing: 1.5, textTransform: 'uppercase', color: 'var(--ravenof-text-secondary)' }}>
            {t('battle.tournament.players', { n: entrants.length, size })}
          </div>
          <div className="grid" style={{ gridTemplateColumns: `repeat(${D ? (size === 4 ? 2 : 4) : 2}, minmax(0,1fr))`, gap: fs(10, 6) }} data-testid="tourney-seats">
            {seats.map((e, i) => (
              <div key={e?.id ?? 'empty-' + i} className="flex items-center" style={{ gap: 10, minHeight: fs(58, 44), padding: fs(8, 6) + 'px ' + fs(12, 8) + 'px', border: '1px ' + (e ? 'solid var(--ravenof-border-hairline)' : 'dashed var(--ravenof-border-strong)'), background: e ? 'var(--ravenof-bg-surface)' : 'transparent' }}>
                {e ? <>
                  <TAvatar src={e.avatar} name={e.name} size={fs(36, 28)} />
                  <span className="flex-1 min-w-0">
                    <span className="block truncate" style={{ font: `700 ${fs(15, 12)}px var(--ravenof-font-body)`, color: 'var(--ravenof-text-primary)' }}>{e.user_id === tour.host_id ? '👑 ' : ''}{e.name}</span>
                    <span className="block truncate" style={{ font: `400 ${fs(12.5, 10)}px var(--ravenof-font-body)`, color: e.bot_slug ? 'var(--ravenof-text-secondary)' : '#4F9E52' }}>{e.bot_slug ? t('battle.tournament.botTag') : e.user_id === userId ? t('battle.tournament.you') : t('battle.tournament.playerTag')}</span>
                  </span>
                  {isHost && e.user_id !== tour.host_id && (
                    <button onClick={() => void act(() => tourneyKick(id, e.id))} disabled={busy} aria-label={t('battle.tournament.kick')} title={t('battle.tournament.kick')} className="ravenof-press" style={{ background: 'none', border: 0, color: 'var(--ravenof-text-secondary)', cursor: 'pointer', fontSize: fs(18, 15), padding: 4 }}>✕</button>
                  )}
                </> : <span style={{ font: `400 ${fs(14, 11)}px var(--ravenof-font-body)`, color: 'var(--ravenof-text-secondary)' }}>{t('battle.tournament.emptySeat')}</span>}
              </div>
            ))}
          </div>
          <div className="flex flex-wrap" style={{ gap: 8, marginTop: 4 }}>
            {isHost ? <>
              <button className="ravenof-btn ravenof-btn-secondary" disabled={busy || full} onClick={() => void act(() => tourneyFillBots(id))} data-testid="tourney-fill">{t('battle.tournament.fillBots')}</button>
              <button className="ravenof-btn ravenof-btn-primary" disabled={busy || !full} onClick={() => void act(() => tourneyStart(id, size))} data-testid="tourney-start">{t('battle.tournament.start')}</button>
            </> : <span style={{ font: `400 ${fs(14, 11.5)}px var(--ravenof-font-body)`, color: 'var(--ravenof-text-secondary)', alignSelf: 'center' }}>{t('battle.tournament.waitHost')}</span>}
            <div className="flex-1" />
            <button className="ravenof-btn ravenof-btn-secondary" disabled={busy} onClick={() => setConfirmLeave(true)}>{isHost ? t('battle.tournament.cancelTourney') : t('battle.tournament.leave')}</button>
          </div>
          {err && <p role="status" style={{ margin: 0, font: `400 ${fs(14, 11)}px var(--ravenof-font-body)`, color: '#c65563' }}>{err}</p>}
          <p style={{ margin: 0, font: `400 ${fs(13, 10.5)}px var(--ravenof-font-body)`, color: 'var(--ravenof-text-secondary)', lineHeight: 1.45 }}>{t('battle.tournament.lobbyHelp')}</p>
        </div>
        <RewardTable t={t} D={D} size={size} places={places} humans={humans} />
      </div>
      {confirmLeave && <LeaveDialog t={t} running={false} host={isHost} onYes={() => void leave()} onNo={() => setConfirmLeave(false)} />}
    </>)
  }

  // ── Vyksta / baigtas ──
  const live = matches.filter((m) => m.status === 'live' && m.pvp_match_id && m.id !== myMatch?.id)
  const winner = tour.winner_entrant ? byId.get(tour.winner_entrant) : null
  const myStatusLine = !me ? null
    : tour.status === 'finished' ? t('battle.tournament.finalPlace', { place: me.final_place ?? '—' })
    : me.status === 'eliminated' ? t('battle.tournament.eliminated', { place: me.final_place ?? '—' })
    : me.status === 'left' ? t('battle.tournament.youLeft')
    : myMatch?.status === 'live' ? t('battle.tournament.inMatch')
    : myMatch?.status === 'ready_check' ? t('battle.tournament.readyCheck')
    : t('battle.tournament.waitingNext')

  const opp = myMatch && me ? byId.get((myMatch.entrant_a === me.id ? myMatch.entrant_b : myMatch.entrant_a) ?? '') : null
  const myReady = myMatch && me ? (myMatch.entrant_a === me.id ? myMatch.ready_a : myMatch.ready_b) : false
  const readyLeft = myMatch?.ready_deadline ? Math.max(0, Math.ceil((new Date(myMatch.ready_deadline).getTime() - now) / 1000)) : null

  return wrap(<>
    {header}
    {/* Mano būsena */}
    <div className="flex items-center flex-wrap" style={{ gap: 12, padding: fs(14, 10) + 'px ' + fs(18, 12) + 'px', border: '1px solid var(--ravenof-border-gold)', background: 'linear-gradient(90deg, rgba(212,163,59,.12), rgba(0,0,0,.2))' }} data-testid="tourney-status">
      {tour.status === 'finished' && winner && (
        <span className="flex items-center" style={{ gap: 10 }}>
          <TAvatar src={winner.avatar} name={winner.name} size={fs(40, 30)} />
          <span style={{ font: `700 ${fs(18, 13)}px var(--ravenof-font-display)`, color: 'var(--ravenof-gold-bright)' }}>🏆 {t('battle.tournament.champion', { name: winner.name })}</span>
        </span>
      )}
      {myStatusLine && <span className="flex-1 min-w-0" style={{ font: `700 ${fs(16, 12.5)}px var(--ravenof-font-body)`, color: 'var(--ravenof-text-primary)' }}>{myStatusLine}</span>}
      {me?.reward && me.reward.items?.length > 0 && (
        <span style={{ font: `400 ${fs(14, 11.5)}px var(--ravenof-font-body)`, color: 'var(--ravenof-gold)' }}>
          {t('battle.tournament.yourReward')}: <RewardLine t={t} items={me.reward.items} />
        </span>
      )}
      {myMatch?.status === 'live' && !play && !reportedRef.current.has(myMatch.id) && (
        <button className="ravenof-btn ravenof-btn-primary" onClick={() => { playUiClick(); setPlay(myMatch.id) }}>{t('battle.tournament.rejoin')}</button>
      )}
      {(tour.status === 'finished' || me?.status !== 'active') && <button className="ravenof-btn ravenof-btn-secondary" onClick={() => { playUiClick(); onExit() }}>{t('battle.tournament.backToFriendly')}</button>}
      {tour.status === 'running' && me?.status === 'active' && <button className="ravenof-btn ravenof-btn-secondary" onClick={() => setConfirmLeave(true)}>{t('battle.tournament.leave')}</button>}
    </div>

    {/* Vykstančios kovos – stebėti */}
    {live.length > 0 && (
      <div className="flex flex-col" style={{ gap: 6 }}>
        <div style={{ font: `700 ${fs(14, 11)}px var(--ravenof-font-display)`, letterSpacing: 1.5, textTransform: 'uppercase', color: 'var(--ravenof-text-secondary)' }}>{t('battle.tournament.liveMatches')}</div>
        <div className="flex flex-wrap" style={{ gap: 8 }}>
          {live.map((m) => (
            <button key={m.id} onClick={() => { playUiClick(); setSpectate(m) }} className="ravenof-press flex items-center" data-testid="tourney-spectate"
              style={{ gap: 10, padding: '8px 14px', border: '1px solid var(--ravenof-border-strong)', background: 'var(--ravenof-bg-surface)', cursor: 'pointer', color: 'var(--ravenof-text-primary)', font: `600 ${fs(14, 11.5)}px var(--ravenof-font-body)` }}>
              <span className="inline-block w-2 h-2 rounded-full animate-pulse" style={{ background: '#c65563' }} />
              {byId.get(m.entrant_a ?? '')?.name} vs {byId.get(m.entrant_b ?? '')?.name}
              <span style={{ color: 'var(--ravenof-gold)', textTransform: 'uppercase', letterSpacing: 1, fontSize: fs(12, 10) }}>👁 {t('battle.tournament.watch')}</span>
            </button>
          ))}
        </div>
      </div>
    )}

    <BracketView t={t} D={D} size={size} matches={matches} byId={byId} meId={me?.id ?? null} />
    {tour.status === 'finished' && <FinalStandings t={t} D={D} entrants={entrants} meId={me?.id ?? null} />}
    {err && <p role="status" style={{ margin: 0, font: `400 ${fs(14, 11)}px var(--ravenof-font-body)`, color: '#c65563' }}>{err}</p>}

    {/* Ready-check */}
    {myMatch?.status === 'ready_check' && me && opp && (
      <DeskDialog title={t('battle.tournament.readyTitle')} width={D ? 460 : 'min(92vw, 420px)'} zIndex={120}>
        <div className="flex flex-col items-center text-center" style={{ gap: 14 }} data-testid="tourney-ready">
          <div className="flex items-center" style={{ gap: 14 }}>
            <TAvatar src={me.avatar} name={me.name} size={48} />
            <span style={{ font: '700 18px var(--ravenof-font-display)', color: 'var(--ravenof-text-secondary)' }}>VS</span>
            <TAvatar src={opp.avatar} name={opp.name} size={48} />
          </div>
          <div style={{ font: '700 17px var(--ravenof-font-display)', color: 'var(--ravenof-text-primary)' }}>{opp.name}{opp.bot_slug ? ` · ${t('battle.tournament.botTag')}` : ''}</div>
          <div style={{ font: '400 14px var(--ravenof-font-body)', color: 'var(--ravenof-text-secondary)' }}>{t(`battle.tournament.bracket.${myMatch.bracket}`)} · {matchLabel(t, myMatch, size)}</div>
          {readyLeft != null && <div style={{ font: '700 30px var(--ravenof-font-display)', color: readyLeft <= 10 ? '#c65563' : 'var(--ravenof-gold-bright)' }}>{readyLeft}s</div>}
          {myReady
            ? <div className="flex items-center" style={{ gap: 8, font: '400 14px var(--ravenof-font-body)', color: 'var(--ravenof-text-primary)' }}><span className="ravenof-spinner" style={{ width: 16, height: 16 }} />{t('battle.tournament.waitingOpponentReady')}</div>
            : <button className="ravenof-btn ravenof-btn-primary" style={{ minWidth: 200, minHeight: 48 }} disabled={busy} data-testid="tourney-ready-btn" onClick={() => void act(() => tourneyReady(myMatch.id))}>{t('battle.tournament.imReady')}</button>}
          <div style={{ font: '400 12.5px var(--ravenof-font-body)', color: 'var(--ravenof-text-secondary)' }}>{t('battle.tournament.readyHelp')}</div>
        </div>
      </DeskDialog>
    )}
    {confirmLeave && <LeaveDialog t={t} running host={isHost} onYes={() => void leave()} onNo={() => setConfirmLeave(false)} />}
  </>)
}

type TF = (k: string, p?: Record<string, string | number>) => string

function matchLabel(t: TF, m: TMatch, size: number): string {
  const k = log2(size)
  if (m.bracket === 'GF') return m.round === 2 ? t('battle.tournament.gfReset') : t('battle.tournament.grandFinal')
  if (m.bracket === 'W' && m.round === k) return t('battle.tournament.upperFinal')
  if (m.bracket === 'L' && m.round === 2 * k - 2) return t('battle.tournament.lowerFinal')
  return t('battle.tournament.round', { n: m.round })
}

function LeaveDialog({ t, running, host, onYes, onNo }: { t: TF; running: boolean; host: boolean; onYes: () => void; onNo: () => void }) {
  return (
    <DeskDialog title={t('battle.tournament.leaveTitle')} onClose={onNo} width="min(92vw, 440px)" zIndex={130}
      footer={<><button className="ravenof-btn ravenof-btn-secondary" onClick={onNo}>{t('common.cancel')}</button><button className="ravenof-btn ravenof-btn-destructive" onClick={onYes}>{t('battle.tournament.leaveYes')}</button></>}>
      <p style={{ margin: 0, font: '400 15px var(--ravenof-font-body)', color: 'var(--ravenof-text-primary)', lineHeight: 1.5 }}>
        {running ? t('battle.tournament.leaveRunning') : host ? t('battle.tournament.leaveHost') : t('battle.tournament.leaveLobby')}
      </p>
    </DeskDialog>
  )
}

function RewardTable({ t, D, size, places, humans }: { t: TF; D: boolean; size: number; places: Record<string, import('@/lib/tournament/client').RewardItem[]> | undefined; humans: number }) {
  if (!places) return null
  return (
    <div className="flex flex-col" style={{ flex: D ? '0 0 380px' : undefined, gap: 6, padding: D ? 16 : 10, border: '1px solid var(--ravenof-border-hairline)', background: 'var(--ravenof-bg-surface)' }} data-testid="tourney-rewards">
      <div style={{ font: `700 ${D ? 15 : 12}px var(--ravenof-font-display)`, letterSpacing: 1.5, textTransform: 'uppercase', color: 'var(--ravenof-text-secondary)' }}>{t('battle.tournament.rewards')}</div>
      {placeBuckets(size).map((b) => (
        <div key={b} className="flex items-baseline" style={{ gap: 10, font: `400 ${D ? 14 : 11.5}px var(--ravenof-font-body)`, color: 'var(--ravenof-text-primary)' }}>
          <span style={{ width: 44, flex: 'none', fontWeight: 700, color: b === '1' ? 'var(--ravenof-gold-bright)' : 'var(--ravenof-text-secondary)' }}>{b === '1' ? '🥇' : b === '2' ? '🥈' : b === '3' ? '🥉' : b}</span>
          <RewardLine t={t} items={places[b]} />
        </div>
      ))}
      <p style={{ margin: '6px 0 0', font: `400 ${D ? 12.5 : 10.5}px var(--ravenof-font-body)`, color: 'var(--ravenof-text-secondary)', lineHeight: 1.45 }}>
        {t('battle.tournament.rewardsNote', { humans })}
      </p>
    </div>
  )
}

function BracketView({ t, D, size, matches, byId, meId }: { t: TF; D: boolean; size: number; matches: TMatch[]; byId: Map<string, Entrant>; meId: string | null }) {
  const k = log2(size)
  const col = (bracket: 'W' | 'L' | 'GF', round: number) => matches.filter((m) => m.bracket === bracket && m.round === round).sort((a, b) => a.idx - b.idx)
  const section = (bracket: 'W' | 'L' | 'GF', rounds: number[]) => {
    const cols = rounds.map((r) => ({ r, ms: col(bracket, r).filter((m) => m.status !== 'skipped') })).filter((c) => c.ms.length > 0)
    if (cols.length === 0) return null
    return (
      <div className="flex flex-col" style={{ gap: 8 }}>
        <div style={{ font: `700 ${D ? 15 : 12}px var(--ravenof-font-display)`, letterSpacing: 1.5, textTransform: 'uppercase', color: bracket === 'GF' ? 'var(--ravenof-gold)' : 'var(--ravenof-text-secondary)' }}>{t(`battle.tournament.bracket.${bracket}`)}</div>
        <div className="flex overflow-x-auto ravenof-scroll" style={{ gap: D ? 18 : 10, paddingBottom: 6 }}>
          {cols.map(({ r, ms }) => (
            <div key={r} className="flex flex-col justify-around" style={{ gap: D ? 10 : 6, flex: 'none', width: D ? 220 : 170 }}>
              <div style={{ font: `600 ${D ? 12.5 : 10}px var(--ravenof-font-body)`, color: 'var(--ravenof-text-secondary)', textTransform: 'uppercase', letterSpacing: 1 }}>{matchLabel(t, ms[0], size)}</div>
              {ms.map((m) => <MatchCard key={m.id} t={t} D={D} m={m} byId={byId} meId={meId} />)}
            </div>
          ))}
        </div>
      </div>
    )
  }
  return (
    <div className="flex flex-col" style={{ gap: D ? 20 : 12 }} data-testid="tourney-bracket">
      {section('W', Array.from({ length: k }, (_, i) => i + 1))}
      {section('L', Array.from({ length: 2 * k - 2 }, (_, i) => i + 1))}
      {section('GF', [1, 2])}
    </div>
  )
}

function MatchCard({ t, D, m, byId, meId }: { t: TF; D: boolean; m: TMatch; byId: Map<string, Entrant>; meId: string | null }) {
  const mine = meId != null && (m.entrant_a === meId || m.entrant_b === meId)
  const row = (eid: string | null) => {
    const e = eid ? byId.get(eid) : null
    const won = m.status === 'done' && m.winner != null && m.winner === eid
    const lost = m.status === 'done' && m.winner != null && eid != null && m.winner !== eid
    return (
      <div className="flex items-center" style={{ gap: 7, minHeight: D ? 30 : 24, opacity: lost ? 0.5 : 1 }}>
        {e ? <TAvatar src={e.avatar} name={e.name} size={D ? 22 : 18} /> : <span style={{ width: D ? 22 : 18, flex: 'none' }} />}
        <span className="flex-1 min-w-0 truncate" style={{ font: `${won ? 700 : 400} ${D ? 13.5 : 11}px var(--ravenof-font-body)`, color: e?.id === meId ? 'var(--ravenof-gold-bright)' : e ? 'var(--ravenof-text-primary)' : 'var(--ravenof-text-secondary)' }}>
          {e ? e.name : t('battle.tournament.tbd')}
        </span>
        {won && <span style={{ color: 'var(--ravenof-gold)', fontSize: D ? 13 : 11 }}>✓</span>}
      </div>
    )
  }
  const st = m.status === 'live' ? { c: '#c65563', l: t('battle.tournament.st.live') }
    : m.status === 'ready_check' ? { c: 'var(--ravenof-gold)', l: t('battle.tournament.st.ready') }
    : m.status === 'done' && m.reason && m.reason !== 'played' ? { c: 'var(--ravenof-text-secondary)', l: t(`battle.tournament.reason.${m.reason}`) }
    : null
  return (
    <div style={{ border: '1px solid ' + (mine && m.status !== 'done' ? 'var(--ravenof-border-gold)' : 'var(--ravenof-border-hairline)'), background: 'rgba(10,8,14,.72)', padding: D ? '6px 10px' : '4px 8px' }}>
      {row(m.entrant_a)}
      <div style={{ height: 1, background: 'var(--ravenof-border-hairline)' }} />
      {row(m.entrant_b)}
      {st && <div style={{ font: `600 ${D ? 11 : 9.5}px var(--ravenof-font-body)`, color: st.c, textTransform: 'uppercase', letterSpacing: 1, marginTop: 2 }}>{st.l}</div>}
    </div>
  )
}

function FinalStandings({ t, D, entrants, meId }: { t: TF; D: boolean; entrants: Entrant[]; meId: string | null }) {
  const rows = [...entrants].sort((a, b) => (a.final_place ?? 99) - (b.final_place ?? 99))
  return (
    <div className="flex flex-col" style={{ gap: 6 }} data-testid="tourney-standings">
      <div style={{ font: `700 ${D ? 15 : 12}px var(--ravenof-font-display)`, letterSpacing: 1.5, textTransform: 'uppercase', color: 'var(--ravenof-text-secondary)' }}>{t('battle.tournament.standings')}</div>
      {rows.map((e) => (
        <div key={e.id} className="flex items-center" style={{ gap: 10, padding: D ? '8px 12px' : '6px 8px', border: '1px solid ' + (e.id === meId ? 'var(--ravenof-border-gold)' : 'var(--ravenof-border-hairline)'), background: 'var(--ravenof-bg-surface)' }}>
          <span style={{ width: 42, flex: 'none', font: `700 ${D ? 15 : 12}px var(--ravenof-font-display)`, color: e.final_place === 1 ? 'var(--ravenof-gold-bright)' : 'var(--ravenof-text-secondary)' }}>
            {e.final_place != null ? placeBucket(e.final_place).replace('-', '–') : '—'}
          </span>
          <TAvatar src={e.avatar} name={e.name} size={D ? 28 : 22} />
          <span className="flex-1 min-w-0 truncate" style={{ font: `600 ${D ? 14 : 11.5}px var(--ravenof-font-body)`, color: 'var(--ravenof-text-primary)' }}>{e.name}{e.bot_slug ? ` · ${t('battle.tournament.botTag')}` : ''}</span>
          {e.reward && e.reward.items?.length > 0 && <RewardLine t={t} items={e.reward.items} style={{ font: `400 ${D ? 13 : 10.5}px var(--ravenof-font-body)`, color: 'var(--ravenof-gold)' }} />}
        </div>
      ))}
    </div>
  )
}
