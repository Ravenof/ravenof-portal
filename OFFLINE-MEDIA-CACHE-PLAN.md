# Ravenof — Offline media cache planas

**Tikslas:** kortų art, avatarai, cardbacks, summon/champion/skill video ir visi audio failai saugomi žaidėjo telefone ir naudojami lokaliai — Supabase pasiekiamas tik pirmą kartą arba kai failas pasikeičia.

**Strategija (patvirtinta):** hibridas — automatinis cache-first naudojant + atskiras „Atsisiųsti viską" ekranas. Veikia ir Android (Capacitor), ir web/PWA — vienas kodas.

---

## Kodėl būtent Service Worker + Cache Storage

Android appas yra **remote-URL Capacitor shell** (krauna gyvą Vercel svetainę), todėl „įdėti failus į APK" nepadėtų — WebView vis tiek prašo URL'ų. Bet tai reiškia, kad **jau veikiantis `public/sw.js` yra tobula vieta**: jis mato KIEKVIENĄ užklausą (img, video, audio, fetch) ir gali atiduoti iš lokalios Cache Storage, kuri fiziškai gyvena telefone ir persistuoja tarp sesijų.

Dabartinė padėtis kode:

- `public/sw.js` — Supabase užklausas **sąmoningai praleidžia** (network-only). Tai teisinga auth/DB, bet dėl to visa Storage media niekada necache'uojama.
- `src/lib/game/avatarVideoCache.ts` — jau daro būtent tai, ko norim, bet tik avatarų idle video (Cache Storage `rvn-avatar-videos-v1`). Precedentas veikia — planas jį apibendrina visai medijai.
- `voiceManager` / `soundManager` / `musicManager` — tik in-memory, po restarto viskas siunčiama iš naujo.
- Media URL'ai ateina iš DB (immutable failų vardai su timestamp) — **cache-first amžinai yra saugu**: pakeitus failą admin'e, DB gauna naują URL → klientas parsisiunčia naują failą automatiškai. Invalidacijos problemos nėra.

