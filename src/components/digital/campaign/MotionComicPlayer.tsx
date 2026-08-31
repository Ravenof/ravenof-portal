'use client'

// ════════════════════════════════════════════════════════════════════════════
// MotionComicPlayer — sequential motion-comic cutscene renderer.
// Each shot = one full-screen comic panel brought slightly to life: layered
// tableaux (bg / midground / character cutouts / foreground / effects), slow
// camera push & drift with per-depth parallax, active-speaker focus, angular
// dialogue plate with speaker tab, transitions (cut / fade / wipes / ink),
// crossfading music & ambience, VO, SFX, skip, pause-on-blur, reduced motion.
//
// Data-driven: renders a MotionComicDef (lib/campaign/motionComic.ts) read from
// cutscene metadata. GPU-friendly: only transform/opacity/clip-path animate.
// ════════════════════════════════════════════════════════════════════════════

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { playUiClick } from '@/lib/ui-sound'
import { getMusicVolume, getSfxVolume, isReducedMotionEnabled } from '@/lib/settings'
import { useLocale } from '@/lib/i18n/react'
import {
  mcCharacter, mcPoseUrl, mcText,
  type MCEffect, type MCShot, type MCTransitionType, type MotionComicDef,
} from '@/lib/campaign/motionComic'

const GOLD = '240,180,41'
const TYPE_MS = 22            // typewriter ms/char
const DEFAULT_TRANS_MS = 450

// ─────────────────────────────── audio helpers ──────────────────────────────
/** Looping bed (music/ambience) with crossfade between urls. */
class Bed {
  private a: HTMLAudioElement | null = null
  private fadeTimer: ReturnType<typeof setInterval> | null = null
  constructor(private baseVol: () => number) {}
  crossfadeTo(url: string | null | undefined, ms = 900) {
    if (url === undefined) return                 // undefined ⇒ keep current
    const cur = this.a
    if (cur && (cur as unknown as { __url?: string }).__url === url) return
    if (this.fadeTimer) { clearInterval(this.fadeTimer); this.fadeTimer = null }
    const target = this.baseVol()
    let next: HTMLAudioElement | null = null
    if (url) {
      next = new Audio(url)
      ;(next as unknown as { __url?: string }).__url = url
      next.loop = true; next.volume = 0
      next.play().catch(() => {})
    }
    this.a = next
    const steps = Math.max(1, Math.round(ms / 60))
    let i = 0
    this.fadeTimer = setInterval(() => {
      i++
      const k = i / steps
      if (cur) cur.volume = Math.max(0, (1 - k) * target)
      if (next) next.volume = Math.min(target, k * target)
      if (i >= steps) {
        if (this.fadeTimer) clearInterval(this.fadeTimer)
        this.fadeTimer = null
        cur?.pause()
      }
    }, 60)
  }
  pause() { this.a?.pause() }
  resume() { this.a?.play().catch(() => {}) }
  stop() {
    if (this.fadeTimer) { clearInterval(this.fadeTimer); this.fadeTimer = null }
    this.a?.pause(); this.a = null
  }
}

