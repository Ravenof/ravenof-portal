'use client'

// ── React Flow custom mazgai: Misija / Cutscene / Trigeris ───────────────────
// Tamsi dark-fantasy stilistika, spalvoti handle'ai: next (auksinis, dešinėje),
// pre (mėlynas) / post (žalias) / fail (raudonas) apačioje, triggers (violetinis).

import { Handle, Position, type Node, type NodeProps } from '@xyflow/react'
import type { FlowNodeData } from './flowModel'

type FlowRFNode = Node<FlowNodeData>
type FlowRFNodeProps = NodeProps<FlowRFNode>

const GOLD = 'rgb(240,180,41)'
export const EDGE_COLORS = {
  flow: GOLD,
  pre: '#60a5fa',
  post: '#34d399',
  fail: '#f87171',
  ruleLink: 'rgba(167,139,250,0.5)',
  ruleCutscene: '#a78bfa',
} as const

const MISSION_ICONS: Record<string, string> = {
  battle: '⚔️', story: '📖', boss: '💀', siege: '🏰', gate: '🚪', wave: '🌊', elite: '⭐', reward: '🎁', lock: '🔒',
}

const handleStyle = (color: string): React.CSSProperties => ({
  width: 11, height: 11, background: color, border: '2px solid #0a0812',
})

export function MissionFlowNode({ data, selected }: FlowRFNodeProps) {
  return (
    <div style={{
      width: 200, borderRadius: 12, padding: '10px 12px', position: 'relative',
      background: 'linear-gradient(160deg, #1d1628, #0e0a16)',
      border: `1.5px solid ${selected ? GOLD : data.isStart ? 'rgba(240,180,41,0.55)' : 'rgba(255,255,255,0.14)'}`,
      boxShadow: selected ? `0 0 0 2px rgba(240,180,41,0.25), 0 8px 24px rgba(0,0,0,0.5)` : '0 6px 18px rgba(0,0,0,0.45)',
      opacity: data.status === 'draft' ? 0.65 : 1,
    }}>
      <Handle type="target" position={Position.Left} id="prev" style={handleStyle(GOLD)} />
      <Handle type="source" position={Position.Right} id="next" style={handleStyle(GOLD)} />
      <Handle type="source" position={Position.Bottom} id="pre" style={{ ...handleStyle(EDGE_COLORS.pre), left: '22%' }} />
      <Handle type="source" position={Position.Bottom} id="post" style={{ ...handleStyle(EDGE_COLORS.post), left: '50%' }} />
      <Handle type="source" position={Position.Bottom} id="fail" style={{ ...handleStyle(EDGE_COLORS.fail), left: '78%' }} />
      <Handle type="source" position={Position.Top} id="triggers" style={{ ...handleStyle('#a78bfa'), left: '85%' }} />

      <div className="flex items-center gap-1.5">
        <span style={{ fontSize: 15 }}>{MISSION_ICONS[data.iconType ?? 'battle'] ?? '⚔️'}</span>
        <span className="text-[12px] font-bold truncate" style={{ color: '#f3ead3', fontFamily: 'var(--rvn-font-display)' }} title={data.label}>
          {data.isStart ? '★ ' : ''}{data.label}
        </span>
      </div>
      <p className="text-[9px] mt-0.5 truncate" style={{ color: 'rgba(200,190,170,0.55)' }}>
        {data.missionType}{data.status === 'draft' ? ' · draft' : ''}
      </p>
      <div className="flex justify-between text-[8px] mt-1.5" style={{ color: 'rgba(200,190,170,0.4)' }}>
        <span style={{ color: EDGE_COLORS.pre }}>pre</span>
        <span style={{ color: EDGE_COLORS.post }}>post</span>
        <span style={{ color: EDGE_COLORS.fail }}>fail</span>
      </div>
    </div>
  )
}

export function CutsceneFlowNode({ data, selected }: FlowRFNodeProps) {
  const mc = data.cutsceneFormat === 'motion_comic'
  return (
    <div style={{
      width: 180, borderRadius: 999, padding: '9px 16px', position: 'relative',
      background: mc ? 'linear-gradient(160deg, #241a33, #140e20)' : 'linear-gradient(160deg, #1a1a26, #0d0d16)',
      border: `1.5px solid ${selected ? '#a78bfa' : 'rgba(167,139,250,0.4)'}`,
      boxShadow: '0 6px 18px rgba(0,0,0,0.45)',
    }}>
      <Handle type="target" position={Position.Left} id="in" style={handleStyle('#a78bfa')} />
      <div className="flex items-center gap-1.5">
        <span style={{ fontSize: 14 }}>{mc ? '🎞' : '🎬'}</span>
        <span className="text-[11px] font-bold truncate" style={{ color: '#e6ddf5' }} title={data.label}>{data.label}</span>
      </div>
      {data.sub && <p className="text-[9px] truncate" style={{ color: 'rgba(200,190,220,0.5)' }}>{data.sub}</p>}
    </div>
  )
}

export function TriggerFlowNode({ data, selected }: FlowRFNodeProps) {
  return (
    <div style={{
      minWidth: 120, maxWidth: 170, borderRadius: 8, padding: '6px 10px', position: 'relative',
      background: 'rgba(30,22,44,0.95)',
      border: `1.5px dashed ${selected ? '#a78bfa' : 'rgba(167,139,250,0.45)'}`,
    }}>
      <Handle type="target" position={Position.Top} id="in" style={handleStyle('rgba(167,139,250,0.7)')} />
      <Handle type="source" position={Position.Right} id="out" style={handleStyle('#a78bfa')} />
      <div className="flex items-center gap-1">
        <span style={{ fontSize: 11 }}>⚡</span>
        <span className="text-[10px] font-bold truncate" style={{ color: '#cabffa' }} title={data.label}>{data.label}</span>
      </div>
      {data.sub && <p className="text-[8.5px] italic truncate" style={{ color: 'rgba(200,190,220,0.45)' }}>„{data.sub}“</p>}
    </div>
  )
}
