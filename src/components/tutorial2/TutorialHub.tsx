'use client'

// ════════════════════════════════════════════════════════════════════════════
// TutorialHub — naujoko mokymai: VIENA vedama kova su TAVO pasirinkta starter
// kalade. Kaladės pasirinkimas vyksta onboarding popup'e (DigitalHub) arba,
// jei dar nepasiimta, čia (fallback tinklelis). AI priešininkas žaidžia TIKRA
// atsitiktine kita starter kalade (opponentStarterId). ?auto=1 – kova
// paleidžiama iškart (atėjus iš onboarding'o).
// ════════════════════════════════════════════════════════════════════════════

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { playUiClick } from '@/lib/ui-sound'
import { TutorialGame } from '@/components/tutorial/TutorialGame'
import { getStarterDecks, claimStarterDeck, type StarterDeck } from '@/lib/starterDecks'
import { playstyleFor } from '@/components/digital/StarterOnboarding'
import { PageHero } from '@/components/digital/ui/HubKit'

type Match = { deckId: string; deckName: string; enemyStarterId: string | null; enemyFaction: number | null; enemyName: string }

export function TutorialHub() {
  const [starters, setStarters] = useState<StarterDeck[] | null>(null)
  const [match, setMatch] = useState<Match | null>(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const autoLaunched = useRef(false)

  const load = async () => setStarters(await getStarterDecks())
  useEffect(() => { load() }, [])

  const launch = (deckId: string, deckName: string, chosen: StarterDeck) => {
    // AI priešininkas – atsitiktinė KITA starter kaladė (žaidžia tikromis jos kortomis)
    const pool = (starters ?? []).filter((x) => x.id !== chosen.id)
    const foe = pool.length ? pool[Math.floor(Math.random() * pool.length)] : null
    setMatch({ deckId, deckName, enemyStarterId: foe?.id ?? null, enemyFaction: foe?.factionId ?? null, enemyName: foe ? (foe.faction ?? foe.name) : 'Priešininkas' })
  }

  const claimedDeck = (starters ?? []).find((d) => d.claimed && d.deckId) ?? null

  // Auto-start atėjus iš onboarding popup (?auto=1)
  useEffect(() => {
    if (autoLaunched.current || !claimedDeck) return
    try {
      if (new URLSearchParams(window.location.search).get('auto') === '1') {
        autoLaunched.current = true
        launch(claimedDeck.deckId!, claimedDeck.name, claimedDeck)
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [starters])

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
    void load()
    launch(res.deckId, d.name, d)
  }

  if (match) {
    return (
      <TutorialGame
        deckId={match.deckId}
        deckName={match.deckName}
        opponentStarterId={match.enemyStarterId}
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
          title="MOKYMAI" sub={claimedDeck
            ? 'Viena vedama kova su tavo kalade — išmoksi visas mechanikas prieš tikrą priešininko starter kaladę.'
            : 'Pirmiausia pasiimk nemokamą starter kaladę — tada sužaisi vedamą mokymų kovą.'} />
      </div>
      {msg && <p style={{ fontSize: 12, color: '#fbbf24', marginBottom: 8 }}>{msg}</p>}

      {!starters && <p style={{ color: 'var(--text-muted)', fontSize: 13, padding: '30px 0', textAlign: 'center' }}>Kraunama…</p>}
      {starters && decks.length === 0 && <p style={{ color: 'var(--text-muted)', fontSize: 13, padding: '30px 0', textAlign: 'center' }}>Starter kaladžių nėra. Paleisk migraciją 20260718.</p>}

      {/* Kaladė jau pasiimta → VIENAS mokymų mūšis */}
      {claimedDeck && (
        <div style={{ borderRadius: 16, padding: '18px 16px', background: 'linear-gradient(150deg, rgba(139,92,246,0.16), rgba(10,8,16,0.94))', border: '1px solid rgba(139,92,246,0.45)' }}>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 2 }}>Tavo kaladė</p>
          <p style={{ fontSize: 17, fontWeight: 800, color: '#f3ead3', fontFamily: 'var(--rvn-font-display, Cinzel, serif)', marginBottom: 6 }}>{claimedDeck.faction ?? claimedDeck.name}</p>
          <p style={{ fontSize: 12, color: '#c9bfa8', marginBottom: 14 }}>{playstyleFor(claimedDeck)} Priešininkas žais atsitiktine kita starter kalade.</p>
          <button disabled={busy} onClick={() => { playUiClick(); launch(claimedDeck.deckId!, claimedDeck.name, claimedDeck) }}
            style={{ width: '100%', padding: '14px', borderRadius: 12, fontWeight: 800, fontSize: 16, cursor: 'pointer', fontFamily: 'var(--rvn-font-display, Cinzel, serif)',
              background: 'linear-gradient(180deg,#ffe28c,#f3b62c 46%,#c5841a)', color: '#3a2406', border: '1px solid #ffeaa6',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.6), 0 6px 18px rgba(240,180,41,0.35)' }}>
            ⚔ Pradėti mokymų kovą
          </button>
        </div>
      )}

      {/* Fallback: kaladė dar nepasiimta → pasirinkimo tinklelis */}
      {!claimedDeck && decks.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {decks.map((d) => (
            <button key={d.id} disabled={busy} onClick={() => choose(d)}
              style={{
                textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 4, padding: '14px 16px', borderRadius: 16, cursor: 'pointer',
                background: 'linear-gradient(150deg, rgba(240,180,41,0.14), rgba(10,8,16,0.92))',
                border: '1px solid rgba(240,180,41,0.4)',
              }}>
              <span style={{ fontWeight: 800, color: '#f3ead3', fontFamily: 'var(--rvn-font-display, Cinzel, serif)', fontSize: 15 }}>{d.faction ?? d.name}</span>
              <span style={{ fontSize: 11, color: '#c9bfa8', lineHeight: 1.35 }}>{playstyleFor(d)}</span>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{d.cardCount} kortų</span>
              <span style={{ fontSize: 12, marginTop: 4, fontWeight: 700, color: 'var(--gold)' }}>Pasirinkti (nemokamai) →</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
