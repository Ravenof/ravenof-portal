'use client'

// ── Ravenof Digital — mobile Deck Builder (frakcijos kortelės, sąrašas, sticky summary) ──
import { useEffect, useMemo, useState } from 'react'
import { ChevronLeft, Search, Plus, Minus, Eye, Lock, Save, Loader2, ChevronDown, X } from 'lucide-react'
import { useDeckBuilderStore } from '@/stores/deckBuilderStore'
import { createClient } from '@/lib/supabase/client'
import { validateDeck, getCopyLimit, isCurseCard, NEUTRAL_FACTION_ID, DECK_MIN, DECK_MAX } from '@/lib/deck-validation'
import { rarityColor } from '@/lib/digital/rarity'
import { playUiClick, playSuccess, playError } from '@/lib/ui-sound'
import type { CardWithRelations, Faction, CollectionMap, DeckVisibility } from '@/types'

type InitialDeck = {
  id: string; name: string; description: string; factionId: number | null
  visibility: DeckVisibility; entries: { card: CardWithRelations; quantity: number }[]
  sideEntries: { card: CardWithRelations; quantity: number }[]
} | null

type Props = {
  userId: string; cards: CardWithRelations[]; factions: Faction[]; collection: CollectionMap
  initialDeck: InitialDeck; onSaved: () => void; onBack: () => void
}

// Trumpi frakcijų identitetai (pagal pavadinimą).
const IDENTITY: { re: RegExp; line: string; icon: string }[] = [
  { re: /mirt/i,            line: 'Mirusiųjų legionai ir aukos magija', icon: '💀' },
  { re: /plėšik|plesik/i,   line: 'Greiti smūgiai ir grobio gauja',     icon: '🗡️' },
  { re: /vryhiok/i,         line: 'Žvėriška jėga ir chaosas',           icon: '🐺' },
  { re: /demon/i,           line: 'Prakeiksmai ir pragaro ugnis',       icon: '👹' },
  { re: /inkvizic/i,        line: 'Disciplina ir šventas teismas',      icon: '⚖️' },
  { re: /švies|svies/i,     line: 'Gydymas ir apsauga',                 icon: '✨' },
  { re: /mistik/i,          line: 'Burtai ir magijos srautas',          icon: '🔮' },
  { re: /ryt/i,             line: 'Šešėliai ir vikrumas',               icon: '🍃' },
]
const identityFor = (name: string) => IDENTITY.find((x) => x.re.test(name))

