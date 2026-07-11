'use client'

// ── Ravenof Digital — Draugiška kova (PvP): vieno ekrano landscape pasiruošimas ─
// 3 stulpeliai: Tavo kaladė (karuselė) · Priešininko tipas (atsitiktinis/draugas/kambario kodas) · Kovos santrauka.
// Match logika (findRandom/createPrivate/joinByCode/waitForGuest) čia inline; startas -> TutorialGame(net).
import { useCallback, useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { playUiClick, playError } from '@/lib/ui-sound'
import { ActiveDeckSummary } from '@/components/digital/ActiveDeckSelectorModal'
import { useActiveDeck, deckValidity, activeDeckOf } from '@/lib/digital/activeDeck'
import { friendsList, challengeCreate, type Friend } from '@/lib/social'
import type { PvPNet } from '@/components/tutorial/TutorialGame'

const TutorialGame = dynamic(() => import('@/components/tutorial/TutorialGame').then((m) => m.TutorialGame), { ssr: false })

type Deck = { id: string; name: string; faction: string | null; factionIcon: string | null; factionColor: string | null; missing: number }
type Match = { id: string; code: string | null; guest_id: string | null; guest_deck_id: string | null; guest_name: string | null; host_id: string; host_name: string | null }
type Launch = { net: PvPNet; deckId: string; opponentDeckId: string | null; opponentName: string }
type Mode = 'random' | 'friend' | 'code'
const A = '251,146,60'
const PANEL: React.CSSProperties = { background: 'linear-gradient(160deg, rgba(20,15,26,0.96), rgba(9,7,12,0.98))', border: '1px solid rgba(240,180,41,0.22)', boxShadow: 'inset 0 0 40px rgba(0,0,0,0.5)' }
const randCode = () => Array.from({ length: 5 }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.floor(Math.random() * 32)]).join('')

