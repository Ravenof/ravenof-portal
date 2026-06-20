@echo off
chcp 65001 >nul
cd /d "C:\Users\Administrator\Documents\Claude\Projects\Ravenof kortų portalas\ravenof-portal"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
if exist ".git\index.lock" del /f /q ".git\index.lock"
(
git add src/lib/game/types.ts src/lib/game/targetResolver.ts src/lib/game/effectEngine.ts src/lib/tutorial/engine.ts src/components/tutorial/TutorialGame.tsx git-commit170.bat
git commit -m "feat(engine): unikalus efekt-mapping - (#3+#4) dinamines grandines metrikos lastDamageDealt + destroyedTargetsHp; (#1) onAnyCurse trigeris (su triggerSide) suveikia kai aktyvuojamas prakeiksmas; (#2) kapinyno prikelimas - onAnyCurse+revive marker'is prikelia padara is kapinyno; (#5) copyEffectFromGraveyard efektas + pop-up pasirinkti kapinyno padara ir perimti jo efekta"
git push
) > commit170.log 2>&1
