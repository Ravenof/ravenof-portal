'use client'

import { useState, useMemo } from 'react'
import { X, Search, Trophy, Zap } from 'lucide-react'
import type { Badge, UserBadge } from '@/types'

// ── Category display metadata ──────────────────────────────────
const CATEGORY_LABELS: Record<string, string> = {
  account:              'Paskyra',
  collection:           'Kolekcija',
  rarity_collection:    'Raritetai',
  faction_collection:   'Frakcijos',
  champion_phases:      'Cempionai',
  deckbuilding:         'Kaladziu Kuryba',
  community:            'Bendruomene',
  events:               'Renginiai',
  tournament_placement: 'Turnyrai',
  decks:                'Kaladzes',
  founder:              'Steigejas',
  special:              'Specialus',
}

const CATEGORY_ICONS: Record<string, string> = {
  account:              '👤',
  collection:           '📦',
  rarity_collection:    '💎',
  faction_collection:   '🏴',
  champion_phases:      '🏆',
  deckbuilding:         '📋',
  community:            '👥',
  events:               '🎪',
  tournament_placement: '⚔',
  decks:                '🃏',
  founder:              '🌟',
  special:              '✨',
}

// Hardcoded Lithuanian names to avoid encoding issues
const CATEGORY_LT: Record<string, string> = {
  account:              'Paskyra',
  collection:           'Kolekcija',
  rarity_collection:    'Raritetai',
  faction_collection:   'Frakcijos',
  champion_phases:      'Čempionai',
  deckbuilding:         'Kaladžių Kūryba',
  community:            'Bendruomenė',
  events:               'Renginiai',
  tournament_placement: 'Turnyrai',
  decks:                'Kaladės',
  founder:              'Steigejas',
  special:              'Specialus',
}

type ProgressInfo = { current: number; total: number }

type Props = {
  allBadges: Badge[]
  earnedBadges: UserBadge[]
  isOwner: boolean
  progressMap?: Record<string, ProgressInfo>
}

type FilterState = 'all' | 'earned' | 'locked'

// ── Badge Modal ────────────────────────────────────────────────
function BadgeModal({
  badge,
  userBadge,
  progress,
  onClose,
}: {
  badge: Badge
  userBadge: UserBadge | null
  progress?: ProgressInfo
  onClose: () => void
}) {
  const isEarned = !!userBadge
  const earnedDate = userBadge
    ? new Date(userBadge.earned_at).toLocaleDateString('lt-LT', {
        year: 'numeric', month: 'long', day: 'numeric',
      })
    : null

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" />
      <div
        className="relative w-full sm:max-w-sm rounded-t-2xl sm:rounded-2xl p-5 sm:p-6"
        style={{ background: 'var(--bg-elevated)', border: '1px solid var(--bg-border)', zIndex: 1 }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 w-7 h-7 rounded-full flex items-center justify-center"
          style={{ background: 'var(--bg-border)', color: 'var(--text-muted)' }}
        >
          <X className="w-3.5 h-3.5" />
        </button>

        {/* Header */}
        <div className="flex items-start gap-4 mb-4">
          <span
            className="text-4xl leading-none flex-shrink-0"
            style={{ filter: isEarned ? 'none' : 'grayscale(80%)', opacity: isEarned ? 1 : 0.5 }}
          >
            {badge.icon ?? '🏅'}
          </span>
          <div className="flex-1 min-w-0">
            <p
              className="font-bold text-base leading-tight"
              style={{ fontFamily: 'Cinzel, Georgia, serif', color: isEarned ? 'var(--gold)' : 'var(--text-primary)' }}
            >
              {badge.title}
            </p>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span
                className="text-xs px-2 py-0.5 rounded-full"
                style={{ background: 'var(--bg-surface)', color: 'var(--text-muted)', border: '1px solid var(--bg-border)' }}
              >
                {CATEGORY_ICONS[badge.category] ?? ''} {CATEGORY_LT[badge.category] ?? badge.category}
              </span>
              {badge.xp_reward > 0 && (
                <span
                  className="text-xs px-2 py-0.5 rounded-full font-semibold"
                  style={{ background: isEarned ? 'rgba(212,175,55,0.15)' : 'var(--bg-surface)', color: 'var(--gold)', border: '1px solid rgba(212,175,55,0.3)' }}
                >
                  +{badge.xp_reward} XP
                </span>
              )}
              <span
                className="text-xs font-medium"
                style={{ color: isEarned ? '#22c55e' : 'var(--text-muted)' }}
              >
                {isEarned ? '✓ Uždirbt' : '🔒 Neuzdirbta'}
              </span>
            </div>
          </div>
        </div>

        {/* Description */}
        {badge.description && (
          <p className="text-sm leading-relaxed mb-3" style={{ color: 'var(--text-secondary)' }}>
            {badge.description}
          </p>
        )}

        {/* Requirement */}
        {badge.requirement && (
          <div
            className="rounded-lg px-3 py-2 mb-3"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-border)' }}
          >
            <p className="text-xs font-semibold mb-0.5" style={{ color: 'var(--text-muted)' }}>
              SALYGÁ
            </p>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              {badge.requirement}
            </p>
          </div>
        )}

        {/* Progress */}
        {progress && !isEarned && (
          <div className="mb-3">
            <div className="flex justify-between text-xs mb-1" style={{ color: 'var(--text-muted)' }}>
              <span>Progresas</span>
              <span>{progress.current} / {progress.total}</span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-surface)' }}>
              <div
                className="h-full rounded-full"
                style={{
                  width: `${Math.min(100, Math.round((progress.current / progress.total) * 100))}%`,
                  background: 'var(--gold)',
                  transition: 'width 0.3s ease',
                }}
              />
            </div>
          </div>
        )}

        {/* Earned date */}
        {isEarned && earnedDate && (
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Gauta: <span style={{ color: 'var(--gold)' }}>{earnedDate}</span>
          </p>
        )}
      </div>
    </div>
  )
}

