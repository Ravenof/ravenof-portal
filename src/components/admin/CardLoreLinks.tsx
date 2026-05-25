'use client'

import { useState, useTransition } from 'react'
import { setCardLoreLinks } from '@/app/admin/lore/actions'

type LoreEntity = { slug: string; name: string; checked: boolean }

type Props = {
  cardNumber: string
  locations:  LoreEntity[]
  characters: LoreEntity[]
  artifacts:  LoreEntity[]
}

function CheckGroup({
  title, icon, items, onChange,
}: {
  title: string
  icon: string
  items: LoreEntity[]
  onChange: (slug: string, checked: boolean) => void
}) {
  if (items.length === 0) return null
  const checked = items.filter((i) => i.checked).length
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <span style={{ fontSize: 13 }}>{icon}</span>
        <span className="text-xs font-semibold uppercase tracking-widest"
          style={{ fontFamily: 'var(--rvn-font-display)', color: 'var(--gold)', letterSpacing: '0.1em' }}>
          {title}
        </span>
        {checked > 0 && (
          <span className="text-xs px-1.5 py-0.5 rounded-full font-mono"
            style={{ background: 'rgba(212,175,55,0.12)', color: 'var(--gold)', border: '1px solid rgba(212,175,55,0.2)' }}>
            {checked}
          </span>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
        {items.map((item) => (
          <label
            key={item.slug}
            className="flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-all"
            style={{
              background: item.checked ? 'rgba(212,175,55,0.08)' : 'var(--bg-elevated)',
              border: `1px solid ${item.checked ? 'rgba(212,175,55,0.3)' : 'var(--bg-border)'}`,
            }}
          >
            <input
              type="checkbox"
              checked={item.checked}
              onChange={(e) => onChange(item.slug, e.target.checked)}
              className="accent-[#d4af37]"
            />
            <span className="text-xs truncate" style={{ color: item.checked ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
              {item.name}
            </span>
            <span className="text-xs font-mono ml-auto shrink-0" style={{ color: 'var(--text-muted)', fontSize: '9px' }}>
              {item.slug}
            </span>
          </label>
        ))}
      </div>
    </div>
  )
}

export function CardLoreLinks({ cardNumber, locations: initLocs, characters: initChars, artifacts: initArts }: Props) {
  const [locs,    setLocs]    = useState(initLocs)
  const [chars,   setChars]   = useState(initChars)
  const [arts,    setArts]    = useState(initArts)
  const [saved,   setSaved]   = useState(false)
  const [err,     setErr]     = useState('')
  const [pending, start]      = useTransition()

  function toggle(list: LoreEntity[], setList: typeof setLocs, slug: string, checked: boolean) {
    setList(list.map((i) => i.slug === slug ? { ...i, checked } : i))
    setSaved(false)
  }

  function handleSave() {
    setErr('')
    start(async () => {
      const res = await setCardLoreLinks(
        cardNumber,
        locs.filter((i) => i.checked).map((i) => i.slug),
        chars.filter((i) => i.checked).map((i) => i.slug),
        arts.filter((i) => i.checked).map((i) => i.slug),
      )
      if (res.error) setErr(res.error)
      else setSaved(true)
    })
  }

  const anyLinked = locs.some((i) => i.checked) || chars.some((i) => i.checked) || arts.some((i) => i.checked)

  return (
    <div className="rounded-xl p-5 space-y-5"
      style={{ background: 'var(--bg-elevated)', border: '1px solid rgba(212,175,55,0.15)' }}>
      <div className="flex items-center gap-2">
        <span style={{ color: 'var(--gold)', fontSize: 14 }}>🔗</span>
        <p className="text-sm font-bold" style={{ fontFamily: 'var(--rvn-font-display)', color: 'var(--gold)' }}>
          Lore ryšiai
        </p>
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
          — ši korta pasirodo šiose lore vietose
        </span>
      </div>

      {err && (
        <p className="text-xs px-3 py-2 rounded" style={{ background: '#ef444420', color: '#ef4444' }}>{err}</p>
      )}

      <CheckGroup
        title="Lokacijos" icon="📍"
        items={locs}
        onChange={(slug, checked) => toggle(locs, setLocs, slug, checked)}
      />
      <CheckGroup
        title="Veikėjai" icon="👤"
        items={chars}
        onChange={(slug, checked) => toggle(chars, setChars, slug, checked)}
      />
      <CheckGroup
        title="Artefaktai" icon="⚔️"
        items={arts}
        onChange={(slug, checked) => toggle(arts, setArts, slug, checked)}
      />

      {locs.length === 0 && chars.length === 0 && arts.length === 0 && (
        <p className="text-xs text-center py-4" style={{ color: 'var(--text-muted)' }}>
          Lore duomenų bazė tuščia — pridėk lokacijų, veikėjų ar artefaktų per Atlasas admin.
        </p>
      )}

      <div className="flex items-center gap-3 pt-1">
        <button
          type="button"
          disabled={pending}
          onClick={handleSave}
          className="px-4 py-2 rounded-lg text-sm font-semibold transition-all hover:scale-[1.02]"
          style={{
            background: saved ? 'rgba(34,197,94,0.15)' : 'var(--gold)',
            color:      saved ? '#22c55e' : '#0a0a0f',
            border:     saved ? '1px solid rgba(34,197,94,0.3)' : 'none',
          }}
        >
          {pending ? '⏳ Išsaugoma...' : saved ? '✓ Išsaugota' : 'Išsaugoti ryšius'}
        </button>
        {anyLinked && (
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {[locs, chars, arts].flat().filter((i) => i.checked).length} ryšiai aktyvūs
          </span>
        )}
      </div>
    </div>
  )
}
