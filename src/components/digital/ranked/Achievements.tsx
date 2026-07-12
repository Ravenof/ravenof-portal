'use client'

// ── Pasiekimai — progresas, completed, claim. ────────────────────────────────
import { useEffect, useState } from 'react'
import { RANKED_ACHIEVEMENTS } from '@/lib/ranked/achievements'
import { summarizePayload } from '@/lib/ranked/rewards'
import { claimAchievement, getClaimState } from '@/lib/ranked/client'
import { playRanked } from '@/lib/ranked/sound'
import { useContent, useT } from '@/lib/i18n/react'

export function Achievements({ onChanged }: { onChanged?: () => void }) {
  const t = useT()
  const tc = useContent()
  const [state, setState] = useState<Record<string, { progress: number; completed: boolean; claimed: boolean }>>({})
  const [busy, setBusy] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const refresh = () => getClaimState().then((s) => setState(s.achievements))
  useEffect(() => { refresh() }, [])
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), 2200); return () => clearTimeout(t) }, [toast])

  const doClaim = async (key: string) => {
    setBusy(key)
    const r = await claimAchievement(key)
    setBusy(null)
    if ('error' in r) { setToast('Negalima atsiimti.'); return }
    playRanked('ranked_achievement_unlock')
    setToast('Pasiekimo atlygis atsiimtas! 🏅')
    refresh(); onChanged?.()
  }

  return (
    <div className="space-y-2.5">
      {RANKED_ACHIEVEMENTS.map((a) => {
        const st = state[a.key] ?? { progress: 0, completed: false, claimed: false }
        const pct = Math.min(100, Math.round((st.progress / a.requirementValue) * 100))
        return (
          <div key={a.key} className="px-3 py-2.5 rounded-lg" style={{ background: 'rgba(10,8,16,0.55)', border: '1px solid ' + (st.completed ? 'rgba(240,180,41,0.4)' : 'rgba(255,255,255,0.07)') }}>
            <div className="flex items-center gap-2">
              <span className="text-lg">{st.claimed ? '✅' : st.completed ? '🏅' : '⚔️'}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold truncate" style={{ color: 'var(--text-primary)', fontFamily: 'var(--rvn-font-display)' }}>{tc('ranked_achievement', a.key, 'name', a.name)}</p>
                <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{tc('ranked_achievement', a.key, 'description', a.description)} · {summarizePayload(a.reward)}</p>
              </div>
              {st.claimed ? (
                <span className="text-[11px] font-semibold px-2 py-1 rounded-lg" style={{ color: '#86efac' }}>{t('quests.claimed')}</span>
              ) : st.completed ? (
                <button onClick={() => doClaim(a.key)} disabled={busy === a.key}
                  className="text-[11px] font-bold px-3 py-1.5 rounded-lg transition-all hover:scale-105 active:scale-95 disabled:opacity-40"
                  style={{ background: 'rgba(240,180,41,0.2)', border: '1px solid rgba(240,180,41,0.55)', color: 'var(--gold)', fontFamily: 'var(--rvn-font-display)' }}>
                  {busy === a.key ? '…' : t('ranked.claim')}
                </button>
              ) : (
                <span className="text-[11px] tabular-nums" style={{ color: 'var(--text-muted)' }}>{st.progress}/{a.requirementValue}</span>
              )}
            </div>
            {!st.completed && (
              <div className="mt-2 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
                <div className="h-full rounded-full" style={{ width: `${pct}%`, background: 'linear-gradient(90deg,#f0b429,#fcd34d)' }} />
              </div>
            )}
          </div>
        )
      })}
      {toast && <p className="text-center text-xs font-semibold pt-1" style={{ color: 'var(--gold)' }}>{toast}</p>}
    </div>
  )
}
