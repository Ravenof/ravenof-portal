'use client'

// ════════════════════════════════════════════════════════════════════════════
// TutorialOverlay V3 — kino lygio vedimo sluoksnis virš TutorialGame:
//   • spotlight dimming (SVG mask) — kaip v2
//   • CLOSE-UP KAMERA: plavus board wrapper'io (`[data-tut-zoomwrap]`) scale+
//     translate link taikinio. Transformas rašomas TIESIAI į DOM (raf), tad
//     nekelia React perpiešimų ir nekonfliktuoja su framer-motion (wrapper'is
//     yra ATSKIRAS div, ne board root — žr. handoff §3.1).
//   • PULSUOJANTI RODYKLĖ (3 koncentriniai žiedai, box-shadow — be transform)
//   • DRAG-PATH: animuota punktyrinė kreivė + „vaiduokliškas" pirštas (SVG)
//   • TITRAI: pilnas ištariamas tekstas po burbulo santrauka
//   • „Praleisti pamoką" su patvirtinimu (asset CTA)
// Pati juosta yra pointer-events:none — veiksmus blokuoja direktoriaus gate.
// Reduced-motion: jokių transform animacijų (zoom → tik spotlight, pulsas →
// statinis švytėjimas).
// ════════════════════════════════════════════════════════════════════════════

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { isReducedMotionEnabled } from '@/lib/settings'

export interface OverlayDialogue {
  name?: string
  text: string
  speaker?: 'guide' | 'enemy' | 'narrator'
  /** Pilnas ištariamas tekstas (titrai); rodomas smulkiu šriftu po santrauka. */
  subtitle?: string | null
}

export type ArrowStyle = 'point' | 'pulse' | 'drag-path'

/** Visi matomi tekstai ateina iš direktoriaus (i18n; overlay yra grynai vizualus). */
export interface OverlayLabels {
  objective: string
  next: string
  skipVoice: string
  skipLesson: string
  forceNext: string
  confirmTitle: string
  confirmBody: string
  confirmYes: string
  confirmNo: string
}

export interface TutorialOverlayProps {
  labels: OverlayLabels
  /** Vedlio portretas (be rėmo). Numatytas — Senasis Korvas. */
  portraitUrl?: string | null
  objective?: string | null
  dialogue?: OverlayDialogue | null
  highlightSelectors: string[]
  arrowSelector?: string | null
  arrowStyle?: ArrowStyle
  arrowFromSelector?: string | null
  zoomSelector?: string | null
  zoomLevel?: number | null
  step: number
  total: number
  showNext: boolean
  /** Rodoma „skip" užuomina, kol groja balsas (bakstelėjimas praleidžia). */
  voicePlaying?: boolean
  /** Anti-deadlock: kai žingsnis per ilgai nejuda, direktorius duoda rankinį tęsimą. */
  onForceNext?: (() => void) | null
  onNext: () => void
  onSkipLesson: () => void
  onExit: () => void
}

type Rect = { x: number; y: number; w: number; h: number }

/** Šiuo metu NUPIEŠTA elemento transformacija (įskaitant vykstančią CSS animaciją). */
function readMatrix(el: HTMLElement): { s: number; tx: number; ty: number } {
  try {
    const tr = getComputedStyle(el).transform
    if (!tr || tr === 'none') return { s: 1, tx: 0, ty: 0 }
    const M = new DOMMatrixReadOnly(tr)
    return { s: M.a || 1, tx: M.e, ty: M.f }
  } catch { return { s: 1, tx: 0, ty: 0 } }
}

/**
 * Taikinio elementas. Kai selektorių atitinka KELI elementai (pvz. ta pati korta
 * rankoje IR atsivėrusioje mulligano scenoje), imamas PASKUTINIS — scenos DOM'e
 * eina po lentos, tad „viršutinis" sluoksnis visada laimi.
 */
function elOf(sel: string | null | undefined): Element | null {
  if (!sel) return null
  const all = document.querySelectorAll(sel)
  for (let i = all.length - 1; i >= 0; i--) {
    const r = all[i].getBoundingClientRect()
    if (r.width > 0 || r.height > 0) return all[i]
  }
  return null
}

