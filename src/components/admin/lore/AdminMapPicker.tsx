'use client'

/**
 * AdminMapPicker — interaktyvus žemėlapis admin paneliui.
 * Palaiko zoom (wheel + mygtukai) ir pan (drag / pinch).
 * Spustelėjus žemėlapyje nustatomos X/Y koordinatės (0–100 %).
 * Grąžina <input type="hidden" name="x"> ir <input type="hidden" name="y">
 * kurie bus pateikiami kartu su formData.
 */

import { useRef, useState, useEffect, useCallback } from 'react'

const MAP_IMAGE = '/maps/ravenof-world-map.png'
const MIN_SCALE = 1
const MAX_SCALE = 8

type ExistingLoc = { id: string; name: string; x: number; y: number; slug: string }

type Props = {
  initialX?: number
  initialY?: number
  currentId?: string          // id of location being edited (excluded from dots)
  existingLocations?: ExistingLoc[]
}

// ── Helpers ───────────────────────────────────────────────────
function clampT(tx: number, ty: number, scale: number, W: number, H: number) {
  return {
    tx: Math.min(0, Math.max(W * (1 - scale), tx)),
    ty: Math.min(0, Math.max(H * (1 - scale), ty)),
  }
}

function touchDist(t1: React.Touch, t2: React.Touch) {
  return Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY)
}

