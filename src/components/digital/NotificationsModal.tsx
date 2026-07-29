'use client'

// ── Ravenof Digital — pranešimų modalas ───────────────────────────────────────
// Elgsena (audit #16): VIENA aiški taisyklė — skaitytu pranešimas tampa tik jį
// PASPAUDUS arba per „Žymėti visus skaitytais"; varpelio badge'as visada rodo
// DB unread tiesą. Tipo filtrai + stabilūs route'ai (pasiekimai →
// /digital/profile/achievements?achievementId=<code>).
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { X, BellOff, CheckCheck } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { playUiClick } from '@/lib/ui-sound'
import { RvnIcon } from './ui/RvnIcon'
import { useEscClose } from '@/lib/useEscClose'
import { useT } from '@/lib/i18n/react'
import { t as tGlobal } from '@/lib/i18n/core'

type Notif = { id: string; type: string; title: string; message: string | null; link: string | null; read: boolean; created_at: string }

const ICON: Record<string, string> = { message: '💬', friend: '👥', challenge: '⚔️', trade: '🔄', sale: '🪙', badge: '🎖️', badge_earned: '🎖️', achievement: '🏆', system: '📜' }

/** Tipo filtrų grupės (raktas → notifications.type sąrašas). */
const FILTERS: { key: string; types: string[] | null }[] = [
  { key: 'all', types: null },
  { key: 'achievements', types: ['achievement', 'badge', 'badge_earned'] },
  { key: 'social', types: ['message', 'friend', 'challenge', 'trade'] },
  { key: 'other', types: ['sale', 'system'] },
]

function timeAgo(ts: string): string {
  const s = Math.max(0, (Date.now() - new Date(ts).getTime()) / 1000)
  if (s < 60) return tGlobal('common.notif.justNow')
  if (s < 3600) return tGlobal('common.notif.minAgo', { count: Math.floor(s / 60) })
  if (s < 86400) return tGlobal('common.notif.hoursAgo', { count: Math.floor(s / 3600) })
  return tGlobal('common.notif.daysAgo', { count: Math.floor(s / 86400) })
}

