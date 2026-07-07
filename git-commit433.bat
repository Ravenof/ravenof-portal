@echo off
chcp 65001 >nul
set GIT_LITERAL_PATHSPECS=1
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
git add public/sw.js
git add src/lib/img.ts
git add src/components/pwa/PWARegister.tsx
git add OFFLINE-MEDIA-CACHE-PLAN.md
git add git-commit433.bat
git commit -m "feat(offline): media cache Faze 1 (is OFFLINE-MEDIA-CACHE-PLAN.md). SW v4: Supabase Storage media (object/public + render/image - kortos, video, audio, kosmetika) -> cache-first i ATSKIRA rvn-media-v1 (activate cleanup jo netrina; failu vardai immutable, invalidacijos nereikia); KRITISKA video daliai - Range uzklausoms grazinamas 206 su blob.slice + Content-Range (be to Android WebView video is cache uzstringa); auth/PostgREST/realtime lieka network-only kaip buvo; MEDIA_HOSTS konstanta paruosta R2/CDN ateiciai. PWARegister: po registracijos navigator.storage.persist() - OS reciau valo cache. img.ts thumbUrl: kanoniniai width bucket'ai 240/480 - vienam failui max 2 cache variantai vietoj n skirtingu UI dydziu. REZULTATAS: kiekvienas media failas siunciamas is Supabase tik VIENA karta per irengini; airplane-mode kova veikia su jau matytomis kortomis. Testas: DevTools Application -> Cache Storage -> rvn-media-v1. tsc + eslint svarus." > commit433.log 2>&1
git push >> commit433.log 2>&1
type commit433.log
echo ============= BAIGTA (offline media cache F1). =============
