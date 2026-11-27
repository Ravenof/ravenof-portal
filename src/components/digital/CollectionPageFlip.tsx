'use client'

// ══════════════════════════════════════════════════════════════════════════════
// Kolekcijos puslapio vertimas (842): senas puslapis nuslysta vertimo kryptimi,
// naujas atplaukia nugarėlėmis į viršų, o kiekviena korta apsiverčia tada, kai
// jos paveikslėlis užsikrovęs – laukimas tampa animacijos dalimi.
// • FlipGrid   – kortų tinklelis su vertimo animacija (tik transform/opacity).
// • RollNumber – „kinetic" puslapio skaitliukas.
// • preloadImages – kaimyninių puslapių paveikslėlių pakrovimas iš anksto.
// Animuojama TIK kai puslapį verčia žaidėjas (flip.at šviežias); filtrų keitimas,
// pirmas užkrovimas ir prefers-reduced-motion – be animacijos.
// ══════════════════════════════════════════════════════════════════════════════
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { playCardFlip } from '@/lib/ui-sound'

export type PageFlip = { dir: 1 | -1 | 0; n: number; at: number }

const IN_MS = 260
const OUT_MS = 170
const FLIP_MS = 300
const LOAD_FALLBACK_MS = 2500 // paveikslėlis neužsikrovė – verčiam vis tiek
const EASE_IN = 'cubic-bezier(.16,.84,.3,1)'
const EASE_OUT = 'cubic-bezier(.5,0,.9,.4)'
const EASE_FLIP = 'cubic-bezier(.3,.6,.2,1)'

function reducedMotion(): boolean {
  return typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
}
function shouldAnimate(flip: PageFlip): boolean {
  if (typeof window === 'undefined' || !flip.dir) return false
  return performance.now() - flip.at < 400 && !reducedMotion()
}
function gridCols(el: Element | null): number {
  if (!el) return 1
  return Math.max(1, getComputedStyle(el).gridTemplateColumns.split(' ').filter(Boolean).length)
}
function slideDist(el: HTMLElement): number {
  return Math.min(170, el.clientWidth * 0.13)
}

// ── Kaimyninių puslapių paveikslėlių preload ─────────────────────────────────
const preloaded = new Set<string>()
export function preloadImages(urls: string[]): void {
  if (typeof window === 'undefined') return
  for (const u of urls) {
    if (!u || preloaded.has(u)) continue
    preloaded.add(u)
    const im = new Image()
    im.decoding = 'async'
    im.src = u
  }
}

/** Vienas apsivertimo garsas per puslapio vertimą (ne 24 iš karto). */
let flipSoundGen = -1

// ── Tinklelis ────────────────────────────────────────────────────────────────
export function FlipGrid<T>({ items, flip, getKey, renderCell, className, layerStyle, backUrl, backCss, testId }: {
  items: T[]
  flip: PageFlip
  getKey: (item: T) => string
  /** onReady kviesti, kai kortos paveikslėlis užsikrovė (arba jo nebus). */
  renderCell: (item: T, onReady: () => void) => ReactNode
  className?: string
  layerStyle: CSSProperties
  backUrl?: string | null
  backCss?: string | null
  testId?: string
}) {
  const boxRef = useRef<HTMLDivElement>(null)
  const layerRef = useRef<HTMLDivElement>(null)
  const seen = useRef(flip.n)
  const snap = useRef<{ n: number; el: HTMLElement | null }>({ n: flip.n, el: null })

  // Išeinantis puslapis = dabartinio DOM kopija (paimama PRIEŠ React pakeičiant turinį),
  // kad jau užkrauti paveikslėliai nemirksėtų.
  if (flip.n !== seen.current) {
    seen.current = flip.n
    snap.current = { n: flip.n, el: shouldAnimate(flip) && layerRef.current ? (layerRef.current.cloneNode(true) as HTMLElement) : null }
  }

  useLayoutEffect(() => {
    const box = boxRef.current
    const ghost = snap.current.n === flip.n ? snap.current.el : null
    if (!box || !ghost || !ghost.animate) return
    const dir = flip.dir
    ghost.setAttribute('aria-hidden', 'true')
    ghost.style.pointerEvents = 'none'
    box.insertBefore(ghost, box.firstChild)
    const cols = gridCols(ghost)
    const dist = slideDist(ghost)
    Array.from(ghost.children).forEach((c, i) => {
      const col = i % cols
      const order = dir > 0 ? col : cols - 1 - col
      ;(c as HTMLElement).animate(
        [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: `translateX(${-dir * dist}px) scale(.95)` }],
        { duration: OUT_MS, delay: order * 9, easing: EASE_OUT, fill: 'forwards' },
      )
    })
    const t = setTimeout(() => ghost.remove(), OUT_MS + cols * 9 + 40)
    return () => { clearTimeout(t); ghost.remove() }
  }, [flip.n, flip.dir])

  return (
    <div ref={boxRef} className={className} data-testid={testId}
      style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', overflowX: 'hidden' }}>
      <div key={flip.n} ref={layerRef} style={{ gridArea: '1 / 1', minWidth: 0, ...layerStyle }}>
        {items.map((it, i) => (
          <FlipCell key={getKey(it)} index={i} flip={flip} backUrl={backUrl} backCss={backCss}>
            {(onReady) => renderCell(it, onReady)}
          </FlipCell>
        ))}
      </div>
    </div>
  )
}