export function DigitalDeckBuilder({ userId, cards, factions, collection, initialDeck, onSaved, onBack }: Props) {
  const store = useDeckBuilderStore()
  const [q, setQ] = useState('')
  const [showUniversal, setShowUniversal] = useState(true)
  const [view, setView] = useState<'list' | 'grid'>('list')
  const [descOpen, setDescOpen] = useState(false)
  const [preview, setPreview] = useState<CardWithRelations | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (initialDeck) store.loadExisting(initialDeck.id, initialDeck.name, initialDeck.description, initialDeck.factionId, initialDeck.visibility, initialDeck.entries, initialDeck.sideEntries ?? [])
    else store.initNew()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), 2200); return () => clearTimeout(t) }, [toast])
  const flash = (m: string, err = false) => { (err ? playError : playUiClick)(); setToast(m) }

  const deckQtyOf = (id: string) => store.entries.find((e) => e.card.id === id)?.quantity ?? 0
  const total = store.entries.reduce((s, e) => s + e.quantity, 0)

  const pool = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return cards.filter((c) => {
      if (isCurseCard(c)) return false
      if (store.factionId == null) return false
      const isNeutral = c.faction_id === NEUTRAL_FACTION_ID
      if (c.faction_id !== store.factionId && !(showUniversal && isNeutral)) return false
      if (store.ownedOnly && (collection[c.id] ?? 0) <= 0) return false
      if (needle && !c.name.toLowerCase().includes(needle)) return false
      return true
    })
  }, [cards, q, store.factionId, store.ownedOnly, showUniversal, collection])

  const tryAdd = (c: CardWithRelations) => {
    const owned = collection[c.id] ?? 0
    const dq = deckQtyOf(c.id)
    const limit = getCopyLimit(c)
    if (owned <= 0) return flash('Šios kortos neturi', true)
    if (dq >= owned) return flash(`Turi tik ×${owned}`, true)
    if (dq >= limit) return flash('Pasiektas kopijų limitas', true)
    const r = store.addCard(c)
    if (!r.ok) flash(r.reason ?? 'Negalima pridėti', true)
  }
  const dec = (c: CardWithRelations) => { const dq = deckQtyOf(c.id); if (dq > 0) store.setQuantity(c.id, dq - 1) }

  // Validacija / summary
  const warnings = validateDeck(store.entries, store.factionId, store.name)
  const errors = warnings.filter((w) => w.type === 'error')
  const canSave = errors.length === 0 && !saving
  const reason = !store.factionId ? 'Pasirink frakciją'
    : !store.name.trim() ? 'Įrašyk pavadinimą'
    : total < DECK_MIN ? `Trūksta ${DECK_MIN - total} kortų`
    : total > DECK_MAX ? `Per daug kortų (${total}/${DECK_MAX})`
    : errors.length ? errors[0].message : null

  const save = async () => {
    if (!canSave) { flash(reason ?? 'Kaladė negalioja', true); return }
    setSaving(true)
    const supabase = createClient()
    const avg = total === 0 ? 0 : Math.round(store.entries.reduce((s, e) => s + (e.card.gold_cost ?? 0) * e.quantity, 0) / total)
    try {
      let id = store.deckId
      if (id) {
        const { error } = await supabase.from('decks').update({ name: store.name.trim(), description: store.description.trim() || null, faction_id: store.factionId, visibility: store.visibility, card_count: total, avg_gold_cost: avg, updated_at: new Date().toISOString() }).eq('id', id).eq('user_id', userId)
        if (error) throw error
      } else {
        const { data, error } = await supabase.from('decks').insert({ user_id: userId, name: store.name.trim(), description: store.description.trim() || null, faction_id: store.factionId, visibility: store.visibility, card_count: total, avg_gold_cost: avg }).select('id').single()
        if (error) throw error
        id = data.id
      }
      if (id) {
        await supabase.from('deck_cards').delete().eq('deck_id', id)
        const rows = store.entries.map((e) => ({ deck_id: id!, card_id: e.card.id, quantity: e.quantity }))
        if (rows.length) { const { error } = await supabase.from('deck_cards').insert(rows); if (error) throw error }
        store.markSaved(id)
      }
      playSuccess(); setToast('Kaladė išsaugota'); setTimeout(onSaved, 700)
    } catch (err) {
      flash('Nepavyko išsaugoti: ' + ((err as { message?: string })?.message ?? ''), true)
    } finally { setSaving(false) }
  }

  return (
    <div className="space-y-3" style={{ paddingBottom: 96 }}>
      {/* Antraštė */}
      <div className="flex items-center gap-2">
        <button onClick={() => { playUiClick(); onBack() }} className="flex items-center justify-center rounded-lg shrink-0" style={{ width: 36, height: 36, background: 'rgba(10,8,16,0.9)', border: '1px solid rgba(240,180,41,0.3)', color: 'var(--gold)' }} aria-label="Atgal"><ChevronLeft className="w-5 h-5" /></button>
        <h1 className="flex-1 text-base font-bold" style={{ fontFamily: 'var(--rvn-font-display)', color: 'var(--gold)', letterSpacing: '0.06em' }}>Deck Builder</h1>
        <span className="px-2.5 py-1 rounded-full text-xs font-bold tabular-nums" style={{ background: total >= DECK_MIN && total <= DECK_MAX ? 'rgba(34,197,94,0.16)' : 'rgba(240,180,41,0.14)', border: `1px solid ${total >= DECK_MIN && total <= DECK_MAX ? 'rgba(34,197,94,0.5)' : 'rgba(240,180,41,0.4)'}`, color: total >= DECK_MIN && total <= DECK_MAX ? '#86efac' : 'var(--gold)', fontFamily: 'var(--rvn-font-display)' }}>{total}/{DECK_MIN}</span>
      </div>

      {/* 1 — Frakcija */}
      <Section step={1} title="Pasirink frakciją">
        <div className="grid grid-cols-2 gap-2">
          {factions.filter((f) => f.id !== NEUTRAL_FACTION_ID).map((f) => {
            const sel = store.factionId === f.id
            const id = identityFor(f.name)
            return (
              <button key={f.id} onClick={() => { playUiClick(); if (f.id !== store.factionId && store.entries.length && !window.confirm('Pakeitus frakciją kaladės kortos bus pašalintos. Tęsti?')) return; store.setFaction(sel ? null : f.id) }}
                className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-left transition-transform active:scale-[0.98]"
                style={{ minHeight: 58, background: sel ? `${f.color_hex}26` : 'rgba(10,8,16,0.85)', border: `1.5px solid ${sel ? f.color_hex : 'rgba(240,180,41,0.18)'}`, boxShadow: sel ? `0 0 12px ${f.color_hex}55` : 'none' }}>
                <span className="text-xl shrink-0">{id?.icon ?? '🛡️'}</span>
                <span className="min-w-0">
                  <span className="block text-[12px] font-bold leading-tight truncate" style={{ color: sel ? f.color_hex : '#f3ead3', fontFamily: 'var(--rvn-font-display)' }}>{f.name}</span>
                  <span className="block text-[9px] leading-tight truncate" style={{ color: 'var(--text-muted)' }}>{id?.line ?? ''}</span>
                </span>
              </button>
            )
          })}
        </div>
      </Section>

      {/* 2 — Pavadinimas + matomumas */}
      <Section step={2} title="Kaladės informacija">
        <input value={store.name} onChange={(e) => store.setName(e.target.value)} placeholder="Kaladės pavadinimas…"
          className="w-full px-3 rounded-xl text-sm font-semibold outline-none" style={{ minHeight: 44, background: 'rgba(10,8,16,0.9)', border: `1px solid ${store.name.trim() ? 'rgba(240,180,41,0.3)' : 'rgba(239,68,68,0.6)'}`, color: 'var(--text-primary)', fontFamily: 'var(--rvn-font-display)' }} />
        <div className="grid grid-cols-2 gap-2">
          {([['private', '🔒 Privati'], ['public', '🌐 Vieša']] as const).map(([v, label]) => (
            <button key={v} onClick={() => { playUiClick(); store.setVisibility(v as DeckVisibility) }} className="px-3 rounded-xl text-xs font-bold transition-colors" style={{ minHeight: 42, background: store.visibility === v ? 'rgba(240,180,41,0.18)' : 'rgba(10,8,16,0.85)', border: `1px solid ${store.visibility === v ? 'rgba(240,180,41,0.6)' : 'rgba(240,180,41,0.2)'}`, color: store.visibility === v ? 'var(--gold)' : 'var(--text-muted)', fontFamily: 'var(--rvn-font-display)' }}>{label}</button>
          ))}
        </div>
        <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{store.visibility === 'public' ? 'Vieša kaladė bus matoma Bendruomenės kaladžių sąraše.' : 'Privati kaladė matoma tik tau.'}</p>
        <button onClick={() => setDescOpen((v) => !v)} className="flex items-center gap-1 text-[11px]" style={{ color: 'var(--text-muted)' }}><ChevronDown className={`w-3.5 h-3.5 transition-transform ${descOpen ? 'rotate-180' : ''}`} /> Aprašymas (neprivaloma)</button>
        {descOpen && <input value={store.description} onChange={(e) => store.setDescription(e.target.value)} placeholder="Trumpas aprašymas…" className="w-full px-3 rounded-xl text-sm outline-none" style={{ minHeight: 40, background: 'rgba(10,8,16,0.9)', border: '1px solid rgba(240,180,41,0.2)', color: 'var(--text-primary)' }} />}
      </Section>

      {/* 3 — Kortos */}
      <Section step={3} title="Pridėk kortas">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ieškoti…" className="w-full pl-9 pr-3 rounded-xl text-sm outline-none" style={{ minHeight: 44, background: 'rgba(10,8,16,0.9)', border: '1px solid rgba(240,180,41,0.3)', color: 'var(--text-primary)' }} />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Toggle on={store.ownedOnly} onClick={() => { playUiClick(); store.setOwnedOnly(!store.ownedOnly) }} label="Tik turimos" color="34,197,94" />
          <Toggle on={showUniversal} onClick={() => { playUiClick(); setShowUniversal((v) => !v) }} label="Universalios" color="96,165,250" />
          <div className="inline-flex rounded-full overflow-hidden ml-auto" style={{ border: '1px solid rgba(240,180,41,0.3)' }}>
            {(['list', 'grid'] as const).map((vw) => (
              <button key={vw} onClick={() => { playUiClick(); setView(vw) }} className="px-3 text-[11px] font-semibold" style={{ minHeight: 36, background: view === vw ? 'rgba(240,180,41,0.18)' : 'rgba(10,8,16,0.9)', color: view === vw ? 'var(--gold)' : 'var(--text-muted)' }}>{vw === 'list' ? 'Sąrašas' : 'Tinklelis'}</button>
            ))}
          </div>
        </div>

        {store.factionId == null ? (
          <p className="text-center text-sm py-10" style={{ color: 'var(--text-muted)' }}>Pirma pasirink frakciją ↑</p>
        ) : pool.length === 0 ? (
          <p className="text-center text-sm py-10" style={{ color: 'var(--text-muted)' }}>Kortų nerasta.</p>
        ) : view === 'list' ? (
          <div className="space-y-1.5">
            {pool.map((c) => <CardRow key={c.id} c={c} owned={collection[c.id] ?? 0} deckQty={deckQtyOf(c.id)} onAdd={() => tryAdd(c)} onDec={() => dec(c)} onPreview={() => { playUiClick(); setPreview(c) }} />)}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {pool.map((c) => <CardTile key={c.id} c={c} owned={collection[c.id] ?? 0} deckQty={deckQtyOf(c.id)} onAdd={() => tryAdd(c)} onPreview={() => { playUiClick(); setPreview(c) }} />)}
          </div>
        )}
      </Section>

      {/* Sticky summary */}
      <div className="fixed left-0 right-0 z-30 px-3" style={{ bottom: 'calc(64px + env(safe-area-inset-bottom, 0px))' }}>
        <div className="mx-auto max-w-screen-sm flex items-center gap-2 px-3 py-2 rounded-2xl" style={{ background: 'rgba(7,5,12,0.97)', border: '1px solid rgba(240,180,41,0.3)', boxShadow: '0 8px 24px rgba(0,0,0,0.6)' }}>
          <div className="leading-tight">
            <div className="text-sm font-bold tabular-nums" style={{ color: total >= DECK_MIN && total <= DECK_MAX ? '#86efac' : 'var(--gold)', fontFamily: 'var(--rvn-font-display)' }}>{total}/{DECK_MIN}</div>
            <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>🪙 vid. {store.avgGold()}</div>
          </div>
          <div className="flex-1 text-[11px] truncate" style={{ color: reason ? '#fca5a5' : '#86efac' }}>{reason ?? 'Kaladė galioja ✓'}</div>
          <button onClick={save} disabled={!canSave} className="flex items-center gap-1.5 px-4 rounded-xl text-sm font-bold transition-transform active:scale-95 disabled:opacity-40" style={{ minHeight: 44, background: canSave ? 'rgba(240,180,41,0.92)' : 'rgba(255,255,255,0.06)', color: canSave ? '#1a0f04' : 'var(--text-muted)', fontFamily: 'var(--rvn-font-display)' }}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Išsaugoti
          </button>
        </div>
      </div>

      {preview && <BuilderPreview c={preview} owned={collection[preview.id] ?? 0} deckQty={deckQtyOf(preview.id)} onAdd={() => tryAdd(preview)} onClose={() => setPreview(null)} />}

      {toast && <div className="fixed left-1/2 -translate-x-1/2 z-[160] px-4 py-2 rounded-full text-xs font-semibold" style={{ bottom: 'calc(120px + env(safe-area-inset-bottom, 0px))', background: 'rgba(10,8,16,0.96)', border: '1px solid rgba(240,180,41,0.5)', color: 'var(--gold)' }}>{toast}</div>}
    </div>
  )
}

