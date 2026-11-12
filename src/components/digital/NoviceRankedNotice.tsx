'use client'
// Reitingo ekrane: neįkyrus priminimas naujokui, kad pirma verta įveikti pagrindus.
// Ne užraktas – galima uždaryti ir žaisti.
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useT } from '@/lib/i18n/react'
import { playUiClick } from '@/lib/ui-sound'
import { getNoviceState } from '@/lib/digital/novice'

export function NoviceRankedNotice() {
  const t = useT()
  const router = useRouter()
  const [show, setShow] = useState(false)
  useEffect(() => {
    let live = true
    try { if (sessionStorage.getItem('rvn:novice-ranked-dismissed')) return } catch { /* */ }
    void getNoviceState().then((n) => { if (live && n?.novice) setShow(true) })
    return () => { live = false }
  }, [])
  if (!show) return null
  const close = () => { setShow(false); try { sessionStorage.setItem('rvn:novice-ranked-dismissed', '1') } catch { /* */ } }
  return (
    <div role="status" style={{ position: 'fixed', left: '50%', bottom: 'calc(14px + env(safe-area-inset-bottom, 0px))', transform: 'translateX(-50%)', zIndex: 90,
      display: 'flex', alignItems: 'center', gap: 12, maxWidth: 'min(94vw, 640px)', padding: '10px 14px',
      background: 'linear-gradient(100deg,#1B1522,#241a2e)', border: '1px solid rgba(212,163,59,.5)', borderLeft: '2px solid #F2C45A', boxShadow: '0 8px 28px rgba(0,0,0,.55)' }}>
      <span style={{ flex: 1, minWidth: 0, font: '400 13px var(--ravenof-font-body)', color: 'var(--ravenof-text-primary)', lineHeight: 1.4 }}>{t('home.novice.rankedHint')}</span>
      <button onClick={() => { playUiClick(); router.push('/digital/tutorial?auto=1') }} className="ravenof-press"
        style={{ flex: 'none', font: '700 12px var(--ravenof-font-display)', letterSpacing: 1, textTransform: 'uppercase', color: 'var(--ravenof-on-gold)', background: 'var(--ravenof-grad-gold)', border: 0, padding: '8px 14px', cursor: 'pointer' }}>
        {t('home.novice.toLessons')}
      </button>
      <button onClick={close} aria-label={t('common.close')} className="ravenof-press"
        style={{ flex: 'none', width: 30, height: 30, font: '400 16px var(--ravenof-font-body)', color: 'var(--ravenof-text-secondary)', background: 'transparent', border: '1px solid var(--ravenof-border-strong)', cursor: 'pointer' }}>✕</button>
    </div>
  )
}
