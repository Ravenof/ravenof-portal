// ── FPS / RAM / klaidų overlay (Fazė A perf ir asset'ų diagnostikai telefone) ──
// Įjungimas: URL ?fps=1 arba localStorage rvn_fps=1. Rodo min/avg fps per 2 s
// langą, JS heap (Chrome/WebView) ir paskutinius NEPAVYKUSIUS resursus (img/audio/
// video/script/css) – be USB debugging'o. Tikslas kovoje: ≥45 fps (siekis 60).
/** Slaptas jungiklis telefone (be DevTools): 5 bakstelėjimai per 2 s viršutiniame kairiame kampe (80×80 px) → įjungia/išjungia overlay ir perkrauna. */
function installSecretToggle(): void {
  let taps: number[] = []
  window.addEventListener('pointerdown', (e) => {
    if (e.clientX > 80 || e.clientY > 80) return
    const now = Date.now()
    taps = [...taps.filter((t) => now - t < 2000), now]
    if (taps.length >= 5) {
      taps = []
      try { const cur = localStorage.getItem('rvn_fps') === '1'; localStorage.setItem('rvn_fps', cur ? '0' : '1') } catch { /* */ }
      location.reload()
    }
  }, true)
}

export function installFpsOverlay(): void {
  installSecretToggle()
  let on = false
  try { on = new URLSearchParams(location.search).get('fps') === '1' || localStorage.getItem('rvn_fps') === '1' } catch { /* */ }
  if (!on) return
  const el = document.createElement('div')
  el.style.cssText = 'position:fixed;top:4px;right:4px;z-index:99999;font:11px/1.3 monospace;color:#9f9;background:rgba(0,0,0,.7);padding:4px 6px;border-radius:4px;pointer-events:none;white-space:pre;max-width:60vw;overflow:hidden'
  document.body.appendChild(el)
  const failed: string[] = []
  // Resursų klaidos neburbuliuoja – gaudom capture fazėje.
  window.addEventListener('error', (e) => {
    const t = e.target as HTMLElement | null
    if (!t || t === (window as unknown as HTMLElement)) return
    const src = (t as HTMLImageElement).currentSrc || (t as HTMLImageElement).src || (t as HTMLLinkElement).href || ''
    if (!src) return
    const short = src.replace(location.origin, '').slice(0, 90)
    if (!failed.includes(short)) { failed.push(short); if (failed.length > 5) failed.shift() }
    console.warn('[ravenof] resursas nepavyko:', t.tagName, src)
  }, true)
  let frames = 0, last = performance.now(), worst = 1000, prev = last
  const samples: number[] = []
  let statLine = ''
  const render = () => { el.textContent = statLine + (failed.length ? '\n✗ ' + failed.join('\n✗ ') : '') }
  function tick(now: number) {
    frames++
    const dt = now - prev; prev = now
    if (dt > 0) worst = Math.min(worst, 1000 / dt)
    if (now - last >= 2000) {
      const fps = frames * 1000 / (now - last)
      samples.push(fps); if (samples.length > 30) samples.shift()
      const mem = (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory
      statLine = `fps ${fps.toFixed(0)}  min ${worst.toFixed(0)}  avg ${(samples.reduce((a, b) => a + b, 0) / samples.length).toFixed(0)}` + (mem ? `  heap ${(mem.usedJSHeapSize / 1048576).toFixed(0)}MB` : '') + `  ${navigator.onLine ? 'online' : 'OFFLINE'}`
      el.style.color = fps >= 50 ? '#9f9' : fps >= 35 ? '#fd6' : '#f66'
      render()
      frames = 0; worst = 1000; last = now
    }
    requestAnimationFrame(tick)
  }
  requestAnimationFrame(tick)
}
