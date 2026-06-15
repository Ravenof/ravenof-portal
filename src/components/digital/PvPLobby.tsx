'use client'

// ── PvP lobby — privatus kambarys (kodas) arba atsitiktinis varžovas ──────────
import { useCallback, useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import { createClient } from '@/lib/supabase/client'
import { playUiClick, playError } from '@/lib/ui-sound'
import type { PvPNet } from '@/components/tutorial/TutorialGame'

const TutorialGame = dynamic(() => import('@/components/tutorial/TutorialGame').then((m) => m.TutorialGame), { ssr: false })

type Match = {
  id: string
  code: string | null
  is_public: boolean
  status: string
  host_id: string
  host_deck_id: string
  host_name: string | null
  guest_id: string | null
  guest_deck_id: string | null
  guest_name: string | null
}

type Launch = { net: PvPNet; deckId: string; opponentDeckId: string | null; opponentName: string }

const randCode = () => Array.from({ length: 5 }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.floor(Math.random() * 32)]).join('')

export function PvPLobby({ deckId, deckName, onClose }: { deckId: string; deckName: string; onClose: () => void }) {
  const [tab, setTab] = useState<'private' | 'random'>('private')
  const [userId, setUserId] = useState<string | null>(null)
  const [userName, setUserName] = useState<string>('Žaidėjas')
  const [joinCode, setJoinCode] = useState('')
  const [room, setRoom] = useState<Match | null>(null)   // host'o sukurtas/laukiantis kambarys
  const [status, setStatus] = useState<string>('')
  const [busy, setBusy] = useState(false)
  const [launch, setLaunch] = useState<Launch | null>(null)
  const [resumeRec, setResumeRec] = useState<{ matchId: string; isHost: boolean; mySide: 'you' | 'ai'; opponentId: string | null; deckId: string; opponentDeckId: string | null; opponentName: string | null; deckName: string | null } | null>(null)
  const [decks, setDecks] = useState<{ id: string; name: string; faction: string | null }[]>([])
  const [deckSel, setDeckSel] = useState<string>(deckId)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      setUserId(user.id)
      const nm = (user.user_metadata?.username as string) || (user.user_metadata?.display_name as string) || (user.email?.split('@')[0]) || 'Žaidėjas'
      setUserName(nm)
      supabase.from('decks').select('id, name, faction:factions ( name )').eq('user_id', user.id).order('updated_at', { ascending: false })
        .then(({ data }) => {
          const rows = (data as unknown as { id: string; name: string; faction: { name: string } | null }[]) ?? []
          setDecks(rows.map((d) => ({ id: d.id, name: d.name, faction: d.faction?.name ?? null })))
        })
    })
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [])

  // PvP reconnect: ar yra išsaugota aktyvi partija (per pastarąsias ~15 min)?
  useEffect(() => {
    try {
      const raw = localStorage.getItem('rvn-pvp-active')
      if (!raw) return
      const r = JSON.parse(raw) as { matchId: string; isHost: boolean; mySide: 'you' | 'ai'; opponentId: string | null; deckId: string; opponentDeckId: string | null; opponentName: string | null; deckName: string | null; ts: number }
      if (r && r.matchId && Date.now() - (r.ts || 0) < 15 * 60 * 1000) setResumeRec(r)
      else localStorage.removeItem('rvn-pvp-active')
    } catch { /* */ }
  }, [])

  const doReconnect = () => {
    if (!resumeRec) return
    playUiClick()
    setLaunch({
      net: { isHost: resumeRec.isHost, mySide: resumeRec.mySide, matchId: resumeRec.matchId, opponentId: resumeRec.opponentId || undefined, resume: true },
      deckId: resumeRec.deckId, opponentDeckId: resumeRec.opponentDeckId, opponentName: resumeRec.opponentName || 'Varžovas',
    })
  }
  const dismissReconnect = () => {
    try { localStorage.removeItem('rvn-pvp-active') } catch { /* */ }
    setResumeRec(null)
  }

  const deckName2 = (launch && resumeRec ? resumeRec.deckName : null) ?? decks.find((d) => d.id === deckSel)?.name ?? deckName

  // Host laukia, kol prisijungs svečias (poll kas 2s)
  const waitForGuest = useCallback((matchId: string) => {
    const supabase = createClient()
    if (pollRef.current) clearInterval(pollRef.current)
    pollRef.current = setInterval(async () => {
      const { data } = await supabase.from('pvp_matches').select('*').eq('id', matchId).single()
      const m = data as Match | null
      if (m && m.guest_id && m.guest_deck_id) {
        if (pollRef.current) clearInterval(pollRef.current)
        setLaunch({ net: { isHost: true, mySide: 'you', matchId: m.id, opponentId: m.guest_id || undefined }, deckId: deckSel, opponentDeckId: m.guest_deck_id, opponentName: m.guest_name || 'Varžovas' })
      }
    }, 2000)
  }, [deckSel])

  const createPrivate = async () => {
    if (!userId) return
    playUiClick(); setBusy(true); setStatus('Kuriamas kambarys…')
    const supabase = createClient()
    const code = randCode()
    const { data, error } = await supabase.from('pvp_matches').insert({
      code, is_public: false, status: 'waiting', host_id: userId, host_deck_id: deckSel, host_name: userName,
    }).select('*').single()
    setBusy(false)
    if (error || !data) { playError(); setStatus('Klaida kuriant kambarį: ' + (error?.message ?? '')); return }
    const m = data as Match
    setRoom(m); setStatus('Laukiama varžovo… Pasidalink kodu.')
    waitForGuest(m.id)
  }

  const joinByCode = async () => {
    if (!userId || !joinCode.trim()) return
    playUiClick(); setBusy(true); setStatus('Jungiamasi…')
    const supabase = createClient()
    const code = joinCode.trim().toUpperCase()
    const { data: found } = await supabase.from('pvp_matches').select('*').eq('code', code).eq('status', 'waiting').is('guest_id', null).maybeSingle()
    const m = found as Match | null
    if (!m) { setBusy(false); playError(); setStatus('Kambarys nerastas arba jau užimtas.'); return }
    if (m.host_id === userId) { setBusy(false); playError(); setStatus('Negali jungtis į savo paties kambarį.'); return }
    const { error } = await supabase.from('pvp_matches').update({ guest_id: userId, guest_deck_id: deckSel, guest_name: userName, status: 'ready' }).eq('id', m.id).is('guest_id', null)
    setBusy(false)
    if (error) { playError(); setStatus('Nepavyko prisijungti: ' + error.message); return }
    setLaunch({ net: { isHost: false, mySide: 'ai', matchId: m.id, opponentId: m.host_id }, deckId: deckSel, opponentDeckId: null, opponentName: m.host_name || 'Varžovas' })
  }

  const findRandom = async () => {
    if (!userId) return
    playUiClick(); setBusy(true); setStatus('Ieškoma varžovo…')
    const supabase = createClient()
    // 1) bandom prisijungti prie laukiančio viešo kambario
    const { data: open } = await supabase.from('pvp_matches').select('*')
      .eq('is_public', true).eq('status', 'waiting').is('guest_id', null).neq('host_id', userId)
      .order('created_at', { ascending: true }).limit(1)
    const m = (open as Match[] | null)?.[0]
    if (m) {
      const { error } = await supabase.from('pvp_matches').update({ guest_id: userId, guest_deck_id: deckSel, guest_name: userName, status: 'ready' }).eq('id', m.id).is('guest_id', null)
      if (!error) { setBusy(false); setLaunch({ net: { isHost: false, mySide: 'ai', matchId: m.id, opponentId: m.host_id }, deckId: deckSel, opponentDeckId: null, opponentName: m.host_name || 'Varžovas' }); return }
    }
    // 2) niekas nelaukia – sukuriam viešą kambarį ir laukiam
    const { data, error } = await supabase.from('pvp_matches').insert({
      is_public: true, status: 'waiting', host_id: userId, host_deck_id: deckSel, host_name: userName,
    }).select('*').single()
    setBusy(false)
    if (error || !data) { playError(); setStatus('Klaida: ' + (error?.message ?? '')); return }
    const created = data as Match
    setRoom(created); setStatus('Laukiama atsitiktinio varžovo…')
    waitForGuest(created.id)
  }

  const cancel = async () => {
    if (pollRef.current) clearInterval(pollRef.current)
    if (room) { const supabase = createClient(); await supabase.from('pvp_matches').delete().eq('id', room.id) }
    setRoom(null); setStatus('')
  }

  if (launch) {
    return (
      <TutorialGame
        deckId={launch.deckId}
        deckName={deckName2}
        opponentDeckId={launch.opponentDeckId}
        opponentName={launch.opponentName}
        net={launch.net}
        onClose={() => { setLaunch(null); onClose() }}
      />
    )
  }

  const tabBtn = (k: 'private' | 'random', label: string) => (
    <button onClick={() => { setTab(k); setStatus('') }} className="flex-1 px-3 py-1.5 rounded-lg text-xs font-semibold"
      style={{ background: tab === k ? 'rgba(239,68,68,0.22)' : 'var(--bg-elevated)', border: '1px solid ' + (tab === k ? 'rgba(239,68,68,0.5)' : 'var(--bg-border)'), color: tab === k ? '#fca5a5' : 'var(--text-muted)' }}>
      {label}
    </button>
  )
  const inputStyle = { width: '100%', padding: '0.5rem 0.6rem', borderRadius: '0.5rem', fontSize: '1rem', letterSpacing: '0.2em', textAlign: 'center', textTransform: 'uppercase', background: 'var(--bg-elevated)', border: '1px solid var(--bg-border)', color: 'var(--text-primary)', outline: 'none' } as React.CSSProperties
  const actBtn = { background: 'rgba(239,68,68,0.22)', border: '1px solid rgba(239,68,68,0.5)', color: '#fca5a5', fontFamily: 'var(--rvn-font-display)' } as React.CSSProperties

  return (
    <div className="fixed inset-0 z-[140] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.78)' }} onClick={onClose}>
      <div className="rounded-2xl p-5 w-[min(440px,94vw)]" style={{ background: 'linear-gradient(145deg, #1a1325, #0d0a14)', border: '1px solid rgba(239,68,68,0.4)' }} onClick={(e) => e.stopPropagation()}>
        <p className="text-base font-bold mb-1" style={{ fontFamily: 'var(--rvn-font-display)', color: '#fca5a5' }}>⚔️ PvP arena</p>
        {resumeRec && !room && (
          <div className="mb-3 p-3 rounded-xl" style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.4)' }}>
            <p className="text-xs mb-2" style={{ color: '#86efac' }}>🔄 Turi nebaigtą partiją su „{resumeRec.opponentName || 'Varžovu'}". Grįžti gali, jei varžovas dar prisijungęs (30s).</p>
            <div className="flex gap-2">
              <button onClick={doReconnect} className="flex-1 px-3 py-2 rounded-lg text-sm font-bold" style={{ background: 'rgba(34,197,94,0.22)', border: '1px solid rgba(34,197,94,0.5)', color: '#86efac', fontFamily: 'var(--rvn-font-display)' }}>↩ Grįžti į žaidimą</button>
              <button onClick={dismissReconnect} className="px-3 py-2 rounded-lg text-xs" style={{ color: 'var(--text-muted)', border: '1px solid var(--bg-border)' }}>Atmesti</button>
            </div>
          </div>
        )}
        {!room && (
          <div className="mb-4">
            <label className="text-[11px] uppercase tracking-wide block mb-1" style={{ color: 'var(--text-muted)', fontFamily: 'var(--rvn-font-display)' }}>Tavo kaladė</label>
            {decks.length === 0 ? (
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Įkeliama…</p>
            ) : (
              <select value={deckSel} onChange={(e) => setDeckSel(e.target.value)}
                style={{ width: '100%', padding: '0.5rem 0.6rem', borderRadius: '0.5rem', fontSize: '0.85rem', background: 'var(--bg-elevated)', border: '1px solid var(--bg-border)', color: 'var(--text-primary)', outline: 'none' }}>
                {decks.map((d) => <option key={d.id} value={d.id}>{d.name}{d.faction ? ` (${d.faction})` : ''}</option>)}
              </select>
            )}
          </div>
        )}

        {room ? (
          <div className="text-center space-y-3">
            {room.code && (
              <>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Kambario kodas (duok varžovui):</p>
                <p className="text-3xl font-bold tracking-[0.3em]" style={{ color: 'var(--gold)', fontFamily: 'var(--rvn-font-display)' }}>{room.code}</p>
              </>
            )}
            <p className="text-sm flex items-center justify-center gap-2" style={{ color: 'var(--text-secondary)' }}>
              <span className="inline-block w-2 h-2 rounded-full animate-pulse" style={{ background: '#fca5a5' }} /> {status}
            </p>
            <button onClick={cancel} className="px-4 py-2 rounded-xl text-sm" style={{ color: 'var(--text-muted)', border: '1px solid var(--bg-border)' }}>Atšaukti</button>
          </div>
        ) : (
          <>
            <div className="flex gap-2 mb-4">{tabBtn('private', '🔒 Privatus kambarys')}{tabBtn('random', '🎲 Atsitiktinis')}</div>

            {tab === 'private' ? (
              <div className="space-y-4">
                <button disabled={busy} onClick={createPrivate} className="w-full px-4 py-2.5 rounded-xl text-sm font-bold disabled:opacity-40" style={actBtn}>
                  ➕ Sukurti kambarį (gauk kodą)
                </button>
                <div className="flex items-center gap-2"><div className="flex-1 h-px" style={{ background: 'var(--bg-border)' }} /><span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>ARBA</span><div className="flex-1 h-px" style={{ background: 'var(--bg-border)' }} /></div>
                <input value={joinCode} onChange={(e) => setJoinCode(e.target.value)} placeholder="KODAS" maxLength={5} style={inputStyle} />
                <button disabled={busy || !joinCode.trim()} onClick={joinByCode} className="w-full px-4 py-2.5 rounded-xl text-sm font-bold disabled:opacity-40" style={actBtn}>
                  🔑 Jungtis pagal kodą
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Sistema suporuos su kitu laukiančiu žaidėju arba sukurs kambarį ir lauks.</p>
                <button disabled={busy} onClick={findRandom} className="w-full px-4 py-2.5 rounded-xl text-sm font-bold disabled:opacity-40" style={actBtn}>
                  🎲 Ieškoti varžovo
                </button>
              </div>
            )}

            {status && <p className="text-xs mt-3 text-center" style={{ color: 'var(--text-secondary)' }}>{status}</p>}
            <button onClick={onClose} className="w-full mt-4 px-4 py-2 rounded-xl text-sm" style={{ color: 'var(--text-muted)', border: '1px solid var(--bg-border)' }}>Uždaryti</button>
          </>
        )}
      </div>
    </div>
  )
}
