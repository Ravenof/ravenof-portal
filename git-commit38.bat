@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"

echo === 1. Salinamas stale git lock (jei yra) ===
if exist ".git\index.lock" del /f /q ".git\index.lock"

echo === 2. Stage'inami pakeitimai ===
git add supabase/lore_atlas_v2.sql
git add src/components/lore/AtlasHud.tsx
git add src/components/admin/lore/RelationPicker.tsx
git add src/app/admin/lore/periods
git add -u

echo === 3. Commit ===
git commit -m "feat(atlas-v2): periodai erose (2 lygiu laiko juosta), lokaciju aprasai pagal perioda su carry-forward, ivykiu grandines + chronologine prev/next navigacija, veikejo sekimas zemelapyje su flyTo, per-UI hide/restore (AtlasHud), frakciju filtras pagal visas frakcijas, admin: periodu CRUD + RelationPicker rysiu sistema + select'ai vietoj CSV"

echo === 4. Push ===
git push

echo.
echo === BAIGTA. Spauskite bet kuri klavisa. ===
pause
