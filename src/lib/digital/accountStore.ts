// ══════════════════════════════════════════════════════════════════════════════
// GLOBALI PASKYROS BŪSENA — vienas šaltinis visam /digital shell'ui.
// Profilis (vardas/avataras/lygis/XP), valiutų balansai ir rango žingsnis
// kraunami VIENĄ kartą ir dalinami visiems ekranams (header, Home, Shop…).
// Taisyklės:
//   • balances === null  → dar NEŽINOMA. UI privalo rodyti skeleton/„—",
//     o pirkimai/claim'ai/kovos startas — užblokuoti. NIEKADA nerodyti 0.
//   • refresh() dedupe'ina lygiagrečius kvietimus ir throttle'ina (5 s),
//     kad kiekvienas route pakeitimas nekartotų tų pačių užklausų.
// ══════════════════════════════════════════════════════════════════════════════
import { create } from 'zustand'
import { createClient } from '@/lib/supabase/client'
import { getLevelProgress } from '@/lib/gamification/levels'
import { ensureProfile } from '@/lib/ranked/client'
import type { Balances } from '@/lib/economy'

export type AccountProfile = {
  name: string
  level: number
  pct: number
  avatarUrl: string | null
}

type AccountState = {
  /** true kai pirmas fetch'as baigtas (net jei nepavyko — error=true) */
  loaded: boolean
  loading: boolean
  error: boolean
  profile: AccountProfile | null
  /** null = dar kraunasi — UI rodo skeleton, o ne 0/0/0 */
  balances: Balances | null
  rankStep: number | null
  refresh: (opts?: { force?: boolean }) => Promise<void>
  /** Optimistinis balansų atnaujinimas po žinomo pirkimo (serveris — autoritetas). */
  applyBalances: (b: Balances) => void
}

let inflight: Promise<void> | null = null
let lastFetch = 0
const MIN_INTERVAL_MS = 5_000

export const useAccount = create<AccountState>((set) => ({
  loaded: false,
  loading: false,
  error: false,
  profile: null,
  balances: null,
  rankStep: null,

  refresh: async (opts) => {
    if (inflight) return inflight
    if (!opts?.force && Date.now() - lastFetch < MIN_INTERVAL_MS) return
    set({ loading: true })
    inflight = (async () => {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { set({ loaded: true, loading: false, profile: null, balances: null, rankStep: null }); return }
        const [{ data: p }, rp] = await Promise.all([
          // VIENA užklausa profiliui + balansams (gold=Sidabras, žr. economy.ts)
          supabase.from('profiles').select('username, display_name, avatar_url, xp_total, gold, rubies, essence').eq('id', user.id).maybeSingle(),
          ensureProfile().catch(() => null),
        ])
        const pr = p as { username?: string; display_name?: string; avatar_url?: string | null; xp_total?: number; gold?: number; rubies?: number; essence?: number } | null
        if (pr) {
          const prog = getLevelProgress(pr.xp_total ?? 0)
          set({
            loaded: true, loading: false, error: false,
            profile: { name: pr.display_name || pr.username || '', level: prog.level, pct: prog.progressPercent, avatarUrl: pr.avatar_url ?? null },
            balances: { silver: pr.gold ?? 0, rubies: pr.rubies ?? 0, essence: pr.essence ?? 0 },
            rankStep: rp ? rp.rank_step : null,
          })
        } else {
          set({ loaded: true, loading: false, error: true })
        }
        lastFetch = Date.now()
      } catch (e) {
        console.warn('[account] refresh:', e)
        set({ loaded: true, loading: false, error: true })
      } finally { inflight = null }
    })()
    return inflight
  },

  applyBalances: (b) => set({ balances: b }),
}))
