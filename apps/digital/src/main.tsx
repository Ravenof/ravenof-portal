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
import App from './App'
import { installAppBundleRuntime } from './runtime'

installAppBundleRuntime().finally(() => {
  createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>)
})
