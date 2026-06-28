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
export const ASSET = '/digital/ui2'

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
      <span className="relative flex items-center justify-center shrink-0" style={{ width: 38, height: 38, borderRadius: '50%', border: `1.5px solid rgba(${GOLD},0.6)`, background: `center/cover url(${avatarUrl || ASSET + '/avatar.webp'})`, boxShadow: `0 0 10px rgba(${GOLD},0.25)` }}>
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

// ── RewardBanner (live: streak) ───────────────────────────────────────────────
function Chip({ icon, amount }: { icon: string; amount: string }) {
  return (
    <span className="flex flex-col items-center justify-center" style={{ width: 44, height: 44, borderRadius: 9, background: 'linear-gradient(160deg, rgba(40,30,55,0.9), rgba(12,9,18,0.95))', border: `1px solid rgba(${GOLD},0.4)` }}>
      <span style={{ fontSize: 18, lineHeight: 1 }}>{icon}</span>
      <span style={{ fontSize: 9, fontWeight: 800, color: `rgb(${GOLD})` }}>{amount}</span>
    </span>
  )
}
export function RewardBanner({ streak, claimable, onClaim }: { streak: number; claimable: boolean; onClaim?: () => void }) {
  return (
    <div className={`rvn-card rvn-fade flex items-center gap-3 ${claimable ? 'rvn-glow-pulse' : ''}`}
      style={{ borderRadius: 16, padding: '10px 12px', borderColor: claimable ? `rgba(${GOLD},0.55)` : 'rgba(255,255,255,0.08)' }}>
      <img src={`${ASSET}/flame.webp`} alt="" style={{ width: 34, height: 38, objectFit: 'contain', flexShrink: 0, filter: 'drop-shadow(0 0 8px rgba(251,120,40,0.6))' }} />
      <span className="flex-1 min-w-0">
        <span className="block" style={{ fontSize: 13.5, fontWeight: 700, color: '#f3ead3', fontFamily: 'var(--rvn-font-display)' }}>{streak} d. prisijungimo serija</span>
        <span className="block" style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>{claimable ? 'Atlygis paruoštas!' : 'Kitas atlygis rytoj'}</span>
      </span>
      <img src={`${ASSET}/chip-gold.webp`} alt="" style={{ height: 44, width: 'auto' }} />
      <img src={`${ASSET}/chip-pack.webp`} alt="" style={{ height: 44, width: 'auto' }} />
      <button onClick={claimable ? onClaim : undefined} disabled={!claimable} className="rvn-press shrink-0"
        style={{ padding: '8px 15px', borderRadius: 10, fontSize: 13, fontWeight: 800, fontFamily: 'var(--rvn-font-display)',
          background: claimable ? `linear-gradient(135deg, rgba(${GOLD},1), rgba(190,130,18,0.95))` : 'rgba(255,255,255,0.05)',
          color: claimable ? '#1a1206' : 'var(--text-muted)', border: claimable ? 'none' : '1px solid rgba(255,255,255,0.1)' }}>
        {claimable ? 'Atsiimti' : 'Atsiimta'}
      </button>
    </div>
  )
}

// ── Progress stat card (Sezono kelias / Mokymai) — live ──────────────────────
export function StatCard({ emblem, emblemIcon, title, sub, value, pct, accent = GOLD, chips, href, onClick }: {
  emblem?: string; emblemIcon?: ReactNode; title: string; sub: string; value: string; pct: number; accent?: string; chips?: ReactNode; href?: string; onClick?: () => void
}) {
  const inner = (
    <div className="rvn-press rvn-card flex items-center gap-3" style={{ borderRadius: 16, padding: '12px 14px', borderColor: `rgba(${accent},0.3)` }}>
      {emblem
        ? <img src={emblem} alt="" style={{ width: 48, height: 48, objectFit: 'contain', flexShrink: 0, filter: `drop-shadow(0 0 8px rgba(${accent},0.45))` }} />
        : <span className="flex items-center justify-center shrink-0" style={{ width: 46, height: 46, borderRadius: 12, background: `rgba(${accent},0.16)`, border: `1px solid rgba(${accent},0.45)`, color: `rgb(${accent})` }}>{emblemIcon}</span>}
      <span className="flex-1 min-w-0">
        <span className="block" style={{ fontSize: 15, fontWeight: 800, color: '#f3ead3', fontFamily: 'var(--rvn-font-display)', letterSpacing: '0.02em' }}>{title}</span>
        <span className="block" style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>{sub}</span>
        <span className="flex items-center gap-2" style={{ marginTop: 5 }}>
          <span style={{ flex: 1, height: 6, borderRadius: 4, background: 'rgba(255,255,255,0.1)', overflow: 'hidden' }}>
            <span style={{ display: 'block', height: '100%', width: `${Math.max(2, Math.min(100, pct))}%`, background: `linear-gradient(90deg, rgba(${accent},0.7), rgb(${accent}))`, borderRadius: 4, boxShadow: `0 0 8px rgba(${accent},0.5)` }} />
          </span>
          <span className="tabular-nums shrink-0" style={{ fontSize: 10.5, fontWeight: 700, color: `rgb(${accent})` }}>{value}</span>
        </span>
      </span>
      {chips && <span className="flex items-center gap-1 shrink-0">{chips}</span>}
      <ChevronRight className="w-4 h-4 shrink-0" style={{ color: 'var(--text-muted)' }} />
    </div>
  )
  return href ? <Link href={href} onClick={onClick}>{inner}</Link> : <button type="button" onClick={onClick} className="text-left w-full">{inner}</button>
}

export function RewardChip({ src }: { src: string }) {
  return <img src={src} alt="" style={{ height: 44, width: 'auto', objectFit: 'contain' }} />
}

// ── ModeSelector// ── ModeSelector (real asset tiles) ──────────────────────────────────────────
export type HubMode = { key: string; img: string; imgSel: string }
export function ModeSelector({ modes, selected, onSelect }: { modes: HubMode[]; selected: string; onSelect: (k: string) => void }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {modes.map((m) => {
        const sel = m.key === selected
        return (
          <button key={m.key} onClick={() => onSelect(m.key)} className="rvn-press block w-full overflow-hidden"
            style={{ borderRadius: 10, lineHeight: 0, opacity: sel ? 1 : 0.82,
              boxShadow: sel ? `0 0 0 1.5px rgba(${GOLD},0.9), 0 0 14px rgba(${GOLD},0.4)` : 'none',
              filter: sel ? 'none' : 'saturate(0.85) brightness(0.9)' }}>
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
      <div className="relative p-4 flex flex-col" style={{ gap: 12 }}>
        <div className="flex flex-col items-center" style={{ gap: 3 }}>
          <img src={`${ASSET}/heading.webp`} alt="Žaisti dabar" style={{ height: 38, width: 'auto', filter: `drop-shadow(0 2px 6px #000)` }} />
          <img src={`${ASSET}/subtitle.webp`} alt={subtitle} style={{ height: 14, width: 'auto', opacity: 0.95 }} />
        </div>
        <button onClick={onCta} className="rvn-press block w-full" style={{ lineHeight: 0, maxWidth: 420, margin: '0 auto', filter: `drop-shadow(0 4px 14px rgba(${GOLD},0.4))` }}>
          <img src={`${ASSET}/cta.webp`} alt="Pradėti kovą" className="w-full block" />
        </button>
        <div>{children}</div>
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
