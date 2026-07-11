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
  name: string             // lokalizuotas pavadinimas
  tooltip: string          // TIKROS žaidimo taisyklės (LT)
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
    statusId: 'shield', name: 'Magiškasis skydas', negative: false, priority: 100, tint: '#fcd34d',
    tooltip: 'Anuliuoja VISĄ vienos atakos ar efekto žalą, tada dingsta. ŽMK netraukiama.',
    soundApply: 'spellCast', soundTrigger: 'impact', soundDestroy: 'freeze',
  },
  frozen: {
    statusId: 'frozen', name: 'Sušaldytas', negative: true, priority: 90, tint: '#7dd3fc',
    tooltip: 'Negali atakuoti ir nedaro atgalinės žalos. Būsena baigiasi savininko kito ėjimo pradžioje.',
    soundApply: 'freeze', soundTrigger: 'freeze', soundRemove: 'freeze', soundDestroy: 'freeze',
  },
  stunned: {
    statusId: 'stunned', name: 'Apsvaigintas', negative: true, priority: 88, tint: '#f0b429',
    tooltip: 'Negali atakuoti. Būsena baigiasi savininko kito ėjimo pradžioje.',
    soundApply: 'impact', soundTrigger: 'impact',
  },
  burning: {
    statusId: 'burning', name: 'Degantis', negative: true, priority: 85, tint: '#fb923c',
    tooltip: 'Savininko ėjimo pradžioje gauna 1 bazinę žalą. Lieka, kol pašalins efektas.',
    soundApply: 'impact', soundTrigger: 'impact',
  },
  poisoned: {
    statusId: 'poisoned', name: 'Apnuodytas', negative: true, priority: 84, tint: '#4ade80',
    tooltip: 'Savininko ėjimo pradžioje gauna 1 bazinę žalą; atakuoja nepalankiai (ŽMK). Lieka, kol pašalins efektas.',
    soundApply: 'curse', soundTrigger: 'curse',
  },
  silenced: {
    statusId: 'silenced', name: 'Nutildytas', negative: true, priority: 80, tint: '#a78bfa',
    tooltip: 'Praranda VISUS efektus, raktažodžius ir sustiprinimus — statai grįžta į bazinę kortą. Negrįžtama.',
    soundApply: 'curse',
  },
  blessed: {
    statusId: 'blessed', name: 'Palaimintas', negative: false, priority: 75, tint: '#fde68a',
    tooltip: 'Kita šio padaro ataka palanki (advantage) — traukiamos 2 ŽMK, naudojama geresnė. Panaudojama atakuojant.',
    soundApply: 'heal', soundDestroy: 'heal',
  },
  stealth: {
    statusId: 'stealth', name: 'Sėlinimas', negative: false, priority: 70, tint: '#a78bfa',
    tooltip: 'Priešas negali šio padaro taikytis, kol jis pats neatakuoja.',
    soundRemove: 'draw',
  },
  taunt: {
    statusId: 'taunt', name: 'Pasišaipymas', negative: false, priority: 60, tint: '#c9882f',
    tooltip: 'Priešo padarai privalo pulti šį padarą pirmiau.',
  },
  sprint: {
    statusId: 'sprint', name: 'Sprintas', negative: false, priority: 55, tint: '#5fae6a',
    tooltip: 'Gali atakuoti iškart iškvietimo ėjimą.',
  },
  control: {
    statusId: 'control', name: 'Perimta kontrolė', negative: true, priority: 78, tint: '#e879f9',
    tooltip: 'Padarą laikinai valdo priešininkas. Pasibaigus trukmei grįžta savininkui.',
    soundApply: 'curse', soundRemove: 'draw',
  },
  cantAttack: {
    statusId: 'cantAttack', name: 'Negali atakuoti', negative: true, priority: 50, tint: '#94a3b8',
    tooltip: 'Aura neleidžia šiam padarui atakuoti, kol auros šaltinis lauke.',
  },
  immortal: {
    statusId: 'immortal', name: 'Nemirtingas', negative: false, priority: 65, tint: '#f0b429',
    tooltip: 'Negali žūti — HP nekrenta žemiau 1, kol auros šaltinis lauke.',
  },
}

export const STATUS_VFX_IDS = Object.keys(STATUS_VFX_REGISTRY) as VfxStatusId[]

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
