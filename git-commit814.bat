@echo off
cd /d "%~dp0"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
(
echo CWD: %CD%
git rev-parse --show-toplevel
git add src/app/admin/shop/AdminShopClient.tsx src/components/digital/profile/ProfileCosmeticsModal.tsx src/locales/lt/profile.json src/locales/en/profile.json src/lib/version.ts supabase/migrations/20261120b_avatar_frames_set.sql supabase/migrations/20261120c_cosmetics_rubies_only.sql git-commit814.bat
git commit -m "814: kosmetika tik uz rubinus arba is eventu - be sidabro kainos (adminas, uzrakto uzuomina, migracija 20261120c)" -m "Co-Authored-By: Claude Fable 5.2 <noreply@anthropic.com>" -m "Claude-Session: https://claude.ai/code/session_01MA1F2oYWU2WAsACmgeB9Ak"
git push
git log -1 --oneline
) > commit814.log 2>&1
