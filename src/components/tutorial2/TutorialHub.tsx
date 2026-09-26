'use client'

// ════════════════════════════════════════════════════════════════════════════
// TutorialHub V3 — „Korvo kursas": 8 data-driven pamokos + graduation kova.
//
//   • PAGRINDAI (L1–L3) — privaloma, atrakinama iš eilės.
//   • EGZAMINAS — tikra kova SAVO starter kalade prieš tikrą kitą starter
//     kaladę (kaip iki šiol; čia jis tapo kurso pabaiga, o ne vienintele kova).
//   • GILESNĖS (L4–L8) — atsirakina baigus pagrindus, žymimos „rekomenduojama".
//
// Pamokos gyvena DB (tutorial_lessons; sėjamos iš admin), jas paleidžia
// TutorialDirector. Jei kaladė dar nepasiimta — rodomas starter pasirinkimas.
// ════════════════════════════════════════════════════════════════════════════

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { playUiClick } from '@/lib/ui-sound'
import { TutorialGame } from '@/components/tutorial/TutorialGame'
import { getStarterDecks, claimStarterDeck, type StarterDeck } from '@/lib/starterDecks'
import { playstyleFor } from '@/components/digital/StarterOnboarding'
import { SmartImg } from '@/components/ui/SmartImg'
import { RavenofBannerButton } from '@/components/digital/ui/RavenofKit'
import { useT } from '@/lib/i18n/react'
import { useDesktopUi } from '@/components/digital/ui/useDesktopUi'
import { loadTutorialState, isLessonUnlocked, type TutorialState } from '@/lib/tutorial2/lessonLoader'
import type { LessonRow } from '@/lib/tutorial2/lessonTypes'
import { CORE_LESSON_KEYS } from '@/data/tutorialLessons/lessonSeeds'
import { TutorialDirector } from './TutorialDirector'

type Match = { deckId: string; deckName: string; enemyStarterId: string | null; enemyFaction: number | null; enemyName: string }

const isCore = (l: LessonRow) => CORE_LESSON_KEYS.includes(l.seed_key ?? '')

