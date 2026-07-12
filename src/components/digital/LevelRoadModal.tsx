'use client'

// ══════════════════════════════════════════════════════════════════════════════
// LYGIŲ KELIAS (paspaudus profilį) — aiški 1–50 progresija:
// • Kairė: dabartinis lygis, teminis vardas, rango grupė, XP baras iki kito.
// • Centras: visų 50 lygių lentelė — teminis vardas + atlygiai + būsena.
//   Atlygiai skaičiuojami iš economy_config.level_rewards TIKSLIAI kaip SQL
//   rvn__level_reward_payload (adityvu: every + every5 + every10 + milestone).
//   Lygio atlygiai įskiriami automatiškai pasiekus lygį (rvn__check_level_rewards).
// ══════════════════════════════════════════════════════════════════════════════
import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { playUiClick } from '@/lib/ui-sound'
import { useEscClose } from '@/lib/useEscClose'
import { RewardChip } from '@/components/digital/ui/RewardBits'
import { LEVEL_THRESHOLDS, MAX_LEVEL, getLevelProgress, getRankGroupForLevel } from '@/lib/gamification/levels'
import { useT } from '@/lib/i18n/react'

const GOLD = '240,180,41'

type LevelRewardsCfg = {
  every?: { silver?: number; essence?: number }
  every5?: { silver?: number; essence?: number; packs?: number }
  every10?: { silver?: number; essence?: number; rubies?: number; packs?: number }
  milestones?: Record<string, { silver?: number; essence?: number; rubies?: number; packs?: number; pack_rare?: number; card_back?: string }>
}

type RewardChips = { silver: number; essence: number; rubies: number; packs: number; packRare: number; cardBack: string | null }

/** VEIDRODIS SQL rvn__level_reward_payload (20260811) — adityvu. */
function rewardsFor(level: number, cfg: LevelRewardsCfg | null): RewardChips {
  const r: RewardChips = { silver: 0, essence: 0, rubies: 0, packs: 0, packRare: 0, cardBack: null }
  if (!cfg) return r
  r.silver += cfg.every?.silver ?? 0
  r.essence += cfg.every?.essence ?? 0
  if (level % 5 === 0) { r.silver += cfg.every5?.silver ?? 0; r.essence += cfg.every5?.essence ?? 0; r.packs += cfg.every5?.packs ?? 0 }
  if (level % 10 === 0) { r.silver += cfg.every10?.silver ?? 0; r.essence += cfg.every10?.essence ?? 0; r.rubies += cfg.every10?.rubies ?? 0; r.packs += cfg.every10?.packs ?? 0 }
  const m = cfg.milestones?.[String(level)]
  if (m) {
    r.silver += m.silver ?? 0; r.essence += m.essence ?? 0; r.rubies += m.rubies ?? 0; r.packs += m.packs ?? 0
    r.packRare += m.pack_rare ?? 0
    if (m.card_back) r.cardBack = m.card_back
  }
  return r
}

