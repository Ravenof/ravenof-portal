@echo off
cd /d "%~dp0"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
del /f /q ".git\index.lock" >nul 2>&1
(
echo CWD: %CD%
git rev-parse --show-toplevel
git add src/lib/cards/gameplayLint.ts scripts/cards-lint.ts src/components/admin/GameplayConfigEditor.tsx src/lib/game/types.ts src/lib/tutorial/engine.ts src/components/tutorial/TutorialGame.tsx src/locales/lt/battleLog.json src/locales/en/battleLog.json src/lib/version.ts scripts/simulate-ai-difficulty.ts scripts/simulate-virtual-game.ts package.json git-commit758.bat
git commit -m "758: Kortu gameplay lint - bendros taisykles src/lib/cards/gameplayLint.ts (negyvi trigeriai, nezinomi efektai/taikiniai, tuscios sakos, tipo taisykles, tekstas be konfiguracijos), npm run cards:lint (visa prod DB, tik skaitymas) ir gyvas ispejimu blokas admin kortos redaktoriuje; negyvi trigeriai admin sarase pazymeti NEVEIKIA; 0 zalos zaidejui dabar matomas ivykis (noDamagePlayer) su puff efektu ir garsu, puff garsas ir 0 zalos padarui; atnaujinti pasene testai game:test:aidiff (DI kopecia po 2026-09-19) ir simulate-virtual-game (prakeiksmu imaisymo kanonas) - visos suite zalios; APP_VERSION 758" -m "Co-Authored-By: Claude Fable 5.2 <noreply@anthropic.com>" -m "Claude-Session: https://claude.ai/code/session_01MA1F2o25PZyna3vr72EaVN"
git push
git log -1 --oneline
) > commit758.log 2>&1
