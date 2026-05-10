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

  const requirementText = badge.requirement_value
    ? badge.requirement_type
      ? badge.requirement_type.replace('_', ' ') + ': ' + badge.requirement_value
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

      {/* Mobile modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 lg:hidden"
          onClick={() => setModalOpen(false)}
        >
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
          <div
            className="relative w-full sm:max-w-xs rounded-t-2xl sm:rounded-2xl p-5"
            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--bg-border)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setModalOpen(false)}
              className="absolute top-3 right-3 w-7 h-7 rounded-full flex items-center justify-center"
              style={{ background: 'var(--bg-border)', color: 'var(--text-muted)' }}
            >
              <X className="w-3.5 h-3.5" />
            </button>

            <div className="flex items-center gap-3 mb-3">
              <span
                className="text-3xl leading-none"
                style={{ filter: isEarned ? 'none' : 'grayscale(100%)', opacity: isEarned ? 1 : 0.5 }}
              >
                {badge.icon ?? '🏅'}
              </span>
              <div>
                <p className="text-sm font-bold" style={{ fontFamily: 'Cinzel, Georgia, serif', color: 'var(--text-primary)' }}>
                  {badge.title}
                </p>
                <p className="text-xs mt-0.5" style={{ color: isEarned ? 'var(--gold)' : 'var(--text-muted)' }}>
                  {isEarned ? 'Uždirbta' : '🔒 Neuždirbta'}
                </p>
              </div>
            </div>

            {badge.description && (
              <p className="text-sm leading-relaxed mb-2" style={{ color: 'var(--text-secondary)' }}>
                {badge.description}
              </p>
            )}

            {requirementText && (
              <p className="text-xs py-2 px-3 rounded-lg mb-2" style={{ background: 'var(--bg-surface)', color: 'var(--text-muted)' }}>
                Sąlyga: {requirementText}
              </p>
            )}

            {isEarned && earnedDate && (
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Gauta: <span style={{ color: 'var(--gold)' }}>{earnedDate}</span>
              </p>
            )}
          </div>
        </div>
      )}
    </>
  )
}
