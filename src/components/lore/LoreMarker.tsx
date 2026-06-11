'use client'

import { motion } from 'framer-motion'
import { playCardHover } from '@/lib/ui-sound'
import type { LoreLocation, LoreFaction } from '@/data/lore'

// Ikonos pagal vietovės tipą. Palaikomos ir lietuviškos (statiniai duomenys),
// ir angliškos (DB / admin forma) reikšmės.
const TYPE_ICONS: Record<string, string> = {
  // angliškos (DB)
  city: '🏙️', ruins: '🏚️', dungeon: '🕳️', forest: '🌲', mountain: '🏔️',
  coast: '⚓', plains: '🌾', island: '🏝️', fortress: '🏰', temple: '🏛️',
  portal: '🌀', unknown: '📍',
  // lietuviškos (statiniai duomenys)
  miestas: '🏙️', 'griuvėsiai': '🏚️', 'miškas': '🌲', 'tvirtovė': '🏰',
  uostas: '⚓', 'plyšys': '🌋', 'slėnis': '🏔️',
}

type Props = {
  location: LoreLocation
  faction?: LoreFaction
  isSelected: boolean
  onClick: () => void
  eventCount?: number
  /** Fog-of-war: ar lokacija jau aplankyta. Default true (jokio pritemdymo). */
  discovered?: boolean
}

export function LoreMarker({ location, faction, isSelected, onClick, eventCount = 0, discovered = true }: Props) {
  const color = faction?.color ?? '#d4af37'
  const icon  = TYPE_ICONS[String(location.type ?? '').toLowerCase()] ?? '📍'

  return (
    <motion.button
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      whileHover={{ scale: 1.25 }}
      whileTap={{ scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 400, damping: 20 }}
      onClick={onClick}
      onMouseEnter={() => playCardHover()}
      aria-label={location.name}
      title={location.name}
      className="absolute -translate-x-1/2 -translate-y-1/2 group"
      style={{
        left: location.x + '%',
        top: location.y + '%',
        zIndex: isSelected ? 30 : 20,
        filter: discovered ? 'none' : 'grayscale(0.85) brightness(0.6)',
        transition: 'filter 0.6s ease',
      }}
    >
      {/* Kvėpuojantis švytėjimas (tik atrastiems, kai nepasirinkta) */}
      {discovered && !isSelected && (
        <motion.span
          className="absolute inset-0 rounded-full blur-md pointer-events-none"
          style={{ background: color }}
          animate={{ opacity: [0.12, 0.3, 0.12] }}
          transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}
      {/* Pulse ring */}
      {isSelected && (
        <motion.span
          className="absolute inset-0 rounded-full"
          style={{ background: color + '40', border: '2px solid ' + color + '80' }}
          animate={{ scale: [1, 1.8, 1], opacity: [0.8, 0, 0.8] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      )}

      {/* Outer glow */}
      <span
        className="absolute inset-0 rounded-full blur-sm transition-opacity duration-200"
        style={{
          background: color,
          opacity: isSelected ? 0.5 : 0,
        }}
      />

      {/* Marker body */}
      <span
        className="relative flex items-center justify-center w-8 h-8 rounded-full text-sm transition-all duration-200"
        style={{
          background:  isSelected ? color + '33' : 'rgba(7,7,15,0.85)',
          border:      '2px solid ' + (isSelected ? color : color + '99'),
          boxShadow:   isSelected
            ? `0 0 12px ${color}66, 0 0 24px ${color}33`
            : `0 0 6px ${color}33`,
          backdropFilter: 'blur(4px)',
        }}
      >
        {icon}
      </span>

      {/* Tooltip */}
      <span
        className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 rounded text-xs whitespace-nowrap pointer-events-none
                   opacity-0 group-hover:opacity-100 transition-opacity duration-150"
        style={{
          background:  'rgba(7,7,15,0.95)',
          border:      '1px solid ' + color + '55',
          color:       'var(--text-primary)',
          fontFamily:  'var(--rvn-font-display)',
          letterSpacing: '0.04em',
          fontSize:    '10px',
        }}
      >
        {discovered ? location.name : '??? — neatrasta'}
      </span>

      {/* Event count badge */}
      {eventCount > 0 && (
        <span
          className="absolute -top-1 -right-1 flex items-center justify-center rounded-full text-xs font-bold pointer-events-none"
          style={{
            width: eventCount > 9 ? 18 : 15,
            height: eventCount > 9 ? 18 : 15,
            fontSize: 9,
            background: '#ef4444',
            color: '#fff',
            border: '1.5px solid rgba(7,7,15,0.9)',
            fontFamily: 'monospace',
            lineHeight: 1,
            zIndex: 10,
          }}
        >
          {eventCount > 9 ? '9+' : eventCount}
        </span>
      )}

      {/* Down pointer */}
      <span
        className="absolute top-full left-1/2 -translate-x-1/2 -mt-0.5"
        style={{
          width: 0, height: 0,
          borderLeft:  '4px solid transparent',
          borderRight: '4px solid transparent',
          borderTop:   '5px solid ' + (isSelected ? color : color + '99'),
        }}
      />
    </motion.button>
  )
}