function Section({ step, title, children }: { step: number; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl p-3 space-y-2.5" style={{ background: 'rgba(10,8,16,0.65)', border: '1px solid rgba(240,180,41,0.16)' }}>
      <div className="flex items-center gap-2">
        <span className="flex items-center justify-center rounded-full text-[10px] font-bold" style={{ width: 18, height: 18, background: 'rgba(240,180,41,0.18)', border: '1px solid rgba(240,180,41,0.5)', color: 'var(--gold)' }}>{step}</span>
        <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-secondary)', letterSpacing: '0.12em' }}>{title}</span>
      </div>
      {children}
    </div>
  )
}

function Toggle({ on, onClick, label, color }: { on: boolean; onClick: () => void; label: string; color: string }) {
  return (
    <button onClick={onClick} className="inline-flex items-center gap-1.5 px-2.5 rounded-full text-[11px] font-semibold" style={{ minHeight: 36, background: on ? `rgba(${color},0.18)` : 'rgba(10,8,16,0.9)', border: `1px solid ${on ? `rgba(${color},0.6)` : 'rgba(240,180,41,0.25)'}`, color: on ? `rgb(${color})` : 'var(--text-muted)' }}>
      <span className="relative inline-block rounded-full" style={{ width: 26, height: 14, background: on ? `rgba(${color},0.5)` : 'rgba(255,255,255,0.12)' }}>
        <span className="absolute top-0.5 rounded-full bg-white transition-all" style={{ width: 10, height: 10, left: on ? 14 : 2 }} />
      </span>{label}
    </button>
  )
}

