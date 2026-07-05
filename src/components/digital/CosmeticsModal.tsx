'use client'

// ── Kosmetika: kortų nugarėlės / lentos / avatarai (aukso sink) ───────────────
import { useEffect, useState } from 'react'
import { getCosmetics, buyCosmetic, equipCosmetic, getAvatarAudio, type Cosmetic, type CosmeticKind, type CosmeticsState, type AvatarAudioMap } from '@/lib/cosmetics'
import { playUiClick, playSuccess, playError } from '@/lib/ui-sound'

const KIND_LABEL: Record<CosmeticKind, string> = { card_back: 'Kortų nugarėlės', board: 'Lentos', avatar: 'Žaidėjo avatarai' }
const KINDS: CosmeticKind[] = ['card_back', 'avatar']  // spec: tik nugarėlės + avatarai (boards paslėpti)

export function CosmeticsModal({ gold, onClose, onSpent }: { gold: number; onClose: () => void; onSpent?: () => void }) {
  const [state, setState] = useState<CosmeticsState | null>(null)
  const [tab, setTab] = useState<CosmeticKind>('card_back')
  const [busy, setBusy] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [localGold, setLocalGold] = useState(gold)
  const [avAudio, setAvAudio] = useState<AvatarAudioMap>({})
  const previewVoice = (id: string) => {
    const evs = avAudio[id]
    if (!evs) return
    const clips = evs.selected ?? evs.fightStart ?? evs.victory ?? Object.values(evs)[0]
    if (!clips?.length) return
    playUiClick()
    try { const a = new Audio(clips[Math.floor(Math.random() * clips.length)].url); a.volume = 0.85; void a.play().catch(() => {}) } catch { /* */ }
  }

  const reload = () => getCosmetics().then(setState)
  useEffect(() => { reload() }, [])
  useEffect(() => {
    const avs = (state?.items ?? []).filter((c) => c.kind === 'avatar').map((c) => c.id)
    if (avs.length === 0) return
    getAvatarAudio(avs).then(setAvAudio)
  }, [state])

  const equippedFor = (kind: CosmeticKind): string | null =>
    kind === 'card_back' ? state?.equippedCardBack ?? null
    : kind === 'board' ? state?.equippedBoard ?? null
    : state?.equippedAvatar ?? null

  const doBuy = async (c: Cosmetic) => {
    if (busy) return
    setBusy(c.id); playUiClick()
    const r = await buyCosmetic(c.id)
    setBusy(null)
    if ('error' in r) { playError(); setMsg(r.error === 'not enough gold' ? 'Per mažai aukso.' : 'Nepavyko nupirkti.'); return }
    playSuccess(); setLocalGold(r.gold); setMsg(`${c.name} nupirkta!`); onSpent?.(); reload()
  }

  const doEquip = async (c: Cosmetic) => {
    if (busy) return
    const isEquipped = equippedFor(c.kind) === c.id
    setBusy(c.id); playUiClick()
    const ok = await equipCosmetic(c.kind, isEquipped ? null : c.id)
    setBusy(null)
    if (!ok) { playError(); return }
    playSuccess(); reload()
  }

  const items = (state?.items ?? []).filter((c) => c.kind === tab)

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.8)' }} onClick={onClose}>
      <div className="relative w-[min(480px,95vw)] max-h-[88vh]" style={{ borderRadius: 18, background: 'rgba(96,165,250,0.32)', padding: 2 }} onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-6 overflow-y-auto max-h-[88vh]" style={{ borderRadius: 17, background: 'radial-gradient(120% 90% at 50% 0%, rgba(96,165,250,0.14), rgba(10,8,16,0.97) 60%), linear-gradient(160deg, #15101f, #0a0810)' }}>
          <p className="text-lg font-bold mb-0.5 text-center" style={{ fontFamily: 'var(--rvn-font-display)', color: '#93c5fd', letterSpacing: '0.08em' }}>✨ KOSMETIKA</p>
          <p className="text-[11px] text-center mb-3" style={{ color: 'var(--text-muted)' }}>Turi 🪙 {localGold.toLocaleString()} aukso</p>

          <div className="flex gap-1.5 mb-4 justify-center">
            {KINDS.map((k) => (
              <button key={k} onClick={() => { playUiClick(); setTab(k) }}
                className="px-3 py-1 rounded-full text-[11px] font-bold transition-all"
                style={{ background: tab === k ? 'rgba(96,165,250,0.25)' : 'rgba(0,0,0,0.4)', border: `1px solid ${tab === k ? 'rgba(96,165,250,0.6)' : 'rgba(255,255,255,0.1)'}`, color: tab === k ? '#93c5fd' : 'var(--text-muted)' }}>
                {KIND_LABEL[k]}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            {items.map((c) => {
              const owned = (state?.owned ?? []).includes(c.id)
              const equipped = equippedFor(c.kind) === c.id
              return (
                <div key={c.id} className="px-2.5 py-2.5" style={{ borderRadius: 10, background: 'linear-gradient(160deg, rgba(58,42,85,0.4), rgba(21,16,31,0.7))', border: `1px solid ${equipped ? 'rgba(74,222,128,0.6)' : 'rgba(96,165,250,0.25)'}` }}>
                  <div className="relative h-16 w-full mb-2 flex items-center justify-center overflow-hidden" style={{ borderRadius: c.kind === 'avatar' ? 999 : 8, width: c.kind === 'avatar' ? 64 : undefined, marginLeft: c.kind === 'avatar' ? 'auto' : undefined, marginRight: c.kind === 'avatar' ? 'auto' : undefined, height: c.kind === 'avatar' ? 64 : 64, background: c.imageUrl ? '#0a0810' : (c.css ?? 'linear-gradient(160deg,#1a1325,#0a0810)'), border: c.kind === 'avatar' ? '2px solid rgba(240,180,41,0.5)' : '1px solid rgba(255,255,255,0.08)' }}>
                    {c.imageUrl
                      // eslint-disable-next-line @next/next/no-img-element
                      ? <img src={c.imageUrl} alt={c.name} className="w-full h-full object-cover" draggable={false} />
                      : (c.emoji && <span className="text-3xl">{c.emoji}</span>)}
                    {c.kind === 'avatar' && avAudio[c.id] && (
                      <button onClick={() => previewVoice(c.id)} title="Peržiūrėti balsą"
                        className="absolute bottom-0 right-0 rounded-tl-md text-[11px] px-1.5 py-0.5" style={{ background: 'rgba(8,6,12,0.92)', color: 'var(--gold)' }}>🔊</button>
                    )}
                  </div>
                  <div className="flex items-center justify-between gap-1">
                    <p className="text-[11px] font-bold truncate" style={{ color: '#f3ead3' }}>{c.name}</p>
                    {c.rarity && <span className="text-[8px] uppercase shrink-0" style={{ color: c.rarity === 'legendary' ? '#fbbf24' : c.rarity === 'epic' ? '#c084fc' : c.rarity === 'rare' ? '#60a5fa' : 'var(--text-muted)' }}>{c.rarity}</span>}
                  </div>
                  <p className="text-[9px] mb-2 leading-snug h-6 overflow-hidden" style={{ color: 'var(--text-muted)' }}>{c.description}</p>
                  {owned ? (
                    <button onClick={() => doEquip(c)} disabled={busy === c.id}
                      className="w-full px-2 py-1.5 rounded-lg text-[11px] font-bold transition-all disabled:opacity-50 hover:scale-[1.03] active:scale-95"
                      style={{ background: equipped ? 'rgba(74,222,128,0.18)' : 'rgba(96,165,250,0.22)', border: `1px solid ${equipped ? 'rgba(74,222,128,0.6)' : 'rgba(96,165,250,0.5)'}`, color: equipped ? '#4ade80' : '#93c5fd' }}>
                      {equipped ? '✓ Pasirinkta' : 'Pasirinkti'}
                    </button>
                  ) : (
                    <button onClick={() => doBuy(c)} disabled={busy === c.id || localGold < c.priceGold}
                      className="w-full px-2 py-1.5 rounded-lg text-[11px] font-bold transition-all disabled:opacity-40 hover:scale-[1.03] active:scale-95"
                      style={{ background: localGold < c.priceGold ? 'rgba(80,80,80,0.2)' : 'rgba(240,180,41,0.2)', border: `1px solid ${localGold < c.priceGold ? 'rgba(255,255,255,0.15)' : 'rgba(240,180,41,0.6)'}`, color: localGold < c.priceGold ? 'var(--text-muted)' : 'var(--gold)' }}>
                      {localGold < c.priceGold ? 'Nepakanka aukso' : '🪙 ' + c.priceGold}
                    </button>
                  )}
                </div>
              )
            })}
          </div>

          {msg && <p className="text-[11px] text-center mt-3" style={{ color: '#93c5fd' }}>{msg}</p>}
          <button onClick={() => { playUiClick(); onClose() }} className="mt-4 mx-auto block text-xs" style={{ color: 'var(--text-muted)' }}>Uždaryti</button>
        </div>
      </div>
    </div>
  )
}
