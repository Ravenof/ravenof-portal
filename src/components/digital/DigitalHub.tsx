'use client'

// ── Ravenof Digital — pagrindinis meniu (premium CSS, gyvi duomenys) ─────────
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Target, Trophy, Swords, Layers, LayoutGrid, ClipboardList, ShoppingBag, GraduationCap, Medal } from 'lucide-react'
import { playUiClick } from '@/lib/ui-sound'
import { getWallet, type Wallet } from '@/lib/economy'
import { emitWalletChanged } from '@/lib/digital/native'
import { QuestsModal } from './QuestsModal'
import { SeasonPassModal } from './SeasonPassModal'
import { StoreModal } from './StoreModal'
import { loginCheckin, getDailyQuests } from '@/lib/gamification/quests'
import { getSeasonPass } from '@/lib/gamification/seasonPass'
import { getStarterDecks } from '@/lib/starterDecks'
import { HubStyles, RewardBanner, StatCard, RewardChip, PlayHeroCard, ModeSelector, QuickActionCard, CountBadge, type HubMode } from './ui/HubKit'

const MODES: HubMode[] = [
  { key: 'pve',    label: 'Treniruotė', sub: 'Prieš AI',  icon: Target, accent: '52,211,153' },
  { key: 'ranked', label: 'Ranginė',    sub: 'Reitingas', icon: Trophy, accent: '239,68,68' },
  { key: 'free',   label: 'Draugiška',  sub: 'Su draugu', icon: Swords, accent: '251,146,60' },
]
const MODE_HREF: Record<string, string> = { pve: '/digital/pve', ranked: '/digital/ranked', free: '/digital/pvp' }

