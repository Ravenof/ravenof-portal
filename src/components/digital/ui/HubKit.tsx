'use client'

// ════════════════════════════════════════════════════════════════════════════
// HubKit — premium dark-fantasy mobile game hub, GRYNAS CSS (jokių raster assetų).
// Gilūs juodi/violetiniai paneliai, auksiniai rėmai, stiprus CTA, glow akcentai.
// Visi duomenys gyvi (perduodami iš DigitalHub).
// ════════════════════════════════════════════════════════════════════════════

import Link from 'next/link'
import { useEffect, useState, type ReactNode } from 'react'
import { ChevronRight } from 'lucide-react'
import { RvnIcon } from './RvnIcon'
import { streakDayReward } from '@/lib/gamification/quests'

const GOLD = '240,180,41'
export const ASSET = '/digital/ui3'

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
    /* Glow be per-frame repaint: statinis šešėlis ant ::after, animuojama tik opacity (kompozitoriuje) */
    .rvn-glow { position: relative; }
    .rvn-glow::after { content: ''; position: absolute; inset: -1px; border-radius: inherit; pointer-events: none;
      box-shadow: 0 0 26px rgba(${GOLD},0.6); opacity: 0.35; animation: rvnGlowO 2.4s ease-in-out infinite; }
    @keyframes rvnGlowO { 0%,100%{ opacity: 0.3; } 50%{ opacity: 1; } }
    .rvn-badge-pulse { animation: rvnBadge 1.8s ease-in-out infinite; }
    @keyframes rvnBadge { 0%,100%{ transform: scale(1); } 50%{ transform: scale(1.16); } }
    .rvn-sel { animation: rvnSel 2.2s ease-in-out infinite; }
    @keyframes rvnSel { 0%,100%{ box-shadow: inset 0 0 0 1.5px rgba(${GOLD},0.85), 0 0 14px rgba(${GOLD},0.35); } 50%{ box-shadow: inset 0 0 0 2px rgba(${GOLD},1), 0 0 24px rgba(${GOLD},0.6); } }
    @keyframes rvnFade { from{ opacity:0; transform: translateY(8px);} to{ opacity:1; transform:none;} }
    .rvn-fade { animation: rvnFade .26s ease-out both; }
    .rvn-disp { font-family: var(--rvn-font-display, Cinzel, serif); }
    .rvn-imgcard .hi { position:absolute; inset:0; width:100%; opacity:0; transition:opacity .14s ease; }
    .rvn-imgcard:active .hi { opacity:1; }
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
function MiniReward({ icon, img, amount, accent = GOLD }: { icon: string; img?: string; amount: string; accent?: string }) {
  return (
    <span className="flex flex-col items-center justify-center shrink-0" style={{ width: 42, height: 44, borderRadius: 9, background: 'linear-gradient(165deg, rgba(46,34,64,0.9), rgba(12,9,18,0.95))', border: `1px solid rgba(${accent},0.45)`, boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08)' }}>
      {img ? <RvnIcon name={img} size={20} fallback={<span style={{ fontSize: 17, lineHeight: 1 }}>{icon}</span>} /> : <span style={{ fontSize: 17, lineHeight: 1 }}>{icon}</span>}
      <span className="rvn-disp" style={{ fontSize: 9, fontWeight: 800, color: `rgb(${accent})`, marginTop: 1 }}>{amount}</span>
    </span>
  )
}
export function RewardBanner({ streak, claimable, onClaim }: { streak: number; claimable: boolean; onClaim?: () => void }) {
  // Tikri prizai iš serijos formulės: šiandienos (jei paruošta) arba rytojaus preview
  const today = streakDayReward(Math.max(1, streak))
  const tomorrow = streakDayReward(Math.max(1, streak) + 1)
  const shown = claimable ? today : tomorrow
  return (
    <div className={`rvn-panel rvn-fade flex items-center gap-3 ${claimable ? 'rvn-glow' : ''}`} style={{ padding: '10px 12px', borderColor: claimable ? `rgba(${GOLD},0.5)` : undefined }}>
      <span className="flex items-center justify-center shrink-0" style={{ width: 36, height: 38, filter: 'drop-shadow(0 0 8px rgba(251,120,40,0.5))' }}><RvnIcon name="flame" size={28} fallback={<span style={{ fontSize: 24 }}>🔥</span>} /></span>
      <span className="flex-1 min-w-0" style={{ paddingRight: 4 }}>
        <span className="block rvn-disp" style={{ fontSize: 14, fontWeight: 700, color: '#f3ead3', lineHeight: 1.25 }}>{streak} d. serija</span>
        <span className="block" style={{ fontSize: 10.5, color: 'var(--text-muted)', lineHeight: 1.3 }}>{claimable ? 'Prisijungimo atlygis paruoštas!' : `Rytoj: 🪙 ${tomorrow.gold}${tomorrow.booster ? ' + 🎁 pakuotė' : ''}`}</span>
      </span>
      <MiniReward icon="🪙" img="fi-coins" amount={`x${shown.gold}`} />
      {shown.booster && <MiniReward icon="🎁" img="fi-gifts" amount="x1" accent="139,92,246" />}
      <button onClick={claimable ? onClaim : undefined} disabled={!claimable} className="rvn-press rvn-gold-btn shrink-0" style={{ padding: '9px 16px', fontSize: 13 }}>
        {claimable ? 'Atsiimti' : 'Atsiimta'}
      </button>
    </div>
  )
}

// ── ModeSelector ──────────────────────────────────────────────────────────────
export type HubMode = { key: string; label: string; sub?: string; iconName: string; iconFallback?: ReactNode; accent: string; locked?: boolean }
// Pilno asset'o kovos režimų kortelės: PNG jau turi rėmą, emblemą ir LT pavadinimą —
// jokių papildomų ikonų/tekstų ant viršaus. Pavadinimas lieka aria-label.
// Failai: /digital/home/battle-modes/{ranked,against-ai,friendly}.png (vienodi matmenys ~3:1,
// permatomas fonas, be baltų kraštų). Kol failo nėra — fallback į seną mode2-* asset'ą.
const MODE_ASSET: Record<string, { src: string; fallback: string; glow: string }> = {
  ranked: { src: '/digital/home/battle-modes/ranked.png?v=2',     fallback: '/digital/ui3/mode2-ranked.png', glow: 'rgba(239,68,68,0.55)' },
  pve:    { src: '/digital/home/battle-modes/against-ai.png?v=2', fallback: '/digital/ui3/mode2-pve.png',    glow: 'rgba(52,211,153,0.5)' },
  free:   { src: '/digital/home/battle-modes/friendly.png?v=2',   fallback: '/digital/ui3/mode2-free.png',   glow: 'rgba(240,180,41,0.5)' },
}

function BattleModeCard({ mode, ariaLabel, selected, locked, onSelect }: {
  mode: string; ariaLabel: string; selected: boolean; locked?: boolean; onSelect: () => void
}) {
  const def = MODE_ASSET[mode] ?? MODE_ASSET.free
  const [src, setSrc] = useState(def.src)
  return (
    <button disabled={locked} onClick={() => !locked && onSelect()}
      aria-label={ariaLabel} aria-pressed={selected} data-selected={selected || undefined} data-mode={mode}
      className="rvn-press relative block w-full min-w-0"
      style={{
        aspectRatio: '3 / 1', border: 0, padding: 0, background: 'transparent', cursor: locked ? 'default' : 'pointer',
        opacity: locked ? 0.4 : selected ? 1 : 0.72,
        filter: selected ? `saturate(1.08) brightness(1.06) drop-shadow(0 0 12px ${def.glow})` : 'saturate(0.72) brightness(0.82)',
        transform: selected ? 'translateY(-2px) scale(1.03)' : 'translateZ(0)',
        transition: 'transform 180ms ease, opacity 180ms ease, filter 180ms ease',
        zIndex: selected ? 1 : 0,
      }}>
      {selected && <span aria-hidden className="absolute" style={{ top: -4, left: '50%', width: 9, height: 9,
        transform: 'translateX(-50%) rotate(45deg)', background: 'linear-gradient(135deg,#ffe28c,#c5841a)',
        border: '1px solid rgba(255,235,180,0.9)', boxShadow: `0 0 8px ${def.glow}`, zIndex: 2 }} />}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" aria-hidden loading="eager"
        onError={() => { if (src !== def.fallback) { console.warn('[BattleModeCard] trūksta asset:', src); setSrc(def.fallback) } }}
        className="block w-full h-full pointer-events-none select-none"
        style={{ objectFit: 'contain', objectPosition: 'center' }} />
    </button>
  )
}

export function ModeSelector({ modes, selected, onSelect }: { modes: HubMode[]; selected: string; onSelect: (k: string) => void }) {
  // Preload — kad seni asset'ai nemirgėtų
  useEffect(() => {
    for (const k of Object.keys(MODE_ASSET)) { const im = new Image(); im.src = MODE_ASSET[k].src }
  }, [])
  return (
    <div className="grid" style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 6, paddingTop: 4, margin: '0 -12px -8px' }}>
      {modes.map((m) => (
        <BattleModeCard key={m.key} mode={m.key} ariaLabel={m.label} selected={m.key === selected && !m.locked} locked={m.locked} onSelect={() => onSelect(m.key)} />
      ))}
    </div>
  )
}

