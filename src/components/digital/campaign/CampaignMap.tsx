'use client'

// ════════════════════════════════════════════════════════════════════════════
// CampaignMap — full-bleed Atlas campaign map with smooth pan / zoom.
// Fills its parent (use a full-screen parent). Controls: drag to pan, wheel /
// pinch to zoom (anchored to cursor), double-click/tap to zoom in/out. Nodes by %.
// ════════════════════════════════════════════════════════════════════════════

import { useCallback, useEffect, useRef, useState } from 'react'
import { ATLAS_MAP } from '@/lib/campaign/missionLoader'
import type { Campaign, NodeView, NodeIconType } from '@/lib/campaign/types'

const ICON: Record<NodeIconType, string> = {
  battle: '⚔', story: '📜', boss: '☠', siege: '🔥', gate: '🚪',
  wave: '🌊', elite: '✦', reward: '🎁', lock: '🔒',
}
const STATE_STYLE: Record<NodeView['state'], { ring: string; bg: string; glow: string; op: number }> = {
  locked:    { ring: 'rgba(120,120,140,0.55)', bg: 'rgba(18,16,24,0.92)', glow: 'none', op: 0.6 },
  available: { ring: 'rgba(240,180,41,0.95)',  bg: 'rgba(40,30,12,0.96)', glow: '0 0 16px rgba(240,180,41,0.6)', op: 1 },
  current:   { ring: 'rgba(255,212,90,1)',     bg: 'rgba(62,46,14,0.97)', glow: '0 0 26px rgba(240,180,41,0.9)', op: 1 },
  completed: { ring: 'rgba(52,211,153,0.9)',   bg: 'rgba(12,34,26,0.96)', glow: '0 0 12px rgba(52,211,153,0.45)', op: 1 },
}
const MIN = 1, MAX = 5

