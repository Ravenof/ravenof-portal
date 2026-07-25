// ══════════════════════════════════════════════════════════════════════════════
import { t, formatNumber } from '@/lib/i18n/core'
// CENTRINIS REWARD VIZUALŲ REGISTRAS — vienintelis šaltinis, kuris atlygio
// tipas kokiu Ravenof asset'u rodomas. Puslapiai PATYS ikonos NESIRENKA.
// Payload formos = realios rvn__grant_reward_payload išvestys:
//   {type:'currency', currency:'silver'|'rubies'|'essence', amount}
//   {type:'account_xp'|'season_xp', amount}
//   {type:'item', item_type:'pack'|'card_back'|'player_avatar', item_id, quantity}
// Nežinomas tipas → AIŠKUS neutralus „atlygio skrynios" asset'as (fi-gifts) +
// dev console.warn. NIEKADA ne moneta ir ne emoji.
// ══════════════════════════════════════════════════════════════════════════════

export type RewardPayloadItem = {
  type?: string
  currency?: string
  amount?: number
  item_type?: string
  item_id?: string
  quantity?: number
} & Record<string, unknown>

export type RewardVisual = {
  key: string
  asset: string            // kanoninis Ravenof asset'as (public kelias)
  fallbackAsset: string
  name: string             // pilnas pavadinimas (tooltip)
  label: string            // kompaktiška etiketė (pvz. "+100")
  desc: string             // aprašymas tooltip'ui
  opticalScale: number     // optinis dydžio niuansavimas bendrame rėme
  missing?: boolean        // nežinomas tipas (dev diagnostikai/testams)
}

const I = '/digital/icons/'
export const REWARD_MISSING_ASSET = I + 'fi-gifts.png'

type Def = { asset: string; name: string; desc: string; opticalScale?: number }
const DEFS: Record<string, Def> = {
  silver:        { asset: I + 'cur-silver.png',  name: 'rewards.item.silver.name',        desc: 'rewards.item.silver.desc' },
  rubies:        { asset: I + 'cur-rubies.png',  name: 'rewards.item.rubies.name',         desc: 'rewards.item.rubies.desc' },
  essence:       { asset: I + 'cur-essence.png', name: 'rewards.item.essence.name',        desc: 'rewards.item.essence.desc', opticalScale: 1.08 },
  account_xp:    { asset: I + 'fi-academy.png',  name: 'rewards.item.account_xp.name',   desc: 'rewards.item.account_xp.desc' },
  season_xp:     { asset: I + 'seg-season.png',  name: 'rewards.item.season_xp.name',       desc: 'rewards.item.season_xp.desc' },
  pack:          { asset: I + 'pack.png',        name: 'rewards.item.pack.name',     desc: 'rewards.item.pack.desc', opticalScale: 0.92 },
  card_back:     { asset: I + 'nav-decks.png',   name: 'rewards.item.card_back.name',  desc: 'rewards.item.card_back.desc' },
  player_avatar: { asset: I + 'avatar.png',      name: 'rewards.item.player_avatar.name',        desc: 'rewards.item.player_avatar.desc' },
  card:          { asset: I + 'nav-collection.png', name: 'rewards.item.card.name',         desc: 'rewards.item.card.desc' },
  badge:         { asset: I + 'fi-ranked.png',   name: 'rewards.item.badge.name',  desc: 'rewards.item.badge.desc' },
  missing:       { asset: REWARD_MISSING_ASSET,  name: 'rewards.item.missing.name',         desc: 'rewards.item.missing.desc', opticalScale: 0.95 },
}

const warned = new Set<string>()
function warnMissing(key: string, it: RewardPayloadItem) {
  if (warned.has(key)) return
  warned.add(key)
  console.warn(`[RewardVisual] Missing visual definition for reward: ${key}`, it)
}

const fmt = (n: number) => formatNumber(n)

