'use client'

// ── Ravenof Digital — pagrindinis meniu (patvirtintas UI, Fazė 1) ─────────────
// ravenof-ui-handoff main-menu-default.png: kairė Reitingo hero · vidurys 3 režimų
// kortelės (DI / Draugiška / Kampanija) · dešinė „Kas toliau" + serija/sezonas +
// dienos užduotys. Visa logika/duomenys/modalai išsaugoti.
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { playUiClick, playSuccess } from '@/lib/ui-sound'
import { getWallet, getBalances, type Wallet, type Balances } from '@/lib/economy'
import { emitWalletChanged } from '@/lib/digital/native'
import { SeasonPathModal } from './SeasonPathModal'
import { WelcomeReward } from './WelcomeReward'
import { MonthlyLoginModal } from './MonthlyLoginModal'
import { DailyTasksModal } from './DailyTasksModal'
import { getMonthlyLogin } from '@/lib/gamification/monthlyLogin'
import { loginCheckin } from '@/lib/gamification/quests'
import { getSeasonPath } from '@/lib/gamification/seasonPath'
import { getDailyTasks, claimDailyTask, DIFF_ACCENT, type DailyTask } from '@/lib/gamification/dailyTasks'
import { getStarterDecks } from '@/lib/starterDecks'
import { getActiveSeason, ensureProfile } from '@/lib/ranked/client'
import { rankView, medalLabel } from '@/lib/ranked/rank'
import { RAVENOF_ASSET, RavenofToast } from './ui/RavenofKit'
import { useT, useContent } from '@/lib/i18n/react'

const A = RAVENOF_ASSET

