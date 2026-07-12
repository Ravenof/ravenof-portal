'use client'

// ── Kosmetika — landscape 3 zonos: kairė kategorijos · centras kolekcijos grid
//    · dešinė didelis pasirinktos kosmetikos showcase + pirkti/naudoti (pinned).
import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { getCosmetics, buyCosmetic, equipCosmetic, getAvatarAudio, type Cosmetic, type CosmeticKind, type CosmeticsState, type AvatarAudioMap } from '@/lib/cosmetics'
import { playUiClick, playSuccess, playError } from '@/lib/ui-sound'
import { useEscClose } from '@/lib/useEscClose'
import { useT } from '@/lib/i18n/react'

const KIND_LABEL_KEY: Record<CosmeticKind, string> = { card_back: 'common.cosmetics.cardBacks', board: 'common.cosmetics.boards', avatar: 'common.cosmetics.avatars' }
const KIND_ICON: Record<CosmeticKind, string> = { card_back: '🂠', board: '▦', avatar: '😀' }
const KINDS: CosmeticKind[] = ['card_back', 'avatar']  // spec: tik nugarėlės + avatarai (boards paslėpti)
const RAR_COL: Record<string, string> = { legendary: '#fbbf24', epic: '#c084fc', rare: '#60a5fa' }