function rectOf(sel: string | null | undefined, pad = 6): Rect | null {
  const el = elOf(sel)
  if (!el) return null
  const r = el.getBoundingClientRect()
  if (r.width === 0 && r.height === 0) return null
  return { x: r.left - pad, y: r.top - pad, w: r.width + pad * 2, h: r.height + pad * 2 }
}

/** Apatinės dialogo juostos aukštis (burbulas + tarpas) — perdengimo detekcijai. */
const BUBBLE_ZONE_H = 168

const sameRect = (a: Rect | null, b: Rect | null) =>
  a === b || (!!a && !!b && Math.abs(a.x - b.x) < 0.5 && Math.abs(a.y - b.y) < 0.5 && Math.abs(a.w - b.w) < 0.5 && Math.abs(a.h - b.h) < 0.5)

const sameRects = (a: Rect[], b: Rect[]) => a.length === b.length && a.every((r, i) => sameRect(r, b[i]))

function readRects(selectors: string[]): Rect[] {
  const out: Rect[] = []
  for (const sel of selectors) { const r = rectOf(sel); if (r) out.push(r) }
  return out
}

/** Auto mastelis: mažas elementas → didesnis close-up. */
function autoZoom(r: Rect, vw: number, vh: number): number {
  const frac = Math.max(r.w / Math.max(vw, 1), r.h / Math.max(vh, 1))
  if (frac <= 0.06) return 2.2
  if (frac <= 0.12) return 1.9
  if (frac <= 0.22) return 1.65
  if (frac <= 0.4) return 1.4
  return 1.2
}