function Thumb({ c, owned, size = 44 }: { c: CardWithRelations; owned: number; size?: number }) {
  const [bad, setBad] = useState(false)
  const col = rarityColor(c.rarity?.name)
  return (
    <span className="relative block overflow-hidden rounded-md shrink-0" style={{ width: size, height: size, border: `1.5px solid ${owned > 0 ? col : 'rgba(120,120,140,0.4)'}` }}>
      {c.image_url && !bad
        // eslint-disable-next-line @next/next/no-img-element
        ? <img src={c.image_url} alt="" onError={() => setBad(true)} draggable={false} className="absolute inset-0 w-full h-full object-cover" style={{ filter: owned > 0 ? undefined : 'grayscale(1) brightness(0.5)' }} />
        : <span className="absolute inset-0 flex items-center justify-center text-sm" style={{ background: '#15101f' }}>🎴</span>}
      {owned <= 0 && <span className="absolute inset-0 flex items-center justify-center"><Lock className="w-3.5 h-3.5" style={{ color: 'rgba(255,255,255,0.7)' }} /></span>}
    </span>
  )
}

function CardRow({ c, owned, deckQty, onAdd, onDec, onPreview }: { c: CardWithRelations; owned: number; deckQty: number; onAdd: () => void; onDec: () => void; onPreview: () => void }) {
  const col = rarityColor(c.rarity?.name)
  const limit = getCopyLimit(c)
  const addDisabled = owned <= 0 || deckQty >= owned || deckQty >= limit
  return (
    <div className="flex items-center gap-2.5 p-1.5 rounded-xl" style={{ background: deckQty > 0 ? 'rgba(240,180,41,0.08)' : 'rgba(10,8,16,0.6)', border: `1px solid ${deckQty > 0 ? 'rgba(240,180,41,0.35)' : 'rgba(240,180,41,0.12)'}` }}>
      <Thumb c={c} owned={owned} />
      <span className="flex items-center justify-center rounded-full text-[10px] font-bold shrink-0" style={{ width: 20, height: 20, background: 'rgba(240,180,41,0.9)', color: '#1a0f04' }}>{c.gold_cost}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-[12px] font-semibold leading-tight truncate" style={{ color: owned > 0 ? '#f3ead3' : 'var(--text-muted)' }}>{c.name}</span>
        <span className="block text-[9px] leading-tight truncate" style={{ color: col }}>{c.rarity?.name ?? ''} · {c.card_type?.name ?? ''} {owned > 0 ? `· turi ×${owned}` : ''}</span>
      </span>
      <span className="text-[10px] font-bold tabular-nums shrink-0" style={{ color: deckQty > 0 ? 'var(--gold)' : 'var(--text-muted)' }}>{deckQty}/{Math.min(limit, owned || limit)}</span>
      <button onClick={onPreview} className="flex items-center justify-center rounded-lg shrink-0" style={{ width: 30, height: 30, color: 'var(--text-muted)' }} aria-label="Peržiūra"><Eye className="w-4 h-4" /></button>
      {deckQty > 0 && <button onClick={onDec} className="flex items-center justify-center rounded-lg shrink-0" style={{ width: 30, height: 30, background: 'rgba(239,68,68,0.16)', border: '1px solid rgba(239,68,68,0.4)', color: '#fca5a5' }} aria-label="Pašalinti"><Minus className="w-4 h-4" /></button>}
      <button onClick={onAdd} disabled={addDisabled} className="flex items-center justify-center rounded-lg shrink-0 disabled:opacity-30" style={{ width: 30, height: 30, background: 'rgba(34,197,94,0.16)', border: '1px solid rgba(34,197,94,0.45)', color: '#86efac' }} aria-label="Pridėti"><Plus className="w-4 h-4" /></button>
    </div>
  )
}

