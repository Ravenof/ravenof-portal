@echo off
cd /d "%~dp0"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
(
echo CWD: %CD%
git rev-parse --show-toplevel
git add studio/store-capture.spec.ts playwright.studio.config.ts run-studio.bat git-commit803.bat
git commit -m "803: studija - prisijungimas ranka atsidariusiame Chrome lange (el. pastu arba per Google), sesija issaugoma store-media/_auth.json" -m "Co-Authored-By: Claude Fable 5.2 <noreply@anthropic.com>" -m "Claude-Session: https://claude.ai/code/session_01MA1F2oYWU2WAsACmgeB9Ak"
git push
git log -1 --oneline
) > commit803.log 2>&1
