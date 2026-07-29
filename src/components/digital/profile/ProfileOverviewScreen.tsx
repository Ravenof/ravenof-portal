'use client'
// ── Ekranai 01 / 02 · Žaidėjo profilis ──────────────────────────────────────
//  Kairėje tapatybės kortelė (portretas, vardas, viešas ID, lygis, Ranked slotas,
//  pasiekimų blokas su 3 prisegtais ženklais), dešinėje tab'ai:
//  Apžvalga · Pasiekimai · Statistika · Vieši deckai · Kolekcija · Rungtynių istorija.
//
//  mode='public' = „taip tavo profilį mato kiti": be redagavimo, be XP eigos,
//  privatumo uždengti blokai nerodomi (juos serveris grąžina kaip null).
//  Visi duomenys — iš rvn_get_profile_overview(); UI nieko neskaičiuoja.
import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useT } from '@/lib/i18n/react'
import { formatNumber } from '@/lib/i18n/core'
import { playUiClick } from '@/lib/ui-sound'
import { getAchievements, getMatchModeStats, getProfileOverview, type MatchModeStats, type ProfileOverview } from '@/lib/profile/client'
import { rankLabel, rankBadgeSrc, rankFrameSrc } from '@/lib/profile/ranks'
import { medalTierFromStep, rankNumberFromStep, rankDisplay } from '@/lib/ranked/rank'
import { AchievementBadge } from './AchievementBadge'
import { BODY, C, Cta, DISPLAY, ErrorState, isMissingRpc, Kicker, LoadingState, useCompact, useToast } from '../progression/kit'

type Tab = 'overview' | 'achievements' | 'stats' | 'decks' | 'collection' | 'history'
const TABS: Tab[] = ['overview', 'achievements', 'stats', 'decks', 'collection', 'history']

const HOLDER = 'polygon(50% 0,100% 22%,100% 78%,50% 100%,0 78%,0 22%)'

function Panel({ title, extra, children }: { title: string; extra?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rvn-prog-clip" style={{ border: `1px solid ${C.lineIn}`, background: C.raised, padding: 12, minWidth: 0 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
        <Kicker>{title}</Kicker>
        {extra}
      </div>
      <div style={{ marginTop: 9 }}>{children}</div>
    </section>
  )
}

function Tile({ label, value, sub, tone = C.bone }: { label: string; value: string; sub?: string; tone?: string }) {
  return (
    <div className="rvn-prog-clip" style={{ flex: 1, minWidth: 128, border: `1px solid ${C.lineIn}`, background: C.raised, padding: '10px 12px' }}>
      <div style={{ font: `500 8px ${BODY}`, letterSpacing: 2, color: C.label, textTransform: 'uppercase' }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 4 }}>
        <span style={{ font: `800 20px ${DISPLAY}`, color: tone, lineHeight: 1 }}>{value}</span>
        {sub && <span style={{ font: `400 10px ${BODY}`, color: C.muted }}>{sub}</span>}
      </div>
    </div>
  )
}

