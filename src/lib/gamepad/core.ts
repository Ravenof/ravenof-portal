// ════════════════════════════════════════════════════════════════════════════
// Valdiklio (gamepad) branduolys: apklausa per Gamepad API, tipo atpažinimas
// (Xbox / PlayStation), mygtukų įvykiai su krypčių kartojimu ir „įvesties režimas"
// (valdiklis ↔ pelė/lietimas). Be React – UI sluoksnis: GamepadLayer.tsx.
// ════════════════════════════════════════════════════════════════════════════
export type PadType = 'xbox' | 'ps'
export type PadBtn = 'a' | 'b' | 'x' | 'y' | 'lb' | 'rb' | 'lt' | 'rt' | 'select' | 'start' | 'up' | 'down' | 'left' | 'right'
export type PadState = { connected: boolean; type: PadType; active: boolean }

const BTN_INDEX: [number, PadBtn][] = [[0, 'a'], [1, 'b'], [2, 'x'], [3, 'y'], [4, 'lb'], [5, 'rb'], [6, 'lt'], [7, 'rt'], [8, 'select'], [9, 'start'], [12, 'up'], [13, 'down'], [14, 'left'], [15, 'right']]
const DIRS: PadBtn[] = ['up', 'down', 'left', 'right']
const STICK = 0.55
const REPEAT_FIRST = 340
const REPEAT_NEXT = 115

let state: PadState = { connected: false, type: 'xbox', active: false }
const subs = new Set<() => void>()
const pressSubs = new Set<(b: PadBtn) => void>()
const held: Partial<Record<PadBtn, { since: number; last: number }>> = {}
let raf = 0
let started = false
let scroll = { x: 0, y: 0 }

const set = (p: Partial<PadState>) => {
  const n = { ...state, ...p }
  if (n.connected === state.connected && n.type === state.type && n.active === state.active) return
  state = n; subs.forEach((f) => f())
}

export const getPadState = (): PadState => state
export const subscribePad = (f: () => void): (() => void) => { subs.add(f); return () => { subs.delete(f) } }
export const onPadPress = (f: (b: PadBtn) => void): (() => void) => { pressSubs.add(f); return () => { pressSubs.delete(f) } }
/** Dešinės svirties vektorius slinkimui (−1…1). */
export const getPadScroll = (): { x: number; y: number } => scroll

export function detectPadType(id: string): PadType {
  const s = id.toLowerCase()
  // Xbox tikrinam PIRMA: „Xbox Wireless Controller" kitaip atitiktų PlayStation šabloną „wireless controller"
  if (/xbox|xinput|microsoft|045e/.test(s)) return 'xbox'
  if (/playstation|dualsense|dualshock|sony|054c|ps[345]\b|wireless controller/.test(s)) return 'ps'
  return 'xbox'
}

function pick(): Gamepad | null {
  let best: Gamepad | null = null
  try {
    for (const g of navigator.getGamepads?.() ?? []) {
      if (!g || !g.connected) continue
      if (!best || g.timestamp > best.timestamp) best = g
    }
  } catch { /* nepalaikoma */ }
  return best
}

function emit(b: PadBtn) {
  set({ active: true })
  pressSubs.forEach((f) => { try { f(b) } catch (e) { console.warn('[gamepad]', e) } })
}

function tick() {
  raf = requestAnimationFrame(tick)
  const g = pick()
  if (!g) { if (state.connected) set({ connected: false, active: false }); scroll = { x: 0, y: 0 }; return }
  const type = detectPadType(g.id)
  if (!state.connected || state.type !== type) set({ connected: true, type })
  const now = performance.now()
  const down: Partial<Record<PadBtn, boolean>> = {}
  for (const [i, name] of BTN_INDEX) { const b = g.buttons[i]; if (b && (b.pressed || b.value > 0.5)) down[name] = true }
  const ax = g.axes[0] ?? 0, ay = g.axes[1] ?? 0
  if (Math.abs(ax) > STICK || Math.abs(ay) > STICK) {
    if (Math.abs(ax) > Math.abs(ay)) down[ax > 0 ? 'right' : 'left'] = true
    else down[ay > 0 ? 'down' : 'up'] = true
  }
  const rx = g.axes[2] ?? 0, ry = g.axes[3] ?? 0
  scroll = { x: Math.abs(rx) > 0.25 ? rx : 0, y: Math.abs(ry) > 0.25 ? ry : 0 }
  if (scroll.x || scroll.y) set({ active: true })
  for (const [, name] of BTN_INDEX) {
    const h = held[name]
    if (down[name]) {
      if (!h) { held[name] = { since: now, last: now }; emit(name) }
      else if (DIRS.includes(name) && now - h.since > REPEAT_FIRST && now - h.last > REPEAT_NEXT) { h.last = now; emit(name) }
    } else if (h) delete held[name]
  }
}

/** Paleidžia apklausą (saugu kviesti kelis kartus). */
export function startGamepad(): void {
  if (started || typeof window === 'undefined') return
  started = true
  const kick = () => { if (!raf) raf = requestAnimationFrame(tick) }
  window.addEventListener('gamepadconnected', kick)
  window.addEventListener('gamepaddisconnected', () => { if (!pick()) set({ connected: false, active: false }) })
  // Pelė / lietimas / klaviatūra → išjungiam valdiklio režimą (tik TIKRI įvykiai, ne mūsų sintetiniai)
  const off = (e: Event) => { if (e.isTrusted && state.active) set({ active: false }) }
  let mx = 0, my = 0
  window.addEventListener('mousemove', (e) => { if (!e.isTrusted) return; if (Math.abs(e.clientX - mx) + Math.abs(e.clientY - my) > 6) { mx = e.clientX; my = e.clientY; off(e) } }, { passive: true })
  window.addEventListener('pointerdown', off, { passive: true, capture: true })
  window.addEventListener('wheel', off, { passive: true })
  if (pick()) kick()
  // Kai kurios naršyklės valdiklį „parodo" tik po pirmo paspaudimo – pasitikrinam retkarčiais
  window.setInterval(() => { if (!raf && pick()) kick() }, 1500)
}
