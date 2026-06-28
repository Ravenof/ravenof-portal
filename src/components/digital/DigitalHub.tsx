'use client'

// ── Ravenof Digital — pagrindinis meniu (mobile game hub) ─────────────────────
// Hero „ŽAISTI" su 3 režimais, 2x2 greitos nuorodos, žemiau mažesnės kortelės.
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { LayoutGrid, Layers, ShoppingBag, ClipboardList, Target, Trophy, Swords, GraduationCap } from 'lucide-react'
import { playUiClick } from '@/lib/ui-sound'
import { DEMO_DECK_TUTORIAL } from '@/components/tutorial/TutorialButton'
import { getWallet, type Wallet } from '@/lib/economy'
import { emitWalletChanged } from '@/lib/digital/native'
import { QuestsModal } from './QuestsModal'
import { SeasonPassModal } from './SeasonPassModal'
import { StoreModal } from './StoreModal'
import { loginCheckin } from '@/lib/gamification/quests'

const TutorialGame = dynamic(() => import('@/components/tutorial/TutorialGame').then((m) => m.TutorialGame), { ssr: false })

/** Aštrūs „išraižyti" kampai (oktagonas). */
const oct = (b: number) =>
  `polygon(${b}px 0, calc(100% - ${b}px) 0, 100% ${b}px, 100% calc(100% - ${b}px), calc(100% - ${b}px) 100%, ${b}px 100%, 0 calc(100% - ${b}px), 0 ${b}px)`

