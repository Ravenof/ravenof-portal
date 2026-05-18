import Link from 'next/link'

export default function HomePage() {
  return (
    <main
      className="min-h-screen flex flex-col items-center justify-center gap-10 px-4 relative overflow-hidden"
      style={{ background: 'var(--bg-base)' }}
    >
      {/* Background decorative glow orbs */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden>
        <div style={{
          position: 'absolute', top: '20%', left: '50%', transform: 'translateX(-50%)',
          width: '600px', height: '600px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(124,58,237,0.07) 0%, transparent 70%)',
        }} />
        <div style={{
          position: 'absolute', bottom: '10%', right: '10%',
          width: '300px', height: '300px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(240,180,41,0.05) 0%, transparent 70%)',
        }} />
      </div>

      {/* Logo block */}
      <div className="text-center space-y-4 relative z-10">
        <div className="flex items-center justify-center gap-3 mb-2">
          <div style={{ height: '1px', width: '60px', background: 'linear-gradient(to right, transparent, rgba(240,180,41,0.4))' }} />
          <span style={{ color: 'rgba(240,180,41,0.5)', fontSize: '10px', letterSpacing: '0.3em', fontFamily: 'var(--rvn-font-display)' }}>
            &#9633; &#9633; &#9633;
          </span>
          <div style={{ height: '1px', width: '60px', background: 'linear-gradient(to left, transparent, rgba(240,180,41,0.4))' }} />
        </div>

        <h1 className="rvn-page-title text-5xl sm:text-7xl tracking-widest">
          RAVENOF
        </h1>

        <p
          className="text-base sm:text-lg tracking-widest uppercase"
          style={{
            color:         'var(--text-secondary)',
            fontFamily:    'var(--rvn-font-display)',
            fontWeight:    400,
            letterSpacing: '0.25em',
          }}
        >
          Fantasy kortų žaidimas
        </p>
      </div>

      {/* Gold divider */}
      <div
        className="w-64 relative z-10"
        style={{ height: '1px', background: 'linear-gradient(to right, transparent, var(--gold), transparent)' }}
      />

      {/* CTA buttons */}
      <div className="flex flex-col sm:flex-row gap-4 relative z-10">
        <Link
          href="/cards"
          className="inline-flex items-center justify-center gap-2 px-8 py-3 rounded-xl font-semibold transition-all hover:scale-105 active:scale-95"
          style={{
            background:    'linear-gradient(135deg, #92400e, #b45309)',
            color:         'var(--gold)',
            border:        '1px solid rgba(240,180,41,0.35)',
            fontFamily:    'var(--rvn-font-display)',
            letterSpacing: '0.06em',
            boxShadow:     '0 0 14px rgba(240,180,41,0.15)',
          }}
        >
          Kortų Bazė
        </Link>
        <Link
          href="/login"
          className="inline-flex items-center justify-center gap-2 px-8 py-3 rounded-xl font-semibold transition-all active:scale-95"
          style={{
            background:    'transparent',
            border:        '1px solid var(--bg-border)',
            color:         'var(--text-secondary)',
            fontFamily:    'var(--rvn-font-display)',
            letterSpacing: '0.06em',
          }}
        >
          Prisijungti
        </Link>
      </div>

      {/* Bottom footer ornament */}
      <p
        className="absolute bottom-8 text-xs tracking-widest"
        style={{ color: 'var(--text-muted)', fontFamily: 'var(--rvn-font-display)', letterSpacing: '0.15em' }}
      >
        COMPANION PORTALAS
      </p>
    </main>
  )
}
