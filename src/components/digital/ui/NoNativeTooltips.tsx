'use client'

// Narsykles "title" uzuominos (baltos lenteles uzvedus pele) gadina zaidimo atmosfera.
// Uzvedus pele title perkeliamas i aria-label (prieinamumui) ir pasalinamas, kad lentele neissoktu.
import { useEffect } from 'react'

export function NoNativeTooltips() {
  useEffect(() => {
    const strip = (e: Event) => {
      let el = e.target as Element | null
      while (el && el.nodeType === 1) {
        if (el.hasAttribute('title')) {
          const v = el.getAttribute('title') || ''
          if (v && !el.hasAttribute('aria-label') && !el.hasAttribute('aria-labelledby')) el.setAttribute('aria-label', v)
          el.removeAttribute('title')
        }
        el = el.parentElement
      }
    }
    document.addEventListener('mouseover', strip, true)
    document.addEventListener('focusin', strip, true)
    return () => { document.removeEventListener('mouseover', strip, true); document.removeEventListener('focusin', strip, true) }
  }, [])
  return null
}
