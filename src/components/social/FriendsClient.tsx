'use client'

// ══════════════════════════════════════════════════════════════════════════════
// Draugai — patvirtintas UI (Fazė 3, friends-default.png). Dvi zonos:
//  KAIRĖ — draugų sąrašas (dot + vardas + būsena + unread), paieška/filtras,
//  užklausos, pridėti draugą. DEŠINĖ — įterptas pokalbis su pasirinktu draugu
//  (chatStore istorija/siuntimas; realtime ateina per GlobalChatLayer sub'ą),
//  antraštėje IŠŠŪKIS + ⋮ meniu (mainai/mute/block/šalinti). Kai draugas
//  nepasirinktas — iššūkiai/mainų pasiūlymai + tuščia būsena.
//  Viršuje — ‹ atgal + DRAUGAI + N prisijungę + savo presence pasirinkimas.
// Visa gyva logika (friendRequest/Respond/Remove, challenge*, trade*, presence,
// block, mute) išlaikyta.
// ══════════════════════════════════════════════════════════════════════════════
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Check, X, MoreVertical } from 'lucide-react'
import { friendRequest, friendRespond, friendRemove, friendsList, challengeCreate, challengeIncoming, challengeAccept, challengeCancel, randMatchCode, setPresence, blockUser, type Friend, type Challenge, type SelfPresence } from '@/lib/social'
import { tradeCreate, tradeIncoming, tradeAccept, type TradeIncoming } from '@/lib/trade'
import { TradeWindow } from './TradeWindow'
import { useChatStore, PRESENCE_META } from '@/lib/social/chatStore'
import { getLevelProgress } from '@/lib/gamification/levels'
import { playUiClick, playSuccess } from '@/lib/ui-sound'
import { useT } from '@/lib/i18n/react'
import { RavenofTextField } from '@/components/digital/ui/RavenofKit'
import { useDesktopUi } from '@/components/digital/ui/useDesktopUi'
import { DT } from '@/components/digital/ui/deskTokens'
import { DeskDialog } from '@/components/digital/ui/DeskKit'

type PresenceFilter = 'all' | 'online' | 'offline'

const SELF_STATUS: { v: SelfPresence; labelKey: string; color: string; hintKey: string }[] = [
  { v: 'auto',   labelKey: 'social.presence.online',  color: '#4F9E52', hintKey: 'social.selfStatus.autoHint' },
  { v: 'away',   labelKey: 'social.presence.away',    color: '#D4A33B', hintKey: 'social.selfStatus.awayHint' },
  { v: 'dnd',    labelKey: 'social.presence.dnd',     color: '#B4444F', hintKey: 'social.selfStatus.dndHint' },
  { v: 'hidden', labelKey: 'social.presence.hidden',  color: '#5e5868', hintKey: 'social.selfStatus.hiddenHint' },
]

