'use client'

// ══════════════════════════════════════════════════════════════════════════════
// Ravenof Digital — landscape-first registracija / prisijungimas.
// LOGIN: patvirtintas UI (ravenof-ui-handoff login-default.png) — kairė katedros
// artas + wordmark, dešinė 372px forma. REGISTER (Fazė 3): patvirtintas UI
// (register-default.png) — kairė misty-fortress artas, dešinė 4 laukų forma su
// raudonu „SUKURTI PASKYRĄ" banner CTA.
// Po sėkmės NIEKADA neišeinama iš /digital:
//   register → /digital/onboarding
//   login    → onboarding done ? /digital : /digital/onboarding
// Orientacijos lock + „pasuk telefoną" overlay paveldimi iš /digital layout.
// ══════════════════════════════════════════════════════════════════════════════
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { getOnboardingState } from '@/lib/digital/onboarding'
import { playUiClick, playSuccess, playError } from '@/lib/ui-sound'
import { useT } from '@/lib/i18n/react'
import { useLocale, setLocale } from '@/lib/i18n/react'
import { LANGUAGE_OPTIONS } from '@/lib/i18n/config'
import { RavenofTextField, RavenofBannerButton, RAVENOF_ASSET } from '@/components/digital/ui/RavenofKit'

const USERNAME_RE = /^[a-z0-9_]{3,20}$/

// Validuotas vidinis next kelias — TIK /digital keliai (jokių išorinių/portalo redirect'ų)
export function safeDigitalNext(raw: string | null): string | null {
  if (!raw) return null
  try { const d = decodeURIComponent(raw); return /^\/digital(\/|$|\?)/.test(d) ? d : null } catch { return null }
}
function currentNext(): string | null {
  if (typeof window === 'undefined') return null
  return safeDigitalNext(new URLSearchParams(window.location.search).get('next'))
}

