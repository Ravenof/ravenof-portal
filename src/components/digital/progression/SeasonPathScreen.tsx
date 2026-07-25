'use client'
// ── Ekranas 2 · Sezono kelias (kelionė) ─────────────────────────────────────
//  Patvirtintas dizainas: screens/06–11, 19.
//  Lygiai, XP, kainos, claimable — tik iš rvn_get_season_path_v2().
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useT } from '@/lib/i18n/react'
import { playUiClick } from '@/lib/ui-sound'
import {
  claimAllSeasonRewards, claimSeasonRewardV2, getSeasonPathV2, isProgressionError,
  unlockSeasonPassV2, type RewardDefinition, type SeasonLevelRow, type SeasonPathState,
} from '@/lib/progression'
import {
  ART, BODY, C, Cta, DISPLAY, Divider, ErrorState, isMissingRpc, Kicker, LoadingState,
  ProgressBar, RewardIcon, rewardLabel, useCompact, useToast,
} from './kit'
import { ChoiceQueue } from './ChoiceModals'

const CHAPTERS = [
  { roman: 'I', key: 'ch1', from: 1, to: 5, color: 'var(--rvn-gold)' },
  { roman: 'II', key: 'ch2', from: 6, to: 10, color: 'var(--rvn-violet-fg)' },
  { roman: 'III', key: 'ch3', from: 11, to: 15, color: 'var(--rvn-burgundy-fg)' },
  { roman: 'IV', key: 'ch4', from: 16, to: 20, color: 'var(--rvn-green-fg)' },
]

