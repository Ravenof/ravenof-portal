@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
echo === Valom lock ===
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
if exist ".git\HEAD.lock" del /f /q ".git\HEAD.lock"
echo === Pridedam failus ===
git add src/lib/game/types.ts
git add src/components/admin/GameplayConfigEditor.tsx
git add src/components/admin/CardForm.tsx
git add src/app/admin/ranked/RankedAdminClient.tsx
git add src/components/tutorial2/TutorialOverlay.tsx
git add git-commit272.bat
echo === Commit ===
git commit -m "fix(build+tutorial): onCurseDrawn tipas + curse-activation admin UI + tutorial overlay safe-area. (1) types.ts: 'onCurseDrawn' i TriggerType + TRIGGER_TYPES (suderina su commit270 engine.ts -> taiso Vercel TS2367). (2) curse-activation admin WIP: GameplayConfigEditor (prakeiksmui default trigger=onCurseDrawn), CardForm (curse tipui auto gold 0), RankedAdminClient. (3) TutorialOverlay: dialogo burbulas + objektyvas/skip/progress pakelti virs telefono nav juostos (env safe-area-inset-bottom/top) - 'Toliau' mygtukas nebesislepia. tsc svarus."
echo === Push ===
git push
echo.
echo ============= BAIGTA. Ziurek ar nera klaidu. =============
pause
