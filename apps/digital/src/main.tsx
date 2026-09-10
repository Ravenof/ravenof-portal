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

// Žaidimo žymekliai tik pelės aplinkoje (desktop); lietimui – nereikšminga.
if (window.matchMedia?.('(hover: hover) and (pointer: fine)').matches) document.documentElement.classList.add('rvn-cursors')

installAppBundleRuntime().finally(() => {
  createRoot(document.getElementById('root')!).render(<StrictMode><AppErrorBoundary><App /></AppErrorBoundary></StrictMode>)
})
