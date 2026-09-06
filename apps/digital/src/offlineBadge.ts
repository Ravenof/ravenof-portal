// ── „Nėra ryšio" ženkliukas + sync eilės skaitiklis (DOM, be React) ──────────
import { onQueueChange, queueLength } from '@/lib/offline/offlineFetch'

export function installOfflineBadge(): void {
  const el = document.createElement('div')
  el.style.cssText = 'position:fixed;left:50%;bottom:6px;transform:translateX(-50%);z-index:99998;font:600 11px/1 Inter,system-ui,sans-serif;letter-spacing:.06em;text-transform:uppercase;color:#e8e0d2;background:rgba(20,17,15,.85);border:1px solid rgba(201,162,74,.5);padding:5px 10px;border-radius:999px;pointer-events:none;display:none'
  document.body.appendChild(el)
  let queued = 0
  const render = () => {
    const off = navigator.onLine === false
    if (!off && queued === 0) { el.style.display = 'none'; return }
    el.textContent = off ? (queued ? `Be ryšio · ${queued} laukia sinchronizacijos` : 'Be ryšio – žaidi vietoje') : `Sinchronizuojama · ${queued}`
    el.style.display = 'block'
  }
  window.addEventListener('online', render); window.addEventListener('offline', render)
  onQueueChange((n) => { queued = n; render() })
  queueLength().then((n) => { queued = n; render() })
}