// ─────────────────────────────── env effects ────────────────────────────────
function EffectLayer({ fx, reduced }: { fx: MCEffect; reduced: boolean }) {
  const o = Math.min(1, Math.max(0, fx.intensity ?? 0.5))
  const anim = reduced ? 'none' : undefined
  switch (fx.kind) {
    case 'fog':
    case 'smoke': {
      const dark = fx.kind === 'smoke'
      const c = dark ? '20,16,26' : '208,200,214'
      return (
        <>
          <div aria-hidden className="absolute pointer-events-none" style={{
            inset: '-20%', opacity: 0.28 * o, animation: anim ?? 'rvnmc-fog-a 46s linear infinite',
            background: `radial-gradient(42% 30% at 30% 72%, rgba(${c},0.55), transparent 70%), radial-gradient(50% 34% at 75% 80%, rgba(${c},0.4), transparent 70%)`,
          }} />
          <div aria-hidden className="absolute pointer-events-none" style={{
            inset: '-20%', opacity: 0.2 * o, animation: anim ?? 'rvnmc-fog-b 61s linear infinite',
            background: `radial-gradient(46% 30% at 55% 85%, rgba(${c},0.5), transparent 70%)`,
          }} />
        </>
      )
    }
    case 'rain':
      return <div aria-hidden className="absolute inset-[-30%] pointer-events-none" style={{
        opacity: 0.35 * o, animation: anim ?? 'rvnmc-rain 0.5s linear infinite',
        background: 'repeating-linear-gradient(105deg, transparent 0 7px, rgba(190,205,225,0.32) 7px 8px, transparent 8px 15px)',
      }} />
    case 'snow':
    case 'ash':
    case 'embers':
    case 'dust': {
      const col = fx.kind === 'snow' ? '235,240,248' : fx.kind === 'embers' ? '255,140,50' : fx.kind === 'ash' ? '120,112,118' : '200,185,150'
      const up = fx.kind === 'embers'
      const dots: string[] = []
      const n = reduced ? 0 : 26
      for (let i = 0; i < n; i++) {
        const x = (i * 137.5) % 100
        const y = (i * 61.8) % 100
        const r = 1 + ((i * 7) % 3)
        dots.push(`${x}vw ${y}vh 0 ${r}px rgba(${col},${0.25 + ((i * 13) % 40) / 100})`)
      }
      if (reduced) return null
      return <div aria-hidden className="absolute pointer-events-none" style={{
        left: 0, top: 0, width: 1, height: 1, borderRadius: '50%',
        boxShadow: dots.join(','), opacity: 0.8 * o,
        animation: `rvnmc-drift-${up ? 'up' : 'down'} ${fx.kind === 'snow' ? 26 : up ? 18 : 34}s linear infinite`,
      }} />
    }
    case 'magic':
      return <div aria-hidden className="absolute inset-0 pointer-events-none" style={{
        opacity: 0.3 * o, animation: anim ?? 'rvnmc-magic 5s ease-in-out infinite',
        background: `radial-gradient(60% 45% at 50% 60%, ${fx.color ?? 'rgba(130,90,200,0.35)'}, transparent 75%)`,
      }} />
    default: return null
  }
}

