const STATUS_TOKENS = [
  { symbol: '❄', label: 'Sušaldytas',   effect: 'Negali atakuoti 1 ėjimą',         color: '#60a5fa', img: '/rules/tokens/frozen.png'   },
  { symbol: '🔥', label: 'Degantis',     effect: 'Žala kiekvieną ėjimą',             color: '#f97316', img: '/rules/tokens/burning.png'  },
  { symbol: '☠',  label: 'Apnuodytas',   effect: 'Žala kiekvieną ėjimą',             color: '#a3e635', img: '/rules/tokens/poisoned.png' },
  { symbol: '✦',  label: 'Apsvaigintas', effect: 'Negali atakuoti 1 ėjimą',         color: '#c084fc', img: '/rules/tokens/stunned.png'  },
  { symbol: '🔇', label: 'Nutildytas',   effect: 'Gebėjimai neveikia',               color: '#94a3b8', img: '/rules/tokens/silenced.png' },
]

const KEYWORD_TOKENS = [
  { symbol: '▶',  label: 'Sprintas',      effect: 'Puola iškvietimo ėjimą',          color: '#fbbf24', img: '/rules/tokens/sprint.png'        },
  { symbol: '⊙',  label: 'Pasišaipymas',  effect: 'Privalo būti pasirinktas taikinys',color: '#f87171', img: '/rules/tokens/taunt.png'         },
  { symbol: '✦★', label: 'Mag. skydas',   effect: 'Pirmą žalą blokuoja',             color: '#818cf8', img: '/rules/tokens/magic-shield.png'  },
  { symbol: '◑',  label: 'Sėlinimas',     effect: 'Negali būti konkretus taikinys',  color: '#34d399', img: '/rules/tokens/stealth.png'       },
  { symbol: '🕊',  label: 'Palaiminimas',  effect: 'Traukia 2 ŽMK, renkasi geresnį', color: '#f0b429', img: '/rules/tokens/blessing.png'      },
]

// Buff/debuff žetonai — dvipusiai: teigiamas/neigiamas
const BUFF_TOKENS = [
  { plus: '+1', minus: '−1', color: '#94a3b8', img: '/rules/tokens/mod1.png' },
  { plus: '+2', minus: '−2', color: '#94a3b8', img: '/rules/tokens/mod2.png' },
  { plus: '+3', minus: '−3', color: '#94a3b8', img: '/rules/tokens/mod3.png' },
  { plus: '+4', minus: '−4', color: '#94a3b8', img: '/rules/tokens/mod4.png' },
  { plus: '+5', minus: '−5', color: '#94a3b8', img: '/rules/tokens/mod5.png' },
  { plus: '+6', minus: '−6', color: '#94a3b8', img: '/rules/tokens/mod6.png' },
]

function TokenBubble({
  symbol, label, effect, color,
}: {
  symbol: string; label: string; effect: string; color: string
}) {
  return (
    <div className="flex flex-col items-center gap-1.5 text-center">
      <div
        className="w-12 h-12 rounded-full flex items-center justify-center text-xl"
        style={{ background: `${color}15`, border: `2px solid ${color}40`, boxShadow: `0 0 10px ${color}20` }}
      >
        {symbol}
      </div>
      <p className="text-xs font-semibold leading-tight" style={{ fontFamily: 'var(--rvn-font-display)', color: 'var(--text-primary)', fontSize: 10 }}>
        {label}
      </p>
      <p className="leading-tight" style={{ color: 'var(--text-muted)', fontSize: 9 }}>
        {effect}
      </p>
    </div>
  )
}

function DualToken({ plus, minus, color }: { plus: string; minus: string; color: string }) {
  return (
    <div className="flex flex-col items-center gap-1">
      {/* Double-sided token visual */}
      <div className="relative w-12 h-12">
        {/* Back face (minus, slightly offset) */}
        <div
          className="absolute top-1 left-1 w-11 h-11 rounded-full flex items-center justify-center text-xs font-black"
          style={{ background: 'rgba(239,68,68,0.12)', border: `1.5px dashed rgba(239,68,68,0.35)`, color: '#f87171', fontFamily: 'var(--rvn-font-display)' }}
        >
          {minus}
        </div>
        {/* Front face (plus) */}
        <div
          className="absolute top-0 left-0 w-11 h-11 rounded-full flex items-center justify-center text-xs font-black"
          style={{ background: 'rgba(74,222,128,0.12)', border: `1.5px solid rgba(74,222,128,0.4)`, color: '#4ade80', fontFamily: 'var(--rvn-font-display)' }}
        >
          {plus}
        </div>
      </div>
      <p style={{ color: 'var(--text-muted)', fontSize: 9, textAlign: 'center', fontFamily: 'var(--rvn-font-display)' }}>
        {plus} / {minus}
      </p>
    </div>
  )
}

function TokenGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl p-4" style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-border)' }}>
      <p className="text-xs font-bold mb-4" style={{ fontFamily: 'var(--rvn-font-display)', color: 'var(--gold)', letterSpacing: '0.08em' }}>
        {title}
      </p>
      {children}
    </div>
  )
}

import React from 'react'

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

      <TokenGroup title="BUFF / DEBUFF ŽETONAI — DVIPUSIAI">
        <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
          Kiekvienas žetonas yra dvipusis: žalia pusė = teigiamas modifikatorius (+ATK arba +HP), raudona pusė = neigiamas (−ATK arba −HP).
        </p>
        <div className="flex flex-wrap gap-3 justify-start">
          {BUFF_TOKENS.map((t) => (
            <DualToken key={t.plus} plus={t.plus} minus={t.minus} color={t.color} />
          ))}
        </div>
      </TokenGroup>
    </div>
  )
}
