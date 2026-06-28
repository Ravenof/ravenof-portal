'use client'

// ════════════════════════════════════════════════════════════════════════════
// HubKit — premium dark-fantasy mobile game hub, GRYNAS CSS (jokių raster assetų).
// Gilūs juodi/violetiniai paneliai, auksiniai rėmai, stiprus CTA, glow akcentai.
// Visi duomenys gyvi (perduodami iš DigitalHub).
// ════════════════════════════════════════════════════════════════════════════

import Link from 'next/link'
import type { ReactNode } from 'react'
import { ChevronRight, Lock } from 'lucide-react'
import { RvnIcon } from './RvnIcon'

const GOLD = '240,180,41'

// ── shared CSS ────────────────────────────────────────────────────────────────
export function HubStyles() {
  return <style>{`
    .rvn-press { transition: transform .12s ease, box-shadow .2s ease, filter .2s ease; }
    .rvn-press:active { transform: scale(.965); }
    .rvn-panel {
      position: relative; border-radius: 16px;
      background:
        radial-gradient(120% 120% at 0% 0%, rgba(74,40,96,0.40), transparent 55%),
        linear-gradient(158deg, rgba(28,20,42,0.96), rgba(11,8,18,0.98));
      border: 1px solid rgba(${GOLD},0.26);
      box-shadow: inset 0 1px 0 rgba(255,255,255,0.06), inset 0 0 24px rgba(0,0,0,0.45), 0 6px 22px rgba(0,0,0,0.5);
    }
    .rvn-gold-btn {
      background: linear-gradient(180deg, #ffe28c 0%, #f3b62c 46%, #c5841a 100%);
      color: #3a2406; border: 1px solid #ffeaa6; border-radius: 12px;
      text-shadow: 0 1px 0 rgba(255,255,255,0.45); font-family: var(--rvn-font-display, Cinzel, serif); font-weight: 800;
      box-shadow: inset 0 1px 0 rgba(255,255,255,0.65), inset 0 -3px 7px rgba(120,70,0,0.5), 0 6px 18px rgba(240,180,41,0.35);
    }
    .rvn-gold-btn:disabled { filter: grayscale(0.6) brightness(0.7); }
    .rvn-glow { animation: rvnGlow 2.4s ease-in-out infinite; }
    @keyframes rvnGlow { 0%,100%{ box-shadow: inset 0 1px 0 rgba(255,255,255,0.6), 0 0 14px rgba(${GOLD},0.35); } 50%{ box-shadow: inset 0 1px 0 rgba(255,255,255,0.7), 0 0 26px rgba(${GOLD},0.65); } }
    .rvn-badge-pulse { animation: rvnBadge 1.8s ease-in-out infinite; }
    @keyframes rvnBadge { 0%,100%{ transform: scale(1); } 50%{ transform: scale(1.16); } }
    .rvn-sel { animation: rvnSel 2.2s ease-in-out infinite; }
    @keyframes rvnSel { 0%,100%{ box-shadow: inset 0 0 0 1.5px rgba(${GOLD},0.85), 0 0 14px rgba(${GOLD},0.35); } 50%{ box-shadow: inset 0 0 0 2px rgba(${GOLD},1), 0 0 24px rgba(${GOLD},0.6); } }
    @keyframes rvnFade { from{ opacity:0; transform: translateY(8px);} to{ opacity:1; transform:none;} }
    .rvn-fade { animation: rvnFade .26s ease-out both; }
    .rvn-disp { font-family: var(--rvn-font-display, Cinzel, serif); }
  `}</style>
}

