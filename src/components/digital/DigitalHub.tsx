'use client'

// ── Ravenof Digital — pagrindinis meniu, LANDSCAPE lobby (premium dark fantasy) ──
// 3 zonos: kairė Dienos užduotys · centras Play hero + režimai · dešinė Sezono progresas.
// Apačia: featured cosmetic / naujienos / draugai. Visa logika/duomenys/modalai išsaugoti.
import { useCallback, useEffect, useState } from 'react'
import { RewardChip } from '@/components/digital/ui/RewardBits'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { playUiClick } from '@/lib/ui-sound'
import { getWallet, getBalances, type Wallet, type Balances } from '@/lib/economy'
import { emitWalletChanged } from '@/lib/digital/native'
import { QuestsModal } from './QuestsModal'
import { SeasonPathModal } from './SeasonPathModal'
import { CosmeticsModal } from './CosmeticsModal'
import { WelcomeReward } from './WelcomeReward'
import { MonthlyLoginModal } from './MonthlyLoginModal'
import { DailyTasksModal } from './DailyTasksModal'
import { getMonthlyLogin} from '@/lib/gamification/monthlyLogin'
import { ShopModal } from './ShopModal'
import { useActiveDeck, deckValidity, activeDeckOf } from '@/lib/digital/activeDeck'
import { ActiveDeckSelectorModal } from '@/components/digital/ActiveDeckSelectorModal'
import { friendsList } from '@/lib/social'
import { loginCheckin } from '@/lib/gamification/quests'
import { getSeasonPath } from '@/lib/gamification/seasonPath'
import { getDailyTasks, type DailyTask } from '@/lib/gamification/dailyTasks'
import { getStarterDecks } from '@/lib/starterDecks'
import { HubStyles, ModeSelector, ASSET, type HubMode } from './ui/HubKit'
import { RvnIcon } from './ui/RvnIcon'

const MODES: HubMode[] = [
  { key: 'ranked', label: 'Reitingas',  iconName: 'fi-ranked', iconFallback: <span style={{ fontSize: 18 }}>🏆</span>, accent: '239,68,68' },
  { key: 'pve',    label: 'Prieš AI',   iconName: 'fi-pve',    iconFallback: <span style={{ fontSize: 18 }}>🎯</span>, accent: '34,197,94' },
  { key: 'free',   label: 'Draugiška',  iconName: 'fi-pvp',    iconFallback: <span style={{ fontSize: 18 }}>⚔️</span>, accent: '240,180,41' },
]
const MODE_HREF: Record<string, string> = { pve: '/digital/pve', ranked: '/digital/ranked', free: '/digital/pvp' }

