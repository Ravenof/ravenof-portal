'use client'

// ── Ravenof Digital — 2v2 PvP (4 tikri žaidėjai) lobi + laukimo kambarys ───────
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { playUiClick } from '@/lib/ui-sound'
import {
  createRoom2v2, quickRoom2v2, joinCode2v2, leaveRoom2v2, fetchRoom2v2,
  loadDeckForSeat, seatOf, seatMetaFromRoom, roomFull, SLOTS, SLOT_SEAT,
  type Pvp2v2Room, type Pvp2v2Net,
} from '@/lib/team2v2/pvp'
import { Team2v2Game } from './Team2v2Game'
import type { Side } from '@/lib/tutorial/engine'

const oct = (b: number) => `polygon(${b}px 0, calc(100% - ${b}px) 0, 100% ${b}px, 100% calc(100% - ${b}px), calc(100% - ${b}px) 100%, ${b}px 100%, 0 calc(100% - ${b}px), 0 ${b}px)`
const A = '168,85,247'
type Deck = { id: string; name: string; faction: string | null }

export function DigitalPvp2v2() {
  const [uid, setUid] = useState<string | null>(null)
  const [name, setName] = useState('Tu')
  const [decks, setDecks] = useState<Deck[] | null>(null)
  const [sel, setSel] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [code, setCode] = useState('')
  const [room, setRoom] = useState<Pvp2v2Room | null>(null)
  const [net, setNet] = useState<{ net: Pvp2v2Net; meta: Record<Side, ReturnType<typeof seatMetaFromRoom>['you']> } | null>(null)
  const launchingRef = useRef(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { setDecks([]); return }
      setUid(user.id)
      setName((user.user_metadata?.display_name as string) || (user.user_metadata?.username as string) || (user.email?.split('@')[0]) || 'Tu')
      supabase.from('decks').select('id, name, faction:factions ( name )').eq('user_id', user.id).order('updated_at', { ascending: false })
        .then(({ data }) => {
          const rows = (data as unknown as { id: string; name: string; faction: { name: string } | null }[]) ?? []
          const ds = rows.map((d) => ({ id: d.id, name: d.name, faction: d.faction?.name ?? null }))
          setDecks(ds); if (ds.length) setSel(ds[0].id)
        })
    })
  }, [])

  // ── laukimo kambario apklausa ─────────────────────────────────────────────────
  useEffect(() => {
    if (!room || net) return
    const iv = setInterval(async () => {
      const r = await fetchRoom2v2(room.id)
      if (r) setRoom(r)
    }, 2000)
    return () => clearInterval(iv)
  }, [room?.id, net]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── kai pilnas — paleisti kovą ─────────────────────────────────────────────────
  useEffect(() => {
    if (!room || !uid || net || launchingRef.current) return
    if (room.status === 'abandoned') { setErr('Kambarys uždarytas (host išėjo).'); setRoom(null); return }
    if (!roomFull(room)) return
    const mySeat = seatOf(room, uid)
    if (!mySeat) { setErr('Tavęs nėra kambaryje.'); setRoom(null); return }
    launchingRef.current = true
    ;(async () => {
      const deck = await loadDeckForSeat(sel, mySeat)
      if (!deck) { setErr('Nepavyko užkrauti tavo kaladės (per mažai kortų?).'); launchingRef.current = false; return }
      setNet({ net: { roomId: room.id, mySeat, isHost: room.host_id === uid, myDeck: deck }, meta: seatMetaFromRoom(room) as never })
    })()
  }, [room, uid, net, sel]) // eslint-disable-line react-hooks/exhaustive-deps

  const guard = async (fn: () => Promise<Pvp2v2Room>) => {
    if (!sel) return
    playUiClick(); setBusy(true); setErr(null)
    try { setRoom(await fn()) }
    catch (e) { setErr(e instanceof Error ? e.message : 'Klaida') }
    finally { setBusy(false) }
  }

  const exitGame = async () => {
    if (room) { try { await leaveRoom2v2(room.id) } catch { /* */ } }
    setNet(null); setRoom(null); launchingRef.current = false
  }

  if (net) return <Team2v2Game net={net.net} meta={net.meta as never} onExit={exitGame} />

  // ── laukimo kambarys ────────────────────────────────────────────────────────
  if (room) {
    const slotCell = (slot: typeof SLOTS[number]) => {
      const id = room[`${slot}_id` as keyof Pvp2v2Room] as string | null
      const nm = room[`${slot}_name` as keyof Pvp2v2Room] as string | null
      const mine = id === uid
      const teamA = slot === 'a1' || slot === 'a2'
      const acc = teamA ? '56,189,248' : '239,68,68'
      return (
        <div key={slot} className="px-3 py-2.5 rounded-lg flex items-center gap-2" style={{ border: `1px solid rgba(${acc},${id ? 0.55 : 0.2})`, background: mine ? `rgba(${acc},0.14)` : 'rgba(10,8,16,0.6)' }}>
          <span className="text-lg">{slot === 'a1' ? '👑' : id ? '🎮' : '⌛'}</span>
          <span className="text-xs flex-1 truncate" style={{ color: id ? 'var(--text-primary)' : 'var(--text-muted)' }}>{nm ?? 'Laukiama žaidėjo…'}{mine ? ' (tu)' : ''}</span>
          <span className="text-[10px]" style={{ color: `rgb(${acc})`, fontFamily: 'var(--rvn-font-display)' }}>{SLOT_SEAT[slot].toUpperCase()}</span>
        </div>
      )
    }
    const filled = SLOTS.filter((s) => room[`${s}_id` as keyof Pvp2v2Room]).length
    return (
      <div className="max-w-md mx-auto space-y-4">
        <div className="text-center">
          <h1 className="text-xl font-bold" style={{ fontFamily: 'var(--rvn-font-display)', color: '#f3ead3' }}>🤝 2v2 KAMBARYS</h1>
          {room.code && <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Kodas: <span className="font-bold tracking-widest" style={{ color: `rgb(${A})` }}>{room.code}</span></p>}
          <p className="text-[11px] mt-1" style={{ color: 'var(--text-muted)' }}>{filled}/4 žaidėjai · {room.is_public ? 'vieša eilė' : 'privatus'}</p>
        </div>
        <div className="space-y-1.5">
          <p className="text-[10px] font-semibold" style={{ color: '#7dd3fc', fontFamily: 'var(--rvn-font-display)', letterSpacing: '0.1em' }}>🟦 KOMANDA A</p>
          {slotCell('a1')}{slotCell('a2')}
          <p className="text-[10px] font-semibold pt-1" style={{ color: '#f87171', fontFamily: 'var(--rvn-font-display)', letterSpacing: '0.1em' }}>🟥 KOMANDA B</p>
          {slotCell('b1')}{slotCell('b2')}
        </div>
        <p className="text-center text-xs animate-pulse" style={{ color: 'var(--text-muted)' }}>{roomFull(room) ? 'Pradedama…' : 'Laukiama, kol prisijungs visi 4…'}</p>
        <button onClick={() => { playUiClick(); exitGame() }} className="block w-full px-4 py-2.5 rounded-xl text-sm font-bold" style={{ border: '1px solid rgba(239,68,68,0.4)', color: '#fca5a5' }}>Išeiti</button>
        {err && <p className="text-center text-xs" style={{ color: '#f87171' }}>{err}</p>}
      </div>
    )
  }

  // ── lobi ──────────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-md mx-auto space-y-5">
      <div className="relative" style={{ clipPath: oct(15), background: `rgba(${A},0.5)`, padding: 2.5 }}>
        <div className="px-5 py-6 text-center" style={{ clipPath: oct(14), background: `radial-gradient(120% 90% at 50% 0%, rgba(${A},0.16), rgba(10,8,16,0.97) 60%), linear-gradient(160deg,#15101f,#0a0810)` }}>
          <span className="text-5xl" style={{ filter: `drop-shadow(0 0 12px rgba(${A},0.55))` }}>🤝</span>
          <h1 className="text-xl font-bold mt-1" style={{ fontFamily: 'var(--rvn-font-display)', color: '#f3ead3', letterSpacing: '0.08em' }}>2v2 PvP (4 žaidėjai)</h1>
          <p className="text-[11px] mt-1" style={{ color: 'var(--text-muted)' }}>2 prieš 2 — tu su komandos draugu prieš kitą porą. Ėjimais, komandos ėjimas, bendras 60 HP, draugiški efektai visai komandai.</p>
        </div>
      </div>

      {decks === null ? (
        <p className="text-center text-sm" style={{ color: 'var(--text-muted)' }}>Kraunama…</p>
      ) : decks.length === 0 ? (
        <div className="text-center">
          <p className="text-sm mb-3" style={{ color: 'var(--text-muted)' }}>Neturi kaladžių.</p>
          <Link href="/digital/deck" onClick={() => playUiClick()} className="inline-block px-5 py-2.5 rounded-xl text-sm font-bold" style={{ background: `rgba(${A},0.2)`, border: `1px solid rgba(${A},0.6)`, color: '#d8b4fe', fontFamily: 'var(--rvn-font-display)' }}>Sukurti kaladę</Link>
        </div>
      ) : (
        <>
          <div className="relative" style={{ clipPath: oct(12), background: `rgba(${A},0.4)`, padding: 2 }}>
            <div className="px-4 py-3" style={{ clipPath: oct(11), background: 'linear-gradient(160deg,#15101f,#0a0810)' }}>
              <label className="text-[10px] font-semibold block mb-1.5 text-center" style={{ color: '#d8b4fe', fontFamily: 'var(--rvn-font-display)', letterSpacing: '0.1em' }}>⚔ TAVO KALADĖ</label>
              <select value={sel} onChange={(e) => setSel(e.target.value)} style={{ width: '100%', padding: '0.45rem 0.6rem', borderRadius: '0.4rem', fontSize: '0.85rem', background: 'var(--bg-elevated)', border: '1px solid var(--bg-border)', color: 'var(--text-primary)', outline: 'none', textAlign: 'center' }}>
                {decks.map((d) => <option key={d.id} value={d.id}>{d.name}{d.faction ? ` (${d.faction})` : ''}</option>)}
              </select>
            </div>
          </div>

          <button onClick={() => guard(() => quickRoom2v2(sel))} disabled={!sel || busy}
            className="block w-full px-4 py-3 rounded-xl text-base font-bold transition-transform hover:scale-[1.02] active:scale-95 disabled:opacity-40"
            style={{ background: `rgba(${A},0.2)`, border: `1px solid rgba(${A},0.6)`, color: '#d8b4fe', fontFamily: 'var(--rvn-font-display)', letterSpacing: '0.06em' }}>
            {busy ? 'Kraunama…' : '🎲 GREITA PAIEŠKA'}
          </button>
          <button onClick={() => guard(() => createRoom2v2(sel, false))} disabled={!sel || busy}
            className="block w-full px-4 py-2.5 rounded-xl text-sm font-bold active:scale-95 disabled:opacity-40"
            style={{ border: `1px solid rgba(${A},0.45)`, color: '#d8b4fe', fontFamily: 'var(--rvn-font-display)' }}>
            ➕ Sukurti privatų kambarį
          </button>
          <div className="flex gap-2">
            <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="KODAS" maxLength={5}
              style={{ flex: 1, padding: '0.55rem 0.6rem', borderRadius: '0.6rem', fontSize: '0.9rem', textAlign: 'center', letterSpacing: '0.2em', background: 'var(--bg-elevated)', border: '1px solid var(--bg-border)', color: 'var(--text-primary)', outline: 'none' }} />
            <button onClick={() => guard(() => joinCode2v2(code, sel))} disabled={!sel || !code || busy}
              className="px-4 py-2 rounded-xl text-sm font-bold active:scale-95 disabled:opacity-40"
              style={{ background: `rgba(${A},0.18)`, border: `1px solid rgba(${A},0.5)`, color: '#d8b4fe', fontFamily: 'var(--rvn-font-display)' }}>
              Prisijungti
            </button>
          </div>
          {err && <p className="text-center text-xs" style={{ color: '#f87171' }}>{err}</p>}
          <p className="text-center text-[10px]" style={{ color: 'var(--text-muted)' }}>Pirma versija: efektų taikinius auto parenka variklis; čempionų rankinis žaidimas dar ribotas. Reikia 4 žaidėjų.</p>
        </>
      )}
    </div>
  )
}
