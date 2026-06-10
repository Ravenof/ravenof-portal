import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { cache } from 'react'
import type { User } from '@supabase/supabase-js'
import type { ResponseCookie } from 'next/dist/compiled/@edge-runtime/cookies'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Partial<ResponseCookie> }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Server Component negali setinti cookies — middleware tvarko tai
          }
        },
      },
    }
  )
}

/**
 * Per-request memoizuotas vartotojas (React cache).
 * auth.getUser() daro tinklo užklausą į Supabase Auth — be cache kiekvienas
 * puslapis + fetchNotifications + helper'iai darydavo po 2-3 tokias užklausas
 * per vieną page load. Su cache — tik viena per requestą.
 */
export const getCachedUser = cache(async (): Promise<User | null> => {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
})
