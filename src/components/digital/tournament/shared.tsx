'use client'
// ── Turnyrų UI bendri elementai: avataras, atlygio eilutė, dydžio pavadinimas ──
import type { CSSProperties } from 'react'
import type { RewardItem } from '@/lib/tournament/client'

type T = (k: string, p?: Record<string, string | number>) => string

export function TAvatar({ src, name, size = 32, style }: { src: string | null | undefined; name: string; size?: number; style?: CSSProperties }) {
  const base: CSSProperties = {
    width: size, height: size, flex: 'none', borderRadius: '50%', overflow: 'hidden', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    background: 'linear-gradient(160deg,#241a30,#0d0a12)', border: '1px solid var(--ravenof-border-strong)',
    font: `700 ${Math.round(size * 0.46)}px var(--ravenof-font-display)`, color: 'var(--ravenof-gold)', ...style,
  }
  if (src && (src.startsWith('http') || src.startsWith('/'))) {
    // eslint-disable-next-line @next/next/no-img-element
    return <span style={base}><img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /></span>
  }
  if (src && src.length <= 8) return <span style={{ ...base, fontSize: Math.round(size * 0.58) }}>{src}</span>
  return <span style={base}>{(name || '?').slice(0, 1).toUpperCase()}</span>
}

const CUR_ICON: Record<string, string> = { silver: '🪙', essence: '✨', rubies: '💎' }

export function rewardLabel(t: T, it: RewardItem, mult = 1): string {
  if (it.type === 'currency') {
    const n = Math.max(0, Math.round(it.amount * mult))
    return `${CUR_ICON[it.currency] ?? ''} ${n} ${t(`progression.reward.${it.currency}`)}`.trim()
  }
  const q = Math.max(1, Math.round(it.quantity * mult))
  return `📦 ${q}× ${t('battle.tournament.pack')}`
}

export function RewardLine({ t, items, mult = 1, style }: { t: T; items: RewardItem[] | undefined; mult?: number; style?: CSSProperties }) {
  if (!items || items.length === 0) return <span style={{ color: 'var(--ravenof-text-secondary)', ...style }}>—</span>
  return <span style={style}>{items.map((it) => rewardLabel(t, it, mult)).join(' · ')}</span>
}

export const sizeKey = (s: number) => (s === 4 ? 'small' : s === 8 ? 'medium' : 'large')

/** Vietų grupės pagal dydį (rodymui atlygių lentelėje). */
export function placeBuckets(size: number): string[] {
  const all = ['1', '2', '3', '4', '5-6', '7-8', '9-12', '13-16']
  return all.slice(0, size === 4 ? 4 : size === 8 ? 6 : 8)
}
