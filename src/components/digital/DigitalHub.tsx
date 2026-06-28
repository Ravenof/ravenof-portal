'use client'

// ── Ravenof Digital — pagrindinis meniu (premium mobile game lobby) ──────────
// Naudoja realius UI assets (public/digital/ui): hero arena, CTA, mode tiles,
// quick-action kortelės. RewardBanner + ProgressionCards stilizuoti CSS.
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { GraduationCap, Map as MapIcon } from 'lucide-react'
import { playUiClick } from '@/lib/ui-sound'
import { getWallet, type Wallet } from '@/lib/economy'
import { emitWalletChanged } from '@/lib/digital/native'
import { QuestsModal } from './QuestsModal'
import { SeasonPassModal } from './SeasonPassModal'
import { StoreModal } from './StoreModal'
import { loginCheckin } from '@/lib/gamification/quests'
import { getSeasonPass } from '@/lib/gamification/seasonPass'
import { HubStyles, RewardBanner, PlayHeroCard, ModeSelector, QuickActionCard, ProgressionCard, ASSET, type HubMode } from './ui/HubKit'

const MODES: HubMode[] = [
  { key: 'pve',    img: `${ASSET}/mode-pve.webp`,    imgSel: `${ASSET}/mode-pve-sel.webp` },
  { key: 'ranked', img: `${ASSET}/mode-ranked.webp`, imgSel: `${ASSET}/mode-ranked-sel.webp` },
  { key: 'free',   img: `${ASSET}/mode-free.webp`,   imgSel: `${ASSET}/mode-free-sel.webp` },
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
  const [season, setSeason] = useState<{ cur: number; total: number; pct: number } | null>(null)

  const refreshWallet = useCallback(() => { getWallet().then((w) => { if (w) { setWallet(w); emitWalletChanged() } }) }, [])
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), 2400); return () => clearTimeout(t) }, [toast])

  useEffect(() => {
    if (!loggedIn) return
    refreshWallet()
    loginCheckin().then((c) => { if (c) { setStreak(c.streak ?? 0); setClaimable(!c.already && c.reward > 0); if (!c.already && c.reward > 0) refreshWallet() } })
    getSeasonPass().then((p) => {
      if (!p?.tiers?.length) return
      const total = p.tiers.length
      const cur = p.tiers.filter((t) => p.xp >= t.xpRequired).length
      setSeason({ cur, total, pct: Math.round((cur / total) * 100) })
    })
  }, [loggedIn, refreshWallet])

  if (!loggedIn) {
    return (
      <div className="rounded-2xl p-6 text-center" style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-border)' }}>
        <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>Prisijunk, kad galėtum žaisti skaitmenines kovas.</p>
        <Link href="/login?next=/digital" className="inline-block px-5 py-2 rounded-xl text-sm font-semibold" style={{ background: 'rgba(240,180,41,0.15)', border: '1px solid rgba(240,180,41,0.4)', color: 'var(--gold)' }}>Prisijungti</Link>
      </div>
    )
  }

  const claimReward = () => { playUiClick(); setClaimable(false); setToast(`🔥 ${streak} d. serija — atlygis atsiimtas!`); refreshWallet() }
  const startBattle = () => { playUiClick(); router.push(MODE_HREF[mode]) }

  return (
    <div className="relative z-10 space-y-3.5">
      <HubStyles />

      <RewardBanner streak={streak} claimable={claimable} onClaim={claimReward} nextLabel="Kitas atlygis rytoj" />

      <PlayHeroCard subtitle="Pasirink režimą ir pradėk kovą" onCta={startBattle}>
        <ModeSelector modes={MODES} selected={mode} onSelect={(k) => { playUiClick(); setMode(k) }} />
      </PlayHeroCard>

      <div className="grid grid-cols-2 gap-3">
        <QuickActionCard image={`${ASSET}/qa-decks.webp`} href="/digital/decks" onClick={() => playUiClick()} />
        <QuickActionCard image={`${ASSET}/qa-collection.webp`} href="/digital/collection" onClick={() => playUiClick()} />
        <QuickActionCard image={`${ASSET}/qa-quests.webp`} onClick={() => { playUiClick(); setQuestsOpen(true) }} />
        <QuickActionCard image={`${ASSET}/qa-shop.webp`} onClick={() => { playUiClick(); setStoreOpen(true) }} />
      </div>

      <div className="space-y-2.5">
        <ProgressionCard icon="🎖️" title="Sezono kelias" sub={season ? undefined : 'Rinkite pakopas ir atlygius'} pct={season?.pct} progressLabel={season ? `Pakopa ${season.cur} / ${season.total}` : undefined} accent="240,180,41" onClick={() => { playUiClick(); setSeasonOpen(true) }} />
        <ProgressionCard icon={<GraduationCap className="w-5 h-5" />} title="Mokymai" sub="8 starter kaladės — išmok žaisti nemokamai" accent="139,92,246" href="/digital/tutorial" onClick={() => playUiClick()} />
        <ProgressionCard icon={<MapIcon className="w-5 h-5" />} title="Kampanija" sub="Ravenoro žemėlapis" accent="180,120,255" locked comingSoon />
      </div>

      {storeOpen && <StoreModal gold={wallet.gold} onClose={() => setStoreOpen(false)} onChanged={refreshWallet} />}
      {questsOpen && <QuestsModal onClose={() => setQuestsOpen(false)} onReward={refreshWallet} />}
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