Buckets, kuriuos dengiam: `card-images`, `card-audio`, `card-cinematics`, `avatar-audio`, `avatar-video` (+ cosmetics/cardbacks paveikslai, kurie irgi `card-images`/storage public URL'ai).

---

## Fazė 1 — SW cache-first Supabase Storage medijai (quick win, ~1 vakaras)

Didžiausia nauda mažiausiu darbu — po šios fazės kiekvienas failas siunčiamas tik vieną kartą per įrenginį.

1. `public/sw.js` (versija → v4):
   - Naujas atskiras cache `rvn-media-v1` (atskirtas nuo shell cache, kad `activate` cleanup jo netrintų).
   - Taisyklė PRIEŠ supabase bypass'ą: `GET` + hostname `*.supabase.co` + path prasideda `/storage/v1/object/public/` arba `/storage/v1/render/image/` → **cache-first į `rvn-media-v1`**. Visa kita supabase srauto dalis (auth, PostgREST, realtime) lieka network-only kaip dabar.
   - **Range užklausos (KRITIŠKA video):** `<video>` elementas siunčia `Range` headerius; `cache.match` jų nepaiso ir grąžinus pilną 200 atsakymą Android WebView video užstringa. SW turi: cache'inti pilną failą, o į Range užklausą atsakyti 206 su atpjautu `blob.slice(start, end)` + `Content-Range`. (~30 eilučių helperis; be jo cinematics neveiks iš cache.)
   - Pridėti būsimą CDN domeną (R2 `cdn.ravenof.app` iš MEDIA-OPTIMIZATION.md planą) į tą pačią taisyklę iš anksto.
2. `PWARegister.tsx`: po registracijos kviesti `navigator.storage.persist()` — Android WebView pažymi storage kaip „persistent", OS daug rečiau išvalo cache po storage pressure.
3. `img.ts` pastaba: `thumbUrl()` generuoja skirtingus `?width=` variantus → keli cache įrašai tam pačiam paveikslui. Sprendimas: žaidimo (`/digital`) kontekste naudoti vieną kanoninį plotį (pvz. 480) kortų grid'ams, kad cache'e būtų 1 variantas + originalas max.
4. Patikra: Chrome DevTools → Application → Cache Storage; Android — airplane mode testas kovoje.

**Rezultatas:** kortos, avatarai, cardbacks, video, audio — viskas lokaliai po pirmo panaudojimo. Supabase egress krenta dar kartą dramatiškai (papildo commit369 WebP darbą).

## Fazė 2 — Media manifestas (pamatas „Download all")

Kad galėtume parsisiųsti VISKĄ iš anksto ir žinoti, ką trinti, reikia pilno media sąrašo.

1. SQL RPC `rvn_media_manifest()` → lentelė `(url, kind, bytes, updated_at)`:
   - `cards.image_url` (kind `card-art`), `cards.gameplay->voiceLines` (JSONB masyvas, `voice`), `cards.gameplay->summonCinematic` + champion `skill->cinematic` (`cinematic`), `cosmetics.image_url`/`preview_url` (cardbacks, avatarai, skins — `cosmetic`), `avatar_audio` įrašai (`avatar-voice`), avatar idle video (`avatar-video`), `card_packs.image_url`, faction/rarity ikonos.
   - `bytes` — iš `storage.objects.metadata->size` (join per bucket+path) → tikslus progress baras MB.
   - Public read (be auth nereikia; media ir taip vieša).
2. Tier'ai manifeste (stulpelis `tier`):
   - **T1 core** — UI ikonos, cardbacks, avatarų portretai, starter kortos (~keliolika MB);
   - **T2 collection** — visos kortos + voice lines;
   - **T3 heavy** — cinematics video + muzika (didžiausia dalis; siūlom siųsti tik per Wi-Fi / paklausus).
3. `tools/media-size-report.mjs` — vienkartinis skriptas dydžiams pamatuoti (kiek realiai sveria T1/T2/T3) prieš darant UI sprendimus.

## Fazė 3 — „Atsisiųsti žaidimo turinį" ekranas

Game-like download manager, kaip mobile kortų žaidimuose.

1. `src/lib/digital/mediaDownloader.ts`:
   - Ima manifestą → filtruoja ką jau turim (`cache.keys()` diff) → siunčia trūkstamus eilėje (concurrency ~4), rašo **į tą patį `rvn-media-v1`**, kurį skaito SW — automatinis ir rankinis cache dalinasi viena saugykla.
   - Progresas: atsisiųsti baitai / viso (iš manifest `bytes`), atsparumas: klaidos → retry eilės gale, resume po app restarto (diff'as natūraliai tęsia).
   - Delta sync: manifest `updated_at`/URL pasikeitė → naujas failas atsisiunčiamas, senas URL (nebe manifeste) → trinamas iš cache (cleanup žingsnis).
2. UI `/digital/settings` (⚙️ modalas) + pirmo paleidimo pasiūlymas:
   - Kortelė „Žaidimo turinys": užimta vieta (`navigator.storage.estimate()`), mygtukai „Atsisiųsti viską" / „Tik be video" (T1+T2), „Išvalyti atsisiųstą turinį".
   - Progress baras su MB ir dark-fantasy stiliumi (ui3 asset sistema, GameCard vibe).
   - T3 (video/muzika): perspėjimas apie dydį; Wi-Fi patikra per `navigator.connection` (best-effort) arba tiesiog aiškus MB skaičius prieš patvirtinant.
   - Naujoko onboarding'e nesiūlom pilno download — tik tyliai background'e T1 (nekonkuruojant su tutorial srautu).
3. Runtime prefetch (smulkus bonus): prieš kovą — priešininko kaladės media prefetch į cache (bot/ranked kaladės žinomos iš anksto), kad pirmos kovos irgi būtų be network hiccup'ų.

## Fazė 4 — Player kodo suvienodinimas

1. `voiceManager` / `avatarAudio` / `musicManager` / `soundManager`: prieš `fetch(url)` bandyti `caches.match(url)` (per bendrą helperį `cachedFetch(url)` — ~15 eilučių `src/lib/game/mediaCache.ts`). SW jau dengia daugumą, bet AudioContext fetch'ai per helperį veiks ir web'e be SW (pvz., dev).
2. `avatarVideoCache.ts` → perjungti ant bendro `rvn-media-v1` (vietoj atskiro `rvn-avatar-videos-v1`), kad „Išvalyti" ir storage apskaita matytų viską vienoje vietoje.
3. `cinematics` / `useCinematicQueue`: video src leisti tiesiai (SW + Range handleris atiduos iš cache); nebereikia atskiros blob logikos.

## Fazė 5 (atsarginė, tik jei prireiks) — Capacitor Filesystem

Cache Storage Android WebView'e su `persist()` praktiškai stabili, bet OS teoriškai gali išvalyti esant vietos trūkumui. Jei žaidėjai skųsis dingstančiu turiniu:

- `@capacitor/filesystem` (naujas pluginas) → failai į `Directory.Data` (app privatus katalogas, OS netrina niekada, trinama tik su app uninstall).
- Downloader'is Capacitor aplinkoje (`Capacitor.isNativePlatform()`, jau yra `src/lib/digital/native.ts`) rašo į FS, URL resolver'is grąžina `Capacitor.convertFileSrc()` kelią; fallback — `Filesystem.readFile` → blob URL.
- ⚠️ Rizika pasitikrinti: `convertFileSrc` elgesys remote-URL server mode — reikia realaus testo APK'e. Todėl tai atsarginė fazė, ne pagrindas.

---

## Apimtis / eiliškumas

| Fazė | Darbo dydis | Priklauso nuo |
|---|---|---|
| 1. SW cache-first + Range | ~pusdienis | — |
| 2. Manifest RPC + size report | ~pusdienis | — |
| 3. Download ekranas | ~1–2 d. | 1, 2 |
| 4. Player suvienodinimas | ~pusdienis | 1 |
| 5. Filesystem fallback | ~1 d. | tik jei reikia |

## Rizikos

- **Video Range** — pagrindinė techninė duobė; be 206 handlerio cinematics iš cache neveiks (Fazė 1 punktas privalomas).
- **Cache eviction** — mitiguojam `persist()` + Fazė 5 planas atsargoje.
- **iOS ateičiai** — WKWebView SW remote domain'ui reikalauja App-Bound Domains konfigūracijos; Android'ui nesvarbu, bet užsirašom.
- **Storage kvota** — `navigator.storage.estimate()` rodom UI; T3 video laikom opt-in, kad silpni telefonai neprisipildytų.
- **Duplikuoti thumb variantai** (`?width=`) — kanoninis plotis Fazėje 1, kitaip cache išsipučia keliais variantais per kortą.

## Sąsaja su R2 planu (MEDIA-OPTIMIZATION.md §4)

Šie planai papildo vienas kitą: R2 mažina serverio egress kainą, šis planas — kliento pakartotinius siuntimus apskritai. SW taisyklė ir manifest URL'ai rašomi taip, kad domeno pakeitimas Supabase→R2 nieko nelaužytų (host sąrašas vienoje konstantoje).
