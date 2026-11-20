@echo off
cd /d "%~dp0"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
(
echo CWD: %CD%
git rev-parse --show-toplevel
git add src/lib/updater/core.ts apps/digital/src/UpdateLayer.tsx src/lib/version.ts git-commit811.bat
git commit -m "811: telefone neprivalomas atnaujinimas nebesiunciamas fone (letino kortu krovima) - diegiamas per paleidima su progreso ekranu arba paspaudus Atnaujinti dabar" -m "Co-Authored-By: Claude Fable 5.2 <noreply@anthropic.com>" -m "Claude-Session: https://claude.ai/code/session_01MA1F2oYWU2WAsACmgeB9Ak"
git push
git log -1 --oneline
) > commit811.log 2>&1
