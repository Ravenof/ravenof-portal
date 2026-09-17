import { ReleasesAdminClient } from './ReleasesAdminClient'

export const metadata = { title: 'Release valdymas — Admin' }

export default function Page() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-1" style={{ fontFamily: 'var(--rvn-font-display)', color: 'var(--gold)' }}>🚀 Release valdymas</h1>
      <p className="text-sm mb-5" style={{ color: 'var(--text-muted)' }}>
        Naujas bundle&apos;as (release.bat) patenka tik į <b>admin</b> kanalą. Į <b>tester</b> ir <b>stable</b> jis keliamas tik čia, rankiniu patvirtinimu. Rollback – sekundės, be naujo build&apos;o.
      </p>
      <ReleasesAdminClient />
    </div>
  )
}
