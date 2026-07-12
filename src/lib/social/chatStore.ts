// ══════════════════════════════════════════════════════════════════════════════
// Globalus pokalbių store (zustand) — VIENAS visam /digital app'ui.
// Mountinamas per GlobalChatLayer layout'e: route keitimas NEuždaro pokalbių,
// nepraranda draft'ų ir nereconnect'ina. Realtime: vienas postgres_changes
// kanalas (INSERT to_id=aš — naujos žinutės; UPDATE from_id=aš — read kvitai).
// Optimistic send su clientMessageId (idempotencija DB pusėje) + retry.
// ══════════════════════════════════════════════════════════════════════════════
import { create } from 'zustand'
import { createClient } from '@/lib/supabase/client'
import { t } from '@/lib/i18n/core'

export type Presence = 'online' | 'offline' | 'away' | 'dnd'
export const PRESENCE_META: Record<Presence | 'hidden', { get name(): string; color: string }> = {
  online:  { get name() { return t('social.presence.online') },  color: '#34d399' },
  away:    { get name() { return t('social.presence.away') },    color: '#fbbf24' },
  dnd:     { get name() { return t('social.presence.dnd') },     color: '#ef4444' },
  offline: { get name() { return t('social.presence.offline') }, color: '#64748b' },
  hidden:  { get name() { return t('social.presence.hidden') },  color: '#64748b' },
}

export type ChatFriendInfo = { userId: string; username: string; displayName: string | null; avatar: string | null; presence: Presence }
export type ChatMsg = { id: string; clientId?: string | null; fromMe: boolean; body: string; createdAt: string; readAt?: string | null; status?: 'sending' | 'sent' | 'failed' }
export type Conv = { friend: ChatFriendInfo; msgs: ChatMsg[] | null; unread: number; draft: string }

type ChatUiPrefs = { side: 'left' | 'right'; yPct: number; soundOn: boolean; previewsOn: boolean; enabled: boolean; muted: string[] }
const DEF_PREFS: ChatUiPrefs = { side: 'right', yPct: 30, soundOn: true, previewsOn: true, enabled: true, muted: [] }

function loadJson<T>(k: string, d: T): T {
  try {
    const r = localStorage.getItem(k)
    if (!r) return d
    const v = JSON.parse(r) as unknown
    // KRITIŠKA: masyvo default'ui grąžinam TIK masyvą (object spread masyvą paverstų
    // objektu -> "openIds is not iterable" crash antrame app paleidime)
    if (Array.isArray(d)) return (Array.isArray(v) ? v : d) as T
    if (v && typeof v === 'object' && !Array.isArray(v)) return { ...d, ...(v as object) } as T
    return d
  } catch { return d }
}
function saveJson(k: string, v: unknown) { try { localStorage.setItem(k, JSON.stringify(v)) } catch { /* */ } }

type ChatState = {
  uid: string | null
  convs: Record<string, Conv>
  openIds: string[]          // chat heads (tvarka)
  expandedId: string | null  // vienas išskleistas langas
  prefs: ChatUiPrefs
  selfStatus: 'auto' | 'away' | 'dnd' | 'hidden'
  battleMode: boolean        // kovoje: tik kompaktiški preview, jokio auto-expand
  preview: { friendId: string; text: string; until: number } | null
  setUid: (uid: string | null) => void
  setBattleMode: (on: boolean) => void
  setPrefs: (p: Partial<ChatUiPrefs>) => void
  setSelfStatus: (s: 'auto' | 'away' | 'dnd' | 'hidden') => void
  openChat: (f: ChatFriendInfo, expand?: boolean) => void
  minimize: () => void
  closeHead: (friendId: string) => void
  toggleMute: (friendId: string) => void
  setDraft: (friendId: string, v: string) => void
  loadHistory: (friendId: string) => Promise<void>
  loadOverview: () => Promise<void>
  send: (friendId: string, body: string) => Promise<void>
  retry: (friendId: string, clientId: string) => Promise<void>
  receiveIncoming: (row: { id: string; from_id: string; body: string; created_at: string; client_message_id: string | null }) => void
  receiveReadReceipt: (row: { id: string; read_at: string | null; to_id: string }) => void
  markRead: (friendId: string) => void
}