function CardTile({ c, owned, deckQty, onAdd, onPreview }: { c: CardWithRelations; owned: number; deckQty: number; onAdd: () => void; onPreview: () => void }) {
  const col = rarityColor(c.rarity?.name)
  const limit = getCopyLimit(c)
  const addDisabled = owned <= 0 || deckQty >= owned || deckQty >= limit
  return (
    <div className="relative">
      <button onClick={onPreview} className="relative block w-full overflow-hidden rounded-lg" style={{ aspectRatio: '2.5 / 3.5', border: `2px solid ${owned > 0 ? col : 'rgba(120,120,140,0.4)'}` }}>
        <Thumb c={c} owned={owned} size={9999} />
      </button>
      {deckQty > 0 && <span className="absolute top-1 left-1 px-1.5 rounded-full text-[10px] font-bold" style={{ background: 'rgba(240,180,41,0.95)', color: '#1a0f04' }}>{deckQty}</span>}
      <button onClick={onAdd} disabled={addDisabled} className="absolute bottom-1 right-1 flex items-center justify-center rounded-full disabled:opacity-30" style={{ width: 26, height: 26, background: 'rgba(34,197,94,0.92)', color: '#04210f' }} aria-label="Pridėti"><Plus className="w-4 h-4" /></button>
    </div>
  )
}

