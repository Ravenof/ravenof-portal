'use client'

// ── Ravenof Digital — Draugiška kova (PvP): patvirtintas UI (Fazė 3, pvp-lobby.png) ─
// Full-bleed (be rail): ‹ atgal + DRAUGIŠKA KOVA. Kairė — kaladės eilutė,
// segmented GREITA KOVA / KURTI KAMBARĮ / JUNGTIS KODU, režimo turinys ir
// raudonas banner CTA. Dešinė — DRAUGAI sąrašas su IŠŠŪKIS mygtukais + Visi ›.
// Match logika (findRandom/createPrivate/joinByCode/waitForGuest/challengeCreate)
// nekeista; startas -> TutorialGame(net).
import { useCallback, useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { playUiClick, playError } from '@/lib/ui-sound'
import { ActiveDeckSelectorModal } from '@/components/digital/ActiveDeckSelectorModal'
import { useActiveDeck, activeDeckOf } from '@/lib/digital/activeDeck'
import { getStarterDecks } from '@/lib/starterDecks'
import { friendsList, challengeCreate, type Friend } from '@/lib/social'
import type { PvPNet } from '@/components/tutorial/TutorialGame'
import { useT } from '@/lib/i18n/react'
import { RavenofBannerButton, RavenofTextField } from '@/components/digital/ui/RavenofKit'

const TutorialGame = dynamic(() => import('@/components/tutorial/TutorialGame').then((m) => m.TutorialGame), { ssr: false })

type Deck = { id: string; name: string; faction: string | null; factionIcon: string | null; factionColor: string | null; missing: number }
type Match = { id: string; code: string | null; guest_id: string | null; guest_deck_id: string | null; guest_name: string | null; host_id: string; host_name: string | null }
type Launch = { net: PvPNet; deckId: string; opponentDeckId: string | null; opponentName: string }
type Mode = 'random' | 'create' | 'code'
const randCode = () => Array.from({ length: 5 }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.floor(Math.random() * 32)]).join('')

const PRES_COLOR: Record<string, string> = { online: '#4F9E52', away: '#D4A33B', dnd: '#B4444F', offline: '#5e5868' }