export function DigitalHub({ loggedIn }: { loggedIn: boolean }) {
  const [tutorialOpen, setTutorialOpen] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [wallet, setWallet] = useState<Wallet>({ gold: 0, packs: 0 })
  const [storeOpen, setStoreOpen] = useState(false)
  const [questsOpen, setQuestsOpen] = useState(false)
  const [seasonOpen, setSeasonOpen] = useState(false)
  const [streak, setStreak] = useState<number | null>(null)

  const refreshWallet = useCallback(() => { getWallet().then((w) => { if (w) { setWallet(w); emitWalletChanged() } }) }, [])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 2400)
    return () => clearTimeout(t)
  }, [toast])

  useEffect(() => {
    if (!loggedIn) return
    refreshWallet()
    loginCheckin().then((c) => {
      if (c) setStreak(c.streak ?? null)
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

  // ── Hero režimai ──
  const modes = [
    { key: 'pve',    label: 'Treniruotė',    sub: 'Prieš AI', icon: Target, accent: '34,197,94',  href: '/digital/pve' },
    { key: 'ranked', label: 'Ranginė kova',  sub: 'Reitingas', icon: Trophy, accent: '239,68,68',  href: '/digital/ranked' },
    { key: 'free',   label: 'Draugiška kova', sub: 'Su draugu', icon: Swords, accent: '251,146,60', href: '/digital/pvp' },
  ] as const

  // ── 2x2 greitos nuorodos ──
  const quick = [
    { key: 'collection', label: 'Kolekcija',  icon: LayoutGrid,    accent: '96,165,250',  href: '/digital/collection' },
    { key: 'decks',      label: 'Kaladės',    icon: Layers,        accent: '139,92,246',  href: '/digital/decks' },
    { key: 'shop',       label: 'Parduotuvė', icon: ShoppingBag,   accent: '240,180,41',  onClick: () => { playUiClick(); setStoreOpen(true) } },
    { key: 'quests',     label: 'Užduotys',   icon: ClipboardList, accent: '236,72,153',  onClick: () => { playUiClick(); setQuestsOpen(true) } },
  ] as const

  return (
    <div className="relative z-10 space-y-4">
      {/* ── Dienos juosta ── */}
      <button onClick={() => { playUiClick(); setQuestsOpen(true) }}
        className="w-full flex items-center justify-between gap-2 px-4 py-2.5 rounded-xl text-left transition-transform active:scale-[0.99]"
        style={{ background: 'linear-gradient(100deg, rgba(139,92,246,0.14), rgba(10,8,16,0.7))', border: '1px solid rgba(139,92,246,0.35)' }}>
        <span className="text-xs font-semibold" style={{ color: '#e9d5ff' }}>
          {streak ? `🔥 ${streak} d. prisijungimo serija` : '📅 Dienos užduotys'}
        </span>
        <span className="text-[11px] font-bold" style={{ color: 'var(--gold)', fontFamily: 'var(--rvn-font-display)' }}>Atsiimk →</span>
      </button>

      {/* ── HERO: ŽAISTI ── */}
      <div className="relative" style={{ clipPath: oct(16), background: 'rgba(240,180,41,0.4)', padding: 2 }}>
        <div className="px-4 pt-4 pb-4"
          style={{ clipPath: oct(15), background: 'radial-gradient(130% 90% at 50% 0%, rgba(240,180,41,0.13), rgba(10,8,16,0.97) 62%), linear-gradient(160deg,#17111f,#0a0810)' }}>
          <div className="text-center mb-3">
            <h1 className="text-2xl font-extrabold" style={{ fontFamily: 'var(--rvn-font-display)', color: 'var(--gold)', letterSpacing: '0.14em', textShadow: '0 0 18px rgba(240,180,41,0.45)' }}>ŽAISTI</h1>
            <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>Pasirink kovos režimą</p>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {modes.map((m) => {
              const Icon = m.icon
              return (
                <Link key={m.key} href={m.href} onClick={() => playUiClick()}
                  className="flex flex-col items-center justify-center gap-1.5 rounded-xl py-3 px-1 transition-transform active:scale-[0.97]"
                  style={{ minHeight: 92, background: `linear-gradient(160deg, rgba(${m.accent},0.16), rgba(10,8,16,0.9))`, border: `1px solid rgba(${m.accent},0.5)` }}>
                  <Icon className="w-6 h-6" style={{ color: `rgb(${m.accent})` }} />
                  <span className="text-[12px] font-bold text-center leading-tight" style={{ color: '#f3ead3', fontFamily: 'var(--rvn-font-display)' }}>{m.label}</span>
                  <span className="text-[9px] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{m.sub}</span>
                </Link>
              )
            })}
          </div>
        </div>
      </div>

      {/* ── 2x2 greitos nuorodos ── */}
      <div className="grid grid-cols-2 gap-3">
        {quick.map((q) => {
          const Icon = q.icon
          const inner = (
            <div className="flex items-center gap-3 px-4 rounded-xl transition-transform active:scale-[0.98]"
              style={{ minHeight: 64, background: `linear-gradient(120deg, rgba(${q.accent},0.12), rgba(10,8,16,0.85))`, border: `1px solid rgba(${q.accent},0.4)` }}>
              <span className="flex items-center justify-center rounded-lg shrink-0" style={{ width: 38, height: 38, background: `rgba(${q.accent},0.16)`, border: `1px solid rgba(${q.accent},0.4)` }}>
                <Icon className="w-5 h-5" style={{ color: `rgb(${q.accent})` }} />
              </span>
              <span className="text-sm font-bold" style={{ color: '#f3ead3', fontFamily: 'var(--rvn-font-display)', letterSpacing: '0.03em' }}>{q.label}</span>
            </div>
          )
          return 'href' in q && q.href
            ? <Link key={q.key} href={q.href} onClick={() => playUiClick()}>{inner}</Link>
            : <button key={q.key} type="button" onClick={q.onClick}>{inner}</button>
        })}
      </div>

      {/* ── Mažesnės kortelės ── */}
      <div className="space-y-2">
        {/* Sezono kelias */}
        <button onClick={() => { playUiClick(); setSeasonOpen(true) }}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-transform active:scale-[0.99]"
          style={{ background: 'linear-gradient(120deg, rgba(240,180,41,0.1), rgba(10,8,16,0.8))', border: '1px solid rgba(240,180,41,0.32)' }}>
          <span className="text-xl">🎖️</span>
          <span className="flex-1">
            <span className="block text-sm font-bold" style={{ color: '#f3ead3', fontFamily: 'var(--rvn-font-display)' }}>Sezono kelias</span>
            <span className="block text-[11px]" style={{ color: 'var(--text-muted)' }}>Rinkite pakopas ir atsiimkite apdovanojimus</span>
          </span>
          <span className="text-[11px] font-bold" style={{ color: 'var(--gold)' }}>›</span>
        </button>

        {/* Pamoka */}
        <button onClick={() => { playUiClick(); setTutorialOpen(true) }}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-transform active:scale-[0.99]"
          style={{ background: 'linear-gradient(120deg, rgba(139,92,246,0.1), rgba(10,8,16,0.8))', border: '1px solid rgba(139,92,246,0.32)' }}>
          <GraduationCap className="w-5 h-5" style={{ color: '#c4b5fd' }} />
          <span className="flex-1">
            <span className="block text-sm font-bold" style={{ color: '#f3ead3', fontFamily: 'var(--rvn-font-display)' }}>Pamoka</span>
            <span className="block text-[11px]" style={{ color: 'var(--text-muted)' }}>Išmok pagrindus žingsnis po žingsnio</span>
          </span>
          <span className="text-[11px] font-bold" style={{ color: '#c4b5fd' }}>›</span>
        </button>
      </div>

      {/* ── Modalai / paleidimai ── */}
      {tutorialOpen && (
        <TutorialGame deckId={DEMO_DECK_TUTORIAL} deckName="Demo kaladė" onClose={() => { setTutorialOpen(false); refreshWallet() }} />
      )}
      {storeOpen && <StoreModal gold={wallet.gold} onClose={() => setStoreOpen(false)} onChanged={refreshWallet} />}
      {questsOpen && <QuestsModal onClose={() => setQuestsOpen(false)} onReward={refreshWallet} />}
      {seasonOpen && <SeasonPassModal onClose={() => setSeasonOpen(false)} onReward={refreshWallet} />}

      {toast && (
        <div className="fixed left-1/2 -translate-x-1/2 z-[160] px-4 py-2 rounded-full text-xs font-semibold"
          style={{ bottom: 'calc(92px + env(safe-area-inset-bottom, 0px))', background: 'rgba(10,8,16,0.95)', border: '1px solid rgba(240,180,41,0.5)', color: 'var(--gold)' }}>
          {toast}
        </div>
      )}
    </div>
  )
}
