'use client'

// ════════════════════════════════════════════════════════════════════════════
// QuestsModal v2 — dienos užduotys + prisijungimo serija su AIŠKIU progression:
//  • 7 dienų serijos juosta: matai, koks prizas laukia KIEKVIENĄ ateinančią
//    dieną (auksas auga, kas 7-a diena – pakuotė) — deterministinis veidrodis
//    rvn_login_checkin formulės: min(50+(d−1)·25, 300), d%7=0 → +1 pakuotė.
//  • Užduotys su atlygio ženkliukais, animuotais progreso barais ir „dar gali
//    gauti šiandien" suvestine.
// ════════════════════════════════════════════════════════════════════════════

import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { getDailyQuests, loginCheckin, claimQuest, streakDayReward, type DailyQuest, type LoginCheckin } from '@/lib/gamification/quests'
import { rewardParts } from '@/lib/gamification/rewardLabel'
import { playUiClick, playSuccess, playError } from '@/lib/ui-sound'
import { RvnIcon } from './ui/RvnIcon'

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
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.8)' }} onClick={onClose}>
      <div className="relative w-[min(480px,95vw)] max-h-[88vh]" style={{ borderRadius: 18, background: 'rgba(139,92,246,0.32)', padding: 2 }} onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-6 overflow-y-auto max-h-[88vh]" style={{ borderRadius: 17, background: 'radial-gradient(120% 90% at 50% 0%, rgba(139,92,246,0.14), rgba(10,8,16,0.97) 60%), linear-gradient(160deg, #15101f, #0a0810)' }}>
          <div className="flex items-center justify-between mb-1">
            <p className="text-lg font-bold inline-flex items-center gap-2" style={{ fontFamily: 'var(--rvn-font-display)', color: '#c4b5fd', letterSpacing: '0.08em' }}><RvnIcon name="fi-quests" size={24} fallback={<span>📅</span>} /> DIENOS UŽDUOTYS</p>
            {!loading && quests.length > 0 && <span className="text-[11px] font-bold" style={{ color: doneCount === quests.length ? '#4ade80' : 'var(--text-muted)' }}>{doneCount}/{quests.length} įvykdyta</span>}
          </div>

          {/* ── Prisijungimo serija: 7 dienų juosta su būsimais prizais ── */}
          {streak && (
            <div className="mb-4 px-3 pt-2.5 pb-3" style={{ borderRadius: 12, background: 'linear-gradient(160deg, rgba(251,146,60,0.16), rgba(21,16,31,0.75))', border: '1px solid rgba(251,146,60,0.4)' }}>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-bold" style={{ color: '#fdba74', fontFamily: 'var(--rvn-font-display)' }}>🔥 {streak.streak} d. serija</p>
                <p className="text-[9.5px]" style={{ color: 'var(--text-muted)' }}>Ilgiausia: {streak.longest} d. · kas 7-a diena — 🎁 pakuotė</p>
              </div>
              <div className="grid grid-cols-7 gap-1">
                {strip.map((d) => (
                  <motion.div key={d.day} initial={{ y: 6, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: (d.day - strip[0].day) * 0.05 }}
                    className="flex flex-col items-center py-1.5 px-0.5 text-center"
                    style={{
                      borderRadius: 9,
                      background: d.today ? 'linear-gradient(180deg, rgba(251,146,60,0.32), rgba(251,146,60,0.1))' : 'rgba(0,0,0,0.35)',
                      border: d.today ? '1px solid rgba(251,146,60,0.8)' : d.booster ? '1px solid rgba(251,146,60,0.45)' : '1px solid rgba(255,255,255,0.08)',
                      boxShadow: d.today ? '0 0 12px rgba(251,146,60,0.35)' : 'none',
                    }}>
                    <span className="text-[8px] font-bold uppercase" style={{ color: d.today ? '#fdba74' : 'var(--text-muted)' }}>{d.today ? 'Šiandien' : `${d.day} d.`}</span>
                    <span className="text-sm leading-tight" style={{ filter: d.today ? 'none' : 'saturate(0.75)' }}>{d.booster ? '🎁' : '🪙'}</span>
                    <span className="text-[8.5px] font-bold" style={{ color: d.booster ? '#fdba74' : 'var(--gold)' }}>{d.booster ? `${d.gold}+pak.` : d.gold}</span>
                    {d.today && <span className="text-[8px] font-bold" style={{ color: '#4ade80' }}>✓</span>}
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {loading && <p className="text-xs text-center py-6" style={{ color: 'var(--text-muted)' }}>Kraunama…</p>}

          {/* ── Užduotys ── */}
          <div className="space-y-2.5">
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
                      disabled={!claimable || busy === q.quest_key}
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

          {/* Kiek dar gali gauti šiandien */}
          {!loading && (remaining.gold > 0 || remaining.passXp > 0 || remaining.boosters > 0) && (
            <p className="text-[10.5px] text-center mt-3" style={{ color: 'var(--text-muted)' }}>
              Šiandien dar gali gauti:{remaining.gold > 0 && <span style={{ color: 'var(--gold)', fontWeight: 700 }}> 🪙 {remaining.gold}</span>}
              {remaining.boosters > 0 && <span style={{ color: '#fdba74', fontWeight: 700 }}> · 🎁 {remaining.boosters}</span>}
              {remaining.passXp > 0 && <span style={{ color: '#c4b5fd', fontWeight: 700 }}> · 🎖️ {remaining.passXp} kelio XP</span>}
            </p>
          )}

          {msg && <p className="text-[11px] text-center mt-3" style={{ color: '#c4b5fd' }}>{msg}</p>}
          <button onClick={() => { playUiClick(); onClose() }} className="mt-4 mx-auto block text-xs" style={{ color: 'var(--text-muted)' }}>Uždaryti</button>
        </div>
      </div>
    </div>
  )
}
