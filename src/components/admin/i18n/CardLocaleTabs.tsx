'use client'

// ── LT | EN tabai kortos redaktoriuje ───────────────────────────────────────
// LT skiltis = esamas CardForm (pagrindinė info, gameplay, LT art + LT balsai).
// EN skiltis = tie patys laukai angliškai + EN art/balsų upload'ai.

import { useState, type ReactNode } from 'react'

export function CardLocaleTabs({ lt, en, enState }: {
  lt: ReactNode
  en: ReactNode
  /** Trumpa EN būsena tab'e: 'missing' | 'partial' | 'approved' | 'draft' | 'review' */
  enState?: 'missing' | 'partial' | 'approved' | 'draft' | 'review'
}) {
  const [tab, setTab] = useState<'lt' | 'en'>('lt')
  const badge = {
    missing: { text: 'trūksta', color: '#f87171' },
    partial: { text: 'dalinis', color: '#f0b429' },
    draft: { text: 'draft', color: '#f0b429' },
    review: { text: 'review', color: '#60a5fa' },
    approved: { text: 'OK', color: '#4ade80' },
  }[enState ?? 'missing']

  const tabStyle = (active: boolean): React.CSSProperties => ({
    padding: '8px 18px', borderRadius: 10, fontSize: 13, fontWeight: 700,
    background: active ? 'rgba(240,180,41,0.14)' : 'transparent',
    border: '1px solid ' + (active ? 'rgba(240,180,41,0.55)' : 'var(--bg-border)'),
    color: active ? 'var(--gold)' : 'var(--text-muted)',
    fontFamily: 'var(--rvn-font-display)',
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => setTab('lt')} style={tabStyle(tab === 'lt')}>🇱🇹 LT</button>
        <button type="button" onClick={() => setTab('en')} style={tabStyle(tab === 'en')}>
          🇬🇧 EN
          <span className="ml-2 px-1.5 py-0.5 rounded-full text-[10px] font-bold"
            style={{ background: badge.color + '22', color: badge.color }}>
            {badge.text}
          </span>
        </button>
      </div>

      {/* LT visada sumontuotas (formos būsena neprarandama perjungiant tab'us) */}
      <div hidden={tab !== 'lt'}>{lt}</div>
      <div hidden={tab !== 'en'}>{en}</div>
    </div>
  )
}
