'use client'

// ── Admin: universalus grantas žaidėjui ──────────────────────────────────────
// Valiuta (± suma; sidabras / rubinai / esencija), BET KOKIA korta (kopijų sk.,
// paieška pagal vardą/numerį), pakuotė, kosmetika, BET KOKS parduotuvės daiktas.
// Viskas per rvn_admin_grant_v2 (SECURITY DEFINER, is_admin) + admin_grant_log.
import { useMemo, useState, useTransition } from 'react'
import { adminGrantV2, type GrantKind } from '@/app/admin/users/actions'

export type GrantOptions = {
  packs: { id: string; name: string; active: boolean }[]
  cosmetics: { id: string; name: string; kind: string; active: boolean }[]
  shop_items: { id: number; name: string; type: string; active: boolean }[]
}
export type GrantLogRow = { at: string; kind: string; name: string | null; amount: number; note: string | null; admin: string | null }
type CardLite = { id: string; name: string; card_number: string | null; faction: string | null; rarity: string | null; owned: number }

const KINDS: { k: GrantKind; label: string; color: string }[] = [
  { k: 'silver', label: '🪙 Sidabras', color: 'var(--gold)' },
  { k: 'rubies', label: '◆ Rubinai', color: '#fca5a5' },
  { k: 'essence', label: '✦ Esencija', color: '#c4b5fd' },
  { k: 'card', label: '🃏 Korta', color: '#7dd3fc' },
  { k: 'pack', label: '📦 Pakuotė', color: '#fdba74' },
  { k: 'cosmetic', label: '🎭 Kosmetika', color: '#a78bfa' },
  { k: 'shop_item', label: '🛒 Parduotuvės daiktas', color: '#86efac' },
]
const KIND_LABEL: Record<string, string> = Object.fromEntries(KINDS.map((x) => [x.k, x.label]))

const inp = 'px-2 py-1 text-xs rounded bg-[var(--bg-elevated)] border border-[var(--bg-border)] text-[var(--text-primary)]'

