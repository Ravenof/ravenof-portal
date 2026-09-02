'use client'

// ══════════════════════════════════════════════════════════════════════════════
// DEV: Motion-comic cutscene peržiūra — scenų selektorius (demo + realios
// kampanijos scenos su placeholder asset'ais). Viešas dev route be guard'ų.
// „Kopijuoti JSON" — įklijuoti į admin cutscene „Motion-comic" sekciją.
// ══════════════════════════════════════════════════════════════════════════════

import { useState } from 'react'
import { MotionComicPlayer } from '@/components/digital/campaign/MotionComicPlayer'
import { demoChapelCutscene } from '@/data/cutscenes/demoChapelCutscene'
import { raudonasisSignalasCutscene, raudonasisSignalasPost } from '@/data/cutscenes/raudonasisSignalas'
import {
  m02pre, m02post, m03pre, m03post, m04pre, m04post, m05pre, m05post,
  m06pre, m06post, m07pre, m07post, m08pre, m08post, m09pre, m09post,
  m10pre, m10post,
} from '@/data/cutscenes/varngradoPlysys'
import { validateMotionComic, type MotionComicDef } from '@/lib/campaign/motionComic'
import { isReducedMotionEnabled, setReducedMotionEnabled } from '@/lib/settings'

const GOLD = '240,180,41'

const SCENES: { key: string; title: string; sub: string; def: MotionComicDef }[] = [
  { key: 'raudonasis', title: 'M1 PRE — Naktis, kuri turėjo būti rami', sub: 'V3: Raudonasis signalas, 18 beat’ų, ~3 min', def: raudonasisSignalasCutscene },
  { key: 'm01post', title: 'M1 POST — Žinia dar neprarasta', sub: 'V3: Raudonasis signalas, 10 beat’ų, ~2 min', def: raudonasisSignalasPost },
  { key: 'm02pre', title: 'M2 PRE — Balsas kelyje', sub: 'V3: Paskutinis pranešėjas, 14 beat’ų, ~2:20', def: m02pre },
  { key: 'm02post', title: 'M2 POST — Kam atidaryti vartus', sub: 'V3: Paskutinis pranešėjas, 13 beat’ų, ~2:10', def: m02post },
  { key: 'm03pre', title: 'M3 PRE — Iki trečio varpo', sub: 'V3: Vartai prieš aušrą, 16 beat’ų, ~2:35', def: m03pre },
  { key: 'm03post', title: 'M3 POST — Tie, kuriuos įleidome', sub: 'V3: Vartai prieš aušrą, 11 beat’ų, ~1:50', def: m03post },
  { key: 'm04pre', title: 'M4 PRE — Ką miestas saugo', sub: 'V3: Trys varpai, 16 beat’ų, ~2:35', def: m04pre },
  { key: 'm04post', title: 'M4 POST — Po gatvėmis', sub: 'V3: Trys varpai, 10 beat’ų, ~1:45', def: m04post },
  { key: 'm05pre', title: 'M5 PRE — Vardas, kuris atsako', sub: 'V3: Juodoji akis, 17 beat’ų, ~2:50', def: m05pre },
  { key: 'm05post', title: 'M5 POST — Du atsakymai', sub: 'V3: Juodoji akis, 11 beat’ų, ~1:55', def: m05post },
  { key: 'm06pre', title: 'M6 PRE — Pirmi prie sienos', sub: 'V3: Mėlyno mithrilo aušra, 17 beat’ų, ~2:50', def: m06pre },
  { key: 'm06post', title: 'M6 POST — Kas atėjo padėti', sub: 'V3: Mėlyno mithrilo aušra, 13 beat’ų, ~2:10', def: m06post },
  { key: 'm07pre', title: 'M7 PRE — Sprendimas, parašytas iš anksto', sub: 'V3: Balto vaško įsakymas, 21 beat’as, ~3:30', def: m07pre },
  { key: 'm07post', title: 'M7 POST — Balta riba', sub: 'V3: Balto vaško įsakymas, 13 beat’ų, ~2:10', def: m07post },
  { key: 'm08pre', title: 'M8 PRE — Žmonės prie baltos linijos', sub: 'V3: Užvertas pietų kelias, 19 beat’ų, ~3:10', def: m08pre },
  { key: 'm08post', title: 'M8 POST — Miestas, kurio nebėra', sub: 'V3: Užvertas pietų kelias, 14 beat’ų, ~2:15', def: m08post },
  { key: 'm09pre', title: 'M9 PRE — Ko neatiduoda badaujantis miestas', sub: 'V3: Būtinoji kaina, 20 beat’ų, ~3:20', def: m09pre },
  { key: 'm09post', title: 'M9 POST — Paskutinis tiltas', sub: 'V3: Būtinoji kaina, 15 beat’ų, ~2:20', def: m09post },
  { key: 'm10pre', title: 'M10 PRE — Dešimt dūžių', sub: 'V3: Paskutinis varpas, 26 beat’ai, ~4:30', def: m10pre },
  { key: 'm10post', title: 'M10 POST — Po mirties', sub: 'V3: Paskutinis varpas, epilogas, 19 beat’ų, ~3:00', def: m10post },
  { key: 'demo', title: 'Demo — Varngrado koplyčia', sub: '5 kadrai, sistemos demonstracija', def: demoChapelCutscene },
]

