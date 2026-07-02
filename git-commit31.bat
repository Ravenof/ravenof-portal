@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"

echo === 1. Salinamas stale git lock (jei yra) ===
if exist ".git\index.lock" del /f /q ".git\index.lock"

echo === 2. Stage'inami pakeitimai (naujas failas + visi modifikuoti tracked) ===
git add src/app/not-found.tsx
git add src/lib/lt-plural.ts
git add src/lib/profanity.ts
git add src/lib/nav.ts
git add src/components/layout/HeaderNav.tsx
git add src/components/admin/EventBannerUpload.tsx
git add sql/add_events_banner.sql

echo === Salinami paketu (packs) katalogai ===
git rm -r --quiet --ignore-unmatch src/app/packs src/app/admin/packs

git add -u

echo === 3. Valomos untracked siuksles (28 tusti failai, seni bat, synctest) ===
git clean -f -e git-commit31.bat

echo === 4. Commit ===
git commit -m "feat(nav): bendra navigacija (MobileNav 6 tab su Kova, HeaderNav desktop); P1-P3 taisymai (entitetai, lokalizacija, 404, daugiskaita, XP, necenzuru filtras); deck-builder taisymai; paketai pasalinti; repo svara"

echo === 5. Push ===
git push

echo.
echo === BAIGTA. Spauskite bet kuri klavisa. ===
pause
