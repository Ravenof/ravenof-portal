'use client'

// ════════════════════════════════════════════════════════════════════════════
// SeasonPassModal v2 — sezono kelias su AIŠKIU progression:
//  • Sticky antraštė: dabartinė pakopa, progresas iki KITOS pakopos ir jos
//    atlygio preview („kita: 🎁 1 pak. — dar 120 XP").
//  • Pakopų takas su jungiamąja linija: atsiimta ✓ / paruošta (pulsuoja) /
//    vykdoma (baras) / užrakinta. Featured korta rodoma stambiai.
//  • „Atsiimti viską" kai paruošta >1. Auto-scroll iki aktyvios pakopos.
// ════════════════════════════════════════════════════════════════════════════

import { useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { getSeasonPass, claimPassTier, type SeasonPass } from '@/lib/gamification/seasonPass'
import { rarityColor } from '@/lib/digital/rarity'
import { rewardParts } from '@/lib/gamification/rewardLabel'
import { playUiClick, playSuccess, playError } from '@/lib/ui-sound'
import { RvnIcon } from './ui/RvnIcon'
import { SmartImg } from '@/components/ui/SmartImg'

function Chip({ text }: { text: string }) {
  const accent = text.startsWith('🪙') ? '240,180,41' : text.startsWith('🎁') ? '251,146,60' : text.startsWith('🃏') ? '96,165,250' : '139,92,246'
  return (
    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap"
      style={{ background: `rgba(${accent},0.14)`, border: `1px solid rgba(${accent},0.45)`, color: `rgb(${accent})` }}>{text}</span>
  )
}

export function SeasonPassModal({ onClose, onReward }: { onClose: () => void; onReward?: () => void }) {
  const [pass, setPass] = useState<SeasonPass | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<number | 'all' | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const activeRef = useRef<HTMLDivElement | null>(null)
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
  // aktyvi (scroll taikinys): pirma paruošta atsiimti, kitaip pirma užrakinta
  const activeTierNo = claimable[0]?.tier ?? nextTier?.tier ?? null

  useEffect(() => {
    if (loading || scrolled.current || !activeRef.current) return
    scrolled.current = true
    try { activeRef.current.scrollIntoView({ block: 'center', behavior: 'smooth' }) } catch {}
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
    if (got > 0) { playSuccess(); setMsg(`Atsiimtos ${got} pakopos!`); onReward?.() } else playError()
    reload()
  }

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.8)' }} onClick={onClose}>
      <div className="relative w-[min(480px,95vw)] max-h-[88vh]" style={{ borderRadius: 18, background: 'rgba(240,180,41,0.32)', padding: 2 }} onClick={(e) => e.stopPropagation()}>
        <div className="flex flex-col max-h-[88vh]" style={{ borderRadius: 17, background: 'radial-gradient(120% 90% at 50% 0%, rgba(240,180,41,0.14), rgba(10,8,16,0.97) 60%), linear-gradient(160deg, #15101f, #0a0810)' }}>

          {/* ── Sticky antraštė su progresu ── */}
          <div className="px-5 pt-5 pb-3 shrink-0" style={{ borderBottom: '1px solid rgba(240,180,41,0.16)' }}>
            <div className="flex items-center justify-between">
              <p className="text-lg font-bold inline-flex items-center gap-2" style={{ fontFamily: 'var(--rvn-font-display)', color: 'var(--gold)', letterSpacing: '0.08em' }}><RvnIcon name="fi-season" size={24} fallback={<span>🎖️</span>} /> SEZONO KELIAS</p>
              {daysLeft !== null && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.12)', color: 'var(--text-muted)' }}>⏳ liko {daysLeft} d.</span>}
            </div>
            {pass?.season && (
              <>
                <div className="flex items-center justify-between mt-1.5 mb-1">
                  <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{pass.season.title} · 🎖️ {xp.toLocaleString()} XP</p>
                  <p className="text-[11px] font-bold" style={{ color: 'var(--gold)' }}>Pakopa {curTierNo} / {tiers.length}</p>
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(240,180,41,0.2)' }}>
                  <motion.div initial={{ width: 0 }} animate={{ width: `${nextPct}%` }} transition={{ duration: 0.7, ease: 'easeOut' }}
                    className="h-full rounded-full" style={{ background: 'linear-gradient(90deg,#ffe28c,#f3b62c)', boxShadow: '0 0 10px rgba(240,180,41,0.55)' }} />
                </div>
                {nextTier ? (
                  <p className="text-[10.5px] mt-1.5 flex items-center gap-1.5 flex-wrap" style={{ color: 'var(--text-muted)' }}>
                    Kita pakopa ({nextTier.tier}) už <span style={{ color: '#f3ead3', fontWeight: 700 }}>{nextTier.xpRequired - xp} XP</span>:
                    {rewardParts(nextTier.reward).map((t) => <Chip key={t} text={t} />)}
                    {nextTier.card && <Chip text={`🃏 ${nextTier.card.name}`} />}
                  </p>
                ) : (
                  <p className="text-[10.5px] mt-1.5 font-bold" style={{ color: '#4ade80' }}>✓ Visas kelias įveiktas!</p>
                )}
                <p className="text-[9px] mt-1" style={{ color: 'var(--text-muted)' }}>Kelio XP gauni už dienos užduotis 📅</p>
                {claimable.length > 1 && (
                  <button onClick={doClaimAll} disabled={busy !== null}
                    className="mt-2 w-full py-2 rounded-xl text-xs font-extrabold transition-transform active:scale-[0.98]"
                    style={{ fontFamily: 'var(--rvn-font-display)', background: 'linear-gradient(180deg,#ffe28c,#f3b62c 46%,#c5841a)', color: '#3a2406', border: '1px solid #ffeaa6' }}>
                    {busy === 'all' ? '…' : `🎉 Atsiimti viską (${claimable.length})`}
                  </button>
                )}
              </>
            )}
          </div>

          {/* ── Pakopų takas ── */}
          <div className="px-5 py-3 flex-1 min-h-0 overflow-y-auto">
            {loading && <p className="text-xs text-center py-6" style={{ color: 'var(--text-muted)' }}>Kraunama…</p>}
            {!loading && !pass?.season && <p className="text-xs text-center py-6" style={{ color: 'var(--text-muted)' }}>Aktyvaus sezono nėra.</p>}

            <div className="relative">
              {/* jungiamoji linija */}
              {tiers.length > 1 && <span className="absolute left-[17px] top-4 bottom-4 w-[2px]" style={{ background: 'linear-gradient(180deg, rgba(240,180,41,0.5), rgba(255,255,255,0.07))' }} />}
              <div className="space-y-2">
                {tiers.map((t) => {
                  const claimed = claimedSet.has(t.tier)
                  const unlocked = xp >= t.xpRequired
                  const canClaim = unlocked && !claimed
                  const isNext = nextTier?.tier === t.tier
                  const pct = Math.min(100, Math.round((xp / t.xpRequired) * 100))
                  return (
                    <div key={t.tier} ref={t.tier === activeTierNo ? activeRef : undefined} className="relative flex items-stretch gap-2.5">
                      {/* mazgas */}
                      <div className="relative z-10 flex items-start pt-2.5 shrink-0">
                        <motion.div animate={canClaim ? { scale: [1, 1.12, 1] } : {}} transition={canClaim ? { repeat: Infinity, duration: 1.5 } : {}}
                          className="flex items-center justify-center w-9 h-9 text-sm font-bold"
                          style={{ borderRadius: 999,
                            background: claimed ? 'rgba(74,222,128,0.2)' : canClaim ? 'linear-gradient(180deg,#ffe28c,#c5841a)' : isNext ? 'rgba(240,180,41,0.14)' : 'rgba(0,0,0,0.5)',
                            border: claimed ? '1.5px solid rgba(74,222,128,0.7)' : canClaim ? '1.5px solid #ffeaa6' : isNext ? '1.5px solid rgba(240,180,41,0.5)' : '1.5px solid rgba(255,255,255,0.12)',
                            color: claimed ? '#4ade80' : canClaim ? '#3a2406' : isNext ? 'var(--gold)' : 'var(--text-muted)',
                            boxShadow: canClaim ? '0 0 14px rgba(240,180,41,0.5)' : 'none',
                            fontFamily: 'var(--rvn-font-display)' }}>
                          {claimed ? '✓' : t.tier}
                        </motion.div>
                      </div>
                      {/* kortelė */}
                      <div className="flex-1 min-w-0 px-3 py-2.5" style={{ borderRadius: 11,
                        background: claimed ? 'linear-gradient(160deg, rgba(34,80,50,0.22), rgba(21,16,31,0.6))' : 'linear-gradient(160deg, rgba(58,42,85,0.35), rgba(21,16,31,0.7))',
                        border: canClaim ? '1px solid rgba(240,180,41,0.6)' : isNext ? '1px solid rgba(240,180,41,0.35)' : claimed ? '1px solid rgba(74,222,128,0.25)' : '1px solid rgba(255,255,255,0.08)',
                        boxShadow: canClaim ? '0 0 12px rgba(240,180,41,0.2)' : 'none',
                        opacity: claimed ? 0.75 : unlocked || isNext ? 1 : 0.62 }}>
                        <div className="flex items-center justify-between gap-2">
                          <span className="flex items-center gap-1 flex-wrap min-w-0">
                            {rewardParts(t.reward).map((x) => <Chip key={x} text={x} />)}
                          </span>
                          <button onClick={() => doClaim(t.tier)} disabled={!canClaim || busy === t.tier}
                            className="px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all disabled:opacity-45 active:scale-95 shrink-0"
                            style={{ fontFamily: 'var(--rvn-font-display)',
                              background: claimed ? 'rgba(74,222,128,0.15)' : canClaim ? 'linear-gradient(180deg,#ffe28c,#f3b62c 46%,#c5841a)' : 'rgba(255,255,255,0.05)',
                              border: claimed ? '1px solid rgba(74,222,128,0.5)' : canClaim ? '1px solid #ffeaa6' : '1px solid rgba(255,255,255,0.12)',
                              color: claimed ? '#4ade80' : canClaim ? '#3a2406' : 'var(--text-muted)' }}>
                            {claimed ? '✓' : busy === t.tier ? '…' : canClaim ? 'Imti!' : '🔒'}
                          </button>
                        </div>
                        {t.card && (
                          <div className="flex items-center gap-2 mt-1.5">
                            <span className="relative block overflow-hidden rounded shrink-0" style={{ width: 38, height: 53, border: `1.5px solid ${rarityColor(t.card.rarity)}`, boxShadow: `0 0 8px ${rarityColor(t.card.rarity)}44` }}>
                              {t.card.imageUrl
                                ? <SmartImg src={t.card.imageUrl} width={120} className="absolute inset-0 w-full h-full object-cover" />
                                : <span className="absolute inset-0 flex items-center justify-center text-xs" style={{ background: '#15101f' }}>🎴</span>}
                            </span>
                            <span className="min-w-0">
                              <span className="block text-[11px] font-bold truncate" style={{ color: rarityColor(t.card.rarity) }}>{t.card.name}</span>
                              <span className="block text-[9px]" style={{ color: 'var(--text-muted)' }}>{t.card.rarity ?? ''} · šio mėnesio korta</span>
                            </span>
                          </div>
                        )}
                        {!unlocked && (
                          <>
                            <div className="h-1 rounded-full overflow-hidden mt-1.5" style={{ background: 'rgba(0,0,0,0.5)' }}>
                              <div className="h-full rounded-full" style={{ width: `${pct}%`, background: isNext ? 'linear-gradient(90deg,#ffe28c,#f3b62c)' : '#6b7280' }} />
                            </div>
                            <p className="text-[9px] mt-0.5" style={{ color: isNext ? '#e8dcc0' : 'var(--text-muted)' }}>{isNext ? `Dar ${t.xpRequired - xp} XP` : `${xp}/${t.xpRequired} XP`}</p>
                          </>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {msg && <p className="text-[11px] text-center mt-3" style={{ color: 'var(--gold)' }}>{msg}</p>}
          </div>

          <div className="px-5 py-2.5 shrink-0" style={{ borderTop: '1px solid rgba(240,180,41,0.15)' }}>
            <button onClick={() => { playUiClick(); onClose() }} className="mx-auto block text-xs" style={{ color: 'var(--text-muted)' }}>Uždaryti</button>
          </div>
        </div>
      </div>
    </div>
  )
}
