// ── Prakeiksmo demonas (canvas FX) ───────────────────────────────────────────
// Juodų dūmų sprogimas iš taikinio → dūmuose išryškėja demoniškas veidas (ragai
// su žarijų kontūru, žėrinčios akys, besijuokianti ugnies burna su dantimis
// viduje) → juokas (burna ritmingai atsiveria, žarijos) → veidas subyra į
// žarijas, dūmai išsisklaido. Trukmė ~2.4 s. Mastelis – nuo taikinio dydžio
// (korta / avataras / kaladė / kapinės ≈ kortos dydis; AoE / ranka – per visą
// zoną). Piešiama BattleFxLayer canvas'e (koordinatės jau padaugintos iš DPR).
//
// Naudojimas: fx.spawn({ kind:'curseDemon', to:{x,y}, rect:{x,y,w,h}, color:'#a855f7', duration:2.4 })

type Puff = { x: number; y: number; vx: number; vy: number; r: number; life: number; max: number; rot: number; vr: number; a: number; sp: number; ph: number }
type Ember = { x: number; y: number; vx: number; vy: number; r: number; life: number; max: number; k: number }
type State = { puffs: Puff[]; embers: Ember[]; last: number; seeded: boolean }

export type DemonItem = {
  to: { x: number; y: number }
  rect?: { x: number; y: number; w: number; h: number }
  dur: number
}

const rnd = (a: number, b: number) => a + Math.random() * (b - a)
const states = new WeakMap<object, State>()

// ── sprite'ai (kuriami vieną kartą, lazily – tik naršyklėje) ────────────────
let sprites: { smoke: HTMLCanvasElement[]; fire: HTMLCanvasElement[] } | null = null
function puffSprite(inner: string, mid: string, outer: string) {
  const c = document.createElement('canvas'); c.width = c.height = 128
  const g = c.getContext('2d')!
  for (let k = 0; k < 5; k++) {
    const ox = 64 + Math.cos(k * 2.1) * 18, oy = 64 + Math.sin(k * 2.1) * 18, rr = 34 + (k % 2) * 10
    const r = g.createRadialGradient(ox, oy, 2, ox, oy, rr)
    r.addColorStop(0, inner); r.addColorStop(0.5, mid); r.addColorStop(1, outer)
    g.fillStyle = r; g.fillRect(0, 0, 128, 128)
  }
  return c
}
function glowSprite(col: string) {
  const c = document.createElement('canvas'); c.width = c.height = 64
  const g = c.getContext('2d')!
  const r = g.createRadialGradient(32, 32, 1, 32, 32, 32)
  r.addColorStop(0, col + '1)'); r.addColorStop(0.35, col + '.55)'); r.addColorStop(1, col + '0)')
  g.fillStyle = r; g.fillRect(0, 0, 64, 64)
  return c
}
function getSprites() {
  if (sprites) return sprites
  const dark = puffSprite('rgba(16,10,22,.95)', 'rgba(12,8,18,.55)', 'rgba(8,4,12,0)')
  const mid = puffSprite('rgba(46,34,58,.85)', 'rgba(30,22,40,.45)', 'rgba(20,14,28,0)')
  const lit = puffSprite('rgba(120,70,120,.55)', 'rgba(70,40,80,.25)', 'rgba(40,20,50,0)')
  sprites = {
    smoke: [dark, dark, dark, mid, mid, lit],
    // 0 oranžinė, 1 geltona, 2 raudona, 3 violetinė
    fire: [glowSprite('rgba(255,120,30,'), glowSprite('rgba(255,210,90,'), glowSprite('rgba(200,30,20,'), glowSprite('rgba(150,60,220,')],
  }
  return sprites
}

/** Mastelis nuo taikinio dydžio (D – DPR). Korta ≈ 1, avataras ≈ 0.9, AoE ≈ 2+. */
function scaleOf(it: DemonItem, D: number) {
  const w = it.rect?.w ?? 120 * D, h = it.rect?.h ?? 160 * D
  return Math.max(0.85, Math.min(2.6, Math.max(w, h) / (150 * D))) * D
}

