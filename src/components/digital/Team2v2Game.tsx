'use client'

// ── 2v2 kovos UI — co-op (vs botai) IR PvP (4 tikri žaidėjai) ───────────────────
// Tas pats variklis (createGame2v2) + tas pats kortų vaizdas kaip 1v1 (UnitTile/
// MiniCard/PileBack/HpVial). Laukas padalintas į dvi puses: tavo / sąjungininko
// kūriniai apačioj, abu priešai viršuj; kiekvienas žaidėjas turi savo Kaladę /
// Kapinyną / ŽMK. PvP = host-authoritative broadcast; UI persiorientuoja per viewSeat.
import { useEffect, useRef, useState, useCallback } from 'react'
import {
  createGame2v2, beginTeamTurn, endTeamTurn, playCard, attack, canAfford,
  canUnitAttack, legalTargets, P, teamOfSeat, enemySeats, friendlySeats, boardCreatureCap,
  type GameState, type Side, type TutCard, type TargetRef, type BoardUnit, type TeamId,
} from '@/lib/tutorial/engine'
import { UnitTile, MiniCard, PileBack, HpVial } from '@/components/tutorial/TutorialGame'
import { aiActFor } from '@/lib/team2v2/ai'
import type { Coop2v2, CoopSeatMeta } from '@/lib/team2v2/load'
import { createClient } from '@/lib/supabase/client'
import type { RealtimeChannel } from '@supabase/supabase-js'
import type { Pvp2v2Net, Net2v2Action } from '@/lib/team2v2/pvp'
import { playUiClick, playCardPlace } from '@/lib/ui-sound'
import { playBattleSound } from '@/lib/game/soundManager'
import { startBattleMusic, startMenuMusic } from '@/lib/game/musicManager'

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))
type Meta = Record<Side, CoopSeatMeta>
const ACCENT: Record<TeamId, string> = { A: '56,189,248', B: '239,68,68' }
const repSeat = (team: TeamId): Side => (team === 'A' ? 'you' : 'ai')

