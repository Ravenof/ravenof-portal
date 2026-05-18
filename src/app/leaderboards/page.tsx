import Link from 'next/link'
import { getLevelTitleForXp } from '@/lib/gamification/levels'
import { createClient } from '@/lib/supabase/server'
import { LeaderboardTable } from '@/components/leaderboards/LeaderboardTable'
import type {
  LevelLeaderboardRow,
  CollectionLeaderboardRow,
  DeckUpvotesLeaderboardRow,
  EventsLeaderboardRow,
  BadgesLeaderboardRow,
} from '@/types'
import type { LeaderboardRow } from '@/components/leaderboards/LeaderboardTable'

export const revalidate = 60

type Tab = 'level' | 'cards' | 'decks' | 'events' | 'badges'
type SearchParams = Promise<{ tab?: string }>

const TABS: { key: Tab; label: string }[] = [
  { key: 'level',  label: 'Lygis / XP'       },
  { key: 'cards',  label: 'Kortos'            },
  { key: 'decks',  label: 'Kaladžių upvotes'  },
  { key: 'events', label: 'Renginiai'         },
  { key: 'badges', label: 'Ženkleliai'        },
]

export default async function LeaderboardsPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams
  const tab = (params.tab ?? 'level') as Tab
  const supabase = await createClient()

  let rows: LeaderboardRow[] = []
  let primaryLabel = ''
  let secondaryLabel: string | undefined

  if (tab === 'level') {
    const { data } = await supabase.rpc('get_level_leaderboard', { p_limit: 50 })
    const items = (data ?? []) as LevelLeaderboardRow[]
    primaryLabel = 'XP'
    secondaryLabel = 'Lygis'
    rows = items.map((r, i) => ({
      rank: i + 1,
      username: r.username,
      primary: r.xp_total.toLocaleString(),
      secondary: `Lv ${r.level}`,
      badge: getLevelTitleForXp(r.xp_total),
    }))
  } else if (tab === 'cards') {
    const { data } = await supabase.rpc('get_collection_leaderboard', { p_limit: 50 })
    const items = (data ?? []) as CollectionLeaderboardRow[]
    primaryLabel = 'Kortos'
    secondaryLabel = '%'
    rows = items.map((r, i) => ({
      rank: i + 1,
      username: r.username,
      primary: r.owned_count,
      secondary: r.completion_pct + '%',
    }))
  } else if (tab === 'decks') {
    const { data } = await supabase.rpc('get_deck_upvotes_leaderboard', { p_limit: 50 })
    const items = (data ?? []) as DeckUpvotesLeaderboardRow[]
    primaryLabel = 'Upvotes'
    rows = items.map((r, i) => ({
      rank: i + 1,
      username: r.username,
      primary: r.total_upvotes,
    }))
  } else if (tab === 'events') {
    const { data } = await supabase.rpc('get_events_leaderboard', { p_limit: 50 })
    const items = (data ?? []) as EventsLeaderboardRow[]
    primaryLabel = 'Renginiai'
    rows = items.map((r, i) => ({
      rank: i + 1,
      username: r.username,
      primary: r.attended_count,
    }))
  } else if (tab === 'badges') {
    const { data } = await supabase.rpc('get_badges_leaderboard', { p_limit: 50 })
    const items = (data ?? []) as BadgesLeaderboardRow[]
    primaryLabel = 'Ženkleliai'
    rows = items.map((r, i) => ({
      rank: i + 1,
      username: r.username,
      primary: r.badges_count,
    }))
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-base)' }}>
      <header
        className="sticky top-0 z-20 border-b px-4 py-3 flex items-center justify-between gap-3"
        style={{
          background:     'rgba(7,7,15,0.95)',
          backdropFilter: 'blur(16px)',
          borderColor:    'rgba(240,180,41,0.1)',
          boxShadow:      '0 1px 0 rgba(240,180,41,0.06)',
        }}
      >
        <div className="flex items-center gap-3">
          <Link href="/cards" className="text-xs hover:opacity-70 transition-opacity" style={{ color: 'var(--text-muted)' }}>
            Kortų bazė
          </Link>
          <span style={{ color: 'var(--bg-border)' }}>|</span>
          <h1
            className="text-lg font-bold"
            style={{
              fontFamily:    'var(--rvn-font-display)',
              color:         'var(--gold)',
              textShadow:    '0 0 16px rgba(240,180,41,0.3)',
              letterSpacing: '0.06em',
            }}
          >
            Ravenof Topai
          </h1>
        </div>
      </header>

      <div className="max-w-screen-lg mx-auto px-4 py-6 space-y-6">
        <div className="flex gap-1.5 flex-wrap">
          {TABS.map((t) => (
            <Link
              key={t.key}
              href={`?tab=${t.key}`}
              className="px-4 py-2 rounded-xl text-xs font-semibold transition-all"
              style={{
                background:    tab === t.key
                  ? 'linear-gradient(135deg,#92400e,#b45309)'
                  : 'var(--bg-surface)',
                color:         tab === t.key ? 'var(--gold)' : 'var(--text-muted)',
                border:        tab === t.key
                  ? '1px solid rgba(240,180,41,0.35)'
                  : '1px solid var(--bg-border)',
                boxShadow:     tab === t.key ? '0 0 10px rgba(240,180,41,0.15)' : 'none',
                fontFamily:    'var(--rvn-font-display)',
                letterSpacing: '0.04em',
              }}
            >
              {t.label}
            </Link>
          ))}
        </div>

        <LeaderboardTable rows={rows} primaryLabel={primaryLabel} secondaryLabel={secondaryLabel} />

        <p className="text-xs text-center" style={{ color: 'var(--text-muted)' }}>
          Topuose rodomi tik žaidėjai, kurie leido dalintis savo statistika.{' '}
          <Link href="/profile/settings" className="underline hover:opacity-80">Nustatymai</Link>
        </p>
      </div>
    </div>
  )
}