export function LevelRoadModal({ onClose }: { onClose: () => void }) {
  const t = useT()
  const tt = t                      // alias: map'e `t` = slenkstis (shadow)
  useEscClose(onClose)
  const [xp, setXp] = useState<number | null>(null)
  const [cfg, setCfg] = useState<LevelRewardsCfg | null>(null)
  const curRef = useRef<HTMLDivElement | null>(null)
  const scrolled = useRef(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      const uid = data.user?.id
      if (!uid) { setXp(0); return }
      supabase.from('profiles').select('xp_total').eq('id', uid).maybeSingle()
        .then(({ data: p }) => setXp((p as { xp_total?: number } | null)?.xp_total ?? 0))
    })
    supabase.from('economy_config').select('value').eq('key', 'level_rewards').maybeSingle()
      .then(({ data }) => setCfg(((data as { value?: LevelRewardsCfg } | null)?.value) ?? null))
  }, [])

  const prog = useMemo(() => getLevelProgress(xp ?? 0), [xp])

  useEffect(() => {
    if (xp === null || scrolled.current || !curRef.current) return
    scrolled.current = true
    try { curRef.current.scrollIntoView({ block: 'center', behavior: 'smooth' }) } catch { /* */ }
  }, [xp])

  if (typeof document === 'undefined') return null
  const rg = prog.rankGroup

  return createPortal(
    <div className="fixed inset-0 z-[400] flex items-center justify-center p-2" style={{ background: 'rgba(4,3,8,0.92)', backdropFilter: 'blur(4px)' }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="flex flex-col" style={{ width: 'min(1080px, 98vw)', height: 'min(620px, 96vh)', borderRadius: 20,
        background: `radial-gradient(120% 60% at 50% 0%, rgba(${GOLD},0.12), transparent 55%), linear-gradient(160deg, rgba(22,16,33,0.99), rgba(9,7,15,0.99))`,
        border: `1.5px solid rgba(${GOLD},0.5)`, boxShadow: '0 18px 60px rgba(0,0,0,0.7)' }}>

        {/* ── Antraštė ── */}
        <div className="flex items-center justify-between px-4 pt-3 pb-2 shrink-0" style={{ borderBottom: `1px solid rgba(${GOLD},0.16)` }}>
          <h2 style={{ fontFamily: 'var(--rvn-font-display, Cinzel, serif)', color: 'var(--gold)', fontSize: 'clamp(14px,2.6vh,19px)', letterSpacing: '0.08em' }}>{t('common.levelRoad.title')}</h2>
          <button onClick={() => { playUiClick(); onClose() }} aria-label={t('common.close')} className="rvn-press flex items-center justify-center rounded-full" style={{ width: 32, height: 32, background: 'rgba(10,8,16,0.9)', border: `1px solid rgba(${GOLD},0.4)`, color: 'var(--gold)' }}><X className="w-4 h-4" /></button>
        </div>

        {/* ── 2 zonos ── */}
        <div className="flex-1 min-h-0 grid gap-2 p-2.5" style={{ gridTemplateColumns: 'minmax(210px,1fr) minmax(0,2.4fr)' }}>

          {/* KAIRĖ: dabartinis statusas */}
          <div className="rounded-2xl flex flex-col items-center text-center min-h-0 overflow-y-auto p-3 gap-1.5" style={{ background: 'rgba(10,8,16,0.6)', border: `1px solid ${rg.color}55` }}>
            <span style={{ fontSize: 42, filter: `drop-shadow(0 0 14px ${rg.color})` }}>{rg.icon}</span>
            <span className="rvn-disp font-black leading-none" style={{ fontSize: 'clamp(22px,4.5vh,34px)', color: rg.color }}>{prog.level}<span style={{ fontSize: 14, color: 'var(--text-muted)' }}> / {MAX_LEVEL}</span></span>
            <span className="rvn-disp font-bold" style={{ fontSize: 'clamp(12px,2vh,15px)', color: '#f3ead3' }}>{prog.title}</span>
            <span className="px-2 py-0.5 rounded-full font-bold uppercase tracking-wider" style={{ fontSize: 9, background: rg.color + '22', border: `1px solid ${rg.color}88`, color: rg.color }}>{tt(rg.name)}</span>
            <div className="w-full mt-2">
              <div className="h-2.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)', border: `1px solid rgba(${GOLD},0.2)` }}>
                <div className="h-full rounded-full" style={{ width: `${prog.progressPercent}%`, background: `linear-gradient(90deg, ${rg.color}aa, ${rg.color})`, boxShadow: `0 0 10px ${rg.color}` }} />
              </div>
              <p className="mt-1 tabular-nums" style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>
                {prog.isMaxLevel ? '✦ Maksimalus lygis pasiektas!' : <>XP: <b style={{ color: '#f3ead3' }}>{prog.totalXp.toLocaleString('lt-LT')}</b> · iki kito lygio <b style={{ color: 'var(--gold)' }}>{prog.xpNeededForNextLevel.toLocaleString('lt-LT')}</b></>}
              </p>
            </div>
            <p className="mt-auto" style={{ fontSize: 9.5, color: 'rgba(150,160,185,0.55)', lineHeight: 1.4 }}>{t('common.levelRoad.info')}</p>
          </div>

          {/* CENTRAS: 50 lygių lentelė */}
          <div className="min-h-0 overflow-y-auto flex flex-col gap-1 pr-0.5">
            {LEVEL_THRESHOLDS.map((t) => {
              const g = getRankGroupForLevel(t.level)
              const r = rewardsFor(t.level, cfg)
              const reached = prog.level >= t.level
              const isCur = prog.level === t.level
              const milestone = t.level % 5 === 0
              return (
                <div key={t.level} ref={isCur ? curRef : undefined}
                  className="flex items-center gap-2 rounded-lg px-2 shrink-0"
                  style={{
                    minHeight: milestone ? 44 : 36,
                    background: isCur ? `linear-gradient(90deg, ${g.color}33, rgba(10,8,16,0.85))` : milestone ? `linear-gradient(90deg, ${g.color}18, rgba(10,8,16,0.8))` : 'rgba(10,8,16,0.55)',
                    border: isCur ? `1.5px solid ${g.color}` : `1px solid ${milestone ? g.color + '66' : 'rgba(255,255,255,0.07)'}`,
                    borderLeft: `3px solid ${g.color}`,
                    boxShadow: isCur ? `0 0 14px ${g.color}55` : 'none',
                    opacity: reached || isCur ? 1 : 0.7,
                  }}>
                  <span className="shrink-0 flex items-center justify-center rounded-full rvn-disp font-black tabular-nums"
                    style={{ width: 30, height: 30, fontSize: 12, background: reached ? g.color + '2e' : 'rgba(0,0,0,0.45)', border: `1px solid ${reached ? g.color : 'rgba(255,255,255,0.14)'}`, color: reached ? g.color : 'var(--text-muted)' }}>
                    {t.level}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate rvn-disp font-bold" style={{ fontSize: milestone ? 12.5 : 11.5, color: reached ? '#f3ead3' : 'var(--text-secondary)' }}>{milestone ? `${g.icon} ` : ''}{tt(t.title)}</span>
                    <span className="block truncate tabular-nums" style={{ fontSize: 8.5, color: 'var(--text-muted)' }}>{t.requiredTotalXp.toLocaleString('lt-LT')} XP</span>
                  </span>
                  <span className="shrink-0 flex items-center gap-1.5 flex-wrap justify-end">
                    {r.silver > 0 && <RewardChip it={{ type: 'currency', currency: 'silver', amount: r.silver }} size={14} textSize={10} color="#f3d98c" />}
                    {r.essence > 0 && <RewardChip it={{ type: 'currency', currency: 'essence', amount: r.essence }} size={14} textSize={10} color="#c4b5fd" />}
                    {r.rubies > 0 && <RewardChip it={{ type: 'currency', currency: 'rubies', amount: r.rubies }} size={14} textSize={10} color="#fca5a5" />}
                    {r.packs > 0 && <RewardChip it={{ type: 'item', item_type: 'pack', quantity: r.packs }} size={14} textSize={10} color="#fdba74" />}
                    {r.packRare > 0 && <RewardChip it={{ type: 'item', item_type: 'pack', quantity: r.packRare }} size={14} textSize={10} color="#93c5fd" />}
                    {r.cardBack && <RewardChip it={{ type: 'item', item_type: 'card_back', item_id: r.cardBack }} size={14} textSize={10} color="#93c5fd" />}
                  </span>
                  <span className="shrink-0 w-5 text-center" style={{ fontSize: 12 }}>
                    {isCur ? <span style={{ color: g.color }}>◈</span> : reached ? <span style={{ color: '#4ade80' }}>✓</span> : <span style={{ color: 'var(--text-muted)' }}>🔒</span>}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}
