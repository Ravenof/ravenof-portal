'use client'

import Link from 'next/link'
import { getFactionColor } from '@/lib/utils'
import { VoteWidget } from './VoteWidget'
import type { PublicDeck } from '@/types'

type Props = {
  deck: PublicDeck
  userId: string | null
}

export function CommunityDeckCard({ deck, userId }: Props) {
  const fColor = getFactionColor(deck.faction?.color_hex)

  return (
    <div
      className="rounded-xl p-4 flex gap-3 transition-all hover:border-opacity-60"
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid ' + fColor + '30',
      }}
    >
      {/* Vote */}
      <div className="flex-shrink-0 pt-1">
        <VoteWidget
          deckId={deck.id}
          initialScore={deck.score}
          initialVote={deck.user_vote}
          userId={userId}
          size="sm"
        />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Faction bar */}
        <div
          className="h-0.5 rounded-full mb-2"
          style={{ background: fColor, opacity: 0.5, width: '40px' }}
        />

        <Link
          href={'/community-decks/' + deck.id}
          className="font-bold text-sm leading-tight hover:underline block truncate"
          style={{ fontFamily: 'Cinzel, Georgia, serif', color: 'var(--text-primary)' }}
        >
          {deck.name}
        </Link>

        {deck.description && (
          <p className="text-xs mt-0.5 line-clamp-1" style={{ color: 'var(--text-muted)' }}>
            {deck.description}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-2 mt-2 text-xs" style={{ color: 'var(--text-muted)' }}>
          <span
            className="px-1.5 py-0.5 rounded"
            style={{ background: fColor + '20', color: fColor, fontSize: '11px' }}
          >
            {deck.faction?.name ?? '—'}
          </span>
          <span>{deck.card_count} kortų</span>
          {deck.avg_gold_cost > 0 && <span>{deck.avg_gold_cost}⚜ avg</span>}
          {deck.author && (
            <span>
              {'by '}
              <Link
                href={'/users/' + deck.author.username}
                className="hover:underline"
                style={{ color: 'var(--text-secondary)' }}
              >
                {deck.author.display_name ?? deck.author.username}
              </Link>
            </span>
          )}
          <span style={{ opacity: 0.5 }}>
            {new Date(deck.updated_at).toLocaleDateString('lt-LT')}
          </span>
        </div>
      </div>
    </div>
  )
}