export function TutorialHub() {
  const t = useT()
  const router = useRouter()
  const [starters, setStarters] = useState<StarterDeck[] | null>(null)
  const [state, setState] = useState<TutorialState | null>(null)
  const [lesson, setLesson] = useState<LessonRow | null>(null)
  const [match, setMatch] = useState<Match | null>(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const autoLaunched = useRef(false)
  // Desktop: turinys iki 1300 px, du stulpeliai (pagrindai + egzaminas | gilesnės), didesni tekstai/zonos
  const { desktop } = useDesktopUi()

  const load = useCallback(async () => {
    const [s, ts] = await Promise.all([getStarterDecks(), loadTutorialState()])
    setStarters(s); setState(ts)
  }, [])
  useEffect(() => { void load() }, [load])

  const launch = (deckId: string, deckName: string, chosen: StarterDeck) => {
    const pool = (starters ?? []).filter((x) => x.id !== chosen.id)
    const foe = pool.length ? pool[Math.floor(Math.random() * pool.length)] : null
    setMatch({ deckId, deckName, enemyStarterId: foe?.id ?? null, enemyFaction: foe?.factionId ?? null, enemyName: foe ? (foe.faction ?? foe.name) : t('battle.pve.enemy') })
  }

  const claimedDeck = (starters ?? []).find((d) => d.claimed && d.deckId) ?? null
  const lessons = state?.lessons ?? []
  const progress = state?.progress ?? {}
  const core = lessons.filter(isCore)
  const extra = lessons.filter((l) => !isCore(l))
  const coreDone = core.length > 0 && core.every((l) => progress[l.id]?.completed)
  // Apsauga: jei DB dar neturi V3 pamoku (seed_key ne tut-v3-*), core butu tuscias
  // ir VISOS pamokos liktu uzrakintos (coreDone=false) - net pirmoji. Tada gilesniu
  // sarasas atrakinamas nuosekliai, kaip pagrindai.
  const extraSequential = core.length === 0
  const allDone = lessons.length > 0 && lessons.every((l) => progress[l.id]?.completed)

  // Auto-start atėjus iš onboarding (?auto=1): pirma NEĮVEIKTA pamoka.
  useEffect(() => {
    if (autoLaunched.current || !state) return
    try {
      if (new URLSearchParams(window.location.search).get('auto') !== '1') return
      const next = core.find((l) => !progress[l.id]?.completed) ?? null
      if (!next) return
      autoLaunched.current = true
      setLesson(next)
    } catch { /* SSR/urlparse */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state])

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

  if (lesson) {
    return <TutorialDirector lesson={lesson} onExit={() => { setLesson(null); void load() }} />
  }

  if (match) {
    return (
      <TutorialGame
        deckId={match.deckId}
        deckName={match.deckName}
        opponentStarterId={match.enemyStarterId}
        opponentFaction={match.enemyFaction}
        opponentName={match.enemyName}
        onClose={() => { setMatch(null); void load() }}
      />
    )
  }

  const decks = starters ?? []

  const lessonRow = (l: LessonRow, unlocked: boolean) => {
    const done = !!progress[l.id]?.completed
    return (
      <button key={l.id} disabled={!unlocked} onClick={() => { if (!unlocked) return; playUiClick(); setLesson(l) }}
        className="ravenof-press text-left flex items-center disabled:opacity-45"
        style={{ gap: desktop ? 18 : 12, padding: desktop ? '18px 20px' : '12px 14px', minHeight: desktop ? 88 : undefined, width: '100%', cursor: unlocked ? 'pointer' : 'default',
          background: 'var(--ravenof-bg-surface)', border: '1px solid ' + (done ? 'var(--ravenof-gold)' : 'var(--ravenof-border-strong)') }}>
        <span aria-hidden style={{ fontSize: desktop ? 32 : 22, width: desktop ? 44 : 30, textAlign: 'center', filter: unlocked ? undefined : 'grayscale(1)' }}>{l.icon ?? '📜'}</span>
        <span className="flex-1 min-w-0 flex flex-col" style={{ gap: desktop ? 4 : 2 }}>
          <span style={{ font: `700 ${desktop ? 17 : 13.5}px var(--ravenof-font-display)`, color: 'var(--ravenof-text-primary)', lineHeight: desktop ? 1.25 : undefined }}>{l.title}</span>
          <span style={{ font: `400 ${desktop ? 14.5 : 11}px var(--ravenof-font-body)`, color: 'var(--ravenof-text-secondary)', lineHeight: 1.35 }}>{l.subtitle ?? l.description}</span>
        </span>
        <span className="shrink-0 flex flex-col items-end" style={{ gap: desktop ? 5 : 3 }}>
          <span style={{ font: `400 ${desktop ? 13 : 10}px var(--ravenof-font-body)`, color: 'var(--ravenof-text-secondary)' }}>{t('onboarding.tutorial.minutesShort', { n: l.est_minutes ?? 5 })}</span>
          <span style={{ font: `700 ${desktop ? 13.5 : 10.5}px var(--ravenof-font-display)`, letterSpacing: 1, textTransform: 'uppercase', color: done ? 'var(--ravenof-gold)' : unlocked ? 'var(--ravenof-text-primary)' : 'var(--ravenof-text-secondary)' }}>
            {done ? '✓ ' + t('onboarding.tutorial.lessonReplay') : unlocked ? t('onboarding.tutorial.lessonStart') : '🔒 ' + t('onboarding.tutorial.lessonLocked')}
          </span>
        </span>
      </button>
    )
  }

  return (
    <div className="ravenof-body ravenof-in h-full flex flex-col min-h-0" style={{ padding: desktop ? '12px 0 20px' : '4px 2px 12px', ...(desktop ? { maxWidth: 1300, margin: '0 auto', width: '100%' } : {}) }}>
      {/* Antraštė: atgal + pavadinimas */}
      <div className="flex items-center shrink-0" style={{ gap: desktop ? 14 : 10, paddingBottom: desktop ? 22 : 10 }}>
        <button onClick={() => { playUiClick(); router.push('/digital') }} aria-label={t('common.back')} className="ravenof-iconbtn" style={{ fontSize: desktop ? 22 : 16, ...(desktop ? { width: 42, height: 42 } : {}) }}>‹</button>
        <div>
          <div style={{ font: `700 ${desktop ? 26 : 15}px var(--ravenof-font-display)`, letterSpacing: desktop ? 2 : 1, textTransform: 'uppercase', color: 'var(--ravenof-text-primary)' }}>{t('onboarding.tutorial.title')}</div>
          <div style={{ font: `400 ${desktop ? 15 : 11}px var(--ravenof-font-body)`, color: 'var(--ravenof-text-secondary)', marginTop: desktop ? 4 : undefined }}>{t('onboarding.tutorial.courseTitle')}</div>
        </div>
      </div>
      {msg && <p role="alert" className="shrink-0" style={{ font: `500 ${desktop ? 14 : 11.5}px var(--ravenof-font-body)`, color: '#c65563', margin: desktop ? '0 0 12px' : '0 0 8px' }}>{msg}</p>}

      <div className="flex-1 min-h-0 overflow-y-auto ravenof-scroll">
        {(!starters || !state) && <div className="flex items-center justify-center py-12"><span className="ravenof-spinner" style={{ width: 40, height: 40 }} /></div>}

        {state && (
          <div style={desktop ? { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32, alignItems: 'start' } : { maxWidth: 720, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 18 }}>
            {lessons.length === 0 && (
              <p className="text-center py-6" style={{ font: `400 ${desktop ? 15 : 12.5}px var(--ravenof-font-body)`, color: 'var(--ravenof-text-secondary)' }}>{t('onboarding.tutorial.noLessons')}</p>
            )}

            <div className={desktop ? 'flex flex-col' : 'contents'} style={desktop ? { gap: 24 } : undefined}>
            {/* ── PAGRINDAI ── */}
            {core.length > 0 && (
              <section style={{ display: 'flex', flexDirection: 'column', gap: desktop ? 12 : 8 }}>
                <div>
                  <p style={{ font: `700 ${desktop ? 14 : 11}px var(--ravenof-font-display)`, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--ravenof-gold)', margin: 0 }}>{t('onboarding.tutorial.coreGroup')}</p>
                  <p style={{ font: `400 ${desktop ? 14 : 11}px var(--ravenof-font-body)`, color: 'var(--ravenof-text-secondary)', margin: '2px 0 0' }}>{t('onboarding.tutorial.coreGroupSub')}</p>
                </div>
                {core.map((l, i) => lessonRow(l, isLessonUnlocked(core, progress, i)))}
              </section>
            )}

            {/* ── EGZAMINAS (graduation) ── */}
            {coreDone && claimedDeck && (
              <section className="flex items-stretch" style={{ background: 'var(--ravenof-bg-surface)', border: '1px solid var(--ravenof-gold)' }}>
                <span className="relative shrink-0 overflow-hidden" style={{ width: desktop ? 190 : 150 }}>
                  {claimedDeck.imageUrl
                    ? <SmartImg src={claimedDeck.imageUrl} width={360} className="absolute inset-0 w-full h-full object-cover" style={{ objectPosition: '50% 25%' }} />
                    : <span className="absolute inset-0 flex items-center justify-center text-4xl" style={{ background: 'var(--ravenof-bg-elevated)' }}>🎴</span>}
                  <span aria-hidden className="absolute inset-y-0 right-0" style={{ width: 30, background: 'linear-gradient(90deg, transparent, var(--ravenof-bg-surface))' }} />
                </span>
                <div className="flex-1 min-w-0 flex flex-col" style={{ padding: desktop ? '20px 22px' : '14px 16px' }}>
                  <p style={{ font: `500 ${desktop ? 12 : 9}px var(--ravenof-font-body)`, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--ravenof-gold)', margin: 0 }}>{t('onboarding.tutorial.graduationTitle')}</p>
                  <p style={{ font: `700 ${desktop ? 22 : 17}px var(--ravenof-font-display)`, color: 'var(--ravenof-text-primary)', margin: '3px 0 0' }}>{claimedDeck.faction ?? claimedDeck.name}</p>
                  <p style={{ font: `400 ${desktop ? 15 : 12}px var(--ravenof-font-body)`, color: 'var(--ravenof-text-secondary)', lineHeight: 1.45, margin: '6px 0 12px' }}>{t('onboarding.tutorial.graduationSub')} {playstyleFor(claimedDeck)}</p>
                  <RavenofBannerButton disabled={busy} onClick={() => { playUiClick(); launch(claimedDeck.deckId!, claimedDeck.name, claimedDeck) }} style={{ width: '100%', marginTop: 'auto', ...(desktop ? { minHeight: 52, fontSize: 16, letterSpacing: 3 } : {}) }}>
                    {t('onboarding.tutorial.startShort')}
                  </RavenofBannerButton>
                </div>
              </section>
            )}
            </div>

            <div className={desktop ? 'flex flex-col' : 'contents'} style={desktop ? { gap: 24 } : undefined}>
            {/* ── GILESNĖS PAMOKOS ── */}
            {extra.length > 0 && (
              <section style={{ display: 'flex', flexDirection: 'column', gap: desktop ? 12 : 8 }}>
                <div>
                  <p style={{ font: `700 ${desktop ? 14 : 11}px var(--ravenof-font-display)`, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--ravenof-gold)', margin: 0 }}>
                    {t('onboarding.tutorial.extraGroup')}
                  </p>
                  <p style={{ font: `400 ${desktop ? 14 : 11}px var(--ravenof-font-body)`, color: 'var(--ravenof-text-secondary)', margin: '2px 0 0' }}>{t('onboarding.tutorial.extraGroupSub')}</p>
                </div>
                {extra.map((l, i) => lessonRow(l, extraSequential ? isLessonUnlocked(extra, progress, i) : coreDone))}
              </section>
            )}

            {allDone && (
              <p className="text-center" style={{ font: `700 ${desktop ? 15 : 12}px var(--ravenof-font-display)`, color: 'var(--ravenof-gold)', margin: 0 }}>🏆 {t('onboarding.tutorial.allLessonsDone')}</p>
            )}

            {/* ── Kaladė dar nepasiimta → starter pasirinkimas ── */}
            {!claimedDeck && decks.length > 0 && (
              <section style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <p style={{ font: `400 ${desktop ? 15 : 11.5}px var(--ravenof-font-body)`, color: 'var(--ravenof-text-secondary)', margin: 0 }}>{t('onboarding.tutorial.subNoDeck')}</p>
                <div className="grid" style={{ gap: desktop ? 12 : 10, gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))' }}>
                  {decks.map((d) => (
                    <button key={d.id} disabled={busy} onClick={() => choose(d)}
                      className="ravenof-press text-left flex flex-col disabled:opacity-50"
                      style={{ gap: desktop ? 6 : 4, padding: desktop ? '16px 18px' : '13px 15px', cursor: 'pointer', background: 'var(--ravenof-bg-surface)', border: '1px solid var(--ravenof-border-strong)' }}>
                      <span style={{ font: `700 ${desktop ? 18 : 14}px var(--ravenof-font-display)`, color: 'var(--ravenof-text-primary)' }}>{d.faction ?? d.name}</span>
                      <span style={{ font: `400 ${desktop ? 14 : 11}px var(--ravenof-font-body)`, color: 'var(--ravenof-text-secondary)', lineHeight: 1.4 }}>{playstyleFor(d)}</span>
                      <span style={{ font: `400 ${desktop ? 13 : 10.5}px var(--ravenof-font-body)`, color: 'var(--ravenof-text-secondary)' }}>{t('decks.cardsShort', { count: d.cardCount })}</span>
                      <span style={{ font: `700 ${desktop ? 13 : 11}px var(--ravenof-font-display)`, letterSpacing: 1, textTransform: 'uppercase', color: 'var(--ravenof-gold)', marginTop: 4 }}>{t('onboarding.tutorial.pickFree')} ›</span>
                    </button>
                  ))}
                </div>
              </section>
            )}
            {starters && decks.length === 0 && (
              <p className="text-center py-4" style={{ font: `400 ${desktop ? 15 : 12.5}px var(--ravenof-font-body)`, color: 'var(--ravenof-text-secondary)' }}>{t('onboarding.tutorial.noStarters')}</p>
            )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
