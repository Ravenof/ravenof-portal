'use client'

// ── Ravenof Digital — pranešimų modalas (notifications lentelė, mark-read) ────
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { X, BellOff } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { playUiClick } from '@/lib/ui-sound'
import { RvnIcon } from './ui/RvnIcon'
import { useEscClose } from '@/lib/useEscClose'

type Notif = { id: string; type: string; title: string; message: string | null; link: string | null; read: boolean; created_at: string }

const ICON: Record<string, string> = { message: '💬', friend: '👥', challenge: '⚔️', trade: '🔄', sale: '🪙', badge: '🎖️', system: '📜' }

function timeAgo(ts: string): string {
  const s = Math.max(0, (Date.now() - new Date(ts).getTime()) / 1000)
  if (s < 60) return 'ką tik'
  if (s < 3600) return `prieš ${Math.floor(s / 60)} min.`
  if (s < 86400) return `prieš ${Math.floor(s / 3600)} val.`
  return `prieš ${Math.floor(s / 86400)} d.`
}

export function NotificationsModal({ onClose, onRead }: { onClose: () => void; onRead?: () => void }) {
  useEscClose(onClose)
  const router = useRouter()
  const [items, setItems] = useState<Notif[] | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { setItems([]); return }
      supabase.from('notifications').select('id, type, title, message, link, read, created_at')
        .eq('user_id', user.id).order('created_at', { ascending: false }).limit(30)
        .then(({ data }) => {
          setItems((data as Notif[]) ?? [])
          // pažymim viską skaityta
          supabase.from('notifications').update({ read: true }).eq('user_id', user.id).eq('read', false)
            .then(() => onRead?.())
        })
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const open = (n: Notif) => {
    playUiClick()
    if (n.link) { onClose(); router.push(n.link) }
  }

  return (
    <div className="fixed inset-0 z-[160] flex items-end sm:items-center justify-center" style={{ background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(4px)' }} onClick={onClose}>
      <div className="w-full sm:max-w-md rvn-fade flex flex-col" onClick={(e) => e.stopPropagation()}
        style={{ maxHeight: '76vh', borderRadius: '18px 18px 0 0', background: 'linear-gradient(165deg, #17111f, #0a0810)', border: '1px solid rgba(240,180,41,0.35)', borderBottom: 'none', boxShadow: '0 -10px 44px rgba(0,0,0,0.8)' }}>
        <div className="flex items-center justify-between px-4 pt-3.5 pb-2.5" style={{ borderBottom: '1px solid rgba(240,180,41,0.18)' }}>
          <p className="text-base font-bold inline-flex items-center gap-2" style={{ fontFamily: 'var(--rvn-font-display)', color: 'var(--gold)', letterSpacing: '0.08em' }}>
            <RvnIcon name="fi-bell" size={22} fallback={<span>🔔</span>} /> PRANEŠIMAI
          </p>
          <button onClick={() => { playUiClick(); onClose() }} aria-label="Uždaryti" className="flex items-center justify-center rounded-full" style={{ width: 32, height: 32, background: 'rgba(10,8,16,0.9)', border: '1px solid rgba(240,180,41,0.4)', color: 'var(--gold)' }}><X className="w-4 h-4" /></button>
        </div>
        <div className="flex-1 overflow-y-auto" style={{ paddingBottom: 'calc(12px + env(safe-area-inset-bottom, 0px))' }}>
          {items === null && <p className="text-center text-sm py-10" style={{ color: 'var(--text-muted)' }}>Kraunama…</p>}
          {items?.length === 0 && (
            <div className="flex flex-col items-center gap-2 py-12">
              <BellOff className="w-8 h-8" style={{ color: 'rgba(240,180,41,0.4)' }} />
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Pranešimų kol kas nėra.</p>
            </div>
          )}
          {items?.map((n) => (
            <button key={n.id} onClick={() => open(n)} disabled={!n.link}
              className="w-full flex items-start gap-3 px-4 py-3 text-left transition-colors active:bg-white/5"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', opacity: n.read ? 0.75 : 1 }}>
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
