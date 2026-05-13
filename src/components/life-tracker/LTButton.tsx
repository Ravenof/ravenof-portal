'use client'

import { ButtonHTMLAttributes, ReactNode, useState } from 'react'

export type LTVariant =
  | 'primary'    // Kitas ėjimas — gold
  | 'battle'     // Kovos režimas — violet
  | 'secondary'  // Nauja partija — silver-dark
  | 'muted'      // Atšaukti — dim
  | 'danger'     // Išeiti — crimson
  | 'damage'     // -10 / -5 / -1 — dark red
  | 'heal'       // +1 / +5 / +10 — dark green
  | 'gold'       // ±100 gold — dark gold

export type LTSize = 'xs' | 'sm' | 'md' | 'lg'

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: LTVariant
  size?: LTSize
  fullWidth?: boolean
  children: ReactNode
}

const SIZES: Record<LTSize, React.CSSProperties> = {
  xs: { padding: '5px 10px',  fontSize: '0.7rem',  minHeight: '32px', borderRadius: '6px' },
  sm: { padding: '7px 12px',  fontSize: '0.75rem', minHeight: '38px', borderRadius: '8px' },
  md: { padding: '10px 16px', fontSize: '0.875rem',minHeight: '44px', borderRadius: '10px' },
  lg: { padding: '13px 24px', fontSize: '1rem',    minHeight: '52px', borderRadius: '10px' },
}

type VDef = { base: React.CSSProperties; hover: React.CSSProperties; press: React.CSSProperties }

const V: Record<LTVariant, VDef> = {
  primary: {
    base:  { background: 'linear-gradient(180deg,#231a06,#0f0c03)', border: '1.5px solid #d4af37', color: '#d4af37', boxShadow: '0 0 8px rgba(212,175,55,.22),inset 0 1px 0 rgba(212,175,55,.1)' },
    hover: { background: 'linear-gradient(180deg,#2c2108,#140f03)', border: '1.5px solid #e8c84a', boxShadow: '0 0 18px rgba(212,175,55,.45),inset 0 1px 0 rgba(212,175,55,.14)' },
    press: { transform: 'scale(0.97)', boxShadow: '0 0 5px rgba(212,175,55,.15)' },
  },
  battle: {
    base:  { background: 'linear-gradient(135deg,#2d1b69,#1a0f45)', border: '1.5px solid #7c3aed', color: '#ddd6fe', boxShadow: '0 0 10px rgba(124,58,237,.32)' },
    hover: { background: 'linear-gradient(135deg,#3b2480,#22155a)', border: '1.5px solid #a78bfa', boxShadow: '0 0 20px rgba(124,58,237,.55)' },
    press: { transform: 'scale(0.97)' },
  },
  secondary: {
    base:  { background: 'linear-gradient(180deg,#1c1c1c,#0f0f0f)', border: '1.5px solid #3a3a3a', color: '#c0c0c0' },
    hover: { background: 'linear-gradient(180deg,#242424,#161616)', border: '1.5px solid #585858', color: '#e0e0e0' },
    press: { transform: 'scale(0.97)' },
  },
  muted: {
    base:  { background: 'rgba(255,255,255,.03)', border: '1px solid #252525', color: '#606060' },
    hover: { background: 'rgba(255,255,255,.06)', border: '1px solid #383838', color: '#888' },
    press: { transform: 'scale(0.97)' },
  },
  danger: {
    base:  { background: 'linear-gradient(180deg,#2d0a0a,#180505)', border: '1.5px solid #7f1d1d', color: '#fca5a5', boxShadow: '0 0 6px rgba(239,68,68,.18)' },
    hover: { background: 'linear-gradient(180deg,#3d0d0d,#200606)', border: '1.5px solid #b91c1c', boxShadow: '0 0 14px rgba(239,68,68,.35)' },
    press: { transform: 'scale(0.97)' },
  },
  damage: {
    base:  { background: 'linear-gradient(180deg,#2d0808,#1a0404)', border: '1.5px solid rgba(239,68,68,.38)', color: '#f87171' },
    hover: { background: 'linear-gradient(180deg,#3a0a0a,#210505)', border: '1.5px solid rgba(239,68,68,.65)', boxShadow: '0 0 10px rgba(239,68,68,.28)' },
    press: { transform: 'scale(0.94)' },
  },
  heal: {
    base:  { background: 'linear-gradient(180deg,#062b12,#031608)', border: '1.5px solid rgba(34,197,94,.38)', color: '#4ade80' },
    hover: { background: 'linear-gradient(180deg,#083618,#041c0b)', border: '1.5px solid rgba(34,197,94,.65)', boxShadow: '0 0 10px rgba(34,197,94,.28)' },
    press: { transform: 'scale(0.94)' },
  },
  gold: {
    base:  { background: 'linear-gradient(180deg,#1a1205,#0d0900)', border: '1.5px solid rgba(212,175,55,.5)', color: '#d4af37', boxShadow: '0 0 5px rgba(212,175,55,.15)' },
    hover: { background: 'linear-gradient(180deg,#231603,#110a00)', border: '1.5px solid rgba(212,175,55,.82)', boxShadow: '0 0 12px rgba(212,175,55,.32)' },
    press: { transform: 'scale(0.95)' },
  },
}

export function LTButton({
  variant = 'secondary',
  size = 'md',
  fullWidth = false,
  children,
  style,
  disabled,
  onMouseEnter,
  onMouseLeave,
  onMouseDown,
  onMouseUp,
  ...rest
}: Props) {
  const [hov, setHov] = useState(false)
  const [press, setPress] = useState(false)

  const def = V[variant]
  const sz  = SIZES[size]

  const computed: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.35rem',
    fontFamily: 'Cinzel, Georgia, serif',
    fontWeight: 700,
    cursor: disabled ? 'not-allowed' : 'pointer',
    userSelect: 'none',
    transition: 'box-shadow .15s ease, border-color .15s ease, background .15s ease, transform .1s ease',
    width: fullWidth ? '100%' : undefined,
    textAlign: 'center' as const,
    lineHeight: 1.25,
    whiteSpace: 'nowrap' as const,
    ...sz,
    ...def.base,
    ...(hov && !disabled   ? def.hover : {}),
    ...(press && !disabled ? def.press : {}),
    ...(disabled ? { opacity: 0.35, cursor: 'not-allowed', transform: 'none' } : {}),
    ...style,
  }

  return (
    <button
      {...rest}
      disabled={disabled}
      style={computed}
      onMouseEnter={(e) => { setHov(true);   onMouseEnter?.(e) }}
      onMouseLeave={(e) => { setHov(false); setPress(false); onMouseLeave?.(e) }}
      onMouseDown={(e)  => { setPress(true);  onMouseDown?.(e) }}
      onMouseUp={(e)    => { setPress(false); onMouseUp?.(e) }}
    >
      {children}
    </button>
  )
}
