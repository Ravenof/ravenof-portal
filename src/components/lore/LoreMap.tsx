'use client'

import { useRef, useState, useEffect, useCallback } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { LoreMarker } from './LoreMarker'
import type { LoreLocation, LoreFaction } from '@/data/lore'

const MAP_IMAGE = '/maps/ravenof-world-map.png'
const MIN_SCALE = 1
const MAX_SCALE = 6

type Props = {
  locations:  LoreLocation[]
  factions:   LoreFaction[]
  selectedId: string | null
  onSelect:   (id: string) => void
}

function clampT(tx: number, ty: number, scale: number, W: number, H: number) {
  return {
    tx: Math.min(0, Math.max(W * (1 - scale), tx)),
    ty: Math.min(0, Math.max(H * (1 - scale), ty)),
  }
}

function touchDist(t1: React.Touch, t2: React.Touch) {
  return Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY)
}

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

  const apply = useCallback((scale: number, tx: number, ty: number) => {
    const W = containerRef.current?.offsetWidth  ?? 0
    const H = containerRef.current?.offsetHeight ?? 0
    const c = clampT(tx, ty, scale, W, H)
    tRef.current = { scale, tx: c.tx, ty: c.ty }
    if (innerRef.current) {
      innerRef.current.style.transform = `translate(${c.tx}px,${c.ty}px) scale(${scale})`
    }
    setDisplayScale(scale)
  }, [])

  const zoomAround = useCallback((cx: number, cy: number, factor: number) => {
    const { scale, tx, ty } = tRef.current
    const ns = Math.max(MIN_SCALE, Math.min(MAX_SCALE, scale * factor))
    apply(ns, cx - (cx - tx) / scale * ns, cy - (cy - ty) / scale * ns)
  }, [apply])

  function zoomIn()   { const el = containerRef.current; if (el) zoomAround(el.offsetWidth/2, el.offsetHeight/2, 1.4) }
  function zoomOut()  { const el = containerRef.current; if (el) zoomAround(el.offsetWidth/2, el.offsetHeight/2, 1/1.4) }
  function resetZoom(){ apply(1, 0, 0) }

  // Non-passive wheel
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const handler = (e: WheelEvent) => {
      e.preventDefault()
      const rect = el.getBoundingClientRect()
      zoomAround(e.clientX - rect.left, e.clientY - rect.top, e.deltaY < 0 ? 1.12 : 0.89)
    }
    el.addEventListener('wheel', handler, { passive: false })
    return () => el.removeEventListener('wheel', handler)
  }, [zoomAround])

  // Mouse drag
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button')) return
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
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
  }, [apply])

  // Touch
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault()
    touchesRef.current = Array.from(e.touches).map(t => ({ id: t.identifier, x: t.clientX, y: t.clientY }))
    if (e.touches.length === 2) {
      const rect = containerRef.current!.getBoundingClientRect()
      const { scale, tx, ty } = tRef.current
      pinchRef.current = {
        dist: touchDist(e.touches[0], e.touches[1]),
        cx: (e.touches[0].clientX + e.touches[1].clientX) / 2 - rect.left,
        cy: (e.touches[0].clientY + e.touches[1].clientY) / 2 - rect.top,
        s0: scale, tx0: tx, ty0: ty,
      }
    } else pinchRef.current = null
  }, [])

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    e.preventDefault()
    if (e.touches.length === 2 && pinchRef.current) {
      const { dist, cx, cy, s0, tx0, ty0 } = pinchRef.current
      const ns = Math.max(MIN_SCALE, Math.min(MAX_SCALE, s0 * touchDist(e.touches[0], e.touches[1]) / dist))
      apply(ns, cx - (cx - tx0) / s0 * ns, cy - (cy - ty0) / s0 * ns)
    } else if (e.touches.length === 1 && tRef.current.scale > 1) {
      const prev = touchesRef.current.find(t => t.id === e.touches[0].identifier)
      if (!prev) return
      apply(tRef.current.scale, tRef.current.tx + e.touches[0].clientX - prev.x, tRef.current.ty + e.touches[0].clientY - prev.y)
      touchesRef.current = touchesRef.current.map(t =>
        t.id === e.touches[0].identifier ? { ...t, x: e.touches[0].clientX, y: e.touches[0].clientY } : t
      )
    }
  }, [apply])

  const onTouchEnd = useCallback((e: React.TouchEvent) => {
    if (e.touches.length < 2) pinchRef.current = null
    touchesRef.current = Array.from(e.touches).map(t => ({ id: t.identifier, x: t.clientX, y: t.clientY }))
  }, [])

  return (
    <div
      ref={containerRef}
      className="relative w-full overflow-hidden select-none"
      style={{ aspectRatio: '1448/1086' }}
    >
      {/* ── Zoomable / pannable layer ── */}
      <div
        ref={innerRef}
        className="absolute inset-0"
        style={{
          transform:       'translate(0px,0px) scale(1)',
          transformOrigin: '0 0',
          willChange:      'transform',
          touchAction:     'none',
          cursor: isDragging ? 'grabbing' : displayScale > 1 ? 'grab' : 'default',
        }}
        onMouseDown={onMouseDown}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {/* Map image — fills container completely */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={MAP_IMAGE}
          alt="Ravenof žemėlapis"
          className="absolute inset-0 w-full h-full"
          style={{ objectFit: 'fill', display: 'block', pointerEvents: 'none', userSelect: 'none' }}
          draggable={false}
        />

        {/* Vignette */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at center, transparent 40%, rgba(5,5,12,0.55) 100%)' }}
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
            <div className="text-center px-6 py-4 rounded-xl" style={{ background: 'rgba(5,5,12,0.85)', border: '1px solid var(--bg-border)' }}>
              <p className="text-2xl mb-2">🗺️</p>
              <p className="text-sm font-semibold" style={{ color: 'var(--text-muted)', fontFamily: 'var(--rvn-font-display)' }}>
                Nėra vietovių šioje eroje
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ── Fixed UI (outside transform) ── */}

      {/* Title */}
      <div
        className="absolute top-3 left-3 z-10 pointer-events-none flex items-center gap-2 px-3 py-1.5 rounded-lg"
        style={{ background: 'rgba(5,5,12,0.80)', border: '1px solid rgba(212,175,55,0.2)', backdropFilter: 'blur(10px)' }}
      >
        <span style={{ color: 'var(--gold)', fontSize: '12px' }}>🗺</span>
        <span className="text-xs font-semibold" style={{ fontFamily: 'var(--rvn-font-display)', color: 'var(--gold)', letterSpacing: '0.08em' }}>
          Ravenof Žemės
        </span>
      </div>

      {/* Zoom controls */}
      <div className="absolute bottom-3 right-3 z-10 flex flex-col gap-1">
        <button onClick={zoomIn}
          className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-base transition-all hover:scale-110"
          style={{ background: 'rgba(5,5,12,0.85)', border: '1px solid rgba(212,175,55,0.35)', color: 'var(--gold)', backdropFilter: 'blur(8px)' }}>
          +
        </button>
        <button onClick={zoomOut}
          className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-base transition-all hover:scale-110"
          style={{ background: 'rgba(5,5,12,0.85)', border: '1px solid rgba(212,175,55,0.35)', color: 'var(--gold)', backdropFilter: 'blur(8px)' }}>
          −
        </button>
        {displayScale > 1.05 && (
          <button onClick={resetZoom}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-sm transition-all hover:scale-110"
            style={{ background: 'rgba(5,5,12,0.85)', border: '1px solid rgba(212,175,55,0.15)', color: 'var(--text-muted)', backdropFilter: 'blur(8px)' }}>
            ⊙
          </button>
        )}
      </div>

      {/* Scale badge */}
      {displayScale > 1.05 && (
        <div className="absolute bottom-3 left-3 z-10 pointer-events-none px-2 py-1 rounded-lg text-xs"
          style={{ background: 'rgba(5,5,12,0.75)', color: 'var(--text-muted)', fontFamily: 'monospace', backdropFilter: 'blur(4px)' }}>
          {displayScale.toFixed(1)}×
        </div>
      )}
    </div>
  )
}