export function FriendsClient() {
  const t = useT()
  const router = useRouter()
  // Desktop dydžiai TIK /digital/friends (tas pats komponentas naudojamas ir /friends — ten nekeičiam)
  const pathname = usePathname()
  const D = useDesktopUi().desktop && (pathname ?? '').startsWith('/digital')
  const chat = useChatStore()
  const [friends, setFriends] = useState<Friend[]>([])
  const [pending, setPending] = useState<Friend[]>([])
  const [challenges, setChallenges] = useState<Challenge[]>([])
  const [trades, setTrades] = useState<TradeIncoming[]>([])
  const [tradeId, setTradeId] = useState<string | null>(null)
  const [uname, setUname] = useState('')
  const [msg, setMsg] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState<PresenceFilter>('all')
  const [selId, setSelId] = useState<string | null>(null) // Friend.userId
  const [menuOpen, setMenuOpen] = useState(false)
  const [confirmAct, setConfirmAct] = useState<{ kind: 'remove' | 'block'; f: Friend } | null>(null)
  const [selfStatus, setSelfStatusUi] = useState<SelfPresence>('auto')
  const msgTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const msgsEndRef = useRef<HTMLDivElement | null>(null)

  const flash = (t: string) => { setMsg(t); if (msgTimer.current) clearTimeout(msgTimer.current); msgTimer.current = setTimeout(() => setMsg(null), 4000) }

  const reload = useCallback(async () => {
    const [fl, ch, tr] = await Promise.all([friendsList(), challengeIncoming(), tradeIncoming()])
    setFriends(fl.friends); setPending(fl.pending); setChallenges(ch); setTrades(tr)
    if (fl.me?.presenceStatus) setSelfStatusUi(fl.me.presenceStatus)
  }, [])
  useEffect(() => { void reload(); const t = setInterval(() => { void reload() }, 15_000); return () => clearInterval(t) }, [reload])
  useEffect(() => { void chat.loadOverview() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const selFriend = useMemo(() => friends.find((f) => f.userId === selId) ?? null, [friends, selId])
  const conv = selId ? chat.convs[selId] : undefined

  // Pasirinkus draugą — istorija + perskaityta (be globalios galvutės atidarymo).
  // Jei pokalbio įrašo dar nėra (draugas be žinučių) — sukuriam jį store'e,
  // kitaip loadHistory nieko neįrašytų ir liktų amžinas „kraunama".
  useEffect(() => {
    if (!selId || !selFriend) return
    if (!useChatStore.getState().convs[selId]) {
      useChatStore.setState((s) => ({ convs: { ...s.convs, [selId]: {
        friend: { userId: selFriend.userId, username: selFriend.username, displayName: selFriend.displayName, avatar: selFriend.avatar, presence: (selFriend.presence ?? (selFriend.online ? 'online' : 'offline')) },
        msgs: null, unread: selFriend.unread ?? 0, draft: '',
      } } }))
    }
    void chat.loadHistory(selId)
    chat.markRead(selId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selId, selFriend?.userId])
  // Nauja žinutė atėjo į atidarytą pokalbį → pažymim skaityta + scroll žemyn
  useEffect(() => {
    if (!selId || !conv?.msgs) return
    chat.markRead(selId)
    msgsEndRef.current?.scrollIntoView({ block: 'end' })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selId, conv?.msgs?.length])

  const add = async () => {
    if (!uname.trim() || busy) return
    setBusy(true); setMsg(null)
    const r = await friendRequest(uname.trim())
    setBusy(false)
    if ('error' in r) { flash(r.error || t('social.failed')); return }
    setUname(''); playSuccess(); flash(t('social.requestSent')); void reload()
  }
  const respond = async (id: string, ok: boolean) => { playUiClick(); await friendRespond(id, ok); void reload() }
  const challenge = async (f: Friend) => {
    playUiClick()
    const code = randMatchCode()
    if (!(await challengeCreate(f.userId, code))) { flash(t('social.challengeFailed')); return }
    router.push(`/digital/pvp?host=${code}`)
  }
  const accept = async (c: Challenge) => {
    const code = await challengeAccept(c.id)
    if (!code) { flash(t('social.challengeExpired')); void reload(); return }
    router.push(`/digital/pvp?join=${code}`)
  }
  const startTrade = async (f: Friend) => { const id = await tradeCreate(f.userId); if (id) setTradeId(id); else flash(t('social.tradeFailed')) }
  const changeSelf = (v: SelfPresence) => { playUiClick(); setSelfStatusUi(v); chat.setSelfStatus(v); void setPresence(v) }

  const sendMsg = async () => {
    if (!selId) return
    const body = (chat.convs[selId]?.draft ?? '').trim()
    if (!body) return
    playUiClick()
    chat.setDraft(selId, '')
    await chat.send(selId, body)
  }

  const shown = useMemo(() => {
    const qq = q.trim().toLowerCase()
    return friends
      .filter((f) => (filter === 'all' ? true : filter === 'online' ? f.presence !== 'offline' && f.presence != null || f.online : f.presence === 'offline' || !f.online))
      .filter((f) => !qq || f.username.toLowerCase().includes(qq) || (f.displayName ?? '').toLowerCase().includes(qq))
      .sort((a, b) => {
        const ao = a.presence && a.presence !== 'offline' ? 0 : 1
        const bo = b.presence && b.presence !== 'offline' ? 0 : 1
        return ao - bo || (b.unread ?? 0) - (a.unread ?? 0) || a.username.localeCompare(b.username)
      })
  }, [friends, q, filter])

  const onlineCount = friends.filter((f) => f.presence && f.presence !== 'offline').length

  const lastSeenTxt = (f: Friend) => {
    if (!f.lastSeen) return t('social.seenLongAgo')
    const m = Math.max(1, Math.round((Date.now() - new Date(f.lastSeen).getTime()) / 60000))
    return m < 60 ? t('social.seenMin', { count: m }) : m < 1440 ? t('social.seenHours', { count: Math.round(m / 60) }) : t('social.seenDays', { count: Math.round(m / 1440) })
  }
  const presMeta = (f: Friend) => { const p = f.presence ?? (f.online ? 'online' : 'offline'); return { p, m: PRESENCE_META[p] ?? PRESENCE_META.offline } }

  return (
    <div className="ravenof-body ravenof-in h-full min-h-0 flex flex-col" style={D ? { gap: DT.sp.md, padding: `0 0 ${DT.sp.sm}px` } : { gap: 8, padding: '12px 18px 12px 18px' }} onClick={() => setMenuOpen(false)}>
      {/* ── Antraštė: atgal + pavadinimas + presence ── */}
      <div className="shrink-0 flex items-center" style={{ gap: D ? DT.sp.md : 10, flexWrap: D ? 'wrap' : undefined, minHeight: D ? 48 : undefined }}>
        <button onClick={() => { playUiClick(); router.push('/digital') }} aria-label={t('common.back')} className="ravenof-iconbtn" style={{ fontSize: D ? 22 : 16 }}>‹</button>
        <div style={{ font: `700 ${D ? DT.fs.h1 : 15}px var(--ravenof-font-display)`, letterSpacing: 1, textTransform: 'uppercase', color: 'var(--ravenof-text-primary)' }}>{t('social.title')}</div>
        <div style={{ font: `400 ${D ? DT.fs.help : 11.5}px var(--ravenof-font-body)`, color: 'var(--ravenof-text-secondary)' }}>{t('social.onlineN', { count: onlineCount })}</div>
        <div className="flex-1" />
        {SELF_STATUS.map((o) => (
          <button key={o.v} onClick={() => changeSelf(o.v)} title={t(o.hintKey)} data-testid={`presence-${o.v}`} aria-label={t(o.labelKey)}
            className="ravenof-press flex items-center gap-1.5" style={{ font: `700 ${D ? 13 : 9.5}px var(--ravenof-font-body)`, padding: D ? '0 14px' : '5px 8px', minHeight: D ? DT.ctlSm : undefined, gap: D ? 8 : undefined, cursor: 'pointer',
              background: selfStatus === o.v ? 'var(--ravenof-bg-surface-2)' : 'transparent',
              border: `1px solid ${selfStatus === o.v ? o.color : 'var(--ravenof-border-hairline)'}`,
              color: selfStatus === o.v ? o.color : 'var(--ravenof-text-secondary)' }}>
            <span className="rounded-full" style={{ width: D ? 9 : 7, height: D ? 9 : 7, background: o.color }} />{t(o.labelKey)}
          </button>
        ))}
      </div>
      {msg && <p role="status" className="shrink-0" style={{ font: `400 ${D ? DT.fs.help : 11}px var(--ravenof-font-body)`, color: msg.startsWith('✓') ? 'var(--ravenof-success)' : '#c65563', margin: 0 }}>{msg}</p>}

      <div className="flex-1 min-h-0 flex" style={{ gap: D ? DT.sp.lg : 12 }}>
        {/* ── KAIRĖ: draugų sąrašas ── */}
        <div className="flex flex-col min-h-0 shrink-0" style={{ width: D ? DT.side.list : 232, gap: D ? DT.sp.sm : 6 }}>
          <div className="flex shrink-0" style={{ gap: D ? DT.sp.sm : 6 }}>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('social.searchPlaceholder')} aria-label={t('social.searchAria')}
              className="flex-1 min-w-0" style={{ minHeight: D ? DT.ctl : 30, background: 'var(--ravenof-bg-elevated)', border: '1px solid var(--ravenof-border-strong)', color: 'var(--ravenof-text-primary)', padding: D ? '0 12px' : '0 8px', font: `400 ${D ? DT.fs.body : 11}px var(--ravenof-font-body)`, outline: 'none' }} />
            <select value={filter} onChange={(e) => setFilter(e.target.value as PresenceFilter)} aria-label={t('social.filterAria')}
              style={{ minHeight: D ? DT.ctl : 30, maxWidth: D ? 116 : 82, background: 'var(--ravenof-bg-elevated)', border: '1px solid var(--ravenof-border-strong)', color: 'var(--ravenof-text-primary)', font: `400 ${D ? 14 : 10.5}px var(--ravenof-font-body)`, padding: D ? '0 6px' : undefined, cursor: D ? 'pointer' : undefined }}>
              <option value="all">{t('social.filterAll')}</option><option value="online">{t('social.filterOnline')}</option><option value="offline">{t('social.filterOffline')}</option>
            </select>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto ravenof-scroll flex flex-col" style={{ gap: D ? DT.sp.sm : 7 }}>
            {pending.length > 0 && (
              <div className="shrink-0">
                <p style={{ font: `600 ${D ? DT.fs.label : 9}px var(--ravenof-font-body)`, letterSpacing: 1.5, textTransform: 'uppercase', color: 'var(--ravenof-gold)', margin: D ? '4px 0 6px' : '0 0 4px' }}>{t('social.requests')} ({pending.length})</p>
                {pending.map((f) => (
                  <div key={f.id} className="flex items-center mb-1" style={{ gap: D ? DT.sp.sm : 6, background: 'var(--ravenof-bg-surface)', border: '1px solid var(--ravenof-border-gold)', padding: D ? '8px 10px 8px 12px' : '6px 8px', minHeight: D ? 52 : undefined }}>
                    <span className={D ? 'flex-1 min-w-0 rvn-clamp2' : 'flex-1 min-w-0 truncate'} title={f.displayName || f.username} style={{ font: `500 ${D ? DT.fs.body : 11.5}px var(--ravenof-font-body)`, color: 'var(--ravenof-text-primary)' }}>{f.displayName || f.username}</span>
                    <button onClick={() => respond(f.id, true)} aria-label={t('social.accept')} className="ravenof-press" style={{ color: 'var(--ravenof-success)', background: 'none', border: '1px solid var(--ravenof-border-strong)', padding: D ? 0 : 3, width: D ? DT.ctlSm : undefined, height: D ? DT.ctlSm : undefined, alignItems: 'center', justifyContent: 'center', cursor: 'pointer', display: 'inline-flex' }}><Check className={D ? 'w-4 h-4' : 'w-3 h-3'} /></button>
                    <button onClick={() => respond(f.id, false)} aria-label={t('common.cancel')} className="ravenof-press" style={{ color: 'var(--ravenof-text-secondary)', background: 'none', border: '1px solid var(--ravenof-border-strong)', padding: D ? 0 : 3, width: D ? DT.ctlSm : undefined, height: D ? DT.ctlSm : undefined, alignItems: 'center', justifyContent: 'center', cursor: 'pointer', display: 'inline-flex' }}><X className={D ? 'w-4 h-4' : 'w-3 h-3'} /></button>
                  </div>
                ))}
              </div>
            )}
            {friends.length === 0 ? (
              <p className="text-center py-6" style={{ font: `400 ${D ? DT.fs.help : 11}px var(--ravenof-font-body)`, color: 'var(--ravenof-text-secondary)' }}>{t('social.noFriendsTitle')}</p>
            ) : shown.length === 0 ? (
              <p className="text-center py-6" style={{ font: `400 ${D ? DT.fs.help : 11}px var(--ravenof-font-body)`, color: 'var(--ravenof-text-secondary)' }}>{t('social.noneFound')}</p>
            ) : shown.map((f) => {
              const { p, m } = presMeta(f)
              const sel = f.userId === selId
              const lvl = getLevelProgress(f.xp ?? 0).level
              return (
                <button key={f.id} data-testid={`friend-row-${f.username}`}
                  onClick={(e) => { e.stopPropagation(); playUiClick(); setSelId(sel ? null : f.userId); setMenuOpen(false) }}
                  className="ravenof-press w-full flex items-center text-left shrink-0"
                  title={`${f.displayName || f.username} (@${f.username}) · ${t('social.lvl', { lvl })}`}
                  style={{ gap: D ? DT.sp.md : 9, padding: D ? '10px 12px' : '9px 10px', minHeight: D ? 60 : undefined, cursor: 'pointer', background: sel ? 'var(--ravenof-bg-surface-2)' : 'var(--ravenof-bg-surface)', border: sel ? '1px solid var(--ravenof-gold)' : '1px solid var(--ravenof-border-strong)' }}>
                  {/* Draugo avataras (avatar_url) + presence taškas ant jo krašto */}
                  <span className="shrink-0 relative rounded-full overflow-visible" style={{ width: D ? 40 : 30, height: D ? 40 : 30 }}>
                    <span className="absolute inset-0 rounded-full overflow-hidden flex items-center justify-center"
                      style={{ border: '1.5px solid var(--ravenof-border-gold)', background: f.avatar ? `center/cover url(${f.avatar})` : 'linear-gradient(160deg,#241a35,#0f0a18)' }}>
                      {!f.avatar && <span style={{ font: `700 ${D ? 16 : 12}px var(--ravenof-font-display)`, color: 'var(--ravenof-gold)' }}>{(f.displayName || f.username).charAt(0).toUpperCase()}</span>}
                    </span>
                    <span className="absolute rounded-full" title={m.name} style={{ right: -1, bottom: -1, width: D ? 12 : 9, height: D ? 12 : 9, background: m.color, border: '1.5px solid var(--ravenof-bg-surface)' }} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate" style={{ font: `700 ${D ? DT.fs.body : 12.5}px var(--ravenof-font-body)`, color: 'var(--ravenof-text-primary)' }}>{f.displayName || f.username}</span>
                    <span className="block truncate" style={{ font: `400 ${D ? DT.fs.help : 10.5}px var(--ravenof-font-body)`, color: 'var(--ravenof-text-secondary)', marginTop: D ? 2 : undefined }}>{p === 'offline' ? lastSeenTxt(f) : m.name}{f.blockedByMe ? ` ${t('social.blockedTag')}` : ''}</span>
                  </span>
                  {(f.unread ?? 0) > 0 && (
                    <span className="shrink-0 flex items-center justify-center rounded-full" style={{ minWidth: D ? 22 : 17, height: D ? 22 : 17, padding: '0 4px', font: `800 ${D ? 12 : 9.5}px var(--ravenof-font-body)`, background: 'var(--ravenof-danger)', color: '#fff' }}>{f.unread}</span>
                  )}
                </button>
              )
            })}
          </div>

          {/* pridėti draugą */}
          <div className="shrink-0 flex" style={{ gap: D ? DT.sp.sm : 6 }}>
            <input id="friend-uname-input" value={uname} onChange={(e) => setUname(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} placeholder={t('social.usernamePlaceholder')}
              className="flex-1 min-w-0" style={{ minHeight: D ? DT.ctl : 32, background: 'var(--ravenof-bg-elevated)', border: '1px solid var(--ravenof-border-strong)', color: 'var(--ravenof-text-primary)', padding: D ? '0 12px' : '0 8px', font: `400 ${D ? DT.fs.body : 11}px var(--ravenof-font-body)`, outline: 'none' }} />
            <button onClick={add} disabled={busy} className="ravenof-press shrink-0" style={{ font: `700 ${D ? 13 : 10}px var(--ravenof-font-display)`, letterSpacing: 1, textTransform: 'uppercase', background: 'var(--ravenof-grad-gold)', color: 'var(--ravenof-on-gold)', border: 0, padding: D ? '0 16px' : '0 12px', minHeight: D ? DT.ctl : undefined, cursor: 'pointer', clipPath: 'polygon(4px 0, 100% 0, calc(100% - 4px) 100%, 0 100%)' }}>+ {t('social.add')}</button>
          </div>
        </div>

        {/* ── DEŠINĖ: pokalbis / veikla ── */}
        <div className="flex-1 min-w-0 flex flex-col min-h-0" style={{ border: '1px solid var(--ravenof-border-strong)', background: 'var(--ravenof-bg-surface)' }}>
          {/* iššūkiai + mainai — matomi visada, kai jų yra */}
          {(challenges.length > 0 || trades.length > 0) && (
            <div className="shrink-0 flex flex-col" style={{ gap: D ? DT.sp.sm : 6, padding: D ? '12px 20px' : '10px 12px', borderBottom: '1px solid var(--ravenof-border-hairline)' }}>
              {challenges.map((c) => (
                <div key={c.id} className="flex items-center" style={{ gap: 8 }}>
                  <span className="flex-1 min-w-0 truncate" style={{ font: `400 ${D ? DT.fs.body : 11.5}px var(--ravenof-font-body)`, color: 'var(--ravenof-text-primary)' }}>{t('social.invitesToBattle', { name: c.displayName || c.username })}</span>
                  <button onClick={() => void accept(c)} className="ravenof-press shrink-0" style={{ font: `700 ${D ? 12.5 : 10}px var(--ravenof-font-display)`, letterSpacing: 1.5, textTransform: 'uppercase', color: 'var(--ravenof-gold)', background: 'none', border: '1px solid var(--ravenof-border-gold)', padding: D ? '0 16px' : '5px 9px', minHeight: D ? DT.ctlSm : undefined, cursor: 'pointer' }}>{t('social.accept')}</button>
                  <button onClick={async () => { playUiClick(); await challengeCancel(c.id); void reload() }} aria-label={t('common.cancel')} className="ravenof-press shrink-0" style={{ color: 'var(--ravenof-text-secondary)', background: 'none', border: '1px solid var(--ravenof-border-strong)', padding: D ? 0 : 4, width: D ? DT.ctlSm : undefined, height: D ? DT.ctlSm : undefined, alignItems: 'center', justifyContent: 'center', cursor: 'pointer', display: 'inline-flex' }}><X className={D ? 'w-4 h-4' : 'w-3 h-3'} /></button>
                </div>
              ))}
              {trades.map((tr) => (
                <div key={tr.id} className="flex items-center" style={{ gap: 8 }}>
                  <span className="flex-1 min-w-0 truncate" style={{ font: `400 ${D ? DT.fs.body : 11.5}px var(--ravenof-font-body)`, color: 'var(--ravenof-text-primary)' }}>{t('social.wantsToTrade', { name: tr.displayName || tr.username })}</span>
                  <button onClick={async () => { playUiClick(); await tradeAccept(tr.id); setTradeId(tr.id); void reload() }} className="ravenof-press shrink-0" style={{ font: `700 ${D ? 12.5 : 10}px var(--ravenof-font-display)`, letterSpacing: 1.5, textTransform: 'uppercase', color: '#93c5fd', background: 'none', border: '1px solid rgba(96,165,250,0.5)', padding: D ? '0 16px' : '5px 9px', minHeight: D ? DT.ctlSm : undefined, cursor: 'pointer' }}>{t('social.open')}</button>
                </div>
              ))}
            </div>
          )}

          {!selFriend ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center" style={{ gap: D ? DT.sp.md : 6, padding: 20 }}>
              <span style={{ fontSize: D ? 36 : 26 }}>🕯</span>
              <p style={{ font: `400 ${D ? DT.fs.body : 12}px var(--ravenof-font-body)`, color: 'var(--ravenof-text-secondary)', maxWidth: D ? 440 : 320, lineHeight: 1.5, margin: 0 }}>
                {friends.length === 0 ? t('social.noFriendsSub') : t('social.pickFriendHint')}
              </p>
            </div>
          ) : (() => {
            const { p, m } = presMeta(selFriend)
            return (
              <>
                {/* pokalbio antraštė */}
                <div className="shrink-0 relative flex items-center" style={{ gap: D ? DT.sp.md : 10, padding: D ? '12px 20px' : '11px 14px', minHeight: D ? 66 : undefined, borderBottom: '1px solid var(--ravenof-border-hairline)' }}>
                  <span className="shrink-0 rounded-full" style={{ width: D ? 11 : 9, height: D ? 11 : 9, background: m.color }} />
                  <span className={D ? 'min-w-0 truncate' : undefined} style={{ font: `700 ${D ? DT.fs.h2 : 15}px var(--ravenof-font-display)`, letterSpacing: 0.5, color: 'var(--ravenof-text-primary)' }}>{selFriend.displayName || selFriend.username}</span>
                  <span className={D ? 'shrink-0' : undefined} style={{ font: `400 ${D ? DT.fs.help : 11.5}px var(--ravenof-font-body)`, color: 'var(--ravenof-text-secondary)' }}>{p === 'offline' ? lastSeenTxt(selFriend) : m.name}</span>
                  <div className="flex-1" />
                  <button onClick={() => void challenge(selFriend)} className="ravenof-press shrink-0" style={{ font: `700 ${D ? 13 : 11}px var(--ravenof-font-display)`, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--ravenof-gold)', background: 'none', border: '1px solid var(--ravenof-border-gold)', padding: D ? '0 18px' : '9px 13px', minHeight: D ? DT.ctl : undefined, cursor: 'pointer' }}>{t('battle.pvp.challengeCta')}</button>
                  <button aria-label={t('social.moreActions')} onClick={(e) => { e.stopPropagation(); playUiClick(); setMenuOpen((v) => !v) }}
                    className="ravenof-iconbtn shrink-0" style={{ width: D ? DT.ctl : 30, height: D ? DT.ctl : 30 }}><MoreVertical className={D ? 'w-5 h-5' : 'w-3.5 h-3.5'} /></button>
                  {menuOpen && (
                    <div className="absolute right-3 top-full mt-1 z-30 overflow-hidden py-1" onClick={(e) => e.stopPropagation()}
                      style={{ minWidth: D ? 230 : 170, background: 'var(--ravenof-bg-elevated)', border: '1px solid var(--ravenof-border-gold)', boxShadow: '0 10px 30px rgba(0,0,0,0.7)' }}>
                      {[
                        { l: t('social.menu.trade'), fn: () => startTrade(selFriend) },
                        { l: chat.prefs.muted.includes(selFriend.userId) ? t('social.menu.unmute') : t('social.menu.mute'), fn: () => chat.toggleMute(selFriend.userId) },
                        { l: selFriend.blockedByMe ? t('social.menu.unblock') : t('social.menu.block'), fn: () => selFriend.blockedByMe ? (async () => { await blockUser(selFriend.userId, false); void reload() })() : setConfirmAct({ kind: 'block', f: selFriend }) },
                        { l: t('social.menu.remove'), fn: () => setConfirmAct({ kind: 'remove', f: selFriend }) },
                      ].map((it) => (
                        <button key={it.l} onClick={() => { playUiClick(); setMenuOpen(false); void it.fn() }}
                          className="block w-full text-left px-3 py-1.5 hover:bg-white/5" style={{ font: `400 ${D ? DT.fs.body : 11.5}px var(--ravenof-font-body)`, color: 'var(--ravenof-text-primary)', background: 'none', border: 0, cursor: 'pointer', minHeight: D ? DT.ctl : undefined, padding: D ? '0 16px' : undefined }}>{it.l}</button>
                      ))}
                    </div>
                  )}
                </div>

                {/* žinutės */}
                <div className="flex-1 min-h-0 overflow-y-auto ravenof-scroll flex flex-col" style={{ gap: D ? DT.sp.sm + 2 : 8, padding: D ? '16px 20px' : '12px 14px' }}>
                  {conv?.msgs == null ? (
                    <p className="text-center py-4" style={{ font: `400 ${D ? DT.fs.help : 11}px var(--ravenof-font-body)`, color: 'var(--ravenof-text-secondary)' }}>{t('common.loading')}</p>
                  ) : conv.msgs.length === 0 ? (
                    <p className="text-center py-4" style={{ font: `400 ${D ? DT.fs.help : 11}px var(--ravenof-font-body)`, color: 'var(--ravenof-text-secondary)' }}>{t('social.chat.firstMessage')}</p>
                  ) : conv.msgs.map((mm) => (
                    <div key={mm.clientId ?? mm.id} className={mm.fromMe ? 'self-end' : 'self-start'} style={{
                      maxWidth: D ? 'min(64%, 640px)' : '72%', padding: D ? '10px 14px' : '9px 13px', font: `400 ${D ? DT.fs.body : 12.5}px var(--ravenof-font-body)`, lineHeight: D ? 1.45 : 1.4, overflowWrap: D ? 'anywhere' : undefined,
                      background: mm.fromMe ? 'rgba(212,163,59,0.13)' : 'var(--ravenof-bg-surface-2)',
                      border: mm.fromMe ? '1px solid var(--ravenof-border-gold)' : '1px solid var(--ravenof-border-strong)',
                      color: 'var(--ravenof-text-primary)', opacity: mm.status === 'sending' ? 0.65 : 1,
                    }}>
                      {mm.body}
                      {mm.status === 'failed' && (
                        <button onClick={() => mm.clientId && void chat.retry(selFriend.userId, mm.clientId)} className="block mt-1" style={{ font: `400 ${D ? DT.fs.label : 10}px var(--ravenof-font-body)`, color: '#c65563', background: 'none', border: 0, cursor: 'pointer', padding: 0 }}>{t('social.chat.sendFailed')}</button>
                      )}
                    </div>
                  ))}
                  <div ref={msgsEndRef} />
                </div>

                {/* įvestis */}
                <div className="shrink-0 flex items-stretch" style={{ gap: D ? DT.sp.md : 8, padding: D ? '12px 20px' : '10px 14px', borderTop: '1px solid var(--ravenof-border-hairline)' }}>
                  <RavenofTextField value={conv?.draft ?? ''} onChange={(e) => chat.setDraft(selFriend.userId, e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void sendMsg() } }}
                    placeholder={t('social.messagePlaceholder')} aria-label={t('social.messagePlaceholder')} className="flex-1" />
                  <button onClick={() => void sendMsg()} disabled={!(conv?.draft ?? '').trim()}
                    className="ravenof-press shrink-0" style={{ font: `800 ${D ? 13 : 12}px var(--ravenof-font-display)`, letterSpacing: 2, textTransform: 'uppercase', minHeight: D ? DT.ctl : undefined, minWidth: D ? 120 : undefined,
                      background: (conv?.draft ?? '').trim() ? 'var(--ravenof-grad-gold)' : 'var(--ravenof-bg-elevated)',
                      color: (conv?.draft ?? '').trim() ? 'var(--ravenof-on-gold)' : '#5e5868',
                      border: 0, padding: '0 20px', cursor: 'pointer', clipPath: 'polygon(6px 0, 100% 0, calc(100% - 6px) 100%, 0 100%)' }}>
                    {t('social.chat.send')}
                  </button>
                </div>
              </>
            )
          })()}
        </div>
      </div>

      {/* ── Patvirtinimai ── */}
      {confirmAct && D && (() => {
        const name = confirmAct.f.displayName || confirmAct.f.username
        const doIt = async () => {
          const a = confirmAct; setConfirmAct(null); playUiClick()
          if (a.kind === 'remove') { await friendRemove(a.f.id); if (a.f.userId === selId) setSelId(null) }
          else await blockUser(a.f.userId, true)
          void reload()
        }
        return (
          <DeskDialog width={480} zIndex={320} onClose={() => setConfirmAct(null)} closeLabel={t('common.close')}
            title={<span style={{ color: '#c65563' }}>{confirmAct.kind === 'remove' ? t('social.confirmRemove', { name }) : t('social.confirmBlock', { name })}</span>}
            ariaLabel={confirmAct.kind === 'remove' ? t('social.confirmRemove', { name }) : t('social.confirmBlock', { name })}
            footer={<>
              <button onClick={() => setConfirmAct(null)} className="rvn-d-btn rvn-d-btn-ghost">{t('common.cancel')}</button>
              <button data-testid="confirm-danger" onClick={doIt} className="rvn-d-btn rvn-d-btn-danger">{confirmAct.kind === 'remove' ? t('social.remove') : t('social.block')}</button>
            </>}>
            <p className="rvn-d-body" style={{ margin: 0, color: 'var(--ravenof-text-secondary)' }}>{confirmAct.kind === 'remove' ? t('social.removeBody') : t('social.blockBody')}</p>
          </DeskDialog>
        )
      })()}
      {confirmAct && !D && (
        <div className="fixed inset-0 z-[320] flex items-center justify-center p-4" style={{ background: 'rgba(4,3,8,0.85)' }} onClick={() => setConfirmAct(null)}>
          <div onClick={(e) => e.stopPropagation()} className="w-[min(360px,92vw)] p-4 text-center" style={{ background: 'var(--ravenof-bg-surface)', border: '1.5px solid rgba(180,68,79,0.6)' }}>
            <p style={{ font: '700 14px var(--ravenof-font-display)', color: '#c65563', margin: 0 }}>
              {confirmAct.kind === 'remove' ? t('social.confirmRemove', { name: confirmAct.f.displayName || confirmAct.f.username }) : t('social.confirmBlock', { name: confirmAct.f.displayName || confirmAct.f.username })}
            </p>
            <p className="mt-1.5" style={{ font: '400 11px var(--ravenof-font-body)', color: 'var(--ravenof-text-secondary)' }}>
              {confirmAct.kind === 'remove' ? t('social.removeBody') : t('social.blockBody')}
            </p>
            <div className="mt-3 flex gap-2">
              <button onClick={() => setConfirmAct(null)} className="ravenof-btn ravenof-btn-secondary flex-1" style={{ minHeight: 36 }}>{t('common.cancel')}</button>
              <button data-testid="confirm-danger" onClick={async () => {
                const a = confirmAct; setConfirmAct(null); playUiClick()
                if (a.kind === 'remove') { await friendRemove(a.f.id); if (a.f.userId === selId) setSelId(null) }
                else await blockUser(a.f.userId, true)
                void reload()
              }} className="ravenof-btn ravenof-btn-destructive flex-1" style={{ minHeight: 36 }}>
                {confirmAct.kind === 'remove' ? t('social.remove') : t('social.block')}
              </button>
            </div>
          </div>
        </div>
      )}

      {tradeId && <TradeWindow tradeId={tradeId} onClose={() => { setTradeId(null); void reload() }} />}
    </div>
  )
}
