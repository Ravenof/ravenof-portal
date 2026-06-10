'use client'

// ── Globalus garso jungiklis — vienas nustatymas visam portalui ───────────────
import { useEffect, useState } from 'react'
import { Volume2, VolumeX } from 'lucide-react'
import { isUiSoundEnabled, toggleUiSound, subscribeUiSound, playUiClick } from '@/lib/ui-sound'

export function GlobalSoundToggle({ size = 'sm' }: { size?: 'sm' | 'md' }) {
  // null kol nehidratuota — kad nesimirgėtų SSR/kliento nesutapimas
  const [enabled, setEnabled] = useState<boolean | null>(null)

  useEffect(() => {
    setEnabled(isUiSoundEnabled())
    return subscribeUiSound(setEnabled)
  }, [])

  const iconSize = size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4'

  return (
    <button
      onClick={() => {
        const next = toggleUiSound()
        if (next) playUiClick()
      }}
      className="px-2.5 py-1.5 rounded-lg transition-all hover:opacity-80"
      style={{
        background: 'transparent',
        color: enabled ? 'var(--gold)' : 'var(--text-muted)',
        border: '1px solid ' + (enabled ? 'rgba(240,180,41,0.35)' : 'var(--bg-border)'),
        opacity: enabled === null ? 0 : 1,
      }}
      title={enabled ? 'Išjungti garsą' : 'Įjungti garsą'}
      aria-label={enabled ? 'Išjungti garsą' : 'Įjungti garsą'}
    >
      {enabled ? <Volume2 className={iconSize} /> : <VolumeX className={iconSize} />}
    </button>
  )
}
