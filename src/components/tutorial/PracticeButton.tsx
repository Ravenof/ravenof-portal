'use client'

// ── PracticeButton — praktika prieš AI (public deck arba random frakcijos deck) ─
// Modalas raižyto „main menu" stiliaus (oct kampai, ornamentai, žalias akcentas).
import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { createClient } from '@/lib/supabase/client'
import { playUiClick } from '@/lib/ui-sound'
import type { AiDifficulty } from '@/lib/tutorial/ai'

const TutorialGame = dynamic(() => import('./TutorialGame').then((m) => m.TutorialGame), { ssr: false })

type PublicDeck = { id: string; name: string; faction: string | null }
type Faction = { id: number; name: string }

/** Aštrūs „išraižyti" kampai. */
const oct = (b: number) =>
  `polygon(${b}px 0, calc(100% - ${b}px) 0, 100% ${b}px, 100% calc(100% - ${b}px), calc(100% - ${b}px) 100%, ${b}px 100%, 0 calc(100% - ${b}px), 0 ${b}px)`

const ACC = '34,197,94' // žalias

export function PracticeButton({ deckId, deckName, variant = 'full', hideTrigger = false, open: openProp, onClose }: {
  deckId: string
  deckName: string
  variant?: 'full' | 'compact'
  /** Controlled režimas: paslepia savo mygtuką, atidarymą valdo tėvas. */
  hideTrigger?: boolean
  open?: boolean
  onClose?: () => void
}) {
  const [internalOpen, setInternalOpen] = useState(false)
  const isOpen = hideTrigger ? !!openProp : internalOpen
  const setOpen = (v: boolean) => { if (hideTrigger) { if (!v) onClose?.() } else setInternalOpen(v) }
  const [started, setStarted] = useState(false)
  const [mode, setMode] = useState<'public' | 'faction'>('faction')
  const [publicDecks, setPublicDecks] = useState<PublicDeck[]>([])
  const [factions, setFactions] = useState<Faction[]>([])
  const [oppDeck, setOppDeck] = useState<string>('')
  const [oppFaction, setOppFaction] = useState<number | ''>('')
  const [difficulty, setDifficulty] = useState<AiDifficulty>('normal')

  useEffect(() => {
    if (!isOpen) return
    const supabase = createClient()
    supabase.from('decks').select('id, name, faction:factions ( name )').eq('visibility', 'public').order('score', { ascending: false }).limit(50)
      .then(({ data }) => {
        const rows = (data as unknown as { id: string; name: string; faction: { name: string } | null }[]) ?? []
        setPublicDecks(rows.map((d) => ({ id: d.id, name: d.name, faction: d.faction?.name ?? null })))
      })
    supabase.from('factions').select('id, name').order('sort_order').limit(20)
      .then(({ data }) => setFactions(((data as Faction[]) ?? []).filter((f) => f.name !== 'Universalus')))
  }, [isOpen])

  const canStart = mode === 'public' ? !!oppDeck : !!oppFaction

  const selStyle = { width: '100%', padding: '0.55rem 0.7rem', borderRadius: '0.5rem', fontSize: '0.85rem', background: 'rgba(10,8,16,0.85)', border: `1px solid rgba(${ACC},0.4)`, color: 'var(--text-primary)', outline: 'none' } as React.CSSProperties

  const segBtn = (active: boolean) => ({
    background: active ? `rgba(${ACC},0.28)` : 'rgba(10,8,16,0.7)',
    border: '1px solid ' + (active ? `rgba(${ACC},0.6)` : 'rgba(255,255,255,0.08)'),
    color: active ? '#bbf7d0' : 'var(--text-muted)',
  } as React.CSSProperties)

  return (
    <>
      {!hideTrigger && (
        <button
          onClick={() => { playUiClick(); setOpen(true) }}
          className={variant === 'full'
            ? 'inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all hover:scale-[1.02] active:scale-95'
            : 'inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all hover:scale-[1.03] active:scale-95 w-full'}
          style={{ background: `linear-gradient(135deg, rgba(${ACC},0.18), rgba(${ACC},0.06))`, border: `1px solid rgba(${ACC},0.45)`, color: '#86efac', fontFamily: 'var(--rvn-font-display)', letterSpacing: '0.04em' }}
          title="Praktika prieš AI: pasirink priešo kaladę (viešą arba atsitiktinę iš frakcijos)"
        >
          🎯 Praktika prieš AI
        </button>
      )}

      {started && (
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
      )}

      {isOpen && !started && (
        <div className="fixed inset-0 z-[140] flex items-center justify-center p-4" style={{ background: 'rgba(4,3,8,0.9)' }} onClick={() => setOpen(false)}>
          <div className="relative w-[min(440px,94vw)]" style={{ clipPath: oct(16), background: `rgba(${ACC},0.5)`, padding: 2.5 }} onClick={(e) => e.stopPropagation()}>
            <div className="relative px-5 py-6" style={{ clipPath: oct(15), background: `radial-gradient(120% 90% at 50% 0%, rgba(${ACC},0.14), rgba(10,8,16,0.97) 60%), linear-gradient(160deg, #15101f, #0a0810)`, boxShadow: `inset 0 0 24px rgba(${ACC},0.12)` }}>
              {/* kampų ornamentai */}
              {['top-2 left-2', 'top-2 right-2', 'bottom-2 left-2', 'bottom-2 right-2'].map((pos, i) => (
                <span key={i} className={`absolute ${pos} text-[10px] leading-none`} style={{ color: `rgba(${ACC},0.8)`, textShadow: `0 0 6px rgba(${ACC},0.6)` }}>❖</span>
              ))}

              <p className="text-lg font-bold mb-1 text-center" style={{ fontFamily: 'var(--rvn-font-display)', color: '#86efac', letterSpacing: '0.08em', textShadow: `0 0 12px rgba(${ACC},0.4)` }}>🎯 PRAKTIKA</p>
              <p className="text-xs mb-4 text-center" style={{ color: 'var(--text-muted)' }}>Tavo kaladė: <span style={{ color: 'var(--text-secondary)' }}>{deckName}</span>. Pasirink priešą:</p>

              <div className="flex gap-2 mb-3">
                <button onClick={() => setMode('faction')} className="flex-1 px-3 py-2 rounded-lg text-xs font-semibold transition-all" style={segBtn(mode === 'faction')}>🎲 Random frakcijos deck</button>
                <button onClick={() => setMode('public')} className="flex-1 px-3 py-2 rounded-lg text-xs font-semibold transition-all" style={segBtn(mode === 'public')}>🌐 Viešas deck</button>
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

              <p className="text-[11px] font-semibold mt-4 mb-1.5" style={{ color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'var(--rvn-font-display)' }}>AI sunkumas</p>
              <div className="flex gap-2">
                {([['easy', '😴 Lengvas'], ['normal', '⚔ Vidutinis'], ['hard', '💀 Sunkus']] as const).map(([d, lbl]) => (
                  <button key={d} onClick={() => { playUiClick(); setDifficulty(d) }} className="flex-1 px-2 py-2 rounded-lg text-xs font-semibold transition-all" style={segBtn(difficulty === d)}>{lbl}</button>
                ))}
              </div>
              <p className="text-[10px] mt-1.5" style={{ color: 'var(--text-muted)' }}>
                {difficulty === 'easy' ? 'Žaidžia paprasčiau, dažniau eina į veidą, ne visada optimaliai.'
                  : difficulty === 'hard' ? 'Planuoja į priekį, taupo removal, agresyviai baudžia silpną lentą.'
                  : 'Skaičiuoja trade’us, naudoja removal/AoE logiškai, saugosi lethal.'}
              </p>

              <div className="flex gap-2 mt-5">
                <button disabled={!canStart} onClick={() => { playUiClick(); setStarted(true) }}
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-40 hover:scale-[1.02] active:scale-95"
                  style={{ background: `rgba(${ACC},0.25)`, border: `1px solid rgba(${ACC},0.55)`, color: '#86efac', fontFamily: 'var(--rvn-font-display)', letterSpacing: '0.04em' }}>
                  Pradėti kovą
                </button>
                <button onClick={() => setOpen(false)} className="px-4 py-2.5 rounded-xl text-sm" style={{ color: 'var(--text-muted)', border: '1px solid rgba(255,255,255,0.12)' }}>Atšaukti</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