// ─────────────────────────────── shot stage ─────────────────────────────────
function ShotStage({ def, shot, reduced, active }: {
  def: MotionComicDef; shot: MCShot; reduced: boolean; active: boolean
}) {
  // camera: mount at start framing, then transition to end framing
  const cam = shot.camera ?? {}
  const dur = Math.min(12, Math.max(1, cam.duration ?? 6))
  const [atEnd, setAtEnd] = useState(reduced)   // reduced ⇒ static end frame
  useEffect(() => {
    if (reduced) { setAtEnd(true); return }
    const id = requestAnimationFrame(() => requestAnimationFrame(() => setAtEnd(true)))
    return () => cancelAnimationFrame(id)
  }, [shot.id, reduced])

  const s0 = cam.startScale ?? 1
  const s1 = cam.endScale ?? Math.min(1.07, s0 + 0.05)
  const scale = atEnd ? s1 : s0
  const camX = (atEnd ? cam.endX ?? 0 : cam.startX ?? 0)
  const camY = (atEnd ? cam.endY ?? 0 : cam.startY ?? 0)
  const camTrans = reduced ? 'none' : `transform ${dur}s linear`

  // parallax: layer translate = camera drift × (depth-normalised) factor
  const lag = (depth: number) => reduced ? 1 : 1 + (depth - 10) * 0.02

  const shake = !reduced && cam.shake && cam.shake !== 'none'
  const punch = !reduced && cam.punchIn

  return (
    <div className="absolute inset-0 overflow-hidden" aria-hidden={!active} style={{
      background: '#05040a',
      animation: shake ? `rvnmc-shake-${cam.shake} 0.45s ease-out 1` : punch ? 'rvnmc-punch 0.5s ease-out 1' : undefined,
    }}>
      <div className="absolute inset-0" style={{
        transform: `scale(${scale}) translate(${camX}%, ${camY}%)`,
        transition: camTrans, willChange: 'transform',
      }}>
        {/* background (cover-cropped, never stretched) */}
        <img src={shot.background} alt="" draggable={false}
          className="absolute w-full h-full object-cover select-none"
          style={{ inset: 0, transform: `translate(${camX * (lag(0) - 1)}%, ${camY * (lag(0) - 1)}%)`, transition: camTrans }} />

        {/* midground */}
        {shot.midground && (
          <img src={shot.midground} alt="" draggable={false}
            className="absolute w-full h-full object-cover select-none"
            style={{ inset: 0, transform: `translate(${camX * (lag(6) - 1)}%, ${camY * (lag(6) - 1)}%)`, transition: camTrans }} />
        )}

        {/* character cutouts */}
        {(shot.characters ?? []).slice().sort((a, b) => (a.depth ?? 10) - (b.depth ?? 10)).map((p, i) => {
          const url = mcPoseUrl(def, p)
          if (!url) return null
          const isSpeaker = shot.speakerId === p.characterId
          const dimOthers = !!shot.speakerId && !isSpeaker
          const h = p.height ?? 85
          const entrance = reduced ? 'none' : (p.entrance ?? 'none')
          return (
            <div key={p.characterId + ':' + i} className="absolute select-none pointer-events-none" style={{
              left: `${p.x}%`, bottom: `${p.bottom ?? 0}%`, height: `${h}%`,
              transform: `translateX(-50%) translate(${camX * (lag(p.depth ?? 10) - 1)}%, ${camY * (lag(p.depth ?? 10) - 1)}%)`,
              transition: camTrans, zIndex: 3 + (p.depth ?? 10),
              animation: entrance !== 'none' ? `rvnmc-enter-${entrance} 0.55s ease-out 1 both` : undefined,
            }}>
              <img src={url} alt="" draggable={false} className="h-full w-auto object-contain"
                style={{
                  transform: p.flip ? 'scaleX(-1)' : undefined,
                  filter: [
                    dimOthers ? 'brightness(0.55) saturate(0.6)' : 'brightness(1)',
                    p.dim ? `brightness(${1 - p.dim})` : '',
                    'drop-shadow(0 14px 34px rgba(0,0,0,0.65))',
                  ].filter(Boolean).join(' '),
                  transition: 'filter 0.45s ease',
                }} />
            </div>
          )
        })}

        {/* foreground framing */}
        {shot.foreground && (
          <img src={shot.foreground} alt="" draggable={false}
            className="absolute w-full h-full object-cover select-none"
            style={{ inset: 0, zIndex: 40, transform: `translate(${camX * (lag(20) - 1)}%, ${camY * (lag(20) - 1)}%)`, transition: camTrans }} />
        )}
      </div>

      {/* environmental effects (screen-space, above stage) */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ zIndex: 45 }}>
        {(shot.effects ?? []).map((fx, i) => <EffectLayer key={fx.kind + i} fx={fx} reduced={reduced} />)}
      </div>

      {/* tint + vignette */}
      {shot.tint && <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 46, background: shot.tint }} />}
      {(shot.vignette ?? true) && (
        <div className="absolute inset-0 pointer-events-none" style={{
          zIndex: 47,
          background: 'radial-gradient(120% 90% at 50% 45%, transparent 55%, rgba(3,2,8,0.55) 100%)',
        }} />
      )}
    </div>
  )
}

