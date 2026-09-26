'use client'

// ── Ravenof Digital — pilno ekrano mobile app shell ───────────────────────────
// Patvirtintas UI (ravenof-ui-handoff, Fazė 1): VERTIKALUS ŠONINIS nav rail
// (kairė, 92px, 24px ikonos) + turinio stulpelis (header + main).
// Visa logika/duomenys/modalai išsaugoti. Kolekcijoje header'io nėra (prototipas).
import '@/components/digital/ui/ravenof-ui.css'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { Home, LayoutGrid, Layers, ShoppingBag, Menu, Bell, Settings } from 'lucide-react'
import { Flames } from '@/components/digital/Flames'
import { SettingsModal } from '@/components/digital/SettingsModal'
import { NotificationsModal } from '@/components/digital/NotificationsModal'
import { ContentDownloadGate } from '@/components/digital/ContentDownloadGate'
import { RewardCelebrationHost } from '@/components/digital/progression/RewardCelebration'
import { GlobalChatLayer } from '@/components/digital/GlobalChatLayer'
import { BugReportLayer, requestOpenBugReport } from '@/components/digital/BugReportModal'
import { installBugConsoleCapture } from '@/lib/digital/bugReport'
import { isTesterRole } from '@/lib/digital/accountStore'
import { ShopModal } from '@/components/digital/ShopModal'
import { startMenuMusic, stopMusic } from '@/lib/game/musicManager'
import { playUiClick } from '@/lib/ui-sound'
import { loadDigitalSettings } from '@/lib/settings-sync'
import { applyAccessibility } from '@/lib/settings'
import { useAccount } from '@/lib/digital/accountStore'
import { useCosmetics, activeAvatarVisual } from '@/lib/digital/cosmeticsStore'
import { onWalletChanged, onOpenStore, setNativeImmersive, scheduleReturnReminders, lockLandscape, unlockOrientation, isPortraitNow, isNativeApp } from '@/lib/digital/native'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { getOnboardingState } from '@/lib/digital/onboarding'
import { heartbeat } from '@/lib/social'
import { rankDisplay } from '@/lib/ranked/rank'
import { RavenofResourcePill, RavenofIconBtn, RAVENOF_ASSET } from '@/components/digital/ui/RavenofKit'
import { HubStyles } from '@/components/digital/ui/HubKit'
import { useDesktopUi } from '@/components/digital/ui/useDesktopUi'
import '@/components/digital/ui/desktop-ui.css'
import { useT, I18nBoot, useLocale, setLocale } from '@/lib/i18n/react'
import { formatNumber } from '@/lib/i18n/core'
import { LANGUAGE_OPTIONS } from '@/lib/i18n/config'
import { FormatSwitch } from '@/components/digital/ui/FormatSwitch'

type NavItem = { key: string; labelKey: string; icon: React.ComponentType<{ className?: string }>; href?: string; action?: 'store' }
const NAV: NavItem[] = [
  { key: 'home',       labelKey: 'navigation.home',       icon: Home,        href: '/digital' },
  { key: 'collection', labelKey: 'navigation.collection', icon: LayoutGrid,  href: '/digital/collection' },
  { key: 'decks',      labelKey: 'navigation.decks',      icon: Layers,      href: '/digital/decks' },
  { key: 'shop',       labelKey: 'navigation.shop',       icon: ShoppingBag, action: 'store' },
  { key: 'more',       labelKey: 'navigation.more',       icon: Menu,        href: '/digital/more' },
]

