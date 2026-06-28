'use client'

// ── Ravenof Digital — pilno ekrano mobile app shell ───────────────────────────
// Game-account header (logo + profilis + resursai + bell + settings) ir modern
// game tab bar (Pradžia/Kolekcija/Kaladės/Parduotuvė/Daugiau). Žaisti = hero CTA.
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { Home, LayoutGrid, Layers, ShoppingBag, Menu, Bell, Settings } from 'lucide-react'
import { Flames } from '@/components/digital/Flames'
import { SettingsModal } from '@/components/digital/SettingsModal'
import { StoreModal } from '@/components/digital/StoreModal'
import { startMenuMusic, stopMusic } from '@/lib/game/musicManager'
import { playUiClick } from '@/lib/ui-sound'
import { loadDigitalSettings } from '@/lib/settings-sync'
import { getWallet, type Wallet } from '@/lib/economy'
import { onWalletChanged, onOpenStore, setNativeImmersive } from '@/lib/digital/native'
import { createClient } from '@/lib/supabase/client'
import { getLevelProgress } from '@/lib/gamification/levels'
import { HubStyles, ProfileChip, ResourcePill, IconBtn } from '@/components/digital/ui/HubKit'

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
  const router = useRouter()
  const [wallet, setWallet] = useState<Wallet>({ gold: 0, packs: 0 })
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [storeOpen, setStoreOpen] = useState(false)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [unread, setUnread] = useState(0)

  const refreshWallet = useCallback(() => { getWallet().then((w) => { if (w) setWallet(w) }) }, [])

  useEffect(() => {
    loadDigitalSettings(); startMenuMusic(); setNativeImmersive(true)
    return () => { stopMusic(); setNativeImmersive(false) }
  }, [])

  // Profilis + neperskaitytos notifikacijos
  useEffect(() => {
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
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 9px)', paddingBottom: 9, borderBottom: '1px solid rgba(240,180,41,0.16)', background: 'rgba(7,5,12,0.82)', backdropFilter: 'blur(10px)' }}>
        <div className="flex items-center gap-3 min-w-0">
          <Link href="/digital" onClick={() => playUiClick()} className="shrink-0 rvn-press" style={{ lineHeight: 0 }}>
            <img src="/digital/ui/logo.webp" alt="Ravenof Digital" style={{ height: 30, width: 'auto', display: 'block' }} />
          </Link>
          {profile && <ProfileChip name={profile.name} level={profile.level} pct={profile.pct} avatarUrl={profile.avatarUrl} onClick={() => { playUiClick(); router.push('/digital/more') }} />}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <ResourcePill icon={<span>🪙</span>} value={wallet.gold.toLocaleString('lt-LT')} />
          <ResourcePill icon={<span>🎁</span>} value={wallet.packs} accent="251,146,60" onClick={() => { playUiClick(); setStoreOpen(true) }} />
          <IconBtn label="Pranešimai" badge={unread || null} onClick={() => { playUiClick(); router.push('/digital/more') }}><Bell className="w-4 h-4" /></IconBtn>
          <IconBtn label="Nustatymai" onClick={() => { playUiClick(); setSettingsOpen(true) }}><Settings className="w-4 h-4" /></IconBtn>
        </div>
      </header>

      {/* ── Turinys ── */}
      <main className="relative z-10 flex-1 overflow-y-auto px-4 py-3.5" style={{ paddingBottom: 'calc(84px + env(safe-area-inset-bottom, 0px))' }}>
        <div className="max-w-screen-lg mx-auto">{children}</div>
      </main>

      {/* ── Tab bar ── */}
      <nav className="absolute bottom-0 left-0 right-0 z-20 flex items-stretch"
        style={{ background: 'rgba(7,5,12,0.97)', borderTop: '1px solid rgba(240,180,41,0.16)', boxShadow: '0 -4px 24px rgba(0,0,0,0.6)', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        {NAV.map((it) => {
          const active = isActive(it)
          const Icon = it.icon
          const inner = (
            <>
              <span className="relative flex items-center justify-center rvn-press" style={{ width: 30, height: 30 }}>
                {active && <span className="absolute inset-0 rounded-full rvn-glow-pulse" style={{ background: 'radial-gradient(circle, rgba(240,180,41,0.32), transparent 70%)' }} />}
                <Icon className="w-[22px] h-[22px]" />
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

      {settingsOpen && <SettingsModal onClose={() => setSettingsOpen(false)} />}
      {storeOpen && <StoreModal gold={wallet.gold} onClose={() => setStoreOpen(false)} onChanged={refreshWallet} />}
    </div>
  )
}
