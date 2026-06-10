'use client'

// ── GameCard — vieningas „žaidimo pojūčio" kortos apvalkalas ──────────────────
// 3D pakreipimas pagal pelės poziciją, blizgesio (shine) sluoksnis, paspaudimo
// fizika ir garsai. Naudojamas visur, kur rodoma korta — kad pojūtis būtų
// vienodas visame portale.
//
// Naudojimas:
//   <GameCard glowColor={rarityColor}> ...kortos turinys... </GameCard>

import React, { useRef, useEffect, useCallback } from 'react'
import { playCardHover, playCardPick, playCardPlace } from '@/lib/ui-sound'

type GameCardProps = {
  children: React.ReactNode
  /** Švytėjimo spalva (pvz., retumo spalva). */
  glowColor?: string
  /** Maksimalus pakreipimo kampas laipsniais. Default 10. */
  intensity?: number
  /** Pakilimas hover metu (px). Default 4. */
  liftPx?: number
  /** Ar groti garsus. Default true. */
  sounds?: boolean
  /** Ar rodyti shine sluoksnį. Default true. */
  shine?: boolean
  className?: string
  style?: React.CSSProperties
}

export function GameCard({
  children,
  glowColor = 'rgba(240,180,41,0.5)',
  intensity = 10,
  liftPx = 4,
  sounds = true,
  shine = true,
  className,
  style,
}: GameCardProps) {
  const innerRef = useRef<HTMLDivElement>(null)
  const shineRef = useRef<HTMLDivElement>(null)
  const frameRef = useRef<number | null>(null)
  const reducedRef = useRef(false)
  const hoveringRef = useRef(false)
  const pressedRef = useRef(false)

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    reducedRef.current = mq.matches
    const handler = (e: MediaQueryListEvent) => { reducedRef.current = e.matches }
    mq.addEventListener?.('change', handler)
    return () => mq.removeEventListener?.('change', handler)
  }, [])

  useEffect(() => {
    return () => { if (frameRef.current) cancelAnimationFrame(frameRef.current) }
  }, [])

  const applyTransform = useCallback((rx: number, ry: number, lift: number, scale: number) => {
    const el = innerRef.current
    if (!el) return
    el.style.transform =
      `perspective(800px) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg) ` +
      `translateY(${-lift}px) scale(${scale})`
  }, [])

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (reducedRef.current || e.pointerType === 'touch') return
    const el = innerRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const px = (e.clientX - rect.left) / rect.width - 0.5   // -0.5 .. 0.5
    const py = (e.clientY - rect.top) / rect.height - 0.5
    if (frameRef.current) cancelAnimationFrame(frameRef.current)
    frameRef.current = requestAnimationFrame(() => {
      el.style.transition = 'transform 0.06s linear, box-shadow 0.18s'
      const scale = pressedRef.current ? 0.97 : 1.03
      const lift = pressedRef.current ? 0 : liftPx
      applyTransform(-py * 2 * intensity, px * 2 * intensity, lift, scale)
      if (shine && shineRef.current) {
        shineRef.current.style.opacity = '1'
        shineRef.current.style.background =
          `radial-gradient(circle at ${(px + 0.5) * 100}% ${(py + 0.5) * 100}%, ` +
          'rgba(255,255,255,0.14) 0%, rgba(255,255,255,0.05) 35%, transparent 65%)'
      }
    })
  }, [applyTransform, intensity, liftPx, shine])

  const handlePointerEnter = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    hoveringRef.current = true
    const el = innerRef.current
    if (el) {
      el.style.boxShadow = `0 0 24px ${glowColor}40, 0 10px 30px rgba(0,0,0,0.55)`
    }
    if (sounds && e.pointerType !== 'touch') playCardHover()
  }, [glowColor, sounds])

  const reset = useCallback(() => {
    hoveringRef.current = false
    pressedRef.current = false
    if (frameRef.current) cancelAnimationFrame(frameRef.current)
    const el = innerRef.current
    if (el) {
      el.style.transition = 'transform 0.25s ease-out, box-shadow 0.25s'
      el.style.transform = 'perspective(800px) rotateX(0deg) rotateY(0deg) translateY(0) scale(1)'
      el.style.boxShadow = '0 2px 8px rgba(0,0,0,0.4)'
    }
    if (shineRef.current) shineRef.current.style.opacity = '0'
  }, [])

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    pressedRef.current = true
    const el = innerRef.current
    if (el && !reducedRef.current) {
      el.style.transition = 'transform 0.08s ease-out'
      if (e.pointerType === 'touch') {
        applyTransform(0, 0, 0, 0.97)
      }
      // pelei — transformą atnaujins kitas pointermove su pressed scale
    }
    if (sounds) playCardPick()
  }, [applyTransform, sounds])

  const handlePointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!pressedRef.current) return
    pressedRef.current = false
    const el = innerRef.current
    if (el && !reducedRef.current) {
      el.style.transition = 'transform 0.18s ease-out'
      if (e.pointerType === 'touch' || !hoveringRef.current) {
        applyTransform(0, 0, 0, 1)
      } else {
        // grįžtam į hover lift
        applyTransform(0, 0, liftPx, 1.03)
      }
    }
    if (sounds) playCardPlace()
  }, [applyTransform, liftPx, sounds])

  return (
    <div
      className={className}
      style={{ perspective: '800px', ...style }}
      onPointerMove={handlePointerMove}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={reset}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={reset}
    >
      <div
        ref={innerRef}
        className="relative"
        style={{
          transformStyle: 'preserve-3d',
          willChange: 'transform',
          boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
          borderRadius: 'inherit',
        }}
      >
        {children}
        {shine && (
          <div
            ref={shineRef}
            aria-hidden
            className="absolute inset-0 pointer-events-none rounded-[inherit] z-10"
            style={{ opacity: 0, transition: 'opacity 0.2s' }}
          />
        )}
      </div>
    </div>
  )
}