// ─────────────────────────────── main player ────────────────────────────────
export function MotionComicPlayer({ def, skippable = true, onDone }: {
  def: MotionComicDef
  skippable?: boolean
  onDone: () => void
}) {
  const locale = useLocale()
  const reduced = useMemo(() =>
    isReducedMotionEnabled() ||
    (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches),
  [])

  const shots = def.shots
  const [idx, setIdx] = useState(0)
  const [prevIdx, setPrevIdx] = useState<number | null>(null)   // shot animating OUT
  const [transType, setTransType] = useState<MCTransitionType>('cut')
  const [inkPhase, setInkPhase] = useState<0 | 1 | 2>(0)         // ink: 1=cover in, 2=cover out
  const [typed, setTyped] = useState(0)
  const [paused, setPaused] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const doneRef = useRef(false)
  const shot = shots[idx]

  // audio
  const music = useRef<Bed | null>(null)
  const ambient = useRef<Bed | null>(null)
  const voiceRef = useRef<HTMLAudioElement | null>(null)
  if (!music.current) music.current = new Bed(() => getMusicVolume() * 0.75)
  if (!ambient.current) ambient.current = new Bed(() => getMusicVolume() * 0.5)

  const stopAllAudio = useCallback(() => {
    music.current?.stop(); ambient.current?.stop()
    voiceRef.current?.pause(); voiceRef.current = null
  }, [])

  const finish = useCallback(() => {
    if (doneRef.current) return
    doneRef.current = true
    stopAllAudio()
    onDone()
  }, [onDone, stopAllAudio])

  // beds: initial + per-shot crossfade
  useEffect(() => {
    music.current?.crossfadeTo(def.musicUrl ?? null, 700)
    ambient.current?.crossfadeTo(def.ambientUrl ?? null, 700)
    return () => stopAllAudio()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  useEffect(() => {
    if (shot?.musicUrl !== undefined && shot?.musicUrl !== null) music.current?.crossfadeTo(shot.musicUrl)
    if (shot?.ambientUrl !== undefined && shot?.ambientUrl !== null) ambient.current?.crossfadeTo(shot.ambientUrl)
  }, [idx, shot?.musicUrl, shot?.ambientUrl])

  // advance / transitions (declared before audio effects that reference advanceRef)
  const holdUntil = useRef(0)
  useEffect(() => { holdUntil.current = Date.now() + (shot?.holdMs ?? 0) }, [idx, shot?.holdMs])

  const goTo = useCallback((next: number) => {
    if (next >= shots.length) return finish()
    const t = shots[next]?.transition?.type ?? 'fade'
    const durMs = shots[next]?.transition?.duration ?? DEFAULT_TRANS_MS
    if (t === 'cut' || reduced) {
      setPrevIdx(null); setTransType('cut'); setIdx(next)
      return
    }
    if (t === 'ink') {
      setTransType('ink'); setInkPhase(1)
      setTimeout(() => { setIdx(next); setInkPhase(2); setTimeout(() => setInkPhase(0), durMs) }, durMs)
      return
    }
    setPrevIdx(idx); setTransType(t); setIdx(next)
    setTimeout(() => setPrevIdx(null), durMs + 40)
  }, [idx, shots, reduced, finish])

  // per-shot: sfx + voice + typewriter reset
  const text = mcText(shot?.text, locale)
  const useType = (def.typewriter ?? true) && !reduced

  const typedRef = useRef(0)
  const textRef = useRef('')
  const idxRef = useRef(0)
  useEffect(() => { typedRef.current = typed }, [typed])
  useEffect(() => { textRef.current = text }, [text])
  useEffect(() => { idxRef.current = idx }, [idx])

  const advance = useCallback(() => {
    if (paused || doneRef.current) return
    if (useType && typedRef.current < textRef.current.length) { setTyped(textRef.current.length); return }  // 1st tap: reveal
    if (Date.now() < holdUntil.current) return
    playUiClick()
    goTo(idxRef.current + 1)
  }, [paused, useType, goTo])
  const advanceRef = useRef(advance)
  useEffect(() => { advanceRef.current = advance }, [advance])

  useEffect(() => {
    setTyped(0)
    if (!shot) return
    if (shot.sfxUrl) { const s = new Audio(shot.sfxUrl); s.volume = getSfxVolume(); s.play().catch(() => {}) }
    voiceRef.current?.pause()
    if (shot.voiceUrl) {
      const v = new Audio(shot.voiceUrl); v.volume = 0.95; voiceRef.current = v
      if (def.autoAdvanceAfterVoice) v.onended = () => advanceRef.current()
      v.play().catch(() => {})
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx])

  // typewriter
  useEffect(() => {
    if (!useType || paused) { setTyped(text.length); return }
    if (typed >= text.length) return
    const t = setTimeout(() => setTyped((n) => Math.min(text.length, n + 1)), TYPE_MS)
    return () => clearTimeout(t)
  }, [typed, text, useType, paused])

  // preload current + next backgrounds/characters (avoid unloaded frames)
  useEffect(() => {
    const urls: string[] = []
    for (const s of [shots[idx], shots[idx + 1]]) {
      if (!s) continue
      urls.push(s.background)
      if (s.midground) urls.push(s.midground)
      if (s.foreground) urls.push(s.foreground)
      for (const p of s.characters ?? []) { const u = mcPoseUrl(def, p); if (u) urls.push(u) }
    }
    const imgs = urls.map((u) => { const im = new Image(); im.src = u; return im })
    return () => { imgs.forEach((im) => { im.src = '' }) }
  }, [idx, shots, def])

  // pause on app losing focus
  useEffect(() => {
    const onVis = () => {
      if (document.hidden) { setPaused(true); music.current?.pause(); ambient.current?.pause(); voiceRef.current?.pause() }
    }
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [])
  const resume = () => { setPaused(false); music.current?.resume(); ambient.current?.resume(); voiceRef.current?.play().catch(() => {}) }

  // keyboard
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'Enter' || e.key === 'ArrowRight') { e.preventDefault(); advanceRef.current() }
      else if (e.key === 'Escape' && skippable) finish()
      else if (e.key.toLowerCase() === 'p') setPaused((p) => { if (p) resume(); return !p })
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [skippable, finish])

  if (typeof document === 'undefined') return null
  if (!shot) { finish(); return null }

  const speaker = mcCharacter(def, shot.speakerId)
  const speakerName = shot.speakerName != null ? mcText(shot.speakerName, locale) : (speaker ? mcText(speaker.name, locale) : null)
  const narrator = !!text && !speakerName
  const shown = useType ? text.slice(0, typed) : text
  const accent = speaker?.accentColor ?? `rgb(${GOLD})`
  const prevShot = prevIdx != null ? shots[prevIdx] : null
  const transMs = shot.transition?.duration ?? DEFAULT_TRANS_MS

  const lt = locale !== 'en'
  const L = {
    skip: lt ? 'Praleisti' : 'Skip',
    next: lt ? 'Toliau' : 'Next',
    end: lt ? 'Tęsti' : 'Continue',
    paused: lt ? 'Pauzė' : 'Paused',
    resume: lt ? 'Tęsti' : 'Resume',
    history: lt ? 'Istorija' : 'History',
  }

  return createPortal(
    <div className="fixed inset-0 z-[300] select-none" role="dialog" aria-label="Cutscene"
      style={{ background: '#05040a' }} onClick={advance}>
      <style>{MC_KEYFRAMES}</style>

      {/* current shot */}
      <ShotStage def={def} shot={shot} reduced={reduced} active />

      {/* previous shot animating out (fade / wipes) */}
      {prevShot && transType !== 'cut' && transType !== 'ink' && (
        <div className="absolute inset-0 pointer-events-none" style={{
          animation: `rvnmc-out-${transType} ${transMs}ms ${transType === 'fade' ? 'ease' : 'cubic-bezier(0.6,0,0.3,1)'} 1 both`,
          zIndex: 60,
        }}>
          <ShotStage def={def} shot={prevShot} reduced active={false} />
        </div>
      )}

      {/* ink interstitial */}
      {inkPhase !== 0 && (
        <div className="absolute inset-0 pointer-events-none" style={{
          zIndex: 62, background: '#08060d',
          maskImage: 'radial-gradient(130% 130% at 20% 15%, black 60%, transparent 78%)',
          WebkitMaskImage: 'radial-gradient(130% 130% at 20% 15%, black 60%, transparent 78%)',
          animation: `rvnmc-ink-${inkPhase === 1 ? 'in' : 'out'} ${transMs}ms ease 1 both`,
        }} />
      )}

      {/* ── dialogue plate (lower ~28%) ── */}
      {(text || speakerName) && (
        <div className="absolute inset-x-0 bottom-0 pointer-events-none" style={{
          zIndex: 80, padding: '0 12px',
          paddingBottom: 'calc(10px + env(safe-area-inset-bottom, 0px))',
          paddingLeft: 'calc(12px + env(safe-area-inset-left, 0px))',
          paddingRight: 'calc(12px + env(safe-area-inset-right, 0px))',
        }}>
          <div className="mx-auto relative" style={{ maxWidth: 860 }}>
            {/* speaker tab */}
            {speakerName && (
              <div className="absolute -top-8 left-4" style={{ zIndex: 2 }}>
                <div className="px-4 py-1.5" style={{
                  background: '#0d0a14',
                  border: `1.5px solid ${accent}`,
                  clipPath: 'polygon(0 0, 100% 0, calc(100% - 12px) 100%, 0 100%)',
                  boxShadow: '0 4px 14px rgba(0,0,0,0.6)',
                }}>
                  <span className="text-sm font-bold" style={{
                    fontFamily: 'var(--rvn-font-display)', color: accent, letterSpacing: '0.06em',
                  }}>{speakerName}</span>
                </div>
              </div>
            )}
            {/* angular plate: outline layer + inner face */}
            <div style={{
              clipPath: 'polygon(0 14px, 24px 0, calc(100% - 8px) 0, 100% 10px, 100% 100%, 0 100%)',
              background: 'rgba(0,0,0,0.9)', padding: 2,
              filter: 'drop-shadow(0 -6px 30px rgba(0,0,0,0.55))',
            }}>
              <div className="px-5 py-4" style={{
                clipPath: 'polygon(0 14px, 24px 1.5px, calc(100% - 8.5px) 1.5px, calc(100% - 1.5px) 10.5px, calc(100% - 1.5px) 100%, 1.5px 100%)',
                background: 'linear-gradient(165deg, rgba(28,22,36,0.97), rgba(12,9,18,0.98)), repeating-linear-gradient(115deg, rgba(255,255,255,0.014) 0 2px, transparent 2px 5px)',
                minHeight: '12vh', maxHeight: '32vh', overflowY: 'auto',
              }}>
                <p className={narrator ? 'italic text-center' : ''} style={{
                  color: narrator ? '#cbb68a' : '#f3ead3',
                  fontSize: 'clamp(14px, 2.1vh, 17px)', lineHeight: 1.55,
                }}>
                  {shown}
                  {useType && typed < text.length && <span style={{ opacity: 0.6 }}>▌</span>}
                </p>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-[10px] tabular-nums" style={{ color: 'rgba(200,190,170,0.5)' }}>
                    {idx + 1} / {shots.length}
                  </span>
                  <span className="text-xs font-bold" style={{
                    color: `rgb(${GOLD})`, fontFamily: 'var(--rvn-font-display)',
                    animation: reduced ? undefined : 'rvnmc-blink 1.6s ease-in-out infinite',
                  }}>
                    {idx + 1 >= shots.length ? L.end : L.next} ▸
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── controls (top-right) ── */}
      <div className="absolute top-0 right-0 flex gap-2" style={{
        zIndex: 90,
        paddingTop: 'calc(10px + env(safe-area-inset-top, 0px))',
        paddingRight: 'calc(12px + env(safe-area-inset-right, 0px))',
      }} onClick={(e) => e.stopPropagation()}>
        <button aria-label={L.history} onClick={() => { playUiClick(); setShowHistory(true) }}
          className="rounded-lg text-xs font-semibold focus-visible:outline focus-visible:outline-2"
          style={{ minWidth: 44, minHeight: 44, background: 'rgba(10,8,16,0.72)', border: '1px solid rgba(255,255,255,0.16)', color: 'rgba(220,210,190,0.85)', outlineColor: `rgb(${GOLD})` }}>
          ☰
        </button>
        {skippable && (
          <button aria-label={L.skip} onClick={() => { playUiClick(); finish() }}
            className="px-4 rounded-lg text-xs font-semibold focus-visible:outline focus-visible:outline-2"
            style={{ minWidth: 44, minHeight: 44, background: 'rgba(10,8,16,0.72)', border: '1px solid rgba(255,255,255,0.16)', color: 'rgba(220,210,190,0.85)', outlineColor: `rgb(${GOLD})` }}>
            {L.skip} ⏭
          </button>
        )}
      </div>

      {/* ── pause overlay ── */}
      {paused && (
        <div className="absolute inset-0 flex items-center justify-center" style={{ zIndex: 95, background: 'rgba(3,2,8,0.75)' }}
          onClick={(e) => { e.stopPropagation(); resume() }}>
          <div className="text-center">
            <p className="text-lg font-bold mb-3" style={{ color: `rgb(${GOLD})`, fontFamily: 'var(--rvn-font-display)' }}>{L.paused}</p>
            <button className="px-6 py-3 rounded-xl text-sm font-bold" style={{ minHeight: 44, background: `rgba(${GOLD},0.14)`, border: `1px solid rgba(${GOLD},0.5)`, color: '#f3ead3' }}>
              {L.resume} ▸
            </button>
          </div>
        </div>
      )}

      {/* ── dialogue history ── */}
      {showHistory && (
        <div className="absolute inset-0 flex flex-col" style={{ zIndex: 96, background: 'rgba(3,2,8,0.88)' }}
          onClick={(e) => { e.stopPropagation(); setShowHistory(false) }}>
          <div className="mx-auto w-full max-w-lg flex-1 overflow-y-auto px-5 py-6" style={{ paddingTop: 'calc(24px + env(safe-area-inset-top,0px))' }}>
            <p className="text-sm font-bold mb-4" style={{ color: `rgb(${GOLD})`, fontFamily: 'var(--rvn-font-display)' }}>{L.history}</p>
            {shots.slice(0, idx + 1).filter((s) => mcText(s.text, locale)).map((s) => {
              const ch = mcCharacter(def, s.speakerId)
              const nm = s.speakerName != null ? mcText(s.speakerName, locale) : (ch ? mcText(ch.name, locale) : null)
              return (
                <div key={s.id} className="mb-3">
                  {nm && <p className="text-xs font-bold" style={{ color: ch?.accentColor ?? `rgb(${GOLD})` }}>{nm}</p>}
                  <p className="text-sm" style={{ color: nm ? '#e8dfc8' : '#cbb68a', fontStyle: nm ? undefined : 'italic' }}>{mcText(s.text, locale)}</p>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>,
    document.body,
  )
}

// ─────────────────────────────── keyframes ──────────────────────────────────
const MC_KEYFRAMES = `
@keyframes rvnmc-blink { 0%,100% { opacity: 1 } 50% { opacity: 0.45 } }
@keyframes rvnmc-fog-a { 0% { transform: translateX(-4%) } 50% { transform: translateX(4%) } 100% { transform: translateX(-4%) } }
@keyframes rvnmc-fog-b { 0% { transform: translateX(3%) } 50% { transform: translateX(-3%) } 100% { transform: translateX(3%) } }
@keyframes rvnmc-rain { 0% { transform: translateY(-4%) } 100% { transform: translateY(4%) } }
@keyframes rvnmc-drift-down { 0% { transform: translateY(-8vh) } 100% { transform: translateY(108vh) } }
@keyframes rvnmc-drift-up { 0% { transform: translateY(108vh) } 100% { transform: translateY(-8vh) } }
@keyframes rvnmc-magic { 0%,100% { opacity: 0.22 } 50% { opacity: 0.4 } }
@keyframes rvnmc-shake-light { 0% { transform: translate(0,0) } 25% { transform: translate(4px,-3px) } 50% { transform: translate(-4px,3px) } 75% { transform: translate(2px,-2px) } 100% { transform: translate(0,0) } }
@keyframes rvnmc-shake-heavy { 0% { transform: translate(0,0) } 20% { transform: translate(9px,-6px) } 40% { transform: translate(-8px,6px) } 60% { transform: translate(6px,-4px) } 80% { transform: translate(-4px,3px) } 100% { transform: translate(0,0) } }
@keyframes rvnmc-punch { 0% { transform: scale(1.06) } 100% { transform: scale(1) } }
@keyframes rvnmc-enter-fade { from { opacity: 0 } to { opacity: 1 } }
@keyframes rvnmc-enter-slide-left { from { opacity: 0; transform: translateX(calc(-50% - 5%)) } to { opacity: 1; transform: translateX(-50%) } }
@keyframes rvnmc-enter-slide-right { from { opacity: 0; transform: translateX(calc(-50% + 5%)) } to { opacity: 1; transform: translateX(-50%) } }
@keyframes rvnmc-enter-slide-up { from { opacity: 0; transform: translateX(-50%) translateY(4%) } to { opacity: 1; transform: translateX(-50%) translateY(0) } }
@keyframes rvnmc-out-fade { from { opacity: 1 } to { opacity: 0 } }
@keyframes rvnmc-out-wipe-left { from { clip-path: inset(0 0 0 0) } to { clip-path: inset(0 100% 0 0) } }
@keyframes rvnmc-out-wipe-right { from { clip-path: inset(0 0 0 0) } to { clip-path: inset(0 0 0 100%) } }
@keyframes rvnmc-out-wipe-diagonal { from { clip-path: polygon(0 0, 200% 0, 0 200%) } to { clip-path: polygon(0 0, 0 0, 0 0) } }
@keyframes rvnmc-ink-in { from { opacity: 0; transform: scale(1.25) } to { opacity: 1; transform: scale(1) } }
@keyframes rvnmc-ink-out { from { opacity: 1; transform: scale(1) } to { opacity: 0; transform: scale(1.3) } }
`