export function CampaignMap({ campaign, nodes, onSelect }: {
  campaign: Campaign
  nodes: NodeView[]
  onSelect: (n: NodeView) => void
}) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const innerRef = useRef<HTMLDivElement>(null)
  const t = useRef({ scale: 1, tx: 0, ty: 0 })
  const [, force] = useState(0)
  const drag = useRef<{ x: number; y: number; tx: number; ty: number; moved: boolean; id: number } | null>(null)
  const pinch = useRef<{ d: number; s: number; cx: number; cy: number } | null>(null)
  const [smooth, setSmooth] = useState(true)
  const lastTap = useRef(0)
  const panned = useRef(false)  // true if the last gesture was a pan (suppress node click)

  const mapSrc = campaign.mapImageUrl || ATLAS_MAP
  const byId = new Map(nodes.map((n) => [n.id, n]))

  const clampScale = (s: number) => Math.max(MIN, Math.min(MAX, s))

  const clampT = useCallback((tx: number, ty: number, scale: number) => {
    const el = wrapRef.current, inner = innerRef.current
    if (!el || !inner) return { tx, ty }
    const W = el.clientWidth, H = el.clientHeight
    const cw = inner.offsetWidth * scale, ch = inner.offsetHeight * scale
    const nx = cw <= W ? (W - cw) / 2 : Math.min(0, Math.max(W - cw, tx))
    const ny = ch <= H ? (H - ch) / 2 : Math.min(0, Math.max(H - ch, ty))
    return { tx: nx, ty: ny }
  }, [])

  const apply = useCallback(() => {
    const c = clampT(t.current.tx, t.current.ty, t.current.scale)
    t.current.tx = c.tx; t.current.ty = c.ty
    if (innerRef.current) innerRef.current.style.transform = `translate3d(${c.tx}px,${c.ty}px,0) scale(${t.current.scale})`
    force((x) => x + 1)
  }, [clampT])

  // center on the current/available node once the image is sized
  const centerOnActive = useCallback(() => {
    const el = wrapRef.current, inner = innerRef.current
    if (!el || !inner || !inner.offsetWidth) return
    const target = nodes.find((n) => n.state === 'current') ?? nodes.find((n) => n.state === 'available') ?? nodes[0]
    const s = 1.6
    t.current.scale = s
    if (target) {
      const px = (target.posX / 100) * inner.offsetWidth * s
      const py = (target.posY / 100) * inner.offsetHeight * s
      t.current.tx = el.clientWidth / 2 - px
      t.current.ty = el.clientHeight / 2 - py
    }
    apply()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apply])

  useEffect(() => {
    const img = innerRef.current?.querySelector('img')
    if (img && (img as HTMLImageElement).complete) centerOnActive()
    const onResize = () => apply()
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [centerOnActive, apply])

  const zoomAt = (factor: number, cx: number, cy: number) => {
    const el = wrapRef.current; if (!el) return
    const r = el.getBoundingClientRect()
    const px = cx - r.left, py = cy - r.top
    const old = t.current.scale
    const ns = clampScale(old * factor)
    if (ns === old) return
    // keep point under cursor stable
    t.current.tx = px - (px - t.current.tx) * (ns / old)
    t.current.ty = py - (py - t.current.ty) * (ns / old)
    t.current.scale = ns
    setSmooth(true); apply()
  }

  const onWheel = (e: React.WheelEvent) => { e.preventDefault(); zoomAt(e.deltaY < 0 ? 1.18 : 0.85, e.clientX, e.clientY) }

  const onPointerDown = (e: React.PointerEvent) => {
    if (pinch.current) return
    panned.current = false
    setSmooth(false)
    drag.current = { x: e.clientX, y: e.clientY, tx: t.current.tx, ty: t.current.ty, moved: false, id: e.pointerId }
  }
  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current; if (!d || d.id !== e.pointerId) return
    if (e.buttons === 0 && e.pointerType === 'mouse') { drag.current = null; return }
    const dx = e.clientX - d.x, dy = e.clientY - d.y
    if (!d.moved && Math.abs(dx) + Math.abs(dy) > 6) {
      d.moved = true
      panned.current = true
      ;(e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId)
    }
    if (!d.moved) return
    t.current.tx = d.tx + dx; t.current.ty = d.ty + dy
    apply()
  }
  const endDrag = () => { setSmooth(true); drag.current = null }

  // pinch (touch)
  useEffect(() => {
    const el = wrapRef.current; if (!el) return
    const dist = (ts: TouchList) => Math.hypot(ts[0].clientX - ts[1].clientX, ts[0].clientY - ts[1].clientY)
    const mid = (ts: TouchList) => ({ x: (ts[0].clientX + ts[1].clientX) / 2, y: (ts[0].clientY + ts[1].clientY) / 2 })
    const onTS = (e: TouchEvent) => { if (e.touches.length === 2) { drag.current = null; const m = mid(e.touches); pinch.current = { d: dist(e.touches), s: t.current.scale, cx: m.x, cy: m.y } } }
    const onTM = (e: TouchEvent) => {
      if (e.touches.length === 2 && pinch.current) {
        e.preventDefault()
        const m = mid(e.touches)
        const ns = clampScale(pinch.current.s * (dist(e.touches) / pinch.current.d))
        const r = el.getBoundingClientRect(); const px = m.x - r.left, py = m.y - r.top
        const old = t.current.scale
        t.current.tx = px - (px - t.current.tx) * (ns / old)
        t.current.ty = py - (py - t.current.ty) * (ns / old)
        t.current.scale = ns; setSmooth(false); apply()
      }
    }
    const onTE = (e: TouchEvent) => { if (e.touches.length < 2) { pinch.current = null; setSmooth(true) } }
    el.addEventListener('touchstart', onTS, { passive: true })
    el.addEventListener('touchmove', onTM, { passive: false })
    el.addEventListener('touchend', onTE)
    return () => { el.removeEventListener('touchstart', onTS); el.removeEventListener('touchmove', onTM); el.removeEventListener('touchend', onTE) }
  }, [apply])

  const onDoubleClick = (e: React.MouseEvent) => zoomAt(t.current.scale < 2.4 ? 1.8 : (MIN / t.current.scale), e.clientX, e.clientY)
  const onTapZoom = (e: React.PointerEvent) => {
    const now = Date.now()
    if (now - lastTap.current < 280 && !drag.current?.moved) zoomAt(t.current.scale < 2.4 ? 1.8 : (MIN / t.current.scale), e.clientX, e.clientY)
    lastTap.current = now
  }

  const { scale } = t.current

  return (
    <div ref={wrapRef}
      className="absolute inset-0 overflow-hidden select-none"
      style={{ background: '#06040b', touchAction: 'none', cursor: drag.current?.moved ? 'grabbing' : 'grab' }}
      onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={(e) => { onTapZoom(e); endDrag() }}
      onPointerLeave={endDrag} onPointerCancel={endDrag} onWheel={onWheel} onDoubleClick={onDoubleClick}>
      <div ref={innerRef} className="absolute top-0 left-0 will-change-transform" style={{ width: '100%', transformOrigin: '0 0', transition: smooth ? 'transform 0.14s ease-out' : 'none' }}>
        <div className="relative w-full">
          <img src={mapSrc} alt={campaign.title} draggable={false} onLoad={centerOnActive}
            className="w-full block pointer-events-none" style={{ filter: 'saturate(0.92) brightness(0.82)' }} />
          {/* connection lines */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
            {nodes.flatMap((n) => (n.nextNodeIds ?? []).map((nx) => {
              const b = byId.get(nx); if (!b) return null
              const lit = n.state === 'completed' && b.state !== 'locked'
              return <line key={n.id + nx} x1={n.posX} y1={n.posY} x2={b.posX} y2={b.posY}
                stroke={lit ? 'rgba(240,180,41,0.8)' : 'rgba(180,170,160,0.3)'} strokeWidth={lit ? 0.5 : 0.4}
                strokeDasharray={lit ? '0' : '1.4 1.1'} vectorEffect="non-scaling-stroke" />
            }))}
          </svg>
          {/* nodes */}
          {nodes.map((n) => {
            const st = STATE_STYLE[n.state]
            const size = 34
            return (
              <button key={n.id}
                onPointerUp={(e) => { e.stopPropagation(); drag.current = null; setSmooth(true) }}
                onClick={(e) => { e.stopPropagation(); if (!panned.current && n.state !== 'locked') onSelect(n) }}
                className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center"
                style={{ left: `${n.posX}%`, top: `${n.posY}%`, opacity: st.op, zIndex: n.state === 'current' ? 6 : 3 }}>
                {(n.state === 'current') && <span className="absolute rounded-full animate-ping" style={{ width: size + 10, height: size + 10, border: '2px solid rgba(240,180,41,0.5)' }} />}
                <span className="flex items-center justify-center rounded-full"
                  style={{ width: size, height: size, fontSize: 16, background: st.bg, border: `2.5px solid ${st.ring}`, boxShadow: st.glow, color: '#f3ead3' }}>
                  {n.state === 'locked' ? '🔒' : ICON[n.iconType] ?? '⚔'}
                </span>
                {n.state === 'completed' && (
                  <span style={{ fontSize: 9, lineHeight: 1, marginTop: 1, color: '#fcd34d', textShadow: '0 1px 2px #000' }}>
                    {'★'.repeat(n.stars)}{'☆'.repeat(Math.max(0, 3 - n.stars))}
                  </span>
                )}
                {(n.state === 'current' || n.state === 'available') && (
                  <span className="mt-0.5 px-1.5 rounded text-[8px] font-bold whitespace-nowrap"
                    style={{ background: 'rgba(6,4,11,0.9)', color: '#f3ead3', maxWidth: 92, overflow: 'hidden', textOverflow: 'ellipsis', boxShadow: '0 1px 3px #000' }}>
                    {n.title}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* zoom controls */}
      <div className="absolute bottom-4 right-3 flex flex-col gap-2 z-10">
        <button onPointerUp={(e) => { e.stopPropagation(); const r = wrapRef.current!.getBoundingClientRect(); zoomAt(1.4, r.left + r.width / 2, r.top + r.height / 2) }}
          className="flex items-center justify-center rounded-full text-xl font-bold" style={{ width: 42, height: 42, background: 'rgba(10,8,16,0.85)', border: '1px solid rgba(240,180,41,0.5)', color: 'var(--gold)' }}>+</button>
        <button onPointerUp={(e) => { e.stopPropagation(); const r = wrapRef.current!.getBoundingClientRect(); zoomAt(0.7, r.left + r.width / 2, r.top + r.height / 2) }}
          className="flex items-center justify-center rounded-full text-xl font-bold" style={{ width: 42, height: 42, background: 'rgba(10,8,16,0.85)', border: '1px solid rgba(240,180,41,0.5)', color: 'var(--gold)' }}>−</button>
        <button onPointerUp={(e) => { e.stopPropagation(); centerOnActive() }}
          className="flex items-center justify-center rounded-full text-base" style={{ width: 42, height: 42, background: 'rgba(10,8,16,0.85)', border: '1px solid rgba(240,180,41,0.5)', color: 'var(--gold)' }}>◎</button>
      </div>
      <div className="absolute bottom-4 left-3 px-2 py-1 rounded text-[10px] z-10" style={{ background: 'rgba(6,4,11,0.7)', color: 'var(--text-muted)' }}>
        {Math.round(scale * 100)}% · tempk / žnyplėk
      </div>
    </div>
  )
}
