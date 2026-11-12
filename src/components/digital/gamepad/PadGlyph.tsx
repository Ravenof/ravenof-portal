// Valdiklio mygtuko ženklas su spalva pagal prijungtą valdiklį (Xbox raidės / PlayStation figūros).
import type { PadBtn, PadType } from '@/lib/gamepad/core'

const XBOX: Partial<Record<PadBtn, { l: string; c: string }>> = {
  a: { l: 'A', c: '#6DC849' }, b: { l: 'B', c: '#E8423F' }, x: { l: 'X', c: '#3D8BF2' }, y: { l: 'Y', c: '#F6C338' },
}
const PS_COL: Partial<Record<PadBtn, string>> = { a: '#7C9CE8', b: '#EE6A68', x: '#DE8FC4', y: '#4CC3A2' }
const SHOULDER: Record<PadType, Partial<Record<PadBtn, string>>> = {
  xbox: { lb: 'LB', rb: 'RB', lt: 'LT', rt: 'RT', start: '☰', select: '⧉' },
  ps: { lb: 'L1', rb: 'R1', lt: 'L2', rt: 'R2', start: 'OPT', select: 'SHR' },
}

export function PadGlyph({ btn, type, size = 20 }: { btn: PadBtn; type: PadType; size?: number }) {
  const sh = SHOULDER[type][btn]
  if (sh) {
    return (
      <span aria-hidden style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', height: size, minWidth: size * 1.5, padding: '0 5px',
        borderRadius: size * 0.3, background: '#1b1722', border: '1px solid rgba(243,234,211,.55)', color: '#f3ead3', font: `700 ${Math.round(size * 0.5)}px/1 var(--ravenof-font-body, sans-serif)`, letterSpacing: 0.4 }}>{sh}</span>
    )
  }
  if (btn === 'up' || btn === 'down' || btn === 'left' || btn === 'right') {
    const rot = { up: 0, right: 90, down: 180, left: 270 }[btn]
    return (
      <svg aria-hidden width={size} height={size} viewBox="0 0 24 24" style={{ transform: `rotate(${rot}deg)` }}>
        <circle cx="12" cy="12" r="11" fill="#1b1722" stroke="rgba(243,234,211,.55)" />
        <path d="M12 6 L17 13 H7 Z" fill="#f3ead3" />
      </svg>
    )
  }
  if (type === 'ps') {
    const c = PS_COL[btn] ?? '#f3ead3'
    return (
      <svg aria-hidden width={size} height={size} viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="11" fill="#15121b" stroke={c} strokeWidth="1.2" />
        {btn === 'a' && <path d="M7.5 7.5 L16.5 16.5 M16.5 7.5 L7.5 16.5" stroke={c} strokeWidth="2.2" strokeLinecap="round" />}
        {btn === 'b' && <circle cx="12" cy="12" r="5.2" fill="none" stroke={c} strokeWidth="2.2" />}
        {btn === 'x' && <rect x="7.2" y="7.2" width="9.6" height="9.6" fill="none" stroke={c} strokeWidth="2.2" />}
        {btn === 'y' && <path d="M12 6.4 L17.4 16 H6.6 Z" fill="none" stroke={c} strokeWidth="2.2" strokeLinejoin="round" />}
      </svg>
    )
  }
  const x = XBOX[btn] ?? { l: '?', c: '#f3ead3' }
  return (
    <svg aria-hidden width={size} height={size} viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="11" fill="#15121b" stroke={x.c} strokeWidth="1.6" />
      <text x="12" y="16.4" textAnchor="middle" fontSize="12.5" fontWeight="800" fill={x.c} fontFamily="Arial, sans-serif">{x.l}</text>
    </svg>
  )
}
