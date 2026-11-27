// ── Ekranų „paskutinio vaizdo" kopijos (844) ──────────────────────────────────
// Kolekcija, kaladės ir parduotuvė atsimena paskutinį užkrautą vaizdą (tik
// atmintyje, iki programos uždarymo): atidarius antrą kartą ekranas rodomas
// iškart, o duomenys atnaujinami fone kaip visada.
// Kopijos išmetamos: pasikeitus prisijungusiam vartotojui ir po bet kurios
// duomenis keičiančios užklausos (žr. offline/mutations.ts).
import { createClient } from '@/lib/supabase/client'
import { onDataMutation } from '@/lib/offline/mutations'

const store = new Map<string, unknown>()
let uid: string | null | undefined
let hooked = false

function hook(): void {
  if (hooked || typeof window === 'undefined') return
  hooked = true
  onDataMutation(() => store.clear())
  try {
    createClient().auth.onAuthStateChange((_e, session) => {
      const id = session?.user.id ?? null
      if (uid !== undefined && id !== uid) store.clear()
      uid = id
    })
  } catch { /* be auth klausytojo – kopijos vis tiek išmetamos po mutacijų */ }
}

export function screenCacheGet<T>(key: string): T | null {
  hook()
  return (store.get(key) as T | undefined) ?? null
}
export function screenCacheSet(key: string, value: unknown): void {
  hook()
  store.set(key, value)
}
