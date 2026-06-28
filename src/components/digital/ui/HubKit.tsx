'use client'

// ════════════════════════════════════════════════════════════════════════════
// HubKit — reusable Ravenof Digital mobile-game-hub UI komponentai.
// Dark fantasy premium: juoda / tamsi violetinė / bordo / auksas. Touch ≥44px,
// pressed state visur, subtilus glow. Spalvos per CSS kintamuosius + inline.
//   ProfileChip · ResourcePill · IconBtn · RewardBanner · ModeSelector ·
//   PlayHeroCard · QuickActionCard · ProgressionCard · HubStyles
// ════════════════════════════════════════════════════════════════════════════

import Link from 'next/link'
import type { ReactNode } from 'react'
import { ChevronRight, Lock } from 'lucide-react'

const GOLD = '240,180,41'
export const ASSET = '/digital/ui'

// Vienkartiniai keyframes/utility klasės (įdėk kartą per ekraną).
export function HubStyles() {
  return <style>{`
    .rvn-press { transition: transform .12s ease, box-shadow .2s ease, border-color .2s ease; }
    .rvn-press:active { transform: scale(.96); }
    .rvn-card { background: linear-gradient(155deg, rgba(26,18,38,0.92), rgba(10,8,16,0.96)); border: 1px solid rgba(255,255,255,0.07); }
    .rvn-glow-pulse { animation: rvnHubGlow 2.2s ease-in-out infinite; }
    @keyframes rvnHubGlow { 0%,100%{ box-shadow: 0 0 0 1px rgba(${GOLD},0.4), 0 0 10px rgba(${GOLD},0.25); } 50%{ box-shadow: 0 0 0 1px rgba(${GOLD},0.7), 0 0 20px rgba(${GOLD},0.5); } }
    .rvn-badge-pulse { animation: rvnBadge 1.8s ease-in-out infinite; }
    @keyframes rvnBadge { 0%,100%{ transform: scale(1); } 50%{ transform: scale(1.18); } }
    .rvn-sel-border { animation: rvnSel 2.4s ease-in-out infinite; }
    @keyframes rvnSel { 0%,100%{ box-shadow: inset 0 0 0 1.5px rgba(${GOLD},0.7), 0 0 14px rgba(${GOLD},0.3); } 50%{ box-shadow: inset 0 0 0 1.5px rgba(${GOLD},1), 0 0 22px rgba(${GOLD},0.5); } }
    @keyframes rvnFadeUp { from{ opacity:0; transform: translateY(8px);} to{ opacity:1; transform:none;} }
    .rvn-fade { animation: rvnFadeUp .26s ease-out both; }
  `}</style>
}

// ── ProfileChip ───────────────────────────────────────────────────────────────
export function ProfileChip({ name, level, pct, avatarUrl, onClick }: {
  name: string; level: number; pct: number; avatarUrl?: string | null; onClick?: () => void
}) {
  return (
    <button onClick={onClick} className="rvn-press flex items-center gap-2 min-w-0" style={{ background: 'none', border: 'none', padding: 0 }}>
      <span className="relative flex items-center justify-center shrink-0" style={{ width: 38, height: 38, borderRadius: '50%', border: `1.5px solid rgba(${GOLD},0.6)`, background: `center/cover url(${avatarUrl || ASSET + '/avatar-default.webp'})`, boxShadow: `0 0 10px rgba(${GOLD},0.25)` }}>
        <span className="absolute -bottom-1 -right-1 flex items-center justify-center tabular-nums" style={{ minWidth: 18, height: 16, padding: '0 3px', borderRadius: 8, fontSize: 9, fontWeight: 800, background: '#0a0810', border: `1px solid rgba(${GOLD},0.7)`, color: `rgb(${GOLD})` }}>{level}</span>
      </span>
      <span className="flex flex-col items-start min-w-0" style={{ gap: 2 }}>
        <span className="truncate" style={{ maxWidth: 110, fontSize: 12.5, fontWeight: 700, color: '#f3ead3', lineHeight: 1 }}>{name}</span>
        <span style={{ width: 96, height: 4, borderRadius: 3, background: 'rgba(255,255,255,0.1)', overflow: 'hidden' }}>
          <span style={{ display: 'block', height: '100%', width: `${Math.max(3, Math.min(100, pct))}%`, background: `linear-gradient(90deg, rgba(${GOLD},0.7), rgb(${GOLD}))`, borderRadius: 3 }} />
        </span>
      </span>
    </button>
  )
}

// ── ResourcePill ──────────────────────────────────────────────────────────────
export function ResourcePill({ icon, value, accent = GOLD, onClick }: { icon: ReactNode; value: ReactNode; accent?: string; onClick?: () => void }) {
  const cls = 'rvn-press inline-flex items-center gap-1 tabular-nums'
  const style: React.CSSProperties = { padding: '5px 10px', borderRadius: 999, fontSize: 12.5, fontWeight: 800, background: 'rgba(8,6,14,0.92)', border: `1px solid rgba(${accent},0.5)`, color: `rgb(${accent})`, fontFamily: 'var(--rvn-font-display)' }
  return onClick
    ? <button onClick={onClick} className={cls} style={style}>{icon}{value}</button>
    : <span className={cls} style={style}>{icon}{value}</span>
}

