// ════════════════════════════════════════════════════════════════════════════
// Tutorial V3 — „Senojo Korvo" balso variklis.
//
// Kanonas (mirror voiceManager.ts, žr. [[ravenof-card-voice-lines]]):
//   1. VIENAS KANALAS — naujas balsas švariai užgesina ankstesnį (fade 150 ms),
//      tad skip'inant dialogus garsai nesikaupia.
//   2. LAZY + CACHE — dekoduotas AudioBuffer laikomas atmintyje; pamokos
//      pradžioje prefetch'inam VISUS jos ID (trumpi mono failai).
//   3. MISSING-SAFE — jei mp3 dar neįkeltas (404) arba garsas išjungtas,
//      play() grąžina { played:false } ir direktorius auto-advance'ina pagal
//      teksto ilgį. Mokymai VEIKIA ir be balso failų.
//   4. Failo kelias: `card-audio/tutorial/{voiceId}.mp3`. Atgaliniam suderinamumui
//      bandomas ir senasis handoff'o formatas `tut-{voiceId}.mp3` (commit631) —
//      tad veikia bet kuris įkeltas rinkinys, be pervadinimų.
// ════════════════════════════════════════════════════════════════════════════

import { isUiSoundEnabled } from '@/lib/ui-sound'
import { getSfxVolume } from '@/lib/settings'
import { cachedFetch } from '@/lib/game/mediaCache'

const BUCKET_PATH = '/storage/v1/object/public/card-audio/tutorial/'
const FADE_MS = 150
/** Skaitymo greitis, kai balso nėra: ~55 ms/ženklas, min 1.8 s, max 9 s. */
const MS_PER_CHAR = 55
const MIN_MS = 1800
const MAX_MS = 9000

export function estimateReadMs(text: string): number {
  return Math.min(MAX_MS, Math.max(MIN_MS, Math.round(text.trim().length * MS_PER_CHAR)))
}

/** Galimi failo vardai (eilės tvarka): `{id}.mp3`, tada senasis `tut-{id}.mp3`. */
export function tutorialVoiceUrls(voiceId: string): string[] {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!base) return []
  const root = `${base.replace(/\/$/, '')}${BUCKET_PATH}`
  return [`${root}${voiceId}.mp3`, `${root}tut-${voiceId}.mp3`]
}

/** Pagrindinis (numatytasis) failo URL — naudojamas admin peržiūrai/tooltip'ui. */
export function tutorialVoiceUrl(voiceId: string): string | null {
  return tutorialVoiceUrls(voiceId)[0] ?? null
}

let _ctx: AudioContext | null = null
function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null
  try {
    if (!_ctx) {
      const Ctor = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!Ctor) return null
      _ctx = new Ctor()
    }
    return _ctx
  } catch { return null }
}

const buffers = new Map<string, AudioBuffer>()
const inflight = new Map<string, Promise<AudioBuffer | null>>()
const missing = new Set<string>()

let current: { src: AudioBufferSourceNode; gain: GainNode; done: () => void } | null = null

async function load(voiceId: string): Promise<AudioBuffer | null> {
  if (missing.has(voiceId)) return null
  const cached = buffers.get(voiceId)
  if (cached) return cached
  const running = inflight.get(voiceId)
  if (running) return running
  const urls = tutorialVoiceUrls(voiceId)
  const ctx = getCtx()
  if (!urls.length || !ctx) { missing.add(voiceId); return null }

  const p = (async (): Promise<AudioBuffer | null> => {
    try {
      for (const url of urls) {
        try {
          const res = await cachedFetch(url)
          if (!res.ok) continue
          const arr = await res.arrayBuffer()
          const buf = await ctx.decodeAudioData(arr)
          buffers.set(voiceId, buf)
          return buf
        } catch { /* bandom kitą vardo variantą */ }
      }
      missing.add(voiceId)   // failo dar nėra — pamoka eina toliau tyliai
      return null
    } finally { inflight.delete(voiceId) }
  })()
  inflight.set(voiceId, p)
  return p
}

/** Pamokos pradžioje: pašildo VISUS jos balsus (lygiagrečiai, klaidos tylios). */
export function prefetchLessonVoices(ids: (string | undefined)[]): void {
  if (typeof window === 'undefined') return
  const uniq = Array.from(new Set(ids.filter((x): x is string => !!x)))
  for (const id of uniq) void load(id)
}

/** Ar bent vienas šios pamokos failas realiai yra (naudojama titrų/tempo logikai). */
export function isVoiceKnownMissing(voiceId: string): boolean { return missing.has(voiceId) }

export function stopTutorialVoice(): void {
  const c = current
  if (!c) return
  current = null
  const ctx = getCtx()
  try {
    if (ctx) {
      const t = ctx.currentTime
      c.gain.gain.cancelScheduledValues(t)
      c.gain.gain.setValueAtTime(c.gain.gain.value, t)
      c.gain.gain.linearRampToValueAtTime(0.0001, t + FADE_MS / 1000)
      window.setTimeout(() => { try { c.src.stop() } catch { /* tyliai */ } }, FADE_MS + 20)
    } else { c.src.stop() }
  } catch { /* tyliai */ }
  c.done()
}

export interface VoicePlayResult { played: boolean; durationMs: number }

/**
 * Sugroja vieną eilutę. Promise išsisprendžia, KAI balsas baigiasi (arba iškart,
 * jei failo nėra / garsas išjungtas). Naujas play() nutildo ankstesnį.
 */
export async function playTutorialVoice(voiceId: string | undefined, opts?: { volume?: number }): Promise<VoicePlayResult> {
  if (!voiceId || typeof window === 'undefined') return { played: false, durationMs: 0 }
  if (!isUiSoundEnabled()) return { played: false, durationMs: 0 }
  const buf = await load(voiceId)
  if (!buf || !isUiSoundEnabled()) return { played: false, durationMs: 0 }
  const ctx = getCtx()
  if (!ctx) return { played: false, durationMs: 0 }
  if (ctx.state !== 'running') { try { await ctx.resume() } catch { return { played: false, durationMs: 0 } } }

  stopTutorialVoice()

  return new Promise<VoicePlayResult>((resolve) => {
    let settled = false
    const finish = () => { if (settled) return; settled = true; resolve({ played: true, durationMs: Math.round(buf.duration * 1000) }) }
    try {
      const src = ctx.createBufferSource()
      src.buffer = buf
      const gain = ctx.createGain()
      gain.gain.value = Math.max(0, Math.min(1, (opts?.volume ?? 0.95) * getSfxVolume()))
      src.connect(gain); gain.connect(ctx.destination)
      const entry = { src, gain, done: finish }
      src.onended = () => { if (current?.src === src) current = null; finish() }
      current = entry
      src.start()
    } catch { finish() }
  })
}
