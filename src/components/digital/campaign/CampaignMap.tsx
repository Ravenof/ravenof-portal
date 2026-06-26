'use client'

// ════════════════════════════════════════════════════════════════════════════
// CampaignMap — Atlas-style campaign world map with story nodes.
// Pan + pinch/wheel zoom over a map image; nodes placed by %; SVG path lines
// connect prev→next; node visual states (locked/available/current/completed).
// ════════════════════════════════════════════════════════════════════════════

import { useCallback, useEffect, useRef, useState } from 'react'
import { ATLAS_MAP } from '@/lib/campaign/missionLoader'
import type { Campaign, NodeView, NodeIconType } from '@/lib/campaign/types'

const ICON: Record<NodeIconType, string> = {
  battle: '⚔', story: '📜', boss: '☠', siege: '🔥', gate: '🚪',
  wave: '🌊', elite: '✦', reward: '🎁', lock: '🔒',
}

const STATE_STYLE: Record<NodeView['state'], { ring: string; bg: string; glow: string; op: number }> = {
  locked:    { ring: 'rgba(120,120,140,0.5)', bg: 'rgba(20,18,26,0.9)',  glow: 'none', op: 0.55 },
  available: { ring: 'rgba(240,180,41,0.9)',  bg: 'rgba(40,30,12,0.95)', glow: '0 0 14px rgba(240,180,41,0.55)', op: 1 },
  current:   { ring: 'rgba(255,210,90,1)',    bg: 'rgba(60,44,14,0.97)', glow: '0 0 22px rgba(240,180,41,0.85)', op: 1 },
  completed: { ring: 'rgba(52,211,153,0.85)', bg: 'rgba(12,34,26,0.95)', glow: '0 0 10px rgba(52,211,153,0.4)', op: 1 },
}

export function CampaignMap({ campaign, nodes, onSelect }: {
  campaign: Campaign
  nodes: NodeView[]
  onSelect: (n: NodeView) => void
}) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const tRef = useRef({ scale: 1, tx: 0, ty: 0 })
  const [, force] = useState(0)
  const dragRef = useRef<{ x: number; y: number; tx: number; ty: number; moved: boolean } | null>(null)
  const pinchRef = useRef<{ d: number; s: number } | null>(null)

  const mapSrc = campaign.mapImageUrl || ATLAS_MAP
  const byId = new Map(nodes.map((n) => [n.id, n]))

  const apply = useCallback(() => { force((x) => x + 1) }, [])

  const clamp = (s: number) => Math.max(1, Math.min(4, s))

  const onPointerDown = (e: React.PointerEvent) => {
    if (pinchRef.current) return
    ;(e.target as HTMLElement).setPointerCapture?.(e.pointerId)
    dragRef.current = { x: e.clientX, y: e.clientY, tx: tRef.current.tx, ty: tRef.current.ty, moved: false }
  }
  const onPointerMove = (e: React.PointerEvent) => {
    const d = dragRef.current
    if (!d) return
    const dx = e.clientX - d.x, dy = e.clientY - d.y
    if (Math.abs(dx) + Math.abs(dy) > 6) d.moved = true
    tRef.current.tx = d.tx + dx; tRef.current.ty = d.ty + dy
    apply()
  }
  const onPointerUp = () => { dragRef.current = null }

  const onWheel = (e: React.WheelEvent) => {
    const s = clamp(tRef.current.scale * (e.deltaY < 0 ? 1.12 : 0.9))
    tRef.current.scale = s; apply()
  }

  // pinch via touch
  useEffect(() => {
    const el = wrapRef.current; if (!el) return
    const touchDist = (t: TouchList) => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY)
    const onTS = (e: TouchEvent) => { if (e.touches.length === 2) pinchRef.current = { d: touchDist(e.touches), s: tRef.current.scale } }
    const onTM = (e: TouchEvent) => {
      if (e.touches.length === 2 && pinchRef.current) {
        e.preventDefault()
        tRef.current.scale = clamp(pinchRef.current.s * (touchDist(e.touches) / pinchRef.current.d)); apply()
      }
    }
    const onTE = (e: TouchEvent) => { if (e.touches.length < 2) pinchRef.current = null }
    el.addEventListener('touchstart', onTS, { passive: true })
    el.addEventListener('touchmove', onTM, { passive: false })
    el.addEventListener('touchend', onTE)
    return () => { el.removeEventListener('touchstart', onTS); el.removeEventListener('touchmove', onTM); el.removeEventListener('touchend', onTE) }
  }, [apply])

  const { scale, tx, ty } = tRef.current

  return (
    <div ref={wrapRef}
      className="relative w-full overflow-hidden rounded-2xl select-none"
      style={{ height: '62vh', minHeight: 360, border: '1px solid rgba(240,180,41,0.3)', background: '#08060e', touchAction: 'none', cursor: dragRef.current?.moved ? 'grabbing' : 'grab' }}
      onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerLeave={onPointerUp} onWheel={onWheel}>
      <div className="absolute top-0 left-0 origin-top-left"
        style={{ transform: `translate(${tx}px,${ty}px) scale(${scale})`, width: '100%' }}>
        <div className="relative w-full">
          <img src={mapSrc} alt={campaign.title} draggable={false} className="w-full block" style={{ filter: 'saturate(0.9) brightness(0.85)' }} />
          {/* connection lines */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
            {nodes.flatMap((n) => (n.nextNodeIds ?? []).map((nx) => {
              const b = byId.get(nx); if (!b) return null
              const done = n.state === 'completed' && (b.state === 'completed' || b.state === 'current' || b.state === 'available')
              return (
                <line key={n.id + nx} x1={n.posX} y1={n.posY} x2={b.posX} y2={b.posY}
                  stroke={done ? 'rgba(240,180,41,0.7)' : 'rgba(180,170,160,0.28)'}
                  strokeWidth={0.45} strokeDasharray={done ? '0' : '1.2 1'} vectorEffect="non-scaling-stroke" />
              )
            }))}
          </svg>
          {/* nodes */}
          {nodes.map((n) => {
            const st = STATE_STYLE[n.state]
            return (
              <button key={n.id}
                onClick={(e) => { e.stopPropagation(); if (!dragRef.current?.moved && n.state !== 'locked') onSelect(n) }}
                className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center"
                style={{ left: `${n.posX}%`, top: `${n.posY}%`, opacity: st.op }}>
                <span className="flex items-center justify-center rounded-full"
                  style={{ width: 30, height: 30, fontSize: 14, background: st.bg, border: `2px solid ${st.ring}`, boxShadow: st.glow, color: '#f3ead3' }}>
                  {n.state === 'locked' ? '🔒' : ICON[n.iconType] ?? '⚔'}
                </span>
                {n.state === 'completed' && (
                  <span style={{ fontSize: 8, lineHeight: 1, marginTop: 1, color: '#fcd34d' }}>
                    {'★'.repeat(n.stars)}{'☆'.repeat(Math.max(0, 3 - n.stars))}
                  </span>
                )}
                {(n.state === 'current' || n.state === 'available') && (
                  <span className="mt-0.5 px-1 rounded text-[7px] font-bold whitespace-nowrap"
                    style={{ background: 'rgba(8,6,14,0.85)', color: '#f3ead3', maxWidth: 70, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {n.title}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* zoom hint */}
      <div className="absolute bottom-2 left-2 px-2 py-1 rounded text-[10px]" style={{ background: 'rgba(8,6,14,0.7)', color: 'var(--text-muted)' }}>
        Tempk · žnyplėk priartinimui
      </div>
    </div>
  )
}
