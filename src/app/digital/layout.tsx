'use client'

// ── Ravenof Digital — pilno ekrano mobile app shell ───────────────────────────
// Prototipo išdėstymas: VERTIKALUS ŠONINIS nav rail (kairė) + turinio stulpelis
// (header viršuje + main). Visa logika/duomenys/modalai išsaugoti.
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { Home, LayoutGrid, Layers, ShoppingBag, Menu, Bell, Settings } from 'lucide-react'
import { Flames } from '@/components/digital/Flames'
import { SettingsModal } from '@/components/digital/SettingsModal'
import { LevelRoadModal } from '@/components/digital/LevelRoadModal'
import { NotificationsModal } from '@/components/digital/NotificationsModal'
import { ContentDownloadGate } from '@/components/digital/ContentDownloadGate'
import { GlobalChatLayer } from '@/components/digital/GlobalChatLayer'
import { ShopModal } from '@/components/digital/ShopModal'
import { startMenuMusic, stopMusic } from '@/lib/game/musicManager'
import { playUiClick } from '@/lib/ui-sound'
import { loadDigitalSettings } from '@/lib/settings-sync'
import { getWallet, getBalances, type Wallet, type Balances } from '@/lib/economy'
import { onWalletChanged, onOpenStore, setNativeImmersive, scheduleReturnReminders, lockLandscape, unlockOrientation, isPortraitNow, isNativeApp } from '@/lib/digital/native'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { getOnboardingState } from '@/lib/digital/onboarding'
import { heartbeat } from '@/lib/social'
import { getLevelProgress } from '@/lib/gamification/levels'
import { HubStyles, ResourcePill, IconBtn, ProfileChip } from '@/components/digital/ui/HubKit'
import { useT, I18nBoot } from '@/lib/i18n/react'
import { formatNumber } from '@/lib/i18n/core'
import { RvnIcon } from '@/components/digital/ui/RvnIcon'

type NavItem = { key: string; labelKey: string; icon: React.ComponentType<{ className?: string }>; href?: string; action?: 'store' }
const NAV: NavItem[] = [
  { key: 'home',       labelKey: 'navigation.home',       icon: Home,        href: '/digital' },
  { key: 'collection', labelKey: 'navigation.collection', icon: LayoutGrid,  href: '/digital/collection' },
  { key: 'decks',      labelKey: 'navigation.decks',      icon: Layers,      href: '/digital/decks' },
  { key: 'shop',       labelKey: 'navigation.shop',       icon: ShoppingBag, action: 'store' },
  { key: 'more',       labelKey: 'navigation.more',       icon: Menu,        href: '/digital/more' },
]

type Profile = { name: string; level: number; pct: number; avatarUrl: string | null }

const BARE_ROUTES = ['/digital/register', '/digital/login', '/digital/onboarding', '/digital/forgot-password']

