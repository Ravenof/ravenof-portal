'use client'
// ── Ekranas 05 · Paskyros lygis 1–50 ────────────────────────────────────────
//  Handoff: docs/profile-handoff/IMPLEMENTATION.md §2 „05 · Account Level progression".
//  Antraštė (lygio skaitmuo, XP, juosta, kito lygio atlygis, laukiančių pasirinkimų CTA)
//  → takelis dviem eilutėm (2–25 / 26–50, horizontaliai slenkamas; įprastas langelis
//  58 px, milestone 104 px su didesne ikona, kampo trikampis = būsena)
//  → dešinėje inspektorius (pasirinkto lygio atlygiai, būsena, XP riba, veiksmas)
//  → apačioje legenda.
//
//  SVARBU: visos reikšmės iš rvn_get_account_level() — UI neskaičiuoja nei XP ribų,
//  nei atlygių, nei būsenų. Pasirinkimai eina per TĄ PATĮ ChoiceQueue kanalą kaip
//  sezonas ir dienos užduotys (reward_choices, source_type='level').
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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
import { useProfileUi } from './profileDesk'

type CellState = AccountLevelCell['state']

const STATE_TONE: Record<CellState, { line: string; fg: string; corner: string | null }> = {
  claimed: { line: 'rgba(111,133,98,.5)', fg: 'var(--rvn-green-fg)', corner: 'var(--rvn-green)' },
  pending: { line: 'rgba(226,185,88,.75)', fg: 'var(--rvn-gold-hi)', corner: '#E2B958' },
  next:    { line: 'rgba(198,161,79,.55)', fg: 'var(--rvn-gold-hi)', corner: '#C6A14F' },
  future:  { line: 'var(--rvn-line-in)', fg: 'var(--rvn-label)', corner: null },
}

