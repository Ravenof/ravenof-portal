// ════════════════════════════════════════════════════════════════════════════
// Motion-comic cutscene format — "Ravenof graphic novel panel that has quietly
// started moving". Structural reference: Ticket to Earth (full-screen layered
// comic panels, angular dialogue plate, minimal purposeful motion).
//
// Fully data-driven: the definition lives in campaign_cutscenes.metadata under
// the `motionComic` key (NO DB migration needed — old VN `steps` cutscenes keep
// working; CutscenePlayer routes by format). Rendered by MotionComicPlayer.
// ════════════════════════════════════════════════════════════════════════════

import type { Cutscene } from './types'

// ─────────────────────────────── Localized text ─────────────────────────────
/** Plain string = LT. Object = per-locale. */
export type MCText = string | { lt: string; en?: string }

export function mcText(t: MCText | null | undefined, locale: string): string {
  if (t == null) return ''
  if (typeof t === 'string') return t
  return (locale === 'en' ? t.en : t.lt) ?? t.lt ?? ''
}

// ─────────────────────────────── Poses / effects ────────────────────────────
export const MC_POSES = [
  'neutral', 'speaking', 'angry', 'suspicious', 'wounded', 'casting',
  'shocked', 'defeated', 'silhouette', 'closeup',
] as const
export type MCPose = (typeof MC_POSES)[number] | (string & {})

export const MC_EFFECTS = [
  'fog', 'smoke', 'ash', 'rain', 'snow', 'embers', 'dust', 'magic',
] as const
export type MCEffectKind = (typeof MC_EFFECTS)[number]

export interface MCEffect {
  kind: MCEffectKind
  /** 0..1, default 0.5 */
  intensity?: number
  /** optional CSS color for 'magic' glow etc. */
  color?: string
}

// ─────────────────────────────── Characters ─────────────────────────────────
/**
 * A character asset set: pose → transparent cutout URL. A shot references a
 * character by id + pose; the same character can be reused across shots with
 * different poses, positions, scale, flip and depth WITHOUT new components.
 */
export interface MCCharacterDef {
  id: string
  name: MCText
  /** pose → transparent PNG/WebP url. MUST contain at least 'neutral'. */
  poses: Record<string, string>
  /** faction accent color (rim light / name tab), CSS color. */
  accentColor?: string
}

export interface MCCharacterPlacement {
  /** id from MotionComicDef.characters */
  characterId: string
  pose?: MCPose
  /** viewport %: 0 = left edge, 100 = right edge (anchor = horizontal center). */
  x: number
  /** viewport %: bottom offset of the cutout's bottom edge (usually 0 = grounded, negative sinks below frame). */
  bottom?: number
  /** cutout height as % of viewport height (default 85 — thighs/waist-up framing). */
  height?: number
  flip?: boolean
  /** larger = closer to camera (also parallax speed). Default 10. bg=0, fg=20+. */
  depth?: number
  entrance?: 'none' | 'fade' | 'slide-left' | 'slide-right' | 'slide-up'
  exit?: 'none' | 'fade'
  /** extra darkening even when active (e.g. backlit silhouettes). 0..1 */
  dim?: number
}

// ─────────────────────────────── Camera ─────────────────────────────────────
/**
 * Slow push/drift. Scale 1 = fit; recommend end 1.04–1.07 over 4–8 s.
 * x/y are % of viewport drift (recommend 1–3). Reduced-motion mode freezes at end frame.
 */
export interface MCCamera {
  startScale?: number
  endScale?: number
  startX?: number
  startY?: number
  endX?: number
  endY?: number
  /** seconds. Default 6. */
  duration?: number
  /** brief controlled shake on shot entry (impacts / supernatural only). */
  shake?: 'none' | 'light' | 'heavy'
  /** short punch-in for revelations/threats: quick extra zoom on entry. */
  punchIn?: boolean
}

// ─────────────────────────────── Transitions ────────────────────────────────
export type MCTransitionType = 'cut' | 'fade' | 'wipe-left' | 'wipe-right' | 'wipe-diagonal' | 'ink'

