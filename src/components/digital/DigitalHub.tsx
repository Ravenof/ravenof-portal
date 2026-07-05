'use client'

// ── Ravenof Digital — pagrindinis meniu (premium CSS, gyvi duomenys) ─────────
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Medal } from 'lucide-react'
import { playUiClick } from '@/lib/ui-sound'
import { getWallet, getBalances, type Wallet, type Balances } from '@/lib/economy'
import { emitWalletChanged } from '@/lib/digital/native'
import { QuestsModal } from './QuestsModal'
import { SeasonPassModal } from './SeasonPassModal'
import { SeasonPathModal } from './SeasonPathModal'
import { StoreModal } from './StoreModal'
import { ShopModal } from './ShopModal'
import { CosmeticsModal } from './CosmeticsModal'
import { WelcomeReward } from './WelcomeReward'
import { MonthlyLoginModal } from './MonthlyLoginModal'
import { DailyTasksModal } from './DailyTasksModal'
import { getMonthlyLogin } from '@/lib/gamification/monthlyLogin'
import { StarterOnboarding } from './StarterOnboarding'
import { loginCheckin, getDailyQuests } from '@/lib/gamification/quests'
import { getSeasonPass } from '@/lib/gamification/seasonPass'
import { getSeasonPath } from '@/lib/gamification/seasonPath'
import { getDailyTasks } from '@/lib/gamification/dailyTasks'
import { getStarterDecks } from '@/lib/starterDecks'
import { HubStyles, RewardBanner, StatCard, RewardChip, PlayHeroCard, ModeSelector, QuickActionCard, ASSET, type HubMode } from './ui/HubKit'
import { RvnIcon } from './ui/RvnIcon'