// ── PlayHeroCard ──────────────────────────────────────────────────────────────
export function PlayHeroCard({ subtitle, onCta, children }: { subtitle: string; onCta: () => void; children?: ReactNode }) {
  return (
    <div className="relative rvn-fade overflow-hidden" style={{ borderRadius: 18, border: `1px solid rgba(${GOLD},0.45)`, boxShadow: `inset 0 1px 0 rgba(255,255,255,0.06), 0 10px 30px rgba(0,0,0,0.55)` }}>
      <img src={`${ASSET}/hero.webp`} alt="" className="absolute inset-0 w-full h-full object-cover" />
      <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(8,6,14,0.22) 0%, rgba(8,6,14,0.48) 55%, rgba(8,6,14,0.82) 100%)' }} />
      <div className="relative flex flex-col" style={{ gap: 8, padding: '12px 14px 12px' }}>
        <div className="flex flex-col items-center" style={{ gap: 3 }}>
          <img src={`${ASSET}/heading.png`} alt="Žaisti dabar" style={{ height: 'clamp(28px,5vh,38px)', width: 'auto', filter: 'drop-shadow(0 3px 8px #000)' }} />
          <span style={{ fontSize: 11, color: '#cfc6b8', textShadow: '0 1px 4px #000', letterSpacing: '0.02em' }}>{subtitle}</span>
        </div>
        <button onClick={onCta} className="rvn-press block w-full" style={{ lineHeight: 0, maxWidth: 300, margin: '2px auto 0', filter: `drop-shadow(0 4px 12px rgba(${GOLD},0.35))` }}>
          <img src={`${ASSET}/cta2.png`} alt="Pradėti kovą" className="w-full block" />
        </button>
        <div>{children}</div>
      </div>
    </div>
  )
}

