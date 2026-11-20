@echo off
cd /d "%~dp0"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
(
echo CWD: %CD%
git rev-parse --show-toplevel
git add src/app/admin/users/actions.ts src/app/admin/users/page.tsx src/components/admin/AdminGrantPanel.tsx src/components/admin/UserGrantForm.tsx supabase/migrations/20261120f_admin_grant_xp.sql git-commit817b.bat
git commit -m "817b: admin gali skirti rubinus, esencija ir XP tiesiai vartotoju sarase, XP grantas zaidejo puslapyje (migracija 20261120f)" -m "Co-Authored-By: Claude Fable 5.2 <noreply@anthropic.com>" -m "Claude-Session: https://claude.ai/code/session_01MA1F2oYWU2WAsACmgeB9Ak"
git push
git log -1 --oneline
) > commit817b.log 2>&1
