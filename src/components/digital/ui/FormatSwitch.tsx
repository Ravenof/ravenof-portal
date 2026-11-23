'use client'

// ── Kovos formato perjungiklis: ŽMK KOVOS ⇄ KLASIKA (be modifikatorių) ───────
// variant='tabs' — dideli tab'ai hub'e virš režimų; variant='chip' — kompaktiškas
// segmentas režimų ekranų antraštėse (PvE / PvP / Reitingas). Abu keičia tą patį
// globalų formatą (`@/lib/game/format`), tad hub'as ir ekranai visada sutampa.
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Info } from 'lucide-react'
import { useT } from '@/lib/i18n/react'
import { playUiClick } from '@/lib/ui-sound'
import { useBattleFormat, setBattleFormat, CLASSIC_ACCENT, type BattleFormat } from '@/lib/game/format'
import { useDesktopUi } from './useDesktopUi'

const GOLD = '212,163,59'

export function FormatSwitch({ variant = 'tabs', onChange }: { variant?: 'tabs' | 'chip'; onChange?: (f: BattleFormat) => void }) {
  const t = useT()
  const fmt = useBattleFormat()
  const pick = (f: BattleFormat) => { if (f === fmt) return; playUiClick(); setBattleFormat(f); onChange?.(f) }
  const big = variant === 'tabs'
  const D = useDesktopUi().desktop
  const items: { f: BattleFormat; label: string; tag: string }[] = [
    { f: 'zmk', label: t('home.format.zmk'), tag: t('home.format.zmkTag') },
    { f: 'classic', label: t('home.format.classic'), tag: t('home.format.classicTag') },
  ]
  return (
    <span className="inline-flex items-center shrink-0" style={{ gap: big ? 8 : 6 }}>
    <div role="tablist" aria-label={t('home.format.aria')} className="inline-flex shrink-0"
      style={{ border: `1px solid rgba(${fmt === 'classic' ? CLASSIC_ACCENT : GOLD},0.4)`, background: 'rgba(7,6,10,0.72)',
        clipPath: big ? 'polygon(10px 0,100% 0,calc(100% - 10px) 100%,0 100%)' : 'polygon(6px 0,100% 0,calc(100% - 6px) 100%,0 100%)' }}>
      {items.map((it) => {
        const on = it.f === fmt
        const classic = it.f === 'classic'
        return (
          <button key={it.f} role="tab" aria-selected={on} onClick={() => pick(it.f)} className="ravenof-press flex items-center"
            style={{ gap: big ? 8 : 5, padding: D ? (big ? '0 24px' : '0 14px') : big ? '9px 22px' : '4px 10px', minHeight: D ? (big ? 42 : 36) : undefined, border: 0, cursor: on ? 'default' : 'pointer',
              font: `800 ${D ? 13 : big ? 11.5 : 9.5}px var(--ravenof-font-display)`, letterSpacing: big ? '0.14em' : '0.1em', textTransform: 'uppercase',
              color: on ? (classic ? '#0a0f18' : '#1a0f04') : 'var(--ravenof-text-secondary)',
              background: on ? (classic ? 'linear-gradient(180deg,#e9f1ff,#96b2d6 55%,#6f8cb3)' : 'linear-gradient(180deg,#ffe08a,#d4a33b 55%,#b5852a)') : 'transparent',
              transition: 'background .25s, color .25s' }}>
            {it.label}
            <span style={{ font: `600 ${D ? 12 : big ? 8.5 : 7.5}px var(--ravenof-font-body)`, letterSpacing: '0.1em', padding: D ? '1px 6px' : '1px 5px', border: '1px solid currentColor', borderRadius: 3, opacity: 0.85 }}>{it.tag}</span>
          </button>
        )
      })}
    </div>
    <FormatInfo big={big} desktop={D} />
    </span>
  )
}

