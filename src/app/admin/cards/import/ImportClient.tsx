'use client'

import { useState, useRef } from 'react'
import { Upload, AlertCircle, Loader2 } from 'lucide-react'
import { importCards } from './actions'
import type { ImportRowInput, ImportResult } from './actions'

type RefItem = { id: number; name: string }

type Props = {
  factions: RefItem[]
  cardTypes: RefItem[]
  rarities: RefItem[]
}

type PreviewRow = ImportRowInput & {
  _index: number
  _errors: string[]
}

// ─── CSV parser ───────────────────────────────────────────────────────────────

function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++ }
      else inQuotes = !inQuotes
    } else if (ch === ',' && !inQuotes) {
      result.push(current); current = ''
    } else {
      current += ch
    }
  }
  result.push(current)
  return result
}

function parseCSV(text: string): Record<string, string>[] {
  const lines = text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .filter(l => l.trim())
  if (lines.length < 2) return []
  const headers = parseCSVLine(lines[0]).map(h =>
    h.trim().toLowerCase().replace(/\s+/g, '_')
  )
  return lines.slice(1).map(line => {
    const values = parseCSVLine(line)
    const row: Record<string, string> = {}
    headers.forEach((h, j) => { row[h] = (values[j] ?? '').trim() })
    return row
  })
}

// ─── Required columns ─────────────────────────────────────────────────────────

const REQUIRED_COLS = ['card_number', 'name', 'faction', 'type', 'rarity', 'gold_cost']