export function Team2v2Game({ coop, net, meta: metaProp, onExit }: {
  coop?: Coop2v2; net?: Pvp2v2Net; meta?: Meta; onExit: () => void
}) {
  const isPvp = !!net
  const viewSeat: Side = net ? net.mySeat : 'you'
  const gRef = useRef<GameState | null>(coop ? createGame2v2(coop.decks, 'A') : null)
  const [, force] = useState(0)
  const rerender = useCallback(() => force((v) => v + 1), [])
  const [phase, setPhase] = useState<'human' | 'ai'>('human') // tik co-op
  const [sel, setSel] = useState<string | null>(null)
  const [pileView, setPileView] = useState<{ title: string; cards: TutCard[] } | null>(null)
  const [compact, setCompact] = useState(true)
  const startedRef = useRef(false)
  const channelRef = useRef<RealtimeChannel | null>(null)
  const decksRef = useRef<Partial<Record<Side, TutCard[]>>>({})
  const wonRef = useRef(false)

  const meta: Meta = coop ? coop.meta : (metaProp as Meta)

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const mq = window.matchMedia('(min-width: 760px)')
    const on = () => setCompact(!mq.matches); on()
    mq.addEventListener?.('change', on); return () => mq.removeEventListener?.('change', on)
  }, [])

  const winSfx = () => {
    const g = gRef.current; if (!g?.winner || wonRef.current) return
    wonRef.current = true
    const myTeam = g.teams ? teamOfSeat(g, viewSeat) : 'A'
    playBattleSound(g.winnerTeam === myTeam ? 'summon' : 'death', 0.5)
  }

  // ── co-op: sukurti + pradėti iškart ──────────────────────────────────────────
  useEffect(() => {
    if (isPvp || startedRef.current) return
    startedRef.current = true
    beginTeamTurn(gRef.current!)
    startBattleMusic(); rerender()
    return () => { startMenuMusic() }
  }, [isPvp, rerender])

  // ── PvP: realaus laiko sinchronizacija ───────────────────────────────────────
  const broadcastState = useCallback(() => {
    channelRef.current?.send({ type: 'broadcast', event: 'state', payload: gRef.current })
  }, [])

  const applyAction = useCallback((a: Net2v2Action) => {
    const g = gRef.current
    if (!g || g.winner || !g.teams) return
    if (teamOfSeat(g, a.seat) !== g.activeTeam) return
    g.active = a.seat
    if (a.t === 'play') playCard(g, a.seat, a.uid)
    else if (a.t === 'attack') attack(g, a.seat, a.attacker, a.target)
    else if (a.t === 'end') { endTeamTurn(g); beginTeamTurn(g) }
    broadcastState(); winSfx(); rerender()
  }, [broadcastState, rerender]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!net) return
    const supabase = createClient()
    const ch = supabase.channel('pvp2v2-' + net.roomId, { config: { broadcast: { self: false } } })

    const tryStart = () => {
      if (gRef.current) return
      const d = decksRef.current
      if (d.you && d.ally && d.ai && d.foe2) {
        gRef.current = createGame2v2({ you: d.you, ally: d.ally, ai: d.ai, foe2: d.foe2 }, 'A')
        beginTeamTurn(gRef.current); broadcastState(); rerender()
      }
    }

    if (net.isHost) {
      decksRef.current[net.mySeat] = net.myDeck
      ch.on('broadcast', { event: 'deck' }, ({ payload }) => {
        const p = payload as { seat: Side; cards: TutCard[] }
        if (!decksRef.current[p.seat]) decksRef.current[p.seat] = p.cards
        tryStart()
      })
      ch.on('broadcast', { event: 'action' }, ({ payload }) => applyAction(payload as Net2v2Action))
      ch.on('broadcast', { event: 'hello' }, () => { if (gRef.current) broadcastState() })
    } else {
      ch.on('broadcast', { event: 'state' }, ({ payload }) => {
        gRef.current = payload as GameState; winSfx(); rerender()
      })
    }

    ch.subscribe((status) => {
      if (status !== 'SUBSCRIBED') return
      if (net.isHost) { tryStart() }
      else {
        ch.send({ type: 'broadcast', event: 'deck', payload: { seat: net.mySeat, cards: net.myDeck } })
        ch.send({ type: 'broadcast', event: 'hello', payload: {} })
      }
    })
    channelRef.current = ch
    startBattleMusic()
    return () => { supabase.removeChannel(ch); channelRef.current = null; startMenuMusic() }
  }, [net?.roomId]) // eslint-disable-line react-hooks/exhaustive-deps

  const sendOrApply = (a: Net2v2Action) => {
    if (net!.isHost) applyAction(a)
    else channelRef.current?.send({ type: 'broadcast', event: 'action', payload: a })
  }

  // ── co-op botų ėjimai ─────────────────────────────────────────────────────────
  const runAi = async (seat: Side) => {
    const g = gRef.current!; let guard = 0
    while (!g.winner && guard++ < 40) {
      g.active = seat; const did = aiActFor(g, seat); rerender()
      if (!did) break
      await sleep(520)
    }
  }
  const endTurnCoop = async () => {
    const g = gRef.current!
    playUiClick(); setSel(null); setPhase('ai'); rerender()
    g.active = 'ally'; await runAi('ally')
    if (!g.winner) { endTeamTurn(g); beginTeamTurn(g); rerender(); await sleep(400) }
    if (!g.winner) await runAi('ai')
    if (!g.winner) { g.active = 'foe2'; await runAi('foe2') }
    if (!g.winner) { endTeamTurn(g); beginTeamTurn(g) }
    winSfx(); setPhase('human'); rerender()
  }

  const g = gRef.current
  if (!g || !g.teams) {
    return (
      <div className="fixed inset-0 z-[150] flex flex-col items-center justify-center gap-3" style={{ background: 'radial-gradient(120% 100% at 50% 0%, #15101f, #07050b)' }}>
        <p className="text-sm animate-pulse" style={{ color: '#7dd3fc', fontFamily: 'var(--rvn-font-display)' }}>🤝 Jungiamasi prie 2v2 kovos…</p>
        <button onClick={() => { playUiClick(); onExit() }} className="text-xs px-3 py-1 rounded-lg" style={{ color: '#fca5a5', border: '1px solid rgba(239,68,68,0.4)' }}>Atšaukti</button>
      </div>
    )
  }

  const myTeam: TeamId = teamOfSeat(g, viewSeat)
  const enemyTeam: TeamId = myTeam === 'A' ? 'B' : 'A'
  const topSeats = enemySeats(g, viewSeat)
  const allySeat = friendlySeats(g, viewSeat).find((s) => s !== viewSeat)!
  const me = P(g, viewSeat)
  const myTurn = !g.winner && g.activeTeam === myTeam && (isPvp || phase === 'human')
  const unitW = compact ? 46 : 60
  const pileW = compact ? 26 : 32

  const seatName = (s: Side) => meta[s]?.name?.replace(' (AI)', '') ?? s
  const seatAvatar = (s: Side) => meta[s]?.avatar ?? '🎴'

  const endTurn = () => {
    if (!myTurn) return
    if (isPvp) { playUiClick(); setSel(null); sendOrApply({ t: 'end', seat: viewSeat }) }
    else endTurnCoop()
  }
  const onPlay = (c: TutCard) => {
    if (!myTurn || !canAfford(g, viewSeat, c)) { playUiClick(); return }
    if (isPvp) { playUiClick(); sendOrApply({ t: 'play', seat: viewSeat, uid: c.uid }); return }
    g.active = 'you'
    const r = playCard(g, 'you', c.uid)
    if (r.ok) { playCardPlace(); winSfx() }
    rerender()
  }
  const onMyUnit = (u: BoardUnit) => {
    if (!myTurn || !canUnitAttack(g, viewSeat, u).ok) { playUiClick(); return }
    playUiClick(); setSel(sel === u.uid ? null : u.uid)
  }
  const onTarget = (t: TargetRef) => {
    if (!myTurn || !sel) return
    if (isPvp) { playBattleSound('impact', 0.4); sendOrApply({ t: 'attack', seat: viewSeat, attacker: sel, target: t }); setSel(null); return }
    g.active = 'you'
    const r = attack(g, 'you', sel, t)
    if (r.ok) { playBattleSound('impact', 0.4); setSel(null); winSfx() }
    rerender()
  }

  const legalSet = (() => {
    if (!sel) return new Set<string>()
    const u = me.units.find((x) => x?.uid === sel)
    if (!u) return new Set<string>()
    return new Set(legalTargets(g, viewSeat, u).map((t) => t.kind + ':' + ('uid' in t ? t.uid : t.side)))
  })()

  // ── kūrinių eilė vienam seatui ────────────────────────────────────────────────
  const seatUnits = (seat: Side, mine: boolean) => {
    const p = P(g, seat)
    const cap = boardCreatureCap(g, seat)
    const slots = Math.max(cap, p.units.length, compact ? 4 : 5)
    return (
      <div className="flex gap-1 items-center overflow-x-auto py-0.5 min-h-[64px]">
        {Array.from({ length: slots }).map((_, i) => {
          const u = p.units[i]
          if (!u) return <span key={seat + '-s' + i} className="shrink-0 rounded-lg" style={{ width: unitW, height: Math.round(unitW * 4 / 3), border: '1px dashed rgba(240,180,41,0.14)' }} />
          const targetable = !mine && topSeats.includes(seat) && legalSet.has('unit:' + u.uid)
          return (
            <div key={u.uid} className="shrink-0">
              <UnitTile g={g} u={u} w={unitW}
                selected={mine && sel === u.uid}
                targetable={targetable}
                canAct={mine && myTurn && !u.isChampion && canUnitAttack(g, viewSeat, u).ok}
                dimmed={!!sel && !mine && topSeats.includes(seat) && !targetable}
                onClick={() => mine ? onMyUnit(u) : targetable ? onTarget({ kind: 'unit', side: seat, uid: u.uid }) : undefined}
              />
            </div>
          )
        })}
      </div>
    )
  }

  // ── Kaladė / ŽMK / Kapinynas vienam seatui ────────────────────────────────────
  const pileCell = (label: string, count: number, kind: 'plain' | 'zmk' | 'grave', cards?: TutCard[]) => {
    const ph = Math.round(pileW * 4 / 3)
    const top = kind === 'grave' && cards && cards.length ? cards[cards.length - 1] : null
    const interactive = kind === 'grave' && count > 0
    return (
      <div className="flex flex-col items-center gap-0.5">
        <div className="relative rounded-md overflow-hidden flex items-center justify-center" style={{ width: pileW, height: ph, background: top ? '#0d0a14' : 'linear-gradient(145deg,#1a1325,#0d0a14)', border: '1px solid rgba(240,180,41,0.3)', opacity: count === 0 ? 0.4 : 1, cursor: interactive ? 'pointer' : 'default' }}
          onClick={interactive ? () => { playUiClick(); setPileView({ title: label, cards: cards! }) } : undefined}>
          {top ? <MiniCard c={top} w={pileW} /> : (count > 0 && kind !== 'grave' ? <PileBack kind={kind} /> : null)}
          <span className="absolute bottom-0 right-0 px-0.5 rounded-tl text-[9px] font-bold" style={{ color: 'var(--gold)', background: 'rgba(0,0,0,0.8)' }}>{count}</span>
          {interactive && <span className="absolute -top-1 -right-1 text-[8px]">👁</span>}
        </div>
        <span className="text-[7px] uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>{label}</span>
      </div>
    )
  }
  const seatPiles = (seat: Side) => {
    const p = P(g, seat)
    return (
      <div className="flex gap-1.5 items-end justify-center">
        {pileCell('Kaladė', p.deck.length, 'plain')}
        {pileCell('ŽMK', p.zmk.length, 'zmk')}
        {pileCell('Kapai', p.discard.length, 'grave', p.discard)}
      </div>
    )
  }

  // ── seato zona (antraštė + kūriniai), piles atskirai ──────────────────────────
  const seatZone = (seat: Side, mine: boolean, pilesOnTop: boolean) => {
    const p = P(g, seat)
    const active = g.active === seat && g.activeTeam === teamOfSeat(g, seat)
    const tcol = ACCENT[teamOfSeat(g, seat)]
    return (
      <div className="flex-1 min-w-0 rounded-lg px-1.5 py-1" style={{ border: `1px solid rgba(${tcol},${seat === viewSeat ? 0.55 : 0.22})`, background: active ? `rgba(${tcol},0.10)` : 'rgba(10,8,16,0.45)', boxShadow: seat === viewSeat ? `inset 0 0 12px rgba(${tcol},0.12)` : undefined }}>
        <div className="flex items-center justify-between gap-1 mb-0.5">
          <span className="text-[10px] truncate" style={{ color: seat === viewSeat ? '#fcd34d' : `rgb(${tcol})`, fontFamily: 'var(--rvn-font-display)' }}>{seatAvatar(seat)} {seatName(seat)}{seat === viewSeat ? ' (tu)' : ''}</span>
          <span className="shrink-0 text-[10px] font-bold" style={{ color: 'var(--gold)' }}>🪙{p.gold}</span>
        </div>
        {pilesOnTop && <div className="mb-0.5">{seatPiles(seat)}</div>}
        {seatUnits(seat, mine)}
        {!pilesOnTop && <div className="mt-0.5">{seatPiles(seat)}</div>}
      </div>
    )
  }

  const teamHp = (team: TeamId) => {
    const t = g.teams![team]; const accent = ACCENT[team]
    const targetable = team === enemyTeam && !!sel && legalSet.has('player:' + repSeat(team))
    return (
      <button onClick={() => targetable && onTarget({ kind: 'player', side: repSeat(team) })} disabled={!targetable}
        className="flex items-center gap-2 px-3 py-0.5 rounded-full" style={{ border: `1px solid rgba(${accent},0.5)`, background: 'rgba(10,8,16,0.7)', cursor: targetable ? 'crosshair' : 'default', boxShadow: targetable ? `0 0 12px rgba(${accent},0.7)` : undefined }}>
        <HpVial hp={t.hp} maxHp={t.maxHp} scale={0.62} />
        <span className="text-xs font-bold" style={{ color: `rgb(${accent})`, fontFamily: 'var(--rvn-font-display)' }}>{team === 'A' ? '🟦 Komanda A' : '🟥 Komanda B'} · {t.hp}/{t.maxHp}</span>
      </button>
    )
  }

  const iWon = g.winnerTeam === myTeam
  const statusTxt = myTurn ? 'TAVO komandos ėjimas' : (isPvp ? 'Kita komanda žaidžia…' : (phase === 'ai' ? 'Priešininkai žaidžia…' : '…'))

  return (
    <div className="fixed inset-0 z-[150] flex flex-col" style={{ background: 'radial-gradient(120% 100% at 50% 0%, #15101f, #07050b)' }}>
      <div className="flex items-center justify-between px-3 py-2 shrink-0" style={{ borderBottom: '1px solid rgba(56,189,248,0.2)' }}>
        <span className="text-sm font-bold" style={{ color: '#7dd3fc', fontFamily: 'var(--rvn-font-display)' }}>{isPvp ? '🤝 2v2 PvP' : '🤝 2v2'} · {statusTxt}</span>
        <button onClick={() => { playUiClick(); onExit() }} className="text-xs px-3 py-1 rounded-lg" style={{ color: '#fca5a5', border: '1px solid rgba(239,68,68,0.4)' }}>Išeiti</button>
      </div>

      <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-1.5">
        {/* priešų komanda (viršuj) */}
        <div className="flex justify-center"><div>{teamHp(enemyTeam)}</div></div>
        <div className="flex gap-1.5 items-stretch">
          {seatZone(topSeats[0], false, true)}
          {seatZone(topSeats[1], false, true)}
        </div>

        <div className="flex items-center gap-2 my-0.5">
          <div className="flex-1 h-px" style={{ background: 'linear-gradient(90deg,transparent,rgba(240,180,41,0.4),transparent)' }} />
          <span className="text-[10px] font-bold" style={{ color: 'var(--gold)', fontFamily: 'var(--rvn-font-display)' }}>VS</span>
          <div className="flex-1 h-px" style={{ background: 'linear-gradient(90deg,transparent,rgba(240,180,41,0.4),transparent)' }} />
        </div>

        {/* tavo komanda (apačioj): tavo | sąjungininko */}
        <div className="flex gap-1.5 items-stretch">
          {seatZone(viewSeat, true, false)}
          {seatZone(allySeat, false, false)}
        </div>
        <div className="flex justify-center"><div>{teamHp(myTeam)}</div></div>

        {/* ėjimo juosta + ranka */}
        <div className="flex items-center justify-between px-1 pt-0.5">
          <span className="text-[10px] truncate flex-1 mr-2" style={{ color: 'var(--text-muted)' }}>{g.log.length ? g.log[g.log.length - 1].msg : ''}</span>
          <button onClick={endTurn} disabled={!myTurn} className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold disabled:opacity-40" style={{ background: 'rgba(56,189,248,0.2)', border: '1px solid rgba(56,189,248,0.55)', color: '#7dd3fc', fontFamily: 'var(--rvn-font-display)' }}>Baigti ėjimą</button>
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-1 min-h-[72px] items-center">
          {me.hand.length === 0 && <span className="text-[10px] mx-auto" style={{ color: 'var(--text-muted)' }}>Ranka tuščia</span>}
          {me.hand.map((c) => {
            const afford = myTurn && canAfford(g, viewSeat, c)
            return (
              <button key={c.uid} onClick={() => onPlay(c)} disabled={!myTurn} className="shrink-0 active:scale-95 disabled:cursor-default" style={{ opacity: afford ? 1 : 0.5 }}>
                <MiniCard c={c} w={compact ? 52 : 66} dim={!afford} costNow={c.gold} />
              </button>
            )
          })}
        </div>
      </div>

      {/* kapinyno peržiūra */}
      {pileView && (
        <div className="absolute inset-0 z-[158] flex items-center justify-center p-4" style={{ background: 'rgba(4,3,8,0.9)' }} onClick={() => setPileView(null)}>
          <div className="max-w-md w-full rounded-2xl p-4" style={{ background: 'rgba(10,8,16,0.97)', border: '1px solid rgba(240,180,41,0.4)' }} onClick={(e) => e.stopPropagation()}>
            <p className="text-sm font-bold mb-2 text-center" style={{ color: 'var(--gold)', fontFamily: 'var(--rvn-font-display)' }}>{pileView.title} ({pileView.cards.length})</p>
            <div className="flex flex-wrap gap-1.5 justify-center max-h-[60vh] overflow-y-auto">
              {pileView.cards.map((c, i) => <MiniCard key={c.uid + i} c={c} w={56} />)}
            </div>
            <button onClick={() => { playUiClick(); setPileView(null) }} className="mt-3 w-full px-4 py-2 rounded-xl text-sm font-bold" style={{ border: '1px solid rgba(240,180,41,0.4)', color: 'var(--gold)' }}>Uždaryti</button>
          </div>
        </div>
      )}

      {g.winner && (
        <div className="absolute inset-0 z-[160] flex items-center justify-center" style={{ background: 'rgba(4,3,8,0.92)' }}>
          <div className="text-center px-6 py-8 rounded-2xl" style={{ background: 'rgba(10,8,16,0.97)', border: `1px solid ${iWon ? 'rgba(56,189,248,0.6)' : 'rgba(239,68,68,0.5)'}` }}>
            <p className="text-5xl mb-2">{iWon ? '🏆' : '💀'}</p>
            <p className="text-2xl font-bold mb-1" style={{ fontFamily: 'var(--rvn-font-display)', color: iWon ? '#7dd3fc' : '#f87171' }}>{iWon ? 'Komanda laimėjo!' : 'Komanda pralaimėjo'}</p>
            <p className="text-xs mb-5" style={{ color: 'var(--text-muted)' }}>{isPvp ? '2v2 PvP' : '2v2 co-op vs botai'}</p>
            <button onClick={() => { playUiClick(); onExit() }} className="px-6 py-2.5 rounded-xl text-sm font-bold" style={{ background: 'rgba(56,189,248,0.2)', border: '1px solid rgba(56,189,248,0.55)', color: '#7dd3fc', fontFamily: 'var(--rvn-font-display)' }}>Grįžti</button>
          </div>
        </div>
      )}
    </div>
  )
}
