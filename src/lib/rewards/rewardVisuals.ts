// ══════════════════════════════════════════════════════════════════════════════
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
  silver:        { asset: I + 'cur-silver.png',  name: 'Sidabras',        desc: 'Pagrindinė valiuta — pakams ir kaladėms pirkti.' },
  rubies:        { asset: I + 'cur-rubies.png',  name: 'Rubinai',         desc: 'Premium valiuta — retoms prekėms.' },
  essence:       { asset: I + 'cur-essence.png', name: 'Esencija',        desc: 'Naudojama kortoms kurti ir tobulinti.', opticalScale: 1.08 },
  account_xp:    { asset: I + 'fi-academy.png',  name: 'Patirtis (XP)',   desc: 'Kelia paskyros lygį — lygiai duoda atlygius.' },
  season_xp:     { asset: I + 'seg-season.png',  name: 'Sezono XP',       desc: 'Stumia sezono tako pakopas.' },
  pack:          { asset: I + 'pack.png',        name: 'Kortų pakas',     desc: 'Atplėšk ir gauk naujų kortų.', opticalScale: 0.92 },
  card_back:     { asset: I + 'nav-decks.png',   name: 'Kortų nugarėlė',  desc: 'Kosmetinė nugarėlė tavo kaladei.' },
  player_avatar: { asset: I + 'avatar.png',      name: 'Avataras',        desc: 'Kosmetinis veidas kovoms.' },
  card:          { asset: I + 'nav-collection.png', name: 'Korta',         desc: 'Garantuota korta kolekcijai.' },
  badge:         { asset: I + 'fi-ranked.png',   name: 'Rango ženklelis',  desc: 'Sezono rango pasiekimo ženklas.' },
  missing:       { asset: REWARD_MISSING_ASSET,  name: 'Atlygis',         desc: 'Atlygio turinys.', opticalScale: 0.95 },
}

const warned = new Set<string>()
function warnMissing(key: string, it: RewardPayloadItem) {
  if (warned.has(key)) return
  warned.add(key)
  console.warn(`[RewardVisual] Missing visual definition for reward: ${key}`, it)
}

const fmt = (n: number) => n.toLocaleString('lt-LT')

/** Vienintelė vieta, kur payload elementas virsta vizualu. */
export function resolveRewardVisual(it: RewardPayloadItem): RewardVisual {
  const t = String(it.type ?? '')
  const mk = (key: string, label: string): RewardVisual => {
    const d = DEFS[key] ?? DEFS.missing
    return { key, asset: d.asset, fallbackAsset: REWARD_MISSING_ASSET, name: d.name, label, desc: d.desc, opticalScale: d.opticalScale ?? 1, missing: !DEFS[key] || key === 'missing' }
  }
  if (t === 'currency') {
    const c = String(it.currency ?? '')
    if (DEFS[c]) return mk(c, `+${fmt(it.amount ?? 0)}`)
    warnMissing(`currency:${c}`, it)
    return mk('missing', `+${fmt(it.amount ?? 0)}`)
  }
  if (t === 'account_xp') return mk('account_xp', `+${fmt(it.amount ?? 0)} XP`)
  if (t === 'season_xp') return mk('season_xp', `+${fmt(it.amount ?? 0)}`)
  if (t === 'item') {
    const k = String(it.item_type ?? '')
    const q = (it.quantity as number) ?? 1
    if (k === 'pack') return mk('pack', q > 1 ? `${q} pak.` : '1 pak.')
    if (k === 'card_back') return mk('card_back', 'Nugarėlė')
    if (k === 'player_avatar') return mk('player_avatar', 'Avataras')
    if (k === 'card') return mk('card', String(it.item_id ?? 'Korta'))
    if (k === 'badge') return mk('badge', 'Ženklelis')
    warnMissing(`item:${k}`, it)
    return mk('missing', String(it.item_id ?? ''))
  }
  warnMissing(`type:${t || '∅'}`, it)
  return mk('missing', it.amount != null ? `+${fmt(it.amount as number)}` : '')
}

/** Visi registro asset keliai (validacijos skriptui/testams). */
export function allRewardAssets(): string[] {
  return [...new Set(Object.values(DEFS).map((d) => d.asset).concat(REWARD_MISSING_ASSET))]
}
