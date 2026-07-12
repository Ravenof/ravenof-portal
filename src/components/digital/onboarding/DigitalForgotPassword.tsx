'use client'

// ── Slaptažodžio atkūrimas Ravenof Digital viduje (bare route, digital stilius).
// Email nuoroda grąžina į /reset-password?next=/digital/login — srautas lieka žaidime.
import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { playUiClick } from '@/lib/ui-sound'
import { useT } from '@/lib/i18n/react'
import { LanguageSelector } from '@/components/digital/ui/LanguageSelector'

const GOLD = '240,180,41'

export function DigitalForgotPassword() {
  const t = useT()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (loading) return
    setLoading(true)
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? window.location.origin
    // Visada rodome sėkmę — neatskleidžiame ar el. paštas egzistuoja
    await createClient().auth.resetPasswordForEmail(email, {
      redirectTo: `${appUrl}/reset-password?next=${encodeURIComponent('/digital/login')}`,
    })
    setLoading(false)
    setSent(true)
  }

  return (
    <div className="relative h-full w-full flex items-center justify-center px-4"
      style={{ padding: `max(10px, env(safe-area-inset-top)) max(16px, env(safe-area-inset-right)) max(10px, env(safe-area-inset-bottom)) max(16px, env(safe-area-inset-left))` }}>
      <div className="absolute top-3 right-3"><LanguageSelector size="sm" /></div>
      <div className="w-[min(440px,94vw)] rounded-2xl px-6 py-5 text-center"
        style={{ border: `1.5px solid rgba(${GOLD},0.35)`, background: `radial-gradient(120% 50% at 50% 0%, rgba(${GOLD},0.1), transparent 55%), linear-gradient(160deg, rgba(22,16,33,0.98), rgba(9,7,15,0.98))` }}>
        {sent ? (
          <>
            <div className="text-4xl mb-2">📨</div>
            <p className="font-bold" style={{ color: 'var(--gold)', fontFamily: 'var(--rvn-font-display)', fontSize: 16, letterSpacing: '0.05em' }}>{t('auth.fp.sentTitle')}</p>
            <p className="mt-2" style={{ color: 'var(--text-secondary)', fontSize: 12, lineHeight: 1.5 }}>
              {t('auth.fp.sentBody')}
            </p>
          </>
        ) : (
          <>
            <p className="font-bold" style={{ color: 'var(--gold)', fontFamily: 'var(--rvn-font-display)', fontSize: 16, letterSpacing: '0.06em' }}>{t('auth.fp.title')}</p>
            <p className="mt-1" style={{ color: 'var(--text-secondary)', fontSize: 11.5 }}>{t('auth.fp.body')}</p>
            <form onSubmit={submit} className="mt-3 flex flex-col gap-2.5">
              <input type="email" required autoComplete="email" placeholder={t('auth.emailPlaceholder')} value={email} onChange={(e) => setEmail(e.target.value)}
                aria-label={t('auth.email')}
                style={{ width: '100%', height: 40, borderRadius: 10, padding: '0 12px', fontSize: 13, background: 'rgba(8,6,13,0.85)', border: `1px solid rgba(${GOLD},0.25)`, color: '#f3ead3', outline: 'none' }} />
              <button type="submit" disabled={loading} className="rvn-press w-full rounded-xl font-extrabold disabled:opacity-60"
                style={{ height: 42, fontSize: 13, fontFamily: 'var(--rvn-font-display)', background: 'linear-gradient(180deg,#ffe28c,#f3b62c 46%,#c5841a)', color: '#3a2406', border: '1px solid #ffeaa6' }}>
                {loading ? t('auth.fp.sending') : t('auth.fp.cta')}
              </button>
            </form>
          </>
        )}
        <Link href="/digital/login" onClick={() => playUiClick()} className="inline-block mt-3" style={{ color: 'var(--gold)', fontSize: 11.5 }}>{t('auth.fp.backToLogin')}</Link>
      </div>
    </div>
  )
}
