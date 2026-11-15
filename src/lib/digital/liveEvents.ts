// ── Live eventai (kliento pusė) ──────────────────────────────────────────────
// Vienas šaltinis visam /digital: aktyvūs eventai, evento žetonai, dovanų
// atsiėmimas ir evento parduotuvė. Serveris – supabase/migrations/20261115b_live_events.sql.
import { create } from 'zustand'
import { createClient } from '@/lib/supabase/client'

export type EventReward =
  | { type: 'event_tokens'; amount: number }
  | { type: 'currency'; currency: 'silver' | 'rubies' | 'essence'; amount: number }
  | { type: 'account_xp' | 'season_xp'; amount: number }
  | { type: 'item'; item_type: string; item_id: string; quantity?: number }
  | { type: 'cosmetic_pool'; kind?: string; ids?: string[]; fallback?: EventReward[] }
  | { type: 'cosmetic'; cosmeticId: string }

export type EventClaim = {
  mode: 'daily' | 'once' | 'calendar' | 'returning'
  claimable: boolean
  key: string | null
  rewards: EventReward[]
  day?: number
  total?: number
  claimedDays?: number
  calendar?: EventReward[][]
}

export type LiveEvent = {
  id: string
  slug: string
  kind: 'multiplier' | 'login_gift' | 'info'
  titleLt: string
  titleEn: string | null
  bodyLt: string | null
  bodyEn: string | null
  imageUrl: string | null
  imageFocus: [number, number] | null
  accent: string
  ctaRoute: string | null
  priority: number
  showPopup: boolean
  occurrence: string
  endsAt: string | null
  config: Record<string, unknown>
  claim: EventClaim | null
}

export type EventShopItem = {
  id: string
  kind: 'cosmetic' | 'pack' | 'currency'
  ref: string
  amount: number
  nameLt: string
  nameEn: string | null
  imageUrl: string | null
  cosmeticKind: string | null
  price: number
  limit: number | null
  bought: number
  owned: boolean
}

export type ClaimResult = { ok?: boolean; error?: string; granted?: EventReward[]; tokens?: number }

type State = {
  loaded: boolean
  events: LiveEvent[]
  tokens: number
  /** kliento ir serverio laikrodžių skirtumas (ms) – laikmačiams */
  skewMs: number
  openEventId: string | null
  shopOpen: boolean
  refresh: () => Promise<void>
  openEvent: (id: string | null) => void
  openShop: (open: boolean) => void
  claim: (eventId: string) => Promise<ClaimResult>
}

let inflight: Promise<void> | null = null

export const useLiveEvents = create<State>((set, get) => ({
  loaded: false,
  events: [],
  tokens: 0,
  skewMs: 0,
  openEventId: null,
  shopOpen: false,

  refresh: async () => {
    if (inflight) return inflight
    inflight = (async () => {
      try {
        const supabase = createClient()
        const { data, error } = await supabase.rpc('rvn_get_live_events')
        // Migracija dar nepaleista arba ryšio klaida – eventų tiesiog nėra (UI nieko nerodo)
        if (error || !data) { set({ loaded: true }); return }
        const d = data as { tokens?: number; events?: LiveEvent[]; serverNow?: string }
        const skewMs = d.serverNow ? new Date(d.serverNow).getTime() - Date.now() : 0
        set({ loaded: true, events: d.events ?? [], tokens: d.tokens ?? 0, skewMs })
      } catch {
        set({ loaded: true })
      } finally {
        inflight = null
      }
    })()
    return inflight
  },

  openEvent: (id) => set({ openEventId: id }),
  openShop: (open) => set({ shopOpen: open }),

  claim: async (eventId) => {
    const supabase = createClient()
    const { data, error } = await supabase.rpc('rvn_claim_live_event', { p_event: eventId })
    if (error) return { error: error.message }
    const r = (data ?? {}) as ClaimResult
    if (r.ok && typeof r.tokens === 'number') set({ tokens: r.tokens })
    await get().refresh()
    return r
  },
}))

export async function getEventShop(): Promise<{ tokens: number; items: EventShopItem[] } | null> {
  const supabase = createClient()
  const { data, error } = await supabase.rpc('rvn_get_event_shop')
  if (error || !data) return null
  return data as { tokens: number; items: EventShopItem[] }
}

