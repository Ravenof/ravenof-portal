'use client'

// ── Ravenof Digital — „Daugiau" (landscape): 3 sekcijų stulpeliai su didelėmis
//    kortelėmis (Žaidimas / Bendruomenė / Paskyra) — viskas telpa be scroll.
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Settings, ClipboardList, Award, Users, Store, LogOut, Power, ChevronRight } from 'lucide-react'
import { playUiClick } from '@/lib/ui-sound'
import { createClient } from '@/lib/supabase/client'
import { exitNativeApp } from '@/lib/digital/native'
import { SettingsModal } from './SettingsModal'
import { QuestsModal } from './QuestsModal'
import { SeasonPassModal } from './SeasonPassModal'
import { RvnIcon } from './ui/RvnIcon'
import { useT } from '@/lib/i18n/react'
import { LanguageSelector } from '@/components/digital/ui/LanguageSelector'

type Row = { key: string; label: string; sub?: string; icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>; img?: string; accent: string; onClick: () => void }

export function MoreScreen() {
  const router = useRouter()
  const t = useT()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [questsOpen, setQuestsOpen] = useState(false)
  const [seasonOpen, setSeasonOpen] = useState(false)
  const [confirmExit, setConfirmExit] = useState(false)
  const [exitMsg, setExitMsg] = useState<string | null>(null)
  const [loggingOut, setLoggingOut] = useState(false)

  const doLogout = async () => {
    if (loggingOut) return
    setLoggingOut(true); playUiClick()
    try { await createClient().auth.signOut() } catch { /* ignore */ }
    router.push('/digital/login')
  }

  const doExit = async () => {
    playUiClick()
    const ok = await exitNativeApp()
    if (!ok) { setConfirmExit(false); setExitMsg(t('more.exitFailed')) }
  }

  const sections: { title: string; rows: Row[] }[] = [
    {
      title: t('more.sections.game'),
      rows: [
        { key: 'settings', label: t('more.settings'), sub: t('more.settingsSub'), icon: Settings, img: 'settings', accent: '240,180,41', onClick: () => { playUiClick(); setSettingsOpen(true) } },
        { key: 'quests', label: t('more.quests'), sub: t('more.questsSub'), icon: ClipboardList, img: 'fi-quests', accent: '139,92,246', onClick: () => { playUiClick(); setQuestsOpen(true) } },
        { key: 'season', label: t('more.season'), sub: t('more.seasonSub'), icon: Award, img: 'fi-season', accent: '240,180,41', onClick: () => { playUiClick(); setSeasonOpen(true) } },
      ],
    },
    {
      title: t('more.sections.community'),
      rows: [
        { key: 'friends', label: t('more.friends'), sub: t('more.friendsSub'), icon: Users, accent: '96,165,250', onClick: () => { playUiClick(); router.push('/digital/friends') } },
        { key: 'market', label: t('more.market'), sub: t('more.marketSub'), icon: Store, img: 'fi-shop', accent: '146,84,40', onClick: () => { playUiClick(); router.push('/market') } },
      ],
    },
  ]

  const accountRows: Row[] = [
    { key: 'logout', label: t('more.logout'), sub: t('more.logoutSub'), icon: LogOut, accent: '96,165,250', onClick: doLogout },
    { key: 'exit', label: t('more.exit'), sub: t('more.exitSub'), icon: Power, accent: '239,68,68', onClick: () => { playUiClick(); setConfirmExit(true) } },
  ]

  const tile = (r: Row, danger = false) => {
    const Icon = r.icon
    return (
      <button key={r.key} onClick={r.onClick}
        className="ravenof-press w-full flex items-center gap-3 px-3 py-3 text-left"
        style={{ minHeight: 60, cursor: 'pointer', background: 'var(--ravenof-bg-surface-2)', border: '1px solid var(--ravenof-border-hairline)', borderLeft: `3px solid rgb(${r.accent})` }}>
        <span className="flex items-center justify-center shrink-0" style={{ width: 38, height: 38, background: 'var(--ravenof-bg-elevated)', border: `1px solid rgba(${r.accent},0.45)` }}>
          {r.img ? <RvnIcon name={r.img} size={28} fallback={<Icon className="w-5 h-5" style={{ color: `rgb(${r.accent})` }} />} /> : <Icon className="w-5 h-5" style={{ color: `rgb(${r.accent})` }} />}
        </span>
        <span className="flex-1 min-w-0">
          <span className="block text-sm font-bold truncate" style={{ color: danger ? '#c65563' : 'var(--ravenof-text-primary)', fontFamily: 'var(--ravenof-font-display)' }}>{r.label}</span>
          {r.sub && <span className="block text-[10.5px] truncate" style={{ color: 'var(--ravenof-text-secondary)' }}>{r.sub}</span>}
        </span>
        <ChevronRight className="w-4 h-4 shrink-0" style={{ color: 'var(--ravenof-text-secondary)' }} />
      </button>
    )
  }

  const PANEL: React.CSSProperties = { background: 'var(--ravenof-bg-surface)', border: '1px solid var(--ravenof-border-strong)' }

  return (
    <div className="ravenof-body ravenof-in h-full flex flex-col min-h-0" style={{ gap: 'clamp(4px,1vh,10px)', padding: '0 2px' }}>
      <div className="relative text-center shrink-0">
        <div className="absolute right-0 top-1/2 -translate-y-1/2"><LanguageSelector size="sm" /></div>
        <div style={{ font: '700 clamp(15px,3vh,20px) var(--ravenof-font-display)', letterSpacing: 1, textTransform: 'uppercase', color: 'var(--ravenof-text-primary)' }}>{t('more.title')}</div>
        <div style={{ font: '400 clamp(9px,1.4vh,11.5px) var(--ravenof-font-body)', color: 'var(--ravenof-text-secondary)' }}>{t('more.subtitle')}</div>
      </div>

      <div className="flex-1 min-h-0 grid gap-2" style={{ gridTemplateColumns: 'repeat(3, minmax(0,1fr))' }}>
        {[...sections, { title: t('more.sections.account'), rows: accountRows }].map((sec) => (
          <section key={sec.title} className="flex flex-col min-h-0 overflow-hidden p-2.5" style={PANEL}>
            <p className="shrink-0 mb-2" style={{ font: '500 clamp(9px,1.4vh,10px) var(--ravenof-font-body)', letterSpacing: 2, textTransform: 'uppercase', color: 'var(--ravenof-text-secondary)', margin: 0 }}>{sec.title}</p>
            <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-1.5">
              {sec.rows.map((r) => tile(r, r.key === 'exit'))}
            </div>
          </section>
        ))}
      </div>

      {/* Patvirtinimas: Išeiti */}
      {confirmExit && (
        <div className="fixed inset-0 z-[160] flex items-center justify-center p-6" style={{ background: 'rgba(4,3,8,0.9)' }} onClick={() => setConfirmExit(false)}>
          <div className="w-[min(340px,92vw)] p-5 text-center" style={{ border: '1px solid rgba(180,68,79,0.6)', background: 'var(--ravenof-bg-surface)' }} onClick={(e) => e.stopPropagation()}>
            <p className="text-base font-bold mb-1" style={{ fontFamily: 'var(--ravenof-font-display)', color: '#c65563' }}>{t('more.confirmExitTitle')}</p>
            <p className="text-xs mb-4" style={{ color: 'var(--ravenof-text-secondary)' }}>{t('more.confirmExitBody')}</p>
            <div className="flex gap-2">
              <button onClick={() => { playUiClick(); setConfirmExit(false) }} className="ravenof-btn ravenof-btn-secondary flex-1" style={{ minHeight: 40 }}>{t('common.cancel')}</button>
              <button onClick={doExit} className="ravenof-btn ravenof-btn-destructive flex-1" style={{ minHeight: 40 }}>{t('more.exit')}</button>
            </div>
          </div>
        </div>
      )}

      {/* Fallback žinutė (jei uždaryti nepavyko) */}
      {exitMsg && (
        <div className="fixed inset-0 z-[160] flex items-center justify-center p-6" style={{ background: 'rgba(4,3,8,0.9)' }} onClick={() => setExitMsg(null)}>
          <div className="w-[min(340px,92vw)] p-5 text-center" style={{ border: '1px solid var(--ravenof-border-gold)', background: 'var(--ravenof-bg-surface)' }} onClick={(e) => e.stopPropagation()}>
            <p className="text-sm mb-4" style={{ color: 'var(--ravenof-text-primary)' }}>{exitMsg}</p>
            <button onClick={() => { playUiClick(); setExitMsg(null) }} className="ravenof-btn ravenof-btn-secondary w-full" style={{ minHeight: 40 }}>{t('more.gotIt')}</button>
          </div>
        </div>
      )}

      {settingsOpen && <SettingsModal onClose={() => setSettingsOpen(false)} />}
      {questsOpen && <QuestsModal onClose={() => setQuestsOpen(false)} />}
      {seasonOpen && <SeasonPassModal onClose={() => setSeasonOpen(false)} />}
    </div>
  )
}