// ── ProfileChip ───────────────────────────────────────────────────────────────
export function ProfileChip({ name, level, pct, avatarUrl, onClick }: { name: string; level: number; pct: number; avatarUrl?: string | null; onClick?: () => void }) {
  return (
    <button onClick={onClick} className="rvn-press flex items-center gap-2 min-w-0" style={{ background: 'none', border: 'none', padding: 0 }}>
      <span className="relative flex items-center justify-center shrink-0" style={{ width: 38, height: 38, borderRadius: '50%', border: `1.5px solid rgba(${GOLD},0.65)`,
        background: avatarUrl ? `center/cover url(${avatarUrl})` : 'radial-gradient(circle at 50% 32%, #3a2a4e, #0c0a14)', boxShadow: `0 0 10px rgba(${GOLD},0.3), inset 0 0 8px rgba(0,0,0,0.6)` }}>
        {!avatarUrl && <RvnIcon name="avatar" size={36} round fallback={<span style={{ fontSize: 18 }}>🐦‍⬛</span>} />}
        <span className="absolute rvn-disp" style={{ bottom: -5, right: -5, minWidth: 18, height: 16, padding: '0 3px', borderRadius: 8, fontSize: 9.5, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(180deg,#1a1424,#0a0810)', border: `1px solid rgba(${GOLD},0.8)`, color: `rgb(${GOLD})` }}>{level}</span>
      </span>
      <span className="flex flex-col items-start min-w-0" style={{ gap: 3 }}>
        <span className="truncate" style={{ maxWidth: 120, fontSize: 12.5, fontWeight: 700, color: '#f3ead3', lineHeight: 1 }}>{name}</span>
        <span style={{ width: 100, height: 5, borderRadius: 3, background: 'rgba(255,255,255,0.1)', overflow: 'hidden', boxShadow: 'inset 0 0 3px rgba(0,0,0,0.6)' }}>
          <span style={{ display: 'block', height: '100%', width: `${Math.max(3, Math.min(100, pct))}%`, background: `linear-gradient(90deg, rgba(${GOLD},0.75), rgb(${GOLD}))`, boxShadow: `0 0 6px rgba(${GOLD},0.6)` }} />
        </span>
      </span>
    </button>
  )
}

// ── ResourcePill / IconBtn ────────────────────────────────────────────────────
export function ResourcePill({ icon, value, accent = GOLD, onClick }: { icon: ReactNode; value: ReactNode; accent?: string; onClick?: () => void }) {
  const cls = 'rvn-press rvn-disp inline-flex items-center gap-1 tabular-nums'
  const style: React.CSSProperties = { padding: '5px 11px', borderRadius: 999, fontSize: 12.5, fontWeight: 800,
    background: 'linear-gradient(180deg, rgba(20,15,28,0.95), rgba(8,6,14,0.95))', border: `1px solid rgba(${accent},0.55)`, color: `rgb(${accent})`,
    boxShadow: `inset 0 1px 0 rgba(255,255,255,0.08), 0 0 8px rgba(${accent},0.18)` }
  return onClick ? <button onClick={onClick} className={cls} style={style}>{icon}{value}</button> : <span className={cls} style={style}>{icon}{value}</span>
}
export function IconBtn({ children, onClick, badge, label }: { children: ReactNode; onClick?: () => void; badge?: number | string | null; label?: string }) {
  return (
    <button onClick={onClick} aria-label={label} className="rvn-press relative inline-flex items-center justify-center"
      style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(180deg, rgba(20,15,28,0.95), rgba(8,6,14,0.95))', border: `1px solid rgba(${GOLD},0.4)`, color: `rgb(${GOLD})`, boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08)' }}>
      {children}
      {badge != null && badge !== 0 && <span className="rvn-badge-pulse absolute flex items-center justify-center" style={{ top: -3, right: -3, minWidth: 16, height: 16, padding: '0 3px', borderRadius: 8, fontSize: 9, fontWeight: 800, background: '#ef4444', color: '#fff', border: '1px solid #0a0810' }}>{badge}</span>}
    </button>
  )
}

// ── RewardBanner (live) ───────────────────────────────────────────────────────
function MiniReward({ icon, amount, accent = GOLD }: { icon: string; amount: string; accent?: string }) {
  return (
    <span className="flex flex-col items-center justify-center shrink-0" style={{ width: 42, height: 44, borderRadius: 9, background: 'linear-gradient(165deg, rgba(46,34,64,0.9), rgba(12,9,18,0.95))', border: `1px solid rgba(${accent},0.45)`, boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08)' }}>
      <span style={{ fontSize: 17, lineHeight: 1 }}>{icon}</span>
      <span className="rvn-disp" style={{ fontSize: 9, fontWeight: 800, color: `rgb(${accent})`, marginTop: 1 }}>{amount}</span>
    </span>
  )
}
export function RewardBanner({ streak, claimable, onClaim }: { streak: number; claimable: boolean; onClaim?: () => void }) {
  return (
    <div className={`rvn-panel rvn-fade flex items-center gap-3 ${claimable ? 'rvn-glow' : ''}`} style={{ padding: '10px 12px', borderColor: claimable ? `rgba(${GOLD},0.5)` : undefined }}>
      <span className="flex items-center justify-center shrink-0" style={{ width: 36, height: 38, filter: 'drop-shadow(0 0 8px rgba(251,120,40,0.5))' }}><RvnIcon name="flame" size={28} fallback={<span style={{ fontSize: 24 }}>🔥</span>} /></span>
      <span className="flex-1 min-w-0">
        <span className="block rvn-disp" style={{ fontSize: 14, fontWeight: 700, color: '#f3ead3' }}>{streak} d. prisijungimo serija</span>
        <span className="block" style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>{claimable ? 'Atlygis paruoštas!' : 'Kitas atlygis rytoj'}</span>
      </span>
      <MiniReward icon="🪙" amount="x250" />
      <MiniReward icon="📜" amount="x1" accent="139,92,246" />
      <button onClick={claimable ? onClaim : undefined} disabled={!claimable} className="rvn-press rvn-gold-btn shrink-0" style={{ padding: '9px 16px', fontSize: 13 }}>
        {claimable ? 'Atsiimti' : 'Atsiimta'}
      </button>
    </div>
  )
}

// ── ModeSelector ──────────────────────────────────────────────────────────────
export type HubMode = { key: string; label: string; sub: string; icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>; accent: string; locked?: boolean }
export function ModeSelector({ modes, selected, onSelect }: { modes: HubMode[]; selected: string; onSelect: (k: string) => void }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {modes.map((m) => {
        const Icon = m.icon; const sel = m.key === selected && !m.locked
        return (
          <button key={m.key} disabled={m.locked} onClick={() => !m.locked && onSelect(m.key)} className={`rvn-press relative flex flex-col items-center justify-center text-center ${sel ? 'rvn-sel' : ''}`}
            style={{ minHeight: 70, borderRadius: 11, padding: '9px 4px', gap: 4, opacity: m.locked ? 0.5 : 1,
              background: sel ? `linear-gradient(165deg, rgba(${m.accent},0.30), rgba(10,8,16,0.92))` : 'linear-gradient(165deg, rgba(24,18,34,0.9), rgba(10,8,16,0.92))',
              border: `1px solid rgba(${m.accent},${sel ? 0.7 : 0.3})`, boxShadow: sel ? undefined : 'inset 0 1px 0 rgba(255,255,255,0.04)' }}>
            {m.locked ? <Lock className="w-[18px] h-[18px]" style={{ color: 'var(--text-muted)' }} /> : <RvnIcon name={`mode-${m.key}`} size={22} fallback={<Icon className="w-[19px] h-[19px]" style={{ color: `rgb(${m.accent})`, filter: `drop-shadow(0 0 5px rgba(${m.accent},0.6))` }} />} />}
            <span className="rvn-disp" style={{ fontSize: 11, fontWeight: 700, color: '#f3ead3', lineHeight: 1.05 }}>{m.label}</span>
            <span style={{ fontSize: 8.5, color: 'var(--text-muted)' }}>{m.locked ? 'Greitai' : m.sub}</span>
          </button>
        )
      })}
    </div>
  )
}

// ── PlayHeroCard ──────────────────────────────────────────────────────────────
export function PlayHeroCard({ subtitle, ctaLabel = 'Pradėti kovą', onCta, children }: { subtitle: string; ctaLabel?: string; onCta: () => void; children?: ReactNode }) {
  return (
    <div className="relative rvn-fade overflow-hidden" style={{ borderRadius: 18, border: `1px solid rgba(${GOLD},0.45)`, boxShadow: `inset 0 1px 0 rgba(255,255,255,0.06), 0 10px 30px rgba(0,0,0,0.55)` }}>
      <div className="absolute inset-0" style={{ background: 'radial-gradient(130% 90% at 50% -10%, rgba(150,40,50,0.45), transparent 55%), radial-gradient(90% 70% at 50% 6%, rgba(240,180,41,0.16), transparent 60%), linear-gradient(170deg, #1d1018 0%, #0a0810 70%)' }} />
      <div className="absolute inset-x-0 top-0" style={{ height: 3, background: `linear-gradient(90deg, transparent, rgba(${GOLD},0.8), transparent)` }} />
      <div className="relative p-4 flex flex-col" style={{ gap: 12 }}>
        <div className="text-center">
          <h1 className="rvn-disp" style={{ fontSize: 27, fontWeight: 800, color: `rgb(${GOLD})`, letterSpacing: '0.12em', margin: 0, textShadow: `0 2px 6px #000, 0 0 26px rgba(${GOLD},0.55)` }}>ŽAISTI DABAR</h1>
          <p style={{ fontSize: 11.5, color: '#e8dcc0', marginTop: 3 }}>{subtitle}</p>
        </div>
        <button onClick={onCta} className="rvn-press rvn-gold-btn rvn-glow w-full" style={{ padding: '14px', fontSize: 17, letterSpacing: '0.03em', maxWidth: 440, margin: '0 auto', borderRadius: 13 }}>{ctaLabel}</button>
        <div>{children}</div>
      </div>
    </div>
  )
}

// ── QuickActionCard ───────────────────────────────────────────────────────────
export function QuickActionCard({ icon, iconName, label, sub, accent = GOLD, badge, href, onClick }: { icon: ReactNode; iconName?: string; label: string; sub: string; accent?: string; badge?: ReactNode; href?: string; onClick?: () => void }) {
  const inner = (
    <div className="rvn-press rvn-panel relative flex items-center gap-3" style={{ padding: '12px', minHeight: 66, borderColor: `rgba(${accent},0.32)` }}>
      <span className="flex items-center justify-center shrink-0" style={{ width: 42, height: 42, borderRadius: 12, color: `rgb(${accent})`,
        background: `radial-gradient(circle at 50% 35%, rgba(${accent},0.28), rgba(${accent},0.08))`, border: `1px solid rgba(${accent},0.5)`, boxShadow: `inset 0 1px 0 rgba(255,255,255,0.1), 0 0 10px rgba(${accent},0.2)` }}>{iconName ? <RvnIcon name={iconName} size={24} fallback={icon} /> : icon}</span>
      <span className="flex flex-col min-w-0" style={{ gap: 2 }}>
        <span className="truncate rvn-disp" style={{ fontSize: 14, fontWeight: 700, color: '#f3ead3' }}>{label}</span>
        <span className="truncate" style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>{sub}</span>
      </span>
      <ChevronRight className="w-4 h-4 ml-auto shrink-0" style={{ color: 'rgba(255,255,255,0.35)' }} />
      {badge != null && <span className="absolute" style={{ top: 8, right: 26 }}>{badge}</span>}
    </div>
  )
  return href ? <Link href={href} onClick={onClick}>{inner}</Link> : <button type="button" onClick={onClick} className="w-full text-left">{inner}</button>
}

export function CountBadge({ n, accent = '239,68,68' }: { n: number | string; accent?: string }) {
  return <span className="rvn-badge-pulse inline-flex items-center justify-center" style={{ minWidth: 18, height: 18, padding: '0 5px', borderRadius: 9, fontSize: 10, fontWeight: 800, background: `rgb(${accent})`, color: '#fff', border: '1px solid #0a0810' }}>{n}</span>
}

// ── StatCard (Sezono kelias / Mokymai) — live ────────────────────────────────
export function StatCard({ emblemIcon, emblemName, title, sub, value, pct, accent = GOLD, chips, href, onClick }: { emblemIcon: ReactNode; emblemName?: string; title: string; sub: string; value: string; pct: number; accent?: string; chips?: ReactNode; href?: string; onClick?: () => void }) {
  const inner = (
    <div className="rvn-press rvn-panel flex items-center gap-3" style={{ padding: '12px 14px', borderColor: `rgba(${accent},0.32)` }}>
      <span className="flex items-center justify-center shrink-0" style={{ width: 48, height: 48, borderRadius: 13, color: `rgb(${accent})`,
        background: `radial-gradient(circle at 50% 32%, rgba(${accent},0.32), rgba(${accent},0.08))`, border: `1px solid rgba(${accent},0.55)`, boxShadow: `inset 0 1px 0 rgba(255,255,255,0.12), 0 0 12px rgba(${accent},0.25)` }}>{emblemName ? <RvnIcon name={emblemName} size={30} fallback={emblemIcon} /> : emblemIcon}</span>
      <span className="flex-1 min-w-0">
        <span className="block rvn-disp" style={{ fontSize: 15, fontWeight: 800, color: '#f3ead3', letterSpacing: '0.02em' }}>{title}</span>
        <span className="block" style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>{sub}</span>
        <span className="flex items-center gap-2" style={{ marginTop: 6 }}>
          <span style={{ flex: 1, height: 6, borderRadius: 4, background: 'rgba(255,255,255,0.09)', overflow: 'hidden', boxShadow: 'inset 0 0 3px rgba(0,0,0,0.6)' }}>
            <span style={{ display: 'block', height: '100%', width: `${Math.max(2, Math.min(100, pct))}%`, background: `linear-gradient(90deg, rgba(${accent},0.7), rgb(${accent}))`, boxShadow: `0 0 8px rgba(${accent},0.55)` }} />
          </span>
          <span className="tabular-nums rvn-disp shrink-0" style={{ fontSize: 10.5, fontWeight: 700, color: `rgb(${accent})` }}>{value}</span>
        </span>
      </span>
      {chips && <span className="flex items-center gap-1 shrink-0">{chips}</span>}
      <ChevronRight className="w-4 h-4 shrink-0" style={{ color: 'rgba(255,255,255,0.35)' }} />
    </div>
  )
  return href ? <Link href={href} onClick={onClick}>{inner}</Link> : <button type="button" onClick={onClick} className="w-full text-left">{inner}</button>
}

export function RewardChip({ icon, amount, accent = GOLD }: { icon: string; amount: string; accent?: string }) {
  return (
    <span className="flex flex-col items-center justify-center" style={{ width: 38, height: 42, borderRadius: 8, background: 'linear-gradient(165deg, rgba(46,34,64,0.9), rgba(12,9,18,0.95))', border: `1px solid rgba(${accent},0.45)` }}>
      <span style={{ fontSize: 15, lineHeight: 1 }}>{icon}</span>
      <span className="rvn-disp" style={{ fontSize: 8.5, fontWeight: 800, color: `rgb(${accent})` }}>{amount}</span>
    </span>
  )
}
