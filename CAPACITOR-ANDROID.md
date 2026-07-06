# Ravenof → Android (Capacitor) — pilna instrukcija

Strategija: **Remote URL**. Native Android shell užkrauna gyvą Vercel svetainę ir
startuoja tiesiai `/digital`. SSR, Supabase auth, admin panelė ir kortų editinimas
veikia nepakeisti — tai ta pati gyva svetainė. Web pakeitimai matosi appe **iškart**,
be naujo Play Store submit (re-publish reikia tik kai keiti native dalį arba versiją).

Konfigūruotas domenas: `https://ravenof-portal-v1g9.vercel.app/digital`
(keisti — `capacitor.config.ts`, laukas `server.url` + `allowNavigation`).

---

## 0. Reikalavimai (vienkartinis setup)

- **Node.js 20+** (jau turi)
- **Android Studio** (naujausia, su Android SDK) — https://developer.android.com/studio
- **JDK 21** (ateina su naujausia Android Studio)
- **Google Play Developer** paskyra — $25 vienkartinis mokestis, https://play.google.com/console

---

## 1. Sugeneruoti Android projektą

`ravenof-portal` kataloge paleisk (dukart spustelėk):

```
setup-capacitor.bat
```

Tai padaro: `npm install` → `npx cap add android` (sukuria `android\` katalogą) → `npx cap sync`.

Tada atidaryk Android Studio:

```
npx cap open android
```

> Pirmą kartą Android Studio atsisiųs Gradle ir SDK komponentus — palik kelioms minutėms.

---

## 2. App ikonos ir splash

Greičiausias būdas — `@capacitor/assets`:

```
npm i -D @capacitor/assets
```

Įdėk į `assets/` (projekto šaknyje):
- `icon.png` (1024×1024)
- `splash.png` (2732×2732, logo centre, fonas #0A0A0F)

Tada:

```
npx capacitor-assets generate --android
```

Sugeneruos visus reikiamus dydžius automatiškai.

---

## 3. Paleisti ant telefono (testas)

1. Telefone įjunk **Developer options → USB debugging**, prijunk per USB.
2. Android Studio viršuje pasirink savo įrenginį → spausk ▶ **Run**.
3. Appas atsidarys tiesiai `/digital`. Patikrink: prisijungimą, pakų atidarymą,
   PvP, garsus, kortų peržiūrą.

---

## 4. Pasirašytas AAB (Google Play reikalauja .aab, ne .apk)

### 4a. Sukurk keystore (vienkartinis — NEPRARASK jo!)

Android Studio: **Build → Generate Signed App Bundle / APK → Android App Bundle → Create new…**

Arba terminale:
```
keytool -genkey -v -keystore ravenof-release.keystore -alias ravenof -keyalg RSA -keysize 2048 -validity 10000
```

> ⚠️ Šį `.keystore` failą ir slaptažodžius saugok atsargiai ir DARYK backup.
> Pametęs negalėsi atnaujinti appo Play Store — tektų leisti naują appą iš nulio.
> NEDĖK keystore į git.

### 4b. Build

**Build → Generate Signed App Bundle / APK → Android App Bundle** → pasirink keystore →
**release** → Finish. Gausi `app-release.aab` (`android/app/release/`).

---

## 5. Google Play Console

1. https://play.google.com/console → **Create app**.
2. Užpildyk: pavadinimą, aprašymą, kategoriją (Games → Card), screenshotus, feature graphic.
3. **Privacy policy URL** — privaloma (gali būti paprastas puslapis tavo svetainėje).
4. **Data safety** anketa — deklaruok ką renka Supabase (email, žaidimo duomenys).
5. **Content rating** anketa.
6. **Internal testing** track → įkelk `.aab` → pridėk savo email kaip testerį →
   išbandyk per Play prieš pateikiant **Production** review.

Pirmas review trunka kelias dienas. Nauja Google taisyklė reikalauja **closed testing
su ~12 testerių 14 dienų** prieš production (individual developer paskyroms) — pasitikrink
aktualų reikalavimą Console, nes Google jį periodiškai keičia.

---

## 6. ⚠️ SVARBU: In-App Purchases (boosteriai, cosmetics, season pass)

Jei **Android appe parduosi skaitmenines prekes už realius pinigus**, Google reikalauja
naudoti **Google Play Billing** ir paima **15–30%** komisijos. Negalima nukreipti į išorinį
checkout (Stripe ir pan.) skaitmeninėms prekėms — appą atmes.

Variantai:
- **Saugiausia pradžiai:** appe NEPARDAVINĖK už pinigus. Boosteriai/cosmetics tik už
  in-game valiutą, uždirbamą žaidžiant. Tada IAP taisyklės negalioja.
- **Jei nori realių pirkimų:** integruok `@capacitor/google-play-billing` arba RevenueCat,
  įvesk Play Billing. Daugiau darbo + komisija.

Web (browser) versijoje šios taisyklės negalioja — ten gali turėti savo checkout.

---

## 7. Kaip „užrakinti" tik /digital (nebūtina)

Remote-mode appas atsidaro `/digital`, bet techniškai vartotojas gali nukeliauti į kitas
to paties domeno sekcijas (kolekciją, marketą) per in-app nuorodas. Jei nori griežtai
palikti tik žaidimą, paslėpk kryžmines nuorodas, kai veikia native appe. Web kode
(pvz. `/digital` layout'e) naudok Capacitor detekciją:

```ts
import { Capacitor } from '@capacitor/core'
const isApp = Capacitor.isNativePlatform()
// {!isApp && <NuorodaIMarketa/>}  — rodyk tik web'e
```

`isApp` true tik Android appe → galima slėpti nereikalingas nuorodas ar header'į.

---

## 8. Native „value" (kad Play nepalaikytų grynu webview wrapper)

Įdiegti pluginai jau prideda splash + status bar. Stipriau — įdėk hardware back mygtuko
valdymą ir haptics (vibracija metant kortą). Sukurk client komponentą ir įdėk į
`/digital` layout'ą:

```tsx
'use client'
import { useEffect } from 'react'
import { Capacitor } from '@capacitor/core'

export function NativeBridge() {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return
    let cleanup = () => {}
    ;(async () => {
      const { App } = await import('@capacitor/app')
      const sub = await App.addListener('backButton', ({ canGoBack }) => {
        if (canGoBack) history.back()
        else App.exitApp()
      })
      cleanup = () => sub.remove()
    })()
    return () => cleanup()
  }, [])
  return null
}
```

Haptics metant kortą (web kode kur leidžiama korta):
```ts
import { Capacitor } from '@capacitor/core'
if (Capacitor.isNativePlatform()) {
  const { Haptics, ImpactStyle } = await import('@capacitor/haptics')
  Haptics.impact({ style: ImpactStyle.Light })
}
```

Importai per `await import(...)` + `isNativePlatform()` guard — kad NESUGADINTŲ Vercel web build.

---

## 9. Vėlesni pakeitimai — kaip atrodo darbas

| Ką keiti | Reikia re-publish Play? |
|---|---|
| Kortų balansą, naujas kortas (admin → Supabase) | **Ne** — iškart appe |
| Game logiką, UI, naujus ekranus (web deploy) | **Ne** — iškart appe |
| App ikoną, pavadinimą, splash | Taip (naujas AAB) |
| Native pluginus, Capacitor versiją | Taip (naujas AAB) |
| `server.url` domeną | Taip (naujas AAB) |

T.y. 95% tavo kasdienio darbo (kortos, balansas, feature'ai) keliauja per įprastą web
deploy ir pasiekia appą be jokio Play submit. Admin panelę naudoji kaip dabar — naršyklėje.

---

## 10. Troubleshooting

- **Balta/tuščia ekranas paleidus:** patikrink interneto ryšį ir kad `server.url` teisingas.
  Logus žiūrėk `chrome://inspect` (prijungtas telefonas → Inspect webview).
