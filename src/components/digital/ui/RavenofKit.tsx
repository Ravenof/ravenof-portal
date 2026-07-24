'use client'

// ════════════════════════════════════════════════════════════════════════════
// RavenofKit — patvirtinto UI dizaino baziniai komponentai (Fazė 1).
// Šaltinis: ravenof-ui-handoff (component-specs.json + DESIGN_TOKENS.md +
// prototipas „Ravenof Digital.dc.html"). Tik prezentacija — jokios logikos.
// Stiliai: ./ravenof-ui.css (importuojamas src/app/digital/layout.tsx).
// ════════════════════════════════════════════════════════════════════════════

import type { CSSProperties, ReactNode, ButtonHTMLAttributes, InputHTMLAttributes } from 'react'

export const RAVENOF_ASSET = '/ravenof-ui'

// ── Patvirtintos spalvos (DESIGN_TOKENS — prototipo FAC[]/RAR[]) ─────────────
export const RAVENOF_FACTION_COLOR: Record<string, string> = {
  'mirties-marsas': '#6F8562',
  'plesiku-naktis': '#6B6577',
  'vryhioko-gauja': '#7650A4',
  'demonu-orda': '#8D2D38',
  'mistikos-melodija': '#526FAE',
  'sviesos-pulkas': '#D4A33B',
  'inkvizicijos-legionas': '#A85C32',
  'rytu-vejas': '#4E8A7C',
  'neutralus': '#B0A98F',
  'universalus': '#B0A98F',
}
export function ravenofFactionColor(slug?: string | null): string {
  return (slug && RAVENOF_FACTION_COLOR[slug]) || '#B0A98F'
}
export function ravenofFactionIcon(slug?: string | null): string {
  const s = slug === 'neutralus' ? 'universalus' : slug
  return `${RAVENOF_ASSET}/factions/${s ?? 'universalus'}.png`
}

/** Retumo spalva pagal patvirtintus tokenus (LT/EN pavadinimas → hex). */
export function ravenofRarityColor(name?: string | null): string {
  const s = (name || '').toLowerCase()
  if (/legend/.test(s)) return '#C23A3A'
  if (/epi[sšc]/.test(s)) return '#7650A4'
  if (/unik|uniq/.test(s)) return '#3F6AD1'
  if (/magi/.test(s)) return '#4F9E52'
  return '#928B9D'
}
export function ravenofRarityGem(name?: string | null): string {
  const s = (name || '').toLowerCase()
  const key = /legend/.test(s) ? 'legendary' : /epi[sšc]/.test(s) ? 'epic' : /unik|uniq/.test(s) ? 'unique' : /magi/.test(s) ? 'magic' : 'common'
  return `${RAVENOF_ASSET}/rarity/rar-${key}.png`
}
export function ravenofCardTypeIcon(name?: string | null): string | null {
  const s = (name || '').toLowerCase()
  const key = /būtyb|butyb|creature/.test(s) ? 'creature'
    : /artefakt|artefact|artifact/.test(s) ? 'artefact'
    : /reakcij|reaction/.test(s) ? 'reaction'
    : /lauk|field/.test(s) ? 'field'
    : /burt|spell/.test(s) ? 'spell'
    : /prakeik|curse/.test(s) ? 'curse'
    : /čempion|cempion|champion/.test(s) ? 'champion'
    : null
  return key ? `/icons/card-types/${key}.png` : null
}

// ── RavenofButton ────────────────────────────────────────────────────────────
type BtnVariant = 'primary' | 'secondary' | 'destructive'
export function RavenofButton({ variant = 'primary', small, className = '', style, children, ...rest }:
  ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant; small?: boolean }) {
  const cls = `ravenof-btn ravenof-btn-${variant} ${className}`
  const sm: CSSProperties = small
    ? { fontSize: 11, padding: '8px 14px', minHeight: 34, letterSpacing: 1.5, clipPath: variant === 'primary' ? 'polygon(6px 0,100% 0,calc(100% - 6px) 100%,0 100%)' : undefined }
    : {}
  return <button className={cls} style={{ ...sm, ...style }} {...rest}>{children}</button>
}

