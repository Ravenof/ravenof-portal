'use client'

// ── Ravenof Digital — Treniruotė prieš AI: VIENO ekrano landscape pasiruošimas ─
// 3 stulpeliai: Tavo kaladė (karuselė) · Priešininko tipas (atsitiktinė/pasirinkta frakcija/viešas deck) · Santrauka+sunkumas.
// Startas -> TutorialGame(practice) su opponentFaction ARBA opponentDeckId + difficulty.
import { useCallback, useEffect, useMemo, useState } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { playUiClick } from '@/lib/ui-sound'
import type { AiDifficulty } from '@/lib/tutorial/ai'
import { ActiveDeckSummary } from '@/components/digital/ActiveDeckSelectorModal'
import { useActiveDeck, activeDeckOf } from '@/lib/digital/activeDeck'

const TutorialGame = dynamic(() => import('@/components/tutorial/TutorialGame').then((m) => m.TutorialGame), { ssr: false })

type Deck = { id: string; name: string; faction: string | null; factionIcon: string | null; factionColor: string | null; missing: number }
type Faction = { id: number; name: string; icon_url: string | null; color_hex: string | null }
type PublicDeck = { id: string; name: string; faction: string | null; factionIcon: string | null; factionColor: string | null; factionId: number | null; author: string; score: number }
type Mode = 'random' | 'faction' | 'public'
const A = '34,197,94'
const PANEL: React.CSSProperties = { background: 'linear-gradient(160deg, rgba(14,20,16,0.96), rgba(9,7,12,0.98))', border: '1px solid rgba(34,197,94,0.22)', boxShadow: 'inset 0 0 40px rgba(0,0,0,0.5)' }
const FACTION_DESC: Record<string, string> = { 'Mirties maršas': 'Kapinės · prisikėlimas', 'Demonų orda': 'Prakeiksmai · agresija', 'Inkvizicijos legionas': 'Kontrolė · disciplina', 'Šviesos pulkas': 'Gydymas · apsauga', 'Mistikos melodija': 'Burtai · kontrolė', 'Rytų vėjas': 'Greitis · combo', 'Plėšikų naktis': 'Vagystė · tempas', 'Vryhioko gauja': 'Žvėrys · jėga' }

