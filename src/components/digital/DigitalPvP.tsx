'use client'

// ── Ravenof Digital — PvP (laisva) puslapis (main-menu stilius) ───────────────
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { playUiClick } from '@/lib/ui-sound'
import { PvPLobby } from './PvPLobby'

const oct = (b: number) => `polygon(${b}px 0, calc(100% - ${b}px) 0, 100% ${b}px, 100% calc(100% - ${b}px), calc(100% - ${b}px) 100%, ${b}px 100%, 0 calc(100% - ${b}px), 0 ${b}px)`
type Deck = { id: string; name: string; faction: string | null }

export function DigitalPvP() {
  const [decks, setDecks] = useState<Deck[] | null>(null)
  const [sel, setSel] = useState('')
  const [open, setOpen] = useState(false)
  const [hostCode, setHostCode] = useState<string | null>(null)
  const [joinCode, setJoinCode] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { setDecks([]); return }
      supabase.from('decks').select('id, name, faction:factions ( name )').eq('user_id', user.id).order('updated_at', { ascending: false })
        .then(({ data }) => {
          const rows = (data as unknown as { id: string; name: string; faction: { name: string } | null }[]) ?? []
          const ds = rows.map((d) => ({ id: d.id, name: d.name, faction: d.faction?.name ?? null }))
          setDecks(ds); if (ds.length) setSel(ds[0].id)
        })
    })
  }, [])

  useEffect(() => {
    const sp = new URLSearchParams(window.location.search)
    setHostCode(sp.get('host')); setJoinCode(sp.get('join'))
  }, [])

  // Iššūkis: kai yra ?host/?join ir parinkta kaladė – atidaryti lobby automatiškai
  useEffect(() => { if ((hostCode || joinCode) && sel) setOpen(true) }, [hostCode, joinCode, sel])

  const deck = decks?.find((d) => d.id === sel)
  const A = '251,146,60'

  return (
    <div className="max-w-md mx-auto space-y-5">
      <div className="relative" style={{ clipPath: oct(15), background: `rgba(${A},0.5)`, padding: 2.5 }}>
        <div className="px-5 py-6 text-center" style={{ clipPath: oct(14), background: `radial-gradient(120% 90% at 50% 0%, rgba(${A},0.16), rgba(10,8,16,0.97) 60%), linear-gradient(160deg,#15101f,#0a0810)` }}>
          <span className="text-5xl" style={{ filter: `drop-shadow(0 0 12px rgba(${A},0.55))` }}>⚔️</span>
          <h1 className="text-xl font-bold mt-1" style={{ fontFamily: 'var(--rvn-font-display)', color: '#f3ead3', letterSpacing: '0.08em', textShadow: `0 0 12px rgba(${A},0.4)` }}>PVP — LAISVA</h1>
          <p className="text-[11px] mt-1" style={{ color: 'var(--text-muted)' }}>Kaukis realiu laiku prieš kitą žaidėją: privatus kambarys su kodu arba atsitiktinis varžovas. Pergalė — +100 aukso.</p>
        </div>
      </div>

      {decks === null ? (
        <p className="text-center text-sm" style={{ color: 'var(--text-muted)' }}>Kraunama…</p>
      ) : decks.length === 0 ? (
        <div className="text-center">
          <p className="text-sm mb-3" style={{ color: 'var(--text-muted)' }}>Neturi kaladžių.</p>
          <Link href="/digital/decks?tab=builder" onClick={() => playUiClick()} className="inline-block px-5 py-2.5 rounded-xl text-sm font-bold" style={{ background: `rgba(${A},0.2)`, border: `1px solid rgba(${A},0.6)`, color: '#fdba74', fontFamily: 'var(--rvn-font-display)' }}>Sukurti kaladę</Link>
        </div>
      ) : (
        <>
          <div className="relative" style={{ clipPath: oct(12), background: `rgba(${A},0.4)`, padding: 2 }}>
            <div className="px-4 py-3" style={{ clipPath: oct(11), background: 'linear-gradient(160deg,#15101f,#0a0810)' }}>
              <label className="text-[10px] font-semibold block mb-1.5 text-center" style={{ color: '#fdba74', fontFamily: 'var(--rvn-font-display)', letterSpacing: '0.1em' }}>⚔ TAVO KALADĖ</label>
              <select value={sel} onChange={(e) => setSel(e.target.value)} style={{ width: '100%', padding: '0.45rem 0.6rem', borderRadius: '0.4rem', fontSize: '0.85rem', background: 'var(--bg-elevated)', border: '1px solid var(--bg-border)', color: 'var(--text-primary)', outline: 'none', textAlign: 'center' }}>
                {decks.map((d) => <option key={d.id} value={d.id}>{d.name}{d.faction ? ` (${d.faction})` : ''}</option>)}
              </select>
            </div>
          </div>
          <button onClick={() => { playUiClick(); setOpen(true) }} disabled={!deck}
            className="block w-full px-4 py-3 rounded-xl text-base font-bold transition-transform hover:scale-[1.02] active:scale-95 disabled:opacity-40"
            style={{ background: `rgba(${A},0.2)`, border: `1px solid rgba(${A},0.6)`, color: '#fdba74', fontFamily: 'var(--rvn-font-display)', letterSpacing: '0.06em' }}>
            ⚔ Į ARENĄ
          </button>
          {(hostCode || joinCode) && <p className="text-[11px] text-center" style={{ color: '#fdba74' }}>🎯 Draugo iššūkis: parink kaladę – kova prasidės automatiškai.</p>}
          {open && deck && <PvPLobby deckId={deck.id} deckName={deck.name} presetHost={hostCode} presetJoin={joinCode} onClose={() => setOpen(false)} />}
        </>
      )}
    </div>
  )
}
