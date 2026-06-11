'use client'

import { motion } from 'framer-motion'
import type { LoreEra, LoreEvent, LorePeriod } from '@/data/lore'

type Props = {
  eras: LoreEra[]
  activeIndex: number
  onChange: (index: number) => void
  periods?: LorePeriod[]
  activePeriodId?: string | null
  onChangePeriod?: (id: string | null) => void
  eraEvents?: LoreEvent[]
  onSelectEvent?: (e: LoreEvent) => void
}

export function LoreTimeline({
  eras, activeIndex, onChange,
  periods = [], activePeriodId = null, onChangePeriod,
  eraEvents, onSelectEvent,
}: Props) {
  const active = eras.find((e) => e.index === activeIndex) ?? eras[eras.length - 1]
  const eraPeriods = periods
    .filter((p) => p.eraId === active?.id)
    .sort((a, b) => a.index - b.index)
  const activePeriod = eraPeriods.find((p) => p.id === activePeriodId) ?? null

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
            {activePeriod && (
              <span className="ml-2 text-xs font-normal" style={{ color: 'var(--text-secondary)' }}>
                · {activePeriod.name}
              </span>
            )}
          </p>
        </div>
        <p className="text-xs hidden sm:block" style={{ color: 'var(--text-muted)', maxWidth: '50%' }}>
          {activePeriod?.description ?? active?.description}
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

      {/* Periodų eilutė (mažesni laikotarpiai eros viduje) */}
      {eraPeriods.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex gap-1 flex-wrap items-center"
        >
          <span className="text-[10px] uppercase tracking-wider shrink-0 mr-1"
            style={{ color: 'var(--text-muted)', fontFamily: 'var(--rvn-font-display)' }}>
            Laikotarpis:
          </span>
          <button
            onClick={() => onChangePeriod?.(null)}
            className="px-2 py-1 rounded-md text-[11px] transition-all duration-200"
            style={{
              background: activePeriodId === null ? (active?.color ?? '#d4af37') + '22' : 'transparent',
              border: '1px solid ' + (activePeriodId === null ? (active?.color ?? '#d4af37') + '66' : 'var(--bg-border)'),
              color: activePeriodId === null ? (active?.color ?? '#d4af37') : 'var(--text-muted)',
            }}
          >
            Visa era
          </button>
          {eraPeriods.map((p) => {
            const isActive = p.id === activePeriodId
            return (
              <button
                key={p.id}
                onClick={() => onChangePeriod?.(p.id)}
                className="px-2 py-1 rounded-md text-[11px] transition-all duration-200 hover:opacity-90"
                style={{
                  background: isActive ? (active?.color ?? '#d4af37') + '22' : 'transparent',
                  border: '1px solid ' + (isActive ? (active?.color ?? '#d4af37') + '66' : 'var(--bg-border)'),
                  color: isActive ? (active?.color ?? '#d4af37') : 'var(--text-muted)',
                  boxShadow: isActive ? `0 0 6px ${(active?.color ?? '#d4af37')}33` : 'none',
                }}
              >
                {p.name}
              </button>
            )
          })}
        </motion.div>
      )}

      {/* Progress bar */}
      <div className="h-1 rounded-full overflow-hidden" style={{ background: 'var(--bg-border)' }}>
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: ((activeIndex / Math.max(1, eras.length - 1)) * 100) + '%',
            background: `linear-gradient(90deg, ${eras[0]?.color ?? '#6366f1'}, ${active?.color ?? '#d4af37'})`,
            boxShadow:  `0 0 6px ${active?.color ?? '#d4af37'}66`,
          }}
        />
      </div>

      {/* Šio laikotarpio įvykiai chronologiškai */}
      {eraEvents && eraEvents.length > 0 && (
        <div className="flex flex-col gap-1 pt-2 max-h-32 overflow-y-auto" style={{ borderTop: '1px solid var(--bg-border)' }}>
          <p className="text-[10px] uppercase tracking-wider font-semibold"
            style={{ color: 'var(--text-muted)', fontFamily: 'var(--rvn-font-display)' }}>
            Įvykiai chronologiškai
          </p>
          {eraEvents.map((ev, i) => (
            <button
              key={ev.id}
              onClick={() => onSelectEvent?.(ev)}
              className="flex items-start gap-2 text-left rounded-md px-1.5 py-1 transition-colors hover:bg-white/5"
            >
              <span className="text-xs font-bold tabular-nums shrink-0"
                style={{ color: active?.color ?? 'var(--gold)' }}>{i + 1}.</span>
              <span className="text-xs leading-tight truncate" style={{ color: 'var(--text-secondary)' }}>
                {ev.name}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
