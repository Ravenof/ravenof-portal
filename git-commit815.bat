@echo off
cd /d "%~dp0"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
(
echo CWD: %CD%
git rev-parse --show-toplevel
git add src/app/digital/layout.tsx src/lib/version.ts git-commit815.bat
git commit -m "815: parduotuve uzsidaro paspaudus bet kuri meniu punkta (ir to paties puslapio, pvz. Pradzia)" -m "Co-Authored-By: Claude Fable 5.2 <noreply@anthropic.com>" -m "Claude-Session: https://claude.ai/code/session_01MA1F2oYWU2WAsACmgeB9Ak"
git push
git log -1 --oneline
) > commit815.log 2>&1