export function DigitalPvP() {
  const t = useT()
  const router = useRouter()
  const [decks, setDecks] = useState<Deck[] | null>(null)
  const [sel, setSel] = useState('')
  const [userId, setUserId] = useState<string | null>(null)
  const [userName, setUserName] = useState(t('battle.player'))
  const [friends, setFriends] = useState<Friend[]>([])
  const [mode, setMode] = useState<Mode>('random')
  const [joinCode, setJoinCode] = useState('')
  const [room, setRoom] = useState<Match | null>(null)
  const [status, setStatus] = useState('')
  const [busy, setBusy] = useState(false)
  const [launch, setLaunch] = useState<Launch | null>(null)
  const [toast, setToast] = useState('')
  const [deckSelOpen, setDeckSelOpen] = useState(false)
  const [covers, setCovers] = useState<Record<number, string>>({})
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { setDecks([]); return }
      setUserId(user.id)
      setUserName((user.user_metadata?.username as string) || (user.user_metadata?.display_name as string) || (user.email?.split('@')[0]) || t('battle.player'))
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
    void useActiveDeck.getState().refresh()
    getStarterDecks().then((sd) => {
      const m: Record<number, string> = {}
      for (const st of sd ?? []) if (st.factionId != null && st.imageUrl) m[st.factionId] = st.imageUrl
      setCovers(m)
    })
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(''), 1800); return () => clearTimeout(t) }, [toast])

  const adState = useActiveDeck()
  const globalDeck = activeDeckOf(adState)
  // Tik globali aktyvi kaladė (be tylaus fallback) — žr. DigitalPvE komentarą
  const deck = adState.loaded
    ? (globalDeck ? decks?.find((d) => d.id === globalDeck.id && d.missing === 0) : undefined)
    : decks?.find((d) => d.id === sel && d.missing === 0)
  // Kovos kaladės ref (stale-closure apsauga waitForGuest/poll callback'uose)
  const battleDeckRef = useRef('')
  useEffect(() => { battleDeckRef.current = deck?.id ?? '' }, [deck?.id])

  // Draugo iššūkis: ?join=CODE (draugas priėmė) → auto-prisijungia; ?host=CODE → sukuria kambarį tuo kodu.
  const autoRef = useRef(false)
  useEffect(() => {
    // laukiam kol užsikraus GLOBALI aktyvi kaladė — kitaip svečias žaistų su pirma/starter!
    if (autoRef.current || !userId || !deck || typeof window === 'undefined') return
    const sp = new URLSearchParams(window.location.search)
    const j = sp.get('join'); const h = sp.get('host')
    if (j) { autoRef.current = true; setMode('code'); setJoinCode(j.toUpperCase()); void joinByCode(j) }
    else if (h) { autoRef.current = true; setMode('create'); void createPrivate(false, h.toUpperCase()).then((m) => { if (m) { setRoom(m); setStatus(t('battle.pvp.status.waitingFriendShare')); waitForGuest(m.id) } }) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, deck?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const playable = (decks ?? []).filter((d) => d.missing === 0)

  const waitForGuest = useCallback((matchId: string) => {
    const supabase = createClient()
    if (pollRef.current) clearInterval(pollRef.current)
    pollRef.current = setInterval(async () => {
      const { data } = await supabase.from('pvp_matches').select('*').eq('id', matchId).single()
      const m = data as Match | null
      if (m && m.guest_id && m.guest_deck_id) {
        if (pollRef.current) clearInterval(pollRef.current)
        setLaunch({ net: { isHost: true, mySide: 'you', matchId: m.id, opponentId: m.guest_id || undefined }, deckId: battleDeckRef.current, opponentDeckId: m.guest_deck_id, opponentName: m.guest_name || t('battle.opponentFallback') })
      }
    }, 2000)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const createPrivate = async (isPublic: boolean, code: string | null): Promise<Match | null> => {
    if (!userId) return null
    setBusy(true)
    const supabase = createClient()
    const { data, error } = await supabase.from('pvp_matches').insert({ code, is_public: isPublic, status: 'waiting', host_id: userId, host_deck_id: battleDeckRef.current, host_name: userName }).select('*').single()
    setBusy(false)
    if (error || !data) { playError(); setStatus(t('battle.pvp.err.createRoom')); return null }
    return data as Match
  }

  const findRandom = async () => {
    if (!userId) return
    playUiClick(); setBusy(true); setStatus(t('battle.pvp.status.searching'))
    const supabase = createClient()
    const { data: open } = await supabase.from('pvp_matches').select('*').eq('is_public', true).eq('status', 'waiting').is('guest_id', null).neq('host_id', userId).order('created_at', { ascending: true }).limit(1)
    const m = (open as Match[] | null)?.[0]
    if (m) {
      const { error } = await supabase.from('pvp_matches').update({ guest_id: userId, guest_deck_id: battleDeckRef.current, guest_name: userName, status: 'ready' }).eq('id', m.id).is('guest_id', null)
      if (!error) { setBusy(false); setLaunch({ net: { isHost: false, mySide: 'ai', matchId: m.id, opponentId: m.host_id }, deckId: battleDeckRef.current, opponentDeckId: null, opponentName: m.host_name || t('battle.opponentFallback') }); return }
    }
    const created = await createPrivate(true, null)
    if (created) { setRoom(created); setStatus(t('battle.pvp.status.waitingRandom')); waitForGuest(created.id) }
  }

  const inviteFriend = async (f: Friend) => {
    if (!deck || room || busy) return
    playUiClick()
    const code = randCode()
    const created = await createPrivate(false, code)
    if (!created) return
    const ok = await challengeCreate(f.userId, code)
    setRoom(created)
    setStatus(ok ? t('battle.pvp.status.inviteSent') : t('battle.pvp.status.roomCreatedShare', { code }))
    waitForGuest(created.id)
  }

  const createRoom = async () => {
    playUiClick()
    const created = await createPrivate(false, randCode())
    if (created) { setRoom(created); setStatus(t('battle.pvp.status.waitingFriendShare')); waitForGuest(created.id) }
  }

  const joinByCode = async (codeArg?: string) => {
    const raw = (codeArg ?? joinCode).trim().toUpperCase()
    if (!userId || !raw) return
    playUiClick(); setBusy(true); setStatus(t('battle.pvp.status.joining'))
    const supabase = createClient()
    const { data: found } = await supabase.from('pvp_matches').select('*').eq('code', raw).eq('status', 'waiting').is('guest_id', null).maybeSingle()
    const m = found as Match | null
    if (!m) { setBusy(false); playError(); setStatus(t('battle.pvp.err.roomTaken')); return }
    if (m.host_id === userId) { setBusy(false); playError(); setStatus(t('battle.pvp.err.ownRoom')); return }
    const { error } = await supabase.from('pvp_matches').update({ guest_id: userId, guest_deck_id: battleDeckRef.current, guest_name: userName, status: 'ready' }).eq('id', m.id).is('guest_id', null)
    setBusy(false)
    if (error) { playError(); setStatus(t('battle.pvp.err.joinFailed')); return }
    setLaunch({ net: { isHost: false, mySide: 'ai', matchId: m.id, opponentId: m.host_id }, deckId: battleDeckRef.current, opponentDeckId: null, opponentName: m.host_name || t('battle.opponentFallback') })
  }

  const cancelRoom = async () => {
    if (pollRef.current) clearInterval(pollRef.current)
    if (room) { const supabase = createClient(); await supabase.from('pvp_matches').delete().eq('id', room.id) }
    setRoom(null); setStatus('')
  }

  if (launch) {
    return <TutorialGame deckId={launch.deckId} deckName={deck?.name ?? t('battle.pvp.deckFallback')} opponentDeckId={launch.opponentDeckId} opponentName={launch.opponentName} net={launch.net} onClose={() => { setLaunch(null); setRoom(null); setStatus('') }} />
  }

  // ── CTA būsena ──
  const cta: { label: string; disabled: boolean; action?: () => void } =
    !deck ? { label: t('battle.pvp.cta.pickValidDeck'), disabled: true }
    : room ? { label: t('battle.pvp.cta.waitingOpp'), disabled: true }
    : mode === 'random' ? { label: t('battle.pvp.cta.findOpp'), disabled: busy, action: findRandom }
    : mode === 'create' ? { label: t('battle.pvp.cta.createRoom'), disabled: busy, action: createRoom }
    : { label: t('battle.pvp.cta.join'), disabled: busy || !joinCode.trim(), action: () => void joinByCode() }

  if (decks === null) return <div className="ravenof-body h-full flex items-center justify-center"><span className="ravenof-spinner" style={{ width: 40, height: 40 }} /></div>
  if (decks.length === 0 || playable.length === 0) return (
    <div className="ravenof-body h-full flex flex-col items-center justify-center gap-3 text-center px-6">
      <p style={{ font: '400 13px var(--ravenof-font-body)', color: 'var(--ravenof-text-secondary)' }}>{t('battle.pvp.noDecks')}</p>
      <Link href="/digital/decks?tab=builder" onClick={() => playUiClick()} className="ravenof-btn ravenof-btn-secondary">{t('battle.pvp.createDeck')}</Link>
    </div>
  )

  const onlineFirst = [...friends].sort((a, b) => {
    const rank = (x: Friend) => { const p = x.presence ?? (x.online ? 'online' : 'offline'); return p === 'online' ? 0 : p === 'away' ? 1 : p === 'dnd' ? 2 : 3 }
    return rank(a) - rank(b) || a.username.localeCompare(b.username)
  })

  return (
    <div className="ravenof-body ravenof-in h-full flex flex-col min-h-0" style={{ padding: '12px 20px 14px max(20px, env(safe-area-inset-left, 0px))' }}>
      {/* Antraštė: atgal + pavadinimas */}
      <div className="flex items-center shrink-0" style={{ gap: 10, paddingBottom: 10 }}>
        <button onClick={() => { playUiClick(); router.push('/digital') }} aria-label={t('common.back')} className="ravenof-iconbtn" style={{ fontSize: 16 }}>‹</button>
        <div style={{ font: '700 15px var(--ravenof-font-display)', letterSpacing: 1, textTransform: 'uppercase', color: 'var(--ravenof-text-primary)' }}>{t('battle.pvp.screenTitle')}</div>
      </div>

      <div className="flex-1 flex min-h-0" style={{ gap: 14 }}>
        {/* ── KAIRĖ: kaladė + režimas + turinys + CTA ── */}
        <div className="flex flex-col min-w-0" style={{ flex: 1.9, gap: 8 }}>
          <button onClick={() => { playUiClick(); setDeckSelOpen(true) }} data-testid="active-deck-summary" className="ravenof-press flex items-center shrink-0 text-left" style={{ gap: 10, background: 'var(--ravenof-bg-surface)', border: '1px solid #3d3345', padding: '7px 10px', cursor: 'pointer' }}>
            <span className="shrink-0 overflow-hidden relative" style={{ width: 34, height: 45, borderRadius: 3, border: '1px solid var(--ravenof-border-strong)', background: globalDeck?.factionId != null && covers[globalDeck.factionId] ? `url('${covers[globalDeck.factionId]}') no-repeat top / cover` : 'linear-gradient(160deg,#1a1325,#0a0810)' }} />
            <span className="flex-1 min-w-0">
              <span className="block truncate" style={{ font: '700 12px var(--ravenof-font-display)', color: 'var(--ravenof-text-primary)' }}>{!adState.loaded ? t('common.loading') : globalDeck ? globalDeck.name : t('ranked.pickActiveDeck')}</span>
              {globalDeck && <span className="block truncate" style={{ font: '400 11px var(--ravenof-font-body)', color: globalDeck.factionColor ?? 'var(--ravenof-text-secondary)' }}>{globalDeck.faction ?? '—'} · {t('decks.cardsShort', { count: globalDeck.cardCount })}</span>}
            </span>
            <span style={{ color: 'var(--ravenof-text-secondary)' }}>›</span>
          </button>

          {/* Segmented režimai */}
          <div className="flex shrink-0" style={{ border: '1px solid var(--ravenof-border-strong)' }}>
            {([['random', t('battle.pvp.modeQuick')], ['create', t('battle.pvp.modeCreate')], ['code', t('battle.pvp.modeJoin')]] as [Mode, string][]).map(([m, lbl]) => {
              const s = mode === m
              return (
                <button key={m} onClick={() => { playUiClick(); setMode(m); setStatus('') }} aria-pressed={s} data-testid={`pvp-mode-${m}`}
                  className="ravenof-press flex-1" style={{
                    padding: '10px 4px', border: 0, cursor: 'pointer', textTransform: 'uppercase',
                    font: '700 11px var(--ravenof-font-display)', letterSpacing: 1.5,
                    background: s ? 'var(--ravenof-grad-gold)' : 'transparent',
                    color: s ? 'var(--ravenof-on-gold)' : 'var(--ravenof-text-secondary)',
                  }}>{lbl}</button>
              )
            })}
          </div>

          {/* Režimo turinys */}
          <div className="flex-1 min-h-0 flex flex-col items-center justify-center text-center" style={{ border: '1px solid var(--ravenof-border-hairline)', background: 'var(--ravenof-bg-surface)', padding: 16 }}>
            {room ? (
              <div className="flex flex-col items-center gap-2">
                {room.code && <>
                  <span style={{ font: '400 11px var(--ravenof-font-body)', color: 'var(--ravenof-text-secondary)' }}>{t('battle.pvp.roomCode')}</span>
                  <span style={{ font: '700 26px var(--ravenof-font-display)', letterSpacing: 8, color: 'var(--ravenof-gold-bright)' }}>{room.code}</span>
                  <button onClick={() => { navigator.clipboard?.writeText(room.code!); setToast(t('battle.pvp.codeCopied')) }} className="ravenof-btn ravenof-btn-secondary" style={{ fontSize: 11, padding: '6px 12px', minHeight: 30 }}>{t('battle.pvp.copy')}</button>
                </>}
                <span className="flex items-center gap-2 mt-1" style={{ font: '400 12px var(--ravenof-font-body)', color: 'var(--ravenof-text-primary)' }}><span className="inline-block w-2 h-2 rounded-full animate-pulse" style={{ background: 'var(--ravenof-gold)' }} />{status}</span>
                <button onClick={() => { playUiClick(); void cancelRoom() }} className="ravenof-btn ravenof-btn-secondary mt-1" style={{ fontSize: 11, padding: '6px 14px', minHeight: 30 }}>{t('common.cancel')}</button>
              </div>
            ) : mode === 'random' ? (
              <p style={{ font: '400 13px var(--ravenof-font-body)', color: 'var(--ravenof-text-secondary)', maxWidth: 420, lineHeight: 1.5 }}>{t('battle.pvp.quickInfo2')}</p>
            ) : mode === 'create' ? (
              <p style={{ font: '400 13px var(--ravenof-font-body)', color: 'var(--ravenof-text-secondary)', maxWidth: 420, lineHeight: 1.5 }}>{t('battle.pvp.createInfo')}</p>
            ) : (
              <div className="flex flex-col items-center gap-3 w-full" style={{ maxWidth: 300 }}>
                <p style={{ font: '400 12px var(--ravenof-font-body)', color: 'var(--ravenof-text-secondary)', margin: 0 }}>{t('battle.pvp.codeInfo')}</p>
                <RavenofTextField value={joinCode} onChange={(e) => setJoinCode(e.target.value.toUpperCase())} maxLength={5}
                  placeholder={t('battle.pvp.codePlaceholder')} aria-label={t('battle.pvp.codePlaceholder')}
                  style={{ textAlign: 'center', letterSpacing: 10, font: '700 18px var(--ravenof-font-display)', textTransform: 'uppercase', height: 46 }} />
              </div>
            )}
            {!room && status && <p role="status" className="mt-2" style={{ font: '400 11px var(--ravenof-font-body)', color: '#c65563' }}>{status}</p>}
          </div>

          <RavenofBannerButton onClick={cta.action} disabled={cta.disabled} data-testid="pvp-cta" style={{ width: '100%' }}>
            {cta.label}
          </RavenofBannerButton>
        </div>

        {/* ── DEŠINĖ: draugai ── */}
        <div className="flex flex-col min-w-0" style={{ flex: 1, gap: 8 }}>
          <div className="flex items-baseline justify-between shrink-0">
            <div style={{ font: '700 13px var(--ravenof-font-display)', letterSpacing: 1, textTransform: 'uppercase', color: 'var(--ravenof-text-primary)' }}>{t('battle.pvp.friendsTitle')}</div>
            <Link href="/digital/friends" onClick={() => playUiClick()} className="ravenof-press" style={{ font: '400 10.5px var(--ravenof-font-body)', color: 'var(--ravenof-gold)' }}>{t('battle.pvp.friendsAll')} ›</Link>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto ravenof-scroll flex flex-col" style={{ gap: 8 }} data-testid="friend-panel">
            {onlineFirst.length === 0 && <p className="text-center py-4" style={{ font: '400 11px var(--ravenof-font-body)', color: 'var(--ravenof-text-secondary)' }}>{t('battle.pvp.noFriends')}</p>}
            {onlineFirst.map((f) => {
              const pres = f.presence ?? (f.online ? 'online' : 'offline')
              const pc = PRES_COLOR[pres] ?? PRES_COLOR.offline
              const pn = t(`battle.pvp.presence.${pres === 'online' ? 'online' : pres === 'away' ? 'away' : pres === 'dnd' ? 'dnd' : 'offline'}`)
              const canChallenge = pres !== 'offline' && !room && !!deck
              return (
                <div key={f.id} className="flex items-center shrink-0" style={{ gap: 10, background: 'var(--ravenof-bg-surface)', border: '1px solid var(--ravenof-border-hairline)', padding: '10px 12px' }}>
                  <span className="shrink-0 rounded-full" title={pn} style={{ width: 9, height: 9, background: pc }} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate" style={{ font: '700 12.5px var(--ravenof-font-body)', color: 'var(--ravenof-text-primary)' }}>{f.displayName || f.username}</span>
                    <span className="block truncate" style={{ font: '400 10.5px var(--ravenof-font-body)', color: 'var(--ravenof-text-secondary)' }}>{pn}</span>
                  </span>
                  {canChallenge && (
                    <button data-testid={`invite-friend-${f.username}`} onClick={() => void inviteFriend(f)} disabled={busy}
                      className="ravenof-press shrink-0" style={{ font: '700 10px var(--ravenof-font-display)', letterSpacing: 1.5, textTransform: 'uppercase', color: 'var(--ravenof-gold)', background: 'none', border: '1px solid var(--ravenof-border-gold)', padding: '7px 10px', cursor: 'pointer' }}>
                      {t('battle.pvp.challengeCta')}
                    </button>
                  )}
                </div>
              )
            })}
            <p className="shrink-0 text-center" style={{ font: '400 9.5px var(--ravenof-font-body)', color: 'var(--ravenof-text-secondary)' }}>{t('battle.pvp.noRankReward')}</p>
          </div>
        </div>
      </div>

      {toast && <div className="ravenof-toast" style={{ position: 'fixed', left: '50%', transform: 'translateX(-50%)', bottom: 'calc(18px + env(safe-area-inset-bottom,0px))', zIndex: 200 }}>{toast}</div>}
      {deckSelOpen && <ActiveDeckSelectorModal onClose={() => setDeckSelOpen(false)} />}
    </div>
  )
}
