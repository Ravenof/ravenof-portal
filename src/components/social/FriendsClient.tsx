'use client'

// ══════════════════════════════════════════════════════════════════════════════
// Draugai v2 — landscape socialinis hub'as (3 zonos):
//  KAIRĖ: pridėti + užklausos. CENTRAS: draugų sąrašas (avatarai, presence,
//  lygis, unread, paieška, filtras, More meniu su patvirtinimais).
//  DEŠINĖ: veikla — iššūkiai, mainai, paskutiniai pokalbiai (be tuščios zonos).
//  Viršuje — savo presence pasirinkimas (Online/Pasitraukęs/Netrukdyti/Nematomas).
//  Žinutės atidaro GLOBALŲ chat sluoksnį (galvutės lieka visame app).
// ══════════════════════════════════════════════════════════════════════════════
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { UserPlus, Swords, Check, X, Repeat, MessageCircle, MoreVertical } from 'lucide-react'
import { friendRequest, friendRespond, friendRemove, friendsList, challengeCreate, challengeIncoming, challengeAccept, challengeCancel, randMatchCode, setPresence, blockUser, type Friend, type Challenge, type SelfPresence } from '@/lib/social'
import { tradeCreate, tradeIncoming, tradeAccept, type TradeIncoming } from '@/lib/trade'
import { TradeWindow } from './TradeWindow'
import { RavenofButton } from '@/components/ui/RavenofButton'
import { EmptyState } from '@/components/digital/ui/HubKit'
import { useChatStore, PRESENCE_META } from '@/lib/social/chatStore'
import { getLevelProgress } from '@/lib/gamification/levels'
import { playUiClick, playSuccess } from '@/lib/ui-sound'
import { useT } from '@/lib/i18n/react'

const GOLD = '240,180,41'
type PresenceFilter = 'all' | 'online' | 'offline'

function Avatar({ url, name, size, presence }: { url: string | null; name: string; size: number; presence?: string }) {
  const [err, setErr] = useState(false)
  const pm = presence ? (PRESENCE_META[presence as keyof typeof PRESENCE_META] ?? PRESENCE_META.offline) : null
  return (
    <span className="relative shrink-0">
      <span className="inline-flex items-center justify-center rounded-full overflow-hidden" style={{ width: size, height: size, background: 'linear-gradient(160deg,#241a35,#0f0a18)', border: `1.5px solid rgba(${GOLD},0.4)` }}>
        {url && !err
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={url} alt="" loading="lazy" onError={() => setErr(true)} className="w-full h-full object-cover" />
          : <span style={{ fontSize: size * 0.42, color: 'var(--gold)', fontWeight: 800 }}>{(name || '?').slice(0, 1).toUpperCase()}</span>}
      </span>
      {pm && <span className="absolute -bottom-0.5 -right-0.5 rounded-full" title={pm.name} style={{ width: 11, height: 11, background: pm.color, border: '2px solid #0d0a14' }} />}
    </span>
  )
}

const SELF_STATUS: { v: SelfPresence; labelKey: string; color: string; hintKey: string }[] = [
  { v: 'auto',   labelKey: 'social.presence.online',  color: '#34d399', hintKey: 'social.selfStatus.autoHint' },
  { v: 'away',   labelKey: 'social.presence.away',    color: '#fbbf24', hintKey: 'social.selfStatus.awayHint' },
  { v: 'dnd',    labelKey: 'social.presence.dnd',     color: '#ef4444', hintKey: 'social.selfStatus.dndHint' },
  { v: 'hidden', labelKey: 'social.presence.hidden',  color: '#64748b', hintKey: 'social.selfStatus.hiddenHint' },
]

