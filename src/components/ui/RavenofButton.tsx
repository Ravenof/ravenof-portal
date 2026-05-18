import { type ButtonHTMLAttributes, type ReactNode, forwardRef } from 'react'

// ── Variant & size maps ───────────────────────────────────────────────────────

const VARIANT_STYLES: Record<string, string> = {
  primary:   'bg-[var(--rvn-violet)] hover:bg-[var(--rvn-violet-dim)] border-[rgba(124,58,237,0.5)] text-[#ede9fe] shadow-[0_0_14px_rgba(124,58,237,0.3)]',
  secondary: 'bg-[var(--bg-elevated)] hover:bg-[var(--bg-border)] border-[var(--bg-border)] text-[var(--text-secondary)]',
  battle:    'bg-gradient-to-br from-[#4c1d95] to-[#6d28d9] border-[#7c3aed] text-[#ede9fe] shadow-[0_0_14px_rgba(124,58,237,0.35)]',
  gold:      'bg-gradient-to-br from-[#78350f] to-[#92400e] border-[rgba(240,180,41,0.5)] text-[var(--gold)] shadow-[0_0_14px_rgba(240,180,41,0.2)]',
  danger:    'bg-gradient-to-br from-[#7f1d1d] to-[#991b1b] border-[rgba(220,38,38,0.5)] text-[#fca5a5] shadow-[0_0_10px_rgba(220,38,38,0.2)]',
  success:   'bg-gradient-to-br from-[#14532d] to-[#166534] border-[rgba(34,197,94,0.4)] text-[#86efac] shadow-[0_0_10px_rgba(34,197,94,0.2)]',
  damage:    'bg-gradient-to-br from-[#7f1d1d] to-[#dc2626] border-[rgba(220,38,38,0.6)] text-[#fca5a5] shadow-[0_0_12px_rgba(220,38,38,0.25)]',
  heal:      'bg-gradient-to-br from-[#14532d] to-[#15803d] border-[rgba(34,197,94,0.6)] text-[#86efac] shadow-[0_0_12px_rgba(34,197,94,0.25)]',
  muted:     'bg-transparent border-[var(--bg-border)] text-[var(--text-muted)] hover:border-[var(--gold)] hover:text-[var(--gold)]',
  ghost:     'bg-transparent border-transparent text-[var(--text-secondary)] hover:text-[var(--gold)] hover:bg-[rgba(240,180,41,0.06)]',
}

const SIZE_STYLES: Record<string, string> = {
  sm:   'px-3 py-1.5 text-xs gap-1.5 rounded-lg',
  md:   'px-4 py-2 text-sm gap-2 rounded-xl',
  lg:   'px-6 py-3 text-base gap-2.5 rounded-xl',
  icon: 'p-2 rounded-lg aspect-square',
}

// ── Props ─────────────────────────────────────────────────────────────────────

type ButtonVariant = keyof typeof VARIANT_STYLES
type ButtonSize    = keyof typeof SIZE_STYLES

interface RavenofButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:     ButtonVariant
  size?:        ButtonSize
  children:     ReactNode
  /** When true, button fills container width */
  fullWidth?:   boolean
  /** Show corner ornament lines (gold panels) */
  ornament?:    boolean
}

// ── Component ─────────────────────────────────────────────────────────────────

export const RavenofButton = forwardRef<HTMLButtonElement, RavenofButtonProps>(
  function RavenofButton(
    {
      variant   = 'primary',
      size      = 'md',
      fullWidth = false,
      ornament  = false,
      className = '',
      children,
      disabled,
      ...rest
    },
    ref,
  ) {
    const variantClass = VARIANT_STYLES[variant] ?? VARIANT_STYLES.primary
    const sizeClass    = SIZE_STYLES[size]    ?? SIZE_STYLES.md

    return (
      <button
        ref={ref}
        disabled={disabled}
        className={[
          'inline-flex items-center justify-center border font-semibold',
          'transition-all duration-150 active:scale-[0.97]',
          'disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gold)] focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--bg-surface)]',
          variantClass,
          sizeClass,
          fullWidth ? 'w-full' : '',
          ornament  ? 'rvn-corner' : '',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
        style={{ fontFamily: 'var(--rvn-font-display)', letterSpacing: '0.04em', ...rest.style }}
        {...rest}
      >
        {children}
      </button>
    )
  },
)

export default RavenofButton
