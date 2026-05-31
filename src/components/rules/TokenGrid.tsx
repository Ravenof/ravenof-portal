'use client'

import Image from 'next/image'
import React from 'react'

const STATUS_TOKENS = [
  { symbol: '❄', label: 'Sušaldytas',   effect: 'Negali atakuoti, nedaro atgalinės žalos', color: '#60a5fa', img: '/rules/tokens/frozen.png'       },
  { symbol: '🔥', label: 'Degantis',     effect: '1 žala + ŽMK kiekvieną ėjimą',            color: '#f97316', img: '/rules/tokens/burning.png'      },
  { symbol: '☠',  label: 'Apnuodytas',   effect: '1 žala + ŽMK, puola nepalankiai',          color: '#a3e635', img: '/rules/tokens/poisoned.png'     },
  { symbol: '✦',  label: 'Apsvaigintas', effect: 'Negali atakuoti (daro atgalinę žalą)',     color: '#c084fc', img: '/rules/tokens/stunned.png'      },
  { symbol: '🔇', label: 'Nutildytas',   effect: 'Gebėjimai neveikia',                       color: '#94a3b8', img: '/rules/tokens/silenced.png'     },
  { symbol: '🕊',  label: 'Palaiminimas', effect: 'Traukia 2 ŽMK, renkasi geresnį',          color: '#f0b429', img: '/rules/tokens/blessing.png'     },
]

const KEYWORD_TOKENS = [
  { symbol: '▶',  label: 'Sprintas',      effect: 'Puola iškvietimo ėjimą',          color: '#fbbf24', img: '/rules/tokens/sprint.png'       },
  { symbol: '⊙',  label: 'Pasišaipymas',  effect: 'Privalo būti taikinys',            color: '#f87171', img: '/rules/tokens/taunt.png'        },
  { symbol: '✦★', label: 'Mag. skydas',   effect: 'Anuliuoja kitą gaunamą žalą',     color: '#818cf8', img: '/rules/tokens/magic-shield.png' },
  { symbol: '◑',  label: 'Sėlinimas',     effect: 'Negali būti konkretus taikinys',  color: '#34d399', img: '/rules/tokens/stealth.png'      },
]

// Žalos sekimo žetonai — 12 atskirų (6 teigiamų + 6 neigiamų)
const DAMAGE_TOKENS = [
  { value: '-6', img: '/rules/tokens/mod6.png', positive: false },
  { value: '-5', img: '/rules/tokens/mod5.png', positive: false },
  { value: '-4', img: '/rules/tokens/mod4.png', positive: false },
  { value: '-3', img: '/rules/tokens/mod3.png', positive: false },
  { value: '-2', img: '/rules/tokens/mod2.png', positive: false },
  { value: '-1', img: '/rules/tokens/mod1.png', positive: false },
  { value: '+1', img: '/rules/tokens/mod1.png', positive: true  },
  { value: '+2', img: '/rules/tokens/mod2.png', positive: true  },
  { value: '+3', img: '/rules/tokens/mod3.png', positive: true  },
  { value: '+4', img: '/rules/tokens/mod4.png', positive: true  },
  { value: '+5', img: '/rules/tokens/mod5.png', positive: true  },
  { value: '+6', img: '/rules/tokens/mod6.png', positive: true  },
]

function TokenBubble({ symbol, label, effect, color, img }: { symbol: string; label: string; effect: string; color: string; img: string }) {
  return (
    <div className="flex flex-col items-center gap-1.5 text-center">
      <div className="w-14 h-14 rounded-full overflow-hidden relative flex items-center justify-center"
        style={{ background: `${color}15`, border: `2px solid ${color}40`, boxShadow: `0 0 10px ${color}20` }}>
        <Image src={img} alt={label} fill className="object-cover rounded-full"
          onError={(e) => {
            const el = e.currentTarget as HTMLImageElement
            el.style.display = 'none'
            const fb = el.parentElement?.querySelector('.tok-fallback') as HTMLElement | null
            if (fb) fb.style.display = 'flex'
          }}
        />
        <span className="tok-fallback absolute inset-0 items-center justify-center text-xl" style={{ display: 'none' }}>{symbol}</span>
      </div>
      <p className="text-xs font-semibold leading-tight" style={{ fontFamily: 'var(--rvn-font-display)', color: 'var(--text-primary)', fontSize: 10 }}>{label}</p>
      <p className="leading-tight" style={{ color: 'var(--text-muted)', fontSize: 9 }}>{effect}</p>
    </div>
  )
}

function DamageToken({ value, img, positive }: { value: string; img: string; positive: boolean }) {
  const color = positive ? '#4ade80' : '#f87171'
  const bg    = positive ? 'rgba(74,222,128,0.12)' : 'rgba(239,68,68,0.12)'
  const border = positive ? '2px solid rgba(74,222,128,0.45)' : '2px dashed rgba(239,68,68,0.45)'
  return (
    <div className="flex flex-col items-center gap-1 text-center">
      <div className="w-12 h-12 rounded-full overflow-hidden relative flex items-center justify-center"
        style={{ background: bg, border }}>
        <Image src={img} alt={`${value} žetonas`} fill className="object-cover rounded-full"
          style={{ opacity: 0.85 }}
          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
        />
        <span className="text-xs font-black relative z-10" style={{ color, fontFamily: 'var(--rvn-font-display)' }}>{value}</span>
      </div>
      <p style={{ color: 'var(--text-muted)', fontSize: 9, fontFamily: 'var(--rvn-font-display)' }}>{value}</p>
    </div>
  )
}

function TokenGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl p-4" style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-border)' }}>
      <p className="text-xs font-bold mb-4" style={{ fontFamily: 'var(--rvn-font-display)', color: 'var(--gold)', letterSpacing: '0.08em' }}>{title}</p>
      {children}
    </div>
  )
}

export function TokenGrid() {
  return (
    <div className="flex flex-col gap-3">
      <TokenGroup title="BŪSENŲ ŽETONAI">
        <div className="flex flex-wrap gap-4 justify-start">
          {STATUS_TOKENS.map((t) => <TokenBubble key={t.label} {...t} />)}
        </div>
      </TokenGroup>
      <TokenGroup title="RAKTAŽODŽIŲ ŽETONAI">
        <div className="flex flex-wrap gap-4 justify-start">
          {KEYWORD_TOKENS.map((t) => <TokenBubble key={t.label} {...t} />)}
        </div>
      </TokenGroup>
      <TokenGroup title="ŽALOS SEKIMO ŽETONAI">
        <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
          Naudojami žalos kiekiui ir reakcijų kainai sekti. Kiekviena pusė rodo skirtingą reikšmę.
        </p>
        <div className="flex flex-wrap gap-2 justify-start">
          {DAMAGE_TOKENS.map((t) => <DamageToken key={t.value} {...t} />)}
        </div>
      </TokenGroup>
    </div>
  )
}
