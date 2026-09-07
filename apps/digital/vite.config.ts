// ── Ravenof Digital – savarankiškas app bundle'as (Vite SPA) ─────────────────
// Tie patys src/components/digital, tutorial, lib kaip Next.js /digital, bet:
//   • be serverio (jokio SSR, middleware, /api) – viskas kliente,
//   • next/link, next/navigation, next/dynamic → shim'ai ant react-router,
//   • public/ asset'ai kopijuojami į dist (failai įrenginyje),
//   • process.env.NEXT_PUBLIC_* → define iš .env.local (root).
// Build: npm run app:build → apps/digital/dist (Capacitor webDir / Electron / Cloudflare Pages).
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const here = path.dirname(fileURLToPath(import.meta.url))

/** apps/digital/media → dist/media (tools/build-media.mjs rezultatas; Vite turi vieną publicDir). */
function copyLocalMedia() {
  const src = path.resolve(here, 'media')
  return {
    name: 'ravenof-local-media',
    async closeBundle() {
      const { existsSync } = await import('node:fs')
      const { cp } = await import('node:fs/promises')
      if (!existsSync(src)) { console.warn('[ravenof] apps/digital/media nėra – media liks iš tinklo (node tools/build-media.mjs)'); return }
      await cp(src, path.resolve(here, 'dist/media'), { recursive: true })
      console.log('[ravenof] media nukopijuota į dist/media')
    },
  }
}

/** Cloudflare Pages / Netlify SPA fallback failai dist'e (Capacitor ir Electron fallback'ą daro patys). */
function spaFallbackFiles() {
  return {
    name: 'ravenof-spa-fallback',
    generateBundle(this: { emitFile: (f: { type: 'asset'; fileName: string; source: string }) => void }) {
      this.emitFile({ type: 'asset', fileName: '_redirects', source: '/*  /index.html  200\n' })
    },
  }
}
const repo = path.resolve(here, '../..')

export default defineConfig(({ mode }) => {
  // .env.local / .env iš repo šaknies (tie patys raktai kaip Next).
  const env = { ...loadEnv(mode, repo, ''), ...process.env }
  // Nenustatyti → `undefined` (ne ''), kad `A ?? B` fallback'ai (PUBLISHABLE_KEY ?? ANON_KEY) veiktų kaip Next'e.
  const pub = (k: string) => (env[k] ? JSON.stringify(env[k]) : 'undefined')
  return {
    root: here,
    // public/ (Next statiniai asset'ai: /digital, /ui3, /sounds, /cards …) + apps/digital/media (Storage kopija)
    publicDir: path.resolve(repo, 'public'),
    base: '/',
    plugins: [react(), spaFallbackFiles(), copyLocalMedia()],
    resolve: {
      alias: [
        { find: /^next\/link$/, replacement: path.resolve(here, 'shims/link.tsx') },
        { find: /^next\/navigation$/, replacement: path.resolve(here, 'shims/navigation.tsx') },
        { find: /^next\/dynamic$/, replacement: path.resolve(here, 'shims/dynamic.tsx') },
        { find: /^next\/image$/, replacement: path.resolve(here, 'shims/image.tsx') },
        { find: /^next\/headers$/, replacement: path.resolve(here, 'shims/headers.ts') },
        { find: /^next\/cache$/, replacement: path.resolve(here, 'shims/cache.ts') },
        { find: /^@\/lib\/supabase\/server$/, replacement: path.resolve(here, 'shims/supabase-server.ts') },
        { find: /^@\/lib\/i18n\/server$/, replacement: path.resolve(here, 'shims/i18n-server.ts') },
        { find: /^@\//, replacement: path.resolve(repo, 'src') + '/' },
      ],
    },
    define: {
      'process.env.NODE_ENV': JSON.stringify(mode === 'production' ? 'production' : 'development'),
      'process.env.NEXT_PUBLIC_SUPABASE_URL': pub('NEXT_PUBLIC_SUPABASE_URL'),
      'process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY': pub('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'),
      'process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY': pub('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
      'process.env.NEXT_PUBLIC_APP_URL': pub('NEXT_PUBLIC_APP_URL'),
      'process.env.NEXT_PUBLIC_AI_DEBUG': pub('NEXT_PUBLIC_AI_DEBUG'),
      'process.env.NEXT_PUBLIC_MEDIA_BASE': pub('NEXT_PUBLIC_MEDIA_BASE'),
      '__RAVENOF_APP_BUNDLE__': 'true',
    },
    build: {
      outDir: path.resolve(here, 'dist'),
      emptyOutDir: true,
      sourcemap: false,
      target: 'es2020',
      chunkSizeWarningLimit: 2500,
      rollupOptions: { output: { manualChunks: { vendor: ['react', 'react-dom', 'react-router-dom', '@supabase/supabase-js'] } } },
    },
    server: { port: 5173, fs: { allow: [repo] } },
  }
})
