@echo off
cd /d "%~dp0"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
(
echo CWD: %CD%
git rev-parse --show-toplevel
git add studio/store-capture.spec.ts playwright.studio.config.ts run-studio.bat tsconfig.json .gitignore git-commit802.bat
git commit -m "802: studija - run-studio.bat automatiskai padaro parduotuves ekrano nuotraukas (LT ir EN, 1920x1080) ir kovos vaizdo irasus trailer-iui" -m "Co-Authored-By: Claude Fable 5.2 <noreply@anthropic.com>" -m "Claude-Session: https://claude.ai/code/session_01MA1F2oYWU2WAsACmgeB9Ak"
git push
git log -1 --oneline
) > commit802.log 2>&1
