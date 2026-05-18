import { type HTMLAttributes, type ReactNode } from 'react'

// ── Variant styles ────────────────────────────────────────────────────────────

const VARIANT_STYLES: Record<string, { wrapper: string; titleColor: string }> = {
  default: {
    wrapper:    'bg-[var(--bg-surface)] border border-[var(--bg-border)]',
    titleColor: 'text-[var(--text-secondary)]',
  },
  gold: {
    wrapper:    'bg-gradient-to-br from-[rgba(240,180,41,0.06)] to-[var(--bg-surface)] border border-[rgba(240,180,41,0.22)] shadow-[0_0_20px_rgba(240,180,41,0.06)]',
    titleColor: 'text-[var(--gold)]',
  },
  violet: {
    wrapper:    'bg-gradient-to-br from-[rgba(124,58,237,0.1)] to-[var(--bg-surface)] border border-[rgba(124,58,237,0.28)] shadow-[0_0_20px_rgba(124,58,237,0.08)]',
    titleColor: 'text-[#c4b5fd]',
  },
  danger: {
    wrapper:    'bg-gradient-to-br from-[rgba(220,38,38,0.08)] to-[var(--bg-surface)] border border-[rgba(220,38,38,0.28)]',
    titleColor: 'text-[#fca5a5]',
  },
  success: {
    wrapper:    'bg-gradient-to-br from-[rgba(22,163,74,0.08)] to-[var(--bg-surface)] border border-[rgba(22,163,74,0.28)]',
    titleColor: 'text-[#86efac]',
  },
}

// ── Props ─────────────────────────────────────────────────────────────────────

type PanelVariant = keyof typeof VARIANT_STYLES

interface RavenofPanelProps extends HTMLAttributes<HTMLDivElement> {
  variant?:    PanelVariant
  title?:      string
  /** Show gold divider under title */
  divider?:    boolean
  /** Add corner ornament pseudo-elements */
  ornament?:   boolean
  children:    ReactNode
  /** Extra padding override: 'sm' | 'md' | 'lg' */
  padding?:    'sm' | 'md' | 'lg' | 'none'
}

const PADDING_MAP = {
  sm:   'p-3',
  md:   'p-5',
  lg:   'p-7',
  none: 'p-0',
}

// ── Component ─────────────────────────────────────────────────────────────────

export function RavenofPanel({
  variant   = 'default',
  title,
  divider   = false,
  ornament  = false,
  padding   = 'md',
  children,
  className = '',
  ...rest
}: RavenofPanelProps) {
  const { wrapper, titleColor } = VARIANT_STYLES[variant] ?? VARIANT_STYLES.default
  const padClass = PADDING_MAP[padding]

  return (
    <div
      className={[
        'rounded-2xl overflow-hidden relative',
        wrapper,
        padClass,
        ornament ? 'rvn-corner' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...rest}
    >
      {title && (
        <>
          <p
            className="text-xs font-bold uppercase tracking-widest mb-3"
            style={{ fontFamily: 'var(--rvn-font-display)', letterSpacing: '0.1em' }}
          >
            <span className={titleColor}>{title}</span>
          </p>
          {divider && <div className="rvn-divider-gold mb-3" />}
        </>
      )}
      {children}
    </div>
  )
}

export default RavenofPanel
