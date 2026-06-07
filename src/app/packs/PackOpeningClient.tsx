'use client'

import { useState, useCallback } from 'react'
import Image from 'next/image'
import { openPack, type OpenedCard } from './actions'

type Pack = {
  id: string
  name: string
  description: string | null
  image_url: string | null
  cards_per_pack: number
  daily_limit: number
  openedToday: number
}

export function PackOpeningClient({ packs }: { packs: Pack[] }) {
  const [activePack, setActivePack] = useState<Pack | null>(null)
  const [phase, setPhase] = useState<'idle' | 'opening' | 'reveal' | 'done'>('idle')
  const [revealedCards, setRevealedCards] = useState<OpenedCard[]>([])
  const [flippedIdx, setFlippedIdx] = useState<number>(-1)
  const [error, setError] = useState<string | null>(null)

  const handleOpen = useCallback(async (pack: Pack) => {
    setActivePack(pack)
    setPhase('opening')
    setError(null)
    setRevealedCards([])
    setFlippedIdx(-1)

    const res = await openPack(pack.id)
    if (res.error) {
      setError(res.error)
      setPhase('idle')
      return
    }

    const cards = res.cards ?? []
    setRevealedCards(cards)
    setPhase('reveal')

    // Flip cards one by one
    for (let i = 0; i < cards.length; i++) {
      await new Promise<void>((r) => setTimeout(r, i === 0 ? 600 : 450))
      setFlippedIdx(i)
    }
    await new Promise<void>((r) => setTimeout(r, 600))
    setPhase('done')
  }, [])

  const handleReset = () => {
    setPhase('idle')
    setActivePack(null)
    setRevealedCards([])
    setFlippedIdx(-1)
    setError(null)
  }

  if (phase === 'opening') {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-6">
        <div className="relative w-32 h-44">
          <div
            className="absolute inset-0 rounded-2xl"
            style={{
              background: 'linear-gradient(135deg, rgba(240,180,41,0.3), rgba(168,139,250,0.2))',
              border: '2px solid rgba(240,180,41,0.5)',
              animation: 'packPulse 0.8s ease-in-out infinite alternate',
            }}
          />
          <div className="absolute inset-0 flex items-center justify-center text-5xl">
            🃏
          </div>
        </div>
        <p className="text-sm" style={{ color: 'var(--gold)', fontFamily: 'var(--rvn-font-display)' }}>
          Atidaro...
        </p>
        <style>{`@keyframes packPulse { from { box-shadow: 0 0 20px rgba(240,180,41,0.3); } to { box-shadow: 0 0 50px rgba(240,180,41,0.7); } }`}</style>
      </div>
    )
  }

  if (phase === 'reveal' || phase === 'done') {
    const allFlipped = flippedIdx >= revealedCards.length - 1
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold" style={{ fontFamily: 'var(--rvn-font-display)', color: 'var(--gold)' }}>
            ✨ {activePack?.name} — atvertos kortos
          </h2>
          {phase === 'done' && (
            <button
              onClick={handleReset}
              className="text-xs px-3 py-1.5 rounded-lg transition-opacity hover:opacity-80"
              style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-border)', color: 'var(--text-muted)' }}>
              ← Atgal
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-4 justify-center">
          {revealedCards.map((card, idx) => {
            const isFlipped = idx <= flippedIdx
            return (
              <div
                key={idx}
                className="relative"
                style={{ width: 140, height: 196, perspective: 800 }}>
                <div
                  style={{
                    width: '100%', height: '100%',
                    position: 'relative',
                    transformStyle: 'preserve-3d',
                    transition: 'transform 0.55s cubic-bezier(0.4,0,0.2,1)',
                    transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
                  }}>
                  {/* Card back */}
                  <div
                    style={{
                      position: 'absolute', inset: 0,
                      backfaceVisibility: 'hidden',
                      borderRadius: 12,
                      background: 'linear-gradient(135deg, #1a1040 0%, #0d0820 100%)',
                      border: '2px solid rgba(240,180,41,0.4)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 40,
                    }}>
                    🃏
                  </div>
                  {/* Card front */}
                  <div
                    style={{
                      position: 'absolute', inset: 0,
                      backfaceVisibility: 'hidden',
                      transform: 'rotateY(180deg)',
                      borderRadius: 12,
                      overflow: 'hidden',
                      border: `2px solid ${card.rarity_color ?? 'rgba(240,180,41,0.4)'}`,
                      boxShadow: isFlipped ? `0 0 18px ${card.rarity_color ?? 'rgba(240,180,41,0.3)'}55` : 'none',
                      background: 'var(--bg-surface)',
                    }}>
                    {card.image_url ? (
                      <Image
                        src={card.image_url}
                        alt={card.name}
                        fill
                        style={{ objectFit: 'cover' }}
                        sizes="140px"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-4xl">🃏</div>
                    )}
                    {/* Overlay */}
                    <div
                      style={{
                        position: 'absolute', bottom: 0, left: 0, right: 0,
                        background: 'linear-gradient(to top, rgba(7,7,15,0.95) 60%, transparent)',
                        padding: '8px 6px 6px',
                      }}>
                      <p
                        className="text-xs font-bold leading-tight truncate"
                        style={{ color: 'var(--text-primary)', fontFamily: 'var(--rvn-font-display)' }}>
                        {card.name}
                      </p>
                      <div className="flex items-center justify-between mt-0.5 gap-1">
                        {card.rarity_name && (
                          <span
                            className="text-[10px] px-1.5 py-0.5 rounded font-semibold truncate"
                            style={{
                              background: (card.rarity_color ?? '#888') + '25',
                              color: card.rarity_color ?? '#888',
                              border: `1px solid ${card.rarity_color ?? '#888'}55`,
                              fontFamily: 'var(--rvn-font-display)',
                              maxWidth: 72,
                            }}>
                            {card.rarity_name}
                          </span>
                        )}
                        {card.is_new && (
                          <span
                            className="text-[10px] px-1.5 py-0.5 rounded font-bold"
                            style={{ background: 'rgba(52,211,153,0.2)', color: '#34d399', border: '1px solid rgba(52,211,153,0.3)' }}>
                            NAUJA!
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* New cards summary */}
        {phase === 'done' && revealedCards.some((c) => c.is_new) && (
          <div
            className="text-center py-3 rounded-xl text-sm"
            style={{ background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.2)', color: '#34d399', fontFamily: 'var(--rvn-font-display)' }}>
            +{revealedCards.filter((c) => c.is_new).length} naujų kortų kolekcijoje!
          </div>
        )}

        {phase === 'done' && (
          <div className="text-center">
            <button
              onClick={handleReset}
              className="text-sm px-6 py-2 rounded-xl font-semibold transition-opacity hover:opacity-90"
              style={{ background: 'var(--gold)', color: '#0a0a0f', fontFamily: 'var(--rvn-font-display)' }}>
              ← Atgal prie paketų
            </button>
          </div>
        )}
      </div>
    )
  }

  // Idle — pack selection grid
  return (
    <div className="space-y-6">
      {error && (
        <div className="px-4 py-3 rounded-xl text-sm" style={{ background: '#ef444420', color: '#ef4444', border: '1px solid #ef444440' }}>
          {error}
        </div>
      )}

      {packs.length === 0 && (
        <div className="py-16 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
          📦 Aktyvių paketų kol kas nėra
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {packs.map((pack) => {
          const canOpen = pack.daily_limit === 0 || pack.openedToday < pack.daily_limit
          const remaining = pack.daily_limit > 0 ? pack.daily_limit - pack.openedToday : null

          return (
            <div
              key={pack.id}
              className="rounded-2xl overflow-hidden"
              style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-border)' }}>
              {/* Pack visual */}
              <div
                className="relative h-40 flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, rgba(240,180,41,0.08), rgba(168,139,250,0.08))' }}>
                {pack.image_url ? (
                  <Image src={pack.image_url} alt={pack.name} fill style={{ objectFit: 'cover', opacity: 0.7 }} />
                ) : (
                  <span style={{ fontSize: 64 }}>🃏</span>
                )}
                {!canOpen && (
                  <div
                    className="absolute inset-0 flex items-center justify-center"
                    style={{ background: 'rgba(7,7,15,0.6)' }}>
                    <span className="text-2xl">⏰</span>
                  </div>
                )}
              </div>

              <div className="p-4 space-y-3">
                <div>
                  <h3 className="font-bold text-base" style={{ fontFamily: 'var(--rvn-font-display)', color: 'var(--gold)' }}>
                    {pack.name}
                  </h3>
                  {pack.description && (
                    <p className="text-xs mt-1 leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                      {pack.description}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className="text-xs px-2 py-0.5 rounded-full"
                    style={{ background: 'rgba(240,180,41,0.1)', color: 'var(--gold)', border: '1px solid rgba(240,180,41,0.2)' }}>
                    {pack.cards_per_pack} kortų
                  </span>
                  {pack.daily_limit > 0 && (
                    <span
                      className="text-xs px-2 py-0.5 rounded-full"
                      style={{ background: canOpen ? 'rgba(52,211,153,0.1)' : 'rgba(107,114,128,0.15)', color: canOpen ? '#34d399' : '#9ca3af', border: canOpen ? '1px solid rgba(52,211,153,0.3)' : '1px solid var(--bg-border)' }}>
                      {canOpen ? `Liko: ${remaining}` : 'Baigėsi šiandienos limitai'}
                    </span>
                  )}
                  {pack.daily_limit === 0 && (
                    <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(56,189,248,0.1)', color: '#38bdf8', border: '1px solid rgba(56,189,248,0.2)' }}>
                      Neribotas
                    </span>
                  )}
                </div>

                <button
                  disabled={!canOpen}
                  onClick={() => handleOpen(pack)}
                  className="w-full py-2.5 rounded-xl text-sm font-bold transition-all hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{
                    background: canOpen ? 'var(--gold)' : 'var(--bg-elevated)',
                    color: canOpen ? '#0a0a0f' : 'var(--text-muted)',
                    border: canOpen ? 'none' : '1px solid var(--bg-border)',
                    fontFamily: 'var(--rvn-font-display)',
                  }}>
                  {canOpen ? '✨ Atidaryti' : '⏰ Rytoj'}
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
