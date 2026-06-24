'use client'

import { useState } from 'react'
import { Copy, Check } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { encodeDeckCode } from '@/lib/deckCode'
import { RavenofButton } from '@/components/ui/RavenofButton'

export function ShareCodeButton({ deckId, factionId }: { deckId: string; factionId: number | null }) {
  const [state, setState] = useState<'idle' | 'busy' | 'done' | 'err'>('idle')

  const onClick = async () => {
    if (state === 'busy') return
    setState('busy')
    const supabase = createClient()
    let { data, error } = await supabase.from('deck_cards').select('card_id, quantity, is_side_deck').eq('deck_id', deckId)
    if (error) { const r = await supabase.from('deck_cards').select('card_id, quantity').eq('deck_id', deckId); data = r.data as typeof data; error = r.error }
    if (error || !data || data.length === 0) { setState('err'); setTimeout(() => setState('idle'), 1800); return }
    const code = encodeDeckCode(factionId, data.map((d) => ({ cardId: (d as { card_id: string }).card_id, qty: (d as { quantity: number }).quantity, side: !!(d as { is_side_deck?: boolean }).is_side_deck })))
    try { await navigator.clipboard.writeText(code) } catch { /* clipboard gali būti neprieinama */ }
    setState('done'); setTimeout(() => setState('idle'), 1800)
  }

  return (
    <RavenofButton variant="muted" size="sm" onClick={onClick} title="Kopijuoti dalijimosi kodą">
      {state === 'done' ? <Check className="w-3 h-3" style={{ color: '#4ade80' }} /> : <Copy className="w-3 h-3" />}
    </RavenofButton>
  )
}
