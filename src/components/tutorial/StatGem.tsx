'use client'

// ── StatGem — ATK / HP brangakmenis su aukso žiedu (kovos kortelės) ──────────
// Vienas komponentas rankai (MiniCard), lentai (UnitTile) ir hover-preview.
// kind: atk (rubinas) · hp (smaragdas) · hpDmg (gintaras – sužeistas) · buff (auksas)
// · gold (čempiono fazė). Dydis skaičiuojamas nuo kortos pločio: size ≈ w·0.2.
import type { CSSProperties, ReactNode } from 'react'

export type GemKind = 'atk' | 'hp' | 'hpDmg' | 'buff' | 'gold'

const GEM: Record<GemKind, string> = {
  atk:   'radial-gradient(circle at 50% 40%, #ff6b6b 0%, #b81c1c 55%, #4d0808 100%)',
  hp:    'radial-gradient(circle at 50% 40%, #6ee7a0 0%, #1d8a45 55%, #063d1d 100%)',
  hpDmg: 'radial-gradient(circle at 50% 40%, #ffd86b 0%, #b8801c 55%, #4d3008 100%)',
  buff:  'radial-gradient(circle at 50% 40%, #ffd86b 0%, #c9882f 55%, #4d3008 100%)',
  gold:  'radial-gradient(circle at 50% 40%, #ffe08a 0%, #c9882f 55%, #4d3008 100%)',
}

/** Brangakmenio dydis pagal kortos plotį (min 16 px, kad skaitytųsi 92 px rankoje). */
export const gemSize = (cardW: number) => Math.max(16, Math.round(cardW * 0.2))

export function StatGem({ kind, size, children, style, className, title }: {
  kind: GemKind; size: number; children: ReactNode; style?: CSSProperties; className?: string; title?: string
}) {
  const font = Math.round(size * 0.58)
  return (
    <span title={title} className={'relative inline-flex items-center justify-center select-none ' + (className ?? '')}
      style={{
        width: size, height: size, borderRadius: '50%', background: GEM[kind],
        boxShadow: '0 2px 4px rgba(0,0,0,0.8), inset 0 -2px 3px rgba(0,0,0,0.6), inset 0 1px 2px rgba(255,255,255,0.35)',
        ...style,
      }}>
      {/* aukso žiedas */}
      <span aria-hidden className="absolute inset-0 rounded-full pointer-events-none"
        style={{ border: `${size >= 24 ? 1.5 : 1}px solid #f0b429`, boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.6), 0 0 0 1px rgba(0,0,0,0.7)' }} />
      {/* blizgesys */}
      <span aria-hidden className="absolute rounded-full pointer-events-none"
        style={{ left: '18%', top: '9%', width: '52%', height: '30%', background: 'linear-gradient(180deg, rgba(255,255,255,0.55), rgba(255,255,255,0))' }} />
      <span className="relative font-black leading-none"
        style={{ fontFamily: 'var(--ravenof-font-display, Cinzel, Georgia, serif)', fontSize: font, color: '#fff', fontVariantNumeric: 'tabular-nums', textShadow: '0 1px 0 rgba(0,0,0,0.9), 0 0 3px rgba(0,0,0,0.8)' }}>
        {children}
      </span>
    </span>
  )
}