function BuilderPreview({ c, owned, deckQty, onAdd, onClose }: { c: CardWithRelations; owned: number; deckQty: number; onAdd: () => void; onClose: () => void }) {
  const [bad, setBad] = useState(false)
  const col = rarityColor(c.rarity?.name)
  const limit = getCopyLimit(c)
  const addDisabled = owned <= 0 || deckQty >= owned || deckQty >= limit
  return (
    <div className="fixed inset-0 z-[160] flex items-center justify-center p-5" style={{ background: 'rgba(4,3,8,0.9)' }} onClick={onClose}>
      <div className="relative w-[min(340px,92vw)] rounded-2xl overflow-hidden" style={{ border: `2px solid ${col}`, background: 'linear-gradient(160deg,#15101f,#0a0810)' }} onClick={(e) => e.stopPropagation()}>
        <button onClick={() => { playUiClick(); onClose() }} className="absolute top-2 right-2 z-10 flex items-center justify-center rounded-full" style={{ width: 32, height: 32, background: 'rgba(0,0,0,0.6)', color: '#fff' }}><X className="w-4 h-4" /></button>
        <div className="relative w-full" style={{ aspectRatio: '2.5 / 3.5', maxHeight: '48vh' }}>
          {c.image_url && !bad
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={c.image_url} alt={c.name} onError={() => setBad(true)} draggable={false} className="absolute inset-0 w-full h-full object-contain" style={{ filter: owned > 0 ? undefined : 'grayscale(1) brightness(0.6)' }} />
            : <div className="absolute inset-0 flex items-center justify-center text-5xl">🎴</div>}
          {owned <= 0 && <span className="absolute inset-0 flex items-center justify-center"><Lock className="w-9 h-9" style={{ color: 'rgba(255,255,255,0.75)' }} /></span>}
        </div>
        <div className="p-4 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-base font-bold" style={{ fontFamily: 'var(--rvn-font-display)', color: '#f3ead3' }}>{c.name}</h2>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ color: col, border: `1px solid ${col}` }}>{c.rarity?.name ?? '—'}</span>
          </div>
          <div className="flex flex-wrap gap-x-3 text-[11px]" style={{ color: 'var(--text-muted)' }}>
            <span>🪙 {c.gold_cost}</span>{c.attack != null && <span>⚔️ {c.attack}</span>}{c.health != null && <span>❤️ {c.health}</span>}{c.faction?.name && <span>· {c.faction.name}</span>}{c.card_type?.name && <span>· {c.card_type.name}</span>}
          </div>
          {(c.effect_text || c.description) && <p className="text-xs leading-snug" style={{ color: 'var(--text-secondary)' }}>{c.effect_text || c.description}</p>}
          <p className="text-[11px] font-semibold" style={{ color: owned > 0 ? '#86efac' : '#fca5a5' }}>{owned > 0 ? `Turima ×${owned} · kaladėje ${deckQty}/${Math.min(limit, owned)}` : 'Kortos dar neturi'}</p>
          <button onClick={() => { onAdd() }} disabled={addDisabled} className="w-full px-4 rounded-xl text-sm font-bold disabled:opacity-40" style={{ minHeight: 44, background: 'rgba(34,197,94,0.18)', border: '1px solid rgba(34,197,94,0.5)', color: '#86efac', fontFamily: 'var(--rvn-font-display)' }}>Pridėti į kaladę</button>
        </div>
      </div>
    </div>
  )
}
