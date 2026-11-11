// ── Maži linijiniai UI ženklai kovos ekranui (761) ───────────────────────────
// Pakeičia emoji (🐞 🔄 👁), kurie kiekvienoje sistemoje atrodo kitaip ir kertasi
// su pieštu UI rinkiniu. Spalva – `currentColor`, tad paveldi mygtuko / teksto spalvą.
import type { CSSProperties } from 'react'

type P = { size?: number; style?: CSSProperties; className?: string }
const base = (size: number) => ({ width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true })

export function BugIcon({ size = 16, style, className }: P) {
  return (
    <svg {...base(size)} style={style} className={className}>
      <ellipse cx="12" cy="14" rx="4.6" ry="5.6" />
      <path d="M9.2 8.6a2.9 2.9 0 0 1 5.6 0" />
      <path d="M12 9v10.5M7.4 12.5H3.8M20.2 12.5h-3.6M7.8 16.5l-3 1.8M16.2 16.5l3 1.8M8.4 9.6 5.6 7.4M15.6 9.6l2.8-2.2M9.6 5.6 8.4 3.8M14.4 5.6l1.2-1.8" />
    </svg>
  )
}

export function RotateIcon({ size = 48, style, className }: P) {
  return (
    <svg {...base(size)} style={style} className={className}>
      <rect x="8" y="3.5" width="8" height="13" rx="1.6" transform="rotate(-28 12 10)" />
      <path d="M4 17.5c2.4 2.6 6 3.8 9.6 3.2 2.4-.4 4.5-1.6 6-3.3" />
      <path d="M19.9 13.6l-.2 3.9-3.8-.5" />
    </svg>
  )
}

export function EyeIcon({ size = 10, style, className }: P) {
  return (
    <svg {...base(size)} style={style} className={className}>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
      <circle cx="12" cy="12" r="2.8" />
    </svg>
  )
}