export function FriendsClient() {
  const t = useT()
  const router = useRouter()
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
  const [menuFor, setMenuFor] = useState<string | null>(null)
  const [confirmAct, setConfirmAct] = useState<{ kind: 'remove' | 'block'; f: Friend } | null>(null)
  const [selfStatus, setSelfStatusUi] = useState<SelfPresence>('auto')
  const msgTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const flash = (t: string) => { setMsg(t); if (msgTimer.current) clearTimeout(msgTimer.current); msgTimer.current = setTimeout(() => setMsg(null), 4000) }

  const reload = useCallback(async () => {
    const [fl, ch, tr] = await Promise.all([friendsList(), challengeIncoming(), tradeIncoming()])
    setFriends(fl.friends); setPending(fl.pending); setChallenges(ch); setTrades(tr)
    if (fl.me?.presenceStatus) setSelfStatusUi(fl.me.presenceStatus)
  }, [])
  useEffect(() => { void reload(); const t = setInterval(() => { void reload() }, 15_000); return () => clearInterval(t) }, [reload])
  useEffect(() => { void chat.loadOverview() }, []) // eslint-disable-line react-hooks/exhaustive-deps

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
  const openChat = (f: Friend) => {
    playUiClick()
    chat.openChat({ userId: f.userId, username: f.username, displayName: f.displayName, avatar: f.avatar, presence: f.presence ?? (f.online ? 'online' : 'offline') })
  }
  const changeSelf = (v: SelfPresence) => { playUiClick(); setSelfStatusUi(v); chat.setSelfStatus(v); void setPresence(v) }

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

  const recentConvs = useMemo(() => Object.values(chat.convs).slice(0, 6), [chat.convs])
  const onlineCount = friends.filter((f) => f.presence && f.presence !== 'offline').length

  const PANEL: React.CSSProperties = { background: 'linear-gradient(160deg, rgba(20,16,28,0.96), rgba(9,7,12,0.98))', border: '1px solid rgba(96,165,250,0.25)', boxShadow: 'inset 0 0 40px rgba(0,0,0,0.5)' }
  const secTitle = (txt: string, col = 'var(--gold)') => (
    <p className="shrink-0 text-sm font-bold mb-2" style={{ color: col, fontFamily: 'var(--rvn-font-display)' }}>{txt}</p>
  )
  const lastSeenTxt = (f: Friend) => {
    if (!f.lastSeen) return t('social.seenLongAgo')
    const m = Math.max(1, Math.round((Date.now() - new Date(f.lastSeen).getTime()) / 60000))
    return m < 60 ? t('social.seenMin', { count: m }) : m < 1440 ? t('social.seenHours', { count: Math.round(m / 60) }) : t('social.seenDays', { count: Math.round(m / 1440) })
  }

  return (
    <div className="h-full min-h-0 flex flex-col gap-2" onClick={() => setMenuFor(null)}>
      {/* ── Savo presence juosta ── */}
      <div className="shrink-0 flex items-center gap-2 flex-wrap">
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{t('social.yourStatus')}</span>
        {SELF_STATUS.map((o) => (
          <button key={o.v} onClick={() => changeSelf(o.v)} title={t(o.hintKey)} data-testid={`presence-${o.v}`}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full font-bold"
            style={{ fontSize: 10.5, background: selfStatus === o.v ? o.color + '26' : 'rgba(255,255,255,0.04)', border: `1px solid ${selfStatus === o.v ? o.color : 'rgba(255,255,255,0.12)'}`, color: selfStatus === o.v ? o.color : 'var(--text-secondary)' }}>
            <span className="rounded-full" style={{ width: 7, height: 7, background: o.color }} />{t(o.labelKey)}
          </button>
        ))}
        {selfStatus === 'hidden' && <span style={{ fontSize: 10, color: '#94a3b8' }}>{t('social.hiddenNote')}</span>}
      </div>

      <div className="flex-1 min-h-0 grid gap-2" style={{ gridTemplateColumns: 'minmax(185px,0.9fr) minmax(0,2fr) minmax(185px,0.95fr)', gridTemplateRows: 'minmax(0, 1fr)' }}>
        {/* ── KAIRĖ ── */}
        <section className="rounded-2xl flex flex-col min-h-0 overflow-hidden p-3" style={PANEL}>
          {secTitle(t('social.addFriend'))}
          <div className="shrink-0 flex flex-col gap-2">
            <input id="friend-uname-input" value={uname} onChange={(e) => setUname(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} placeholder={t('social.usernamePlaceholder')}
              className="w-full px-3 py-2 rounded-lg text-sm outline-none" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--bg-border)', color: 'var(--text-primary)' }} />
            <RavenofButton variant="gold" size="md" onClick={add}><UserPlus className="w-4 h-4" /> {t('social.add')}</RavenofButton>
            {msg && <p role="status" className="text-xs" style={{ color: msg.startsWith('✓') ? '#4ade80' : '#fca5a5' }}>{msg}</p>}
          </div>
          <div className="mt-3 flex-1 min-h-0 overflow-y-auto">
            {secTitle(`${t('social.requests')}${pending.length ? ` (${pending.length})` : ''}`)}
            {pending.length === 0 ? (
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{t('social.noNewRequests')}</p>
            ) : (
              <div className="space-y-1.5">
                {pending.map((f) => (
                  <div key={f.id} className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <Avatar url={f.avatar} name={f.username} size={26} />
                    <span className="flex-1 min-w-0 text-sm truncate" title={f.displayName || f.username} style={{ color: 'var(--text-primary)' }}>{f.displayName || f.username}</span>
                    <RavenofButton variant="gold" size="sm" onClick={() => respond(f.id, true)}><Check className="w-3 h-3" /></RavenofButton>
                    <RavenofButton variant="muted" size="sm" onClick={() => respond(f.id, false)}><X className="w-3 h-3" /></RavenofButton>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* ── CENTRAS ── */}
        <section className="rounded-2xl flex flex-col min-h-0 overflow-hidden p-3" style={PANEL}>
          <div className="shrink-0 flex items-center gap-2 mb-2">
            {secTitle(t('social.friendsCount', { online: onlineCount, total: friends.length }))}
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('social.searchPlaceholder')} aria-label={t('social.searchAria')}
              className="ml-auto w-[130px] px-2.5 py-1.5 rounded-lg text-xs outline-none" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--bg-border)', color: 'var(--text-primary)' }} />
            <select value={filter} onChange={(e) => setFilter(e.target.value as PresenceFilter)} aria-label={t('social.filterAria')}
              className="px-2 py-1.5 rounded-lg text-xs" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--bg-border)', color: 'var(--text-primary)' }}>
              <option value="all">{t('social.filterAll')}</option><option value="online">{t('social.filterOnline')}</option><option value="offline">{t('social.filterOffline')}</option>
            </select>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto">
            {friends.length === 0 ? (
              <div className="h-full flex items-center justify-center">
                <EmptyState icon="👥" title={t('social.noFriendsTitle')} sub={t('social.noFriendsSub')} accent="96,165,250"
                  ctaLabel={t('social.addFriendCta')} onCta={() => { (document.getElementById('friend-uname-input') as HTMLInputElement | null)?.focus() }} />
              </div>
            ) : shown.length === 0 ? (
              <p className="text-xs text-center py-8" style={{ color: 'var(--text-muted)' }}>{t('social.noneFound')}</p>
            ) : (
              <div className="space-y-1.5">
                {shown.map((f) => {
                  const pres = f.presence ?? (f.online ? 'online' : 'offline')
                  const pm = PRESENCE_META[pres] ?? PRESENCE_META.offline
                  const lvl = getLevelProgress(f.xp ?? 0).level
                  return (
                    <div key={f.id} data-testid={`friend-row-${f.username}`} className="relative flex items-center gap-2 px-2.5 py-1.5 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(96,165,250,0.18)' }}>
                      <Avatar url={f.avatar} name={f.username} size={34} presence={pres} />
                      <span className="flex-1 min-w-0">
                        <span className="block text-sm font-semibold truncate" title={`${f.displayName || f.username} (@${f.username})`} style={{ color: 'var(--text-primary)' }}>{f.displayName || f.username}</span>
                        <span className="block truncate" style={{ fontSize: 10, color: 'var(--text-muted)' }}>@{f.username} · {t('social.lvl', { lvl })} · <span style={{ color: pm.color }}>{pres === 'offline' ? lastSeenTxt(f) : pm.name}</span>{f.blockedByMe ? ` ${t('social.blockedTag')}` : ''}</span>
                      </span>
                      {(f.unread ?? 0) > 0 && (
                        <span className="shrink-0 flex items-center justify-center rounded-full font-black" style={{ minWidth: 18, height: 18, padding: '0 4px', fontSize: 10, background: '#ef4444', color: '#fff' }}>{f.unread}</span>
                      )}
                      <RavenofButton variant="gold" size="sm" onClick={() => openChat(f)} aria-label={t('social.writeTo', { name: f.username })}><MessageCircle className="w-3.5 h-3.5" /> {t('social.message')}</RavenofButton>
                      <button aria-label={t('social.moreActions')} onClick={(e) => { e.stopPropagation(); playUiClick(); setMenuFor(menuFor === f.id ? null : f.id) }}
                        className="shrink-0 p-1.5 rounded-lg" style={{ border: '1px solid rgba(255,255,255,0.12)', color: 'var(--text-secondary)' }}><MoreVertical className="w-3.5 h-3.5" /></button>
                      {menuFor === f.id && (
                        <div className="absolute right-1 top-full mt-1 z-30 rounded-xl overflow-hidden py-1" onClick={(e) => e.stopPropagation()}
                          style={{ minWidth: 170, background: 'linear-gradient(160deg,#1a1426,#0c0913)', border: `1px solid rgba(${GOLD},0.35)`, boxShadow: '0 10px 30px rgba(0,0,0,0.7)' }}>
                          {[
                            { l: t('social.menu.challenge'), fn: () => challenge(f) },
                            { l: t('social.menu.trade'), fn: () => startTrade(f) },
                            { l: chat.prefs.muted.includes(f.userId) ? t('social.menu.unmute') : t('social.menu.mute'), fn: () => chat.toggleMute(f.userId) },
                            { l: f.blockedByMe ? t('social.menu.unblock') : t('social.menu.block'), fn: () => f.blockedByMe ? (async () => { await blockUser(f.userId, false); void reload() })() : setConfirmAct({ kind: 'block', f }) },
                            { l: t('social.menu.remove'), fn: () => setConfirmAct({ kind: 'remove', f }) },
                          ].map((it) => (
                            <button key={it.l} onClick={() => { playUiClick(); setMenuFor(null); void it.fn() }}
                              className="block w-full text-left px-3 py-1.5 hover:bg-white/5" style={{ fontSize: 11.5, color: '#e8dfc8' }}>{it.l}</button>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </section>

        {/* ── DEŠINĖ: veikla ── */}
        <section className="rounded-2xl flex flex-col min-h-0 overflow-hidden p-3" style={PANEL}>
          <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-3">
            {challenges.length > 0 && (
              <div>
                {secTitle(t('social.challengesForYou'), '#fdba74')}
                <div className="space-y-1.5">
                  {challenges.map((c) => (
                    <div key={c.id} className="px-2 py-2 rounded-lg" style={{ background: 'rgba(251,146,60,0.08)', border: '1px solid rgba(251,146,60,0.4)' }}>
                      <p className="text-xs mb-1.5" style={{ color: 'var(--text-primary)' }}>{t('social.invitesToBattle', { name: c.displayName || c.username })}</p>
                      <div className="flex items-center gap-1.5">
                        <RavenofButton variant="gold" size="sm" onClick={() => accept(c)}><Swords className="w-3 h-3" /> {t('social.accept')}</RavenofButton>
                        <RavenofButton variant="muted" size="sm" onClick={async () => { playUiClick(); await challengeCancel(c.id); void reload() }}><X className="w-3 h-3" /></RavenofButton>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {trades.length > 0 && (
              <div>
                {secTitle(t('social.tradeOffers'), '#93c5fd')}
                <div className="space-y-1.5">
                  {trades.map((tr) => (
                    <div key={tr.id} className="px-2 py-2 rounded-lg" style={{ background: 'rgba(96,165,250,0.08)', border: '1px solid rgba(96,165,250,0.4)' }}>
                      <p className="text-xs mb-1.5" style={{ color: 'var(--text-primary)' }}>{t('social.wantsToTrade', { name: tr.displayName || tr.username })}</p>
                      <RavenofButton variant="gold" size="sm" onClick={async () => { await tradeAccept(tr.id); setTradeId(tr.id); void reload() }}><Repeat className="w-3 h-3" /> {t('social.open')}</RavenofButton>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div>
              {secTitle(t('social.recentChats'), '#c4b5fd')}
              {recentConvs.length === 0 ? (
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{t('social.noChats')}</p>
              ) : (
                <div className="space-y-1">
                  {recentConvs.map((c) => (
                    <button key={c.friend.userId} onClick={() => { playUiClick(); chat.openChat(c.friend) }}
                      className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left hover:bg-white/5" style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
                      <Avatar url={c.friend.avatar} name={c.friend.username} size={24} presence={c.friend.presence} />
                      <span className="flex-1 min-w-0 text-xs truncate" style={{ color: 'var(--text-primary)' }}>{c.friend.displayName || c.friend.username}</span>
                      {c.unread > 0 && <span className="shrink-0 rounded-full font-black flex items-center justify-center" style={{ minWidth: 16, height: 16, fontSize: 9, background: '#ef4444', color: '#fff' }}>{c.unread}</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {challenges.length === 0 && trades.length === 0 && (
              <div className="mt-auto text-center py-2">
                <span style={{ fontSize: 22 }}>🕯</span>
                <p style={{ fontSize: 10, color: 'var(--text-muted)', lineHeight: 1.5 }}>{t('social.calm')}</p>
              </div>
            )}
          </div>
        </section>
      </div>

      {/* ── Patvirtinimai ── */}
      {confirmAct && (
        <div className="fixed inset-0 z-[320] flex items-center justify-center p-4" style={{ background: 'rgba(4,3,8,0.85)' }} onClick={() => setConfirmAct(null)}>
          <div onClick={(e) => e.stopPropagation()} className="w-[min(360px,92vw)] rounded-2xl p-4 text-center" style={{ background: 'linear-gradient(160deg,#17111f,#0a0810)', border: '1.5px solid rgba(239,68,68,0.5)' }}>
            <p className="font-bold" style={{ fontSize: 14, color: '#fca5a5', fontFamily: 'var(--rvn-font-display)' }}>
              {confirmAct.kind === 'remove' ? t('social.confirmRemove', { name: confirmAct.f.displayName || confirmAct.f.username }) : t('social.confirmBlock', { name: confirmAct.f.displayName || confirmAct.f.username })}
            </p>
            <p className="mt-1.5" style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
              {confirmAct.kind === 'remove' ? t('social.removeBody') : t('social.blockBody')}
            </p>
            <div className="mt-3 flex gap-2">
              <button onClick={() => setConfirmAct(null)} className="flex-1 py-2 rounded-xl text-xs font-bold" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', color: '#c9bfa8' }}>{t('common.cancel')}</button>
              <button data-testid="confirm-danger" onClick={async () => {
                const a = confirmAct; setConfirmAct(null); playUiClick()
                if (a.kind === 'remove') await friendRemove(a.f.id)
                else await blockUser(a.f.userId, true)
                void reload()
              }} className="flex-1 py-2 rounded-xl text-xs font-extrabold" style={{ background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.6)', color: '#fca5a5' }}>
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