const PANEL: React.CSSProperties = { background: 'linear-gradient(160deg, rgba(18,14,26,0.96), rgba(9,7,14,0.98))', border: '1px solid rgba(240,180,41,0.22)', boxShadow: 'inset 0 0 40px rgba(0,0,0,0.5)' }


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
  const [questsPending, setQuestsPending] = useState(0)
  const [tasks, setTasks] = useState<DailyTask[]>([])
  const [questsLoaded, setQuestsLoaded] = useState(false)
  const [, setBalances] = useState<Balances>({ silver: 0, rubies: 0, essence: 0 }) // reikšmes rodo layout header'is; čia tik refresh trigger
  const [loginOpen, setLoginOpen] = useState(false)
  const [loginClaimable, setLoginClaimable] = useState(false)
  const [dailyOpen, setDailyOpen] = useState(false)
  const [cosmeticsOpen, setCosmeticsOpen] = useState(false)
  const [seasonClaimable, setSeasonClaimable] = useState(0)
  const [nextReward, setNextReward] = useState<Record<string, unknown>[]>([])
  const [deckModalOpen, setDeckModalOpen] = useState(false)
  const adState = useActiveDeck()
  const [friendsOnline, setFriendsOnline] = useState<number | null>(null)

  const refreshWallet = useCallback(() => { getWallet().then((w) => { if (w) { setWallet(w); emitWalletChanged() } }) }, [])
  const refreshQuests = useCallback(() => { getDailyTasks().then((s2) => { setQuestsLoaded(true); if (!s2) { setQuestsPending(0); setTasks([]); return } setTasks(s2.tasks); setQuestsPending(s2.tasks.filter((t) => t.completed && !t.claimed).length + (s2.allDone && !s2.chestClaimed ? 1 : 0)) }) }, [])
  const refreshBalances = useCallback(() => { getBalances().then((b) => { if (b) setBalances(b) }) }, [])
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), 2400); return () => clearTimeout(t) }, [toast])

  useEffect(() => {
    if (!loggedIn) return
    refreshWallet(); refreshQuests(); refreshBalances()
    getMonthlyLogin().then((ml) => {
      if (!ml) return
      const cl = !ml.claimedToday && ml.nextDay <= ml.daysInMonth
      setLoginClaimable(cl)
      if (cl) { const k = `rvn:login-${new Date().toISOString().slice(0, 10)}`; if (!localStorage.getItem(k)) { localStorage.setItem(k, '1'); setLoginOpen(true) } }
    })
    loginCheckin().then((c) => { if (c) { setStreak(c.streak ?? 0); setClaimable(!c.already && c.reward > 0); if (!c.already && c.reward > 0) refreshWallet() } })
    getSeasonPath().then((sp) => { if (!sp) return; setSeason({ cur: sp.level, total: sp.levels, pct: Math.round((sp.level / sp.levels) * 100) }); const cl = sp.rows.filter((r) => r.reached && ((!r.free.claimed && r.free.payload.length > 0) || (sp.hasPass && !r.pass.claimed && r.pass.payload.length > 0))).length; setSeasonClaimable(cl); const nx = sp.rows.find((r) => !r.reached); setNextReward((nx?.free.payload ?? []) as Record<string, unknown>[]) })
    void useActiveDeck.getState().refresh()
    friendsList().then(({ friends }) => { const on = friends.filter((f) => f.online).length; setFriendsOnline(friends.length ? on : null) })
    getStarterDecks().then((d) => {
      const c = (d ?? []).filter((x) => x.claimed).length
      setNewPlayer(c === 0) // starter pasirinkimas dabar /digital/onboarding (route guard)
    })
  }, [loggedIn, refreshWallet, refreshQuests, refreshBalances])

  if (!loggedIn) {
    return (
      <div className="rounded-2xl p-6 text-center" style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-border)' }}>
        <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>Prisijunk, kad galėtum žaisti skaitmenines kovas.</p>
        <span className="inline-flex gap-2">
          <Link href="/digital/login" className="inline-block px-5 py-2 rounded-xl text-sm font-semibold" style={{ background: 'rgba(240,180,41,0.15)', border: '1px solid rgba(240,180,41,0.4)', color: 'var(--gold)' }}>Prisijungti</Link>
          <Link href="/digital/register" className="inline-block px-5 py-2 rounded-xl text-sm font-semibold" style={{ background: 'linear-gradient(180deg,#ffe28c,#f3b62c 46%,#c5841a)', border: '1px solid #ffeaa6', color: '#3a2406' }}>Sukurti paskyrą</Link>
        </span>
      </div>
    )
  }

  const startBattle = () => { playUiClick(); router.push(MODE_HREF[mode]) }
  const doneCount = tasks.filter((t) => t.completed).length

  return (
    <div className="relative z-10 h-full flex flex-col gap-2 overflow-hidden">
      <HubStyles />

      {/* ── PAGRINDINĖ ZONA: kairė quests · centras play · dešinė sezonas ── */}
      <div className="flex-1 min-h-0 grid gap-2" style={{ gridTemplateColumns: 'minmax(165px,0.9fr) minmax(0,2.4fr) minmax(165px,0.9fr)' }}>

        {/* ── KAIRĖ: Dienos užduotys ── */}
        <section className="rounded-2xl flex flex-col min-h-0 overflow-hidden" style={PANEL}>
          <div className="flex items-center justify-between px-3 pt-2.5 pb-1.5 shrink-0">
            <span className="rvn-disp text-[13px] font-extrabold uppercase tracking-wide" style={{ color: 'var(--gold)' }}>Dienos užduotys</span>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ color: '#a7f3d0', background: 'rgba(52,211,153,0.14)' }}>{doneCount}/{tasks.length || 3}</span>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto px-2.5 flex flex-col" style={{ gap: 'clamp(3px,0.8vh,6px)' }}>
            {tasks.length === 0 && (
              <div className="my-auto flex flex-col items-center gap-2 px-2 text-center">
                {!questsLoaded ? <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Kraunama…</span> : (
                  <>
                    <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Šiandien užduočių nėra</span>
                    <div className="w-full rounded-lg px-2.5 py-2" style={{ background: 'rgba(251,146,60,0.08)', border: '1px solid rgba(251,146,60,0.35)' }}>
                      <div className="text-[12px] font-bold" style={{ color: '#fdba74', fontFamily: 'var(--rvn-font-display)' }}>🔥 {streak} d. serija</div>
                      <div className="text-[9px]" style={{ color: 'var(--text-muted)' }}>Prisijunk kasdien — nenutrauk serijos</div>
                    </div>
                    <button onClick={() => { playUiClick(); setLoginOpen(true) }}
                      className="rvn-press w-full rounded-lg py-1.5 text-[10.5px] font-bold"
                      style={{ background: loginClaimable ? 'rgba(240,180,41,0.18)' : 'rgba(0,0,0,0.35)', border: `1px solid rgba(240,180,41,${loginClaimable ? 0.65 : 0.3})`, color: 'var(--gold)', fontFamily: 'var(--rvn-font-display)' }}>
                      {loginClaimable ? '🎁 Mėnesio dovana paruošta!' : '📅 Mėnesio dovanos'}
                    </button>
                  </>
                )}
              </div>
            )}
            {tasks.slice(0, 4).map((t) => {
              const pct = Math.min(100, Math.round((t.progress / Math.max(1, t.target)) * 100))
              return (
                <div key={t.id} className="rounded-lg px-2 shrink-0" style={{ paddingTop: 'clamp(3px,0.8vh,6px)', paddingBottom: 'clamp(3px,0.8vh,6px)', background: 'rgba(0,0,0,0.35)', border: '1px solid ' + (t.completed ? 'rgba(52,211,153,0.4)' : 'rgba(240,180,41,0.15)') }}>
                  <div className="flex items-center gap-1.5" style={{ marginBottom: 'clamp(2px,0.5vh,4px)' }}>
                    <span style={{ fontSize: 'clamp(9px,1.4vh,11px)' }}>{t.completed ? '✅' : '◻️'}</span>
                    <span className="font-semibold flex-1 truncate" style={{ fontSize: 'clamp(10px,1.5vh,12px)', color: t.completed ? '#a7f3d0' : '#e8dcc0' }}>{t.title}</span>
                    <span className="tabular-nums" style={{ fontSize: 'clamp(8px,1.2vh,10px)', color: 'var(--text-muted)' }}>{t.progress}/{t.target}</span>
                  </div>
                  <div className="rounded-full overflow-hidden" style={{ height: 'clamp(3px,0.7vh,6px)', background: 'rgba(255,255,255,0.08)' }}>
                    <div className="h-full rounded-full" style={{ width: pct + '%', background: t.completed ? 'linear-gradient(90deg,#34d399,#a7f3d0)' : 'linear-gradient(90deg,#d4af37,#f3d98c)' }} />
                  </div>
                </div>
              )
            })}
          </div>
          <button onClick={() => { playUiClick(); setDailyOpen(true) }}
            className="rvn-press m-2 mt-1 rounded-xl font-extrabold rvn-disp"
            style={{ paddingTop: 'clamp(5px,1vh,8px)', paddingBottom: 'clamp(5px,1vh,8px)', fontSize: 'clamp(10px,1.6vh,12px)', background: questsPending > 0 ? 'linear-gradient(135deg,#1f7a3a,#134f25)' : 'rgba(0,0,0,0.4)', border: '1px solid ' + (questsPending > 0 ? 'rgba(74,222,128,0.7)' : 'rgba(240,180,41,0.3)'), color: questsPending > 0 ? '#eafff0' : 'var(--gold)', boxShadow: questsPending > 0 ? '0 0 18px rgba(34,197,94,0.4)' : 'none' }}>
            {questsPending > 0 ? `ATSIIMTI (${questsPending})` : 'PERŽIŪRĖTI'}
          </button>
        </section>

        {/* ── CENTRAS: Play hero ── */}
        <div className="relative rounded-2xl overflow-hidden flex flex-col items-center justify-center min-h-0"
          style={{ border: '1px solid rgba(240,180,41,0.45)', gap: 'clamp(2px,0.9vh,9px)', padding: 'clamp(5px,1.6vh,13px)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06), 0 10px 30px rgba(0,0,0,0.55)' }}>
          <img src={`${ASSET}/hero.webp`} alt="" className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(8,6,14,0.24) 0%, rgba(8,6,14,0.5) 55%, rgba(8,6,14,0.82) 100%)' }} />
          <img src={`${ASSET}/heading.png`} alt="Žaisti dabar" className="relative" style={{ height: 'clamp(16px,3.6vh,34px)', width: 'auto', filter: 'drop-shadow(0 3px 8px #000)' }} />
          <span className="relative" style={{ fontSize: 'clamp(9px,1.4vh,12px)', color: '#cfc6b8', textShadow: '0 1px 4px #000' }}>Pasirink režimą ir pradėk kovą</span>
          <button onClick={startBattle} className="rvn-press relative block" style={{ lineHeight: 0, filter: 'drop-shadow(0 4px 12px rgba(240,180,41,0.35))' }}>
            <img src={`${ASSET}/cta2.png`} alt="Pradėti kovą" style={{ height: 'clamp(38px,8.5vh,74px)', width: 'auto', display: 'block' }} />
          </button>
          <div className="relative w-full" style={{ maxWidth: 460 }}>
            <ModeSelector modes={MODES} selected={mode} onSelect={(k) => { playUiClick(); setMode(k) }} />
          </div>
        </div>

        {/* ── DEŠINĖ: Sezono progresas ── */}
        <section className="rounded-2xl flex flex-col min-h-0 overflow-hidden" style={PANEL}>
          <div className="px-3 pt-2.5 pb-1.5 shrink-0">
            <span className="rvn-disp text-[13px] font-extrabold uppercase tracking-wide" style={{ color: 'var(--gold)' }}>Sezono progresas</span>
          </div>
          <div className="flex-1 min-h-0 px-3 py-1 flex flex-col items-center justify-center text-center overflow-hidden" style={{ gap: 'clamp(3px,0.9vh,8px)' }}>
            <RvnIcon name="seg-season" size={48} fallback={<span style={{ fontSize: 30 }}>📜</span>} />
            <div className="rvn-disp text-[20px] font-black leading-none" style={{ color: '#f3d98c' }}>Pakopa {season.cur}<span className="text-[13px]" style={{ color: 'var(--text-muted)' }}> / {season.total}</span></div>
            <div className="w-full h-2.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(240,180,41,0.2)' }}>
              <div className="h-full rounded-full" style={{ width: season.pct + '%', background: 'linear-gradient(90deg,#8b5cf6,#c4b5fd)' }} />
            </div>
            <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Kita pakopa: <span style={{ color: '#c4b5fd' }}>Pakopa {Math.min(season.cur + 1, season.total)}</span></span>
            {nextReward.length > 0 && (
              <div className="flex flex-wrap justify-center gap-1 shrink-0 overflow-hidden" style={{ maxHeight: '2.2em' }}>
                {nextReward.slice(0, 3).map((it, i) => (
                  <span key={i} className="px-1.5 py-0.5 rounded-md" style={{ fontSize: 9.5, background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.35)', color: '#e8dcc0' }}><RewardChip it={it} size={14} textSize={9.5} /></span>
                ))}
              </div>
            )}
          </div>
          <div className="p-2.5 pt-1.5 flex flex-col gap-1.5 shrink-0 relative" style={{ zIndex: 2, background: 'inherit' }}>
            <button data-testid="season-track-btn" onClick={() => { playUiClick(); setSeasonOpen(true) }} className="rvn-press py-2 rounded-xl text-[12px] font-extrabold rvn-disp"
              style={{ background: seasonClaimable > 0 ? 'linear-gradient(135deg,#6b3fa0,#3a2160)' : 'rgba(0,0,0,0.4)', border: '1px solid rgba(139,92,246,0.5)', color: seasonClaimable > 0 ? '#e9deff' : '#c4b5fd', boxShadow: seasonClaimable > 0 ? '0 0 18px rgba(139,92,246,0.4)' : 'none' }}>
              {seasonClaimable > 0 ? `ATSIIMTI (${seasonClaimable})` : 'PERŽIŪRĖTI TAKĄ'}
            </button>
          </div>
        </section>
      </div>

      {/* ── APAČIA: featured cosmetic · naujienos · draugai ── */}
      <div className="shrink-0 grid grid-cols-3 gap-2" style={{ height: 'clamp(66px,13vh,92px)' }}>
        <button onClick={() => { playUiClick(); setCosmeticsOpen(true) }} className="rvn-press rounded-xl overflow-hidden text-left relative flex items-end p-2.5" style={{ ...PANEL, background: 'linear-gradient(120deg, rgba(139,92,246,0.22), rgba(9,7,14,0.98))' }}>
          <div>
            <div className="font-bold uppercase tracking-widest" style={{ fontSize: 'clamp(8px,1.2vh,9px)', color: '#c4b5fd' }}>Kosmetika</div>
            <div className="rvn-disp text-[13px] font-extrabold" style={{ color: '#fff' }}>Avatarai ir rėmai</div>
            <div className="text-[9px]" style={{ color: 'var(--text-muted)' }}>Peržiūrėti kolekciją →</div>
          </div>
        </button>

        {(() => {
          const ad = activeDeckOf(adState)
          const av = deckValidity(ad)
          const col = ad?.factionColor ?? '#f0b429'
          return (
            <button data-testid="home-active-deck" onClick={() => { playUiClick(); setDeckModalOpen(true) }}
              className="rvn-press rounded-xl overflow-hidden text-left relative flex flex-col justify-center p-2.5"
              style={{ ...PANEL, background: `linear-gradient(120deg, ${col}2b, rgba(9,7,14,0.98))` }}>
              <div className="text-[9px] font-bold uppercase tracking-widest flex items-center gap-1.5" style={{ color: 'var(--gold)' }}>
                Aktyvi kaladė
                {ad?.boundAvatar && <span title="Kaladė turi savo avatarą" style={{ fontSize: 10 }}>👤</span>}
              </div>
              <div className="rvn-disp text-[13px] font-extrabold truncate" style={{ color: '#fff' }} title={ad?.name}>
                {!adState.loaded ? 'Kraunama…' : ad ? ad.name : 'Pasirink kaladę'}
              </div>
              <div className="text-[9px] truncate" style={{ color: av.valid ? '#4ade80' : '#fbbf24' }}>
                {ad ? `${ad.faction ?? '—'} · ${ad.cardCount} kortos · ` : ''}{av.valid ? '✓ Paruošta kovai' : `⚠ ${av.reason}`} <span style={{ color: 'var(--text-muted)' }}>· keisti →</span>
              </div>
            </button>
          )
        })()}

        <Link href="/digital/friends" onClick={() => playUiClick()} className="rvn-press rounded-xl overflow-hidden text-left relative flex flex-col justify-center p-2.5" style={{ ...PANEL, background: 'linear-gradient(120deg, rgba(52,211,153,0.18), rgba(9,7,14,0.98))' }}>
          <div className="text-[9px] font-bold uppercase tracking-widest flex items-center gap-1.5" style={{ color: '#a7f3d0' }}>
            Draugai
            {friendsOnline !== null && friendsOnline > 0 && <span className="inline-flex items-center gap-1 normal-case tracking-normal font-bold px-1.5 rounded-full" style={{ fontSize: 9, background: 'rgba(52,211,153,0.16)', border: '1px solid rgba(52,211,153,0.5)', color: '#6ee7b7' }}><span className="rounded-full" style={{ width: 6, height: 6, background: '#34d399', boxShadow: '0 0 6px #34d399' }} /> {friendsOnline} online</span>}
          </div>
          <div className="rvn-disp text-[13px] font-extrabold" style={{ color: '#fff' }}>Socialinis</div>
          <div className="text-[9px]" style={{ color: 'var(--text-muted)' }}>Draugai ir kvietimai →</div>
        </Link>
      </div>

      {/* ── Modalai (visi išsaugoti) ── */}
      {storeOpen && <ShopModal onClose={() => setStoreOpen(false)} onPurchased={() => { refreshWallet(); refreshBalances() }} />}
      {questsOpen && <QuestsModal onClose={() => { setQuestsOpen(false); refreshQuests() }} onReward={() => { refreshWallet(); refreshQuests() }} />}
      {seasonOpen && <SeasonPathModal onClose={() => setSeasonOpen(false)} onReward={() => { refreshBalances(); refreshWallet() }} />}
      {cosmeticsOpen && <CosmeticsModal gold={wallet.gold} onClose={() => setCosmeticsOpen(false)} onSpent={() => { refreshWallet(); refreshBalances() }} />}

      {deckModalOpen && <ActiveDeckSelectorModal onClose={() => setDeckModalOpen(false)} />}
      {dailyOpen && <DailyTasksModal onClose={() => { setDailyOpen(false); refreshQuests() }} onReward={() => { refreshBalances(); refreshWallet(); refreshQuests() }} />}
      {loginOpen && <MonthlyLoginModal onClose={() => { setLoginOpen(false); refreshBalances(); getMonthlyLogin().then((ml) => setLoginClaimable(!!ml && !ml.claimedToday && ml.nextDay <= ml.daysInMonth)) }} onClaimed={() => { refreshBalances(); setLoginClaimable(false) }} />}

      <WelcomeReward onClaimed={() => { refreshWallet(); void getStarterDecks().then((d) => { const c = (d ?? []).filter((x) => x.claimed).length; setNewPlayer(c === 0) }) }} />

      {toast && (
        <div className="fixed left-1/2 -translate-x-1/2 z-[160] px-4 py-2 rounded-full text-xs font-semibold"
          style={{ bottom: 'calc(96px + env(safe-area-inset-bottom, 0px))', background: 'rgba(10,8,16,0.95)', border: '1px solid rgba(240,180,41,0.5)', color: 'var(--gold)' }}>
          {toast}
        </div>
      )}

      {/* nenaudojami tiesiogiai, bet paliekami stabilumui */}
      <span className="hidden">{streak}{claimable ? '1' : '0'}{newPlayer ? '1' : '0'}{loginClaimable ? '1' : '0'}</span>
    </div>
  )
}