const BARE_ROUTES = ['/digital/register', '/digital/login', '/digital/onboarding', '/digital/forgot-password', '/digital/auth/callback']
// Migruoti ekranai, kuriuose header'io nėra (prototipo išdėstymas ekrano viduje)
const NO_HEADER_ROUTES = ['/digital/collection', '/digital/friends']
// Migruoti route'ai — juose fono „Flames" sluoksnis nerodomas (patvirtintas fonas = grynas ink)
const MIGRATED_ROUTES = ['/digital', '/digital/collection', '/digital/decks', '/digital/ranked', '/digital/pve', '/digital/pvp', '/digital/campaign', '/digital/friends', '/digital/more', '/digital/tutorial', '/digital/rewards', '/digital/season', '/digital/quests', '/digital/profile']
// Pilno ekrano režimų ekranai (prototipas: be rail ir be header; atgal — ekrano ‹ mygtukas)
const FULL_BLEED_ROUTES = ['/digital/ranked', '/digital/pve', '/digital/pvp', '/digital/campaign']
// Desktop: katalogai/builderis naudoja platesnį turinio biudžetą (--rvn-wide-max), kiti – --rvn-content-max
const WIDE_ROUTES = ['/digital/collection', '/digital/decks']

function NavGlyph({ navKey, active, fallback, size = 24 }: { navKey: string; active: boolean; fallback: React.ReactNode; size?: number }) {
  const [failed, setFailed] = useState(false)
  if (failed) return <span style={{ color: active ? '#F2C45A' : '#6b6474' }}>{fallback}</span>
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={`${RAVENOF_ASSET}/nav/nav-${navKey}.png`} alt="" width={size} height={size}
      onError={() => setFailed(true)}
      style={{ width: size, height: size, objectFit: 'contain', display: 'block', filter: active ? 'drop-shadow(0 0 6px rgba(242,196,90,.55))' : 'grayscale(.9) brightness(.72)' }} />
  )
}

