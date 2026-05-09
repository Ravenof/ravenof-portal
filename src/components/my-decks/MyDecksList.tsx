'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Edit2, Trash2, Lock, Globe, Link2, Plus } from 'lucide-react'
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
  const [deleting, setDeleting] = useState<string | null>(null)
  const [confirmId, setConfirmId] = useState<string | null>(null)

  const handleDelete = async (deckId: string) => {
    setDeleting(deckId)
    const supabase = createClient()
    try {
      // deck_cards cascade deleted via FK or we delete manually
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
        const fColor = getFactionColor(deck.faction?.color_hex)
        const vis = VISIBILITY_LABEL[deck.visibility] ?? VISIBILITY_LABEL.private
        const VisIcon = vis.Icon
        const isConfirming = confirmId === deck.id
        const isDeleting = deleting === deck.id

        return (
          <div
            key={deck.id}
            className="rounded-xl p-4 flex flex-col gap-3 transition-all"
            style={{
              background: 'var(--bg-surface)',
              border: `1px solid ${fColor}30`,
              boxShadow: `0 0 0 1px transparent`,
            }}
          >
            {/* Faction bar */}
            <div
              className="h-1 rounded-full -mt-1 mb-1"
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
              <Link
                href={`/deck-builder/${deck.id}`}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium flex-1 justify-center transition-opacity hover:opacity-80"
                style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}
              >
                <Edit2 className="w-3 h-3" />
                Redaguoti
              </Link>

              {!isConfirming ? (
                <button
                  onClick={() => setConfirmId(deck.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-opacity hover:opacity-80"
                  style={{ background: 'var(--bg-elevated)', color: '#ef4444' }}
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              ) : (
                <div className="flex gap-1">
                  <button
                    onClick={() => handleDelete(deck.id)}
                    disabled={isDeleting}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium transition-opacity hover:opacity-80 disabled:opacity-40"
                    style={{ background: '#ef4444', color: 'white' }}
                  >
                    {isDeleting ? '...' : 'Ištrinti'}
                  </button>
                  <button
                    onClick={() => setConfirmId(null)}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium transition-opacity hover:opacity-80"
                    style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)' }}
                  >
                    Atšaukti
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
