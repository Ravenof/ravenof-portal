'use client'

// ── Ravenof Digital — Co-op 2v2 vs botai (tikras 1v1-mechanikos komandinis) ──
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { playUiClick } from '@/lib/ui-sound'
import { buildCoop2v2, type Coop2v2 } from '@/lib/team2v2/load'
import { Team2v2Game } from './Team2v2Game'
import { PageHero } from './ui/HubKit'

const oct = (b: number) => `polygon(${b}px 0, calc(100% - ${b}px) 0, 100% ${b}px, 100% calc(100% - ${b}px), calc(100% - ${b}px) 100%, ${b}px 100%, 0 calc(100% - ${b}px), 0 ${b}px)`
const A = '56,189,248'
type Deck = { id: string; name: string; faction: string | null }

export function DigitalCoop() {
  const [decks, setDecks] = useState<Deck[] | null>(null)
  const [sel, setSel] = useState('')
  const [name, setName] = useState('Tu')
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [coop, setCoop] = useState<Coop2v2 | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { setDecks([]); return }
      setName((user.user_metadata?.display_name as string) || (user.user_metadata?.username as string) || (user.email?.split('@')[0]) || 'Tu')
      supabase.from('decks').select('id, name, faction:factions ( name )').eq('user_id', user.id).not('name', 'ilike', '[Kampanija]%').order('updated_at', { ascending: false })
        .then(({ data }) => {
          const rows = (data as unknown as { id: string; name: string; faction: { name: string } | null }[]) ?? []
          const ds = rows.map((d) => ({ id: d.id, name: d.name, faction: d.faction?.name ?? null }))
          setDecks(ds); if (ds.length) setSel(ds[0].id)
        })
    })
  }, [])

  const start = async () => {
    if (!sel) return
    playUiClick(); setLoading(true); setErr(null)
    const c = await buildCoop2v2(sel, name)
    setLoading(false)
    if (!c) { setErr('Nepavyko užkrauti kortų (kaladėje per mažai kūrinių?).'); return }
    setCoop(c)
  }

  if (coop) return <Team2v2Game coop={coop} onExit={() => setCoop(null)} />

  return (
    <div className="max-w-md mx-auto space-y-5">
      <PageHero icon={<span style={{ fontSize: 44 }}>🤝</span>} accent={A}
        title="CO-OP 2v2" sub="Tu + AI sąjungininkas prieš 2 AI priešus. Ėjimais, komandos ėjimas, bendras 60 HP, draugiški efektai veikia visai komandai." />

      {decks === null ? (
        <p className="text-center text-sm" style={{ color: 'var(--text-muted)' }}>Kraunama…</p>
      ) : decks.length === 0 ? (
        <div className="text-center">
          <p className="text-sm mb-3" style={{ color: 'var(--text-muted)' }}>Neturi kaladžių.</p>
          <Link href="/digital/decks?tab=builder" onClick={() => playUiClick()} className="inline-block px-5 py-2.5 rounded-xl text-sm font-bold" style={{ background: `rgba(${A},0.2)`, border: `1px solid rgba(${A},0.6)`, color: '#7dd3fc', fontFamily: 'var(--rvn-font-display)' }}>Sukurti kaladę</Link>
        </div>
      ) : (
        <>
          <div className="relative" style={{ clipPath: oct(12), background: `rgba(${A},0.4)`, padding: 2 }}>
            <div className="px-4 py-3" style={{ clipPath: oct(11), background: 'linear-gradient(160deg,#15101f,#0a0810)' }}>
              <label className="text-[10px] font-semibold block mb-1.5 text-center" style={{ color: '#7dd3fc', fontFamily: 'var(--rvn-font-display)', letterSpacing: '0.1em' }}>⚔ TAVO KALADĖ</label>
              <select value={sel} onChange={(e) => setSel(e.target.value)} style={{ width: '100%', padding: '0.45rem 0.6rem', borderRadius: '0.4rem', fontSize: '0.85rem', background: 'var(--bg-elevated)', border: '1px solid var(--bg-border)', color: 'var(--text-primary)', outline: 'none', textAlign: 'center' }}>
                {decks.map((d) => <option key={d.id} value={d.id}>{d.name}{d.faction ? ` (${d.faction})` : ''}</option>)}
              </select>
            </div>
          </div>
          <button onClick={start} disabled={!sel || loading}
            className="block w-full px-4 py-3 rounded-xl text-base font-bold transition-transform hover:scale-[1.02] active:scale-95 disabled:opacity-40"
            style={{ background: `rgba(${A},0.2)`, border: `1px solid rgba(${A},0.6)`, color: '#7dd3fc', fontFamily: 'var(--rvn-font-display)', letterSpacing: '0.06em' }}>
            {loading ? 'Kraunama…' : '🤝 PRADĖTI 2v2'}
          </button>
          {err && <p className="text-center text-xs" style={{ color: '#f87171' }}>{err}</p>}
          <p className="text-center text-[10px]" style={{ color: 'var(--text-muted)' }}>Pastaba: pirma žaidžiama versija — efektų taikinius botai/auto parenka patys; čempionų rankinis žaidimas dar ribotas.</p>
        </>
      )}
    </div>
  )
}
