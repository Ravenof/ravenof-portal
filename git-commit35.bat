@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"

echo === 1. Salinamas stale git lock (jei yra) ===
if exist ".git\index.lock" del /f /q ".git\index.lock"

echo === 2. Stage'inami pakeitimai ===
git add supabase/lore_audio_v1.sql
git add src/lib/lore-audio.ts
git add src/lib/lore-discovery.ts
git add src/components/lore/EventSoundtrack.tsx
git add public/maps/clouds.png
git add -u

echo === 3. Commit ===
git commit -m "feat(atlas): gamifikacija - event soundtrack + lokaciju ambient (lore-audio fade grotuvas), fog-of-war atradimai, keliones linijos, parallax rukas, gyvi markeriai su garsais, pics panelese ir event puslapyje, admin audio/image laukai"

echo === 4. Push ===
git push

echo.
echo === BAIGTA. Spauskite bet kuri klavisa. ===
pause