export function NotificationsModal({ onClose, onRead }: { onClose: () => void; onRead?: () => void }) {
  const t = useT()
  useEscClose(onClose)
  const router = useRouter()
  const [items, setItems] = useState<Notif[] | null>(null)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { setItems([]); return }
      supabase.from('notifications').select('id, type, title, message, link, read, created_at')
        .eq('user_id', user.id).order('created_at', { ascending: false }).limit(50)
        .then(({ data }) => {
          setItems((data as Notif[]) ?? [])
        })
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const markRead = (id: string) => {
    setItems((xs) => (xs ?? []).map((x) => (x.id === id ? { ...x, read: true } : x)))
    void createClient().from('notifications').update({ read: true }).eq('id', id).then(() => onRead?.())
  }

  const markAllRead = async () => {
    playUiClick()
    setItems((xs) => (xs ?? []).map((x) => ({ ...x, read: true })))
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) await supabase.from('notifications').update({ read: true }).eq('user_id', user.id).eq('read', false)
    onRead?.()
  }

  const open = (n: Notif) => {
    playUiClick()
    if (!n.read) markRead(n.id)
    if (n.link) { onClose(); router.push(n.link) }
  }

  const shown = useMemo(() => {
    const f = FILTERS.find((x) => x.key === filter)
    if (!f || !f.types) return items
    return (items ?? []).filter((n) => f.types!.includes(n.type))
  }, [items, filter])

  const unreadCount = (items ?? []).filter((n) => !n.read).length

  return (
    <div className="fixed inset-0 z-[160] flex items-end sm:items-center justify-center" style={{ background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(4px)' }} onClick={onClose}>
      <div className="w-full sm:max-w-md rvn-fade flex flex-col" onClick={(e) => e.stopPropagation()}
        style={{ maxHeight: '76vh', borderRadius: '18px 18px 0 0', background: 'linear-gradient(165deg, #17111f, #0a0810)', border: '1px solid rgba(240,180,41,0.35)', borderBottom: 'none', boxShadow: '0 -10px 44px rgba(0,0,0,0.8)' }}>
        <div className="flex items-center justify-between px-4 pt-3.5 pb-2.5" style={{ borderBottom: '1px solid rgba(240,180,41,0.18)' }}>
          <p className="text-base font-bold inline-flex items-center gap-2" style={{ fontFamily: 'var(--rvn-font-display)', color: 'var(--gold)', letterSpacing: '0.08em' }}>
            <RvnIcon name="fi-bell" size={22} fallback={<span>🔔</span>} /> {t('common.notif.title')}
          </p>
          <span className="flex items-center gap-1.5">
            {unreadCount > 0 && (
              <button onClick={() => void markAllRead()} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10.5px] font-bold"
                style={{ background: 'rgba(240,180,41,0.1)', border: '1px solid rgba(240,180,41,0.35)', color: 'var(--gold)', minHeight: 30 }}>
                <CheckCheck className="w-3.5 h-3.5" /> {t('common.notif.markAllRead')}
              </button>
            )}
            <button onClick={() => { playUiClick(); onClose() }} aria-label={t('common.close')} className="flex items-center justify-center rounded-full" style={{ width: 32, height: 32, background: 'rgba(10,8,16,0.9)', border: '1px solid rgba(240,180,41,0.4)', color: 'var(--gold)' }}><X className="w-4 h-4" /></button>
          </span>
        </div>
        {/* Tipo filtrai */}
        <div className="flex gap-1.5 px-4 py-2 overflow-x-auto" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          {FILTERS.map((f) => {
            const active = filter === f.key
            return (
              <button key={f.key} onClick={() => { playUiClick(); setFilter(f.key) }} aria-pressed={active}
                className="shrink-0 px-2.5 py-1 rounded-lg text-[10.5px] font-semibold"
                style={{ minHeight: 28, background: active ? 'rgba(240,180,41,0.16)' : 'rgba(10,8,16,0.7)', border: `1px solid ${active ? 'rgba(240,180,41,0.5)' : 'rgba(255,255,255,0.08)'}`, color: active ? 'var(--gold)' : 'var(--text-muted)' }}>
                {t(`common.notif.filter.${f.key}`)}
              </button>
            )
          })}
        </div>
        <div className="flex-1 overflow-y-auto" style={{ paddingBottom: 'calc(12px + env(safe-area-inset-bottom, 0px))' }}>
          {shown === null && <p className="text-center text-sm py-10" style={{ color: 'var(--text-muted)' }}>{t('common.loading')}</p>}
          {shown?.length === 0 && (
            <div className="flex flex-col items-center gap-2 py-12">
              <BellOff className="w-8 h-8" style={{ color: 'rgba(240,180,41,0.4)' }} />
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{t('common.notif.empty')}</p>
            </div>
          )}
          {shown?.map((n) => (
            <button key={n.id} onClick={() => open(n)} disabled={!n.link && n.read}
              className="w-full flex items-start gap-3 px-4 py-3 text-left transition-colors active:bg-white/5"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', opacity: n.read ? 0.75 : 1, minHeight: 48 }}>
              <span className="relative shrink-0 flex items-center justify-center rounded-lg" style={{ width: 36, height: 36, background: 'rgba(240,180,41,0.1)', border: '1px solid rgba(240,180,41,0.28)', fontSize: 17 }}>
                {ICON[n.type] ?? '📣'}
                {!n.read && <span className="absolute rounded-full" style={{ top: -3, right: -3, width: 9, height: 9, background: '#ef4444', border: '1.5px solid #0a0810' }} />}
              </span>
              <span className="flex-1 min-w-0">
                <span className="block text-[13px] font-bold truncate" style={{ color: '#f3ead3', fontFamily: 'var(--rvn-font-display)' }}>{n.title}</span>
                {n.message && <span className="block text-[11.5px] leading-snug" style={{ color: 'var(--text-muted)' }}>{n.message}</span>}
                <span className="block text-[10px] mt-0.5" style={{ color: 'rgba(150,160,185,0.6)' }}>{timeAgo(n.created_at)}</span>
              </span>
              {n.link && <span className="shrink-0 self-center" style={{ color: 'rgba(240,180,41,0.6)', fontSize: 14 }}>→</span>}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
