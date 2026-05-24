'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import type { Badge, UserBadge } from '@/types'

type Props = {
  badge: Badge
  userBadge?: UserBadge | null  // null/undefined = locked
}

export function BadgeItem({ badge, userBadge }: Props) {
  const [modalOpen, setModalOpen] = useState(false)
  const [tooltipVisible, setTooltipVisible] = useState(false)
  const isEarned = !!userBadge
  const earnedDate = userBadge
    ? new Date(userBadge.earned_at).toLocaleDateString('lt-LT', {
        year: 'numeric', month: 'short', day: 'numeric',
      })
    : null

  // Map DB field names to Lithuanian labels
  const reqTypeLabels: Record<string, string> = {
    cards_collected:   'Kortų surinkta',
    decks_created:     'Kaladžių sukurta',
    decks_published:   'Kaladžių paskelbta',
    events_attended:   'Renginių aplankyta',
    level_reached:     'Pasiektas lygis',
    upvotes_received:  'Patiktukų gauta',
    decks_upvoted:     'Kaladžių įvertinta',
    badges_earned:     'Ženklelių uždirbta',
    wins_count:        'Pergalių skaičius',
    streak_days:       'Dienų iš eilės',
  }
  const reqLabel = badge.requirement_type
    ? (reqTypeLabels[badge.requirement_type] ?? badge.requirement_type.replace(/_/g, ' '))
    : null
  const requirementText = badge.requirement_value
    ? reqLabel
      ? `${reqLabel}: ${badge.requirement_value}`
      : String(badge.requirement_value)
    : null

  return (
    <>
      {/* Badge tile */}
      <div
        className="relative flex flex-col items-center gap-1 p-2.5 rounded-lg cursor-pointer select-none"
        style={{
          background: isEarned ? 'var(--bg-elevated)' : 'var(--bg-surface)',
          border: '1px solid ' + (isEarned ? 'var(--gold)30' : 'var(--bg-border)'),
          filter: isEarned ? 'none' : 'grayscale(100%)',
          opacity: isEarned ? 1 : 0.4,
          transition: 'opacity 0.2s, border-color 0.2s',
        }}
        onMouseEnter={() => setTooltipVisible(true)}
        onMouseLeave={() => setTooltipVisible(false)}
        onClick={() => setModalOpen(true)}
      >
        {/* Lock overlay for locked badges */}
        {!isEarned && (
          <span
            className="absolute top-1 right-1 text-xs leading-none"
            style={{ fontSize: '9px', opacity: 0.6 }}
          >
            🔒
          </span>
        )}

        <span className="text-2xl leading-none">{badge.icon ?? '🏅'}</span>
        <p
          className="text-xs text-center leading-tight font-medium line-clamp-2"
          style={{ color: isEarned ? 'var(--text-secondary)' : 'var(--text-muted)', fontSize: '10px' }}
        >
          {badge.title}
        </p>

        {/* Desktop tooltip */}
        {tooltipVisible && (
          <div
            className="hidden lg:block absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-52 rounded-xl p-3 pointer-events-none"
            style={{
              background: 'var(--bg-elevated)',
              border: '1px solid var(--bg-border)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
            }}
          >
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-lg leading-none">{badge.icon ?? '🏅'}</span>
              <p className="text-xs font-bold" style={{ color: 'var(--text-primary)', fontFamily: 'Cinzel, Georgia, serif' }}>
                {badge.title}
              </p>
            </div>
            {badge.description && (
              <p className="text-xs mb-1.5 leading-snug" style={{ color: 'var(--text-secondary)' }}>
                {badge.description}
              </p>
            )}
            {requirementText && (
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Sąlyga: {requirementText}
              </p>
            )}
            {isEarned && earnedDate && (
              <p className="text-xs mt-1" style={{ color: 'var(--gold)', opacity: 0.8 }}>
                Gauta: {earnedDate}
              </p>
            )}
            {!isEarned && (
              <p className="text-xs mt-1 font-medium" style={{ color: 'var(--text-muted)' }}>
                🔒 Dar neuždirbta
              </p>
            )}
            {/* Tooltip arrow */}
            <div
              className="absolute left-1/2 -translate-x-1/2 top-full"
              style={{
                width: 0, height: 0,
                borderLeft: '6px solid transparent',
                borderRight: '6px solid transparent',
                borderTop: '6px solid var(--bg-elevated)',
              }}
            />
          </div>
        )}
      </div>

      {/* Mobile modal — true full-screen overlay, flex-column panel */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 lg:hidden"
          style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}
          onClick={() => setModalOpen(false)}
        >
          {/* Panel: flex column, height capped to dynamic viewport */}
          <div
            className="relative w-full max-w-sm flex flex-col rounded-2xl overflow-hidden"
            style={{
              background:  'var(--bg-elevated)',
              border:      '1px solid var(--bg-border)',
              boxShadow:   '0 24px 64px rgba(0,0,0,0.8)',
              maxHeight:   'calc(100dvh - 6rem)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* ── Fixed header ── */}
            <div
              className="shrink-0 flex items-center gap-3 px-5 py-4"
              style={{ borderBottom: '1px solid var(--bg-border)' }}
            >
              <span
                className="text-3xl leading-none shrink-0"
                style={{ filter: isEarned ? 'none' : 'grayscale(100%)', opacity: isEarned ? 1 : 0.5 }}
              >
                {badge.icon ?? '🏅'}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold leading-tight" style={{ fontFamily: 'Cinzel, Georgia, serif', color: 'var(--text-primary)' }}>
                  {badge.title}
                </p>
                <p className="text-xs mt-0.5" style={{ color: isEarned ? 'var(--gold)' : 'var(--text-muted)' }}>
                  {isEarned ? '✓ Pasiekimas uždirbtas' : '🔒 Dar neuždirbta'}
                </p>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center"
                style={{ background: 'var(--bg-border)', color: 'var(--text-muted)' }}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* ── Scrollable body — THIS is the scroll container ── */}
            <div
              className="flex-1 min-h-0 overflow-y-auto px-5 py-4 space-y-3"
              style={{ paddingBottom: 'calc(2rem + env(safe-area-inset-bottom, 0px))' }}
            >
              {badge.description && (
                <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  {badge.description}
                </p>
              )}

              {requirementText && (
                <div
                  className="rounded-lg px-3 py-2.5"
                  style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-border)' }}
                >
                  <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>
                    Ką reikia padaryti
                  </p>
                  <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                    🎯 {requirementText}
                  </p>
                </div>
              )}

              {isEarned && earnedDate && (
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  Gauta: <span style={{ color: 'var(--gold)' }}>{earnedDate}</span>
                </p>
              )}

              {!isEarned && !requirementText && (
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  Tęsk žaidimą ir atrakink šį pasiekimą!
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
