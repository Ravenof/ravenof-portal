'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Copy } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { DeckCardWithCard } from '@/types'

type Props = {
  deckId: string
  deckName: string
  factionId: number | null
  cardCount: number
  avgGoldCost: number
  cards: DeckCardWithCard[]
  userId: string | null
}

export function CopyToDeckButton({ deckId, deckName, factionId, cardCount, avgGoldCost, cards, userId }: Props) {
  const router = useRouter()
  const [state, setState] = useState<'idle' | 'copying' | 'done' | 'error'>('idle')

  const handleCopy = async () => {
    if (!userId) {
      router.push('/login')
      return
    }
    if (state === 'copying') return
    setState('copying')

    try {
      const supabase = createClient()

      const { data: newDeck, error: deckErr } = await supabase
        .from('decks')
        .insert({
          user_id:       userId,
          name:          'Kopija — ' + deckName,
          description:   'Nukopijuota iš viešų kaladžių',
          faction_id:    factionId,
          visibility:    'private',
          card_count:    cardCount,
          avg_gold_cost: avgGoldCost,
          score:         0,
        })
        .select('id')
        .single()

      if (deckErr || !newDeck) throw deckErr ?? new Error('No deck returned')

      if (cards.length > 0) {
        const rows = cards.map((dc) => ({
          deck_id:  newDeck.id,
          card_id:  dc.card.id,
          quantity: dc.quantity,
        }))
        const { error: insertErr } = await supabase.from('deck_cards').insert(rows)
        if (insertErr) throw insertErr
      }

      setState('done')
      setTimeout(() => {
        router.push('/my-decks')
      }, 1200)
    } catch (err) {
      console.error('Copy deck error:', err)
      setState('error')
      setTimeout(() => setState('idle'), 2500)
    }
  }

  const labels = {
    idle:    'Kopijuoti į mano kaladės',
    copying: 'Kopijuojama...',
    done:    'Nukopijuota! Nukreipiama...',
    error:   'Klaida. Bandyk dar kartą',
  }

  const colors = {
    idle:    { bg: 'var(--gold)', color: '#0a0a0f' },
    copying: { bg: 'var(--gold)', color: '#0a0a0f' },
    done:    { bg: '#22c55e', color: 'white' },
    error:   { bg: '#ef4444', color: 'white' },
  }

  return (
    <button
      onClick={handleCopy}
      disabled={state === 'copying' || state === 'done'}
      className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-60"
      style={colors[state]}
    >
      <Copy className="w-4 h-4" />
      {labels[state]}
    </button>
  )
}
