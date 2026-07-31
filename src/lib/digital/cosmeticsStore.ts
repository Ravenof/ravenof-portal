// ══════════════════════════════════════════════════════════════════════════════
// GLOBALI KOSMETIKOS BŪSENA — VIENAS kanoninis šaltinis visam /digital.
// Katalogas + nuosavybė + aktyvūs pasirinkimai (avataras, nugarėlė) su
// serverine validacija ir VIENA fallback logika (nedubliuoti komponentuose!).
//
// Taisyklės:
//   • Kol loaded=false — UI rodo skeleton, NE default vizualą (kad nemirgėtų).
//   • activeAvatar()/activeCardBack() VISADA grąžina naudotiną vizualą:
//     pasirinktas → numatytasis (av_nekronautas / cb_default) → statinis kelias.
//   • setActiveAvatar/CardBack: optimistinis atnaujinimas → serverio validacija
//     (rvn_set_active_*) → rollback su klaida, jei atmetė. Dvigubas paspaudimas
//     blokuojamas (busy).
// ══════════════════════════════════════════════════════════════════════════════
import { create } from 'zustand'
import { createClient } from '@/lib/supabase/client'
import { getCosmetics, type Cosmetic, type CosmeticsState } from '@/lib/cosmetics'

export const DEFAULT_AVATAR_ID = 'av_nekronautas'
export const DEFAULT_CARD_BACK_ID = 'cb_default'
/** Statinis absoliutus fallback — naudojamas ir kai katalogas nepasiekiamas. */
export const DEFAULT_CARD_BACK_SRC = '/card-backs/ravenof-default.webp'
/** Sena hardcoded nugarėlė — galutinis fallback, jei net default asset lūžtų. */
export const LEGACY_CARD_BACK_SRC = '/card-backs/back.webp?v=2'

export type CosmeticVisual = {
  id: string | null
  name: string
  url: string | null
  css: string | null
  emoji: string | null
}

type ActiveIds = { avatar: string | null; cardBack: string | null }

type CosmeticsStore = {
  loaded: boolean
  loading: boolean
  error: boolean
  items: Cosmetic[]
  owned: string[]
  active: ActiveIds
  defaults: ActiveIds
  busy: boolean
  refresh: (opts?: { force?: boolean }) => Promise<void>
  setActiveAvatar: (id: string) => Promise<{ ok: boolean; reason?: 'locked' | 'network' }>
  setActiveCardBack: (id: string) => Promise<{ ok: boolean; reason?: 'locked' | 'network' }>
}

let inflight: Promise<void> | null = null
let lastFetch = 0
const MIN_INTERVAL_MS = 5_000

type ServerState = CosmeticsState & {
  active?: { avatar?: string | null; cardBack?: string | null }
  defaults?: { avatar?: string | null; cardBack?: string | null }
}

export const useCosmetics = create<CosmeticsStore>((set, get) => ({
  loaded: false,
  loading: false,
  error: false,
  items: [],
  owned: [],
  active: { avatar: null, cardBack: null },
  defaults: { avatar: DEFAULT_AVATAR_ID, cardBack: DEFAULT_CARD_BACK_ID },
  busy: false,

  refresh: async (opts) => {
    if (inflight) return inflight
    if (!opts?.force && get().loaded && Date.now() - lastFetch < MIN_INTERVAL_MS) return
    set({ loading: true })
    inflight = (async () => {
      try {
        const st = (await getCosmetics()) as ServerState | null
        if (!st) { set({ loaded: true, loading: false, error: true }); return }
        set({
          loaded: true, loading: false, error: false,
          items: st.items ?? [],
          owned: st.owned ?? [],
          // serveris grąžina JAU validuotus aktyvius (fallback į default DB pusėje);
          // senesnė RPC versija be `active` — krentam į equipped* laukus
          active: {
            avatar: st.active?.avatar ?? st.equippedAvatar ?? null,
            cardBack: st.active?.cardBack ?? st.equippedCardBack ?? null,
          },
          defaults: {
            avatar: st.defaults?.avatar ?? DEFAULT_AVATAR_ID,
            cardBack: st.defaults?.cardBack ?? DEFAULT_CARD_BACK_ID,
          },
        })
        lastFetch = Date.now()
      } catch (e) {
        console.warn('[cosmetics] refresh:', e)
        set({ loaded: true, loading: false, error: true })
      } finally { inflight = null }
    })()
    return inflight
  },

  setActiveAvatar: (id) => setActive('avatar', id, set, get),
  setActiveCardBack: (id) => setActive('card_back', id, set, get),
}))

