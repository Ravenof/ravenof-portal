'use client'

// ── CoinFlipDemo — interaktyvus Monetos metimo bandymas ──────────────────────
// Žetonas verčiasi 3D animacija: žalia pusė = sėkmė, raudona = nesėkmė.

import { useRef, useState } from 'react'
import { playCardFlip, playSuccess, playError } from '@/lib/ui-sound'

export function CoinFlipDemo() {
  const [busy, setBusy]     = useState(false)
  const [result, setResult] = useState<'win' | 'lose' | null>(null)
  const [stats, setStats]   = useState({ win: 0, lose: 0 })
  const angleRef = useRef(0)
  const tokenRef = useRef<HTMLDivElement>(null)

  const flip = () => {
    if (busy) return
    const reduced = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    const win = Math.random() < 0.5
    playCardFlip()
    setBusy(true)
    setResult(null)
    const target = win ? 0 : 180
    const next = angleRef.current - (angleRef.current % 360) + 1440 + target
    angleRef.current = next
    const el = tokenRef.current
    if (el) {
      el.style.transition = reduced ? 'none' : 'transform 1.1s cubic-bezier(0.3, 0.7, 0.3, 1)'
      el.style.transform = `rotateX(${next}deg)`
    }
    setTimeout(() => {
      setBusy(false)
      setResult(win ? 'win' : 'lose')
      setStats((s) => ({ win: s.win + (win ? 1 : 0), lose: s.lose + (win ? 0 : 1) }))
      if (win) playSuccess()
      else playError()
    }, reduced ? 60 : 1150)
  }

  return (
    <div
      className="rounded-xl p-4 flex flex-col sm:flex-row items-center gap-4"
      style={{ border: '1px solid rgba(139,92,246,0.3)', background: 'rgba(139,92,246,0.04)' }}
    >
      {/* Žetonas */}
      <button
        type="button"
        onClick={flip}
        disabled={busy}
        className="shrink-0 cursor-pointer"
        style={{ perspective: '500px' }}
        aria-label="Mesti žetoną"
      >
        <div
          ref={tokenRef}
          className="relative w-20 h-20"
          style={{ transformStyle: 'preserve-3d' }}
        >
          {/* Žalia pusė — sėkmė */}
          <div
            className="absolute inset-0 rounded-full flex flex-col items-center justify-center"
            style={{
              backfaceVisibility: 'hidden',
              background: 'radial-gradient(circle at 35% 30%, #34d97b, #15803d)',
              border: '3px solid rgba(255,255,255,0.25)',
              boxShadow: '0 4px 16px rgba(34,197,94,0.35)',
            }}
          >
            <span className="text-xl font-black text-white">✓</span>
            <span className="text-white font-bold" style={{ fontSize: 9, fontFamily: 'var(--rvn-font-display)', letterSpacing: '0.08em' }}>SĖKMĖ</span>
          </div>
          {/* Raudona pusė — nesėkmė */}
          <div
            className="absolute inset-0 rounded-full flex flex-col items-center justify-center"
            style={{
              backfaceVisibility: 'hidden',
              transform: 'rotateX(180deg)',
              background: 'radial-gradient(circle at 35% 30%, #f87171, #b91c1c)',
              border: '3px solid rgba(255,255,255,0.25)',
              boxShadow: '0 4px 16px rgba(239,68,68,0.35)',
            }}
          >
            <span className="text-xl font-black text-white">✗</span>
            <span className="text-white font-bold" style={{ fontSize: 9, fontFamily: 'var(--rvn-font-display)', letterSpacing: '0.08em' }}>NESĖKMĖ</span>
          </div>
        </div>
      </button>

      <div className="flex-1 min-w-0 flex flex-col gap-1.5 text-center sm:text-left">
        <p className="text-xs font-bold" style={{ fontFamily: 'var(--rvn-font-display)', color: '#a78bfa' }}>
          🪙 Išbandyk Monetos metimą
        </p>
        {result === 'win'  && <p className="text-sm font-semibold" style={{ color: '#4ade80' }}>Sėkmė! Efektas suveikia.</p>}
        {result === 'lose' && <p className="text-sm font-semibold" style={{ color: '#f87171' }}>Nesėkmė - šalutinis poveikis.</p>}
        {result === null   && <p className="text-sm" style={{ color: busy ? 'var(--text-secondary)' : 'var(--text-muted)' }}>{busy ? 'Žetonas ore…' : 'Spustelėk žetoną arba mygtuką.'}</p>}
        <div className="flex items-center gap-3 justify-center sm:justify-start">
          <button
            onClick={flip}
            disabled={busy}
            className="text-xs px-3 py-1.5 rounded-lg transition-all hover:opacity-85 disabled:opacity-50"
            style={{ background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.35)', color: '#a78bfa', fontFamily: 'var(--rvn-font-display)' }}
          >
            Mesk žetoną
          </button>
          {(stats.win > 0 || stats.lose > 0) && (
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
              <span style={{ color: '#4ade80' }}>✓ {stats.win}</span>
              {' · '}
              <span style={{ color: '#f87171' }}>✗ {stats.lose}</span>
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
