'use client'

import { useEffect } from 'react'

export function PWARegister() {
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!('serviceWorker' in navigator)) return

    const register = () => {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .then(() => {
          // Persistent storage: Android WebView/Chrome daug rečiau valo
          // rvn-media-v1 cache esant vietos trūkumui (offline media planas F1)
          try { void navigator.storage?.persist?.() } catch { /* enhancement only */ }
        })
        .catch(() => {
          // Silent fail — PWA is enhancement only
        })
    }

    if (document.readyState === 'complete') {
      register()
    } else {
      window.addEventListener('load', register, { once: true })
    }
  }, [])

  return null
}
