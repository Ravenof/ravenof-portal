'use client'

// ── First-session (welcome) apdovanojimas — vienkartinis pop-up naujokui ──────
// Rodomas kartą, kai profiles.welcome_reward_claimed = false. Atsiimus serveris
// paskiria dovaną (rvn_claim_welcome_reward) ir daugiau neberodomas.
import { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { createClient } from '@/lib/supabase/client'
import { playUiClick, playSuccess } from '@/lib/ui-sound'
import { useT } from '@/lib/i18n/react'

type Reward = { gold?: number; boosters?: number; cardMin?: string }

export function WelcomeReward({ onClaimed }: { onClaimed?: () => void }) {
  const t = useT()
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState(false)
  const [claimed, setClaimed] = useState(false)
  const [reward, setReward] = useState<Reward>({ gold: 500, boosters: 2, cardMin: 'magic' })

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      const uid = data.user?.id
      if (!uid) return
      supabase.from('profiles').select('welcome_reward_claimed').eq('id', uid).maybeSingle()
        .then(({ data: p }) => { if (p && !(p as { welcome_reward_claimed?: boolean }).welcome_reward_claimed) setShow(true) })
    })
  }, [])

  const claim = useCallback(async () => {
    setBusy(true); playUiClick()
    try {
      const supabase = createClient()
      const { data } = await supabase.rpc('rvn_claim_welcome_reward')
      if (data?.reward) setReward(data.reward as Reward)
    } catch { /* atlygis niekada nelaužia UI */ }
    setBusy(false); setClaimed(true); playSuccess(); onClaimed?.()
    setTimeout(() => setShow(false), 1800)
  }, [onClaimed])

  if (!show || typeof document === 'undefined') return null

  const chips = [
    reward.gold ? { icon: '🪙', label: `${reward.gold} aukso` } : null,
    reward.boosters ? { icon: '📦', label: `${reward.boosters} boosteriai` } : null,
    reward.cardMin ? { icon: '🃏', label: '1 korta' } : null,
  ].filter(Boolean) as { icon: string; label: string }[]

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 400, display: 'grid', placeItems: 'center', background: 'rgba(4,3,8,0.9)', backdropFilter: 'blur(4px)', padding: 16 }}>
      <style>{`@keyframes rvnWelPop{0%{opacity:0;transform:scale(0.86) translateY(10px)}100%{opacity:1;transform:none}}@keyframes rvnWelSpin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
      <div style={{ position: 'relative', width: 'min(400px, 94vw)', textAlign: 'center', padding: 26, borderRadius: 20, animation: 'rvnWelPop .3s ease-out both', overflow: 'hidden',
        background: 'radial-gradient(120% 100% at 50% 0%, rgba(240,180,41,0.2), transparent 55%), linear-gradient(160deg, rgba(24,17,36,0.98), rgba(9,7,15,0.99))',
        border: '1.5px solid rgba(240,180,41,0.55)', boxShadow: '0 18px 60px rgba(0,0,0,0.7)' }}>
        <div style={{ position: 'absolute', top: -60, left: '50%', width: 260, height: 260, marginLeft: -130, borderRadius: '50%', pointerEvents: 'none',
          background: 'conic-gradient(from 0deg, transparent, rgba(240,180,41,0.12), transparent, rgba(240,180,41,0.12), transparent)', animation: 'rvnWelSpin 14s linear infinite', opacity: 0.7 }} />
        <div style={{ position: 'relative', fontSize: 46 }}>{claimed ? '✨' : '🎁'}</div>
        <h2 style={{ position: 'relative', fontFamily: 'var(--rvn-font-display, Cinzel, serif)', color: 'var(--gold)', fontSize: 21, margin: '6px 0 2px', textShadow: '0 0 20px rgba(240,180,41,0.5)' }}>{t('onboarding.welcome.title')}</h2>
        <p style={{ position: 'relative', color: '#e8dcc0', fontSize: 12.5, marginBottom: 18 }}>{t('onboarding.welcome.sub')}</p>
        <div style={{ position: 'relative', display: 'flex', justifyContent: 'center', gap: 10, marginBottom: 22 }}>
          {chips.map((c, i) => (
            <div key={i} style={{ width: 84, padding: '13px 6px', borderRadius: 12, background: 'linear-gradient(165deg, rgba(46,34,64,0.9), rgba(12,9,18,0.95))', border: '1px solid rgba(240,180,41,0.4)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08)' }}>
              <div style={{ fontSize: 27 }}>{c.icon}</div>
              <div style={{ fontSize: 10.5, fontWeight: 700, color: '#f3ead3', marginTop: 5 }}>{c.label}</div>
            </div>
          ))}
        </div>
        <button onClick={claim} disabled={busy || claimed}
          style={{ position: 'relative', width: '100%', padding: '13px', borderRadius: 12, fontWeight: 800, fontSize: 16, fontFamily: 'var(--rvn-font-display, Cinzel, serif)', cursor: busy || claimed ? 'default' : 'pointer', transition: 'transform .12s',
            background: claimed ? 'rgba(52,211,153,0.18)' : 'linear-gradient(180deg,#ffe28c,#f3b62c 46%,#c5841a)',
            color: claimed ? '#34d399' : '#3a2406', border: claimed ? '1px solid rgba(52,211,153,0.5)' : '1px solid #ffeaa6',
            boxShadow: claimed ? 'none' : 'inset 0 1px 0 rgba(255,255,255,0.6), 0 6px 18px rgba(240,180,41,0.35)' }}>
          {claimed ? t('onboarding.welcome.claimed') : (busy ? t('onboarding.welcome.claiming') : t('onboarding.welcome.claim'))}
        </button>
      </div>
    </div>,
    document.body,
  )
}
