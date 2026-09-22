// ── Paskyros ištrynimas (Google Play „Account deletion" reikalavimas) ──────────
// rvn_delete_my_account() ištrina auth.users įrašą → visi naudotojo duomenys
// krenta per CASCADE. Po sėkmės atsijungiam ir išvalom vietinę būseną.
import { createClient } from '@/lib/supabase/client'
import { currentPlatform } from '@/lib/digital/native'

export async function deleteMyAccount(reason?: string): Promise<void> {
  const sb = createClient()
  const { error } = await sb.rpc('rvn_delete_my_account', { p_platform: currentPlatform(), p_reason: reason ?? null })
  if (error) {
    if (error.message.includes('admin_account_protected')) throw new Error('admin')
    throw new Error(error.message)
  }
  try { await sb.auth.signOut({ scope: 'local' }) } catch { /* sesija serveryje jau nebeegzistuoja */ }
  try {
    if (typeof window !== 'undefined') {
      Object.keys(localStorage).filter((k) => k.startsWith('rvn') || k.startsWith('ravenof') || k.startsWith('sb-')).forEach((k) => localStorage.removeItem(k))
    }
  } catch { /* ignore */ }
}