// ── Component ─────────────────────────────────────────────────
export function AdminMapPicker({ initialX = 50, initialY = 50, currentId, existingLocations = [] }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const innerRef     = useRef<HTMLDivElement>(null)
  const tRef         = useRef({ scale: 1, tx: 0, ty: 0 })
  const dragRef      = useRef<{ ox: number; oy: number; startX: number; startY: number } | null>(null)
  const didDragRef   = useRef(false)
  const touchesRef   = useRef<{ id: number; x: number; y: number }[]>([])
  const pinchRef     = useRef<{ dist: number; cx: number; cy: number; s0: number; tx0: number; ty0: number } | null>(null)

  const [pin,          setPin]          = useState({ x: initialX, y: initialY })
  const [displayScale, setDisplayScale] = useState(1)
  const [isDragging,   setIsDragging]   = useState(false)

  // ── Core apply ────────────────────────────────────────────
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

  function zoomIn()   { const W = containerRef.current?.offsetWidth ?? 0; const H = containerRef.current?.offsetHeight ?? 0; zoomAround(W/2, H/2, 1.5) }
  function zoomOut()  { const W = containerRef.current?.offsetWidth ?? 0; const H = containerRef.current?.offsetHeight ?? 0; zoomAround(W/2, H/2, 1/1.5) }
  function resetZoom(){ apply(1, 0, 0) }

  // ── Wheel zoom ────────────────────────────────────────────
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const handler = (e: WheelEvent) => {
      e.preventDefault()
      const rect = el.getBoundingClientRect()
      zoomAround(e.clientX - rect.left, e.clientY - rect.top, e.deltaY < 0 ? 1.15 : 0.87)
    }
    el.addEventListener('wheel', handler, { passive: false })
    return () => el.removeEventListener('wheel', handler)
  }, [zoomAround])

  // ── Mouse: drag to pan, click to pin ─────────────────────
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    didDragRef.current = false
    dragRef.current = {
      ox: e.clientX - tRef.current.tx,
      oy: e.clientY - tRef.current.ty,
      startX: e.clientX,
      startY: e.clientY,
    }
    if (tRef.current.scale > 1) setIsDragging(true)
  }, [])

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragRef.current) return
      const dx = e.clientX - dragRef.current.startX
      const dy = e.clientY - dragRef.current.startY
      if (!didDragRef.current && Math.hypot(dx, dy) > 5) {
        didDragRef.current = true
      }
      if (tRef.current.scale > 1 || didDragRef.current) {
        apply(tRef.current.scale, e.clientX - dragRef.current.ox, e.clientY - dragRef.current.oy)
      }
    }
    const onUp = (e: MouseEvent) => {
      if (!dragRef.current) return
      if (!didDragRef.current) {
        // Clean click → place pin
        const rect = containerRef.current?.getBoundingClientRect()
        if (rect) {
          const { scale, tx, ty } = tRef.current
          const mx = e.clientX - rect.left
          const my = e.clientY - rect.top
          const px = Math.max(0, Math.min(100, (mx - tx) / (rect.width  * scale) * 100))
          const py = Math.max(0, Math.min(100, (my - ty) / (rect.height * scale) * 100))
          setPin({ x: parseFloat(px.toFixed(1)), y: parseFloat(py.toFixed(1)) })
        }
      }
      dragRef.current = null
      setIsDragging(false)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup',   onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup',   onUp)
    }
  }, [apply])

  // ── Touch ─────────────────────────────────────────────────
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
      didDragRef.current = true // pinch = not a pin click
    } else {
      pinchRef.current  = null
      didDragRef.current = false
    }
  }, [])

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    e.preventDefault()
    didDragRef.current = true
    if (e.touches.length === 2 && pinchRef.current) {
      const { dist, cx, cy, s0, tx0, ty0 } = pinchRef.current
      const nd = touchDist(e.touches[0], e.touches[1])
      const ns = Math.max(MIN_SCALE, Math.min(MAX_SCALE, s0 * nd / dist))
      apply(ns, cx - (cx - tx0) / s0 * ns, cy - (cy - ty0) / s0 * ns)
    } else if (e.touches.length === 1) {
      const prev = touchesRef.current.find((t) => t.id === e.touches[0].identifier)
      if (!prev) return
      apply(tRef.current.scale, tRef.current.tx + (e.touches[0].clientX - prev.x), tRef.current.ty + (e.touches[0].clientY - prev.y))
      touchesRef.current = touchesRef.current.map((t) =>
        t.id === e.touches[0].identifier ? { ...t, x: e.touches[0].clientX, y: e.touches[0].clientY } : t
      )
    }
  }, [apply])

  const onTouchEnd = useCallback((e: React.TouchEvent) => {
    if (e.touches.length < 2) pinchRef.current = null
    // Single-tap to pin
    if (e.changedTouches.length === 1 && !didDragRef.current) {
      const rect = containerRef.current?.getBoundingClientRect()
      if (rect) {
        const { scale, tx, ty } = tRef.current
        const mx = e.changedTouches[0].clientX - rect.left
        const my = e.changedTouches[0].clientY - rect.top
        const px = Math.max(0, Math.min(100, (mx - tx) / (rect.width  * scale) * 100))
        const py = Math.max(0, Math.min(100, (my - ty) / (rect.height * scale) * 100))
        setPin({ x: parseFloat(px.toFixed(1)), y: parseFloat(py.toFixed(1)) })
      }
    }
    touchesRef.current = Array.from(e.touches).map((t) => ({ id: t.identifier, x: t.clientX, y: t.clientY }))
  }, [])

  const others = existingLocations.filter((l) => l.id !== currentId)

  // ── Render ────────────────────────────────────────────────
  return (
    <div className="space-y-2">
      {/* Hidden inputs submitted with form */}
      <input type="hidden" name="x" value={pin.x} />
      <input type="hidden" name="y" value={pin.y} />

      {/* Label + coords */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <label className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
          🗺 Žemėlapis — spustelėk, kad nustatytum žymeklio poziciją
        </label>
        <div className="flex items-center gap-2 text-xs font-mono" style={{ color: 'var(--gold)' }}>
          <span>X: {pin.x.toFixed(1)}%</span>
          <span style={{ color: 'var(--text-muted)' }}>·</span>
          <span>Y: {pin.y.toFixed(1)}%</span>
          {(pin.x !== initialX || pin.y !== initialY) && (
            <button
              type="button"
              onClick={() => setPin({ x: initialX, y: initialY })}
              className="text-xs px-1.5 py-0.5 rounded transition-opacity hover:opacity-70"
              style={{ color: 'var(--text-muted)', border: '1px solid var(--bg-border)' }}
            >
              ↺ Reset
            </button>
          )}
        </div>
      </div>

      {/* Map container */}
      <div
        ref={containerRef}
        className="relative w-full overflow-hidden rounded-xl"
        style={{ aspectRatio: '4/3', minHeight: '240px', maxHeight: '480px', border: '1px solid rgba(212,175,55,0.2)' }}
      >
        {/* Zoomable inner */}
        <div
          ref={innerRef}
          className="absolute inset-0"
          style={{
            transform:       'translate(0px,0px) scale(1)',
            transformOrigin: '0 0',
            willChange:      'transform',
            touchAction:     'none',
            cursor:          isDragging ? 'grabbing' : 'crosshair',
          }}
          onMouseDown={onMouseDown}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          {/* Map image */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={MAP_IMAGE}
            alt="Ravenof žemėlapis"
            className="absolute inset-0 w-full h-full"
            style={{ objectFit: 'fill', display: 'block', pointerEvents: 'none' }}
            onError={(e) => { ;(e.currentTarget as HTMLImageElement).style.display = 'none' }}
          />

          {/* Dark overlay for readability */}
          <div className="absolute inset-0 pointer-events-none" style={{ background: 'rgba(5,5,12,0.25)' }} />

          {/* Other location markers */}
          {others.map((loc) => (
            <div
              key={loc.id}
              className="absolute pointer-events-none"
              style={{ left: `${loc.x}%`, top: `${loc.y}%`, transform: 'translate(-50%,-50%)', zIndex: 10 }}
              title={loc.name}
            >
              <div
                className="flex items-center justify-center w-4 h-4 rounded-full"
                style={{ background: 'rgba(212,175,55,0.3)', border: '1.5px solid rgba(212,175,55,0.6)' }}
              />
              <div
                className="absolute -top-5 left-1/2 -translate-x-1/2 whitespace-nowrap px-1 py-0.5 rounded text-center pointer-events-none"
                style={{ background: 'rgba(5,5,12,0.8)', color: 'rgba(212,175,55,0.7)', fontSize: '8px', fontFamily: 'var(--rvn-font-display)' }}
              >
                {loc.name}
              </div>
            </div>
          ))}

          {/* ── Active pin ── */}
          <div
            className="absolute pointer-events-none"
            style={{ left: `${pin.x}%`, top: `${pin.y}%`, transform: 'translate(-50%,-50%)', zIndex: 50 }}
          >
            {/* Pulse ring */}
            <div
              className="absolute rounded-full animate-ping"
              style={{ inset: '-6px', background: 'rgba(239,68,68,0.25)', border: '1px solid rgba(239,68,68,0.5)' }}
            />
            {/* Pin body */}
            <div
              className="relative flex items-center justify-center w-7 h-7 rounded-full"
              style={{ background: 'rgba(239,68,68,0.85)', border: '2px solid #ef4444', boxShadow: '0 0 12px rgba(239,68,68,0.6)' }}
            >
              <span style={{ fontSize: '14px', lineHeight: 1 }}>📍</span>
            </div>
            {/* Coordinate tooltip */}
            <div
              className="absolute top-full left-1/2 mt-1 -translate-x-1/2 whitespace-nowrap px-2 py-0.5 rounded text-xs"
              style={{ background: 'rgba(5,5,12,0.9)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)', fontFamily: 'monospace' }}
            >
              {pin.x.toFixed(1)}, {pin.y.toFixed(1)}
            </div>
          </div>
        </div>

        {/* ── Fixed UI overlays ── */}

        {/* Zoom controls */}
        <div className="absolute top-2 right-2 z-20 flex flex-col gap-1">
          <button
            type="button"
            onClick={zoomIn}
            className="w-7 h-7 rounded flex items-center justify-center font-bold text-sm transition-opacity hover:opacity-80"
            style={{ background: 'rgba(5,5,12,0.88)', border: '1px solid rgba(212,175,55,0.3)', color: 'var(--gold)', backdropFilter: 'blur(8px)' }}
          >+</button>
          <button
            type="button"
            onClick={zoomOut}
            className="w-7 h-7 rounded flex items-center justify-center font-bold text-sm transition-opacity hover:opacity-80"
            style={{ background: 'rgba(5,5,12,0.88)', border: '1px solid rgba(212,175,55,0.3)', color: 'var(--gold)', backdropFilter: 'blur(8px)' }}
          >−</button>
          {displayScale > 1.05 && (
            <button
              type="button"
              onClick={resetZoom}
              className="w-7 h-7 rounded flex items-center justify-center text-xs transition-opacity hover:opacity-80"
              style={{ background: 'rgba(5,5,12,0.88)', border: '1px solid rgba(212,175,55,0.15)', color: 'var(--text-muted)', backdropFilter: 'blur(8px)' }}
            >⊙</button>
          )}
        </div>

        {/* Scale badge */}
        {displayScale > 1.05 && (
          <div
            className="absolute bottom-2 left-2 z-20 pointer-events-none px-2 py-0.5 rounded text-xs"
            style={{ background: 'rgba(5,5,12,0.75)', color: 'var(--text-muted)', fontFamily: 'monospace' }}
          >
            {displayScale.toFixed(1)}×
          </div>
        )}

        {/* Hint */}
        <div
          className="absolute bottom-2 right-2 z-20 pointer-events-none px-2 py-1 rounded text-xs"
          style={{ background: 'rgba(5,5,12,0.75)', color: 'var(--text-muted)', backdropFilter: 'blur(4px)', fontSize: '10px' }}
        >
          Scroll = zoom · Drag = pan · Click = pin
        </div>
      </div>
    </div>
  )
}
