'use client'

// ── PracticeButton — praktika prieš AI (public deck arba random frakcijos deck) ─
import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { createClient } from '@/lib/supabase/client'
import { playUiClick } from '@/lib/ui-sound'
import type { AiDifficulty } from '@/lib/tutorial/ai'

const TutorialGame = dynamic(() => import('./TutorialGame').then((m) => m.TutorialGame), { ssr: false })

type PublicDeck = { id: string; name: string; faction: string | null }
type Faction = { id: number; name: string }

export function PracticeButton({ deckId, deckName, variant = 'full' }: {
  deckId: string
  deckName: string
  variant?: 'full' | 'compact'
}) {
  const [open, setOpen] = useState(false)
  const [started, setStarted] = useState(false)
  const [mode, setMode] = useState<'public' | 'faction'>('faction')
  const [publicDecks, setPublicDecks] = useState<PublicDeck[]>([])
  const [factions, setFactions] = useState<Faction[]>([])
  const [oppDeck, setOppDeck] = useState<string>('')
  const [oppFaction, setOppFaction] = useState<number | ''>('')
  const [difficulty, setDifficulty] = useState<AiDifficulty>('normal')

  useEffect(() => {
    if (!open) return
    const supabase = createClient()
    supabase.from('decks').select('id, name, faction:factions ( name )').eq('visibility', 'public').order('score', { ascending: false }).limit(50)
      .then(({ data }) => {
        const rows = (data as unknown as { id: string; name: string; faction: { name: string } | null }[]) ?? []
        setPublicDecks(rows.map((d) => ({ id: d.id, name: d.name, faction: d.faction?.name ?? null })))
      })
    supabase.from('factions').select('id, name').order('sort_order').limit(20)
      .then(({ data }) => setFactions(((data as Faction[]) ?? []).filter((f) => f.name !== 'Universalus')))
  }, [open])

  const canStart = mode === 'public' ? !!oppDeck : !!oppFaction

  if (started) {
    return (
      <TutorialGame
        deckId={deckId}
        deckName={deckName}
        practice
        opponentDeckId={mode === 'public' ? oppDeck : null}
        opponentFaction={mode === 'faction' && oppFaction ? Number(oppFaction) : null}
        opponentName={mode === 'public' ? (publicDecks.find((d) => d.id === oppDeck)?.name ?? 'Priešas') : (factions.find((f) => f.id === oppFaction)?.name ?? 'Priešas')}
        difficulty={difficulty}
        onClose={() => { setStarted(false); setOpen(false) }}
      />
    )
  }

  const selStyle = { width: '100%', padding: '0.5rem 0.6rem', borderRadius: '0.5rem', fontSize: '0.85rem', background: 'var(--bg-elevated)', border: '1px solid var(--bg-border)', color: 'var(--text-primary)', outline: 'none' } as React.CSSProperties

  return (
    <>
      <button
        onClick={() => { playUiClick(); setOpen(true) }}
        className={variant === 'full'
          ? 'inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all hover:scale-[1.02] active:scale-95'
          : 'inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all hover:scale-[1.03] active:scale-95 w-full'}
        style={{ background: 'linear-gradient(135deg, rgba(34,197,94,0.18), rgba(34,197,94,0.06))', border: '1px solid rgba(34,197,94,0.45)', color: '#86efac', fontFamily: 'var(--rvn-font-display)', letterSpacing: '0.04em' }}
        title="Praktika prieš AI: pasirink priešo kaladę (viešą arba atsitiktinę iš frakcijos)"
      >
        🎯 Praktika prieš AI
      </button>

      {open && (
        <div className="fixed inset-0 z-[140] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.75)' }} onClick={() => setOpen(false)}>
          <div className="rounded-2xl p-5 w-[min(440px,94vw)]" style={{ background: 'linear-gradient(145deg, #1a1325, #0d0a14)', border: '1px solid rgba(34,197,94,0.4)' }} onClick={(e) => e.stopPropagation()}>
            <p className="text-base font-bold mb-1" style={{ fontFamily: 'var(--rvn-font-display)', color: '#86efac' }}>🎯 Praktika</p>
            <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>Tavo kaladė: <span style={{ color: 'var(--text-secondary)' }}>{deckName}</span>. Pasirink priešą:</p>

            <div className="flex gap-2 mb-3">
              <button onClick={() => setMode('faction')} className="flex-1 px-3 py-1.5 rounded-lg text-xs font-semibold"
                style={{ background: mode === 'faction' ? 'rgba(34,197,94,0.25)' : 'var(--bg-elevated)', border: '1px solid ' + (mode === 'faction' ? 'rgba(34,197,94,0.5)' : 'var(--bg-border)'), color: mode === 'faction' ? '#86efac' : 'var(--text-muted)' }}>
                🎲 Random frakcijos deck
              </button>
              <button onClick={() => setMode('public')} className="flex-1 px-3 py-1.5 rounded-lg text-xs font-semibold"
                style={{ background: mode === 'public' ? 'rgba(34,197,94,0.25)' : 'var(--bg-elevated)', border: '1px solid ' + (mode === 'public' ? 'rgba(34,197,94,0.5)' : 'var(--bg-border)'), color: mode === 'public' ? '#86efac' : 'var(--text-muted)' }}>
                🌐 Viešas deck
              </button>
            </div>

            {mode === 'faction' ? (
              <select value={oppFaction} onChange={(e) => setOppFaction(e.target.value ? Number(e.target.value) : '')} style={selStyle}>
                <option value="">— Pasirink frakciją —</option>
                {factions.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            ) : (
              <select value={oppDeck} onChange={(e) => setOppDeck(e.target.value)} style={selStyle}>
                <option value="">— Pasirink viešą kaladę —</option>
                {publicDecks.map((d) => <option key={d.id} value={d.id}>{d.name}{d.faction ? ` (${d.faction})` : ''}</option>)}
              </select>
            )}

            <p className="text-[11px] font-semibold mt-4 mb-1.5" style={{ color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>AI sunkumas</p>
            <div className="flex gap-2">
              {([['easy', '😴 Lengvas'], ['normal', '⚔ Vidutinis'], ['hard', '💀 Sunkus']] as const).map(([d, lbl]) => (
                <button key={d} onClick={() => { playUiClick(); setDifficulty(d) }} className="flex-1 px-2 py-1.5 rounded-lg text-xs font-semibold transition-all"
                  style={{ background: difficulty === d ? 'rgba(34,197,94,0.25)' : 'var(--bg-elevated)', border: '1px solid ' + (difficulty === d ? 'rgba(34,197,94,0.5)' : 'var(--bg-border)'), color: difficulty === d ? '#86efac' : 'var(--text-muted)' }}>
                  {lbl}
                </button>
              ))}
            </div>
            <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>
              {difficulty === 'easy' ? 'Žaidžia paprasčiau, dažniau eina į veidą, ne visada optimaliai.'
                : difficulty === 'hard' ? 'Planuoja į priekį, taupo removal, agresyviai baudžia silpną lentą.'
                : 'Skaičiuoja trade\u2019us, naudoja removal/AoE logiškai, saugosi lethal.'}
            </p>

            <div className="flex gap-2 mt-5">
              <button disabled={!canStart} onClick={() => { playUiClick(); setStarted(true) }}
                className="flex-1 px-4 py-2 rounded-xl text-sm font-bold transition-all disabled:opacity-40"
                style={{ background: 'rgba(34,197,94,0.25)', border: '1px solid rgba(34,197,94,0.5)', color: '#86efac', fontFamily: 'var(--rvn-font-display)' }}>
                Pradėti kovą
              </button>
              <button onClick={() => setOpen(false)} className="px-4 py-2 rounded-xl text-sm" style={{ color: 'var(--text-muted)', border: '1px solid var(--bg-border)' }}>Atšaukti</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
