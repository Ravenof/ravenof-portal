'use client'

// ════════════════════════════════════════════════════════════════════════════
// TutorialHub — lesson-select screen: 5 levels with lock/progress/replay, reward
// preview and completion badges. Launches TutorialDirector for a chosen lesson.
// Admins get a "seed/rebuild" button to load lessons from code.
// ════════════════════════════════════════════════════════════════════════════

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { playUiClick } from '@/lib/ui-sound'
import { loadTutorialState, isLessonUnlocked, type TutorialState } from '@/lib/tutorial2/lessonLoader'
import type { LessonRow } from '@/lib/tutorial2/lessonTypes'
import { TutorialDirector } from './TutorialDirector'
import { TutorialGame } from '@/components/tutorial/TutorialGame'
import { getStarterDecks, claimStarterDeck, type StarterDeck } from '@/lib/starterDecks'
import { rebuildTutorial } from '@/lib/tutorial2/seedRebuild'
import { tutorialLessonSeeds } from '@/data/tutorialLessons/lessonSeeds'

export function TutorialHub() {
  const [state, setState] = useState<TutorialState | null>(null)
  const [active, setActive] = useState<LessonRow | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [busy, setBusy] = useState(false)
  const [grad, setGrad] = useState<{ deckId: string; enemyFaction: number | null; enemyName: string } | null>(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [starters, setStarters] = useState<StarterDeck[] | null>(null)
  const [claiming, setClaiming] = useState(false)
  const [pickMsg, setPickMsg] = useState('')

  const reload = async () => setState(await loadTutorialState())

  useEffect(() => {
    reload()
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      const uid = data.user?.id; if (!uid) return
      supabase.from('profiles').select('role').eq('id', uid).maybeSingle().then(({ data: p }) => {
        if ((p as { role?: string } | null)?.role === 'admin') setIsAdmin(true)
      })
    })
  }, [])

  const openPicker = async () => { setPickerOpen(true); setPickMsg(''); setStarters(await getStarterDecks()) }

  const chooseStarter = async (d: StarterDeck) => {
    if (d.claimed) { setPickMsg('Šią kaladę jau turi – žaisk įprastas kovas.'); return }
    setClaiming(true); setPickMsg('')
    const res = await claimStarterDeck(d.id)
    setClaiming(false)
    if ('error' in res) { setPickMsg(res.error === 'not enough gold' ? 'Trūksta aukso šiai kaladei.' : 'Nepavyko: ' + res.error); return }
    const pool = (starters ?? []).filter((x) => x.id !== d.id)
    const foe = pool.length ? pool[Math.floor(Math.random() * pool.length)] : null
    setPickerOpen(false)
    setGrad({ deckId: res.deckId, enemyFaction: foe?.factionId ?? null, enemyName: foe?.name ?? 'Priešininkas' })
  }

  const seed = async () => { setBusy(true); await rebuildTutorial(tutorialLessonSeeds, 'merge'); await reload(); setBusy(false) }

  if (grad) {
    return <TutorialGame practice deckId={grad.deckId} deckName="Tavo starter kaladė" opponentFaction={grad.enemyFaction} opponentName={grad.enemyName} onClose={() => { setGrad(null); reload() }} />
  }
  if (active) {
    return <TutorialDirector lesson={active} onExit={() => { setActive(null); reload() }} />
  }

  const lessons = state?.lessons ?? []
  const progress = state?.progress ?? {}
  const doneCount = lessons.filter((l) => progress[l.id]?.completed).length

  return (
    <div style={{ minHeight: '100%', padding: '16px 14px 90px', maxWidth: 760, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 14 }}>
        <Link href="/digital" onClick={() => playUiClick()} style={{ fontSize: 12, color: 'var(--text-secondary)', background: 'rgba(10,8,16,0.8)', border: '1px solid rgba(255,255,255,0.12)', padding: '5px 11px', borderRadius: 10 }}>← Atgal</Link>
        <h1 style={{ fontFamily: 'var(--rvn-font-display, Cinzel, serif)', color: 'var(--gold)', fontSize: 20, margin: 0 }}>Mokymai</h1>
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{doneCount}/{lessons.length}</span>
      </div>

      <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 16, lineHeight: 1.5 }}>
        Penkios pamokos nuo pagrindų iki Ravenof gelmių. Kiekviena trunka 3–6 min ir įveda po vieną mechaniką.
      </p>

      {lessons.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
          <p>Pamokos dar neįkeltos.</p>
          {isAdmin && <button onClick={seed} disabled={busy} style={btn}>{busy ? 'Įkeliama…' : 'Įkelti pamokas (admin)'}</button>}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {lessons.map((l, i) => {
          const pr = progress[l.id]
          const unlocked = isLessonUnlocked(lessons, progress, i)
          const completed = !!pr?.completed
          return (
            <button key={l.id} disabled={!unlocked}
              onClick={() => { if (unlocked) { playUiClick(); setActive(l) } }}
              style={{
                textAlign: 'left', display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', borderRadius: 16,
                cursor: unlocked ? 'pointer' : 'not-allowed', opacity: unlocked ? 1 : 0.5,
                background: completed ? 'linear-gradient(110deg, rgba(52,211,153,0.12), rgba(10,8,16,0.9))' : 'linear-gradient(110deg, rgba(240,180,41,0.12), rgba(10,8,16,0.9))',
                border: `1px solid ${completed ? 'rgba(52,211,153,0.45)' : 'rgba(240,180,41,0.4)'}`,
              }}>
              <span style={{ fontSize: 30, width: 46, textAlign: 'center' }}>{unlocked ? (l.icon ?? '⚔') : '🔒'}</span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'block', fontWeight: 800, color: '#f3ead3', fontFamily: 'var(--rvn-font-display, Cinzel, serif)' }}>{l.title}</span>
                <span style={{ display: 'block', fontSize: 12, color: 'var(--text-muted)' }}>{l.subtitle}</span>
              </span>
              <span style={{ textAlign: 'right', fontSize: 11, color: 'var(--text-muted)' }}>
                <span style={{ display: 'block' }}>~{l.est_minutes ?? 4} min</span>
                <span style={{ color: completed ? '#34d399' : 'var(--gold)', fontWeight: 700 }}>{completed ? '✓ Įveikta' : (unlocked ? 'Žaisti →' : 'Užrakinta')}</span>
              </span>
            </button>
          )
        })}
      </div>

      {/* Graduation: pasirink starter kaladę po pamokų */}
      {lessons.length > 0 && doneCount >= lessons.length && (
        <button onClick={openPicker}
          style={{ width: '100%', marginTop: 14, textAlign: 'left', display: 'flex', alignItems: 'center', gap: 14, padding: '16px', borderRadius: 16, cursor: 'pointer',
            background: 'linear-gradient(110deg, rgba(240,180,41,0.22), rgba(10,8,16,0.92))', border: '1.5px solid rgba(240,180,41,0.6)' }}>
          <span style={{ fontSize: 30, width: 46, textAlign: 'center' }}>🎓</span>
          <span style={{ flex: 1 }}>
            <span style={{ display: 'block', fontWeight: 800, color: 'var(--gold)', fontFamily: 'var(--rvn-font-display, Cinzel, serif)' }}>Pasirink starter kaladę</span>
            <span style={{ display: 'block', fontSize: 12, color: 'var(--text-muted)' }}>Gauk ją nemokamai ir sužaisk egzamino kovą</span>
          </span>
          <span style={{ color: 'var(--gold)', fontWeight: 700 }}>→</span>
        </button>
      )}

      {/* Starter deck picker */}
      {pickerOpen && (
        <div onClick={() => !claiming && setPickerOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 250, display: 'grid', placeItems: 'center', background: 'rgba(4,3,8,0.86)', backdropFilter: 'blur(3px)', padding: 14 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: 'min(560px, 96vw)', maxHeight: '88vh', overflowY: 'auto', padding: 18, borderRadius: 18, background: 'linear-gradient(160deg, rgba(20,15,28,0.98), rgba(8,6,14,0.98))', border: '1.5px solid rgba(240,180,41,0.5)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <h2 style={{ fontFamily: 'var(--rvn-font-display, Cinzel, serif)', color: 'var(--gold)', fontSize: 18, margin: 0 }}>Pasirink starter kaladę</h2>
              <button onClick={() => setPickerOpen(false)} style={{ color: 'var(--text-muted)', fontSize: 18, background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
            </div>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>Pirmoji – nemokamai. Su ja sužaisi egzamino kovą prieš atsitiktinę kaladę.</p>
            {pickMsg && <p style={{ fontSize: 12, color: '#fbbf24', marginBottom: 8 }}>{pickMsg}</p>}
            {!starters && <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Kraunama…</p>}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {(starters ?? []).map((d) => (
                <button key={d.id} disabled={claiming} onClick={() => chooseStarter(d)}
                  style={{ textAlign: 'left', padding: 12, borderRadius: 12, cursor: 'pointer',
                    background: d.claimed ? 'rgba(52,211,153,0.1)' : 'rgba(240,180,41,0.1)',
                    border: `1px solid ${d.claimed ? 'rgba(52,211,153,0.4)' : 'rgba(240,180,41,0.35)'}` }}>
                  <span style={{ display: 'block', fontWeight: 800, color: '#f3ead3', fontSize: 13 }}>{d.faction ?? d.name}</span>
                  <span style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)' }}>{d.cardCount} kortų</span>
                  <span style={{ display: 'block', fontSize: 11, marginTop: 4, color: d.claimed ? '#34d399' : 'var(--gold)', fontWeight: 700 }}>{d.claimed ? '✓ Turima' : 'Pasirinkti (nemokamai)'}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {isAdmin && lessons.length > 0 && (
        <div style={{ marginTop: 18, textAlign: 'center' }}>
          <button onClick={seed} disabled={busy} style={{ ...btn, fontSize: 11, opacity: 0.7 }}>{busy ? 'Atnaujinama…' : 'Atnaujinti pamokas iš kodo (admin)'}</button>
        </div>
      )}
    </div>
  )
}

const btn: React.CSSProperties = {
  padding: '9px 16px', borderRadius: 11, fontWeight: 700, fontSize: 13, marginTop: 10,
  background: 'rgba(240,180,41,0.16)', border: '1px solid rgba(240,180,41,0.5)', color: 'var(--gold)', cursor: 'pointer',
}