export function DigitalHub({ loggedIn }: { loggedIn: boolean }) {
  const router = useRouter()
  const [toast, setToast] = useState<string | null>(null)
  const [wallet, setWallet] = useState<Wallet>({ gold: 0, packs: 0 })
  const [storeOpen, setStoreOpen] = useState(false)
  const [questsOpen, setQuestsOpen] = useState(false)
  const [seasonOpen, setSeasonOpen] = useState(false)
  const [streak, setStreak] = useState(0)
  const [claimable, setClaimable] = useState(false)
  const [mode, setMode] = useState('ranked')
  const [season, setSeason] = useState<{ cur: number; total: number; pct: number }>({ cur: 0, total: 50, pct: 0 })
  const [decksClaimed, setDecksClaimed] = useState(0)
  const [questsPending, setQuestsPending] = useState(0)

  const refreshWallet = useCallback(() => { getWallet().then((w) => { if (w) { setWallet(w); emitWalletChanged() } }) }, [])
  const refreshQuests = useCallback(() => { getDailyQuests().then((qs) => setQuestsPending((qs ?? []).filter((q) => q.progress >= q.target && !q.claimed).length)) }, [])
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), 2400); return () => clearTimeout(t) }, [toast])

  useEffect(() => {
    if (!loggedIn) return
    refreshWallet(); refreshQuests()
    loginCheckin().then((c) => { if (c) { setStreak(c.streak ?? 0); setClaimable(!c.already && c.reward > 0); if (!c.already && c.reward > 0) refreshWallet() } })
    getSeasonPass().then((p) => { if (!p?.tiers?.length) return; const total = p.tiers.length; const cur = p.tiers.filter((t) => p.xp >= t.xpRequired).length; setSeason({ cur, total, pct: Math.round((cur / total) * 100) }) })
    getStarterDecks().then((d) => setDecksClaimed((d ?? []).filter((x) => x.claimed).length))
  }, [loggedIn, refreshWallet, refreshQuests])

  if (!loggedIn) {
    return (
      <div className="rounded-2xl p-6 text-center" style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-border)' }}>
        <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>Prisijunk, kad galėtum žaisti skaitmenines kovas.</p>
        <Link href="/login?next=/digital" className="inline-block px-5 py-2 rounded-xl text-sm font-semibold" style={{ background: 'rgba(240,180,41,0.15)', border: '1px solid rgba(240,180,41,0.4)', color: 'var(--gold)' }}>Prisijungti</Link>
      </div>
    )
  }

  const claimReward = () => { if (!claimable) return; playUiClick(); setClaimable(false); setToast(`🔥 ${streak} d. serija — atlygis atsiimtas!`); refreshWallet() }
  const startBattle = () => { playUiClick(); router.push(MODE_HREF[mode]) }

  return (
    <div className="relative z-10 space-y-3">
      <HubStyles />

      <RewardBanner streak={streak} claimable={claimable} onClaim={claimReward} />

      <PlayHeroCard subtitle="Pasirink režimą ir pradėk kovą" onCta={startBattle}>
        <ModeSelector modes={MODES} selected={mode} onSelect={(k) => { playUiClick(); setMode(k) }} />
      </PlayHeroCard>

      <div className="grid grid-cols-2 gap-3">
        <QuickActionCard iconName="qa-decks" icon={<Layers className="w-5 h-5" />} label="Kaladės" sub="Tvarkyk kovos kalades" accent="139,92,246" href="/digital/decks" onClick={() => playUiClick()} />
        <QuickActionCard iconName="qa-collection" icon={<LayoutGrid className="w-5 h-5" />} label="Kolekcija" sub="Peržiūrėk kortas" accent="96,165,250" href="/digital/collection" onClick={() => playUiClick()} />
        <QuickActionCard iconName="qa-quests" icon={<ClipboardList className="w-5 h-5" />} label="Užduotys" sub="Dienos tikslai" accent="236,72,153" onClick={() => { playUiClick(); setQuestsOpen(true) }} badge={questsPending > 0 ? <CountBadge n={questsPending} /> : null} />
        <QuickActionCard iconName="qa-shop" icon={<ShoppingBag className="w-5 h-5" />} label="Parduotuvė" sub="Paketai ir pasiūlymai" accent="240,180,41" onClick={() => { playUiClick(); setStoreOpen(true) }} badge={wallet.packs > 0 ? <CountBadge n="🎁" accent="251,146,60" /> : null} />
      </div>

      <StatCard emblemName="emblem-season" emblemIcon={<Medal className="w-6 h-6" />} title="Sezono kelias" sub="Rinkite pakopas ir atlygius"
        value={`Pakopa ${season.cur} / ${season.total}`} pct={season.pct} accent="240,180,41"
        chips={<><RewardChip icon="🪙" amount="x500" /><RewardChip icon="📜" amount="x10" accent="139,92,246" /></>}
        onClick={() => { playUiClick(); setSeasonOpen(true) }} />

      <StatCard emblemName="emblem-tutorial" emblemIcon={<GraduationCap className="w-6 h-6" />} title="Mokymai" sub="Starter kaladės — išmok žaisti"
        value={`${decksClaimed} / 8`} pct={Math.round((decksClaimed / 8) * 100)} accent="139,92,246"
        href="/digital/tutorial" onClick={() => playUiClick()} />

      {storeOpen && <StoreModal gold={wallet.gold} onClose={() => setStoreOpen(false)} onChanged={refreshWallet} />}
      {questsOpen && <QuestsModal onClose={() => { setQuestsOpen(false); refreshQuests() }} onReward={() => { refreshWallet(); refreshQuests() }} />}
      {seasonOpen && <SeasonPassModal onClose={() => setSeasonOpen(false)} onReward={refreshWallet} />}

      {toast && (
        <div className="fixed left-1/2 -translate-x-1/2 z-[160] px-4 py-2 rounded-full text-xs font-semibold"
          style={{ bottom: 'calc(96px + env(safe-area-inset-bottom, 0px))', background: 'rgba(10,8,16,0.95)', border: '1px solid rgba(240,180,41,0.5)', color: 'var(--gold)' }}>
          {toast}
        </div>
      )}
    </div>
  )
}
