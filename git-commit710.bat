@echo off
cd /d "%~dp0"
set GIT_LITERAL_PATHSPECS=1
taskkill /F /IM git.exe >nul 2>&1
del /f /q ".git\index.lock" >nul 2>&1
(
echo CWD: %CD%
git rev-parse --show-toplevel
git add src/app/register/page.tsx src/components/digital/onboarding/DigitalAuthScreen.tsx src/components/digital/DigitalPvP.tsx src/components/digital/PvPLobby.tsx src/app/profile/settings/changeUsername.ts src/locales/lt/auth.json src/locales/en/auth.json src/components/digital/progression/LoginRewardsScreen.tsx src/components/tutorial/BattleLayout.tsx src/components/tutorial/DesktopBattleLayout.tsx src/components/tutorial/TutorialGame.tsx src/lib/version.ts git-commit710.bat
git commit -m "710: UX pataisos - slapyvardis su didziosiomis (display_name islaiko registra, username lieka mazosiomis), prisijungimo dovana atsiimama bakstelejus tos dienos plytele, emociju ratas atsidaro bakstelejus savo avatara, monetos metimo saugiklis kad neuzstrigtu pries mulligana" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>" -m "Claude-Session: https://claude.ai/code/session_015TLWcibxvH546P5Uog8kPs"
git push
git log -1 --oneline
) > commit710.log 2>&1
