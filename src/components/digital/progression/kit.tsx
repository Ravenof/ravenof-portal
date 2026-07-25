'use client'
// ════════════════════════════════════════════════════════════════════════════
//  Progresijos ekranų bendri elementai (patvirtintas dizainas)
//  Šaltinis: Raveknof Digital Phase 5 continuation/ravenof-progression-handoff
//  SVARBU: jokių atlygio sumų čia NĖRA — viskas ateina iš serverio DTO.
// ════════════════════════════════════════════════════════════════════════════
import { useCallback, useEffect, useRef, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { resolveRewardVisualV2 } from '@/lib/rewards/rewardVisuals'
import type { RewardDefinition } from '@/lib/progression'
import { useT } from '@/lib/i18n/react'

// ── Tokenai (CSS kintamieji apibrėžti ravenof-ui.css) ───────────────────────
export const C = {
  bg: 'var(--rvn-bg)', raised: 'var(--rvn-raised)', surface: 'var(--rvn-surface)',
  plum: 'var(--rvn-plum)', gold: 'var(--rvn-gold)', goldHi: 'var(--rvn-gold-hi)',
  bone: 'var(--rvn-bone)', muted: 'var(--rvn-muted)', label: 'var(--rvn-label)',
  line: 'var(--rvn-line)', lineIn: 'var(--rvn-line-in)', lineDis: 'var(--rvn-line-dis)',
  green: 'var(--rvn-green)', greenFg: 'var(--rvn-green-fg)',
  violet: 'var(--rvn-violet)', violetFg: 'var(--rvn-violet-fg)',
  burgundy: 'var(--rvn-burgundy)', burgundyFg: 'var(--rvn-burgundy-fg)',
}
export const DISPLAY = "Cinzel, var(--ravenof-font-display), serif"
export const BODY = "'Alegreya Sans', var(--ravenof-font-body), sans-serif"

export const ART = {
  fortress: '/ravenof-ui/backgrounds/background-misty-fortress.webp',
  cathedral: '/ravenof-ui/backgrounds/background-cathedral-ruins.webp',
  questToken: '/ravenof-ui/rewards/daily-quest-token.png',
  chest: '/digital/icons/fi-gifts.png',
}

// ── Maži primityvai ─────────────────────────────────────────────────────────
export function Kicker({ children, color = C.label, style }: { children: ReactNode; color?: string; style?: CSSProperties }) {
  return (
    <div style={{ font: `500 8.5px ${BODY}`, letterSpacing: 2.2, color, textTransform: 'uppercase', ...style }}>
      {children}
    </div>
  )
}

export function Divider({ margin = 14 }: { margin?: number }) {
  return <div aria-hidden style={{ height: 1, background: C.line, margin: `${margin}px 0` }} />
}

export function ProgressBar({ pct, height = 5 }: { pct: number; height?: number }) {
  return (
    <div style={{ height, background: C.plum, border: `1px solid ${C.lineIn}`, position: 'relative' }}>
      <span style={{ display: 'block', height: '100%', width: `${Math.max(0, Math.min(100, pct))}%`, background: 'linear-gradient(90deg,#8a6c2c,var(--rvn-gold-hi))' }} />
    </div>
  )
}

/** Atgalinis laikas iki serverio nurodyto momento (rodomas vietiniu laiku). */
export function useCountdown(iso: string | null | undefined): string {
  const [left, setLeft] = useState('')
  useEffect(() => {
    if (!iso) { setLeft(''); return }
    const target = new Date(iso).getTime()
    const tick = () => {
      const ms = Math.max(0, target - Date.now())
      const h = Math.floor(ms / 3_600_000)
      const m = Math.floor((ms % 3_600_000) / 60_000)
      const s = Math.floor((ms % 60_000) / 1000)
      setLeft(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`)
    }
    tick()
    const iv = window.setInterval(tick, 1000)
    return () => window.clearInterval(iv)
  }, [iso])
  return left
}

export function ResetChip({ at }: { at: string | null | undefined }) {
  const t = useT()
  const left = useCountdown(at)
  if (!left) return null
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, border: `1px solid ${C.lineIn}`, background: 'rgba(7,6,10,.7)', padding: '6px 9px' }}>
      <span aria-hidden style={{ width: 6, height: 6, background: C.gold, transform: 'rotate(45deg)', flex: 'none' }} />
      <span style={{ font: `400 10px ${BODY}`, color: C.muted }}>
        {t('progression.common.resetsIn')} <span style={{ color: C.bone, fontWeight: 700 }}>{left}</span>
      </span>
    </div>
  )
}

// ── Atlygio ikona / chip'as (vizualai TIK iš centrinio registro) ────────────
export function RewardIcon({ reward, size = 20 }: { reward: RewardDefinition; size?: number }) {
  const v = resolveRewardVisualV2(reward)
  const [src, setSrc] = useState(v.asset)
  useEffect(() => { setSrc(v.asset) }, [v.asset])
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" aria-hidden onError={() => setSrc(v.fallbackAsset)}
      style={{ width: size, height: size, objectFit: 'contain', transform: `scale(${v.opticalScale})`, flex: 'none' }} />
  )
}

export function rewardLabel(reward: RewardDefinition): string {
  return resolveRewardVisualV2(reward).label
}
export function rewardName(reward: RewardDefinition): string {
  return resolveRewardVisualV2(reward).name
}

const CHIP_TONE: Record<string, { border: string; bg: string; fg: string }> = {
  season_xp: { border: 'rgba(118,80,164,.4)', bg: 'rgba(118,80,164,.1)', fg: 'var(--rvn-violet-fg)' },
  default: { border: 'rgba(198,161,79,.35)', bg: 'rgba(198,161,79,.07)', fg: 'var(--rvn-gold-hi)' },
}

export function RewardChip({ reward, iconSize = 12 }: { reward: RewardDefinition; iconSize?: number }) {
  const tone = CHIP_TONE[reward.type] ?? CHIP_TONE.default
  return (
    <div title={rewardName(reward)}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 5, border: `1px solid ${tone.border}`, background: tone.bg, padding: '4px 8px' }}>
      <RewardIcon reward={reward} size={iconSize} />
      <span style={{ font: `700 10.5px ${BODY}`, color: tone.fg, whiteSpace: 'nowrap' }}>{rewardLabel(reward)}</span>
    </div>
  )
}

export function RewardRow({ rewards, iconSize = 12 }: { rewards: RewardDefinition[]; iconSize?: number }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
      {rewards.map((r, i) => <RewardChip key={i} reward={r} iconSize={iconSize} />)}
    </div>
  )
}

// ── CTA ─────────────────────────────────────────────────────────────────────
export function Cta({ children, onClick, disabled, busy, tone = 'gold', minHeight = 44, style }: {
  children: ReactNode; onClick?: () => void; disabled?: boolean; busy?: boolean
  tone?: 'gold' | 'ghost' | 'green'; minHeight?: number; style?: CSSProperties
}) {
  const bg = disabled ? '#1a1620'
    : tone === 'gold' ? 'linear-gradient(180deg,#E2B958,#b98f38)'
    : tone === 'green' ? 'rgba(62,139,109,.18)' : 'transparent'
  const fg = disabled ? C.lineDis : tone === 'gold' ? '#1a1206' : tone === 'green' ? C.greenFg : C.bone
  return (
    <button type="button" onClick={onClick} disabled={disabled || busy}
      className="rvn-prog-cta"
      style={{
        minHeight, width: '100%', border: tone === 'gold' ? 0 : `1px solid ${disabled ? C.lineIn : C.gold}`,
        background: bg, color: fg, cursor: disabled || busy ? 'default' : 'pointer',
        font: `800 12px ${DISPLAY}`, letterSpacing: 1.8, textTransform: 'uppercase',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '0 14px',
        opacity: busy ? 0.7 : 1, ...style,
      }}>
      {busy && <span aria-hidden style={{ width: 13, height: 13, border: `2px solid ${C.lineIn}`, borderTopColor: fg, borderRadius: '50%', animation: 'rvSpin 1s linear infinite' }} />}
      {children}
    </button>
  )
}

// ── Modalo karkasas (Escape + focus trap + fokuso grąžinimas) ──────────────
export function ProgressionModal({ open, onClose, title, kicker, width = 560, children, footer, closeLabel }: {
  open: boolean; onClose: () => void; title: string; kicker?: string
  width?: number; children: ReactNode; footer?: ReactNode; closeLabel: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const restore = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!open) return
    restore.current = document.activeElement as HTMLElement | null
    const el = ref.current
    const focusables = () => Array.from(el?.querySelectorAll<HTMLElement>(
      'button:not([disabled]),[href],input,select,textarea,[tabindex]:not([tabindex="-1"])') ?? [])
    focusables()[0]?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopPropagation(); onClose(); return }
      if (e.key !== 'Tab') return
      const f = focusables()
      if (!f.length) return
      const first = f[0], last = f[f.length - 1]
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', onKey, true)
    return () => {
      document.removeEventListener('keydown', onKey, true)
      restore.current?.focus?.()
    }
  }, [open, onClose])

  if (!open) return null
  return (
    <div role="dialog" aria-modal="true" aria-label={title}
      className="rvn-prog-in"
      style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(4,3,7,.82)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div ref={ref} className="rvn-prog-clip"
        style={{ width: 'min(96vw, ' + width + 'px)', maxHeight: '92vh', display: 'flex', flexDirection: 'column', background: `linear-gradient(180deg, ${C.surface}, #0c0a11)`, border: `1px solid ${C.line}` }}>
        <div style={{ flex: 'none', display: 'flex', alignItems: 'flex-start', gap: 12, padding: '14px 16px', borderBottom: `1px solid ${C.line}` }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            {kicker && <Kicker color={C.gold}>{kicker}</Kicker>}
            <div style={{ font: `700 17px ${DISPLAY}`, color: C.bone, marginTop: 2 }}>{title}</div>
          </div>
          <button type="button" onClick={onClose} aria-label={closeLabel}
            style={{ width: 44, height: 44, flex: 'none', border: `1px solid ${C.lineIn}`, background: 'transparent', color: C.muted, cursor: 'pointer', font: `400 16px ${BODY}` }}>✕</button>
        </div>
        <div className="rvn-prog-scroll" style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: 16 }}>{children}</div>
        {footer && <div style={{ flex: 'none', padding: '12px 16px', borderTop: `1px solid ${C.line}` }}>{footer}</div>}
      </div>
    </div>
  )
}

// ── Būsenų ekranai ──────────────────────────────────────────────────────────
export function LoadingState({ label }: { label: string }) {
  return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 11 }}>
      <span aria-hidden style={{ width: 26, height: 26, border: `2px solid ${C.lineIn}`, borderTopColor: C.gold, borderRadius: '50%', animation: 'rvSpin 1s linear infinite' }} />
      <span style={{ font: `600 11px ${DISPLAY}`, letterSpacing: 1.6, color: C.muted, textTransform: 'uppercase' }}>{label}</span>
    </div>
  )
}

export function ErrorState({ title, body, retryLabel, onRetry }: { title: string; body: string; retryLabel: string; onRetry: () => void }) {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, textAlign: 'center', padding: 24 }}>
      <div style={{ font: `700 15px ${DISPLAY}`, color: C.muted }}>{title}</div>
      <div style={{ font: `400 11px ${BODY}`, color: C.label, maxWidth: 340, lineHeight: 1.55 }}>{body}</div>
      <div style={{ width: 220 }}><Cta onClick={onRetry} tone="ghost">{retryLabel}</Cta></div>
    </div>
  )
}

// ── Kompaktiškas režimas (<1240px) ──────────────────────────────────────────
export function useCompact(breakpoint = 1240): boolean {
  const [compact, setCompact] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint - 1}px)`)
    const on = () => setCompact(mq.matches)
    on()
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [breakpoint])
  return compact
}

// ── Trumpalaikis pranešimas ─────────────────────────────────────────────────
export function useToast() {
  const [msg, setMsg] = useState<{ text: string; tone: 'ok' | 'err' } | null>(null)
  const show = useCallback((text: string, tone: 'ok' | 'err' = 'ok') => {
    setMsg({ text, tone })
    window.setTimeout(() => setMsg(null), 3200)
  }, [])
  const node = msg ? (
    <div role="status" className="rvn-prog-in"
      style={{ position: 'fixed', left: '50%', bottom: 22, transform: 'translateX(-50%)', zIndex: 320, border: `1px solid ${msg.tone === 'ok' ? C.gold : '#8D2D38'}`, background: 'rgba(7,6,10,.94)', padding: '10px 16px', font: `600 11px ${DISPLAY}`, letterSpacing: 1, color: msg.tone === 'ok' ? C.goldHi : '#e0707c' }}>
      {msg.text}
    </div>
  ) : null
  return { show, node }
}
