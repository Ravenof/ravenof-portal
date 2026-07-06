@echo off
chcp 65001 >nul
set GIT_LITERAL_PATHSPECS=1
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
echo === Valom lock ===
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
if exist ".git\HEAD.lock" del /f /q ".git\HEAD.lock"
echo === Pridedam failus ===
git add src/components/tutorial/BattleLayout.tsx
git add git-commit391.bat
echo === Commit ===
git commit -m "feat(combat F2): landscape lentos zonos + anchor'ai. Pridetas data-tut=ai-area ant AI klasterio (tutorial overlay aliasina hp-ai/deck-ai/discard-ai/enemy-area -> ai-area, be jo lustu 5 pamoku rodykles). TAVO/PRIESO EJIMAS divideris - band su gradientu + pulse priesio ejime. Units/artefaktai/reakcijos/laukas jau per esamus helper'ius (data-tut anchor'ai issaugoti). tsc svarus." > commit391.log 2>&1
echo === Push ===
git push >> commit391.log 2>&1
type commit391.log
echo.
echo ============= BAIGTA (F2). =============
