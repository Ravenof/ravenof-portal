// /digital/ranked – serverio puslapio kliento versija (neprisijungus – prompt su nuoroda).
import { Link } from 'react-router-dom'
import { RankedClient } from '@/components/digital/ranked/RankedClient'
import { useT } from '@/lib/i18n/react'
import { useUser } from './RequireUser'

export default function RankedScreen() {
  const { user, loading } = useUser()
  const t = useT()
  if (loading) return null
  if (!user) {
    return (
      <div className="rounded-2xl p-6 text-center" style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-border)' }}>
        <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>{t('ranked.loginPrompt')}</p>
        <Link to="/digital/login?next=/digital/ranked" className="inline-block px-5 py-2 rounded-xl text-sm font-semibold" style={{ background: 'rgba(240,180,41,0.15)', border: '1px solid rgba(240,180,41,0.4)', color: 'var(--gold)' }}>{t('auth.login')}</Link>
      </div>
    )
  }
  return <RankedClient />
}
