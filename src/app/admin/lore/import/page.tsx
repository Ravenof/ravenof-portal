'use client'

import Link from 'next/link'
import { useState, useTransition } from 'react'
import { bulkImportLore } from '../actions'

const EXAMPLE = `<lore>

  <!-- Eros (laikotarpiai) -->
  <eras>
    <era
      name="Pirmoji era"
      slug="pirmoji-era"
      description="Pasaulio pradžia ir pirmosios civilizacijos"
      timeline_index="0"
      sort_order="0"
      status="published"
    />
  </eras>

  <!-- Lokacijos (x ir y = 0–100 % ant žemėlapio) -->
  <locations>
    <location
      name="Ravenof"
      slug="ravenof"
      type="miestas"
      x="45.5"
      y="32.1"
      first_era_index="0"
      region="Šiaurė"
      short_description="Didžiausias miestas"
      description="Pilnas aprašymas čia..."
      related_card_numbers="R001,R002"
      status="published"
    />
  </locations>

  <!-- Įvykiai -->
  <events>
    <event
      title="Didžioji mūšis"
      slug="didzioji-musis"
      summary="Trumpas aprašymas"
      era_slug="pirmoji-era"
      timeline_index="1"
      location_slug="ravenof"
      event_type="battle"
      related_card_numbers="R003"
      status="published"
    />
  </events>

  <!-- Veikėjai -->
  <characters>
    <character
      name="Vardenis Pavardenis"
      slug="vardenis-pavardenis"
      role="Karvedys"
      status_value="alive"
      short_description="Trumpas aprašymas"
      related_card_numbers="R004"
      status="published"
    />
  </characters>

</lore>`

type Result = {
  inserted: { eras: number; locations: number; events: number }
  errors: string[]
}

export default function LoreImportPage() {
  const [result,  setResult]  = useState<Result | null>(null)
  const [pending, start]      = useTransition()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    start(async () => {
      const res = await bulkImportLore(fd)
      setResult(res)
    })
  }

  const total = result ? result.inserted.eras + result.inserted.locations + result.inserted.events : 0

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-base)', color: 'var(--text-primary)' }}>
      <header className="sticky top-0 z-20 border-b px-6 py-3"
        style={{ background: 'rgba(10,10,15,0.97)', borderColor: 'var(--bg-border)' }}>
        <div className="max-w-screen-xl mx-auto flex items-center gap-4">
          <Link href="/admin/lore" className="text-xs hover:opacity-70" style={{ color: 'var(--text-muted)' }}>← Atlasas</Link>
          <span style={{ color: 'var(--bg-border)' }}>|</span>
          <span className="text-sm font-bold" style={{ fontFamily: 'var(--rvn-font-display)', color: 'var(--gold)' }}>📥 XML Bulk Import</span>
        </div>
      </header>

      <div className="max-w-screen-lg mx-auto px-6 py-6 space-y-6">

        {/* Info */}
        <div className="rounded-xl p-4 space-y-2"
          style={{ background: 'var(--bg-surface)', border: '1px solid rgba(212,175,55,0.15)' }}>
          <p className="text-sm font-semibold" style={{ color: 'var(--gold)', fontFamily: 'var(--rvn-font-display)' }}>
            Kaip naudoti
          </p>
          <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            Įklijuok XML formatą su <code style={{ color: 'var(--gold)', fontFamily: 'monospace' }}>&lt;eras&gt;</code>, <code style={{ color: 'var(--gold)', fontFamily: 'monospace' }}>&lt;locations&gt;</code>, <code style={{ color: 'var(--gold)', fontFamily: 'monospace' }}>&lt;events&gt;</code> ir/arba <code style={{ color: 'var(--gold)', fontFamily: 'monospace' }}>&lt;characters&gt;</code> blokais.
            Jei <strong>slug</strong> jau egzistuoja — įrašas bus <strong>atnaujintas</strong> (upsert). Galima importuoti dalinai — pvz. tik eras arba tik locations.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
            {[
              ['type', 'miestas · griuvėsiai · miškas · tvirtovė · uostas · plyšys · slėnis'],
              ['status', 'draft · published · archived'],
              ['event_type', 'battle · treaty · discovery · founding · collapse'],
              ['status_value', 'alive · dead · unknown · legendary'],
            ].map(([k, v]) => (
              <div key={k} className="rounded p-2" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--bg-border)' }}>
                <p className="font-mono font-bold mb-0.5" style={{ color: 'var(--gold)', fontSize: '10px' }}>{k}</p>
                <p style={{ fontSize: '9px', lineHeight: 1.4 }}>{v}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Result */}
        {result && (
          <div className="rounded-xl p-4 space-y-2"
            style={{
              background: total > 0 ? 'rgba(34,197,94,0.06)' : 'rgba(239,68,68,0.06)',
              border: `1px solid ${total > 0 ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)'}`,
            }}>
            <p className="text-sm font-semibold"
              style={{ color: total > 0 ? '#22c55e' : '#ef4444', fontFamily: 'var(--rvn-font-display)' }}>
              {total > 0 ? `✓ Importuota ${total} įrašų` : '✗ Nieko neimportuota'}
            </p>
            <div className="flex flex-wrap gap-3 text-xs">
              {[
                ['Eros',      result.inserted.eras],
                ['Lokacijos + veikėjai', result.inserted.locations],
                ['Įvykiai',   result.inserted.events],
              ].map(([label, n]) => (
                <span key={String(label)} className="px-2 py-0.5 rounded font-mono"
                  style={{ background: 'rgba(34,197,94,0.1)', color: '#22c55e' }}>
                  {label}: {n}
                </span>
              ))}
            </div>
            {result.errors.length > 0 && (
              <div className="space-y-1 pt-1">
                {result.errors.map((err, i) => (
                  <p key={i} className="text-xs px-2 py-1 rounded font-mono"
                    style={{ background: 'rgba(239,68,68,0.08)', color: '#ef4444' }}>
                    ✗ {err}
                  </p>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
                XML turinys
              </label>
              <button
                type="button"
                onClick={(e) => {
                  const ta = (e.currentTarget.closest('form') as HTMLFormElement).querySelector('textarea')
                  if (ta) ta.value = EXAMPLE
                }}
                className="text-xs px-2 py-1 rounded transition-opacity hover:opacity-70"
                style={{ background: 'var(--bg-elevated)', border: '1px solid var(--bg-border)', color: 'var(--text-muted)' }}
              >
                Įklijuoti pavyzdį
              </button>
            </div>
            <textarea
              name="xml"
              rows={24}
              placeholder={EXAMPLE}
              className="w-full px-4 py-3 rounded-xl text-xs font-mono resize-y"
              style={{
                background: 'var(--bg-elevated)',
                border: '1px solid rgba(212,175,55,0.2)',
                color: 'var(--text-primary)',
                lineHeight: 1.6,
                minHeight: '320px',
              }}
            />
          </div>

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={pending}
              className="px-6 py-2.5 rounded-xl text-sm font-semibold transition-all hover:scale-[1.02]"
              style={{
                background: pending ? 'var(--bg-elevated)' : 'var(--gold)',
                color: pending ? 'var(--text-muted)' : '#0a0a0f',
                border: '1px solid rgba(212,175,55,0.3)',
              }}
            >
              {pending ? '⏳ Importuojama...' : '📥 Importuoti'}
            </button>
            {result && total > 0 && (
              <Link href="/admin/lore"
                className="text-xs px-4 py-2 rounded-xl transition-opacity hover:opacity-70"
                style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-border)', color: 'var(--text-secondary)', textDecoration: 'none' }}>
                → Grįžti į Atlasą
              </Link>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}
