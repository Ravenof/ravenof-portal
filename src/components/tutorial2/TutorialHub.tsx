'use client'

// ════════════════════════════════════════════════════════════════════════════
// TutorialHub — naujoko mokymai (Fazė 4: RavenofKit vizualinė kalba; raw
// reference nėra). VIENA vedama kova su TAVO pasirinkta starter kalade.
// Kaladės pasirinkimas vyksta onboarding sraute arba, jei dar nepasiimta,
// čia (fallback tinklelis). AI priešininkas žaidžia TIKRA atsitiktine kita
// starter kalade (opponentStarterId). ?auto=1 – kova paleidžiama iškart.
// ════════════════════════════════════════════════════════════════════════════

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { playUiClick } from '@/lib/ui-sound'
import { TutorialGame } from '@/components/tutorial/TutorialGame'
import { getStarterDecks, claimStarterDeck, type StarterDeck } from '@/lib/starterDecks'
import { playstyleFor } from '@/components/digital/StarterOnboarding'
import { SmartImg } from '@/components/ui/SmartImg'
import { RavenofBannerButton } from '@/components/digital/ui/RavenofKit'
import { useT } from '@/lib/i18n/react'

type Match = { deckId: string; deckName: string; enemyStarterId: string | null; enemyFaction: number | null; enemyName: string }

export function TutorialHub() {
  const t = useT()
  const router = useRouter()
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
    setMatch({ deckId, deckName, enemyStarterId: foe?.id ?? null, enemyFaction: foe?.factionId ?? null, enemyName: foe ? (foe.faction ?? foe.name) : t('battle.pve.enemy') })
  }

  const claimedDeck = (starters ?? []).find((d) => d.claimed && d.deckId) ?? null

  // Auto-start atėjus iš onboarding (?auto=1)
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
      setMsg(res.error === 'not enough gold' ? t('onboarding.tutorial.errNoGold') : res.error === 'already claimed' ? t('onboarding.tutorial.errClaimed') : t('onboarding.tutorial.errGeneric', { error: res.error }))
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
    <div className="ravenof-body ravenof-in h-full flex flex-col min-h-0" style={{ padding: '4px 2px 12px' }}>
      {/* Antraštė: atgal + pavadinimas */}
      <div className="flex items-center shrink-0" style={{ gap: 10, paddingBottom: 10 }}>
        <button onClick={() => { playUiClick(); router.push('/digital') }} aria-label={t('common.back')} className="ravenof-iconbtn" style={{ fontSize: 16 }}>‹</button>
        <div>
          <div style={{ font: '700 15px var(--ravenof-font-display)', letterSpacing: 1, textTransform: 'uppercase', color: 'var(--ravenof-text-primary)' }}>{t('onboarding.tutorial.title')}</div>
          <div style={{ font: '400 11px var(--ravenof-font-body)', color: 'var(--ravenof-text-secondary)' }}>
            {claimedDeck ? t('onboarding.tutorial.subWithDeck') : t('onboarding.tutorial.subNoDeck')}
          </div>
        </div>
      </div>
      {msg && <p role="alert" className="shrink-0" style={{ font: '500 11.5px var(--ravenof-font-body)', color: '#c65563', margin: '0 0 8px' }}>{msg}</p>}

      <div className="flex-1 min-h-0 overflow-y-auto ravenof-scroll">
        {!starters && <div className="flex items-center justify-center py-12"><span className="ravenof-spinner" style={{ width: 40, height: 40 }} /></div>}
        {starters && decks.length === 0 && <p className="text-center py-10" style={{ font: '400 12.5px var(--ravenof-font-body)', color: 'var(--ravenof-text-secondary)' }}>{t('onboarding.tutorial.noStarters')}</p>}

        {/* Kaladė jau pasiimta → VIENAS mokymų mūšis */}
        {claimedDeck && (
          <div className="flex items-stretch" style={{ maxWidth: 640, margin: '0 auto', background: 'var(--ravenof-bg-surface)', border: '1px solid var(--ravenof-border-strong)' }}>
            <span className="relative shrink-0 overflow-hidden" style={{ width: 150 }}>
              {claimedDeck.imageUrl
                ? <SmartImg src={claimedDeck.imageUrl} width={360} className="absolute inset-0 w-full h-full object-cover" style={{ objectPosition: '50% 25%' }} />
                : <span className="absolute inset-0 flex items-center justify-center text-4xl" style={{ background: 'var(--ravenof-bg-elevated)' }}>🎴</span>}
              <span aria-hidden className="absolute inset-y-0 right-0" style={{ width: 30, background: 'linear-gradient(90deg, transparent, var(--ravenof-bg-surface))' }} />
            </span>
            <div className="flex-1 min-w-0 flex flex-col" style={{ padding: '14px 16px' }}>
              <p style={{ font: '500 9px var(--ravenof-font-body)', letterSpacing: 2, textTransform: 'uppercase', color: 'var(--ravenof-text-secondary)', margin: 0 }}>{t('onboarding.tutorial.yourDeck')}</p>
              <p style={{ font: '700 17px var(--ravenof-font-display)', color: 'var(--ravenof-text-primary)', margin: '3px 0 0' }}>{claimedDeck.faction ?? claimedDeck.name}</p>
              <p style={{ font: '400 12px var(--ravenof-font-body)', color: 'var(--ravenof-text-secondary)', lineHeight: 1.45, margin: '6px 0 12px' }}>{playstyleFor(claimedDeck)} {t('onboarding.tutorial.foeNote')}</p>
              <RavenofBannerButton disabled={busy} onClick={() => { playUiClick(); launch(claimedDeck.deckId!, claimedDeck.name, claimedDeck) }} style={{ width: '100%', marginTop: 'auto' }}>
                {t('onboarding.tutorial.startShort')}
              </RavenofBannerButton>
            </div>
          </div>
        )}

        {/* Fallback: kaladė dar nepasiimta → pasirinkimo tinklelis */}
        {!claimedDeck && decks.length > 0 && (
          <div className="grid" style={{ gap: 10, gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', maxWidth: 820, margin: '0 auto' }}>
            {decks.map((d) => (
              <button key={d.id} disabled={busy} onClick={() => choose(d)}
                className="ravenof-press text-left flex flex-col disabled:opacity-50"
                style={{ gap: 4, padding: '13px 15px', cursor: 'pointer', background: 'var(--ravenof-bg-surface)', border: '1px solid var(--ravenof-border-strong)' }}>
                <span style={{ font: '700 14px var(--ravenof-font-display)', color: 'var(--ravenof-text-primary)' }}>{d.faction ?? d.name}</span>
                <span style={{ font: '400 11px var(--ravenof-font-body)', color: 'var(--ravenof-text-secondary)', lineHeight: 1.4 }}>{playstyleFor(d)}</span>
                <span style={{ font: '400 10.5px var(--ravenof-font-body)', color: 'var(--ravenof-text-secondary)' }}>{t('decks.cardsShort', { count: d.cardCount })}</span>
                <span style={{ font: '700 11px var(--ravenof-font-display)', letterSpacing: 1, textTransform: 'uppercase', color: 'var(--ravenof-gold)', marginTop: 4 }}>{t('onboarding.tutorial.pickFree')} ›</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
