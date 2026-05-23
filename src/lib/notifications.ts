'use server'

import { createClient } from '@/lib/supabase/server'
import type { Notification } from '@/types'

/** Fetch unread count + last N notifications for the current user */
export async function fetchNotifications(limit = 20): Promise<{
  notifications: Notification[]
  unreadCount: number
}> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { notifications: [], unreadCount: 0 }

  const [notifRes, countRes] = await Promise.all([
    supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit),
    supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('read', false),
  ])

  return {
    notifications: (notifRes.data ?? []) as Notification[],
    unreadCount:   countRes.count ?? 0,
  }
}

/** Mark a single notification as read */
export async function markNotificationRead(id: string): Promise<void> {
  const supabase = await createClient()
  await supabase.from('notifications').update({ read: true }).eq('id', id)
}

/** Mark all notifications as read */
export async function markAllNotificationsRead(): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  await supabase.from('notifications').update({ read: true }).eq('user_id', user.id).eq('read', false)
}

/** Create a notification (call from server actions) */
export async function createNotification(
  userId: string,
  type: string,
  title: string,
  message?: string,
  link?: string,
): Promise<void> {
  const supabase = await createClient()
  await supabase.from('notifications').insert({ user_id: userId, type, title, message: message ?? null, link: link ?? null })
}
