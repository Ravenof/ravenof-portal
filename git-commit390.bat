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
git add src/components/tutorial/TutorialGame.tsx
git add git-commit390.bat
echo === Commit ===
git commit -m "feat(combat F1): horizontal (landscape) combat layout skeleton uz ?layout=h feature flag. Naujas BattleLayout.tsx - grid (kaire rail / lenta / desine pile'ai) is esamu render helper'iu (hpBar/goldBar/renderPile/units/artifacts/reactions/dField/OppHand) perduodamu props'ais; state lieka TutorialGame'e. Nauji H helper'iai (renderHandFanH/LogH/EndTurnH/DiscardGoldH). Seni isTouch/!isTouch blokai + touch field slot gate'inti !useHLayout - be flago viskas kaip buvo. Emote/preview/timer ziedas = placeholder'iai (F5). tsc svarus." > commit390.log 2>&1
echo === Push ===
git push >> commit390.log 2>&1
type commit390.log
echo.
echo ============= BAIGTA (F1). =============
