'use client'

import { useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Trash2, Pencil, X, Eye } from 'lucide-react'
import { CardLightbox } from '@/components/rules/CardLightbox'
import { DeleteCardButton } from '@/components/admin/DeleteCardButton'
import { bulkUpdateCards, bulkDeleteCards, type BulkChanges } from '@/app/admin/cards/actions'
import { playUiClick, playSuccess } from '@/lib/ui-sound'

const STATUS_COLORS: Record<string, string> = {
  active:  '#22c55e',
  hidden:  '#f59e0b',
  draft:   '#6b7280',
  banned:  '#ef4444',
}

export type AdminCardRow = {
  id: string
  card_number: string | null
  name: string
  gold_cost: number | null
  attack: number | null
  health: number | null
  status: string
  is_champion: boolean
  image_url: string | null
  faction: { name: string; color_hex: string } | null
  card_type: { name: string } | null
  rarity: { name: string; color_hex: string } | null
}

type Option = { id: number; name: string }

const selectStyle = {
  background: 'var(--bg-elevated)',
  border: '1px solid var(--bg-border)',
  color: 'var(--text-secondary)',
  outline: 'none',
} as const

export function AdminCardsTable({
  rows, factions, cardTypes, rarities,
}: {
  rows: AdminCardRow[]
  factions: Option[]
  cardTypes: Option[]
  rarities: Option[]
}) {
  const router = useRouter()
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkStatus, setBulkStatus] = useState('')
  const [bulkFaction, setBulkFaction] = useState('')
  const [bulkType, setBulkType] = useState('')
  const [bulkRarity, setBulkRarity] = useState('')
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [message, setMessage] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)
  const [preview, setPreview] = useState<{ src: string; name: string } | null>(null)
  const [isPending, startTransition] = useTransition()

  const allSelected = rows.length > 0 && selected.size === rows.length
  const hasChanges = !!(bulkStatus || bulkFaction || bulkType || bulkRarity)

  const selectedIds = useMemo(() => Array.from(selected), [selected])

  function toggleAll() {
    playUiClick()
    setSelected(allSelected ? new Set() : new Set(rows.map(r => r.id)))
  }

  function toggleOne(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function clearSelection() {
    setSelected(new Set())
    setConfirmingDelete(false)
    setBulkStatus(''); setBulkFaction(''); setBulkType(''); setBulkRarity('')
  }

  function handleBulkUpdate() {
    if (!hasChanges || selected.size === 0) return
    const changes: BulkChanges = {}
    if (bulkStatus) changes.status = bulkStatus
    if (bulkFaction) changes.faction_id = Number(bulkFaction)
    if (bulkType) changes.card_type_id = Number(bulkType)
    if (bulkRarity) changes.rarity_id = Number(bulkRarity)

    startTransition(async () => {
      const res = await bulkUpdateCards(selectedIds, changes)
      if (res.error) {
        setMessage({ kind: 'err', text: res.error })
      } else {
        playSuccess()
        setMessage({ kind: 'ok', text: `Atnaujinta kortų: ${res.updated}` })
        clearSelection()
        router.refresh()
      }
    })
  }

  function handleBulkDelete() {
    if (selected.size === 0) return
    startTransition(async () => {
      const res = await bulkDeleteCards(selectedIds)
      if (res.error) {
        setMessage({ kind: 'err', text: res.error })
        setConfirmingDelete(false)
      } else {
        playSuccess()
        setMessage({ kind: 'ok', text: `Ištrinta kortų: ${res.deleted}` })
        clearSelection()
        router.refresh()
      }
    })
  }

  return (
    <>
      {message && (
        <div className="mb-3 px-3 py-2 rounded-lg text-sm flex items-center gap-2"
          style={message.kind === 'ok'
            ? { background: '#22c55e20', color: '#22c55e' }
            : { background: '#ef444420', color: '#ef4444' }}>
          <span className="flex-1">{message.text}</span>
          <button onClick={() => setMessage(null)} className="hover:opacity-70" aria-label="Uždaryti">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Bulk veiksmu juosta */}
      {selected.size > 0 && (
        <div className="sticky top-14 z-10 mb-3 px-3 py-2 rounded-xl flex flex-wrap items-center gap-2"
          style={{ background: 'var(--bg-surface)', border: '1px solid var(--gold)', boxShadow: '0 4px 16px rgba(0,0,0,0.4)' }}>
          <span className="text-xs font-semibold px-2 py-1 rounded"
            style={{ background: 'var(--gold)', color: '#0a0a0f' }}>
            {selected.size} pažymėta
          </span>

          <select value={bulkStatus} onChange={e => setBulkStatus(e.target.value)}
            className="px-2 py-1 rounded-lg text-xs" style={selectStyle}>
            <option value="">Statusas: nekeisti</option>
            <option value="active">→ Active</option>
            <option value="hidden">→ Hidden</option>
            <option value="draft">→ Draft</option>
            <option value="banned">→ Banned</option>
          </select>

          <select value={bulkFaction} onChange={e => setBulkFaction(e.target.value)}
            className="px-2 py-1 rounded-lg text-xs" style={selectStyle}>
            <option value="">Frakcija: nekeisti</option>
            {factions.map(f => <option key={f.id} value={f.id}>→ {f.name}</option>)}
          </select>

          <select value={bulkType} onChange={e => setBulkType(e.target.value)}
            className="px-2 py-1 rounded-lg text-xs" style={selectStyle}>
            <option value="">Tipas: nekeisti</option>
            {cardTypes.map(t => <option key={t.id} value={t.id}>→ {t.name}</option>)}
          </select>

          <select value={bulkRarity} onChange={e => setBulkRarity(e.target.value)}
            className="px-2 py-1 rounded-lg text-xs" style={selectStyle}>
            <option value="">Retumas: nekeisti</option>
            {rarities.map(r => <option key={r.id} value={r.id}>→ {r.name}</option>)}
          </select>

          <button onClick={handleBulkUpdate} disabled={!hasChanges || isPending}
            className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg font-semibold transition-opacity hover:opacity-90 disabled:opacity-40"
            style={{ background: 'var(--gold)', color: '#0a0a0f' }}>
            <Pencil className="w-3 h-3" />
            {isPending ? 'Vykdoma...' : 'Pritaikyti'}
          </button>

          <div className="flex-1" />

          {!confirmingDelete ? (
            <button onClick={() => { playUiClick(); setConfirmingDelete(true) }} disabled={isPending}
              className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg transition-opacity hover:opacity-80"
              style={{ background: '#ef444420', color: '#ef4444', border: '1px solid #ef444430' }}>
              <Trash2 className="w-3 h-3" />
              Ištrinti ({selected.size})
            </button>
          ) : (
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold" style={{ color: '#ef4444' }}>
                Ištrinti {selected.size} kortas negrįžtamai?
              </span>
              <button onClick={handleBulkDelete} disabled={isPending}
                className="text-xs px-2.5 py-1 rounded font-semibold"
                style={{ background: '#ef4444', color: '#fff' }}>
                {isPending ? '...' : 'Taip, ištrinti'}
              </button>
              <button onClick={() => setConfirmingDelete(false)} disabled={isPending}
                className="text-xs px-2.5 py-1 rounded"
                style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)', border: '1px solid var(--bg-border)' }}>
                Ne
              </button>
            </div>
          )}

          <button onClick={clearSelection} className="text-xs px-2 py-1 rounded hover:opacity-70"
            style={{ color: 'var(--text-muted)' }} aria-label="Nuimti žymėjimą">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Lentele */}
      <div className="rounded-xl overflow-x-auto" style={{ border: '1px solid var(--bg-border)' }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--bg-border)' }}>
              <th className="px-3 py-2 w-8">
                <input type="checkbox" checked={allSelected} onChange={toggleAll}
                  className="cursor-pointer accent-yellow-500"
                  aria-label="Pažymėti visas" />
              </th>
              {['Nr.', 'Pavadinimas', 'Frakcija', 'Tipas', 'Retumas', 'Auksas', 'ATK', 'HP', 'Statusas', '', '', ''].map((h, hi) => (
                <th key={h + hi} className="text-left px-3 py-2 text-xs font-semibold"
                  style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((card, i) => (
              <tr key={card.id}
                style={{
                  background: selected.has(card.id)
                    ? 'rgba(212,175,55,0.08)'
                    : i % 2 === 0 ? 'var(--bg-base)' : 'var(--bg-surface)',
                  borderBottom: '1px solid var(--bg-border)',
                }}>
                <td className="px-3 py-2">
                  <input type="checkbox" checked={selected.has(card.id)} onChange={() => toggleOne(card.id)}
                    className="cursor-pointer accent-yellow-500"
                    aria-label={`Pažymėti ${card.name}`} />
                </td>
                <td className="px-3 py-2 text-xs" style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                  {card.card_number ?? '—'}
                </td>
                <td className="px-3 py-2 font-medium" style={{ color: 'var(--text-primary)', maxWidth: '180px' }}>
                  <span className="truncate block">
                    {card.is_champion && <span className="text-yellow-400 mr-1">★</span>}
                    {card.name}
                  </span>
                </td>
                <td className="px-3 py-2 text-xs">
                  {card.faction
                    ? <span className="px-1.5 py-0.5 rounded" style={{ background: card.faction.color_hex + '20', color: card.faction.color_hex }}>{card.faction.name}</span>
                    : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                </td>
                <td className="px-3 py-2 text-xs" style={{ color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                  {card.card_type?.name ?? '—'}
                </td>
                <td className="px-3 py-2 text-xs">
                  {card.rarity
                    ? <span style={{ color: card.rarity.color_hex }}>{card.rarity.name}</span>
                    : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                </td>
                <td className="px-3 py-2 text-xs text-center" style={{ color: 'var(--gold)' }}>
                  {card.gold_cost ?? '—'}
                </td>
                <td className="px-3 py-2 text-xs text-center" style={{ color: '#ef4444' }}>
                  {card.attack ?? '—'}
                </td>
                <td className="px-3 py-2 text-xs text-center" style={{ color: '#22c55e' }}>
                  {card.health ?? '—'}
                </td>
                <td className="px-3 py-2 text-xs">
                  <span className="px-2 py-0.5 rounded font-medium"
                    style={{ background: (STATUS_COLORS[card.status] ?? '#6b7280') + '20', color: STATUS_COLORS[card.status] ?? '#6b7280' }}>
                    {card.status}
                  </span>
                </td>
                <td className="px-3 py-2">
                  {card.image_url ? (
                    <button onClick={() => { playUiClick(); setPreview({ src: card.image_url!, name: card.name }) }} title="Peržiūrėti kortą"
                      className="p-1 rounded transition-opacity hover:opacity-70" style={{ color: 'var(--text-muted)' }} aria-label={`Peržiūrėti ${card.name}`}>
                      <Eye className="w-4 h-4" />
                    </button>
                  ) : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                </td>
                <td className="px-3 py-2">
                  <Link href={'/admin/cards/' + card.id}
                    className="text-xs px-2.5 py-1 rounded transition-opacity hover:opacity-80"
                    style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--bg-border)', whiteSpace: 'nowrap' }}>
                    Redaguoti
                  </Link>
                </td>
                <td className="px-3 py-2">
                  <DeleteCardButton cardId={card.id} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && (
          <div className="py-16 text-center" style={{ color: 'var(--text-muted)' }}>
            Kortų nerasta
          </div>
        )}
      </div>
      {preview && <CardLightbox src={preview.src} alt={preview.name} caption={preview.name} onClose={() => setPreview(null)} />}
    </>
  )
}
