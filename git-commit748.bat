@echo off
cd /d "%~dp0"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
del /f /q ".git\index.lock" >nul 2>&1
(
echo CWD: %CD%
git rev-parse --show-toplevel
git add src/lib/game/fxCatalog.ts src/lib/game/fxStage.ts src/components/tutorial/FxArena.tsx src/app/dev/fx/page.tsx scripts/simulate-fx-catalog.ts src/components/tutorial/TutorialGame.tsx src/components/tutorial/CardStatusVfxLayer.tsx src/components/admin/GameplayConfigEditor.tsx src/lib/game/statusVfx.ts src/lib/game/types.ts src/lib/game/effectEngine.ts src/lib/tutorial/engine.ts package.json tsconfig.check.gamefeel.json src/lib/version.ts git-commit748.bat
git commit -m "748: FX v3 - fxStage variklis: 30 iskvietimo choreografiju (juda pati korta), skrydis+smugis statusams/buffams/gydymui/scenos zalai, admin smugio pasirinkimas ir FX perziura, /dev/fx; APP_VERSION 748" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>" -m "Claude-Session: https://claude.ai/code/session_012iT93Xhj9mfT32n14mwSpR"
git push
git log -1 --oneline
) > commit748.log 2>&1
