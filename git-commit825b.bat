@echo off
cd /d "%~dp0"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
(
echo CWD: %CD%
git rev-parse --show-toplevel
git add supabase/migrations/20261122b_card_fixes_geralelas_krakenas.sql git-commit825b.bat
git commit -m "825b: migracija 20261122b - Geralelas imaiso 1 prakeiksma (buvo 2), Krakeno tekstas pagal mapinima (ciuptuvai kiekvieno ejimo pabaigoje)" -m "Co-Authored-By: Claude Fable 5.2 <noreply@anthropic.com>" -m "Claude-Session: https://claude.ai/code/session_01MA1F2oYWU2WAsACmgeB9Ak"
git push
git log -1 --oneline
) > commit825b.log 2>&1