const MODES: HubMode[] = [
  { key: 'pve',    label: 'Treniruočių kova', iconName: 'fi-pve',    iconFallback: <span style={{ fontSize: 18 }}>🎯</span>, accent: '34,197,94' },
  { key: 'ranked', label: 'Reitinginė kova',  iconName: 'fi-ranked', iconFallback: <span style={{ fontSize: 18 }}>🏆</span>, accent: '239,68,68' },
  { key: 'free',   label: 'Draugiška kova',   iconName: 'fi-pvp',    iconFallback: <span style={{ fontSize: 18 }}>⚔️</span>, accent: '240,180,41' },
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
  const [newPlayer, setNewPlayer] = useState<boolean | null>(null)
  const [onboardOpen, setOnboardOpen] = useState(false)
  const [questsPending, setQuestsPending] = useState(0)
  const [balances, setBalances] = useState<Balances>({ silver: 0, rubies: 0, essence: 0 })
  const [loginOpen, setLoginOpen] = useState(false)
  const [loginClaimable, setLoginClaimable] = useState(false)
  const [dailyOpen, setDailyOpen] = useState(false)
  const [cosmeticsOpen, setCosmeticsOpen] = useState(false)
  const [seasonClaimable, setSeasonClaimable] = useState(0)

  const refreshWallet = useCallback(() => { getWallet().then((w) => { if (w) { setWallet(w); emitWalletChanged() } }) }, [])
  const refreshQuests = useCallback(() => { getDailyTasks().then((s2) => { if (!s2) { setQuestsPending(0); return } setQuestsPending(s2.tasks.filter((t) => t.completed && !t.claimed).length + (s2.allDone && !s2.chestClaimed ? 1 : 0)) }) }, [])
  const refreshBalances = useCallback(() => { getBalances().then((b) => { if (b) setBalances(b) }) }, [])
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), 2400); return () => clearTimeout(t) }, [toast])

  useEffect(() => {
    if (!loggedIn) return
    refreshWallet(); refreshQuests()
    refreshBalances()
    getMonthlyLogin().then((ml) => {
      if (!ml) return
      const claimable = !ml.claimedToday && ml.nextDay <= ml.daysInMonth
      setLoginClaimable(claimable)
      if (claimable) { const k = `rvn:login-${new Date().toISOString().slice(0, 10)}`; if (!localStorage.getItem(k)) { localStorage.setItem(k, '1'); setLoginOpen(true) } }
    })
    loginCheckin().then((c) => { if (c) { setStreak(c.streak ?? 0); setClaimable(!c.already && c.reward > 0); if (!c.already && c.reward > 0) refreshWallet() } })
    getSeasonPath().then((sp) => { if (!sp) return; setSeason({ cur: sp.level, total: sp.levels, pct: Math.round((sp.level / sp.levels) * 100) }); const claimable = sp.rows.filter((r) => r.reached && ((!r.free.claimed && r.free.payload.length > 0) || (sp.hasPass && !r.pass.claimed && r.pass.payload.length > 0))).length; setSeasonClaimable(claimable) })
    getStarterDecks().then((d) => {
      const c = (d ?? []).filter((x) => x.claimed).length
      setNewPlayer(c === 0)
      // Naujoko onboarding popup (kaladė + avataras) – automatiškai, kol neatmestas.
      // WelcomeReward (z400) rodomas virš – dovana pirmiau, užsidarius matosi šis.
      if (c === 0 && (d ?? []).length > 0 && !localStorage.getItem('rvn-starter-onboard-seen')) setOnboardOpen(true)
    })
  }, [loggedIn, refreshWallet, refreshQuests, refreshBalances])

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

  // ── Protingas „kitas veiksmas" — viena aiški rekomendacija pagal žaidėjo būseną ──
  type NextAction = { icon: string; title: string; sub: string; accent: string; act: () => void }
  const nextAction: NextAction | null = newPlayer === null ? null
    : newPlayer
      ? { icon: '🎓', title: 'Pasiimk starter kaladę', sub: 'Nemokama kaladė, avataras ir mokymų kova', accent: '240,180,41', act: () => { playUiClick(); setOnboardOpen(true) } }
    : questsPending > 0
      ? { icon: '🎯', title: 'Atsiimk užduočių atlygį', sub: `Paruošta atsiimti: ${questsPending}`, accent: '52,211,153', act: () => { playUiClick(); setDailyOpen(true) } }
    : wallet.packs > 0
      ? { icon: '🎁', title: 'Atplėšk pakuotę', sub: `Turi ${wallet.packs} · atidaryk albume`, accent: '251,146,60', act: () => { playUiClick(); router.push('/digital/album') } }
    : seasonClaimable > 0
      ? { icon: '📜', title: 'Atsiimk sezono pakopą', sub: `Laukia pakopų: ${seasonClaimable}`, accent: '139,92,246', act: () => { playUiClick(); setSeasonOpen(true) } }
      : { icon: '⚔️', title: 'Sužaisk reitingo kovą', sub: 'Kelk reitingą ir uždirbk XP', accent: '240,180,41', act: () => { playUiClick(); router.push('/digital/ranked') } }

  return (
    <div className="relative z-10 space-y-3">
      <HubStyles />

      {/* ── 3 segmentai: Užduotys / Sezonas / Prisijungimas ── */}
      <div className="grid grid-cols-3 gap-2">
        <button onClick={() => { playUiClick(); setDailyOpen(true) }} className="rvn-press relative flex flex-col items-center justify-center gap-1 rounded-xl py-3"
          style={{ background: 'linear-gradient(160deg, rgba(52,211,153,0.12), rgba(10,8,16,0.92))', border: '1px solid rgba(52,211,153,0.4)' }}>
          <RvnIcon name="seg-quests" size={46} fallback={<span style={{ fontSize: 22 }}>🎯</span>} />
          <span className="text-[10px] font-bold" style={{ color: '#a7f3d0' }}>Užduotys</span>
          {questsPending > 0 && <span className="absolute top-1.5 right-1.5 flex items-center justify-center rounded-full text-[9px] font-bold" style={{ width: 16, height: 16, background: '#ef4444', color: '#fff' }}>{questsPending}</span>}
        </button>
        <button onClick={() => { playUiClick(); setSeasonOpen(true) }} className="rvn-press flex flex-col items-center justify-center gap-1 rounded-xl py-3"
          style={{ background: 'linear-gradient(160deg, rgba(240,180,41,0.12), rgba(10,8,16,0.92))', border: '1px solid rgba(240,180,41,0.4)' }}>
          <RvnIcon name="seg-season" size={46} fallback={<span style={{ fontSize: 22 }}>📜</span>} />
          <span className="text-[10px] font-bold" style={{ color: '#f3d98c' }}>Sezonas</span>
          <span className="text-[8px]" style={{ color: 'var(--text-muted)' }}>Lygis {season.cur}/{season.total}</span>
        </button>
        <button onClick={() => { playUiClick(); setLoginOpen(true) }} className="rvn-press relative flex flex-col items-center justify-center gap-1 rounded-xl py-3"
          style={{ background: 'linear-gradient(160deg, rgba(139,92,246,0.12), rgba(10,8,16,0.92))', border: '1px solid rgba(139,92,246,0.4)' }}>
          <RvnIcon name="seg-login" size={46} fallback={<span style={{ fontSize: 22 }}>🎁</span>} />
          <span className="text-[10px] font-bold" style={{ color: '#c4b5fd' }}>Dovanos</span>
          {loginClaimable && <span className="absolute top-1.5 right-1.5 rvn-glow-pulse rounded-full" style={{ width: 9, height: 9, background: '#f3b62c', boxShadow: '0 0 8px rgba(240,180,41,0.9)' }} />}
        </button>
      </div>

      {nextAction && (
        <button onClick={nextAction.act} className="rvn-press rvn-glow block w-full text-left rvn-fade" style={{ borderRadius: 16, padding: '13px 16px',
          background: `radial-gradient(130% 130% at 0% 0%, rgba(${nextAction.accent},0.30), transparent 56%), linear-gradient(150deg, rgba(20,15,30,0.96), rgba(10,8,16,0.98))`,
          border: `1px solid rgba(${nextAction.accent},0.6)` }}>
          <span className="flex items-center gap-3">
            <span style={{ fontSize: 26 }}>{nextAction.icon}</span>
            <span className="flex-1 min-w-0">
              <span className="block" style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.16em', color: `rgba(${nextAction.accent},0.92)` }}>KITAS VEIKSMAS</span>
              <span className="block rvn-disp" style={{ fontSize: 15, fontWeight: 800, color: '#fff' }}>{nextAction.title}</span>
              <span className="block" style={{ fontSize: 11.5, color: '#e8dcc0' }}>{nextAction.sub}</span>
            </span>
            <span className="rvn-disp" style={{ fontSize: 15, fontWeight: 800, color: `rgba(${nextAction.accent},1)` }}>→</span>
          </span>
        </button>
      )}


      <PlayHeroCard subtitle="Pasirink režimą ir pradėk kovą" onCta={startBattle}>
        <ModeSelector modes={MODES} selected={mode} onSelect={(k) => { playUiClick(); setMode(k) }} />
      </PlayHeroCard>







      {storeOpen && <StoreModal gold={wallet.gold} onClose={() => setStoreOpen(false)} onChanged={() => { refreshWallet(); refreshBalances() }} />}
      {questsOpen && <QuestsModal onClose={() => { setQuestsOpen(false); refreshQuests() }} onReward={() => { refreshWallet(); refreshQuests() }} />}
      {seasonOpen && <SeasonPathModal onClose={() => setSeasonOpen(false)} onReward={() => { refreshBalances(); refreshWallet() }} />}

      {onboardOpen && (
        <StarterOnboarding
          onClose={() => { setOnboardOpen(false); try { localStorage.setItem('rvn-starter-onboard-seen', '1') } catch {} }}
          onDone={() => {
            setOnboardOpen(false)
            try { localStorage.setItem('rvn-starter-onboard-seen', '1') } catch {}
            setNewPlayer(false)
            router.push('/digital/tutorial?auto=1')
          }} />
      )}

      {dailyOpen && <DailyTasksModal onClose={() => { setDailyOpen(false); refreshQuests() }} onReward={() => { refreshBalances(); refreshWallet(); refreshQuests() }} />}
      {loginOpen && <MonthlyLoginModal onClose={() => { setLoginOpen(false); refreshBalances(); getMonthlyLogin().then((ml) => setLoginClaimable(!!ml && !ml.claimedToday && ml.nextDay <= ml.daysInMonth)) }} onClaimed={() => { refreshBalances(); setLoginClaimable(false) }} />}

      <WelcomeReward onClaimed={() => { refreshWallet(); void getStarterDecks().then((d) => { const c = (d ?? []).filter((x) => x.claimed).length; setNewPlayer(c === 0) }) }} />

      {toast && (
        <div className="fixed left-1/2 -translate-x-1/2 z-[160] px-4 py-2 rounded-full text-xs font-semibold"
          style={{ bottom: 'calc(96px + env(safe-area-inset-bottom, 0px))', background: 'rgba(10,8,16,0.95)', border: '1px solid rgba(240,180,41,0.5)', color: 'var(--gold)' }}>
          {toast}
        </div>
      )}
    </div>
  )
}
