'use client'

// ── Ravenof Digital — Mano kaladės (mobile sąrašas su veiksmais) ──────────────
import { useCallback, useEffect, useState } from 'react'
import { Edit2, Trash2, Copy, MoreVertical, Plus, Lock, Globe, CheckCircle2, AlertCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { playUiClick, playSuccess, playError } from '@/lib/ui-sound'
import { PlaytestButton } from '@/components/decks/PlaytestButton'
import { DECK_MIN, DECK_MAX } from '@/lib/deck-validation'

type Deck = {
  id: string; name: string; faction: string | null; factionColor: string
  visibility: string; cardCount: number; avgGold: number; missing: number | null
}

export function DigitalMyDecks({ userId, onEdit, onCreate }: { userId: string; onEdit: (id: string) => void; onCreate: () => void }) {
  const [decks, setDecks] = useState<Deck[] | null>(null)
  const [menu, setMenu] = useState<string | null>(null)
  const [confirmDel, setConfirmDel] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const flash = (m: string, err = false) => { (err ? playError : playSuccess)(); setToast(m) }
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), 2000); return () => clearTimeout(t) }, [toast])

  const load = useCallback(async () => {
    const supabase = createClient()
    const [{ data: deckRows }, { data: colRows }] = await Promise.all([
      supabase.from('decks').select('id, name, faction_id, visibility, card_count, avg_gold_cost, faction:factions ( name, color_hex )').eq('user_id', userId).not('name', 'ilike', '[Kampanija]%').order('updated_at', { ascending: false }),
      supabase.from('user_collections').select('card_id, quantity').eq('user_id', userId),
    ])
    type DR = { id: string; name: string; faction_id: number | null; visibility: string; card_count: number; avg_gold_cost: number; faction: { name: string; color_hex: string } | null }
    const rows = (deckRows as unknown as DR[]) ?? []
    const owned: Record<string, number> = Object.fromEntries(((colRows as { card_id: string; quantity: number }[]) ?? []).map((r) => [r.card_id, r.quantity]))
    const ids = rows.map((d) => d.id)
    const missingMap: Record<string, number> = {}
    if (ids.length) {
      const { data: dc } = await supabase.from('deck_cards').select('deck_id, card_id, quantity').in('deck_id', ids)
      for (const r of ((dc as { deck_id: string; card_id: string; quantity: number }[]) ?? [])) {
        const have = owned[r.card_id] ?? 0
        if (have < r.quantity) missingMap[r.deck_id] = (missingMap[r.deck_id] ?? 0) + (r.quantity - have)
      }
    }
    setDecks(rows.map((d) => ({ id: d.id, name: d.name, faction: d.faction?.name ?? null, factionColor: d.faction?.color_hex ?? '#f0b429', visibility: d.visibility, cardCount: d.card_count, avgGold: d.avg_gold_cost, missing: ids.includes(d.id) ? (missingMap[d.id] ?? 0) : 0 })))
  }, [userId])

  useEffect(() => { load() }, [load])

  const duplicate = async (id: string) => {
    setBusy(id); setMenu(null); playUiClick()
    const supabase = createClient()
    try {
      const { data: orig, error: oErr } = await supabase.from('decks').select('name, description, faction_id, card_count, avg_gold_cost').eq('id', id).single()
      if (oErr || !orig) throw oErr ?? new Error('no deck')
      const o = orig as { name: string; description: string | null; faction_id: number | null; card_count: number; avg_gold_cost: number }
      const { data: nd, error } = await supabase.from('decks').insert({ user_id: userId, name: `Kopija — ${o.name}`, description: o.description, faction_id: o.faction_id, visibility: 'private', card_count: o.card_count, avg_gold_cost: o.avg_gold_cost }).select('id').single()
      if (error) throw error
      const { data: cards } = await supabase.from('deck_cards').select('card_id, quantity').eq('deck_id', id)
      const rows = ((cards as { card_id: string; quantity: number }[]) ?? []).map((c) => ({ deck_id: nd.id, card_id: c.card_id, quantity: c.quantity }))
      if (rows.length) await supabase.from('deck_cards').insert(rows)
      flash('Kaladė nukopijuota'); load()
    } catch { flash('Nepavyko nukopijuoti', true) } finally { setBusy(null) }
  }

  const del = async (id: string) => {
    setBusy(id); playUiClick()
    const supabase = createClient()
    try {
      await supabase.from('deck_cards').delete().eq('deck_id', id)
      const { error } = await supabase.from('decks').delete().eq('id', id).eq('user_id', userId)
      if (error) throw error
      flash('Kaladė ištrinta'); setConfirmDel(null); load()
    } catch { flash('Nepavyko ištrinti', true) } finally { setBusy(null) }
  }

  if (decks === null) return <p className="text-center text-sm py-16" style={{ color: 'var(--text-muted)' }}>Kraunama…</p>

  if (decks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
        <div className="text-5xl">📚</div>
        <div>
          <p className="text-base font-bold" style={{ fontFamily: 'var(--rvn-font-display)', color: '#f3ead3' }}>Dar neturi kaladžių</p>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Sukurk pirmą Ravenof kaladę</p>
        </div>
        <button onClick={() => { playUiClick(); onCreate() }} className="inline-flex items-center gap-2 px-5 rounded-xl text-sm font-bold" style={{ minHeight: 48, background: 'rgba(240,180,41,0.92)', color: '#1a0f04', fontFamily: 'var(--rvn-font-display)' }}><Plus className="w-4 h-4" /> Kurti kaladę</button>
      </div>
    )
  }

  return (
    <div className="space-y-2.5">
      <button onClick={() => { playUiClick(); onCreate() }} className="w-full flex items-center justify-center gap-2 px-4 rounded-xl text-sm font-bold" style={{ minHeight: 48, background: 'rgba(240,180,41,0.92)', color: '#1a0f04', fontFamily: 'var(--rvn-font-display)' }}><Plus className="w-4 h-4" /> Kurti naują kaladę</button>

      {decks.map((d) => {
        const valid = d.faction !== null && d.cardCount >= DECK_MIN && d.cardCount <= DECK_MAX
        return (
          <div key={d.id} className="relative rounded-2xl p-3" style={{ background: 'rgba(10,8,16,0.7)', border: `1px solid ${d.factionColor}40` }}>
            <div className="h-1 rounded-full mb-2" style={{ background: d.factionColor, opacity: 0.55 }} />
            <div className="flex items-start gap-2">
              <div className="flex-1 min-w-0">
                <h2 className="text-sm font-bold leading-tight truncate" style={{ fontFamily: 'var(--rvn-font-display)', color: '#f3ead3' }}>{d.name}</h2>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-1 text-[11px]" style={{ color: 'var(--text-muted)' }}>
                  <span className="px-1.5 py-0.5 rounded" style={{ background: d.factionColor + '22', color: d.factionColor }}>{d.faction ?? 'Nėra frakcijos'}</span>
                  <span className="tabular-nums">{d.cardCount}/{DECK_MIN}</span>
                  <span className="inline-flex items-center gap-0.5">{d.visibility === 'public' ? <><Globe className="w-3 h-3" /> Vieša</> : <><Lock className="w-3 h-3" /> Privati</>}</span>
                </div>
              </div>
              <button onClick={() => { playUiClick(); setMenu(menu === d.id ? null : d.id) }} className="flex items-center justify-center rounded-lg shrink-0" style={{ width: 32, height: 32, color: 'var(--text-muted)' }} aria-label="Daugiau"><MoreVertical className="w-4 h-4" /></button>
            </div>

            <div className="flex items-center gap-2 mt-2">
              <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-semibold" style={{ background: valid ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)', color: valid ? '#86efac' : '#fca5a5', border: `1px solid ${valid ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}` }}>
                {valid ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}{valid ? 'Galioja' : 'Negalioja'}
              </span>
              {d.missing != null && d.missing > 0 && <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: 'rgba(240,180,41,0.08)', color: 'rgba(240,180,41,0.8)', border: '1px solid rgba(240,180,41,0.2)' }}>Trūksta {d.missing} kortų</span>}
            </div>

            <div className="flex gap-2 mt-3">
              <button onClick={() => { playUiClick(); onEdit(d.id) }} className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg text-xs font-bold" style={{ minHeight: 40, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(240,180,41,0.3)', color: 'var(--text-secondary)' }}><Edit2 className="w-3.5 h-3.5" /> Redaguoti</button>
              <div className="flex-1"><PlaytestButton deckId={d.id} deckName={d.name} variant="compact" /></div>
            </div>

            {menu === d.id && (
              <div className="absolute right-3 top-12 z-20 rounded-xl overflow-hidden" style={{ background: 'rgba(15,12,24,0.98)', border: '1px solid rgba(240,180,41,0.3)', boxShadow: '0 8px 24px rgba(0,0,0,0.6)' }}>
                <button onClick={() => duplicate(d.id)} disabled={busy === d.id} className="flex items-center gap-2 px-4 py-2.5 text-xs w-full text-left" style={{ color: 'var(--text-secondary)' }}><Copy className="w-3.5 h-3.5" /> Kopijuoti</button>
                <button onClick={() => { setMenu(null); setConfirmDel(d.id) }} className="flex items-center gap-2 px-4 py-2.5 text-xs w-full text-left" style={{ color: '#fca5a5', borderTop: '1px solid rgba(240,180,41,0.1)' }}><Trash2 className="w-3.5 h-3.5" /> Ištrinti</button>
              </div>
            )}
          </div>
        )
      })}

      {confirmDel && (
        <div className="fixed inset-0 z-[160] flex items-center justify-center p-6" style={{ background: 'rgba(4,3,8,0.9)' }} onClick={() => setConfirmDel(null)}>
          <div className="w-[min(330px,92vw)] rounded-2xl p-5 text-center" style={{ border: '1px solid rgba(239,68,68,0.4)', background: 'linear-gradient(160deg,#17111f,#0a0810)' }} onClick={(e) => e.stopPropagation()}>
            <p className="text-base font-bold mb-1" style={{ fontFamily: 'var(--rvn-font-display)', color: '#fca5a5' }}>Ištrinti kaladę?</p>
            <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>Šio veiksmo atšaukti negalėsi.</p>
            <div className="flex gap-2">
              <button onClick={() => { playUiClick(); setConfirmDel(null) }} className="flex-1 rounded-xl text-sm font-bold" style={{ minHeight: 44, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(240,180,41,0.3)', color: 'var(--text-secondary)' }}>Atšaukti</button>
              <button onClick={() => del(confirmDel)} disabled={busy === confirmDel} className="flex-1 rounded-xl text-sm font-bold disabled:opacity-50" style={{ minHeight: 44, background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.6)', color: '#fca5a5', fontFamily: 'var(--rvn-font-display)' }}>Ištrinti</button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className="fixed left-1/2 -translate-x-1/2 z-[160] px-4 py-2 rounded-full text-xs font-semibold" style={{ bottom: 'calc(92px + env(safe-area-inset-bottom, 0px))', background: 'rgba(10,8,16,0.96)', border: '1px solid rgba(240,180,41,0.5)', color: 'var(--gold)' }}>{toast}</div>}
    </div>
  )
}
