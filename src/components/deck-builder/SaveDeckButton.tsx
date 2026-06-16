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
          let insErr = (await supabase.from('deck_cards').insert(rows)).error
          // Atsarginis kelias: jei DB API schemos cache dar nemato „is_side_deck"
          // stulpelio (PGRST204), saugom be jo – kad kaladės išsaugojimas (pvz.
          // privati → vieša) ir kortos nedingtų. Side deck (prakeiksmai) tada praleidžiami.
          if (insErr && /is_side_deck|schema cache|column .* does not exist/i.test(insErr.message ?? '')) {
            const mainRows = entries.map((e) => ({ deck_id: savedDeckId!, card_id: e.card.id, quantity: e.quantity }))
            insErr = mainRows.length > 0 ? (await supabase.from('deck_cards').insert(mainRows)).error : null
            if (!insErr && sideEntries.length > 0) {
              alert('Kaladė išsaugota, bet prakeiksmų (side deck) išsaugoti nepavyko – DB API dar nemato „is_side_deck" stulpelio. Perkrauk Supabase projektą (Settings → Restart) ir išsaugok dar kartą.')
            }
          }
          if (insErr) throw insErr
        }

        markSaved(savedDeckId)
        router.push('/my-decks')
      }
    } catch (err) {
      console.error('Save deck error:', err)
      const msg = (err as { message?: string })?.message ?? String(err)
      if (/is_side_deck|column .* does not exist|schema cache/i.test(msg)) {
        alert('Nepavyko išsaugoti: duomenų bazėje dar nėra „is_side_deck" stulpelio. Paleisk migraciją supabase/migrations/20260613_deck_side_deck.sql Supabase SQL editoriuje.')
      } else {
        alert('Nepavyko išsaugoti kaladės: ' + msg)
      }
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
