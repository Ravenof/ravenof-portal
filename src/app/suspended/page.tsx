import Link from 'next/link'

export const metadata = { title: 'Paskyra užblokuota' }

export default function SuspendedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4"
      style={{ background: 'var(--bg-base)' }}>
      <div className="text-center space-y-5 max-w-sm">
        <div className="text-6xl">🚫</div>
        <h1 className="text-2xl font-bold"
          style={{ fontFamily: 'Cinzel, Georgia, serif', color: '#ef4444' }}>
          Paskyra užblokuota
        </h1>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          Tavo paskyra buvo užblokuota administratoriaus. Jei manai, kad tai klaida, susisiek su komanda.
        </p>
        <Link href="/cards"
          className="inline-block text-xs px-4 py-2 rounded-lg"
          style={{ background: 'var(--bg-surface)', color: 'var(--text-secondary)', border: '1px solid var(--bg-border)' }}>
          Grįžti į kortų bazę
        </Link>
      </div>
    </div>
  )
}
