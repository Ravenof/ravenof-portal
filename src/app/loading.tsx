export default function HomeLoading() {
  return (
    <main className="min-h-screen" style={{ background: 'var(--bg-base)' }}>
      <div className="max-w-screen-xl mx-auto px-4">
        {/* Nav skeleton */}
        <nav className="flex items-center justify-between py-5">
          <span className="text-lg font-bold tracking-widest" style={{ fontFamily: 'var(--rvn-font-display)', color: 'var(--gold)' }}>
            RAVENOF
          </span>
          <div className="flex gap-2">
            <div style={{ width: 80, height: 30, borderRadius: 8, background: 'rgba(255,255,255,0.05)', animation: 'pulse 1.5s ease-in-out infinite' }} />
            <div style={{ width: 90, height: 30, borderRadius: 8, background: 'rgba(146,64,14,0.25)', animation: 'pulse 1.5s ease-in-out infinite' }} />
          </div>
        </nav>

        {/* Hero skeleton */}
        <section className="text-center py-16 sm:py-24 space-y-6">
          <h1 className="rvn-page-title text-5xl sm:text-7xl tracking-widest" style={{ color: 'var(--gold)' }}>
            RAVENOF
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontFamily: 'var(--rvn-font-display)', letterSpacing: '0.2em' }}>
            Fantasy kortų žaidimas
          </p>
          <div style={{ height: '1px', width: '200px', background: 'linear-gradient(to right, transparent, var(--gold), transparent)', margin: '0 auto' }} />
          {/* Stats skeleton */}
          <div className="flex items-center justify-center gap-10 flex-wrap">
            {['kortos', 'žaidėjai', 'kaladės'].map((label) => (
              <div key={label} className="text-center">
                <div style={{ width: 48, height: 36, borderRadius: 6, background: 'rgba(212,175,55,0.1)', margin: '0 auto 4px', animation: 'pulse 1.5s ease-in-out infinite' }} />
                <p className="text-xs uppercase tracking-widest" style={{ color: 'var(--text-muted)', fontFamily: 'var(--rvn-font-display)' }}>{label}</p>
              </div>
            ))}
          </div>
        </section>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 1; }
        }
      `}</style>
    </main>
  )
}
