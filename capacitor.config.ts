import type { CapacitorConfig } from '@capacitor/cli'

/**
 * Ravenof – Android/iOS (Capacitor) konfigūracija. DU režimai:
 *
 * 1) REMOTE (numatytasis, kaip iki šiol): native shell užkrauna gyvą Vercel
 *    svetainę /digital. `webDir` – mažas mobile-shell/ (loading/offline fallback).
 *
 * 2) LOCAL-FIRST (RAVENOF_NATIVE=local): visas žaidimas ir asset'ai įrenginyje –
 *    `webDir` = apps/digital/dist (Vite bundle'as, žr. apps/digital/vite.config.ts
 *    ir tools/build-media.mjs). Jokio server.url; tinklas tik Supabase (auth,
 *    sync, PvP). Perjungiama TIK env kintamuoju, tad senas build'as nepakinta:
 *      set RAVENOF_NATIVE=local && npx cap sync android     (build-apk-local.bat)
 */
const LOCAL = process.env.RAVENOF_NATIVE === 'local'

const config: CapacitorConfig = {
  appId: 'app.ravenof.game',
  appName: 'Ravenof',
  webDir: LOCAL ? 'apps/digital/dist' : 'mobile-shell',
  server: LOCAL
    ? {
        // Vietinis bundle'as per https://localhost (secure context: SW, IndexedDB, cookies).
        androidScheme: 'https',
        allowNavigation: ['*.supabase.co'],
      }
    : {
        // Appas atsidaro tiesiai žaidimo dalyje
        url: 'https://ravenof-portal-v1g9.vercel.app/digital',
        androidScheme: 'https',
        // Šie domenai kraunami VIDUJE webview. Bet kas kitas (Discord, soc. tinklai,
        // išorinės nuorodos) atsidaro sistemos naršyklėje, ne appe.
        allowNavigation: [
          'ravenof-portal-v1g9.vercel.app',
          '*.supabase.co',
        ],
      },
  android: {
    backgroundColor: '#0A0A0F',
  },
  ios: {
    // Service worker (rvn-media-v1 HD cache) WKWebView'e veikia tik su app-bound domains.
    limitsNavigationsToAppBoundDomains: LOCAL,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1200,
      backgroundColor: '#0A0A0F',
      showSpinner: false,
      androidScaleType: 'CENTER_CROP',
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#0A0A0F',
    },
  },
}

export default config
