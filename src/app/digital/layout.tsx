'use client'

// ── Ravenof Digital — atskira pilno ekrano aplinka (savas nav + išėjimas + muzika) ─
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect } from 'react'
import { LayoutGrid, BookOpen, Hammer, LogOut } from 'lucide-react'
import { Flames } from '@/components/digital/Flames'
import { GlobalSoundToggle } from '@/components/ui/GlobalSoundToggle'
import { startAmbient } from '@/lib/tutorial/ambient'
import { playUiClick } from '@/lib/ui-sound'

const NAV = [
  { href: '/digital', label: 'Meniu', icon: LayoutGrid },
  { href: '/my-cards', label: 'Kortos', icon: BookOpen },
  { href: '/deck-builder', label: 'Kaladės', icon: Hammer },
] as const

export default function DigitalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  // Dark fantasy ambient — startuoja po pirmo prisilietimo (naršyklės reikalavimas), tildomas garso jungikliu.
  useEffect(() => {
    let stop: () => void = () => {}
    const onFirst = () => { try { stop = startAmbient() } catch { /* */ } }
    window.addEventListener('pointerdown', onFirst, { once: true })
    return () => { window.removeEventListener('pointerdown', onFirst); try { stop() } catch { /* */ } }
  }, [])

  return (
    <div className="fixed inset-0 z-40 flex flex-col select-none" style={{ background: '#06040b', color: 'var(--text-primary)' }}>
      <Flames />

      {/* Viršutinė juosta */}
      <header className="relative z-10 flex items-center justify-between gap-3 px-4 py-2.5"
        style={{ borderBottom: '1px solid rgba(240,180,41,0.18)', background: 'rgba(7,5,12,0.7)', backdropFilter: 'blur(8px)' }}>
        <span className="text-base font-bold flex items-center gap-2" style={{ fontFamily: 'var(--rvn-font-display)', color: 'var(--gold)', letterSpacing: '0.08em', textShadow: '0 0 14px rgba(240,180,41,0.4)' }}>
          🎮 RAVENOF DIGITAL
        </span>
        <div className="flex items-center gap-2">
          <GlobalSoundToggle />
          <Link href="/" onClick={() => playUiClick()} title="Išeiti į pagrindinį portalą"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-transform hover:scale-105"
            style={{ background: 'rgba(239,68,68,0.14)', border: '1px solid rgba(239,68,68,0.5)', color: '#fca5a5', fontFamily: 'var(--rvn-font-display)', letterSpacing: '0.04em' }}>
            <LogOut className="w-3.5 h-3.5" /> Išeiti
          </Link>
        </div>
      </header>

      {/* Turinys */}
      <main className="relative z-10 flex-1 overflow-y-auto px-4 py-5" style={{ paddingBottom: 'calc(76px + env(safe-area-inset-bottom, 0px))' }}>
        <div className="max-w-screen-lg mx-auto">{children}</div>
      </main>

      {/* Apatinis Digital nav (atskiras nuo portalo) */}
      <nav className="absolute bottom-0 left-0 right-0 z-20 flex items-stretch"
        style={{ background: 'rgba(7,5,12,0.96)', borderTop: '1px solid rgba(240,180,41,0.18)', boxShadow: '0 -4px 24px rgba(0,0,0,0.6)', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== '/digital' && pathname.startsWith(href))
          return (
            <Link key={href} href={href} onClick={() => playUiClick()} className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2 transition-colors"
              style={{ color: active ? 'var(--gold)' : 'var(--text-muted)' }}>
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-semibold" style={{ fontFamily: 'var(--rvn-font-display)', letterSpacing: '0.04em' }}>{label}</span>
            </Link>
          )
        })}
        <Link href="/" onClick={() => playUiClick()} className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2" style={{ color: '#fca5a5' }}>
          <LogOut className="w-5 h-5" />
          <span className="text-[10px] font-semibold" style={{ fontFamily: 'var(--rvn-font-display)', letterSpacing: '0.04em' }}>Išeiti</span>
        </Link>
      </nav>
    </div>
  )
}
