'use client'

import { useRef, useState, useEffect, useCallback } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { LoreMarker } from './LoreMarker'
import type { LoreLocation, LoreFaction } from '@/data/lore'

const MAP_IMAGE  = '/maps/ravenof-world-map.jpg'
const MIN_SCALE  = 1
const MAX_SCALE  = 6

type Props = {
  locations:  LoreLocation[]
  factions:   LoreFaction[]
  selectedId: string | null
  onSelect:   (id: string) => void
}

// ── Helpers ───────────────────────────────────────────────────
function clamp(tx: number, ty: number, scale: number, W: number, H: number) {
  return {
    tx: Math.min(0, Math.max(W * (1 - scale), tx)),
    ty: Math.min(0, Math.max(H * (1 - scale), ty)),
  }
}

function touchDist(t1: React.Touch, t2: React.Touch) {
  return Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY)
}

// ── Component ─────────────────────────────────────────────────
export function LoreMap({ locations, factions, selectedId, onSelect }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const innerRef     = useRef<HTMLDivElement>(null)
  const tRef         = useRef({ scale: 1, tx: 0, ty: 0 })
  const dragRef      = useRef<{ ox: number; oy: number } | null>(null)
  const touchesRef   = useRef<{ id: number; x: number; y: number }[]>([])
  const pinchRef     = useRef<{ dist: number; cx: number; cy: number; s0: number; tx0: number; ty0: number } | null>(null)

  const [displayScale, setDisplayScale] = useState(1)
  const [isDragging,   setIsDragging]   = useState(false)

  const getFaction = (id?: string) => factions.find((f) => f.id === id)

  // ── Core apply function ───────────────────────────────────
  const apply = useCallback((scale: number, tx: number, ty: number) => {
    const W = containerRef.current?.offsetWidth  ?? 0
    const H = containerRef.current?.offsetHeight ?? 0
    const c = clamp(tx, ty, scale, W, H)
    tRef.current = { scale, tx: c.tx, ty: c.ty }
    if (innerRef.current) {
      innerRef.current.style.transform = `translate(${c.tx}px,${c.ty}px) scale(${scale})`
    }
    setDisplayScale(scale)
  }, [])

  // ── Zoom helpers ──────────────────────────────────────────
  const zoomAround = useCallback((cx: number, cy: number, factor: number) => {
    const { scale, tx, ty } = tRef.current
    const ns = Math.max(MIN_SCALE, Math.min(MAX_SCALE, scale * factor))
    apply(ns, cx - (cx - tx) / scale * ns, cy - (cy - ty) / scale * ns)
  }, [apply])

  function zoomIn() {
    const W = containerRef.current?.offsetWidth  ?? 0
    const H = containerRef.current?.offsetHeight ?? 0
    zoomAround(W / 2, H / 2, 1.4)
  }
  function zoomOut() {
    const W = containerRef.current?.offsetWidth  ?? 0
    const H = containerRef.current?.offsetHeight ?? 0
    zoomAround(W / 2, H / 2, 1 / 1.4)
  }
  function resetZoom() { apply(1, 0, 0) }

  // ── Wheel zoom (non-passive) ──────────────────────────────
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const rect = el.getBoundingClientRect()
      zoomAround(e.clientX - rect.left, e.clientY - rect.top, e.deltaY < 0 ? 1.12 : 0.89)
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [zoomAround])

  // ── Mouse drag ────────────────────────────────────────────
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if (tRef.current.scale <= 1) return
    e.preventDefault()
    dragRef.current = { ox: e.clientX - tRef.current.tx, oy: e.clientY - tRef.current.ty }
    setIsDragging(true)
  }, [])

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragRef.current) return
      apply(tRef.current.scale, e.clientX - dragRef.current.ox, e.clientY - dragRef.current.oy)
    }
    const onUp = () => { dragRef.current = null; setIsDragging(false) }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup',   onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup',   onUp)
    }
  }, [apply])

  // ── Touch: pan + pinch zoom ───────────────────────────────
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault()
    touchesRef.current = Array.from(e.touches).map((t) => ({ id: t.identifier, x: t.clientX, y: t.clientY }))
    if (e.touches.length === 2) {
      const rect = containerRef.current!.getBoundingClientRect()
      const { scale, tx, ty } = tRef.current
      pinchRef.current = {
        dist: touchDist(e.touches[0], e.touches[1]),
        cx:   (e.touches[0].clientX + e.touches[1].clientX) / 2 - rect.left,
        cy:   (e.touches[0].clientY + e.touches[1].clientY) / 2 - rect.top,
        s0: scale, tx0: tx, ty0: ty,
      }
    } else {
      pinchRef.current = null
    }
  }, [])

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    e.preventDefault()
    if (e.touches.length === 2 && pinchRef.current) {
      const { dist, cx, cy, s0, tx0, ty0 } = pinchRef.current
      const nd = touchDist(e.touches[0], e.touches[1])
      const ns = Math.max(MIN_SCALE, Math.min(MAX_SCALE, s0 * nd / dist))
      apply(ns, cx - (cx - tx0) / s0 * ns, cy - (cy - ty0) / s0 * ns)
    } else if (e.touches.length === 1 && tRef.current.scale > 1) {
      const prev = touchesRef.current.find((t) => t.id === e.touches[0].identifier)
      if (!prev) return
      const dx = e.touches[0].clientX - prev.x
      const dy = e.touches[0].clientY - prev.y
      apply(tRef.current.scale, tRef.current.tx + dx, tRef.current.ty + dy)
      touchesRef.current = touchesRef.current.map((t) =>
        t.id === e.touches[0].identifier ? { ...t, x: e.touches[0].clientX, y: e.touches[0].clientY } : t
      )
    }
  }, [apply])

  const onTouchEnd = useCallback((e: React.TouchEvent) => {
    if (e.touches.length < 2) pinchRef.current = null
    touchesRef.current = Array.from(e.touches).map((t) => ({ id: t.identifier, x: t.clientX, y: t.clientY }))
  }, [])

  // ── Render ────────────────────────────────────────────────
  return (
    <div
      ref={containerRef}
      className="relative w-full overflow-hidden rounded-xl select-none"
      style={{ aspectRatio: '4/3', minHeight: '240px', maxHeight: '540px' }}
    >
      {/* ── Zoomable / draggable inner layer ── */}
      <div
        ref={innerRef}
        className="absolute inset-0"
        style={{
          transform:       'translate(0px,0px) scale(1)',
          transformOrigin: '0 0',
          willChange:      'transform',
          touchAction:     'none',
          cursor: displayScale > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default',
        }}
        onMouseDown={onMouseDown}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {/* Map image */}
        <MapBackground />

        {/* Vignette */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at center, transparent 55%, rgba(5,5,12,0.6) 100%)' }}
        />

        {/* Markers */}
        <AnimatePresence>
          {locations.map((loc) => (
            <motion.div key={loc.id} layout>
              <LoreMarker
                location={loc}
                faction={getFaction(loc.factionId)}
                isSelected={selectedId === loc.id}
                onClick={() => onSelect(loc.id)}
              />
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Empty state */}
        {locations.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div
              className="text-center px-6 py-4 rounded-xl"
              style={{ background: 'rgba(5,5,12,0.85)', border: '1px solid var(--bg-border)' }}
            >
              <p className="text-2xl mb-2">🗺️</p>
              <p className="text-sm font-semibold" style={{ color: 'var(--text-muted)', fontFamily: 'var(--rvn-font-display)' }}>
                Nėra vietovių šioje eroje
              </p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                Pakeisk erą arba frakcijos filtrą
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ── Fixed overlays (outside transform) ── */}

      {/* Title badge */}
      <div
        className="absolute top-3 left-3 z-10 pointer-events-none flex items-center gap-2 px-3 py-1.5 rounded-lg"
        style={{ background: 'rgba(5,5,12,0.85)', border: '1px solid rgba(212,175,55,0.2)', backdropFilter: 'blur(8px)' }}
      >
        <span style={{ color: 'var(--gold)', fontSize: '12px' }}>🗺</span>
        <span
          className="text-xs font-semibold"
          style={{ fontFamily: 'var(--rvn-font-display)', color: 'var(--gold)', letterSpacing: '0.08em' }}
        >
          Ravenof Žemės
        </span>
      </div>

      {/* Zoom controls */}
      <div className="absolute bottom-3 right-3 z-10 flex flex-col gap-1">
        <button
          onClick={zoomIn}
          className="w-7 h-7 rounded flex items-center justify-center font-bold text-sm transition-opacity hover:opacity-80"
          style={{ background: 'rgba(5,5,12,0.88)', border: '1px solid rgba(212,175,55,0.3)', color: 'var(--gold)', backdropFilter: 'blur(8px)' }}
          title="Priartinti"
        >
          +
        </button>
        <button
          onClick={zoomOut}
          className="w-7 h-7 rounded flex items-center justify-center font-bold text-sm transition-opacity hover:opacity-80"
          style={{ background: 'rgba(5,5,12,0.88)', border: '1px solid rgba(212,175,55,0.3)', color: 'var(--gold)', backdropFilter: 'blur(8px)' }}
          title="Tolinti"
        >
          −
        </button>
        {displayScale > 1.05 && (
          <button
            onClick={resetZoom}
            className="w-7 h-7 rounded flex items-center justify-center text-xs transition-opacity hover:opacity-80"
            style={{ background: 'rgba(5,5,12,0.88)', border: '1px solid rgba(212,175,55,0.15)', color: 'var(--text-muted)', backdropFilter: 'blur(8px)' }}
            title="Atstatyti"
          >
            ⊙
          </button>
        )}
      </div>

      {/* Scale badge */}
      {displayScale > 1.05 && (
        <div
          className="absolute bottom-3 left-3 z-10 pointer-events-none px-2 py-0.5 rounded text-xs"
          style={{ background: 'rgba(5,5,12,0.7)', color: 'var(--text-muted)', fontFamily: 'monospace', backdropFilter: 'blur(4px)' }}
        >
          {displayScale.toFixed(1)}×
        </div>
      )}
    </div>
  )
}

// ── Map background image + placeholder ───────────────────────
function MapBackground() {
  return (
    <>
      {/* Real map image — hidden on error, placeholder shows instead */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={MAP_IMAGE}
        alt="Ravenof žemėlapis"
        className="absolute inset-0 w-full h-full"
        style={{ display: 'block', objectFit: 'fill' }}
        onError={(e) => {
          ;(e.currentTarget as HTMLImageElement).style.display = 'none'
        }}
      />

      {/* Placeholder (shown when image missing) */}
      <div
        className="absolute inset-0"
        style={{
          background: [
            'repeating-linear-gradient(0deg,   transparent, transparent 49px, rgba(212,175,55,0.04) 50px)',
            'repeating-linear-gradient(90deg,  transparent, transparent 49px, rgba(212,175,55,0.04) 50px)',
            'radial-gradient(ellipse at 28% 38%, rgba(124,58,237,0.10) 0%, transparent 45%)',
            'radial-gradient(ellipse at 72% 55%, rgba(212,175,55,0.08) 0%, transparent 45%)',
            'radial-gradient(ellipse at 50% 85%, rgba(220,38,38,0.06) 0%, transparent 40%)',
            '#07070f',
          ].join(', '),
        }}
      >
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 800 600" preserveAspectRatio="xMidYMid slice" aria-hidden>
          <path
            d="M 80 120 Q 150 80 280 100 Q 420 115 500 90 Q 600 70 680 130 Q 730 180 710 330 Q 690 430 580 450 Q 460 475 360 440 Q 240 405 160 375 Q 80 340 75 225 Z"
            fill="rgba(212,175,55,0.04)" stroke="rgba(212,175,55,0.12)" strokeWidth="1.5"
          />
          <path d="M 300 170 Q 320 260 290 340 Q 270 390 260 440" fill="none" stroke="rgba(14,165,233,0.15)" strokeWidth="1.5" />
          <g transform="translate(730, 550)">
            <circle r="16" fill="rgba(5,5,12,0.7)" stroke="rgba(212,175,55,0.2)" strokeWidth="1" />
            <text textAnchor="middle" y="-6" fontSize="8" fill="rgba(212,175,55,0.5)" fontFamily="serif">N</text>
            <text textAnchor="middle" y="14" fontSize="8" fill="rgba(212,175,55,0.3)" fontFamily="serif">S</text>
            <line x1="0" y1="-11" x2="0" y2="11" stroke="rgba(212,175,55,0.3)" strokeWidth="0.5" />
            <line x1="-11" y1="0" x2="11" y2="0" stroke="rgba(212,175,55,0.3)" strokeWidth="0.5" />
          </g>
        </svg>
      </div>
    </>
  )
}
