'use client'
// ── Ekranas 04 · Pasiekimai ─────────────────────────────────────────────────
//  Handoff: docs/profile-handoff/IMPLEMENTATION.md §2 „04 · Achievements".
//  Antraštė (done/total + juosta + paieška + Visi/Užbaigti/Užrakinti) → kategorijų
//  čipai (8 + Visos, kiekvienas su done/total) → kortelių tinklelis → dešinė juosta
//  (3 prisegti slotai + kategorijų progresas + „atlygiai automatiški" pastaba).
//
//  SVARBU: UI NIEKO neskaičiuoja pats — progresas, done/total, kategorijos ir
//  prisegti ženklai ateina iš rvn_get_achievements(); prisegimas rašomas per
//  rvn_set_featured_achievements() (serveris tikrina „tik užbaigti" ir 3 limitą).
//  Atlygiai skiriami automatiškai — jokio „Claim" mygtuko čia NĖRA.
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useContent, useT } from '@/lib/i18n/react'
import { playUiClick } from '@/lib/ui-sound'
import type { RewardDefinition } from '@/lib/progression'
import { getAchievements, setFeaturedAchievements, type AchievementRow } from '@/lib/profile/client'
import { ACHIEVEMENT_CATEGORIES, type AchievementCategory } from '@/lib/profile/achievements'
import { AchievementBadge } from './AchievementBadge'
import {
  BODY, C, DISPLAY, ErrorState, isMissingRpc, Kicker, LoadingState, RewardChip, useCompact, useToast,
} from '../progression/kit'

const MAX_FEATURED = 3
const CAT_KEYS = ACHIEVEMENT_CATEGORIES.map((c) => c.key)
type CatFilter = 'all' | AchievementCategory
type StateFilter = 'all' | 'completed' | 'locked'

/** Paieška be diakritikų ir registro („zingsnis" randa „žingsnis"). */
const fold = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()

/** Serverio RewardSpec (kind) → UI RewardDefinition (type). Nežinomi – praleidžiami. */
function normalizeRewards(raw: Record<string, unknown>[] | null | undefined): RewardDefinition[] {
  const out: RewardDefinition[] = []
  for (const r of raw ?? []) {
    if (!r || typeof r !== 'object') continue
    if (typeof (r as { type?: unknown }).type === 'string') { out.push(r as unknown as RewardDefinition); continue }
    const kind = String((r as { kind?: unknown }).kind ?? '')
    const amount = Number((r as { amount?: unknown }).amount ?? 0)
    if (kind === 'coins') out.push({ type: 'silver', amount })
    else if (kind === 'gems') out.push({ type: 'rubies', amount })
    else if (kind === 'xp') out.push({ type: 'season_xp', amount })
    else if (kind === 'booster') out.push({ type: 'faction_booster_choice', quantity: Number((r as { count?: unknown }).count ?? 1) })
    else if (kind === 'card_choice') out.push({ type: 'card_choice', rarity: (r as { rarity?: 'rare' | 'epic' | 'legendary' }).rarity ?? 'rare' })
    else if (kind === 'card_back') out.push({ type: 'card_back', cosmeticId: String((r as { back_id?: unknown }).back_id ?? '') })
  }
  return out
}

/** Prisegimo mygtuko rombas (Ravenof ženklas, ne pin ikona). */
function PinDiamond({ active }: { active: boolean }) {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" aria-hidden>
      <path d="M8 1 15 8 8 15 1 8z" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  )
}

