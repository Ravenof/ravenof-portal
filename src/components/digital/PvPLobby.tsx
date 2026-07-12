'use client'

// ── PvP lobby — privatus kambarys (kodas) arba atsitiktinis varžovas ──────────
import { useCallback, useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import { createClient } from '@/lib/supabase/client'
import { playUiClick, playError } from '@/lib/ui-sound'
import { DigitalPicker } from './DigitalPicker'
import type { PvPNet } from '@/components/tutorial/TutorialGame'
import { useT } from '@/lib/i18n/react'

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

const ACC = '251,146,60' // oranžinis (PVP — LAISVA akcentas)

export function PvPLobby({ deckId, deckName, onClose, presetHost, presetJoin }: { deckId: string; deckName: string; onClose: () => void; presetHost?: string | null; presetJoin?: string | null }) {
  const t = useT()
  const [tab, setTab] = useState<'private' | 'random'>('private')
  const [userId, setUserId] = useState<string | null>(null)
  const [userName, setUserName] = useState<string>(t('battle.player'))
  const [joinCode, setJoinCode] = useState('')
  const [room, setRoom] = useState<Match | null>(null)   // host'o sukurtas/laukiantis kambarys
  const [status, setStatus] = useState<string>('')
  const [busy, setBusy] = useState(false)
  const [launch, setLaunch] = useState<Launch | null>(null)
  const [resumeRec, setResumeRec] = useState<{ matchId: string; isHost: boolean; mySide: 'you' | 'ai'; opponentId: string | null; deckId: string; opponentDeckId: string | null; opponentName: string | null; deckName: string | null } | null>(null)
  const [decks, setDecks] = useState<{ id: string; name: string; faction: string | null; factionIcon: string | null; factionColor: string | null }[]>([])
  const [deckSel, setDeckSel] = useState<string>(deckId)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      setUserId(user.id)
      const nm = (user.user_metadata?.username as string) || (user.user_metadata?.display_name as string) || (user.email?.split('@')[0]) || t('battle.player')
      setUserName(nm)
      supabase.from('decks').select('id, name, faction:factions ( name, icon_url, color_hex )').eq('user_id', user.id).not('name', 'ilike', '[Kampanija]%').order('updated_at', { ascending: false })
        .then(({ data }) => {
          const rows = (data as unknown as { id: string; name: string; faction: { name: string; icon_url: string | null; color_hex: string | null } | null }[]) ?? []
          setDecks(rows.map((d) => ({ id: d.id, name: d.name, faction: d.faction?.name ?? null, factionIcon: d.faction?.icon_url ?? null, factionColor: d.faction?.color_hex ?? null })))
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

  // Iššūkio auto-veiksmas: ?host=CODE → sukuria kambarį tuo kodu; ?join=CODE → prisijungia.
  const autoRef = useRef(false)
  useEffect(() => {
    if (autoRef.current || !userId) return
    if (presetHost) { autoRef.current = true; setTab('private'); createPrivate(presetHost) }
    else if (presetJoin) { autoRef.current = true; setTab('private'); setJoinCode(presetJoin); joinByCode(presetJoin) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, presetHost, presetJoin])

  const doReconnect = () => {
    if (!resumeRec) return
    playUiClick()
    setLaunch({
      net: { isHost: resumeRec.isHost, mySide: resumeRec.mySide, matchId: resumeRec.matchId, opponentId: resumeRec.opponentId || undefined, resume: true },
      deckId: resumeRec.deckId, opponentDeckId: resumeRec.opponentDeckId, opponentName: resumeRec.opponentName || t('battle.opponentFallback'),
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
        setLaunch({ net: { isHost: true, mySide: 'you', matchId: m.id, opponentId: m.guest_id || undefined }, deckId: deckSel, opponentDeckId: m.guest_deck_id, opponentName: m.guest_name || t('battle.opponentFallback') })
      }
    }, 2000)
  }, [deckSel])

  const createPrivate = async (presetCode?: string) => {
    if (!userId) return
    playUiClick(); setBusy(true); setStatus(t('battle.lobby.creatingRoom'))
    const supabase = createClient()
    const code = presetCode || randCode()
    const { data, error } = await supabase.from('pvp_matches').insert({
      code, is_public: false, status: 'waiting', host_id: userId, host_deck_id: deckSel, host_name: userName,
    }).select('*').single()
    setBusy(false)
    if (error || !data) { playError(); setStatus(t('battle.lobby.createErr', { msg: error?.message ?? '' })); return }
    const m = data as Match
    setRoom(m); setStatus(t('battle.lobby.waitingShareCode'))
    waitForGuest(m.id)
  }

  const joinByCode = async (codeArg?: string) => {
    const raw = (codeArg ?? joinCode).trim()
    if (!userId || !raw) return
    playUiClick(); setBusy(true); setStatus(t('battle.pvp.status.joining'))
    const supabase = createClient()
    const code = raw.toUpperCase()
    const { data: found } = await supabase.from('pvp_matches').select('*').eq('code', code).eq('status', 'waiting').is('guest_id', null).maybeSingle()
    const m = found as Match | null
    if (!m) { setBusy(false); playError(); setStatus(t('battle.pvp.err.roomTaken')); return }
    if (m.host_id === userId) { setBusy(false); playError(); setStatus(t('battle.pvp.err.ownRoom')); return }
    const { error } = await supabase.from('pvp_matches').update({ guest_id: userId, guest_deck_id: deckSel, guest_name: userName, status: 'ready' }).eq('id', m.id).is('guest_id', null)
    setBusy(false)
    if (error) { playError(); setStatus(t('battle.lobby.joinErr', { msg: error.message })); return }
    setLaunch({ net: { isHost: false, mySide: 'ai', matchId: m.id, opponentId: m.host_id }, deckId: deckSel, opponentDeckId: null, opponentName: m.host_name || t('battle.opponentFallback') })
  }

  const findRandom = async () => {
    if (!userId) return
    playUiClick(); setBusy(true); setStatus(t('battle.pvp.status.searching'))
    const supabase = createClient()
    // 1) bandom prisijungti prie laukiančio viešo kambario
    const { data: open } = await supabase.from('pvp_matches').select('*')
      .eq('is_public', true).eq('status', 'waiting').is('guest_id', null).neq('host_id', userId)
      .order('created_at', { ascending: true }).limit(1)
    const m = (open as Match[] | null)?.[0]
    if (m) {
      const { error } = await supabase.from('pvp_matches').update({ guest_id: userId, guest_deck_id: deckSel, guest_name: userName, status: 'ready' }).eq('id', m.id).is('guest_id', null)
      if (!error) { setBusy(false); setLaunch({ net: { isHost: false, mySide: 'ai', matchId: m.id, opponentId: m.host_id }, deckId: deckSel, opponentDeckId: null, opponentName: m.host_name || t('battle.opponentFallback') }); return }
    }
    // 2) niekas nelaukia – sukuriam viešą kambarį ir laukiam
    const { data, error } = await supabase.from('pvp_matches').insert({
      is_public: true, status: 'waiting', host_id: userId, host_deck_id: deckSel, host_name: userName,
    }).select('*').single()
    setBusy(false)
    if (error || !data) { playError(); setStatus(t('battle.lobby.genericErr', { msg: error?.message ?? '' })); return }
    const created = data as Match
    setRoom(created); setStatus(t('battle.pvp.status.waitingRandom'))
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
    <button onClick={() => { setTab(k); setStatus('') }} className="flex-1 px-3 py-2 rounded-lg text-xs font-semibold transition-all"
      style={{ background: tab === k ? `rgba(${ACC},0.28)` : 'rgba(10,8,16,0.7)', border: '1px solid ' + (tab === k ? `rgba(${ACC},0.6)` : 'rgba(255,255,255,0.08)'), color: tab === k ? '#fdba74' : 'var(--text-muted)' }}>
      {label}
    </button>
  )
  const inputStyle = { width: '100%', minHeight: 48, padding: '0.6rem', borderRadius: '0.5rem', fontSize: '1rem', letterSpacing: '0.2em', textAlign: 'center', textTransform: 'uppercase', background: 'rgba(10,8,16,0.85)', border: `1px solid rgba(${ACC},0.4)`, color: 'var(--text-primary)', outline: 'none' } as React.CSSProperties
  const actBtn = { background: `rgba(${ACC},0.25)`, border: `1px solid rgba(${ACC},0.55)`, color: '#fdba74', fontFamily: 'var(--rvn-font-display)', letterSpacing: '0.03em' } as React.CSSProperties

  return (
    <div className="fixed inset-0 z-[140] flex items-center justify-center p-4" style={{ background: 'rgba(4,3,8,0.9)' }} onClick={onClose}>
      <div className="relative w-[min(440px,94vw)] rounded-2xl px-5 py-6" style={{ border: `1px solid rgba(${ACC},0.4)`, background: `radial-gradient(120% 90% at 50% 0%, rgba(${ACC},0.14), rgba(10,8,16,0.97) 60%), linear-gradient(160deg, #15101f, #0a0810)`, boxShadow: '0 16px 48px rgba(0,0,0,0.6)' }} onClick={(e) => e.stopPropagation()}>
        <p className="text-lg font-bold mb-3 text-center" style={{ fontFamily: 'var(--rvn-font-display)', color: '#fdba74', letterSpacing: '0.08em', textShadow: `0 0 12px rgba(${ACC},0.4)` }}>{t('battle.lobby.title')}</p>
        {resumeRec && !room && (
          <div className="mb-3 p-3 rounded-xl" style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.4)' }}>
            <p className="text-xs mb-2" style={{ color: '#86efac' }}>{t('battle.lobby.resume', { name: resumeRec.opponentName || t('battle.opponentFallback') })}</p>
            <div className="flex gap-2">
              <button onClick={doReconnect} className="flex-1 px-3 py-2 rounded-lg text-sm font-bold" style={{ background: 'rgba(34,197,94,0.22)', border: '1px solid rgba(34,197,94,0.5)', color: '#86efac', fontFamily: 'var(--rvn-font-display)' }}>{t('battle.lobby.backToGame')}</button>
              <button onClick={dismissReconnect} className="px-3 py-2 rounded-lg text-xs" style={{ color: 'var(--text-muted)', border: '1px solid var(--bg-border)' }}>{t('battle.lobby.dismiss')}</button>
            </div>
          </div>
        )}
        {!room && (
          <div className="mb-4">
            {decks.length === 0 ? (
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{t('battle.lobby.loadingShort')}</p>
            ) : (
              <DigitalPicker label={t('battle.lobby.yourDeck')} accent={ACC} value={deckSel} onChange={setDeckSel}
                items={decks.map((d) => ({ value: d.id, label: d.name, sub: d.faction ?? undefined, iconUrl: d.factionIcon, color: d.factionColor ?? undefined }))} />
            )}
          </div>
        )}

        {room ? (
          <div className="text-center space-y-3">
            {room.code && (
              <>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{t('battle.lobby.roomCodeShare')}</p>
                <p className="text-3xl font-bold tracking-[0.3em]" style={{ color: 'var(--gold)', fontFamily: 'var(--rvn-font-display)' }}>{room.code}</p>
              </>
            )}
            <p className="text-sm flex items-center justify-center gap-2" style={{ color: 'var(--text-secondary)' }}>
              <span className="inline-block w-2 h-2 rounded-full animate-pulse" style={{ background: `rgba(${ACC},1)` }} /> {status}
            </p>
            <button onClick={cancel} className="px-4 py-2 rounded-xl text-sm" style={{ color: 'var(--text-muted)', border: '1px solid var(--bg-border)' }}>{t('common.cancel')}</button>
          </div>
        ) : (
          <>
            <div className="flex gap-2 mb-4">{tabBtn('private', t('battle.lobby.tabPrivate'))}{tabBtn('random', t('battle.lobby.tabRandom'))}</div>

            {tab === 'private' ? (
              <div className="space-y-4">
                <button disabled={busy} onClick={() => createPrivate()} className="w-full px-4 rounded-xl text-sm font-bold disabled:opacity-40" style={{ ...actBtn, minHeight: 48 }}>
                  {t('battle.lobby.createRoomCta')}
                </button>
                <div className="flex items-center gap-2"><div className="flex-1 h-px" style={{ background: 'var(--bg-border)' }} /><span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{t('battle.lobby.or')}</span><div className="flex-1 h-px" style={{ background: 'var(--bg-border)' }} /></div>
                <input value={joinCode} onChange={(e) => setJoinCode(e.target.value)} placeholder={t('battle.lobby.codePlaceholder')} maxLength={5} style={inputStyle} />
                <button disabled={busy || !joinCode.trim()} onClick={() => joinByCode()} className="w-full px-4 rounded-xl text-sm font-bold disabled:opacity-40" style={{ ...actBtn, minHeight: 48 }}>
                  {t('battle.lobby.joinByCode')}
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{t('battle.lobby.randomInfo')}</p>
                <button disabled={busy} onClick={findRandom} className="w-full px-4 rounded-xl text-sm font-bold disabled:opacity-40" style={{ ...actBtn, minHeight: 48 }}>
                  {t('battle.lobby.findOpp')}
                </button>
              </div>
            )}

            {status && <p className="text-xs mt-3 text-center" style={{ color: 'var(--text-secondary)' }}>{status}</p>}
            <button onClick={onClose} className="w-full mt-4 px-4 py-2 rounded-xl text-sm" style={{ color: 'var(--text-muted)', border: '1px solid var(--bg-border)' }}>{t('common.close')}</button>
          </>
        )}
      </div>
    </div>
  )
}
