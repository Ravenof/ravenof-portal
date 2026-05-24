'use client'

import type { LoreEra } from '@/data/lore'

type Props = {
  eras: LoreEra[]
  activeIndex: number
  onChange: (index: number) => void
}

export function LoreTimeline({ eras, activeIndex, onChange }: Props) {
  const active = eras.find((e) => e.index === activeIndex) ?? eras[eras.length - 1]

  return (
    <div
      className="w-full rounded-xl px-4 py-3 flex flex-col gap-3"
      style={{
        background:  'rgba(7,7,15,0.9)',
        border:      '1px solid var(--bg-border)',
        backdropFilter: 'blur(12px)',
      }}
    >
      {/* Era name + description */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <span
            className="w-2 h-2 rounded-full shrink-0"
            style={{ background: active?.color ?? '#d4af37', boxShadow: `0 0 6px ${active?.color ?? '#d4af37'}` }}
          />
          <p
            className="text-sm font-bold"
            style={{ fontFamily: 'var(--rvn-font-display)', color: active?.color ?? 'var(--gold)', letterSpacing: '0.04em' }}
          >
            {active?.name ?? '—'}
          </p>
        </div>
        <p className="text-xs hidden sm:block" style={{ color: 'var(--text-muted)', maxWidth: '50%' }}>
          {active?.description}
        </p>
      </div>

      {/* Era buttons */}
      <div className="flex gap-1.5 flex-wrap">
        {eras.map((era) => {
          const isActive = era.index === activeIndex
          return (
            <button
              key={era.id}
              onClick={() => onChange(era.index)}
              className="flex-1 min-w-[80px] px-2 py-1.5 rounded-lg text-xs transition-all duration-200 hover:opacity-90"
              style={{
                background:   isActive ? era.color + '22' : 'var(--bg-elevated)',
                border:       '1px solid ' + (isActive ? era.color + '55' : 'var(--bg-border)'),
                color:        isActive ? era.color : 'var(--text-muted)',
                fontFamily:   'var(--rvn-font-display)',
                letterSpacing:'0.03em',
                boxShadow:    isActive ? `0 0 8px ${era.color}33` : 'none',
                fontWeight:   isActive ? 600 : 400,
              }}
            >
              {era.name}
            </button>
          )
        })}
      </div>

      {/* Progress bar */}
      <div className="h-1 rounded-full overflow-hidden" style={{ background: 'var(--bg-border)' }}>
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: ((activeIndex / (eras.length - 1)) * 100) + '%',
            background: `linear-gradient(90deg, ${eras[0]?.color ?? '#6366f1'}, ${active?.color ?? '#d4af37'})`,
            boxShadow:  `0 0 6px ${active?.color ?? '#d4af37'}66`,
          }}
        />
      </div>
    </div>
  )
}
