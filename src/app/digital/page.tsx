import { HeaderNav } from '@/components/layout/HeaderNav'
import { getCachedUser } from '@/lib/supabase/server'
import { DigitalHub } from '@/components/digital/DigitalHub'

export const metadata = { title: 'Ravenof Digital' }

export default async function DigitalPage() {
  const user = await getCachedUser()

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-base)' }}>
      <header
        className="sticky top-0 z-20 border-b px-4 py-3 flex items-center justify-between gap-3"
        style={{
          background: 'rgba(7,7,15,0.95)',
          backdropFilter: 'blur(16px)',
          borderColor: 'rgba(240,180,41,0.1)',
        }}
      >
        <h1
          className="text-lg font-bold"
          style={{
            fontFamily: 'var(--rvn-font-display)',
            color: 'var(--gold)',
            textShadow: '0 0 16px rgba(240,180,41,0.3)',
            letterSpacing: '0.06em',
          }}
        >
          🎮 Ravenof Digital
        </h1>
        <HeaderNav />
      </header>

      <div className="max-w-screen-lg mx-auto px-4 py-8">
        <p
          className="text-sm mb-6"
          style={{ color: 'var(--text-muted)', fontFamily: 'var(--rvn-font-display)', letterSpacing: '0.02em' }}
        >
          Skaitmeninė kovos erdvė — mokykis, treniruokis prieš AI ir kaukis prieš kitus žaidėjus.
        </p>

        <DigitalHub loggedIn={!!user} />
      </div>
    </div>
  )
}