// ── QuickActionCard ───────────────────────────────────────────────────────────
export function QuickActionCard({ image, badge, href, onClick }: { image: string; badge?: ReactNode; href?: string; onClick?: () => void }) {
  const hi = image.replace('.webp', '-hi.webp')
  const inner = (
    <div className="rvn-press rvn-imgcard relative w-full overflow-hidden" style={{ borderRadius: 14, lineHeight: 0 }}>
      <img src={image} alt="" className="w-full block" />
      <img src={hi} alt="" className="hi" />
      {badge != null && <span className="absolute" style={{ top: 8, right: 12, lineHeight: 1 }}>{badge}</span>}
    </div>
  )
  return href ? <Link href={href} onClick={onClick}>{inner}</Link> : <button type="button" onClick={onClick} className="w-full">{inner}</button>
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

export function RewardChip({ icon, img, amount, accent = GOLD }: { icon: string; img?: string; amount: string; accent?: string }) {
  return (
    <span className="flex flex-col items-center justify-center" style={{ width: 38, height: 42, borderRadius: 8, background: 'linear-gradient(165deg, rgba(46,34,64,0.9), rgba(12,9,18,0.95))', border: `1px solid rgba(${accent},0.45)` }}>
      {img ? <RvnIcon name={img} size={18} fallback={<span style={{ fontSize: 15, lineHeight: 1 }}>{icon}</span>} /> : <span style={{ fontSize: 15, lineHeight: 1 }}>{icon}</span>}
      <span className="rvn-disp" style={{ fontSize: 8.5, fontWeight: 800, color: `rgb(${accent})` }}>{amount}</span>
    </span>
  )
}

// ── Premium tuščios būsenos (empty state) su aiškiu CTA ──────────────────────
export function EmptyState({ icon, title, sub, accent = GOLD, ctaLabel, onCta, ctaHref, secondary }: {
  icon: ReactNode; title: string; sub?: string; accent?: string
  ctaLabel?: string; onCta?: () => void; ctaHref?: string; secondary?: ReactNode
}) {
  const cta = ctaLabel ? (
    ctaHref ? (
      <Link href={ctaHref} onClick={onCta} className="rvn-press inline-flex items-center justify-center gap-2 px-6 rounded-xl text-sm font-extrabold rvn-disp"
        style={{ minHeight: 48, background: `linear-gradient(180deg, rgb(${accent}), rgba(${accent},0.82))`, color: '#1a0f04', boxShadow: `0 8px 22px rgba(${accent},0.32)`, letterSpacing: '0.02em' }}>{ctaLabel}</Link>
    ) : (
      <button onClick={onCta} className="rvn-press inline-flex items-center justify-center gap-2 px-6 rounded-xl text-sm font-extrabold rvn-disp"
        style={{ minHeight: 48, background: `linear-gradient(180deg, rgb(${accent}), rgba(${accent},0.82))`, color: '#1a0f04', boxShadow: `0 8px 22px rgba(${accent},0.32)`, letterSpacing: '0.02em' }}>{ctaLabel}</button>
    )
  ) : null
  return (
    <div className="rvn-fade flex flex-col items-center justify-center text-center gap-4 py-14 px-6">
      <div className="relative flex items-center justify-center" style={{ width: 96, height: 96 }}>
        <span className="absolute inset-0 rounded-full rvn-glow-pulse" style={{ background: `radial-gradient(circle, rgba(${accent},0.22), transparent 70%)` }} />
        <span className="relative" style={{ fontSize: 46, filter: `drop-shadow(0 4px 14px rgba(${accent},0.4))` }}>{icon}</span>
      </div>
      <div className="max-w-[280px]">
        <p className="rvn-disp" style={{ fontSize: 17, fontWeight: 800, color: '#f3ead3' }}>{title}</p>
        {sub && <p className="mt-1.5" style={{ fontSize: 12.5, lineHeight: 1.5, color: 'var(--text-muted)' }}>{sub}</p>}
      </div>
      {cta}
      {secondary}
    </div>
  )
}


// ── Divider (auksinis ornamentas) ─────────────────────────────────────────────
export function Divider({ width = 190, style }: { width?: number; style?: React.CSSProperties }) {
  return <img src={`${ASSET}/divider.png`} alt="" aria-hidden style={{ width, height: 'auto', display: 'block', margin: '0 auto', opacity: 0.9, ...style }} />
}

// ── PageHero — vieninga sub-puslapio antraštė (dark fantasy) ─────────────────
export function PageHero({ iconName, icon, title, sub, accent = GOLD, compact }: {
  iconName?: string; icon?: ReactNode; title: string; sub?: string; accent?: string; compact?: boolean
}) {
  if (compact) {
    return (
      <div className="rvn-fade flex items-center gap-3" style={{ padding: '2px 2px 6px' }}>
        <span className="flex items-center justify-center shrink-0" style={{ width: 40, height: 40, filter: `drop-shadow(0 3px 8px rgba(${accent},0.45))` }}>
          {iconName ? <RvnIcon name={iconName} size={38} fallback={icon ?? null} /> : icon}
        </span>
        <span className="flex-1 min-w-0">
          <span className="block rvn-disp truncate" style={{ fontSize: 18, fontWeight: 800, color: 'var(--gold)', letterSpacing: '0.08em', textShadow: `0 0 14px rgba(${accent},0.35)` }}>{title}</span>
          {sub && <span className="block" style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>{sub}</span>}
        </span>
      </div>
    )
  }
  return (
    <div className="relative rvn-fade overflow-hidden" style={{ borderRadius: 18, border: `1px solid rgba(${accent},0.38)`,
      background: `radial-gradient(130% 90% at 50% 0%, rgba(${accent},0.15), rgba(10,8,16,0.97) 62%), linear-gradient(160deg,#17111f,#0a0810)`,
      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05), 0 8px 26px rgba(0,0,0,0.5)' }}>
      <div className="px-5 pt-5 pb-4 text-center">
        <span className="inline-flex items-center justify-center" style={{ width: 64, height: 64, filter: `drop-shadow(0 4px 14px rgba(${accent},0.5))` }}>
          {iconName ? <RvnIcon name={iconName} size={60} fallback={icon ?? null} /> : icon}
        </span>
        <h1 className="rvn-disp" style={{ fontSize: 22, fontWeight: 800, color: 'var(--gold)', letterSpacing: '0.1em', textShadow: `0 0 18px rgba(${accent},0.4)`, marginTop: 4 }}>{title}</h1>
        <Divider width={170} style={{ marginTop: 7 }} />
        {sub && <p style={{ fontSize: 11, marginTop: 8, lineHeight: 1.55, color: 'var(--text-muted)', maxWidth: 420, marginLeft: 'auto', marginRight: 'auto' }}>{sub}</p>}
      </div>
    </div>
  )
}

// ── GoldPlate — auksinis CTA su asset plokšte ────────────────────────────────
export function GoldPlate({ label, onClick, href, disabled, maxWidth = 300 }: {
  label: string; onClick?: () => void; href?: string; disabled?: boolean; maxWidth?: number
}) {
  const inner = (
    <span className="relative block" style={{ lineHeight: 0, filter: disabled ? 'grayscale(0.65) brightness(0.7)' : `drop-shadow(0 4px 12px rgba(${GOLD},0.3))` }}>
      <img src={`${ASSET}/cta-blank.png`} alt="" className="w-full block" />
      <span className="absolute inset-0 flex items-center justify-center rvn-disp" style={{ fontSize: 17, fontWeight: 800, color: '#3a2406', textShadow: '0 1px 0 rgba(255,255,255,0.4)', letterSpacing: '0.02em' }}>{label}</span>
    </span>
  )
  if (href && !disabled) return <Link href={href} onClick={onClick} className="rvn-press block w-full mx-auto" style={{ maxWidth }}>{inner}</Link>
  return <button onClick={onClick} disabled={disabled} className="rvn-press block w-full mx-auto" style={{ maxWidth }}>{inner}</button>
}
