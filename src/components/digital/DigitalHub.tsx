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
import { ArtCta, ArtHeading } from './ui/LocalizedArt'
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
import { useT, useContent } from '@/lib/i18n/react'

// PASTABA (i18n): režimų PNG kortelės turi įkeptą LT pavadinimą — EN variantai bus
// pridėti kartu su lokalizuotais kortų vaizdais (žr. I18N-AUDIT.md, Fazė 6).
const MODE_DEFS = [
  { key: 'ranked', labelKey: 'home.modes.ranked', iconName: 'fi-ranked', iconFallback: <span style={{ fontSize: 18 }}>🏆</span>, accent: '239,68,68' },
  { key: 'pve',    labelKey: 'home.modes.pve',    iconName: 'fi-pve',    iconFallback: <span style={{ fontSize: 18 }}>🎯</span>, accent: '34,197,94' },
  { key: 'free',   labelKey: 'home.modes.free',   iconName: 'fi-pvp',    iconFallback: <span style={{ fontSize: 18 }}>⚔️</span>, accent: '240,180,41' },
]
const MODE_HREF: Record<string, string> = { pve: '/digital/pve', ranked: '/digital/ranked', free: '/digital/pvp' }

const PANEL: React.CSSProperties = { background: 'linear-gradient(160deg, rgba(27,21,34,0.97), rgba(15,13,21,0.98))', border: '1px solid rgba(212,163,59,0.22)', boxShadow: 'inset 0 0 40px rgba(0,0,0,0.5)' }


