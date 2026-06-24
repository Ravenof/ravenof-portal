'use client'

// ── Ravenof Digital hub — pagrindinis meniu (liepsnų fonas, raižyti blokai) ───
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { playUiClick } from '@/lib/ui-sound'
import { DEMO_DECK_TUTORIAL } from '@/components/tutorial/TutorialButton'
import { getWallet, type Wallet } from '@/lib/economy'
import { SettingsModal } from './SettingsModal'
import { QuestsModal } from './QuestsModal'
import { SeasonPassModal } from './SeasonPassModal'
import { StoreModal } from './StoreModal'
import { loginCheckin } from '@/lib/gamification/quests'
import { loadDigitalSettings } from '@/lib/settings-sync'

const TutorialGame = dynamic(() => import('@/components/tutorial/TutorialGame').then((m) => m.TutorialGame), { ssr: false })

/** Aštrūs „išraižyti" kampai (oktagonas su nupjautais kampais). */
const oct = (b: number) =>
  `polygon(${b}px 0, calc(100% - ${b}px) 0, 100% ${b}px, 100% calc(100% - ${b}px), calc(100% - ${b}px) 100%, ${b}px 100%, 0 calc(100% - ${b}px), 0 ${b}px)`

type TileCfg = {
  key: string
  icon: string
  title: string
  subtitle: string
  accent: string            // 'r,g,b'
  href?: string
  onClick?: () => void
  comingSoon?: boolean
}

