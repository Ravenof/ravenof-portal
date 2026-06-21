// ── Nustatymų sinchronizavimas su DB (per vartotoją, kad išliktų kitur) ───────
import { createClient } from '@/lib/supabase/client'
import { getSettings, hydrateSettings, type DigitalSettings } from '@/lib/settings'

/** Užkrauna vartotojo nustatymus iš profilio ir pritaiko (jei prisijungęs). */
export async function loadDigitalSettings(): Promise<void> {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('profiles').select('digital_settings').eq('id', user.id).maybeSingle()
    const s = (data as { digital_settings?: Partial<DigitalSettings> } | null)?.digital_settings
    if (s && typeof s === 'object') hydrateSettings(s)
  } catch { /* tyliai – localStorage lieka šaltiniu */ }
}

let saveTimer: ReturnType<typeof setTimeout> | null = null
/** Išsaugo dabartinius nustatymus į DB (debounced, fire-and-forget). */
export function saveDigitalSettings(): void {
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(async () => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      await supabase.rpc('rvn_save_digital_settings', { p_settings: getSettings() as unknown as Record<string, unknown> })
    } catch { /* tyliai */ }
  }, 600)
}
