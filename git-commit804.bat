@echo off
cd /d "%~dp0"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
(
echo CWD: %CD%
git rev-parse --show-toplevel
git add studio/store-capture.spec.ts playwright.studio.config.ts git-commit804.bat
git commit -m "804: studija - uzdaromi laukiantys atlygiu modalai, didesne sasaja (1440x810 x 4/3 = 1920x1080), kaladziu karusele per mygtuka, pele patraukiama pries nuotrauka" -m "Co-Authored-By: Claude Fable 5.2 <noreply@anthropic.com>" -m "Claude-Session: https://claude.ai/code/session_01MA1F2oYWU2WAsACmgeB9Ak"
git push
git log -1 --oneline
) > commit804.log 2>&1
