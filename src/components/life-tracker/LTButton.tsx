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
  | 'gold'       // ±100 auksas — coin gold

export type LTSize = 'xs' | 'sm' | 'md' | 'lg'

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: LTVariant
  size?: LTSize
  fullWidth?: boolean
  children: ReactNode
}

const SIZES: Record<LTSize, React.CSSProperties> = {
  xs: { padding: '4px 9px',   fontSize: '0.68rem',  minHeight: '28px', borderRadius: '5px',  letterSpacing: '0.04em' },
  sm: { padding: '7px 13px',  fontSize: '0.75rem',  minHeight: '38px', borderRadius: '7px',  letterSpacing: '0.05em' },
  md: { padding: '10px 18px', fontSize: '0.875rem', minHeight: '44px', borderRadius: '9px',  letterSpacing: '0.06em' },
  lg: { padding: '13px 26px', fontSize: '1rem',     minHeight: '52px', borderRadius: '10px', letterSpacing: '0.07em' },
}

type VDef = { base: React.CSSProperties; hover: React.CSSProperties; press: React.CSSProperties }

// Bevel helper: top=highlight, right/left=mid, bottom=shadow
function bevel(top: string, mid: string, bot: string, w = '1.5px'): React.CSSProperties {
  return { borderTop: `${w} solid ${top}`, borderRight: `${w} solid ${mid}`, borderBottom: `${w} solid ${bot}`, borderLeft: `${w} solid ${mid}` }
}