export function CosmeticsModal({ gold, onClose, onSpent }: { gold: number; onClose: () => void; onSpent?: () => void }) {
  const t = useT()
  useEscClose(onClose)
  const [state, setState] = useState<CosmeticsState | null>(null)
  const [tab, setTab] = useState<CosmeticKind>('card_back')
  const [selId, setSelId] = useState<string | null>(null)
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
    if ('error' in r) { playError(); setMsg(r.error === 'not enough gold' ? t('common.cosmetics.notEnoughGold') : t('common.cosmetics.buyFailed')); return }
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
  const selected = items.find((c) => c.id === selId) ?? items.find((c) => equippedFor(tab) === c.id) ?? items[0] ?? null
  const selOwned = !!selected && (state?.owned ?? []).includes(selected.id)
  const selEquipped = !!selected && equippedFor(selected.kind) === selected.id

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-2" style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(3px)' }} onClick={onClose}>
      <div className="relative w-[min(1060px,98vw)] h-[min(600px,96vh)]" style={{ borderRadius: 18, background: 'rgba(96,165,250,0.32)', padding: 2 }} onClick={(e) => e.stopPropagation()}>
        <div className="flex flex-col h-full" style={{ borderRadius: 17, background: 'radial-gradient(120% 90% at 50% 0%, rgba(96,165,250,0.14), rgba(10,8,16,0.97) 60%), linear-gradient(160deg, #15101f, #0a0810)' }}>

          {/* ── Antraštė ── */}
          <div className="flex items-center justify-between px-4 pt-3 pb-2 shrink-0" style={{ borderBottom: '1px solid rgba(96,165,250,0.2)' }}>
            <p className="font-bold" style={{ fontSize: 'clamp(14px,2.6vh,18px)', fontFamily: 'var(--rvn-font-display)', color: '#93c5fd', letterSpacing: '0.08em' }}>{t('common.cosmetics.title')}</p>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold px-2.5 py-1 rounded-full" style={{ background: 'rgba(10,8,16,0.9)', border: '1px solid rgba(240,180,41,0.4)', color: 'var(--gold)' }}>🪙 {localGold.toLocaleString()}</span>
              <button onClick={() => { playUiClick(); onClose() }} aria-label={t('common.close')} className="rvn-press flex items-center justify-center rounded-full" style={{ width: 32, height: 32, background: 'rgba(10,8,16,0.9)', border: '1px solid rgba(96,165,250,0.4)', color: '#93c5fd' }}><X className="w-4 h-4" /></button>
            </div>
          </div>

          {/* ── 3 zonos ── */}
          <div className="flex-1 min-h-0 grid gap-2 p-2.5" style={{ gridTemplateColumns: 'minmax(130px,0.7fr) minmax(0,2.2fr) minmax(210px,1.05fr)' }}>

            {/* KAIRĖ: kategorijos */}
            <div className="min-h-0 overflow-y-auto flex flex-col gap-1.5">
              {KINDS.map((k) => (
                <button key={k} onClick={() => { playUiClick(); setTab(k); setSelId(null); setMsg(null) }}
                  className="rvn-press shrink-0 w-full text-left px-2.5 py-2.5 rounded-xl font-bold flex items-center gap-2"
                  style={{ fontSize: 11, background: tab === k ? 'rgba(96,165,250,0.22)' : 'rgba(10,8,16,0.8)', border: `1px solid ${tab === k ? 'rgba(96,165,250,0.6)' : 'rgba(255,255,255,0.08)'}`, color: tab === k ? '#93c5fd' : 'var(--text-muted)', fontFamily: 'var(--rvn-font-display)' }}>
                  <span style={{ fontSize: 15 }}>{KIND_ICON[k]}</span> {t(KIND_LABEL_KEY[k])}
                </button>
              ))}
              <p className="mt-auto" style={{ fontSize: 9, color: 'rgba(150,160,185,0.5)', lineHeight: 1.4 }}>{t('common.cosmetics.info')}</p>
            </div>

            {/* CENTRAS: grid */}
            <div className="min-h-0 overflow-y-auto">
              {!state && <p className="text-xs text-center py-8" style={{ color: 'var(--text-muted)' }}>Kraunama…</p>}
              <div className="grid gap-2 content-start" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(96px, 1fr))' }}>
                {items.map((c) => {
                  const owned = (state?.owned ?? []).includes(c.id)
                  const equipped = equippedFor(c.kind) === c.id
                  const isSel = selected?.id === c.id
                  return (
                    <button key={c.id} onClick={() => { playUiClick(); setSelId(c.id); setMsg(null) }}
                      className="rvn-press relative flex flex-col items-center gap-1 p-2 rounded-xl"
                      style={{ background: 'linear-gradient(160deg, rgba(58,42,85,0.35), rgba(21,16,31,0.7))',
                        border: isSel ? '1.5px solid rgba(96,165,250,0.95)' : equipped ? '1px solid rgba(74,222,128,0.6)' : '1px solid rgba(96,165,250,0.22)',
                        boxShadow: isSel ? '0 0 12px rgba(96,165,250,0.35)' : 'none', opacity: owned ? 1 : 0.75 }}>
                      <span className="relative flex items-center justify-center overflow-hidden shrink-0"
                        style={{ width: c.kind === 'avatar' ? 56 : 64, height: c.kind === 'avatar' ? 56 : 64, borderRadius: c.kind === 'avatar' ? 999 : 8,
                          background: c.imageUrl ? '#0a0810' : (c.css ?? 'linear-gradient(160deg,#1a1325,#0a0810)'), border: c.kind === 'avatar' ? '2px solid rgba(240,180,41,0.5)' : '1px solid rgba(255,255,255,0.08)' }}>
                        {c.imageUrl
                          // eslint-disable-next-line @next/next/no-img-element
                          ? <img src={c.imageUrl} alt={c.name} className="w-full h-full object-cover" draggable={false} />
                          : (c.emoji && <span className="text-2xl">{c.emoji}</span>)}
                      </span>
                      <span className="w-full text-center truncate font-bold" style={{ fontSize: 9, color: '#f3ead3' }}>{c.name}</span>
                      <span style={{ fontSize: 8.5, fontWeight: 800, color: owned ? (equipped ? '#4ade80' : '#93c5fd') : 'var(--gold)' }}>{equipped ? '✓ Naudojama' : owned ? 'Turima' : `🪙 ${c.priceGold}`}</span>
                    </button>
                  )
                })}
                {state && items.length === 0 && <p className="col-span-full text-center text-xs py-6" style={{ color: 'var(--text-muted)' }}>{t('common.cosmetics.categoryEmpty')}</p>}
              </div>
            </div>

            {/* DEŠINĖ: showcase */}
            <div className="rounded-2xl flex flex-col min-h-0 overflow-hidden p-3" style={{ background: 'rgba(10,8,16,0.6)', border: '1px solid rgba(96,165,250,0.25)' }}>
              {selected ? (
                <>
                  <div className="flex-1 min-h-0 overflow-y-auto flex flex-col items-center gap-2 text-center">
                    <span className="relative flex items-center justify-center overflow-hidden shrink-0 mt-1"
                      style={{ width: selected.kind === 'avatar' ? 130 : 130, height: selected.kind === 'avatar' ? 130 : 176, borderRadius: selected.kind === 'avatar' ? 999 : 12,
                        background: selected.imageUrl ? '#0a0810' : (selected.css ?? 'linear-gradient(160deg,#1a1325,#0a0810)'),
                        border: selected.kind === 'avatar' ? '2.5px solid rgba(240,180,41,0.6)' : '1.5px solid rgba(96,165,250,0.4)',
                        boxShadow: '0 0 20px rgba(96,165,250,0.25)' }}>
                      {selected.imageUrl
                        // eslint-disable-next-line @next/next/no-img-element
                        ? <img src={selected.imageUrl} alt={selected.name} className="w-full h-full object-cover" draggable={false} />
                        : (selected.emoji && <span style={{ fontSize: 52 }}>{selected.emoji}</span>)}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <p className="font-bold" style={{ fontSize: 13, color: '#f3ead3', fontFamily: 'var(--rvn-font-display)' }}>{selected.name}</p>
                      {selected.rarity && <span className="uppercase font-bold" style={{ fontSize: 8, color: RAR_COL[selected.rarity] ?? 'var(--text-muted)' }}>{selected.rarity}</span>}
                    </div>
                    {selected.description && <p style={{ fontSize: 10, color: 'var(--text-muted)', lineHeight: 1.4 }}>{selected.description}</p>}
                    {selected.kind === 'avatar' && avAudio[selected.id] && (
                      <button onClick={() => previewVoice(selected.id)} className="rvn-press px-3 py-1.5 rounded-full font-bold" style={{ fontSize: 10, background: 'rgba(240,180,41,0.14)', border: '1px solid rgba(240,180,41,0.5)', color: 'var(--gold)' }}>{t('common.cosmetics.voicePreview')}</button>
                    )}
                    {msg && <p className="px-2 py-1.5 rounded-lg" style={{ fontSize: 10.5, background: 'rgba(10,8,16,0.9)', border: '1px solid rgba(96,165,250,0.4)', color: '#93c5fd' }}>{msg}</p>}
                  </div>
                  <div className="shrink-0 mt-2">
                    {selOwned ? (
                      <button onClick={() => doEquip(selected)} disabled={busy === selected.id}
                        className="rvn-press w-full rounded-xl font-bold disabled:opacity-50"
                        style={{ minHeight: 42, fontSize: 12, fontFamily: 'var(--rvn-font-display)', background: selEquipped ? 'rgba(74,222,128,0.18)' : 'rgba(96,165,250,0.22)', border: `1px solid ${selEquipped ? 'rgba(74,222,128,0.6)' : 'rgba(96,165,250,0.5)'}`, color: selEquipped ? '#4ade80' : '#93c5fd' }}>
                        {selEquipped ? '✓ Naudojama (spausk nuimti)' : 'Naudoti'}
                      </button>
                    ) : (
                      <button onClick={() => doBuy(selected)} disabled={busy === selected.id || localGold < selected.priceGold}
                        className="rvn-press w-full rounded-xl font-bold disabled:opacity-40"
                        style={{ minHeight: 42, fontSize: 12, fontFamily: 'var(--rvn-font-display)', background: localGold < selected.priceGold ? 'rgba(80,80,80,0.2)' : 'linear-gradient(180deg,#ffe28c,#f3b62c)', border: localGold < selected.priceGold ? '1px solid rgba(255,255,255,0.15)' : '1px solid #ffeaa6', color: localGold < selected.priceGold ? 'var(--text-muted)' : '#3a2406' }}>
                        {localGold < selected.priceGold ? 'Nepakanka aukso' : `Pirkti 🪙 ${selected.priceGold}`}
                      </button>
                    )}
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-center px-3" style={{ fontSize: 11, color: 'var(--text-muted)' }}>{state ? t('common.cosmetics.pick') : t('common.loading')}</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
