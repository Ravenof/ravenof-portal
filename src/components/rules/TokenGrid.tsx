'use client'

import Image from 'next/image'
import React from 'react'

// Būsenų žetonai (įskaitant Palaiminimą)
const STATUS_TOKENS = [
  { symbol: '❄', label: 'Sušaldytas',   effect: 'Negali atakuoti 1 ėjimą',          color: '#60a5fa', img: '/rules/tokens/frozen.png'       },
  { symbol: '🔥', label: 'Degantis',     effect: 'Žala kiekvieną ėjimą',              color: '#f97316', img: '/rules/tokens/burning.png'      },
  { symbol: '☠',  label: 'Apnuodytas',   effect: 'Žala kiekvieną ėjimą',              color: '#a3e635', img: '/rules/tokens/poisoned.png'     },
  { symbol: '✦',  label: 'Apsvaigintas', effect: 'Negali atakuoti 1 ėjimą',          color: '#c084fc', img: '/rules/tokens/stunned.png'      },
  { symbol: '🔇', label: 'Nutildytas',   effect: 'Gebėjimai neveikia',                color: '#94a3b8', img: '/rules/tokens/silenced.png'     },
  { symbol: '🕊',  label: 'Palaiminimas', effect: 'Traukia 2 ŽMK, renkasi geresnį',  color: '#f0b429', img: '/rules/tokens/blessing.png'     },
]

const KEYWORD_TOKENS = [
  { symbol: '▶',  label: 'Sprintas',      effect: 'Puola iškvietimo ėjimą',            color: '#fbbf24', img: '/rules/tokens/sprint.png'       },
  { symbol: '⊙',  label: 'Pasišaipymas',  effect: 'Privalo būti taikinys',             color: '#f87171', img: '/rules/tokens/taunt.png'        },
  { symbol: '✦★', label: 'Mag. skydas',   effect: 'Pirmą žalą blokuoja',              color: '#818cf8', img: '/rules/tokens/magic-shield.png' },
  { symbol: '◑',  label: 'Sėlinimas',     effect: 'Negali būti konkretus taikinys',   color: '#34d399', img: '/rules/tokens/stealth.png'      },
]

// Buff/debuff žetonai su images
const BUFF_TOKENS = [
  { plus: '+1', minus: '-1', img: '/rules/tokens/mod1.png' },
  { plus: '+2', minus: '-2', img: '/rules/tokens/mod2.png' },
  { plus: '+3', minus: '-3', img: '/rules/tokens/mod3.png' },
  { plus: '+4', minus: '-4', img: '/rules/tokens/mod4.png' },
  { plus: '+5', minus: '-5', img: '/rules/tokens/mod5.png' },
  { plus: '+6', minus: '-6', img: '/rules/tokens/mod6.png' },
]

// Aukso žetonai
const GOLD_TOKENS = [
  { label: '100⚜',  value: 100,  img: '/rules/tokens/gold.png' },
  { label: '200⚜',  value: 200,  img: '/rules/tokens/gold.png' },
  { label: '300⚜',  value: 300,  img: '/rules/tokens/gold.png' },
]

