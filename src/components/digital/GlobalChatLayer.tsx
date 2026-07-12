'use client'

// ══════════════════════════════════════════════════════════════════════════════
// GlobalChatLayer — Messenger stiliaus plaukiojančios pokalbių galvutės,
// mountinama VIENĄ kartą /digital layout'e (route keitimas neuždaro pokalbių).
//  • Iki 4 galvučių, perteklius → „+N"; stack'as velkamas (pointer, 8px slenkstis,
//    rAF transform), pozicija (kraštas + yPct) persist'inama ir clamp'inama.
//  • Vienas išskleistas langas: istorija, optimistic send + retry, read kvitai,
//    draft'ai, Esc = minimizuoti. Uždaryta galvutė grįžta gavus žinutę (nebent
//    nutildyta). DND (savo) — be garsų ir preview.
//  • KOVOS režimas (pve/pvp/ranked/tutorial/coop): jokio auto-expand — tik
//    badge + trumpas preview; stack'as perkeliamas į viršutinį kairį saugų
//    kampą (exclusion: ranka/end-turn/valdikliai apačioje ir dešinėje).
//  • Realtime: vienas kanalas (INSERT man + UPDATE mano žinutėms → read kvitai).
// ══════════════════════════════════════════════════════════════════════════════
import { useCallback, useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { X, Minus, Send, BellOff, Bell } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useChatStore, PRESENCE_META, type ChatMsg } from '@/lib/social/chatStore'
import { playUiClick } from '@/lib/ui-sound'
import { useT } from '@/lib/i18n/react'
import { formatDate } from '@/lib/i18n/core'

const GOLD = '240,180,41'
const HEAD = 46
const BATTLE_RE = /^\/digital\/(pve|pvp|pvp2v2|ranked|tutorial|coop|campaign)/

function Avatar({ url, name, size, ring }: { url: string | null; name: string; size: number; ring?: string }) {
  const [err, setErr] = useState(false)
  return (
    <span className="relative inline-flex items-center justify-center rounded-full overflow-hidden shrink-0"
      style={{ width: size, height: size, background: 'linear-gradient(160deg,#241a35,#0f0a18)', border: `2px solid ${ring ?? 'rgba(240,180,41,0.55)'}` }}>
      {url && !err
        // eslint-disable-next-line @next/next/no-img-element
        ? <img src={url} alt="" loading="lazy" onError={() => setErr(true)} className="w-full h-full object-cover" />
        : <span style={{ fontSize: size * 0.42, color: 'var(--gold)', fontWeight: 800 }}>{(name || '?').slice(0, 1).toUpperCase()}</span>}
    </span>
  )
}

