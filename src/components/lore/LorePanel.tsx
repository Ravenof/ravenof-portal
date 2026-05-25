'use client'

import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { X, MapPin, Scroll, User, Sword, CreditCard } from 'lucide-react'
import type { LoreLocation, LoreFaction, LoreEvent, LoreCharacter, LoreArtifact } from '@/data/lore'

type Props = {
  location: LoreLocation | null
  faction?: LoreFaction
  events: LoreEvent[]
  characters: LoreCharacter[]
  artifacts: LoreArtifact[]
  onClose: () => void
}

const TYPE_LABELS: Record<LoreLocation['type'], string> = {
  miestas:    'Miestas',
  griuvėsiai: 'Griuvėsiai',
  miškas:     'Miškas',
  tvirtovė:   'Tvirtovė',
  uostas:     'Uostas',
  plyšys:     'Plyšys',
  slėnis:     'Slėnis',
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span style={{ color: 'var(--gold)', opacity: 0.8 }}>{icon}</span>
        <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--text-muted)', fontFamily: 'var(--rvn-font-display)', letterSpacing: '0.1em' }}>
          {title}
        </p>
      </div>
      {children}
    </div>
  )
}

export function LorePanel({ location, faction, events, characters, artifacts, onClose }: Props) {
  const color = faction?.color ?? '#d4af37'

  // Desktop: slide in from right. Mobile: slide up from bottom.
  return (
    <AnimatePresence>
      {location && (
        <>
          {/* Mobile backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 lg:hidden"
            style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
            onClick={onClose}
          />

          {/* Panel */}
          <motion.aside
            key="panel"
            // Mobile: bottom sheet
            initial={{ y: '100%', x: 0 }}
            animate={{ y: 0, x: 0 }}
            exit={{ y: '100%', x: 0 }}
            // Desktop: right slide
            className="
              fixed bottom-0 left-0 right-0 z-50
              lg:static lg:z-auto lg:bottom-auto lg:left-auto lg:right-auto
              lg:h-full
              flex flex-col
            "
            style={{
              // mobile overrides via className above; desktop via style
            }}
            // For desktop we override with a different animation via a separate variant approach
          >
            {/* We use two separate motion divs — one for mobile, one for desktop */}
            {/* Mobile sheet */}
            <div
              className="
                lg:hidden
                flex flex-col rounded-t-2xl overflow-hidden
                max-h-[80dvh]
              "
              style={{
                background: 'var(--bg-elevated)',
                border:     '1px solid ' + color + '33',
                borderBottom: 'none',
                boxShadow:  `0 -8px 40px rgba(0,0,0,0.7), 0 0 0 1px ${color}22`,
              }}
            >
              <PanelContent location={location} faction={faction} color={color} events={events} characters={characters} artifacts={artifacts} onClose={onClose} />
            </div>

            {/* Desktop side panel — always visible structure, animated separately */}
            <div
              className="
                hidden lg:flex lg:flex-col
                w-80 xl:w-96 h-full rounded-xl overflow-hidden
              "
              style={{
                background: 'var(--bg-elevated)',
                border:     '1px solid ' + color + '33',
                boxShadow:  `0 0 40px rgba(0,0,0,0.8), 0 0 0 1px ${color}22`,
              }}
            >
              <PanelContent location={location} faction={faction} color={color} events={events} characters={characters} artifacts={artifacts} onClose={onClose} />
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}

function PanelContent({
  location, faction, color, events, characters, artifacts, onClose,
}: Props & { color: string }) {
  if (!location) return null

  return (
    <>
      {/* ── Header ── */}
      <div
        className="shrink-0 flex items-start gap-3 px-5 py-4"
        style={{ borderBottom: '1px solid ' + color + '22' }}
      >
        {/* Drag handle (mobile) */}
        <div className="lg:hidden absolute top-2 left-1/2 -translate-x-1/2 w-10 h-1 rounded-full" style={{ background: 'var(--bg-border)' }} />

        <div className="flex-1 min-w-0 pt-2 lg:pt-0">
          {/* Location type chip */}
          <span
            className="inline-block text-xs px-2 py-0.5 rounded-full mb-1.5"
            style={{ background: color + '22', color, border: '1px solid ' + color + '44', fontFamily: 'var(--rvn-font-display)', fontSize: '10px', letterSpacing: '0.06em' }}
          >
            {TYPE_LABELS[location.type]}
          </span>

          <h2
            className="text-base font-bold leading-tight"
            style={{ fontFamily: 'var(--rvn-font-display)', color: 'var(--text-primary)', letterSpacing: '0.04em' }}
          >
            {location.name}
          </h2>

          {faction && (
            <p className="text-xs mt-0.5" style={{ color: faction.color }}>
              {faction.name}
            </p>
          )}
          <Link
            href={`/lore/locations/${location.id}`}
            className="inline-flex items-center gap-1 text-xs mt-1 transition-opacity hover:opacity-70"
            style={{ color: 'var(--gold)', textDecoration: 'none', fontFamily: 'var(--rvn-font-display)' }}
          >
            Skaityti istoriją →
          </Link>
        </div>

        <button
          onClick={onClose}
          className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center mt-2 lg:mt-0"
          style={{ background: 'var(--bg-border)', color: 'var(--text-muted)' }}
          aria-label="Uždaryti"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* ── Scrollable body ── */}
      <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4 space-y-5" style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom, 0px))' }}>

        {/* Description */}
        <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          {location.description}
        </p>

        {/* Gold divider */}
        <div style={{ height: '1px', background: 'linear-gradient(to right, ' + color + '44, transparent)' }} />

        {/* Events */}
        {events.length > 0 && (
          <Section icon={<Scroll className="w-3.5 h-3.5" />} title="Įvykiai">
            <div className="space-y-2">
              {events.map((ev) => (
                <Link
                  key={ev.id}
                  href={`/lore/events/${ev.id}`}
                  className="block rounded-lg px-3 py-2.5 transition-colors hover:border-[rgba(212,175,55,0.3)]"
                  style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-border)', textDecoration: 'none' }}
                >
                  <p className="text-xs font-semibold mb-1" style={{ color: 'var(--text-primary)', fontFamily: 'var(--rvn-font-display)' }}>
                    {ev.name}
                  </p>
                  <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                    {ev.description}
                  </p>
                </Link>
              ))}
            </div>
          </Section>
        )}

        {/* Characters */}
        {characters.length > 0 && (
          <Section icon={<User className="w-3.5 h-3.5" />} title="Veikėjai">
            <div className="space-y-1.5">
              {characters.map((ch) => (
                <Link
                  key={ch.id}
                  href={`/lore/characters/${ch.id}`}
                  className="flex items-start gap-2 rounded-lg px-3 py-2 transition-colors hover:border-[rgba(212,175,55,0.25)]"
                  style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-border)', textDecoration: 'none' }}
                >
                  <span className="text-base leading-none mt-0.5">👤</span>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold" style={{ color: 'var(--text-primary)', fontFamily: 'var(--rvn-font-display)' }}>
                      {ch.name}
                    </p>
                    {ch.title && (
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{ch.title}</p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </Section>
        )}

        {/* Artifacts */}
        {artifacts.length > 0 && (
          <Section icon={<Sword className="w-3.5 h-3.5" />} title="Artefaktai">
            <div className="space-y-2">
              {artifacts.map((art) => (
                <Link
                  key={art.id}
                  href={`/lore/artifacts/${art.id}`}
                  className="block rounded-lg px-3 py-2.5 transition-colors hover:border-[rgba(212,175,55,0.3)]"
                  style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-border)', textDecoration: 'none' }}
                >
                  <p className="text-xs font-semibold mb-1" style={{ color: 'var(--gold)', fontFamily: 'var(--rvn-font-display)' }}>
                    ✦ {art.name}
                  </p>
                  <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                    {art.description}
                  </p>
                </Link>
              ))}
            </div>
          </Section>
        )}

        {/* Related Cards */}
        {location.relatedCards.length > 0 && (
          <Section icon={<CreditCard className="w-3.5 h-3.5" />} title="Susijusios Kortos">
            <div className="flex flex-wrap gap-2">
              {location.relatedCards.map((card) => (
                <Link
                  key={card.cardNumber}
                  href={'/cards/' + encodeURIComponent(card.cardNumber)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs transition-all hover:scale-105"
                  style={{
                    background:  'rgba(212,175,55,0.08)',
                    border:      '1px solid rgba(212,175,55,0.25)',
                    color:       'var(--gold)',
                    fontFamily:  'var(--rvn-font-display)',
                    letterSpacing: '0.03em',
                  }}
                >
                  🃏 {card.name}
                </Link>
              ))}
            </div>
          </Section>
        )}

        {/* Empty state */}
        {events.length === 0 && characters.length === 0 && artifacts.length === 0 && location.relatedCards.length === 0 && (
          <p className="text-xs text-center py-4" style={{ color: 'var(--text-muted)' }}>
            Istorija dar neįrašyta...
          </p>
        )}

        {/* Coordinates */}
        <div className="flex items-center gap-1.5 mt-2">
          <MapPin className="w-3 h-3" style={{ color: 'var(--text-muted)' }} />
          <span className="text-xs" style={{ color: 'var(--text-muted)', fontFamily: 'monospace' }}>
            {location.x.toFixed(0)}°V, {location.y.toFixed(0)}°Š
          </span>
        </div>
      </div>
    </>
  )
}
