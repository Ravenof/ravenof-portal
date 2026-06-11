'use client'

// ── RelationPicker — patogus ryšių (įvykiai↔veikėjai↔kortos...) parinkimas ────
// Pakeičia CSV tekstinius laukus: paieška + checkbox sąrašas + pasirinktų chips.
// Suderinamas su esamais server actions: rašo CSV į hidden input'ą tuo pačiu name.

import { useMemo, useState } from 'react'
import { ChevronDown, ChevronUp, X } from 'lucide-react'

type Option = { value: string; label: string; hint?: string }

type Props = {
  name: string
  label: string
  options: Option[]
  defaultValue?: string[]
  placeholder?: string
}

export function RelationPicker({ name, label, options, defaultValue = [], placeholder = 'Ieškoti...' }: Props) {
  const [selected, setSelected] = useState<string[]>(defaultValue)
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return options
    return options.filter((o) =>
      o.label.toLowerCase().includes(q) || o.value.toLowerCase().includes(q) || o.hint?.toLowerCase().includes(q)
    )
  }, [options, search])

  const optByValue = useMemo(() => {
    const m: Record<string, Option> = {}
    for (const o of options) m[o.value] = o
    return m
  }, [options])

  function toggle(v: string) {
    setSelected((prev) => prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v])
  }

  return (
    <div>
      <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>{label}</label>
      <input type="hidden" name={name} value={selected.join(', ')} />

      {/* Pasirinkti chips */}
      <div
        onClick={() => setOpen((o) => !o)}
        className="w-full px-2.5 py-2 rounded-lg text-sm flex items-center gap-1.5 flex-wrap cursor-pointer min-h-[38px]"
        style={{ background: 'var(--bg-base)', border: '1px solid var(--bg-border)' }}
      >
        {selected.length === 0 && (
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>— nepasirinkta —</span>
        )}
        {selected.map((v) => (
          <span key={v}
            className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full"
            style={{ background: 'rgba(240,180,41,0.1)', border: '1px solid rgba(240,180,41,0.3)', color: 'var(--gold)' }}>
            {optByValue[v]?.label ?? v}
            <button type="button"
              onClick={(e) => { e.stopPropagation(); toggle(v) }}
              className="hover:opacity-70" aria-label={'Pašalinti ' + (optByValue[v]?.label ?? v)}>
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
        <span className="ml-auto" style={{ color: 'var(--text-muted)' }}>
          {open ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </span>
      </div>

      {/* Išskleidžiamas sąrašas */}
      {open && (
        <div className="mt-1 rounded-lg overflow-hidden" style={{ background: 'var(--bg-base)', border: '1px solid var(--bg-border)' }}>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={placeholder}
            className="w-full px-3 py-2 text-sm outline-none"
            style={{ background: 'var(--bg-surface)', color: 'var(--text-primary)', borderBottom: '1px solid var(--bg-border)' }}
          />
          <div className="max-h-44 overflow-y-auto">
            {filtered.length === 0 && (
              <p className="px-3 py-2 text-xs" style={{ color: 'var(--text-muted)' }}>Nieko nerasta</p>
            )}
            {filtered.map((o) => {
              const isSel = selected.includes(o.value)
              return (
                <button type="button" key={o.value}
                  onClick={() => toggle(o.value)}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-left text-xs transition-colors hover:bg-white/5">
                  <span className="w-3.5 h-3.5 rounded flex items-center justify-center shrink-0 text-[9px]"
                    style={{
                      background: isSel ? 'var(--gold)' : 'transparent',
                      border: '1px solid ' + (isSel ? 'var(--gold)' : 'var(--bg-border)'),
                      color: '#0a0a0f',
                    }}>
                    {isSel ? '✓' : ''}
                  </span>
                  <span style={{ color: isSel ? 'var(--gold)' : 'var(--text-secondary)' }}>{o.label}</span>
                  {o.hint && <span className="ml-auto font-mono" style={{ color: 'var(--text-muted)', fontSize: '10px' }}>{o.hint}</span>}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
