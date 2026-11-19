@echo off
cd /d "%~dp0"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
(
echo CWD: %CD%
git rev-parse --show-toplevel
git add src/app/terms/page.tsx src/lib/version.ts git-commit809.bat
git commit -m "809: naudojimo salygu puslapis /terms (LT ir EN) Google Play Terms of Service nuorodai" -m "Co-Authored-By: Claude Fable 5.2 <noreply@anthropic.com>" -m "Claude-Session: https://claude.ai/code/session_01MA1F2oYWU2WAsACmgeB9Ak"
git push
git log -1 --oneline
) > commit809.log 2>&1
