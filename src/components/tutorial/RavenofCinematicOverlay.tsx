'use client'

// ── RavenofCinematicOverlay — Premium kino pop-up (summon + championSkill) ────
// Tamsus fonas + įstrižas „dark fantasy" rėmas + WebM(→MP4) video (muted/inline).
// Skip po 0.5 s, onEnded ARBA durationMs timeout → onFinished. Reduced-motion →
// statinis poster/kortos artas (~800 ms). Valomas video (be memory leak).
// Vizualas tik kosmetinis — nekeičia jokios žaidimo būsenos.

import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { ActiveCinematic } from '@/lib/game/cinematics'
import { CINEMATIC_THEME_PALETTE, prefersReducedMotion } from '@/lib/game/cinematics'
import { t as tGlobal } from '@/lib/i18n/core'

const SKIP_DELAY_MS = 500
const END_BUFFER_MS = 350           // saugiklis virš durationMs (tik static/poster keliui)
const REDUCED_DURATION_MS = 800
const START_TIMEOUT_MS = 7000       // jei video per tiek nepradeda groti → krentam į poster fallback (šaltam tinklui reikia laiko)
const SAFETY_MAX_MS = 9000          // absoliutus saugiklis (jei onEnded niekada nesuveiks)

export function RavenofCinematicOverlay({ cinematic, onFinished }: {
  cinematic: ActiveCinematic | null
  onFinished: () => void
}) {
  return (
    <AnimatePresence>
      {cinematic && (
        <CinematicFrame key={cinematic.dedupeKey + ':' + cinematic.durationMs} cinematic={cinematic} onFinished={onFinished} />
      )}
    </AnimatePresence>
  )
}