// ── Kortos langelis: atplaukia nugarėle, apsiverčia kai paveikslėlis paruoštas ─
function FlipCell({ index, flip, backUrl, backCss, children }: {
  index: number
  flip: PageFlip
  backUrl?: string | null
  backCss?: string | null
  children: (onReady: () => void) => ReactNode
}) {
  // kryptis ir karta fiksuojamos montuojant – vėlesni prop pokyčiai animacijos nepaleidžia
  const dir = useRef(shouldAnimate(flip) ? flip.dir : 0).current
  const gen = useRef(flip.n).current
  const [done, setDone] = useState(dir === 0)
  const cellRef = useRef<HTMLDivElement>(null)
  const flipRef = useRef<HTMLDivElement>(null)
  const st = useRef({ arrived: dir === 0, loaded: false, flipped: dir === 0, anim: null as Animation | null })

  const tryFlip = useCallback(() => {
    const s = st.current
    const el = flipRef.current
    if (s.flipped || !s.arrived || !s.loaded || !el) return
    s.flipped = true
    if (flipSoundGen !== gen) { flipSoundGen = gen; playCardFlip() }
    if (!el.animate) { setDone(true); return }
    const an = el.animate(
      [
        { transform: `rotateY(${dir * 180}deg) scale(1)` },
        { transform: `rotateY(${dir * 90}deg) scale(1.07)`, offset: 0.45 },
        { transform: 'rotateY(0deg) scale(1)' },
      ],
      { duration: FLIP_MS, easing: EASE_FLIP, fill: 'forwards' },
    )
    s.anim = an
    an.onfinish = () => { setDone(true); shine(cellRef.current) }
  }, [dir, gen])

  // baigus – nuimam 3D stilius ir animaciją (fill: forwards laikė galutinę pozą iki šio commit'o)
  useLayoutEffect(() => {
    if (!done) return
    st.current.anim?.cancel()
    st.current.anim = null
  }, [done])

  useLayoutEffect(() => {
    if (!dir) return
    const el = cellRef.current
    const grid = el?.parentElement
    if (!el || !grid) return
    const cols = gridCols(grid)
    const col = index % cols
    const row = Math.floor(index / cols)
    const order = dir > 0 ? col : cols - 1 - col
    const delay = 60 + order * 14 + row * 6
    const dist = slideDist(grid)
    const an = el.animate?.(
      [{ opacity: 0, transform: `translateX(${dir * dist}px) scale(.94)` }, { opacity: 1, transform: 'none' }],
      { duration: IN_MS, delay, easing: EASE_IN, fill: 'backwards' },
    )
    // apsivertimas prasideda dar skrendant – judesys nenutrūksta
    const t1 = setTimeout(() => { st.current.arrived = true; tryFlip() }, delay + IN_MS * 0.5)
    const t2 = setTimeout(() => { st.current.loaded = true; tryFlip() }, LOAD_FALLBACK_MS)
    return () => { clearTimeout(t1); clearTimeout(t2); an?.cancel() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const onReady = useCallback(() => { st.current.loaded = true; tryFlip() }, [tryFlip])

  const hidden: CSSProperties = { backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }
  return (
    <div ref={cellRef} style={done ? { position: 'relative', minWidth: 0 } : { position: 'relative', minWidth: 0, perspective: 900, willChange: 'transform, opacity' }}>
      <div ref={flipRef} style={done ? undefined : { position: 'relative', transformStyle: 'preserve-3d', transform: `rotateY(${dir * 180}deg)` }}>
        <div style={done ? undefined : hidden}>{children(onReady)}</div>
        {!done && (
          <div aria-hidden style={{
            ...hidden, position: 'absolute', inset: 0, borderRadius: 5, overflow: 'hidden', transform: 'rotateY(180deg)',
            border: '1px solid var(--ravenof-border-strong)', boxShadow: '0 6px 18px rgba(0,0,0,.5)',
            background: backUrl ? `#0a0810 url("${backUrl}") center / cover no-repeat` : (backCss || 'linear-gradient(160deg,#1a1325,#0a0810)'),
          }} />
        )}
      </div>
    </div>
  )
}

/** Auksinis blyksnis per ką tik atverstą kortą. */
function shine(cell: HTMLElement | null): void {
  if (!cell || !cell.animate) return
  const clip = document.createElement('div')
  clip.setAttribute('aria-hidden', 'true')
  clip.style.cssText = 'position:absolute;inset:0;overflow:hidden;border-radius:5px;pointer-events:none;z-index:3'
  const bar = document.createElement('div')
  bar.style.cssText = 'position:absolute;top:-20%;bottom:-20%;left:-60%;right:-60%;background:linear-gradient(105deg,transparent 42%,rgba(255,233,168,.34) 50%,transparent 58%)'
  clip.appendChild(bar)
  cell.appendChild(clip)
  const an = bar.animate([{ transform: 'translateX(-70%)', opacity: 1 }, { transform: 'translateX(70%)', opacity: 0 }], { duration: 480, easing: 'ease-out' })
  an.onfinish = an.oncancel = () => clip.remove()
}

// ── Puslapio skaitliukas: senas skaičius išslysta, naujas įslysta vertimo kryptimi ─
export function RollNumber({ value, flip }: { value: number; flip: PageFlip }) {
  const ref = useRef<HTMLSpanElement>(null)
  const prev = useRef(value)
  const seen = useRef(flip.n)
  useLayoutEffect(() => {
    const el = ref.current
    const old = prev.current
    prev.current = value
    const flipped = flip.n !== seen.current
    seen.current = flip.n
    const box = el?.parentElement
    if (!el || !box || !flipped || old === value || !el.animate || !shouldAnimate(flip)) return
    const dir = flip.dir
    const ghost = document.createElement('span')
    ghost.setAttribute('aria-hidden', 'true')
    ghost.textContent = String(old)
    ghost.style.cssText = 'position:absolute;top:0;right:0'
    box.appendChild(ghost)
    const o: KeyframeAnimationOptions = { duration: 260, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'both' }
    const out = ghost.animate([{ transform: 'none', opacity: 1 }, { transform: `translateY(${-dir * 100}%)`, opacity: 0 }], o)
    out.onfinish = out.oncancel = () => ghost.remove()
    const inn = el.animate([{ transform: `translateY(${dir * 100}%)`, opacity: 0 }, { transform: 'none', opacity: 1 }], o)
    return () => { out.cancel(); inn.cancel() }
  }, [value, flip])
  return (
    <span style={{ position: 'relative', display: 'inline-block', overflow: 'hidden', verticalAlign: 'bottom' }}>
      <span ref={ref} style={{ display: 'inline-block' }}>{value}</span>
    </span>
  )
}
