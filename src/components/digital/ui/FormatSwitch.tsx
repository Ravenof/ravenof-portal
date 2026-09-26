'use client'

// ── Kovos formato perjungiklis: ŽMK KOVOS ⇄ KLASIKA (be modifikatorių) ───────
// variant='tabs' — dideli tab'ai hub'e virš režimų; variant='chip' — kompaktiškas
// segmentas režimų ekranų antraštėse (PvE / PvP / Reitingas). Abu keičia tą patį
// globalų formatą (`@/lib/game/format`), tad hub'as ir ekranai visada sutampa.
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
