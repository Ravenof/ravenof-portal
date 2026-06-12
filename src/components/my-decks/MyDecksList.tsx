'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Edit2, Trash2, Lock, Globe, Link2, Plus, Copy } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { getFactionColor } from '@/lib/utils'
import { RavenofButton } from '@/components/ui/RavenofButton'
import type { DeckWithRelations } from '@/types'
import { PlaytestButton } from '@/components/decks/PlaytestButton'
import { TutorialButton } from '@/components/tutorial/TutorialButton'

type Props = {
  decks: DeckWithRelations[]
  userId: string
  deckOwnership?: Record<string, { missing: number; total: number }>
}

const VISIBILITY_LABEL: Record<string, { label: string; Icon: React.ElementType }> = {
  private:  { label: 'Privatus',  Icon: Lock },
  unlisted: { label: 'Nuoroda',   Icon: Link2 },
  public:   { label: 'Viešas',    Icon: Globe },
}

export function MyDecksList({ decks, userId, deckOwnership = {} }: Props) {
  const router = useRouter()
  const [deleting, setDeleting]       = useState<string | null>(null)
  const [confirmId, setConfirmId]     = useState<string | null>(null)
  const [duplicating, setDuplicating] = useState<string | null>(null)
  const [copied, setCopied]           = useState<string | null>(null)

  const handleShare = async (deckId: string) => {
    const url = `${window.location.origin}/community-decks/${deckId}`
    try {
      await navigator.clipboard.writeText(url)
    } catch {
      // fallback
      const el = document.createElement('textarea')
      el.value = url
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
    }
    setCopied(deckId)
    setTimeout(() => setCopied(null), 2000)
  }

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
      alert('Nepavyko ištrinti kaladę. Bandyk dar kartą.')
    } finally {
      setDeleting(null)
      setConfirmId(null)
    }
  }

  const handleDuplicate = async (deck: DeckWithRelations) => {
    setDuplicating(deck.id)
    const supabase = createClient()
    try {
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
      alert('Nepavyko nukopijuoti kaladę. Bandyk dar kartą.')
    } finally {
      setDuplicating(null)
    }
  }

  if (decks.length === 0) {
    return (
      <div className="rvn-panel-gold flex flex-col items-center justify-center py-16 gap-5 text-center max-w-sm mx-auto mt-12">
        <div className="text-5xl">📚</div>
        <div>
          <p
            className="text-base font-semibold mb-1"
            style={{ fontFamily: 'var(--rvn-font-display)', color: 'var(--text-primary)' }}
          >
            Dar neturite kaladžių
          </p>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Sukurkite savo pirmą kaladę ir pradėkite žaisti.
          </p>
        </div>
        <Link href="/deck-builder">
          <RavenofButton variant="gold" size="md">
            <Plus className="w-4 h-4" />
            Sukurti pirmą kaladę
          </RavenofButton>
        </Link>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {decks.map((deck) => {
        const fColor        = getFactionColor(deck.faction?.color_hex)
        const vis           = VISIBILITY_LABEL[deck.visibility] ?? VISIBILITY_LABEL.private
        const VisIcon       = vis.Icon
        const isConfirming  = confirmId === deck.id
        const isDeleting    = deleting === deck.id
        const isDuplicating = duplicating === deck.id
        const ownership     = deckOwnership[deck.id]
        const missing       = ownership?.missing ?? null

        return (
          <div
            key={deck.id}
            className="rounded-xl p-4 flex flex-col gap-3 transition-all hover:border-[rgba(240,180,41,0.2)]"
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
                style={{ fontFamily: 'var(--rvn-font-display)', color: 'var(--text-primary)' }}
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
              {deck.avg_gold_cost > 0 && <span>vid. {deck.avg_gold_cost}⚜</span>}
              <span className="flex items-center gap-1">
                <VisIcon className="w-3 h-3" />
                {vis.label}
              </span>
            </div>

            {/* Collection status */}
            {missing !== null && (
              <div className="flex items-center gap-1.5">
                {missing === 0 ? (
                  <span
                    className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-semibold"
                    style={{ background: 'rgba(74,222,128,0.1)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.2)' }}
                  >
                    ✓ Turiu visas kortas
                  </span>
                ) : (
                  <span
                    className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full"
                    style={{ background: 'rgba(240,180,41,0.08)', color: 'rgba(240,180,41,0.7)', border: '1px solid rgba(240,180,41,0.2)' }}
                  >
                    Kolekcijoje trūksta {missing} {missing === 1 ? 'kortos' : 'kortų'}
                  </span>
                )}
              </div>
            )}

            {/* Updated */}
            <p className="text-xs" style={{ color: 'var(--text-muted)', opacity: 0.5 }}>
              {new Date(deck.updated_at).toLocaleDateString('lt-LT')}
            </p>

            {/* Actions */}
            <div className="flex gap-2 pt-2 border-t" style={{ borderColor: 'var(--bg-border)' }}>
              {/* Playtest */}
              <div className="flex-1">
                <PlaytestButton deckId={deck.id} deckName={deck.name} variant="compact" />
              </div>
              {/* Tutorial */}
              <div className="flex-1">
                <TutorialButton deckId={deck.id} deckName={deck.name} variant="compact" />
              </div>
              {/* Edit */}
              <Link href={`/deck-builder/${deck.id}`} className="flex-1">
                <RavenofButton variant="secondary" size="sm" fullWidth>
                  <Edit2 className="w-3 h-3" />
                  Redaguoti
                </RavenofButton>
              </Link>

              {/* Share link (public/unlisted only) */}
              {(deck.visibility === 'public' || deck.visibility === 'unlisted') && (
                <RavenofButton
                  variant="muted"
                  size="sm"
                  onClick={() => handleShare(deck.id)}
                  title="Kopijuoti nuorodą"
                  style={copied === deck.id ? { color: '#4ade80', borderColor: 'rgba(74,222,128,0.4)' } : undefined}
                >
                  {copied === deck.id ? (
                    <span className="text-xs font-semibold">✓</span>
                  ) : (
                    <Link2 className="w-3 h-3" />
                  )}
                </RavenofButton>
              )}

              {/* Duplicate */}
              <RavenofButton
                variant="muted"
                size="sm"
                onClick={() => handleDuplicate(deck)}
                disabled={isDuplicating}
                title="Kopijuoti kaladę"
              >
                {isDuplicating ? (
                  <span className="text-xs">...</span>
                ) : (
                  <Copy className="w-3 h-3" />
                )}
              </RavenofButton>

              {/* Delete */}
              {!isConfirming ? (
                <RavenofButton
                  variant="danger"
                  size="sm"
                  onClick={() => setConfirmId(deck.id)}
                  title="Ištrinti kaladę"
                >
                  <Trash2 className="w-3 h-3" />
                </RavenofButton>
              ) : (
                <div className="flex gap-1">
                  <RavenofButton
                    variant="danger"
                    size="sm"
                    onClick={() => handleDelete(deck.id)}
                    disabled={isDeleting}
                  >
                    {isDeleting ? '...' : 'Ištrinti'}
                  </RavenofButton>
                  <RavenofButton
                    variant="secondary"
                    size="sm"
                    onClick={() => setConfirmId(null)}
                  >
                    Ne
                  </RavenofButton>
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
