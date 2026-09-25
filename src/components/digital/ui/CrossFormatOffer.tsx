'use client'

// ── Kryžminio formato pasiūlymas matchmaking'e ───────────────────────────────
// Rodoma, kai MANO formate niekas nelaukia, o KITAME (ŽMK ⇄ Klasika) yra laukiantis
// žaidėjas. Sutikus — formatas perjungiamas visam klientui (matosi tab'e/chip'e) ir
// prisijungiama prie TO konkretaus žaidėjo. Laukiančiojo neklausiama.
import { useT } from '@/lib/i18n/react'
import { playUiClick } from '@/lib/ui-sound'
import { CLASSIC_ACCENT, type BattleFormat } from '@/lib/game/format'

const GOLD = '212,163,59'

export function CrossFormatOffer({ format, waiting, busy, onAccept, onDecline }: {
  format: BattleFormat; waiting?: number; busy?: boolean; onAccept: () => void; onDecline: () => void
}) {
  const t = useT()
  const classic = format === 'classic'
  const acc = classic ? CLASSIC_ACCENT : GOLD
  const name = classic ? t('home.format.classic') : t('home.format.zmk')
  return (
    <div className="ravenof-body fixed inset-0 z-[170] flex items-center justify-center p-4" style={{ background: 'rgba(4,3,8,0.82)', backdropFilter: 'blur(3px)' }} role="dialog" aria-modal="true" aria-label={t('battle.crossFormat.title')}>
      <div className="relative w-[min(440px,94vw)] px-6 py-7 text-center" style={{ background: 'var(--ravenof-bg-surface)', border: `1px solid rgba(${acc},0.6)`, boxShadow: `0 20px 60px rgba(0,0,0,0.7), 0 0 30px rgba(${acc},0.18)` }}>
        <span style={{ display: 'inline-block', font: '800 9px var(--ravenof-font-body)', letterSpacing: '0.18em', padding: '3px 9px', border: `1px solid rgb(${acc})`, color: classic ? '#e9f1ff' : '#ffe08a', background: 'rgba(7,6,10,0.85)', clipPath: 'polygon(6px 0,100% 0,calc(100% - 6px) 100%,0 100%)', marginBottom: 12 }}>
          {classic ? t('home.format.classicTag') : t('home.format.zmkTag')}
        </span>
        <p style={{ font: '700 16px var(--ravenof-font-display)', letterSpacing: 1, color: 'var(--ravenof-text-primary)', margin: '0 0 6px' }}>{t('battle.crossFormat.title')}</p>
        <p style={{ font: '400 12.5px var(--ravenof-font-body)', color: 'var(--ravenof-text-secondary)', margin: '0 0 4px', lineHeight: 1.45 }}>
          {t('battle.crossFormat.body', { format: name, count: waiting ?? 1 })}
        </p>
        <p style={{ font: '400 11px var(--ravenof-font-body)', color: classic ? '#b9cbe6' : 'var(--ravenof-gold)', margin: '0 0 18px' }}>{t('battle.crossFormat.switchNote', { format: name })}</p>
        <div className="flex gap-2 justify-center">
          <button onClick={() => { playUiClick(); onDecline() }} disabled={busy} className="ravenof-btn ravenof-btn-secondary" style={{ minHeight: 40, minWidth: 130 }}>{t('battle.crossFormat.wait')}</button>
          <button onClick={() => { playUiClick(); onAccept() }} disabled={busy} className="ravenof-press font-bold" style={{ minHeight: 40, minWidth: 150, padding: '0 16px', border: 0, cursor: 'pointer', font: '800 12px var(--ravenof-font-display)', letterSpacing: 1.5, textTransform: 'uppercase', color: classic ? '#0a0f18' : '#1a0f04', background: classic ? 'linear-gradient(180deg,#e9f1ff,#96b2d6 55%,#6f8cb3)' : 'linear-gradient(180deg,#ffe08a,#d4a33b 55%,#b5852a)', opacity: busy ? 0.6 : 1 }}>
            {busy ? '…' : t('battle.crossFormat.play', { format: name })}
          </button>
        </div>
      </div>
    </div>
  )
}
