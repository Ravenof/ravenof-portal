'use client'

// ══════════════════════════════════════════════════════════════════════════════
// Ravenof Digital — landscape-first registracija / prisijungimas.
// Kairė: logotipas, šūkis, pasaulio įvadas. Dešinė: kompaktiška forma (telpa
// 844×390 be vertikalaus scroll). Po sėkmės NIEKADA neišeinama iš /digital:
//   register → /digital/onboarding
//   login    → onboarding done ? /digital : /digital/onboarding
// Orientacijos lock + „pasuk telefoną" overlay paveldimi iš /digital layout.
// ══════════════════════════════════════════════════════════════════════════════
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { getOnboardingState } from '@/lib/digital/onboarding'
import { playUiClick, playSuccess, playError } from '@/lib/ui-sound'

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
function withNext(href: string): string {
  const n = currentNext()
  return n ? `${href}?next=${encodeURIComponent(n)}` : href
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
  const items = ['Paskyra', 'Kaladė', 'Į žaidimą']
  return (
    <div className="flex items-center gap-1.5" aria-label={`Žingsnis ${step + 1} iš 3`}>
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
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [needsConfirm, setNeedsConfirm] = useState(false)

  const isReg = mode === 'register'

  const afterAuth = async () => {
    const st = await getOnboardingState()
    // onboarding pirmiau; baigusiems — prašytas /digital kelias arba home
    router.replace(st === 'done' ? (currentNext() ?? '/digital') : '/digital/onboarding')
    router.refresh()
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (loading) return
    setError(null)
    const supabase = createClient()

    if (isReg) {
      if (!USERNAME_RE.test(username)) { setError('Slapyvardis: 3–20 simbolių, tik a–z, 0–9, _'); return }
      if (password.length < 8) { setError('Slaptažodis turi būti bent 8 simbolių.'); return }
      if (password !== confirm) { setError('Slaptažodžiai nesutampa.'); return }
      setLoading(true)
      const { data: existing } = await supabase.from('profiles').select('id').eq('username', username).maybeSingle()
      if (existing) { setError('Šis slapyvardis jau užimtas.'); setLoading(false); playError(); return }
      const { data, error: err } = await supabase.auth.signUp({
        email, password, options: { data: { username, display_name: username } },
      })
      setLoading(false)
      if (err) {
        const m = err.message.toLowerCase()
        playError()
        if (m.includes('already registered') || m.includes('already exists') || m.includes('email address is already')) setError('Šis el. paštas jau užregistruotas. Prisijunk arba naudok kitą.')
        else if (m.includes('database error') || m.includes('saving new user')) setError('Registracijos klaida. Bandyk dar kartą — paskyra nesukurta.')
        else if (m.includes('password')) setError('Slaptažodis per silpnas. Naudok bent 8 simbolius.')
        else if (m.includes('email')) setError('Neteisingas el. pašto formatas.')
        else if (m.includes('fetch') || m.includes('network')) setError('Nėra ryšio. Patikrink internetą ir bandyk dar kartą.')
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
        if (m.includes('fetch') || m.includes('network')) setError('Nėra ryšio. Patikrink internetą ir bandyk dar kartą.')
        else if (m.includes('not confirmed')) setError('El. paštas dar nepatvirtintas — patikrink pašto dėžutę.')
        else setError('Neteisingas el. paštas arba slaptažodis.')
        return
      }
      playSuccess()
      await afterAuth()
    }
  }

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
        <div className="relative">
          <Progress step={0} />
          <h1 className="rvn-page-title mt-3" style={{ fontSize: 'clamp(26px, 6vh, 44px)', letterSpacing: '0.14em', lineHeight: 1 }}>RAVENOF</h1>
          <p className="mt-1 font-bold" style={{ fontFamily: 'var(--rvn-font-display)', color: 'var(--gold)', fontSize: 'clamp(11px, 2.2vh, 14px)', letterSpacing: '0.04em' }}>
            Pasirink vardą. Atsiimk pirmąją kaladę. Ženk į Ravenof.
          </p>
          <p className="mt-2 max-w-md" style={{ color: 'var(--text-secondary)', fontSize: 'clamp(10px, 2vh, 12.5px)', lineHeight: 1.5 }}>
            Tamsios fantazijos kortų mūšiai: 8 frakcijos, gyvi burtai, prakeiksmai ir kapinyno magija.
            Kaladė, kurią pasirinksi, taps tavo pirmuoju ginklu.
          </p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {['⚔ PvP kovos', '🤖 Kovos su AI', '🏆 Reitingas', '🎴 Kolekcija'].map((f) => (
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
            <p className="text-base font-bold" style={{ color: 'var(--gold)', fontFamily: 'var(--rvn-font-display)', letterSpacing: '0.05em' }}>Patvirtink el. paštą</p>
            <p className="text-xs mt-2 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              Išsiuntėme nuorodą į <strong style={{ color: '#f3ead3' }}>{email}</strong>.<br />
              Paspaudęs ją grįžk ir prisijunk — lauks tavo pirmoji kaladė.
            </p>
            <Link href="/digital/login" onClick={() => playUiClick()} className="inline-block mt-4 px-5 py-2 rounded-xl text-sm font-bold"
              style={{ background: `rgba(${GOLD},0.15)`, border: `1px solid rgba(${GOLD},0.5)`, color: 'var(--gold)', fontFamily: 'var(--rvn-font-display)' }}>
              Prisijungti
            </Link>
          </div>
        ) : (
          <>
            <h2 className="font-bold" style={{ fontFamily: 'var(--rvn-font-display)', color: 'var(--gold)', fontSize: 'clamp(14px, 3vh, 18px)', letterSpacing: '0.08em' }}>
              {isReg ? 'SUKURK PASKYRĄ' : 'PRISIJUNK'}
            </h2>
            <form onSubmit={submit} className="mt-2 flex flex-col gap-2" noValidate>
              {isReg && (
                <div>
                  <label htmlFor="rvn-user" style={labelStyle}>Slapyvardis</label>
                  <input id="rvn-user" type="text" placeholder="a–z, 0–9, _ (3–20)" value={username}
                    onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                    required maxLength={20} autoComplete="username" style={inputStyle}
                    aria-invalid={username.length > 0 && !USERNAME_RE.test(username)} aria-describedby="rvn-user-hint" />
                  {username.length > 0 && !USERNAME_RE.test(username) && (
                    <p id="rvn-user-hint" className="mt-0.5" style={{ fontSize: 10, color: '#fbbf24' }}>3–20 simbolių, tik a–z, 0–9, _</p>
                  )}
                </div>
              )}
              <div>
                <label htmlFor="rvn-email" style={labelStyle}>El. paštas</label>
                <input id="rvn-email" type="email" placeholder="tavo@pastas.lt" value={email}
                  onChange={(e) => setEmail(e.target.value)} required autoComplete="email" style={inputStyle} />
              </div>
              <div className={isReg ? 'grid grid-cols-2 gap-2' : ''}>
                <div>
                  <label htmlFor="rvn-pw" style={labelStyle}>Slaptažodis</label>
                  <div className="relative">
                    <input id="rvn-pw" type={showPw ? 'text' : 'password'} placeholder={isReg ? 'Bent 8 simboliai' : 'Slaptažodis'}
                      value={password} onChange={(e) => setPassword(e.target.value)} required minLength={isReg ? 8 : undefined}
                      autoComplete={isReg ? 'new-password' : 'current-password'} style={{ ...inputStyle, paddingRight: 36 }} />
                    <button type="button" onClick={() => setShowPw((v) => !v)} aria-label={showPw ? 'Slėpti slaptažodį' : 'Rodyti slaptažodį'}
                      className="absolute right-0 top-0 h-full px-2.5 flex items-center" style={{ color: 'var(--text-muted)' }}>
                      {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                {isReg && (
                  <div>
                    <label htmlFor="rvn-pw2" style={labelStyle}>Pakartoti</label>
                    <input id="rvn-pw2" type={showPw ? 'text' : 'password'} placeholder="Pakartoti" value={confirm}
                      onChange={(e) => setConfirm(e.target.value)} required autoComplete="new-password"
                      aria-invalid={!!confirm && confirm !== password} aria-describedby="rvn-pw2-hint"
                      style={{ ...inputStyle, borderColor: confirm && confirm !== password ? 'rgba(239,68,68,0.7)' : undefined }} />
                  </div>
                )}
              </div>
              {isReg && confirm && confirm !== password && (
                <p id="rvn-pw2-hint" style={{ fontSize: 10, color: '#f87171', marginTop: -4 }}>Slaptažodžiai nesutampa</p>
              )}
              {error && (
                <div role="alert" className="rounded-lg px-3 py-2 text-center" style={{ fontSize: 11.5, background: 'rgba(220,38,38,0.12)', border: '1px solid rgba(220,38,38,0.35)', color: '#fca5a5' }}>
                  {error}
                </div>
              )}
              <button type="submit" disabled={loading} className="rvn-press w-full rounded-xl font-extrabold transition-transform active:scale-[0.98] disabled:opacity-60"
                style={{ height: 42, fontSize: 13.5, fontFamily: 'var(--rvn-font-display)', letterSpacing: '0.05em',
                  background: 'linear-gradient(180deg,#ffe28c,#f3b62c 46%,#c5841a)', color: '#3a2406', border: '1px solid #ffeaa6', boxShadow: `0 4px 18px rgba(${GOLD},0.25)` }}>
                {loading ? (isReg ? 'Kuriama paskyra…' : 'Jungiamasi…') : (isReg ? '⚔ Registruotis ir rinktis kaladę' : '⚔ Prisijungti')}
              </button>
            </form>
            <div className="mt-2 text-center" style={{ fontSize: 11 }}>
              {isReg ? (
                <Link href={withNext('/digital/login')} onClick={() => playUiClick()} style={{ color: 'var(--text-secondary)' }}>
                  Jau turi paskyrą? <span style={{ color: 'var(--gold)', fontWeight: 700 }}>Prisijunk</span>
                </Link>
              ) : (
                <Link href={withNext('/digital/register')} onClick={() => playUiClick()} style={{ color: 'var(--text-secondary)' }}>
                  Naujas žaidėjas? <span style={{ color: 'var(--gold)', fontWeight: 700 }}>Sukurk paskyrą</span>
                </Link>
              )}
              {!isReg && (
                <Link href="/digital/forgot-password" className="block mt-1" style={{ color: 'var(--text-muted)', fontSize: 10 }}>Pamiršai slaptažodį?</Link>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
