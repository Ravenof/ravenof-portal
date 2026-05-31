'use client'
import React from 'react'

// SVG ikonos statusams ir raktažodžiams
function IcoFreeze()  { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="2" x2="12" y2="22"/><path d="M17 7l-5 5-5-5"/><path d="M17 17l-5-5-5 5"/><path d="M2 12h4"/><path d="M18 12h4"/><path d="M4 7l2 2"/><path d="M18 7l-2 2"/><path d="M4 17l2-2"/><path d="M18 17l-2-2"/></svg> }
function IcoFlame()   { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg> }
function IcoPoison()  { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s-8-4.5-8-11.8A8 8 0 0 1 12 2a8 8 0 0 1 8 8.2c0 7.3-8 11.8-8 11.8z"/><path d="m9 12 2 2 4-4"/></svg> }
function IcoStun()    { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg> }
function IcoSilence() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 5 6 9H2v6h4l5 4V5z"/><line x1="22" y1="9" x2="16" y2="15"/><line x1="16" y1="9" x2="22" y2="15"/></svg> }
function IcoBless()   { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"/></svg> }
function IcoSprint()  { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg> }
function IcoTaunt()   { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/></svg> }
function IcoMagicShield() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg> }
function IcoStealth() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" y1="2" x2="22" y2="22"/></svg> }

const STATUS_TOKENS = [
  { Icon: IcoFreeze,  label: 'Sušaldytas',   effect: 'Negali atakuoti, nedaro atgalinės žalos', color: '#60a5fa' },
  { Icon: IcoFlame,   label: 'Degantis',      effect: '1 žala + ŽMK kiekvieną ėjimą',           color: '#f97316' },
  { Icon: IcoPoison,  label: 'Apnuodytas',    effect: '1 žala + ŽMK, puola nepalankiai',         color: '#a3e635' },
  { Icon: IcoStun,    label: 'Apsvaigintas',  effect: 'Negali atakuoti (daro atgalinę žalą)',    color: '#c084fc' },
  { Icon: IcoSilence, label: 'Nutildytas',    effect: 'Gebėjimai neveikia',                      color: '#94a3b8' },
  { Icon: IcoBless,   label: 'Palaiminimas',  effect: 'Traukia 2 ŽMK, renkasi geresnį',          color: '#f0b429' },
]

const KEYWORD_TOKENS = [
  { Icon: IcoSprint,       label: 'Sprintas',     effect: 'Puola iškvietimo ėjimą',         color: '#fbbf24' },
  { Icon: IcoTaunt,        label: 'Pasišaipymas', effect: 'Privalo būti taikinys',           color: '#f87171' },
  { Icon: IcoMagicShield,  label: 'Mag. skydas',  effect: 'Anuliuoja kitą gaunamą žalą',    color: '#818cf8' },
  { Icon: IcoStealth,      label: 'Sėlinimas',    effect: 'Negali būti konkretus taikinys', color: '#34d399' },
]

const BUFF_TOKENS = [
  { plus: '+1', minus: '-1' },
  { plus: '+2', minus: '-2' },
  { plus: '+3', minus: '-3' },
  { plus: '+4', minus: '-4' },
  { plus: '+5', minus: '-5' },
  { plus: '+6', minus: '-6' },
]

function TokenBubble({ Icon, label, effect, color }: { Icon: () => React.ReactElement; label: string; effect: string; color: string }) {
  return (
    <div className="flex flex-col items-center gap-1.5 text-center">
      <div
        className="w-14 h-14 rounded-full flex items-center justify-center"
        style={{ background: `${color}15`, border: `2px solid ${color}40`, boxShadow: `0 0 10px ${color}20`, color }}
      >
        <Icon />
      </div>
      <p className="text-xs font-semibold leading-tight" style={{ fontFamily: 'var(--rvn-font-display)', color: 'var(--text-primary)', fontSize: 10 }}>
        {label}
      </p>
      <p className="leading-tight" style={{ color: 'var(--text-muted)', fontSize: 9 }}>{effect}</p>
    </div>
  )
}

function DualToken({ plus, minus }: { plus: string; minus: string }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative w-12 h-12">
        <div className="absolute top-1 left-1 w-11 h-11 rounded-full flex items-center justify-center text-xs font-black"
          style={{ background: 'rgba(239,68,68,0.12)', border: '1.5px dashed rgba(239,68,68,0.35)', color: '#f87171', fontFamily: 'var(--rvn-font-display)' }}>
          {minus}
        </div>
        <div className="absolute top-0 left-0 w-11 h-11 rounded-full flex items-center justify-center text-xs font-black"
          style={{ background: 'rgba(74,222,128,0.12)', border: '1.5px solid rgba(74,222,128,0.4)', color: '#4ade80', fontFamily: 'var(--rvn-font-display)' }}>
          {plus}
        </div>
      </div>
      <p style={{ color: 'var(--text-muted)', fontSize: 9, textAlign: 'center', fontFamily: 'var(--rvn-font-display)' }}>{plus} / {minus}</p>
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
      <TokenGroup title="BŪSENŲ ŽETONAI (įskaitant Palaiminimą)">
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
          Kiekvienas žetonas yra dvipusis: žalia pusė = teigiamas modifikatorius, raudona = neigiamas.
        </p>
        <div className="flex flex-wrap gap-3 justify-start">
          {BUFF_TOKENS.map((t) => <DualToken key={t.plus} {...t} />)}
        </div>
      </TokenGroup>
    </div>
  )
}
