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
import { ensureProfile } from '@/lib/ranked/client'
import { rankView, medalLabel, type MedalTier } from '@/lib/ranked/rank'
import { RavenofResourcePill, RavenofIconBtn, RAVENOF_ASSET } from '@/components/digital/ui/RavenofKit'
import { HubStyles } from '@/components/digital/ui/HubKit'
import { useT, I18nBoot, useLocale, setLocale } from '@/lib/i18n/react'
import { formatNumber } from '@/lib/i18n/core'
import { LANGUAGE_OPTIONS } from '@/lib/i18n/config'

type NavItem = { key: string; labelKey: string; icon: React.ComponentType<{ className?: string }>; href?: string; action?: 'store' }
const NAV: NavItem[] = [
  { key: 'home',       labelKey: 'navigation.home',       icon: Home,        href: '/digital' },
  { key: 'collection', labelKey: 'navigation.collection', icon: LayoutGrid,  href: '/digital/collection' },
  { key: 'decks',      labelKey: 'navigation.decks',      icon: Layers,      href: '/digital/decks' },
  { key: 'shop',       labelKey: 'navigation.shop',       icon: ShoppingBag, action: 'store' },
  { key: 'more',       labelKey: 'navigation.more',       icon: Menu,        href: '/digital/more' },
]

type Profile = { name: string; level: number; pct: number; avatarUrl: string | null }
type RankInfo = { tier: MedalTier; number: number }

const BARE_ROUTES = ['/digital/register', '/digital/login', '/digital/onboarding', '/digital/forgot-password']
// Migruoti ekranai, kuriuose header'io nėra (prototipo išdėstymas ekrano viduje)
const NO_HEADER_ROUTES = ['/digital/collection', '/digital/friends']
// Migruoti route'ai — juose fono „Flames" sluoksnis nerodomas (patvirtintas fonas = grynas ink)
const MIGRATED_ROUTES = ['/digital', '/digital/collection', '/digital/decks', '/digital/ranked', '/digital/pve', '/digital/pvp', '/digital/campaign', '/digital/friends']
// Pilno ekrano režimų ekranai (prototipas: be rail ir be header; atgal — ekrano ‹ mygtukas)
const FULL_BLEED_ROUTES = ['/digital/ranked', '/digital/pve', '/digital/pvp', '/digital/campaign']

function NavGlyph({ navKey, active, fallback }: { navKey: string; active: boolean; fallback: React.ReactNode }) {
  const [failed, setFailed] = useState(false)
  if (failed) return <span style={{ color: active ? '#F2C45A' : '#6b6474' }}>{fallback}</span>
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={`${RAVENOF_ASSET}/nav/nav-${navKey}.png`} alt="" width={24} height={24}
      onError={() => setFailed(true)}
      style={{ width: 24, height: 24, objectFit: 'contain', display: 'block', filter: active ? 'drop-shadow(0 0 6px rgba(242,196,90,.55))' : 'grayscale(.9) brightness(.72)' }} />
  )
}