function CinematicFrame({ cinematic, onFinished }: { cinematic: ActiveCinematic; onFinished: () => void }) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const doneRef = useRef(false)
  const startedRef = useRef(false)
  const [skippable, setSkippable] = useState(false)
  const [videoFailed, setVideoFailed] = useState(false)

  const reduced = prefersReducedMotion()
  const pal = CINEMATIC_THEME_PALETTE[cinematic.frameTheme] ?? CINEMATIC_THEME_PALETTE.default
  const hasVideoSrc = !cinematic.staticOnly && !!(cinematic.webm || cinematic.mp4) && !reduced && !videoFailed
  // Static (poster) keliui — leidžiam kristi į kortos artą. Video keliui — TIK aiškiai įkeltas
  // poster (kitaip „kortos pic → video" blyksnis); be poster video rodo savo 1-ą kadrą iškart.
  const posterSrc = cinematic.poster ?? cinematic.cardImage ?? undefined
  const videoPoster = cinematic.poster ?? undefined

  // Vienkartinis užbaigimas (apsauga nuo dvigubo onFinished)
  const finish = () => {
    if (doneRef.current) return
    doneRef.current = true
    const v = videoRef.current
    if (v) { try { v.pause(); v.removeAttribute('src'); v.load() } catch { /* */ } }
    onFinished()
  }

  // Bandom paleisti grojimą (kviečiama iš canplay/loadeddata; idempotent)
  const tryPlay = () => {
    const v = videoRef.current
    if (!v || startedRef.current || doneRef.current) return
    v.muted = true
    const p = v.play()
    if (p && typeof p.catch === 'function') p.catch(() => { /* autoplay gali būti blokuotas — watchdog kris į poster */ })
  }

  // Skip leidžiamas po SKIP_DELAY_MS
  useEffect(() => {
    const t = window.setTimeout(() => setSkippable(true), SKIP_DELAY_MS)
    return () => window.clearTimeout(t)
  }, [])

  // Užbaigimo logika: VIDEO kelias leidžia pragroti iki galo (onEnded), timeout'ai tik saugikliai.
  // STATIC/reduced kelias uždaromas po fiksuoto laiko.
  useEffect(() => {
    if (!hasVideoSrc) {
      const ms = reduced ? REDUCED_DURATION_MS : Math.max(cinematic.durationMs, 1200) + END_BUFFER_MS
      const t = window.setTimeout(finish, ms)
      return () => window.clearTimeout(t)
    }
    const v = videoRef.current
    // NE v.load() – autoPlay+preload jau pradėjo krauti; load() resetintų elementą ir krautų iš naujo (prarastume preload/cache).
    if (v) { try { v.muted = true } catch { /* */ } }
    tryPlay()
    // 1) start watchdog — jei nepradeda groti laiku, fallback į poster
    const startT = window.setTimeout(() => {
      if (!startedRef.current && !doneRef.current) setVideoFailed(true)
    }, START_TIMEOUT_MS)
    // 2) absoliutus saugiklis — jei onEnded niekada nesuveiks
    const safetyT = window.setTimeout(finish, SAFETY_MAX_MS)
    return () => { window.clearTimeout(startT); window.clearTimeout(safetyT); try { v?.pause() } catch { /* */ } }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cinematic.dedupeKey, hasVideoSrc])

  const isSkill = cinematic.type === 'championSkill'

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.22 }}
      onClick={() => { if (skippable) finish() }}
      className="fixed inset-0 flex items-center justify-center"
      style={{
        zIndex: 160,
        cursor: skippable ? 'pointer' : 'default',
        // NE full screen — patamsinamas centras (~70%), pakraščiuose matosi mūšio laukas
        background: 'radial-gradient(52% 68% at 50% 50%, rgba(2,1,6,0.84), rgba(2,1,6,0.10) 100%)',
      }}
      aria-live="polite"
      role="dialog"
    >
      <motion.div
        initial={{ scale: 0.94, rotate: -2.2, opacity: 0 }}
        animate={{ scale: 1, rotate: -2.2, opacity: 1 }}
        exit={{ scale: 0.97, rotate: -2.2, opacity: 0 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className="relative"
        style={{
          // LANDSCAPE (16/9) rėmas landscape kovai: ~70% ekrano aukščio, centre (ne full
          // screen). maxWidth saugiklis — jei plotis netelpa, aspectRatio proporcingai
          // sumažina ir aukštį. Video (bet kokios orientacijos) pritaikomas per
          // object-fit: cover + cropX/cropY fokusą — failų keisti nereikia.
          height: '70vh',
          aspectRatio: '16 / 9',
          maxWidth: '92vw',
        }}
      >
        {/* Švytėjimo halo (themed) */}
        <div aria-hidden style={{
          position: 'absolute', inset: -10, borderRadius: 16, pointerEvents: 'none',
          boxShadow: `0 0 60px 8px ${pal.glow}, 0 0 120px 24px ${pal.glow2}`,
        }} />

        {/* Metalinis rėmas */}
        <div style={{
          position: 'absolute', inset: 0, borderRadius: 14, padding: 3,
          background: `linear-gradient(150deg, ${pal.border}, rgba(20,18,26,0.9) 38%, rgba(10,9,14,0.95) 62%, ${pal.border})`,
          boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.6)',
        }}>
          {/* Vidinis juodas „mat" + media */}
          <div style={{
            position: 'relative', width: '100%', height: '100%', borderRadius: 11, overflow: 'hidden',
            background: `#05040a`,
            boxShadow: `inset 0 0 70px 6px ${pal.tint}, inset 0 0 0 1px rgba(255,255,255,0.05)`,
          }}>
            {hasVideoSrc ? (
              <video
                ref={videoRef}
                muted
                playsInline
                autoPlay
                preload="auto"
                poster={videoPoster}
                onLoadedData={tryPlay}
                onCanPlay={tryPlay}
                onPlaying={() => { startedRef.current = true }}
                onEnded={finish}
                onError={() => setVideoFailed(true)}
                style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: `${cinematic.cropX}% ${cinematic.cropY}%`, display: 'block' }}
              >
                {cinematic.webm && <source src={cinematic.webm} type="video/webm" />}
                {cinematic.mp4 && <source src={cinematic.mp4} type="video/mp4" />}
              </video>
            ) : posterSrc ? (
              // Static fallback — poster / kortos artas su lengvu zoom+glow
              <motion.div
                initial={{ scale: reduced ? 1 : 1.12 }}
                animate={{ scale: 1 }}
                transition={{ duration: reduced ? 0 : Math.min(2.2, cinematic.durationMs / 1000) }}
                style={{
                  width: '100%', height: '100%',
                  backgroundImage: `url(${posterSrc})`, backgroundSize: 'cover', backgroundPosition: `${cinematic.cropX}% ${cinematic.cropY}%`,
                }}
              />
            ) : (
              // Ultimate fallback — temos švytėjimas (nei video, nei poster)
              <div style={{
                width: '100%', height: '100%',
                background: `radial-gradient(70% 70% at 50% 45%, ${pal.glow}, #05040a 72%)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 64, opacity: 0.85,
              }}>{isSkill ? '⚜' : '🜏'}</div>
            )}

            {/* Vinjetė virš media (skaitomumui) */}
            <div aria-hidden style={{
              position: 'absolute', inset: 0, pointerEvents: 'none',
              background: 'radial-gradient(120% 100% at 50% 40%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.55) 100%)',
            }} />

            {/* Gotikiniai kampų ornamentai */}
            {(['tl', 'tr', 'bl', 'br'] as const).map((c) => (
              <span key={c} aria-hidden style={{
                position: 'absolute', width: 18, height: 18, opacity: 0.9,
                ...(c[0] === 't' ? { top: 6 } : { bottom: 6 }),
                ...(c[1] === 'l' ? { left: 6 } : { right: 6 }),
                borderTop: c[0] === 't' ? `2px solid ${pal.border}` : undefined,
                borderBottom: c[0] === 'b' ? `2px solid ${pal.border}` : undefined,
                borderLeft: c[1] === 'l' ? `2px solid ${pal.border}` : undefined,
                borderRight: c[1] === 'r' ? `2px solid ${pal.border}` : undefined,
              }} />
            ))}
          </div>
        </div>

        {/* Pavadinimo overlay (NE įdegintas į video; rodomas rėmo apačioje) */}
        <div style={{
          position: 'absolute', left: 10, right: 10, bottom: 14,
          textAlign: 'center', pointerEvents: 'none',
        }}>
          {isSkill && (
            <p style={{ fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: pal.border, opacity: 0.85, margin: 0 }}>
              {cinematic.cardName}
            </p>
          )}
          <p style={{
            fontFamily: 'var(--rvn-font-display)', fontSize: 'clamp(18px, 4.4vw, 30px)', fontWeight: 800,
            color: '#fff', margin: '2px 0 0', textShadow: `0 0 18px ${pal.glow}, 0 2px 6px rgba(0,0,0,0.8)`,
            letterSpacing: '0.04em',
          }}>{cinematic.title}</p>
        </div>

        {/* Skip užuomina */}
        <AnimatePresence>
          {skippable && (
            <motion.span
              initial={{ opacity: 0 }} animate={{ opacity: 0.7 }} exit={{ opacity: 0 }}
              style={{
                position: 'absolute', top: -26, right: 2, fontSize: 11, letterSpacing: '0.1em',
                color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', pointerEvents: 'none',
              }}>{tGlobal('battle.game.tapToSkip')}</motion.span>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  )
}