export function TutorialOverlay(p: TutorialOverlayProps) {
  const [rects, setRects] = useState<Rect[]>([])
  const [arrow, setArrow] = useState<Rect | null>(null)
  const [arrowFrom, setArrowFrom] = useState<Rect | null>(null)
  const [vp, setVp] = useState({ w: 0, h: 0 })
  const [confirmSkip, setConfirmSkip] = useState(false)
  // Dialogo burbulas keliauja Į VIRŠŲ, kai rodomas objektas yra po juo (QA 2026-08-18).
  const [bubbleTop, setBubbleTop] = useState(false)
  const bubbleTopRef = useRef(false)
  const raf = useRef(0)
  const prevHs = useRef<Rect[]>([])
  const prevArrow = useRef<Rect | null>(null)
  const prevFrom = useRef<Rect | null>(null)
  const prevVp = useRef({ w: 0, h: 0 })
  // taikomas transformas (scale, translate) — kad rect'us galėtume „atsukti" į bazę
  const cam = useRef({ s: 1, tx: 0, ty: 0 })
  /** Šiuo metu transformuojamas konteineris (lenta arba scena) — kad pakeitus jį senasis būtų grąžintas. */
  const camEl = useRef<HTMLElement | null>(null)
  /** Paskutinis kameros taikymas konteinerio vietinėje sistemoje (histerezei). */
  const aim = useRef<{ key: string; lx: number; ly: number; s2: number } | null>(null)

  const arrowStyle: ArrowStyle = p.arrowStyle ?? 'point'

  useEffect(() => {
    const reduced = isReducedMotionEnabled()
    /**
     * Kameros konteineris parenkamas PAGAL TAIKINĮ:
     *   • lentos elementas  → `[data-tut-zoomwrap]` (visa kovos lenta)
     *   • scenos elementas  → `[data-tut-zoomroot]` (mulliganas / monetos metimas /
     *     kiti pilno ekrano pick'ai — jie gyvena UŽ lentos wrapper'io ribų, tad
     *     anksčiau zoom'as juose tiesiog neveikdavo).
     * Scenoms mastelis ribojamas švelniau (jose kortos jau didelės).
     */
    const wrapFor = (target: Element | null): HTMLElement | null => {
      if (target) {
        const own = target.closest('[data-tut-zoomwrap], [data-tut-zoomroot]') as HTMLElement | null
        if (own) return own
      }
      return document.querySelector('[data-tut-zoomwrap]') as HTMLElement | null
    }
    const wrap = () => document.querySelector('[data-tut-zoomwrap]') as HTMLElement | null

    const resetEl = (el: HTMLElement | null) => {
      if (!el) return
      el.style.transform = 'none'
      el.style.willChange = ''
    }

    const applyCamOn = (el: HTMLElement | null, s: number, tx: number, ty: number) => {
      if (!el) return
      cam.current = { s, tx, ty }
      el.style.transformOrigin = '0 0'
      el.style.willChange = s === 1 ? '' : 'transform'
      el.style.transition = 'transform 450ms cubic-bezier(.22,.9,.3,1)'
      // translate3d — GPU sluoksnis: be jo sub-pikseliniai perskaičiavimai matomi kaip virpėjimas.
      el.style.transform = s === 1 && tx === 0 && ty === 0 ? 'none' : `translate3d(${tx.toFixed(2)}px, ${ty.toFixed(2)}px, 0) scale(${s.toFixed(4)})`
      el.style.backfaceVisibility = 'hidden'
      if (camEl.current !== el) {
        resetEl(camEl.current)      // pasikeitė konteineris (lenta ↔ scena) — senąjį grąžinam
        camEl.current = el
      }
    }

    const tick = () => {
      const W = window.innerWidth, H = window.innerHeight
      if (prevVp.current.w !== W || prevVp.current.h !== H) { prevVp.current = { w: W, h: H }; setVp({ w: W, h: H }) }
      const hs = readRects(p.highlightSelectors)
      const ar = rectOf(p.arrowSelector)
      const af = rectOf(p.arrowFromSelector)
      // Perpiešiam TIK pasikeitus (kas kadrą keičiamas state = nereikalingas
      // React darbas ir papildomas mikro-trūkčiojimas silpnesniuose įrenginiuose).
      if (!sameRects(hs, prevHs.current)) { prevHs.current = hs; setRects(hs) }
      if (!sameRect(ar, prevArrow.current)) { prevArrow.current = ar; setArrow(ar) }
      if (!sameRect(af, prevFrom.current)) { prevFrom.current = af; setArrowFrom(af) }

      // ── Ar burbulas uždengia tai, ką rodom? ──
      // Burbulo zona: apatinė juosta per visą plotį (aukštis ~ 168 px + safe-area).
      // Jei bent vienas paryškinimas / rodyklės taikinys į ją patenka — burbulą
      // keliam į viršų (po tikslo juosta). Histerezė: 24 px, kad nemirksėtų.
      const zoneTop = H - BUBBLE_ZONE_H
      const probes = [...hs, ...(ar ? [ar] : []), ...(rectOf(p.zoomSelector, 0) ? [rectOf(p.zoomSelector, 0)!] : [])]
      const margin = bubbleTopRef.current ? 24 : 0
      const hit = probes.some((r) => r.y + r.h > zoneTop - margin)
      if (hit !== bubbleTopRef.current) { bubbleTopRef.current = hit; setBubbleTop(hit) }

      // ── close-up kamera ──
      const zoomEl = elOf(p.zoomSelector)
      const el = wrapFor(zoomEl)
      if (el) {
        const scene = el.hasAttribute('data-tut-zoomroot')
        const maxZoom = scene ? 1.55 : 2.6      // scenose kortos jau didelės
        if (!zoomEl || reduced) {
          if (camEl.current) { resetEl(camEl.current); camEl.current = null }
          cam.current = { s: 1, tx: 0, ty: 0 }
          aim.current = null
        } else {
          // KRITIŠKA: imam TIKRĄ šiuo metu nupieštą matricą, o ne tikslinę reikšmę.
          // Per 450 ms perėjimą rect'as rodo TARPINĘ būseną — invertavus ją tiksline
          // matrica gaudavosi klaidinga „bazė", tikslas keisdavosi kas kadrą ir
          // kamera imdavo virpėti bei šokinėti (chase loop).
          const m = readMatrix(el)
          const C = el.getBoundingClientRect()
          const T = zoomEl.getBoundingClientRect()
          // Taikinys konteinerio VIETINĖJE (netransformuotoje) sistemoje. Atimdami C
          // atsikratom ir protėvių transformų (lentos drebėjimo shakeBoard/quake),
          // tad drebant ekranui kamera nebeseka drebėjimo.
          const lx = (T.left + T.width / 2 - C.left) / m.s
          const ly = (T.top + T.height / 2 - C.top) / m.s
          const s2 = Math.max(1, Math.min(maxZoom, p.zoomLevel ?? autoZoom({ x: 0, y: 0, w: T.width / m.s, h: T.height / m.s }, W, H)))
          const key = (p.zoomSelector ?? '') + '|' + (scene ? 'scene' : 'board')
          const a = aim.current
          // Perskaičiuojam TIK kai taikinys realiai pajudėjo (>3 px vietinėje
          // sistemoje) arba pasikeitė mastelis/konteineris. Histerezė = jokio dreifo.
          const needs = !a || a.key !== key || Math.abs(a.lx - lx) > 3 || Math.abs(a.ly - ly) > 3 || Math.abs(a.s2 - s2) > 0.01 || camEl.current !== el
          if (needs) {
            const ox = C.left - m.tx, oy = C.top - m.ty          // netransformuota kilmė ekrane
            const bw = C.width / m.s, bh = C.height / m.s
            let t2x = W / 2 - ox - lx * s2
            // Scenose taikinys centruojamas AUKŠČIAU (apačioje — patvirtinimo mygtukas).
            let t2y = (scene ? H * 0.38 : H * 0.42) - oy - ly * s2
            const minTx = W - ox - bw * s2, maxTx = -ox
            const minTy = H - oy - bh * s2, maxTy = -oy
            if (minTx <= maxTx) t2x = Math.min(maxTx, Math.max(minTx, t2x))
            if (minTy <= maxTy) t2y = Math.min(maxTy, Math.max(minTy, t2y))
            aim.current = { key, lx, ly, s2 }
            applyCamOn(el, s2, t2x, t2y)
          }
        }
      }
      raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(raf.current)
      resetEl(camEl.current)
      camEl.current = null
      resetEl(wrap())
      cam.current = { s: 1, tx: 0, ty: 0 }
    }
  }, [p.highlightSelectors, p.arrowSelector, p.arrowFromSelector, p.zoomSelector, p.zoomLevel])

  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const speaker = p.dialogue?.speaker ?? 'guide'
  const accent = speaker === 'enemy' ? '#ef4444' : speaker === 'narrator' ? '#9aa0b5' : '#f0b429'

  if (!mounted) return null

  // ── drag-path kreivė ──
  let dragPath: string | null = null
  if (arrowStyle === 'drag-path' && arrow && arrowFrom) {
    const x1 = arrowFrom.x + arrowFrom.w / 2, y1 = arrowFrom.y + arrowFrom.h / 2
    const x2 = arrow.x + arrow.w / 2, y2 = arrow.y + arrow.h / 2
    const cx = (x1 + x2) / 2, cy = Math.min(y1, y2) - Math.max(40, Math.abs(x2 - x1) * 0.28)
    dragPath = `M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`
  }

  return createPortal(
    <div aria-hidden style={{ position: 'fixed', inset: 0, zIndex: 350, pointerEvents: 'none' }}>
      <style>{CSS}</style>

      {/* Pritemdymo NĖRA (2026-08-19): visą pamoką ekranas buvo dengiamas 62 proc.
          tamsa — net žingsniuose BE paryškinimo (tuščia kaukė = vientisas šydas),
          tad kova atrodė nuolat prigesusi. Dėmesį veda švytintys žiedai, pulsas,
          rodyklė ir close-up kamera — jų pakanka be viso ekrano tamsinimo. */}

      {/* Glow rings around highlights */}
      {rects.map((r, i) => (
        <div key={i} className="rvn-tut-ring" style={{ left: r.x, top: r.y, width: r.w, height: r.h }} />
      ))}

      {/* Pulsuojantys žiedai apie rodyklės taikinį (arrowStyle='pulse') */}
      {arrowStyle === 'pulse' && arrow && (
        <>
          <div className="rvn-tut-pulse rvn-tut-pulse-1" style={{ left: arrow.x - 6, top: arrow.y - 6, width: arrow.w + 12, height: arrow.h + 12 }} />
          <div className="rvn-tut-pulse rvn-tut-pulse-2" style={{ left: arrow.x - 6, top: arrow.y - 6, width: arrow.w + 12, height: arrow.h + 12 }} />
          <div className="rvn-tut-pulse rvn-tut-pulse-3" style={{ left: arrow.x - 6, top: arrow.y - 6, width: arrow.w + 12, height: arrow.h + 12 }} />
        </>
      )}

      {/* Drag-path „vaiduoklis": punktyrinė kreivė + judanti kortos šmėkla */}
      {dragPath && (
        <svg width={vp.w} height={vp.h} style={{ position: 'fixed', inset: 0, pointerEvents: 'none' }}>
          <path d={dragPath} className="rvn-tut-dragline" fill="none" />
          <circle r="13" className="rvn-tut-ghost">
            <animateMotion dur="2.2s" repeatCount="indefinite" path={dragPath} keyPoints="0;1" keyTimes="0;1" calcMode="linear" />
            <animate attributeName="opacity" values="0;0.95;0.95;0" dur="2.2s" repeatCount="indefinite" />
          </circle>
        </svg>
      )}

      {/* Animated arrow (point / pulse) */}
      {arrow && arrowStyle !== 'drag-path' && (
        <div className="rvn-tut-arrow" style={{ left: arrow.x + arrow.w / 2 - 16, top: arrow.y - 42 }}>▼</div>
      )}

      {/* Objective banner (permanent) */}
      {p.objective && (
        <div className="rvn-tut-obj">
          <span style={{ opacity: 0.7, fontSize: 10, letterSpacing: '0.18em' }}>{p.labels.objective}</span>
          <span style={{ fontWeight: 800 }}>{p.objective}</span>
        </div>
      )}

      {/* Progress */}
      <div style={{ position: 'fixed', top: 'calc(10px + env(safe-area-inset-top, 0px))', right: 12, fontSize: 11, color: 'rgba(243,234,211,0.7)', background: 'rgba(6,4,11,0.7)', padding: '3px 9px', borderRadius: 9 }}>
        {p.step}/{p.total}
      </div>

      {/* Skip lesson — asset CTA (kanonas commit630) */}
      <button onClick={() => setConfirmSkip(true)} className="ravenof-press" style={{ ...ASSET_CTA(0.72), position: 'fixed', top: 'calc(8px + env(safe-area-inset-top, 0px))', left: 12, pointerEvents: 'auto' }}>
        {p.labels.skipLesson}
      </button>

      {/* Dialogue bubble (+ titrai) */}
      {p.dialogue && (
        <div className={'rvn-tut-bubble' + (bubbleTop ? ' rvn-tut-bubble-top' : '')} style={{ borderColor: accent }} onClick={p.showNext ? p.onNext : undefined}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="rvn-tut-portrait" src={p.portraitUrl ?? '/tutorial/korvas.webp'} alt="" draggable={false} />
          <div style={{ flex: 1, minWidth: 0 }}>
            {p.dialogue.name && <div style={{ fontSize: 12, fontWeight: 800, color: accent, fontFamily: 'var(--rvn-font-display, Cinzel, serif)', letterSpacing: '0.04em' }}>{p.dialogue.name}</div>}
            <div style={{ fontSize: 14, color: '#f3ead3', lineHeight: 1.4 }}>{p.dialogue.text}</div>
            {p.dialogue.subtitle && (
              <div style={{ marginTop: 5, paddingTop: 5, borderTop: '1px solid rgba(255,255,255,0.08)', fontSize: 11, lineHeight: 1.35, color: 'rgba(243,234,211,0.62)' }}>
                {p.dialogue.subtitle}
              </div>
            )}
          </div>
          {p.showNext && (
            <button onClick={(e) => { e.stopPropagation(); p.onNext() }} className="ravenof-press rvn-tut-next" style={ASSET_CTA(0.86)}>
              {p.voicePlaying ? p.labels.skipVoice : p.labels.next}
            </button>
          )}
        </div>
      )}

      {/* Anti-deadlock: rankinis tęsimas, kai žingsnis pakibo (priešas nieko nedaro) */}
      {p.onForceNext && (
        <button onClick={p.onForceNext} className="ravenof-press rvn-tut-force" style={{ ...ASSET_CTA(0.8), position: 'fixed', right: 14, bottom: bubbleTop ? 20 : 172 }}>
          {p.labels.forceNext}
        </button>
      )}

      {/* Praleidimo patvirtinimas */}
      {confirmSkip && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 2, display: 'grid', placeItems: 'center', background: 'rgba(4,3,8,0.72)', pointerEvents: 'auto' }}>
          <div className="combat-plate" style={{ width: 'min(420px, 92vw)', padding: '18px 20px', textAlign: 'center' }}>
            <p style={{ font: '800 15px var(--rvn-font-display, Cinzel, serif)', color: 'var(--gold, #f0b429)', margin: '0 0 6px' }}>{p.labels.confirmTitle}</p>
            <p style={{ fontSize: 12.5, color: 'rgba(243,234,211,0.75)', margin: '0 0 16px', lineHeight: 1.45 }}>{p.labels.confirmBody}</p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button className="ravenof-press" style={ASSET_CTA(1)} onClick={() => { setConfirmSkip(false); p.onSkipLesson() }}>{p.labels.confirmYes}</button>
              <button className="ravenof-press" style={ASSET_CTA(0.9)} onClick={() => setConfirmSkip(false)}>{p.labels.confirmNo}</button>
            </div>
          </div>
        </div>
      )}
    </div>,
    document.body,
  )
}

