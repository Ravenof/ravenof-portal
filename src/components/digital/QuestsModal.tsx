'use client'

// ── Dienos užduotys + prisijungimo serija ─────────────────────────────────────
import { useEffect, useState } from 'react'
import { getDailyQuests, loginCheckin, claimQuest, type DailyQuest, type LoginCheckin } from '@/lib/gamification/quests'
import { rewardLabel } from '@/lib/gamification/rewardLabel'
import { playUiClick, playSuccess, playError } from '@/lib/ui-sound'

const oct = (b: number) =>
  `polygon(${b}px 0, calc(100% - ${b}px) 0, 100% ${b}px, 100% calc(100% - ${b}px), calc(100% - ${b}px) 100%, ${b}px 100%, 0 calc(100% - ${b}px), 0 ${b}px)`

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
    setMsg('Atlygis atsiimtas! ' + rewardLabel(q.reward_payload))
    onReward?.()
  }

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.8)' }} onClick={onClose}>
      <div className="relative w-[min(460px,95vw)] max-h-[88vh]" style={{ clipPath: oct(16), background: 'rgba(139,92,246,0.5)', padding: 2.5 }} onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-6 overflow-y-auto max-h-[88vh]" style={{ clipPath: oct(15), background: 'radial-gradient(120% 90% at 50% 0%, rgba(139,92,246,0.14), rgba(10,8,16,0.97) 60%), linear-gradient(160deg, #15101f, #0a0810)' }}>
          <p className="text-lg font-bold mb-1 text-center" style={{ fontFamily: 'var(--rvn-font-display)', color: '#c4b5fd', letterSpacing: '0.08em' }}>📅 DIENOS UŽDUOTYS</p>

          {/* Prisijungimo serija */}
          {streak && (
            <div className="mb-4 px-3 py-2.5 text-center" style={{ clipPath: oct(10), background: 'linear-gradient(160deg, rgba(251,146,60,0.18), rgba(21,16,31,0.7))', border: '1px solid rgba(251,146,60,0.4)' }}>
              <p className="text-sm font-bold" style={{ color: '#fdba74', fontFamily: 'var(--rvn-font-display)' }}>🔥 {streak.streak} dienų serija</p>
              <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                {streak.already
                  ? `Šiandien jau atsiimta · ilgiausia serija: ${streak.longest} d.`
                  : `Šiandienos prizas: 🪙 ${streak.reward}${streak.bonusBooster ? ' + 🎁 1 pakuotė' : ''}`}
              </p>
            </div>
          )}

          {loading && <p className="text-xs text-center py-6" style={{ color: 'var(--text-muted)' }}>Kraunama…</p>}

          <div className="space-y-2.5">
            {quests.map((q) => {
              const pct = Math.min(100, Math.round((q.progress / q.target) * 100))
              const complete = q.progress >= q.target
              return (
                <div key={q.quest_key} className="px-3 py-2.5" style={{ clipPath: oct(9), background: 'linear-gradient(160deg, rgba(58,42,85,0.4), rgba(21,16,31,0.7))', border: '1px solid rgba(139,92,246,0.28)' }}>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-bold" style={{ color: 'var(--text-primary)', fontFamily: 'var(--rvn-font-display)' }}>{q.title}</p>
                    <span className="text-[10px] font-bold" style={{ color: complete ? '#4ade80' : 'var(--text-muted)' }}>{q.progress}/{q.target}</span>
                  </div>
                  <p className="text-[10px] mb-1.5" style={{ color: 'var(--text-muted)' }}>{q.description}</p>
                  <div className="h-1.5 rounded-full overflow-hidden mb-2" style={{ background: 'rgba(0,0,0,0.5)' }}>
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, background: complete ? '#22c55e' : '#8b5cf6', transition: 'width 0.4s' }} />
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px]" style={{ color: '#c4b5fd' }}>{rewardLabel(q.reward_payload)}</span>
                    <button
                      onClick={() => doClaim(q)}
                      disabled={!complete || q.claimed || busy === q.quest_key}
                      className="px-3 py-1 rounded-lg text-[11px] font-bold transition-all disabled:opacity-40 hover:scale-[1.04] active:scale-95"
                      style={{ background: q.claimed ? 'rgba(74,222,128,0.15)' : 'rgba(139,92,246,0.25)', border: `1px solid ${q.claimed ? 'rgba(74,222,128,0.5)' : 'rgba(139,92,246,0.6)'}`, color: q.claimed ? '#4ade80' : '#c4b5fd' }}>
                      {q.claimed ? '✓ Atsiimta' : busy === q.quest_key ? '…' : complete ? 'Atsiimti' : 'Užrakinta'}
                    </button>
                  </div>
                </div>
              )
            })}
            {!loading && quests.length === 0 && <p className="text-xs text-center py-4" style={{ color: 'var(--text-muted)' }}>Šiandien užduočių nėra.</p>}
          </div>

          {msg && <p className="text-[11px] text-center mt-3" style={{ color: '#c4b5fd' }}>{msg}</p>}
          <button onClick={() => { playUiClick(); onClose() }} className="mt-4 mx-auto block text-xs" style={{ color: 'var(--text-muted)' }}>Uždaryti</button>
        </div>
      </div>
    </div>
  )
}