// ── „i" mygtukas: paaiškina ŽMK ir Klasikos formatus ─────────────────────────
// Pelė: užvedus atsiranda; liečiant: palaikius arba bakstelėjus. Popup portal'e
// (fixed), kad jo nenukirptų antraštės overflow/clipPath.
function FormatInfo({ big, desktop: D }: { big: boolean; desktop: boolean }) {
  const t = useT()
  const fmt = useBattleFormat()
  const btn = useRef<HTMLButtonElement>(null)
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<{ x: number; y: number; up: boolean } | null>(null)
  const hold = useRef<number | null>(null)
  const held = useRef(false)
  const fine = typeof window !== 'undefined' && window.matchMedia?.('(hover: hover) and (pointer: fine)').matches
  const place = () => {
    const r = btn.current?.getBoundingClientRect(); if (!r) return
    const up = r.bottom + 230 > window.innerHeight && r.top > 230
    setPos({ x: r.left + r.width / 2, y: up ? r.top - 10 : r.bottom + 10, up })
  }
  const show = () => { place(); setOpen(true) }
  useEffect(() => {
    if (!open) return
    const close = (e: Event) => { if (btn.current && e.target instanceof Node && btn.current.contains(e.target)) return; setOpen(false) }
    const hide = () => setOpen(false)
    window.addEventListener('pointerdown', close, true); window.addEventListener('scroll', hide, true); window.addEventListener('resize', hide)
    return () => { window.removeEventListener('pointerdown', close, true); window.removeEventListener('scroll', hide, true); window.removeEventListener('resize', hide) }
  }, [open])
  const sz = D ? (big ? 30 : 26) : big ? 24 : 20
  const W = D ? 340 : 260
  const sec = (classic: boolean) => {
    const col = classic ? `rgb(${CLASSIC_ACCENT})` : `rgb(${GOLD})`
    const on = (fmt === 'classic') === classic
    return (
      <div style={{ padding: D ? '10px 12px' : '8px 10px', borderLeft: `3px solid ${col}`, background: on ? 'rgba(255,255,255,0.05)' : 'transparent', borderRadius: 4 }}>
        <div className="flex items-center" style={{ gap: 6, marginBottom: 4 }}>
          <span style={{ font: `800 ${D ? 13 : 11}px var(--ravenof-font-display)`, letterSpacing: '0.08em', textTransform: 'uppercase', color: col }}>{classic ? t('home.format.classic') : t('home.format.zmk')}</span>
          <span style={{ font: `700 ${D ? 10 : 8.5}px var(--ravenof-font-body)`, letterSpacing: '0.1em', padding: '0 5px', border: `1px solid ${col}`, borderRadius: 3, color: col }}>{classic ? t('home.format.classicTag') : t('home.format.zmkTag')}</span>
        </div>
        <p style={{ margin: 0, font: `400 ${D ? 13 : 11.5}px/1.45 var(--ravenof-font-body)`, color: 'var(--ravenof-text-primary)' }}>{classic ? t('home.format.infoClassic') : t('home.format.infoZmk')}</p>
      </div>
    )
  }
  return (
    <>
      <button ref={btn} type="button" aria-label={t('home.format.infoTitle')} aria-expanded={open}
        className="ravenof-press flex items-center justify-center shrink-0"
        style={{ width: sz, height: sz, borderRadius: '50%', cursor: 'help', background: open ? `rgba(${GOLD},0.22)` : 'rgba(7,6,10,0.72)', border: `1px solid rgba(${GOLD},${open ? 0.9 : 0.45})`, color: 'var(--ravenof-gold-bright)', transition: 'background .2s, border-color .2s', touchAction: 'manipulation', WebkitTouchCallout: 'none', userSelect: 'none' }}
        onMouseEnter={() => { if (fine) show() }}
        onMouseLeave={() => { if (fine) setOpen(false) }}
        onPointerDown={(e) => { if (e.pointerType === 'mouse') return; held.current = false; hold.current = window.setTimeout(() => { held.current = true; show() }, 350) }}
        onPointerUp={() => { if (hold.current) { clearTimeout(hold.current); hold.current = null } }}
        onPointerCancel={() => { if (hold.current) { clearTimeout(hold.current); hold.current = null } }}
        onContextMenu={(e) => e.preventDefault()}
        onClick={() => { if (held.current) { held.current = false; return } if (fine) return; playUiClick(); if (open) setOpen(false); else show() }}
        onFocus={() => { if (fine) show() }} onBlur={() => setOpen(false)}>
        <Info style={{ width: sz * 0.6, height: sz * 0.6 }} />
      </button>
      {open && pos && typeof document !== 'undefined' && createPortal(
        <div role="tooltip" style={{ position: 'fixed', zIndex: 400, width: W, left: Math.max(8, Math.min(pos.x - W / 2, window.innerWidth - W - 8)), top: pos.up ? undefined : pos.y, bottom: pos.up ? window.innerHeight - pos.y : undefined,
          padding: D ? 12 : 10, background: 'linear-gradient(180deg, rgba(28,21,38,0.98), rgba(12,9,18,0.98))', border: `1px solid rgba(${GOLD},0.45)`, borderRadius: 8, boxShadow: '0 16px 40px rgba(0,0,0,0.75)', pointerEvents: 'none', animation: 'rvnFmtInfo .16s ease-out' }}>
          <style>{'@keyframes rvnFmtInfo{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:none}}'}</style>
          <div style={{ font: `800 ${D ? 12 : 10.5}px var(--ravenof-font-display)`, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--ravenof-gold)', margin: '0 0 8px' }}>{t('home.format.infoTitle')}</div>
          <div className="flex flex-col" style={{ gap: 6 }}>{sec(false)}{sec(true)}</div>
        </div>,
        document.body,
      )}
    </>
  )
}

/** Mažas „BE ŽMK" ženkliukas kortelėms/antraštėms, rodomas tik Klasikos formate. */
export function ClassicBadge({ style }: { style?: React.CSSProperties }) {
  const t = useT()
  const fmt = useBattleFormat()
  const D = useDesktopUi().desktop
  if (fmt !== 'classic') return null
  return (
    <span style={{ font: `800 ${D ? 12 : 8.5}px var(--ravenof-font-body)`, letterSpacing: '0.16em', padding: '3px 8px', border: `1px solid rgb(${CLASSIC_ACCENT})`, color: '#e9f1ff', background: 'rgba(10,15,24,0.85)',
      clipPath: 'polygon(6px 0,100% 0,calc(100% - 6px) 100%,0 100%)', ...style }}>{t('home.format.classicTag')}</span>
  )
}
