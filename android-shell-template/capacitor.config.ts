import type { CapacitorConfig } from '@capacitor/cli'

/**
 * Ravenof – Android (Capacitor) konfigūracija.
 *
 * Strategija: REMOTE URL (server mode).
 * Native shell užkrauna gyvą Vercel deployintą svetainę ir startuoja tiesiai
 * /digital ekrane. SSR / Supabase auth / admin / kortų editinimas veikia
 * nepakeisti, nes tai ta pati gyva svetainė. Web pakeitimai matosi appe iškart,
 * be re-publish Google Play.
 *
 * webDir rodo į mažą `mobile-shell/` (loading/offline fallback), kad APK
 * nebūtų išpūstas kopijuojant visą /public.
 */
const config: CapacitorConfig = {
  appId: 'app.ravenof.game',
  appName: 'Ravenof',
  webDir: 'mobile-shell',
  server: {
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
