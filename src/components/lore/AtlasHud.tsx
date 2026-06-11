'use client'

// ── AtlasHud — sutraukiamas žemėlapio UI blokas ───────────────────────────────
// Kiekviena atlaso UI dalis (filtrai, timeline, statistika...) turi savo
// suskleidimo mygtuką; suskleidus lieka maža piliulė atstatymui. Būsena
// įsimenama localStorage, animacijos — framer-motion.

import { useEffect, useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Minus } from 'lucide-react'
import { playUiClick } from '@/lib/ui-sound'

type Props = {
  /** Unikalus raktas localStorage būsenai (pvz. 'filters', 'timeline') */
  id: string
  /** Piliulės etiketė suskleidus */
  label: string
  /** Piliulės ikona (emoji ar ReactNode) */
  icon: ReactNode
  children: ReactNode
  /** Piliulės lygiavimas suskleidus */
  align?: 'left' | 'right'
}

export function AtlasHud({ id, label, icon, children, align = 'left' }: Props) {
  const storageKey = 'rvn-atlas-hud-' + id
  const [collapsed, setCollapsed] = useState<boolean | null>(null)

  useEffect(() => {
    try {
      setCollapsed(window.localStorage.getItem(storageKey) === '1')
    } catch { setCollapsed(false) }
  }, [storageKey])

  function toggle(next: boolean) {
    setCollapsed(next)
    playUiClick()
    try { window.localStorage.setItem(storageKey, next ? '1' : '0') } catch { /* tyliai */ }
  }

  // Iki hidratacijos — rodome turinį be animacijos (be mirgėjimo)
  if (collapsed === null) return <div>{children}</div>

  return (
    <AnimatePresence mode="wait" initial={false}>
      {collapsed ? (
        <motion.button
          key="pill"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          transition={{ duration: 0.18 }}
          onClick={() => toggle(false)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs transition-all hover:scale-105"
          style={{
            background: 'rgba(5,5,12,0.85)',
            border: '1px solid rgba(240,180,41,0.25)',
            color: 'var(--gold)',
            backdropFilter: 'blur(8px)',
            fontFamily: 'var(--rvn-font-display)',
            fontSize: '10px',
            letterSpacing: '0.05em',
            marginLeft: align === 'right' ? 'auto' : undefined,
          }}
          title={'Rodyti: ' + label}
        >
          {icon} {label}
        </motion.button>
      ) : (
        <motion.div
          key="content"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          transition={{ duration: 0.2 }}
          className="relative"
        >
          <button
            onClick={() => toggle(true)}
            className="absolute -top-2 z-10 w-5 h-5 rounded-full flex items-center justify-center transition-all hover:scale-110"
            style={{
              [align === 'right' ? 'left' : 'right']: '-0.25rem',
              background: 'rgba(5,5,12,0.9)',
              border: '1px solid rgba(240,180,41,0.3)',
              color: 'var(--text-muted)',
            } as React.CSSProperties}
            title={'Slėpti: ' + label}
            aria-label={'Slėpti: ' + label}
          >
            <Minus className="w-3 h-3" />
          </button>
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