// ── IconBtn (bell / settings) ─────────────────────────────────────────────────
export function IconBtn({ children, onClick, badge, label }: { children: ReactNode; onClick?: () => void; badge?: number | string | null; label?: string }) {
  return (
    <button onClick={onClick} aria-label={label} className="rvn-press relative inline-flex items-center justify-center"
      style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(8,6,14,0.92)', border: `1px solid rgba(${GOLD},0.35)`, color: `rgb(${GOLD})` }}>
      {children}
      {badge != null && badge !== 0 && (
        <span className="rvn-badge-pulse absolute -top-1 -right-1 flex items-center justify-center" style={{ minWidth: 16, height: 16, padding: '0 3px', borderRadius: 8, fontSize: 9, fontWeight: 800, background: '#ef4444', color: '#fff', border: '1px solid #0a0810' }}>{badge}</span>
      )}
    </button>
  )
}

// ── RewardBanner (login streak / daily) ───────────────────────────────────────
export function RewardBanner({ streak, claimable, onClaim, nextLabel }: {
  streak: number; claimable: boolean; onClaim?: () => void; nextLabel?: string
}) {
  return (
    <div className={`rvn-card rvn-fade flex items-center gap-3 ${claimable ? 'rvn-glow-pulse' : ''}`}
      style={{ borderRadius: 14, padding: '9px 12px', borderColor: claimable ? `rgba(${GOLD},0.5)` : 'rgba(255,255,255,0.07)' }}>
      <span className="flex items-center justify-center shrink-0" style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(240,120,40,0.16)', border: '1px solid rgba(251,146,60,0.4)', fontSize: 18 }}>🔥</span>
      <span className="flex-1 min-w-0">
        <span className="block" style={{ fontSize: 13, fontWeight: 700, color: '#f3ead3' }}>{streak} d. prisijungimo serija</span>
        <span className="block" style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>{claimable ? 'Atlygis paruoštas!' : (nextLabel ?? 'Grįžk rytoj')}</span>
      </span>
      {claimable
        ? <span className="flex items-center" style={{ fontSize: 12, color: 'var(--text-muted)' }}>🪙<b style={{ marginLeft: 2, color: `rgb(${GOLD})` }}>+250</b></span>
        : null}
      <button onClick={claimable ? onClaim : undefined} disabled={!claimable} className="rvn-press shrink-0"
        style={{ padding: '7px 14px', borderRadius: 10, fontSize: 12.5, fontWeight: 800, fontFamily: 'var(--rvn-font-display)',
          background: claimable ? `linear-gradient(135deg, rgba(${GOLD},0.95), rgba(200,140,20,0.9))` : 'rgba(255,255,255,0.05)',
          color: claimable ? '#1a1206' : 'var(--text-muted)', border: claimable ? 'none' : '1px solid rgba(255,255,255,0.1)', opacity: claimable ? 1 : 0.7 }}>
        {claimable ? 'Atsiimti' : 'Atsiimta'}
      </button>
    </div>
  )
}

// ── ModeSelector (real asset tiles) ──────────────────────────────────────────
export type HubMode = { key: string; img: string; imgSel: string }
export function ModeSelector({ modes, selected, onSelect }: { modes: HubMode[]; selected: string; onSelect: (k: string) => void }) {
  return (
    <div className="flex flex-col gap-2">
      {modes.map((m) => {
        const sel = m.key === selected
        return (
          <button key={m.key} onClick={() => onSelect(m.key)} className="rvn-press block w-full overflow-hidden"
            style={{ borderRadius: 12, lineHeight: 0, opacity: sel ? 1 : 0.8,
              boxShadow: sel ? `0 0 0 1.5px rgba(${GOLD},0.9), 0 0 16px rgba(${GOLD},0.4)` : 'none',
              filter: sel ? 'none' : 'saturate(0.85) brightness(0.92)' }}>
            <img src={sel ? m.imgSel : m.img} alt="" className="w-full block" />
          </button>
        )
      })}
    </div>
  )
}

