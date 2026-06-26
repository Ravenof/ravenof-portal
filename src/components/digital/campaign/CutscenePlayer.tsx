'use client'

// ════════════════════════════════════════════════════════════════════════════
// CutscenePlayer — dark-fantasy framed cutscene/dialogue overlay (mobile-first).
// Plays a Cutscene's steps: portrait + name + text, background image/video,
// music/ambient, optional voice per step, choices, skip & continue.
// Returns onDone(choiceKey?) when finished or skipped.
// ════════════════════════════════════════════════════════════════════════════

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { playUiClick } from '@/lib/ui-sound'
import type { Cutscene, CutsceneStep } from '@/lib/campaign/types'

const GOLD = '240,180,41'

export function CutscenePlayer({ cutscene, onDone }: { cutscene: Cutscene; onDone: (choiceKey?: string) => void }) {
  const [idx, setIdx] = useState(0)
  const [choiceKey, setChoiceKey] = useState<string | undefined>(undefined)
  const musicRef = useRef<HTMLAudioElement | null>(null)
  const voiceRef = useRef<HTMLAudioElement | null>(null)
  const steps = cutscene.steps ?? []
  const step: CutsceneStep | undefined = steps[idx]

  // resolve step background (step override → cutscene default)
  const bgImage = step?.backgroundImageUrl ?? cutscene.backgroundImageUrl
  const bgVideo = step?.videoUrl ?? cutscene.backgroundVideoUrl

  // music / ambient on mount
  useEffect(() => {
    if (!cutscene.musicUrl) return
    const a = new Audio(cutscene.musicUrl)
    a.loop = true; a.volume = 0.4; musicRef.current = a
    if (cutscene.autoplay) a.play().catch(() => {})
    return () => { a.pause(); musicRef.current = null }
  }, [cutscene.musicUrl, cutscene.autoplay])

  // per-step voice
  useEffect(() => {
    voiceRef.current?.pause()
    if (step?.voiceUrl && cutscene.autoplay) {
      const v = new Audio(step.voiceUrl); v.volume = 0.9; voiceRef.current = v
      v.play().catch(() => {})
    }
  }, [idx, step?.voiceUrl, cutscene.autoplay])

  const finish = (key?: string) => { musicRef.current?.pause(); voiceRef.current?.pause(); onDone(key ?? choiceKey) }

  const advance = () => {
    playUiClick()
    if (!step) return finish()
    if (step.choices?.length) return // choices handle advance
    const nextById = step.nextStepId ? steps.findIndex((x) => x.id === step.nextStepId) : -1
    const next = nextById >= 0 ? nextById : idx + 1
    if (next >= steps.length) finish()
    else setIdx(next)
  }

  const choose = (key: string, nextStepId?: string) => {
    playUiClick(); setChoiceKey(key)
    const next = nextStepId ? steps.findIndex((x) => x.id === nextStepId) : idx + 1
    if (next < 0 || next >= steps.length) finish(key)
    else setIdx(next)
  }

  if (typeof document === 'undefined') return null
  if (!step) { finish(); return null }

  const sideLeft = step.side === 'left'
  const sideCenter = step.side === 'center'
  const narrator = step.side === 'narrator'

  return createPortal(
    <div className="fixed inset-0 z-[300] flex flex-col" style={{ background: '#05040a' }}>
      {/* Background */}
      <div className="absolute inset-0 overflow-hidden">
        {bgVideo ? (
          <video src={bgVideo} autoPlay={cutscene.autoplay} muted loop playsInline
            className="w-full h-full object-cover" style={{ opacity: 0.85 }} />
        ) : bgImage ? (
          <img src={bgImage} alt="" className="w-full h-full object-cover" style={{ opacity: 0.85 }} />
        ) : (
          <div className="w-full h-full" style={{ background: 'radial-gradient(120% 90% at 50% 0%, rgba(40,20,30,0.7), #05040a 70%)' }} />
        )}
        <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(5,4,10,0.55) 0%, rgba(5,4,10,0.15) 40%, rgba(5,4,10,0.96) 100%)' }} />
      </div>

      {/* Skip */}
      {cutscene.skippable && (
        <button onClick={() => { playUiClick(); finish() }}
          className="absolute top-4 right-4 z-10 px-3 py-1.5 rounded-lg text-xs font-semibold"
          style={{ background: 'rgba(10,8,16,0.7)', border: '1px solid rgba(255,255,255,0.15)', color: 'var(--text-muted)', paddingTop: 'calc(6px + env(safe-area-inset-top,0px))' }}>
          Praleisti ⏭
        </button>
      )}

      {/* Character illustration */}
      {!narrator && step.portraitUrl && (
        <div className={'absolute bottom-[34%] z-[5] ' + (sideCenter ? 'left-1/2 -translate-x-1/2' : sideLeft ? 'left-3' : 'right-3')}
          style={{ maxHeight: '52vh' }}>
          <img src={step.portraitUrl} alt={step.characterName ?? ''}
            className="max-h-[52vh] object-contain"
            style={{ filter: 'drop-shadow(0 12px 30px rgba(0,0,0,0.7))', maxWidth: '70vw' }} />
        </div>
      )}

      {/* Dialogue box */}
      <div className="mt-auto relative z-10 p-3" onClick={advance}
        style={{ paddingBottom: 'calc(14px + env(safe-area-inset-bottom,0px))' }}>
        <div className="mx-auto w-full max-w-lg rounded-2xl px-5 py-4"
          style={{ background: 'linear-gradient(160deg, rgba(23,17,31,0.96), rgba(10,8,16,0.98))', border: `1px solid rgba(${GOLD},0.4)`, boxShadow: '0 -8px 40px rgba(0,0,0,0.6)' }}>
          {step.characterName && !narrator && (
            <p className="text-sm font-bold mb-1.5" style={{ fontFamily: 'var(--rvn-font-display)', color: `rgb(${GOLD})`, letterSpacing: '0.05em', textShadow: `0 0 10px rgba(${GOLD},0.4)` }}>
              {step.characterName}
            </p>
          )}
          <p className={narrator ? 'italic text-center' : ''}
            style={{ color: narrator ? '#cbb68a' : '#f3ead3', fontSize: 15, lineHeight: 1.55 }}>
            {step.text}
          </p>

          {step.voiceUrl && (
            <button onClick={(e) => { e.stopPropagation(); const v = new Audio(step.voiceUrl!); v.play().catch(() => {}) }}
              className="mt-2 text-[11px] inline-flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
              🔊 Klausyti
            </button>
          )}

          {step.choices?.length ? (
            <div className="mt-3 space-y-2" onClick={(e) => e.stopPropagation()}>
              {step.choices.map((c) => (
                <button key={c.key} onClick={() => choose(c.key, c.nextStepId)}
                  className="w-full text-left px-4 py-2.5 rounded-xl text-sm font-semibold transition-transform active:scale-[0.98]"
                  style={{ background: `rgba(${GOLD},0.12)`, border: `1px solid rgba(${GOLD},0.4)`, color: '#f3ead3' }}>
                  {c.label}
                </button>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-between mt-3">
              <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{idx + 1} / {steps.length}</span>
              <span className="text-xs font-bold animate-pulse" style={{ color: `rgb(${GOLD})`, fontFamily: 'var(--rvn-font-display)' }}>
                {idx + 1 >= steps.length ? 'Tęsti ▸' : 'Toliau ▸'}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  )
}