export default function DigitalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const t = useT()
  const router = useRouter()
  const bare = BARE_ROUTES.includes(pathname)
  const [, setWallet] = useState<Wallet>({ gold: 0, packs: 0 })
  const [balances, setBalances] = useState<Balances>({ silver: 0, rubies: 0, essence: 0 })
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [levelRoadOpen, setLevelRoadOpen] = useState(false)
  const [storeOpen, setStoreOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [unread, setUnread] = useState(0)
  const [showRotate, setShowRotate] = useState(false)

  const refreshWallet = useCallback(() => { getWallet().then((w) => { if (w) setWallet(w) }); getBalances().then((b) => { if (b) setBalances(b) }) }, [])

  useEffect(() => {
    loadDigitalSettings(); startMenuMusic(); setNativeImmersive(true)
    void scheduleReturnReminders()
    void lockLandscape()
    void heartbeat()
    const hb = setInterval(() => { if (document.visibilityState === 'visible') void heartbeat() }, 60_000)
    const onFocusHb = () => void heartbeat()
    window.addEventListener('focus', onFocusHb)
    return () => { stopMusic(); setNativeImmersive(false); void unlockOrientation(); clearInterval(hb); window.removeEventListener('focus', onFocusHb) }
  }, [])

  useEffect(() => {
    const check = () => { void lockLandscape(); setShowRotate(!isNativeApp() && isPortraitNow()) }
    check()
    window.addEventListener('resize', check)
    window.addEventListener('orientationchange', check)
    return () => { window.removeEventListener('resize', check); window.removeEventListener('orientationchange', check) }
  }, [])

  useEffect(() => {
    const loadProfile = () => {
      const supabase = createClient()
      supabase.auth.getUser().then(({ data }) => {
        const uid = data.user?.id; if (!uid) return
        supabase.from('profiles').select('username, display_name, avatar_url, xp_total').eq('id', uid).maybeSingle()
          .then(({ data: p }) => {
            const pr = p as { username?: string; display_name?: string; avatar_url?: string | null; xp_total?: number } | null
            if (!pr) return
            const prog = getLevelProgress(pr.xp_total ?? 0)
            setProfile({ name: pr.display_name || pr.username || '', level: prog.level, pct: prog.progressPercent, avatarUrl: pr.avatar_url ?? null })
          })
      })
    }
    loadProfile()
    window.addEventListener('focus', loadProfile)
    return () => window.removeEventListener('focus', loadProfile)
  }, [])

  useEffect(() => {
    let cancel = false
    getOnboardingState().then((st) => {
      if (cancel) return
      const isAuthRoute = pathname === '/digital/register' || pathname === '/digital/login' || pathname === '/digital/forgot-password'
      const isOb = pathname === '/digital/onboarding'
      if (st === 'anon' && !isAuthRoute) router.replace(`/digital/login?next=${encodeURIComponent(pathname)}`)
      else if (st === 'pending' && !isOb && !isAuthRoute) router.replace('/digital/onboarding')
      else if (st === 'done' && (isOb || pathname === '/digital/register' || pathname === '/digital/login')) router.replace('/digital')
    })
    return () => { cancel = true }
  }, [pathname, router])

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      const uid = data.user?.id; if (!uid) return
      supabase.from('notifications').select('id', { count: 'exact', head: true }).eq('user_id', uid).eq('read', false)
        .then(({ count }) => setUnread(count ?? 0))
    })
  }, [pathname])

  useEffect(() => { refreshWallet() }, [refreshWallet, pathname])
  useEffect(() => {
    const onFocus = () => refreshWallet()
    window.addEventListener('focus', onFocus)
    const off = onWalletChanged(refreshWallet)
    const offStore = onOpenStore(() => setStoreOpen(true))
    return () => { window.removeEventListener('focus', onFocus); off(); offStore() }
  }, [refreshWallet])

  const isActive = (it: NavItem) => {
    if (it.action === 'store') return storeOpen
    if (it.href === '/digital') return pathname === '/digital'
    return !!it.href && pathname.startsWith(it.href)
  }

  if (bare) {
    return (
      <div className="fixed inset-0 z-40 flex flex-col select-none" style={{ background: '#06040b', color: 'var(--text-primary)' }}>
        <Flames />
        <HubStyles />
        <I18nBoot />
        <main className="relative z-10 flex-1 min-h-0">{children}</main>
        {showRotate && (
          <div className="fixed inset-0 z-[300] flex flex-col items-center justify-center gap-4 px-6 text-center" style={{ background: 'rgba(6,4,11,0.98)' }}>
            <div className="text-6xl" style={{ animation: 'rvnRotateHintApp 1.6s ease-in-out infinite' }}>🔄</div>
            <p className="text-xl font-bold" style={{ color: 'var(--gold)', fontFamily: 'var(--rvn-font-display)' }}>{t('common.rotate.title')}</p>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{t('common.rotate.subtitleOnboarding')}</p>
            <style>{`@keyframes rvnRotateHintApp { 0%,100% { transform: rotate(-18deg); } 50% { transform: rotate(72deg); } }`}</style>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-40 flex flex-row select-none" style={{ background: '#06040b', color: 'var(--text-primary)' }}>
      <Flames />
      <HubStyles />
      <I18nBoot />
      <style>{`body[data-rvn-hide-header="1"] .rvn-app-header { display: none; } body[data-rvn-hide-header="1"] .rvn-nav-rail { display: none; }`}</style>

      {/* ── Šoninis nav rail (prototipas) ── */}
      <nav className="rvn-nav-rail relative z-20 flex flex-col items-stretch justify-center shrink-0"
        style={{ width: 92, background: 'linear-gradient(90deg,#0a0810,#0f0d15)', borderRight: '1px solid rgba(212,163,59,0.18)', gap: 2, paddingTop: 'env(safe-area-inset-top, 0px)' }}>
        {NAV.map((it) => {
          const active = isActive(it)
          const Icon = it.icon
          const inner = (
            <span className="flex flex-col items-center justify-center gap-1 py-2" style={{ minHeight: 52 }}>
              <span className="relative flex items-center justify-center rvn-press" style={{ width: 40, height: 40 }}>
                <RvnIcon name={`nav-${it.key}`} size={40} fallback={<Icon className="w-[22px] h-[22px]" />}
                  style={active
                    ? { borderRadius: 10, objectFit: 'cover', border: '1px solid rgba(212,163,59,0.75)', boxShadow: '0 0 0 1px rgba(212,163,59,0.25), 0 0 14px rgba(212,163,59,0.45)', filter: 'brightness(1.1) saturate(1.08)' }
                    : { borderRadius: 10, objectFit: 'cover', border: '1px solid rgba(255,255,255,0.06)', filter: 'grayscale(0.7) brightness(0.72)', opacity: 0.82 }} />
              </span>
              <span className="text-[9.5px] font-semibold text-center leading-tight" style={{ fontFamily: 'var(--rvn-font-display)', letterSpacing: '0.02em', color: active ? '#f2c45a' : 'rgba(150,140,120,0.85)' }}>{t(it.labelKey)}</span>
            </span>
          )
          const style = { borderRight: `2px solid ${active ? '#f2c45a' : 'transparent'}` } as React.CSSProperties
          return it.action === 'store'
            ? <button key={it.key} onClick={() => { playUiClick(); setStoreOpen(true) }} className="w-full" style={style}>{inner}</button>
            : <Link key={it.key} href={it.href!} onClick={() => playUiClick()} className="w-full" style={style}>{inner}</Link>
        })}
      </nav>

      {/* ── Turinio stulpelis: header + main ── */}
      <div className="relative z-10 flex-1 flex flex-col min-w-0">
        <header className="rvn-app-header relative z-10 flex items-center justify-between gap-2 px-3.5"
          style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 9px)', paddingBottom: 9, borderBottom: '1px solid rgba(212,163,59,0.16)', background: 'rgba(7,5,12,0.96)' }}>
          <div className="flex items-center gap-2 min-w-0 shrink-0">
            {profile && <ProfileChip name={profile.name || t('common.player')} level={profile.level} pct={profile.pct} avatarUrl={profile.avatarUrl} onClick={() => { playUiClick(); setLevelRoadOpen(true) }} />}
          </div>
          <div className="flex items-center gap-1.5 min-w-0 flex-1 justify-center">
            <ResourcePill icon={<RvnIcon name="cur-silver" size={22} fallback={<span>🥈</span>} />} value={formatNumber(balances.silver)} accent="203,213,225" />
            <ResourcePill icon={<RvnIcon name="cur-rubies" size={22} fallback={<span>💎</span>} />} value={formatNumber(balances.rubies)} accent="239,68,68" />
            <ResourcePill icon={<RvnIcon name="cur-essence" size={22} fallback={<span>🔮</span>} />} value={formatNumber(balances.essence)} accent="129,82,168" />
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <IconBtn label={t('navigation.notifications')} badge={unread || null} onClick={() => { playUiClick(); setNotifOpen(true) }}><RvnIcon name="bell" size={18} fallback={<Bell className="w-4 h-4" />} /></IconBtn>
            <IconBtn label={t('navigation.settings')} onClick={() => { playUiClick(); setSettingsOpen(true) }}><RvnIcon name="settings" size={18} fallback={<Settings className="w-4 h-4" />} /></IconBtn>
          </div>
        </header>

        <main className="relative z-10 flex-1 overflow-y-auto px-4 py-3.5" style={{ paddingBottom: 'calc(14px + env(safe-area-inset-bottom, 0px))' }}>
          <div className="max-w-screen-lg mx-auto h-full">{children}</div>
        </main>
      </div>

      <ContentDownloadGate />
      <GlobalChatLayer />

      {settingsOpen && <SettingsModal profile={profile} onClose={() => setSettingsOpen(false)} />}
      {levelRoadOpen && <LevelRoadModal onClose={() => setLevelRoadOpen(false)} />}
      {notifOpen && <NotificationsModal onClose={() => setNotifOpen(false)} onRead={() => setUnread(0)} />}
      {storeOpen && <ShopModal onClose={() => setStoreOpen(false)} onPurchased={refreshWallet} />}

      {showRotate && (
        <div className="fixed inset-0 z-[300] flex flex-col items-center justify-center gap-4 px-6 text-center" style={{ background: 'rgba(6,4,11,0.98)' }}>
          <div className="text-6xl" style={{ animation: 'rvnRotateHintApp 1.6s ease-in-out infinite' }}>🔄</div>
          <p className="text-xl font-bold" style={{ color: 'var(--gold)', fontFamily: 'var(--rvn-font-display)' }}>{t('common.rotate.title')}</p>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{t('common.rotate.subtitle')}</p>
          <style>{`@keyframes rvnRotateHintApp { 0%,100% { transform: rotate(-18deg); } 50% { transform: rotate(72deg); } }`}</style>
        </div>
      )}
    </div>
  )
}
