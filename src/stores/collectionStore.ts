'use client'

import { create } from 'zustand'
import { createClient } from '@/lib/supabase/client'
import type { CollectionMap } from '@/types'

type CollectionStore = {
  collection: CollectionMap
  isLoaded: boolean
  init: (map: CollectionMap) => void
  toggleOwned: (cardId: string) => Promise<void>
  getQuantity: (cardId: string) => number
}

export const useCollectionStore = create<CollectionStore>((set, get) => ({
  collection: {},
  isLoaded: false,

  init: (map) => {
    set({ collection: map, isLoaded: true })
  },

  toggleOwned: async (cardId) => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const currentQty = get().collection[cardId] ?? 0
    const newQty = currentQty > 0 ? 0 : 1

    // Optimistic update
    set((state) => ({
      collection: { ...state.collection, [cardId]: newQty },
    }))

    try {
      if (newQty === 0) {
        const { error } = await supabase
          .from('user_collections')
          .delete()
          .eq('user_id', user.id)
          .eq('card_id', cardId)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('user_collections')
          .upsert(
            { user_id: user.id, card_id: cardId, quantity: 1 },
            { onConflict: 'user_id,card_id' }
          )
        if (error) throw error
      }
    } catch (err) {
      // Rollback
      set((state) => ({
        collection: { ...state.collection, [cardId]: currentQty },
      }))
      console.error('Collection toggle failed:', err)
    }
  },

  getQuantity: (cardId) => get().collection[cardId] ?? 0,
}))
