'use client'

// ── Ravenof Digital — pilno ekrano mobile app shell ───────────────────────────
// Game-account header (logo + profilis + resursai + bell + settings) ir modern
// game tab bar (Pradžia/Kolekcija/Kaladės/Parduotuvė/Daugiau). Žaisti = hero CTA.
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

// Auth/onboarding keliai: be header/nav/gate — pilnaekranis onboarding shell.
const BARE_ROUTES = ['/digital/register', '/digital/login', '/digital/onboarding', '/digital/forgot-password']

export default function DigitalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const t = useT()
  const router = useRouter()
  const bare = BARE_ROUTES.includes(pathname)
  const [, setWallet] = useState<Wallet>({ gold: 0, packs: 0 }) // reikšmės nebe rodomos čia (ShopModal pats traukia balansus)
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
    // Presence: „online" indikatorius draugams (last_seen_at kas 60 s + focus)
    void heartbeat()
    const hb = setInterval(() => { if (document.visibilityState === 'visible') void heartbeat() }, 60_000)
    const onFocusHb = () => void heartbeat()
    window.addEventListener('focus', onFocusHb)
    return () => { stopMusic(); setNativeImmersive(false); void unlockOrientation(); clearInterval(hb); window.removeEventListener('focus', onFocusHb) }
  }, [])

  // Visas /digital app užrakintas į landscape; jei įrenginys portrait (web neleido lock) -> „pasuk telefoną" overlay.
  useEffect(() => {
    const check = () => { void lockLandscape(); setShowRotate(!isNativeApp() && isPortraitNow()) }
    check()
    window.addEventListener('resize', check)
    window.addEventListener('orientationchange', check)
    return () => { window.removeEventListener('resize', check); window.removeEventListener('orientationchange', check) }
  }, [])

  // Profilis — tik mount + focus (nebe kiekvienam route pakeitimui: mažiau užklausų)
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

  // ── Onboarding route guard ──────────────────────────────────────────────
  // pending → tik /digital/onboarding; done → onboarding/auth keliai uždrausti;
  // anon → onboarding kelias reikalauja prisijungimo. 'unknown' (migracija
  // nesuvesta / tinklo klaida) → NIEKO nedarom (fail-open, be softlock/loop).
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

  // Neperskaitytos notifikacijos — pigi head-count užklausa keičiant route
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
    <div className="fixed inset-0 z-40 flex flex-col select-none" style={{ background: '#06040b', color: 'var(--text-primary)' }}>
      <Flames />
      <HubStyles />
      <I18nBoot />
      {/* Deck builder (ir kt. fullscreen įrankiai) gali paslėpti header'į per body atributą */}
      <style>{`body[data-rvn-hide-header="1"] .rvn-app-header { display: none; }`}</style>

      {/* ── Header (game account) ── */}
      <header className="rvn-app-header relative z-10 flex items-center justify-between gap-2 px-3.5"
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 9px)', paddingBottom: 9, borderBottom: '1px solid rgba(240,180,41,0.16)', background: 'rgba(7,5,12,0.96)' }}>
        <div className="flex items-center gap-2 min-w-0 shrink-0">
          {profile && <ProfileChip name={profile.name || t('common.player')} level={profile.level} pct={profile.pct} avatarUrl={profile.avatarUrl} onClick={() => { playUiClick(); setLevelRoadOpen(true) }} />}
        </div>
        <div className="flex items-center gap-1.5 min-w-0 flex-1 justify-center">
          <ResourcePill icon={<RvnIcon name="cur-silver" size={22} fallback={<span>🥈</span>} />} value={formatNumber(balances.silver)} accent="203,213,225" />
          <ResourcePill icon={<RvnIcon name="cur-rubies" size={22} fallback={<span>💎</span>} />} value={formatNumber(balances.rubies)} accent="239,68,68" />
          <ResourcePill icon={<RvnIcon name="cur-essence" size={22} fallback={<span>🔮</span>} />} value={formatNumber(balances.essence)} accent="139,92,246" />
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <IconBtn label={t('navigation.notifications')} badge={unread || null} onClick={() => { playUiClick(); setNotifOpen(true) }}><RvnIcon name="bell" size={18} fallback={<Bell className="w-4 h-4" />} /></IconBtn>
          <IconBtn label={t('navigation.settings')} onClick={() => { playUiClick(); setSettingsOpen(true) }}><RvnIcon name="settings" size={18} fallback={<Settings className="w-4 h-4" />} /></IconBtn>
        </div>
      </header>

      {/* ── Turinys ── */}
      <main className="relative z-10 flex-1 overflow-y-auto px-4 py-3.5" style={{ paddingBottom: 'calc(84px + env(safe-area-inset-bottom, 0px))' }}>
        <div className="max-w-screen-lg mx-auto h-full">{children}</div>
      </main>

      {/* ── Tab bar ── */}
      <nav className="absolute bottom-0 left-0 right-0 z-20 flex items-stretch"
        style={{ background: 'rgba(7,5,12,0.97)', borderTop: '1px solid rgba(240,180,41,0.16)', boxShadow: '0 -4px 24px rgba(0,0,0,0.6)', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        {NAV.map((it) => {
          const active = isActive(it)
          const Icon = it.icon
          const inner = (
            <>
              {/* Ikonos = kvadratinės su savu fonu -> renderinam kaip „tile" (be radial glow po apačia) */}
              <span className="relative flex items-center justify-center rvn-press" style={{ width: 42, height: 42 }}>
                <RvnIcon name={`nav-${it.key}`} size={42} fallback={<Icon className="w-[22px] h-[22px]" />}
                  style={active
                    ? {
                        borderRadius: 10,
                        objectFit: 'cover',
                        border: '1px solid rgba(240,180,41,0.75)',
                        boxShadow: '0 0 0 1px rgba(240,180,41,0.25), 0 0 14px rgba(240,180,41,0.45)',
                        filter: 'brightness(1.1) saturate(1.08)',
                        transform: 'translateY(-1px)',
                      }
                    : {
                        borderRadius: 10,
                        objectFit: 'cover',
                        border: '1px solid rgba(255,255,255,0.06)',
                        filter: 'grayscale(0.45) brightness(0.72)',
                        opacity: 0.8,
                      }} />
              </span>
              <span className="text-[10px] font-semibold transition-colors" style={{ fontFamily: 'var(--rvn-font-display)', letterSpacing: '0.02em' }}>{t(it.labelKey)}</span>
            </>
          )
          const cls = 'flex-1 flex flex-col items-center justify-center gap-0.5 py-2 transition-colors'
          const style = { color: active ? 'var(--gold)' : 'rgba(150,160,185,0.85)', minHeight: 52 } as React.CSSProperties
          return it.action === 'store'
            ? <button key={it.key} onClick={() => { playUiClick(); setStoreOpen(true) }} className={cls} style={style}>{inner}</button>
            : <Link key={it.key} href={it.href!} onClick={() => playUiClick()} className={cls} style={style}>{inner}</Link>
        })}
      </nav>

      {/* Privalomas turinio atsisiuntimas paleidžiant žaidimą (virš visko, po „pasuk telefoną") */}
      <ContentDownloadGate />

      {/* Globalus pokalbių sluoksnis — VIENAS mount visam app (route keitimas neuždaro) */}
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
