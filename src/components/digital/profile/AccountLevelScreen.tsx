'use client'
// ── Paskyros lygis 1–50 (848 pertvarka) ─────────────────────────────────────
//  Planas: „Ravenof – paskyros lygių pertvarka" (2026-11-28). Ekranas atsako į tris
//  klausimus iškart: kur aš esu, ką gausiu toliau ir ką daryti, kad gaučiau.
//
//  Viršus     – pakopos emblema, lygis, titulas · XP juosta su „liko X XP" · kitas atlygis
//  Pakopos    – 10 pakopų eilutė (paspaudus kelias nušoka į tą pakopą)
//  Kelias     – plytelės, kuriose dominuoja ATLYGIS, o lygio skaičius mažas kampe;
//               būseną rodo pati plytelė (legendos nebėra); atrakinimai su rakto ženklu
//  Apačia     – pasirinkto lygio detalės · „Kaip gauti XP" · „Tavo kelias"
//
//  SVARBU: visos reikšmės iš rvn_get_account_level() — UI neskaičiuoja nei XP ribų,
//  nei atlygių, nei būsenų. Nauji laukai (tiers, prestige, unlocks, xpSources, matchXp)
//  yra neprivalomi: su senesne serverio versija ekranas veikia be jų.
//  Pasirinkimai eina per TĄ PATĮ ChoiceQueue kanalą kaip sezonas ir dienos užduotys.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, KeyRound } from 'lucide-react'
import { useT } from '@/lib/i18n/react'
import { formatNumber } from '@/lib/i18n/core'
import { playUiClick } from '@/lib/ui-sound'
import { getAccountLevel, type AccountLevelCell, type AccountLevelState } from '@/lib/profile/client'
import {
  BODY, C, Cta, DISPLAY, ErrorState, isMissingRpc, Kicker, LoadingState,
  RewardChip, RewardIcon, rewardLabel,
} from '../progression/kit'
import { ChoiceQueue } from '../progression/ChoiceModals'
import { DT } from '../ui/deskTokens'
import { LevelEmblem } from '../ui/LevelEmblem'
import { useProfileUi } from './profileDesk'

type Tier = { key: string; from: number; to: number }

