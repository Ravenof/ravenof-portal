@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
echo === Valom lock ===
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
if exist ".git\HEAD.lock" del /f /q ".git\HEAD.lock"
echo === Pridedam failus ===
git add src/lib/img-optimize.ts
git add src/components/admin/CardImageUpload.tsx
git add src/components/admin/ShopImageUpload.tsx
git add src/components/admin/EventBannerUpload.tsx
git add src/components/admin/CinematicUpload.tsx
git add src/components/admin/VoiceLinesUpload.tsx
git add src/components/admin/GameplayConfigEditor.tsx
git add src/components/profile/AvatarUpload.tsx
git add src/app/admin/shop/AdminShopClient.tsx
git add tools/optimize-media.mjs
git add tools/optimize-audio.bat
git add MEDIA-OPTIMIZATION.md
git add git-commit369.bat
echo === Commit ===
git commit -m "perf(media): WebP + metu cache egress mazinimui. img-optimize.ts toWebp (resize<=900 + WebP q82 narsykleje); visi paveikslu upload'ai (kortu art/shop/banner/arena fonas) konvertuoja + cacheControl 1 metai; audio/video/avatar upload'ai gauna cacheControl (buvo default 1h). tools/optimize-media.mjs (esami card-images -> WebP; dry-run/--fix; sharp+service key). tools/optimize-audio.bat (voice -> mono MP3 96k). MEDIA-OPTIMIZATION.md su R2 planu. tsc svarus."
echo === Push ===
git push
echo.
echo ============= BAIGTA. Ziurek ar nera klaidu. =============
pause
