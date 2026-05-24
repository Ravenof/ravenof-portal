'use client'

import { useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { LoreMarker } from './LoreMarker'
import type { LoreLocation, LoreFaction } from '@/data/lore'

type Props = {
  locations: LoreLocation[]
  factions: LoreFaction[]
  selectedId: string | null
  onSelect: (id: string) => void
}

const MAP_IMAGE = '/maps/ravenof-world-map.jpg'

export function LoreMap({ locations, factions, selectedId, onSelect }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)

  const getFaction = (id?: string) => factions.find((f) => f.id === id)

  return (
    <div
      ref={containerRef}
      className="relative w-full overflow-hidden rounded-xl select-none"
      style={{
        aspectRatio: '16/9',
        minHeight:   '260px',
        maxHeight:   '520px',
      }}
    >
      {/* Map background — real image or dark fantasy placeholder */}
      <MapBackground />

      {/* Vignette overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 50%, rgba(5,5,12,0.65) 100%)',
        }}
      />

      {/* Top-left title */}
      <div
        className="absolute top-3 left-3 flex items-center gap-2 px-3 py-1.5 rounded-lg z-10"
        style={{
          background:     'rgba(5,5,12,0.85)',
          border:         '1px solid rgba(212,175,55,0.2)',
          backdropFilter: 'blur(8px)',
        }}
      >
        <span style={{ color: 'var(--gold)', fontSize: '12px' }}>🗺</span>
        <span
          className="text-xs font-semibold"
          style={{ fontFamily: 'var(--rvn-font-display)', color: 'var(--gold)', letterSpacing: '0.08em' }}
        >
          Ravenof Žemės
        </span>
      </div>

      {/* Markers */}
      <AnimatePresence>
        {locations.map((loc) => (
          <motion.div key={loc.id} layout>
            <LoreMarker
              location={loc}
              faction={getFaction(loc.factionId)}
              isSelected={selectedId === loc.id}
              onClick={() => onSelect(loc.id)}
            />
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Empty state */}
      {locations.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            className="text-center px-6 py-4 rounded-xl"
            style={{ background: 'rgba(5,5,12,0.85)', border: '1px solid var(--bg-border)' }}
          >
            <p className="text-2xl mb-2">🗺️</p>
            <p className="text-sm font-semibold" style={{ color: 'var(--text-muted)', fontFamily: 'var(--rvn-font-display)' }}>
              Nėra vietovių šioje eroje
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
              Pakeisk erą arba frakcijos filtrą
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

function MapBackground() {
  return (
    <>
      {/* Try to load real map image */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={MAP_IMAGE}
        alt="Ravenof žemėlapis"
        className="absolute inset-0 w-full h-full object-cover"
        style={{ display: 'block' }}
        onError={(e) => {
          // Hide image — placeholder below shows instead
          ;(e.currentTarget as HTMLImageElement).style.display = 'none'
        }}
      />

      {/* Placeholder shown when image missing */}
      <div
        className="absolute inset-0"
        style={{
          background: [
            'repeating-linear-gradient(0deg,   transparent, transparent 49px, rgba(212,175,55,0.04) 50px)',
            'repeating-linear-gradient(90deg,  transparent, transparent 49px, rgba(212,175,55,0.04) 50px)',
            'repeating-linear-gradient(45deg,  transparent, transparent 39px, rgba(124,58,237,0.02) 40px)',
            'radial-gradient(ellipse at 28% 38%, rgba(124,58,237,0.10) 0%, transparent 45%)',
            'radial-gradient(ellipse at 72% 55%, rgba(212,175,55,0.08) 0%, transparent 45%)',
            'radial-gradient(ellipse at 50% 85%, rgba(220,38,38,0.06) 0%, transparent 40%)',
            '#07070f',
          ].join(', '),
        }}
      >
        {/* Decorative continent outlines */}
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 800 450" preserveAspectRatio="xMidYMid slice" aria-hidden>
          <defs>
            <filter id="blur-soft">
              <feGaussianBlur stdDeviation="2" />
            </filter>
          </defs>
          {/* Main landmass */}
          <path
            d="M 80 120 Q 150 80 280 100 Q 420 115 500 90 Q 600 70 680 130 Q 730 180 710 280 Q 690 370 580 390 Q 460 410 360 380 Q 240 350 160 320 Q 80 285 75 200 Z"
            fill="rgba(212,175,55,0.04)"
            stroke="rgba(212,175,55,0.12)"
            strokeWidth="1.5"
            filter="url(#blur-soft)"
          />
          {/* Island */}
          <path
            d="M 580 310 Q 620 290 650 310 Q 670 330 640 350 Q 610 365 590 345 Z"
            fill="rgba(212,175,55,0.03)"
            stroke="rgba(212,175,55,0.08)"
            strokeWidth="1"
          />
          {/* Mountain range hint */}
          <polyline
            points="380,140 400,120 420,145 445,115 470,140 490,125"
            fill="none"
            stroke="rgba(212,175,55,0.1)"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          {/* Rivers */}
          <path d="M 300 170 Q 320 220 290 280 Q 270 320 260 360" fill="none" stroke="rgba(14,165,233,0.15)" strokeWidth="1.5" />
          <path d="M 460 200 Q 430 240 410 280" fill="none" stroke="rgba(14,165,233,0.1)" strokeWidth="1" />
          {/* Coast dots */}
          {[
            [140,300],[175,330],[210,345],[250,355],[290,360],[330,368],[375,372],
            [420,370],[460,360],[500,345],[535,325],[565,305],
          ].map(([cx, cy], i) => (
            <circle key={i} cx={cx} cy={cy} r="1.5" fill="rgba(14,165,233,0.2)" />
          ))}
          {/* Compass rose (bottom-right) */}
          <g transform="translate(730, 390)">
            <circle r="16" fill="rgba(5,5,12,0.7)" stroke="rgba(212,175,55,0.2)" strokeWidth="1" />
            <text textAnchor="middle" y="-6" fontSize="8" fill="rgba(212,175,55,0.5)" fontFamily="serif">N</text>
            <text textAnchor="middle" y="14" fontSize="8" fill="rgba(212,175,55,0.3)" fontFamily="serif">S</text>
            <text x="8" textAnchor="start" y="3.5" fontSize="8" fill="rgba(212,175,55,0.3)" fontFamily="serif">E</text>
            <text x="-8" textAnchor="end" y="3.5" fontSize="8" fill="rgba(212,175,55,0.3)" fontFamily="serif">W</text>
            <line x1="0" y1="-11" x2="0" y2="11" stroke="rgba(212,175,55,0.3)" strokeWidth="0.5" />
            <line x1="-11" y1="0" x2="11" y2="0" stroke="rgba(212,175,55,0.3)" strokeWidth="0.5" />
          </g>
          {/* Scale bar (bottom-left) */}
          <g transform="translate(30, 420)">
            <line x1="0" y1="0" x2="60" y2="0" stroke="rgba(212,175,55,0.3)" strokeWidth="1" />
            <line x1="0" y1="-3" x2="0" y2="3" stroke="rgba(212,175,55,0.3)" strokeWidth="1" />
            <line x1="60" y1="-3" x2="60" y2="3" stroke="rgba(212,175,55,0.3)" strokeWidth="1" />
            <text textAnchor="middle" x="30" y="-6" fontSize="7" fill="rgba(212,175,55,0.3)" fontFamily="serif">100 li</text>
          </g>
        </svg>
      </div>
    </>
  )
}
