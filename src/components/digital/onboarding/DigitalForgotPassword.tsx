'use client'

// ── Slaptažodžio atkūrimas — patvirtintas UI (Fazė 3, forgot-default.png). ────
// Kairė: katedros artas + wordmark (kaip login). Dešinė: pavadinimas, aprašas,
// el. pašto laukas, raudonas „SIŲSTI NUORODĄ" banner CTA, ‹ Grįžti į prisijungimą.
// Email nuoroda grąžina į /reset-password?next=/digital/login — srautas lieka žaidime.
import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { playUiClick } from '@/lib/ui-sound'
import { useT } from '@/lib/i18n/react'
import { useLocale, setLocale } from '@/lib/i18n/react'
import { LANGUAGE_OPTIONS } from '@/lib/i18n/config'
import { RavenofTextField, RavenofBannerButton, RAVENOF_ASSET } from '@/components/digital/ui/RavenofKit'

export function DigitalForgotPassword() {
  const t = useT()
  const locale = useLocale()
  const toggleLang = () => { playUiClick(); const other = LANGUAGE_OPTIONS.find((o) => o.locale !== locale) ?? LANGUAGE_OPTIONS[0]; void setLocale(other.locale) }
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
    <div className="ravenof-body h-full w-full flex overflow-hidden ravenof-in" style={{ background: 'var(--ravenof-bg-base)' }}>
      {/* ── Kairė: katedros artas + wordmark ── */}
      <div className="relative flex-1 overflow-hidden min-w-0">
        <div className="absolute inset-0" style={{ background: `url('${RAVENOF_ASSET}/backgrounds/background-cathedral-ruins.webp') center / cover no-repeat` }} />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(90deg, rgba(7,6,10,.35) 0%, rgba(7,6,10,.55) 55%, #0B0910 100%)' }} />
        <button onClick={toggleLang} aria-label="Kalba / Language" className="ravenof-press absolute z-10" style={{ top: 'calc(env(safe-area-inset-top, 0px) + 10px)', left: 'max(14px, env(safe-area-inset-left, 0px))', font: '700 10px var(--ravenof-font-display)', color: 'var(--ravenof-text-secondary)', border: '1px solid var(--ravenof-border-strong)', background: 'rgba(7,6,10,0.5)', padding: '6px 8px', borderRadius: 3, cursor: 'pointer' }}>
          {locale.toUpperCase()}
        </button>
        <div className="absolute" style={{ left: 'max(30px, env(safe-area-inset-left, 0px))', bottom: 26, right: 30 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`${RAVENOF_ASSET}/logos/ravenof-wordmark.png`} alt="Ravenof" style={{ width: 210, height: 'auto', filter: 'drop-shadow(0 4px 18px rgba(0,0,0,.7))' }} />
          <div style={{ font: "500 10px var(--ravenof-font-body)", letterSpacing: 4, textTransform: 'uppercase', color: 'var(--ravenof-gold)', marginTop: 6 }}>{t('auth.appTagline')}</div>
        </div>
      </div>

      {/* ── Dešinė: atkūrimo forma (372px) ── */}
      <div className="flex flex-col justify-center overflow-y-auto ravenof-scroll" style={{ width: 372, flex: 'none', background: '#0B0910', borderLeft: '1px solid var(--ravenof-border-hairline)', padding: '22px 34px', paddingRight: 'max(34px, env(safe-area-inset-right, 0px))', gap: 11 }}>
        {sent ? (
          <div className="text-center py-4">
            <div className="text-4xl mb-2">📨</div>
            <p style={{ font: '700 16px var(--ravenof-font-display)', color: 'var(--ravenof-gold)', letterSpacing: '0.05em' }}>{t('auth.fp.sentTitle')}</p>
            <p className="mt-2" style={{ font: '400 12px var(--ravenof-font-body)', lineHeight: 1.5, color: 'var(--ravenof-text-secondary)' }}>{t('auth.fp.sentBody')}</p>
          </div>
        ) : (
          <>
            <h1 style={{ font: '700 18px var(--ravenof-font-display)', letterSpacing: '.5px', color: 'var(--ravenof-text-primary)', margin: 0 }}>{t('auth.fp.title')}</h1>
            <p style={{ font: '400 12px var(--ravenof-font-body)', color: 'var(--ravenof-text-secondary)', margin: 0, lineHeight: 1.5 }}>{t('auth.fp.body')}</p>
            <form onSubmit={submit} className="flex flex-col" style={{ gap: 10, marginTop: 2 }} noValidate>
              <RavenofTextField type="email" required autoComplete="email" placeholder={t('auth.email')} value={email}
                onChange={(e) => setEmail(e.target.value)} aria-label={t('auth.email')} />
              <RavenofBannerButton type="submit" disabled={loading} style={{ opacity: loading ? .7 : 1 }}>
                {loading ? t('auth.fp.sending') : t('auth.fp.cta2')}
              </RavenofBannerButton>
            </form>
          </>
        )}
        <div className="text-center" style={{ marginTop: 2 }}>
          <Link href="/digital/login" onClick={() => playUiClick()} className="ravenof-press" style={{ font: '400 12px var(--ravenof-font-body)', color: 'var(--ravenof-gold)' }}>‹ {t('auth.fp.backToLogin2')}</Link>
        </div>
      </div>
    </div>
  )
}
