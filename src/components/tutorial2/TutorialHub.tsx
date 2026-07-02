'use client'

// ════════════════════════════════════════════════════════════════════════════
// TutorialHub — naujoko mokymai: pasirink vieną iš 8 starter kaladžių (gauni ją
// NEMOKAMAI) ir sužaisk vedamą mūšį TIKROMIS tos kaladės kortomis prieš
// ATSITIKTINĘ starter kaladę. Vedimą teikia TutorialGame įprastas guided režimas
// (žingsniai + mechanikų patarimai). Jokių dirbtinių kortų.
// ════════════════════════════════════════════════════════════════════════════

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { playUiClick } from '@/lib/ui-sound'
import { TutorialGame } from '@/components/tutorial/TutorialGame'
import { getStarterDecks, claimStarterDeck, type StarterDeck } from '@/lib/starterDecks'
import { PageHero } from '@/components/digital/ui/HubKit'

export function TutorialHub() {
  const [starters, setStarters] = useState<StarterDeck[] | null>(null)
  const [match, setMatch] = useState<{ deckId: string; deckName: string; enemyFaction: number | null; enemyName: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  const load = async () => setStarters(await getStarterDecks())
  useEffect(() => { load() }, [])

  const launch = (deckId: string, deckName: string, chosen: StarterDeck) => {
    const pool = (starters ?? []).filter((x) => x.id !== chosen.id)
    const foe = pool.length ? pool[Math.floor(Math.random() * pool.length)] : null
    setMatch({ deckId, deckName, enemyFaction: foe?.factionId ?? null, enemyName: foe ? (foe.faction ?? foe.name) : 'Priešininkas' })
  }

  const choose = async (d: StarterDeck) => {
    setMsg('')
    if (d.claimed && d.deckId) { playUiClick(); launch(d.deckId, d.name, d); return }
    setBusy(true)
    const res = await claimStarterDeck(d.id)
    setBusy(false)
    if ('error' in res) {
      setMsg(res.error === 'not enough gold' ? 'Trūksta aukso šiai kaladei.' : res.error === 'already claimed' ? 'Šią kaladę jau turi – atnaujink puslapį.' : 'Nepavyko: ' + res.error)
      void load()
      return
    }
    playUiClick()
    launch(res.deckId, d.name, d)
  }

  if (match) {
    return (
      <TutorialGame
        deckId={match.deckId}
        deckName={match.deckName}
        opponentFaction={match.enemyFaction}
        opponentName={match.enemyName}
        onClose={() => { setMatch(null); load() }}
      />
    )
  }

  const decks = starters ?? []

  return (
    <div style={{ minHeight: '100%', padding: '16px 14px 90px', maxWidth: 760, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <Link href="/digital" onClick={() => playUiClick()} style={{ fontSize: 12, color: 'var(--text-secondary)', background: 'rgba(10,8,16,0.8)', border: '1px solid rgba(255,255,255,0.12)', padding: '5px 11px', borderRadius: 10, flexShrink: 0 }}>← Atgal</Link>
      </div>
      <div style={{ marginBottom: 12 }}>
        <PageHero iconName="fi-academy" icon={<span style={{ fontSize: 44 }}>🎓</span>} accent="139,92,246"
          title="MOKYMAI" sub="Pasirink vieną starter kaladę — gauni ją nemokamai. Tada vedamame mūšyje išmoksi žaisti tikromis tos kaladės kortomis prieš atsitiktinį priešą." />
      </div>
      {msg && <p style={{ fontSize: 12, color: '#fbbf24', marginBottom: 8 }}>{msg}</p>}

      {!starters && <p style={{ color: 'var(--text-muted)', fontSize: 13, padding: '30px 0', textAlign: 'center' }}>Kraunama…</p>}
      {starters && decks.length === 0 && <p style={{ color: 'var(--text-muted)', fontSize: 13, padding: '30px 0', textAlign: 'center' }}>Starter kaladžių nėra. Paleisk migraciją 20260718.</p>}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {decks.map((d) => (
          <button key={d.id} disabled={busy} onClick={() => choose(d)}
            style={{
              textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 4, padding: '14px 16px', borderRadius: 16, cursor: 'pointer',
              background: d.claimed ? 'linear-gradient(150deg, rgba(52,211,153,0.14), rgba(10,8,16,0.92))' : 'linear-gradient(150deg, rgba(240,180,41,0.14), rgba(10,8,16,0.92))',
              border: d.claimed ? '1px solid rgba(52,211,153,0.45)' : '1px solid rgba(240,180,41,0.4)',
            }}>
            <span style={{ fontWeight: 800, color: '#f3ead3', fontFamily: 'var(--rvn-font-display, Cinzel, serif)', fontSize: 15 }}>{d.faction ?? d.name}</span>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{d.cardCount} kortų</span>
            <span style={{ fontSize: 12, marginTop: 4, fontWeight: 700, color: d.claimed ? '#34d399' : 'var(--gold)' }}>
              {d.claimed ? '✓ Turima — žaisti' : 'Pasirinkti (nemokamai) →'}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
