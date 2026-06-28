'use client'

import { useState, useActionState } from 'react'
import { useRouter } from 'next/navigation'
import { saveCard, type CardFormState } from '@/app/admin/cards/actions'
import { CardImageUpload } from './CardImageUpload'
import { GameplayConfigEditor } from './GameplayConfigEditor'
import type { Faction, CardType, Rarity } from '@/types'

type CardData = {
  id: string
  card_number: string | null
  name: string
  faction_id: number | null
  card_type_id: number | null
  rarity_id: number | null
  subtype: string | null
  champion_group: string | null
  champion_phase: number | null
  gold_cost: number | null
  attack: number | null
  health: number | null
  description: string | null
  effect_text: string | null
  lore_text: string | null
  image_url: string | null
  is_champion: boolean
  status: string
  gameplay?: unknown
}

type Props = {
  cardId: string | null
  initialData?: Partial<CardData>
  factions: Faction[]
  cardTypes: CardType[]
  rarities: Rarity[]
  cardNames?: string[]
}

const inputStyle = {
  width: '100%',
  padding: '0.5rem 0.75rem',
  borderRadius: '0.5rem',
  fontSize: '0.875rem',
  background: 'var(--bg-elevated)',
  border: '1px solid var(--bg-border)',
  color: 'var(--text-primary)',
  outline: 'none',
}

const labelStyle = {
  display: 'block',
  fontSize: '0.75rem',
  fontWeight: 600,
  color: 'var(--text-muted)',
  marginBottom: '0.375rem',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.05em',
}

