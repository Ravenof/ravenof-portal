@echo off
cd /d "%~dp0"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
del /f /q ".git\index.lock" >nul 2>&1
(
echo CWD: %CD%
git rev-parse --show-toplevel
git add src/lib/game/fxCatalog.ts src/lib/game/fxStage.ts src/components/tutorial/FxArena.tsx src/app/dev/fx/page.tsx scripts/simulate-fx-catalog.ts src/components/tutorial/TutorialGame.tsx src/components/admin/GameplayConfigEditor.tsx src/lib/game/types.ts src/lib/version.ts git-commit749.bat
git commit -m "749: Cempionu gebejimu FX (7 cempionai x 3) ir fazes virsmas; efektai gyvai seka korta (pataiko ant kortos); admin gebejimo FX pasirinkimas su perziura; APP_VERSION 749" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>" -m "Claude-Session: https://claude.ai/code/session_012iT93Xhj9mfT32n14mwSpR"
git push
git log -1 --oneline
) > commit749.log 2>&1
