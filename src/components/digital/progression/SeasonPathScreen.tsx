'use client'
// ── Ekranas 2 · Sezono kelias (kelionė) ─────────────────────────────────────
//  Patvirtintas dizainas: screens/06–11, 19.
//  Lygiai, XP, kainos, claimable — tik iš rvn_get_season_path_v2().
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useT } from '@/lib/i18n/react'
import { formatNumber } from '@/lib/i18n/core'
import { playUiClick } from '@/lib/ui-sound'
import {
  claimAllSeasonRewards, claimSeasonRewardV2, getSeasonPathV2, isProgressionError,
  unlockSeasonPassV2, type RewardDefinition, type SeasonLevelRow, type SeasonPathState,
} from '@/lib/progression'
import { celebrateRewards, rewardItems } from './RewardCelebration'
import {
  ART, BODY, C, Cta, DISPLAY, Divider, ErrorState, isMissingRpc, Kicker, LoadingState,
  ProgressBar, RewardIcon, rewardLabel, useCompact, useToast,
} from './kit'
import { ChoiceQueue } from './ChoiceModals'
import { useDesktopUi } from '@/components/digital/ui/useDesktopUi'
import { DT } from '@/components/digital/ui/deskTokens'

const CHAPTERS = [
  { roman: 'I', key: 'ch1', from: 1, to: 5, color: 'var(--rvn-gold)' },
  { roman: 'II', key: 'ch2', from: 6, to: 10, color: 'var(--rvn-violet-fg)' },
  { roman: 'III', key: 'ch3', from: 11, to: 15, color: 'var(--rvn-burgundy-fg)' },
  { roman: 'IV', key: 'ch4', from: 16, to: 20, color: 'var(--rvn-green-fg)' },
]

