'use client'

// ════════════════════════════════════════════════════════════════════════════
// QuestsModal v3 — landscape 3 zonų overlay:
//  • KAIRĖ: prisijungimo serija (7 dienų juosta su būsimais prizais).
//  • CENTRAS: dienos užduotys su progreso barais ir atlygio ženkliukais.
//  • DEŠINĖ: „dar gali gauti šiandien" suvestinė + ATSIIMTI VISKĄ (pinned).
//  Serijos formulė — deterministinis rvn_login_checkin veidrodis:
//  min(50+(d−1)·25, 300), d%7=0 → +1 pakuotė.
// ════════════════════════════════════════════════════════════════════════════

import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { X } from 'lucide-react'
import { getDailyQuests, loginCheckin, claimQuest, streakDayReward, type DailyQuest, type LoginCheckin } from '@/lib/gamification/quests'
import { rewardParts } from '@/lib/gamification/rewardLabel'
import { playUiClick, playSuccess, playError } from '@/lib/ui-sound'
import { RvnIcon } from './ui/RvnIcon'
import { useEscClose } from '@/lib/useEscClose'

const QUEST_ICON: Record<string, string> = { win: '⚔️', pve_win: '🎯', pvp_win: '⚔️', open_pack: '🎁', play_match: '🃏' }

function Chip({ text, accent = '196,181,253' }: { text: string; accent?: string }) {
  return (
    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap"
      style={{ background: `rgba(${accent},0.14)`, border: `1px solid rgba(${accent},0.45)`, color: `rgb(${accent})` }}>
      {text}
    </span>
  )
}
const chipAccent = (t: string) => t.startsWith('🪙') ? '240,180,41' : t.startsWith('🎁') ? '251,146,60' : t.startsWith('🃏') ? '96,165,250' : t.startsWith('🎖') ? '139,92,246' : '196,181,253'

