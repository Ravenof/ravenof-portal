import { RankedAdminClient } from './RankedAdminClient'

export const metadata = { title: 'Reitingo kova — Admin' }

export default function Page() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-1" style={{ fontFamily: 'var(--rvn-font-display)', color: 'var(--gold)' }}>🏆 Reitingo kova — valdymas</h1>
      <p className="text-sm mb-5" style={{ color: 'var(--text-muted)' }}>Sezonai, botai, debug įrankiai. Boto tapatybė matoma tik čia.</p>
      <RankedAdminClient />
    </div>
  )
}