// ── RavenofBannerButton — raudona vėliavos juosta (prototipo primary CTA) ────
// button-primary-normal.png tempiamas 100%/100% (ne nine-slice; patvirtinta F2).
export function RavenofBannerButton({ disabled, style, children, className = '', ...rest }:
  ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button disabled={disabled} className={`ravenof-press ${className}`} style={{
      textAlign: 'center', font: '800 13px var(--ravenof-font-display)', letterSpacing: 2.5, textTransform: 'uppercase',
      color: disabled ? '#5e5868' : '#f6e8c6',
      background: disabled ? 'var(--ravenof-bg-elevated)' : `url('${RAVENOF_ASSET}/buttons/button-primary-normal.png') center / 100% 100% no-repeat`,
      padding: '13px 20px', border: 0, cursor: disabled ? 'default' : 'pointer',
      textShadow: disabled ? 'none' : '0 1px 4px rgba(0,0,0,.8)',
      ...style,
    }} {...rest}>{children}</button>
  )
}

// ── RavenofTextField ─────────────────────────────────────────────────────────
export function RavenofTextField({ className = '', ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`ravenof-field ${className}`} {...rest} />
}

// ── RavenofResourcePill (kampuota, prototipo header) ─────────────────────────
export function RavenofResourcePill({ icon, iconW = 14, value, onClick, title }: {
  icon: string; iconW?: number; value: ReactNode; onClick?: () => void; title?: string
}) {
  const inner = (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={icon} alt="" style={{ width: iconW, height: 14, objectFit: 'contain', flex: 'none' }} />
      <span>{value}</span>
    </>
  )
  if (onClick) return <button type="button" onClick={onClick} title={title} className="ravenof-pill ravenof-press" style={{ cursor: 'pointer' }}>{inner}</button>
  return <span className="ravenof-pill" title={title}>{inner}</span>
}

// ── RavenofIconBtn (34px kvadratas, 3px radius — prototipo bell) ─────────────
export function RavenofIconBtn({ children, onClick, badge, label }: {
  children: ReactNode; onClick?: () => void; badge?: number | string | null; label?: string
}) {
  return (
    <button type="button" onClick={onClick} aria-label={label} className="ravenof-iconbtn">
      {children}
      {badge != null && badge !== 0 && (
        <span style={{ position: 'absolute', top: -5, right: -5, width: 15, height: 15, borderRadius: '50%', background: 'var(--ravenof-danger)', color: '#fff', font: "700 9px var(--ravenof-font-body)", display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{badge}</span>
      )}
    </button>
  )
}

// ── RavenofSpinner (deimantas) ───────────────────────────────────────────────
export function RavenofSpinner({ size = 40 }: { size?: number }) {
  return <span role="status" aria-label="loading" className="ravenof-spinner" style={{ width: size, height: size, display: 'inline-block' }} />
}

// ── RavenofProgress ──────────────────────────────────────────────────────────
export function RavenofProgress({ pct, color = 'var(--ravenof-gold)', height = 3, style }: {
  pct: number; color?: string; height?: number; style?: CSSProperties
}) {
  return (
    <span className="ravenof-progress" style={{ display: 'block', height, ...style }}>
      <span style={{ width: `${Math.max(0, Math.min(100, pct))}%`, background: color }} />
    </span>
  )
}

// ── RavenofToast ─────────────────────────────────────────────────────────────
export function RavenofToast({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <div className="ravenof-toast" style={{ position: 'fixed', left: '50%', transform: 'translateX(-50%)', top: 8, zIndex: 160, ...style }}>
      {children}
    </div>
  )
}

// ── RavenofModalFrame — pilno ekrano overlay + turinys ───────────────────────
export function RavenofModalFrame({ children, onClose, zIndex = 91, ariaLabel }: {
  children: ReactNode; onClose?: () => void; zIndex?: number; ariaLabel?: string
}) {
  return (
    <div role="dialog" aria-modal="true" aria-label={ariaLabel} className="ravenof-overlay ravenof-body" style={{ position: 'fixed', zIndex }} onClick={onClose}>
      {children}
    </div>
  )
}

// ── RavenofStatTile (kortos detalių statai) ──────────────────────────────────
export function RavenofStatTile({ value, label, color = 'var(--ravenof-text-primary)', suffix }: {
  value: ReactNode; label: string; color?: string; suffix?: ReactNode
}) {
  return (
    <div style={{ flex: 1, background: 'var(--ravenof-bg-surface-2)', border: '1px solid var(--ravenof-border-hairline)', padding: 6, textAlign: 'center' }}>
      <div style={{ font: '700 14px var(--ravenof-font-display)', color }}>{value}{suffix}</div>
      <div style={{ font: '400 9px var(--ravenof-font-body)', color: 'var(--ravenof-text-secondary)' }}>{label}</div>
    </div>
  )
}
