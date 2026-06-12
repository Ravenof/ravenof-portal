'use client'

// ── CardLightbox — kortos apžiūra iš arti ─────────────────────────────────────
// Pilno ekrano modalas su GameCard 3D pakreipimu. Uždaroma paspaudus šalia,
// X mygtuką arba Esc. Garsai: flip atidarant, place uždarant.

import { useEffect, useState, useCallback } from 'react'
import Image from 'next/image'
import { X } from 'lucide-react'
import { GameCard } from '@/components/ui/GameCard'
import { playCardFlip, playCardPlace } from '@/lib/ui-sound'

type Props = {
  src: string
  alt: string
  caption?: string
  onClose: () => void
}

export function CardLightbox({ src, alt, caption, onClose }: Props) {
  const [visible, setVisible] = useState(false)

  const close = useCallback(() => {
    playCardPlace()
    setVisible(false)
    setTimeout(onClose, 180)
  }, [onClose])

  useEffect(() => {
    playCardFlip()
    const raf = requestAnimationFrame(() => setVisible(true))
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close() }
    window.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [close])

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={alt}
      onClick={close}
      style={{
        background: 'rgba(5,5,12,0.85)',
        backdropFilter: 'blur(6px)',
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.18s ease',
      }}
    >
      <button
        onClick={close}
        className="absolute top-4 right-4 w-9 h-9 rounded-full flex items-center justify-center transition-opacity hover:opacity-70"
        style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid var(--bg-border)', color: 'var(--text-secondary)' }}
        aria-label="Uždaryti apžiūrą"
      >
        <X className="w-4 h-4" />
      </button>

      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          transform: visible ? 'scale(1) translateY(0)' : 'scale(0.85) translateY(12px)',
          transition: 'transform 0.22s cubic-bezier(0.2, 0.9, 0.3, 1.2)',
        }}
      >
        <GameCard glowColor="rgba(240,180,41,0.6)" intensity={6} liftPx={0} sounds={false} className="rounded-2xl">
          <div
            className="relative rounded-2xl overflow-hidden"
            style={{
              width: 'min(78vw, 340px)',
              aspectRatio: '3 / 4',
              border: '2px solid rgba(240,180,41,0.45)',
              background: '#0e0e1a',
              boxShadow: '0 0 40px rgba(240,180,41,0.15)',
            }}
          >
            <Image src={src} alt={alt} fill className="object-contain" sizes="340px" />
          </div>
        </GameCard>
      </div>

      {caption && (
        <p
          className="mt-4 text-sm text-center max-w-sm"
          onClick={(e) => e.stopPropagation()}
          style={{ color: 'var(--text-secondary)', fontFamily: 'var(--rvn-font-display)' }}
        >
          {caption}
        </p>
      )}
      <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
        Spustelėk šalia arba Esc - uždaryti
      </p>
    </div>
  )
}