export function ProfileOverviewScreen({ mode = 'owner' }: { mode?: 'owner' | 'public' }) {
  const t = useT()
  const router = useRouter()
  const compact = useCompact()
  const toast = useToast()
  const isPublic = mode === 'public'

  const [data, setData] = useState<ProfileOverview | null>(null)
  const [featured, setFeatured] = useState<string[]>([])
  const [achSummary, setAchSummary] = useState<{ done: number; total: number } | null>(null)
  const [modeStats, setModeStats] = useState<MatchModeStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState<string | null | false>(false)
  const [tab, setTab] = useState<Tab>('overview')

  const load = useCallback(async () => {
    setLoading(true)
    const [o, a, ms] = await Promise.all([getProfileOverview(), getAchievements(), getMatchModeStats()])
    setLoading(false)
    if (!o) { setFailed('no_response'); return }
    if ('error' in o) { setFailed(o.error); return }
    setFailed(false); setData(o)
    if (a) { setFeatured(a.featured ?? []); setAchSummary({ done: a.completed, total: a.total }) }
    setModeStats(ms)
  }, [])
  useEffect(() => { void load() }, [load])

  if (loading && !data) return <LoadingState label={t('profile.overview.loading')} />
  if (failed) return (
    <ErrorState title={t('progression.common.errorTitle')} body={t('progression.common.errorBody')}
      retryLabel={t('progression.common.retry')} onRetry={() => void load()}
      hint={isMissingRpc(failed || '') ? t('progression.common.migrationsMissing') : null}
      detail={typeof failed === 'string' && failed !== 'no_response' ? failed : null} />
  )
  if (!data) return null

  const { identity, level, ranked, stats, topFaction, collection, publicDecks, recentAchievements, matchHistory } = data
  // ranked sistema skaičiuoja 0–149 žingsniais, profilio registras — rangu (1–50) + pakopa
  const step = ranked.rankStep
  const rankNo = step != null ? rankNumberFromStep(step) : null
  const rankTier = step != null ? medalTierFromStep(step) : null
  const lvlPct = level.xpForNextLevel && level.xpIntoLevel != null && level.xpForNextLevel > 0
    ? Math.min(100, (level.xpIntoLevel / level.xpForNextLevel) * 100) : 100

  const copyId = async () => {
    if (!identity.playerId) return
    playUiClick()
    try { await navigator.clipboard.writeText(identity.playerId); toast.show(t('profile.overview.idCopied')) }
    catch { toast.show(t('profile.overview.idCopyFailed'), 'err') }
  }

  // ── Tapatybės kortelė ─────────────────────────────────────────────────────
  const identityCard = (
    <div className="rvn-prog-scroll" style={{
      width: compact ? '100%' : 330, flex: 'none', minHeight: 0, overflowY: 'auto',
      display: 'flex', flexDirection: 'column', gap: 11,
    }}>
      <div className="rvn-prog-clip" style={{ border: `1px solid ${C.lineIn}`, background: C.raised, padding: 13, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span aria-hidden style={{
            width: 76, height: 86, flex: 'none', clipPath: HOLDER,
            background: identity.avatarUrl ? `center/cover url(${identity.avatarUrl})` : 'radial-gradient(circle at 50% 32%, #3a2a4e, #0c0a14)',
            border: `1px solid ${C.gold}`,
          }} />
          <div style={{ minWidth: 0 }}>
            <div style={{ font: `800 19px ${DISPLAY}`, color: C.bone, lineHeight: 1.15, wordBreak: 'break-word' }}>
              {identity.name ?? t('common.player')}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 5 }}>
              <span style={{ font: `400 10px ${BODY}`, color: C.muted }}>{t('profile.overview.playerId')}</span>
              <span style={{ font: `700 10.5px ui-monospace, monospace`, color: C.goldHi }}>{identity.playerId ?? '—'}</span>
              {!isPublic && (
                <button type="button" onClick={() => void copyId()} aria-label={t('profile.overview.copyId')}
                  style={{ width: 26, height: 26, border: `1px solid ${C.lineIn}`, background: 'transparent', color: C.muted, cursor: 'pointer', font: `400 11px ${BODY}` }}>⧉</button>
              )}
            </div>
          </div>
        </div>

        {isPublic ? (
          <div style={{ display: 'flex', gap: 7 }}>
            <div style={{ flex: 1 }}><Cta disabled tone="ghost" minHeight={40}>{t('profile.overview.friend')}</Cta></div>
            <div style={{ flex: 1 }}><Cta disabled tone="ghost" minHeight={40}>{t('profile.overview.challenge')}</Cta></div>
          </div>
        ) : (
          <Cta minHeight={40} tone="ghost" onClick={() => { playUiClick(); toast.show(t('profile.overview.editSoon')) }}>
            {t('profile.overview.edit')}
          </Cta>
        )}
      </div>

      {/* Paskyros lygis */}
      <div className="rvn-prog-clip" style={{ border: `1px solid ${C.lineIn}`, background: C.raised, padding: 12 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <Kicker>{t('profile.overview.accountLevel')}</Kicker>
          {!isPublic && (
            <button type="button" onClick={() => { playUiClick(); router.push('/digital/profile/levels') }}
              style={{ border: 0, background: 'transparent', color: C.gold, cursor: 'pointer', font: `600 9.5px ${BODY}`, letterSpacing: 0.6 }}>
              {t('profile.overview.allLevels')} ›
            </button>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 9, marginTop: 5 }}>
          <span style={{ font: `800 28px ${DISPLAY}`, color: C.goldHi, lineHeight: 1 }}>{level.level}</span>
          <span style={{ font: `400 10.5px ${BODY}`, color: C.muted }}>
            {isPublic || level.xpIntoLevel == null
              ? t('profile.overview.xpHidden')
              : `${formatNumber(level.xpIntoLevel)} / ${formatNumber(level.xpForNextLevel ?? 0)} XP`}
          </span>
        </div>
        {!isPublic && level.xpIntoLevel != null && (
          <div style={{ position: 'relative', height: 6, marginTop: 7, background: '#1a1420', border: `1px solid ${C.lineIn}` }}>
            <span style={{ position: 'absolute', inset: '0 auto 0 0', width: `${lvlPct}%`, background: 'linear-gradient(90deg,#8a6c2c,var(--rvn-gold-hi))' }} />
          </div>
        )}
      </div>

      {/* Ranked slotas — VIENAS kompaktiškas slotas (handoff: pilkas plienas, ne auksas) */}
      <button type="button" onClick={() => { playUiClick(); router.push('/digital/ranked') }}
        className="rvn-prog-clip"
        style={{ display: 'flex', alignItems: 'center', gap: 11, textAlign: 'left', width: '100%', minHeight: 66,
          border: `1px solid #4A4453`, background: C.raised, padding: 11, cursor: 'pointer' }}>
        <span style={{ position: 'relative', width: 40, height: 46, flex: 'none' }}>
          {rankNo != null && rankTier != null && rankBadgeSrc(rankNo) && (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={rankBadgeSrc(rankNo) as string} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain' }} />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={rankFrameSrc(rankTier)} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain' }} />
            </>
          )}
        </span>
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: 'block', font: `500 8px ${BODY}`, letterSpacing: 2, color: '#8d94a3', textTransform: 'uppercase' }}>
            {t('profile.overview.ranked')}{ranked.season ? ` · ${ranked.season}` : ''}
          </span>
          <span style={{ display: 'block', font: `700 13px ${DISPLAY}`, color: '#D6DCE6', marginTop: 2 }}>
            {/* KANONINIS formatas — tas pats kaip header/Home/Ranked (rankDisplay.full) */}
            {step != null ? rankDisplay(step).full : t('profile.overview.noRank')}
          </span>
          <span style={{ display: 'block', font: `400 9.5px ${BODY}`, color: C.label, marginTop: 1 }}>{t('profile.overview.seasonalBadge')}</span>
        </span>
        <span aria-hidden style={{ color: C.muted, font: `400 13px ${BODY}` }}>›</span>
      </button>

      {/* Pasiekimai */}
      <div className="rvn-prog-clip" style={{ border: `1px solid ${C.lineIn}`, background: C.raised, padding: 12 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <Kicker>{t('profile.nav.achievements')}</Kicker>
          {!isPublic && (
            <button type="button" onClick={() => { playUiClick(); router.push('/digital/profile/achievements') }}
              style={{ border: 0, background: 'transparent', color: C.gold, cursor: 'pointer', font: `600 9.5px ${BODY}` }}>
              {t('profile.overview.open')} ›
            </button>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 7, marginTop: 5 }}>
          <span style={{ font: `800 20px ${DISPLAY}`, color: 'var(--rvn-burgundy-fg)', lineHeight: 1 }}>{achSummary?.done ?? 0}</span>
          <span style={{ font: `600 11px ${DISPLAY}`, color: C.label }}>/ {achSummary?.total ?? 70}</span>
        </div>
        <div style={{ position: 'relative', height: 5, marginTop: 6, background: '#1a1420', border: `1px solid ${C.lineIn}` }}>
          <span style={{ position: 'absolute', inset: '0 auto 0 0', width: `${achSummary && achSummary.total ? (achSummary.done / achSummary.total) * 100 : 0}%`, background: 'linear-gradient(90deg,#6E2633,#C1566A)' }} />
        </div>
        <Kicker style={{ marginTop: 11 }}>{t('profile.ach.featuredTitle')}</Kicker>
        <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
          {Array.from({ length: 3 }, (_, i) => featured[i]).map((code, i) => (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              {code
                ? <AchievementBadge code={code} size={46} />
                : <span aria-hidden style={{ width: 46, height: 50, border: `1px dashed ${C.lineIn}` }} />}
            </div>
          ))}
        </div>
      </div>
    </div>
  )

  // ── Kompaktiškas režimas (844×390): tapatybė = VIRŠUTINĖ juosta, portretas 64 px ──
  //  Handoff §3: „identity card becomes a full-width top band (portrait 64 px),
  //  overview becomes a single horizontally-snapping column set."
  const chip = (label: string, value: string, tone = C.bone, onClick?: () => void) => (
    <button type="button" onClick={onClick} disabled={!onClick}
      style={{
        flex: 'none', minHeight: 44, display: 'flex', flexDirection: 'column', justifyContent: 'center',
        gap: 1, padding: '0 10px', border: `1px solid ${C.lineIn}`, background: 'rgba(7,6,10,.6)',
        cursor: onClick ? 'pointer' : 'default', textAlign: 'left',
      }}>
      <span style={{ font: `500 7.5px ${BODY}`, letterSpacing: 1.6, color: C.label, textTransform: 'uppercase' }}>{label}</span>
      <span style={{ font: `800 13px ${DISPLAY}`, color: tone, lineHeight: 1 }}>{value}</span>
    </button>
  )

  const identityBand = (
    <div style={{ flex: 'none', display: 'flex', alignItems: 'center', gap: 9, padding: '8px 12px', borderBottom: `1px solid #1e1a26`, overflowX: 'auto' }}>
      <span aria-hidden style={{
        width: 56, height: 64, flex: 'none', clipPath: HOLDER,
        background: identity.avatarUrl ? `center/cover url(${identity.avatarUrl})` : 'radial-gradient(circle at 50% 32%, #3a2a4e, #0c0a14)',
        border: `1px solid ${C.gold}`,
      }} />
      <span style={{ minWidth: 0, flex: 'none' }}>
        <span style={{ display: 'block', font: `800 14px ${DISPLAY}`, color: C.bone, lineHeight: 1.15 }}>{identity.name ?? t('common.player')}</span>
        <span style={{ display: 'block', font: `700 9px ui-monospace, monospace`, color: C.goldHi, marginTop: 2 }}>{identity.playerId ?? '—'}</span>
      </span>
      {chip(t('profile.overview.accountLevel'), String(level.level), C.goldHi, isPublic ? undefined : () => { playUiClick(); router.push('/digital/profile/levels') })}
      {chip(t('profile.overview.ranked'), rankNo != null ? String(rankNo) : '—', '#D6DCE6', () => { playUiClick(); router.push('/digital/ranked') })}
      {chip(t('profile.nav.achievements'), `${achSummary?.done ?? 0}/${achSummary?.total ?? 70}`, 'var(--rvn-burgundy-fg)', isPublic ? undefined : () => { playUiClick(); router.push('/digital/profile/achievements') })}
      {!isPublic && (
        <button type="button" onClick={() => { playUiClick(); toast.show(t('profile.overview.editSoon')) }}
          style={{ flex: 'none', minHeight: 44, padding: '0 11px', border: `1px solid ${C.gold}`, background: 'transparent', color: C.bone, cursor: 'pointer', font: `700 9.5px ${DISPLAY}`, letterSpacing: 1, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
          {t('profile.overview.edit')}
        </button>
      )}
    </div>
  )

  // ── Tab'ų turinys ─────────────────────────────────────────────────────────
  // Statistika ATSKIRAI pagal režimą (audit #24): bendras skaičius rodomas tik
  // su aiškia sudėtimi; reitingo win-rate NEmaišomas su DI treniruotėmis.
  const bm = modeStats?.byMode
  const modeTile = (key: 'bot' | 'unranked' | 'ranked', label: string) => {
    const st = bm?.[key]
    if (!st) return null
    return <Tile key={key} label={label} value={`${st.winRate}%`} sub={t('profile.overview.modeRecord', { wins: st.wins, matches: st.matches })} />
  }
  const tiles = (
    <div style={{ display: 'flex', gap: 9, flexWrap: 'wrap' }}>
      <Tile label={t('profile.overview.matches')} value={formatNumber(stats.matches)} sub={t('profile.overview.allModesNote')} />
      <Tile label={t('profile.overview.wins')} value={formatNumber(stats.wins)} sub={t('profile.overview.overallRate', { rate: stats.winRate })} tone={C.goldHi} />
      {modeTile('ranked', t('profile.overview.modeRanked'))}
      {modeTile('unranked', t('profile.overview.modeCasual'))}
      {modeTile('bot', t('profile.overview.modeAi'))}
      <Tile label={t('profile.overview.rankedWins')} value={formatNumber(ranked.wins)} sub={ranked.season ?? ''} />
      <Tile label={t('profile.overview.longestStreak')} value={formatNumber(stats.longestStreak)} sub={t('profile.overview.winsShort')} />
    </div>
  )

  const collectionPanel = collection ? (
    <Panel title={t('profile.overview.collection')}
      extra={!isPublic ? (
        <button type="button" onClick={() => { playUiClick(); router.push('/digital/collection') }}
          style={{ border: 0, background: 'transparent', color: C.gold, cursor: 'pointer', font: `600 9.5px ${BODY}` }}>
          {t('profile.overview.openCollection')} ›
        </button>) : undefined}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <span style={{ font: `800 20px ${DISPLAY}`, color: C.bone }}>{collection.pct}%</span>
        <span style={{ font: `400 10px ${BODY}`, color: C.muted }}>
          {t('profile.overview.uniqueCards', { owned: formatNumber(collection.owned), total: formatNumber(collection.total) })}
        </span>
      </div>
      <div style={{ position: 'relative', height: 6, marginTop: 7, background: '#1a1420', border: `1px solid ${C.lineIn}` }}>
        <span style={{ position: 'absolute', inset: '0 auto 0 0', width: `${collection.pct}%`, background: 'linear-gradient(90deg,#3f5f8f,#5A86BD)' }} />
      </div>
      <div style={{ display: 'flex', gap: 7, marginTop: 10, flexWrap: 'wrap' }}>
        {collection.byRarity.map((r) => (
          <div key={r.rarity} style={{ flex: 1, minWidth: 84, border: `1px solid ${C.lineIn}`, padding: '7px 8px', textAlign: 'center' }}>
            <div style={{ font: `800 15px ${DISPLAY}`, color: C.bone }}>{r.owned}</div>
            <div style={{ font: `400 9px ${BODY}`, color: C.label }}>{r.rarity} · {r.total}</div>
          </div>
        ))}
      </div>
    </Panel>
  ) : (
    <Panel title={t('profile.overview.collection')}>
      <span style={{ font: `400 10.5px ${BODY}`, color: C.label }}>{t('profile.overview.hiddenByOwner')}</span>
    </Panel>
  )

  const decksPanel = (
    <Panel title={t('profile.overview.publicDecks')}>
      {!publicDecks ? <span style={{ font: `400 10.5px ${BODY}`, color: C.label }}>{t('profile.overview.hiddenByOwner')}</span>
        : publicDecks.length === 0 ? <span style={{ font: `400 10.5px ${BODY}`, color: C.label }}>{t('profile.overview.noDecks')}</span>
        : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {publicDecks.map((d) => (
              <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 9, border: `1px solid ${C.lineIn}`, background: 'rgba(7,6,10,.5)', padding: '8px 10px' }}>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: 'block', font: `700 11.5px ${DISPLAY}`, color: C.bone }}>{d.name}</span>
                  <span style={{ display: 'block', font: `400 9.5px ${BODY}`, color: C.label }}>{d.faction ?? '—'} · {d.cardCount}</span>
                </span>
                <span style={{ font: `700 11px ${DISPLAY}`, color: C.goldHi }}>{d.score > 0 ? `+${d.score}` : d.score}</span>
              </div>
            ))}
          </div>
        )}
    </Panel>
  )

  const historyPanel = (
    <Panel title={t('profile.overview.matchHistory')}>
      {!matchHistory ? <span style={{ font: `400 10.5px ${BODY}`, color: C.label }}>{t('profile.overview.hiddenByOwner')}</span>
        : matchHistory.length === 0 ? <span style={{ font: `400 10.5px ${BODY}`, color: C.label }}>{t('profile.overview.noMatches')}</span>
        : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {matchHistory.map((m, i) => {
              const win = m.result === 'win'
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 9, borderLeft: `2px solid ${win ? 'var(--rvn-green)' : '#8D2D38'}`, background: 'rgba(7,6,10,.5)', padding: '7px 10px' }}>
                  <span style={{ font: `700 9px ${DISPLAY}`, letterSpacing: 1, color: win ? 'var(--rvn-green-fg)' : '#c0616c', textTransform: 'uppercase' }}>
                    {win ? t('profile.overview.win') : t('profile.overview.loss')}
                  </span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: 'block', font: `700 11px ${DISPLAY}`, color: C.bone }}>
                      {m.opponent ?? t(`profile.overview.mode.${m.mode}`)}
                    </span>
                    <span style={{ display: 'block', font: `400 9.5px ${BODY}`, color: C.label }}>
                      {t(`profile.overview.mode.${m.mode}`)}{m.turns ? ` · ${t('profile.overview.turns', { n: m.turns })}` : ''}
                    </span>
                  </span>
                </div>
              )
            })}
          </div>
        )}
    </Panel>
  )

  const achPanel = (
    <Panel title={t('profile.overview.recentAchievements')}
      extra={!isPublic ? (
        <button type="button" onClick={() => { playUiClick(); router.push('/digital/profile/achievements') }}
          style={{ border: 0, background: 'transparent', color: C.gold, cursor: 'pointer', font: `600 9.5px ${BODY}` }}>
          {t('profile.overview.all')} ›
        </button>) : undefined}>
      {!recentAchievements ? <span style={{ font: `400 10.5px ${BODY}`, color: C.label }}>{t('profile.overview.hiddenByOwner')}</span>
        : recentAchievements.length === 0 ? <span style={{ font: `400 10.5px ${BODY}`, color: C.label }}>{t('profile.overview.noAchievements')}</span>
        : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {recentAchievements.map((a) => (
              <div key={a.code} style={{ display: 'flex', alignItems: 'center', gap: 9, border: `1px solid ${C.lineIn}`, background: 'rgba(7,6,10,.5)', padding: '7px 10px' }}>
                <AchievementBadge code={a.code} size={30} />
                <span style={{ font: `700 11px ${DISPLAY}`, color: C.bone }}>{a.nameLt}</span>
              </div>
            ))}
          </div>
        )}
    </Panel>
  )

  const statsPanel = (
    <Panel title={t('profile.overview.seasonRanked')}>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        {[
          [t('profile.overview.matches'), formatNumber(ranked.wins + ranked.losses)],
          [t('profile.overview.wins'), formatNumber(ranked.wins)],
          [t('profile.overview.streak'), formatNumber(ranked.winStreak)],
          [t('profile.overview.bestStreak'), formatNumber(ranked.bestWinStreak)],
        ].map(([l, v]) => (
          <div key={l}>
            <div style={{ font: `800 19px ${DISPLAY}`, color: C.bone }}>{v}</div>
            <div style={{ font: `400 9px ${BODY}`, letterSpacing: 1.2, color: C.label, textTransform: 'uppercase' }}>{l}</div>
          </div>
        ))}
      </div>
      {topFaction && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginTop: 12, border: `1px solid ${C.lineIn}`, background: 'rgba(7,6,10,.5)', padding: '8px 10px' }}>
          <span style={{ font: `500 8px ${BODY}`, letterSpacing: 2, color: C.label, textTransform: 'uppercase' }}>{t('profile.overview.topFaction')}</span>
          <span style={{ font: `700 12px ${DISPLAY}`, color: C.bone }}>{topFaction.faction}</span>
          <span style={{ font: `400 10px ${BODY}`, color: C.muted }}>· {topFaction.pct}%</span>
        </div>
      )}
    </Panel>
  )

  const body = () => {
    if (tab === 'achievements') return <div style={{ display: 'grid', gap: 10 }}>{achPanel}</div>
    if (tab === 'stats') return <div style={{ display: 'grid', gap: 10 }}>{tiles}{statsPanel}</div>
    if (tab === 'decks') return <div style={{ display: 'grid', gap: 10 }}>{decksPanel}</div>
    if (tab === 'collection') return <div style={{ display: 'grid', gap: 10 }}>{collectionPanel}</div>
    if (tab === 'history') return <div style={{ display: 'grid', gap: 10 }}>{historyPanel}</div>
    if (compact) {
      // 390 px aukštyje vertikalus krovimas nuvaro turinį už ekrano ribų —
      // handoff numato horizontaliai slenkamą stulpelių rinkinį.
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, height: '100%', minHeight: 0 }}>
          <div className="rvn-prog-scroll" style={{ flex: 'none', display: 'flex', gap: 7, overflowX: 'auto' }}>{tiles}</div>
          <div className="rvn-prog-scroll" style={{ flex: 1, minHeight: 0, display: 'flex', gap: 9, overflowX: 'auto', scrollSnapType: 'x mandatory' }}>
            {[statsPanel, collectionPanel, decksPanel, achPanel, historyPanel].map((p, i) => (
              <div key={i} style={{ flex: 'none', width: 248, scrollSnapAlign: 'start', overflowY: 'auto' }}>{p}</div>
            ))}
          </div>
        </div>
      )
    }
    return (
      <div style={{ display: 'grid', gap: 10 }}>
        {tiles}
        <div style={{ display: 'grid', gap: 10, gridTemplateColumns: '1fr 1fr' }}>
          {statsPanel}
          {collectionPanel}
        </div>
        <div style={{ display: 'grid', gap: 10, gridTemplateColumns: '1fr 1fr 1fr' }}>
          {decksPanel}
          {achPanel}
          {historyPanel}
        </div>
      </div>
    )
  }

  return (
    <div className="rvn-prog-in" style={{ height: '100%', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      {/* Kompaktiškame režime antraštės bloko NĖRA — vardas jau matomas juostoje,
          o vertikalios vietos 390 px aukštyje nelieka (handoff §3). */}
      {!compact && (
        <div style={{ flex: 'none', padding: '11px 18px', borderBottom: `1px solid #1e1a26` }}>
          <div style={{ font: `800 17px ${DISPLAY}`, color: C.bone, letterSpacing: 0.5, textTransform: 'uppercase' }}>
            {isPublic ? t('profile.overview.publicTitle') : t('profile.overview.title')}
          </div>
          <div style={{ font: `400 10px ${BODY}`, color: C.muted, marginTop: 2 }}>
            {isPublic ? t('profile.overview.publicSubtitle') : t('profile.overview.subtitle')}
          </div>
        </div>
      )}
      {compact && identityBand}

      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: compact ? 'column' : 'row', gap: 12, padding: compact ? '8px 10px' : '14px 18px' }}>
        {!compact && identityCard}

        <div style={{ flex: 1, minWidth: 0, minHeight: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div className="rvn-prog-scroll" style={{ flex: 'none', display: 'flex', gap: 6, overflowX: 'auto' }}>
            {TABS.map((k) => {
              const on = tab === k
              return (
                <button key={k} type="button" onClick={() => { playUiClick(); setTab(k) }} aria-pressed={on}
                  style={{
                    minHeight: 44, flex: 'none', padding: '0 13px', cursor: 'pointer', whiteSpace: 'nowrap',
                    border: `1px solid ${on ? C.gold : C.lineIn}`, background: on ? 'rgba(198,161,79,.1)' : 'rgba(7,6,10,.6)',
                    color: on ? C.goldHi : C.muted, font: `600 10.5px ${DISPLAY}`, letterSpacing: 1, textTransform: 'uppercase',
                  }}>
                  {t(`profile.overview.tab.${k}`)}
                </button>
              )
            })}
          </div>
          <div className="rvn-prog-scroll" style={{ flex: 1, minHeight: 0, overflowY: 'auto', paddingRight: 2 }}>{body()}</div>
        </div>
      </div>
      {toast.node}
    </div>
  )
}