export function AccountLevelScreen() {
  const t = useT()
  const router = useRouter()
  const { desk, compact } = useProfileUi()
  /** mobile / desktop reikšmė */
  const fz = <T,>(m: T, d: T): T => (desk ? d : m)
  const [state, setState] = useState<AccountLevelState | null>(null)
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState<string | null | false>(false)
  const [sel, setSel] = useState<number | null>(null)
  const [choicesOpen, setChoicesOpen] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const r = await getAccountLevel()
    setLoading(false)
    if (!r) { setFailed('no_response'); return }
    if ('error' in r) { setFailed(r.error); return }
    setFailed(false)
    setState(r)
    setSel((prev) => prev ?? Math.min(50, Math.max(2, r.level >= 50 ? 50 : r.level + 1)))
  }, [])
  useEffect(() => { void load() }, [load])

  const trackRef = useRef<HTMLDivElement | null>(null)
  const hasState = state !== null
  const [edges, setEdges] = useState<{ l: boolean; r: boolean }>({ l: false, r: false })
  const updateEdges = useCallback(() => {
    const tr = trackRef.current
    if (!tr) return
    const l = tr.scrollLeft > 2
    const r = tr.scrollLeft + tr.clientWidth < tr.scrollWidth - 2
    setEdges((p) => (p.l === l && p.r === r ? p : { l, r }))
  }, [])
  const scrollToLevel = useCallback((level: number, smooth: boolean) => {
    const tr = trackRef.current
    const el = tr?.querySelector(`[data-level="${level}"]`) as HTMLElement | null
    if (!tr || !el) return
    const left = Math.max(0, el.offsetLeft - (tr.clientWidth - el.offsetWidth) / 2)
    if (smooth) tr.scrollTo({ left, behavior: 'smooth' })
    else tr.scrollLeft = left
    updateEdges()
  }, [updateEdges])
  // Atidarius – dabartinis lygis matomos zonos viduryje
  useEffect(() => {
    if (!state) return
    scrollToLevel(state.level, false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state?.level, state === null, desk])
  useEffect(() => {
    const tr = trackRef.current
    if (!tr) return
    updateEdges()
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(updateEdges) : null
    ro?.observe(tr)
    return () => ro?.disconnect()
  }, [desk, hasState, updateEdges])
  const scrollTrack = (dir: -1 | 1) => {
    const tr = trackRef.current
    if (!tr) return
    playUiClick()
    tr.scrollBy({ left: dir * Math.max(200, tr.clientWidth * 0.8), behavior: 'smooth' })
  }

  const selected = useMemo(() => state?.track.find((c) => c.level === sel) ?? null, [state, sel])
  const tiers: Tier[] = useMemo(() => (state?.tiers ?? []).filter((x) => x.key !== 'prestige'), [state])
  const tierOf = useCallback((level: number): Tier | null => {
    const all = state?.tiers ?? []
    return all.find((x) => level >= x.from && level <= x.to) ?? null
  }, [state])
  /** lygis → jame atrakinamos funkcijos */
  const unlocksAt = useMemo(() => {
    const m = new Map<number, string[]>()
    for (const [f, lvl] of Object.entries(state?.unlocks ?? {})) {
      if (f === 'pveNormal' || f === 'pveHard' || f === 'season') continue // smulkūs – rodomi tik detalėse
      m.set(lvl, [...(m.get(lvl) ?? []), f])
    }
    return m
  }, [state])
  const unlocksAtFull = useCallback((level: number): string[] =>
    Object.entries(state?.unlocks ?? {}).filter(([, l]) => l === level).map(([f]) => f), [state])
  /** jau surinkta (iš atsiimtų lygių) */
  const collected = useMemo(() => {
    const sum = { boosters: 0, silver: 0, essence: 0, rubies: 0, cards: 0 }
    for (const c of state?.track ?? []) {
      if (c.state !== 'claimed' && c.state !== 'pending') continue
      for (const r of c.rewards) {
        if (r.type === 'silver') sum.silver += r.amount
        else if (r.type === 'essence') sum.essence += r.amount
        else if (r.type === 'rubies') sum.rubies += r.amount
        else if (r.type === 'faction_booster_choice') sum.boosters += r.quantity
        else if (r.type === 'card_choice') sum.cards += 1
      }
    }
    return sum
  }, [state])

  if (loading && !state) return <LoadingState label={t('profile.level.loading')} />
  if (failed) return (
    <ErrorState title={t('progression.common.errorTitle')} body={t('progression.common.errorBody')}
      retryLabel={t('progression.common.retry')} onRetry={() => void load()}
      hint={isMissingRpc(failed || '') ? t('progression.common.migrationsMissing') : null}
      detail={typeof failed === 'string' && failed !== 'no_response' ? failed : null} />
  )
  if (!state) return null

  const prestige = state.prestige ?? null
  const inPrestige = !!prestige && prestige.active && state.isMaxLevel
  const barInto = inPrestige ? prestige!.xpIntoLoop : state.xpIntoLevel
  const barOf = inPrestige ? prestige!.everyXp : state.xpForNextLevel
  const pct = barOf <= 0 ? 100 : Math.min(100, (barInto / barOf) * 100)
  const xpLeft = Math.max(0, barOf - barInto)
  // apytikslis kovų skaičius: reitingo pergalės ir pralaimėjimo vidurkis (serverio skaičiai)
  const rk = state.matchXp?.ranked
  const avgXp = rk ? (rk.win + rk.loss) / 2 : 0
  const matchesLeft = avgXp > 0 && xpLeft > 0 ? Math.ceil(xpLeft / avgXp) : null
  const nextCell = state.track.find((c) => c.level === state.level + 1) ?? null
  const nextMilestones = state.track.filter((c) => c.milestone && c.level > state.level).slice(0, 3)
  const pendingCount = state.pendingChoices.length
  const curTier = tierOf(state.level)
  const tierName = (x: Tier | null) => (x ? t(`profile.level.tier.${x.key}`) : '')
  const tierNo = curTier ? Math.max(1, (state.tiers ?? []).findIndex((x) => x.key === curTier.key) + 1) : null

  // ── Kelio plytelė ─────────────────────────────────────────────────────────
  const cell = (c: AccountLevelCell) => {
    const on = sel === c.level
    const cur = state.level === c.level
    const done = c.state === 'claimed'
    const pend = c.state === 'pending'
    const future = c.state === 'future'
    const w = desk ? (c.milestone ? 188 : 108) : c.milestone ? 132 : 80
    const icon = desk ? (c.milestone ? 62 : 54) : c.milestone ? 40 : 34
    const unl = unlocksAt.get(c.level) ?? []
    const first = c.rewards[0]
    return (
      <button key={c.level} type="button" data-level={c.level} onClick={() => { playUiClick(); setSel(c.level) }}
        aria-pressed={on} aria-label={t('profile.level.cellAria', { level: c.level })} aria-current={cur ? 'step' : undefined}
        style={{
          position: 'relative', width: w, minHeight: fz(124, 172), flex: 'none', overflow: 'hidden',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between', gap: fz(4, 6),
          border: `${on || cur || pend ? 2 : 1}px solid ${on || cur ? C.goldHi : pend ? C.gold : c.milestone ? 'rgba(198,161,79,.45)' : C.lineIn}`,
          background: c.milestone ? 'linear-gradient(180deg,rgba(198,161,79,.16),#110d18)' : cur ? 'linear-gradient(180deg,rgba(198,161,79,.12),#110d18)' : C.raised,
          boxShadow: on ? '0 0 20px rgba(226,185,88,.32)' : undefined,
          transform: cur && desk ? 'translateY(-4px)' : undefined,
          cursor: 'pointer', padding: fz('6px 5px', '9px 8px'),
        }}>
        <span style={{ alignSelf: 'stretch', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4 }}>
          <span style={{ font: `800 ${fz(11, 15)}px ${DISPLAY}`, color: cur ? C.goldHi : C.label, lineHeight: 1 }}>{c.level}</span>
          {done && <Check size={fz(11, 15)} color="var(--rvn-green-fg)" aria-hidden />}
          {pend && <span style={{ font: `700 ${fz(8, 11)}px ${BODY}`, letterSpacing: 1, textTransform: 'uppercase', color: C.goldHi }}>{t('profile.level.tagChoose')}</span>}
          {!done && !pend && c.milestone && <span style={{ font: `700 ${fz(8, 11)}px ${BODY}`, letterSpacing: 1, textTransform: 'uppercase', color: C.gold }}>{t('profile.level.milestone')}</span>}
        </span>

        <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: fz(4, 8), opacity: done ? 0.55 : 1, filter: future ? 'grayscale(1) brightness(.8)' : undefined }}>
          {c.level === 1 || c.rewards.length === 0
            ? <LevelEmblem level={c.level} size={icon} showLevel={false} title={t('profile.level.start')} />
            : c.rewards.slice(0, c.milestone ? 3 : 1).map((r, i) => <RewardIcon key={i} reward={r} size={c.milestone && c.rewards.length > 2 ? Math.round(icon * 0.78) : icon} />)}
          {c.milestone && c.rewards.length < 3 && <LevelEmblem level={c.level} size={Math.round(icon * 0.82)} showLevel={false} title={tierName(tierOf(c.level))} />}
        </span>

        <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, minWidth: 0, maxWidth: '100%' }}>
          <span style={{ font: `700 ${fz(10.5, 15)}px ${BODY}`, color: done ? C.muted : C.bone, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>
            {c.milestone ? tierName(tierOf(c.level)) : first ? rewardLabel(first) : t('profile.level.start')}
          </span>
          {unl.length > 0 ? (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, font: `600 ${fz(8.5, 12)}px ${BODY}`, color: C.goldHi, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>
              <KeyRound size={fz(9, 12)} aria-hidden /> {t(`profile.unlock.short.${unl[0]}`)}
            </span>
          ) : (
            <span style={{ font: `400 ${fz(8.5, 12)}px ${BODY}`, color: C.muted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>
              {c.milestone && first ? rewardLabel(first) : first ? t(`progression.reward.${first.type}`) : ''}
            </span>
          )}
        </span>

        {c.state === 'next' && (
          <span aria-hidden style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 3, background: '#1a1420' }}>
            <span style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${pct}%`, background: 'var(--rvn-gold-hi)' }} />
          </span>
        )}
      </button>
    )
  }

  // ── Pasirinkto lygio detalės (bendra desktop ir mobile) ───────────────────
  const detail = (big: boolean) => !selected ? (
    <div style={{ font: `400 ${big ? DT.fs.help : 11}px ${BODY}`, color: C.label }}>{t('profile.level.pickLevel')}</div>
  ) : (
    <>
      <div>
        <Kicker color={selected.milestone ? C.gold : C.label} style={big ? { fontSize: DT.fs.label, letterSpacing: 1.8 } : undefined}>
          {selected.milestone ? `${t('profile.level.milestone')} · ${tierName(tierOf(selected.level))}` : t(`profile.level.state.${selected.state}`)}
        </Kicker>
        <div style={{ font: `800 ${big ? 26 : 20}px ${DISPLAY}`, color: C.bone, marginTop: 3, lineHeight: 1.15 }}>
          {t('profile.level.levelN', { level: selected.level })}
        </div>
        <div style={{ font: `400 ${big ? DT.fs.help : 10}px ${BODY}`, color: C.muted, marginTop: 3 }}>
          {selected.level > state.level
            ? t('profile.level.xpLeftTo', { xp: formatNumber(Math.max(0, selected.xpRequired - state.totalXp)) })
            : t('profile.level.xpRequired', { xp: formatNumber(selected.xpRequired) })}
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: big ? 8 : 6 }}>
        {selected.rewards.length === 0
          ? <span style={{ font: `400 ${big ? DT.fs.help : 10.5}px ${BODY}`, color: C.label }}>{t('profile.level.noRewards')}</span>
          : selected.rewards.map((r, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: big ? 12 : 9, border: `1px solid ${C.lineIn}`, background: 'rgba(7,6,10,.5)', padding: big ? '8px 12px' : '7px 9px' }}>
              <RewardIcon reward={r} size={big ? 34 : 22} />
              <span style={{ font: `700 ${big ? DT.fs.body : 11}px ${BODY}`, color: C.goldHi }}>
                {rewardLabel(r)} <span style={{ fontWeight: 400, color: C.muted }}>{t(`progression.reward.${r.type}`)}</span>
              </span>
            </div>
          ))}
        {unlocksAtFull(selected.level).map((f) => (
          <div key={f} style={{ display: 'flex', alignItems: 'center', gap: big ? 12 : 9, border: '1px solid rgba(198,161,79,.45)', background: 'rgba(198,161,79,.08)', padding: big ? '8px 12px' : '7px 9px' }}>
            <KeyRound size={big ? 20 : 15} color="var(--rvn-gold-hi)" aria-hidden />
            <span style={{ font: `700 ${big ? DT.fs.body : 11}px ${BODY}`, color: C.bone }}>
              {t('profile.level.unlocks')} <span style={{ color: C.goldHi }}>{t(`profile.unlock.feature.${f}`)}</span>
            </span>
          </div>
        ))}
      </div>
      {selected.state === 'pending' && (
        <Cta minHeight={big ? DT.cta : 44} onClick={() => { playUiClick(); setChoicesOpen(true) }}>{t('profile.level.actChoose')}</Cta>
      )}
      {selected.state === 'pending' && (
        <p style={{ font: `400 ${big ? DT.fs.help : 9.5}px ${BODY}`, color: C.muted, lineHeight: 1.45, margin: 0 }}>{t('profile.level.choiceNote')}</p>
      )}
    </>
  )

  const xpLine = inPrestige
    ? `${formatNumber(barInto)} / ${formatNumber(barOf)} XP`
    : state.isMaxLevel ? t('profile.level.maxed') : `${formatNumber(state.xpIntoLevel)} / ${formatNumber(state.xpForNextLevel)} XP`
  const leftLine = inPrestige
    ? t('profile.level.prestigeLeft', { xp: formatNumber(xpLeft), loops: prestige!.loops })
    : state.isMaxLevel ? '' : matchesLeft
      ? t('profile.level.leftWithMatches', { level: state.level + 1, xp: formatNumber(xpLeft), matches: matchesLeft })
      : t('profile.level.leftPlain', { level: state.level + 1, xp: formatNumber(xpLeft) })

  const choices = choicesOpen && (
    <ChoiceQueue choices={state.pendingChoices} onResolved={() => { void load() }} onClose={() => { setChoicesOpen(false); void load() }} />
  )
  const pendingBtn = pendingCount > 0 && (
    <button type="button" onClick={() => { playUiClick(); setChoicesOpen(true) }} className="rvn-prog-cta"
      style={{
        minHeight: fz(44, DT.cta), padding: fz('0 14px', '0 22px'), border: 0, background: 'linear-gradient(180deg,#E2B958,#b98f38)',
        color: '#1a1206', cursor: 'pointer', font: `800 ${fz(11, 13)}px ${DISPLAY}`, letterSpacing: 1.4, textTransform: 'uppercase',
        boxShadow: '0 0 18px rgba(226,185,88,.35)',
      }}>
      {t('profile.level.pendingCta', { count: pendingCount })}
    </button>
  )

  if (desk) {
    const secS: React.CSSProperties = { border: `1px solid ${C.lineIn}`, background: C.raised, padding: DT.sp.lg, minWidth: 0, display: 'flex', flexDirection: 'column', gap: DT.sp.md }
    const kickS: React.CSSProperties = { fontSize: DT.fs.label, letterSpacing: 1.8 }
    const rowS: React.CSSProperties = { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, font: `500 ${DT.fs.body}px ${BODY}`, color: C.bone }
    const mx = state.matchXp
    const src = state.xpSources
    return (
      <div className="rvn-prog-in" style={{ display: 'flex', flexDirection: 'column', gap: DT.sp.lg, minWidth: 0 }}>
        {/* ── Viršus: kur aš esu · kiek liko · kas toliau ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: DT.sp.xl, flexWrap: 'wrap', paddingBottom: DT.sp.lg, borderBottom: '1px solid #1e1a26' }}>
          <div style={{ flex: 'none', display: 'flex', alignItems: 'center', gap: DT.sp.lg }}>
            <LevelEmblem level={state.level} size={92} title={tierName(curTier)} prestige={inPrestige} />
            <div>
              <Kicker color={C.gold} style={kickS}>{t('profile.level.kicker')}</Kicker>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 2 }}>
                <span style={{ font: `800 46px ${DISPLAY}`, color: C.goldHi, lineHeight: 1 }}>{state.level}</span>
                <span style={{ font: `600 16px ${DISPLAY}`, color: C.label }}>/ {state.maxLevel}</span>
              </div>
              {curTier && <div style={{ font: `700 19px ${BODY}`, color: C.bone, marginTop: 2 }}>{tierName(curTier)}</div>}
              {tierNo && <div style={{ font: `400 ${DT.fs.help}px ${BODY}`, color: C.muted }}>{t('profile.level.tierOf', { n: tierNo, total: tiers.length })}</div>}
            </div>
          </div>

          <div style={{ flex: '1 1 320px', minWidth: 260 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              <span style={{ font: `800 20px ${DISPLAY}`, color: C.bone }}>{xpLine}</span>
              <span style={{ font: `500 ${DT.fs.body}px ${BODY}`, color: C.muted }}>{leftLine}</span>
            </div>
            <div style={{ position: 'relative', height: 14, marginTop: 8, background: '#1a1420', border: `1px solid ${C.lineIn}` }}>
              <span style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${pct}%`, background: 'linear-gradient(90deg,#8a6c2c,var(--rvn-gold-hi))' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginTop: 8, font: `400 ${DT.fs.help}px ${BODY}`, color: C.muted }}>
              <span>{t('profile.level.totalXp', { xp: formatNumber(state.totalXp) })}</span>
              {nextMilestones[0] && (
                <span>{t('profile.level.nextMilestone')} <b style={{ color: C.goldHi, fontWeight: 700 }}>{t('profile.level.levelN', { level: nextMilestones[0].level })}, {tierName(tierOf(nextMilestones[0].level))}</b></span>
              )}
            </div>
          </div>

          {nextCell && (
            <button type="button" onClick={() => { playUiClick(); setSel(nextCell.level); scrollToLevel(nextCell.level, true) }}
              style={{ display: 'flex', alignItems: 'center', gap: 14, border: `1px solid ${C.lineIn}`, background: 'rgba(7,6,10,.7)', padding: '10px 16px', minHeight: 92, cursor: 'pointer', textAlign: 'left' }}>
              {nextCell.rewards[0] ? <RewardIcon reward={nextCell.rewards[0]} size={64} /> : null}
              <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span style={{ font: `600 ${DT.fs.label}px ${BODY}`, letterSpacing: 1.6, color: C.gold, textTransform: 'uppercase' }}>{t('profile.level.nextReward')}</span>
                <span style={{ font: `800 19px ${DISPLAY}`, color: C.bone }}>{nextCell.rewards[0] ? rewardLabel(nextCell.rewards[0]) : ''}</span>
                <span style={{ font: `400 ${DT.fs.help}px ${BODY}`, color: C.muted }}>{t('profile.level.levelN', { level: nextCell.level })}</span>
              </span>
            </button>
          )}
          {pendingBtn}
        </div>

        {/* ── Pakopos ── */}
        {tiers.length > 0 && (
          <div role="tablist" aria-label={t('profile.level.tiersAria')} style={{ display: 'flex', gap: DT.sp.sm }}>
            {tiers.map((x) => {
              const here = curTier?.key === x.key
              const passed = state.level > x.to
              return (
                <button key={x.key} type="button" role="tab" aria-selected={here}
                  onClick={() => { playUiClick(); setSel(x.from === 1 ? 2 : x.from); scrollToLevel(x.from, true) }}
                  style={{
                    flex: '1 1 0', minWidth: 0, minHeight: DT.ctl, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer',
                    border: `1px solid ${here ? C.gold : C.lineIn}`, background: here ? 'rgba(198,161,79,.16)' : 'rgba(7,6,10,.6)',
                    color: here ? C.goldHi : passed ? C.bone : C.muted, font: `700 14px ${BODY}`, padding: '0 6px',
                  }}>
                  <LevelEmblem level={x.from} size={20} showLevel={false} title="" />
                  <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{tierName(x)}</span>
                </button>
              )
            })}
          </div>
        )}

        {/* ── Kelias ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: DT.sp.sm }}>
          <button type="button" className="rvn-d-trackbtn" onClick={() => scrollTrack(-1)} disabled={!edges.l} aria-label={t('collection.prevPage')}>‹</button>
          <div ref={trackRef} onScroll={updateEdges} className="rvn-prog-scroll"
            style={{ position: 'relative', flex: 1, minWidth: 0, display: 'flex', gap: DT.sp.sm, overflowX: 'auto', padding: '8px 2px 10px', scrollBehavior: 'auto' }}>
            {state.track.map(cell)}
          </div>
          <button type="button" className="rvn-d-trackbtn" onClick={() => scrollTrack(1)} disabled={!edges.r} aria-label={t('collection.nextPage')}>›</button>
        </div>

        {/* ── Apačia: detalės · kaip gauti XP · tavo kelias ── */}
        <div style={{ display: 'grid', gap: DT.sp.lg, gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', alignItems: 'stretch' }}>
          <section className="rvn-prog-clip" style={secS}>{detail(true)}</section>

          <section className="rvn-prog-clip" style={secS}>
            <Kicker color={C.gold} style={kickS}>{t('profile.level.xpTitle')}</Kicker>
            {src?.firstWinOfDay ? (
              <div style={{ ...rowS, fontWeight: 700, padding: '8px 10px', border: `1px solid ${state.firstWinAvailable ? 'rgba(198,161,79,.5)' : C.lineIn}`, background: state.firstWinAvailable ? 'rgba(198,161,79,.10)' : 'transparent' }}>
                <span>{t('profile.level.srcFirstWin')}</span>
                <span style={{ color: state.firstWinAvailable ? C.goldHi : C.muted }}>
                  {t('profile.level.xpAmount', { xp: src.firstWinOfDay })} · {state.firstWinAvailable ? t('profile.level.srcWaiting') : t('profile.level.srcDoneToday')}
                </span>
              </div>
            ) : null}
            {mx?.ranked && <div style={{ ...rowS, padding: '0 10px' }}><span>{t('profile.level.srcRanked')}</span><span style={{ color: C.muted }}>{t('profile.level.winLoss', { win: mx.ranked.win, loss: mx.ranked.loss })}</span></div>}
            {mx?.unranked && <div style={{ ...rowS, padding: '0 10px' }}><span>{t('profile.level.srcUnranked')}</span><span style={{ color: C.muted }}>{t('profile.level.winLoss', { win: mx.unranked.win, loss: mx.unranked.loss })}</span></div>}
            {mx?.bot && <div style={{ ...rowS, padding: '0 10px' }}><span>{t('profile.level.srcBot')}</span><span style={{ color: C.muted }}>{t('profile.level.winLoss', { win: mx.bot.win, loss: mx.bot.loss })}</span></div>}
            {src?.lesson ? <div style={{ ...rowS, padding: '0 10px' }}><span>{t('profile.level.srcLesson')}</span><span style={{ color: C.muted }}>{t('profile.level.xpAmount', { xp: src.lesson })}</span></div> : null}
            <div style={{ flex: 1, minHeight: 4 }} />
            <Cta minHeight={DT.cta} onClick={() => { playUiClick(); router.push('/digital') }}>{t('profile.level.play')}</Cta>
          </section>

          <section className="rvn-prog-clip" style={secS}>
            <Kicker color={C.gold} style={kickS}>{t('profile.level.pathTitle')}</Kicker>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: DT.sp.sm }}>
              {([
                [{ type: 'faction_booster_choice', quantity: 1 }, collected.boosters, 'profile.level.sumBoosters'],
                [{ type: 'silver', amount: 0 }, collected.silver, 'profile.level.sumSilver'],
                [{ type: 'essence', amount: 0 }, collected.essence, 'profile.level.sumEssence'],
                [{ type: 'rubies', amount: 0 }, collected.rubies, 'profile.level.sumRubies'],
              ] as const).map(([r, n, k]) => (
                <div key={k} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                  <RewardIcon reward={r} size={40} />
                  <span style={{ font: `800 18px ${DISPLAY}`, color: C.bone }}>{formatNumber(n)}</span>
                  <span style={{ font: `400 ${DT.fs.help}px ${BODY}`, color: C.muted }}>{t(k)}</span>
                </div>
              ))}
            </div>
            <div aria-hidden style={{ height: 1, background: C.lineIn }} />
            <Kicker style={kickS}>{t('profile.level.upcoming')}</Kicker>
            {nextMilestones.length === 0 && inPrestige && (
              <div style={{ ...rowS }}><span>{t('profile.level.prestigeTitle', { loops: prestige!.loops })}</span><span style={{ display: 'flex', gap: 6 }}>{prestige!.rewards.map((r, i) => <RewardChip key={i} reward={r} />)}</span></div>
            )}
            {nextMilestones.map((m) => (
              <button key={m.level} type="button" onClick={() => { playUiClick(); setSel(m.level); scrollToLevel(m.level, true) }}
                style={{ ...rowS, alignItems: 'center', background: 'none', border: 0, padding: 0, cursor: 'pointer', textAlign: 'left' }}>
                <span><b style={{ color: C.goldHi, fontWeight: 700 }}>{m.level}</b> · {tierName(tierOf(m.level))}</span>
                <span style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>{m.rewards.map((r, i) => <RewardChip key={i} reward={r} />)}</span>
              </button>
            ))}
          </section>
        </div>

        {choices}
      </div>
    )
  }

  // ── TELEFONAS: suspaustas viršus · kelias per visą plotį · detalės šone / apačioje ──
  return (
    <div className="rvn-prog-in" style={{ height: '100%', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <div style={{ flex: 'none', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', padding: compact ? '8px 12px' : '10px 18px', borderBottom: '1px solid #1e1a26' }}>
        <LevelEmblem level={state.level} size={44} title={tierName(curTier)} prestige={inPrestige} />
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ font: `800 15px ${DISPLAY}`, color: C.goldHi, lineHeight: 1.1 }}>{t('profile.level.levelN', { level: state.level })}</span>
          <span style={{ font: `600 11px ${BODY}`, color: C.bone }}>{tierName(curTier)}</span>
        </div>
        <div style={{ flex: 1, minWidth: 170 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
            <span style={{ font: `700 11px ${DISPLAY}`, color: C.bone }}>{xpLine}</span>
            <span style={{ font: `400 10px ${BODY}`, color: C.muted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{leftLine}</span>
          </div>
          <div style={{ position: 'relative', height: 8, marginTop: 5, background: '#1a1420', border: `1px solid ${C.lineIn}` }}>
            <span style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${pct}%`, background: 'linear-gradient(90deg,#8a6c2c,var(--rvn-gold-hi))' }} />
          </div>
        </div>
        {state.firstWinAvailable && state.xpSources?.firstWinOfDay ? (
          <span style={{ font: `700 10px ${BODY}`, color: C.goldHi, border: '1px solid rgba(198,161,79,.5)', background: 'rgba(198,161,79,.10)', padding: '5px 8px', whiteSpace: 'nowrap' }}>
            {t('profile.level.srcFirstWin')} {t('profile.level.xpAmount', { xp: state.xpSources.firstWinOfDay })}
          </span>
        ) : null}
        {pendingBtn}
      </div>

      <div style={{ flex: 1, minHeight: 0, display: 'flex', gap: 12, padding: compact ? '8px 12px' : '12px 18px' }}>
        <div className="rvn-prog-scroll" style={{ flex: 1, minWidth: 0, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div ref={trackRef} onScroll={updateEdges} className="rvn-prog-scroll" style={{ display: 'flex', gap: 6, overflowX: 'auto', padding: '2px 0 4px', flex: 'none' }}>
            {state.track.map(cell)}
          </div>
          {tiers.length > 0 && (
            <div style={{ display: 'flex', gap: 5, overflowX: 'auto', flex: 'none' }} className="rvn-prog-scroll">
              {tiers.map((x) => {
                const here = curTier?.key === x.key
                return (
                  <button key={x.key} type="button" onClick={() => { playUiClick(); setSel(x.from === 1 ? 2 : x.from); scrollToLevel(x.from, true) }}
                    style={{ flex: 'none', minHeight: 44, padding: '0 10px', display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer',
                      border: `1px solid ${here ? C.gold : C.lineIn}`, background: here ? 'rgba(198,161,79,.16)' : 'rgba(7,6,10,.6)',
                      color: here ? C.goldHi : C.muted, font: `700 11px ${BODY}`, whiteSpace: 'nowrap' }}>
                    <LevelEmblem level={x.from} size={15} showLevel={false} title="" /> {tierName(x)}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {!compact && (
          <aside className="rvn-prog-clip rvn-prog-scroll" style={{
            width: 288, flex: 'none', minHeight: 0, overflowY: 'auto',
            border: `1px solid ${C.lineIn}`, background: C.raised, padding: 13, display: 'flex', flexDirection: 'column', gap: 10,
          }}>
            {detail(false)}
          </aside>
        )}
      </div>

      {choices}

      {/* kompaktiškame režime detalių panelės nėra — atlygiai matomi čipais po keliu */}
      {compact && selected && (
        <div style={{ flex: 'none', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', padding: '8px 12px', borderTop: '1px solid #1e1a26' }}>
          <span style={{ font: `800 14px ${DISPLAY}`, color: C.bone }}>{t('profile.level.levelN', { level: selected.level })}</span>
          {selected.rewards.map((r, i) => <RewardChip key={i} reward={r} />)}
          {unlocksAtFull(selected.level).map((f) => (
            <span key={f} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, font: `700 10.5px ${BODY}`, color: C.goldHi }}>
              <KeyRound size={12} aria-hidden /> {t(`profile.unlock.feature.${f}`)}
            </span>
          ))}
          {selected.state === 'pending' && (
            <button type="button" onClick={() => { playUiClick(); setChoicesOpen(true) }}
              style={{ minHeight: 44, padding: '0 12px', border: 0, background: 'linear-gradient(180deg,#E2B958,#b98f38)', color: '#1a1206', font: `800 10.5px ${DISPLAY}`, letterSpacing: 1.2, textTransform: 'uppercase', cursor: 'pointer' }}>
              {t('profile.level.actChoose')}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
