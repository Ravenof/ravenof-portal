'use client'

// ── PracticeButton — praktika prieš AI (public deck arba random frakcijos deck) ─
// Modalas: polished rounded glass (vientisas Ravenof Digital stilius).
import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { createPortal } from 'react-dom'
import { createClient } from '@/lib/supabase/client'
import { playUiClick } from '@/lib/ui-sound'
import { DigitalPicker } from '@/components/digital/DigitalPicker'
import type { AiDifficulty } from '@/lib/tutorial/ai'

const TutorialGame = dynamic(() => import('./TutorialGame').then((m) => m.TutorialGame), { ssr: false })

type PublicDeck = { id: string; name: string; faction: string | null; factionIcon: string | null; factionColor: string | null }
type Faction = { id: number; name: string; icon_url: string | null; color_hex: string | null }

const ACC = '34,197,94' // žalias

export function PracticeButton({ deckId, deckName, variant = 'full', hideTrigger = false, open: openProp, onClose }: {
  deckId: string
  deckName: string
  variant?: 'full' | 'compact'
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
    supabase.from('decks').select('id, name, faction:factions ( name, icon_url, color_hex )').eq('visibility', 'public').order('score', { ascending: false }).limit(50)
      .then(({ data }) => {
        const rows = (data as unknown as { id: string; name: string; faction: { name: string; icon_url: string | null; color_hex: string | null } | null }[]) ?? []
        setPublicDecks(rows.map((d) => ({ id: d.id, name: d.name, faction: d.faction?.name ?? null, factionIcon: d.faction?.icon_url ?? null, factionColor: d.faction?.color_hex ?? null })))
      })
    supabase.from('factions').select('id, name, icon_url, color_hex').order('sort_order').limit(20)
      .then(({ data }) => setFactions(((data as Faction[]) ?? []).filter((f) => f.name !== 'Universalus')))
  }, [isOpen])

  const canStart = mode === 'public' ? !!oppDeck : !!oppFaction

  const segBtn = (active: boolean) => ({
    minHeight: 44,
    background: active ? `rgba(${ACC},0.22)` : 'rgba(10,8,16,0.8)',
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

      {isOpen && !started && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-4" style={{ background: 'rgba(4,3,8,0.9)' }} onClick={() => setOpen(false)}>
          <div className="w-full sm:w-[min(440px,94vw)] rounded-2xl px-5 py-6" style={{ border: `1px solid rgba(${ACC},0.4)`, background: `radial-gradient(120% 90% at 50% 0%, rgba(${ACC},0.13), rgba(10,8,16,0.97) 60%), linear-gradient(160deg, #17111f, #0a0810)`, boxShadow: '0 16px 48px rgba(0,0,0,0.6)', paddingBottom: 'calc(24px + env(safe-area-inset-bottom, 0px))' }} onClick={(e) => e.stopPropagation()}>
            <p className="text-lg font-bold mb-1 text-center" style={{ fontFamily: 'var(--rvn-font-display)', color: '#86efac', letterSpacing: '0.08em', textShadow: `0 0 12px rgba(${ACC},0.4)` }}>🎯 PRAKTIKA</p>
            <p className="text-xs mb-4 text-center" style={{ color: 'var(--text-muted)' }}>Tavo kaladė: <span style={{ color: 'var(--text-secondary)' }}>{deckName}</span>. Pasirink priešą:</p>

            <div className="flex gap-2 mb-3">
              <button onClick={() => setMode('faction')} className="flex-1 px-3 rounded-xl text-xs font-semibold transition-all" style={segBtn(mode === 'faction')}>🎲 Random frakcija</button>
              <button onClick={() => setMode('public')} className="flex-1 px-3 rounded-xl text-xs font-semibold transition-all" style={segBtn(mode === 'public')}>🌐 Viešas deck</button>
            </div>

            {mode === 'faction' ? (
              <DigitalPicker accent={ACC} placeholder="— Pasirink frakciją —" value={oppFaction ? String(oppFaction) : ''} onChange={(v) => setOppFaction(v ? Number(v) : '')}
                items={factions.map((f) => ({ value: String(f.id), label: f.name, iconUrl: f.icon_url, color: f.color_hex ?? undefined }))} />
            ) : (
              <DigitalPicker accent={ACC} placeholder="— Pasirink viešą kaladę —" value={oppDeck} onChange={setOppDeck}
                items={publicDecks.map((d) => ({ value: d.id, label: d.name, sub: d.faction ?? undefined, iconUrl: d.factionIcon, color: d.factionColor ?? undefined }))} />
            )}

            <p className="text-[11px] font-semibold mt-4 mb-1.5" style={{ color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'var(--rvn-font-display)' }}>AI sunkumas</p>
            <div className="flex gap-2">
              {([['easy', '😴 Lengvas'], ['normal', '⚔ Vidutinis'], ['hard', '💀 Sunkus']] as const).map(([d, lbl]) => (
                <button key={d} onClick={() => { playUiClick(); setDifficulty(d) }} className="flex-1 px-2 rounded-xl text-xs font-semibold transition-all" style={segBtn(difficulty === d)}>{lbl}</button>
              ))}
            </div>
            <p className="text-[10px] mt-1.5" style={{ color: 'var(--text-muted)' }}>
              {difficulty === 'easy' ? 'Žaidžia paprasčiau, dažniau eina į veidą, ne visada optimaliai.'
                : difficulty === 'hard' ? 'Planuoja į priekį, taupo removal, agresyviai baudžia silpną lentą.'
                : 'Skaičiuoja trade’us, naudoja removal/AoE logiškai, saugosi lethal.'}
            </p>

            <div className="flex gap-2 mt-5">
              <button disabled={!canStart} onClick={() => { playUiClick(); setStarted(true) }}
                className="flex-1 rounded-xl text-sm font-bold transition-all disabled:opacity-40 active:scale-95"
                style={{ minHeight: 48, background: canStart ? `rgba(${ACC},0.9)` : 'rgba(255,255,255,0.06)', color: canStart ? '#04210f' : 'var(--text-muted)', fontFamily: 'var(--rvn-font-display)', letterSpacing: '0.04em' }}>
                Pradėti kovą
              </button>
              <button onClick={() => setOpen(false)} className="rounded-xl text-sm px-4" style={{ minHeight: 48, color: 'var(--text-muted)', border: '1px solid rgba(255,255,255,0.12)' }}>Atšaukti</button>
            </div>
          </div>
        </div>, document.body)}
    </>
  )
}
