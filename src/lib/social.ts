// ── Socialinis sluoksnis: draugai + iššūkiai (kliento RPC apvalkalai) ─────────
import { createClient } from '@/lib/supabase/client'

export type Friend = { id: string; userId: string; username: string; displayName: string | null; avatar: string | null }
export type Challenge = { id: string; code: string; challengerId: string; username: string; displayName: string | null }

export async function friendRequest(username: string): Promise<{ ok: true } | { error: string }> {
  const { data, error } = await createClient().rpc('rvn_friend_request', { p_username: username })
  if (error) return { error: error.message.replace(/^.*exception\s*/i, '') }
  return data as { ok: true }
}
export async function friendRespond(id: string, accept: boolean): Promise<void> {
  await createClient().rpc('rvn_friend_respond', { p_id: id, p_accept: accept })
}
export async function friendRemove(id: string): Promise<void> {
  await createClient().rpc('rvn_friend_remove', { p_id: id })
}
export async function friendsList(): Promise<{ friends: Friend[]; pending: Friend[] }> {
  const { data, error } = await createClient().rpc('rvn_friends_list')
  if (error) { console.warn('[social] list:', error.message); return { friends: [], pending: [] } }
  return (data as { friends: Friend[]; pending: Friend[] }) ?? { friends: [], pending: [] }
}
export async function challengeCreate(targetId: string, code: string): Promise<boolean> {
  const { error } = await createClient().rpc('rvn_challenge_create', { p_target: targetId, p_code: code })
  if (error) { console.warn('[social] challenge:', error.message); return false }
  return true
}
export async function challengeIncoming(): Promise<Challenge[]> {
  const { data, error } = await createClient().rpc('rvn_challenge_incoming')
  if (error) return []
  return (data as Challenge[]) ?? []
}
export async function challengeAccept(id: string): Promise<string | null> {
  const { data, error } = await createClient().rpc('rvn_challenge_accept', { p_id: id })
  if (error) return null
  return (data as string) ?? null
}
export async function challengeCancel(id: string): Promise<void> {
  await createClient().rpc('rvn_challenge_cancel', { p_id: id })
}

export const randMatchCode = () => Array.from({ length: 5 }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.floor(Math.random() * 32)]).join('')

export type ChatMessage = { id: string; fromMe: boolean; body: string; createdAt: string }

export async function sendMessage(toId: string, body: string): Promise<void> {
  await createClient().rpc('rvn_send_message', { p_to: toId, p_body: body })
}
export async function getConversation(friendId: string): Promise<ChatMessage[]> {
  const { data, error } = await createClient().rpc('rvn_conversation', { p_friend: friendId, p_limit: 80 })
  if (error) return []
  return (data as ChatMessage[]) ?? []
}
export async function friendRequestById(targetId: string): Promise<{ ok: boolean; reason?: string }> {
  const { data, error } = await createClient().rpc('rvn_friend_request_id', { p_target: targetId })
  if (error) return { ok: false, reason: error.message }
  return data as { ok: boolean; reason?: string }
}