/** Vienintelė vieta, kur payload elementas virsta vizualu. */
export function resolveRewardVisual(it: RewardPayloadItem): RewardVisual {
  const type = String(it.type ?? '')
  const mk = (key: string, label: string): RewardVisual => {
    const d = DEFS[key] ?? DEFS.missing
    return { key, asset: d.asset, fallbackAsset: REWARD_MISSING_ASSET, name: t(d.name), label, desc: t(d.desc), opticalScale: d.opticalScale ?? 1, missing: !DEFS[key] || key === 'missing' }
  }
  if (type === 'currency') {
    const c = String(it.currency ?? '')
    if (DEFS[c]) return mk(c, `+${fmt(it.amount ?? 0)}`)
    warnMissing(`currency:${c}`, it)
    return mk('missing', `+${fmt(it.amount ?? 0)}`)
  }
  if (type === 'account_xp') return mk('account_xp', `+${fmt(it.amount ?? 0)} XP`)
  if (type === 'season_xp') return mk('season_xp', `+${fmt(it.amount ?? 0)}`)
  if (type === 'item') {
    const k = String(it.item_type ?? '')
    const q = (it.quantity as number) ?? 1
    if (k === 'pack') return mk('pack', t('rewards.label.packs', { count: q }))
    if (k === 'card_back') return mk('card_back', t('rewards.label.cardBack'))
    if (k === 'player_avatar') return mk('player_avatar', t('rewards.label.avatar'))
    if (k === 'card') return mk('card', String(it.item_id ?? t('rewards.label.card')))
    if (k === 'badge') return mk('badge', t('rewards.label.badge'))
    warnMissing(`item:${k}`, it)
    return mk('missing', String(it.item_id ?? ''))
  }
  warnMissing(`type:${type || '∅'}`, it)
  return mk('missing', it.amount != null ? `+${fmt(it.amount as number)}` : '')
}

/** Visi registro asset keliai (validacijos skriptui/testams). */
export function allRewardAssets(): string[] {
  return [...new Set(Object.values(DEFS).map((d) => d.asset).concat(REWARD_MISSING_ASSET))]
}

// ── Progression v2 atlygio formos ────────────────────────────────────────────
// v2 RewardDefinition ({type:'silver'|'essence'|'rubies'|'season_xp'|
// 'faction_booster_choice'|'card_choice'|'card_back'|'player_avatar'}) sprendžiama
// TUO PAČIU registru — antro tiesos šaltinio NĖRA.
const V2_DEFS: Record<string, Def> = {
  faction_booster_choice: { asset: I + 'pack.png', name: 'rewards.item.factionBooster.name', desc: 'rewards.item.factionBooster.desc', opticalScale: 0.92 },
  card_choice:            { asset: I + 'nav-collection.png', name: 'rewards.item.cardChoice.name', desc: 'rewards.item.cardChoice.desc' },
}

/** v2 RewardDefinition → tas pats vizualų registras. */
export function resolveRewardVisualV2(r: { type?: string; amount?: number; quantity?: number; rarity?: string; cosmeticId?: string } | null | undefined): RewardVisual {
  const type = String(r?.type ?? '')
  const mkV2 = (key: string, label: string, def?: Def): RewardVisual => {
    const d = def ?? DEFS[key] ?? DEFS.missing
    return {
      key, asset: d.asset, fallbackAsset: REWARD_MISSING_ASSET,
      name: t(d.name), label, desc: t(d.desc),
      opticalScale: d.opticalScale ?? 1, missing: !def && !DEFS[key],
    }
  }
  switch (type) {
    case 'silver':
    case 'rubies':
    case 'essence':
      return mkV2(type, `+${fmt(r?.amount ?? 0)}`)
    case 'season_xp':
      return mkV2('season_xp', `+${fmt(r?.amount ?? 0)}`)
    case 'faction_booster_choice': {
      const q = r?.quantity ?? 1
      return mkV2('faction_booster_choice', t('rewards.label.packs', { count: q }), V2_DEFS.faction_booster_choice)
    }
    case 'card_choice':
      return mkV2('card_choice', t(`progression.rarity.${r?.rarity ?? 'rare'}`), V2_DEFS.card_choice)
    case 'card_back':
      return mkV2('card_back', t('rewards.label.cardBack'))
    case 'player_avatar':
      return mkV2('player_avatar', t('rewards.label.avatar'))
    default:
      warnMissing(`v2:${type || '∅'}`, r as RewardPayloadItem)
      return mkV2('missing', '')
  }
}

/** Ar šis atlygis prieš išdavimą reikalauja žaidėjo pasirinkimo. */
export function rewardRequiresChoice(r: { type?: string } | null | undefined): boolean {
  return r?.type === 'faction_booster_choice' || r?.type === 'card_choice'
}
