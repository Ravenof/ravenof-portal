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
import { NotificationsModal } from '@/components/digital/NotificationsModal'
import { StoreModal } from '@/components/digital/StoreModal'
import { ShopModal } from '@/components/digital/ShopModal'
import { startMenuMusic, stopMusic } from '@/lib/game/musicManager'
import { playUiClick } from '@/lib/ui-sound'
import { loadDigitalSettings } from '@/lib/settings-sync'
import { getWallet, getBalances, type Wallet, type Balances } from '@/lib/economy'
import { onWalletChanged, onOpenStore, setNativeImmersive, scheduleReturnReminders, lockLandscape, unlockOrientation, isPortraitNow, isNativeApp } from '@/lib/digital/native'
import { createClient } from '@/lib/supabase/client'
import { getLevelProgress } from '@/lib/gamification/levels'
import { HubStyles, ResourcePill, IconBtn, ProfileChip } from '@/components/digital/ui/HubKit'
import { RvnIcon } from '@/components/digital/ui/RvnIcon'

type NavItem = { key: string; label: string; icon: React.ComponentType<{ className?: string }>; href?: string; action?: 'store' }
const NAV: NavItem[] = [
  { key: 'home',       label: 'Pradžia',    icon: Home,        href: '/digital' },
  { key: 'collection', label: 'Kolekcija',  icon: LayoutGrid,  href: '/digital/collection' },
  { key: 'decks',      label: 'Kaladės',    icon: Layers,      href: '/digital/decks' },
  { key: 'shop',       label: 'Parduotuvė', icon: ShoppingBag, action: 'store' },
  { key: 'more',       label: 'Daugiau',    icon: Menu,        href: '/digital/more' },
]

type Profile = { name: string; level: number; pct: number; avatarUrl: string | null }

export default function DigitalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [wallet, setWallet] = useState<Wallet>({ gold: 0, packs: 0 })
  const [balances, setBalances] = useState<Balances>({ silver: 0, rubies: 0, essence: 0 })
  const [settingsOpen, setSettingsOpen] = useState(false)
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
    return () => { stopMusic(); setNativeImmersive(false); void unlockOrientation() }
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
            setProfile({ name: pr.display_name || pr.username || 'Žaidėjas', level: prog.level, pct: prog.progressPercent, avatarUrl: pr.avatar_url ?? null })
          })
      })
    }
    loadProfile()
    window.addEventListener('focus', loadProfile)
    return () => window.removeEventListener('focus', loadProfile)
  }, [])

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

  return (
    <div className="fixed inset-0 z-40 flex flex-col select-none" style={{ background: '#06040b', color: 'var(--text-primary)' }}>
      <Flames />
      <HubStyles />

      {/* ── Header (game account) ── */}
      <header className="relative z-10 flex items-center justify-between gap-2 px-3.5"
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 9px)', paddingBottom: 9, borderBottom: '1px solid rgba(240,180,41,0.16)', background: 'rgba(7,5,12,0.96)' }}>
        <div className="flex items-center gap-2 min-w-0 shrink-0">
          {profile && <ProfileChip name={profile.name} level={profile.level} pct={profile.pct} avatarUrl={profile.avatarUrl} onClick={() => { playUiClick(); setSettingsOpen(true) }} />}
        </div>
        <div className="flex items-center gap-1.5 min-w-0 flex-1 justify-center">
          <ResourcePill icon={<RvnIcon name="cur-silver" size={22} fallback={<span>🥈</span>} />} value={balances.silver.toLocaleString('lt-LT')} accent="203,213,225" />
          <ResourcePill icon={<RvnIcon name="cur-rubies" size={22} fallback={<span>💎</span>} />} value={balances.rubies.toLocaleString('lt-LT')} accent="239,68,68" />
          <ResourcePill icon={<RvnIcon name="cur-essence" size={22} fallback={<span>🔮</span>} />} value={balances.essence.toLocaleString('lt-LT')} accent="139,92,246" />
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <IconBtn label="Pranešimai" badge={unread || null} onClick={() => { playUiClick(); setNotifOpen(true) }}><RvnIcon name="bell" size={18} fallback={<Bell className="w-4 h-4" />} /></IconBtn>
          <IconBtn label="Nustatymai" onClick={() => { playUiClick(); setSettingsOpen(true) }}><RvnIcon name="settings" size={18} fallback={<Settings className="w-4 h-4" />} /></IconBtn>
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
              <span className="relative flex items-center justify-center rvn-press" style={{ width: 32, height: 32 }}>
                {active && <span className="absolute inset-0 rounded-full rvn-glow-pulse" style={{ background: 'radial-gradient(circle, rgba(240,180,41,0.34), transparent 70%)' }} />}
                <RvnIcon name={`nav-${it.key}`} size={30} fallback={<Icon className="w-[22px] h-[22px]" />}
                  style={{ filter: active
                    ? 'invert(1) sepia(1) saturate(5) hue-rotate(5deg) brightness(1.1) drop-shadow(0 0 6px rgba(240,180,41,0.6))'
                    : 'invert(0.92) brightness(1.05)' }} />
              </span>
              <span className="text-[10px] font-semibold transition-colors" style={{ fontFamily: 'var(--rvn-font-display)', letterSpacing: '0.02em' }}>{it.label}</span>
            </>
          )
          const cls = 'flex-1 flex flex-col items-center justify-center gap-0.5 py-2 transition-colors'
          const style = { color: active ? 'var(--gold)' : 'rgba(150,160,185,0.85)', minHeight: 52 } as React.CSSProperties
          return it.action === 'store'
            ? <button key={it.key} onClick={() => { playUiClick(); setStoreOpen(true) }} className={cls} style={style}>{inner}</button>
            : <Link key={it.key} href={it.href!} onClick={() => playUiClick()} className={cls} style={style}>{inner}</Link>
        })}
      </nav>

      {settingsOpen && <SettingsModal profile={profile} onClose={() => setSettingsOpen(false)} />}
      {notifOpen && <NotificationsModal onClose={() => setNotifOpen(false)} onRead={() => setUnread(0)} />}
      {storeOpen && <StoreModal gold={wallet.gold} onClose={() => setStoreOpen(false)} onChanged={refreshWallet} />}

      {showRotate && (
        <div className="fixed inset-0 z-[300] flex flex-col items-center justify-center gap-4 px-6 text-center" style={{ background: 'rgba(6,4,11,0.98)' }}>
          <div className="text-6xl" style={{ animation: 'rvnRotateHintApp 1.6s ease-in-out infinite' }}>🔄</div>
          <p className="text-xl font-bold" style={{ color: 'var(--gold)', fontFamily: 'var(--rvn-font-display)' }}>Pasuk telefoną</p>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Ravenof žaidžiamas gulsčiai (landscape)</p>
          <style>{`@keyframes rvnRotateHintApp { 0%,100% { transform: rotate(-18deg); } 50% { transform: rotate(72deg); } }`}</style>
        </div>
      )}
    </div>
  )
}
