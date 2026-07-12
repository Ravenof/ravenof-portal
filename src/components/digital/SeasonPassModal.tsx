'use client'

// ════════════════════════════════════════════════════════════════════════════
// SeasonPassModal v3 — landscape HORIZONTALUS sezono kelias:
//  • Viršus: sezono pavadinimas, likęs laikas, XP progresas iki kitos pakopos.
//  • Centras: horizontalus pakopų takas (scroll →), pakopa spaudžiama.
//  • Dešinė: pasirinktos pakopos preview (atlygiai + korta) + ATSIIMTI /
//    ATSIIMTI VISKĄ (pinned). Auto-scroll iki aktyvios pakopos.
//  Pastaba: paid (premium) eilė bus pridėta su ekonomikos pertvarkos faze —
//  duomenų modelis dabar turi tik free taką.
// ════════════════════════════════════════════════════════════════════════════

import { useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { X } from 'lucide-react'
import { getSeasonPass, claimPassTier, type SeasonPass } from '@/lib/gamification/seasonPass'
import { rarityColor } from '@/lib/digital/rarity'
import { rewardParts } from '@/lib/gamification/rewardLabel'
import { playUiClick, playSuccess, playError } from '@/lib/ui-sound'
import { RvnIcon } from './ui/RvnIcon'
import { SmartImg } from '@/components/ui/SmartImg'
import { useEscClose } from '@/lib/useEscClose'
import { useT, useContent } from '@/lib/i18n/react'

function Chip({ text }: { text: string }) {
  const accent = text.startsWith('🪙') ? '240,180,41' : text.startsWith('🎁') ? '251,146,60' : text.startsWith('🃏') ? '96,165,250' : '139,92,246'
  return (
    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap"
      style={{ background: `rgba(${accent},0.14)`, border: `1px solid rgba(${accent},0.45)`, color: `rgb(${accent})` }}>{text}</span>
  )
}

export function SeasonPassModal({ onClose, onReward }: { onClose: () => void; onReward?: () => void }) {
  const t = useT()
  const tc = useContent()
  useEscClose(onClose)
  const [pass, setPass] = useState<SeasonPass | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<number | 'all' | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [selTier, setSelTier] = useState<number | null>(null)
  const activeRef = useRef<HTMLButtonElement | null>(null)
  const scrolled = useRef(false)

  const reload = () => getSeasonPass().then((p) => { setPass(p); setLoading(false) })
  useEffect(() => { reload() }, [])

  const xp = pass?.xp ?? 0
  const tiers = pass?.tiers ?? []
  const claimedSet = useMemo(() => new Set(pass?.claimedTiers ?? []), [pass])
  const claimable = tiers.filter((t) => xp >= t.xpRequired && !claimedSet.has(t.tier))
  const nextTier = tiers.find((t) => xp < t.xpRequired) ?? null
  const prevReq = nextTier ? (tiers.filter((t) => t.xpRequired <= xp).at(-1)?.xpRequired ?? 0) : 0
  const nextPct = nextTier ? Math.min(100, Math.round(((xp - prevReq) / Math.max(1, nextTier.xpRequired - prevReq)) * 100)) : 100
  const curTierNo = tiers.filter((t) => xp >= t.xpRequired).length
  const daysLeft = pass?.season?.endsAt ? Math.max(0, Math.ceil((new Date(pass.season.endsAt).getTime() - Date.now()) / 86400000)) : null
  const activeTierNo = claimable[0]?.tier ?? nextTier?.tier ?? null
  const selected = tiers.find((t) => t.tier === (selTier ?? activeTierNo)) ?? null

  useEffect(() => {
    if (loading || scrolled.current || !activeRef.current) return
    scrolled.current = true
    try { activeRef.current.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' }) } catch {}
  }, [loading, pass])

  const doClaim = async (tier: number) => {
    if (busy !== null) return
    setBusy(tier); playUiClick()
    const r = await claimPassTier(tier)
    setBusy(null)
    if ('error' in r) { playError(); setMsg('Nepavyko atsiimti pakopos.'); return }
    playSuccess(); setMsg('Pakopa atsiimta! ' + rewardParts(r.reward).join(' · ')); onReward?.(); reload()
  }

  const doClaimAll = async () => {
    if (busy !== null || claimable.length === 0) return
    setBusy('all'); playUiClick()
    let got = 0
    for (const t of claimable) {
      const r = await claimPassTier(t.tier)
      if (!('error' in r)) got++
    }
    setBusy(null)
    if (got > 0) { playSuccess(); setMsg(t('quests.season.tiersClaimed', { count: got })); onReward?.() } else playError()
    reload()
  }

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-2" style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(3px)' }} onClick={onClose}>
      <div className="relative w-[min(1120px,98vw)] h-[min(620px,96vh)]" style={{ borderRadius: 18, background: 'rgba(240,180,41,0.32)', padding: 2 }} onClick={(e) => e.stopPropagation()}>
        <div className="flex flex-col h-full" style={{ borderRadius: 17, background: 'radial-gradient(120% 90% at 50% 0%, rgba(240,180,41,0.14), rgba(10,8,16,0.97) 60%), linear-gradient(160deg, #15101f, #0a0810)' }}>

          {/* ── Viršus: sezonas + progresas ── */}
          <div className="px-4 pt-3 pb-2.5 shrink-0" style={{ borderBottom: '1px solid rgba(240,180,41,0.16)' }}>
            <div className="flex items-center justify-between gap-2">
              <p className="font-bold inline-flex items-center gap-2 min-w-0" style={{ fontSize: 'clamp(14px,2.6vh,19px)', fontFamily: 'var(--rvn-font-display)', color: 'var(--gold)', letterSpacing: '0.08em' }}>
                <RvnIcon name="fi-season" size={24} fallback={<span>🎖️</span>} /> {t('quests.season.title')}
                {pass?.season && <span className="truncate font-semibold" style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: 0 }}>· {tc('season', pass.season.id, 'title', pass.season.title)}</span>}
              </p>
              <div className="flex items-center gap-2 shrink-0">
                {daysLeft !== null && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.12)', color: 'var(--text-muted)' }}>{t('quests.season.daysLeft', { count: daysLeft })}</span>}
                <button onClick={() => { playUiClick(); onClose() }} aria-label={t('common.close')} className="rvn-press flex items-center justify-center rounded-full" style={{ width: 32, height: 32, background: 'rgba(10,8,16,0.9)', border: '1px solid rgba(240,180,41,0.4)', color: 'var(--gold)' }}><X className="w-4 h-4" /></button>
              </div>
            </div>
            {pass?.season && (
              <div className="flex items-center gap-3 mt-1.5">
                <p className="text-[11px] shrink-0" style={{ color: 'var(--text-muted)' }}>🎖️ {xp.toLocaleString()} XP</p>
                <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(240,180,41,0.2)' }}>
                  <motion.div initial={{ width: 0 }} animate={{ width: `${nextPct}%` }} transition={{ duration: 0.7, ease: 'easeOut' }}
                    className="h-full rounded-full" style={{ background: 'linear-gradient(90deg,#ffe28c,#f3b62c)', boxShadow: '0 0 10px rgba(240,180,41,0.55)' }} />
                </div>
                <p className="text-[11px] font-bold shrink-0" style={{ color: 'var(--gold)' }}>Pakopa {curTierNo} / {tiers.length}</p>
              </div>
            )}
          </div>

          {/* ── Vidurys: horizontalus takas + dešinė preview ── */}
          <div className="flex-1 min-h-0 grid gap-2 p-2.5" style={{ gridTemplateColumns: 'minmax(0,2.9fr) minmax(210px,1fr)' }}>

            {/* Takas */}
            <div className="min-h-0 flex flex-col">
              {loading && <p className="text-xs text-center py-6" style={{ color: 'var(--text-muted)' }}>{t('common.loading')}</p>}
              {!loading && !pass?.season && <p className="text-xs text-center py-6" style={{ color: 'var(--text-muted)' }}>{t('quests.season.noActiveSeason')}</p>}
              <div className="flex-1 min-h-0 overflow-x-auto overflow-y-hidden">
                <div className="relative h-full flex items-center gap-2 px-2" style={{ minWidth: 'max-content' }}>
                  {/* jungiamoji linija */}
                  {tiers.length > 1 && <span className="absolute left-4 right-4 top-1/2 h-[2px]" style={{ background: 'linear-gradient(90deg, rgba(240,180,41,0.5), rgba(255,255,255,0.07))' }} />}
                  {tiers.map((t) => {
                    const claimed = claimedSet.has(t.tier)
                    const unlocked = xp >= t.xpRequired
                    const canClaim = unlocked && !claimed
                    const isNext = nextTier?.tier === t.tier
                    const isSel = selected?.tier === t.tier
                    const pct = Math.min(100, Math.round((xp / t.xpRequired) * 100))
                    return (
                      <button key={t.tier} ref={t.tier === activeTierNo ? activeRef : undefined}
                        onClick={() => { playUiClick(); setSelTier(t.tier) }}
                        className="relative z-10 shrink-0 flex flex-col items-center gap-1.5 px-2 py-2.5 rounded-xl"
                        style={{ width: 108,
                          background: claimed ? 'linear-gradient(160deg, rgba(34,80,50,0.35), rgba(21,16,31,0.85))' : 'linear-gradient(160deg, rgba(58,42,85,0.4), rgba(21,16,31,0.85))',
                          border: isSel ? '1.5px solid rgba(240,180,41,0.95)' : canClaim ? '1px solid rgba(240,180,41,0.6)' : isNext ? '1px solid rgba(240,180,41,0.35)' : claimed ? '1px solid rgba(74,222,128,0.25)' : '1px solid rgba(255,255,255,0.08)',
                          boxShadow: isSel ? '0 0 14px rgba(240,180,41,0.4)' : canClaim ? '0 0 12px rgba(240,180,41,0.2)' : 'none',
                          opacity: claimed ? 0.8 : unlocked || isNext ? 1 : 0.62 }}>
                        <motion.span animate={canClaim ? { scale: [1, 1.12, 1] } : {}} transition={canClaim ? { repeat: Infinity, duration: 1.5 } : {}}
                          className="flex items-center justify-center w-8 h-8 text-sm font-bold rounded-full"
                          style={{
                            background: claimed ? 'rgba(74,222,128,0.2)' : canClaim ? 'linear-gradient(180deg,#ffe28c,#c5841a)' : isNext ? 'rgba(240,180,41,0.14)' : 'rgba(0,0,0,0.5)',
                            border: claimed ? '1.5px solid rgba(74,222,128,0.7)' : canClaim ? '1.5px solid #ffeaa6' : isNext ? '1.5px solid rgba(240,180,41,0.5)' : '1.5px solid rgba(255,255,255,0.12)',
                            color: claimed ? '#4ade80' : canClaim ? '#3a2406' : isNext ? 'var(--gold)' : 'var(--text-muted)',
                            fontFamily: 'var(--rvn-font-display)' }}>
                          {claimed ? '✓' : t.tier}
                        </motion.span>
                        {t.card ? (
                          <span className="relative block overflow-hidden rounded" style={{ width: 44, height: 61, border: `1.5px solid ${rarityColor(t.card.rarity)}`, boxShadow: `0 0 8px ${rarityColor(t.card.rarity)}44` }}>
                            {t.card.imageUrl
                              ? <SmartImg src={t.card.imageUrl} width={120} className="absolute inset-0 w-full h-full object-cover" />
                              : <span className="absolute inset-0 flex items-center justify-center text-xs" style={{ background: '#15101f' }}>🎴</span>}
                          </span>
                        ) : (
                          <span className="flex items-center justify-center" style={{ width: 44, height: 61, fontSize: 22 }}>{rewardParts(t.reward)[0]?.slice(0, 2) ?? '🎁'}</span>
                        )}
                        <span className="w-full text-center truncate font-bold" style={{ fontSize: 8.5, color: unlocked ? '#e8dcc0' : 'var(--text-muted)' }}>
                          {rewardParts(t.reward).join(' · ') || '—'}
                        </span>
                        {!unlocked && (
                          <span className="w-full h-1 rounded-full overflow-hidden" style={{ background: 'rgba(0,0,0,0.5)' }}>
                            <span className="block h-full rounded-full" style={{ width: `${pct}%`, background: isNext ? 'linear-gradient(90deg,#ffe28c,#f3b62c)' : '#6b7280' }} />
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
              <p className="shrink-0 text-center" style={{ fontSize: 9, color: 'var(--text-muted)' }}>{t('quests.season.xpInfo')}</p>
            </div>

            {/* DEŠINĖ: pasirinkta pakopa */}
            <div className="rounded-2xl flex flex-col min-h-0 overflow-hidden p-3" style={{ background: 'rgba(10,8,16,0.6)', border: '1px solid rgba(240,180,41,0.22)' }}>
              {selected ? (
                <>
                  <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-2">
                    <p className="rvn-disp font-bold" style={{ fontSize: 13, color: 'var(--gold)' }}>PAKOPA {selected.tier}</p>
                    <p style={{ fontSize: 10.5, color: xp >= selected.xpRequired ? '#4ade80' : 'var(--text-muted)' }}>
                      {claimedSet.has(selected.tier) ? t('quests.season.claimed') : xp >= selected.xpRequired ? t('quests.season.ready') : t('quests.season.needXp', { xp: selected.xpRequired - xp, cur: xp, req: selected.xpRequired })}
                    </p>
                    {selected.card && (
                      <div className="mx-auto relative rounded-lg overflow-hidden" style={{ width: 110, aspectRatio: '2.5/3.5', border: `2px solid ${rarityColor(selected.card.rarity)}`, boxShadow: `0 0 14px ${rarityColor(selected.card.rarity)}44` }}>
                        {selected.card.imageUrl
                          ? <SmartImg src={selected.card.imageUrl} width={220} className="absolute inset-0 w-full h-full object-cover" />
                          : <span className="absolute inset-0 flex items-center justify-center text-2xl" style={{ background: '#15101f' }}>🎴</span>}
                      </div>
                    )}
                    {selected.card && <p className="text-center font-bold" style={{ fontSize: 11, color: rarityColor(selected.card.rarity) }}>{selected.card.name}</p>}
                    <div className="flex flex-wrap gap-1 justify-center">
                      {rewardParts(selected.reward).map((x) => <Chip key={x} text={x} />)}
                    </div>
                    {msg && <p className="text-center px-2 py-1.5 rounded-lg" style={{ fontSize: 10.5, background: 'rgba(10,8,16,0.9)', border: '1px solid rgba(240,180,41,0.4)', color: 'var(--gold)' }}>{msg}</p>}
                  </div>
                  <div className="shrink-0 mt-2 flex flex-col gap-1.5">
                    <button onClick={() => doClaim(selected.tier)} disabled={!(xp >= selected.xpRequired && !claimedSet.has(selected.tier)) || busy !== null}
                      className="rvn-press w-full rounded-xl font-extrabold disabled:opacity-40"
                      style={{ minHeight: 40, fontSize: 12, fontFamily: 'var(--rvn-font-display)',
                        background: xp >= selected.xpRequired && !claimedSet.has(selected.tier) ? 'linear-gradient(180deg,#ffe28c,#f3b62c 46%,#c5841a)' : 'rgba(255,255,255,0.06)',
                        border: xp >= selected.xpRequired && !claimedSet.has(selected.tier) ? '1px solid #ffeaa6' : '1px solid rgba(255,255,255,0.1)',
                        color: xp >= selected.xpRequired && !claimedSet.has(selected.tier) ? '#3a2406' : 'var(--text-muted)' }}>
                      {busy === selected.tier ? '…' : claimedSet.has(selected.tier) ? t('quests.season.claimed') : xp >= selected.xpRequired ? t('quests.season.claimTier', { tier: selected.tier }) : t('quests.season.locked')}
                    </button>
                    {claimable.length > 1 && (
                      <button onClick={doClaimAll} disabled={busy !== null}
                        className="rvn-press w-full rounded-xl font-bold"
                        style={{ minHeight: 34, fontSize: 11, fontFamily: 'var(--rvn-font-display)', background: 'rgba(240,180,41,0.14)', border: '1px solid rgba(240,180,41,0.5)', color: 'var(--gold)' }}>
                        {busy === 'all' ? '…' : t('quests.season.claimAllN', { count: claimable.length })}
                      </button>
                    )}
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-center px-3" style={{ fontSize: 11, color: 'var(--text-muted)' }}>{loading ? t('common.loading') : t('quests.season.pickTier')}</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
