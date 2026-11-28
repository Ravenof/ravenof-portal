'use client'
// ── Užrakinto režimo ekranas (848) ───────────────────────────────────────────
// Rodomas VIETOJ ekrano, kurio žaidėjas dar neatsirakino pagal paskyros lygį
// (žr. src/lib/digital/unlocks.ts). Pasako, kurio lygio reikia, ir veda ten,
// kur gaunamas XP. Kol atrakinimų duomenys nepakrauti – ekranas rodomas įprastai.
import type { ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { Lock } from 'lucide-react'
import { useT } from '@/lib/i18n/react'
import { playUiClick } from '@/lib/ui-sound'
import { featureForPath, useFeatureLock, type UnlockFeature } from '@/lib/digital/unlocks'
import { LevelEmblem } from './LevelEmblem'

export function FeatureLockPanel({ feature, required, level, compact = false }: { feature: UnlockFeature; required: number; level: number; compact?: boolean }) {
  const t = useT()
  const router = useRouter()
  return (
    <div role="status"
      style={{ height: '100%', minHeight: compact ? 220 : 320, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: compact ? 10 : 16, padding: compact ? '18px 16px' : '32px 24px' }}>
      <div style={{ position: 'relative' }}>
        <LevelEmblem level={required} size={compact ? 64 : 92} title={t('profile.unlock.requiredAria', { level: required })} />
        <span aria-hidden style={{ position: 'absolute', right: -8, top: -6, width: 30, height: 30, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#07060A', border: '1px solid var(--ravenof-gold)', color: 'var(--ravenof-gold-bright)' }}>
          <Lock size={15} />
        </span>
      </div>
      <div className="ravenof-disp" style={{ font: `800 ${compact ? 18 : 26}px var(--ravenof-font-display)`, letterSpacing: 1, textTransform: 'uppercase', color: 'var(--ravenof-gold-bright)' }}>
        {t(`profile.unlock.feature.${feature}`)}
      </div>
      <p style={{ margin: 0, maxWidth: 460, font: `400 ${compact ? 14 : 17}px/1.45 var(--ravenof-font-body)`, color: 'var(--ravenof-text-secondary)' }}>
        {t('profile.unlock.body', { required, level })}
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
        <button onClick={() => { playUiClick(); router.push('/digital/tutorial') }} className="ravenof-btn ravenof-btn-primary" style={{ minHeight: 44, padding: '0 22px' }}>
          {t('profile.unlock.toLessons')}
        </button>
        <button onClick={() => { playUiClick(); router.push('/digital/profile/levels') }} className="ravenof-btn ravenof-btn-secondary" style={{ minHeight: 44, padding: '0 22px' }}>
          {t('profile.unlock.toLevels')}
        </button>
      </div>
    </div>
  )
}

/** Apgaubia maršruto turinį: jei maršrutas užrakintas – rodo užrakto ekraną. */
export function RouteFeatureGate({ pathname, children }: { pathname: string; children: ReactNode }) {
  const feature = featureForPath(pathname)
  // hook'as kviečiamas visada (su saugia numatyta reikšme), kad hook'ų tvarka nesikeistų
  const lock = useFeatureLock(feature ?? 'ranked')
  if (!feature || !lock.locked) return <>{children}</>
  return <FeatureLockPanel feature={feature} required={lock.required} level={lock.level} />
}
