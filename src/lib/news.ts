// ── Naujienos Home ekranui (admin valdomos per public.news lentelę) ───────────
import { createClient } from '@/lib/supabase/client'

export type NewsItem = { tag: string; title: string; when: string }

export async function getNews(): Promise<NewsItem[]> {
  const { data, error } = await createClient()
    .from('news').select('tag, title, when_label')
    .eq('is_active', true).order('sort_order').limit(8)
  if (error) { console.warn('[news]', error.message); return [] }
  return ((data as { tag: string; title: string; when_label: string | null }[]) ?? [])
    .map((n) => ({ tag: n.tag, title: n.title, when: n.when_label ?? '' }))
}