// ── PlayHeroCard (cinematic arena asset bg + CTA asset) ──────────────────────
export function PlayHeroCard({ subtitle, onCta, children }: { subtitle: string; onCta: () => void; children?: ReactNode }) {
  return (
    <div className="relative rvn-fade overflow-hidden" style={{ borderRadius: 18, border: `1px solid rgba(${GOLD},0.45)`, boxShadow: `0 8px 30px rgba(0,0,0,0.5)` }}>
      <img src={`${ASSET}/hero.webp`} alt="" className="absolute inset-0 w-full h-full object-cover" />
      <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(8,6,14,0.28) 0%, rgba(8,6,14,0.55) 55%, rgba(8,6,14,0.88) 100%)' }} />
      <div className="relative p-4">
        <div className="text-center mb-3">
          <h1 style={{ fontFamily: 'var(--rvn-font-display)', color: `rgb(${GOLD})`, fontSize: 25, fontWeight: 800, letterSpacing: '0.1em', textShadow: `0 2px 4px #000, 0 0 22px rgba(${GOLD},0.55)`, margin: 0 }}>ŽAISTI DABAR</h1>
          <p style={{ fontSize: 11.5, color: '#e8dcc0', marginTop: 2, textShadow: '0 1px 3px #000' }}>{subtitle}</p>
        </div>
        <button onClick={onCta} className="rvn-press block w-full" style={{ lineHeight: 0, filter: `drop-shadow(0 4px 14px rgba(${GOLD},0.4))` }}>
          <img src={`${ASSET}/cta.webp`} alt="Pradėti kovą" className="w-full block" style={{ borderRadius: 10 }} />
        </button>
        <div className="mt-3">{children}</div>
      </div>
    </div>
  )
}

// ── QuickActionCard (real asset card) ────────────────────────────────────────
export function QuickActionCard({ image, badge, href, onClick, dim, overlay }: { image: string; badge?: ReactNode; href?: string; onClick?: () => void; dim?: boolean; overlay?: ReactNode }) {
  const inner = (
    <div className="rvn-press relative w-full overflow-hidden" style={{ borderRadius: 14, lineHeight: 0 }}>
      <img src={image} alt="" className="w-full block" style={{ opacity: dim ? 0.5 : 1, filter: dim ? 'grayscale(0.4)' : 'none' }} />
      {badge != null && <span className="absolute" style={{ top: 8, right: 10 }}>{badge}</span>}
      {overlay != null && <span className="absolute inset-0 flex items-center justify-center" style={{ pointerEvents: 'none' }}>{overlay}</span>}
    </div>
  )
  return href ? <Link href={href} onClick={onClick}>{inner}</Link> : <button type="button" onClick={onClick} className="w-full">{inner}</button>
}

export function CountBadge({ n, accent = '239,68,68' }: { n: number | string; accent?: string }) {
  return <span className="rvn-badge-pulse flex items-center justify-center" style={{ minWidth: 18, height: 18, padding: '0 4px', borderRadius: 9, fontSize: 10, fontWeight: 800, background: `rgb(${accent})`, color: '#fff' }}>{n}</span>
}

// ── ProgressionCard ───────────────────────────────────────────────────────────
export function ProgressionCard({ icon, title, sub, pct, progressLabel, accent = GOLD, locked, comingSoon, href, onClick }: {
  icon: ReactNode; title: string; sub?: string; pct?: number; progressLabel?: string; accent?: string; locked?: boolean; comingSoon?: boolean; href?: string; onClick?: () => void
}) {
  const inner = (
    <div className="rvn-press rvn-card flex items-center gap-3" style={{ borderRadius: 14, padding: '12px 14px', opacity: locked ? 0.55 : 1, borderColor: `rgba(${accent},0.28)` }}>
      <span className="flex items-center justify-center shrink-0" style={{ width: 40, height: 40, borderRadius: 12, background: `rgba(${accent},0.14)`, border: `1px solid rgba(${accent},0.4)`, color: `rgb(${accent})`, fontSize: 20 }}>{locked ? <Lock className="w-5 h-5" /> : icon}</span>
      <span className="flex-1 min-w-0">
        <span className="flex items-center gap-2">
          <span style={{ fontSize: 14, fontWeight: 700, color: '#f3ead3', fontFamily: 'var(--rvn-font-display)' }}>{title}</span>
          {comingSoon && <span style={{ fontSize: 8.5, fontWeight: 800, letterSpacing: '0.12em', padding: '1px 6px', borderRadius: 6, background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.18)', color: 'var(--text-muted)' }}>GREITAI</span>}
        </span>
        {sub && <span className="block" style={{ fontSize: 10.5, color: 'var(--text-muted)', marginTop: 1 }}>{sub}</span>}
        {pct != null && (
          <span className="flex items-center gap-2" style={{ marginTop: 5 }}>
            <span style={{ flex: 1, height: 5, borderRadius: 3, background: 'rgba(255,255,255,0.1)', overflow: 'hidden' }}>
              <span style={{ display: 'block', height: '100%', width: `${Math.max(2, Math.min(100, pct))}%`, background: `linear-gradient(90deg, rgba(${accent},0.7), rgb(${accent}))`, borderRadius: 3 }} />
            </span>
            {progressLabel && <span className="tabular-nums" style={{ fontSize: 9.5, color: 'var(--text-secondary)' }}>{progressLabel}</span>}
          </span>
        )}
      </span>
      <ChevronRight className="w-4 h-4 shrink-0" style={{ color: 'var(--text-muted)' }} />
    </div>
  )
  if (locked) return <div>{inner}</div>
  return href ? <Link href={href} onClick={onClick}>{inner}</Link> : <button type="button" onClick={onClick} className="text-left w-full">{inner}</button>
}