/**
 * Vieningas asset CTA (kanonas commit630: button-primary-normal.png 100%/100%).
 * `k` — mastelio koeficientas (0.7 = mažas viršutinis mygtukas, 1 = pilnas).
 */
const ASSET_CTA = (k = 1): React.CSSProperties => ({
  width: 'auto', minWidth: Math.round(170 * k), maxWidth: '92vw', textAlign: 'center',
  font: `800 ${(12 * k).toFixed(1)}px var(--rvn-font-display, Cinzel, serif)`,
  letterSpacing: 2 * k, textTransform: 'uppercase', whiteSpace: 'nowrap',
  color: '#f6e8c6',
  background: "url('/ravenof-ui/buttons/button-primary-normal.png') center / 100% 100% no-repeat",
  padding: `${Math.round(12 * k)}px ${Math.round(26 * k)}px`,
  border: 0, cursor: 'pointer', textShadow: '0 1px 4px rgba(0,0,0,.8)',
  transition: 'filter 0.18s ease',
})

const CSS = `
.rvn-tut-ring { position: fixed; border-radius: 16px; pointer-events: none; box-shadow: 0 0 0 2px rgba(240,180,41,0.9), 0 0 18px 4px rgba(240,180,41,0.55); animation: rvnTutPulse 1.3s ease-in-out infinite; }
@keyframes rvnTutPulse { 0%,100% { box-shadow: 0 0 0 2px rgba(240,180,41,0.85), 0 0 14px 3px rgba(240,180,41,0.45); } 50% { box-shadow: 0 0 0 3px rgba(240,180,41,1), 0 0 26px 8px rgba(240,180,41,0.7); } }
/* Pulsuojantys žiedai — TIK box-shadow (scale-ne-transform kanonas) */
.rvn-tut-pulse { position: fixed; border-radius: 18px; pointer-events: none; animation: rvnTutRings 1.8s ease-out infinite; }
.rvn-tut-pulse-2 { animation-delay: 0.6s; }
.rvn-tut-pulse-3 { animation-delay: 1.2s; }
@keyframes rvnTutRings {
  0%   { box-shadow: 0 0 0 0 rgba(240,180,41,0.55); }
  70%  { box-shadow: 0 0 0 22px rgba(240,180,41,0.0); }
  100% { box-shadow: 0 0 0 22px rgba(240,180,41,0.0); }
}
.rvn-tut-dragline { stroke: rgba(240,180,41,0.85); stroke-width: 3; stroke-dasharray: 10 9; stroke-linecap: round; filter: drop-shadow(0 0 6px rgba(240,180,41,0.55)); animation: rvnTutDash 1.1s linear infinite; }
@keyframes rvnTutDash { to { stroke-dashoffset: -38; } }
.rvn-tut-ghost { fill: rgba(240,180,41,0.35); stroke: rgba(255,225,150,0.95); stroke-width: 2; filter: drop-shadow(0 0 10px rgba(240,180,41,0.8)); }
.rvn-tut-arrow { position: fixed; font-size: 30px; color: #f0b429; text-shadow: 0 0 12px rgba(240,180,41,0.9), 0 2px 4px #000; pointer-events: none; animation: rvnTutBounce 0.9s ease-in-out infinite; }
@keyframes rvnTutBounce { 0%,100% { transform: translateY(0); } 50% { transform: translateY(8px); } }
.rvn-tut-obj { position: fixed; top: calc(8px + env(safe-area-inset-top, 0px)); left: 50%; transform: translateX(-50%); display: flex; flex-direction: column; align-items: center; gap: 1px; padding: 5px 18px; border-radius: 12px; background: rgba(6,4,11,0.9); border: 1px solid rgba(240,180,41,0.5); color: #f3ead3; pointer-events: none; box-shadow: 0 4px 16px rgba(0,0,0,0.5); }
.rvn-tut-bubble { position: fixed; bottom: calc(20px + env(safe-area-inset-bottom, 0px)); left: 50%; transform: translateX(-50%); width: min(720px, 94vw); display: flex; align-items: center; gap: 12px; overflow: hidden; padding: 12px 14px; border-radius: 16px; background: linear-gradient(160deg, rgba(18,14,26,0.97), rgba(8,6,14,0.97)); border: 1.5px solid; pointer-events: auto; box-shadow: 0 10px 34px rgba(0,0,0,0.6); animation: rvnTutRise 0.28s ease-out; cursor: pointer; }
@keyframes rvnTutRise { from { opacity: 0; transform: translate(-50%, 16px); } to { opacity: 1; transform: translate(-50%, 0); } }
.rvn-tut-bubble-top { bottom: auto !important; top: calc(78px + env(safe-area-inset-top, 0px)); }
.rvn-tut-force { position: fixed; right: 14px; pointer-events: auto; }
.rvn-tut-force:hover { filter: brightness(1.12); }
/* Korvo portretas: BE apvalaus rėmo, bet VISADA burbulo viduje (jokių neigiamų
   paraščių — anksčiau jis išlįsdavo pro rėmą ir „nepataikydavo į vietą").
   Kvadratą sušvelnina radialinė kaukė, tad kraštai ištirpsta burbulo fone. */
.rvn-tut-portrait {
  width: clamp(64px, 7.6vw, 96px); height: clamp(64px, 7.6vw, 96px);
  flex-shrink: 0; align-self: center;
  object-fit: cover; object-position: 50% 14%;
  border: 0; border-radius: 10px; background: none;
  -webkit-mask-image: radial-gradient(122% 104% at 50% 36%, #000 58%, rgba(0,0,0,0.6) 80%, transparent 96%);
  mask-image: radial-gradient(122% 104% at 50% 36%, #000 58%, rgba(0,0,0,0.6) 80%, transparent 96%);
  filter: drop-shadow(0 4px 10px rgba(0,0,0,0.7)) saturate(1.05);
  pointer-events: none; user-select: none;
}
.rvn-tut-next { flex-shrink: 0; }
.rvn-tut-next:hover, .ravenof-press:hover { filter: brightness(1.12); }
@media (prefers-reduced-motion: reduce) {
  .rvn-tut-ring, .rvn-tut-pulse, .rvn-tut-arrow, .rvn-tut-dragline { animation: none !important; }
  .rvn-tut-pulse { box-shadow: 0 0 0 3px rgba(240,180,41,0.5) !important; }
}
`
