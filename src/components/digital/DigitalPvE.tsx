'use client'

// ── Ravenof Digital — Treniruotė (PvE prieš AI) ───────────────────────────────
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Target, Swords, GraduationCap } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { playUiClick } from '@/lib/ui-sound'
import { DeckSelect } from './DeckSelect'
import { getStarterDecks } from '@/lib/starterDecks'
import { PageHero } from './ui/HubKit'
import { PracticeButton } from '@/components/tutorial/PracticeButton'

type Deck = { id: string; name: string; faction: string | null; factionIcon: string | null; factionColor: string | null; missing: number }
const A = '34,197,94'

export function DigitalPvE() {
  const [decks, setDecks] = useState<Deck[] | null>(null)
  const [sel, setSel] = useState('')
  const [open, setOpen] = useState(false)
  const [tutProgress, setTutProgress] = useState<{ claimed: number; total: number } | null>(null)

  useEffect(() => {
    getStarterDecks().then((d) => { if (d) setTutProgress({ claimed: d.filter((x) => x.claimed).length, total: d.length || 8 }) }).catch(() => {})
  }, [])

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { setDecks([]); return }
      Promise.all([
        supabase.from('decks').select('id, name, faction:factions ( name, icon_url, color_hex )').eq('user_id', user.id).not('name', 'ilike', '[Kampanija]%').order('updated_at', { ascending: false }),
        supabase.from('user_collections').select('card_id, quantity').eq('user_id', user.id),
        supabase.from('profiles').select('role').eq('id', user.id).maybeSingle(),
      ]).then(async ([{ data }, { data: colRows }, { data: prof }]) => {
        const role = (prof as { role?: string } | null)?.role
        const tester = role === 'tester' || role === 'admin'
        const rows = (data as unknown as { id: string; name: string; faction: { name: string; icon_url: string | null; color_hex: string | null } | null }[]) ?? []
        const owned: Record<string, number> = Object.fromEntries(((colRows as { card_id: string; quantity: number }[]) ?? []).map((r) => [r.card_id, r.quantity]))
        // kaladės su trūkstamomis kortomis — nežaidžiamos
        const ids = rows.map((d) => d.id)
        const missingMap: Record<string, number> = {}
        if (ids.length) {
          const { data: dc } = await supabase.from('deck_cards').select('deck_id, card_id, quantity').in('deck_id', ids)
          for (const r of ((dc as { deck_id: string; card_id: string; quantity: number }[]) ?? [])) {
            const have = owned[r.card_id] ?? 0
            if (have < r.quantity) missingMap[r.deck_id] = (missingMap[r.deck_id] ?? 0) + (r.quantity - have)
          }
        }
        const ds = rows.map((d) => ({ id: d.id, name: d.name, faction: d.faction?.name ?? null, factionIcon: d.faction?.icon_url ?? null, factionColor: d.faction?.color_hex ?? null, missing: tester ? 0 : (missingMap[d.id] ?? 0) }))
        setDecks(ds) // pradinį pasirinkimą (paskutinė naudota) atstato DeckSelect
      })
    })
  }, [])

  const deck = decks?.find((d) => d.id === sel)

  return (
    <div className="max-w-md mx-auto space-y-4">
      <PageHero iconName="fi-pve" icon={<Target className="w-10 h-10" style={{ color: `rgb(${A})` }} />} accent={A}
        title="TRENIRUOTĖ" sub="Treniruokis prieš botą. Sunkumas (😴 lengvas / ⚔ vidutinis / 💀 sunkus) ir priešininkas pasirenkami kitame žingsnyje. Pergalė — auksas." />

      {decks === null ? (
        <p className="text-center text-sm py-8" style={{ color: 'var(--text-muted)' }}>Kraunama…</p>
      ) : decks.length === 0 ? (
        <div className="text-center py-6">
          <p className="text-sm mb-3" style={{ color: 'var(--text-muted)' }}>Neturi kaladžių.</p>
          <Link href="/digital/decks?tab=builder" onClick={() => playUiClick()} className="inline-flex items-center gap-2 px-5 rounded-xl text-sm font-bold" style={{ minHeight: 48, background: `rgba(${A},0.2)`, border: `1px solid rgba(${A},0.6)`, color: '#86efac', fontFamily: 'var(--rvn-font-display)' }}>Sukurti kaladę</Link>
        </div>
      ) : (
        <>
          <div className="rounded-2xl px-4 py-3" style={{ background: 'rgba(10,8,16,0.7)', border: `1px solid rgba(${A},0.3)` }}>
            <DeckSelect mode="pve" accent={A} value={sel} onChange={setSel}
              decks={decks.filter((d) => d.missing === 0)} />
            {decks.some((d) => d.missing > 0) && (
              <p className="text-[10px] mt-1.5" style={{ color: 'rgba(240,180,41,0.75)' }}>
                ⚠ {decks.filter((d) => d.missing > 0).length} kaladė(-ės) paslėpta — trūksta kortų. Papildyk kolekciją arba redaguok kaladę skiltyje Mano kaladės.
              </p>
            )}
          </div>
          <button onClick={() => { playUiClick(); setOpen(true) }} disabled={!deck}
            className="flex items-center justify-center gap-2 w-full rounded-2xl text-base font-bold transition-transform active:scale-[0.98] disabled:opacity-40"
            style={{ minHeight: 56, background: `rgba(${A},0.9)`, color: '#04210f', fontFamily: 'var(--rvn-font-display)', letterSpacing: '0.06em' }}>
            <Swords className="w-5 h-5" /> Pradėti kovą
          </button>
          {deck && <PracticeButton deckId={deck.id} deckName={deck.name} hideTrigger open={open} onClose={() => setOpen(false)} />}
        </>
      )}

      {/* Mokymai — perkelti iš pagrindinio meniu */}
      <Link href="/digital/tutorial" onClick={() => playUiClick()}
        className="block rounded-2xl px-4 py-3.5 transition-transform active:scale-[0.98]"
        style={{ background: 'radial-gradient(130% 130% at 0% 0%, rgba(139,92,246,0.25), transparent 56%), linear-gradient(150deg, rgba(20,15,30,0.96), rgba(10,8,16,0.98))', border: '1px solid rgba(139,92,246,0.5)' }}>
        <span className="flex items-center gap-3">
          <GraduationCap className="w-7 h-7 shrink-0" style={{ color: '#c4b5fd' }} />
          <span className="flex-1 min-w-0">
            <span className="block text-sm font-bold" style={{ color: '#fff', fontFamily: 'var(--rvn-font-display)' }}>Mokymai</span>
            <span className="block text-[11px]" style={{ color: 'var(--text-secondary)' }}>{tutProgress && tutProgress.claimed > 0 ? 'Vedama kova su tavo starter kalade' : 'Pasiimk nemokamą kaladę ir išmok žaisti'}</span>
          </span>
          <span className="text-base font-extrabold" style={{ color: '#c4b5fd', fontFamily: 'var(--rvn-font-display)' }}>→</span>
        </span>

      </Link>
    </div>
  )
}