- **Auth neveikia / iškart išmeta:** patikrink ar Supabase cookie domenai leidžiami;
  `androidScheme: 'https'` jau nustatytas (cookies reikalauja https origin).
- **Google OAuth (jei naudosi):** redirect atidarys išorinę naršyklę — pridėk
  `accounts.google.com` į `allowNavigation` arba naudok `@capacitor/browser` in-app flow.
- **Pakeitei config:** paleisk `npx cap sync android` ir perbuildink.
- **Garsai negroja iškart:** mobiliuose pirmas garsas reikalauja user gesto — pas tave
  jau yra tap-to-start, tai turėtų veikti.

---

## Failai, pridėti šiam setupui

- `capacitor.config.ts` — pagrindinė konfigūracija
- `mobile-shell/index.html` — loading/offline fallback (mažas webDir)
- `setup-capacitor.bat` — vienas paleidimas: install + add android + sync
- `package.json` — pridėti @capacitor/* paketai + `cap:sync`/`cap:open` skriptai

`android/` katalogas atsiras po `setup-capacitor.bat` — jį commit'ink į git (Capacitor rekomendacija).

---

## Horizontal combat – landscape orientation lock (F7)

Kova (`?layout=h`) žaidžiama gulsčiai. Native shell'e orientacijos užraktui reikia
`@capacitor/screen-orientation` plugin'o. Kodas web-safe (per `window.Capacitor.Plugins`
su guard'ais `src/lib/digital/native.ts`: `lockLandscape` / `unlockOrientation` /
`isPortraitNow`) – be plugin'o sename APK tiesiog nieko nedaro, web naudoja Screen
Orientation API fallback + „Pasuk telefoną" overlay.

Kad APK užraktas veiktų:

```bash
npm i @capacitor/screen-orientation
npx cap sync android
# tada perbuildink APK (Android Studio arba gradlew)
```

`AndroidManifest.xml` activity jau turi `android:configChanges="orientation|screenSize|..."`
(Capacitor default) – papildomai nieko keisti nereikia. Užraktas dedamas įeinant į kovą,
nuimamas išeinant (useEffect cleanup TutorialGame'e).