export function GlobalChatLayer() {
  const t = useT()
  const pathname = usePathname()
  const st = useChatStore()
  const [drag, setDrag] = useState(false)
  const stackRef = useRef<HTMLDivElement | null>(null)
  const dragCtx = useRef<{ x: number; y: number; moved: boolean; startSide: 'left' | 'right'; startY: number } | null>(null)
  const listRef = useRef<HTMLDivElement | null>(null)
  const battle = BATTLE_RE.test(pathname)

  // uid + overview + presence heartbeat papildymas
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      const uid = data.user?.id ?? null
      st.setUid(uid)
      if (uid) void st.loadOverview()
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  useEffect(() => { st.setBattleMode(battle) }, [battle]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Realtime: vienas kanalas visam app ──
  useEffect(() => {
    if (!st.uid) return
    const supabase = createClient()
    const ch = supabase.channel(`rvn-dm-${st.uid}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'friend_messages', filter: `to_id=eq.${st.uid}` }, (payload) => {
        const row = payload.new as { id: string; from_id: string; body: string; created_at: string; client_message_id: string | null }
        const known = useChatStore.getState().convs[row.from_id]
        useChatStore.getState().receiveIncoming(row)
        if (!known) void useChatStore.getState().loadOverview() // nepažįstamas siuntėjas → užsikraunam profilį
        const s = useChatStore.getState()
        if (s.prefs.soundOn && s.selfStatus !== 'dnd' && !s.prefs.muted.includes(row.from_id)) playUiClick()
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'friend_messages', filter: `from_id=eq.${st.uid}` }, (payload) => {
        const row = payload.new as { id: string; read_at: string | null; to_id: string }
        if (row.read_at) useChatStore.getState().receiveReadReceipt(row)
      })
      .subscribe()
    return () => { void supabase.removeChannel(ch) }
  }, [st.uid])

  // preview auto-hide
  useEffect(() => {
    if (!st.preview) return
    const t = setTimeout(() => useChatStore.setState({ preview: null }), Math.max(300, st.preview.until - Date.now()))
    return () => clearTimeout(t)
  }, [st.preview])

  // išskleidus langą — istorija + read
  useEffect(() => {
    if (!st.expandedId) return
    void st.loadHistory(st.expandedId)
    st.markRead(st.expandedId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [st.expandedId])
  // nauja žinutė atidarytame lange → scroll žemyn + read
  const expandedConv = st.expandedId ? st.convs[st.expandedId] : null
  useEffect(() => {
    if (!expandedConv?.msgs?.length) return
    requestAnimationFrame(() => { const el = listRef.current; if (el) el.scrollTop = el.scrollHeight })
    if (st.expandedId && expandedConv.unread > 0 && document.visibilityState === 'visible') st.markRead(st.expandedId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expandedConv?.msgs?.length])

  // Esc → minimizuoti
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape' && useChatStore.getState().expandedId) useChatStore.getState().minimize() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [])

  // ── Stack drag (pointer; tap = atidaryti, >8px = vilkti) ──
  const onHeadPointerDown = useCallback((e: React.PointerEvent, openTarget?: () => void) => {
    const startX = e.clientX, startY = e.clientY
    dragCtx.current = { x: startX, y: startY, moved: false, startSide: useChatStore.getState().prefs.side, startY: useChatStore.getState().prefs.yPct }
    const el = stackRef.current
    let raf = 0
    const move = (ev: PointerEvent) => {
      const d = dragCtx.current; if (!d) return
      const dx = ev.clientX - d.x, dy = ev.clientY - d.y
      if (!d.moved && Math.hypot(dx, dy) < 8) return
      if (!d.moved) { d.moved = true; setDrag(true) }
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => { if (el) el.style.transform = `translate(${dx}px, ${dy}px)` })
    }
    const up = (ev: PointerEvent) => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      cancelAnimationFrame(raf)
      const d = dragCtx.current; dragCtx.current = null
      if (el) el.style.transform = ''
      setDrag(false)
      if (!d?.moved) { openTarget?.(); return }
      // snap prie artimiausio krašto + clamp'inta yPct (normalizuota — išgyvena resize)
      const side: 'left' | 'right' = ev.clientX < window.innerWidth / 2 ? 'left' : 'right'
      const yPct = Math.min(78, Math.max(6, (ev.clientY / window.innerHeight) * 100 - 4))
      useChatStore.getState().setPrefs({ side, yPct })
      playUiClick()
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }, [])

  if (!st.uid || !st.prefs.enabled) return null
  const heads = st.openIds.map((id) => st.convs[id]).filter(Boolean)
  if (heads.length === 0 && !st.preview) return null

  const visible = heads.slice(0, battle ? 3 : 4)
  const extra = heads.length - visible.length
  // kovoje default pozicija — viršus kairė (exclusion: apačia=ranka, dešinė=end-turn/HP)
  const side = battle && st.prefs.yPct > 55 ? 'left' : st.prefs.side
  const topPct = battle ? Math.min(st.prefs.yPct, 40) : st.prefs.yPct
  const posStyle: React.CSSProperties = { position: 'fixed', top: `${topPct}%`, [side]: 'max(8px, env(safe-area-inset-' + side + '))', zIndex: 246 }

  return (
    <div aria-label="Pokalbiai" data-testid="chat-layer">
      {/* ── Galvutės ── */}
      <div ref={stackRef} style={{ ...posStyle, transition: drag ? 'none' : 'top 0.2s' }} className="flex flex-col gap-1.5 select-none" data-testid="chat-stack">
        {visible.map((c) => {
          const muted = st.prefs.muted.includes(c.friend.userId)
          const pm = PRESENCE_META[c.friend.presence] ?? PRESENCE_META.offline
          return (
            <button key={c.friend.userId} data-testid={`chat-head-${c.friend.username}`}
              aria-label={`Pokalbis: ${c.friend.displayName || c.friend.username} (${pm.name})${c.unread ? `, ${c.unread} neskaitytos` : ''}`}
              onPointerDown={(e) => onHeadPointerDown(e, () => {
                playUiClick()
                const s = useChatStore.getState()
                if (s.expandedId === c.friend.userId) s.minimize()
                else { s.openChat(c.friend, !battle); if (battle) useChatStore.setState({ expandedId: c.friend.userId }) }
              })}
              className="relative rvn-press" style={{ width: HEAD, height: HEAD, touchAction: 'none', cursor: 'grab' }}>
              <Avatar url={c.friend.avatar} name={c.friend.username} size={HEAD} ring={pm.color + '99'} />
              <span className="absolute -bottom-0.5 -right-0.5 rounded-full" title={pm.name} aria-hidden
                style={{ width: 13, height: 13, background: pm.color, border: '2px solid #0a0810' }} />
              {c.unread > 0 && (
                <span data-testid="chat-unread" className="absolute -top-1 -right-1 flex items-center justify-center rounded-full font-black"
                  style={{ minWidth: 18, height: 18, padding: '0 4px', fontSize: 10, background: '#ef4444', color: '#fff', border: '1.5px solid #0a0810' }}>{c.unread}</span>
              )}
              {muted && <span className="absolute -top-1 -left-1 flex items-center justify-center rounded-full" style={{ width: 16, height: 16, background: '#1f1830', border: '1px solid rgba(255,255,255,0.25)' }}><BellOff className="w-2.5 h-2.5" style={{ color: '#94a3b8' }} /></span>}
            </button>
          )
        })}
        {extra > 0 && (
          <span className="flex items-center justify-center rounded-full font-black" style={{ width: HEAD, height: HEAD, fontSize: 13, background: 'rgba(20,16,30,0.95)', border: `2px solid rgba(${GOLD},0.5)`, color: 'var(--gold)' }}>+{extra}</span>
        )}
      </div>

      {/* ── Žinutės preview (meniu + kova; ne pilnas langas) ── */}
      {st.preview && (() => {
        const c = st.convs[st.preview!.friendId]
        if (!c) return null
        return (
          <button data-testid="chat-preview" onClick={() => { useChatStore.setState({ preview: null }); st.openChat(c.friend, !battle) }}
            className="fixed rounded-xl px-3 py-2 text-left"
            style={{ top: `calc(${topPct}% - 6px)`, [side === 'left' ? 'left' : 'right']: HEAD + 18, zIndex: 246, maxWidth: 240,
              background: 'linear-gradient(160deg, rgba(23,17,31,0.98), rgba(10,8,16,0.98))', border: `1px solid rgba(${GOLD},0.45)`, boxShadow: '0 8px 26px rgba(0,0,0,0.6)' }}>
            <span className="block truncate font-bold" style={{ fontSize: 11, color: 'var(--gold)' }}>{c.friend.displayName || c.friend.username}</span>
            <span className="block truncate" style={{ fontSize: 11, color: '#e8dfc8' }}>{st.preview!.text}</span>
          </button>
        )
      })()}

      {/* ── Išskleistas langas ── */}
      {expandedConv && (
        <div data-testid="chat-window" role="dialog" aria-label={`Pokalbis su ${expandedConv.friend.displayName || expandedConv.friend.username}`}
          className="fixed flex flex-col overflow-hidden"
          style={{ top: `${Math.min(topPct, 46)}%`, [side === 'left' ? 'left' : 'right']: HEAD + 18, zIndex: 247,
            width: 'min(320px, 78vw)', height: battle ? 'min(300px, 62vh)' : 'min(400px, 66vh)',
            maxHeight: `calc(96vh - ${Math.min(topPct, 46)}vh)`, borderRadius: 16,
            background: 'linear-gradient(165deg, rgba(22,16,33,0.99), rgba(9,7,14,0.99))', border: `1.5px solid rgba(${GOLD},0.4)`, boxShadow: '0 16px 48px rgba(0,0,0,0.75)' }}>
          {/* header */}
          <div className="shrink-0 flex items-center gap-2 px-2.5 py-2" style={{ borderBottom: `1px solid rgba(${GOLD},0.18)`, background: 'rgba(10,8,16,0.6)' }}>
            <Avatar url={expandedConv.friend.avatar} name={expandedConv.friend.username} size={28} ring={(PRESENCE_META[expandedConv.friend.presence] ?? PRESENCE_META.offline).color + '99'} />
            <span className="min-w-0 flex-1">
              <span className="block truncate font-bold" style={{ fontSize: 12.5, color: '#f3ead3' }}>{expandedConv.friend.displayName || expandedConv.friend.username}</span>
              <span className="block truncate" style={{ fontSize: 9.5, color: (PRESENCE_META[expandedConv.friend.presence] ?? PRESENCE_META.offline).color }}>{(PRESENCE_META[expandedConv.friend.presence] ?? PRESENCE_META.offline).name}{battle ? ` · ${t('social.chat.battleOngoing')}` : ''}</span>
            </span>
            <button aria-label={st.prefs.muted.includes(expandedConv.friend.userId) ? t('social.chat.unmuteSound') : t('social.chat.mute')} onClick={() => { playUiClick(); st.toggleMute(expandedConv.friend.userId) }} className="p-1.5" style={{ color: '#94a3b8' }}>
              {st.prefs.muted.includes(expandedConv.friend.userId) ? <BellOff className="w-3.5 h-3.5" /> : <Bell className="w-3.5 h-3.5" />}
            </button>
            <button aria-label={t('social.chat.minimize')} data-testid="chat-min" onClick={() => { playUiClick(); st.minimize() }} className="p-1.5" style={{ color: '#94a3b8' }}><Minus className="w-4 h-4" /></button>
            <button aria-label={t('common.close')} data-testid="chat-close" onClick={() => { playUiClick(); st.closeHead(expandedConv.friend.userId) }} className="p-1.5" style={{ color: '#94a3b8' }}><X className="w-4 h-4" /></button>
          </div>
          {/* žinutės */}
          <div ref={listRef} className="flex-1 min-h-0 overflow-y-auto px-2.5 py-2 flex flex-col gap-1.5">
            {expandedConv.msgs === null && <p className="text-center my-auto" style={{ fontSize: 11, color: 'var(--text-muted)' }}>{t('common.loading')}</p>}
            {expandedConv.msgs?.length === 0 && <p className="text-center my-auto" style={{ fontSize: 11, color: 'var(--text-muted)' }}>{t('social.chat.firstMessage')}</p>}
            {(expandedConv.msgs ?? []).map((m: ChatMsg, i: number, arr: ChatMsg[]) => {
              const newDay = i === 0 || new Date(m.createdAt).toDateString() !== new Date(arr[i - 1].createdAt).toDateString()
              const lastMineRead = m.fromMe && m.readAt && !arr.slice(i + 1).some((x) => x.fromMe)
              return (
                <div key={m.clientId ?? m.id} className="flex flex-col">
                  {newDay && <span className="self-center my-1 px-2 rounded-full" style={{ fontSize: 8.5, color: 'var(--text-muted)', background: 'rgba(255,255,255,0.05)' }}>{formatDate(m.createdAt)}</span>}
                  <button disabled={m.status !== 'failed'} onClick={() => m.clientId && st.retry(expandedConv.friend.userId, m.clientId)}
                    className={'max-w-[80%] px-2.5 py-1.5 rounded-2xl text-left ' + (m.fromMe ? 'self-end' : 'self-start')}
                    style={{ fontSize: 12.5, lineHeight: 1.35, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                      opacity: m.status === 'sending' ? 0.6 : 1,
                      background: m.status === 'failed' ? 'rgba(220,38,38,0.18)' : m.fromMe ? `rgba(${GOLD},0.16)` : 'rgba(255,255,255,0.06)',
                      border: '1px solid ' + (m.status === 'failed' ? 'rgba(220,38,38,0.5)' : m.fromMe ? `rgba(${GOLD},0.3)` : 'rgba(255,255,255,0.1)'),
                      color: '#efe7d3', cursor: m.status === 'failed' ? 'pointer' : 'default' }}>
                    {m.body}
                    {m.status === 'failed' && <span className="block" style={{ fontSize: 9, color: '#fca5a5' }}>{t('social.chat.sendFailed')}</span>}
                  </button>
                  {lastMineRead && <span className="self-end" style={{ fontSize: 8.5, color: 'var(--text-muted)' }}>{t('social.chat.read')}</span>}
                </div>
              )
            })}
          </div>
          {/* composer */}
          <div className="shrink-0 flex items-center gap-1.5 px-2 py-2" style={{ borderTop: `1px solid rgba(${GOLD},0.18)`, paddingBottom: 'max(8px, env(safe-area-inset-bottom))' }}>
            <input value={expandedConv.draft} onChange={(e) => st.setDraft(expandedConv.friend.userId, e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && expandedConv.draft.trim()) { void st.send(expandedConv.friend.userId, expandedConv.draft) } }}
              placeholder={t('social.chat.placeholder')} maxLength={500} aria-label={t('social.chat.messageAria')} data-testid="chat-input"
              className="flex-1 min-w-0 rounded-xl px-3 outline-none" style={{ height: 34, fontSize: 12.5, background: 'rgba(8,6,13,0.85)', border: `1px solid rgba(${GOLD},0.25)`, color: '#f3ead3' }} />
            <button aria-label={t('social.chat.send')} data-testid="chat-send" disabled={!expandedConv.draft.trim()}
              onClick={() => void st.send(expandedConv.friend.userId, expandedConv.draft)}
              className="rvn-press flex items-center justify-center rounded-xl disabled:opacity-40"
              style={{ width: 38, height: 34, background: `rgba(${GOLD},0.18)`, border: `1px solid rgba(${GOLD},0.5)`, color: 'var(--gold)' }}>
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
