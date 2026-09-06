'use client'

// ── /admin/playground — kortų testavimo poligonas ────────────────────────────
// Prieigą saugo src/app/admin/layout.tsx (role: admin / event_moderator).

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { PlaygroundSetup } from '@/components/admin/playground/PlaygroundSetup'
import { PlaygroundBattle } from '@/components/admin/playground/PlaygroundBattle'
import { loadAllCards, metaFromCards, type PgMeta } from '@/lib/playground/cards'
import { DEFAULT_PG_CONFIG, type PgCard, type PgConfig } from '@/lib/playground/deck'

export default function PlaygroundPage() {
  const [cards, setCards] = useState<PgCard[] | null>(null)
  const [meta, setMeta] = useState<PgMeta>({ factions: [], rarities: [], subtypes: [] })
  const [cfg, setCfg] = useState<PgConfig>(DEFAULT_PG_CONFIG)
  const [run, setRun] = useState(0)

  useEffect(() => {
    let alive = true
    loadAllCards().then((cs) => { if (!alive) return; setCards(cs); setMeta(metaFromCards(cs)) })
    return () => { alive = false }
  }, [])

  if (run > 0 && cards) {
    return (
      <PlaygroundBattle
        key={run}
        cards={cards}
        cfg={cfg}
        onExit={() => setRun(0)}
        onRestart={() => setRun((n) => n + 1)}
      />
    )
  }

  return (
    <div className="min-h-screen p-6" style={{ background: 'var(--bg-base)' }}>
      <div className="max-w-[1200px] mx-auto">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--gold)', fontFamily: 'var(--rvn-font-display)' }}>🧪 Poligonas</h1>
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
              Testinė kova: pats pasirenki, kokias kortas trauksi, ir statai manekenus. Atlygis neskaičiuojamas.
            </p>
          </div>
          <Link href="/admin" className="text-xs px-3 py-1.5 rounded-lg" style={{ color: 'var(--text-muted)', border: '1px solid var(--bg-border)' }}>← Apžvalga</Link>
        </div>

        {cards === null
          ? <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Kraunamos kortos…</p>
          : cards.length === 0
            ? <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Aktyvių kortų nerasta.</p>
            : <PlaygroundSetup cards={cards} meta={meta} cfg={cfg} onChange={setCfg} onStart={() => setRun((n) => n + 1)} />}
      </div>
    </div>
  )
}