export function AccountLevelScreen() {
  const t = useT()
  const { desk, compact } = useProfileUi()
  /** mobile / desktop reikšmė (mobile nekeičiama) */
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
  // desktop ‹ › mygtukų būsena (ar galima slinkti į kairę / dešinę)
  const [edges, setEdges] = useState<{ l: boolean; r: boolean }>({ l: false, r: false })
  const updateEdges = useCallback(() => {
    const tr = trackRef.current
    if (!tr) return
    const l = tr.scrollLeft > 2
    const r = tr.scrollLeft + tr.clientWidth < tr.scrollWidth - 2
    setEdges((p) => (p.l === l && p.r === r ? p : { l, r }))
  }, [])
  // Auto-scroll: dabartinis/pasirinktas lygis visada pradinėje matomoje zonoje
  useEffect(() => {
    if (!state || !trackRef.current) return
    const el = trackRef.current.querySelector(`[data-level="${state.level}"]`) as HTMLElement | null
    if (!el) return
    if (desk) {
      // desktop: centruojam tik takelį (scrollLeft), puslapis vertikaliai nešokinėja
      const tr = trackRef.current
      tr.scrollLeft = Math.max(0, el.offsetLeft - (tr.clientWidth - el.offsetWidth) / 2)
      updateEdges()
    } else el.scrollIntoView({ inline: 'center', block: 'nearest' })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state?.level, state === null, desk])

  useEffect(() => {
    if (!desk) return
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

  // VIENAS vientisas 1–50 takelis (audit #13) — nebe dvi atskiros juostos.
  const rows = useMemo(() => {
    const track = state?.track ?? []
    return [track]
  }, [state])

  const selected = useMemo(
    () => state?.track.find((c) => c.level === sel) ?? null,
    [state, sel],
  )

  if (loading && !state) return <LoadingState label={t('profile.level.loading')} />
  if (failed) return (
    <ErrorState title={t('progression.common.errorTitle')} body={t('progression.common.errorBody')}
      retryLabel={t('progression.common.retry')} onRetry={() => void load()}
      hint={isMissingRpc(failed || '') ? t('progression.common.migrationsMissing') : null}
      detail={typeof failed === 'string' && failed !== 'no_response' ? failed : null} />
  )
  if (!state) return null

  const pct = state.isMaxLevel || state.xpForNextLevel <= 0
    ? 100
    : Math.min(100, (state.xpIntoLevel / state.xpForNextLevel) * 100)
  const nextCell = state.track.find((c) => c.level === state.level + 1) ?? null
  const pendingCount = state.pendingChoices.length

  // ── Takelio langelis ──────────────────────────────────────────────────────
  const cell = (c: AccountLevelCell) => {
    const tone = STATE_TONE[c.state]
    const on = sel === c.level
    const w = desk ? (c.milestone ? 148 : 88) : c.milestone ? 104 : 58
    // dabartinis lygis desktop'e — aiškiai pažymėtas (auksinis rėmas + žymė viršuje)
    const cur = desk && state.level === c.level
    return (
      <button key={c.level} type="button" data-level={c.level} onClick={() => { playUiClick(); setSel(c.level) }}
        aria-pressed={on} aria-label={t('profile.level.cellAria', { level: c.level })} aria-current={cur ? 'step' : undefined}
        style={{
          position: 'relative', width: w, minHeight: fz(96, 132), flex: 'none', overflow: 'hidden',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: fz(5, 8),
          border: `${cur ? 2 : 1}px solid ${on || cur ? C.goldHi : tone.line}`,
          background: cur ? 'linear-gradient(180deg,rgba(198,161,79,.18),#110d18)' : c.milestone ? 'linear-gradient(180deg,#1a1622,#110d18)' : C.raised,
          boxShadow: cur ? '0 0 18px rgba(226,185,88,.35)' : on ? 'inset 0 0 0 1px rgba(226,185,88,.35)' : undefined,
          cursor: 'pointer', padding: fz('8px 4px', '12px 6px'),
        }}>
        {cur && <span aria-hidden style={{ position: 'absolute', left: '50%', top: 0, width: 14, height: 8, transform: 'translateX(-50%)', background: C.goldHi, clipPath: 'polygon(0 0,100% 0,50% 100%)' }} />}
        {tone.corner && (
          <span aria-hidden style={{
            position: 'absolute', right: 0, top: 0, width: fz(11, 14), height: fz(11, 14),
            background: tone.corner, clipPath: 'polygon(100% 0,100% 100%,0 0)',
          }} />
        )}
        {c.milestone && <Kicker color={C.gold} style={{ fontSize: fz(7.5, DT.fs.label), letterSpacing: fz(undefined, 1.4) }}>{t('profile.level.milestone')}</Kicker>}
        <span style={{ font: `800 ${desk ? (c.milestone ? 28 : 22) : c.milestone ? 20 : 15}px ${DISPLAY}`, color: c.state === 'future' ? C.muted : C.bone, lineHeight: 1 }}>
          {c.level}
        </span>
        <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: fz(3, 5), flexWrap: 'wrap' }}>
          {c.rewards.slice(0, c.milestone ? 3 : 2).map((r, i) => (
            <RewardIcon key={i} reward={r} size={desk ? (c.milestone ? 34 : 26) : c.milestone ? 26 : 17} />
          ))}
        </span>
      </button>
    )
  }

  const legendItem = (k: CellState) => (
    <span key={k} style={{ display: 'inline-flex', alignItems: 'center', gap: fz(5, 8) }}>
      <span aria-hidden style={{ width: fz(9, 12), height: fz(9, 12), background: STATE_TONE[k].corner ?? 'transparent', border: STATE_TONE[k].corner ? 0 : `1px solid ${C.lineIn}`, clipPath: 'polygon(100% 0,100% 100%,0 0)' }} />
      <span style={{ font: `400 ${fz(9.5, 13)}px ${BODY}`, color: C.muted }}>{t(`profile.level.state.${k}`)}</span>
    </span>
  )

  if (desk) {
    // ── DESKTOP: antraštė → pilno pločio takelis su ‹ › → inspektorius po juo ──
    //  Jokių vidinių vertikalių scroll'ų (slenka layout <main>); inspektorius
    //  užima tik tiek aukščio, kiek turinio.
    const secS: React.CSSProperties = { border: `1px solid ${C.lineIn}`, background: C.raised, padding: DT.sp.lg, minWidth: 0 }
    const kickS: React.CSSProperties = { fontSize: DT.fs.label, letterSpacing: 1.8 }
    return (
      <div className="rvn-prog-in" style={{ display: 'flex', flexDirection: 'column', gap: DT.sp.xl, minWidth: 0 }}>
        {/* ── Antraštė ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: DT.sp.xl, flexWrap: 'wrap', paddingBottom: DT.sp.lg, borderBottom: `1px solid #1e1a26` }}>
          <div style={{ flex: 'none' }}>
            <Kicker color={C.gold} style={kickS}>{t('profile.level.kicker')}</Kicker>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 6 }}>
              <span style={{ font: `800 40px ${DISPLAY}`, color: C.goldHi, lineHeight: 1 }}>{state.level}</span>
              <span style={{ font: `600 16px ${DISPLAY}`, color: C.label }}>/ {state.maxLevel}</span>
            </div>
          </div>

          <div style={{ flex: '1 1 260px', minWidth: 220 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              <span style={{ font: `700 ${DT.fs.body}px ${DISPLAY}`, color: C.bone }}>
                {state.isMaxLevel
                  ? t('profile.level.maxed')
                  : `${formatNumber(state.xpIntoLevel)} / ${formatNumber(state.xpForNextLevel)} XP`}
              </span>
              <span style={{ font: `400 13px ${BODY}`, color: C.label }}>
                {t('profile.level.totalXp', { xp: formatNumber(state.totalXp) })}
              </span>
            </div>
            <div style={{ position: 'relative', height: 9, marginTop: 8, background: '#1a1420', border: `1px solid ${C.lineIn}` }}>
              <span style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${pct}%`, background: 'linear-gradient(90deg,#8a6c2c,var(--rvn-gold-hi))' }} />
            </div>
          </div>

          {nextCell && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, border: `1px solid ${C.lineIn}`, background: 'rgba(7,6,10,.7)', padding: '8px 14px', minHeight: DT.ctl }}>
              <span style={{ font: `600 ${DT.fs.label}px ${BODY}`, letterSpacing: 1.4, color: C.muted, textTransform: 'uppercase' }}>
                {t('profile.level.nextReward')}
              </span>
              {nextCell.rewards.map((r, i) => <RewardIcon key={i} reward={r} size={24} />)}
            </div>
          )}

          {pendingCount > 0 && (
            <button type="button" onClick={() => { playUiClick(); setChoicesOpen(true) }}
              className="rvn-prog-cta"
              style={{
                minHeight: DT.cta, padding: '0 22px', border: 0, background: 'linear-gradient(180deg,#E2B958,#b98f38)',
                color: '#1a1206', cursor: 'pointer', font: `800 13px ${DISPLAY}`, letterSpacing: 1.4, textTransform: 'uppercase',
                boxShadow: '0 0 18px rgba(226,185,88,.35)',
              }}>
              {t('profile.level.pendingCta', { count: pendingCount })}
            </button>
          )}
        </div>

        {/* ── Takelis ── */}
        <section>
          <Kicker style={kickS}>{t('profile.level.trackTitle')}</Kicker>
          <div style={{ display: 'flex', alignItems: 'center', gap: DT.sp.sm, marginTop: DT.sp.md }}>
            <button type="button" className="rvn-d-trackbtn" onClick={() => scrollTrack(-1)} disabled={!edges.l}
              aria-label={t('collection.prevPage')}>‹</button>
            <div ref={trackRef} onScroll={updateEdges} className="rvn-prog-scroll"
              style={{ position: 'relative', flex: 1, minWidth: 0, display: 'flex', gap: DT.sp.sm, overflowX: 'auto', padding: '4px 2px 10px', scrollBehavior: 'auto' }}>
              {state.track.map(cell)}
            </div>
            <button type="button" className="rvn-d-trackbtn" onClick={() => scrollTrack(1)} disabled={!edges.r}
              aria-label={t('collection.nextPage')}>›</button>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: DT.sp.xl, marginTop: DT.sp.md, paddingLeft: 52 }}>
            {(['claimed', 'pending', 'next', 'future'] as const).map(legendItem)}
          </div>
        </section>

        {/* ── Inspektorius (pagal turinį, ne per visą aukštį) ── */}
        <section className="rvn-prog-clip" style={{ ...secS, maxWidth: 960 }}>
          {!selected ? (
            <div style={{ font: `400 ${DT.fs.help}px ${BODY}`, color: C.label }}>{t('profile.level.pickLevel')}</div>
          ) : (
            <div style={{ display: 'grid', gap: DT.sp.xl, gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', alignItems: 'start' }}>
              <div>
                {selected.milestone && <Kicker color={C.gold} style={kickS}>{t('profile.level.milestone')}</Kicker>}
                <div style={{ font: `800 ${DT.fs.h1}px ${DISPLAY}`, color: C.bone, marginTop: 4, lineHeight: 1.15 }}>
                  {t('profile.level.levelN', { level: selected.level })}
                </div>
                <div style={{ font: `400 ${DT.fs.help}px ${BODY}`, color: C.muted, marginTop: 6 }}>
                  {t('profile.level.xpRequired', { xp: formatNumber(selected.xpRequired) })}
                </div>
                <div style={{ font: `600 ${DT.fs.label}px ${BODY}`, letterSpacing: 1.4, textTransform: 'uppercase', color: STATE_TONE[selected.state].fg, marginTop: 10 }}>
                  {t(`profile.level.state.${selected.state}`)}
                </div>
              </div>

              <div>
                <Kicker style={kickS}>{t('profile.level.rewardsTitle')}</Kicker>
                <div style={{ display: 'flex', flexDirection: 'column', gap: DT.sp.sm, marginTop: DT.sp.sm }}>
                  {selected.rewards.length === 0
                    ? <span style={{ font: `400 ${DT.fs.help}px ${BODY}`, color: C.label }}>{t('profile.level.noRewards')}</span>
                    : selected.rewards.map((r, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, border: `1px solid ${C.lineIn}`, background: 'rgba(7,6,10,.5)', padding: '10px 12px' }}>
                        <RewardIcon reward={r} size={28} />
                        <span style={{ font: `700 ${DT.fs.body}px ${BODY}`, color: C.goldHi }}>
                          {rewardLabel(r)} <span style={{ fontWeight: 400, color: C.muted }}>{t(`progression.reward.${r.type}`)}</span>
                        </span>
                      </div>
                    ))}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: DT.sp.md }}>
                {selected.state === 'pending' ? (
                  <Cta minHeight={DT.cta} onClick={() => { playUiClick(); setChoicesOpen(true) }}>{t('profile.level.actChoose')}</Cta>
                ) : selected.state === 'claimed' ? (
                  <Cta minHeight={DT.ctl} disabled tone="green">{t('profile.level.actClaimed')}</Cta>
                ) : (
                  <Cta minHeight={DT.ctl} disabled tone="ghost">{t('profile.level.actLocked')}</Cta>
                )}
                <p style={{ font: `400 ${DT.fs.help}px ${BODY}`, color: C.muted, lineHeight: 1.5, margin: 0 }}>{t('profile.level.autoNote')}</p>
              </div>
            </div>
          )}
        </section>

        {choicesOpen && (
          <ChoiceQueue
            choices={state.pendingChoices}
            onResolved={() => { void load() }}
            onClose={() => { setChoicesOpen(false); void load() }} />
        )}
      </div>
    )
  }

  return (
    <div className="rvn-prog-in" style={{ height: '100%', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      {/* ── Antraštė ── */}
      <div style={{ flex: 'none', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', padding: compact ? '9px 12px' : '11px 18px', borderBottom: `1px solid #1e1a26` }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <Kicker color={C.gold}>{t('profile.level.kicker')}</Kicker>
          <span style={{ font: `800 30px ${DISPLAY}`, color: C.goldHi, lineHeight: 1 }}>{state.level}</span>
          <span style={{ font: `600 12px ${DISPLAY}`, color: C.label }}>/ {state.maxLevel}</span>
        </div>

        <div style={{ flex: 1, minWidth: 170 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
            <span style={{ font: `700 11px ${DISPLAY}`, color: C.bone }}>
              {state.isMaxLevel
                ? t('profile.level.maxed')
                : `${formatNumber(state.xpIntoLevel)} / ${formatNumber(state.xpForNextLevel)} XP`}
            </span>
            <span style={{ font: `400 9.5px ${BODY}`, color: C.label }}>
              {t('profile.level.totalXp', { xp: formatNumber(state.totalXp) })}
            </span>
          </div>
          <div style={{ position: 'relative', height: 7, marginTop: 5, background: '#1a1420', border: `1px solid ${C.lineIn}` }}>
            <span style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${pct}%`, background: 'linear-gradient(90deg,#8a6c2c,var(--rvn-gold-hi))' }} />
          </div>
        </div>

        {nextCell && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, border: `1px solid ${C.lineIn}`, background: 'rgba(7,6,10,.7)', padding: '6px 10px' }}>
            <span style={{ font: `500 8.5px ${BODY}`, letterSpacing: 1.6, color: C.muted, textTransform: 'uppercase' }}>
              {t('profile.level.nextReward')}
            </span>
            {nextCell.rewards.map((r, i) => <RewardIcon key={i} reward={r} size={16} />)}
          </div>
        )}

        {pendingCount > 0 && (
          <button type="button" onClick={() => { playUiClick(); setChoicesOpen(true) }}
            className="rvn-prog-cta"
            style={{
              minHeight: 44, padding: '0 14px', border: 0, background: 'linear-gradient(180deg,#E2B958,#b98f38)',
              color: '#1a1206', cursor: 'pointer', font: `800 11px ${DISPLAY}`, letterSpacing: 1.4, textTransform: 'uppercase',
              boxShadow: '0 0 18px rgba(226,185,88,.35)',
            }}>
            {t('profile.level.pendingCta', { count: pendingCount })}
          </button>
        )}
      </div>

      {/* ── Takelis + inspektorius ── */}
      <div style={{ flex: 1, minHeight: 0, display: 'flex', gap: 12, padding: compact ? '10px 12px' : '14px 18px' }}>
        <div className="rvn-prog-scroll" style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {rows.map((row, i) => (
            <div key={i}>
              <Kicker>{t('profile.level.trackTitle')}</Kicker>
              <div ref={trackRef} className="rvn-prog-scroll" style={{ display: 'flex', gap: 6, marginTop: 7, overflowX: 'auto', paddingBottom: 4 }}>
                {row.map(cell)}
              </div>
            </div>
          ))}

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, marginTop: 2 }}>
            {(['claimed', 'pending', 'next', 'future'] as const).map(legendItem)}
          </div>
        </div>

        {!compact && (
          <aside className="rvn-prog-clip rvn-prog-scroll" style={{
            width: 288, flex: 'none', minHeight: 0, overflowY: 'auto',
            border: `1px solid ${C.lineIn}`, background: C.raised, padding: 13,
            display: 'flex', flexDirection: 'column', gap: 11,
          }}>
            {!selected ? (
              <div style={{ font: `400 11px ${BODY}`, color: C.label }}>{t('profile.level.pickLevel')}</div>
            ) : (
              <>
                <div>
                  {selected.milestone && <Kicker color={C.gold}>{t('profile.level.milestone')}</Kicker>}
                  <div style={{ font: `800 22px ${DISPLAY}`, color: C.bone, marginTop: 2 }}>
                    {t('profile.level.levelN', { level: selected.level })}
                  </div>
                  <div style={{ font: `400 10px ${BODY}`, color: C.muted, marginTop: 3 }}>
                    {t('profile.level.xpRequired', { xp: formatNumber(selected.xpRequired) })}
                  </div>
                </div>

                <div style={{ font: `600 9.5px ${BODY}`, letterSpacing: 1.4, textTransform: 'uppercase', color: STATE_TONE[selected.state].fg }}>
                  {t(`profile.level.state.${selected.state}`)}
                </div>

                <div aria-hidden style={{ height: 1, background: C.lineIn }} />

                <Kicker>{t('profile.level.rewardsTitle')}</Kicker>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                  {selected.rewards.length === 0
                    ? <span style={{ font: `400 10.5px ${BODY}`, color: C.label }}>{t('profile.level.noRewards')}</span>
                    : selected.rewards.map((r, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 9, border: `1px solid ${C.lineIn}`, background: 'rgba(7,6,10,.5)', padding: '8px 10px' }}>
                        <RewardIcon reward={r} size={20} />
                        <span style={{ font: `700 11px ${BODY}`, color: C.goldHi }}>
                          {rewardLabel(r)} <span style={{ fontWeight: 400, color: C.muted }}>{t(`progression.reward.${r.type}`)}</span>
                        </span>
                      </div>
                    ))}
                </div>

                <div style={{ flex: 1, minHeight: 6 }} />

                {selected.state === 'pending' ? (
                  <Cta onClick={() => { playUiClick(); setChoicesOpen(true) }}>{t('profile.level.actChoose')}</Cta>
                ) : selected.state === 'claimed' ? (
                  <Cta disabled tone="green">{t('profile.level.actClaimed')}</Cta>
                ) : (
                  <Cta disabled tone="ghost">{t('profile.level.actLocked')}</Cta>
                )}
                <p style={{ font: `400 9.5px ${BODY}`, color: C.muted, lineHeight: 1.5, margin: 0 }}>{t('profile.level.autoNote')}</p>
              </>
            )}
          </aside>
        )}
      </div>

      {/* pasirinkimai — tas pats kanalas kaip sezone / dienos užduotyse */}
      {choicesOpen && (
        <ChoiceQueue
          choices={state.pendingChoices}
          onResolved={() => { void load() }}
          onClose={() => { setChoicesOpen(false); void load() }} />
      )}

      {/* kompaktiškame režime inspektoriaus nėra — atlygiai matomi čipais po takeliu */}
      {compact && selected && (
        <div style={{ flex: 'none', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', padding: '8px 12px', borderTop: `1px solid #1e1a26` }}>
          <span style={{ font: `800 14px ${DISPLAY}`, color: C.bone }}>{t('profile.level.levelN', { level: selected.level })}</span>
          {selected.rewards.map((r, i) => <RewardChip key={i} reward={r} />)}
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
