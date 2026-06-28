'use client'

// ════════════════════════════════════════════════════════════════════════════
// TutorialOverlay — visual guidance layer over TutorialGame: screen dimming with
// spotlight holes, pulsing glow rings, animated arrow, permanent objective banner,
// and a dark-fantasy guide dialogue bubble. Purely presentational; the director
// supplies selectors + dialogue. Wrong moves are prevented by the gate hook, so
// the dim never needs to block clicks (pointer-events:none except the bubble).
// ════════════════════════════════════════════════════════════════════════════

import { useEffect, useRef, useState } from 'react'

export interface OverlayDialogue { name?: string; text: string; speaker?: 'guide' | 'enemy' | 'narrator' }

export interface TutorialOverlayProps {
  objective?: string | null
  dialogue?: OverlayDialogue | null
  highlightSelectors: string[]
  arrowSelector?: string | null
  step: number
  total: number
  showNext: boolean
  onNext: () => void
  onSkipLesson: () => void
  onExit: () => void
}

type Rect = { x: number; y: number; w: number; h: number }

function readRects(selectors: string[]): Rect[] {
  const out: Rect[] = []
  for (const sel of selectors) {
    const el = document.querySelector(sel)
    if (!el) continue
    const r = el.getBoundingClientRect()
    if (r.width === 0 && r.height === 0) continue
    out.push({ x: r.left - 6, y: r.top - 6, w: r.width + 12, h: r.height + 12 })
  }
  return out
}

export function TutorialOverlay(p: TutorialOverlayProps) {
  const [rects, setRects] = useState<Rect[]>([])
  const [arrow, setArrow] = useState<Rect | null>(null)
  const [vp, setVp] = useState({ w: 0, h: 0 })
  const raf = useRef(0)

  useEffect(() => {
    const tick = () => {
      setRects(readRects(p.highlightSelectors))
      setArrow(p.arrowSelector ? (readRects([p.arrowSelector])[0] ?? null) : null)
      setVp({ w: window.innerWidth, h: window.innerHeight })
      raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf.current)
  }, [p.highlightSelectors, p.arrowSelector])

  const speaker = p.dialogue?.speaker ?? 'guide'
  const accent = speaker === 'enemy' ? '#ef4444' : speaker === 'narrator' ? '#9aa0b5' : '#f0b429'

  return (
    <div aria-hidden style={{ position: 'fixed', inset: 0, zIndex: 200, pointerEvents: 'none' }}>
      <style>{CSS}</style>

      {/* Dimming with spotlight holes */}
      <svg width={vp.w} height={vp.h} style={{ position: 'fixed', inset: 0 }}>
        <defs>
          <mask id="rvn-tut-mask">
            <rect x="0" y="0" width={vp.w} height={vp.h} fill="white" />
            {rects.map((r, i) => (
              <rect key={i} x={r.x} y={r.y} width={r.w} height={r.h} rx="14" fill="black" />
            ))}
          </mask>
        </defs>
        <rect x="0" y="0" width={vp.w} height={vp.h} fill="rgba(4,3,8,0.62)" mask="url(#rvn-tut-mask)" />
      </svg>

      {/* Glow rings around highlights */}
      {rects.map((r, i) => (
        <div key={i} className="rvn-tut-ring" style={{ left: r.x, top: r.y, width: r.w, height: r.h }} />
      ))}

      {/* Animated arrow */}
      {arrow && (
        <div className="rvn-tut-arrow" style={{ left: arrow.x + arrow.w / 2 - 16, top: arrow.y - 42 }}>▼</div>
      )}

      {/* Objective banner (permanent) */}
      {p.objective && (
        <div className="rvn-tut-obj">
          <span style={{ opacity: 0.7, fontSize: 10, letterSpacing: '0.18em' }}>TIKSLAS</span>
          <span style={{ fontWeight: 800 }}>{p.objective}</span>
        </div>
      )}

      {/* Progress */}
      <div style={{ position: 'fixed', top: 10, right: 12, fontSize: 11, color: 'rgba(243,234,211,0.7)', background: 'rgba(6,4,11,0.7)', padding: '3px 9px', borderRadius: 9 }}>
        {p.step}/{p.total}
      </div>

      {/* Skip lesson */}
      <button onClick={p.onSkipLesson} style={{ position: 'fixed', top: 8, left: 12, pointerEvents: 'auto', fontSize: 11, color: 'rgba(243,234,211,0.6)', background: 'rgba(6,4,11,0.7)', border: '1px solid rgba(255,255,255,0.12)', padding: '4px 10px', borderRadius: 9 }}>
        Praleisti pamoką
      </button>

      {/* Dialogue bubble */}
      {p.dialogue && (
        <div className="rvn-tut-bubble" style={{ borderColor: accent }}>
          <div className="rvn-tut-portrait" style={{ borderColor: accent, color: accent }}>🐦‍⬛</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            {p.dialogue.name && <div style={{ fontSize: 12, fontWeight: 800, color: accent, fontFamily: 'var(--rvn-font-display, Cinzel, serif)', letterSpacing: '0.04em' }}>{p.dialogue.name}</div>}
            <div style={{ fontSize: 14, color: '#f3ead3', lineHeight: 1.4 }}>{p.dialogue.text}</div>
          </div>
          {p.showNext && (
            <button onClick={p.onNext} className="rvn-tut-next" style={{ borderColor: accent, color: accent }}>Toliau →</button>
          )}
        </div>
      )}
    </div>
  )
}

