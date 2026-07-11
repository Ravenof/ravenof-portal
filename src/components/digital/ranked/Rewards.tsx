'use client'

// ── Apdovanojimai — milestone'ai su claim/locked/claimed būsenomis. ──────────
import { useEffect, useState } from 'react'
import { RewardSlot } from '@/components/digital/ui/RewardBits'
import type { RewardPayloadItem } from '@/lib/rewards/rewardVisuals'
import type { RewardPayload } from '@/lib/ranked/rewards'

// RankedReward payload yra OBJEKTAS {exp,gold,boosters,cardMin,badge} — verčiam į vizualų sąrašą
function payloadItems(p: RewardPayload | undefined): RewardPayloadItem[] {
  if (!p) return []
  return [
    ...(p.gold ? [{ type: 'currency', currency: 'silver', amount: p.gold }] : []),
    ...(p.exp ? [{ type: 'account_xp', amount: p.exp }] : []),
    ...(p.boosters ? [{ type: 'item', item_type: 'pack', quantity: p.boosters }] : []),
    ...(p.cardMin ? [{ type: 'item', item_type: 'card', item_id: p.cardMin }] : []),
    ...(p.badge ? [{ type: 'item', item_type: 'badge' }] : []),
  ]
}
import { MILESTONE_REWARDS, summarizePayload } from '@/lib/ranked/rewards'
import { formatRank } from '@/lib/ranked/rank'
import { claimReward, getClaimState } from '@/lib/ranked/client'
import { playRanked } from '@/lib/ranked/sound'

export function Rewards({ bestRankStep, onChanged }: { bestRankStep: number; onChanged?: () => void }) {
  const [claimed, setClaimed] = useState<Set<string>>(new Set())
  const [busy, setBusy] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const refresh = () => getClaimState().then((s) => setClaimed(s.rewards))
  useEffect(() => { refresh() }, [])
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), 2200); return () => clearTimeout(t) }, [toast])

  const doClaim = async (key: string) => {
    setBusy(key)
    const r = await claimReward(key)
    setBusy(null)
    if ('error' in r) { setToast('Nepavyko atsiimti.'); return }
    playRanked('ranked_reward_claim')
    setToast('Atlygis atsiimtas!')
    refresh(); onChanged?.()
  }

  return (
    <div className="space-y-2.5">
      {MILESTONE_REWARDS.map((rw) => {
        const reached = bestRankStep >= rw.requiredRankStep
        const isClaimed = claimed.has(rw.key)
        return (
          <div key={rw.key} className="flex items-center gap-3 px-3 py-2.5 rounded-lg"
            style={{ background: reached ? 'rgba(10,8,16,0.6)' : 'rgba(10,8,16,0.35)', border: '1px solid ' + (isClaimed ? 'rgba(34,197,94,0.45)' : reached ? 'rgba(240,180,41,0.4)' : 'rgba(255,255,255,0.06)'), opacity: reached ? 1 : 0.65 }}>
            <RewardSlot payload={payloadItems(rw.payload)} state={reached ? (isClaimed ? 'claimed' : 'claimable') : 'locked'} size={26} max={3} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold truncate" style={{ color: 'var(--text-primary)', fontFamily: 'var(--rvn-font-display)' }}>{rw.title}</p>
              <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{formatRank(rw.requiredRankStep)} · {summarizePayload(rw.payload)}</p>
            </div>
            {isClaimed ? (
              <span className="text-[11px] font-semibold px-2.5 py-1 rounded-lg" style={{ color: '#86efac', border: '1px solid rgba(34,197,94,0.4)' }}>Atsiimta</span>
            ) : reached ? (
              <button onClick={() => doClaim(rw.key)} disabled={busy === rw.key}
                className="text-[11px] font-bold px-3 py-1.5 rounded-lg transition-all hover:scale-105 active:scale-95 disabled:opacity-40"
                style={{ background: 'rgba(240,180,41,0.2)', border: '1px solid rgba(240,180,41,0.55)', color: 'var(--gold)', fontFamily: 'var(--rvn-font-display)' }}>
                {busy === rw.key ? '…' : 'Atsiimti'}
              </button>
            ) : (
              <span className="text-[11px] px-2.5 py-1 rounded-lg" style={{ color: 'var(--text-muted)', border: '1px solid rgba(255,255,255,0.08)' }}>Užrakinta</span>
            )}
          </div>
        )
      })}
      {toast && <p className="text-center text-xs font-semibold pt-1" style={{ color: 'var(--gold)' }}>{toast}</p>}
    </div>
  )
}
