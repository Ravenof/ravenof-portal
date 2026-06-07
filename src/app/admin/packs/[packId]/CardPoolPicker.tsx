'use client'

import { useState, useTransition, useMemo } from 'react'

export type CardOption = {
  id: string
  card_number: string | null
  name: string
  rarity_name: string | null
  rarity_color: string | null
  faction_name: string | null
}

type Props = {
  cards: CardOption[]
  poolCardIds: string[]
  addCardsAction: (formData: FormData) => Promise<void>
}

export function CardPoolPicker({ cards, poolCardIds, addCardsAction }: Props) {
  const poolSet = useMemo(() => new Set(poolCardIds), [poolCardIds])
  const [search, setSearch] = useState('')
  const [filterFaction, setFilterFaction] = useState('')
  const [filterRarity, setFilterRarity] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [weight, setWeight] = useState(10)
  const [pending, startTransition] = useTransition()

  const factions = useMemo(
    () => [...new Set(cards.map((c) => c.faction_name).filter(Boolean) as string[])].sort(),
    [cards]
  )
  const rarities = useMemo(
    () => [...new Set(cards.map((c) => c.rarity_name).filter(Boolean) as string[])].sort(),
    [cards]
  )

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return cards.filter((c) => {
      if (q && !c.name.toLowerCase().includes(q) && !(c.card_number ?? '').includes(q)) return false
      if (filterFaction && c.faction_name !== filterFaction) return false
      if (filterRarity && c.rarity_name !== filterRarity) return false
      return true
    })
  }, [cards, search, filterFaction, filterRarity])

  const toggleCard = (id: string, inPool: boolean) => {
    if (inPool) return
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const selectAllFiltered = () => {
    setSelected((prev) => {
      const next = new Set(prev)
      filtered.filter((c) => !poolSet.has(c.id)).forEach((c) => next.add(c.id))
      return next
    })
  }

  const clearSelection = () => setSelected(new Set())

  const handleAdd = () => {
    if (selected.size === 0 || pending) return
    const fd = new FormData()
    fd.set('card_ids', [...selected].join('\n'))
    fd.set('default_weight', String(weight))
    startTransition(async () => {
      await addCardsAction(fd)
      setSelected(new Set())
    })
  }

  return (
    <div className="space-y-3">
      {/* Filters row */}
      <div className="flex flex-wrap gap-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Ieškoti pagal pavadinimą arba #..."
          className="px-3 py-1.5 rounded-lg text-sm flex-1 min-w-40"
          style={{ background: 'var(--bg-base)', border: '1px solid var(--bg-border)', color: 'var(--text-primary)' }}
        />
        <select
          value={filterFaction}
          onChange={(e) => setFilterFaction(e.target.value)}
          className="px-3 py-1.5 rounded-lg text-sm"
          style={{ background: 'var(--bg-base)', border: '1px solid var(--bg-border)', color: 'var(--text-primary)' }}
        >
          <option value="">Visos frakcijos</option>
          {factions.map((f) => <option key={f} value={f}>{f}</option>)}
        </select>
        <select
          value={filterRarity}
          onChange={(e) => setFilterRarity(e.target.value)}
          className="px-3 py-1.5 rounded-lg text-sm"
          style={{ background: 'var(--bg-base)', border: '1px solid var(--bg-border)', color: 'var(--text-primary)' }}
        >
          <option value="">Visi retenybė</option>
          {rarities.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
      </div>

      {/* Action bar */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={selectAllFiltered}
            className="text-xs px-2.5 py-1 rounded transition-opacity hover:opacity-80"
            style={{ background: 'rgba(240,180,41,0.1)', color: 'var(--gold)', border: '1px solid rgba(240,180,41,0.3)' }}
          >
            Pasirinkti visas
          </button>
          {selected.size > 0 && (
            <button
              type="button"
              onClick={clearSelection}
              className="text-xs px-2.5 py-1 rounded transition-opacity hover:opacity-80"
              style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)' }}
            >
              Išvalyti ({selected.size})
            </button>
          )}
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {filtered.length} rodoma • {selected.size} pasirinkta
          </span>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs" style={{ color: 'var(--text-muted)' }}>Svoris:</label>
          <input
            type="number"
            min={1}
            value={weight}
            onChange={(e) => setWeight(parseInt(e.target.value) || 10)}
            className="w-16 px-2 py-1 rounded text-sm"
            style={{ background: 'var(--bg-base)', border: '1px solid var(--bg-border)', color: 'var(--text-primary)' }}
          />
          <button
            type="button"
            onClick={handleAdd}
            disabled={selected.size === 0 || pending}
            className="px-4 py-1.5 rounded-lg text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-40"
            style={{ background: 'var(--gold)', color: '#0a0a0f' }}
          >
            {pending ? '...'  : `Pridėti (${selected.size})`}
          </button>
        </div>
      </div>

      {/* Scrollable card list */}
      <div
        className="rounded-xl overflow-hidden"
        style={{ border: '1px solid var(--bg-border)', maxHeight: '500px', overflowY: 'auto' }}
      >
        <table className="w-full text-sm">
          <thead
            className="sticky top-0"
            style={{ background: 'var(--bg-elevated)', zIndex: 1, boxShadow: '0 1px 0 var(--bg-border)' }}
          >
            <tr>
              <th className="w-8 px-3 py-2" />
              <th className="text-left px-3 py-2 text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>Korta</th>
              <th className="text-left px-3 py-2 text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>Retenybė</th>
              <th className="text-left px-3 py-2 text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>Frakcija</th>
              <th className="w-24 px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {filtered.map((c, i) => {
              const inPool = poolSet.has(c.id)
              const isSelected = selected.has(c.id)
              return (
                <tr
                  key={c.id}
                  onClick={() => toggleCard(c.id, inPool)}
                  style={{
                    background: isSelected
                      ? 'rgba(240,180,41,0.08)'
                      : i % 2 === 0 ? 'var(--bg-base)' : 'var(--bg-surface)',
                    borderBottom: '1px solid var(--bg-border)',
                    cursor: inPool ? 'default' : 'pointer',
                    borderLeft: isSelected ? '3px solid var(--gold)' : '3px solid transparent',
                    opacity: inPool ? 0.55 : 1,
                    transition: 'background 0.1s',
                  }}
                >
                  <td className="px-3 py-2 text-center">
                    {!inPool && (
                      <input
                        type="checkbox"
                        readOnly
                        checked={isSelected}
                        style={{ accentColor: 'var(--gold)', pointerEvents: 'none' }}
                      />
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{c.name}</span>
                    {c.card_number && (
                      <span className="ml-2 text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
                        #{c.card_number}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {c.rarity_name && c.rarity_color && (
                      <span
                        className="text-xs px-1.5 py-0.5 rounded font-medium"
                        style={{
                          background: c.rarity_color + '25',
                          color: c.rarity_color,
                          border: `1px solid ${c.rarity_color}55`,
                        }}
                      >
                        {c.rarity_name}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                    {c.faction_name ?? '\u2014'}
                  </td>
                  <td className="px-3 py-2">
                    {inPool && (
                      <span
                        className="text-xs px-1.5 py-0.5 rounded"
                        style={{ background: 'rgba(52,211,153,0.15)', color: '#34d399', border: '1px solid rgba(52,211,153,0.3)' }}
                      >
                        ✓ Baseinas
                      </span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="py-10 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
            Kartų nerasta
          </div>
        )}
      </div>
    </div>
  )
}
