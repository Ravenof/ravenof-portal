import Link from 'next/link'
import { LiveEventsAdminClient } from './LiveEventsAdminClient'

export const metadata = { title: 'Eventai | Admin' }

export default function AdminLiveEventsPage() {
  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-base)' }}>
      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-xl font-bold" style={{ fontFamily: 'var(--rvn-font-display)', color: 'var(--gold)' }}>🎉 Eventai</h1>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Žaidimo eventai: paleidimas dabar arba pagal grafiką, baneris, atlygiai, evento parduotuvė. Keitimai įsigalioja iškart.</p>
          </div>
          <Link href="/admin" className="text-xs px-3 py-1.5 rounded-lg" style={{ color: 'var(--text-muted)', border: '1px solid var(--bg-border)' }}>← Apžvalga</Link>
        </div>
        <LiveEventsAdminClient />
      </div>
    </div>
  )
}
