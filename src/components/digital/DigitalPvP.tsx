'use client'

// ── Ravenof Digital — Draugiška kova (PvP laisva) ─────────────────────────────
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Swords } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { playUiClick } from '@/lib/ui-sound'
import { PvPLobby } from './PvPLobby'

type Deck = { id: string; name: string; faction: string | null }
const A = '251,146,60'

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

  return (
    <div className="max-w-md mx-auto space-y-4">
      {/* Hero */}
      <div className="relative rounded-2xl overflow-hidden" style={{ border: `1px solid rgba(${A},0.4)`, background: `radial-gradient(130% 90% at 50% 0%, rgba(${A},0.16), rgba(10,8,16,0.97) 62%), linear-gradient(160deg,#17111f,#0a0810)` }}>
        <div className="px-5 py-6 text-center">
          <span className="inline-flex items-center justify-center rounded-2xl mb-2" style={{ width: 60, height: 60, background: `rgba(${A},0.14)`, border: `1px solid rgba(${A},0.4)` }}>
            <Swords className="w-7 h-7" style={{ color: `rgb(${A})` }} />
          </span>
          <h1 className="text-2xl font-extrabold" style={{ fontFamily: 'var(--rvn-font-display)', color: 'var(--gold)', letterSpacing: '0.1em', textShadow: `0 0 16px rgba(${A},0.35)` }}>DRAUGIŠKA KOVA</h1>
          <p className="text-[11px] mt-1.5 leading-snug" style={{ color: 'var(--text-muted)' }}>Kaukis realiu laiku prieš kitą žaidėją: privatus kambarys su kodu arba atsitiktinis varžovas. Pergalė — +100 aukso.</p>
        </div>
      </div>

      {decks === null ? (
        <p className="text-center text-sm py-8" style={{ color: 'var(--text-muted)' }}>Kraunama…</p>
      ) : decks.length === 0 ? (
        <div className="text-center py-6">
          <p className="text-sm mb-3" style={{ color: 'var(--text-muted)' }}>Neturi kaladžių.</p>
          <Link href="/digital/decks?tab=builder" onClick={() => playUiClick()} className="inline-flex items-center gap-2 px-5 rounded-xl text-sm font-bold" style={{ minHeight: 48, background: `rgba(${A},0.2)`, border: `1px solid rgba(${A},0.6)`, color: '#fdba74', fontFamily: 'var(--rvn-font-display)' }}>Sukurti kaladę</Link>
        </div>
      ) : (
        <>
          <div className="rounded-2xl px-4 py-3" style={{ background: 'rgba(10,8,16,0.7)', border: `1px solid rgba(${A},0.3)` }}>
            <label className="text-[10px] font-bold block mb-1.5 uppercase tracking-widest" style={{ color: '#fdba74', fontFamily: 'var(--rvn-font-display)', letterSpacing: '0.12em' }}>⚔ Tavo kaladė</label>
            <select value={sel} onChange={(e) => setSel(e.target.value)} className="w-full text-sm outline-none" style={{ minHeight: 46, padding: '0 0.7rem', borderRadius: '0.6rem', background: 'rgba(10,8,16,0.9)', border: '1px solid rgba(240,180,41,0.3)', color: 'var(--text-primary)' }}>
              {decks.map((d) => <option key={d.id} value={d.id}>{d.name}{d.faction ? ` (${d.faction})` : ''}</option>)}
            </select>
          </div>
          <button onClick={() => { playUiClick(); setOpen(true) }} disabled={!deck}
            className="flex items-center justify-center gap-2 w-full rounded-2xl text-base font-bold transition-transform active:scale-[0.98] disabled:opacity-40"
            style={{ minHeight: 56, background: `rgba(${A},0.9)`, color: '#1a0f04', fontFamily: 'var(--rvn-font-display)', letterSpacing: '0.06em' }}>
            <Swords className="w-5 h-5" /> Į areną
          </button>
          {(hostCode || joinCode) && <p className="text-[11px] text-center" style={{ color: '#fdba74' }}>🎯 Draugo iššūkis: parink kaladę – kova prasidės automatiškai.</p>}
          {open && deck && <PvPLobby deckId={deck.id} deckName={deck.name} presetHost={hostCode} presetJoin={joinCode} onClose={() => setOpen(false)} />}
        </>
      )}
    </div>
  )
}