const CSS = `
.rvn-tut-ring { position: fixed; border-radius: 16px; pointer-events: none; box-shadow: 0 0 0 2px rgba(240,180,41,0.9), 0 0 18px 4px rgba(240,180,41,0.55); animation: rvnTutPulse 1.3s ease-in-out infinite; }
@keyframes rvnTutPulse { 0%,100% { box-shadow: 0 0 0 2px rgba(240,180,41,0.85), 0 0 14px 3px rgba(240,180,41,0.45); } 50% { box-shadow: 0 0 0 3px rgba(240,180,41,1), 0 0 26px 8px rgba(240,180,41,0.7); } }
.rvn-tut-arrow { position: fixed; font-size: 30px; color: #f0b429; text-shadow: 0 0 12px rgba(240,180,41,0.9), 0 2px 4px #000; pointer-events: none; animation: rvnTutBounce 0.9s ease-in-out infinite; }
@keyframes rvnTutBounce { 0%,100% { transform: translateY(0); } 50% { transform: translateY(8px); } }
.rvn-tut-obj { position: fixed; top: 8px; left: 50%; transform: translateX(-50%); display: flex; flex-direction: column; align-items: center; gap: 1px; padding: 5px 18px; border-radius: 12px; background: rgba(6,4,11,0.9); border: 1px solid rgba(240,180,41,0.5); color: #f3ead3; pointer-events: none; box-shadow: 0 4px 16px rgba(0,0,0,0.5); }
.rvn-tut-bubble { position: fixed; bottom: 14px; left: 50%; transform: translateX(-50%); width: min(680px, 94vw); display: flex; align-items: center; gap: 12px; padding: 12px 14px; border-radius: 16px; background: linear-gradient(160deg, rgba(18,14,26,0.97), rgba(8,6,14,0.97)); border: 1.5px solid; pointer-events: auto; box-shadow: 0 10px 34px rgba(0,0,0,0.6); animation: rvnTutRise 0.28s ease-out; }
@keyframes rvnTutRise { from { opacity: 0; transform: translate(-50%, 16px); } to { opacity: 1; transform: translate(-50%, 0); } }
.rvn-tut-portrait { width: 46px; height: 46px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 24px; border: 2px solid; background: rgba(0,0,0,0.4); flex-shrink: 0; }
.rvn-tut-next { flex-shrink: 0; padding: 8px 16px; border-radius: 11px; font-weight: 800; font-size: 13px; background: rgba(240,180,41,0.14); border: 1.5px solid; cursor: pointer; font-family: var(--rvn-font-display, Cinzel, serif); }
.rvn-tut-next:hover { background: rgba(240,180,41,0.26); }
`
