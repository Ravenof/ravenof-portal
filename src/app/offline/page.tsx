'use client'

export default function OfflinePage() {
  return (
    <div
      className="min-h-screen flex items-center justify-center p-6"
      style={{ background: 'var(--bg-base)' }}
    >
      <div
        className="w-full max-w-sm rounded-2xl p-8 text-center space-y-6"
        style={{
          background: 'linear-gradient(135deg, rgba(100,40,180,0.07) 0%, var(--bg-surface) 60%)',
          border:     '1px solid rgba(100,40,180,0.2)',
          boxShadow:  '0 0 40px rgba(100,40,180,0.08)',
        }}
      >
        <div className="text-5xl">📡</div>

        <div className="space-y-2">
          <h1
            className="text-xl font-bold"
            style={{
              fontFamily:    'var(--rvn-font-display)',
              color:         'var(--gold)',
              letterSpacing: '0.06em',
              textShadow:    '0 0 16px rgba(242,162,12,0.25)',
            }}
          >
            Esate neprisijungę
          </h1>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            Šiuo metu nėra interneto ryšio. Kai kurios Ravenof portalo funkcijos gali neveikti,
            bet galite grįžti ir bandyti dar kartą.
          </p>
        </div>

        <div
          className="h-px w-16 mx-auto rounded"
          style={{ background: 'linear-gradient(to right, transparent, rgba(242,162,12,0.4), transparent)' }}
        />

        <div className="flex flex-col gap-3">
          <button
            onClick={() => window.location.reload()}
            className="w-full py-3 rounded-xl font-bold text-sm transition-all hover:scale-[1.02] active:scale-[0.98]"
            style={{
              background:    'linear-gradient(135deg,#92400e,#b45309)',
              color:         'var(--gold)',
              border:        '1px solid rgba(242,162,12,0.35)',
              fontFamily:    'var(--rvn-font-display)',
              letterSpacing: '0.06em',
            }}
          >
            Bandyti dar kartą
          </button>
          <a
            href="/"
            className="w-full py-3 rounded-xl font-semibold text-sm transition-all hover:opacity-80 block"
            style={{
              background: 'var(--bg-elevated)',
              color:      'var(--text-secondary)',
              border:     '1px solid var(--bg-border)',
              fontFamily: 'var(--rvn-font-display)',
            }}
          >
            Grįžti į pradžią
          </a>
          <a
            href="/life-tracker"
            className="w-full py-2 rounded-xl text-xs transition-all hover:opacity-80 block"
            style={{ color: 'var(--text-muted)' }}
          >
            ⚔️ HP Sekiklis (veikia offline)
          </a>
        </div>
      </div>
    </div>
  )
}
