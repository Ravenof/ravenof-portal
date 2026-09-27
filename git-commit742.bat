@echo off
cd /d "%~dp0"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
del /f /q ".git\index.lock" >nul 2>&1
(
echo CWD: %CD%
git rev-parse --show-toplevel
git add supabase/migrations/20261004_name_change.sql src/lib/profile/client.ts src/components/digital/profile/ChangeNameDialog.tsx src/components/digital/profile/ProfileOverviewScreen.tsx src/components/social/FriendsClient.tsx src/app/profile/settings/changeUsername.ts src/app/profile/settings/actions.ts src/locales/lt/profile.json src/locales/en/profile.json src/lib/version.ts git-commit742.bat
git commit -m "742: Vardo keitimas - karta per 30 d. (serveris rvn_change_name + profiles guard), ankstesnis vardas rodomas 60 d. profilyje ir draugu sarase (rvn_name_info, rvn_prev_names), senas vardas rezervuotas kol rodomas; portalo changeUsername per ta pati RPC; migracija 20261004_name_change.sql; APP_VERSION 742" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" -m "Claude-Session: https://claude.ai/code/session_01JoeKHRowQ9gPcXNEz1bqGE"
git push
git log -1 --oneline
) > commit742.log 2>&1
