'use client'

// ── Bendri Reitingo kovos UI elementai (raižyti oktagono kampai, dark fantasy) ─
import type { ReactNode } from 'react'

/** Aštrūs „išraižyti" kampai (oktagonas). */
export const oct = (b: number) =>
  `polygon(${b}px 0, calc(100% - ${b}px) 0, 100% ${b}px, 100% calc(100% - ${b}px), calc(100% - ${b}px) 100%, ${b}px 100%, 0 calc(100% - ${b}px), 0 ${b}px)`

/** Raudonas reitingo akcentas (atitinka /digital „PVP — RANGINĖ" plytelę). */
export const ACCENT = '239,68,68'

/** Raižyto rėmelio panelė su akcentine briauna. */
export function OctPanel({ children, accent = ACCENT, b = 14, className = '', style }: {
  children: ReactNode; accent?: string; b?: number; className?: string; style?: React.CSSProperties
}) {
  return (
    <div className={className} style={{ borderRadius: b + 4, background: `rgba(${accent},0.32)`, padding: 1.5, ...style }}>
      <div style={{ borderRadius: b + 3, background: `radial-gradient(120% 90% at 50% 0%, rgba(${accent},0.12), rgba(10,8,16,0.97) 62%), linear-gradient(160deg,#15101f,#0a0810)`, boxShadow: `inset 0 0 22px rgba(${accent},0.10)`, height: '100%' }}>
        {children}
      </div>
    </div>
  )
}

/** Sekcijos antraštė. */
export function SectionTitle({ icon, children }: { icon?: string; children: ReactNode }) {
  return (
    <h2 className="text-base font-bold flex items-center gap-2" style={{ fontFamily: 'var(--rvn-font-display)', color: 'var(--gold)', letterSpacing: '0.06em', textShadow: '0 0 12px rgba(240,180,41,0.35)' }}>
      {icon && <span>{icon}</span>}{children}
    </h2>
  )
}

/** Žaidimo stiliaus mygtukas (raudonas akcentas pagal nutylėjimą). */
export function RButton({ children, onClick, disabled, accent = ACCENT, full, tone = 'accent' }: {
  children: ReactNode; onClick?: () => void; disabled?: boolean; accent?: string; full?: boolean; tone?: 'accent' | 'muted' | 'gold'
}) {
  const col = tone === 'gold' ? '240,180,41' : tone === 'muted' ? '120,120,140' : accent
  const txt = tone === 'gold' ? 'var(--gold)' : tone === 'muted' ? 'var(--text-muted)' : '#fca5a5'
  return (
    <button type="button" onClick={onClick} disabled={disabled}
      className={`${full ? 'w-full ' : ''}px-4 py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-40 hover:scale-[1.02] active:scale-95`}
      style={{ background: `rgba(${col},0.18)`, border: `1px solid rgba(${col},0.55)`, color: txt, fontFamily: 'var(--rvn-font-display)', letterSpacing: '0.04em' }}>
      {children}
    </button>
  )
}
