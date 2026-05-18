'use client'

import { useEffect, useState } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function InstallPrompt() {
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault()
      setPrompt(e as BeforeInstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  // Hide if already installed (standalone mode)
  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setDismissed(true)
    }
  }, [])

  if (!prompt || dismissed) return null

  const handleInstall = async () => {
    await prompt.prompt()
    const { outcome } = await prompt.userChoice
    if (outcome === 'accepted' || outcome === 'dismissed') {
      setDismissed(true)
      setPrompt(null)
    }
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
        Įdiegti Ravenof programėlę
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
          }}
        >
          Įdiegti
        </button>
        <button
          onClick={() => setDismissed(true)}
          className="text-xs px-2 py-1.5 rounded-lg transition-opacity hover:opacity-70"
          style={{ color: 'var(--text-muted)' }}
          aria-label="Uždaryti"
        >
          ✕
        </button>
      </div>
    </div>
  )
}
