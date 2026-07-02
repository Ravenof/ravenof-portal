'use client'

// ── Sezono kelias ─────────────────────────────────────────────────────────────
import { useEffect, useState } from 'react'
import { getSeasonPass, claimPassTier, type SeasonPass } from '@/lib/gamification/seasonPass'
import { rewardLabel } from '@/lib/gamification/rewardLabel'
import { playUiClick, playSuccess, playError } from '@/lib/ui-sound'
import { RvnIcon } from './ui/RvnIcon'

export function SeasonPassModal({ onClose, onReward }: { onClose: () => void; onReward?: () => void }) {
  const [pass, setPass] = useState<SeasonPass | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<number | null>(null)
  const [msg, setMsg] = useState<string | null>(null)

  const reload = () => getSeasonPass().then((p) => { setPass(p); setLoading(false) })
  useEffect(() => { reload() }, [])

  const doClaim = async (tier: number) => {
    if (busy !== null) return
    setBusy(tier); playUiClick()
    const r = await claimPassTier(tier)
    setBusy(null)
    if ('error' in r) { playError(); setMsg('Nepavyko atsiimti pakopos.'); return }
    playSuccess(); setMsg('Pakopa atsiimta! ' + rewardLabel(r.reward)); onReward?.(); reload()
  }

  const xp = pass?.xp ?? 0

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.8)' }} onClick={onClose}>
      <div className="relative w-[min(460px,95vw)] max-h-[88vh]" style={{ borderRadius: 18, background: 'rgba(240,180,41,0.32)', padding: 2 }} onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-6 overflow-y-auto max-h-[88vh]" style={{ borderRadius: 17, background: 'radial-gradient(120% 90% at 50% 0%, rgba(240,180,41,0.14), rgba(10,8,16,0.97) 60%), linear-gradient(160deg, #15101f, #0a0810)' }}>
          <p className="text-lg font-bold mb-0.5 text-center inline-flex items-center gap-2 justify-center w-full" style={{ fontFamily: 'var(--rvn-font-display)', color: 'var(--gold)', letterSpacing: '0.08em' }}><RvnIcon name="fi-season" size={24} fallback={<span>🎖️</span>} /> SEZONO KELIAS</p>
          {pass?.season && <p className="text-[11px] text-center mb-3" style={{ color: 'var(--text-muted)' }}>{pass.season.title} · 🎖️ {xp.toLocaleString()} kelio XP</p>}

          {loading && <p className="text-xs text-center py-6" style={{ color: 'var(--text-muted)' }}>Kraunama…</p>}
          {!loading && !pass?.season && <p className="text-xs text-center py-6" style={{ color: 'var(--text-muted)' }}>Aktyvaus sezono nėra.</p>}

          <div className="space-y-2">
            {(pass?.tiers ?? []).map((t) => {
              const claimed = (pass?.claimedTiers ?? []).includes(t.tier)
              const unlocked = xp >= t.xpRequired
              const pct = Math.min(100, Math.round((xp / t.xpRequired) * 100))
              return (
                <div key={t.tier} className="px-3 py-2.5" style={{ borderRadius: 10, background: 'linear-gradient(160deg, rgba(58,42,85,0.4), rgba(21,16,31,0.7))', border: `1px solid ${unlocked ? 'rgba(240,180,41,0.5)' : 'rgba(240,180,41,0.18)'}` }}>
                  <div className="flex items-center gap-2.5">
                    <div className="flex items-center justify-center w-9 h-9 text-sm font-bold shrink-0" style={{ borderRadius: 8, background: unlocked ? 'rgba(240,180,41,0.22)' : 'rgba(0,0,0,0.4)', border: `1px solid ${unlocked ? 'rgba(240,180,41,0.6)' : 'rgba(255,255,255,0.1)'}`, color: unlocked ? 'var(--gold)' : 'var(--text-muted)', fontFamily: 'var(--rvn-font-display)' }}>{t.tier}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-bold" style={{ color: '#f3ead3' }}>{rewardLabel(t.reward)}</p>
                      <div className="h-1 rounded-full overflow-hidden mt-1" style={{ background: 'rgba(0,0,0,0.5)' }}>
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: unlocked ? '#f0b429' : '#6b7280' }} />
                      </div>
                      <p className="text-[9px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{xp}/{t.xpRequired} XP</p>
                    </div>
                    <button onClick={() => doClaim(t.tier)} disabled={!unlocked || claimed || busy === t.tier}
                      className="px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all disabled:opacity-40 hover:scale-[1.04] active:scale-95 shrink-0"
                      style={{ background: claimed ? 'rgba(74,222,128,0.15)' : 'rgba(240,180,41,0.22)', border: `1px solid ${claimed ? 'rgba(74,222,128,0.5)' : 'rgba(240,180,41,0.6)'}`, color: claimed ? '#4ade80' : 'var(--gold)' }}>
                      {claimed ? '✓' : busy === t.tier ? '…' : unlocked ? 'Imti' : '🔒'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>

          {msg && <p className="text-[11px] text-center mt-3" style={{ color: 'var(--gold)' }}>{msg}</p>}
          <button onClick={() => { playUiClick(); onClose() }} className="mt-4 mx-auto block text-xs" style={{ color: 'var(--text-muted)' }}>Uždaryti</button>
        </div>
      </div>
    </div>
  )
}
