@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
(
git add src/lib/tutorial/engine.ts src/lib/game/effectEngine.ts src/lib/game/types.ts src/components/admin/GameplayConfigEditor.tsx src/components/tutorial/TutorialGame.tsx git-commit64.bat
git commit -m "feat(gameplay): peekDiscard efektas - perziuri N virsutiniu prieso kalades kortu, pasirenki K ismesti i kapinyna (pauze + pasirinkimo modalas zaidejui, AI auto-renka brangiausias); Okuliaras dabar pilnai veikia"
git push
) > commit64.log 2>&1
