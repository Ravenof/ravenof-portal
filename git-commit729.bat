@echo off
cd /d "%~dp0"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
del /f /q ".git\index.lock" >nul 2>&1
(
echo CWD: %CD%
git rev-parse --show-toplevel
git add supabase/migrations/20261001_admin_stats_grants.sql src/components/admin/AdminGrantPanel.tsx src/components/admin/AdminPlayerProfile.tsx "src/app/admin/users/[id]/page.tsx" src/app/admin/users/actions.ts src/components/tutorial/TutorialGame.tsx src/lib/economy.ts tsconfig.check.scene.json src/lib/version.ts git-commit729.bat
git commit -m "729: ADMIN zaidejo statistika ir universalus grantai - matches.format (ZMK/Klasika, rvn_report_match_v2 p_format), rvn_admin_player_stats: kovos pagal formata/rezima, formatas x rezimas, bendras ir per rezima zaidimo laikas, vid./ilgiausia, savaitine kreive, DI sudetingumai, reitingas abiejuose formatuose; rvn_admin_grant_v2 + admin_grant_log: sidabras/rubinai/esencija (+/-), bet kokia korta (kopijos, paieska), pakuote, kosmetika, bet koks parduotuves daiktas; AdminGrantPanel Ekonomikos skiltyje su zurnalu (migracija 20261001, paleisti pries release)" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>" -m "Claude-Session: https://claude.ai/code/session_01JMitPggicCjMqQoG7n1BWv"
git push
git log -1 --oneline
) > commit729.log 2>&1
