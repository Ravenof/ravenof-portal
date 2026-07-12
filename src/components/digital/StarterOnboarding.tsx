'use client'

// ════════════════════════════════════════════════════════════════════════════
// StarterOnboarding — naujoko popup seka:
//   1) Pasirink 1 iš 8 starter kaladžių (trumpi žaidimo stiliaus aprašymai) —
//      pasiimama NEMOKAMAI (rvn_claim_starter_deck).
//   2) Pasirink žaidėjo avatarą (kind=avatar kosmetika; turimi/default) —
//      užsidedamas per rvn_equip_cosmetic.
// Pabaigus onDone(deckId) — tėvas nukreipia į mokymų kovą.
// z-index 300 (žemiau WelcomeReward z400 — dovana pirmiau, tada kaladės).
// ════════════════════════════════════════════════════════════════════════════

import { useEffect, useMemo, useState } from 'react'
import { getStarterDecks, claimStarterDeck, type StarterDeck } from '@/lib/starterDecks'
import { getCosmetics, equipCosmetic, type Cosmetic, type CosmeticsState } from '@/lib/cosmetics'
import { playUiClick, playSuccess, playError } from '@/lib/ui-sound'
import { SmartImg } from '@/components/ui/SmartImg'
import { useT } from '@/lib/i18n/react'
import { t as tGlobal } from '@/lib/i18n/core'

// Žaidimo stiliaus fallback pagal frakciją (DB description turi pirmenybę)
const PLAYSTYLE: { match: RegExp; key: string }[] = [
  { match: /[šs]vies|pulk/i,     key: 'onboarding.starter.playstyle.light' },
  { match: /demon|orda/i,        key: 'onboarding.starter.playstyle.demons' },
  { match: /mirt|mar[šs]/i,      key: 'onboarding.starter.playstyle.death' },
  { match: /mistik|melodij/i,    key: 'onboarding.starter.playstyle.mystic' },
  { match: /pl[ėe][šs]ik|nakt/i, key: 'onboarding.starter.playstyle.thieves' },
  { match: /vryhiok|goblin|gauj/i, key: 'onboarding.starter.playstyle.vryhiok' },
  { match: /inkviz|legion/i,     key: 'onboarding.starter.playstyle.inquisition' },
  { match: /ryt|v[ėe]j/i,        key: 'onboarding.starter.playstyle.east' },
]
export function playstyleFor(d: StarterDeck): string {
  const desc = d.description?.trim()
  // Seed'intas generinis aprašymas („Pradžiamokslio kaladė – ...") keičiamas
  // žaidimo stiliaus tekstu; admin'o custom aprašymas turi pirmenybę.
  if (desc && !/^pradžiamokslio kaladė/i.test(desc)) return desc
  const key = PLAYSTYLE.find((p) => p.match.test(d.faction ?? d.name))?.key
  return key ? tGlobal(key) : desc ?? tGlobal('onboarding.starter.playstyle.fallback')
}

