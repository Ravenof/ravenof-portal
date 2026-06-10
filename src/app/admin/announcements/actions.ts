'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient, getCachedUser } from '@/lib/supabase/server'

async function requireAdmin() {
  const supabase = await createClient()
  const user = await getCachedUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || profile.role !== 'admin') redirect('/cards?error=no_access')
  return supabase
}

function revalidate() {
  revalidatePath('/admin/announcements')
  revalidatePath('/')
}

export async function saveAnnouncement(formData: FormData) {
  const supabase = await requireAdmin()
  const id    = (formData.get('_id') as string) || null
  const title = (formData.get('title') as string)?.trim()
  const slug  = (formData.get('slug') as string)?.trim()

  if (!title) redirect('/admin/announcements?error=' + encodeURIComponent('Pavadinimas privalomas'))
  if (!slug)  redirect('/admin/announcements?error=' + encodeURIComponent('Slug privalomas'))

  const publishedRaw = (formData.get('published_at') as string)?.trim()
  const expiresRaw   = (formData.get('expires_at') as string)?.trim()

  const payload = {
    title,
    slug,
    summary:      (formData.get('summary') as string)?.trim() || null,
    body:         (formData.get('body') as string)?.trim() || null,
    type:         (formData.get('type') as string) || 'news',
    pinned:       formData.get('pinned') === 'true',
    published_at: publishedRaw || null,
    expires_at:   expiresRaw   || null,
    updated_at:   new Date().toISOString(),
  }

  const { error } = id
    ? await supabase.from('announcements').update(payload).eq('id', id)
    : await supabase.from('announcements').insert(payload)

  if (error) redirect('/admin/announcements?error=' + encodeURIComponent(error.message))
  revalidate()
  redirect('/admin/announcements')
}

export async function deleteAnnouncement(id: string): Promise<{ error?: string }> {
  const supabase = await requireAdmin()
  const { error } = await supabase.from('announcements').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidate()
  return {}
}

export async function publishNow(id: string): Promise<{ error?: string }> {
  const supabase = await requireAdmin()
  const { error } = await supabase.from('announcements')
    .update({ published_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) return { error: error.message }
  revalidate()
  return {}
}
