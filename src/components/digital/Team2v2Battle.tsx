'use client'

// ── 2v2 realaus laiko kova (FAZĖ 2) — 4 lentos, 2 komandos, bendras HP ───────
import { useEffect, useRef, useState, useCallback } from 'react'
import {
  createT2State, tickEconomy, playUnit, attack, botStep, unitReady, canPlay,
  GOLD_CAP, type T2State, type T2Card, type T2Unit, type T2Seat,
} from '@/lib/team2v2/engine'
import type { SeatId, TeamId } from '@/lib/team2v2/types'
import type { CoopSetup } from '@/lib/team2v2/setup'
import { playUiClick, playCardPlace } from '@/lib/ui-sound'
import { playBattleSound } from '@/lib/game/soundManager'
import { startBattleMusic, startMenuMusic } from '@/lib/game/musicManager'
import { awardGold } from '@/lib/economy'

const BOT_INTERVAL: Record<string, number> = { easy: 2600, normal: 1900, hard: 1400 }

export function Team2v2Battle({ setup, cards, onExit }: { setup: CoopSetup; cards: Record<SeatId, T2Card[]>; onExit: () => void }) {
  const stateRef = useRef<T2State>(createT2State(
    [...setup.state.teams[0].seats, ...setup.state.teams[1].seats].map((s) => ({
      id: s.id, team: s.team, controller: s.controller, name: s.name, avatar: s.avatar,
      cards: cards[s.id] ?? [], botSlug: s.botSlug, difficulty: s.difficulty,
    })),
    0,
  ))
  const baseRef = useRef<number>(0)
  const botNextRef = useRef<Record<string, number>>({})
  const [, force] = useState(0)
  const rerender = useCallback(() => force((v) => v + 1), [])
  const [sel, setSel] = useState<string | null>(null) // pasirinktas puolėjo uid (p0)
  const [done, setDone] = useState(false)
  const rewardedRef = useRef(false)

  const tnow = () => performance.now() - baseRef.current

  useEffect(() => {
    baseRef.current = performance.now()
    const s = stateRef.current
    s.startedAt = 0
    for (const id of s.order) { s.seats[id].lastIncomeAt = 0; s.seats[id].lastDrawAt = 0; botNextRef.current[id] = 1500 + Math.random() * 800 }
    startBattleMusic()
    const iv = setInterval(() => {
      const st = stateRef.current
      if (st.winner) return
      const now = tnow()
      tickEconomy(st, now)
      for (const id of st.order) {
        const seat = st.seats[id]
        if (seat.controller !== 'ai') continue
        if (now >= (botNextRef.current[id] ?? 0)) {
          botStep(st, id as SeatId, now)
          const gap = BOT_INTERVAL[seat.difficulty ?? 'normal'] ?? 1900
          botNextRef.current[id] = now + gap * (0.7 + Math.random() * 0.6)
        }
      }
      if (st.winner && !done) {
        setDone(true); playBattleSound(st.winner === 'A' ? 'summon' : 'death', 0.5)
        if (st.winner === 'A' && !rewardedRef.current) { rewardedRef.current = true; awardGold('pvp_unranked', 100) }
      }
      rerender()
    }, 160)
    return () => { clearInterval(iv); startMenuMusic() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const s = stateRef.current
  const seatsByTeam = (t: TeamId): T2Seat[] => s.order.map((id) => s.seats[id]).filter((x) => x.team === t)
  const you = s.seats.p0
  const now = tnow()

  const onPlay = (c: T2Card) => {
    if (s.winner || !canPlay(you, c)) { playUiClick(); return }
    if (playUnit(s, 'p0', c.uid, tnow())) { playCardPlace(); rerender() }
  }
  const onMyUnit = (u: T2Unit) => {
    if (s.winner) return
    if (!unitReady(u, tnow())) { playUiClick(); return }
    playUiClick(); setSel(sel === u.uid ? null : u.uid)
  }
  const tryAttack = (target: { kind: 'unit'; seatId: SeatId; uid: string } | { kind: 'face'; team: TeamId }) => {
    if (!sel || s.winner) return
    if (attack(s, 'p0', sel, target, tnow())) { playBattleSound('impact', 0.4); setSel(null); rerender() }
  }

  const teamHpBar = (t: TeamId, accent: string) => {
    const team = s.teams[t]; const pct = (team.hp / team.maxHp) * 100
    const isFoe = t !== you.team
    return (
      <button onClick={() => isFoe && tryAttack({ kind: 'face', team: t })} disabled={!isFoe || !sel}
        className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all"
        style={{ background: 'rgba(10,8,16,0.7)', border: `1px solid rgba(${accent},0.5)`, cursor: isFoe && sel ? 'crosshair' : 'default', boxShadow: isFoe && sel ? `0 0 10px rgba(${accent},0.6)` : undefined }}>
        <span className="text-sm">{t === 'A' ? '🟦' : '🟥'}</span>
        <div className="flex-1 h-3 rounded-full overflow-hidden" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: `linear-gradient(90deg, rgb(${accent}), #fff4)` }} />
        </div>
        <span className="text-xs font-bold tabular-nums" style={{ color: `rgb(${accent})`, fontFamily: 'var(--rvn-font-display)' }}>❤ {team.hp}/{team.maxHp}</span>
      </button>
    )
  }

  const unitChip = (u: T2Unit, opts: { mine?: boolean; foe?: boolean; seatId: SeatId }) => {
    const ready = opts.mine && unitReady(u, now)
    const selected = sel === u.uid
    return (
      <button key={u.uid}
        onClick={() => opts.mine ? onMyUnit(u) : opts.foe ? tryAttack({ kind: 'unit', seatId: opts.seatId, uid: u.uid }) : undefined}
        disabled={(!opts.mine && !(opts.foe && sel)) || s.winner != null}
        className="relative shrink-0 rounded-md overflow-hidden transition-all"
        style={{
          width: 46, height: 60, border: '1.5px solid ' + (selected ? '#fcd34d' : u.card.rarityColor + '99'),
          boxShadow: selected ? '0 0 10px #fcd34d' : opts.foe && sel ? '0 0 8px rgba(239,68,68,0.6)' : undefined,
          opacity: opts.mine && !ready ? 0.5 : 1, cursor: opts.foe && sel ? 'crosshair' : opts.mine ? 'pointer' : 'default',
          background: u.card.image ? undefined : u.card.factionColor + '22',
        }}>
        {u.card.image && /* eslint-disable-next-line @next/next/no-img-element */ <img src={u.card.image} alt="" className="absolute inset-0 w-full h-full object-cover" draggable={false} />}
        <span className="absolute top-0 left-0 px-1 text-[10px] font-bold rounded-br" style={{ background: 'rgba(0,0,0,0.85)', color: '#f87171' }}>{u.atk}</span>
        <span className="absolute bottom-0 right-0 px-1 text-[10px] font-bold rounded-tl" style={{ background: 'rgba(0,0,0,0.85)', color: '#4ade80' }}>{u.hp}</span>
        {opts.mine && !ready && <span className="absolute inset-0 flex items-center justify-center text-[9px]" style={{ background: 'rgba(0,0,0,0.4)', color: '#fff' }}>⏳</span>}
      </button>
    )
  }

  const seatRow = (seat: T2Seat, kind: 'mine' | 'ally' | 'foe') => (
    <div key={seat.id} className="flex items-center gap-1.5 px-2 py-1 rounded-lg" style={{ background: 'rgba(10,8,16,0.4)' }}>
      <span className="w-16 shrink-0 text-[10px] truncate" style={{ color: 'var(--text-muted)' }}>{seat.avatar} {seat.name.replace(' (AI)', '')}{seat.controller === 'ai' ? ' 🤖' : ''}</span>
      {seat.lastZmk && now - seat.lastZmk.at < 900 && (
        <span className="shrink-0 text-[10px] font-bold px-1 rounded animate-pulse" style={{ background: 'rgba(0,0,0,0.85)', color: seat.lastZmk.v.startsWith('-') || seat.lastZmk.v === 'x0' ? '#f87171' : '#4ade80' }} title="ŽMK">⚄ {seat.lastZmk.v}→{seat.lastZmk.dmg}</span>
      )}
      <div className="flex gap-1 flex-1 min-h-[60px] items-center overflow-x-auto">
        {seat.units.map((u, i) => u ? unitChip(u, { mine: kind === 'mine', foe: kind === 'foe', seatId: seat.id }) : <span key={i} className="shrink-0 rounded-md" style={{ width: 46, height: 60, border: '1px dashed rgba(255,255,255,0.08)' }} />)}
      </div>
    </div>
  )

  const winner = s.winner

  return (
    <div className="fixed inset-0 z-[150] flex flex-col" style={{ background: 'radial-gradient(120% 100% at 50% 0%, #15101f, #07050b)' }}>
      <div className="flex items-center justify-between px-3 py-2 shrink-0" style={{ borderBottom: '1px solid rgba(56,189,248,0.2)' }}>
        <span className="text-sm font-bold" style={{ color: '#7dd3fc', fontFamily: 'var(--rvn-font-display)' }}>🤝 CO-OP 2v2</span>
        <button onClick={() => { playUiClick(); onExit() }} className="text-xs px-3 py-1 rounded-lg" style={{ color: '#fca5a5', border: '1px solid rgba(239,68,68,0.4)' }}>Išeiti</button>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-2 flex flex-col">
        {/* Priešininkų komanda (viršuj) */}
        {teamHpBar('B', '239,68,68')}
        {seatsByTeam('B').map((seat) => seatRow(seat, 'foe'))}

        <div className="flex-1 min-h-[8px]" />

        {/* Tavo komanda */}
        {seatsByTeam('A').map((seat) => seatRow(seat, seat.id === 'p0' ? 'mine' : 'ally'))}
        {teamHpBar('A', '56,189,248')}

        {/* Tavo auksas + ranka */}
        {s.log.length > 0 && (
          <p className="text-[10px] text-center truncate px-2" style={{ color: 'var(--text-muted)' }}>{s.log[s.log.length - 1].msg}</p>
        )}
        <div className="flex items-center justify-between px-1 pt-1">
          <span className="text-xs font-bold" style={{ color: 'var(--gold)' }}>🪙 {you.gold}{you.gold >= GOLD_CAP ? ' (max)' : ''}</span>
          {sel && <span className="text-[10px]" style={{ color: '#fcd34d' }}>Pasirink taikinį (priešo kūrinį ar komandą)</span>}
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {you.hand.map((c) => {
            const afford = canPlay(you, c)
            return (
              <button key={c.uid} onClick={() => onPlay(c)} disabled={s.winner != null}
                className="relative shrink-0 rounded-md overflow-hidden transition-transform active:scale-95"
                style={{ width: 52, height: 70, border: '1.5px solid ' + c.rarityColor + '99', opacity: afford ? 1 : 0.45, background: c.image ? undefined : c.factionColor + '22' }}>
                {c.image && /* eslint-disable-next-line @next/next/no-img-element */ <img src={c.image} alt="" className="absolute inset-0 w-full h-full object-cover" draggable={false} />}
                <span className="absolute top-0 left-0 px-1 text-[10px] font-bold rounded-br" style={{ background: 'rgba(0,0,0,0.85)', color: afford ? 'var(--gold)' : '#f87171' }}>{c.gold}</span>
                <span className="absolute bottom-0 left-0 px-1 text-[10px] font-bold rounded-tr" style={{ background: 'rgba(0,0,0,0.85)', color: '#f87171' }}>{c.atk}</span>
                <span className="absolute bottom-0 right-0 px-1 text-[10px] font-bold rounded-tl" style={{ background: 'rgba(0,0,0,0.85)', color: '#4ade80' }}>{c.hp}</span>
              </button>
            )
          })}
        </div>
      </div>

      {winner && (
        <div className="absolute inset-0 z-[160] flex items-center justify-center" style={{ background: 'rgba(4,3,8,0.92)' }}>
          <div className="text-center px-6 py-8 rounded-2xl" style={{ background: 'rgba(10,8,16,0.97)', border: `1px solid ${winner === you.team ? 'rgba(56,189,248,0.6)' : 'rgba(239,68,68,0.5)'}` }}>
            <p className="text-5xl mb-2">{winner === you.team ? '🏆' : '💀'}</p>
            <p className="text-2xl font-bold mb-1" style={{ fontFamily: 'var(--rvn-font-display)', color: winner === you.team ? '#7dd3fc' : '#f87171' }}>{winner === you.team ? 'Komanda laimėjo!' : 'Komanda pralaimėjo'}</p>
            <p className="text-xs mb-5" style={{ color: 'var(--text-muted)' }}>2v2 co-op vs botai{winner === you.team ? ' · +100 🪙' : ''}</p>
            <button onClick={() => { playUiClick(); onExit() }} className="px-6 py-2.5 rounded-xl text-sm font-bold" style={{ background: 'rgba(56,189,248,0.2)', border: '1px solid rgba(56,189,248,0.55)', color: '#7dd3fc', fontFamily: 'var(--rvn-font-display)' }}>Grįžti</button>
          </div>
        </div>
      )}
    </div>
  )
}
