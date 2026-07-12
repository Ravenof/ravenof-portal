// ══════════════════════════════════════════════════════════════════════════════
// STATUS VFX SISTEMA — centrinis registras + įvykių magistralė (bus).
//
// Architektūra:
//  • Variklis (engine/effectEngine) į GameEvent log'ą deda struktūrizuotą
//    `statusEvt` ('apply'|'trigger'|'remove'|'destroy') + statusId + tgt uid.
//  • TutorialGame "naujų įvykių" cikle (seenRef seka — reconnect NEreplay'ina)
//    kiekvienam statusEvt publikuoja StatusAnimationEvent su unikaliu seq
//    (absoliutus log indeksas) → dublikatų būti negali.
//  • CardStatusVfxLayer prenumeruoja pagal uid ir groja one-shot animacijas;
//    idle būsenos renderinamos deklaratyviai iš unit.statuses/flag'ų.
//  • Garsai per esamą soundManager (gerbia SFX garsumą), su cooldown'u.
// ══════════════════════════════════════════════════════════════════════════════
import { playBattleSound } from '@/lib/game/soundManager'
import { t } from '@/lib/i18n/core'
import type { BattleSoundType } from '@/lib/game/types'

// Visi VIZUALŪS statusai (TutStatus + kortos flag'ai, kurie elgiasi kaip statusai)
export type VfxStatusId =
  | 'frozen' | 'stunned' | 'burning' | 'poisoned' | 'silenced' | 'blessed'   // TutStatus
  | 'shield'      // Magiškasis skydas (BoardUnit.shield)
  | 'stealth'     // Sėlinimas (BoardUnit.stealth)
  | 'taunt'       // Pasišaipymas (keyword/aura)
  | 'sprint'      // Sprintas (iškvietimo ėjimą)
  | 'control'     // Perimta kontrolė (takeControl)
  | 'cantAttack'  // Aura: negali atakuoti
  | 'immortal'    // Aura: negali žūti

export type StatusVfxEventType = 'apply' | 'trigger' | 'remove' | 'destroy'

export type StatusAnimationEvent = {
  seq: number              // unikalus (absoliutus log indeksas) — dedup
  type: StatusVfxEventType
  cardId: string           // BoardUnit.uid
  statusId: VfxStatusId
  value?: number
}

export type StatusVfxDefinition = {
  statusId: VfxStatusId
  tint: string             // pagrindinė spalva
  priority: number         // didesnis = svarbesnis (idle limitas, ikonų tvarka)
  soundApply?: BattleSoundType
  soundTrigger?: BattleSoundType
  soundRemove?: BattleSoundType
  soundDestroy?: BattleSoundType
  negative: boolean        // ar tai neigiama būsena (ikonų/aprašų stilius)
}

export const STATUS_VFX_REGISTRY: Record<VfxStatusId, StatusVfxDefinition> = {
  shield: {
    statusId: 'shield', negative: false, priority: 100, tint: '#fcd34d',
    soundApply: 'spellCast', soundTrigger: 'impact', soundDestroy: 'freeze',
  },
  frozen: {
    statusId: 'frozen', negative: true, priority: 90, tint: '#7dd3fc',
    soundApply: 'freeze', soundTrigger: 'freeze', soundRemove: 'freeze', soundDestroy: 'freeze',
  },
  stunned: {
    statusId: 'stunned', negative: true, priority: 88, tint: '#f0b429',
    soundApply: 'impact', soundTrigger: 'impact',
  },
  burning: {
    statusId: 'burning', negative: true, priority: 85, tint: '#fb923c',
    soundApply: 'impact', soundTrigger: 'impact',
  },
  poisoned: {
    statusId: 'poisoned', negative: true, priority: 84, tint: '#4ade80',
    soundApply: 'curse', soundTrigger: 'curse',
  },
  silenced: {
    statusId: 'silenced', negative: true, priority: 80, tint: '#a78bfa',
    soundApply: 'curse',
  },
  blessed: {
    statusId: 'blessed', negative: false, priority: 75, tint: '#fde68a',
    soundApply: 'heal', soundDestroy: 'heal',
  },
  stealth: {
    statusId: 'stealth', negative: false, priority: 70, tint: '#a78bfa',
    soundRemove: 'draw',
  },
  taunt: {
    statusId: 'taunt', negative: false, priority: 60, tint: '#c9882f',
  },
  sprint: {
    statusId: 'sprint', negative: false, priority: 55, tint: '#5fae6a',
  },
  control: {
    statusId: 'control', negative: true, priority: 78, tint: '#e879f9',
    soundApply: 'curse', soundRemove: 'draw',
  },
  cantAttack: {
    statusId: 'cantAttack', negative: true, priority: 50, tint: '#94a3b8',
  },
  immortal: {
    statusId: 'immortal', negative: false, priority: 65, tint: '#f0b429',
  },
}