export function QuestsModal({ onClose, onReward }: { onClose: () => void; onReward?: () => void }) {
  useEscClose(onClose)
  const [quests, setQuests] = useState<DailyQuest[]>([])
  const [streak, setStreak] = useState<LoginCheckin | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([getDailyQuests(), loginCheckin()]).then(([q, s]) => {
      setQuests(q); setStreak(s); setLoading(false)
    })
  }, [])

  const doClaim = async (q: DailyQuest) => {
    if (busy) return
    setBusy(q.quest_key); playUiClick()
    const r = await claimQuest(q.quest_key)
    setBusy(null)
    if ('error' in r) { playError(); setMsg('Nepavyko atsiimti atlygio.'); return }
    playSuccess()
    setQuests((prev) => prev.map((x) => x.quest_key === q.quest_key ? { ...x, claimed: true } : x))
    setMsg('Atlygis atsiimtas! ' + rewardParts(q.reward_payload).join(' · '))
    onReward?.()
  }

  const claimables = quests.filter((q) => q.progress >= q.target && !q.claimed)
  const doClaimAll = async () => {
    if (busy || claimables.length === 0) return
    setBusy('__all__'); playUiClick()
    let ok = 0
    for (const q of claimables) {
      const r = await claimQuest(q.quest_key)
      if (!('error' in r)) { ok++; setQuests((prev) => prev.map((x) => x.quest_key === q.quest_key ? { ...x, claimed: true } : x)) }
    }
    setBusy(null)
    if (ok > 0) { playSuccess(); setMsg(`Atsiimta atlygių: ${ok}`); onReward?.() } else { playError(); setMsg('Nepavyko atsiimti.') }
  }

  const doneCount = quests.filter((q) => q.progress >= q.target).length
  // Suvestinė: kiek dar galima gauti šiandien (neatsiimtos užduotys)
  const remaining = useMemo(() => {
    const sum = { gold: 0, passXp: 0, boosters: 0 }
    for (const q of quests) {
      if (q.claimed) continue
      sum.gold += Number(q.reward_payload?.gold ?? 0)
      sum.passXp += Number(q.reward_payload?.passXp ?? 0)
      sum.boosters += Number(q.reward_payload?.boosters ?? 0)
    }
    return sum
  }, [quests])

  // Serijos juosta: šiandien + 6 ateinančios dienos
  const strip = useMemo(() => {
    const cur = Math.max(1, streak?.streak ?? 1)
    return Array.from({ length: 7 }, (_, i) => {
      const day = cur + i
      return { day, ...streakDayReward(day), today: i === 0 }
    })
  }, [streak])

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-2" style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(3px)' }} onClick={onClose}>
      <div className="relative w-[min(1080px,98vw)] h-[min(620px,96vh)]" style={{ borderRadius: 18, background: 'rgba(139,92,246,0.32)', padding: 2 }} onClick={(e) => e.stopPropagation()}>
        <div className="flex flex-col h-full" style={{ borderRadius: 17, background: 'radial-gradient(120% 90% at 50% 0%, rgba(139,92,246,0.14), rgba(10,8,16,0.97) 60%), linear-gradient(160deg, #15101f, #0a0810)' }}>

          {/* ── Antraštė ── */}
          <div className="flex items-center justify-between px-4 pt-3 pb-2 shrink-0" style={{ borderBottom: '1px solid rgba(139,92,246,0.2)' }}>
            <p className="font-bold inline-flex items-center gap-2" style={{ fontSize: 'clamp(14px,2.6vh,19px)', fontFamily: 'var(--rvn-font-display)', color: '#c4b5fd', letterSpacing: '0.08em' }}><RvnIcon name="fi-quests" size={24} fallback={<span>📅</span>} /> DIENOS UŽDUOTYS</p>
            <div className="flex items-center gap-2">
              {!loading && quests.length > 0 && <span className="text-[11px] font-bold" style={{ color: doneCount === quests.length ? '#4ade80' : 'var(--text-muted)' }}>{doneCount}/{quests.length} įvykdyta</span>}
              <button onClick={() => { playUiClick(); onClose() }} aria-label="Uždaryti" className="rvn-press flex items-center justify-center rounded-full" style={{ width: 32, height: 32, background: 'rgba(10,8,16,0.9)', border: '1px solid rgba(139,92,246,0.4)', color: '#c4b5fd' }}><X className="w-4 h-4" /></button>
            </div>
          </div>

          {/* ── 3 zonos ── */}
          <div className="flex-1 min-h-0 grid gap-2 p-2.5" style={{ gridTemplateColumns: 'minmax(170px,0.85fr) minmax(0,2.1fr) minmax(190px,0.95fr)' }}>

            {/* KAIRĖ: prisijungimo serija */}
            <div className="rounded-2xl flex flex-col min-h-0 overflow-hidden px-3 pt-2.5 pb-3" style={{ background: 'linear-gradient(160deg, rgba(251,146,60,0.14), rgba(21,16,31,0.75))', border: '1px solid rgba(251,146,60,0.4)' }}>
              {streak ? (
                <>
                  <p className="shrink-0 text-sm font-bold" style={{ color: '#fdba74', fontFamily: 'var(--rvn-font-display)' }}>🔥 {streak.streak} d. serija</p>
                  <p className="shrink-0 mb-2" style={{ fontSize: 9.5, color: 'var(--text-muted)' }}>Ilgiausia: {streak.longest} d. · kas 7-a diena — 🎁 pakuotė</p>
                  <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-1">
                    {strip.map((d) => (
                      <motion.div key={d.day} initial={{ x: -8, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: (d.day - strip[0].day) * 0.05 }}
                        className="shrink-0 flex items-center gap-2 py-1.5 px-2"
                        style={{
                          borderRadius: 9,
                          background: d.today ? 'linear-gradient(90deg, rgba(251,146,60,0.32), rgba(251,146,60,0.08))' : 'rgba(0,0,0,0.35)',
                          border: d.today ? '1px solid rgba(251,146,60,0.8)' : d.booster ? '1px solid rgba(251,146,60,0.45)' : '1px solid rgba(255,255,255,0.08)',
                          boxShadow: d.today ? '0 0 12px rgba(251,146,60,0.3)' : 'none',
                        }}>
                        <span className="text-base leading-none shrink-0" style={{ filter: d.today ? 'none' : 'saturate(0.75)' }}>{d.booster ? '🎁' : '🪙'}</span>
                        <span className="min-w-0 flex-1">
                          <span className="block font-bold uppercase" style={{ fontSize: 8.5, color: d.today ? '#fdba74' : 'var(--text-muted)' }}>{d.today ? 'Šiandien' : `${d.day} diena`}</span>
                          <span className="block font-bold" style={{ fontSize: 10, color: d.booster ? '#fdba74' : 'var(--gold)' }}>{d.booster ? `🪙 ${d.gold} + pakuotė` : `🪙 ${d.gold}`}</span>
                        </span>
                        {d.today && <span className="shrink-0 font-bold" style={{ fontSize: 10, color: '#4ade80' }}>✓</span>}
                      </motion.div>
                    ))}
                  </div>
                </>
              ) : <p className="text-xs text-center py-6" style={{ color: 'var(--text-muted)' }}>Kraunama…</p>}
            </div>

            {/* CENTRAS: užduotys */}
            <div className="min-h-0 overflow-y-auto space-y-2">
              {loading && <p className="text-xs text-center py-6" style={{ color: 'var(--text-muted)' }}>Kraunama…</p>}
              {quests.map((q, qi) => {
                const pct = Math.min(100, Math.round((q.progress / q.target) * 100))
                const complete = q.progress >= q.target
                const claimable = complete && !q.claimed
                return (
                  <motion.div key={q.quest_key} initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.08 + qi * 0.07 }}
                    className="px-3 py-2.5 relative overflow-hidden"
                    style={{
                      borderRadius: 11,
                      background: q.claimed ? 'linear-gradient(160deg, rgba(34,80,50,0.3), rgba(21,16,31,0.7))' : 'linear-gradient(160deg, rgba(58,42,85,0.4), rgba(21,16,31,0.7))',
                      border: claimable ? '1px solid rgba(240,180,41,0.65)' : q.claimed ? '1px solid rgba(74,222,128,0.3)' : '1px solid rgba(139,92,246,0.28)',
                      boxShadow: claimable ? '0 0 14px rgba(240,180,41,0.25)' : 'none',
                      opacity: q.claimed ? 0.72 : 1,
                    }}>
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-bold inline-flex items-center gap-1.5" style={{ color: 'var(--text-primary)', fontFamily: 'var(--rvn-font-display)' }}>
                        <span>{QUEST_ICON[q.event_type] ?? '📜'}</span>{q.title}
                      </p>
                      <span className="text-[10px] font-bold shrink-0" style={{ color: complete ? '#4ade80' : 'var(--text-muted)' }}>{Math.min(q.progress, q.target)}/{q.target}</span>
                    </div>
                    <p className="text-[10px] mb-1.5" style={{ color: 'var(--text-muted)' }}>{q.description}</p>
                    <div className="h-1.5 rounded-full overflow-hidden mb-2" style={{ background: 'rgba(0,0,0,0.5)' }}>
                      <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ delay: 0.25 + qi * 0.07, duration: 0.6, ease: 'easeOut' }}
                        className="h-full rounded-full" style={{ background: complete ? 'linear-gradient(90deg,#22c55e,#4ade80)' : 'linear-gradient(90deg,#8b5cf6,#c4b5fd)', boxShadow: complete ? '0 0 8px rgba(74,222,128,0.5)' : 'none' }} />
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-1 flex-wrap min-w-0">
                        {rewardParts(q.reward_payload).map((t) => <Chip key={t} text={t} accent={chipAccent(t)} />)}
                      </span>
                      <motion.button
                        onClick={() => doClaim(q)}
                        disabled={!claimable || busy !== null}
                        animate={claimable ? { scale: [1, 1.05, 1] } : {}}
                        transition={claimable ? { repeat: Infinity, duration: 1.6, ease: 'easeInOut' } : {}}
                        className="px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all disabled:opacity-40 active:scale-95 shrink-0"
                        style={{
                          fontFamily: 'var(--rvn-font-display)',
                          background: q.claimed ? 'rgba(74,222,128,0.15)' : claimable ? 'linear-gradient(180deg,#ffe28c,#f3b62c 46%,#c5841a)' : 'rgba(139,92,246,0.18)',
                          border: q.claimed ? '1px solid rgba(74,222,128,0.5)' : claimable ? '1px solid #ffeaa6' : '1px solid rgba(139,92,246,0.4)',
                          color: q.claimed ? '#4ade80' : claimable ? '#3a2406' : 'var(--text-muted)',
                        }}>
                        {q.claimed ? '✓ Atsiimta' : busy === q.quest_key ? '…' : claimable ? 'Atsiimti!' : '🔒'}
                      </motion.button>
                    </div>
                  </motion.div>
                )
              })}
              {!loading && quests.length === 0 && <p className="text-xs text-center py-4" style={{ color: 'var(--text-muted)' }}>Šiandien užduočių nėra.</p>}
            </div>

            {/* DEŠINĖ: suvestinė + atsiimti viską */}
            <div className="rounded-2xl flex flex-col min-h-0 overflow-hidden p-3" style={{ background: 'rgba(10,8,16,0.6)', border: '1px solid rgba(139,92,246,0.3)' }}>
              <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-2.5">
                <div>
                  <p className="uppercase font-bold mb-1.5" style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: '0.14em' }}>Šiandien dar gali gauti</p>
                  {(remaining.gold > 0 || remaining.passXp > 0 || remaining.boosters > 0) ? (
                    <div className="flex flex-col gap-1.5">
                      {remaining.gold > 0 && <span className="px-2 py-1.5 rounded-lg font-bold" style={{ fontSize: 11.5, background: 'rgba(240,180,41,0.1)', border: '1px solid rgba(240,180,41,0.4)', color: 'var(--gold)' }}>🪙 {remaining.gold} aukso</span>}
                      {remaining.boosters > 0 && <span className="px-2 py-1.5 rounded-lg font-bold" style={{ fontSize: 11.5, background: 'rgba(251,146,60,0.1)', border: '1px solid rgba(251,146,60,0.4)', color: '#fdba74' }}>🎁 {remaining.boosters} pakuotė(s)</span>}
                      {remaining.passXp > 0 && <span className="px-2 py-1.5 rounded-lg font-bold" style={{ fontSize: 11.5, background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.4)', color: '#c4b5fd' }}>🎖️ {remaining.passXp} sezono kelio XP</span>}
                    </div>
                  ) : (
                    <p style={{ fontSize: 11, color: '#4ade80', fontWeight: 700 }}>✓ Viskas atsiimta — grįžk rytoj!</p>
                  )}
                </div>
                <p style={{ fontSize: 9.5, color: 'rgba(150,160,185,0.55)', lineHeight: 1.4 }}>Užduočių atlygiai kelia ir sezono kelio progresą. Naujos užduotys — kas dieną 00:00.</p>
                {msg && <p className="text-center px-2 py-1.5 rounded-lg" style={{ fontSize: 10.5, background: 'rgba(10,8,16,0.9)', border: '1px solid rgba(139,92,246,0.4)', color: '#c4b5fd' }}>{msg}</p>}
              </div>
              <button onClick={doClaimAll} disabled={claimables.length === 0 || busy !== null}
                className="rvn-press shrink-0 mt-2 w-full rounded-xl font-extrabold disabled:opacity-40"
                style={{ minHeight: 44, fontSize: 13, fontFamily: 'var(--rvn-font-display)',
                  background: claimables.length > 0 ? 'linear-gradient(180deg,#ffe28c,#f3b62c 46%,#c5841a)' : 'rgba(255,255,255,0.06)',
                  border: claimables.length > 0 ? '1px solid #ffeaa6' : '1px solid rgba(255,255,255,0.1)',
                  color: claimables.length > 0 ? '#3a2406' : 'var(--text-muted)',
                  boxShadow: claimables.length > 0 ? 'inset 0 1px 0 rgba(255,255,255,0.6), 0 6px 18px rgba(240,180,41,0.35)' : 'none' }}>
                {busy === '__all__' ? 'Skiriama…' : claimables.length > 0 ? `Atsiimti viską (${claimables.length})` : 'Nėra ką atsiimti'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
