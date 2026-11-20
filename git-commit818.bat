@echo off
cd /d "%~dp0"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
(
echo CWD: %CD%
git rev-parse --show-toplevel
git add src/lib/version.ts public/avatars/v2 supabase/migrations/20261120g_avatars_v2_batch2.sql git-commit818.bat
git commit -m "818: nauji avatarai - Kapitone + Seseliu kisenvagis + Ausros riteris + Varpu gydytoja + Gaujos vadas + Pelkiu ziniuone + Arenos cempionas + Varnu pranase (migracija 20261120g)" -m "Co-Authored-By: Claude Fable 5.2 <noreply@anthropic.com>" -m "Claude-Session: https://claude.ai/code/session_01MA1F2oYWU2WAsACmgeB9Ak"
git push
git log -1 --oneline
) > commit818.log 2>&1
