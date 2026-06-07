import Link from 'next/link'

export const metadata = { title: 'Puslapis nerastas' }

export default function NotFound() {
  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{ background: 'var(--bg-base)' }}
    >
      <div className="absolute inset-0 pointer-events-none" aria-hidden>
        <div
          style={{
            position: 'absolute',
            top: '30%',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '500px',
            height: '500px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(124,58,237,0.07) 0%, transparent 70%)',
          }}
        />
      </div>

      <div className="relative text-center max-w-md">
        <p
          className="font-bold leading-none"
          style={{
            fontFamily: 'Cinzel, Georgia, serif',
            fontSize: 'clamp(5rem, 18vw, 9rem)',
            color: 'var(--gold)',
            textShadow: '0 0 40px var(--gold-glow)',
          }}
        >
          404
        </p>

        <h1
          className="text-xl font-bold mt-2 mb-3"
          style={{ fontFamily: 'Cinzel, Georgia, serif', color: 'var(--text-primary)' }}
        >
          Puslapis pasiklydo rūke
        </h1>

        <p className="text-sm mb-8 leading-relaxed" style={{ color: 'var(--text-muted)' }}>
          Tokio puslapio nėra arba jis buvo perkeltas. Patikrinkite adresą arba grįžkite į
          pradžią.
        </p>

        <div className="flex items-center justify-center gap-3">
          <Link
            href="/"
            className="px-6 py-2.5 rounded-lg text-sm font-semibold transition hover:opacity-90"
            style={{ background: 'var(--gold)', color: '#000' }}
          >
            Į pradžią
          </Link>
          <Link
            href="/cards"
            className="px-6 py-2.5 rounded-lg text-sm font-semibold transition hover:opacity-80"
            style={{
              background: 'var(--bg-elevated)',
              color: 'var(--text-secondary)',
              border: '1px solid var(--bg-border)',
            }}
          >
            Kortų bazė
          </Link>
        </div>
      </div>
    </div>
  )
}
