'use client'

// ── Ravenof Digital — atskira pilno ekrano mobile app aplinka ─────────────────
// Savas header (safe-area), apatinis nav (Žaisti/Kolekcija/Kaladės/Parduotuvė/Daugiau),
// piniginė + nustatymai + parduotuvė valdomi čia, kad būtų matomi visuose ekranuose.
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { Swords, LayoutGrid, Layers, ShoppingBag, Menu } from 'lucide-react'
import { Flames } from '@/components/digital/Flames'
import { SettingsModal } from '@/components/digital/SettingsModal'
import { StoreModal } from '@/components/digital/StoreModal'
import { startMenuMusic, stopMusic } from '@/lib/game/musicManager'
import { playUiClick } from '@/lib/ui-sound'
import { loadDigitalSettings } from '@/lib/settings-sync'
import { getWallet, type Wallet } from '@/lib/economy'
import { onWalletChanged, onOpenStore } from '@/lib/digital/native'

type NavItem = { key: string; label: string; icon: React.ComponentType<{ className?: string }>; href?: string; action?: 'store' }
const NAV: NavItem[] = [
  { key: 'play',       label: 'Žaisti',     icon: Swords,      href: '/digital' },
  { key: 'collection', label: 'Kolekcija',  icon: LayoutGrid,  href: '/digital/collection' },
  { key: 'decks',      label: 'Kaladės',    icon: Layers,      href: '/digital/deck' },
  { key: 'shop',       label: 'Parduotuvė', icon: ShoppingBag, action: 'store' },
  { key: 'more',       label: 'Daugiau',    icon: Menu,        href: '/digital/more' },
]

export default function DigitalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [wallet, setWallet] = useState<Wallet>({ gold: 0, packs: 0 })
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [storeOpen, setStoreOpen] = useState(false)

  const refreshWallet = useCallback(() => { getWallet().then((w) => { if (w) setWallet(w) }) }, [])

  // Meniu muzika groja per visus /digital puslapius; kovoje TutorialGame perjungia ir grįžta.
  useEffect(() => {
    loadDigitalSettings()
    startMenuMusic()
    return () => { stopMusic() }
  }, [])

  // Piniginė: perkraunam įėjus, keičiant puslapį, grįžus į langą ir po pirkimų/atplėšimų.
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

      {/* ── Viršutinė juosta (safe-area) ── */}
      <header className="relative z-10 flex items-center justify-between gap-2 px-4"
        style={{
          paddingTop: 'calc(env(safe-area-inset-top, 0px) + 10px)', paddingBottom: 10,
          borderBottom: '1px solid rgba(240,180,41,0.18)', background: 'rgba(7,5,12,0.78)', backdropFilter: 'blur(8px)',
        }}>
        {/* Logo */}
        <Link href="/digital" onClick={() => playUiClick()} className="flex flex-col leading-none">
          <span style={{ fontFamily: 'var(--rvn-font-display)', color: 'var(--gold)', fontSize: 17, fontWeight: 800, letterSpacing: '0.12em', textShadow: '0 0 14px rgba(240,180,41,0.4)' }}>RAVENOF</span>
          <span style={{ fontFamily: 'var(--rvn-font-display)', color: 'var(--text-muted)', fontSize: 8.5, fontWeight: 700, letterSpacing: '0.42em', marginTop: 1 }}>DIGITAL</span>
        </Link>

        {/* Resursai + nustatymai */}
        <div className="flex items-center gap-1.5">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold tabular-nums"
            style={{ background: 'rgba(10,8,16,0.9)', border: '1px solid rgba(240,180,41,0.5)', color: 'var(--gold)', fontFamily: 'var(--rvn-font-display)' }}>
            🪙 {wallet.gold.toLocaleString('lt-LT')}
          </span>
          <button onClick={() => { playUiClick(); setStoreOpen(true) }}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold transition-transform active:scale-95"
            style={{ background: 'rgba(10,8,16,0.9)', border: '1px solid rgba(251,146,60,0.5)', color: '#fdba74', fontFamily: 'var(--rvn-font-display)' }}
            title="Parduotuvė" aria-label="Parduotuvė">
            🎁 {wallet.packs}
          </button>
          <button onClick={() => { playUiClick(); setSettingsOpen(true) }}
            className="inline-flex items-center justify-center rounded-full transition-transform active:scale-95"
            style={{ width: 36, height: 36, background: 'rgba(10,8,16,0.9)', border: '1px solid rgba(240,180,41,0.4)', color: 'var(--gold)', fontSize: 16 }}
            title="Nustatymai" aria-label="Nustatymai">⚙️</button>
        </div>
      </header>

      {/* ── Turinys ── */}
      <main className="relative z-10 flex-1 overflow-y-auto px-4 py-4"
        style={{ paddingBottom: 'calc(80px + env(safe-area-inset-bottom, 0px))' }}>
        <div className="max-w-screen-lg mx-auto">{children}</div>
      </main>

      {/* ── Apatinis nav ── */}
      <nav className="absolute bottom-0 left-0 right-0 z-20 flex items-stretch"
        style={{ background: 'rgba(7,5,12,0.97)', borderTop: '1px solid rgba(240,180,41,0.18)', boxShadow: '0 -4px 24px rgba(0,0,0,0.6)', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        {NAV.map((it) => {
          const active = isActive(it)
          const Icon = it.icon
          const inner = (
            <>
              <span className="relative flex items-center justify-center" style={{ width: 28, height: 28 }}>
                {active && <span className="absolute inset-0 rounded-full" style={{ background: 'radial-gradient(circle, rgba(240,180,41,0.28), transparent 70%)' }} />}
                <Icon className="w-[22px] h-[22px]" />
              </span>
              <span className="text-[10px] font-semibold" style={{ fontFamily: 'var(--rvn-font-display)', letterSpacing: '0.03em' }}>{it.label}</span>
            </>
          )
          const cls = 'flex-1 flex flex-col items-center justify-center gap-0.5 py-2 transition-colors'
          const style = { color: active ? 'var(--gold)' : 'var(--text-muted)' } as React.CSSProperties
          if (it.action === 'store') {
            return <button key={it.key} onClick={() => { playUiClick(); setStoreOpen(true) }} className={cls} style={style}>{inner}</button>
          }
          return <Link key={it.key} href={it.href!} onClick={() => playUiClick()} className={cls} style={style}>{inner}</Link>
        })}
      </nav>

      {settingsOpen && <SettingsModal onClose={() => setSettingsOpen(false)} />}
      {storeOpen && <StoreModal gold={wallet.gold} onClose={() => setStoreOpen(false)} onChanged={refreshWallet} />}
    </div>
  )
}