export function DigitalPvP() {
  const [decks, setDecks] = useState<Deck[] | null>(null)
  const [sel, setSel] = useState('')
  const [userId, setUserId] = useState<string | null>(null)
  const [userName, setUserName] = useState('Žaidėjas')
  const [friends, setFriends] = useState<Friend[]>([])
  const [mode, setMode] = useState<Mode>('random')
  const [selFriend, setSelFriend] = useState<string>('')  // Friend.userId
  const [joinCode, setJoinCode] = useState('')
  const [room, setRoom] = useState<Match | null>(null)
  const [status, setStatus] = useState('')
  const [busy, setBusy] = useState(false)
  const [launch, setLaunch] = useState<Launch | null>(null)
  const [toast, setToast] = useState('')
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { setDecks([]); return }
      setUserId(user.id)
      setUserName((user.user_metadata?.username as string) || (user.user_metadata?.display_name as string) || (user.email?.split('@')[0]) || 'Žaidėjas')
      friendsList().then((r) => setFriends(r.friends)).catch(() => {})
      const [{ data }, { data: colRows }, { data: prof }] = await Promise.all([
        supabase.from('decks').select('id, name, faction:factions ( name, icon_url, color_hex )').eq('user_id', user.id).not('name', 'ilike', '[Kampanija]%').order('updated_at', { ascending: false }),
        supabase.from('user_collections').select('card_id, quantity').eq('user_id', user.id),
        supabase.from('profiles').select('role').eq('id', user.id).maybeSingle(),
      ])
      const tester = ['tester', 'admin'].includes((prof as { role?: string } | null)?.role ?? '')
      const rows = (data as unknown as { id: string; name: string; faction: { name: string; icon_url: string | null; color_hex: string | null } | null }[]) ?? []
      const owned: Record<string, number> = Object.fromEntries(((colRows as { card_id: string; quantity: number }[]) ?? []).map((r) => [r.card_id, r.quantity]))
      const ids = rows.map((d) => d.id)
      const missingMap: Record<string, number> = {}
      if (ids.length) {
        const { data: dc } = await supabase.from('deck_cards').select('deck_id, card_id, quantity').in('deck_id', ids)
        for (const r of ((dc as { deck_id: string; card_id: string; quantity: number }[]) ?? [])) { const have = owned[r.card_id] ?? 0; if (have < r.quantity) missingMap[r.deck_id] = (missingMap[r.deck_id] ?? 0) + (r.quantity - have) }
      }
      const ds = rows.map((d) => ({ id: d.id, name: d.name, faction: d.faction?.name ?? null, factionIcon: d.faction?.icon_url ?? null, factionColor: d.faction?.color_hex ?? null, missing: tester ? 0 : (missingMap[d.id] ?? 0) }))
      setDecks(ds)
      const firstValid = ds.find((d) => d.missing === 0)
      if (firstValid) setSel(firstValid.id)
    })
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [])

  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(''), 1800); return () => clearTimeout(t) }, [toast])

  // Draugo iššūkis: ?join=CODE (draugas priėmė) → auto-prisijungia; ?host=CODE → sukuria kambarį tuo kodu.
  const autoRef = useRef(false)
  useEffect(() => {
    if (autoRef.current || !userId || !sel || typeof window === 'undefined') return
    const sp = new URLSearchParams(window.location.search)
    const j = sp.get('join'); const h = sp.get('host')
    if (j) { autoRef.current = true; setMode('code'); setJoinCode(j.toUpperCase()); void joinByCode(j) }
    else if (h) { autoRef.current = true; setMode('code'); void createPrivate(false, h.toUpperCase()).then((m) => { if (m) { setRoom(m); setStatus('Laukiama draugo. Pasidalink kodu.'); waitForGuest(m.id) } }) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, sel])

  const adState = useActiveDeck()
  const globalDeck = activeDeckOf(adState)
  const deck = (globalDeck && deckValidity(globalDeck).valid ? decks?.find((d) => d.id === globalDeck.id && d.missing === 0) : undefined) ?? decks?.find((d) => d.id === sel && d.missing === 0)
  const playable = (decks ?? []).filter((d) => d.missing === 0)

  const waitForGuest = useCallback((matchId: string) => {
    const supabase = createClient()
    if (pollRef.current) clearInterval(pollRef.current)
    pollRef.current = setInterval(async () => {
      const { data } = await supabase.from('pvp_matches').select('*').eq('id', matchId).single()
      const m = data as Match | null
      if (m && m.guest_id && m.guest_deck_id) {
        if (pollRef.current) clearInterval(pollRef.current)
        setLaunch({ net: { isHost: true, mySide: 'you', matchId: m.id, opponentId: m.guest_id || undefined }, deckId: sel, opponentDeckId: m.guest_deck_id, opponentName: m.guest_name || 'Varžovas' })
      }
    }, 2000)
  }, [sel])

  const createPrivate = async (isPublic: boolean, code: string | null): Promise<Match | null> => {
    if (!userId) return null
    setBusy(true)
    const supabase = createClient()
    const { data, error } = await supabase.from('pvp_matches').insert({ code, is_public: isPublic, status: 'waiting', host_id: userId, host_deck_id: sel, host_name: userName }).select('*').single()
    setBusy(false)
    if (error || !data) { playError(); setStatus('Klaida kuriant kambarį.'); return null }
    return data as Match
  }

  const findRandom = async () => {
    if (!userId) return
    playUiClick(); setBusy(true); setStatus('Ieškoma varžovo…')
    const supabase = createClient()
    const { data: open } = await supabase.from('pvp_matches').select('*').eq('is_public', true).eq('status', 'waiting').is('guest_id', null).neq('host_id', userId).order('created_at', { ascending: true }).limit(1)
    const m = (open as Match[] | null)?.[0]
    if (m) {
      const { error } = await supabase.from('pvp_matches').update({ guest_id: userId, guest_deck_id: sel, guest_name: userName, status: 'ready' }).eq('id', m.id).is('guest_id', null)
      if (!error) { setBusy(false); setLaunch({ net: { isHost: false, mySide: 'ai', matchId: m.id, opponentId: m.host_id }, deckId: sel, opponentDeckId: null, opponentName: m.host_name || 'Varžovas' }); return }
    }
    const created = await createPrivate(true, null)
    if (created) { setRoom(created); setStatus('Laukiama atsitiktinio varžovo…'); waitForGuest(created.id) }
  }

  const inviteFriend = async () => {
    if (!selFriend) return
    playUiClick()
    const code = randCode()
    const created = await createPrivate(false, code)
    if (!created) return
    const ok = await challengeCreate(selFriend, code)
    setRoom(created)
    setStatus(ok ? 'Kvietimas išsiųstas. Laukiama, kol draugas prisijungs…' : 'Kambarys sukurtas. Pasidalink kodu ' + code)
    waitForGuest(created.id)
  }

  const createRoom = async () => {
    playUiClick()
    const created = await createPrivate(false, randCode())
    if (created) { setRoom(created); setStatus('Laukiama draugo. Pasidalink kodu.'); waitForGuest(created.id) }
  }

  const joinByCode = async (codeArg?: string) => {
    const raw = (codeArg ?? joinCode).trim().toUpperCase()
    if (!userId || !raw) return
    playUiClick(); setBusy(true); setStatus('Jungiamasi…')
    const supabase = createClient()
    const { data: found } = await supabase.from('pvp_matches').select('*').eq('code', raw).eq('status', 'waiting').is('guest_id', null).maybeSingle()
    const m = found as Match | null
    if (!m) { setBusy(false); playError(); setStatus('Kambarys nerastas arba užimtas.'); return }
    if (m.host_id === userId) { setBusy(false); playError(); setStatus('Negali jungtis į savo kambarį.'); return }
    const { error } = await supabase.from('pvp_matches').update({ guest_id: userId, guest_deck_id: sel, guest_name: userName, status: 'ready' }).eq('id', m.id).is('guest_id', null)
    setBusy(false)
    if (error) { playError(); setStatus('Nepavyko prisijungti.'); return }
    setLaunch({ net: { isHost: false, mySide: 'ai', matchId: m.id, opponentId: m.host_id }, deckId: sel, opponentDeckId: null, opponentName: m.host_name || 'Varžovas' })
  }

  const cancelRoom = async () => {
    if (pollRef.current) clearInterval(pollRef.current)
    if (room) { const supabase = createClient(); await supabase.from('pvp_matches').delete().eq('id', room.id) }
    setRoom(null); setStatus('')
  }

  if (launch) {
    return <TutorialGame deckId={launch.deckId} deckName={deck?.name ?? 'Kaladė'} opponentDeckId={launch.opponentDeckId} opponentName={launch.opponentName} net={launch.net} onClose={() => { setLaunch(null); setRoom(null); setStatus('') }} />
  }

  // ── CTA būsena ──
  const cta: { label: string; disabled: boolean; action?: () => void } =
    !deck ? { label: 'PASIRINK TINKAMĄ KALADĘ', disabled: true }
    : room ? { label: 'LAUKIAMA VARŽOVO…', disabled: true }
    : mode === 'random' ? { label: 'IEŠKOTI VARŽOVO', disabled: busy, action: findRandom }
    : mode === 'friend' ? (!selFriend ? { label: 'PASIRINK DRAUGĄ', disabled: true } : { label: 'SIŲSTI KVIETIMĄ', disabled: busy, action: inviteFriend })
    : joinCode.trim() ? { label: 'PRISIJUNGTI', disabled: busy, action: joinByCode }
    : { label: 'SUKURTI KAMBARĮ', disabled: busy, action: createRoom }

  const oppSummary = mode === 'random' ? 'Atsitiktinis žaidėjas'
    : mode === 'friend' ? (selFriend ? (friends.find((f) => f.userId === selFriend)?.displayName || friends.find((f) => f.userId === selFriend)?.username || 'Draugas') + ' — pasirinktas' : '—')
    : (room?.code ? 'Kambarys ' + room.code : joinCode.trim() ? 'Kodas ' + joinCode.trim().toUpperCase() : '—')

  const modeCard = (m: Mode, icon: string, title: string) => (
    <button key={m} onClick={() => { playUiClick(); setMode(m) }} className="rvn-press flex-1 rounded-xl px-2 py-2 flex flex-col items-center gap-1 text-center"
      style={{ minHeight: 66, border: mode === m ? `1.5px solid rgba(${A},0.9)` : '1px solid rgba(255,255,255,0.08)', background: mode === m ? `linear-gradient(160deg, rgba(${A},0.16), rgba(10,8,16,0.9))` : 'rgba(10,8,16,0.6)', boxShadow: mode === m ? `0 0 12px rgba(${A},0.3)` : 'none' }}>
      <span style={{ fontSize: 20 }}>{icon}</span>
      <span className="rvn-disp font-bold uppercase" style={{ fontSize: 'clamp(9px,1.3vh,12px)', color: mode === m ? '#fdba74' : 'var(--text-secondary)' }}>{title}</span>
    </button>
  )

  if (decks === null) return <div className="h-full flex items-center justify-center"><span style={{ color: 'var(--text-muted)' }}>Kraunama…</span></div>
  if (decks.length === 0 || playable.length === 0) return (
    <div className="h-full flex flex-col items-center justify-center gap-3 text-center px-6">
      <p style={{ color: 'var(--text-muted)' }}>Neturi žaidžiamų kaladžių draugiškai kovai.</p>
      <Link href="/digital/decks?tab=builder" onClick={() => playUiClick()} className="px-5 py-2.5 rounded-xl text-sm font-bold" style={{ background: `rgba(${A},0.2)`, border: `1px solid rgba(${A},0.6)`, color: '#fdba74', fontFamily: 'var(--rvn-font-display)' }}>Sukurti kaladę</Link>
    </div>
  )

  return (
    <div className="h-full flex flex-col min-h-0" style={{ gap: 'clamp(4px,1vh,10px)' }}>
      {/* Antraštė */}
      <div className="text-center shrink-0">
        <div className="rvn-disp font-black uppercase leading-none" style={{ fontSize: 'clamp(18px,3.6vh,34px)', color: 'var(--gold)', letterSpacing: '0.04em' }}>Draugiška kova</div>
        <div className="mx-auto" style={{ fontSize: 'clamp(9px,1.3vh,12px)', color: 'var(--text-muted)', maxWidth: 560 }}>Kaukis be rango rizikos prieš atsitiktinį žaidėją arba draugą. Pakviesk iš draugų sąrašo arba naudok kambario kodą.</div>
      </div>

      {/* 3 stulpeliai */}
      {/* Aktyvi kaladė — kompaktiška santrauka (globali; keitimas per modalą) */}
      <div className="shrink-0"><ActiveDeckSummary accent="253,186,116" /></div>

      <div className="flex-1 min-h-0 grid gap-2" style={{ gridTemplateColumns: 'minmax(0,1.6fr) minmax(190px,1fr)' }}>


        {/* CENTRAS: Priešininko tipas */}
        <section className="rounded-2xl flex flex-col min-h-0 overflow-hidden p-2.5" style={PANEL}>
          <div className="rvn-disp font-extrabold uppercase tracking-wide mb-2 shrink-0 text-center" style={{ fontSize: 'clamp(10px,1.5vh,13px)', color: 'var(--gold)' }}>Priešininko tipas</div>
          <div className="flex gap-1.5 mb-2 shrink-0">
            {modeCard('random', '⚔', 'Atsitiktinis')}
            {modeCard('friend', '👥', 'Pakviesti draugą')}
            {modeCard('code', '🔑', 'Kambario kodas')}
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto">
            {room ? (
              <div className="flex flex-col items-center justify-center gap-2 h-full text-center">
                {room.code && <><span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Kambario kodas</span><span className="rvn-disp font-black tracking-[0.25em]" style={{ fontSize: 28, color: 'var(--gold)' }}>{room.code}</span>
                  <button onClick={() => { navigator.clipboard?.writeText(room.code!); setToast('Kodas nukopijuotas') }} className="px-3 py-1 rounded-lg text-xs" style={{ border: `1px solid rgba(${A},0.5)`, color: '#fdba74' }}>📋 Kopijuoti</button></>}
                <span className="flex items-center gap-2 mt-1" style={{ fontSize: 12, color: 'var(--text-secondary)' }}><span className="inline-block w-2 h-2 rounded-full animate-pulse" style={{ background: `rgb(${A})` }} />{status}</span>
                <button onClick={cancelRoom} className="mt-1 px-4 py-1.5 rounded-xl text-xs" style={{ color: 'var(--text-muted)', border: '1px solid rgba(255,255,255,0.12)' }}>Atšaukti</button>
              </div>
            ) : mode === 'random' ? (
              <div className="flex flex-col items-center justify-center gap-1.5 h-full text-center px-3">
                <span style={{ fontSize: 36 }}>⚔</span>
                <div className="rvn-disp font-bold" style={{ fontSize: 14, color: '#fdba74' }}>Greita draugiška kova</div>
                <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>Rangas nesikeičia · Pergalė: +100 aukso · numatomas laukimas &lt; 30 s.</p>
              </div>
            ) : mode === 'friend' ? (
              <div className="flex flex-col gap-1.5">
                <div className="rvn-disp uppercase shrink-0" style={{ fontSize: 10, color: 'var(--text-muted)' }}>Draugų sąrašas</div>
                {friends.length === 0 && <p style={{ fontSize: 11, color: 'var(--text-muted)' }} className="text-center py-3">Neturi draugų. Pridėk skiltyje „Draugai&quot;.</p>}
                {friends.map((f) => {
                  const s = f.userId === selFriend
                  return (
                    <button key={f.id} onClick={() => { playUiClick(); setSelFriend(f.userId) }} className="rvn-press flex items-center gap-2 rounded-lg px-2 py-1 text-left shrink-0"
                      style={{ border: s ? '1.5px solid rgba(34,197,94,0.7)' : '1px solid rgba(255,255,255,0.08)', background: s ? 'rgba(34,197,94,0.12)' : 'rgba(10,8,16,0.6)' }}>
                      <span className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center overflow-hidden" style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(240,180,41,0.3)' }}>
                        {f.avatar ? <img src={f.avatar} alt="" className="w-full h-full object-cover" /> : <span>🙂</span>}
                      </span>
                      <span className="min-w-0 flex-1 truncate rvn-disp font-bold" style={{ fontSize: 12, color: '#fff' }}>{f.displayName || f.username}</span>
                      {s ? <span style={{ color: '#86efac', fontSize: 14 }}>✓</span> : <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Pasirinkti</span>}
                    </button>
                  )
                })}
              </div>
            ) : (
              <div className="flex flex-col gap-2 h-full justify-center">
                <p className="text-center" style={{ fontSize: 11, color: 'var(--text-muted)' }}>Sukurk privatų kambarį (gausi kodą) arba įvesk draugo kodą.</p>
                <input value={joinCode} onChange={(e) => setJoinCode(e.target.value.toUpperCase())} maxLength={5} placeholder="ĮVESK KAMBARIO KODĄ…" className="outline-none text-center" style={{ minHeight: 42, borderRadius: 10, letterSpacing: '0.2em', background: 'rgba(10,8,16,0.85)', border: `1px solid rgba(${A},0.4)`, color: 'var(--text-primary)', fontSize: 15 }} />
              </div>
            )}
          </div>
        </section>

        {/* DEŠINĖ: Kovos santrauka */}
        <section className="rounded-2xl flex flex-col min-h-0 overflow-hidden p-3" style={PANEL}>
          <div className="rvn-disp font-extrabold uppercase tracking-wide mb-2 shrink-0" style={{ fontSize: 'clamp(10px,1.5vh,13px)', color: 'var(--gold)' }}>Kovos santrauka</div>
          <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-2" style={{ fontSize: 'clamp(10px,1.4vh,13px)' }}>
            {([['🃏', 'Tavo kaladė', deck?.name ?? '—', 'var(--gold)'], ['🛡', 'Režimas', 'Draugiška', '#86efac'], ['◆', 'Rangas', 'nesikeičia', 'var(--text-secondary)'], ['🪙', 'Atlygis', '+100 aukso', 'var(--gold)'], ['⚔', 'Priešininkas', oppSummary, '#fdba74']] as [string, string, string, string][]).map(([ic, l, v, c], i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="shrink-0 w-6 text-center" style={{ opacity: 0.8 }}>{ic}</span>
                <span className="shrink-0" style={{ color: 'var(--text-muted)', minWidth: 78 }}>{l}:</span>
                <span className="truncate font-semibold" style={{ color: c }}>{v}</span>
              </div>
            ))}
          </div>
          {/* CTA — panelės apačioje (kaip Ranked/Treniruotėje), visada matomas */}
          <div className="shrink-0 mt-2 flex flex-col gap-1.5">
            <button disabled={cta.disabled} onClick={cta.action} className="rvn-press w-full rounded-2xl font-black transition-all disabled:opacity-40 active:scale-[0.98] flex items-center justify-center gap-2"
              style={{ minHeight: 'clamp(44px,7.5vh,58px)', background: cta.disabled ? 'rgba(255,255,255,0.06)' : `linear-gradient(135deg, rgba(${A},0.95), rgba(240,180,41,0.9))`, color: cta.disabled ? 'var(--text-muted)' : '#1a0f04', fontFamily: 'var(--rvn-font-display)', letterSpacing: '0.04em', fontSize: 'clamp(12px,1.8vh,16px)', boxShadow: cta.disabled ? 'none' : `0 0 22px rgba(${A},0.45)` }}>
              ⚔ {cta.label}
            </button>
            {room && (
              <button onClick={() => { playUiClick(); cancelRoom() }} className="rvn-press w-full rounded-xl py-1.5" style={{ fontSize: 'clamp(10px,1.4vh,12px)', color: 'var(--text-muted)', border: '1px solid rgba(255,255,255,0.14)', fontFamily: 'var(--rvn-font-display)' }}>Atšaukti</button>
            )}
          </div>
        </section>
      </div>

      {room && (
        <div className="fixed inset-0 z-[190] flex items-center justify-center p-4" style={{ background: 'rgba(4,3,8,0.9)' }}>
          <div className="rounded-2xl p-6 text-center flex flex-col items-center gap-3" style={{ ...PANEL, width: 'min(420px,92vw)' }}>
            <div className="rounded-full animate-spin" style={{ width: 46, height: 46, border: `4px solid rgba(${A},0.25)`, borderTopColor: `rgb(${A})` }} />
            <div className="rvn-disp font-bold" style={{ fontSize: 17, color: '#fdba74' }}>{room.code ? 'Laukiama varžovo' : 'Ieškoma varžovo…'}</div>
            {room.code && (<><span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Kambario kodas</span>
              <span className="rvn-disp font-black tracking-[0.25em]" style={{ fontSize: 30, color: 'var(--gold)' }}>{room.code}</span>
              <button onClick={() => { navigator.clipboard?.writeText(room.code!); setToast('Kodas nukopijuotas') }} className="px-3 py-1 rounded-lg text-xs" style={{ border: `1px solid rgba(${A},0.5)`, color: '#fdba74' }}>📋 Kopijuoti kodą</button></>)}
            <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{status}</p>
            <button onClick={() => { playUiClick(); cancelRoom() }} className="px-6 py-2 rounded-xl text-sm mt-1" style={{ color: 'var(--text-muted)', border: '1px solid rgba(255,255,255,0.14)', fontFamily: 'var(--rvn-font-display)' }}>Atšaukti paiešką</button>
          </div>
        </div>
      )}

      {toast && <div className="fixed left-1/2 -translate-x-1/2 z-[200] px-4 py-2 rounded-full text-xs font-semibold" style={{ bottom: 'calc(92px + env(safe-area-inset-bottom,0px))', background: 'rgba(10,8,16,0.95)', border: '1px solid rgba(240,180,41,0.5)', color: 'var(--gold)' }}>{toast}</div>}
    </div>
  )
}