export function DigitalPvE() {
  const [decks, setDecks] = useState<Deck[] | null>(null)
  const [sel, setSel] = useState('')
  const [factions, setFactions] = useState<Faction[]>([])
  const [publicDecks, setPublicDecks] = useState<PublicDeck[]>([])
  const [mode, setMode] = useState<Mode>('random')
  const [oppFaction, setOppFaction] = useState<number | ''>('')
  const [oppDeck, setOppDeck] = useState('')
  const [difficulty, setDifficulty] = useState<AiDifficulty>('normal')
  const [query, setQuery] = useState('')
  const [filterFaction, setFilterFaction] = useState<number | ''>('')
  const [started, setStarted] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { setDecks([]); return }
      const [{ data }, { data: colRows }, { data: prof }] = await Promise.all([
        supabase.from('decks').select('id, name, faction:factions ( name, icon_url, color_hex )').eq('user_id', user.id).not('name', 'ilike', '[Kampanija]%').order('updated_at', { ascending: false }),
        supabase.from('user_collections').select('card_id, quantity').eq('user_id', user.id),
        supabase.from('profiles').select('role').eq('id', user.id).maybeSingle(),
      ])
      const tester = ['tester', 'admin'].includes((prof as { role?: string } | null)?.role ?? '')
      const rows = (data as unknown as { id: string; name: string; faction: { name: string; icon_url: string | null; color_hex: string | null } | null }[]) ?? []
      const owned: Record<string, number> = Object.fromEntries(((colRows as { card_id: string; quantity: number }[]) ?? []).map((r) => [r.card_id, r.quantity]))
      const ids = rows.map((d) => d.id)
      const missingMap: Record<string, number> = {}
      if (ids.length) {
        const { data: dc } = await supabase.from('deck_cards').select('deck_id, card_id, quantity').in('deck_id', ids)
        for (const r of ((dc as { deck_id: string; card_id: string; quantity: number }[]) ?? [])) { const have = owned[r.card_id] ?? 0; if (have < r.quantity) missingMap[r.deck_id] = (missingMap[r.deck_id] ?? 0) + (r.quantity - have) }
      }
      const ds = rows.map((d) => ({ id: d.id, name: d.name, faction: d.faction?.name ?? null, factionIcon: d.faction?.icon_url ?? null, factionColor: d.faction?.color_hex ?? null, missing: tester ? 0 : (missingMap[d.id] ?? 0) }))
      setDecks(ds)
      const first = ds.find((d) => d.missing === 0); if (first) setSel(first.id)
    })
    supabase.from('factions').select('id, name, icon_url, color_hex').order('sort_order').limit(20).then(({ data }) => setFactions(((data as Faction[]) ?? []).filter((f) => f.name !== 'Universalus')))
    supabase.from('decks').select('id, name, user_id, score, faction:factions ( id, name, icon_url, color_hex )').eq('visibility', 'public').order('score', { ascending: false }).limit(60)
      .then(async ({ data }) => {
        const rows = (data as unknown as { id: string; name: string; user_id: string; score: number | null; faction: { id: number; name: string; icon_url: string | null; color_hex: string | null } | null }[]) ?? []
        const uids = [...new Set(rows.map((r) => r.user_id).filter(Boolean))]
        const authors: Record<string, string> = {}
        if (uids.length) { const { data: profs } = await supabase.from('profiles').select('id, username, display_name').in('id', uids); for (const pr of ((profs as { id: string; username: string | null; display_name: string | null }[]) ?? [])) authors[pr.id] = pr.display_name || pr.username || 'žaidėjas' }
        setPublicDecks(rows.map((d) => ({ id: d.id, name: d.name, faction: d.faction?.name ?? null, factionIcon: d.faction?.icon_url ?? null, factionColor: d.faction?.color_hex ?? null, factionId: d.faction?.id ?? null, author: authors[d.user_id] ?? 'žaidėjas', score: d.score ?? 0 })))
      })
  }, [])

  const adState = useActiveDeck()
  const globalDeck = activeDeckOf(adState)
  // VIENINTELIS šaltinis — globali aktyvi kaladė. JOKIO tylaus fallback į kitą
  // kaladę (kova privalo vykti su ta, kurią žaidėjas pasirinko). Jei netinkama —
  // deck=null ir CTA aiškiai pasako. Fallback į seną vietinę TIK kol store kraunasi.
  const deck = adState.loaded
    ? (globalDeck ? decks?.find((d) => d.id === globalDeck.id && d.missing === 0) : undefined)
    : decks?.find((d) => d.id === sel && d.missing === 0)
  const playable = (decks ?? []).filter((d) => d.missing === 0)
  const selFactionObj = factions.find((f) => f.id === oppFaction)
  const selDeckObj = publicDecks.find((d) => d.id === oppDeck)
  const filteredDecks = useMemo(() => {
    const q = query.trim().toLowerCase()
    return publicDecks.filter((d) => (!filterFaction || d.factionId === filterFaction) && (!q || d.name.toLowerCase().includes(q) || d.author.toLowerCase().includes(q) || (d.faction ?? '').toLowerCase().includes(q)))
  }, [publicDecks, query, filterFaction])

  const canStart = !!deck && (mode === 'random' || (mode === 'faction' && !!oppFaction) || (mode === 'public' && !!oppDeck))
  const start = useCallback(() => {
    if (!canStart) return
    playUiClick()
    if (mode === 'random' && factions.length && !oppFaction) setOppFaction(factions[Math.floor(Math.random() * factions.length)].id)
    setStarted(true)
  }, [canStart, mode, factions, oppFaction])

  const oppSummary = mode === 'random' ? 'Atsitiktinė frakcija' : mode === 'faction' ? (selFactionObj ? `${selFactionObj.name} AI` : '—') : (selDeckObj ? selDeckObj.name : '—')

  if (started && deck) {
    return <TutorialGame deckId={deck.id} deckName={deck.name} practice
      opponentDeckId={mode === 'public' ? oppDeck : null}
      opponentFaction={mode !== 'public' && oppFaction ? Number(oppFaction) : null}
      opponentName={mode === 'public' ? (selDeckObj?.name ?? 'Priešas') : (selFactionObj?.name ?? 'Priešas')}
      difficulty={difficulty}
      onClose={() => setStarted(false)} />
  }

  if (decks === null) return <div className="h-full flex items-center justify-center"><span style={{ color: 'var(--text-muted)' }}>Kraunama…</span></div>
  if (playable.length === 0) return (
    <div className="h-full flex flex-col items-center justify-center gap-3 text-center px-6">
      <p style={{ color: 'var(--text-muted)' }}>Neturi žaidžiamų kaladžių.</p>
      <Link href="/digital/decks?tab=builder" onClick={() => playUiClick()} className="px-5 py-2.5 rounded-xl text-sm font-bold" style={{ background: `rgba(${A},0.2)`, border: `1px solid rgba(${A},0.6)`, color: '#86efac', fontFamily: 'var(--rvn-font-display)' }}>Sukurti kaladę</Link>
    </div>
  )

  const modeTab = (m: Mode, icon: string, label: string) => (
    <button key={m} onClick={() => { playUiClick(); setMode(m) }} className="rvn-press w-full rounded-xl px-1 py-2 flex flex-col items-center gap-1"
      style={{ minHeight: 52, maxHeight: 64, border: mode === m ? `1.5px solid rgba(${A},0.9)` : '1px solid rgba(255,255,255,0.08)', background: mode === m ? `linear-gradient(160deg, rgba(${A},0.16), rgba(10,8,16,0.9))` : 'rgba(10,8,16,0.6)' }}>
      <span style={{ fontSize: 18 }}>{icon}</span>
      <span className="rvn-disp font-bold uppercase text-center leading-tight" style={{ fontSize: 'clamp(8px,1.2vh,11px)', color: mode === m ? '#86efac' : 'var(--text-secondary)' }}>{label}</span>
    </button>
  )
  const diffBtn = (d: AiDifficulty, lbl: string) => (
    <button key={d} onClick={() => { playUiClick(); setDifficulty(d) }} className="flex-1 rounded-lg font-semibold" style={{ fontSize: 'clamp(10px,1.5vh,12px)', minHeight: 'clamp(28px,4.8vh,36px)', background: difficulty === d ? `rgba(${A},0.22)` : 'rgba(10,8,16,0.8)', border: '1px solid ' + (difficulty === d ? `rgba(${A},0.6)` : 'rgba(255,255,255,0.08)'), color: difficulty === d ? '#bbf7d0' : 'var(--text-muted)' }}>{lbl}</button>
  )
  const inputStyle: React.CSSProperties = { minHeight: 36, background: 'rgba(10,8,16,0.85)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-secondary)', borderRadius: 10, padding: '0 10px', fontSize: 12 }

  return (
    <div data-pve-v="446" className="h-full flex flex-col min-h-0" style={{ gap: 'clamp(4px,1vh,10px)' }}>
      <div className="text-center shrink-0">
        <div className="rvn-disp font-black uppercase leading-none" style={{ fontSize: 'clamp(17px,3.4vh,30px)', color: '#86efac', letterSpacing: '0.04em' }}>Treniruotė prieš AI</div>
      </div>

      {/* Aktyvi kaladė — kompaktiška santrauka (globali; keitimas per modalą) */}
      <div className="shrink-0"><ActiveDeckSummary accent={A} /></div>

      <div className="flex-1 min-h-0 grid gap-2" style={{ gridTemplateColumns: 'minmax(0,1.8fr) minmax(190px,1.05fr)' }}>


        {/* CENTRAS: priešininko tipas */}
        <section className="rounded-2xl flex flex-col min-h-0 overflow-hidden p-2.5" style={PANEL}>
          <div className="rvn-disp font-extrabold uppercase tracking-wide mb-2 shrink-0 text-center" style={{ fontSize: 'clamp(10px,1.5vh,13px)', color: '#86efac' }}>Priešininko tipas</div>
          <div className="grid grid-cols-4 gap-1.5 mb-2 shrink-0" style={{ alignItems: 'start' }}>
            {modeTab('random', '🎲', 'Atsitiktinė frakcija')}
            {modeTab('faction', '🏰', 'Pasirinkta frakcija')}
            {modeTab('public', '🌐', 'Viešas deck')}
            <Link href="/digital/tutorial" onClick={() => playUiClick()} className="rvn-press w-full rounded-xl px-1 py-2 flex flex-col items-center gap-1" style={{ minHeight: 52, maxHeight: 64, border: '1px solid rgba(139,92,246,0.4)', background: 'rgba(139,92,246,0.1)' }}>
              <span style={{ fontSize: 18 }}>🎓</span>
              <span className="rvn-disp font-bold uppercase text-center leading-tight" style={{ fontSize: 'clamp(8px,1.2vh,11px)', color: '#c4b5fd' }}>Mokymai</span>
            </Link>
          </div>
          <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
            {mode === 'random' && (
              <div className="flex-1 flex flex-col items-center justify-center text-center gap-2 p-4">
                <span style={{ fontSize: 40 }}>🎲</span>
                <div className="rvn-disp font-bold" style={{ fontSize: 15, color: '#bbf7d0' }}>Atsitiktinė frakcija</div>
                <p style={{ fontSize: 11, color: 'var(--text-muted)', maxWidth: 320 }}>Botas pasirinks atsitiktinę frakciją ir automatinę kaladę. Greičiausias startas.</p>
              </div>
            )}
            {mode === 'faction' && (
              <div className="flex-1 min-h-0 overflow-y-auto grid grid-cols-2 gap-1.5 content-start">
                {factions.map((f) => { const s = f.id === oppFaction; return (
                  <button key={f.id} onClick={() => { playUiClick(); setOppFaction(f.id) }} className="rvn-press flex items-center gap-2 rounded-xl px-2 py-1.5 text-left" style={{ border: s ? `1.5px solid rgba(${A},0.9)` : '1px solid rgba(255,255,255,0.08)', background: s ? `linear-gradient(135deg, rgba(${A},0.16), rgba(10,8,16,0.9))` : 'rgba(10,8,16,0.6)' }}>
                    <span className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center overflow-hidden" style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid ' + (f.color_hex ? f.color_hex + '88' : 'rgba(240,180,41,0.3)') }}>{f.icon_url ? <img src={f.icon_url} alt="" width={32} height={32} className="w-full h-full object-cover" /> : <span>⚔</span>}</span>
                    <span className="min-w-0"><span className="block truncate rvn-disp font-bold" style={{ fontSize: 12, color: '#fff' }}>{f.name}</span><span className="block truncate" style={{ fontSize: 9, color: 'var(--text-muted)' }}>{FACTION_DESC[f.name] ?? 'AI kaladė'}</span></span>
                  </button>
                ) })}
              </div>
            )}
            {mode === 'public' && (
              <div className="flex-1 min-h-0 flex flex-col">
                <div className="flex gap-2 mb-2 shrink-0">
                  <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Ieškoti decko arba autoriaus…" className="flex-1 outline-none" style={inputStyle} />
                  <select value={filterFaction ? String(filterFaction) : ''} onChange={(e) => setFilterFaction(e.target.value ? Number(e.target.value) : '')} style={{ ...inputStyle, maxWidth: 140 }}>
                    <option value="">Visos frakcijos</option>{factions.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
                  </select>
                </div>
                <div className="flex-1 min-h-0 overflow-y-auto grid grid-cols-2 gap-1.5 content-start">
                  {filteredDecks.length === 0 && <p className="col-span-2 text-center py-4" style={{ fontSize: 12, color: 'var(--text-muted)' }}>Nerasta deck&apos;ų.</p>}
                  {filteredDecks.map((d) => { const s = d.id === oppDeck; return (
                    <button key={d.id} onClick={() => { playUiClick(); setOppDeck(d.id) }} className="rvn-press rounded-xl p-2 flex flex-col gap-1 text-left" style={{ border: s ? `1.5px solid rgba(${A},0.9)` : '1px solid rgba(255,255,255,0.08)', background: s ? `linear-gradient(135deg, rgba(${A},0.14), rgba(10,8,16,0.9))` : 'rgba(10,8,16,0.6)' }}>
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center overflow-hidden" style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid ' + (d.factionColor ? d.factionColor + '88' : 'rgba(240,180,41,0.3)') }}>{d.factionIcon ? <img src={d.factionIcon} alt="" width={28} height={28} className="w-full h-full object-cover" /> : <span style={{ fontSize: 12 }}>⚔</span>}</span>
                        <span className="min-w-0 flex-1"><span className="block truncate rvn-disp font-bold" style={{ fontSize: 12, color: '#fff' }}>{d.name}</span><span className="block truncate" style={{ fontSize: 9, color: 'var(--text-muted)' }}>{d.author}</span></span>
                        {s ? <span style={{ color: '#86efac', fontSize: 13 }}>✓</span> : d.score > 0 ? <span className="shrink-0" style={{ fontSize: 9, color: '#fb923c' }}>🔥{d.score >= 1000 ? (d.score / 1000).toFixed(1) + 'K' : d.score}</span> : null}
                      </div>
                      <span className="truncate" style={{ fontSize: 9, color: 'var(--text-secondary)' }}>{d.faction ?? '—'}</span>
                    </button>
                  ) })}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* DEŠINĖ: santrauka + sunkumas */}
        <section className="rounded-2xl flex flex-col min-h-0 overflow-hidden p-2.5" style={PANEL}>
          {/* Stabilus grid: santrauka (1fr, scroll TIK jei labai žema) / sunkumas / CTA — sunkumas ir CTA VISADA matomi */}
          <div className="flex-1 min-h-0 flex flex-col" style={{ gap: 'clamp(6px,1.2vh,10px)' }}>
            <div className="rounded-xl flex flex-col flex-1 min-h-0 overflow-y-auto" style={{ padding: 'clamp(6px,1.2vh,10px)', gap: 'clamp(4px,0.8vh,6px)', background: 'rgba(10,8,16,0.7)', border: `1px solid rgba(${A},0.22)` }}>
              <div><div className="rvn-disp font-bold uppercase" style={{ fontSize: 'clamp(8px,1.3vh,10px)', color: '#86efac' }}>Tu</div><div className="truncate" style={{ fontSize: 'clamp(11px,1.8vh,13px)', color: '#fff', fontFamily: 'var(--rvn-font-display)' }}>{deck?.name ?? '—'}</div></div>
              <div><div className="rvn-disp font-bold uppercase" style={{ fontSize: 'clamp(8px,1.3vh,10px)', color: '#fca5a5' }}>Priešininkas</div><div className="truncate" style={{ fontSize: 'clamp(11px,1.8vh,13px)', color: '#fff', fontFamily: 'var(--rvn-font-display)' }}>{oppSummary}</div></div>
            </div>
            <div className="shrink-0" data-testid="ai-difficulty">
              <p className="rvn-disp font-semibold uppercase" style={{ fontSize: 'clamp(8px,1.3vh,10px)', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: 'clamp(3px,0.7vh,6px)' }}>AI sunkumas</p>
              <div className="flex gap-1.5">{diffBtn('easy', '😴 Lengvas')}{diffBtn('normal', '⚔ Vidutinis')}{diffBtn('hard', '💀 Sunkus')}</div>
              <p style={{ marginTop: 'clamp(3px,0.7vh,6px)', fontSize: 'clamp(8px,1.3vh,10px)', color: 'var(--text-muted)', lineHeight: 1.3, minHeight: '2.6em' }}>{difficulty === 'easy' ? 'Paprasti trade’ai, retai combo, kartais silpni ėjimai.' : difficulty === 'hard' ? 'Planuoja 2–3 ėjimus, skaičiuoja lethal, baudžia silpną lentą.' : 'Skaičiuoja trade’us, naudoja removal/AoE, saugosi lethal.'}</p>
            </div>
          </div>
          <button disabled={!canStart} onClick={start} className="rvn-press w-full rounded-2xl font-black transition-all disabled:opacity-40 active:scale-[0.98] flex items-center justify-center gap-2 shrink-0"
            style={{ marginTop: 'clamp(4px,1vh,8px)', minHeight: 'clamp(40px,7vh,58px)', background: canStart ? `linear-gradient(135deg, rgba(${A},0.95), rgba(52,211,153,0.9))` : 'rgba(255,255,255,0.06)', color: canStart ? '#04210f' : 'var(--text-muted)', fontFamily: 'var(--rvn-font-display)', letterSpacing: '0.04em', fontSize: 'clamp(13px,1.9vh,17px)', boxShadow: canStart ? `0 0 20px rgba(${A},0.5)` : 'none' }}>
            ⚔ {canStart ? 'PRADĖTI KOVĄ' : !deck ? 'AKTYVI KALADĖ NETINKAMA' : mode === 'faction' ? 'PASIRINK FRAKCIJĄ' : mode === 'public' ? 'PASIRINK DECK’Ą' : 'PASIRINK PRIEŠININKĄ'}
          </button>
        </section>
      </div>

    </div>
  )
}
