'use client'

// ── Ravenof Digital — Draugiška kova (PvP laisva) ─────────────────────────────
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Swords } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { playUiClick } from '@/lib/ui-sound'
import { DigitalPicker } from './DigitalPicker'
import { PvPLobby } from './PvPLobby'
import { PageHero } from './ui/HubKit'

type Deck = { id: string; name: string; faction: string | null; factionIcon: string | null; factionColor: string | null }
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
      supabase.from('decks').select('id, name, faction:factions ( name, icon_url, color_hex )').eq('user_id', user.id).not('name', 'ilike', '[Kampanija]%').order('updated_at', { ascending: false })
        .then(({ data }) => {
          const rows = (data as unknown as { id: string; name: string; faction: { name: string; icon_url: string | null; color_hex: string | null } | null }[]) ?? []
          const ds = rows.map((d) => ({ id: d.id, name: d.name, faction: d.faction?.name ?? null, factionIcon: d.faction?.icon_url ?? null, factionColor: d.faction?.color_hex ?? null }))
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
      <PageHero iconName="fi-pvp" icon={<Swords className="w-10 h-10" style={{ color: `rgb(${A})` }} />} accent={A}
        title="DRAUGIŠKA KOVA" sub="Kaukis realiu laiku prieš kitą žaidėją: privatus kambarys su kodu arba atsitiktinis varžovas. Pergalė — +100 aukso." />

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
            <DigitalPicker label="⚔ Tavo kaladė" accent={A} value={sel} onChange={setSel}
              items={decks.map((d) => ({ value: d.id, label: d.name, sub: d.faction ?? undefined, iconUrl: d.factionIcon, color: d.factionColor ?? undefined }))} />
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