const V: Record<LTVariant, VDef> = {
  // ── PRIMARY — gold ──────────────────────────────────────────────────────────
  primary: {
    base: {
      ...bevel('#e8c84a', '#a07820', '#5a3e08'),
      background: 'linear-gradient(180deg,#2c1f06 0%,#120c02 60%,#090600 100%)',
      color: '#d4af37',
      boxShadow: '0 2px 8px rgba(0,0,0,.65), 0 0 12px rgba(212,175,55,.28), inset 0 1px 0 rgba(232,200,74,.18), inset 0 -2px 5px rgba(0,0,0,.55)',
      textShadow: '0 0 10px rgba(212,175,55,.45)',
    },
    hover: {
      ...bevel('#f0d060', '#c49a28', '#7a5e10'),
      background: 'linear-gradient(180deg,#382806 0%,#170e02 60%,#0c0800 100%)',
      boxShadow: '0 2px 10px rgba(0,0,0,.7), 0 0 24px rgba(212,175,55,.55), inset 0 1px 0 rgba(240,208,96,.22), inset 0 -2px 5px rgba(0,0,0,.6)',
      textShadow: '0 0 16px rgba(212,175,55,.8)',
    },
    press: {
      transform: 'translateY(1px)',
      boxShadow: '0 1px 3px rgba(0,0,0,.6), 0 0 6px rgba(212,175,55,.18), inset 0 2px 7px rgba(0,0,0,.6)',
    },
  },

  // ── BATTLE — violet ─────────────────────────────────────────────────────────
  battle: {
    base: {
      ...bevel('#a78bfa', '#6d28d9', '#3b0764'),
      background: 'linear-gradient(160deg,#2d1b69 0%,#1a0f45 55%,#0f0930 100%)',
      color: '#ddd6fe',
      boxShadow: '0 2px 8px rgba(0,0,0,.65), 0 0 14px rgba(124,58,237,.32), inset 0 1px 0 rgba(167,139,250,.18), inset 0 -2px 5px rgba(0,0,0,.55)',
      textShadow: '0 0 10px rgba(167,139,250,.5)',
    },
    hover: {
      ...bevel('#c4b5fd', '#8b5cf6', '#4c1d95'),
      background: 'linear-gradient(160deg,#3b2480 0%,#22155a 55%,#160e40 100%)',
      boxShadow: '0 2px 10px rgba(0,0,0,.7), 0 0 28px rgba(124,58,237,.6), inset 0 1px 0 rgba(196,181,253,.22), inset 0 -2px 5px rgba(0,0,0,.6)',
      textShadow: '0 0 18px rgba(196,181,253,.85)',
    },
    press: {
      transform: 'translateY(1px)',
      boxShadow: '0 1px 3px rgba(0,0,0,.6), 0 0 8px rgba(124,58,237,.22), inset 0 2px 7px rgba(0,0,0,.6)',
    },
  },

  // ── SECONDARY — silver metal ─────────────────────────────────────────────────
  secondary: {
    base: {
      ...bevel('#5a5a5a', '#2e2e2e', '#141414'),
      background: 'linear-gradient(180deg,#222222 0%,#0f0f0f 100%)',
      color: '#b8b8b8',
      boxShadow: '0 2px 6px rgba(0,0,0,.6), inset 0 1px 0 rgba(255,255,255,.07), inset 0 -2px 4px rgba(0,0,0,.45)',
    },
    hover: {
      ...bevel('#767676', '#3e3e3e', '#1e1e1e'),
      background: 'linear-gradient(180deg,#2c2c2c 0%,#141414 100%)',
      color: '#d8d8d8',
      boxShadow: '0 2px 8px rgba(0,0,0,.65), inset 0 1px 0 rgba(255,255,255,.10), inset 0 -2px 4px rgba(0,0,0,.5)',
    },
    press: {
      transform: 'translateY(1px)',
      boxShadow: '0 1px 2px rgba(0,0,0,.55), inset 0 2px 6px rgba(0,0,0,.5)',
    },
  },

  // ── MUTED — dim ─────────────────────────────────────────────────────────────
  muted: {
    base: {
      ...bevel('#2e2e2e', '#1c1c1c', '#0c0c0c', '1px'),
      background: 'rgba(255,255,255,.02)',
      color: '#606060',
      boxShadow: 'inset 0 1px 0 rgba(255,255,255,.04), inset 0 -1px 3px rgba(0,0,0,.35)',
    },
    hover: {
      ...bevel('#444444', '#2a2a2a', '#141414', '1px'),
      background: 'rgba(255,255,255,.05)',
      color: '#888888',
      boxShadow: 'inset 0 1px 0 rgba(255,255,255,.07), inset 0 -1px 3px rgba(0,0,0,.4)',
    },
    press: {
      transform: 'translateY(1px)',
      boxShadow: 'inset 0 2px 5px rgba(0,0,0,.45)',
    },
  },

  // ── DANGER — crimson ─────────────────────────────────────────────────────────
  danger: {
    base: {
      ...bevel('#f87171', '#9b1c1c', '#5a0a0a'),
      background: 'linear-gradient(180deg,#3d0a0a 0%,#180404 100%)',
      color: '#fca5a5',
      boxShadow: '0 2px 8px rgba(0,0,0,.65), 0 0 12px rgba(239,68,68,.28), inset 0 1px 0 rgba(248,113,113,.15), inset 0 -2px 5px rgba(0,0,0,.55)',
      textShadow: '0 0 8px rgba(239,68,68,.4)',
    },
    hover: {
      ...bevel('#fca5a5', '#b91c1c', '#7f1d1d'),
      background: 'linear-gradient(180deg,#500d0d 0%,#200505 100%)',
      boxShadow: '0 2px 10px rgba(0,0,0,.7), 0 0 22px rgba(239,68,68,.55), inset 0 1px 0 rgba(252,165,165,.2), inset 0 -2px 5px rgba(0,0,0,.6)',
      textShadow: '0 0 14px rgba(239,68,68,.75)',
    },
    press: {
      transform: 'translateY(1px)',
      boxShadow: '0 1px 3px rgba(0,0,0,.6), 0 0 6px rgba(239,68,68,.18), inset 0 2px 7px rgba(0,0,0,.6)',
    },
  },

  // ── DAMAGE — dark red ────────────────────────────────────────────────────────
  damage: {
    base: {
      ...bevel('rgba(248,113,113,.55)', 'rgba(239,68,68,.3)', 'rgba(127,29,29,.6)'),
      background: 'linear-gradient(180deg,#3a0a0a 0%,#1a0303 100%)',
      color: '#f87171',
      boxShadow: '0 2px 5px rgba(0,0,0,.55), inset 0 1px 0 rgba(248,113,113,.1), inset 0 -1px 4px rgba(0,0,0,.5)',
    },
    hover: {
      ...bevel('rgba(252,165,165,.7)', 'rgba(239,68,68,.55)', 'rgba(153,27,27,.7)'),
      background: 'linear-gradient(180deg,#4a0d0d 0%,#220404 100%)',
      boxShadow: '0 2px 8px rgba(0,0,0,.6), 0 0 14px rgba(239,68,68,.32), inset 0 1px 0 rgba(252,165,165,.15), inset 0 -1px 4px rgba(0,0,0,.55)',
      textShadow: '0 0 8px rgba(248,113,113,.55)',
    },
    press: {
      transform: 'translateY(1px)',
      boxShadow: '0 1px 2px rgba(0,0,0,.55), inset 0 2px 6px rgba(0,0,0,.55)',
    },
  },

  // ── HEAL — dark green ────────────────────────────────────────────────────────
  heal: {
    base: {
      ...bevel('rgba(74,222,128,.55)', 'rgba(34,197,94,.3)', 'rgba(20,83,45,.6)'),
      background: 'linear-gradient(180deg,#052e14 0%,#021508 100%)',
      color: '#4ade80',
      boxShadow: '0 2px 5px rgba(0,0,0,.55), inset 0 1px 0 rgba(74,222,128,.1), inset 0 -1px 4px rgba(0,0,0,.5)',
    },
    hover: {
      ...bevel('rgba(134,239,172,.7)', 'rgba(34,197,94,.55)', 'rgba(22,101,52,.7)'),
      background: 'linear-gradient(180deg,#073d1a 0%,#031c0a 100%)',
      boxShadow: '0 2px 8px rgba(0,0,0,.6), 0 0 14px rgba(34,197,94,.32), inset 0 1px 0 rgba(134,239,172,.15), inset 0 -1px 4px rgba(0,0,0,.55)',
      textShadow: '0 0 8px rgba(74,222,128,.55)',
    },
    press: {
      transform: 'translateY(1px)',
      boxShadow: '0 1px 2px rgba(0,0,0,.55), inset 0 2px 6px rgba(0,0,0,.55)',
    },
  },

  // ── GOLD — coin ──────────────────────────────────────────────────────────────
  gold: {
    base: {
      ...bevel('#f0c040', 'rgba(196,154,40,.65)', 'rgba(90,62,16,.7)'),
      background: 'linear-gradient(180deg,#1e1405 0%,#0a0700 100%)',
      color: '#d4af37',
      boxShadow: '0 2px 5px rgba(0,0,0,.55), 0 0 8px rgba(212,175,55,.2), inset 0 1px 0 rgba(240,192,64,.14), inset 0 -1px 4px rgba(0,0,0,.5)',
      textShadow: '0 0 8px rgba(212,175,55,.4)',
    },
    hover: {
      ...bevel('#f8d060', 'rgba(212,175,55,.8)', 'rgba(122,94,16,.8)'),
      background: 'linear-gradient(180deg,#281c06 0%,#0e0a01 100%)',
      boxShadow: '0 2px 8px rgba(0,0,0,.6), 0 0 18px rgba(212,175,55,.45), inset 0 1px 0 rgba(248,208,96,.18), inset 0 -1px 4px rgba(0,0,0,.55)',
      textShadow: '0 0 14px rgba(212,175,55,.75)',
    },
    press: {
      transform: 'translateY(1px)',
      boxShadow: '0 1px 2px rgba(0,0,0,.55), 0 0 4px rgba(212,175,55,.12), inset 0 2px 6px rgba(0,0,0,.55)',
    },
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
    transition: 'box-shadow .15s ease, border-color .15s ease, background .15s ease, transform .08s ease, text-shadow .15s ease',
    width: fullWidth ? '100%' : undefined,
    textAlign: 'center' as const,
    lineHeight: 1.25,
    whiteSpace: 'nowrap' as const,
    ...sz,
    ...def.base,
    ...(hov && !disabled   ? def.hover : {}),
    ...(press && !disabled ? def.press : {}),
    ...(disabled ? { opacity: 0.32, cursor: 'not-allowed', transform: 'none', textShadow: 'none' } : {}),
    ...style,
  }

  return (
    <button
      {...rest}
      disabled={disabled}
      style={computed}
      onMouseEnter={(e) => { setHov(true);                onMouseEnter?.(e) }}
      onMouseLeave={(e) => { setHov(false); setPress(false); onMouseLeave?.(e) }}
      onMouseDown={(e)  => { setPress(true);               onMouseDown?.(e) }}
      onMouseUp={(e)    => { setPress(false);              onMouseUp?.(e) }}
    >
      {children}
    </button>
  )
}