async function setActive(
  kind: 'avatar' | 'card_back',
  id: string,
  set: (p: Partial<CosmeticsStore>) => void,
  get: () => CosmeticsStore,
): Promise<{ ok: boolean; reason?: 'locked' | 'network' }> {
  const st = get()
  if (st.busy) return { ok: false, reason: 'network' }
  // kliento pusės greita patikra (serveris — autoritetas)
  const item = st.items.find((c) => c.id === id && c.kind === kind)
  const owned = !!item && (st.owned.includes(id) || !!item.ownedByDefault)
  if (!owned) return { ok: false, reason: 'locked' }

  const prev = st.active
  const key = kind === 'avatar' ? 'avatar' : 'cardBack'
  set({ busy: true, active: { ...prev, [key]: id } }) // optimistinis
  const supabase = createClient()
  const rpc = kind === 'avatar' ? 'rvn_set_active_avatar' : 'rvn_set_active_card_back'
  const { data, error } = await supabase.rpc(rpc, { p_id: id })
  if (error) {
    set({ busy: false, active: prev }) // rollback
    const locked = /cosmetic_locked|not owned/i.test(error.message)
    console.warn('[cosmetics] setActive:', error.message)
    return { ok: false, reason: locked ? 'locked' : 'network' }
  }
  // serverio validuotas rinkinys — sinchronizuojam be pilno reload
  const act = data as { avatar?: string | null; cardBack?: string | null } | null
  set({
    busy: false,
    active: {
      avatar: act?.avatar ?? (key === 'avatar' ? id : prev.avatar),
      cardBack: act?.cardBack ?? (key === 'cardBack' ? id : prev.cardBack),
    },
  })
  if (kind === 'card_back') { try { sessionStorage.removeItem('rvn-battle-skins') } catch { /* */ } }
  return { ok: true }
}

// ── VIENINTELIS vizualų resolveris (fallback logika tik čia) ─────────────────

export function cosmeticById(state: Pick<CosmeticsStore, 'items'>, id: string | null | undefined): Cosmetic | null {
  if (!id) return null
  return state.items.find((c) => c.id === id) ?? null
}

function visualOf(c: Cosmetic | null, fallback: CosmeticVisual): CosmeticVisual {
  if (!c) return fallback
  return { id: c.id, name: c.name, url: c.imageUrl ?? null, css: c.css ?? null, emoji: c.emoji ?? null }
}

/** Aktyvus avataras — pasirinktas → numatytasis → neutralus (be sulūžusio img). */
export function activeAvatarVisual(state: Pick<CosmeticsStore, 'items' | 'active' | 'defaults'>): CosmeticVisual {
  const def = visualOf(cosmeticById(state, state.defaults.avatar), {
    id: DEFAULT_AVATAR_ID, name: 'Nekronautas', url: null, css: null, emoji: '☠',
  })
  return visualOf(cosmeticById(state, state.active.avatar), def)
}

/** Aktyvi nugarėlė — pasirinkta → cb_default → statinis /card-backs kelias. */
export function activeCardBackVisual(state: Pick<CosmeticsStore, 'items' | 'active' | 'defaults'>): CosmeticVisual {
  const def = visualOf(cosmeticById(state, state.defaults.cardBack), {
    id: DEFAULT_CARD_BACK_ID, name: 'Ravenof nugarėlė', url: DEFAULT_CARD_BACK_SRC, css: null, emoji: null,
  })
  const v = visualOf(cosmeticById(state, state.active.cardBack), def)
  // nugarėlė visada turi turėti piešiamą vizualą
  if (!v.url && !v.css) return { ...v, url: DEFAULT_CARD_BACK_SRC }
  return v
}

/** Bet kurio katalogo įrašo vizualas su saugiu fallback (Shop/Profilio grid'ams). */
export function cosmeticVisual(state: Pick<CosmeticsStore, 'items'>, id: string | null | undefined, kind: 'avatar' | 'card_back'): CosmeticVisual {
  const c = cosmeticById(state, id)
  const fb: CosmeticVisual = kind === 'card_back'
    ? { id: null, name: '', url: DEFAULT_CARD_BACK_SRC, css: null, emoji: null }
    : { id: null, name: '', url: null, css: null, emoji: '☠' }
  return visualOf(c, fb)
}

/** Kovos preload: aktyvi nugarėlė (ir avataras) parsiunčiami PRIEŠ įeinant į kovą. */
export function preloadActiveCosmetics(): void {
  try {
    const st = useCosmetics.getState()
    const back = activeCardBackVisual(st)
    if (back.url) { const im = new Image(); im.src = back.url }
    const av = activeAvatarVisual(st)
    if (av.url) { const im = new Image(); im.src = av.url }
  } catch { /* */ }
}
