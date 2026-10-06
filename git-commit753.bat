@echo off
cd /d "%~dp0"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
del /f /q ".git\index.lock" >nul 2>&1
(
echo CWD: %CD%
git rev-parse --show-toplevel
git add src/components/admin/GameplayConfigEditor.tsx src/lib/game/effectEngine.ts src/lib/game/types.ts src/lib/cards/legend.ts src/lib/tutorial/engine.ts src/locales/lt/battleLog.json src/locales/en/battleLog.json src/lib/version.ts scripts/simulate-pvp-guest-choices.ts git-commit753.bat
git commit -m "753: naujas efektas selfToOwnDeck - Paskutinis noras: si korta imaisoma atgal i savo kalade (Wynsa); admin sarase; APP_VERSION 753" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>" -m "Claude-Session: https://claude.ai/code/session_012iT93Xhj9mfT32n14mwSpR"
git push
git log -1 --oneline
) > commit753.log 2>&1
