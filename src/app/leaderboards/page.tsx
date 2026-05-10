import Link from 'next/link'
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
  { key: 'level', label: 'Lygis / XP' },
  { key: 'cards', label: 'Kortos' },
  { key: 'decks', label: 'Kaladžių upvotes' },
  { key: 'events', label: 'Renginiai' },
  { key: 'badges', label: 'Ženkleliai' },
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
      badge: r.rank_title ?? r.rank_key,
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
    secondaryLabel = 'Deck\'ai'
    rows = items.map((r, i) => ({
      rank: i + 1,
      username: r.username,
      primary: r.total_upvotes,
      secondary: r.public_decks_count,
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
        style={{ background: 'rgba(10,10,15,0.95)', backdropFilter: 'blur(12px)', borderColor: 'var(--bg-border)' }}
      >
        <div className="flex items-center gap-3">
          <Link href="/cards" className="text-xs hover:opacity-70" style={{ color: 'var(--text-muted)' }}>&larr; Kortų bazė</Link>
          <span style={{ color: 'var(--bg-border)' }}>|</span>
          <h1 className="text-xl font-bold" style={{ fontFamily: 'Cinzel, Georgia, serif', color: 'var(--gold)' }}>
            Ravenof Topai
          </h1>
        </div>
      </header>

      <div className="max-w-screen-lg mx-auto px-4 py-6 space-y-6">
        {/* Tab selector */}
        <div className="flex gap-1 flex-wrap">
          {TABS.map((t) => (
            <Link
              key={t.key}
              href={`?tab=${t.key}`}
              className="px-4 py-1.5 rounded-lg text-sm font-medium transition"
              style={{
                background: tab === t.key ? 'var(--gold)' : 'var(--bg-surface)',
                color: tab === t.key ? '#0a0a0f' : 'var(--text-muted)',
                border: '1px solid ' + (tab === t.key ? 'var(--gold)' : 'var(--bg-border)'),
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
