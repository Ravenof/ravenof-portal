'use client'

import { useState } from 'react'
import { Info, X, Trophy } from 'lucide-react'
import { getLevelProgress, MAX_LEVEL, MAX_XP } from '@/lib/gamification/levels'

type Props = {
  xp: number
  level: number
}

const BASE_XP_SOURCES = [
  { label: 'Renginio dalyvavimas',          amount: '+150',     icon: '🎯' },
  { label: 'Kalade paskelbta viesai',        amount: '+50',      icon: '📢' },
  { label: 'Patiktukas gautas už kaladę',    amount: '+10',      icon: '👍' },
  { label: 'Nepatiktukas gautas už kaladę', amount: '−3',  icon: '👎' },
  { label: 'Kolekcijos prieaugis',           amount: '+25–350', icon: '🎴' },
  { label: 'Administratoriaus koregavimas',  amount: 'kintamas', icon: '⚙️' },
]

const ACHIEVEMENT_CATEGORIES = [
  { icon: '👤', label: 'Paskyra',           count: 10,  xpRange: '50–750'   },
  { icon: '📦', label: 'Kolekcija',          count: 10,  xpRange: '50–600'   },
  { icon: '💎', label: 'Raritetai',           count: 5,   xpRange: '400–1 500'},
  { icon: '🏴', label: 'Frakcijos',           count: 9,   xpRange: '700–800'  },
  { icon: '🏆', label: 'Čempionai',      count: 10,  xpRange: '300–1 000'},
  { icon: '📋', label: 'Kaladžių Kūryba', count: 10, xpRange: '150–900'},
  { icon: '👥', label: 'Bendruomenė',   count: 7,   xpRange: '50–1 000'},
  { icon: '🎪', label: 'Renginiai',           count: 6,   xpRange: '300–1 200'},
  { icon: '⚔',     label: 'Turnyrai',            count: 3,   xpRange: '700–1 500'},
]

