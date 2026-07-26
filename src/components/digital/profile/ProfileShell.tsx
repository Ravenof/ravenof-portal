'use client'
// ── Profilio kevalas: kairysis pomeniu + laukiančių pasirinkimų kortelė ─────
//  Handoff: ekranai 01/02/04/05 dalinasi TUO PAČIU kairiuoju stulpeliu
//  (Profilis · Viešas profilis · Pasiekimai · Paskyros lygiai), apatine
//  „neatsiimta" kortele ir išnaša, kad tai trys atskiros sistemos.
import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useT } from '@/lib/i18n/react'
import { playUiClick } from '@/lib/ui-sound'
import { getPendingChoices, isProgressionError } from '@/lib/progression'
import { getAchievements } from '@/lib/profile/client'
import { BODY, C, DISPLAY, useCompact } from '../progression/kit'

type Item = { key: string; href: string; label: string; sub: string; glyph: string }

export function ProfileShell({ children }: { children: React.ReactNode }) {
  const t = useT()
  const router = useRouter()
  const pathname = usePathname()
  const compact = useCompact()
  const [pending, setPending] = useState(0)
  const [ach, setAch] = useState<{ done: number; total: number } | null>(null)

  // Diagnostika: kuris isdestymas ir kodel (Android DPR 2 -> CSS ~768 px -> compact).
  useEffect(() => {
    if (process.env.NODE_ENV === 'production') return
    const vv = window.visualViewport
    console.debug('[profile] viewport', {
      innerWidth: window.innerWidth, innerHeight: window.innerHeight,
      devicePixelRatio: window.devicePixelRatio, visualViewportScale: vv ? vv.scale : null,
      layout: window.innerWidth < 1240 ? 'compact (844x390 adaptation)' : 'dashboard (1536x720)',
    })
  }, [])

  useEffect(() => {
    void (async () => {
      const r = await getPendingChoices()
      if (r && !isProgressionError(r)) setPending(r.pendingChoices.length)
      const a = await getAchievements()
      if (a) setAch({ done: a.completed, total: a.total })
    })()
  }, [])

  const items: Item[] = [
    { key: 'profile', href: '/digital/profile', label: t('profile.nav.profile'), sub: t('profile.nav.profileSub'), glyph: '◆' },
    { key: 'public', href: '/digital/profile/public', label: t('profile.nav.public'), sub: t('profile.nav.publicSub'), glyph: '◇' },
    { key: 'ach', href: '/digital/profile/achievements', label: t('profile.nav.achievements'), sub: ach ? `${ach.done} / ${ach.total}` : '—', glyph: '⬢' },
    { key: 'lvl', href: '/digital/profile/levels', label: t('profile.nav.levels'), sub: t('profile.nav.levelsSub'), glyph: '▲' },
  ]

  const rail = (
    <nav aria-label={t('profile.nav.aria')} style={{
      width: compact ? '100%' : 208, flex: 'none', display: 'flex',
      flexDirection: compact ? 'row' : 'column', gap: compact ? 6 : 0,
      overflowX: compact ? 'auto' : undefined,
      borderRight: compact ? undefined : `1px solid #16131d`,
      borderBottom: compact ? `1px solid #16131d` : undefined,
      padding: compact ? '4px 10px' : '10px 0',
    }}>
      {!compact && (
        <div style={{ font: `500 8.5px ${BODY}`, letterSpacing: 2.2, color: C.label, textTransform: 'uppercase', padding: '0 14px 10px' }}>
          {t('profile.nav.kicker')}
        </div>
      )}
      {items.map((it) => {
        const on = pathname === it.href
        return (
          <button key={it.key} type="button" onClick={() => { playUiClick(); router.push(it.href) }}
            aria-current={on ? 'page' : undefined}
            style={{
              display: 'flex', alignItems: 'center', gap: 9, textAlign: 'left', cursor: 'pointer',
              minHeight: 44, flex: 'none', padding: compact ? '0 9px' : '9px 14px',
              border: compact ? `1px solid ${on ? C.gold : C.lineIn}` : 0,
              borderLeft: compact ? undefined : `2px solid ${on ? C.gold : 'transparent'}`,
              background: on ? 'rgba(198,161,79,.09)' : 'transparent', whiteSpace: 'nowrap',
            }}>
            <span aria-hidden style={{ font: `400 11px ${BODY}`, color: on ? C.goldHi : C.lineDis }}>{it.glyph}</span>
            <span style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
              <span style={{ font: `700 ${compact ? 9.5 : 11.5}px ${DISPLAY}`, letterSpacing: compact ? 0.4 : 0.8, color: on ? C.bone : C.muted, textTransform: 'uppercase' }}>{it.label}</span>
              {!compact && <span style={{ font: `400 9.5px ${BODY}`, color: C.label }}>{it.sub}</span>}
            </span>
          </button>
        )
      })}

      {!compact && <div style={{ flex: 1 }} />}

      {!compact && pending > 0 && (
        <div style={{ margin: '0 12px 10px', border: `1px solid rgba(198,161,79,.4)`, background: 'rgba(198,161,79,.07)', padding: '10px 11px' }}>
          <div style={{ font: `500 8px ${BODY}`, letterSpacing: 2, color: C.gold, textTransform: 'uppercase' }}>{t('profile.nav.pendingKicker')}</div>
          <div style={{ font: `700 12px ${DISPLAY}`, color: C.goldHi, marginTop: 3 }}>{t('profile.nav.pendingCount', { count: pending })}</div>
          <p style={{ font: `400 9.5px ${BODY}`, color: C.muted, lineHeight: 1.45, margin: '4px 0 0' }}>{t('profile.nav.pendingNote')}</p>
        </div>
      )}

      {!compact && (
        <p style={{ font: `400 9px ${BODY}`, color: C.label, lineHeight: 1.5, margin: 0, padding: '0 14px 10px' }}>
          {t('profile.nav.footnote')}
        </p>
      )}
    </nav>
  )

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: compact ? 'column' : 'row', minHeight: 0 }}>
      {rail}
      <div style={{ flex: 1, minWidth: 0, minHeight: 0 }}>{children}</div>
    </div>
  )
}