export function CardForm({ cardId, initialData, factions, cardTypes, rarities, cardNames = [] }: Props) {
  const router = useRouter()
  const boundSave = saveCard.bind(null, cardId)
  const [state, formAction, isPending] = useActionState<CardFormState, FormData>(boundSave, {})

  const [imageUrl, setImageUrl] = useState(initialData?.image_url ?? '')
  const [cardNumber, setCardNumber] = useState(initialData?.card_number ?? '')
  const [typeId, setTypeId] = useState<number | null>(initialData?.card_type_id ?? null)
  const isFieldType = /lauk|field/i.test(cardTypes.find((t) => t.id === typeId)?.name ?? '')
  const isCurseType = /prakeik|curse/i.test(cardTypes.find((t) => t.id === typeId)?.name ?? '')
  const isChampType = /čempion|champion/i.test(cardTypes.find((t) => t.id === typeId)?.name ?? '')
  const [goldCost, setGoldCost] = useState<string>(initialData?.gold_cost != null ? String(initialData.gold_cost) : '')

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_180px] gap-8 items-start">
      {/* Main form */}
      <form action={formAction} className="space-y-6">
        {state.error && (
          <div className="p-3 rounded-lg text-sm"
            style={{ background: '#ef444420', color: '#ef4444', border: '1px solid #ef444440' }}>
            {state.error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Card number */}
          <div>
            <label style={labelStyle}>Kortos numeris</label>
            <input
              name="card_number"
              value={cardNumber}
              onChange={e => setCardNumber(e.target.value)}
              placeholder="pvz. BASE-001"
              style={inputStyle}
            />
          </div>

          {/* Name */}
          <div>
            <label style={labelStyle}>Pavadinimas *</label>
            <input name="name" defaultValue={initialData?.name ?? ''} required
              placeholder="Kortos pavadinimas"
              style={{ ...inputStyle, border: '1px solid var(--gold)40' }} />
          </div>

          {/* Faction */}
          <div>
            <label style={labelStyle}>Frakcija *</label>
            <select name="faction_id" defaultValue={initialData?.faction_id ?? ''} required style={inputStyle}>
              <option value="">-- Pasirink frakciją --</option>
              {factions.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
          </div>

          {/* Type */}
          <div>
            <label style={labelStyle}>Tipas *</label>
            <select name="card_type_id" defaultValue={initialData?.card_type_id ?? ''} required style={inputStyle} onChange={e => {
              const v = e.target.value ? Number(e.target.value) : null
              setTypeId(v)
              const tn = cardTypes.find(t => t.id === v)?.name ?? ''
              if (/prakeik|curse/i.test(tn)) setGoldCost('0')
            }}>
              <option value="">-- Pasirink tipa --</option>
              {cardTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>

          {/* Rarity */}
          <div>
            <label style={labelStyle}>Retumas *</label>
            <select name="rarity_id" defaultValue={initialData?.rarity_id ?? ''} required style={inputStyle}>
              <option value="">-- Pasirink retuma --</option>
              {rarities.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>

          {/* Subtype */}
          <div>
            <label style={labelStyle}>Potipis (nebut.)</label>
            <input name="subtype" defaultValue={initialData?.subtype ?? ''}
              placeholder="ZOMBIE / GOBLIN / DEMON..."
              style={inputStyle} />
          </div>

          {/* Champion family + phase (tik čempionams) */}
          {isChampType && (
            <>
              <div>
                <label style={labelStyle}>Čempiono šeima (group)</label>
                <input name="champion_group" defaultValue={initialData?.champion_group ?? ''}
                  placeholder="pvz. elys-matviga (vienoda visoms 3 fazėms)" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Čempiono fazė</label>
                <select name="champion_phase" defaultValue={initialData?.champion_phase ?? ''} style={inputStyle}>
                  <option value="">—</option>
                  <option value="1">1 fazė</option>
                  <option value="2">2 fazė</option>
                  <option value="3">3 fazė</option>
                </select>
              </div>
            </>
          )}

          {/* Gold cost */}
          <div>
            <label style={labelStyle}>Aukso kaina{isCurseType ? '' : ' *'}</label>
            <select name="gold_cost" value={goldCost} onChange={e => setGoldCost(e.target.value)} required={!isCurseType} style={inputStyle}>
              <option value="">-- Pasirink --</option>
              <option value="0">0 (Prakeiksmas)</option>
              {[100,200,300,400,500,600,700,800,900,1000].map(v => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          </div>

          {/* Attack */}
          <div>
            <label style={labelStyle}>Ataka (nebut.)</label>
            <input name="attack" type="number" min="0" defaultValue={initialData?.attack ?? ''}
              placeholder="0" style={inputStyle} />
          </div>

          {/* Health */}
          <div>
            <label style={labelStyle}>HP (nebut.)</label>
            <input name="health" type="number" min="0" defaultValue={initialData?.health ?? ''}
              placeholder="0" style={inputStyle} />
          </div>

          {/* Status */}
          <div>
            <label style={labelStyle}>Statusas *</label>
            <select name="status" defaultValue={initialData?.status ?? 'draft'} style={inputStyle}>
              <option value="draft">Draft</option>
              <option value="active">Active</option>
              <option value="hidden">Hidden</option>
              <option value="banned">Banned</option>
            </select>
          </div>

          {/* Image URL — controlled, synced with upload */}
          <div>
            <label style={labelStyle}>Image URL (nebut.)</label>
            <input
              name="image_url"
              value={imageUrl}
              onChange={e => setImageUrl(e.target.value)}
              placeholder="https://..."
              style={inputStyle}
            />
          </div>
        </div>

        {/* Tekstas matomas kortos paveiksle – nebeeditinamas, bet išsaugomas (paslėpti laukai) */}
        <input type="hidden" name="description" defaultValue={initialData?.description ?? ''} />
        <input type="hidden" name="effect_text" defaultValue={initialData?.effect_text ?? ''} />
        <input type="hidden" name="lore_text" defaultValue={initialData?.lore_text ?? ''} />

        {/* Virtualaus žaidimo gameplay konfigūracija (mapinimas) */}
        <GameplayConfigEditor
          initial={initialData?.gameplay ?? null}
          cardId={cardId}
          cardNumber={cardNumber}
          isField={isFieldType}
          isChampion={isChampType}
          isCurse={isCurseType}
          cardNames={cardNames}
          hasEffectText={!!(initialData?.effect_text ?? '').trim()}
        />

        {/* Champion */}
        <div className="flex items-center gap-3">
          <input type="checkbox" name="is_champion" id="is_champion"
            defaultChecked={initialData?.is_champion ?? false}
            className="w-4 h-4 accent-yellow-400" />
          <label htmlFor="is_champion" className="text-sm cursor-pointer" style={{ color: 'var(--text-secondary)' }}>
            Čempionas (Champion)
          </label>
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-3 pt-2">
          <button type="submit" disabled={isPending}
            className="px-6 py-2 rounded-lg font-semibold text-sm transition-opacity disabled:opacity-50 hover:opacity-90"
            style={{ background: 'var(--gold)', color: '#0a0a0f' }}>
            {isPending ? 'Issaugoma...' : (cardId ? 'Issaugoti pakeitimus' : 'Sukurti korta')}
          </button>
          <button type="button" onClick={() => router.back()}
            className="px-4 py-2 rounded-lg text-sm transition-opacity hover:opacity-70"
            style={{ color: 'var(--text-muted)', border: '1px solid var(--bg-border)' }}>
            Atsaukti
          </button>
        </div>
      </form>

      {/* Image upload panel */}
      <div className="rounded-xl p-4" style={{ background: 'var(--bg-surface)', border: '1px solid var(--bg-border)' }}>
        <p style={{ ...labelStyle, marginBottom: '0.75rem' }}>Paveikslėlis</p>
        <CardImageUpload
          currentUrl={imageUrl}
          cardNumber={cardNumber}
          cardId={cardId}
          onUpload={url => setImageUrl(url)}
        />
      </div>
    </div>
  )
}