export function SeasonPathScreen() {
  const t = useT()
  const compactRaw = useCompact()
  const { desktop: D, vh } = useDesktopUi()
  // Desktop visada su šonine detalių panele (ne mobilus apatinis sheet'as)
  const compact = compactRaw && !D
  const toast = useToast()
  const trackRef = useRef<HTMLDivElement | null>(null)
  const [edge, setEdge] = useState({ start: true, end: false })
  const [state, setState] = useState<SeasonPathState | null>(null)
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState<string | null | false>(false)
  const [busy, setBusy] = useState<string | null>(null)
  const [sel, setSel] = useState<number | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const r = await getSeasonPathV2()
    setLoading(false)
    if (!r || isProgressionError(r)) { setFailed(r ? String(r.error) : 'no_response'); return }
    setFailed(false); setState(r)
    setSel((prev) => prev ?? Math.max(1, Math.min(r.levels, r.level || 1)))
  }, [])
  useEffect(() => { void load() }, [load])

  const rows = useMemo(() => state?.rows ?? [], [state?.rows])
  const selected = useMemo(() => rows.find((r) => r.level === sel) ?? rows[0], [rows, sel])

  // ── Desktop: ‹ › valdikliai + auto-scroll į dabartinį lygį ──
  const updEdge = useCallback(() => {
    const el = trackRef.current
    if (!el) return
    setEdge({ start: el.scrollLeft <= 4, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 4 })
  }, [])
  const scrollTrack = (dir: -1 | 1) => {
    const el = trackRef.current
    if (!el) return
    playUiClick()
    el.scrollBy({ left: dir * Math.max(300, el.clientWidth * 0.8), behavior: 'smooth' })
  }
  const curLevel = state ? Math.max(1, Math.min(state.levels, state.level || 1)) : 1
  const hasState = !!state
  useEffect(() => {
    if (!D || !hasState) return
    const el = trackRef.current
    if (!el) return
    const btn = el.querySelector<HTMLElement>(`[data-level="${curLevel}"]`)
    if (btn) el.scrollLeft = Math.max(0, btn.offsetLeft - (el.clientWidth - btn.offsetWidth) / 2)
    updEdge()
  }, [D, hasState, curLevel, updEdge])
  useEffect(() => {
    if (!D) return
    const on = () => updEdge()
    window.addEventListener('resize', on)
    return () => window.removeEventListener('resize', on)
  }, [D, updEdge])

  const claim = async (level: number, track: 'free' | 'pass') => {
    if (busy) return
    setBusy(`${level}:${track}`); playUiClick()
    const r = await claimSeasonRewardV2(level, track)
    setBusy(null)
    if (!r || isProgressionError(r)) { toast.show(t('progression.season.claimFailed'), 'err'); return }
    setState(r.snapshot as SeasonPathState)
    celebrateRewards({ kicker: t('rewards.celebrate.kickerSeason', { level }), title: t('rewards.celebrate.claimed'), titleAccent: t('rewards.celebrate.claimedAccent'), items: rewardItems(r.grantedRewards) })
  }

  const claimAll = async () => {
    if (busy) return
    setBusy('all'); playUiClick()
    const r = await claimAllSeasonRewards()
    setBusy(null)
    if (!r || isProgressionError(r)) { toast.show(t('progression.season.claimFailed'), 'err'); return }
    setState(r.snapshot as SeasonPathState)
    celebrateRewards({ kicker: t('rewards.celebrate.kickerSeasonAll'), title: t('rewards.celebrate.claimed'), titleAccent: t('rewards.celebrate.claimedAccent'), items: rewardItems(r.grantedRewards) })
  }

  const unlock = async (currency: 'silver' | 'rubies') => {
    if (busy) return
    setBusy('pass'); playUiClick()
    const r = await unlockSeasonPassV2(currency)
    setBusy(null)
    if (!r || isProgressionError(r)) {
      toast.show(r && isProgressionError(r) && r.error === 'not_enough'
        ? t('progression.season.notEnough') : t('progression.season.passFailed'), 'err')
      return
    }
    setState(r.snapshot as SeasonPathState)
    toast.show(t('progression.season.passOk'))
  }

  if (loading && !state) return <LoadingState label={t('progression.season.loading')} />
  if (failed) return (
    <ErrorState title={t('progression.common.errorTitle')} body={t('progression.common.errorBody')}
      retryLabel={t('progression.common.retry')} onRetry={() => void load()}
      hint={isMissingRpc(failed || '') ? t('progression.common.migrationsMissing') : null}
      detail={typeof failed === 'string' && failed !== 'no_response' ? failed : null} />
  )
  if (!state) return null

  const anyClaimable = rows.some((r) => r.free.claimable || r.pass.claimable)
  // Desktop: mazgai užpildo turimą aukštį (bet ne be ribos), skaitomi pavadinimai
  const nodeH = D ? Math.round(Math.max(150, Math.min(230, (vh - 500) / 2))) : compact ? 62 : 150
  const markerSize = D ? 48 : compact ? 34 : 40

  // ── vieno takelio mazgas ─────────────────────────────────────────────────
  const node = (row: SeasonLevelRow, track: 'free' | 'pass') => {
    const side = row[track]
    const first: RewardDefinition | undefined = side.rewards[0]
    const border = side.claimed ? 'rgba(62,139,109,.45)'
      : side.claimable ? C.goldHi
      : track === 'pass' && !state.hasPass ? C.lineIn
      : C.lineIn
    const bg = side.claimed ? 'rgba(62,139,109,.12)'
      : side.claimable ? 'linear-gradient(180deg, rgba(226,185,88,.18), rgba(21,17,28,.9))'
      : track === 'pass' ? 'linear-gradient(180deg, rgba(118,80,164,.12), rgba(15,13,21,.95))'
      : C.raised
    return (
      <div className="rvn-prog-clip" style={{
        height: nodeH, flex: 'none', border: `1px solid ${border}`, background: bg,
        padding: D ? '10px 10px' : compact ? '6px 6px' : '9px 8px', display: 'flex', flexDirection: 'column',
        gap: D ? 6 : 4, justifyContent: 'space-between', opacity: track === 'pass' && !state.hasPass && !side.claimed ? 0.72 : 1,
      }}>
        {!compact && (
          <Kicker style={D ? { letterSpacing: 1.4 } : { fontSize: 8.5, letterSpacing: 1.4 }} color={track === 'pass' ? C.violetFg : C.label}>
            {t(track === 'pass' ? 'progression.season.passShort' : 'progression.season.freeShort')}
          </Kicker>
        )}
        <div style={{ display: 'flex', justifyContent: 'center', flex: 1, alignItems: 'center' }}>
          {first && <RewardIcon reward={first} size={D ? 60 : compact ? 20 : 30} />}
        </div>
        <div style={{ display: 'flex', alignItems: D ? 'flex-end' : 'center', justifyContent: 'space-between', gap: 4 }}>
          <span className={D ? 'rvn-clamp2' : undefined} style={D
            ? { font: `700 ${DT.fs.help}px/1.25 ${BODY}`, color: side.claimed ? C.greenFg : C.bone, textAlign: 'left' }
            : { font: `700 10.5px ${BODY}`, color: side.claimed ? C.greenFg : C.bone, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {first ? rewardLabel(first) : '—'}
          </span>
          {side.claimed && <span aria-hidden style={{ font: `400 ${D ? 15 : 10}px ${BODY}`, color: C.greenFg }}>✓</span>}
        </div>
      </div>
    )
  }

  const trackRow = (row: SeasonLevelRow) => {
    const isCurrent = row.level === state.level || (state.level === 0 && row.level === 1)
    const reached = row.reached
    return (
      <div style={{ flex: 'none', height: markerSize + 12, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div aria-hidden style={{ position: 'absolute', left: -8, right: -8, top: '50%', height: reached ? 3 : 1, transform: 'translateY(-50%)', background: reached ? C.gold : C.lineIn }} />
        <div className="rvn-prog-diamond" style={{
          position: 'relative', width: markerSize, height: markerSize,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: isCurrent ? 'linear-gradient(180deg,#E2B958,#b98f38)' : reached ? '#8a6c2c' : C.plum,
          boxShadow: isCurrent ? '0 0 18px rgba(226,185,88,.45)' : undefined,
        }}>
          <span style={{ font: `700 ${D ? 16 : compact ? 11 : 13}px ${DISPLAY}`, color: isCurrent ? '#1a1206' : reached ? '#1a1206' : C.label }}>{row.level}</span>
        </div>
      </div>
    )
  }

  const detailSide = (track: 'free' | 'pass') => {
    if (!selected) return null
    const side = selected[track]
    const locked = track === 'pass' && !state.hasPass
    return (
      <>
        <Kicker color={track === 'pass' ? C.violetFg : C.greenFg} style={{ marginTop: track === 'pass' ? (D ? 18 : 14) : 0 }}>
          {t(track === 'pass' ? 'progression.season.passTrack' : 'progression.season.freeTrack')}
        </Kicker>
        <div style={{ display: 'flex', alignItems: 'center', gap: D ? 12 : 10, marginTop: D ? 8 : 7, border: `1px solid ${side.claimable ? C.goldHi : C.lineIn}`, background: 'rgba(7,6,10,.5)', padding: D ? 12 : 10, flexWrap: D ? 'wrap' : undefined }}>
          {side.rewards[0] && <RewardIcon reward={side.rewards[0]} size={D ? 44 : 28} />}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ font: `700 ${D ? DT.fs.h3 : 13}px ${DISPLAY}`, color: locked && !side.claimed ? C.muted : C.bone }}>
              {side.rewards.map((r) => rewardLabel(r)).join(' · ') || '—'}
            </div>
            <div style={{ font: `400 ${D ? DT.fs.help : 9.5}px ${BODY}`, color: C.label, marginTop: D ? 2 : undefined }}>
              {side.claimed ? t('progression.season.claimed')
                : side.claimable ? t('progression.season.claimable')
                : locked ? t('progression.season.needPass')
                : t('progression.season.notReached')}
            </div>
          </div>
          {side.claimable && (
            <button type="button" onClick={() => void claim(selected.level, track)}
              disabled={busy === `${selected.level}:${track}`}
              style={{ minHeight: D ? DT.cta : 44, minWidth: D ? 120 : 92, flex: D ? '1 0 100%' : undefined, border: 0, background: 'linear-gradient(180deg,#E2B958,#b98f38)', color: '#1a1206', font: `700 ${D ? 13 : 10}px ${DISPLAY}`, letterSpacing: 1.2, textTransform: 'uppercase', cursor: 'pointer' }}>
              {t('progression.season.claim')}
            </button>
          )}
        </div>
      </>
    )
  }

  return (
    <div className="rvn-prog-in" style={{ height: '100%', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      {/* ── Sezono juosta ── */}
      <div style={{ flex: 'none', display: 'flex', alignItems: 'center', gap: compact ? 10 : D ? 24 : 16, padding: compact ? '9px 12px' : D ? '14px 20px' : '11px 18px', borderBottom: `1px solid #1e1a26`, background: 'linear-gradient(180deg,#0e0c14,#0a0810)' }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ font: `700 ${D ? DT.fs.h2 : 14}px ${DISPLAY}`, letterSpacing: 1, color: C.bone, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{state.season.title}</div>
          <div style={{ font: `400 ${D ? DT.fs.help : 9.5}px ${BODY}`, color: C.label, marginTop: D ? 2 : undefined }}>
            {state.season.endsAt ? t('progression.season.endsAt', { date: new Date(state.season.endsAt).toLocaleDateString() }) : ''}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, flex: 'none', borderLeft: `1px solid ${C.line}`, paddingLeft: 16 }}>
          <span style={{ font: `${D ? 600 : 500} ${D ? DT.fs.label : 8}px ${BODY}`, letterSpacing: 1.8, color: C.label, textTransform: 'uppercase' }}>{t('progression.season.level')}</span>
          <span style={{ font: `800 ${D ? 30 : 24}px ${DISPLAY}`, color: C.goldHi, lineHeight: 1 }}>{state.level}</span>
          <span style={{ font: `600 ${D ? 15 : 12}px ${DISPLAY}`, color: C.label }}>/ {state.levels}</span>
        </div>
        <div style={{ flex: 1, minWidth: 80 }}>
          <ProgressBar pct={(state.xpIntoLevel / state.xpForNextLevel) * 100} height={D ? 8 : 6} />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: D ? 6 : 4, font: `400 ${D ? DT.fs.help : 9.5}px ${BODY}`, color: C.label }}>
            <span>{state.xpIntoLevel} / {state.xpForNextLevel} XP</span>
            <span>{state.level < state.levels ? t('progression.season.toLevel', { level: state.level + 1 }) : t('progression.season.maxLevel')}</span>
          </div>
        </div>
        <div style={{
          flex: 'none', font: `600 ${D ? 12.5 : 9.5}px ${DISPLAY}`, letterSpacing: 1.4, textTransform: 'uppercase', padding: D ? '0 14px' : '8px 11px',
          minHeight: D ? DT.ctlSm : undefined, display: D ? 'flex' : undefined, alignItems: D ? 'center' : undefined,
          color: state.hasPass ? C.greenFg : C.label,
          border: `1px solid ${state.hasPass ? 'rgba(62,139,109,.5)' : C.lineIn}`,
          background: state.hasPass ? 'rgba(62,139,109,.12)' : 'transparent',
        }}>
          {state.hasPass ? `✓ ${t('progression.season.passActive')}` : t('progression.season.passInactive')}
        </div>
      </div>

      <div style={{ flex: 1, minHeight: 0, display: 'flex' }}>
        {/* ── Kelias ── */}
        <div style={{ flex: 1, minWidth: 0, position: 'relative', overflow: 'hidden', background: '#08070c', display: 'flex', flexDirection: 'column' }}>
          <div aria-hidden style={{ position: 'absolute', inset: 0, background: `url('${ART.fortress}') center/cover no-repeat`, opacity: 0.2 }} />
          <div aria-hidden style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(7,6,10,.55) 0%, rgba(7,6,10,.2) 45%, rgba(7,6,10,.85) 100%)' }} />
          <div style={{ position: 'relative', flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: D ? '14px 20px 0' : '9px 16px 0', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: D ? 10 : 7, font: `${D ? 600 : 500} ${D ? DT.fs.label : 8}px ${BODY}`, letterSpacing: 2, color: C.label, textTransform: 'uppercase' }}>
              <span aria-hidden style={{ width: D ? 22 : 16, height: D ? 2 : 1, background: C.green, display: 'block' }} />{t('progression.season.freeTrack')}
              <span aria-hidden style={{ width: D ? 22 : 16, height: D ? 2 : 1, background: C.violet, display: 'block', marginLeft: 10 }} />{t('progression.season.passTrack')}
            </div>
            {D ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button type="button" className="rvn-d-trackbtn" onClick={() => scrollTrack(-1)} disabled={edge.start} aria-label={t('collection.prevPage')}>‹</button>
                <button type="button" className="rvn-d-trackbtn" onClick={() => scrollTrack(1)} disabled={edge.end} aria-label={t('collection.nextPage')}>›</button>
              </div>
            ) : (
              <div style={{ font: `400 9px ${BODY}`, letterSpacing: 1.4, color: C.muted, textTransform: 'uppercase' }}>{t('progression.season.dragPath')}</div>
            )}
          </div>
          <div ref={trackRef} onScroll={D ? updEdge : undefined} className="rvn-prog-scroll"
            onWheel={D ? (e) => { const el = trackRef.current; if (el && Math.abs(e.deltaY) > Math.abs(e.deltaX)) el.scrollLeft += e.deltaY } : undefined}
            style={{ position: 'relative', flex: 1, minHeight: 0, overflowX: 'auto', overflowY: 'hidden', padding: D ? '10px 20px 16px' : '6px 16px 12px' }}>
            <div style={{ height: '100%', display: 'flex', alignItems: D ? 'center' : 'stretch', minWidth: 'max-content' }}>
              {CHAPTERS.map((ch) => (
                <div key={ch.key} style={{ display: 'flex', flexDirection: 'column', borderLeft: `1px solid rgba(198,161,79,.14)`, padding: D ? '0 8px' : '0 4px' }}>
                  <div style={{ flex: 'none', padding: D ? '0 8px 10px' : '0 6px 6px', display: 'flex', alignItems: 'baseline', gap: D ? 10 : 7 }}>
                    <span style={{ font: `700 ${D ? 17 : 12}px ${DISPLAY}`, color: ch.color }}>{ch.roman}</span>
                    <span style={{ font: `${D ? 600 : 500} ${D ? DT.fs.label : 8}px ${BODY}`, letterSpacing: 1.8, color: C.label, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                      {t(`progression.season.chapter.${ch.key}`)}
                    </span>
                  </div>
                  <div style={{ flex: 1, minHeight: 0, display: 'flex', gap: D ? 12 : 8 }}>
                    {rows.filter((r) => r.level >= ch.from && r.level <= ch.to).map((row) => (
                      <button key={row.level} type="button" onClick={() => { playUiClick(); setSel(row.level) }}
                        aria-pressed={sel === row.level} data-level={row.level}
                        style={{
                          width: D ? 164 : compact ? 92 : 116, flex: 'none', display: 'flex', flexDirection: 'column',
                          justifyContent: 'center', gap: 0, background: 'transparent', border: 0, padding: 0, cursor: 'pointer',
                          transform: compact ? undefined : `translateY(${row.level % 2 ? -6 : 6}px)`,
                          outline: sel === row.level ? `${D ? 2 : 1}px solid rgba(198,161,79,${D ? '.7' : '.45'})` : 'none',
                          outlineOffset: D ? 3 : undefined,
                        }}>
                        {node(row, 'free')}
                        {trackRow(row)}
                        {node(row, 'pass')}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Detalių panelė (kompaktiškame – apatinis sheet'as) ── */}
        {!compact && (
          <aside className={D ? 'rvn-prog-scroll' : undefined} style={D
            ? { width: 360, flex: 'none', borderLeft: `1px solid ${C.line}`, background: `linear-gradient(180deg, ${C.surface}, #0c0a11)`, padding: 20, display: 'flex', flexDirection: 'column', minHeight: 0, overflowY: 'auto' }
            : { width: 288, flex: 'none', borderLeft: `1px solid ${C.line}`, background: `linear-gradient(180deg, ${C.surface}, #0c0a11)`, padding: 16, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <Kicker color={C.gold}>{t('progression.season.selectedLevel')}</Kicker>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: D ? 4 : 2, flexWrap: D ? 'wrap' : undefined }}>
              <span style={{ font: `700 ${D ? 24 : 22}px ${DISPLAY}`, color: C.bone }}>{t('progression.season.level')} {selected?.level ?? '—'}</span>
              <span style={{ font: `400 ${D ? DT.fs.help : 10}px ${BODY}`, color: C.label }}>
                {selected?.reached ? t('progression.season.reached') : t('progression.season.notReached')}
              </span>
            </div>
            <Divider margin={13} />
            {detailSide('free')}
            {detailSide('pass')}

            {!state.hasPass && (
              <div style={{ marginTop: D ? 18 : 14, border: `1px solid rgba(118,80,164,.4)`, background: 'rgba(118,80,164,.08)', padding: D ? 14 : 12 }}>
                <Kicker color={C.violetFg}>{t('progression.season.unlockKicker')}</Kicker>
                <p style={{ font: `400 ${D ? DT.fs.help : 10}px ${BODY}`, color: C.muted, lineHeight: 1.5, margin: D ? '8px 0 12px' : '6px 0 10px' }}>{t('progression.season.unlockNote')}</p>
                <div style={{ display: 'flex', gap: 8 }}>
                  {/* Aiškūs valiutų pavadinimai (audit #21) — ne pliki skaičiai */}
                  {/* Season Pass perkamas TIK už rubinus (migr. 20260919_shop_currency_rules) – sidabro mygtuko nebėra */}
                  <Cta onClick={() => void unlock('rubies')} busy={busy === 'pass'} tone="ghost" minHeight={44}>
                    {t('shop.buyRubies', { price: formatNumber(state.passPrice.rubies) })}
                  </Cta>
                </div>
              </div>
            )}

            <div style={{ flex: 1, minHeight: D ? 20 : 10, maxHeight: D ? 20 : undefined }} />
            <p style={{ font: `400 ${D ? DT.fs.help : 10}px ${BODY}`, color: C.muted, lineHeight: 1.5, margin: D ? '0 0 12px' : '0 0 10px' }}>{t('progression.season.note')}</p>
            <Cta onClick={claimAll} busy={busy === 'all'} disabled={!anyClaimable}>{t('progression.season.claimAll')}</Cta>
          </aside>
        )}
      </div>

      {compact && selected && (
        <div style={{ flex: 'none', borderTop: `1px solid ${C.line}`, background: 'linear-gradient(180deg,#12101a,#0a0810)', padding: '9px 12px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ flex: 'none' }}>
            <div style={{ font: `700 14px ${DISPLAY}`, color: C.bone }}>{t('progression.season.level')} {selected.level}</div>
            <div style={{ font: `400 9px ${BODY}`, color: C.label }}>{selected.reached ? t('progression.season.claimable') : t('progression.season.notReached')}</div>
          </div>
          <div style={{ flex: 1, display: 'flex', gap: 8, overflowX: 'auto' }} className="rvn-prog-scroll">
            {(['free', 'pass'] as const).map((tr) => selected[tr].rewards.map((r, i) => (
              <div key={tr + i} style={{ display: 'flex', alignItems: 'center', gap: 6, border: `1px solid ${selected[tr].claimable ? C.goldHi : C.lineIn}`, padding: '6px 9px', flex: 'none' }}>
                <RewardIcon reward={r} size={16} />
                <span style={{ font: `700 10px ${BODY}`, color: C.bone, whiteSpace: 'nowrap' }}>{rewardLabel(r)}</span>
              </div>
            )))}
          </div>
          <div style={{ width: 180, flex: 'none' }}>
            <Cta onClick={claimAll} busy={busy === 'all'} disabled={!anyClaimable}>{t('progression.season.claimAll')}</Cta>
          </div>
        </div>
      )}

      <ChoiceQueue choices={state.pendingChoices} onResolved={() => void load()} onClose={() => void load()} />
      {toast.node}
    </div>
  )
}