export default function DigitalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const t = useT()
  const locale = useLocale()
  const router = useRouter()
  const bare = BARE_ROUTES.includes(pathname)
  const fullBleed = FULL_BLEED_ROUTES.includes(pathname)
  const showHeader = !NO_HEADER_ROUTES.includes(pathname) && !fullBleed
  const [, setWallet] = useState<Wallet>({ gold: 0, packs: 0 })
  const [balances, setBalances] = useState<Balances>({ silver: 0, rubies: 0, essence: 0 })
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [levelRoadOpen, setLevelRoadOpen] = useState(false)
  const [storeOpen, setStoreOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [rank, setRank] = useState<RankInfo | null>(null)
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
        // Rango eilutė header'yje (read-only; ta pati RPC kaip ranked ekrane)
        ensureProfile().then((rp) => {
          if (!rp) return
          const rv = rankView(rp.rank_step)
          setRank({ tier: rv.medalTier, number: rv.rankNumber })
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
    <div className="ravenof-body fixed inset-0 z-40 flex flex-row select-none" style={{ background: 'var(--ravenof-bg-base)', color: 'var(--ravenof-text-primary)' }}>
      {!MIGRATED_ROUTES.includes(pathname) && <Flames />}
      <HubStyles />
      <I18nBoot />
      <style>{`body[data-rvn-hide-header="1"] .rvn-app-header { display: none; } body[data-rvn-hide-header="1"] .rvn-nav-rail { display: none; }`}</style>

      {/* ── Šoninis nav rail (patvirtintas dizainas: 92px, 24px ikonos, Cinzel etiketės) ── */}
      {!fullBleed && <nav className="rvn-nav-rail relative z-20 flex flex-col items-stretch justify-center shrink-0"
        style={{
          width: 'calc(74px + max(18px, env(safe-area-inset-left, 0px)))',
          paddingLeft: 'max(18px, env(safe-area-inset-left, 0px))',
          paddingTop: 'env(safe-area-inset-top, 0px)',
          background: 'linear-gradient(90deg,#0a0810,#0F0D15)',
          borderRight: '1px solid rgba(212,163,59,0.18)',
          gap: 2,
        }}>
        {NAV.map((it) => {
          const active = isActive(it)
          const Icon = it.icon
          const inner = (
            <span className="flex flex-col items-center justify-center" style={{ gap: 3, padding: '8px 0', minHeight: 48 }}>
              <span className="relative flex items-center justify-center" style={{ width: 24, height: 24 }}>
                <NavGlyph navKey={it.key} active={active} fallback={<Icon className="w-[18px] h-[18px]" />} />
              </span>
              <span style={{ font: '600 8.5px var(--ravenof-font-display)', letterSpacing: '.4px', textAlign: 'center', lineHeight: 1.2, color: active ? '#F2C45A' : '#6b6474', textShadow: active ? '0 0 12px rgba(242,196,90,.6)' : 'none' }}>{t(it.labelKey)}</span>
            </span>
          )
          const style = { borderRight: `2px solid ${active ? '#F2C45A' : 'transparent'}` } as React.CSSProperties
          return it.action === 'store'
            ? <button key={it.key} onClick={() => { playUiClick(); setStoreOpen(true) }} className="w-full ravenof-press" style={style}>{inner}</button>
            : <Link key={it.key} href={it.href!} onClick={() => playUiClick()} className="w-full ravenof-press" style={style}>{inner}</Link>
        })}
      </nav>}

      {/* ── Turinio stulpelis: header + main ── */}
      <div className="relative z-10 flex-1 flex flex-col min-w-0">
        {showHeader && (
          <header className="rvn-app-header relative z-10 flex items-center px-4"
            style={{ gap: 9, paddingTop: 'calc(env(safe-area-inset-top, 0px) + 12px)', paddingBottom: 10 }}>
            {/* Profilio chip: avataras + vardas + rangas/lygis */}
            <button onClick={() => { playUiClick(); setLevelRoadOpen(true) }} className="ravenof-press flex items-center gap-2 min-w-0 shrink-0 text-left" style={{ background: 'none', border: 'none', padding: 0 }}>
              <span className="shrink-0" style={{ width: 38, height: 38, borderRadius: '50%', border: '2px solid var(--ravenof-gold)', boxShadow: '0 0 12px rgba(212,163,59,.25)', background: profile?.avatarUrl ? `center/cover url(${profile.avatarUrl})` : 'radial-gradient(circle at 50% 32%, #3a2a4e, #0c0a14)' }} />
              <span className="flex flex-col min-w-0" style={{ gap: 1 }}>
                <span className="truncate" style={{ maxWidth: 140, font: '700 13px var(--ravenof-font-display)', letterSpacing: '.5px', color: 'var(--ravenof-text-primary)', lineHeight: 1.15 }}>{profile?.name || t('common.player')}</span>
                <span className="flex items-center" style={{ gap: 5, font: '500 11px var(--ravenof-font-body)', color: 'var(--ravenof-text-secondary)', lineHeight: 1.15 }}>
                  {rank ? (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={`${RAVENOF_ASSET}/ranks/rank-${rank.tier}.png`} alt="" style={{ width: 11, height: 13, objectFit: 'contain' }} />
                      {medalLabel(rank.tier)} · {toRoman(rank.number)}
                    </>
                  ) : profile ? <>{t('home.tier', { n: profile.level })}</> : null}
                </span>
              </span>
            </button>
            <div className="flex-1" />
            <RavenofResourcePill icon={`${RAVENOF_ASSET}/currencies/cur-silver.png`} value={formatNumber(balances.silver)} />
            <RavenofResourcePill icon={`${RAVENOF_ASSET}/currencies/cur-rubies.png`} iconW={13} value={formatNumber(balances.rubies)} />
            <RavenofResourcePill icon={`${RAVENOF_ASSET}/currencies/cur-essence.png`} value={formatNumber(balances.essence)} />
            <button onClick={toggleLang} className="ravenof-press" style={{ font: '700 10px var(--ravenof-font-display)', color: 'var(--ravenof-text-secondary)', border: '1px solid var(--ravenof-border-strong)', padding: '6px 8px', borderRadius: 3, background: 'none', cursor: 'pointer', textAlign: 'center' }} aria-label={t('settings.language')}>
              {locale.toUpperCase()}
            </button>
            <RavenofIconBtn label={t('navigation.notifications')} badge={unread || null} onClick={() => { playUiClick(); setNotifOpen(true) }}><Bell className="w-4 h-4" /></RavenofIconBtn>
            <RavenofIconBtn label={t('navigation.settings')} onClick={() => { playUiClick(); setSettingsOpen(true) }}><Settings className="w-4 h-4" /></RavenofIconBtn>
          </header>
        )}

        <main className={`relative z-10 flex-1 min-h-0 overflow-y-auto ravenof-scroll ${fullBleed ? '' : 'px-4'}`}
          style={fullBleed
            ? { paddingBottom: 'env(safe-area-inset-bottom, 0px)' }
            : { paddingTop: showHeader ? 0 : 'calc(env(safe-area-inset-top, 0px) + 10px)', paddingBottom: 'calc(12px + env(safe-area-inset-bottom, 0px))', paddingRight: 'max(16px, env(safe-area-inset-right, 0px))' }}>
          <div className={fullBleed ? 'h-full' : 'max-w-screen-lg mx-auto h-full'}>{children}</div>
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
          <p className="text-xl font-bold" style={{ color: 'var(--ravenof-gold)', fontFamily: 'var(--ravenof-font-display)' }}>{t('common.rotate.title')}</p>
          <p className="text-sm" style={{ color: 'var(--ravenof-text-secondary)' }}>{t('common.rotate.subtitle')}</p>
          <style>{`@keyframes rvnRotateHintApp { 0%,100% { transform: rotate(-18deg); } 50% { transform: rotate(72deg); } }`}</style>
        </div>
      )}
    </div>
  )
}

/** Rango numeris romėnišku formatu (prototipo „Sidabras · XXIII"). */
function toRoman(n: number): string {
  const map: [number, string][] = [[50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']]
  let out = ''; let v = Math.max(1, Math.min(50, Math.round(n)))
  for (const [num, sym] of map) while (v >= num) { out += sym; v -= num }
  return out
}
