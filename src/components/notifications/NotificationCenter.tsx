'use client'

// ── Globalios notifikacijos: pop-up toast'ai + varpelis (veikia ir Android appe) ─
import { useCallback, useEffect, useRef, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Bell } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { pollNotifications, registerNativePush, type NotifEvent } from '@/lib/notify'
import { playSuccess } from '@/lib/ui-sound'

const ICON: Record<NotifEvent['type'], string> = { message: '💬', friend: '👥', challenge: '⚔️', trade: '🔄', sale: '🪙' }
type Toast = NotifEvent & { id: number }

export function NotificationCenter() {
  const router = useRouter()
  const pathname = usePathname()
  const onDigital = !!pathname && pathname.startsWith('/digital')
  const [authed, setAuthed] = useState(false)
  const [toasts, setToasts] = useState<Toast[]>([])
  const [recent, setRecent] = useState<NotifEvent[]>([])
  const [unread, setUnread] = useState(0)
  const [open, setOpen] = useState(false)
  const sinceRef = useRef<string | null>(null)
  const idRef = useRef(0)

  useEffect(() => {
    let alive = true
    createClient().auth.getUser().then(({ data: { user } }) => { if (alive) setAuthed(!!user) })
    return () => { alive = false }
  }, [])

  const pushToast = useCallback((e: NotifEvent) => {
    const id = ++idRef.current
    setToasts((t) => [...t, { ...e, id }].slice(-4))
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 5200)
  }, [])

  useEffect(() => {
    if (!authed) return
    try { sinceRef.current = localStorage.getItem('rvn-notif-seen') || new Date().toISOString() } catch { sinceRef.current = new Date().toISOString() }
    // Native push (Android appe) – foreground žinutės taip pat virsta toast'u
    registerNativePush((n) => pushToast({ type: 'message', title: n.title || 'Ravenof', body: n.body || '', ts: new Date().toISOString(), link: '/digital' }))

    let alive = true
    const tick = async () => {
      const evs = await pollNotifications(sinceRef.current)
      if (!alive || evs.length === 0) return
      const maxTs = evs.reduce((m, e) => (e.ts > m ? e.ts : m), sinceRef.current || '')
      sinceRef.current = maxTs
      try { localStorage.setItem('rvn-notif-seen', maxTs) } catch { /* */ }
      playSuccess()
      for (const e of evs.slice(0, 4)) pushToast(e)
      setRecent((r) => [...evs, ...r].slice(0, 15))
      setUnread((u) => u + evs.length)
    }
    const iv = setInterval(tick, 12000)
    const t0 = setTimeout(tick, 2500)
    return () => { alive = false; clearInterval(iv); clearTimeout(t0) }
  }, [authed, pushToast])

  const go = (link: string) => { setOpen(false); router.push(link) }

  if (!authed) return null
  return (
    <>
      {/* Toast'ai (pop-up'ai) */}
      <div className="fixed top-3 left-1/2 -translate-x-1/2 z-[300] flex flex-col gap-2 w-[min(360px,92vw)]">
        {toasts.map((t) => (
          <button key={t.id} onClick={() => go(t.link)}
            className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left shadow-lg transition-transform hover:scale-[1.01] animate-[fadeIn_0.2s_ease]"
            style={{ background: 'rgba(15,11,24,0.97)', border: '1px solid rgba(240,180,41,0.5)', boxShadow: '0 8px 30px rgba(0,0,0,0.7)' }}>
            <span className="text-xl shrink-0">{ICON[t.type]}</span>
            <span className="flex-1 min-w-0">
              <span className="block text-[12px] font-bold truncate" style={{ color: 'var(--gold)', fontFamily: 'var(--rvn-font-display)' }}>{t.title}</span>
              {t.body && <span className="block text-[11px] truncate" style={{ color: 'var(--text-secondary)' }}>{t.body}</span>}
            </span>
          </button>
        ))}
      </div>

      {/* Varpelis (/digital turi savo varpelį header'yje) */}
      {!onDigital && <div className="fixed top-2.5 right-2.5 z-[290]">
        <button onClick={() => { setOpen((o) => !o); setUnread(0) }} className="relative w-9 h-9 rounded-full flex items-center justify-center"
          style={{ background: 'rgba(10,8,16,0.85)', border: '1px solid rgba(240,180,41,0.4)' }} aria-label="Notifikacijos">
          <Bell className="w-4 h-4" style={{ color: 'var(--gold)' }} />
          {unread > 0 && <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full text-[9px] font-bold flex items-center justify-center" style={{ background: '#ef4444', color: '#fff' }}>{unread > 9 ? '9+' : unread}</span>}
        </button>
        {open && (
          <div className="absolute right-0 mt-2 w-[min(300px,86vw)] rounded-xl overflow-hidden" style={{ background: 'rgba(15,11,24,0.98)', border: '1px solid rgba(240,180,41,0.4)', boxShadow: '0 12px 40px rgba(0,0,0,0.8)' }}>
            <div className="px-3 py-2 text-[11px] font-bold border-b" style={{ color: 'var(--gold)', borderColor: 'rgba(240,180,41,0.2)', fontFamily: 'var(--rvn-font-display)' }}>Notifikacijos</div>
            <div className="max-h-72 overflow-y-auto">
              {recent.length === 0 && <p className="text-[11px] text-center py-6" style={{ color: 'var(--text-muted)' }}>Nieko naujo.</p>}
              {recent.map((e, i) => (
                <button key={i} onClick={() => go(e.link)} className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-white/5">
                  <span className="text-base shrink-0">{ICON[e.type]}</span>
                  <span className="flex-1 min-w-0"><span className="block text-[11px] font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{e.title}</span>{e.body && <span className="block text-[10px] truncate" style={{ color: 'var(--text-muted)' }}>{e.body}</span>}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>}
    </>
  )
}
