'use client'

// ── Svečio paskyros pavertimas nuolatine (Nustatymai → Paskyra) ──────────────
// Žingsniai: el. paštas + slaptažodis → (jei reikia) patvirtinimas kodu arba nuoroda → slaptažodis.
// Progresas išlieka – keičiasi tik prisijungimo būdas (žr. src/lib/digital/guest.ts).
import { useState } from 'react'
import { useT } from '@/lib/i18n/react'
import { playUiClick, playSuccess, playError } from '@/lib/ui-sound'
import { RavenofTextField } from '@/components/digital/ui/RavenofKit'
import { guestSetEmail, guestVerifyCode, guestEmailConfirmed, guestSetPassword, type UpgradeErr } from '@/lib/digital/guest'

type Step = 'form' | 'confirm'

export function GuestUpgradeCard({ onDone }: { onDone: (email: string) => void }) {
  const t = useT()
  const [step, setStep] = useState<Step>('form')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const errText = (e: UpgradeErr): string => {
    if (e === 'emailTaken') return t('auth.err.emailTaken')
    if (e === 'emailInvalid') return t('auth.err.emailInvalid')
    if (e === 'pwWeak') return t('auth.err.pwWeak')
    if (e === 'network') return t('auth.err.network')
    if (e === 'badCode') return t('auth.guest.errCode')
    if (e === 'notConfirmed') return t('auth.guest.errNotConfirmed')
    return t('auth.guest.errFailed')
  }
  const fail = (e: UpgradeErr) => { playError(); setError(errText(e)) }

  const finish = async () => {
    const r = await guestSetPassword(password)
    if (!r.ok) { fail(r.err); return }
    playSuccess()
    onDone(email.trim())
  }

  const submitForm = async (ev: React.FormEvent) => {
    ev.preventDefault()
    if (busy) return
    setError(null)
    if (!/\S+@\S+\.\S+/.test(email)) { fail('emailInvalid'); return }
    if (password.length < 8) { playError(); setError(t('auth.err.pwTooShort')); return }
    playUiClick()
    setBusy(true)
    const r = await guestSetEmail(email)
    if (!r.ok) { setBusy(false); fail(r.err); return }
    if (r.needsConfirm) { setBusy(false); setStep('confirm'); return }
    await finish()
    setBusy(false)
  }

  const submitCode = async (ev: React.FormEvent) => {
    ev.preventDefault()
    if (busy) return
    setError(null)
    playUiClick()
    setBusy(true)
    if (code.trim()) {
      const v = await guestVerifyCode(email, code)
      if (!v.ok) { setBusy(false); fail(v.err); return }
    } else if (!(await guestEmailConfirmed(email))) {
      setBusy(false); fail('notConfirmed'); return
    }
    await finish()
    setBusy(false)
  }

  const box: React.CSSProperties = { background: 'var(--ravenof-bg-surface-2)', border: '1px solid var(--ravenof-gold)', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8 }
  const title: React.CSSProperties = { font: '700 12px var(--ravenof-font-display)', letterSpacing: 1, textTransform: 'uppercase', color: 'var(--ravenof-gold)', margin: 0 }
  const body: React.CSSProperties = { font: '400 11.5px var(--ravenof-font-body)', lineHeight: 1.45, color: 'var(--ravenof-text-secondary)', margin: 0 }

  return (
    <div style={box}>
      <p style={title}>{t('auth.guest.upgradeTitle')}</p>
      {step === 'form' ? (
        <form onSubmit={submitForm} className="flex flex-col" style={{ gap: 8 }} noValidate>
          <p style={body}>{t('auth.guest.upgradeBody')}</p>
          <RavenofTextField type="email" placeholder={t('auth.email')} aria-label={t('auth.email')} autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <RavenofTextField type="password" placeholder={t('auth.password')} aria-label={t('auth.password')} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
          {error && <span role="alert" style={{ font: '500 11px var(--ravenof-font-body)', color: '#c65563' }}>{error}</span>}
          <button type="submit" disabled={busy} className="ravenof-btn ravenof-btn-primary" style={{ alignSelf: 'flex-start', opacity: busy ? 0.7 : 1 }}>
            {busy ? t('auth.guest.saving') : t('auth.guest.upgradeCta')}
          </button>
        </form>
      ) : (
        <form onSubmit={submitCode} className="flex flex-col" style={{ gap: 8 }} noValidate>
          <p style={body}>{t('auth.guest.confirmBody', { email: email.trim() })}</p>
          <RavenofTextField type="text" inputMode="numeric" maxLength={8} placeholder={t('auth.guest.codePlaceholder')} aria-label={t('auth.guest.codePlaceholder')} autoComplete="one-time-code" value={code} onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, ''))} />
          {error && <span role="alert" style={{ font: '500 11px var(--ravenof-font-body)', color: '#c65563' }}>{error}</span>}
          <div className="flex items-center flex-wrap" style={{ gap: 8 }}>
            <button type="submit" disabled={busy} className="ravenof-btn ravenof-btn-primary" style={{ opacity: busy ? 0.7 : 1 }}>
              {busy ? t('auth.guest.saving') : t('auth.guest.confirmCta')}
            </button>
            <button type="button" disabled={busy} onClick={() => { playUiClick(); setError(null); setCode(''); setStep('form') }} className="ravenof-btn ravenof-btn-secondary">
              {t('auth.guest.back')}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
