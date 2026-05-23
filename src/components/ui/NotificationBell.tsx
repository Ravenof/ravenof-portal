'use client'

import { useState, useEffect, useRef, useTransition } from 'react'
import Link from 'next/link'
import type { Notification } from '@/types'

type Props = {
  initialNotifications: Notification[]
  initialUnread: number
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1)  return 'ką tik'
  if (m < 60) return `prieš ${m} min.`
  const h = Math.floor(m / 60)
  if (h < 24) return `prieš ${h} val.`
  const d = Math.floor(h / 24)
  return `prieš ${d} d.`
}

const TYPE_ICON: Record<string, string> = {
  badge_earned:       '🏅',
  xp_gained:          '⚡',
  tournament_match:   '⚔️',
  tournament_result:  '🏆',
  deck_upvote:        '▲',
}

export function NotificationBell({ initialNotifications, initialUnread }: Props) {
  const [open, setOpen]           = useState(false)
  const [notifs, setNotifs]       = useState<Notification[]>(initialNotifications)
  const [unread, setUnread]       = useState(initialUnread)
  const [, startTransition]       = useTransition()
  const ref                       = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  async function handleOpen() {
    setOpen((v) => !v)
    if (!open && unread > 0) {
      // Mark all as read optimistically
      setUnread(0)
      setNotifs((prev) => prev.map((n) => ({ ...n, read: true })))
      startTransition(async () => {
        const { markAllNotificationsRead } = await import('@/lib/notifications')
        await markAllNotificationsRead()
      })
    }
  }

  return (
    <div className="relative" ref={ref}>
      {/* Bell button */}
      <button
        onClick={handleOpen}
        className="relative flex items-center justify-center w-8 h-8 rounded-lg transition-all hover:border-[rgba(240,180,41,0.3)]"
        style={{ border: '1px solid var(--bg-border)', background: open ? 'rgba(240,180,41,0.08)' : 'transparent' }}
        aria-label="Pranešimai"
      >
        <span style={{ fontSize: '15px', lineHeight: 1 }}>🔔</span>
        {unread > 0 && (
          <span
            className="absolute -top-1 -right-1 flex items-center justify-center rounded-full text-[9px] font-bold"
            style={{
              minWidth:   '16px',
              height:     '16px',
              background: 'var(--gold)',
              color:      '#0a0a0f',
              fontFamily: 'var(--rvn-font-display)',
              padding:    '0 3px',
            }}
          >
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div
          className="absolute right-0 top-10 z-50 rounded-xl overflow-hidden"
          style={{
            width:     '320px',
            background: 'var(--bg-surface)',
            border:    '1px solid var(--bg-border)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
          }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-4 py-3 border-b"
            style={{ borderColor: 'var(--bg-border)' }}
          >
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--gold)', fontFamily: 'var(--rvn-font-display)' }}>
              Pranešimai
            </span>
            {notifs.length > 0 && (
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{notifs.length}</span>
            )}
          </div>

          {/* List */}
          <div className="overflow-y-auto" style={{ maxHeight: '380px' }}>
            {notifs.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Nėra pranešimų</p>
              </div>
            ) : (
              notifs.map((n) => {
                const inner = (
                  <div
                    className="flex items-start gap-3 px-4 py-3 border-b transition-colors"
                    style={{
                      borderColor: 'var(--bg-border)',
                      background: n.read ? 'transparent' : 'rgba(240,180,41,0.04)',
                    }}
                  >
                    <span style={{ fontSize: '18px', lineHeight: 1, marginTop: '1px', flexShrink: 0 }}>
                      {TYPE_ICON[n.type] ?? '📌'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold leading-tight" style={{ color: 'var(--text-primary)', fontFamily: 'var(--rvn-font-display)' }}>
                        {n.title}
                      </p>
                      {n.message && (
                        <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--text-muted)' }}>{n.message}</p>
                      )}
                      <p className="text-xs mt-1" style={{ color: 'var(--text-muted)', opacity: 0.6 }}>{timeAgo(n.created_at)}</p>
                    </div>
                    {!n.read && (
                      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5" style={{ background: 'var(--gold)' }} />
                    )}
                  </div>
                )
                return n.link ? (
                  <Link key={n.id} href={n.link} onClick={() => setOpen(false)} style={{ textDecoration: 'none', display: 'block' }}>
                    {inner}
                  </Link>
                ) : (
                  <div key={n.id}>{inner}</div>
                )
              })
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-2 text-center border-t" style={{ borderColor: 'var(--bg-border)' }}>
            <Link href="/me" onClick={() => setOpen(false)} className="text-xs transition-opacity hover:opacity-70" style={{ color: 'var(--text-muted)' }}>
              Profilis →
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
