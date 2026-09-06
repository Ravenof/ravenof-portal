// ── FPS / RAM overlay (Fazė A perf matavimui ant telefono) ───────────────────
// Įjungimas: URL ?fps=1 arba localStorage rvn_fps=1. Rodo min/avg fps per 2 s
// langą ir JS heap (Chrome/WebView). Tai go/no-go matuoklis Godot klausimui:
// kovoje ant vidutinio 2022 m. Android turi laikytis ≥45 fps (tikslas 60).
export function installFpsOverlay(): void {
  let on = false
  try { on = new URLSearchParams(location.search).get('fps') === '1' || localStorage.getItem('rvn_fps') === '1' } catch { /* */ }
  if (!on) return
  const el = document.createElement('div')
  el.style.cssText = 'position:fixed;top:4px;right:4px;z-index:99999;font:12px/1.3 monospace;color:#9f9;background:rgba(0,0,0,.6);padding:4px 6px;border-radius:4px;pointer-events:none;white-space:pre'
  document.body.appendChild(el)
  let frames = 0, last = performance.now(), worst = 1000, prev = last
  const samples: number[] = []
  function tick(now: number) {
    frames++
    const dt = now - prev; prev = now
    if (dt > 0) worst = Math.min(worst, 1000 / dt)
    if (now - last >= 2000) {
      const fps = frames * 1000 / (now - last)
      samples.push(fps); if (samples.length > 30) samples.shift()
      const mem = (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory
      el.textContent = `fps ${fps.toFixed(0)}  min ${worst.toFixed(0)}\navg ${(samples.reduce((a, b) => a + b, 0) / samples.length).toFixed(0)}` + (mem ? `  heap ${(mem.usedJSHeapSize / 1048576).toFixed(0)}MB` : '')
      el.style.color = fps >= 50 ? '#9f9' : fps >= 35 ? '#fd6' : '#f66'
      frames = 0; worst = 1000; last = now
    }
    requestAnimationFrame(tick)
  }
  requestAnimationFrame(tick)
}
