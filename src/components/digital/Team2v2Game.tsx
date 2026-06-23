'use client'

// ── 2v2 kovos UI — co-op (vs botai) IR PvP (4 tikri žaidėjai) ───────────────────
// Tas pats variklis (createGame2v2). PvP = host-authoritative: hostas (a1) laiko
// kanoninę būseną, klientai siunčia veiksmus su savo seatu, hostas pritaiko ir
// transliuoja visą būseną. UI persiorientuoja pagal viewSeat (tavo komanda – apačioj).
import { useEffect, useRef, useState, useCallback } from 'react'
import {
  createGame2v2, beginTeamTurn, endTeamTurn, playCard, attack, canAfford,
  canUnitAttack, legalTargets, P, teamOfSeat, enemySeats, friendlySeats,
  type GameState, type Side, type TutCard, type TargetRef, type BoardUnit, type TeamId,
} from '@/lib/tutorial/engine'
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
  const startedRef = useRef(false)
  const channelRef = useRef<RealtimeChannel | null>(null)
  const decksRef = useRef<Partial<Record<Side, TutCard[]>>>({})
  const wonRef = useRef(false)

  const meta: Meta = coop ? coop.meta : (metaProp as Meta)

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
    if (teamOfSeat(g, a.seat) !== g.activeTeam) return // ne tos komandos ėjimas
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

  const unitChip = (u: BoardUnit, seat: Side, mine: boolean) => {
    const isFoe = topSeats.includes(seat)
    const targetable = !!sel && isFoe && legalSet.has('unit:' + u.uid)
    const ready = mine && !g.winner && canUnitAttack(g, viewSeat, u).ok
    const selected = sel === u.uid
    return (
      <button key={u.uid} onClick={() => mine ? onMyUnit(u) : targetable ? onTarget({ kind: 'unit', side: seat, uid: u.uid }) : undefined}
        disabled={(!mine && !targetable) || !!g.winner}
        className="relative shrink-0 rounded-md overflow-hidden"
        style={{ width: 44, height: 58, border: '1.5px solid ' + (selected ? '#fcd34d' : targetable ? '#f87171' : (u.card.rarityColor + '99')),
          boxShadow: selected ? '0 0 9px #fcd34d' : targetable ? '0 0 8px rgba(239,68,68,0.7)' : undefined,
          opacity: mine && !ready ? 0.55 : 1, cursor: mine ? 'pointer' : targetable ? 'crosshair' : 'default',
          background: u.card.image ? undefined : (u.card.factionColor + '22') }}>
        {u.card.image && /* eslint-disable-next-line @next/next/no-img-element */ <img src={u.card.image} alt="" className="absolute inset-0 w-full h-full object-cover" draggable={false} />}
        <span className="absolute top-0 left-0 px-0.5 text-[9px] font-bold" style={{ background: 'rgba(0,0,0,0.85)', color: '#f87171' }}>{u.atk ?? 0}</span>
        <span className="absolute bottom-0 right-0 px-0.5 text-[9px] font-bold" style={{ background: 'rgba(0,0,0,0.85)', color: '#4ade80' }}>{u.hp}</span>
        {u.statuses?.frozen && <span className="absolute inset-0 flex items-center justify-center text-xs" style={{ background: 'rgba(56,189,248,0.25)' }}>❄</span>}
      </button>
    )
  }

  const seatRow = (seat: Side, mine: boolean) => (
    <div key={seat} className="flex items-center gap-1.5 px-1.5 py-1 rounded-lg" style={{ background: g.active === seat && g.activeTeam === teamOfSeat(g, seat) ? 'rgba(56,189,248,0.10)' : 'rgba(10,8,16,0.4)', outline: seat === viewSeat ? '1px solid rgba(252,211,77,0.35)' : undefined }}>
      <span className="w-14 shrink-0 text-[10px] truncate" style={{ color: seat === viewSeat ? '#fcd34d' : 'var(--text-muted)' }}>{seatAvatar(seat)} {seatName(seat)}</span>
      <div className="flex gap-1 flex-1 min-h-[58px] items-center overflow-x-auto">
        {P(g, seat).units.map((u, i) => u ? unitChip(u, seat, mine) : <span key={i} className="shrink-0 rounded-md" style={{ width: 44, height: 58, border: '1px dashed rgba(255,255,255,0.07)' }} />)}
      </div>
      <span className="shrink-0 text-[10px]" style={{ color: 'var(--gold)' }}>🪙{P(g, seat).gold}</span>
    </div>
  )

  const hpBar = (team: TeamId, foeTeam: boolean) => {
    const t = g.teams![team]; const pct = (t.hp / t.maxHp) * 100; const accent = ACCENT[team]
    const targetable = foeTeam && !!sel && legalSet.has('player:' + repSeat(team))
    return (
      <button onClick={() => targetable && onTarget({ kind: 'player', side: repSeat(team) })} disabled={!targetable}
        className="w-full flex items-center gap-2 px-2 py-1 rounded-lg" style={{ border: `1px solid rgba(${accent},0.5)`, background: 'rgba(10,8,16,0.7)', cursor: targetable ? 'crosshair' : 'default', boxShadow: targetable ? `0 0 9px rgba(${accent},0.6)` : undefined }}>
        <span className="text-xs">{team === 'A' ? '🟦' : '🟥'}</span>
        <div className="flex-1 h-2.5 rounded-full overflow-hidden" style={{ background: 'rgba(0,0,0,0.5)' }}><div className="h-full" style={{ width: `${pct}%`, background: `rgb(${accent})` }} /></div>
        <span className="text-xs font-bold tabular-nums" style={{ color: `rgb(${accent})`, fontFamily: 'var(--rvn-font-display)' }}>❤ {t.hp}/{t.maxHp}</span>
      </button>
    )
  }

  const iWon = g.winnerTeam === myTeam
  const statusTxt = myTurn ? 'TAVO komandos ėjimas' : (isPvp ? 'Kita komanda žaidžia…' : (phase === 'ai' ? 'Priešininkai/ally žaidžia…' : '…'))

  return (
    <div className="fixed inset-0 z-[150] flex flex-col" style={{ background: 'radial-gradient(120% 100% at 50% 0%, #15101f, #07050b)' }}>
      <div className="flex items-center justify-between px-3 py-2 shrink-0" style={{ borderBottom: '1px solid rgba(56,189,248,0.2)' }}>
        <span className="text-sm font-bold" style={{ color: '#7dd3fc', fontFamily: 'var(--rvn-font-display)' }}>{isPvp ? '🤝 2v2 PvP' : '🤝 2v2'} · {statusTxt}</span>
        <button onClick={() => { playUiClick(); onExit() }} className="text-xs px-3 py-1 rounded-lg" style={{ color: '#fca5a5', border: '1px solid rgba(239,68,68,0.4)' }}>Išeiti</button>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1.5 flex flex-col">
        {hpBar(enemyTeam, true)}
        {topSeats.map((s) => seatRow(s, false))}
        <div className="flex-1 min-h-[6px]" />
        {seatRow(allySeat, false)}
        {seatRow(viewSeat, true)}
        {hpBar(myTeam, false)}

        <div className="flex items-center justify-between px-1 pt-1">
          <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{g.log.length ? g.log[g.log.length - 1].msg : ''}</span>
          <button onClick={endTurn} disabled={!myTurn} className="px-3 py-1.5 rounded-lg text-xs font-bold disabled:opacity-40" style={{ background: 'rgba(56,189,248,0.2)', border: '1px solid rgba(56,189,248,0.55)', color: '#7dd3fc', fontFamily: 'var(--rvn-font-display)' }}>Baigti ėjimą</button>
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {me.hand.map((c) => {
            const afford = myTurn && canAfford(g, viewSeat, c)
            return (
              <button key={c.uid} onClick={() => onPlay(c)} disabled={!myTurn} className="relative shrink-0 rounded-md overflow-hidden active:scale-95"
                style={{ width: 50, height: 66, border: '1.5px solid ' + c.rarityColor + '99', opacity: afford ? 1 : 0.45, background: c.image ? undefined : (c.factionColor + '22') }}>
                {c.image && /* eslint-disable-next-line @next/next/no-img-element */ <img src={c.image} alt="" className="absolute inset-0 w-full h-full object-cover" draggable={false} />}
                <span className="absolute top-0 left-0 px-0.5 text-[9px] font-bold" style={{ background: 'rgba(0,0,0,0.85)', color: afford ? 'var(--gold)' : '#f87171' }}>{c.gold}</span>
                {c.attack != null && <span className="absolute bottom-0 left-0 px-0.5 text-[9px] font-bold" style={{ background: 'rgba(0,0,0,0.85)', color: '#f87171' }}>{c.attack}</span>}
                {c.health != null && <span className="absolute bottom-0 right-0 px-0.5 text-[9px] font-bold" style={{ background: 'rgba(0,0,0,0.85)', color: '#4ade80' }}>{c.health}</span>}
              </button>
            )
          })}
        </div>
      </div>

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