export function drawCurseDemon(ctx: CanvasRenderingContext2D, it: DemonItem, p: number, D: number, now: number) {
  const S = getSprites()
  let st = states.get(it)
  if (!st) { st = { puffs: [], embers: [], last: now, seeded: false }; states.set(it, st) }
  const dt = Math.min(0.05, Math.max(0, (now - st.last) / 1000)); st.last = now
  const t = p * (it.dur / 1000)                         // sekundės nuo pradžios
  const s = scaleOf(it, D)                              // mastelis (jau su DPR)
  const cx = it.to.x, cy = it.to.y
  const rw = it.rect?.w ?? 120 * D, rh = it.rect?.h ?? 160 * D
  const wide = rw > rh * 1.6                            // AoE / ranka – dūmai per visą plotį

  // ── pradinis sprogimas ──
  if (!st.seeded) {
    st.seeded = true
    const n = Math.round(120 * (s / D))
    for (let i = 0; i < n; i++) {
      const a = rnd(0, Math.PI * 2), sp = rnd(20, 140) * s
      const ex = wide ? rnd(-rw / 2, rw / 2) : rnd(-rw * 0.3, rw * 0.3), ey = rnd(-rh * 0.3, rh * 0.3)
      st.puffs.push({ x: cx + ex, y: cy + ey, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 30 * s, r: rnd(22, 64) * s, life: 0, max: rnd(1.6, 2.6), rot: rnd(0, 6.3), vr: rnd(-1.2, 1.2), a: rnd(0.6, 1), sp: Math.floor(Math.random() * 6), ph: rnd(0, 6.3) })
    }
  }
  // ── pastovus dūmų papildymas kol veidas gyvas ──
  if (t < 1.9) for (let i = 0; i < 3 * (s / D); i++) {
    st.puffs.push({ x: cx + rnd(-rw * 0.35, rw * 0.35), y: cy + rnd(-rh * 0.2, rh * 0.3), vx: rnd(-25, 25) * s, vy: rnd(-70, -20) * s, r: rnd(20, 54) * s, life: 0, max: rnd(1.2, 2), rot: rnd(0, 6.3), vr: rnd(-1.2, 1.2), a: rnd(0.5, 0.9), sp: Math.floor(Math.random() * 6), ph: rnd(0, 6.3) })
  }

  ctx.save()
  // ── tamsi vinjetė ant taikinio ──
  ctx.globalCompositeOperation = 'source-over'
  const v = Math.min(1, t / 0.3) * (1 - Math.max(0, (t - 2) / 0.5))
  if (v > 0) {
    const g = ctx.createRadialGradient(cx, cy, 10 * D, cx, cy, Math.max(rw, rh) * 1.1)
    g.addColorStop(0, `rgba(60,10,40,${0.55 * v})`); g.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = g; ctx.fillRect(cx - rw * 2, cy - rh * 2, rw * 4, rh * 4)
  }
  // ── dūmai ──
  st.puffs = st.puffs.filter((q) => (q.life += dt) < q.max)
  for (const q of st.puffs) {
    q.vx += Math.sin(q.y * 0.02 / D + q.ph + q.life * 2) * 60 * s * dt; q.vy -= 26 * s * dt
    q.vx *= (1 - 1.3 * dt); q.vy *= (1 - 0.8 * dt); q.x += q.vx * dt; q.y += q.vy * dt; q.rot += q.vr * dt
    const k = q.life / q.max, a = q.a * (k < 0.12 ? k / 0.12 : 1 - (k - 0.12) / 0.88), r = q.r * (1 + k * 1.5)
    ctx.save(); ctx.globalAlpha = Math.max(0, a); ctx.translate(q.x, q.y); ctx.rotate(q.rot); ctx.drawImage(S.smoke[q.sp], -r, -r, r * 2, r * 2); ctx.restore()
  }
  // ── violetinis „rim light" dūmuose ──
  ctx.globalCompositeOperation = 'lighter'
  const rl = Math.min(1, t / 0.4) * (1 - Math.max(0, (t - 2.1) / 0.4))
  if (rl > 0) { ctx.globalAlpha = 0.22 * rl; ctx.drawImage(S.fire[3], cx - 90 * s, cy - 90 * s, 180 * s, 180 * s); ctx.globalAlpha = 1 }
  ctx.globalCompositeOperation = 'source-over'

  // ── veidas ──
  drawFace(ctx, st, S, t, s, cx, cy, D)

  // ── žarijos ──
  ctx.globalCompositeOperation = 'lighter'
  st.embers = st.embers.filter((q) => (q.life += dt) < q.max)
  for (const q of st.embers) {
    q.vy += 60 * s * dt; q.x += q.vx * dt; q.y += q.vy * dt
    const k = 1 - q.life / q.max, r = q.r * (0.6 + k)
    ctx.globalAlpha = Math.max(0, k); ctx.drawImage(S.fire[q.k], q.x - r, q.y - r, r * 2, r * 2)
  }
  ctx.globalAlpha = 1
  ctx.restore()
}