// ─── Status badge helper ──────────────────────────────────────────────────────

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  active:  { bg: 'rgba(34,197,94,0.15)',   color: '#22c55e' },
  hidden:  { bg: 'rgba(245,158,11,0.15)',  color: '#f59e0b' },
  draft:   { bg: 'rgba(107,114,128,0.15)', color: '#9ca3af' },
  banned:  { bg: 'rgba(239,68,68,0.15)',   color: '#ef4444' },
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ImportClient({ factions, cardTypes, rarities }: Props) {
  const [previewRows, setPreviewRows] = useState<PreviewRow[]>([])
  const [columnError, setColumnError] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [isImporting, setIsImporting] = useState(false)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const factionNames = Object.fromEntries(factions.map(f => [f.name.toLowerCase(), f.id]))
  const typeNames    = Object.fromEntries(cardTypes.map(t => [t.name.toLowerCase(), t.id]))
  const rarityNames  = Object.fromEntries(rarities.map(r => [r.name.toLowerCase(), r.id]))

  // ── Validate a parsed row on the client side ──
  function validateRow(raw: Record<string, string>, index: number): PreviewRow {
    const errors: string[] = []

    if (!raw.card_number) errors.push('Trūksta card_number')
    if (!raw.name) errors.push('Trūksta name')

    const fac = raw.faction?.toLowerCase().trim()
    if (!fac || !factionNames[fac]) errors.push(`Nežinoma frakcija: "${raw.faction ?? ''}"`)

    const typ = raw.type?.toLowerCase().trim()
    if (!typ || !typeNames[typ]) errors.push(`Nežinomas tipas: "${raw.type ?? ''}"`)

    const rar = raw.rarity?.toLowerCase().trim()
    if (!rar || !rarityNames[rar]) errors.push(`Nežinomas retumas: "${raw.rarity ?? ''}"`)

    const gold = parseInt(raw.gold_cost ?? '', 10)
    if (Number.isNaN(gold) || gold < 100 || gold > 1000) {
      errors.push(`Neteisinga gold_cost: "${raw.gold_cost ?? ''}" (100–1000)`)
    }

    const validStatuses = ['active', 'hidden', 'draft', 'banned']
    const rawStatus = raw.status?.toLowerCase().trim()
    const status = validStatuses.includes(rawStatus) ? rawStatus : 'draft'

    return {
      _index: index,
      _errors: errors,
      card_number:  raw.card_number ?? '',
      name:         raw.name ?? '',
      faction:      raw.faction ?? '',
      type:         raw.type ?? '',
      rarity:       raw.rarity ?? '',
      gold_cost:    raw.gold_cost ?? '',
      attack:       raw.attack ?? '',
      health:       raw.health ?? '',
      description:  raw.description ?? '',
      effect_text:  raw.effect_text ?? '',
      image_url:    raw.image_url ?? '',
      is_champion:  raw.is_champion ?? '',
      status,
    }
  }

  // ── Handle file selection ──
  function handleFile(file: File) {
    setFileName(file.name)
    setImportResult(null)
    setColumnError(null)
    setPreviewRows([])

    const reader = new FileReader()
    reader.onload = e => {
      const text = e.target?.result as string
      const raw = parseCSV(text)

      if (raw.length === 0) {
        setColumnError('CSV tuščias arba nėra duomenų eilučių')
        return
      }

      const cols = Object.keys(raw[0])
      const missing = REQUIRED_COLS.filter(c => !cols.includes(c))
      if (missing.length > 0) {
        setColumnError(`Trūksta stulpelių: ${missing.join(', ')}`)
        return
      }

      setPreviewRows(raw.map((row, i) => validateRow(row, i + 2)))
    }
    reader.readAsText(file, 'UTF-8')
  }

  // ── Import valid rows ──
  async function handleImport() {
    const validRows = previewRows.filter(r => r._errors.length === 0)
    if (validRows.length === 0) return

    setIsImporting(true)
    try {
      const toImport: ImportRowInput[] = validRows.map(row => ({
        card_number: row.card_number,
        name:        row.name,
        faction:     row.faction,
        type:        row.type,
        rarity:      row.rarity,
        gold_cost:   row.gold_cost,
        attack:      row.attack,
        health:      row.health,
        description: row.description,
        effect_text: row.effect_text,
        image_url:   row.image_url,
        is_champion: row.is_champion,
        status:      row.status,
      }))
      const result = await importCards(toImport)
      setImportResult(result)
    } catch (err) {
      setImportResult({
        inserted: 0,
        updated: 0,
        errors: [{ row: 0, card_number: '—', message: String(err) }],
      })
    } finally {
      setIsImporting(false)
    }
  }

  const validCount = previewRows.filter(r => r._errors.length === 0).length
  const errorCount = previewRows.filter(r => r._errors.length > 0).length

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h1
          className="text-2xl font-bold mb-1"
          style={{ fontFamily: 'Cinzel, Georgia, serif', color: 'var(--gold)' }}
        >
          CSV Import
        </h1>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          Importuok arba atnaujink kortas iš CSV failo. Jei card_number jau egzistuoja — korta atsinaujina.
        </p>
      </div>

      {/* Upload area */}
      <div
        className="rounded-xl p-8 text-center cursor-pointer transition-opacity hover:opacity-80"
        style={{ background: 'var(--bg-surface)', border: '2px dashed var(--bg-border)' }}
        onClick={() => fileInputRef.current?.click()}
        onDragOver={e => e.preventDefault()}
        onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
      >
        <Upload className="w-8 h-8 mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
        <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
          {fileName ?? 'Pasirink arba nutempk CSV failą'}
        </p>
        <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
          Palaikomi formatai: .csv (UTF-8)
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
        />
      </div>

      {/* Column error */}
      {columnError && (
        <div
          className="flex items-center gap-2 p-3 rounded-lg text-sm"
          style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444' }}
        >
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {columnError}
        </div>
      )}

      {/* Preview */}
      {previewRows.length > 0 && (
        <div className="space-y-3">
          {/* Summary + Import button */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-4 text-sm">
              <span style={{ color: '#22c55e' }}>✓ {validCount} tinkamos</span>
              {errorCount > 0 && <span style={{ color: '#ef4444' }}>✗ {errorCount} su klaidomis</span>}
            </div>
            <button
              onClick={handleImport}
              disabled={validCount === 0 || isImporting}
              className="px-4 py-2 rounded-lg text-sm font-semibold transition-opacity"
              style={{
                background: validCount > 0 ? 'var(--gold)' : 'var(--bg-elevated)',
                color:      validCount > 0 ? '#0a0a0f' : 'var(--text-muted)',
                opacity:    (isImporting || validCount === 0) ? 0.6 : 1,
                cursor:     (isImporting || validCount === 0) ? 'not-allowed' : 'pointer',
              }}
            >
              {isImporting ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" /> Importuojama...
                </span>
              ) : `Importuoti ${validCount} eilučių`}
            </button>
          </div>

          {/* Preview table */}
          <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--bg-border)' }}>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr style={{ background: 'var(--bg-elevated)', borderBottom: '1px solid var(--bg-border)' }}>
                    {['#', 'card_number', 'pavadinimas', 'frakcija', 'tipas', 'retumas', 'auksas', 'atk', 'hp', 'statusas', 'klaidos'].map(h => (
                      <th
                        key={h}
                        className="px-3 py-2 text-left font-medium whitespace-nowrap"
                        style={{ color: 'var(--text-muted)' }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewRows.map(row => {
                    const hasErr = row._errors.length > 0
                    const ss = STATUS_STYLE[row.status] ?? STATUS_STYLE.draft
                    return (
                      <tr
                        key={row._index}
                        style={{
                          background: hasErr ? 'rgba(239,68,68,0.05)' : 'var(--bg-surface)',
                          borderBottom: '1px solid var(--bg-border)',
                        }}
                      >
                        <td className="px-3 py-2" style={{ color: 'var(--text-muted)' }}>{row._index}</td>
                        <td className="px-3 py-2 font-mono" style={{ color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
                          {row.card_number || '—'}
                        </td>
                        <td className="px-3 py-2" style={{ color: 'var(--text-primary)', maxWidth: '140px' }}>
                          <span className="block truncate">{row.name || '—'}</span>
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap" style={{ color: 'var(--text-secondary)' }}>
                          {row.faction || '—'}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap" style={{ color: 'var(--text-secondary)' }}>
                          {row.type || '—'}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap" style={{ color: 'var(--text-secondary)' }}>
                          {row.rarity || '—'}
                        </td>
                        <td className="px-3 py-2 text-center" style={{ color: 'var(--gold)' }}>
                          {row.gold_cost || '—'}
                        </td>
                        <td className="px-3 py-2 text-center" style={{ color: '#ef4444' }}>
                          {row.attack || '—'}
                        </td>
                        <td className="px-3 py-2 text-center" style={{ color: '#22c55e' }}>
                          {row.health || '—'}
                        </td>
                        <td className="px-3 py-2">
                          <span
                            className="px-1.5 py-0.5 rounded whitespace-nowrap"
                            style={{ background: ss.bg, color: ss.color }}
                          >
                            {row.status}
                          </span>
                        </td>
                        <td className="px-3 py-2" style={{ color: '#ef4444', maxWidth: '220px' }}>
                          {hasErr
                            ? <span className="block truncate" title={row._errors.join('; ')}>{row._errors.join('; ')}</span>
                            : <span style={{ color: '#22c55e' }}>✓</span>
                          }
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Import result */}
      {importResult && (
        <div
          className="rounded-xl p-4 space-y-2"
          style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-border)' }}
        >
          <h3 className="font-semibold text-sm" style={{ color: 'var(--text-primary)', fontFamily: 'Cinzel, Georgia, serif' }}>
            Importo rezultatai
          </h3>
          <div className="flex gap-6 text-sm">
            <span style={{ color: '#22c55e' }}>✓ Įkelta: {importResult.inserted}</span>
            <span style={{ color: '#60a5fa' }}>↑ Atnaujinta: {importResult.updated}</span>
            {importResult.errors.length > 0 && (
              <span style={{ color: '#ef4444' }}>✗ Klaidos: {importResult.errors.length}</span>
            )}
          </div>
          {importResult.errors.length > 0 && (
            <ul className="text-xs space-y-1 mt-2" style={{ color: '#ef4444' }}>
              {importResult.errors.map((e, i) => (
                <li key={i}>Eilutė {e.row} ({e.card_number}): {e.message}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Format reference */}
      <div
        className="rounded-xl p-4"
        style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-border)' }}
      >
        <h3 className="text-xs font-semibold mb-3 tracking-wider" style={{ color: 'var(--text-muted)' }}>
          CSV FORMATO PAVYZDYS
        </h3>
        <pre
          className="text-xs overflow-x-auto pb-2"
          style={{ color: 'var(--text-secondary)', fontFamily: 'monospace', lineHeight: 1.6 }}
        >
{`card_number,name,faction,type,rarity,gold_cost,attack,health,description,effect_text,image_url,is_champion,status
BASE-001,Vilkas,Mirties maršas,Padaras,Paprastas,200,3,4,Aprasymas,,,,active
BASE-002,Ugnis,Demonų orda,Burtas,Magiškas,400,,,Burti,,,,draft`}
        </pre>
        <div
          className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1 text-xs"
          style={{ color: 'var(--text-muted)' }}
        >
          <div><span style={{ color: 'var(--text-secondary)' }}>Frakcijos:</span> {factions.map(f => f.name).join(', ')}</div>
          <div><span style={{ color: 'var(--text-secondary)' }}>Tipai:</span> {cardTypes.map(t => t.name).join(', ')}</div>
          <div><span style={{ color: 'var(--text-secondary)' }}>Retumai:</span> {rarities.map(r => r.name).join(', ')}</div>
          <div><span style={{ color: 'var(--text-secondary)' }}>Statusai:</span> active, hidden, draft, banned</div>
          <div><span style={{ color: 'var(--text-secondary)' }}>is_champion:</span> true / false</div>
          <div><span style={{ color: 'var(--text-secondary)' }}>gold_cost:</span> 100–1000</div>
        </div>
      </div>
    </div>
  )
}
