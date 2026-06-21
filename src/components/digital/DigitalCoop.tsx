'use client'

// ── Ravenof Digital — Co-op 2v2 vs botai (FAZĖ 1: lobby + komandos sąranka) ───
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { playUiClick } from '@/lib/ui-sound'
import { buildCoopMatch, type CoopSetup } from '@/lib/team2v2/setup'
import { TEAM_HP_MAX, type Team } from '@/lib/team2v2/types'

const oct = (b: number) => `polygon(${b}px 0, calc(100% - ${b}px) 0, 100% ${b}px, 100% calc(100% - ${b}px), calc(100% - ${b}px) 100%, ${b}px 100%, 0 calc(100% - ${b}px), 0 ${b}px)`
const A = '56,189,248' // žydras (komandinis akcentas)
type Deck = { id: string; name: string; faction: string | null }

export function DigitalCoop() {
  const [decks, setDecks] = useState<Deck[] | null>(null)
  const [sel, setSel] = useState('')
  const [name, setName] = useState('Tu')
  const [setup, setSetup] = useState<CoopSetup | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { setDecks([]); return }
      const nm = (user.user_metadata?.display_name as string) || (user.user_metadata?.username as string) || (user.email?.split('@')[0]) || 'Tu'
      setName(nm)
      supabase.from('decks').select('id, name, faction:factions ( name )').eq('user_id', user.id).order('updated_at', { ascending: false })
        .then(({ data }) => {
          const rows = (data as unknown as { id: string; name: string; faction: { name: string } | null }[]) ?? []
          const ds = rows.map((d) => ({ id: d.id, name: d.name, faction: d.faction?.name ?? null }))
          setDecks(ds); if (ds.length) setSel(ds[0].id)
        })
    })
  }, [])

  const make = () => { if (!sel) return; playUiClick(); setSetup(buildCoopMatch(sel, name)) }

  const TeamPanel = ({ team, label, accent }: { team: Team; label: string; accent: string }) => (
    <div style={{ clipPath: oct(11), background: `rgba(${accent},0.4)`, padding: 2, flex: 1 }}>
      <div className="px-3 py-3 h-full" style={{ clipPath: oct(10), background: 'linear-gradient(160deg,#15101f,#0a0810)' }}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold" style={{ color: `rgb(${accent})`, fontFamily: 'var(--rvn-font-display)', letterSpacing: '0.06em' }}>{label}</span>
          <span className="text-sm font-bold tabular-nums" style={{ color: '#f87171' }}>❤ {team.hp}/{team.maxHp}</span>
        </div>
        <div className="space-y-1.5">
          {team.seats.map((s) => (
            <div key={s.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg" style={{ background: 'rgba(10,8,16,0.6)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <span className="text-lg">{s.avatar}</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{s.name}</p>
                <p className="text-[10px] truncate" style={{ color: 'var(--text-muted)' }}>{s.controller === 'human' ? 'Tu' : `🤖 AI · ${s.faction ?? 'mišri'}`}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )

  return (
    <div className="max-w-md mx-auto space-y-5">
      <div className="relative" style={{ clipPath: oct(15), background: `rgba(${A},0.5)`, padding: 2.5 }}>
        <div className="px-5 py-6 text-center" style={{ clipPath: oct(14), background: `radial-gradient(120% 90% at 50% 0%, rgba(${A},0.16), rgba(10,8,16,0.97) 60%), linear-gradient(160deg,#15101f,#0a0810)` }}>
          <span className="text-5xl" style={{ filter: `drop-shadow(0 0 12px rgba(${A},0.55))` }}>🤝</span>
          <h1 className="text-xl font-bold mt-1" style={{ fontFamily: 'var(--rvn-font-display)', color: '#f3ead3', letterSpacing: '0.08em', textShadow: `0 0 12px rgba(${A},0.4)` }}>CO-OP 2v2 (vs botai)</h1>
          <p className="text-[11px] mt-1" style={{ color: 'var(--text-muted)' }}>Tu + AI sąjungininkas prieš 2 AI priešininkus. Komanda turi bendrą {TEAM_HP_MAX} HP.</p>
        </div>
      </div>

      {decks === null ? (
        <p className="text-center text-sm" style={{ color: 'var(--text-muted)' }}>Kraunama…</p>
      ) : decks.length === 0 ? (
        <div className="text-center">
          <p className="text-sm mb-3" style={{ color: 'var(--text-muted)' }}>Neturi kaladžių.</p>
          <Link href="/digital/deck" onClick={() => playUiClick()} className="inline-block px-5 py-2.5 rounded-xl text-sm font-bold" style={{ background: `rgba(${A},0.2)`, border: `1px solid rgba(${A},0.6)`, color: '#7dd3fc', fontFamily: 'var(--rvn-font-display)' }}>Sukurti kaladę</Link>
        </div>
      ) : !setup ? (
        <>
          <div className="relative" style={{ clipPath: oct(12), background: `rgba(${A},0.4)`, padding: 2 }}>
            <div className="px-4 py-3" style={{ clipPath: oct(11), background: 'linear-gradient(160deg,#15101f,#0a0810)' }}>
              <label className="text-[10px] font-semibold block mb-1.5 text-center" style={{ color: '#7dd3fc', fontFamily: 'var(--rvn-font-display)', letterSpacing: '0.1em' }}>⚔ TAVO KALADĖ</label>
              <select value={sel} onChange={(e) => setSel(e.target.value)} style={{ width: '100%', padding: '0.45rem 0.6rem', borderRadius: '0.4rem', fontSize: '0.85rem', background: 'var(--bg-elevated)', border: '1px solid var(--bg-border)', color: 'var(--text-primary)', outline: 'none', textAlign: 'center' }}>
                {decks.map((d) => <option key={d.id} value={d.id}>{d.name}{d.faction ? ` (${d.faction})` : ''}</option>)}
              </select>
            </div>
          </div>
          <button onClick={make} disabled={!sel}
            className="block w-full px-4 py-3 rounded-xl text-base font-bold transition-transform hover:scale-[1.02] active:scale-95 disabled:opacity-40"
            style={{ background: `rgba(${A},0.2)`, border: `1px solid rgba(${A},0.6)`, color: '#7dd3fc', fontFamily: 'var(--rvn-font-display)', letterSpacing: '0.06em' }}>
            🤝 SUDARYTI KOMANDĄ
          </button>
        </>
      ) : (
        <>
          <div className="flex gap-2 items-stretch">
            <TeamPanel team={setup.state.teams[0]} label="🟦 TAVO KOMANDA" accent={A} />
            <TeamPanel team={setup.state.teams[1]} label="🟥 PRIEŠININKAI" accent="239,68,68" />
          </div>
          <div className="px-3 py-2.5 rounded-lg text-center" style={{ background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.35)' }}>
            <p className="text-[11px]" style={{ color: '#fcd34d' }}>⚙ Komanda sudaryta. Realaus laiko 2v2 kovos variklis kuriamas (kitas etapas) — komandos veiks vienu metu, bendras HP {TEAM_HP_MAX}.</p>
          </div>
          <button onClick={() => { playUiClick(); setSetup(null) }} className="block w-full px-4 py-2.5 rounded-xl text-sm font-semibold" style={{ color: 'var(--text-muted)', border: '1px solid var(--bg-border)' }}>← Iš naujo</button>
        </>
      )}
    </div>
  )
}