export function AchievementsScreen() {
  const t = useT()
  const tc = useContent()
  const compact = useCompact()
  const toast = useToast()

  const [rows, setRows] = useState<AchievementRow[] | null>(null)
  const [summary, setSummary] = useState<{ completed: number; total: number; categories: Record<string, { total: number; done: number }> }>({ completed: 0, total: 0, categories: {} })
  const [featured, setFeatured] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState<string | null | false>(false)
  const [pinBusy, setPinBusy] = useState(false)

  const [query, setQuery] = useState('')
  const [stateFilter, setStateFilter] = useState<StateFilter>('all')
  const [cat, setCat] = useState<CatFilter>('all')
  const [featuredOpen, setFeaturedOpen] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const snap = await getAchievements()
    setLoading(false)
    if (!snap) { setFailed('rvn_get_achievements'); return }
    setFailed(false)
    // PRODUKCIJOJE nerodome dar nesekamų (target=0) pasiekimų — žaidėjas neturi
    // matyti „Ši sąlyga dar nesekama" kaip įprasto siektino pasiekimo. Dev/preview
    // aplinkoje jie matomi (pažymėti), kad būtų galima tikrinti turinį.
    const hideUntracked = process.env.NODE_ENV === 'production'
    const all = snap.achievements ?? []
    const shown = hideUntracked ? all.filter((a) => a.target > 0 || !!a.completedAt) : all
    setRows(shown)
    // Suvestinė perskaičiuojama pagal MATOMUS pasiekimus, kad „X / Y" neklaidintų
    const cats: Record<string, { total: number; done: number }> = {}
    let done = 0
    for (const a of shown) {
      const c = (cats[a.category] ??= { total: 0, done: 0 })
      c.total += 1
      if (a.completedAt) { c.done += 1; done += 1 }
    }
    setSummary({ completed: done, total: shown.length, categories: cats })
    setFeatured(snap.featured ?? [])
  }, [])
  useEffect(() => { void load() }, [load])

  // ── Gilioji nuoroda iš pranešimo: ?achievementId=<stabilus code> ────────────
  // Pervadinti pasiekimai atsprendžiami pagal code (ne pavadinimą). Jei
  // pasiekimo nebėra — puslapis atsidaro su nedidele neblokuojančia žinute.
  const [highlightCode, setHighlightCode] = useState<string | null>(null)
  useEffect(() => {
    if (!rows) return
    let target: string | null = null
    try { target = new URLSearchParams(window.location.search).get('achievementId') } catch { /* SSR */ }
    if (!target) return
    const row = rows.find((x) => x.code === target)
    if (!row) { toast.show(t('profile.ach.linkMissing'), 'err'); return }
    if (cat !== 'all' && row.category !== cat) setCat('all')
    if (stateFilter !== 'all') setStateFilter('all')
    setHighlightCode(target)
    // scroll į kortelę kai ji jau DOM'e
    const id = target
    const timer = setTimeout(() => {
      document.querySelector(`[data-ach="${id}"]`)?.scrollIntoView({ block: 'center', behavior: 'smooth' })
    }, 120)
    const off = setTimeout(() => setHighlightCode(null), 3200)
    return () => { clearTimeout(timer); clearTimeout(off) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows === null])

  const label = useCallback((a: AchievementRow) => ({
    name: a.isSecret && !a.completedAt ? t('profile.ach.secret') : tc('achievement', a.code, 'name', a.nameLt),
    req: a.isSecret && !a.completedAt ? t('profile.ach.secretHint') : tc('achievement', a.code, 'requirement', a.requirementLt),
  }), [t, tc])

  const visible = useMemo(() => {
    const q = fold(query.trim())
    return (rows ?? []).filter((a) => {
      if (cat !== 'all' && a.category !== cat) return false
      const done = !!a.completedAt
      if (stateFilter === 'completed' && !done) return false
      if (stateFilter === 'locked' && done) return false
      if (!q) return true
      const l = label(a)
      return fold(l.name).includes(q) || fold(l.req).includes(q)
    })
  }, [rows, cat, stateFilter, query, label])

  // ── Prisegimas (serveris = tiesos šaltinis; UI tik optimistiškai atvaizduoja) ─
  const togglePin = async (a: AchievementRow) => {
    if (pinBusy) return
    const done = !!a.completedAt
    if (!done) return
    const pinned = featured.includes(a.code)
    if (!pinned && featured.length >= MAX_FEATURED) { toast.show(t('profile.ach.pinFull'), 'err'); return }
    const next = pinned ? featured.filter((c) => c !== a.code) : [...featured, a.code]
    const prev = featured
    setFeatured(next); setPinBusy(true); playUiClick()
    const r = await setFeaturedAchievements(next)
    setPinBusy(false)
    if (!r || 'error' in r) { setFeatured(prev); toast.show(t('profile.ach.pinFailed'), 'err'); return }
    setFeatured(r.featured)
    toast.show(pinned ? t('profile.ach.unpinOk') : t('profile.ach.pinOk'))
  }

  if (loading && !rows) return <LoadingState label={t('profile.ach.loading')} />
  if (failed) return (
    <ErrorState title={t('progression.common.errorTitle')} body={t('progression.common.errorBody')}
      retryLabel={t('progression.common.retry')} onRetry={() => void load()}
      hint={isMissingRpc(failed || '') ? t('progression.common.migrationsMissing') : null}
      detail={typeof failed === 'string' ? failed : null} />
  )
  if (!rows) return null

  const pct = summary.total > 0 ? (summary.completed / summary.total) * 100 : 0

  // ── Kortelė ───────────────────────────────────────────────────────────────
  const card = (a: AchievementRow) => {
    const done = !!a.completedAt
    const l = label(a)
    // target = 0 → serveris dar neturi telemetrijos šiai sąlygai (žr. 20260855)
    const untracked = !done && a.target === 0
    const target = Math.max(1, a.target)
    const cur = Math.min(target, done ? target : a.progress)
    const p = (cur / target) * 100
    const started = !done && cur > 0
    const pinned = featured.includes(a.code)
    const rewards = normalizeRewards(a.rewards)
    const tone = done ? { line: 'rgba(155,58,72,.55)', fg: 'var(--rvn-burgundy-fg)' }
      : started ? { line: 'rgba(198,161,79,.35)', fg: C.goldHi }
      : { line: C.lineIn, fg: C.label }
    const highlighted = highlightCode === a.code
    return (
      <div key={a.code} data-ach={a.code} className="rvn-prog-clip" style={{
        position: 'relative', display: 'flex', flexDirection: 'column', gap: compact ? 7 : 9,
        border: `1px solid ${highlighted ? C.gold : tone.line}`, background: C.raised, padding: compact ? 9 : 12,
        boxShadow: highlighted ? '0 0 0 1.5px rgba(198,161,79,.7), 0 0 22px rgba(198,161,79,.35)' : undefined,
        transition: 'box-shadow .5s ease, border-color .5s ease',
      }}>
        <div aria-hidden style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 2, background: done ? 'var(--rvn-burgundy)' : started ? C.gold : 'transparent' }} />
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 11 }}>
          <AchievementBadge code={a.code} completed={done} size={compact ? 40 : 54} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ font: `700 13.5px ${DISPLAY}`, color: done ? C.bone : C.muted, lineHeight: 1.25 }}>{l.name}</div>
            <div style={{ font: `400 10.5px ${BODY}`, color: C.label, lineHeight: 1.45, marginTop: 3 }}>{l.req}</div>
            {a.status === 'pending' && (
              <div title={t('profile.ach.artPending')} style={{ font: `400 9px ${BODY}`, color: C.lineDis, marginTop: 4 }}>{t('profile.ach.artPending')}</div>
            )}
          </div>
          <button type="button" onClick={() => void togglePin(a)} disabled={!done || pinBusy}
            aria-pressed={pinned} aria-label={pinned ? t('profile.ach.unpin') : t('profile.ach.pin')}
            title={pinned ? t('profile.ach.unpin') : t('profile.ach.pin')}
            style={{
              width: 44, height: 44, flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: `1px solid ${pinned ? C.gold : C.lineIn}`, background: pinned ? 'rgba(198,161,79,.12)' : 'transparent',
              color: pinned ? C.goldHi : done ? C.muted : C.lineDis, cursor: done && !pinBusy ? 'pointer' : 'default',
            }}>
            <PinDiamond active={pinned} />
          </button>
        </div>

        {untracked ? (
          <div style={{ font: `400 9.5px ${BODY}`, color: C.lineDis, letterSpacing: 0.4 }}>
            {t('profile.ach.notTracked')}
          </div>
        ) : (
        <div>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 6 }}>
            <span style={{ font: `700 11px ${DISPLAY}`, letterSpacing: 0.6, color: tone.fg }}>{cur} / {target}</span>
            <span style={{ font: `400 9px ${BODY}`, letterSpacing: 1.4, color: tone.fg, textTransform: 'uppercase' }}>
              {done ? t('profile.ach.state.done') : started ? t('profile.ach.state.progress') : t('profile.ach.state.locked')}
            </span>
          </div>
          <div style={{ position: 'relative', height: 7, marginTop: 6, background: '#1a1420', border: `1px solid ${C.lineIn}` }}>
            <span style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${p}%`, background: done ? 'linear-gradient(90deg,#6E2633,#C1566A)' : 'linear-gradient(90deg,#8a6c2c,#E2B958)' }} />
          </div>
        </div>
        )}

        {rewards.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {rewards.map((r, i) => <RewardChip key={i} reward={r} />)}
          </div>
        )}
      </div>
    )
  }

  // ── Prisegtų slotų juosta ─────────────────────────────────────────────────
  const featuredSlots = (
    <div style={{ display: 'flex', gap: 8 }}>
      {Array.from({ length: MAX_FEATURED }, (_, i) => {
        const code = featured[i]
        const row = code ? rows.find((x) => x.code === code) : undefined
        if (!row) {
          return (
            <div key={`slot${i}`} style={{
              flex: 1, minHeight: 78, display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: `1px dashed ${C.lineIn}`, background: 'rgba(7,6,10,.45)',
              font: `400 9px ${BODY}`, letterSpacing: 1, color: C.lineDis, textTransform: 'uppercase', textAlign: 'center', padding: 4,
            }}>{t('profile.ach.featuredEmpty')}</div>
          )
        }
        return (
          <button key={code} type="button" onClick={() => void togglePin(row)} disabled={pinBusy}
            aria-label={t('profile.ach.unpin')} title={label(row).name}
            style={{
              flex: 1, minHeight: 78, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4,
              border: `1px solid rgba(155,58,72,.45)`, background: 'rgba(110,38,51,.12)', cursor: pinBusy ? 'default' : 'pointer', padding: 6,
            }}>
            <AchievementBadge code={code} size={38} />
            <span style={{ font: `600 8.5px ${BODY}`, color: C.muted, textAlign: 'center', lineHeight: 1.2, maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block', width: '100%' }}>
              {label(row).name}
            </span>
          </button>
        )
      })}
    </div>
  )

  const chip = (key: CatFilter, text: string, done: number, total: number) => {
    const on = cat === key
    return (
      <button key={key} type="button" onClick={() => { playUiClick(); setCat(key) }}
        style={{
          flex: 'none', minHeight: 44, display: 'inline-flex', alignItems: 'center', gap: 7, padding: '0 12px',
          border: `1px solid ${on ? C.gold : C.lineIn}`, background: on ? 'rgba(198,161,79,.1)' : 'rgba(7,6,10,.6)',
          color: on ? C.goldHi : C.muted, cursor: 'pointer', font: `600 10.5px ${DISPLAY}`, letterSpacing: 0.8, whiteSpace: 'nowrap',
        }}>
        {text}
        <span style={{ font: `400 9.5px ${BODY}`, color: on ? C.goldHi : C.label }}>{done}/{total}</span>
      </button>
    )
  }

  return (
    <div className="rvn-prog-in" style={{ height: '100%', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      {/* ── Antraštė ── */}
      <div style={{ flex: 'none', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', padding: compact ? '7px 10px' : '11px 18px', borderBottom: `1px solid #1e1a26` }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 7 }}>
          <span style={{ font: `800 22px ${DISPLAY}`, color: 'var(--rvn-burgundy-fg)', lineHeight: 1 }}>{summary.completed}</span>
          <span style={{ font: `600 12px ${DISPLAY}`, color: C.label }}>/ {summary.total}</span>
          <span style={{ font: `500 8.5px ${BODY}`, letterSpacing: 1.8, color: C.muted, textTransform: 'uppercase', marginLeft: 4 }}>
            {t('profile.ach.completedLabel')}
          </span>
        </div>
        <div style={{ flex: 1, minWidth: 120, height: 6, background: '#1a1420', border: `1px solid ${C.lineIn}`, position: 'relative' }}>
          <span style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${pct}%`, background: 'linear-gradient(90deg,#6E2633,#C1566A)' }} />
        </div>

        <div style={{ position: 'relative', flex: 'none' }}>
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t('profile.ach.search')}
            aria-label={t('profile.ach.search')} type="search"
            style={{
              minHeight: 44, width: compact ? 168 : 218, padding: '0 34px 0 11px', border: `1px solid ${C.lineIn}`,
              background: 'rgba(7,6,10,.7)', color: C.bone, font: `400 11px ${BODY}`, outline: 'none',
            }} />
          {query && (
            <button type="button" onClick={() => { playUiClick(); setQuery('') }} aria-label={t('profile.ach.searchClear')}
              style={{ position: 'absolute', right: 0, top: 0, width: 34, height: '100%', border: 0, background: 'transparent', color: C.muted, cursor: 'pointer', font: `400 13px ${BODY}` }}>✕</button>
          )}
        </div>

        <div style={{ display: 'flex', flex: 'none' }}>
          {(['all', 'completed', 'locked'] as const).map((f) => {
            const on = stateFilter === f
            return (
              <button key={f} type="button" onClick={() => { playUiClick(); setStateFilter(f) }} aria-pressed={on}
                style={{
                  minHeight: 44, padding: '0 13px', border: `1px solid ${on ? C.gold : C.lineIn}`, marginLeft: -1,
                  background: on ? 'rgba(198,161,79,.1)' : 'rgba(7,6,10,.6)', color: on ? C.goldHi : C.muted,
                  cursor: 'pointer', font: `600 10.5px ${DISPLAY}`, letterSpacing: 1.1, textTransform: 'uppercase', whiteSpace: 'nowrap',
                }}>
                {t(`profile.ach.filter.${f}`)}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Kategorijų čipai ── */}
      <div className="rvn-prog-scroll" style={{ flex: 'none', display: 'flex', gap: 7, padding: compact ? '6px 10px' : '9px 18px', overflowX: 'auto', borderBottom: `1px solid #16131d` }}>
        {chip('all', t('profile.ach.cat.all'), summary.completed, summary.total)}
        {CAT_KEYS.map((k) => chip(k, t(`profile.ach.cat.${k}`), summary.categories[k]?.done ?? 0, summary.categories[k]?.total ?? 0))}
      </div>

      {/* ── Turinys ── */}
      <div style={{ flex: 1, minHeight: 0, display: 'flex', gap: 12, padding: compact ? '8px 10px' : '14px 18px' }}>
        <div className="rvn-prog-scroll" style={{ flex: 1, minHeight: 0, overflowY: 'auto', paddingRight: 2 }}>
          {compact && (
            <div style={{ marginBottom: 9 }}>
              <button type="button" onClick={() => { playUiClick(); setFeaturedOpen((v) => !v) }}
                aria-expanded={featuredOpen}
                style={{ width: '100%', minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '0 11px', border: `1px solid ${C.lineIn}`, background: 'rgba(7,6,10,.6)', color: C.muted,
                  cursor: 'pointer', font: `600 10px ${DISPLAY}`, letterSpacing: 1.2, textTransform: 'uppercase' }}>
                {t('profile.ach.featuredTitle')}
                <span aria-hidden style={{ color: C.gold }}>{featuredOpen ? '▾' : '▸'}</span>
              </button>
              {featuredOpen && <div style={{ marginTop: 7 }}>{featuredSlots}</div>}
            </div>
          )}
          {visible.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 40, textAlign: 'center' }}>
              <div style={{ font: `700 14px ${DISPLAY}`, color: C.muted }}>{t('profile.ach.emptyTitle')}</div>
              <div style={{ font: `400 11px ${BODY}`, color: C.label }}>{t('profile.ach.emptyBody')}</div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: compact ? '1fr' : 'repeat(3, minmax(0, 1fr))', gap: 10 }}>
              {visible.map(card)}
            </div>
          )}
        </div>

        {!compact && (
          <aside className="rvn-prog-scroll" style={{ width: 288, flex: 'none', minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 14 }}>
            <section className="rvn-prog-clip" style={{ border: `1px solid ${C.lineIn}`, background: C.raised, padding: 12 }}>
              <Kicker color={C.gold}>{t('profile.ach.featuredTitle')}</Kicker>
              <div style={{ marginTop: 9 }}>{featuredSlots}</div>
              <p style={{ font: `400 10px ${BODY}`, color: C.muted, lineHeight: 1.5, margin: '10px 0 0' }}>{t('profile.ach.featuredHint')}</p>
            </section>

            <section className="rvn-prog-clip" style={{ border: `1px solid ${C.lineIn}`, background: C.raised, padding: 12 }}>
              <Kicker>{t('profile.ach.categoriesTitle')}</Kicker>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginTop: 10 }}>
                {CAT_KEYS.map((k) => {
                  const c = summary.categories[k] ?? { done: 0, total: 0 }
                  const cp = c.total > 0 ? (c.done / c.total) * 100 : 0
                  return (
                    <button key={k} type="button" onClick={() => { playUiClick(); setCat(k) }}
                      style={{ border: 0, background: 'transparent', padding: 0, textAlign: 'left', cursor: 'pointer' }}>
                      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 6 }}>
                        <span style={{ font: `600 10.5px ${BODY}`, color: cat === k ? C.goldHi : C.muted }}>{t(`profile.ach.cat.${k}`)}</span>
                        <span style={{ font: `700 10px ${DISPLAY}`, color: c.done === c.total && c.total > 0 ? 'var(--rvn-burgundy-fg)' : C.label }}>{c.done}/{c.total}</span>
                      </div>
                      <div style={{ position: 'relative', height: 5, marginTop: 4, background: '#1a1420', border: `1px solid ${C.lineIn}` }}>
                        <span style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${cp}%`, background: 'linear-gradient(90deg,#6E2633,#C1566A)' }} />
                      </div>
                    </button>
                  )
                })}
              </div>
            </section>

            <p style={{ font: `400 10px ${BODY}`, color: C.muted, lineHeight: 1.55, border: `1px solid rgba(198,161,79,.28)`, background: 'rgba(198,161,79,.06)', padding: '9px 11px', margin: 0 }}>
              {t('profile.ach.autoNote')}
            </p>
            <p style={{ font: `400 9.5px ${BODY}`, color: C.label, margin: 0 }}>
              {t('profile.ach.showing', { shown: visible.length, total: summary.total })}
            </p>
          </aside>
        )}
      </div>

      {toast.node}
    </div>
  )
}