export interface MCTransition {
  type: MCTransitionType
  /** ms, default 450 (ignored for 'cut'). */
  duration?: number
}

// ─────────────────────────────── Shot ───────────────────────────────────────
export interface MCShot {
  id: string
  /** background illustration url (opaque; cover-cropped, never stretched). */
  background: string
  /** optional middle-ground scenery (transparent), between bg and characters. */
  midground?: string | null
  /** optional foreground silhouette/framing layer (transparent, in front). */
  foreground?: string | null
  characters?: MCCharacterPlacement[]
  effects?: MCEffect[]
  /** screen treatment: CSS color overlay (faction tint / grade), e.g. 'rgba(90,40,120,0.12)'. */
  tint?: string | null
  /** default true — soft dark vignette. */
  vignette?: boolean
  camera?: MCCamera
  /** transition INTO this shot. Default 'cut' for first, 'fade' otherwise. */
  transition?: MCTransition

  // ── dialogue beat (one per shot; writers split long speeches into shots) ──
  /** characterId of active speaker; others are dimmed/desaturated. */
  speakerId?: string | null
  /** override display name (else character name; null + text ⇒ narrator italics). */
  speakerName?: MCText | null
  text?: MCText | null
  /** optional VO; with autoAdvanceAfterVoice the shot advances when it ends. */
  voiceUrl?: string | null
  /** one-off SFX / stinger on shot entry. */
  sfxUrl?: string | null
  /** crossfade music/ambience from this shot on (else previous continues). */
  musicUrl?: string | null
  ambientUrl?: string | null
  /** hold before auto-advance is allowed (ms); manual tap always works. */
  holdMs?: number
}

// ─────────────────────────────── Definition ─────────────────────────────────
export interface MotionComicDef {
  version: 1
  characters: MCCharacterDef[]
  shots: MCShot[]
  /** starting audio beds (shots may crossfade to new ones). */
  musicUrl?: string | null
  ambientUrl?: string | null
  /** typewriter text reveal (tap reveals all, tap again advances). Default true. */
  typewriter?: boolean
  /** auto-advance when a shot's voice-over ends. Default false (manual). */
  autoAdvanceAfterVoice?: boolean
}

// ─────────────────────────────── Access / validation ────────────────────────
/** Reads the motion-comic definition from cutscene metadata (or null = VN format). */
export function getMotionComic(c: Pick<Cutscene, 'metadata'> | null | undefined): MotionComicDef | null {
  const raw = c?.metadata?.['motionComic'] as MotionComicDef | undefined
  if (!raw || !Array.isArray(raw.shots) || raw.shots.length === 0) return null
  return raw
}

export function validateMotionComic(def: MotionComicDef): string[] {
  const errs: string[] = []
  const charIds = new Set((def.characters ?? []).map((c) => c.id))
  for (const c of def.characters ?? []) {
    if (!c.poses || !c.poses['neutral']) errs.push(`Personažas „${c.id}" neturi 'neutral' pozos`)
  }
  if (!def.shots?.length) errs.push('Nėra nė vieno kadro (shot)')
  def.shots?.forEach((s, i) => {
    if (!s.background) errs.push(`Kadras #${i + 1} (${s.id}) be fono`)
    for (const p of s.characters ?? []) {
      if (!charIds.has(p.characterId)) errs.push(`Kadras ${s.id}: nežinomas personažas „${p.characterId}"`)
    }
    if (s.speakerId && !charIds.has(s.speakerId)) errs.push(`Kadras ${s.id}: speakerId „${s.speakerId}" nerastas`)
  })
  return errs
}

/** Resolve a placement's cutout url (pose → fallback neutral). */
export function mcPoseUrl(def: MotionComicDef, p: MCCharacterPlacement): string | null {
  const ch = def.characters.find((c) => c.id === p.characterId)
  if (!ch) return null
  return ch.poses[p.pose ?? 'neutral'] ?? ch.poses['neutral'] ?? null
}

export function mcCharacter(def: MotionComicDef, id: string | null | undefined): MCCharacterDef | null {
  if (!id) return null
  return def.characters.find((c) => c.id === id) ?? null
}
