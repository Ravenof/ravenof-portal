'use client'

// ══════════════════════════════════════════════════════════════════════════════
// HorizontalFocusCarousel — VIENAS pernaudojamas horizontalus selektorius
// (kaladės, avatarai, frakcijos, varžovo tipai, apdovanojimai...).
//  • scroll-snap centras + kaimynų peržiūra (fokusuotas 100%, gretimi ~85%,
//    tolimi ~75% ir pritemdyti) — visada matosi, kad yra daugiau.
//  • Palaikymas: touch swipe (natyvus), pelės drag, wheel→horizontalus,
//    strėlės, klaviatūra (←→, Enter/Space = pick), reduced-motion.
//  • Fokusas iš scroll centro NEparenka — pasirinkimas TIK per onPick
//    (sąmoningas click/Enter). Jokio matomo native scrollbar.
// Dydžiai: compact (h~90) | standard (h~150) | large (h~210) — per itemWidth.
// ══════════════════════════════════════════════════════════════════════════════
import { useCallback, useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { playUiClick } from '@/lib/ui-sound'

const GOLD = '240,180,41'

export function HorizontalFocusCarousel<T>({ items, keyOf, renderItem, focus, onFocus, onPick, itemWidth, gap = 12, ariaLabel, className, edgePad = '30%' }: {
  items: T[]
  keyOf: (it: T) => string
  renderItem: (it: T, opts: { focused: boolean; dist: number }) => React.ReactNode
  focus: number
  onFocus: (i: number) => void
  onPick?: (it: T, i: number) => void
  itemWidth: number
  gap?: number
  ariaLabel: string
  className?: string
  edgePad?: string
}) {
  const railRef = useRef<HTMLDivElement | null>(null)
  const drag = useRef<{ x: number; left: number; moved: boolean } | null>(null)
  const [rm, setRm] = useState(false)
  useEffect(() => { try { setRm(window.matchMedia('(prefers-reduced-motion: reduce)').matches) } catch { /* */ } }, [])

  const scrollToIdx = useCallback((i: number, smooth = true) => {
    const el = railRef.current
    const ch = el?.children[i] as HTMLElement | undefined
    if (!el || !ch) return
    el.scrollTo({ left: ch.offsetLeft + ch.offsetWidth / 2 - el.clientWidth / 2, behavior: smooth && !rm ? 'smooth' : 'auto' })
  }, [rm])

  // pradinis centravimas + fokuso sekimas iš išorės
  const mounted = useRef(false)
  useEffect(() => {
    requestAnimationFrame(() => scrollToIdx(focus, mounted.current))
    mounted.current = true
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus, items.length])

  const onScroll = useCallback(() => {
    const el = railRef.current
    if (!el) return
    requestAnimationFrame(() => {
      const mid = el.scrollLeft + el.clientWidth / 2
      let best = 0; let bestD = Infinity
      Array.from(el.children).forEach((ch, i) => {
        const c = ch as HTMLElement
        const d = Math.abs(c.offsetLeft + c.offsetWidth / 2 - mid)
        if (d < bestD) { bestD = d; best = i }
      })
      if (best !== focus) onFocus(best)
    })
  }, [focus, onFocus])

  const step = (dir: -1 | 1) => {
    const n = Math.max(0, Math.min(items.length - 1, focus + dir))
    if (n === focus) return
    playUiClick(); onFocus(n); scrollToIdx(n)
  }

  return (
    <div className={'relative min-w-0 ' + (className ?? '')}>
      <div ref={railRef} onScroll={onScroll}
        role="listbox" aria-label={ariaLabel} tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1) }
          else if (e.key === 'ArrowRight') { e.preventDefault(); step(1) }
          else if ((e.key === 'Enter' || e.key === ' ') && onPick && items[focus]) { e.preventDefault(); onPick(items[focus], focus) }
        }}
        onMouseDown={(e) => { const el = railRef.current; if (el) drag.current = { x: e.clientX, left: el.scrollLeft, moved: false } }}
        onMouseMove={(e) => {
          const el = railRef.current; const d = drag.current
          if (!el || !d || e.buttons === 0) return
          const dx = e.clientX - d.x
          if (Math.abs(dx) > 6) d.moved = true
          if (d.moved) el.scrollLeft = d.left - dx
        }}
        onMouseUp={() => setTimeout(() => { drag.current = null }, 0)}
        onWheel={(e) => { const el = railRef.current; if (el && Math.abs(e.deltaY) > Math.abs(e.deltaX)) el.scrollLeft += e.deltaY }}
        className="flex items-center overflow-x-auto outline-none"
        style={{ gap, scrollSnapType: 'x mandatory', scrollbarWidth: 'none', paddingLeft: edgePad, paddingRight: edgePad, WebkitOverflowScrolling: 'touch' }}>
        <style>{`[role="listbox"]::-webkit-scrollbar{display:none}`}</style>
        {items.map((it, i) => {
          const dist = Math.abs(i - focus)
          const scale = dist === 0 ? 1 : dist === 1 ? 0.85 : 0.75
          return (
            <div key={keyOf(it)} role="option" aria-selected={i === focus}
              onClick={() => { if (drag.current?.moved) return; if (i === focus) { onPick?.(it, i) } else { playUiClick(); onFocus(i); scrollToIdx(i) } }}
              className="shrink-0"
              style={{ scrollSnapAlign: 'center', width: itemWidth,
                transform: `scale(${scale})`, opacity: dist > 1 ? 0.55 : 1, filter: dist > 0 ? 'brightness(0.72)' : 'none',
                transition: rm ? undefined : 'transform 0.25s ease, opacity 0.25s ease, filter 0.25s ease', cursor: 'pointer' }}>
              {renderItem(it, { focused: i === focus, dist })}
            </div>
          )
        })}
      </div>
      {/* kraštų fade + strėlės */}
      <div className="pointer-events-none absolute inset-y-0 left-0 w-10" style={{ background: 'linear-gradient(90deg, rgba(6,4,11,0.9), transparent)' }} />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-10" style={{ background: 'linear-gradient(-90deg, rgba(6,4,11,0.9), transparent)' }} />
      <button onClick={() => step(-1)} disabled={focus === 0} aria-label="Ankstesnis"
        className="rvn-press absolute left-0.5 top-1/2 -translate-y-1/2 flex items-center justify-center rounded-full disabled:opacity-25"
        style={{ width: 32, height: 32, background: 'rgba(10,8,16,0.92)', border: `1px solid rgba(${GOLD},0.4)`, color: 'var(--gold)', zIndex: 2 }}><ChevronLeft className="w-4 h-4" /></button>
      <button onClick={() => step(1)} disabled={focus === items.length - 1} aria-label="Kitas"
        className="rvn-press absolute right-0.5 top-1/2 -translate-y-1/2 flex items-center justify-center rounded-full disabled:opacity-25"
        style={{ width: 32, height: 32, background: 'rgba(10,8,16,0.92)', border: `1px solid rgba(${GOLD},0.4)`, color: 'var(--gold)', zIndex: 2 }}><ChevronRight className="w-4 h-4" /></button>
    </div>
  )
}
