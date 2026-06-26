'use client'

// ── Admin map editor: place / drag / connect campaign nodes on the map image ──
import { useRef, useState } from 'react'
import { ATLAS_MAP } from '@/lib/campaign/missionLoader'
import type { Campaign, CampaignNode, NodeIconType } from '@/lib/campaign/types'

const ICON: Record<NodeIconType, string> = {
  battle: '⚔', story: '📜', boss: '☠', siege: '🔥', gate: '🚪', wave: '🌊', elite: '✦', reward: '🎁', lock: '🔒',
}

export function AdminCampaignMapEditor({ campaign, nodes, selectedId, connectFrom, onAddNode, onMoveNode, onSelectNode, onToggleConnect }: {
  campaign: Campaign
  nodes: CampaignNode[]
  selectedId: string | null
  connectFrom: string | null
  onAddNode: (x: number, y: number) => void
  onMoveNode: (id: string, x: number, y: number) => void
  onSelectNode: (id: string) => void
  onToggleConnect: (id: string) => void
}) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const [dragId, setDragId] = useState<string | null>(null)
  const mapSrc = campaign.mapImageUrl || ATLAS_MAP
  const byId = new Map(nodes.map((n) => [n.id, n]))

  const pct = (e: { clientX: number; clientY: number }) => {
    const r = wrapRef.current!.getBoundingClientRect()
    return { x: Math.max(0, Math.min(100, ((e.clientX - r.left) / r.width) * 100)),
             y: Math.max(0, Math.min(100, ((e.clientY - r.top) / r.height) * 100)) }
  }

  return (
    <div>
      <p className="text-[11px] mb-2" style={{ color: 'var(--text-muted)' }}>
        Spausk ant žemėlapio – sukurs mazgą. Tempk mazgą – perkelsi. Pažymėk mazgą, spausk „🔗 Jungti“ ir spausk kitą mazgą – sukurs kelią.
      </p>
      <div ref={wrapRef} className="relative w-full overflow-hidden rounded-xl select-none"
        style={{ border: '1px solid var(--bg-border)', background: '#08060e', aspectRatio: `${campaign.mapNaturalW} / ${campaign.mapNaturalH}` }}
        onClick={(e) => { if (dragId) return; const p = pct(e); onAddNode(p.x, p.y) }}>
        <img src={mapSrc} alt="" draggable={false} className="absolute inset-0 w-full h-full object-cover" style={{ opacity: 0.8 }} />
        <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
          {nodes.flatMap((n) => (n.nextNodeIds ?? []).map((nx) => {
            const b = byId.get(nx); if (!b) return null
            return <line key={n.id + nx} x1={n.posX} y1={n.posY} x2={b.posX} y2={b.posY} stroke="rgba(240,180,41,0.6)" strokeWidth={0.5} vectorEffect="non-scaling-stroke" />
          }))}
        </svg>
        {nodes.map((n) => {
          const sel = n.id === selectedId, isFrom = n.id === connectFrom
          return (
            <div key={n.id} className="absolute -translate-x-1/2 -translate-y-1/2 cursor-move"
              style={{ left: `${n.posX}%`, top: `${n.posY}%`, zIndex: sel ? 5 : 2 }}
              onClick={(e) => { e.stopPropagation(); onSelectNode(n.id) }}
              onPointerDown={(e) => { e.stopPropagation(); (e.target as HTMLElement).setPointerCapture(e.pointerId); setDragId(n.id) }}
              onPointerMove={(e) => { if (dragId === n.id) { const p = pct(e); onMoveNode(n.id, Math.round(p.x * 10) / 10, Math.round(p.y * 10) / 10) } }}
              onPointerUp={() => setDragId(null)}>
              <span className="flex items-center justify-center rounded-full" style={{
                width: 26, height: 26, fontSize: 12,
                background: n.status === 'hidden' ? 'rgba(40,40,50,0.9)' : 'rgba(40,30,12,0.95)',
                border: `2px solid ${isFrom ? '#60a5fa' : sel ? '#fff' : 'rgba(240,180,41,0.85)'}`,
                boxShadow: sel ? '0 0 12px rgba(255,255,255,0.6)' : 'none', color: '#f3ead3' }}>
                {ICON[n.iconType] ?? '⚔'}
              </span>
            </div>
          )
        })}
      </div>
      {selectedId && (
        <button onClick={() => onToggleConnect(selectedId)}
          className="mt-2 px-3 py-1.5 rounded-lg text-xs font-bold"
          style={{ background: connectFrom ? 'rgba(96,165,250,0.2)' : 'rgba(240,180,41,0.15)', border: '1px solid ' + (connectFrom ? '#60a5fa' : 'rgba(240,180,41,0.4)'), color: connectFrom ? '#93c5fd' : 'var(--gold)' }}>
          {connectFrom ? '🔗 Jungimo režimas: spausk tikslo mazgą (arba čia – atšaukti)' : '🔗 Jungti iš šio mazgo'}
        </button>
      )}
    </div>
  )
}