export function DigitalHub({ loggedIn }: { loggedIn: boolean }) {
  const [tutorialOpen, setTutorialOpen] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [wallet, setWallet] = useState<Wallet>({ gold: 0, packs: 0 })
  const [storeOpen, setStoreOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [questsOpen, setQuestsOpen] = useState(false)
  const [seasonOpen, setSeasonOpen] = useState(false)
  const refreshWallet = useCallback(() => { getWallet().then((w) => { if (w) setWallet(w) }) }, [])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 2200)
    return () => clearTimeout(t)
  }, [toast])

  useEffect(() => {
    if (!loggedIn) return
    refreshWallet()
    loadDigitalSettings()
    loginCheckin().then((c) => {
      if (c && !c.already && c.reward > 0) {
        setToast(`🔥 ${c.streak} d. serija! +🪙 ${c.reward}${c.bonusBooster ? ' + 🎁 1 pak.' : ''}`)
        refreshWallet()
      }
    })
  }, [loggedIn, refreshWallet])

  const flash = (msg: string) => { playUiClick(); setToast(msg) }

  if (!loggedIn) {
    return (
      <div className="rounded-2xl p-6 text-center" style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-border)' }}>
        <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>Prisijunk, kad galėtum žaisti skaitmenines kovas.</p>
        <Link href="/login?next=/digital" className="inline-block px-5 py-2 rounded-xl text-sm font-semibold"
          style={{ background: 'rgba(240,180,41,0.15)', border: '1px solid rgba(240,180,41,0.4)', color: 'var(--gold)' }}>
          Prisijungti
        </Link>
      </div>
    )
  }

  const tiles: TileCfg[] = [
    { key: 'tutorial', icon: '🎓', title: 'MOKYMASIS', subtitle: 'Išmok pagrindus žingsnis po žingsnio', accent: '139,92,246', onClick: () => { playUiClick(); setTutorialOpen(true) } },
    { key: 'ai', icon: '🎯', title: 'KOVA PRIEŠ AI', subtitle: 'Treniruokis prieš botą (lengvas / vidutinis / sunkus)', accent: '34,197,94', href: '/digital/pve' },
    { key: 'campaign', icon: '🗺️', title: 'KAMPANIJA', subtitle: 'Siužetinė vienžaidėjo kampanija', accent: '240,180,41', comingSoon: true },
    { key: 'ranked', icon: '🏆', title: 'PVP — RANGINĖ', subtitle: 'Reitinguojamos kovos dėl vietos lentelėje', accent: '239,68,68', href: '/digital/ranked' },
    { key: 'free', icon: '⚔️', title: 'PVP — LAISVA', subtitle: 'Kaukis prieš žaidėją (kodas arba atsitiktinis)', accent: '251,146,60', href: '/digital/pvp' },
    { key: 'mycards', icon: '🃏', title: 'KORTŲ ALBUMAS', subtitle: 'Tavo kolekcija + pakuočių atplėšimas', accent: '96,165,250', href: '/digital/album' },
    { key: 'store', icon: '🛒', title: 'PARDUOTUVĖ', subtitle: 'Pakuotės · dienos kortos · starter kaladės · kosmetika', accent: '240,180,41', onClick: () => { playUiClick(); setStoreOpen(true) } },
  ]

  const renderTile = (t: TileCfg) => {
    const a = t.accent
    const inner = (
      <div className="relative h-full" style={{ clipPath: oct(15), background: `rgba(${a},0.5)`, padding: 2.5 }}>
        <div className="relative h-full flex flex-col items-center justify-center text-center px-4 py-7 gap-2"
          style={{
            clipPath: oct(14),
            background: `radial-gradient(120% 90% at 50% 0%, rgba(${a},0.16), rgba(10,8,16,0.96) 60%), linear-gradient(160deg, #15101f, #0a0810)`,
            boxShadow: `inset 0 0 24px rgba(${a},0.12), inset 0 1px 0 rgba(255,255,255,0.05)`,
          }}>
          {/* kampų ornamentai */}
          {[['top-1.5 left-1.5'], ['top-1.5 right-1.5'], ['bottom-1.5 left-1.5'], ['bottom-1.5 right-1.5']].map(([pos], i) => (
            <span key={i} className={`absolute ${pos} text-[10px] leading-none`} style={{ color: `rgba(${a},0.85)`, textShadow: `0 0 6px rgba(${a},0.6)` }}>❖</span>
          ))}
          <span className="text-4xl" style={{ filter: `drop-shadow(0 0 10px rgba(${a},0.55))` }}>{t.icon}</span>
          <h2 className="text-base font-bold tracking-wide" style={{ fontFamily: 'var(--rvn-font-display)', color: '#f3ead3', letterSpacing: '0.08em', textShadow: `0 0 12px rgba(${a},0.4)` }}>{t.title}</h2>
          <p className="text-[11px] leading-snug max-w-[200px]" style={{ color: 'var(--text-muted)' }}>{t.subtitle}</p>
          {t.comingSoon && (
            <span className="mt-1 px-2.5 py-0.5 rounded-full text-[9px] font-bold tracking-widest"
              style={{ background: 'rgba(0,0,0,0.6)', border: `1px solid rgba(${a},0.6)`, color: `rgba(${a},1)`, letterSpacing: '0.18em' }}>NETRUKUS</span>
          )}
        </div>
      </div>
    )

    const common = `group relative block h-[170px] transition-all duration-150 ${t.comingSoon ? 'opacity-70' : 'hover:scale-[1.035] active:scale-[0.99]'} focus:outline-none`
    const glow = { filter: t.comingSoon ? 'saturate(0.7)' : undefined } as React.CSSProperties

    if (t.href && !t.comingSoon) {
      return <Link key={t.key} href={t.href} onClick={() => playUiClick()} className={common} style={glow}>{inner}</Link>
    }
    return (
      <button key={t.key} type="button" onClick={t.comingSoon ? () => flash('Netrukus! Šis režimas dar kuriamas.') : t.onClick} className={common} style={glow}>
        {inner}
      </button>
    )
  }

  return (
    <div className="relative">
      <div className="relative z-10 space-y-6">
        {/* Aukso balansas + pakuotės */}
        <div className="flex items-center justify-center gap-3">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-bold"
            style={{ background: 'rgba(10,8,16,0.9)', border: '1px solid rgba(240,180,41,0.55)', color: 'var(--gold)', fontFamily: 'var(--rvn-font-display)', letterSpacing: '0.04em' }}>
            🪙 {wallet.gold.toLocaleString()}
          </span>
          <button onClick={() => { playUiClick(); setStoreOpen(true) }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold transition-transform hover:scale-105"
            style={{ background: 'rgba(10,8,16,0.9)', border: '1px solid rgba(251,146,60,0.55)', color: '#fdba74', fontFamily: 'var(--rvn-font-display)', letterSpacing: '0.04em' }}
            title="Atidaryti parduotuvę">
            🎁 {wallet.packs} pak.
          </button>
          <button onClick={() => { playUiClick(); setSettingsOpen(true) }}
            className="inline-flex items-center justify-center w-9 h-9 rounded-full transition-transform hover:scale-105"
            style={{ background: 'rgba(10,8,16,0.9)', border: '1px solid rgba(240,180,41,0.4)', color: 'var(--gold)' }}
            title="Nustatymai" aria-label="Nustatymai">
            ⚙️
          </button>
        </div>

        {/* Dienos veiklos */}
        <div className="flex flex-wrap items-center justify-center gap-2">
          {([
            { key: 'quests',    label: '📅 Užduotys',        col: '139,92,246',  on: () => setQuestsOpen(true) },
            { key: 'season',    label: '🎖️ Sezono kelias',  col: '240,180,41',  on: () => setSeasonOpen(true) },
          ] as const).map((b) => (
            <button key={b.key} onClick={() => { playUiClick(); b.on() }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-transform hover:scale-105 active:scale-95"
              style={{ background: 'rgba(10,8,16,0.9)', border: `1px solid rgba(${b.col},0.55)`, color: `rgb(${b.col})`, fontFamily: 'var(--rvn-font-display)', letterSpacing: '0.03em' }}>
              {b.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {tiles.map(renderTile)}
        </div>
      </div>

      {/* Paleidimai */}
      {tutorialOpen && (
        <TutorialGame deckId={DEMO_DECK_TUTORIAL} deckName="Demo kaladė" onClose={() => { setTutorialOpen(false); refreshWallet() }} />
      )}
      {storeOpen && <StoreModal gold={wallet.gold} onClose={() => setStoreOpen(false)} onChanged={refreshWallet} />}

      {settingsOpen && <SettingsModal onClose={() => setSettingsOpen(false)} />}
      {questsOpen && <QuestsModal onClose={() => setQuestsOpen(false)} onReward={refreshWallet} />}
      {seasonOpen && <SeasonPassModal onClose={() => setSeasonOpen(false)} onReward={refreshWallet} />}

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[160] px-4 py-2 rounded-full text-xs font-semibold"
          style={{ background: 'rgba(10,8,16,0.95)', border: '1px solid rgba(240,180,41,0.5)', color: 'var(--gold)' }}>
          {toast}
        </div>
      )}
    </div>
  )
}