function TokenBubble({ symbol, label, effect, color, img }: { symbol: string; label: string; effect: string; color: string; img: string }) {
  return (
    <div className="flex flex-col items-center gap-1.5 text-center">
      <div
        className="w-14 h-14 rounded-full overflow-hidden relative flex items-center justify-center"
        style={{ background: `${color}15`, border: `2px solid ${color}40`, boxShadow: `0 0 10px ${color}20` }}
      >
        <Image
          src={img}
          alt={label}
          fill
          className="object-cover rounded-full"
          onError={(e) => {
            const el = e.currentTarget as HTMLImageElement
            el.style.display = 'none'
            const fb = el.parentElement?.querySelector('.tok-fallback') as HTMLElement | null
            if (fb) fb.style.display = 'flex'
          }}
        />
        <span className="tok-fallback absolute inset-0 items-center justify-center text-xl" style={{ display: 'none' }}>
          {symbol}
        </span>
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

function DualToken({ plus, minus, img }: { plus: string; minus: string; img: string }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative w-14 h-14">
        {/* Back face (minus) */}
        <div className="absolute top-1 left-1 w-12 h-12 rounded-full overflow-hidden flex items-center justify-center"
          style={{ background: 'rgba(239,68,68,0.12)', border: '1.5px dashed rgba(239,68,68,0.35)' }}>
          <Image src={img} alt={`${minus} žetonas`} fill className="object-cover rounded-full opacity-60"
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }} />
          <span className="text-xs font-black relative z-10 tok-fallback" style={{ color: '#f87171', fontFamily: 'var(--rvn-font-display)' }}>{minus}</span>
        </div>
        {/* Front face (plus) */}
        <div className="absolute top-0 left-0 w-12 h-12 rounded-full overflow-hidden flex items-center justify-center"
          style={{ background: 'rgba(74,222,128,0.12)', border: '1.5px solid rgba(74,222,128,0.4)' }}>
          <Image src={img} alt={`${plus} žetonas`} fill className="object-cover rounded-full"
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }} />
          <span className="text-xs font-black relative z-10 tok-fallback" style={{ color: '#4ade80', fontFamily: 'var(--rvn-font-display)' }}>{plus}</span>
        </div>
      </div>
      <p style={{ color: 'var(--text-muted)', fontSize: 9, textAlign: 'center', fontFamily: 'var(--rvn-font-display)' }}>
        {plus} / {minus}
      </p>
    </div>
  )
}

function GoldTokenItem({ label, img }: { label: string; img: string }) {
  return (
    <div className="flex flex-col items-center gap-1.5 text-center">
      <div className="w-14 h-14 rounded-full overflow-hidden relative flex items-center justify-center"
        style={{ background: 'rgba(240,180,41,0.15)', border: '2px solid rgba(240,180,41,0.5)', boxShadow: '0 0 10px rgba(240,180,41,0.2)' }}>
        <Image src={img} alt="Aukso žetonas" fill className="object-cover rounded-full"
          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }} />
        <span className="text-sm font-black relative z-10" style={{ color: 'var(--gold)', fontFamily: 'var(--rvn-font-display)' }}>⚜</span>
      </div>
      <p className="text-xs font-semibold" style={{ fontFamily: 'var(--rvn-font-display)', color: 'var(--gold)', fontSize: 10 }}>{label}</p>
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

export function TokenGrid() {
  return (
    <div className="flex flex-col gap-3">
      <TokenGroup title="BUSENŲ ŽETONAI (įskaitant Palaiminimą)">
        <div className="flex flex-wrap gap-4 justify-start">
          {STATUS_TOKENS.map((t) => <TokenBubble key={t.label} {...t} />)}
        </div>
      </TokenGroup>

      <TokenGroup title="RAKTAŽODŽIŲ ŽETONAI">
        <div className="flex flex-wrap gap-4 justify-start">
          {KEYWORD_TOKENS.map((t) => <TokenBubble key={t.label} {...t} />)}
        </div>
      </TokenGroup>

      <TokenGroup title="BUFF / DEBUFF ŽETONAI - DVIPUSIAI">
        <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
          Kiekvienas žetonas yra dvipusis: žalia pusė = teigiamas modifikatorius (+ATK arba +HP), raudona = neigiamas.
        </p>
        <div className="flex flex-wrap gap-3 justify-start">
          {BUFF_TOKENS.map((t) => <DualToken key={t.plus} {...t} />)}
        </div>
      </TokenGroup>

      <TokenGroup title="AUKSO ŽETONAI">
        <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
          Kiekviena moneta = 100 aukso. Naudojamos aukso kiekiui sekti per ėjimą.
        </p>
        <div className="flex flex-wrap gap-3 justify-start">
          {GOLD_TOKENS.map((t) => <GoldTokenItem key={t.label} label={t.label} img={t.img} />)}
        </div>
      </TokenGroup>
    </div>
  )
}
