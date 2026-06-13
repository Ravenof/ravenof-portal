'use client'

import { useRouter } from 'next/navigation'
import { Save, Check, Loader2 } from 'lucide-react'
import { useDeckBuilderStore } from '@/stores/deckBuilderStore'
import { isDeckValid, validateDeck } from '@/lib/deck-validation'
import { createClient } from '@/lib/supabase/client'
import { RavenofButton } from '@/components/ui/RavenofButton'

type Props = { userId: string }

export function SaveDeckButton({ userId }: Props) {
  const store = useDeckBuilderStore()
  const router = useRouter()
  const { deckId, name, description, factionId, visibility, entries, sideEntries, isSaving, setIsSaving, markSaved, isDirty } = store

  const warnings = validateDeck(entries, factionId, name)
  const hasErrors = warnings.some((w) => w.type === 'error')
  const canSave = !hasErrors && !isSaving

  const handleSave = async () => {
    if (!canSave) return
    setIsSaving(true)

    const supabase = createClient()
    const totalCards = entries.reduce((s, e) => s + e.quantity, 0)
    const avgGold = totalCards === 0 ? 0 :
      Math.round(entries.reduce((s, e) => s + (e.card.gold_cost ?? 0) * e.quantity, 0) / totalCards)

    try {
      let savedDeckId = deckId

      if (deckId) {
        const { error } = await supabase
          .from('decks')
          .update({
            name: name.trim(),
            description: description.trim() || null,
            faction_id: factionId,
            visibility,
            card_count: totalCards,
            avg_gold_cost: avgGold,
            updated_at: new Date().toISOString(),
          })
          .eq('id', deckId)
          .eq('user_id', userId)
        if (error) throw error
      } else {
        const { data, error } = await supabase
          .from('decks')
          .insert({
            user_id: userId,
            name: name.trim(),
            description: description.trim() || null,
            faction_id: factionId,
            visibility,
            card_count: totalCards,
            avg_gold_cost: avgGold,
          })
          .select('id')
          .single()
        if (error) throw error
        savedDeckId = data.id
      }

      if (savedDeckId) {
        await supabase.from('deck_cards').delete().eq('deck_id', savedDeckId)

        const rows = [
          ...entries.map((e) => ({
            deck_id:  savedDeckId!,
            card_id:  e.card.id,
            quantity: e.quantity,
            is_side_deck: false,
          })),
          ...sideEntries.map((e) => ({
            deck_id:  savedDeckId!,
            card_id:  e.card.id,
            quantity: e.quantity,
            is_side_deck: true,
          })),
        ]
        if (rows.length > 0) {
          const { error } = await supabase.from('deck_cards').insert(rows)
          if (error) throw error
        }

        markSaved(savedDeckId)
        router.push('/my-decks')
      }
    } catch (err) {
      console.error('Save deck error:', err)
      alert('Nepavyko išsaugoti kaladės. Bandyk dar kartą.')
    } finally {
      setIsSaving(false)
    }
  }

  const title = hasErrors
    ? warnings.filter((w) => w.type === 'error').map((w) => w.message).join('\n')
    : 'Išsaugoti kaladę'

  return (
    <RavenofButton
      variant={canSave ? 'gold' : 'secondary'}
      size="md"
      onClick={handleSave}
      disabled={!canSave}
      title={title}
    >
      {isSaving
        ? <Loader2 className="w-4 h-4 animate-spin" />
        : !isDirty && deckId
          ? <Check className="w-4 h-4" />
          : <Save className="w-4 h-4" />
      }
      {isSaving ? 'Saugoma...' : 'Išsaugoti'}
    </RavenofButton>
  )
}
