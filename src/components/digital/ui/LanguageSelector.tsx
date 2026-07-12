'use client'

// ── Kalbos selektorius (LT | EN) ──────────────────────────────────────────────
// Kompaktiškas segmented control. Be vėliavų (kalba ≠ regionas). Keičia kalbą
// be reload, išsaugo cookie+LS+profilį (žr. lib/i18n/core.ts).

import { LANGUAGE_OPTIONS } from '@/lib/i18n/config'
import { useLocale, setLocale } from '@/lib/i18n/react'
import { useT } from '@/lib/i18n/react'
import { playUiClick } from '@/lib/ui-sound'

export function LanguageSelector({ size = 'md', showLabel = false }: { size?: 'sm' | 'md'; showLabel?: boolean }) {
  const locale = useLocale()
  const t = useT()
  const pad = size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-3 py-1 text-xs'
  return (
    <div className="flex items-center gap-2">
      {showLabel && <span className="text-xs text-white/60">{t('settings.language')}</span>}
      <div
        role="radiogroup"
        aria-label={t('settings.language')}
        className="inline-flex rounded-lg border border-white/15 bg-black/40 p-0.5"
      >
        {LANGUAGE_OPTIONS.map((opt) => {
          const active = opt.locale === locale
          return (
            <button
              key={opt.locale}
              type="button"
              role="radio"
              aria-checked={active}
              aria-label={opt.nativeName}
              title={opt.nativeName}
              onClick={() => { if (!active) { playUiClick(); setLocale(opt.locale) } }}
              className={`${pad} rounded-md font-semibold uppercase tracking-wide transition-colors ${
                active ? 'bg-amber-500/90 text-black shadow' : 'text-white/70 hover:text-white'
              }`}
            >
              {opt.shortName}
            </button>
          )
        })}
      </div>
    </div>
  )
}
