# Ravenof — media optimizacija (Supabase egress mažinimas)

**Problema:** Supabase Free plane viršytas **Cached Egress** (7,7 / 5 GB). Kaltininkas — media iš Storage bucket'ų: kortų art (x3 PNG ~2–4 MB), voice lines, muzika, cinematics video. Du pagrindiniai faktoriai:

1. Upload'ai nenustatydavo `cacheControl` → default 3600 s (1 val.) → klientai persisiųsdavo tuos pačius failus kas valandą.
2. Storage Image Transformations šiame plane neprieinamos → visada atiduodamas pilnas PNG.

Sprendimas įgyvendintas 4 dalimis. **Prognozė: 1+2 duoda ~90 % egress kritimą.**

---

## 1. Auto-WebP + metų cache admin upload'uose ✅ (kode)

`src/lib/img-optimize.ts` — `toWebp()` naršyklėje: resize ≤900 px + WebP q82 (783×1062 PNG ~2–4 MB → ~120–180 KB, vizualiai neatskiriama). Visi paveikslų upload'ai dabar konvertuoja + nustato `cacheControl: '31536000'` (1 metai; failų vardai unikalūs su timestamp → immutable saugu):

- `CardImageUpload` (kortų art), `ShopImageUpload`, `EventBannerUpload`, `FieldBgUpload` (arena fonas, ≤1920 px).
- Audio/video/avatar upload'ai (`CinematicUpload`, `VoiceLinesUpload`, `AvatarUpload`, `AdminShopClient`) — pridėtas `cacheControl` (nekonvertuojam, bet nustoja persisiųsti).

> **Dimensijų nemažinam žemiau ~800 px** — detailed view telefone su DPR 2–3 nori ~780 px. Nauda iš **formato**, ne mažinimo.

## 2. Esamų failų konversija — `tools/optimize-media.mjs` ✅ (skriptas)

Konvertuoja jau įkeltus `card-images` (cards + card_packs `image_url`) į WebP, įkelia nauju vardu su metų cache, atnaujina DB.

```cmd
cd ravenof-portal
npm i -D sharp
set SUPABASE_URL=https://yobulzlvqcreutcvohcx.supabase.co
set SUPABASE_SERVICE_ROLE_KEY=eyJ...          (Service role, NE anon)
node tools/optimize-media.mjs                 (DRY-RUN — tik ataskaita su dydžiais)
node tools/optimize-media.mjs --fix           (realiai konvertuoja + įrašo)
```

Saugu: be `--fix` nieko nekeičia. Service key naudojamas tik lokaliai. Senų failų netrina (gali ištrinti rankiniu būdu vėliau Storage naršyklėje).

## 3. Audio — `tools/optimize-audio.bat` ✅ (ffmpeg)

Voice lines → mono MP3 96 kbps (~20–40 KB). Įdedi originalus į `tools/audio-in/`, gauni optimizuotus `tools/audio-out/`, įkeli per admin. Reikia ffmpeg PATH'e.

## 4. Cloudflare R2 — struktūrinis sprendimas video+muzikai 📋 (planas)

Sunkiausia media (cinematics video, muzikos takeliai) ilgainiui turėtų gyventi **Cloudflare R2** — **egress $0 visam laikui**, 10 GB saugyklos nemokamai, po to $0.015/GB. Supabase lieka tik DB/auth/realtime/dinamiški uploadai.

**Kada verta:** kai žaidėjų daugės ir video/audio egress vėl artės prie ribos. Vaizdams (po 1+2) R2 nebūtinas.

**Migracijos žingsniai:**

1. Cloudflare → R2 → sukurk bucket `ravenof-media`. Įjunk public access per **custom domain** (pvz. `cdn.ravenof.app`) arba r2.dev dev-URL.
2. Perkelk turinį: `rclone` arba AWS S3 CLI (R2 = S3-suderinamas). Pvz.:
   ```
   rclone copy supabase:card-cinematics r2:ravenof-media/cinematics
   rclone copy supabase:card-audio       r2:ravenof-media/audio
   ```
   (arba download iš Supabase → upload į R2 skriptu, analogišku optimize-media.mjs)
3. DB: atnaujink URL'us `card-cinematics` / `card-audio` → `https://cdn.ravenof.app/...` (UPDATE per SQL arba skriptu).
4. Kode media URL'ai jau ateina iš DB (`gameplay.summonCinematic`, voiceLines JSONB, avatar_audio) — pakeitus DB, kodo keisti beveik nereikia. Patikrink `capacitor.config.ts` `allowNavigation` — pridėk R2 domeną, kad WebView leistų.
5. Naujiems admin upload'ams: pakeisk cinematics/audio upload'us kelti į R2 (S3 SDK) vietoj Supabase Storage. (Atskira užduotis, kai nuspręsi migruoti.)

**Kaina:** ~$0/mėn kol <10 GB; realiai keli centai. Palyginimui Supabase Pro = $25/mėn.

---

## Kaip patikrinti ar veikia

Supabase → Usage → **Cached Egress**. Po 1+2 kasdienis augimas turi drastiškai kristi (skaitiklis atsinaujina iki 1 val.). Jau suskaičiuoti 7,7 GB šį ciklą liks — nauda matosi nuo kito ciklo. Grace iki 2026-08-04.

**Prioritetas:** paleisk `optimize-media.mjs --fix` (didžiausias momentinis efektas esamiems failams) + deploy kodo (nauji upload'ai). To turėtų pakakti likti nemokamam. R2 — kai augsi.
