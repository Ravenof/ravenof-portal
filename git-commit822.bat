@echo off
cd /d "%~dp0"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
(
echo CWD: %CD%
git rev-parse --show-toplevel
git add supabase/migrations/20261121c_varpines_gydytoja.sql src/lib/version.ts src/lib/game/avatarVoManifest.json src/lib/game/avatarVoScript.json public/avatars/v2 git-commit822.bat
git commit -m "822: avataru balsai - Stichiju mage, Marso bugnininkas, Tylos mokinys, Kapitone, Seseliu kisenvagis, Ausros riteris, Varpines gydytoja, Gaujos vadas, Arenos cempionas, Varnu pranase - igarsinti visi 18; Varpu gydytoja pervadinta i Varpines gydytoja (migracija 20261121c)" -m "Co-Authored-By: Claude Fable 5.2 <noreply@anthropic.com>" -m "Claude-Session: https://claude.ai/code/session_01MA1F2oYWU2WAsACmgeB9Ak"
git push
git log -1 --oneline
) > commit822.log 2>&1