export function AdminGrantPanel({ userId, cards, options, log: initialLog, balances: b0 }: {
  userId: string; cards: CardLite[]; options: GrantOptions | null; log: GrantLogRow[]
  balances: { silver: number; rubies: number; essence: number }
}) {
  const [kind, setKind] = useState<GrantKind>('silver')
  const [amount, setAmount] = useState(100)
  const [ref, setRef] = useState<string>('')
  const [q, setQ] = useState('')
  const [note, setNote] = useState('')
  const [bal, setBal] = useState(b0)
  const [log, setLog] = useState<GrantLogRow[]>(initialLog)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [pending, start] = useTransition()

  const isCurrency = kind === 'silver' || kind === 'rubies' || kind === 'essence'
  const cardHits = useMemo(() => {
    if (kind !== 'card') return []
    const s = q.trim().toLowerCase()
    if (!s) return []
    return cards.filter((c) => c.name.toLowerCase().includes(s) || (c.card_number ?? '').toLowerCase().includes(s)).slice(0, 12)
  }, [cards, q, kind])
  const selCard = kind === 'card' ? cards.find((c) => c.id === ref) ?? null : null

  const pickKind = (k: GrantKind) => {
    setKind(k); setRef(''); setQ(''); setMsg(null)
    setAmount(k === 'silver' ? 100 : k === 'rubies' ? 10 : k === 'essence' ? 50 : 1)
  }

  const canSubmit = !pending && (isCurrency ? amount !== 0 : (!!ref && (kind === 'card' ? amount !== 0 : amount > 0)))

  const submit = () => start(async () => {
    setMsg(null)
    const r = await adminGrantV2(userId, kind, isCurrency ? null : ref, amount, note.trim() || null)
    if (r.error) { setMsg({ ok: false, text: r.error }); return }
    if (r.balances) setBal(r.balances)
    const name = r.name ?? selCard?.name ?? ref
    setMsg({ ok: true, text: `Skirta: ${KIND_LABEL[kind]} · ${name} × ${amount}` })
    setLog((l) => [{ at: new Date().toISOString(), kind, name, amount, note: note.trim() || null, admin: 'tu' }, ...l])
  })

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-4 text-sm font-bold">
        <span style={{ color: 'var(--gold)' }}>🪙 {bal.silver.toLocaleString('lt-LT')}</span>
        <span style={{ color: '#fca5a5' }}>◆ {bal.rubies.toLocaleString('lt-LT')}</span>
        <span style={{ color: '#c4b5fd' }}>✦ {bal.essence.toLocaleString('lt-LT')}</span>
      </div>

      {/* Rūšis */}
      <div className="flex flex-wrap gap-1">
        {KINDS.map((x) => (
          <button key={x.k} type="button" onClick={() => pickKind(x.k)} className="text-[11px] px-2 py-1 rounded"
            style={{ background: kind === x.k ? 'rgba(240,180,41,0.18)' : 'var(--bg-elevated)', border: `1px solid ${kind === x.k ? 'rgba(240,180,41,0.6)' : 'var(--bg-border)'}`, color: kind === x.k ? x.color : 'var(--text-secondary)' }}>
            {x.label}
          </button>
        ))}
      </div>

      {/* Objektas */}
      {kind === 'card' && (
        <div className="relative">
          <input value={q} onChange={(e) => { setQ(e.target.value); setRef('') }} placeholder="Kortos vardas arba numeris…" className={inp + ' w-full'} />
          {selCard && <div className="text-xs mt-1" style={{ color: '#7dd3fc' }}>Pasirinkta: <b>{selCard.name}</b> {selCard.card_number ? `(#${selCard.card_number})` : ''} · {selCard.faction ?? '—'} · {selCard.rarity ?? '—'} · turi ×{selCard.owned}</div>}
          {!selCard && cardHits.length > 0 && (
            <div className="absolute z-10 left-0 right-0 mt-1 rounded overflow-hidden" style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-border)', boxShadow: '0 10px 30px rgba(0,0,0,.6)' }}>
              {cardHits.map((c) => (
                <button key={c.id} type="button" onClick={() => { setRef(c.id); setQ(c.name) }} className="w-full text-left px-2 py-1 text-xs hover:bg-white/5 flex justify-between gap-2">
                  <span>{c.name} <span style={{ color: 'var(--text-muted)' }}>{c.card_number ? `#${c.card_number}` : ''} · {c.faction ?? '—'} · {c.rarity ?? '—'}</span></span>
                  <span style={{ color: 'var(--text-muted)' }}>×{c.owned}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      {kind === 'pack' && (
        <select value={ref} onChange={(e) => setRef(e.target.value)} className={inp}>
          <option value="">— pakuotė —</option>
          {(options?.packs ?? []).map((p) => <option key={p.id} value={p.id}>{p.name}{p.active ? '' : ' (neaktyvi)'}</option>)}
        </select>
      )}
      {kind === 'cosmetic' && (
        <select value={ref} onChange={(e) => setRef(e.target.value)} className={inp}>
          <option value="">— kosmetika —</option>
          {(options?.cosmetics ?? []).map((c) => <option key={c.id} value={c.id}>[{c.kind}] {c.name}{c.active ? '' : ' (neaktyvi)'}</option>)}
        </select>
      )}
      {kind === 'shop_item' && (
        <select value={ref} onChange={(e) => setRef(e.target.value)} className={inp}>
          <option value="">— parduotuvės daiktas —</option>
          {(options?.shop_items ?? []).map((s) => <option key={s.id} value={String(s.id)}>[{s.type}] {s.name}{s.active ? '' : ' (neaktyvus)'}</option>)}
        </select>
      )}

      {/* Kiekis + pastaba + veiksmas */}
      <div className="flex flex-wrap items-center gap-2">
        {kind !== 'cosmetic' && (
          <label className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
            {isCurrency ? 'Suma (± )' : 'Kiekis'}
            <input type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value))} className={inp} style={{ width: 90 }} />
          </label>
        )}
        <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Pastaba (kodėl) – neprivaloma" className={inp + ' flex-1 min-w-[160px]'} />
        <button type="button" disabled={!canSubmit} onClick={submit} className="text-[11px] font-bold px-3 py-1.5 rounded disabled:opacity-40"
          style={{ background: 'rgba(240,180,41,0.18)', border: '1px solid rgba(240,180,41,0.5)', color: 'var(--gold)' }}>
          {pending ? 'Skiriama…' : (isCurrency && amount < 0) || (kind === 'card' && amount < 0) ? 'Nuimti' : 'Skirti'}
        </button>
      </div>
      {msg && <div className="text-xs" style={{ color: msg.ok ? '#7bd389' : '#ef4444' }}>{msg.text}</div>}
      <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Valiutai ir kortoms galima neigiama suma (nuėmimas, ne žemiau 0). Parduotuvės daiktas skiriamas per tą patį atlygių variklį kaip pirkimas (be kainos).</div>

      {/* Žurnalas */}
      <div>
        <div className="text-[11px] font-bold mb-1" style={{ color: 'var(--text-secondary)' }}>Admin grantų žurnalas</div>
        {log.length === 0 ? <div className="text-xs" style={{ color: 'var(--text-muted)' }}>—</div> : (
          <div className="max-h-[220px] overflow-y-auto">
            <table className="w-full text-xs">
              <tbody>{log.map((g, i) => (
                <tr key={i} style={{ borderTop: '1px solid var(--bg-border)' }}>
                  <td className="py-1" style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{new Date(g.at).toLocaleString('lt-LT', { dateStyle: 'short', timeStyle: 'short' })}</td>
                  <td>{KIND_LABEL[g.kind] ?? g.kind}</td><td>{g.name ?? ''}</td>
                  <td className="text-right" style={{ color: g.amount < 0 ? '#ef4444' : '#7bd389' }}>{g.amount > 0 ? '+' : ''}{g.amount}</td>
                  <td style={{ color: 'var(--text-muted)' }}>{g.note ?? ''}{g.admin ? ` · ${g.admin}` : ''}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