export function SeasonPathScreen() {
  const t = useT()
  const compact = useCompact()
  const toast = useToast()
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

  const claim = async (level: number, track: 'free' | 'pass') => {
    if (busy) return
    setBusy(`${level}:${track}`); playUiClick()
    const r = await claimSeasonRewardV2(level, track)
    setBusy(null)
    if (!r || isProgressionError(r)) { toast.show(t('progression.season.claimFailed'), 'err'); return }
    setState(r.snapshot as SeasonPathState)
    if (r.status === 'completed') toast.show(t('progression.season.claimOk'))
  }

  const claimAll = async () => {
    if (busy) return
    setBusy('all'); playUiClick()
    const r = await claimAllSeasonRewards()
    setBusy(null)
    if (!r || isProgressionError(r)) { toast.show(t('progression.season.claimFailed'), 'err'); return }
    setState(r.snapshot as SeasonPathState)
    if (r.status === 'completed') toast.show(t('progression.season.claimAllOk'))
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
  const nodeH = compact ? 62 : 150
  const markerSize = compact ? 34 : 40

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
        padding: compact ? '6px 6px' : '9px 8px', display: 'flex', flexDirection: 'column',
        gap: 4, justifyContent: 'space-between', opacity: track === 'pass' && !state.hasPass && !side.claimed ? 0.72 : 1,
      }}>
        {!compact && (
          <Kicker style={{ fontSize: 8.5, letterSpacing: 1.4 }} color={track === 'pass' ? C.violetFg : C.label}>
            {t(track === 'pass' ? 'progression.season.passShort' : 'progression.season.freeShort')}
          </Kicker>
        )}
        <div style={{ display: 'flex', justifyContent: 'center', flex: 1, alignItems: 'center' }}>
          {first && <RewardIcon reward={first} size={compact ? 20 : 30} />}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4 }}>
          <span style={{ font: `700 10.5px ${BODY}`, color: side.claimed ? C.greenFg : C.bone, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {first ? rewardLabel(first) : '—'}
          </span>
          {side.claimed && <span aria-hidden style={{ font: `400 10px ${BODY}`, color: C.greenFg }}>✓</span>}
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
          <span style={{ font: `700 ${compact ? 11 : 13}px ${DISPLAY}`, color: isCurrent ? '#1a1206' : reached ? '#1a1206' : C.label }}>{row.level}</span>
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
        <Kicker color={track === 'pass' ? C.violetFg : C.greenFg} style={{ marginTop: track === 'pass' ? 14 : 0 }}>
          {t(track === 'pass' ? 'progression.season.passTrack' : 'progression.season.freeTrack')}
        </Kicker>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 7, border: `1px solid ${side.claimable ? C.goldHi : C.lineIn}`, background: 'rgba(7,6,10,.5)', padding: 10 }}>
          {side.rewards[0] && <RewardIcon reward={side.rewards[0]} size={28} />}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ font: `700 13px ${DISPLAY}`, color: locked && !side.claimed ? C.muted : C.bone }}>
              {side.rewards.map((r) => rewardLabel(r)).join(' · ') || '—'}
            </div>
            <div style={{ font: `400 9.5px ${BODY}`, color: C.label }}>
              {side.claimed ? t('progression.season.claimed')
                : side.claimable ? t('progression.season.claimable')
                : locked ? t('progression.season.needPass')
                : t('progression.season.notReached')}
            </div>
          </div>
          {side.claimable && (
            <button type="button" onClick={() => void claim(selected.level, track)}
              disabled={busy === `${selected.level}:${track}`}
              style={{ minHeight: 44, minWidth: 92, border: 0, background: 'linear-gradient(180deg,#E2B958,#b98f38)', color: '#1a1206', font: `700 10px ${DISPLAY}`, letterSpacing: 1.2, textTransform: 'uppercase', cursor: 'pointer' }}>
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
      <div style={{ flex: 'none', display: 'flex', alignItems: 'center', gap: compact ? 10 : 16, padding: compact ? '9px 12px' : '11px 18px', borderBottom: `1px solid #1e1a26`, background: 'linear-gradient(180deg,#0e0c14,#0a0810)' }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ font: `700 14px ${DISPLAY}`, letterSpacing: 1, color: C.bone, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{state.season.title}</div>
          <div style={{ font: `400 9.5px ${BODY}`, color: C.label }}>
            {state.season.endsAt ? t('progression.season.endsAt', { date: new Date(state.season.endsAt).toLocaleDateString() }) : ''}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, flex: 'none', borderLeft: `1px solid ${C.line}`, paddingLeft: 16 }}>
          <span style={{ font: `500 8px ${BODY}`, letterSpacing: 1.8, color: C.label, textTransform: 'uppercase' }}>{t('progression.season.level')}</span>
          <span style={{ font: `800 24px ${DISPLAY}`, color: C.goldHi, lineHeight: 1 }}>{state.level}</span>
          <span style={{ font: `600 12px ${DISPLAY}`, color: C.label }}>/ {state.levels}</span>
        </div>
        <div style={{ flex: 1, minWidth: 80 }}>
          <ProgressBar pct={(state.xpIntoLevel / state.xpForNextLevel) * 100} height={6} />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, font: `400 9.5px ${BODY}`, color: C.label }}>
            <span>{state.xpIntoLevel} / {state.xpForNextLevel} XP</span>
            <span>{state.level < state.levels ? t('progression.season.toLevel', { level: state.level + 1 }) : t('progression.season.maxLevel')}</span>
          </div>
        </div>
        <div style={{
          flex: 'none', font: `600 9.5px ${DISPLAY}`, letterSpacing: 1.4, textTransform: 'uppercase', padding: '8px 11px',
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
          <div style={{ position: 'relative', flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 16px 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, font: `500 8px ${BODY}`, letterSpacing: 2, color: C.label, textTransform: 'uppercase' }}>
              <span aria-hidden style={{ width: 16, height: 1, background: C.green, display: 'block' }} />{t('progression.season.freeTrack')}
              <span aria-hidden style={{ width: 16, height: 1, background: C.violet, display: 'block', marginLeft: 10 }} />{t('progression.season.passTrack')}
            </div>
            <div style={{ font: `400 9px ${BODY}`, letterSpacing: 1.4, color: C.muted, textTransform: 'uppercase' }}>{t('progression.season.dragPath')}</div>
          </div>
          <div className="rvn-prog-scroll" style={{ position: 'relative', flex: 1, minHeight: 0, overflowX: 'auto', overflowY: 'hidden', padding: '6px 16px 12px' }}>
            <div style={{ height: '100%', display: 'flex', alignItems: 'stretch', minWidth: 'max-content' }}>
              {CHAPTERS.map((ch) => (
                <div key={ch.key} style={{ display: 'flex', flexDirection: 'column', borderLeft: `1px solid rgba(198,161,79,.14)`, padding: '0 4px' }}>
                  <div style={{ flex: 'none', padding: '0 6px 6px', display: 'flex', alignItems: 'baseline', gap: 7 }}>
                    <span style={{ font: `700 12px ${DISPLAY}`, color: ch.color }}>{ch.roman}</span>
                    <span style={{ font: `500 8px ${BODY}`, letterSpacing: 1.8, color: C.label, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                      {t(`progression.season.chapter.${ch.key}`)}
                    </span>
                  </div>
                  <div style={{ flex: 1, minHeight: 0, display: 'flex', gap: 8 }}>
                    {rows.filter((r) => r.level >= ch.from && r.level <= ch.to).map((row) => (
                      <button key={row.level} type="button" onClick={() => { playUiClick(); setSel(row.level) }}
                        aria-pressed={sel === row.level}
                        style={{
                          width: compact ? 92 : 116, flex: 'none', display: 'flex', flexDirection: 'column',
                          justifyContent: 'center', gap: 0, background: 'transparent', border: 0, padding: 0, cursor: 'pointer',
                          transform: compact ? undefined : `translateY(${row.level % 2 ? -6 : 6}px)`,
                          outline: sel === row.level ? `1px solid rgba(198,161,79,.45)` : 'none',
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
          <aside style={{ width: 288, flex: 'none', borderLeft: `1px solid ${C.line}`, background: `linear-gradient(180deg, ${C.surface}, #0c0a11)`, padding: 16, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <Kicker color={C.gold}>{t('progression.season.selectedLevel')}</Kicker>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 2 }}>
              <span style={{ font: `700 22px ${DISPLAY}`, color: C.bone }}>{t('progression.season.level')} {selected?.level ?? '—'}</span>
              <span style={{ font: `400 10px ${BODY}`, color: C.label }}>
                {selected?.reached ? t('progression.season.reached') : t('progression.season.notReached')}
              </span>
            </div>
            <Divider margin={13} />
            {detailSide('free')}
            {detailSide('pass')}

            {!state.hasPass && (
              <div style={{ marginTop: 14, border: `1px solid rgba(118,80,164,.4)`, background: 'rgba(118,80,164,.08)', padding: 12 }}>
                <Kicker color={C.violetFg}>{t('progression.season.unlockKicker')}</Kicker>
                <p style={{ font: `400 10px ${BODY}`, color: C.muted, lineHeight: 1.5, margin: '6px 0 10px' }}>{t('progression.season.unlockNote')}</p>
                <div style={{ display: 'flex', gap: 8 }}>
                  <Cta onClick={() => void unlock('silver')} busy={busy === 'pass'} tone="ghost" minHeight={44}>
                    {state.passPrice.silver}
                  </Cta>
                  <Cta onClick={() => void unlock('rubies')} busy={busy === 'pass'} tone="ghost" minHeight={44}>
                    {state.passPrice.rubies}
                  </Cta>
                </div>
              </div>
            )}

            <div style={{ flex: 1, minHeight: 10 }} />
            <p style={{ font: `400 10px ${BODY}`, color: C.muted, lineHeight: 1.5, margin: '0 0 10px' }}>{t('progression.season.note')}</p>
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
