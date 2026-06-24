'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Download } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { decodeDeckCode } from '@/lib/deckCode'
import { RavenofButton } from '@/components/ui/RavenofButton'

export function DeckImportButton() {
  const [open, setOpen] = useState(false)
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const router = useRouter()

  const doImport = async () => {
    const parsed = decodeDeckCode(code)
    if (!parsed) { setErr('Netinkamas kodas.'); return }
    setBusy(true); setErr(null)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setErr('Reikia prisijungti.'); setBusy(false); return }
    const ids = parsed.entries.map((e) => e.cardId)
    const { data: cards } = await supabase.from('cards').select('id, gold_cost, faction_id').in('id', ids)
    type CardRow = { id: string; gold_cost: number | null; faction_id: number | null }
    const rows = (cards ?? []) as CardRow[]
    const valid = new Set(rows.map((c) => c.id))
    const goldById: Record<string, number> = Object.fromEntries(rows.map((c) => [c.id, c.gold_cost ?? 0]))
    const entries = parsed.entries.filter((e) => valid.has(e.cardId))
    if (entries.length === 0) { setErr('Kodas neturi galiojančių kortų.'); setBusy(false); return }
    const cardCount = entries.reduce((s, e) => s + e.qty, 0)
    const totalGold = entries.reduce((s, e) => s + (goldById[e.cardId] || 0) * e.qty, 0)
    const avg = cardCount ? Math.round((totalGold / cardCount) * 100) / 100 : 0
    const faction = parsed.factionId ?? rows[0]?.faction_id ?? null
    const { data: deck, error: de } = await supabase.from('decks')
      .insert({ user_id: user.id, name: 'Importuota kaladė', description: 'Įkelta iš kodo', faction_id: faction, visibility: 'private', card_count: cardCount, avg_gold_cost: avg })
      .select('id').single()
    if (de || !deck) { setErr('Nepavyko sukurti kaladės.'); setBusy(false); return }
    const dcRows = entries.map((e) => ({ deck_id: deck.id, card_id: e.cardId, quantity: e.qty, is_side_deck: e.side }))
    let insErr = (await supabase.from('deck_cards').insert(dcRows)).error
    if (insErr && /is_side_deck|column|schema cache/i.test(insErr.message ?? '')) {
      insErr = (await supabase.from('deck_cards').insert(entries.filter((e) => !e.side).map((e) => ({ deck_id: deck.id, card_id: e.cardId, quantity: e.qty })))).error
    }
    setBusy(false)
    if (insErr) { setErr('Nepavyko įkelti kortų.'); return }
    setOpen(false); setCode(''); router.push(`/deck-builder/${deck.id}`)
  }

  return (
    <>
      <RavenofButton variant="secondary" size="md" onClick={() => setOpen(true)}>
        <Download className="w-4 h-4" /> Įkelti kodą
      </RavenofButton>
      {open && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.8)' }} onClick={() => !busy && setOpen(false)}>
          <div className="w-full max-w-md rounded-2xl p-5" style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-border)' }} onClick={(e) => e.stopPropagation()}>
            <p className="text-base font-bold mb-2" style={{ fontFamily: 'var(--rvn-font-display)', color: 'var(--gold)' }}>📥 Įkelti kaladę iš kodo</p>
            <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>Įklijuok dalijimosi kodą (RVN1-…). Bus sukurta nauja kaladė.</p>
            <textarea value={code} onChange={(e) => setCode(e.target.value)} rows={4} placeholder="RVN1-…" spellCheck={false}
              className="w-full px-3 py-2 rounded-lg text-xs font-mono" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--bg-border)', color: 'var(--text-primary)' }} />
            {err && <p className="text-xs mt-2" style={{ color: '#ef4444' }}>{err}</p>}
            <div className="flex gap-2 mt-3 justify-end">
              <button onClick={() => setOpen(false)} disabled={busy} className="px-3 py-1.5 rounded-lg text-xs" style={{ color: 'var(--text-muted)' }}>Atšaukti</button>
              <RavenofButton variant="gold" size="sm" onClick={doImport}>{busy ? 'Įkeliama…' : 'Įkelti'}</RavenofButton>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
