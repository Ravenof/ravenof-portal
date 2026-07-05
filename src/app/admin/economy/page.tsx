import Link from 'next/link'
import { EconomyConfigClient } from './EconomyConfigClient'

export const metadata = { title: 'Ekonomika | Admin' }

export default function AdminEconomyPage() {
  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-base)' }}>
      <div className="max-w-3xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-xl font-bold" style={{ fontFamily: 'var(--rvn-font-display)', color: 'var(--gold)' }}>💰 Ekonomika</h1>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Atlygiai, valiutos, sezonas, craft — config reikšmės (JSON). Keitimai įsigalioja iškart.</p>
          </div>
          <Link href="/admin" className="text-xs px-3 py-1.5 rounded-lg" style={{ color: 'var(--text-muted)', border: '1px solid var(--bg-border)' }}>← Apžvalga</Link>
        </div>
        <EconomyConfigClient />
      </div>
    </div>
  )
}