export const useChatStore = create<ChatState>((set, get) => ({
  uid: null,
  convs: {},
  openIds: typeof window !== 'undefined' ? loadJson<string[]>('rvn-chat-open', []) : [],
  expandedId: null,
  prefs: typeof window !== 'undefined' ? loadJson('rvn-chat-ui', DEF_PREFS) : DEF_PREFS,
  selfStatus: 'auto',
  battleMode: false,
  preview: null,

  setUid: (uid) => set({ uid }),
  setBattleMode: (on) => set((s) => (s.battleMode === on ? s : { battleMode: on, expandedId: on ? null : s.expandedId })),
  setPrefs: (p) => set((s) => { const prefs = { ...s.prefs, ...p }; saveJson('rvn-chat-ui', prefs); return { prefs } }),
  setSelfStatus: (st) => { set({ selfStatus: st }); void createClient().rpc('rvn_set_presence', { p_status: st }).then(() => {}, () => {}) },

  openChat: (f, expand = true) => set((s) => {
    const convs = s.convs[f.userId] ? { ...s.convs, [f.userId]: { ...s.convs[f.userId], friend: f } } : { ...s.convs, [f.userId]: { friend: f, msgs: null, unread: 0, draft: loadJson<Record<string, string>>('rvn-chat-drafts', {})[f.userId] ?? '' } }
    const openIds = s.openIds.includes(f.userId) ? s.openIds : [...s.openIds, f.userId].slice(-4)
    saveJson('rvn-chat-open', openIds)
    return { convs, openIds, expandedId: expand && !s.battleMode ? f.userId : s.expandedId }
  }),
  minimize: () => set({ expandedId: null }),
  closeHead: (fid) => set((s) => {
    const openIds = s.openIds.filter((x) => x !== fid)
    saveJson('rvn-chat-open', openIds)
    return { openIds, expandedId: s.expandedId === fid ? null : s.expandedId }
  }),
  toggleMute: (fid) => set((s) => {
    const muted = s.prefs.muted.includes(fid) ? s.prefs.muted.filter((x) => x !== fid) : [...s.prefs.muted, fid]
    const prefs = { ...s.prefs, muted }; saveJson('rvn-chat-ui', prefs); return { prefs }
  }),
  setDraft: (fid, v) => set((s) => {
    const c = s.convs[fid]; if (!c) return s
    const drafts = loadJson<Record<string, string>>('rvn-chat-drafts', {}); drafts[fid] = v; saveJson('rvn-chat-drafts', drafts)
    return { convs: { ...s.convs, [fid]: { ...c, draft: v } } }
  }),

  loadHistory: async (fid) => {
    const supabase = createClient()
    const { data } = await supabase.rpc('rvn_conversation', { p_friend: fid, p_limit: 80 })
    const rows = (data as { id: string; fromMe: boolean; body: string; createdAt: string; readAt?: string | null; clientId?: string | null }[] | null) ?? []
    set((s) => {
      const c = s.convs[fid]; if (!c) return s
      // vietiniai sending/failed neprarandami (dedup pagal clientId/id)
      const seen = new Set(rows.map((r) => r.clientId ?? r.id))
      const local = (c.msgs ?? []).filter((m) => m.status && m.status !== 'sent' && !seen.has(m.clientId ?? m.id))
      return { convs: { ...s.convs, [fid]: { ...c, msgs: [...rows.map((r) => ({ ...r, status: 'sent' as const })), ...local] } } }
    })
  },

  loadOverview: async () => {
    const supabase = createClient()
    const { data } = await supabase.rpc('rvn_dm_overview')
    const rows = (data as { friendId: string; username: string; displayName: string | null; avatar: string | null; presence: Presence; unread: number }[] | null) ?? []
    set((s) => {
      const convs = { ...s.convs }
      let openIds = Array.isArray(s.openIds) ? [...s.openIds] : []
      for (const r of rows) {
        const f: ChatFriendInfo = { userId: r.friendId, username: r.username, displayName: r.displayName, avatar: r.avatar, presence: r.presence }
        convs[r.friendId] = convs[r.friendId]
          ? { ...convs[r.friendId], friend: f, unread: r.unread }
          : { friend: f, msgs: null, unread: r.unread, draft: loadJson<Record<string, string>>('rvn-chat-drafts', {})[r.friendId] ?? '' }
        // neperskaitytos žinutės → galvutė atsiranda (nebent nutildyta)
        if (r.unread > 0 && !openIds.includes(r.friendId) && !s.prefs.muted.includes(r.friendId)) openIds = [...openIds, r.friendId].slice(-4)
      }
      // atkurtos galvutės iš localStorage be duomenų — pašalinam nepažįstamas
      openIds = openIds.filter((id) => convs[id])
      saveJson('rvn-chat-open', openIds)
      return { convs, openIds }
    })
  },

  send: async (fid, body) => {
    const text = body.trim().slice(0, 500)
    if (!text) return
    const clientId = (crypto.randomUUID?.() ?? String(Date.now() + Math.random()))
    const optimistic: ChatMsg = { id: 'c-' + clientId, clientId, fromMe: true, body: text, createdAt: new Date().toISOString(), status: 'sending' }
    set((s) => {
      const c = s.convs[fid]; if (!c) return s
      const drafts = loadJson<Record<string, string>>('rvn-chat-drafts', {}); delete drafts[fid]; saveJson('rvn-chat-drafts', drafts)
      return { convs: { ...s.convs, [fid]: { ...c, draft: '', msgs: [...(c.msgs ?? []), optimistic] } } }
    })
    const { data, error } = await createClient().rpc('rvn_send_message', { p_to: fid, p_body: text, p_client_id: clientId })
    set((s) => {
      const c = s.convs[fid]; if (!c) return s
      const msgs = (c.msgs ?? []).map((m) => m.clientId === clientId
        ? (error ? { ...m, status: 'failed' as const } : { ...m, id: (data as { id?: string })?.id ?? m.id, status: 'sent' as const })
        : m)
      return { convs: { ...s.convs, [fid]: { ...c, msgs } } }
    })
    if (error) console.warn('[chat] send:', error.message)
  },

  retry: async (fid, clientId) => {
    const c = get().convs[fid]
    const m = c?.msgs?.find((x) => x.clientId === clientId)
    if (!m) return
    set((s) => ({ convs: { ...s.convs, [fid]: { ...s.convs[fid], msgs: (s.convs[fid].msgs ?? []).map((x) => x.clientId === clientId ? { ...x, status: 'sending' } : x) } } }))
    const { data, error } = await createClient().rpc('rvn_send_message', { p_to: fid, p_body: m.body, p_client_id: clientId })
    set((s) => ({ convs: { ...s.convs, [fid]: { ...s.convs[fid], msgs: (s.convs[fid].msgs ?? []).map((x) => x.clientId === clientId ? { ...x, id: (data as { id?: string })?.id ?? x.id, status: error ? 'failed' : 'sent' } : x) } } }))
  },

  receiveIncoming: (row) => set((s) => {
    const fid = row.from_id
    const c = s.convs[fid]
    const msg: ChatMsg = { id: row.id, clientId: row.client_message_id, fromMe: false, body: row.body, createdAt: row.created_at, status: 'sent' }
    const muted = s.prefs.muted.includes(fid)
    let openIds = s.openIds
    // uždaryta/minimizuota galvutė ATSIRANDA gavus žinutę (nebent nutildyta)
    if (!muted && !openIds.includes(fid) && c) { openIds = [...openIds, fid].slice(-4); saveJson('rvn-chat-open', openIds) }
    if (!c) return { openIds } // nepažįstamas siuntėjas — overview reload sutvarkys
    if ((c.msgs ?? []).some((m) => m.id === row.id)) return s // dedup (reconnect)
    const isOpen = s.expandedId === fid && typeof document !== 'undefined' && document.visibilityState === 'visible'
    const preview = !isOpen && !muted && s.prefs.previewsOn && s.selfStatus !== 'dnd'
      ? { friendId: fid, text: row.body.slice(0, 80), until: Date.now() + 4500 } : s.preview
    return {
      openIds, preview,
      convs: { ...s.convs, [fid]: { ...c, msgs: c.msgs ? [...c.msgs, msg] : null, unread: isOpen ? 0 : c.unread + 1 } },
    }
  }),

  receiveReadReceipt: (row) => set((s) => {
    for (const [fid, c] of Object.entries(s.convs)) {
      const i = (c.msgs ?? []).findIndex((m) => m.id === row.id)
      if (i !== -1) {
        const msgs = [...c.msgs!]; msgs[i] = { ...msgs[i], readAt: row.read_at }
        return { convs: { ...s.convs, [fid]: { ...c, msgs } } }
      }
    }
    return s
  }),

  markRead: (fid) => {
    const c = get().convs[fid]
    if (!c || c.unread === 0) { if (c) void createClient().rpc('rvn_dm_mark_read', { p_friend: fid }).then(() => {}, () => {}); return }
    set((s) => ({ convs: { ...s.convs, [fid]: { ...s.convs[fid], unread: 0 } } }))
    void createClient().rpc('rvn_dm_mark_read', { p_friend: fid }).then(() => {}, () => {})
  },
}))

export function totalUnread(convs: Record<string, Conv>): number {
  return Object.values(convs).reduce((s, c) => s + c.unread, 0)
}
