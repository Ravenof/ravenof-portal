'use client'

// ── PWA diegimo pasiūlymas ────────────────────────────────────────────────────
// Audit #26: atmetimas IŠSAUGOMAS (localStorage, 14 d.) — baneris neberodomas
// po kiekvienos navigacijos; jau įdiegtoje (standalone) aplinkoje nerodomas;
// tekstai per i18n (LT/EN), ne hardcode.
import { useEffect, useState } from 'react'
import { useT } from '@/lib/i18n/react'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const DISMISS_KEY = 'rvn-pwa-dismissed-until'
const DISMISS_DAYS = 14

function isDismissed(): boolean {
  try {
    const until = Number(localStorage.getItem(DISMISS_KEY) ?? 0)
    return until > Date.now()
  } catch { return false }
}

function persistDismiss() {
  try { localStorage.setItem(DISMISS_KEY, String(Date.now() + DISMISS_DAYS * 86_400_000)) } catch { /* */ }
}

export function InstallPrompt() {
  const t = useT()
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [dismissed, setDismissed] = useState(true) // start hidden — atsidaro tik gavus event ir patikrinus storage

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault()
      if (isDismissed()) return
      if (window.matchMedia('(display-mode: standalone)').matches) return
      setPrompt(e as BeforeInstallPromptEvent)
      setDismissed(false)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  if (!prompt || dismissed) return null

  const dismiss = () => {
    persistDismiss()
    setDismissed(true)
  }

  const handleInstall = async () => {
    await prompt.prompt()
    const { outcome } = await prompt.userChoice
    if (outcome === 'accepted') {
      // įdiegta — nebesirodys per standalone check; dar pažymim ilgam
      try { localStorage.setItem(DISMISS_KEY, String(Date.now() + 365 * 86_400_000)) } catch { /* */ }
    } else {
      persistDismiss()
    }
    setDismissed(true)
    setPrompt(null)
  }

  return (
    <div
      className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl shadow-2xl"
      style={{
        background:  'linear-gradient(135deg, rgba(15,9,48,0.97), rgba(7,7,15,0.97))',
        border:      '1px solid rgba(242,162,12,0.35)',
        boxShadow:   '0 0 32px rgba(242,162,12,0.12)',
        backdropFilter: 'blur(12px)',
        maxWidth:    'calc(100vw - 2rem)',
      }}
    >
      <span className="text-xl flex-shrink-0">⚔️</span>
      <span
        className="text-sm font-semibold"
        style={{ color: 'var(--text-primary)', fontFamily: 'var(--rvn-font-display)', letterSpacing: '0.03em' }}
      >
        {t('common.pwa.installTitle')}
      </span>
      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          onClick={handleInstall}
          className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all hover:scale-105 active:scale-95"
          style={{
            background:  'linear-gradient(135deg,#92400e,#b45309)',
            color:       'var(--gold)',
            border:      '1px solid rgba(242,162,12,0.4)',
            fontFamily:  'var(--rvn-font-display)',
            letterSpacing: '0.04em',
            minHeight:   32,
          }}
        >
          {t('common.pwa.installCta')}
        </button>
        <button
          onClick={dismiss}
          className="text-xs px-2 py-1.5 rounded-lg transition-opacity hover:opacity-70"
          style={{ color: 'var(--text-muted)', minWidth: 32, minHeight: 32 }}
          aria-label={t('common.close')}
        >
          ✕
        </button>
      </div>
    </div>
  )
}
