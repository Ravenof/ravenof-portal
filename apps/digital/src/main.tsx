import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Self-hosted šriftai (next/font/google pakaitalas) – offline veikia be tinklo.
import '@fontsource/cinzel/400.css'
import '@fontsource/cinzel/600.css'
import '@fontsource/cinzel/700.css'
import '@fontsource/inter/400.css'
import '@fontsource/inter/500.css'
import '@fontsource/inter/600.css'
import '@fontsource/inter/700.css'
import '@/app/globals.css'
import '@/styles/cursors.css'
import App from './App'
import { AppErrorBoundary } from './ErrorBoundary'
import { installAppBundleRuntime } from './runtime'
import { Splash } from './Splash'
import { UpdateLayer } from './UpdateLayer'

// Žaidimo žymekliai tik pelės aplinkoje. Electron shell'e – visada; kitur – kai media
// query sako „pelė" ARBA kai gaunam pirmą pelės pointer įvykį (jutikliniai nešiojamieji
// dažnai praneša pointer:coarse, nors naudojama pelė). Lietimo įvykis – nuima.
{
  const root = document.documentElement
  const on = () => root.classList.add('rvn-cursors')
  const off = () => root.classList.remove('rvn-cursors')
  if ((window as unknown as { ravenofDesktop?: unknown }).ravenofDesktop || window.matchMedia?.('(hover: hover) and (pointer: fine)').matches) on()
  window.addEventListener('pointermove', (e) => { if (e.pointerType === 'mouse') on() }, { passive: true })
  window.addEventListener('pointerdown', (e) => { if (e.pointerType === 'touch') off() }, { passive: true })
}

installAppBundleRuntime().finally(() => {
  createRoot(document.getElementById('root')!).render(<StrictMode><AppErrorBoundary><App /></AppErrorBoundary><UpdateLayer /><Splash /></StrictMode>)
})
