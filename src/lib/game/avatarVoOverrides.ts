// ── Avatarų balsų pataisos iš admino (821) ───────────────────────────────────
// Statiniai klipai (avatarPacks.packVoiceMap) + lentelė avatar_vo_overrides:
// išjungti blogą klipą, pakeisti jį nauju arba pridėti papildomą. Nepavykus
// užklausai (offline, nėra migracijos) – tyliai lieka statiniai klipai.
import { createClient } from '@/lib/supabase/client'
import type { AvatarAudioMap, AvatarAudioEvent } from '@/lib/cosmetics'

export type VoOverride = { id: number; avatar_id: string; lang: 'lt' | 'en'; event: string; variant: number | null; disabled: boolean; file_url: string | null; note?: string | null }

export async function fetchVoOverrides(ids: (string | null | undefined)[], locale: string): Promise<VoOverride[]> {
  const clean = Array.from(new Set(ids.filter((x): x is string => !!x)))
  if (!clean.length) return []
  const lang = locale === 'lt' ? 'lt' : 'en'
  try {
    const q = createClient().from('avatar_vo_overrides').select('id,avatar_id,lang,event,variant,disabled,file_url').in('avatar_id', clean).eq('lang', lang)
    const timeout = new Promise<null>((res) => setTimeout(() => res(null), 2500))
    const r = await Promise.race([q, timeout])
    if (!r || (r as { error?: unknown }).error) return []
    return (((r as { data: unknown }).data as VoOverride[]) ?? [])
  } catch { return [] }
}

/** Pritaiko pataisas statiniam žemėlapiui. Klipo numeris imamas iš failo vardo (…/<įvykis>-<nr>.mp3). */
export function applyVoOverrides(map: AvatarAudioMap, rows: VoOverride[]): AvatarAudioMap {
  if (!rows.length) return map
  const out: AvatarAudioMap = { ...map }
  for (const id of Object.keys(out)) {
    const mine = rows.filter((r) => r.avatar_id === id)
    if (!mine.length) continue
    const evs: AvatarAudioMap[string] = { ...out[id] }
    const names = new Set<string>([...Object.keys(evs), ...mine.map((r) => r.event)])
    for (const ev of names) {
      const rs = mine.filter((r) => r.event === ev)
      if (!rs.length) continue
      let clips = (evs[ev as AvatarAudioEvent] ?? []).map((c) => {
        const m = c.url.match(/-(\d+)\.mp3$/); const n = m ? Number(m[1]) : null
        const o = n == null ? undefined : rs.find((r) => r.variant === n)
        if (!o) return c
        if (o.disabled) return null
        return o.file_url ? { url: o.file_url, weight: c.weight } : c
      }).filter((c): c is { url: string; weight: number } => !!c)
      for (const r of rs) if (r.variant == null && r.file_url && !r.disabled) clips = [...clips, { url: r.file_url, weight: 1 }]
      if (clips.length) evs[ev as AvatarAudioEvent] = clips; else delete evs[ev as AvatarAudioEvent]
    }
    out[id] = evs
  }
  return out
}
