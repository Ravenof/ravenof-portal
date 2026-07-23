'use client'

// ══════════════════════════════════════════════════════════════════════════════
// Ravenof Digital — landscape-first registracija / prisijungimas.
// LOGIN: patvirtintas UI (ravenof-ui-handoff login-default.png) — kairė katedros
// artas + wordmark, dešinė 372px forma. REGISTER: esama (nemigruota) UI.
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
import { LanguageSelector } from '@/components/digital/ui/LanguageSelector'
import { useLocale, setLocale } from '@/lib/i18n/react'
import { LANGUAGE_OPTIONS } from '@/lib/i18n/config'
import { RavenofTextField, RAVENOF_ASSET } from '@/components/digital/ui/RavenofKit'

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

const GOLD = '240,180,41'

const inputStyle: React.CSSProperties = {
  width: '100%', height: 38, borderRadius: 10, padding: '0 12px', fontSize: 13,
  background: 'rgba(8,6,13,0.85)', border: '1px solid rgba(240,180,41,0.25)',
  color: '#f3ead3', outline: 'none',
}
const labelStyle: React.CSSProperties = {
  fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase',
  color: 'var(--text-muted)', fontFamily: 'var(--rvn-font-display)', display: 'block', marginBottom: 3,
}

function Progress({ step }: { step: 0 | 1 | 2 }) {
  const t = useT()
  const items = [t('auth.steps.account'), t('auth.steps.deck'), t('auth.steps.toGame')]
  return (
    <div className="flex items-center gap-1.5" aria-label={t('auth.steps.stepOf', { step: step + 1, total: 3 })}>
      {items.map((t, i) => (
        <span key={t} className="flex items-center gap-1.5">
          <span className="px-2 py-0.5 rounded-full font-bold" style={{
            fontSize: 9.5, letterSpacing: '0.06em', fontFamily: 'var(--rvn-font-display)',
            background: i === step ? `rgba(${GOLD},0.2)` : 'rgba(255,255,255,0.05)',
            border: `1px solid ${i === step ? `rgba(${GOLD},0.7)` : i < step ? 'rgba(74,222,128,0.5)' : 'rgba(255,255,255,0.12)'}`,
            color: i === step ? 'var(--gold)' : i < step ? '#4ade80' : 'var(--text-muted)',
          }}>{i < step ? '✓ ' : ''}{t}</span>
          {i < 2 && <span style={{ color: 'rgba(150,160,185,0.4)', fontSize: 10 }}>→</span>}
        </span>
      ))}
    </div>
  )
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

  // ════════════════════════ REGISTER — esama (nemigruota) UI ═══════════════════
  return (
    <div className="h-full w-full grid" style={{
      gridTemplateColumns: 'minmax(260px, 1.15fr) minmax(300px, 1fr)',
      gap: 'clamp(10px, 2vw, 28px)',
      padding: `max(10px, env(safe-area-inset-top)) max(16px, env(safe-area-inset-right)) max(10px, env(safe-area-inset-bottom)) max(16px, env(safe-area-inset-left))`,
    }}>
      {/* ── Kairė: pasaulis ── */}
      <div className="relative min-h-0 flex flex-col justify-center overflow-hidden rounded-2xl px-6"
        style={{ border: `1px solid rgba(${GOLD},0.2)`, background: 'radial-gradient(140% 90% at 20% 10%, rgba(124,58,237,0.12), transparent 50%), linear-gradient(160deg, #16101f, #08060d)' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/digital/ui3/hero.webp" alt="" aria-hidden loading="eager"
          className="absolute inset-0 w-full h-full object-cover pointer-events-none"
          style={{ opacity: 0.34, objectPosition: '65% 20%', maskImage: 'linear-gradient(90deg, black 30%, transparent 95%)' }}
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(0deg, rgba(6,4,11,0.85), transparent 55%)' }} />
        <div className="absolute top-3 right-3 z-10"><LanguageSelector size="sm" /></div>
        <div className="relative">
          <Progress step={0} />
          <h1 className="rvn-page-title mt-3" style={{ fontSize: 'clamp(26px, 6vh, 44px)', letterSpacing: '0.14em', lineHeight: 1 }}>RAVENOF</h1>
          <p className="mt-1 font-bold" style={{ fontFamily: 'var(--rvn-font-display)', color: 'var(--gold)', fontSize: 'clamp(11px, 2.2vh, 14px)', letterSpacing: '0.04em' }}>
            {t('auth.tagline')}
          </p>
          <p className="mt-2 max-w-md" style={{ color: 'var(--text-secondary)', fontSize: 'clamp(10px, 2vh, 12.5px)', lineHeight: 1.5 }}>
            {t('auth.intro')}
          </p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {[t('auth.features.pvp'), t('auth.features.ai'), t('auth.features.ranked'), t('auth.features.collection')].map((f) => (
              <span key={f} className="px-2 py-1 rounded-lg" style={{ fontSize: 10, background: 'rgba(8,6,13,0.7)', border: '1px solid rgba(255,255,255,0.1)', color: '#c9bfa8' }}>{f}</span>
            ))}
          </div>
        </div>
      </div>

      {/* ── Dešinė: forma ── */}
      <div className="min-h-0 flex flex-col justify-center overflow-y-auto rounded-2xl px-5 py-3"
        style={{ border: `1.5px solid rgba(${GOLD},0.35)`, background: `radial-gradient(120% 50% at 50% 0%, rgba(${GOLD},0.1), transparent 55%), linear-gradient(160deg, rgba(22,16,33,0.98), rgba(9,7,15,0.98))` }}>
        {needsConfirm ? (
          <div className="text-center py-4">
            <div className="text-4xl mb-2">📧</div>
            <p className="text-base font-bold" style={{ color: 'var(--gold)', fontFamily: 'var(--rvn-font-display)', letterSpacing: '0.05em' }}>{t('auth.confirmEmailTitle')}</p>
            <p className="text-xs mt-2 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              {t('auth.confirmEmailBody', { email })}
            </p>
            <Link href="/digital/login" onClick={() => playUiClick()} className="inline-block mt-4 px-5 py-2 rounded-xl text-sm font-bold"
              style={{ background: `rgba(${GOLD},0.15)`, border: `1px solid rgba(${GOLD},0.5)`, color: 'var(--gold)', fontFamily: 'var(--rvn-font-display)' }}>
              {t('auth.login')}
            </Link>
          </div>
        ) : (
          <>
            <h2 className="font-bold" style={{ fontFamily: 'var(--rvn-font-display)', color: 'var(--gold)', fontSize: 'clamp(14px, 3vh, 18px)', letterSpacing: '0.08em' }}>
              {t('auth.registerTitle')}
            </h2>
            <form onSubmit={submit} className="mt-2 flex flex-col gap-2" noValidate>
              <div>
                <label htmlFor="rvn-user" style={labelStyle}>{t('auth.username')}</label>
                <input id="rvn-user" type="text" placeholder={t('auth.usernamePlaceholder')} value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                  required maxLength={20} autoComplete="username" style={inputStyle}
                  aria-invalid={username.length > 0 && !USERNAME_RE.test(username)} aria-describedby="rvn-user-hint" />
                {username.length > 0 && !USERNAME_RE.test(username) && (
                  <p id="rvn-user-hint" className="mt-0.5" style={{ fontSize: 10, color: '#fbbf24' }}>{t('auth.usernameHint')}</p>
                )}
              </div>
              <div>
                <label htmlFor="rvn-email" style={labelStyle}>{t('auth.email')}</label>
                <input id="rvn-email" type="email" placeholder={t('auth.emailPlaceholder')} value={email}
                  onChange={(e) => setEmail(e.target.value)} required autoComplete="email" style={inputStyle} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label htmlFor="rvn-pw" style={labelStyle}>{t('auth.password')}</label>
                  <div className="relative">
                    <input id="rvn-pw" type={showPw ? 'text' : 'password'} placeholder={t('auth.passwordPlaceholderReg')}
                      value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8}
                      autoComplete="new-password" style={{ ...inputStyle, paddingRight: 36 }} />
                    <button type="button" onClick={() => setShowPw((v) => !v)} aria-label={showPw ? t('auth.hidePw') : t('auth.showPw')}
                      className="absolute right-0 top-0 h-full px-2.5 flex items-center" style={{ color: 'var(--text-muted)' }}>
                      {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label htmlFor="rvn-pw2" style={labelStyle}>{t('auth.repeat')}</label>
                  <input id="rvn-pw2" type={showPw ? 'text' : 'password'} placeholder={t('auth.repeat')} value={confirm}
                    onChange={(e) => setConfirm(e.target.value)} required autoComplete="new-password"
                    aria-invalid={!!confirm && confirm !== password} aria-describedby="rvn-pw2-hint"
                    style={{ ...inputStyle, borderColor: confirm && confirm !== password ? 'rgba(239,68,68,0.7)' : undefined }} />
                </div>
              </div>
              {confirm && confirm !== password && (
                <p id="rvn-pw2-hint" style={{ fontSize: 10, color: '#f87171', marginTop: -4 }}>{t('auth.pwMismatch')}</p>
              )}
              {error && (
                <div role="alert" className="rounded-lg px-3 py-2 text-center" style={{ fontSize: 11.5, background: 'rgba(220,38,38,0.12)', border: '1px solid rgba(220,38,38,0.35)', color: '#fca5a5' }}>
                  {error}
                </div>
              )}
              <button type="submit" disabled={loading} className="rvn-press w-full rounded-xl font-extrabold transition-transform active:scale-[0.98] disabled:opacity-60"
                style={{ height: 42, fontSize: 13.5, fontFamily: 'var(--rvn-font-display)', letterSpacing: '0.05em',
                  background: 'linear-gradient(180deg,#ffe28c,#f3b62c 46%,#c5841a)', color: '#3a2406', border: '1px solid #ffeaa6', boxShadow: `0 4px 18px rgba(${GOLD},0.25)` }}>
                {loading ? t('auth.creating') : t('auth.registerCta')}
              </button>
            </form>
            <div className="mt-2 text-center" style={{ fontSize: 11 }}>
              <Link href={withNext('/digital/login')} onClick={() => playUiClick()} style={{ color: 'var(--text-secondary)' }}>
                {t('auth.haveAccount')} <span style={{ color: 'var(--gold)', fontWeight: 700 }}>{t('auth.haveAccountCta')}</span>
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