function drawFace(ctx: CanvasRenderingContext2D, st: State, S: NonNullable<typeof sprites>, t: number, s: number, cx0: number, cy0: number, D: number) {
  const appear = Math.min(1, Math.max(0, (t - 0.45) / 0.5))
  const vanish = Math.max(0, Math.min(1, (t - 1.95) / 0.45))
  const alpha = appear * (1 - vanish)
  if (alpha <= 0) return
  const cx = cx0, cy = cy0 - 10 * s
  const laugh = t > 0.9 && t < 1.95
  const lp = laugh ? (Math.sin((t - 0.9) * 22) * 0.5 + 0.5) : 0
  const jitter = laugh ? Math.sin(t * 60) * 1.6 * s : 0
  ctx.save()
  ctx.translate(cx + jitter, cy + (laugh ? Math.sin(t * 40) * 1.2 * s : 0))
  const grow = 0.7 + 0.3 * appear + vanish * 0.25
  ctx.scale(grow, grow)
  ctx.globalAlpha = alpha
  ctx.globalCompositeOperation = 'source-over'
  // ragai
  for (const side of [-1, 1]) {
    ctx.beginPath()
    ctx.moveTo(side * 40 * s, -34 * s)
    ctx.quadraticCurveTo(side * 74 * s, -54 * s, side * 70 * s, -112 * s)
    ctx.quadraticCurveTo(side * 52 * s, -70 * s, side * 24 * s, -52 * s)
    ctx.closePath()
    ctx.fillStyle = '#07050a'; ctx.fill()
    ctx.lineWidth = 2 * s; ctx.strokeStyle = `rgba(255,90,30,${0.55 * alpha})`; ctx.shadowColor = 'rgba(255,110,30,.9)'; ctx.shadowBlur = 14 * s; ctx.stroke()
    ctx.shadowBlur = 0
  }
  // akys
  const blink = (Math.sin(t * 9) > 0.96) ? 0.15 : 1
  for (const side of [-1, 1]) {
    const ex = side * 30 * s, ey = -30 * s
    ctx.globalCompositeOperation = 'lighter'
    ctx.drawImage(S.fire[2], ex - 42 * s, ey - 42 * s, 84 * s, 84 * s)
    ctx.drawImage(S.fire[0], ex - 28 * s, ey - 28 * s, 56 * s, 56 * s)
    ctx.globalCompositeOperation = 'source-over'
    ctx.beginPath()
    ctx.moveTo(ex - 22 * s, ey + 3 * s)
    ctx.quadraticCurveTo(ex, ey - 22 * s * blink, ex + 22 * s, ey - 9 * s * side * -1)
    ctx.quadraticCurveTo(ex, ey + 13 * s * blink, ex - 22 * s, ey + 3 * s)
    const g = ctx.createRadialGradient(ex, ey, 1, ex, ey, 22 * s); g.addColorStop(0, '#fff3b0'); g.addColorStop(0.35, '#ffb347'); g.addColorStop(1, '#c8300f')
    ctx.fillStyle = g; ctx.shadowColor = '#ff8a2a'; ctx.shadowBlur = 22 * s; ctx.fill(); ctx.shadowBlur = 0
    ctx.beginPath(); ctx.ellipse(ex + side * 3 * s, ey - 3 * s, 3 * s, 11 * s * blink, 0, 0, Math.PI * 2); ctx.fillStyle = '#1a0608'; ctx.fill()
  }
  // burna (ugnies šypsena)
  const mw = 56 * s, open = 14 * s + lp * 22 * s
  const mouthPath = (o: number) => { ctx.beginPath(); ctx.moveTo(-mw, 8 * s); ctx.quadraticCurveTo(0, 22 * s, mw, 8 * s); ctx.quadraticCurveTo(0, 40 * s + o, -mw, 8 * s); ctx.closePath() }
  mouthPath(open)
  const mg = ctx.createLinearGradient(0, 8 * s, 0, 40 * s); mg.addColorStop(0, '#ffe08a'); mg.addColorStop(0.5, '#ff7a1a'); mg.addColorStop(1, '#8a1208')
  ctx.fillStyle = mg; ctx.shadowColor = '#ff6a10'; ctx.shadowBlur = 26 * s; ctx.fill(); ctx.shadowBlur = 0
  // dantys – burnos viduje (apkarpyti burnos forma)
  ctx.save(); mouthPath(open); ctx.clip()
  const topY = (x: number) => { const tt = (x + mw) / (2 * mw); return (1 - tt) ** 2 * 8 * s + 2 * (1 - tt) * tt * 22 * s + tt * tt * 8 * s }
  const botY = (x: number) => { const tt = (x + mw) / (2 * mw); return (1 - tt) ** 2 * 8 * s + 2 * (1 - tt) * tt * (40 * s + open) + tt * tt * 8 * s }
  ctx.fillStyle = '#12070a'
  for (let i = -5; i <= 5; i++) {
    const x = i * 10 * s, len = (7 + (1 - Math.abs(i) / 5) * 5) * s
    const ty = topY(x) - 1; ctx.beginPath(); ctx.moveTo(x - 4 * s, ty); ctx.lineTo(x + 4 * s, ty); ctx.lineTo(x, ty + len); ctx.closePath(); ctx.fill()
    if (open > 20 * s) { const by = botY(x) + 1; ctx.beginPath(); ctx.moveTo(x - 3 * s, by); ctx.lineTo(x + 3 * s, by); ctx.lineTo(x + 5 * s, by - len * 0.6); ctx.closePath(); ctx.fill() }
  }
  ctx.restore()
  // žarijos iš burnos (juokiantis) – absoliučiose koordinatėse
  if (laugh && Math.random() < 0.9) for (let k = 0; k < 3; k++) st.embers.push({ x: cx + rnd(-mw * 0.7, mw * 0.7) * grow, y: cy + 34 * s, vx: rnd(-40, 40) * s, vy: rnd(-160, -60) * s, r: rnd(3, 7) * s, life: 0, max: rnd(0.5, 1), k: Math.random() < 0.5 ? 0 : 1 })
  // subyrėjimas – žarijos iš viso veido
  if (vanish > 0 && vanish < 1 && Math.random() < 0.9) for (let k = 0; k < 6; k++) st.embers.push({ x: cx + rnd(-50, 50) * s, y: cy + rnd(-90, 30) * s, vx: rnd(-90, 90) * s, vy: rnd(-140, 20) * s, r: rnd(2, 6) * s, life: 0, max: rnd(0.4, 0.9), k: Math.random() < 0.3 ? 3 : 2 })
  ctx.restore()
  void D
}