export default function DevCutscenePage() {
  const [playing, setPlaying] = useState<MotionComicDef | null>(null)
  const [doneCount, setDoneCount] = useState(0)
  const [lastDoneAt, setLastDoneAt] = useState<string | null>(null)
  const [reduced, setReduced] = useState(() => typeof window !== 'undefined' && isReducedMotionEnabled())
  const [copied, setCopied] = useState<string | null>(null)

  const copyJson = async (key: string, def: MotionComicDef) => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(def, null, 2))
      setCopied(key); setTimeout(() => setCopied((c) => c === key ? null : c), 1800)
    } catch { /* */ }
  }

  return (
    <div className="min-h-screen p-6" style={{ background: '#0a0812', color: '#e8dfc8' }}>
      <h1 className="text-xl font-bold mb-1" style={{ color: `rgb(${GOLD})`, fontFamily: 'var(--rvn-font-display)' }}>
        DEV — Motion-comic cutscenes
      </h1>
      <p className="text-sm mb-4" style={{ color: 'rgba(220,210,190,0.6)' }}>
        {'Placeholder asset’ai — galutinis artas keičiamas vien URL’ais. „Kopijuoti JSON“ → admin cutscene „Motion-comic“ sekcija.'}
      </p>

      <div className="space-y-3 max-w-xl">
        {SCENES.map((s) => {
          const errors = validateMotionComic(s.def)
          return (
            <div key={s.key} className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid rgba(${GOLD},0.25)` }}>
              <p className="font-bold text-sm" style={{ color: '#f3ead3' }}>{s.title}</p>
              <p className="text-xs mb-3" style={{ color: 'rgba(220,210,190,0.55)' }}>{s.sub} · {s.def.shots.length} shots</p>
              <div className="flex flex-wrap gap-2">
                <button data-testid={`play-${s.key}`} onClick={() => setPlaying(s.def)}
                  className="px-5 py-2.5 rounded-xl font-bold text-sm"
                  style={{ minHeight: 44, background: `rgba(${GOLD},0.14)`, border: `1px solid rgba(${GOLD},0.5)`, color: '#f3ead3' }}>
                  ▶ Paleisti
                </button>
                <button onClick={() => void copyJson(s.key, s.def)}
                  className="px-4 py-2.5 rounded-xl text-sm"
                  style={{ minHeight: 44, background: copied === s.key ? 'rgba(74,222,128,0.12)' : 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.15)', color: copied === s.key ? '#4ade80' : 'rgba(220,210,190,0.8)' }}>
                  {copied === s.key ? '✓ Nukopijuota' : 'Kopijuoti JSON'}
                </button>
              </div>
              {errors.length > 0 && (
                <div className="mt-2 text-xs" style={{ color: '#f87171' }}>
                  {errors.map((e, i) => <p key={i}>• {e}</p>)}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div className="flex flex-wrap items-center gap-4 mt-4 text-xs" style={{ color: 'rgba(220,210,190,0.55)' }}>
        <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ minHeight: 44, color: '#e8dfc8' }}>
          <input type="checkbox" checked={reduced}
            onChange={(e) => { setReduced(e.target.checked); setReducedMotionEnabled(e.target.checked) }} />
          Sumažinta animacija
        </label>
        <p data-testid="done-count">Completion callback: {doneCount}×{lastDoneAt ? ` (paskutinis ${lastDoneAt})` : ''}</p>
        <p>Valdymas: bakst / Space / Enter / → — toliau; Esc — praleisti; P — pauzė.</p>
      </div>

      {playing && (
        <MotionComicPlayer
          def={playing}
          skippable
          onDone={() => {
            setPlaying(null)
            setDoneCount((n) => n + 1)
            setLastDoneAt(new Date().toLocaleTimeString('lt-LT'))
          }}
        />
      )}
    </div>
  )
}
