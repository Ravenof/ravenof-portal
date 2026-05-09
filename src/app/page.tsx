import Link from 'next/link'

export default function HomePage() {
  return (
    <main
      className="min-h-screen flex flex-col items-center justify-center gap-8"
      style={{ background: 'var(--bg-base)' }}
    >
      {/* Logo */}
      <div className="text-center space-y-3">
        <h1
          className="text-6xl font-bold tracking-widest"
          style={{ fontFamily: 'Cinzel, Georgia, serif', color: 'var(--gold)' }}
        >
          RAVENOF
        </h1>
        <p className="text-lg tracking-wide" style={{ color: 'var(--text-secondary)' }}>
          Fantasy kortų žaidimo portalas
        </p>
      </div>

      {/* Divider */}
      <div
        className="w-48 h-px"
        style={{ background: 'linear-gradient(to right, transparent, var(--gold), transparent)' }}
      />

      {/* Nav */}
      <div className="flex flex-col sm:flex-row gap-4">
        <Link
          href="/cards"
          className="px-8 py-3 rounded-lg font-semibold text-center transition-all hover:scale-105"
          style={{ background: 'var(--gold)', color: '#0a0a0f' }}
        >
          🃏 Kortų Bazė
        </Link>
        <Link
          href="/login"
          className="px-8 py-3 rounded-lg font-semibold text-center transition-all hover:opacity-80"
          style={{
            background: 'transparent',
            border: '1px solid var(--bg-border)',
            color: 'var(--text-secondary)',
          }}
        >
          Prisijungti
        </Link>
      </div>
    </main>
  )
}