export function DigitalHub({ loggedIn }: { loggedIn: boolean }) {
  const router = useRouter()
  const t = useT()
  const tc = useContent()
  const MODES: HubMode[] = MODE_DEFS.map((m) => ({ ...m, label: t(m.labelKey) }))
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
        <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>{t('home.loginPrompt')}</p>
        <span className="inline-flex gap-2">
          <Link href="/digital/login" className="inline-block px-5 py-2 rounded-xl text-sm font-semibold" style={{ background: 'rgba(212,163,59,0.15)', border: '1px solid rgba(212,163,59,0.4)', color: 'var(--gold)' }}>{t('home.signIn')}</Link>
          <Link href="/digital/register" className="inline-block px-5 py-2 rounded-xl text-sm font-semibold" style={{ background: 'linear-gradient(180deg,#f2c45a,#d4a33b 52%,#b5852a)', border: '1px solid #f2d38a', color: '#07060a' }}>{t('home.createAccount')}</Link>
        </span>
      </div>
    )
  }

  const startBattle = () => { playUiClick(); router.push(MODE_HREF[mode]) }
  const doneCount = tasks.filter((t) => t.completed).length

  return (
    <div className="relative z-10 h-full flex flex-col gap-2 overflow-hidden">
      <HubStyles />

      {/* ── PAGRINDINĖ ZONA (dizaino mockup): kairė FEATURED ranked · vidurys režimai · dešinė info ── */}
      <div className="flex-1 min-h-0 grid gap-2" style={{ gridTemplateColumns: 'minmax(0,1.9fr) minmax(150px,1fr) minmax(195px,1.15fr)' }}>

        {/* ── KAIRĖ: FEATURED — Reitinginės kovos ── */}
        <button onClick={() => { playUiClick(); router.push('/digital/ranked') }}
          className="rvn-press relative rounded-2xl overflow-hidden text-left flex flex-col justify-between min-h-0"
          style={{ border: '1px solid rgba(212,163,59,0.45)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06), 0 10px 30px rgba(0,0,0,0.55)' }}>
          <img src={`${ASSET}/hero.webp`} alt="" className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(8,6,14,0.18) 0%, rgba(8,6,14,0.35) 55%, rgba(8,6,14,0.9) 100%)' }} />
          <div className="relative p-3">
            <div className="rvn-disp uppercase tracking-widest" style={{ fontSize: 'clamp(9px,1.4vh,11px)', color: '#f2c45a', textShadow: '0 1px 4px #000' }}>{t('home.seasonProgress')} · {season.cur}/{season.total}</div>
            <div className="rvn-disp font-black uppercase" style={{ fontSize: 'clamp(18px,4.6vh,34px)', lineHeight: 1.05, color: '#fff', textShadow: '0 2px 10px rgba(0,0,0,0.9)', borderBottom: '2px solid rgba(212,163,59,0.7)', display: 'inline-block', paddingBottom: 4 }}>{t('home.modes.ranked')}</div>
          </div>
          <div className="relative p-3 flex items-center gap-3">
            <span className="rvn-disp font-extrabold uppercase rounded-lg" style={{ fontSize: 'clamp(11px,2vh,15px)', padding: 'clamp(6px,1.2vh,10px) clamp(16px,3vw,26px)', background: 'linear-gradient(180deg,#f2c45a,#d4a33b 52%,#b5852a)', border: '1px solid #f2d38a', color: '#07060a', boxShadow: '0 4px 14px rgba(212,163,59,0.35)', clipPath: 'polygon(9px 0,100% 0,calc(100% - 9px) 100%,0 100%)' }}>{t('home.startBattle')}</span>
            <span style={{ fontSize: 'clamp(9px,1.5vh,12px)', color: '#cfc6b8', textShadow: '0 1px 4px #000' }}>{t('home.pickModeStart')}</span>
          </div>
        </button>

        {/* ── VIDURYS: režimų kortelės (vs AI · Draugiška · Kampanija) ── */}
        <div className="min-h-0 grid grid-rows-3 gap-2">
          {([
            { href: '/digital/pve', img: 'mode-pve.webp', label: t('home.modes.pve') },
            { href: '/digital/pvp', img: 'mode-free.webp', label: t('home.modes.free') },
            { href: '/digital/campaign', img: 'mode-ranked.webp', label: t('navigation.campaign') },
          ] as { href: string; img: string; label: string }[]).map((m2) => (
            <button key={m2.href} onClick={() => { playUiClick(); router.push(m2.href) }}
              className="rvn-press relative rounded-xl overflow-hidden text-left min-h-0"
              style={{ border: '1px solid rgba(212,163,59,0.3)' }}>
              <img src={`${ASSET}/${m2.img}`} alt="" className="absolute inset-0 w-full h-full object-cover" />
              <div className="absolute inset-0" style={{ background: 'linear-gradient(90deg, rgba(8,6,14,0.82) 20%, rgba(8,6,14,0.25) 70%)' }} />
              <div className="relative h-full flex flex-col justify-center px-3">
                <span className="rvn-disp font-extrabold uppercase" style={{ fontSize: 'clamp(11px,2vh,15px)', color: '#fff', textShadow: '0 1px 6px #000' }}>{m2.label}</span>
              </div>
            </button>
          ))}
        </div>

        {/* ── DEŠINĖ: sezono kelias + dienos užduotys ── */}
        <div className="min-h-0 flex flex-col gap-2">
          <section className="rounded-2xl shrink-0 overflow-hidden" style={PANEL}>
            <div className="px-3 pt-2 pb-2 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="rvn-disp text-[11px] font-extrabold uppercase tracking-wide truncate" style={{ color: 'var(--gold)' }}>{t('home.seasonProgress')}</div>
                <div className="rvn-disp text-[16px] font-black leading-tight" style={{ color: '#f2c45a' }}>{t('home.tier', { n: season.cur })}<span className="text-[11px]" style={{ color: 'var(--text-muted)' }}> / {season.total}</span></div>
                <div className="w-full h-1.5 mt-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
                  <div className="h-full rounded-full" style={{ width: season.pct + '%', background: 'linear-gradient(90deg,#8152a8,#b98fd6)' }} />
                </div>
              </div>
              <button data-testid="season-track-btn" onClick={() => { playUiClick(); setSeasonOpen(true) }} className="rvn-press shrink-0 px-2.5 py-1.5 rounded-lg text-[10px] font-extrabold rvn-disp"
                style={{ background: seasonClaimable > 0 ? 'linear-gradient(135deg,#5a3a86,#2e1d4a)' : 'rgba(0,0,0,0.4)', border: '1px solid rgba(129,82,168,0.5)', color: seasonClaimable > 0 ? '#e9deff' : '#b98fd6' }}>
                {seasonClaimable > 0 ? t('home.claimN', { count: seasonClaimable }) : t('home.viewTrack')}
              </button>
            </div>
          </section>
          <section className="rounded-2xl flex flex-col flex-1 min-h-0 overflow-hidden" style={PANEL}>
            <div className="flex items-center justify-between px-3 pt-2.5 pb-1.5 shrink-0">
              <span className="rvn-disp text-[13px] font-extrabold uppercase tracking-wide" style={{ color: 'var(--gold)' }}>{t('home.dailyQuests')}</span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ color: '#a7f3d0', background: 'rgba(52,211,153,0.14)' }}>{doneCount}/{tasks.length || 3}</span>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto px-2.5 flex flex-col" style={{ gap: 'clamp(3px,0.8vh,6px)' }}>
            {tasks.length === 0 && (
              <div className="my-auto flex flex-col items-center gap-2 px-2 text-center">
                {!questsLoaded ? <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{t('common.loading')}</span> : (
                  <>
                    <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{t('home.noQuestsToday')}</span>
                    <div className="w-full rounded-lg px-2.5 py-2" style={{ background: 'rgba(251,146,60,0.08)', border: '1px solid rgba(251,146,60,0.35)' }}>
                      <div className="text-[12px] font-bold" style={{ color: '#fdba74', fontFamily: 'var(--rvn-font-display)' }}>{t('home.streakDays', { count: streak })}</div>
                      <div className="text-[9px]" style={{ color: 'var(--text-muted)' }}>{t('home.streakHint')}</div>
                    </div>
                    <button onClick={() => { playUiClick(); setLoginOpen(true) }}
                      className="rvn-press w-full rounded-lg py-1.5 text-[10.5px] font-bold"
                      style={{ background: loginClaimable ? 'rgba(212,163,59,0.18)' : 'rgba(0,0,0,0.35)', border: `1px solid rgba(212,163,59,${loginClaimable ? 0.65 : 0.3})`, color: 'var(--gold)', fontFamily: 'var(--rvn-font-display)' }}>
                      {loginClaimable ? t('home.monthlyReady') : t('home.monthlyGifts')}
                    </button>
                  </>
                )}
              </div>
            )}
            {tasks.slice(0, 4).map((t) => {
              const pct = Math.min(100, Math.round((t.progress / Math.max(1, t.target)) * 100))
              return (
                <div key={t.id} className="rounded-lg px-2 shrink-0" style={{ paddingTop: 'clamp(3px,0.8vh,6px)', paddingBottom: 'clamp(3px,0.8vh,6px)', background: 'rgba(0,0,0,0.35)', border: '1px solid ' + (t.completed ? 'rgba(52,211,153,0.4)' : 'rgba(212,163,59,0.15)') }}>
                  <div className="flex items-center gap-1.5" style={{ marginBottom: 'clamp(2px,0.5vh,4px)' }}>
                    <span style={{ fontSize: 'clamp(9px,1.4vh,11px)' }}>{t.completed ? '✅' : '◻️'}</span>
                    <span className="font-semibold flex-1 truncate" style={{ fontSize: 'clamp(10px,1.5vh,12px)', color: t.completed ? '#a7f3d0' : '#e8dcc0' }}>{tc('daily_task', t.templateId, 'title', t.title)}</span>
                    <span className="tabular-nums" style={{ fontSize: 'clamp(8px,1.2vh,10px)', color: 'var(--text-muted)' }}>{t.progress}/{t.target}</span>
                  </div>
                  <div className="rounded-full overflow-hidden" style={{ height: 'clamp(3px,0.7vh,6px)', background: 'rgba(255,255,255,0.08)' }}>
                    <div className="h-full rounded-full" style={{ width: pct + '%', background: t.completed ? 'linear-gradient(90deg,#34d399,#a7f3d0)' : 'linear-gradient(90deg,#d4a33b,#f2c45a)' }} />
                  </div>
                </div>
              )
            })}
          </div>
          <button onClick={() => { playUiClick(); setDailyOpen(true) }}
            className="rvn-press m-2 mt-1 rounded-xl font-extrabold rvn-disp"
            style={{ paddingTop: 'clamp(5px,1vh,8px)', paddingBottom: 'clamp(5px,1vh,8px)', fontSize: 'clamp(10px,1.6vh,12px)', background: questsPending > 0 ? 'linear-gradient(135deg,#1f7a3a,#134f25)' : 'rgba(0,0,0,0.4)', border: '1px solid ' + (questsPending > 0 ? 'rgba(74,222,128,0.7)' : 'rgba(212,163,59,0.3)'), color: questsPending > 0 ? '#eafff0' : 'var(--gold)', boxShadow: questsPending > 0 ? '0 0 18px rgba(34,197,94,0.4)' : 'none' }}>
            {questsPending > 0 ? t('home.claimN', { count: questsPending }) : t('home.view')}
          </button>
          </section>
        </div>
      </div>

      {/* ── APAČIA: featured cosmetic · naujienos · draugai ── */}
      <div className="shrink-0 grid grid-cols-3 gap-2" style={{ height: 'clamp(66px,13vh,92px)' }}>
        <button onClick={() => { playUiClick(); setCosmeticsOpen(true) }} className="rvn-press rounded-xl overflow-hidden text-left relative flex items-end p-2.5" style={{ ...PANEL, background: 'linear-gradient(120deg, rgba(129,82,168,0.22), rgba(9,7,14,0.98))' }}>
          <div>
            <div className="font-bold uppercase tracking-widest" style={{ fontSize: 'clamp(8px,1.2vh,9px)', color: '#b98fd6' }}>{t('home.cosmetics')}</div>
            <div className="rvn-disp text-[13px] font-extrabold" style={{ color: '#fff' }}>{t('home.avatarsFrames')}</div>
            <div className="text-[9px]" style={{ color: 'var(--text-muted)' }}>{t('home.viewCollection')}</div>
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
                {t('home.activeDeck')}
                {ad?.boundAvatar && <span title={t('home.deckHasAvatar')} style={{ fontSize: 10 }}>👤</span>}
              </div>
              <div className="rvn-disp text-[13px] font-extrabold truncate" style={{ color: '#fff' }} title={ad?.name}>
                {!adState.loaded ? t('common.loading') : ad ? ad.name : t('home.pickDeck')}
              </div>
              <div className="text-[9px] truncate" style={{ color: av.valid ? '#4ade80' : '#fbbf24' }}>
                {ad ? `${ad.faction ? tc('faction', ad.factionId, 'name', ad.faction) : '—'} · ${t('home.cardsCount', { count: ad.cardCount })} · ` : ''}{av.valid ? t('home.readyForBattle') : `⚠ ${av.reason}`} <span style={{ color: 'var(--text-muted)' }}>· {t('home.change')}</span>
              </div>
            </button>
          )
        })()}

        <Link href="/digital/friends" onClick={() => playUiClick()} className="rvn-press rounded-xl overflow-hidden text-left relative flex flex-col justify-center p-2.5" style={{ ...PANEL, background: 'linear-gradient(120deg, rgba(52,211,153,0.18), rgba(9,7,14,0.98))' }}>
          <div className="text-[9px] font-bold uppercase tracking-widest flex items-center gap-1.5" style={{ color: '#a7f3d0' }}>
            {t('home.friends')}
            {friendsOnline !== null && friendsOnline > 0 && <span className="inline-flex items-center gap-1 normal-case tracking-normal font-bold px-1.5 rounded-full" style={{ fontSize: 9, background: 'rgba(52,211,153,0.16)', border: '1px solid rgba(52,211,153,0.5)', color: '#6ee7b7' }}><span className="rounded-full" style={{ width: 6, height: 6, background: '#34d399', boxShadow: '0 0 6px #34d399' }} /> {t('home.online', { count: friendsOnline })}</span>}
          </div>
          <div className="rvn-disp text-[13px] font-extrabold" style={{ color: '#fff' }}>{t('home.social')}</div>
          <div className="text-[9px]" style={{ color: 'var(--text-muted)' }}>{t('home.friendsInvites')}</div>
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
          style={{ bottom: 'calc(96px + env(safe-area-inset-bottom, 0px))', background: 'rgba(10,8,16,0.95)', border: '1px solid rgba(212,163,59,0.5)', color: 'var(--gold)' }}>
          {toast}
        </div>
      )}

      {/* nenaudojami tiesiogiai, bet paliekami stabilumui */}
      <span className="hidden">{streak}{claimable ? '1' : '0'}{newPlayer ? '1' : '0'}{loginClaimable ? '1' : '0'}</span>
    </div>
  )
}
