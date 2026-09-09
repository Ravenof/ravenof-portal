'use client'

// ── „Tęsti su Google / Facebook“ mygtukai (login + register ekranams) ────────
// Web'e – redirect; Electron/Capacitor – išorinė naršyklė + deep link grįžimas
// (žr. src/lib/digital/oauth.ts). Kol laukiama grįžimo, rodoma užuomina.
import { useEffect, useRef, useState } from 'react'
import { useT } from '@/lib/i18n/react'
import { playUiClick, playError, playSuccess } from '@/lib/ui-sound'
import { startOAuth, listenOAuthCallback, completeOAuth, usesExternalBrowser, type OAuthProvider } from '@/lib/digital/oauth'

const ICON: Record<OAuthProvider, React.ReactNode> = {
  google: (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
      <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.3-1.6 3.9-5.5 3.9-3.3 0-6-2.7-6-6s2.7-6 6-6c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.4 14.6 2.4 12 2.4 6.7 2.4 2.4 6.7 2.4 12s4.3 9.6 9.6 9.6c5.5 0 9.2-3.9 9.2-9.4 0-.6-.1-1.1-.2-1.6H12z" />
    </svg>
  ),
  facebook: (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
      <path fill="#1877F2" d="M24 12a12 12 0 1 0-13.9 11.9v-8.4H7.1V12h3V9.4c0-3 1.8-4.7 4.5-4.7 1.3 0 2.7.2 2.7.2v3h-1.5c-1.5 0-2 .9-2 1.9V12h3.3l-.5 3.5h-2.8v8.4A12 12 0 0 0 24 12z" />
    </svg>
  ),
}

export function OAuthButtons({ next, onDone, onError }: { next: string | null; onDone: () => Promise<void> | void; onError: (msg: string) => void }) {
  const t = useT()
  const [busy, setBusy] = useState<OAuthProvider | null>(null)
  const [waiting, setWaiting] = useState(false)
  const done = useRef(false)

  // Deep link grįžimas (Electron / Capacitor) – klausom visą laiką, kol ekranas atidarytas
  useEffect(() => {
    if (!usesExternalBrowser()) return
    return listenOAuthCallback(async (url) => {
      if (done.current) return
      const r = await completeOAuth(url)
      if (!r.ok) { setWaiting(false); setBusy(null); playError(); onError(t('auth.err.oauthFailed')); return }
      done.current = true
      playSuccess()
      await onDone()
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const go = async (p: OAuthProvider) => {
    if (busy) return
    playUiClick()
    setBusy(p)
    try {
      await startOAuth(p, next)
      if (usesExternalBrowser()) { setWaiting(true); setBusy(null) }
    } catch {
      setBusy(null)
      playError()
      onError(t('auth.err.oauthFailed'))
    }
  }

  const btn = (p: OAuthProvider, label: string) => (
    <button key={p} type="button" onClick={() => go(p)} disabled={!!busy} className="ravenof-press flex items-center justify-center gap-2" style={{
      height: 38, flex: 1, border: '1px solid var(--ravenof-border-strong)', background: 'rgba(255,255,255,0.03)', color: 'var(--ravenof-text-primary)',
      font: '700 11px var(--ravenof-font-display)', letterSpacing: 1, textTransform: 'uppercase', cursor: busy ? 'default' : 'pointer', borderRadius: 3, opacity: busy && busy !== p ? .5 : 1,
    }}>
      {ICON[p]}<span>{label}</span>
    </button>
  )

  return (
    <div className="flex flex-col" style={{ gap: 8 }}>
      <div className="flex items-center" style={{ gap: 10, color: '#6b6474', font: '400 10.5px var(--ravenof-font-body)', letterSpacing: 1, textTransform: 'uppercase' }}>
        <div style={{ flex: 1, height: 1, background: 'var(--ravenof-border-hairline)' }} />
        <span>{t('auth.orContinueWith')}</span>
        <div style={{ flex: 1, height: 1, background: 'var(--ravenof-border-hairline)' }} />
      </div>
      <div className="flex" style={{ gap: 8 }}>
        {btn('google', 'Google')}
        {btn('facebook', 'Facebook')}
      </div>
      {waiting && (
        <p role="status" style={{ font: '400 11px var(--ravenof-font-body)', lineHeight: 1.45, color: 'var(--ravenof-text-secondary)', margin: 0, textAlign: 'center' }}>
          {t('auth.oauthWaiting')}
        </p>
      )}
    </div>
  )
}