export function DigitalAuthScreen({ mode }: { mode: 'register' | 'login' }) {
  const router = useRouter()
  const t = useT()
  const locale = useLocale()
  const toggleLang = () => { playUiClick(); const other = LANGUAGE_OPTIONS.find((o) => o.locale !== locale) ?? LANGUAGE_OPTIONS[0]; void setLocale(other.locale) }
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [needsConfirm, setNeedsConfirm] = useState(false)
  // next iš URL — state'e, kad po hydration nuorodos persirenderintų (SSR window nėra)
  const [nextPath, setNextPath] = useState<string | null>(null)
  useEffect(() => { setNextPath(currentNext()) }, [])
  const withNext = (href: string) => (nextPath ? `${href}?next=${encodeURIComponent(nextPath)}` : href)

  const isReg = mode === 'register'

  const afterAuth = async () => {
    const st = await getOnboardingState()
    // onboarding pirmiau; baigusiems — prašytas /digital kelias arba home
    router.replace(st === 'done' ? (currentNext() ?? nextPath ?? '/digital') : '/digital/onboarding')
    router.refresh()
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (loading) return
    setError(null)
    const supabase = createClient()

    if (isReg) {
      if (!USERNAME_RE.test(username)) { setError(t('auth.err.usernameFormat')); return }
      if (password.length < 8) { setError(t('auth.err.pwTooShort')); return }
      if (password !== confirm) { setError(t('auth.err.pwMismatch')); return }
      setLoading(true)
      const { data: existing } = await supabase.from('profiles').select('id').eq('username', username).maybeSingle()
      if (existing) { setError(t('auth.err.usernameTaken')); setLoading(false); playError(); return }
      const { data, error: err } = await supabase.auth.signUp({
        email, password, options: { data: { username, display_name: username } },
      })
      setLoading(false)
      if (err) {
        const m = err.message.toLowerCase()
        playError()
        if (m.includes('already registered') || m.includes('already exists') || m.includes('email address is already')) setError(t('auth.err.emailTaken'))
        else if (m.includes('database error') || m.includes('saving new user')) setError(t('auth.err.registerFailed'))
        else if (m.includes('password')) setError(t('auth.err.pwWeak'))
        else if (m.includes('email')) setError(t('auth.err.emailInvalid'))
        else if (m.includes('fetch') || m.includes('network')) setError(t('auth.err.network'))
        else setError(err.message)
        return
      }
      if (data?.user && !data.session) { setNeedsConfirm(true); return }
      playSuccess()
      await afterAuth()
    } else {
      setLoading(true)
      const { error: err } = await supabase.auth.signInWithPassword({ email, password })
      setLoading(false)
      if (err) {
        playError()
        const m = err.message.toLowerCase()
        if (m.includes('fetch') || m.includes('network')) setError(t('auth.err.network'))
        else if (m.includes('not confirmed')) setError(t('auth.err.emailNotConfirmed'))
        else setError(t('auth.err.badCredentials'))
        return
      }
      playSuccess()
      await afterAuth()
    }
  }

  // ════════════════════════ LOGIN — patvirtintas UI (Fazė 1) ═══════════════════
  if (!isReg) {
    const loginValid = /\S+@\S+\.\S+/.test(email) && password.length >= 1
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

        {/* ── Dešinė: prisijungimo forma (372px) ── */}
        <div className="flex flex-col justify-center overflow-y-auto ravenof-scroll" style={{ width: 372, flex: 'none', background: '#0B0910', borderLeft: '1px solid var(--ravenof-border-hairline)', padding: '22px 34px', paddingRight: 'max(34px, env(safe-area-inset-right, 0px))', gap: 11 }}>
          {needsConfirm ? (
            <div className="text-center py-4">
              <div className="text-4xl mb-2">📧</div>
              <p style={{ font: '700 16px var(--ravenof-font-display)', color: 'var(--ravenof-gold)', letterSpacing: '0.05em' }}>{t('auth.confirmEmailTitle')}</p>
              <p className="mt-2" style={{ font: '400 12px var(--ravenof-font-body)', lineHeight: 1.5, color: 'var(--ravenof-text-secondary)' }}>
                {t('auth.confirmEmailBody', { email })}
              </p>
              <Link href="/digital/login" onClick={() => playUiClick()} className="ravenof-btn ravenof-btn-secondary inline-flex mt-4">
                {t('auth.login')}
              </Link>
            </div>
          ) : (
            <>
              <h1 style={{ font: '700 18px var(--ravenof-font-display)', letterSpacing: '.5px', color: 'var(--ravenof-text-primary)', margin: 0 }}>{t('auth.welcomeBack')}</h1>
              <form onSubmit={submit} className="flex flex-col" style={{ gap: 8, marginTop: 2 }} noValidate>
                <RavenofTextField id="rvn-email" type="email" placeholder={t('auth.email')} value={email}
                  onChange={(e) => setEmail(e.target.value)} required autoComplete="email" aria-label={t('auth.email')} />
                <div className="relative">
                  <RavenofTextField id="rvn-pw" type={showPw ? 'text' : 'password'} placeholder={t('auth.password')}
                    value={password} onChange={(e) => setPassword(e.target.value)} required
                    autoComplete="current-password" aria-label={t('auth.password')} style={{ paddingRight: 38 }} />
                  <button type="button" onClick={() => setShowPw((v) => !v)} aria-label={showPw ? t('auth.hidePw') : t('auth.showPw')}
                    className="absolute right-0 top-0 h-full px-2.5 flex items-center" style={{ color: 'var(--ravenof-text-secondary)', background: 'none', border: 'none', cursor: 'pointer' }}>
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <div className="flex items-center" style={{ minHeight: 15 }}>
                  {error && <span role="alert" style={{ font: '500 11px var(--ravenof-font-body)', color: '#c65563' }}>{error}</span>}
                  <div className="flex-1" />
                  <Link href="/digital/forgot-password" onClick={() => playUiClick()} className="ravenof-press" style={{ font: '400 11px var(--ravenof-font-body)', color: 'var(--ravenof-text-secondary)' }}>{t('auth.forgotPassword')}</Link>
                </div>
                <button type="submit" disabled={loading} className="ravenof-press w-full" style={{
                  height: 46, display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: loginValid ? 'pointer' : 'default',
                  background: loginValid ? 'var(--ravenof-grad-gold)' : 'var(--ravenof-bg-elevated)',
                  color: loginValid ? 'var(--ravenof-on-gold)' : '#5e5868',
                  font: '800 13px var(--ravenof-font-display)', letterSpacing: 2, textTransform: 'uppercase', marginTop: 2,
                  clipPath: loginValid ? 'var(--ravenof-clip-primary)' : undefined,
                  boxShadow: loginValid ? 'var(--ravenof-shadow-gold-btn)' : undefined,
                  opacity: loading ? .7 : 1,
                }}>
                  {loading ? t('auth.signingIn') : t('auth.loginCta2')}
                </button>
              </form>
              <div className="text-center" style={{ font: '400 11.5px var(--ravenof-font-body)', color: '#6b6474', marginTop: 2 }}>
                {t('auth.noAccount')}{' '}
                <Link href={withNext('/digital/register')} onClick={() => playUiClick()} className="ravenof-press" style={{ color: 'var(--ravenof-gold)', fontWeight: 700 }}>{t('auth.createAccount')}</Link>
              </div>
            </>
          )}
        </div>
      </div>
    )
  }

  // ════════════════════════ REGISTER — patvirtintas UI (Fazė 3) ════════════════
  return (
    <div className="ravenof-body h-full w-full flex overflow-hidden ravenof-in" style={{ background: 'var(--ravenof-bg-base)' }}>
      {/* ── Kairė: misty-fortress artas + wordmark ── */}
      <div className="relative flex-1 overflow-hidden min-w-0">
        <div className="absolute inset-0" style={{ background: `url('${RAVENOF_ASSET}/backgrounds/background-misty-fortress.webp') center 30% / cover no-repeat` }} />
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

      {/* ── Dešinė: registracijos forma (372px) ── */}
      <div className="flex flex-col justify-center overflow-y-auto ravenof-scroll" style={{ width: 372, flex: 'none', background: '#0B0910', borderLeft: '1px solid var(--ravenof-border-hairline)', padding: '18px 34px', paddingRight: 'max(34px, env(safe-area-inset-right, 0px))', gap: 10 }}>
        {needsConfirm ? (
          <div className="text-center py-4">
            <div className="text-4xl mb-2">📧</div>
            <p style={{ font: '700 16px var(--ravenof-font-display)', color: 'var(--ravenof-gold)', letterSpacing: '0.05em' }}>{t('auth.confirmEmailTitle')}</p>
            <p className="mt-2" style={{ font: '400 12px var(--ravenof-font-body)', lineHeight: 1.5, color: 'var(--ravenof-text-secondary)' }}>
              {t('auth.confirmEmailBody', { email })}
            </p>
            <Link href="/digital/login" onClick={() => playUiClick()} className="ravenof-btn ravenof-btn-secondary inline-flex mt-4">
              {t('auth.login')}
            </Link>
          </div>
        ) : (
          <>
            <h1 style={{ font: '700 18px var(--ravenof-font-display)', letterSpacing: '.5px', color: 'var(--ravenof-text-primary)', margin: 0 }}>{t('auth.newAccount')}</h1>
            <form onSubmit={submit} className="flex flex-col" style={{ gap: 8, marginTop: 2 }} noValidate>
              <div>
                <RavenofTextField id="rvn-user" type="text" placeholder={t('auth.username')} value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                  required maxLength={20} autoComplete="username" aria-label={t('auth.username')}
                  aria-invalid={username.length > 0 && !USERNAME_RE.test(username)} aria-describedby="rvn-user-hint" />
                {username.length > 0 && !USERNAME_RE.test(username) && (
                  <p id="rvn-user-hint" style={{ font: '400 10px var(--ravenof-font-body)', color: '#fbbf24', margin: '3px 0 0' }}>{t('auth.usernameHint')}</p>
                )}
              </div>
              <RavenofTextField id="rvn-email" type="email" placeholder={t('auth.email')} value={email}
                onChange={(e) => setEmail(e.target.value)} required autoComplete="email" aria-label={t('auth.email')} />
              <div className="relative">
                <RavenofTextField id="rvn-pw" type={showPw ? 'text' : 'password'} placeholder={t('auth.password')}
                  value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8}
                  autoComplete="new-password" aria-label={t('auth.password')} style={{ paddingRight: 38 }} />
                <button type="button" onClick={() => setShowPw((v) => !v)} aria-label={showPw ? t('auth.hidePw') : t('auth.showPw')}
                  className="absolute right-0 top-0 h-full px-2.5 flex items-center" style={{ color: 'var(--ravenof-text-secondary)', background: 'none', border: 'none', cursor: 'pointer' }}>
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <div>
                <RavenofTextField id="rvn-pw2" type={showPw ? 'text' : 'password'} placeholder={t('auth.repeatPlaceholder')} value={confirm}
                  onChange={(e) => setConfirm(e.target.value)} required autoComplete="new-password" aria-label={t('auth.repeat')}
                  aria-invalid={!!confirm && confirm !== password} aria-describedby="rvn-pw2-hint"
                  style={{ borderColor: confirm && confirm !== password ? 'rgba(198,85,99,0.7)' : undefined }} />
                {confirm && confirm !== password && (
                  <p id="rvn-pw2-hint" style={{ font: '400 10px var(--ravenof-font-body)', color: '#c65563', margin: '3px 0 0' }}>{t('auth.pwMismatch')}</p>
                )}
              </div>
              {error && (
                <div role="alert" style={{ font: '500 11px var(--ravenof-font-body)', color: '#c65563', textAlign: 'center' }}>{error}</div>
              )}
              <RavenofBannerButton type="submit" disabled={loading} style={{ marginTop: 4, opacity: loading ? .7 : 1 }}>
                {loading ? t('auth.creating') : t('auth.registerCta2')}
              </RavenofBannerButton>
            </form>
            <div className="text-center" style={{ font: '400 10.5px var(--ravenof-font-body)', color: '#6b6474' }}>{t('auth.termsNote')}</div>
            <div className="text-center" style={{ font: '400 11.5px var(--ravenof-font-body)', color: '#6b6474' }}>
              {t('auth.haveAccount')}{' '}
              <Link href={withNext('/digital/login')} onClick={() => playUiClick()} className="ravenof-press" style={{ color: 'var(--ravenof-gold)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>{t('auth.login')}</Link>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