export const STATUS_VFX_IDS = Object.keys(STATUS_VFX_REGISTRY) as VfxStatusId[]

// ── Lokalizuoti pavadinimai/aprašai (statusEffects namespace) ────────────────
/** Statuso pavadinimas dabartine kalba. */
export function statusName(id: VfxStatusId | string): string { return t(`statusEffects.${id}.name`) }
/** Statuso taisyklių aprašas (tooltip) dabartine kalba. */
export function statusTooltip(id: VfxStatusId | string): string { return t(`statusEffects.${id}.tooltip`) }
/** Rakto forma log'o įvykiams: `$t:` prefiksą išsprendžia eventText(). */
export function statusNameRef(id: VfxStatusId | string): string { return `$t:statusEffects.${id}.name` }

// ── Kokybė + reduced motion ───────────────────────────────────────────────────
export type VfxQuality = 'low' | 'medium' | 'high'

export function getVfxQuality(): VfxQuality {
  if (typeof window === 'undefined') return 'high'
  try {
    const o = localStorage.getItem('rvn-vfx-quality')
    if (o === 'low' || o === 'medium' || o === 'high') return o
  } catch { /* */ }
  // auto: silpnesni įrenginiai → medium
  const hc = (navigator as { hardwareConcurrency?: number }).hardwareConcurrency ?? 8
  return hc <= 4 ? 'medium' : 'high'
}
export function setVfxQuality(q: VfxQuality) { try { localStorage.setItem('rvn-vfx-quality', q) } catch { /* */ } }

export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false
  try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches } catch { return false }
}

// ── Įvykių magistralė (bus) ───────────────────────────────────────────────────
type Listener = (e: StatusAnimationEvent) => void
const listeners = new Map<string, Set<Listener>>()   // cardId -> callbacks
const seenSeq = new Set<number>()                     // dedup (reconnect/dvigubas render)
let seenOrder: number[] = []

export function subscribeStatusVfx(cardId: string, cb: Listener): () => void {
  let set = listeners.get(cardId)
  if (!set) { set = new Set(); listeners.set(cardId, set) }
  set.add(cb)
  return () => { set!.delete(cb); if (set!.size === 0) listeners.delete(cardId) }
}

const soundCooldown = new Map<string, number>()

export function publishStatusVfx(e: StatusAnimationEvent): void {
  if (seenSeq.has(e.seq)) return
  seenSeq.add(e.seq); seenOrder.push(e.seq)
  if (seenOrder.length > 600) { const drop = seenOrder.splice(0, 300); for (const s of drop) seenSeq.delete(s) }
  // garsas (gerbia SFX garsumą per soundManager; cooldown, kad nesikrautų)
  const def = STATUS_VFX_REGISTRY[e.statusId]
  const snd = def && (e.type === 'apply' ? def.soundApply : e.type === 'trigger' ? def.soundTrigger : e.type === 'destroy' ? def.soundDestroy : def.soundRemove)
  if (snd) {
    const key = `${e.statusId}:${e.type}`
    const now = Date.now()
    if ((soundCooldown.get(key) ?? 0) + 450 < now) { soundCooldown.set(key, now); playBattleSound(snd, 0.3) }
  }
  listeners.get(e.cardId)?.forEach((cb) => { try { cb(e) } catch { /* */ } })
}

/** Testams/preview: leidžia pakartoti tą patį seq. */
export function __resetStatusVfxSeen(): void { seenSeq.clear(); seenOrder = [] }