export function StarterOnboarding({ onDone, onClose }: {
  onDone: (r: { deckId: string; starterId: string }) => void
  onClose: () => void
}) {
  const t = useT()
  const [step, setStep] = useState<'deck' | 'avatar'>('deck')
  const [starters, setStarters] = useState<StarterDeck[] | null>(null)
  const [cos, setCos] = useState<CosmeticsState | null>(null)
  const [sel, setSel] = useState<string | null>(null)
  const [avatarSel, setAvatarSel] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [claimed, setClaimed] = useState<{ deckId: string; starterId: string } | null>(null)

  useEffect(() => { getStarterDecks().then(setStarters); getCosmetics().then(setCos) }, [])

  const avatars = useMemo<Cosmetic[]>(() => (cos?.items ?? []).filter((c) => c.kind === 'avatar'), [cos])
  const avatarOwned = (c: Cosmetic) => (cos?.owned ?? []).includes(c.id) || !!c.ownedByDefault

  const confirmDeck = async () => {
    const d = (starters ?? []).find((x) => x.id === sel)
    if (!d || busy) return
    setMsg('')
    // jau turima (pvz. popup atidarytas pakartotinai) – tiesiog tęsiam
    if (d.claimed && d.deckId) { playUiClick(); setClaimed({ deckId: d.deckId, starterId: d.id }); setStep('avatar'); return }
    setBusy(true)
    const res = await claimStarterDeck(d.id)
    setBusy(false)
    if ('error' in res) { playError(); setMsg(res.error === 'already claimed' ? t('onboarding.starter.alreadyClaimed') : t('onboarding.starter.claimFailed', { msg: res.error })); return }
    playSuccess()
    setClaimed({ deckId: res.deckId, starterId: d.id })
    setStep('avatar')
  }

  const finish = async () => {
    if (!claimed || busy) return
    if (avatarSel) {
      setBusy(true)
      await equipCosmetic('avatar', avatarSel)
      setBusy(false)
      playSuccess()
    } else playUiClick()
    onDone(claimed)
  }

  const panel: React.CSSProperties = {
    borderRadius: 19, display: 'flex', flexDirection: 'column', maxHeight: '90vh',
    background: 'radial-gradient(120% 60% at 50% 0%, rgba(240,180,41,0.13), rgba(10,8,16,0.98) 60%), linear-gradient(160deg, #15101f, #0a0810)',
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center p-3" style={{ zIndex: 300, background: 'rgba(4,3,8,0.88)', backdropFilter: 'blur(4px)' }}>
      <div className="relative w-[min(680px,97vw)]" style={{ borderRadius: 20, background: 'rgba(240,180,41,0.32)', padding: 2 }}>
        <div style={panel}>

          {/* Antraštė */}
          <div className="px-5 pt-5 pb-3 shrink-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-lg font-bold" style={{ fontFamily: 'var(--rvn-font-display)', color: 'var(--gold)', letterSpacing: '0.06em' }}>
                  {step === 'deck' ? t('onboarding.starter.pickDeckTitle') : t('onboarding.starter.pickAvatarTitle')}
                </p>
                <p className="text-[12px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  {step === 'deck'
                    ? t('onboarding.starter.pickDeckSub')
                    : t('onboarding.starter.pickAvatarSub')}
                </p>
              </div>
              {step === 'deck' && (
                <button onClick={() => { playUiClick(); onClose() }} className="text-xs px-2 py-1 shrink-0" style={{ color: 'var(--text-muted)' }}>✕</button>
              )}
            </div>
            {msg && <p className="text-[12px] mt-2" style={{ color: '#fbbf24' }}>{msg}</p>}
          </div>

          {/* Turinys */}
          <div className="px-5 pb-3 flex-1 min-h-0 overflow-y-auto">
            {step === 'deck' && (
              <>
                {!starters && <p className="text-xs text-center py-10" style={{ color: 'var(--text-muted)' }}>Kraunama…</p>}
                <div className="grid grid-cols-2 gap-2.5">
                  {(starters ?? []).map((d) => {
                    const active = sel === d.id
                    return (
                      <button key={d.id} onClick={() => { playUiClick(); setSel(d.id) }} disabled={busy}
                        className="relative text-left overflow-hidden transition-transform active:scale-[0.98]"
                        style={{ borderRadius: 14, padding: 2, background: active ? 'rgba(240,180,41,0.85)' : 'rgba(255,255,255,0.12)' }}>
                        <span className="block h-full" style={{ borderRadius: 13, background: '#0a0810' }}>
                          <span className="block relative h-[86px] overflow-hidden" style={{ borderRadius: '13px 13px 0 0' }}>
                            {d.imageUrl
                              ? <SmartImg src={d.imageUrl} width={360} className="absolute inset-0 w-full h-full object-cover" style={{ objectPosition: '50% 30%' }} />
                              : <span className="absolute inset-0" style={{ background: 'linear-gradient(150deg,#241a35,#0a0810)' }} />}
                            {d.claimed && <span className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold" style={{ background: 'rgba(52,211,153,0.9)', color: '#06281c' }}>✓ Turima</span>}
                          </span>
                          <span className="block px-2.5 pt-1.5 pb-2">
                            <span className="block text-[13px] font-extrabold truncate" style={{ color: active ? 'var(--gold)' : '#f3ead3', fontFamily: 'var(--rvn-font-display)' }}>{d.faction ?? d.name}</span>
                            <span className="block text-[10.5px] leading-snug mt-0.5" style={{ color: '#c9bfa8', minHeight: 28 }}>{playstyleFor(d)}</span>
                            <span className="block text-[9px] uppercase tracking-widest mt-1" style={{ color: 'var(--text-muted)' }}>{d.cardCount} kortų</span>
                          </span>
                        </span>
                      </button>
                    )
                  })}
                </div>
              </>
            )}

            {step === 'avatar' && (
              <>
                {!cos && <p className="text-xs text-center py-10" style={{ color: 'var(--text-muted)' }}>Kraunama…</p>}
                {cos && avatars.length === 0 && <p className="text-xs text-center py-10" style={{ color: 'var(--text-muted)' }}>{t('onboarding.starter.noAvatars')}</p>}
                <div className="grid grid-cols-4 gap-2.5">
                  {avatars.map((c) => {
                    const owned = avatarOwned(c)
                    const active = avatarSel === c.id
                    return (
                      <button key={c.id} onClick={() => { if (!owned) return; playUiClick(); setAvatarSel(active ? null : c.id) }} disabled={busy}
                        className="relative overflow-hidden transition-transform active:scale-[0.96]"
                        style={{ borderRadius: 14, padding: 2, background: active ? 'rgba(240,180,41,0.85)' : 'rgba(255,255,255,0.12)', cursor: owned ? 'pointer' : 'default' }}>
                        <span className="block" style={{ borderRadius: 13, background: '#0a0810' }}>
                          <span className="block relative overflow-hidden" style={{ borderRadius: '13px 13px 0 0', aspectRatio: '1' }}>
                            {c.imageUrl
                              ? <SmartImg src={c.imageUrl} width={240} className="absolute inset-0 w-full h-full object-cover" style={{ filter: owned ? undefined : 'grayscale(1) brightness(0.5)' }} />
                              : <span className="absolute inset-0 flex items-center justify-center text-3xl" style={{ background: c.css ?? 'linear-gradient(150deg,#241a35,#0a0810)', filter: owned ? undefined : 'grayscale(1) brightness(0.6)' }}>{c.emoji ?? '👤'}</span>}
                            {!owned && <span className="absolute inset-0 flex items-center justify-center text-lg">🔒</span>}
                          </span>
                          <span className="block px-1 py-1 text-[9.5px] font-bold truncate text-center" style={{ color: owned ? '#f3ead3' : 'var(--text-muted)' }}>{c.name}</span>
                        </span>
                      </button>
                    )
                  })}
                </div>
              </>
            )}
          </div>

          {/* Apačia */}
          <div className="px-5 py-3 shrink-0 flex items-center gap-2" style={{ borderTop: '1px solid rgba(240,180,41,0.15)' }}>
            {step === 'deck' ? (
              <button onClick={confirmDeck} disabled={!sel || busy}
                className="flex-1 py-3 rounded-xl text-sm font-extrabold transition-transform active:scale-[0.98]"
                style={{ fontFamily: 'var(--rvn-font-display)', background: sel ? 'linear-gradient(180deg,#ffe28c,#f3b62c 46%,#c5841a)' : 'rgba(255,255,255,0.06)', color: sel ? '#3a2406' : 'var(--text-muted)', border: sel ? '1px solid #ffeaa6' : '1px solid rgba(255,255,255,0.1)' }}>
                {busy ? '…' : sel ? t('onboarding.starter.claimFree') : t('onboarding.starter.pickDeckCta')}
              </button>
            ) : (
              <>
                <button onClick={finish} disabled={busy} className="flex-1 py-3 rounded-xl text-sm font-extrabold transition-transform active:scale-[0.98]"
                  style={{ fontFamily: 'var(--rvn-font-display)', background: 'linear-gradient(180deg,#ffe28c,#f3b62c 46%,#c5841a)', color: '#3a2406', border: '1px solid #ffeaa6' }}>
                  {busy ? '…' : avatarSel ? t('onboarding.starter.toTutorial') : t('onboarding.starter.skipFight')}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