export function XPProgressBar({ xp, level }: Props) {
  const [infoOpen, setInfoOpen] = useState(false)
  const progress = getLevelProgress(xp)
  const color = progress.rankGroup.color

  const label = progress.isMaxLevel
    ? 'Maksimalus lygis'
    : `${progress.xpNeededForNextLevel.toLocaleString()} XP iki ${progress.level + 1} lygio`

  return (
    <>
      <div>
        <div className="flex justify-between items-center mb-1">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
              Lygis {level}
            </span>
            <span className="text-xs font-semibold tabular-nums" style={{ color }}>
              {xp.toLocaleString()} XP
            </span>
            <button
              onClick={() => setInfoOpen(true)}
              className="w-4 h-4 rounded-full flex items-center justify-center transition-opacity hover:opacity-80"
              style={{ color: 'var(--text-muted)' }}
              title="Kaip veikia XP sistema?"
              aria-label="XP informacija"
            >
              <Info className="w-3.5 h-3.5" />
            </button>
          </div>
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{label}</span>
        </div>
        <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--bg-elevated)' }}>
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: progress.progressPercent + '%',
              background: 'linear-gradient(90deg, ' + color + '99, ' + color + ')',
              boxShadow: '0 0 6px ' + color + '66',
            }}
          />
        </div>
        {!progress.isMaxLevel && (
          <div className="flex justify-between mt-1">
            <span className="text-xs" style={{ color: 'var(--text-muted)', fontSize: '10px' }}>
              {progress.currentLevelXp.toLocaleString()} XP
            </span>
            <span className="text-xs" style={{ color: 'var(--text-muted)', fontSize: '10px' }}>
              {progress.nextLevelXp.toLocaleString()} XP
            </span>
          </div>
        )}
      </div>

      {infoOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => setInfoOpen(false)}
        >
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
          <div
            className="relative w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl overflow-hidden flex flex-col"
            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--bg-border)', maxHeight: '90vh' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="flex items-center justify-between px-5 py-4 flex-shrink-0"
              style={{ borderBottom: '1px solid var(--bg-border)' }}
            >
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4" style={{ color: 'var(--gold)' }} />
                <h3 className="text-sm font-bold" style={{ fontFamily: 'Cinzel, Georgia, serif', color: 'var(--text-primary)' }}>
                  Kaip veikia XP?
                </h3>
              </div>
              <button
                onClick={() => setInfoOpen(false)}
                className="w-7 h-7 rounded-full flex items-center justify-center"
                style={{ background: 'var(--bg-border)', color: 'var(--text-muted)' }}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="px-5 py-3 flex-shrink-0" style={{ borderBottom: '1px solid var(--bg-border)', background: 'var(--bg-surface)' }}>
              <p className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>Tavo pažanga</p>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm font-bold" style={{ color }}>
                  {progress.rankGroup.icon} Lygis {progress.level} — {progress.title}
                </span>
                <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                  {xp.toLocaleString()} XP
                </span>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--bg-elevated)' }}>
                <div
                  className="h-full rounded-full"
                  style={{ width: progress.progressPercent + '%', background: 'linear-gradient(90deg, ' + color + '99, ' + color + ')' }}
                />
              </div>
              {progress.isMaxLevel ? (
                <p className="text-xs mt-1.5 text-center font-semibold" style={{ color }}>
                  ✨ Maksimalus lygis pasiektas ({MAX_XP.toLocaleString()} XP)
                </p>
              ) : (
                <p className="text-xs mt-1.5 text-right" style={{ color: 'var(--text-muted)' }}>
                  {progress.xpNeededForNextLevel.toLocaleString()} XP iki{' '}
                  <span style={{ color }}>{progress.level + 1} lygio</span>
                </p>
              )}
            </div>

            <div className="overflow-y-auto flex-1 px-5 py-3 space-y-5">
              <div
                className="rounded-lg px-3 py-2 text-xs leading-relaxed"
                style={{ background: 'rgba(212,175,55,0.06)', border: '1px solid rgba(212,175,55,0.2)', color: 'var(--text-muted)' }}
              >
                {'📊'} Sistema turi <span style={{ color: 'var(--gold)' }}>{MAX_LEVEL} lygius</span>.
                Maks. lygis ({MAX_LEVEL}) pasiekiamas nuo{' '}
                <span style={{ color: 'var(--gold)' }}>{MAX_XP.toLocaleString()} XP</span>.
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wider mb-2.5" style={{ color: 'var(--text-muted)' }}>
                  Veiklos XP
                </p>
                <div className="space-y-2">
                  {BASE_XP_SOURCES.map((src) => (
                    <div key={src.label} className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-base leading-none w-5 text-center">{src.icon}</span>
                        <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{src.label}</span>
                      </div>
                      <span className="text-xs font-bold tabular-nums flex-shrink-0" style={{ color: 'var(--gold)' }}>
                        {src.amount}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-2.5">
                  <Trophy className="w-3.5 h-3.5" style={{ color: 'var(--gold)' }} />
                  <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                    Pasiekimių XP (70 iš viso)
                  </p>
                </div>
                <div
                  className="rounded-lg p-3 mb-3 text-xs leading-relaxed"
                  style={{ background: 'var(--bg-surface)', color: 'var(--text-muted)', border: '1px solid var(--bg-border)' }}
                >
                  Kiekvienas pasiekimas suteikia XP tik{' '}
                  <strong style={{ color: 'var(--text-secondary)' }}>vieną kartą</strong> atrakinus.
                  Iš viso galima uždirbti apie 33 875 XP iš pasiekimų.
                </div>
                <div className="space-y-1.5">
                  {ACHIEVEMENT_CATEGORIES.map((cat) => (
                    <div
                      key={cat.label}
                      className="flex items-center justify-between gap-2 rounded-lg px-3 py-1.5"
                      style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-border)' }}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm leading-none">{cat.icon}</span>
                        <div>
                          <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{cat.label}</span>
                          <span className="text-xs ml-1.5" style={{ color: 'var(--text-muted)' }}>({cat.count} pasiekimų)</span>
                        </div>
                      </div>
                      <span className="text-xs font-semibold tabular-nums flex-shrink-0" style={{ color: 'var(--gold)' }}>
                        {cat.xpRange} XP
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div
                className="rounded-lg px-3 py-2 text-xs leading-relaxed"
                style={{ background: 'rgba(212,175,55,0.06)', border: '1px solid rgba(212,175,55,0.2)', color: 'var(--text-muted)' }}
              >
                {'ℹ️'} Turnyro laimėjimas suteikia ir{' '}
                <span style={{ color: 'var(--gold)' }}>dalyvavimo XP</span>{' '}
                (iš renginio), ir{' '}
                <span style={{ color: 'var(--gold)' }}>turnyro pasiekimo XP</span>{' '}
                — tai yra atskiri šaltiniai.
              </div>
            </div>

            <div className="px-5 pb-4 pt-2 flex-shrink-0">
              <button
                onClick={() => setInfoOpen(false)}
                className="w-full py-2 rounded-xl text-sm font-medium transition-opacity hover:opacity-80"
                style={{ background: 'var(--bg-border)', color: 'var(--text-secondary)' }}
              >
                Uždaryti
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

}