// ── Badge Card ─────────────────────────────────────────────────
function AchievementCard({
  badge,
  userBadge,
  progress,
  onClick,
}: {
  badge: Badge
  userBadge: UserBadge | null
  progress?: ProgressInfo
  onClick: () => void
}) {
  const isEarned = !!userBadge

  return (
    <button
      className="text-left w-full rounded-xl p-3 transition-all group"
      style={{
        background: isEarned ? 'var(--bg-elevated)' : 'var(--bg-surface)',
        border: '1px solid ' + (isEarned ? 'rgba(212,175,55,0.35)' : 'var(--bg-border)'),
        opacity: isEarned ? 1 : 0.6,
        cursor: 'pointer',
      }}
      onClick={onClick}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 text-xl leading-none"
          style={{
            background: isEarned ? 'rgba(212,175,55,0.1)' : 'var(--bg-elevated)',
            filter: isEarned ? 'none' : 'grayscale(70%)',
          }}
        >
          {badge.icon ?? '🏅'}
          {!isEarned && (
            <span className="absolute text-xs" style={{ fontSize: '8px', opacity: 0.7 }}>🔒</span>
          )}
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-1 mb-0.5">
            <p
              className="text-xs font-semibold leading-tight"
              style={{
                color: isEarned ? 'var(--text-primary)' : 'var(--text-muted)',
                fontFamily: 'Cinzel, Georgia, serif',
              }}
            >
              {badge.title}
            </p>
            {badge.xp_reward > 0 && (
              <span
                className="text-xs font-bold flex-shrink-0 leading-none px-1.5 py-0.5 rounded"
                style={{
                  background: isEarned ? 'rgba(212,175,55,0.15)' : 'transparent',
                  color: 'var(--gold)',
                  border: '1px solid ' + (isEarned ? 'rgba(212,175,55,0.3)' : 'transparent'),
                  fontSize: '10px',
                }}
              >
                +{badge.xp_reward}
              </span>
            )}
          </div>

          {badge.description && (
            <p
              className="text-xs leading-snug line-clamp-2"
              style={{ color: 'var(--text-muted)', fontSize: '10px' }}
            >
              {badge.description}
            </p>
          )}

          {/* Progress bar */}
          {progress && !isEarned && (
            <div className="mt-1.5">
              <div className="flex justify-between mb-0.5" style={{ fontSize: '9px', color: 'var(--text-muted)' }}>
                <span>{progress.current}/{progress.total}</span>
              </div>
              <div className="h-1 rounded-full overflow-hidden" style={{ background: 'var(--bg-elevated)' }}>
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.min(100, Math.round((progress.current / progress.total) * 100))}%`,
                    background: 'rgba(212,175,55,0.5)',
                  }}
                />
              </div>
            </div>
          )}

          {/* Earned checkmark */}
          {isEarned && (
            <p className="text-xs mt-0.5" style={{ color: '#22c55e', fontSize: '10px' }}>
              ✓ Uždirbt
            </p>
          )}
        </div>
      </div>
    </button>
  )
}

// ── Main Component ─────────────────────────────────────────────
export function AchievementSection({ allBadges, earnedBadges, isOwner, progressMap }: Props) {
  const [filter, setFilter]     = useState<FilterState>('all')
  const [category, setCategory] = useState<string>('all')
  const [search, setSearch]     = useState('')
  const [modalBadge, setModalBadge] = useState<Badge | null>(null)

  // Build earned lookup
  const earnedMap = useMemo(() => {
    const m = new Map<string, UserBadge>()
    for (const ub of earnedBadges) m.set(ub.badge_id, ub)
    return m
  }, [earnedBadges])

  // Active badges only (is_active=true)
  const activeBadges = useMemo(() =>
    allBadges.filter((b) => b.is_active), [allBadges])

  // Categories present in active badges
  const categories = useMemo(() => {
    const seen = new Set<string>()
    activeBadges.forEach((b) => seen.add(b.category))
    return Array.from(seen).sort((a, b) => {
      const order = ['account','collection','rarity_collection','faction_collection',
        'champion_phases','deckbuilding','community','events','tournament_placement']
      return (order.indexOf(a) ?? 99) - (order.indexOf(b) ?? 99)
    })
  }, [activeBadges])

  // Summary stats
  const earnedActive   = earnedBadges.filter((ub) => activeBadges.some((b) => b.id === ub.badge_id))
  const totalActiveXP  = activeBadges.reduce((s, b) => s + b.xp_reward, 0)
  const earnedActiveXP = earnedActive.reduce((s, ub) => {
    const b = activeBadges.find((b) => b.id === ub.badge_id)
    return s + (b?.xp_reward ?? 0)
  }, 0)

  // Filtered badges
  const filtered = useMemo(() => {
    let list = activeBadges

    if (category !== 'all') list = list.filter((b) => b.category === category)

    if (filter === 'earned') list = list.filter((b) => earnedMap.has(b.id))
    if (filter === 'locked') list = list.filter((b) => !earnedMap.has(b.id))

    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(
        (b) =>
          b.title.toLowerCase().includes(q) ||
          (b.description ?? '').toLowerCase().includes(q) ||
          (b.requirement ?? '').toLowerCase().includes(q),
      )
    }

    // Sort: earned first, then by sort_order
    return [...list].sort((a, b) => {
      const ae = earnedMap.has(a.id) ? 0 : 1
      const be = earnedMap.has(b.id) ? 0 : 1
      if (ae !== be) return ae - be
      return (a.sort_order ?? 99) - (b.sort_order ?? 99)
    })
  }, [activeBadges, category, filter, search, earnedMap])

  if (activeBadges.length === 0) {
    return (
      <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
        Dar nėra pasiekimų.
      </p>
    )
  }

  const modalUserBadge = modalBadge ? (earnedMap.get(modalBadge.id) ?? null) : null

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-2 gap-3">
        <div
          className="rounded-xl px-4 py-3 flex items-center gap-3"
          style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-border)' }}
        >
          <Trophy className="w-5 h-5 flex-shrink-0" style={{ color: 'var(--gold)' }} />
          <div>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Pasiekimai</p>
            <p className="text-base font-bold" style={{ color: 'var(--gold)', fontFamily: 'Cinzel, Georgia, serif' }}>
              {earnedActive.length} <span className="text-xs font-normal" style={{ color: 'var(--text-muted)' }}>/ {activeBadges.length}</span>
            </p>
          </div>
        </div>
        <div
          className="rounded-xl px-4 py-3 flex items-center gap-3"
          style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-border)' }}
        >
          <Zap className="w-5 h-5 flex-shrink-0" style={{ color: 'var(--gold)' }} />
          <div>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>XP iš pasiekimų</p>
            <p className="text-base font-bold" style={{ color: 'var(--gold)', fontFamily: 'Cinzel, Georgia, serif' }}>
              {earnedActiveXP.toLocaleString()} <span className="text-xs font-normal" style={{ color: 'var(--text-muted)' }}>/ {totalActiveXP.toLocaleString()}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
          style={{ color: 'var(--text-muted)' }}
        />
        <input
          type="text"
          placeholder="Ieškoti pasiekimų..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2 rounded-lg text-sm outline-none"
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--bg-border)',
            color: 'var(--text-primary)',
          }}
        />
      </div>

      {/* Filter row */}
      <div className="flex gap-2 flex-wrap">
        {(['all', 'earned', 'locked'] as FilterState[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className="px-3 py-1 rounded-lg text-xs font-medium transition-colors"
            style={{
              background: filter === f ? 'var(--gold)' : 'var(--bg-surface)',
              color:      filter === f ? '#0a0a0f'    : 'var(--text-muted)',
              border:     '1px solid ' + (filter === f ? 'var(--gold)' : 'var(--bg-border)'),
            }}
          >
            {f === 'all' ? 'Visi' : f === 'earned' ? '✓ Uždirbti' : '🔒 Užrakinti'}
          </button>
        ))}
      </div>

      {/* Category tabs */}
      <div
        className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar"
        style={{ scrollbarWidth: 'none' }}
      >
        <button
          onClick={() => setCategory('all')}
          className="flex-shrink-0 px-2.5 py-1 rounded-lg text-xs transition-colors"
          style={{
            background: category === 'all' ? 'rgba(212,175,55,0.15)' : 'var(--bg-surface)',
            color:      category === 'all' ? 'var(--gold)'           : 'var(--text-muted)',
            border:     '1px solid ' + (category === 'all' ? 'rgba(212,175,55,0.4)' : 'var(--bg-border)'),
          }}
        >
          Visos
        </button>
        {categories.map((cat) => {
          const catEarned = earnedActive.filter((ub) => {
            const b = activeBadges.find((x) => x.id === ub.badge_id)
            return b?.category === cat
          }).length
          const catTotal = activeBadges.filter((b) => b.category === cat).length
          return (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className="flex-shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs transition-colors"
              style={{
                background: category === cat ? 'rgba(212,175,55,0.15)' : 'var(--bg-surface)',
                color:      category === cat ? 'var(--gold)'            : 'var(--text-muted)',
                border:     '1px solid ' + (category === cat ? 'rgba(212,175,55,0.4)' : 'var(--bg-border)'),
              }}
            >
              <span>{CATEGORY_ICONS[cat]}</span>
              <span>{CATEGORY_LT[cat] ?? CATEGORY_LABELS[cat] ?? cat}</span>
              <span style={{ opacity: 0.6 }}>{catEarned}/{catTotal}</span>
            </button>
          )
        })}
      </div>

      {/* Badge grid */}
      {filtered.length === 0 ? (
        <p className="text-sm text-center py-8" style={{ color: 'var(--text-muted)', opacity: 0.5 }}>
          Nėra pasiekimų pagal filtrus.
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {filtered.map((badge) => (
            <AchievementCard
              key={badge.id}
              badge={badge}
              userBadge={earnedMap.get(badge.id) ?? null}
              progress={progressMap?.[badge.badge_key]}
              onClick={() => setModalBadge(badge)}
            />
          ))}
        </div>
      )}

      {/* Modal */}
      {modalBadge && (
        <BadgeModal
          badge={modalBadge}
          userBadge={modalUserBadge}
          progress={progressMap?.[modalBadge.badge_key]}
          onClose={() => setModalBadge(null)}
        />
      )}
    </div>
  )
}
