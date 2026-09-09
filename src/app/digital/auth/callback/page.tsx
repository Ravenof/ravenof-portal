'use client'

// ── OAuth grįžimo puslapis (web): Supabase nukreipia čia su ?code=… ─────────
// @supabase/ssr klientas kodą apsikeičia automatiškai (detectSessionInUrl);
// jei ne – apsikeičiam rankiniu būdu. Tada: onboarding arba prašytas /digital kelias.
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { getOnboardingState } from '@/lib/digital/onboarding'
import { safeDigitalNext } from '@/components/digital/onboarding/DigitalAuthScreen'
import { takeNext } from '@/lib/digital/oauth'
import { useT } from '@/lib/i18n/react'

export default function OAuthCallbackPage() {
  const router = useRouter()
  const t = useT()
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    let alive = true
    ;(async () => {
      const sb = createClient()
      const sp = new URLSearchParams(window.location.search)
      const errDesc = sp.get('error_description') || sp.get('error')
      if (errDesc) { if (alive) setError(errDesc); return }
      let { data: { session } } = await sb.auth.getSession()
      if (!session) {
        const code = sp.get('code')
        if (code) {
          const { data, error } = await sb.auth.exchangeCodeForSession(code)
          if (error && !data?.session) {
            // dar vienas bandymas – gal auto-detect apsikeitė lygiagrečiai
            session = (await sb.auth.getSession()).data.session
            if (!session) { if (alive) setError(error.message); return }
          } else session = data.session
        }
      }
      if (!session) { if (alive) setError(t('auth.err.oauthFailed')); return }
      const next = safeDigitalNext(sp.get('next')) ?? safeDigitalNext(takeNext())
      const st = await getOnboardingState()
      if (!alive) return
      router.replace(st === 'done' ? (next ?? '/digital') : '/digital/onboarding')
      router.refresh()
    })()
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return (
    <div className="h-full w-full flex flex-col items-center justify-center gap-3 px-6 text-center" style={{ background: 'var(--ravenof-bg-base)' }}>
      {error ? (
        <>
          <p style={{ font: '700 14px var(--ravenof-font-display)', color: '#c65563' }}>{t('auth.err.oauthFailed')}</p>
          <p style={{ font: '400 11px var(--ravenof-font-body)', color: 'var(--ravenof-text-secondary)' }}>{error}</p>
          <a href="/digital/login" className="ravenof-btn ravenof-btn-secondary inline-flex mt-2">{t('auth.login')}</a>
        </>
      ) : (
        <p style={{ font: '700 13px var(--ravenof-font-display)', letterSpacing: 1, color: 'var(--ravenof-gold)' }}>{t('auth.oauthDone')}</p>
      )}
    </div>
  )
}
