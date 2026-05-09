'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Edit2, Trash2, Lock, Globe, Link2, Plus, Copy } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { getFactionColor } from '@/lib/utils'
import type { DeckWithRelations } from '@/types'

type Props = {
  decks: DeckWithRelations[]
  userId: string
}

const VISIBILITY_LABEL: Record<string, { label: string; Icon: React.ElementType }> = {
  private:  { label: 'Privatus',  Icon: Lock },
  unlisted: { label: 'Nuoroda',   Icon: Link2 },
  public:   { label: 'Viešas',    Icon: Globe },
}

export function MyDecksList({ decks, userId }: Props) {
  const router = useRouter()
  const [deleting, setDeleting]     = useState<string | null>(null)
  const [confirmId, setConfirmId]   = useState<string | null>(null)
  const [duplicating, setDuplicating] = useState<string | null>(null)

  const handleDelete = async (deckId: string) => {
    setDeleting(deckId)
    const supabase = createClient()
    try {
      await supabase.from('deck_cards').delete().eq('deck_id', deckId)
      const { error } = await supabase
        .from('decks')
        .delete()
        .eq('id', deckId)
        .eq('user_id', userId)
      if (error) throw error
      router.refresh()
    } catch (err) {
      console.error('Delete deck error:', err)
      alert('Nepavyko ištrinti deck. Bandyk dar kartą.')
    } finally {
      setDeleting(null)
      setConfirmId(null)
    }
  }

  const handleDuplicate = async (deck: DeckWithRelations) => {
    setDuplicating(deck.id)
    const supabase = createClient()
    try {
      // Create new deck record
      const { data: newDeck, error: deckErr } = await supabase
        .from('decks')
        .insert({
          user_id:       userId,
          name:          `Kopija — ${deck.name}`,
          description:   deck.description ?? '',
          faction_id:    deck.faction_id,
          visibility:    'private',
          card_count:    deck.card_count,
          avg_gold_cost: deck.avg_gold_cost,
        })
        .select('id')
        .single()

      if (deckErr || !newDeck) throw deckErr ?? new Error('No deck returned')

      // Fetch original deck_cards
      const { data: deckCards, error: cardsErr } = await supabase
        .from('deck_cards')
        .select('card_id, quantity')
        .eq('deck_id', deck.id)

      if (cardsErr) throw cardsErr

      if (deckCards && deckCards.length > 0) {
        const rows = deckCards.map((dc) => ({
          deck_id:  newDeck.id,
          card_id:  dc.card_id,
          quantity: dc.quantity,
        }))
        const { error: insertErr } = await supabase.from('deck_cards').insert(rows)
        if (insertErr) throw insertErr
      }

      router.refresh()
    } catch (err) {
      console.error('Duplicate deck error:', err)
      alert('Nepavyko nukopijuoti deck. Bandyk dar kartą.')
    } finally {
      setDuplicating(null)
    }
  }

  if (decks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4 opacity-60">
        <p className="text-lg" style={{ fontFamily: 'Cinzel, Georgia, serif', color: 'var(--text-muted)' }}>
          Dar neturi jokio deck
        </p>
        <Link
          href="/deck-builder"
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-opacity hover:opacity-80"
          style={{ background: 'var(--gold)', color: '#0a0a0f' }}
        >
          <Plus className="w-4 h-4" />
          Sukurti pirmą deck
        </Link>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {decks.map((deck) => {
        const fColor     = getFactionColor(deck.faction?.color_hex)
        const vis        = VISIBILITY_LABEL[deck.visibility] ?? VISIBILITY_LABEL.private
        const VisIcon    = vis.Icon
        const isConfirming  = confirmId === deck.id
        const isDeleting    = deleting === deck.id
        const isDuplicating = duplicating === deck.id

        return (
          <div
            key={deck.id}
            className="rounded-xl p-4 flex flex-col gap-3 transition-all"
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid ' + fColor + '30',
            }}
          >
            {/* Faction color bar */}
            <div
              className="h-1 rounded-full -mt-1 mb-0"
              style={{ background: fColor, opacity: 0.6 }}
            />

            {/* Name */}
            <div className="flex-1">
              <h2
                className="text-base font-bold leading-tight"
                style={{ fontFamily: 'Cinzel, Georgia, serif', color: 'var(--text-primary)' }}
              >
                {deck.name}
              </h2>
              {deck.description && (
                <p className="text-xs mt-1 line-clamp-2" style={{ color: 'var(--text-muted)' }}>
                  {deck.description}
                </p>
              )}
            </div>

            {/* Meta */}
            <div className="flex flex-wrap gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
              <span
                className="px-1.5 py-0.5 rounded"
                style={{ background: fColor + '20', color: fColor }}
              >
                {deck.faction?.name ?? 'Nėra frakcijos'}
              </span>
              <span>{deck.card_count} kortų</span>
              {deck.avg_gold_cost > 0 && <span>{deck.avg_gold_cost}⚜ avg</span>}
              <span className="flex items-center gap-1">
                <VisIcon className="w-3 h-3" />
                {vis.label}
              </span>
            </div>

            {/* Updated */}
            <p className="text-xs" style={{ color: 'var(--text-muted)', opacity: 0.5 }}>
              {new Date(deck.updated_at).toLocaleDateString('lt-LT')}
            </p>

            {/* Actions */}
            <div className="flex gap-2 pt-1 border-t" style={{ borderColor: 'var(--bg-border)' }}>
              {/* Edit */}
              <Link
                href={`/deck-builder/${deck.id}`}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium flex-1 justify-center transition-opacity hover:opacity-80"
                style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}
              >
                <Edit2 className="w-3 h-3" />
                Redaguoti
              </Link>

              {/* Duplicate */}
              <button
                onClick={() => handleDuplicate(deck)}
                disabled={isDuplicating}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-opacity hover:opacity-80 disabled:opacity-40"
                style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)' }}
                title="Kopijuoti deck"
              >
                {isDuplicating ? (
                  <span className="text-xs">...</span>
                ) : (
                  <Copy className="w-3 h-3" />
                )}
              </button>

              {/* Delete */}
              {!isConfirming ? (
                <button
                  onClick={() => setConfirmId(deck.id)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-opacity hover:opacity-80"
                  style={{ background: 'var(--bg-elevated)', color: '#ef4444' }}
                  title="Ištrinti deck"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              ) : (
                <div className="flex gap-1">
                  <button
                    onClick={() => handleDelete(deck.id)}
                    disabled={isDeleting}
                    className="px-2.5 py-1.5 rounded-lg text-xs font-medium transition-opacity hover:opacity-80 disabled:opacity-40"
                    style={{ background: '#ef4444', color: 'white' }}
                  >
                    {isDeleting ? '...' : 'Ištrinti'}
                  </button>
                  <button
                    onClick={() => setConfirmId(null)}
                    className="px-2.5 py-1.5 rounded-lg text-xs font-medium transition-opacity hover:opacity-80"
                    style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)' }}
                  >
                    Ne
                  </button>
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