/** Rango numeris romėnišku formatu. */
function toRoman(n: number): string {
  const map: [number, string][] = [[50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']]
  let out = ''; let v = Math.max(1, Math.min(50, Math.round(n)))
  for (const [num, sym] of map) while (v >= num) { out += sym; v -= num }
  return out
}

/** hh:mm iki vietinės paros pabaigos (dienos užduočių atsinaujinimas). */
function timeToMidnight(): string {
  const now = new Date()
  const mid = new Date(now); mid.setHours(24, 0, 0, 0)
  const mins = Math.max(0, Math.floor((mid.getTime() - now.getTime()) / 60000))
  return `${Math.floor(mins / 60)}:${String(mins % 60).padStart(2, '0')}`
}

export function DigitalHub({ loggedIn }: { loggedIn: boolean }) {
  const router = useRouter()
  const t = useT()
  const tc = useContent()
  const [toast, setToast] = useState<string | null>(null)
  const [, setWallet] = useState<Wallet>({ gold: 0, packs: 0 })
  const [seasonOpen, setSeasonOpen] = useState(false)
  const [streak, setStreak] = useState(0)
  const [claimable, setClaimable] = useState(false)
  const [season, setSeason] = useState<{ cur: number; total: number; pct: number }>({ cur: 0, total: 50, pct: 0 })
  const [newPlayer, setNewPlayer] = useState<boolean | null>(null)
  const [questsPending, setQuestsPending] = useState(0)
  const [tasks, setTasks] = useState<DailyTask[]>([])
  const [questsLoaded, setQuestsLoaded] = useState(false)
  const [, setBalances] = useState<Balances>({ silver: 0, rubies: 0, essence: 0 }) // reikšmes rodo layout header'is; čia tik refresh trigger
  const [loginOpen, setLoginOpen] = useState(false)
  const [loginClaimable, setLoginClaimable] = useState(false)
  const [dailyOpen, setDailyOpen] = useState(false)
  const [seasonClaimable, setSeasonClaimable] = useState(0)
  const [rankInfo, setRankInfo] = useState<{ step: number } | null>(null)
  const [seasonMeta, setSeasonMeta] = useState<{ name: string; daysLeft: number } | null>(null)
  const [countdown, setCountdown] = useState(timeToMidnight())

  const refreshWallet = useCallback(() => { getWallet().then((w) => { if (w) { setWallet(w); emitWalletChanged() } }) }, [])
  const refreshQuests = useCallback(() => { getDailyTasks().then((s2) => { setQuestsLoaded(true); if (!s2) { setQuestsPending(0); setTasks([]); return } setTasks(s2.tasks); setQuestsPending(s2.tasks.filter((t) => t.completed && !t.claimed).length + (s2.allDone && !s2.chestClaimed ? 1 : 0)) }) }, [])
  const refreshBalances = useCallback(() => { getBalances().then((b) => { if (b) setBalances(b) }) }, [])
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), 2400); return () => clearTimeout(t) }, [toast])
  useEffect(() => { const i = setInterval(() => setCountdown(timeToMidnight()), 30_000); return () => clearInterval(i) }, [])

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
    getSeasonPath().then((sp) => { if (!sp) return; setSeason({ cur: sp.level, total: sp.levels, pct: Math.round((sp.level / sp.levels) * 100) }); const cl = sp.rows.filter((r) => r.reached && ((!r.free.claimed && r.free.payload.length > 0) || (sp.hasPass && !r.pass.claimed && r.pass.payload.length > 0))).length; setSeasonClaimable(cl) })
    ensureProfile().then((rp) => { if (rp) setRankInfo({ step: rp.rank_step }) })
    getActiveSeason().then((s) => {
      if (!s) return
      const days = Math.max(0, Math.ceil((new Date(s.end_date).getTime() - Date.now()) / 86_400_000))
      setSeasonMeta({ name: s.name, daysLeft: days })
    })
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

  const rv = rankInfo ? rankView(rankInfo.step) : null
  const ptsToNext = rankInfo ? Math.max(1, 3 - (rankInfo.step % 3)) : null
  const nx = rankInfo && ptsToNext ? rankView(Math.min(rankInfo.step + ptsToNext, 149)) : null
  const claimTask = async (task: DailyTask) => {
    playUiClick()
    const r = await claimDailyTask(task.id)
    if (r) { playSuccess(); setToast(t('quests.claim') + ' ✓'); refreshQuests(); refreshBalances(); refreshWallet() }
    else setDailyOpen(true)
  }

  const modeCards: { key: string; href: string; title: string; sub: string; art: string; artPos: string; border: string; clip: string }[] = [
    { key: 'pve', href: '/digital/pve', title: t('home.pveTitle'), sub: t('home.pveSub'), art: `${A}/modes/mode-vs-ai.webp`, artPos: '50% 25%', border: 'rgba(111,133,98,.4)', clip: 'polygon(0 10px,10px 0,100% 0,100% 100%,0 100%)' },
    { key: 'free', href: '/digital/pvp', title: t('home.freeTitle'), sub: t('home.freeSub'), art: `${A}/modes/mode-friendly-pvp.webp`, artPos: '50% 20%', border: 'rgba(82,111,174,.4)', clip: 'polygon(0 0,100% 0,100% 100%,10px 100%,0 calc(100% - 10px))' },
    { key: 'campaign', href: '/digital/campaign', title: t('home.campaignTitle'), sub: t('home.campaignSub'), art: `${A}/backgrounds/background-cathedral-ruins.webp`, artPos: '50% 30%', border: 'rgba(166,92,50,.45)', clip: 'polygon(0 0,100% 0,100% calc(100% - 10px),calc(100% - 10px) 100%,0 100%)' },
  ]

  return (
    <div className="ravenof-body relative z-10 h-full flex ravenof-in" style={{ gap: 10, minHeight: 0 }}>
      {/* ── KAIRĖ: Reitingo hero ── */}
      <button onClick={() => { playUiClick(); router.push('/digital/ranked') }}
        className="ravenof-press relative overflow-hidden text-left flex flex-col justify-between min-h-0"
        style={{ flex: 1.25, border: '1px solid #3d3345', clipPath: 'polygon(0 0,100% 0,100% calc(100% - 14px),calc(100% - 14px) 100%,0 100%)', cursor: 'pointer', background: 'none', padding: 0 }}>
        <div className="absolute inset-0" style={{ background: `url('${A}/modes/mode-ranked.webp') no-repeat`, backgroundSize: 'cover', backgroundPosition: '50% 22%' }} />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(7,6,10,.55) 0%, rgba(7,6,10,.15) 40%, rgba(7,6,10,.92) 100%)' }} />
        <div className="absolute inset-0 pointer-events-none" style={{ border: '1px solid rgba(212,163,59,.35)', clipPath: 'polygon(0 0,100% 0,100% calc(100% - 14px),calc(100% - 14px) 100%,0 100%)' }} />
        <div className="relative" style={{ padding: '12px 14px' }}>
          <div style={{ font: '500 10px var(--ravenof-font-body)', letterSpacing: 2.5, color: 'var(--ravenof-gold)', textTransform: 'uppercase' }}>
            {seasonMeta ? <>{t('home.season')} {seasonMeta.name} · {seasonMeta.daysLeft} {t('home.daysShort')}</> : t('home.seasonProgress')}
          </div>
          <div style={{ font: '700 19px var(--ravenof-font-display)', letterSpacing: '.5px', color: 'var(--ravenof-text-primary)', textShadow: '0 2px 10px rgba(0,0,0,.9)', marginTop: 2 }}>{t('home.rankedTitle')}</div>
        </div>
        <div className="relative flex items-center" style={{ padding: '12px 14px', gap: 10 }}>
          <span style={{ font: '700 12px var(--ravenof-font-display)', color: 'var(--ravenof-gold-bright)', border: '1px solid rgba(212,163,59,.5)', padding: '7px 16px', background: 'rgba(7,6,10,.6)', clipPath: 'polygon(7px 0,100% 0,calc(100% - 7px) 100%,0 100%)' }}>{t('home.play')}</span>
          {rv && <span style={{ font: '400 11px var(--ravenof-font-body)', color: 'var(--ravenof-text-secondary)' }}>{medalLabel(rv.medalTier)} {toRoman(rv.rankNumber)} · {rv.rankNumber}/50</span>}
        </div>
      </button>

      {/* ── VIDURYS: režimų kortelės ── */}
      <div className="flex flex-col min-w-0" style={{ flex: 1, gap: 10 }}>
        {modeCards.map((m) => (
          <button key={m.key} onClick={() => { playUiClick(); router.push(m.href) }}
            className="ravenof-press relative overflow-hidden text-left min-h-0"
            style={{ flex: 1, clipPath: m.clip, cursor: 'pointer', background: 'none', border: 0, padding: 0 }}>
            <div className="absolute inset-0" style={{ background: `url('${m.art}') no-repeat`, backgroundSize: 'cover', backgroundPosition: m.artPos }} />
            <div className="absolute inset-0" style={{ background: 'linear-gradient(90deg, rgba(7,6,10,.88) 20%, rgba(7,6,10,.25) 100%)' }} />
            <div className="absolute inset-0 pointer-events-none" style={{ border: `1px solid ${m.border}`, clipPath: m.clip }} />
            <div className="absolute" style={{ left: 12, top: '50%', transform: 'translateY(-50%)', right: 8 }}>
              <div style={{ font: '700 14px var(--ravenof-font-display)', color: 'var(--ravenof-text-primary)' }}>{m.title}</div>
              <div style={{ font: '400 10.5px var(--ravenof-font-body)', color: 'var(--ravenof-text-secondary)' }}>{m.sub}</div>
            </div>
          </button>
        ))}
      </div>

      {/* ── DEŠINĖ: Kas toliau · serija/sezonas · dienos užduotys ── */}
      <div className="flex flex-col min-w-0" style={{ flex: 1.1, gap: 8 }}>
        {/* Kas toliau */}
        <button onClick={() => { playUiClick(); router.push('/digital/ranked') }}
          className="ravenof-press relative overflow-hidden flex items-center text-left shrink-0"
          style={{ gap: 10, background: 'linear-gradient(100deg,#1B1522,#241a2e)', border: '1px solid rgba(212,163,59,.5)', borderLeft: '2px solid #F2C45A', padding: '8px 11px', cursor: 'pointer' }}>
          <span className="flex items-center justify-center shrink-0" style={{ width: 34, height: 34, background: 'rgba(242,196,90,.1)', border: '1px solid rgba(212,163,59,.4)' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`${A}/ranks/rank-${nx?.medalTier ?? rv?.medalTier ?? 'silver'}.png`} alt="" style={{ width: 20, height: 'auto', objectFit: 'contain' }} />
          </span>
          <span className="flex-1 min-w-0">
            <span className="block" style={{ font: '500 8px var(--ravenof-font-body)', letterSpacing: 2, color: 'var(--ravenof-gold)', textTransform: 'uppercase' }}>{t('home.nextUp')}</span>
            <span className="block truncate" style={{ font: '700 12px var(--ravenof-font-display)', color: 'var(--ravenof-text-primary)' }}>{t('home.rankedTitle')}</span>
            <span className="block truncate" style={{ font: '400 9.5px var(--ravenof-font-body)', color: 'var(--ravenof-text-secondary)' }}>
              {nx && ptsToNext ? t('home.nextRankPts', { rank: `${medalLabel(nx.medalTier)} ${toRoman(nx.rankNumber)}`, pts: ptsToNext }) : t('home.pickModeStart')}
            </span>
          </span>
          <span className="shrink-0" style={{ font: '700 17px var(--ravenof-font-display)', color: 'var(--ravenof-gold-bright)' }}>›</span>
        </button>

        {/* Serija + sezono kelias */}
        <div className="flex shrink-0" style={{ gap: 8 }}>
          <button onClick={() => { playUiClick(); setLoginOpen(true) }} className="ravenof-press text-left" style={{ flex: 1, background: 'var(--ravenof-bg-surface)', border: '1px solid var(--ravenof-border-hairline)', borderLeft: '2px solid var(--ravenof-gold)', padding: '8px 10px', cursor: 'pointer' }}>
            <div style={{ font: '500 8.5px var(--ravenof-font-body)', letterSpacing: 1.5, color: 'var(--ravenof-text-secondary)', textTransform: 'uppercase' }}>{t('home.streakLabel')}</div>
            <div className="flex items-baseline" style={{ gap: 4, marginTop: 2 }}>
              <span style={{ font: '700 17px var(--ravenof-font-display)', color: 'var(--ravenof-gold-bright)' }}>{streak}</span>
              <span style={{ font: '400 10px var(--ravenof-font-body)', color: 'var(--ravenof-text-secondary)' }}>{t('home.daysRow')}</span>
            </div>
          </button>
          <button data-testid="season-track-btn" onClick={() => { playUiClick(); setSeasonOpen(true) }} className="ravenof-press text-left relative" style={{ flex: 1, background: 'var(--ravenof-bg-surface)', border: '1px solid var(--ravenof-border-hairline)', borderLeft: '2px solid var(--ravenof-fac-vryhioko)', padding: '8px 10px', cursor: 'pointer' }}>
            <div style={{ font: '500 8.5px var(--ravenof-font-body)', letterSpacing: 1.5, color: 'var(--ravenof-text-secondary)', textTransform: 'uppercase' }}>{t('home.seasonPathLabel')}</div>
            <div className="flex items-baseline" style={{ gap: 4, marginTop: 2 }}>
              <span style={{ font: '700 17px var(--ravenof-font-display)', color: 'var(--ravenof-text-primary)' }}>{season.cur}</span>
              <span style={{ font: '400 10px var(--ravenof-font-body)', color: 'var(--ravenof-text-secondary)' }}>/ {season.total} {t('home.levelWord')}</span>
            </div>
            {seasonClaimable > 0 && <span className="absolute" style={{ top: 6, right: 8, width: 8, height: 8, borderRadius: '50%', background: 'var(--ravenof-gold-bright)', boxShadow: '0 0 8px rgba(242,196,90,.8)' }} />}
          </button>
        </div>

        {/* Dienos užduotys */}
        <button onClick={() => { playUiClick(); setDailyOpen(true) }} className="flex items-baseline justify-between shrink-0 text-left" style={{ background: 'none', border: 0, padding: 0, cursor: 'pointer' }}>
          <span style={{ font: '700 11px var(--ravenof-font-display)', letterSpacing: 1, color: 'var(--ravenof-text-primary)', textTransform: 'uppercase' }}>{t('home.dailyQuests')}</span>
          <span style={{ font: '400 10px var(--ravenof-font-body)', color: 'var(--ravenof-text-secondary)' }}>{t('home.resetsIn')} {countdown}</span>
        </button>
        <div className="flex-1 flex flex-col min-h-0" style={{ gap: 6 }}>
          {tasks.length === 0 && (
            <div className="flex-1 flex flex-col items-center justify-center text-center" style={{ gap: 8, background: 'var(--ravenof-bg-surface-2)', border: '1px solid var(--ravenof-border-hairline)', padding: '8px 10px' }}>
              <span style={{ font: '400 11px var(--ravenof-font-body)', color: 'var(--ravenof-text-secondary)' }}>{!questsLoaded ? t('common.loading') : t('home.noQuestsToday')}</span>
              {questsLoaded && (
                <button onClick={() => { playUiClick(); setLoginOpen(true) }} className="ravenof-btn ravenof-btn-secondary" style={{ minHeight: 34, padding: '7px 12px', fontSize: 10 }}>
                  {loginClaimable ? t('home.monthlyReady') : t('home.monthlyGifts')}
                </button>
              )}
            </div>
          )}
          {tasks.slice(0, 3).map((task) => {
            const pct = Math.min(100, Math.round((task.progress / Math.max(1, task.target)) * 100))
            const ready = task.completed && !task.claimed
            return (
              <div key={task.id} className="flex items-center min-h-0" style={{ flex: 1, gap: 9, background: 'var(--ravenof-bg-surface-2)', border: '1px solid var(--ravenof-border-hairline)', padding: '5px 10px' }}>
                <button onClick={() => { playUiClick(); setDailyOpen(true) }} className="shrink-0" style={{ width: 30, height: 30, background: 'none', border: 0, padding: 0, cursor: 'pointer' }} aria-label={t('home.dailyQuests')}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`${A}/rewards/daily-quest-token.png`} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                </button>
                <button onClick={() => { playUiClick(); setDailyOpen(true) }} className="flex-1 min-w-0 text-left" style={{ background: 'none', border: 0, padding: 0, cursor: 'pointer' }}>
                  <div className="truncate" style={{ font: '500 11px var(--ravenof-font-body)', color: task.claimed ? 'var(--ravenof-text-secondary)' : 'var(--ravenof-text-primary)' }}>{tc('daily_task', task.templateId, 'title', task.title)}</div>
                  <div className="ravenof-progress" style={{ marginTop: 4 }}>
                    <span style={{ width: `${pct}%`, background: task.completed ? 'var(--ravenof-gold)' : `rgb(${DIFF_ACCENT[task.difficulty] ?? '212,163,59'})` }} />
                  </div>
                </button>
                {ready ? (
                  <button onClick={() => void claimTask(task)} className="shrink-0" style={{ font: '700 9.5px var(--ravenof-font-display)', color: 'var(--ravenof-on-gold)', background: 'var(--ravenof-grad-gold)', padding: '6px 9px', border: 0, cursor: 'pointer', clipPath: 'polygon(5px 0,100% 0,calc(100% - 5px) 100%,0 100%)', animation: 'ravenofPulse 2.4s infinite' }}>{t('quests.claim')}</button>
                ) : (
                  <span className="shrink-0" style={{ font: '400 10.5px var(--ravenof-font-body)', color: task.claimed ? 'var(--ravenof-success-bright)' : 'var(--ravenof-text-secondary)' }}>{task.claimed ? '✓' : `${task.progress}/${task.target}`}</span>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Modalai (visi išsaugoti) ── */}
      {seasonOpen && <SeasonPathModal onClose={() => setSeasonOpen(false)} onReward={() => { refreshBalances(); refreshWallet() }} />}
      {dailyOpen && <DailyTasksModal onClose={() => { setDailyOpen(false); refreshQuests() }} onReward={() => { refreshBalances(); refreshWallet(); refreshQuests() }} />}
      {loginOpen && <MonthlyLoginModal onClose={() => { setLoginOpen(false); refreshBalances(); getMonthlyLogin().then((ml) => setLoginClaimable(!!ml && !ml.claimedToday && ml.nextDay <= ml.daysInMonth)) }} onClaimed={() => { refreshBalances(); setLoginClaimable(false) }} />}

      <WelcomeReward onClaimed={() => { refreshWallet(); void getStarterDecks().then((d) => { const c = (d ?? []).filter((x) => x.claimed).length; setNewPlayer(c === 0) }) }} />

      {toast && (
        <RavenofToast style={{ top: 'auto', bottom: 'calc(24px + env(safe-area-inset-bottom, 0px))' }}>{toast}</RavenofToast>
      )}

      {/* nenaudojami tiesiogiai, bet paliekami stabilumui */}
      <span className="hidden">{claimable ? '1' : '0'}{newPlayer ? '1' : '0'}{questsPending}</span>
    </div>
  )
}
