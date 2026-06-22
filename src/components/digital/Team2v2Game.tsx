'use client'

// ── 2v2 kovos UI (ėjimais, komandos ėjimas, bendras HP) — naudoja tikrą variklį ─
import { useEffect, useRef, useState, useCallback } from 'react'
import {
  createGame2v2, beginTeamTurn, endTeamTurn, playCard, attack, canAfford,
  canUnitAttack, legalTargets, P, type GameState, type Side, type TutCard, type TargetRef, type BoardUnit,
} from '@/lib/tutorial/engine'
import { aiActFor } from '@/lib/team2v2/ai'
import type { Coop2v2 } from '@/lib/team2v2/load'
import { playUiClick, playCardPlace } from '@/lib/ui-sound'
import { playBattleSound } from '@/lib/game/soundManager'
import { startBattleMusic, startMenuMusic } from '@/lib/game/musicManager'

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

export function Team2v2Game({ coop, onExit }: { coop: Coop2v2; onExit: () => void }) {
  const gRef = useRef<GameState>(createGame2v2(coop.decks, 'A'))
  const [, force] = useState(0)
  const rerender = useCallback(() => force((v) => v + 1), [])
  const [phase, setPhase] = useState<'human' | 'ai'>('human')
  const [sel, setSel] = useState<string | null>(null) // pasirinktas tavo puolėjo uid
  const startedRef = useRef(false)

  useEffect(() => {
    if (startedRef.current) return
    startedRef.current = true
    beginTeamTurn(gRef.current)
    startBattleMusic()
    rerender()
    return () => { startMenuMusic() }
  }, [rerender])

  const g = gRef.current
  const you = P(g, 'you')
  const meta = coop.meta
  const seatName = (s: Side) => meta[s as keyof typeof meta]?.name?.replace(' (AI)', '') ?? s
  const seatAvatar = (s: Side) => meta[s as keyof typeof meta]?.avatar ?? '🎴'
  const myTurn = phase === 'human' && !g.winner && g.activeTeam === 'A'

  const runAi = async (seat: Side) => {
    let guard = 0
    while (!g.winner && guard++ < 40) {
      g.active = seat
      const did = aiActFor(g, seat)
      rerender()
      if (!did) break
      await sleep(520)
    }
  }

  const endTurn = async () => {
    if (!myTurn) return
    playUiClick(); setSel(null); setPhase('ai'); rerender()
    g.active = 'ally'; rerender(); await runAi('ally')
    if (!g.winner) { endTeamTurn(g); beginTeamTurn(g); rerender(); await sleep(400) }   // → komanda B
    if (!g.winner) await runAi('ai')
    if (!g.winner) { g.active = 'foe2'; rerender(); await runAi('foe2') }
    if (!g.winner) { endTeamTurn(g); beginTeamTurn(g); rerender() }                      // → komanda A
    if (g.winner) playBattleSound(g.winnerTeam === 'A' ? 'summon' : 'death', 0.5)
    setPhase('human'); rerender()
  }

  const onPlay = (c: TutCard) => {
    if (!myTurn || !canAfford(g, 'you', c)) { playUiClick(); return }
    g.active = 'you'
    const r = playCard(g, 'you', c.uid)  // efektai auto-parenka taikinius (komandiškai)
    if (r.ok) { playCardPlace(); if (g.winner) playBattleSound(g.winnerTeam === 'A' ? 'summon' : 'death', 0.5) }
    rerender()
  }
  const onMyUnit = (u: BoardUnit) => {
    if (!myTurn) return
    if (!canUnitAttack(g, 'you', u).ok) { playUiClick(); return }
    playUiClick(); setSel(sel === u.uid ? null : u.uid)
  }
  const onTarget = (t: TargetRef) => {
    if (!myTurn || !sel) return
    g.active = 'you'
    const r = attack(g, 'you', sel, t)
    if (r.ok) { playBattleSound('impact', 0.4); setSel(null); if (g.winner) playBattleSound(g.winnerTeam === 'A' ? 'summon' : 'death', 0.5) }
    rerender()
  }

  const legalSet = (() => {
    if (!sel) return new Set<string>()
    const u = you.units.find((x) => x?.uid === sel)
    if (!u) return new Set<string>()
    return new Set(legalTargets(g, 'you', u).map((t) => t.kind + ':' + ('uid' in t ? t.uid : t.side)))
  })()
  const tk = (t: { kind: string; side?: Side; uid?: string }) => t.kind + ':' + (t.uid ?? t.side)

  const unitChip = (u: BoardUnit, seat: Side, mine: boolean) => {
    const isFoe = seat === 'ai' || seat === 'foe2'
    const targetable = !!sel && isFoe && legalSet.has('unit:' + u.uid)
    const ready = mine && !g.winner && canUnitAttack(g, 'you', u).ok
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
    <div key={seat} className="flex items-center gap-1.5 px-1.5 py-1 rounded-lg" style={{ background: g.active === seat ? 'rgba(56,189,248,0.10)' : 'rgba(10,8,16,0.4)' }}>
      <span className="w-14 shrink-0 text-[10px] truncate" style={{ color: 'var(--text-muted)' }}>{seatAvatar(seat)} {seatName(seat)}</span>
      <div className="flex gap-1 flex-1 min-h-[58px] items-center overflow-x-auto">
        {P(g, seat).units.map((u, i) => u ? unitChip(u, seat, mine) : <span key={i} className="shrink-0 rounded-md" style={{ width: 44, height: 58, border: '1px dashed rgba(255,255,255,0.07)' }} />)}
      </div>
      <span className="shrink-0 text-[10px]" style={{ color: 'var(--gold)' }}>🪙{P(g, seat).gold}</span>
    </div>
  )

  const hpBar = (team: 'A' | 'B', accent: string, foeTeam: boolean) => {
    const t = g.teams![team]; const pct = (t.hp / t.maxHp) * 100
    const targetable = foeTeam && !!sel && legalSet.has('player:' + (team === 'B' ? 'ai' : 'you'))
    return (
      <button onClick={() => targetable && onTarget({ kind: 'player', side: team === 'B' ? 'ai' : 'you' })} disabled={!targetable}
        className="w-full flex items-center gap-2 px-2 py-1 rounded-lg" style={{ border: `1px solid rgba(${accent},0.5)`, background: 'rgba(10,8,16,0.7)', cursor: targetable ? 'crosshair' : 'default', boxShadow: targetable ? `0 0 9px rgba(${accent},0.6)` : undefined }}>
        <span className="text-xs">{team === 'A' ? '🟦' : '🟥'}</span>
        <div className="flex-1 h-2.5 rounded-full overflow-hidden" style={{ background: 'rgba(0,0,0,0.5)' }}><div className="h-full" style={{ width: `${pct}%`, background: `rgb(${accent})` }} /></div>
        <span className="text-xs font-bold tabular-nums" style={{ color: `rgb(${accent})`, fontFamily: 'var(--rvn-font-display)' }}>❤ {t.hp}/{t.maxHp}</span>
      </button>
    )
  }

  return (
    <div className="fixed inset-0 z-[150] flex flex-col" style={{ background: 'radial-gradient(120% 100% at 50% 0%, #15101f, #07050b)' }}>
      <div className="flex items-center justify-between px-3 py-2 shrink-0" style={{ borderBottom: '1px solid rgba(56,189,248,0.2)' }}>
        <span className="text-sm font-bold" style={{ color: '#7dd3fc', fontFamily: 'var(--rvn-font-display)' }}>🤝 2v2 · {myTurn ? 'TAVO komandos ėjimas' : phase === 'ai' ? 'Priešininkai/ally žaidžia…' : '…'}</span>
        <button onClick={() => { playUiClick(); onExit() }} className="text-xs px-3 py-1 rounded-lg" style={{ color: '#fca5a5', border: '1px solid rgba(239,68,68,0.4)' }}>Išeiti</button>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1.5 flex flex-col">
        {hpBar('B', '239,68,68', true)}
        {seatRow('ai', false)}
        {seatRow('foe2', false)}
        <div className="flex-1 min-h-[6px]" />
        {seatRow('ally', false)}
        {seatRow('you', true)}
        {hpBar('A', '56,189,248', false)}

        <div className="flex items-center justify-between px-1 pt-1">
          <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{g.log.length ? g.log[g.log.length - 1].msg : ''}</span>
          <button onClick={endTurn} disabled={!myTurn} className="px-3 py-1.5 rounded-lg text-xs font-bold disabled:opacity-40" style={{ background: 'rgba(56,189,248,0.2)', border: '1px solid rgba(56,189,248,0.55)', color: '#7dd3fc', fontFamily: 'var(--rvn-font-display)' }}>Baigti ėjimą</button>
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {you.hand.map((c) => {
            const afford = myTurn && canAfford(g, 'you', c)
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
          <div className="text-center px-6 py-8 rounded-2xl" style={{ background: 'rgba(10,8,16,0.97)', border: `1px solid ${g.winnerTeam === 'A' ? 'rgba(56,189,248,0.6)' : 'rgba(239,68,68,0.5)'}` }}>
            <p className="text-5xl mb-2">{g.winnerTeam === 'A' ? '🏆' : '💀'}</p>
            <p className="text-2xl font-bold mb-1" style={{ fontFamily: 'var(--rvn-font-display)', color: g.winnerTeam === 'A' ? '#7dd3fc' : '#f87171' }}>{g.winnerTeam === 'A' ? 'Komanda laimėjo!' : 'Komanda pralaimėjo'}</p>
            <p className="text-xs mb-5" style={{ color: 'var(--text-muted)' }}>2v2 co-op vs botai</p>
            <button onClick={() => { playUiClick(); onExit() }} className="px-6 py-2.5 rounded-xl text-sm font-bold" style={{ background: 'rgba(56,189,248,0.2)', border: '1px solid rgba(56,189,248,0.55)', color: '#7dd3fc', fontFamily: 'var(--rvn-font-display)' }}>Grįžti</button>
          </div>
        </div>
      )}
    </div>
  )
}
