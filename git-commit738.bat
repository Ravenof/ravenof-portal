@echo off
cd /d "%~dp0"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
del /f /q ".git\index.lock" >nul 2>&1
(
echo CWD: %CD%
git rev-parse --show-toplevel
git add src/app/digital/layout.tsx src/components/digital/SettingsModal.tsx src/components/digital/ShopModal.tsx src/components/digital/ui/ravenof-ui.css src/lib/version.ts public/ravenof-ui/backgrounds/menu-gothic-city-960.webp public/ravenof-ui/backgrounds/menu-gothic-city.webp  git-commit738.bat
git commit -m "738: Meniu fonas - gotikinio miesto iliustracija (menu-gothic-city.webp 1672px + 960px mobile) visuose /digital meniu vietoj juodo fono, klase .rvn-menu-bg su patamsinimu; Parduotuve ir Nustatymai irgi; APP_VERSION 738" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" -m "Claude-Session: https://claude.ai/code/session_01JoeKHRowQ9gPcXNEz1bqGE"
git push
git log -1 --oneline
) > commit738.log 2>&1
