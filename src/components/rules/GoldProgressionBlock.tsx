const GOLD_ROWS = [
  { turn: 1,  gold: 100  },
  { turn: 2,  gold: 200  },
  { turn: 3,  gold: 300  },
  { turn: 4,  gold: 400  },
  { turn: 5,  gold: 500  },
  { turn: 6,  gold: 600  },
  { turn: 7,  gold: 700  },
  { turn: 8,  gold: 800  },
  { turn: 9,  gold: 900  },
  { turn: 10, gold: 1000 },
]

export function GoldProgressionBlock() {
  const max = 1000
  return (
    <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(240,180,41,0.2)', background: 'var(--bg-surface)' }}>
      <div className="px-4 py-3 flex items-center gap-2" style={{ background: 'rgba(240,180,41,0.06)', borderBottom: '1px solid rgba(240,180,41,0.15)' }}>
        <span>⚜</span>
        <p className="text-xs font-bold" style={{ fontFamily: 'var(--rvn-font-display)', color: 'var(--gold)' }}>Aukso progresija</p>
      </div>
      <div className="p-4 flex flex-col gap-2">
        {GOLD_ROWS.map(({ turn, gold }) => (
          <div key={turn} className="flex items-center gap-3">
            <span className="text-xs w-14 shrink-0" style={{ color: 'var(--text-muted)', fontFamily: 'var(--rvn-font-display)' }}>
              Ėj. {turn}{turn === 10 ? '+' : ''}
            </span>
            {/* Bar */}
            <div className="flex-1 h-5 rounded overflow-hidden relative" style={{ background: 'var(--bg-elevated)' }}>
              <div
                className="h-full rounded transition-all"
                style={{
                  width: `${(gold / max) * 100}%`,
                  background: turn >= 8 ? 'linear-gradient(to right, #92400e, #f0b429)' : 'rgba(240,180,41,0.35)',
                }}
              />
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-bold" style={{ color: turn >= 8 ? 'var(--gold)' : 'var(--text-secondary)', fontFamily: 'var(--rvn-font-display)', fontSize: '10px' }}>
                {gold}⚜
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
