// ── ŽMK engine ────────────────────────────────────────────────────────────────
// ŽMK kaladė statoma iš zmk_cards lentelės (admin valdoma). Jei DB tuščia /
// migracija nepaleista – naudojama oficiali numatytoji sudėtis (20 kortų).
// Režimas: 'auto' – modifikatorius pritaikomas automatiškai su animacija;
// 'draw' – UI rodo užverstą kortą, kurią žaidėjas atverčia pats.

import type { ZmkCardDef, ZmkMode } from './types'

export type ZmkValue = '+0' | '+1' | '-1' | '+2' | '-2' | 'x2' | 'x0'

export const DEFAULT_ZMK_DEFS: ZmkCardDef[] = [
  { id: 'def-0', name: 'Ramybė',           description: 'Žala nekinta.', value: '+0', count: 6, mode: 'auto', image_url: null, active: true, sort_order: 1 },
  { id: 'def-1', name: 'Įniršis',          description: 'Žala +1.',      value: '+1', count: 5, mode: 'auto', image_url: null, active: true, sort_order: 2 },
  { id: 'def-2', name: 'Silpnumas',        description: 'Žala −1.',      value: '-1', count: 5, mode: 'auto', image_url: null, active: true, sort_order: 3 },
  { id: 'def-3', name: 'Galios protrūkis', description: 'Žala +2.',      value: '+2', count: 1, mode: 'auto', image_url: null, active: true, sort_order: 4 },
  { id: 'def-4', name: 'Apsauga',          description: 'Žala −2.',      value: '-2', count: 1, mode: 'auto', image_url: null, active: true, sort_order: 5 },
  { id: 'def-5', name: 'Kritinis smūgis',  description: 'Žala ×2.',      value: 'x2', count: 1, mode: 'auto', image_url: null, active: true, sort_order: 6 },
  { id: 'def-6', name: 'Visiška nesėkmė',  description: 'Žala = 0.',     value: 'x0', count: 1, mode: 'auto', image_url: null, active: true, sort_order: 7 },
]

export type ZmkDeckSetup = {
  pile: ZmkValue[]
  mode: ZmkMode
  /** value -> def (pavadinimui/aprašymui UI'juje) */
  defs: Record<string, ZmkCardDef>
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/** Sukuria sumaišytą ŽMK kaladę iš admin definicijų (arba default). */
export function buildZmkDeck(defs?: ZmkCardDef[] | null): ZmkDeckSetup {
  const active = (defs && defs.length > 0 ? defs : DEFAULT_ZMK_DEFS).filter((d) => d.active)
  const source = active.length > 0 ? active : DEFAULT_ZMK_DEFS
  const pile: ZmkValue[] = []
  const byValue: Record<string, ZmkCardDef> = {}
  for (const d of source) {
    byValue[d.value] = d
    for (let i = 0; i < d.count; i++) pile.push(d.value)
  }
  const mode: ZmkMode = source.some((d) => d.mode === 'draw') ? 'draw' : 'auto'
  return { pile: shuffle(pile), mode, defs: byValue }
}

export function applyZmkValue(base: number, v: ZmkValue): number {
  switch (v) {
    case '+0': return base
    case '+1': return base + 1
    case '-1': return Math.max(0, base - 1)
    case '+2': return base + 2
    case '-2': return Math.max(0, base - 2)
    case 'x2': return base * 2
    case 'x0': return 0
  }
}

export function isZmkSpecial(v: ZmkValue): boolean {
  return v === 'x2' || v === 'x0'
}