export default function DigitalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { desktop: deskUi, compact: deskCompact } = useDesktopUi()
  const t = useT()
  const locale = useLocale()
  const router = useRouter()
  const bare = BARE_ROUTES.includes(pathname)
  const fullBleed = FULL_BLEED_ROUTES.includes(pathname)
  const showHeader = !NO_HEADER_ROUTES.includes(pathname) && !fullBleed
  const wide = WIDE_ROUTES.some((r) => pathname.startsWith(r))
  // Desktop režimo žymė ant <html> — kad desktop-ui.css tokenai veiktų ir portaluose (document.body)
  useEffect(() => {
    const el = document.documentElement
    if (deskUi) el.setAttribute('data-rvn-desk', '1'); else el.removeAttribute('data-rvn-desk')
    if (deskUi && deskCompact) el.setAttribute('data-rvn-desk-compact', '1'); else el.removeAttribute('data-rvn-desk-compact')
  }, [deskUi, deskCompact])
  useEffect(() => () => { document.documentElement.removeAttribute('data-rvn-desk'); document.documentElement.removeAttribute('data-rvn-desk-compact') }, [])
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [storeOpen, setStoreOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [unread, setUnread] = useState(0)
  const [showRotate, setShowRotate] = useState(false)

  // VIENAS bendras paskyros šaltinis (profilis + balansai + rangas) — accountStore.ts.
  // Kol account.loaded=false, header'is rodo skeleton'ą (jokių „Žaidėjas"/0 reikšmių).
  const account = useAccount()
  const { profile, balances } = account
  // Aktyvus kosmetinis avataras — bendras resolveris; pirmenybė prieš avatar_url
  const cosState = useCosmetics()
  const cosmeticAvatarUrl = cosState.loaded ? activeAvatarVisual(cosState).url : null
  const rank = account.rankStep != null ? rankDisplay(account.rankStep) : null
  const refreshWallet = useCallback(() => { void useAccount.getState().refresh({ force: true }) }, [])

  useEffect(() => {
    loadDigitalSettings(); startMenuMusic(); setNativeImmersive(true); installBugConsoleCapture()
    applyAccessibility() // prieinamumas: reduced-motion atributas + UI mastelis
    void scheduleReturnReminders()
    void lockLandscape()
    void heartbeat()
    const hb = setInterval(() => { if (document.visibilityState === 'visible') void heartbeat() }, 60_000)
    const onFocusHb = () => void heartbeat()
    window.addEventListener('focus', onFocusHb)
    return () => { stopMusic(); setNativeImmersive(false); void unlockOrientation(); clearInterval(hb); window.removeEventListener('focus', onFocusHb) }
  }, [])

  useEffect(() => {
    // „Pasuk telefoną" – tik lietimo įrenginiams. Siauras kompiuterio langas (pelė) jo NErodo.
    const check = () => {
      void lockLandscape()
      const touchOnly = window.matchMedia?.('(pointer: coarse)').matches && !window.matchMedia?.('(any-pointer: fine)').matches
      setShowRotate(!isNativeApp() && !!touchOnly && isPortraitNow())
    }
    check()
    window.addEventListener('resize', check)
    window.addEventListener('orientationchange', check)
    return () => { window.removeEventListener('resize', check); window.removeEventListener('orientationchange', check) }
  }, [])

  useEffect(() => {
    const loadProfile = () => { void useAccount.getState().refresh(); void useCosmetics.getState().refresh() }
    loadProfile()
    window.addEventListener('focus', loadProfile)
    return () => window.removeEventListener('focus', loadProfile)
  }, [])

  useEffect(() => {
    let cancel = false
    getOnboardingState().then((st) => {
      if (cancel) return
      const isAuthRoute = pathname === '/digital/register' || pathname === '/digital/login' || pathname === '/digital/forgot-password' || pathname === '/digital/auth/callback'
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

  useEffect(() => { void useAccount.getState().refresh() }, [pathname])
  useEffect(() => { setStoreOpen(false); setSettingsOpen(false) }, [pathname])
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

  const toggleLang = () => {
    playUiClick()
    const other = LANGUAGE_OPTIONS.find((o) => o.locale !== locale) ?? LANGUAGE_OPTIONS[0]
    void setLocale(other.locale)
  }

  if (bare) {
    const isLogin = pathname === '/digital/login'
    return (
      <div className="ravenof-body fixed inset-0 z-40 flex flex-col select-none" style={{ background: 'var(--ravenof-bg-base)', color: 'var(--ravenof-text-primary)' }}>
        {!isLogin && <Flames />}
        <HubStyles />
        <I18nBoot />
        <main className="relative z-10 flex-1 min-h-0">{children}</main>
        {showRotate && (
          <div className="fixed inset-0 z-[300] flex flex-col items-center justify-center gap-4 px-6 text-center" style={{ background: 'rgba(6,4,11,0.98)' }}>
            <div className="text-6xl" style={{ animation: 'rvnRotateHintApp 1.6s ease-in-out infinite' }}>🔄</div>
            <p className="text-xl font-bold" style={{ color: 'var(--ravenof-gold)', fontFamily: 'var(--ravenof-font-display)' }}>{t('common.rotate.title')}</p>
            <p className="text-sm" style={{ color: 'var(--ravenof-text-secondary)' }}>{t('common.rotate.subtitleOnboarding')}</p>
            <style>{`@keyframes rvnRotateHintApp { 0%,100% { transform: rotate(-18deg); } 50% { transform: rotate(72deg); } }`}</style>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className={`ravenof-body rvn-menu-bg fixed inset-0 z-40 flex flex-row select-none${deskUi ? ' rvn-desk-ui' : ''}`} style={{ color: 'var(--ravenof-text-primary)' }}>
      {!MIGRATED_ROUTES.includes(pathname) && !pathname.startsWith('/digital/profile') && !pathname.startsWith('/digital/campaign/') && <Flames />}
      <HubStyles />
      <I18nBoot />
      <style>{`body[data-rvn-hide-header="1"] .rvn-app-header { display: none; } body[data-rvn-hide-header="1"] .rvn-nav-rail { display: none; }
        .rvn-skeleton { display: inline-block; background: linear-gradient(90deg, rgba(255,255,255,0.06) 25%, rgba(255,255,255,0.13) 50%, rgba(255,255,255,0.06) 75%); background-size: 200% 100%; animation: rvnSkel 1.3s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) { .rvn-skeleton { animation: none; } }
        @keyframes rvnSkel { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
        /* Prieinamumas (audit #27): programinis „mažiau judesio" jungiklis — CSS
           animacijų/transition kill-switch (JS canvas FX valdomi atskirai) */
        body[data-rvn-reduced-motion="1"] *, body[data-rvn-reduced-motion="1"] *::before, body[data-rvn-reduced-motion="1"] *::after {
          animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; scroll-behavior: auto !important;
        }`}</style>

      {/* ── Šoninis nav rail (patvirtintas dizainas: 92px, 24px ikonos, Cinzel etiketės) ── */}
      {!fullBleed && <nav className="rvn-nav-rail relative z-20 flex flex-col items-stretch justify-center shrink-0"
        style={{
          width: 'var(--rvn-rail-w)',
          paddingLeft: deskUi ? 0 : 'max(18px, env(safe-area-inset-left, 0px))',
          paddingTop: 'env(safe-area-inset-top, 0px)',
          background: 'linear-gradient(90deg,#0a0810,#0F0D15)',
          borderRight: '1px solid rgba(212,163,59,0.18)',
          gap: 2,
        }}>
        {NAV.map((it) => {
          const active = isActive(it)
          const Icon = it.icon
          const inner = (
            <span className="flex flex-col items-center justify-center" style={{ gap: deskUi ? 6 : 3, padding: deskUi ? '10px 4px' : '8px 0', minHeight: deskUi ? 76 : 48 }}>
              <span className="relative flex items-center justify-center" style={{ width: deskUi ? 32 : 24, height: deskUi ? 32 : 24 }}>
                <NavGlyph navKey={it.key} active={active} size={deskUi ? 30 : 24} fallback={<Icon className={deskUi ? 'w-[24px] h-[24px]' : 'w-[18px] h-[18px]'} />} />
              </span>
              <span style={{ font: `600 ${deskUi ? 12 : 8.5}px/1.2 var(--ravenof-font-display)`, letterSpacing: '.4px', textAlign: 'center', color: active ? '#F2C45A' : '#6b6474', textShadow: active ? '0 0 12px rgba(242,196,90,.6)' : 'none' }}>{t(it.labelKey)}</span>
            </span>
          )
          const style = { borderRight: `2px solid ${active ? '#F2C45A' : 'transparent'}` } as React.CSSProperties
          return it.action === 'store'
            ? <button key={it.key} onClick={() => { playUiClick(); setStoreOpen(true) }} className="w-full ravenof-press" style={style} aria-current={active ? 'page' : undefined}>{inner}</button>
            : <Link key={it.key} href={it.href!} onClick={() => playUiClick()} className="w-full ravenof-press" style={style} aria-current={active ? 'page' : undefined}>{inner}</Link>
        })}
        {/* Testeriams/adminams: nuolat matoma „Klaida" ikona (bet kuriame ekrane, vienu paspaudimu) */}
        {isTesterRole(profile?.role) && (
          <button onClick={() => { playUiClick(); requestOpenBugReport() }} className="w-full ravenof-press" style={{ borderRight: '2px solid transparent', marginTop: 6 }} aria-label={t('bug.title')}>
            <span className="flex flex-col items-center justify-center" style={{ gap: deskUi ? 6 : 3, padding: deskUi ? '10px 0' : '6px 0', minHeight: deskUi ? 56 : 40 }}>
              <span style={{ fontSize: deskUi ? 22 : 16, lineHeight: 1, filter: 'grayscale(.2)' }}>🐞</span>
              <span style={{ font: `600 ${deskUi ? 12 : 8.5}px var(--ravenof-font-display)`, letterSpacing: '.4px', color: '#7bd389' }}>{t('bug.navLabel')}</span>
            </span>
          </button>
        )}
      </nav>}

      {/* ── Turinio stulpelis: header + main ── */}
      <div className="relative z-10 flex-1 flex flex-col min-w-0">
        {showHeader && (
          <header className="rvn-app-header relative z-10 flex items-center px-4"
            style={deskUi
              ? { height: 'var(--rvn-header-h)', paddingLeft: 'var(--rvn-page-px)', paddingRight: 'var(--rvn-page-px)', flex: 'none' }
              : { gap: 'clamp(5px, 1.1vw, 9px)', paddingTop: 'calc(env(safe-area-inset-top, 0px) + 12px)', paddingBottom: 10 }}>
            <div className={deskUi ? (wide ? 'rvn-d-page-wide' : 'rvn-d-page') : 'contents'} style={deskUi ? { display: 'flex', alignItems: 'center', gap: 12 } : undefined}>
            {/* Profilio chip: avataras + vardas + rangas/lygis */}
            <button onClick={() => { playUiClick(); router.push('/digital/profile') }} aria-label={t('profile.overview.title')} className="ravenof-press flex items-center gap-2 min-w-0 shrink-0 text-left" style={{ background: 'none', border: 'none', padding: 0 }}>
              <span className="shrink-0" style={{ width: deskUi ? 46 : 38, height: deskUi ? 46 : 38, borderRadius: '50%', border: '2px solid var(--ravenof-gold)', boxShadow: '0 0 12px rgba(212,163,59,.25)', background: (cosmeticAvatarUrl || profile?.avatarUrl) ? `center/cover url(${cosmeticAvatarUrl || profile?.avatarUrl})` : 'radial-gradient(circle at 50% 32%, #3a2a4e, #0c0a14)' }} />
              <span className="flex flex-col min-w-0" style={{ gap: 1 }}>
                {!account.loaded ? (
                  /* Kol paskyra nepakrauta — skeleton (fiksuoti matmenys, be „Žaidėjas"/0) */
                  <>
                    <span aria-hidden className="rvn-skeleton" style={{ width: 96, height: 13, borderRadius: 3 }} />
                    <span aria-hidden className="rvn-skeleton" style={{ width: 130, height: 10, borderRadius: 3, marginTop: 3 }} />
                  </>
                ) : (
                  <>
                    <span className="truncate" style={{ maxWidth: deskUi ? 280 : 'clamp(64px, 16vw, 140px)', font: `700 ${deskUi ? 17 : 13}px/1.15 var(--ravenof-font-display)`, letterSpacing: '.5px', color: 'var(--ravenof-text-primary)' }}>{profile?.name || t('common.player')}</span>
                    <span className="flex items-center" style={{ gap: 5, font: `500 ${deskUi ? 13.5 : 11}px/${deskUi ? 1.25 : 1.15} var(--ravenof-font-body)`, color: 'var(--ravenof-text-secondary)' }}>
                      {rank ? (
                        <>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={rank.badgeSrc ?? `${RAVENOF_ASSET}/ranks/rank-${rank.medalTier}.png`} alt="" style={{ width: deskUi ? 16 : 12, height: deskUi ? 18 : 14, objectFit: 'contain' }} />
                          {/* KANONINIS rango formatas — tas pats kaip Home/Ranked/profilyje */}
                          {rank.full}
                        </>
                      ) : profile ? <>{t('home.tier', { n: profile.level })}</> : null}
                      {profile && (profile.role === 'tester' || profile.role === 'admin') && (
                        <span title={profile.role} style={{ marginLeft: 4, padding: '1px 5px', border: '1px solid rgba(123,211,137,.6)', color: '#7bd389', font: `700 ${deskUi ? 12 : 7.5}px/1.3 var(--ravenof-font-body)`, letterSpacing: 1.2, textTransform: 'uppercase', borderRadius: 2 }}>
                          {profile.role === 'admin' ? 'ADMIN' : t('common.testerBadge')}
                        </span>
                      )}
                    </span>
                  </>
                )}
              </span>
            </button>
            {/* Kovos formatas (ŽMK / Klasika) — tarp žaidėjo ir valiutų, tik pradžios ekrane */}
            <div className="flex-1 flex items-center justify-center min-w-0" style={{ padding: '0 6px' }}>
              {pathname === '/digital' && <FormatSwitch variant={deskUi ? 'tabs' : 'chip'} />}
            </div>
            {/* Balansai: kol nežinomi — „—" (niekada ne 0). Fiksuoti matmenys — be layout shift. */}
            <RavenofResourcePill icon={`${RAVENOF_ASSET}/currencies/cur-silver.png`} value={balances ? formatNumber(balances.silver) : '—'} />
            <RavenofResourcePill icon={`${RAVENOF_ASSET}/currencies/cur-rubies.png`} iconW={13} value={balances ? formatNumber(balances.rubies) : '—'} />
            <RavenofResourcePill icon={`${RAVENOF_ASSET}/currencies/cur-essence.png`} value={balances ? formatNumber(balances.essence) : '—'} />
            <button onClick={toggleLang} className="ravenof-press" style={{ font: `700 ${deskUi ? 13 : 10}px var(--ravenof-font-display)`, color: 'var(--ravenof-text-secondary)', border: '1px solid var(--ravenof-border-strong)', padding: deskUi ? '0 12px' : '6px 8px', height: deskUi ? 42 : undefined, minWidth: deskUi ? 42 : undefined, borderRadius: 3, background: 'none', cursor: 'pointer', textAlign: 'center' }} aria-label={t('settings.language')}>
              {locale.toUpperCase()}
            </button>
            <RavenofIconBtn label={t('navigation.notifications')} badge={unread || null} onClick={() => { playUiClick(); setNotifOpen(true) }}><Bell className="w-4 h-4" /></RavenofIconBtn>
            <RavenofIconBtn label={t('navigation.settings')} onClick={() => { playUiClick(); setSettingsOpen(true) }}><Settings className="w-4 h-4" /></RavenofIconBtn>
            </div>
          </header>
        )}

        <main className={`relative z-10 flex-1 min-h-0 overflow-y-auto ravenof-scroll ${fullBleed ? '' : 'px-4'}`}
          style={fullBleed
            ? { paddingBottom: 'env(safe-area-inset-bottom, 0px)' }
            : deskUi
              ? { paddingTop: showHeader ? 8 : 24, paddingBottom: 24, paddingLeft: 'var(--rvn-page-px)', paddingRight: 'var(--rvn-page-px)', overflowX: 'hidden' }
              : { paddingTop: showHeader ? 0 : 'calc(env(safe-area-inset-top, 0px) + 10px)', paddingBottom: 'calc(12px + env(safe-area-inset-bottom, 0px))', paddingRight: 'max(16px, env(safe-area-inset-right, 0px))' }}>
          <div className={fullBleed ? 'h-full' : deskUi ? `${wide ? 'rvn-d-page-wide' : 'rvn-d-page'} h-full` : 'max-w-screen-lg mx-auto h-full'}>{children}</div>
        </main>
      </div>

      <ContentDownloadGate />
      <RewardCelebrationHost />
      <GlobalChatLayer />
      <BugReportLayer />

      {settingsOpen && <SettingsModal profile={profile} onClose={() => setSettingsOpen(false)} />}
      {notifOpen && <NotificationsModal onClose={() => setNotifOpen(false)} onRead={() => {
        // perskaičiuojam badge'ą iš DB (skaityta tampa tik paspaudus / mark-all)
        const supabase = createClient()
        supabase.auth.getUser().then(({ data }) => {
          const uid = data.user?.id; if (!uid) return
          supabase.from('notifications').select('id', { count: 'exact', head: true }).eq('user_id', uid).eq('read', false)
            .then(({ count }) => setUnread(count ?? 0))
        })
      }} />}
      {storeOpen && <ShopModal onClose={() => setStoreOpen(false)} onPurchased={refreshWallet} />}

      {showRotate && (
        <div className="fixed inset-0 z-[300] flex flex-col items-center justify-center gap-4 px-6 text-center" style={{ background: 'rgba(6,4,11,0.98)' }}>
          <div className="text-6xl" style={{ animation: 'rvnRotateHintApp 1.6s ease-in-out infinite' }}>🔄</div>
          <p className="text-xl font-bold" style={{ color: 'var(--ravenof-gold)', fontFamily: 'var(--ravenof-font-display)' }}>{t('common.rotate.title')}</p>
          <p className="text-sm" style={{ color: 'var(--ravenof-text-secondary)' }}>{t('common.rotate.subtitle')}</p>
          <style>{`@keyframes rvnRotateHintApp { 0%,100% { transform: rotate(-18deg); } 50% { transform: rotate(72deg); } }`}</style>
        </div>
      )}
    </div>
  )
}

