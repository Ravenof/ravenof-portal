@echo off
cd /d "%~dp0"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
(
echo CWD: %CD%
git rev-parse --show-toplevel
git add src/components/tutorial/TutorialGame.tsx src/components/tutorial2/TutorialHub.tsx src/components/digital/DigitalPvE.tsx src/lib/version.ts git-commit799.bat
git commit -m "799: EN vertimai pergales ekrane - pasiekimu pavadinimai per content_translations, varzovo frakcijos pavadinimas mokymu ir DI kovose" -m "Co-Authored-By: Claude Fable 5.2 <noreply@anthropic.com>" -m "Claude-Session: https://claude.ai/code/session_01MA1F2oYWU2WAsACmgeB9Ak"
git push
git log -1 --oneline
) > commit799.log 2>&1