export async function buyEventShopItem(itemId: string): Promise<{ ok?: boolean; error?: string; tokens?: number }> {
  const supabase = createClient()
  const { data, error } = await supabase.rpc('rvn_buy_event_shop_item', { p_item: itemId })
  if (error) return { error: error.message }
  const r = (data ?? {}) as { ok?: boolean; error?: string; tokens?: number }
  if (r.ok && typeof r.tokens === 'number') useLiveEvents.setState({ tokens: r.tokens })
  return r
}

// ── Pop-up „matytas" žymės (įrenginyje) ──────────────────────────────────────
// Laukianti dovana turi savo raktą (kalendoriaus kiekviena diena rodoma atskirai)
const seenKey = (e: LiveEvent) => `rvn:evt-seen:${e.id}:${e.claim?.claimable && e.claim.key ? e.claim.key : e.occurrence}`
export function isEventSeen(e: LiveEvent): boolean {
  try { return localStorage.getItem(seenKey(e)) === '1' } catch { return true }
}
export function markEventSeen(e: LiveEvent): void {
  try { localStorage.setItem(seenKey(e), '1') } catch { /* privatus režimas – tiesiog rodysim dar kartą */ }
}

/** Kurį eventą rodyti pop-up'e: pirma neatsiimta dovana, tada svarbiausias dar nematytas. */
export function pickPopupEvent(events: LiveEvent[]): LiveEvent | null {
  const gift = events.find((e) => e.claim?.claimable && !isEventSeen(e))
  if (gift) return gift
  return events.find((e) => e.showPopup && !isEventSeen(e)) ?? null
}

export function eventTitle(e: LiveEvent, locale: string): string {
  return (locale === 'en' && e.titleEn) ? e.titleEn : e.titleLt
}
export function eventBody(e: LiveEvent, locale: string): string {
  return ((locale === 'en' && e.bodyEn) ? e.bodyEn : e.bodyLt) ?? ''
}

/** „2 d. 4 val." / „3 val. 12 min." / „8 min." */
export function formatRemaining(ms: number, locale: string): string {
  const en = locale === 'en'
  if (ms <= 0) return en ? 'ended' : 'baigėsi'
  const m = Math.floor(ms / 60000), h = Math.floor(m / 60), d = Math.floor(h / 24)
  if (d > 0) return en ? `${d}d ${h % 24}h` : `${d} d. ${h % 24} val.`
  if (h > 0) return en ? `${h}h ${m % 60}m` : `${h} val. ${m % 60} min.`
  return en ? `${Math.max(1, m)}m` : `${Math.max(1, m)} min.`
}

/** Atlygio tekstas žetonui (be paveikslų – tinka visiems tipams). */
export function rewardLabel(r: EventReward, locale: string): string {
  const en = locale === 'en'
  switch (r.type) {
    case 'event_tokens': return en ? `${r.amount} event tokens` : `${r.amount} evento žetonų`
    case 'currency':
      if (r.currency === 'silver') return en ? `${r.amount} silver` : `${r.amount} sidabro`
      if (r.currency === 'essence') return en ? `${r.amount} essence` : `${r.amount} esencijos`
      return en ? `${r.amount} rubies` : `${r.amount} rubinų`
    case 'account_xp': return `${r.amount} XP`
    case 'season_xp': return en ? `${r.amount} season XP` : `${r.amount} sezono XP`
    case 'item':
      if (r.item_type === 'pack') return en ? `Booster ×${r.quantity ?? 1}` : `Boosteris ×${r.quantity ?? 1}`
      return en ? 'Item' : 'Daiktas'
    case 'cosmetic_pool':
    case 'cosmetic': return en ? 'Cosmetic' : 'Kosmetika'
    default: return en ? 'Reward' : 'Atlygis'
  }
}

/** Daugiklio santrauka banerio ženkliukui: „×2 sidabras · ×2 XP". */
export function multiplierLabel(e: LiveEvent, locale: string): string {
  if (e.kind !== 'multiplier') return ''
  const en = locale === 'en'
  const c = e.config as { silver?: number; account_xp?: number; season_xp?: number }
  const f = (n: number) => (Number.isInteger(n) ? `×${n}` : `+${Math.round((n - 1) * 100)}%`)
  const out: string[] = []
  if ((c.silver ?? 1) > 1) out.push(`${f(c.silver!)} ${en ? 'silver' : 'sidabras'}`)
  if ((c.account_xp ?? 1) > 1) out.push(`${f(c.account_xp!)} XP`)
  else if ((c.season_xp ?? 1) > 1) out.push(`${f(c.season_xp!)} ${en ? 'season XP' : 'sezono XP'}`)
  return out.join(' · ')
}
